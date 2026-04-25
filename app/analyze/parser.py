"""
app/analyze/parser.py — Extract a structured Intermediate Representation
from an OpenAPI 3.x spec dict.
"""
from __future__ import annotations

import re
from urllib.parse import urljoin
from dataclasses import dataclass, field
from typing import Any

# Mapping from JSON Schema types → Python type annotations
_TYPE_MAP: dict[str, str] = {
    "string":  "str",
    "integer": "int",
    "number":  "float",
    "boolean": "bool",
    "array":   "list",
    "object":  "dict",
}

_HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

@dataclass
class ParamSpec:
    name: str          # original name from the spec
    location: str      # "query" | "path" | "header" | "cookie"
    py_type: str       # Python type string e.g. "str", "int"
    required: bool
    description: str

    @property
    def py_name(self) -> str:
        """Valid Python identifier version of the param name."""
        return re.sub(r"[^a-zA-Z0-9_]", "_", self.name)


@dataclass
class ToolSpec:
    name: str                        # Python function name (snake_case)
    method: str                      # uppercase HTTP verb
    path: str                        # URL path template e.g. /pets/{id}
    description: str
    params: list[ParamSpec] = field(default_factory=list)
    has_body: bool = False           # True when a requestBody exists

    # Filled in from api_meta so each tool is self-contained
    base_url: str = ""
    auth_type: str = "none"
    env_var_name: str = ""
    api_key_header: str = ""

    @property
    def path_params(self) -> list[ParamSpec]:
        return [p for p in self.params if p.location == "path"]

    @property
    def query_params(self) -> list[ParamSpec]:
        return [p for p in self.params if p.location == "query"]

    @property
    def required_params(self) -> list[ParamSpec]:
        return [p for p in self.params if p.required]

    @property
    def optional_params(self) -> list[ParamSpec]:
        return [p for p in self.params if not p.required]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _snake(text: str) -> str:
    """Turn any string into a valid Python snake_case identifier."""
    s = re.sub(r"[^a-zA-Z0-9]", "_", text)
    s = re.sub(r"([a-z0-9])([A-Z])", r"\1_\2", s).lower()
    s = re.sub(r"_+", "_", s).strip("_")
    if s and s[0].isdigit():
        s = "op_" + s
    return s or "unnamed"


def _gen_op_id(method: str, path: str) -> str:
    parts = [method.lower()]
    for seg in path.strip("/").split("/"):
        if seg.startswith("{") and seg.endswith("}"):
            parts.append("by_" + seg[1:-1])
        elif seg:
            parts.append(seg)
    return "_".join(parts)


def _map_type(schema: dict | None) -> str:
    if not schema:
        return "str"
    return _TYPE_MAP.get(schema.get("type", "string"), "str")


def _resolve_ref(spec: dict, obj: Any) -> Any:
    """Shallow $ref resolver for local (#/…) references."""
    if isinstance(obj, dict):
        if "$ref" in obj:
            ref: str = obj["$ref"]
            if ref.startswith("#/"):
                parts = ref.lstrip("#/").split("/")
                node = spec
                for part in parts:
                    node = node.get(part, {})
                return _resolve_ref(spec, node)
            return obj
        return {k: _resolve_ref(spec, v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_resolve_ref(spec, i) for i in obj]
    return obj


def _detect_auth(spec: dict, title: str) -> tuple[str, str, str]:
    """Returns (auth_type, env_var_name, api_key_header)."""
    prefix = re.sub(r"[^A-Z0-9]", "_", title.upper()).strip("_") or "API"
    schemes = spec.get("components", {}).get("securitySchemes", {})
    for _, scheme in schemes.items():
        stype = scheme.get("type", "").lower()
        if stype == "http":
            http_scheme = scheme.get("scheme", "").lower()
            if http_scheme == "bearer":
                return "bearer", f"{prefix}_API_KEY", ""
            if http_scheme == "basic":
                return "basic", prefix, ""
        elif stype == "apikey":
            header = scheme.get("name", "X-API-Key")
            return "apiKey", f"{prefix}_API_KEY", header
        elif stype == "oauth2":
            return "bearer", f"{prefix}_API_KEY", ""
    return "none", prefix, ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def parse_spec(spec: dict, source_url: str = "") -> tuple[dict, list[ToolSpec]]:
    """
    Parse an OpenAPI 3.x spec dict.

    Returns
    -------
    api_meta : dict
        title, version, base_url, auth_type, env_var_name, api_key_header
    tools : list[ToolSpec]
        One entry per (path, method) operation.
    """
    info  = spec.get("info", {})
    title = info.get("title", "Generated API")

    servers  = spec.get("servers", [])
    base_url = servers[0].get("url", "").rstrip("/") if servers else ""
    
    if source_url and source_url.startswith("http"):
        if base_url.startswith("/"):
            base_url = urljoin(source_url, base_url).rstrip("/")
        elif not base_url:
            base_url = urljoin(source_url, "/").rstrip("/")

    auth_type, env_var_name, api_key_header = _detect_auth(spec, title)

    api_meta = {
        "title":          title,
        "version":        info.get("version", "1.0.0"),
        "base_url":       base_url,
        "auth_type":      auth_type,
        "env_var_name":   env_var_name,
        "api_key_header": api_key_header,
    }

    paths: dict = spec.get("paths", {})
    tools: list[ToolSpec] = []
    seen: dict[str, int] = {}

    for path, path_item in paths.items():
        path_item   = _resolve_ref(spec, path_item)
        path_params = _resolve_ref(spec, path_item.get("parameters", []))

        for method in _HTTP_METHODS:
            operation = path_item.get(method)
            if not operation:
                continue
            operation = _resolve_ref(spec, operation)

            # --- Function name ---
            raw_id = operation.get("operationId") or _gen_op_id(method, path)
            func   = _snake(raw_id)
            if func in seen:
                seen[func] += 1
                func = f"{func}_{seen[func]}"
            else:
                seen[func] = 0

            # --- Description ---
            desc = (
                operation.get("description")
                or operation.get("summary")
                or f"{method.upper()} {path}"
            )
            desc = desc.replace('"""', "'''").replace("\n", " ").strip()

            # --- Parameters ---
            all_param_defs = list(path_params) + list(
                _resolve_ref(spec, operation.get("parameters", []))
            )
            params: list[ParamSpec] = []
            for p in all_param_defs:
                p = _resolve_ref(spec, p)
                loc = p.get("in", "query")
                if loc in ("header", "cookie"):
                    continue  # skip — handled via auth helpers
                schema = _resolve_ref(spec, p.get("schema", {}))
                params.append(
                    ParamSpec(
                        name=p.get("name", "param"),
                        location=loc,
                        py_type=_map_type(schema),
                        required=p.get("required", loc == "path"),
                        description=p.get("description", ""),
                    )
                )

            # --- Request body ---
            has_body = False
            rb = operation.get("requestBody")
            if rb:
                rb = _resolve_ref(spec, rb)
                has_body = bool(rb.get("content"))

            tools.append(
                ToolSpec(
                    name=func,
                    method=method.upper(),
                    path=path,
                    description=desc,
                    params=params,
                    has_body=has_body,
                    base_url=base_url,
                    auth_type=auth_type,
                    env_var_name=env_var_name,
                    api_key_header=api_key_header,
                )
            )

    return api_meta, tools
