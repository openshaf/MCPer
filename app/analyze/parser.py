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
    "string": "str",
    "integer": "int",
    "number": "float",
    "boolean": "bool",
    "array": "list",
    "object": "dict",
}

_HTTP_METHODS = ["get", "post", "put", "patch", "delete", "head", "options"]


# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------


@dataclass
class ParamSpec:
    name: str  # original name from the spec
    location: str  # "query" | "path" | "header" | "cookie"
    py_type: str  # Python type string e.g. "str", "int"
    required: bool
    description: str

    @property
    def py_name(self) -> str:
        """Valid Python identifier version of the param name."""
        return re.sub(r"[^a-zA-Z0-9_]", "_", self.name)


@dataclass
class ToolSpec:
    name: str  # Python function name (snake_case)
    method: str  # uppercase HTTP verb
    path: str  # URL path template e.g. /pets/{id}
    description: str
    params: list[ParamSpec] = field(default_factory=list)
    has_body: bool = False  # True when a requestBody exists

    # Filled in from api_meta so each tool is self-contained
    prefix: str = ""
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


def _resolve_ref(spec: dict, obj: Any, visited: set[str] | None = None) -> Any:
    """True shallow $ref resolver for local (#/…) references with cycle protection."""
    if not isinstance(obj, dict):
        if isinstance(obj, list):
            return [_resolve_ref(spec, i, visited) for i in obj]
        return obj

    if "$ref" not in obj:
        return obj  # DO NOT recursively traverse dict values

    ref: str = obj["$ref"]
    if not ref.startswith("#/"):
        return obj

    visited = visited or set()
    if ref in visited:
        return {}  # Cycle detected, break recursion

    visited.add(ref)

    parts = ref.lstrip("#/").split("/")
    node = spec
    for part in parts:
        if isinstance(node, dict):
            node = node.get(part, {})
        elif isinstance(node, list) and part.isdigit():
            idx = int(part)
            node = node[idx] if idx < len(node) else {}
        else:
            node = {}

    return _resolve_ref(spec, node, visited)


def _slugify(text: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]", "_", text.lower()).strip("_")
    return re.sub(r"_+", "_", slug) or "api"


def _detect_auth(spec: dict, prefix: str) -> tuple[str, str, str]:
    """
    Detect the primary auth scheme from an OpenAPI 3.x spec.

    Three-tier search:
      1. Iterate components.securitySchemes (canonical location)
      2. Resolve which schemes are referenced by the global security array
      3. Scan every operation body for a per-operation security field

    Returns (auth_type, env_var_name, api_key_header).
    auth_type is one of: "bearer", "apiKey", "basic", "none"
    """
    prefix = prefix.upper()
    schemes: dict = spec.get("components", {}).get("securitySchemes", {})
    if not schemes and "securityDefinitions" in spec:
        schemes = spec["securityDefinitions"]

    def _scheme_to_auth(scheme: dict) -> tuple[str, str, str] | None:
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
        elif stype in ("oauth2", "openidconnect"):
            return "bearer", f"{prefix}_API_KEY", ""
        return None

    # ── Tier 1: Walk all defined schemes ───────────────────────────────────
    for _, scheme in schemes.items():
        result = _scheme_to_auth(scheme)
        if result:
            return result

    # ── Tier 2: Resolve global spec-level security requirements ────────────
    global_security: list = spec.get("security", [])
    for sec_req in global_security:
        for scheme_name in sec_req.keys():
            if scheme_name in schemes:
                result = _scheme_to_auth(schemes[scheme_name])
                if result:
                    return result
    # Global security declared but scheme lookup failed → assume bearer
    if global_security:
        return "bearer", f"{prefix}_API_KEY", ""

    # ── Tier 3: Scan per-operation security fields ─────────────────────────
    for path_item in spec.get("paths", {}).values():
        if not isinstance(path_item, dict):
            continue
        for method in ("get", "post", "put", "patch", "delete", "head", "options"):
            operation = path_item.get(method)
            if not isinstance(operation, dict):
                continue
            op_security = operation.get("security", [])
            for sec_req in op_security:
                for scheme_name in sec_req.keys():
                    if scheme_name in schemes:
                        result = _scheme_to_auth(schemes[scheme_name])
                        if result:
                            return result
            # Security declared at operation level but no scheme found → bearer
            if op_security:  # any non-empty security block means auth is needed
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
    info = spec.get("info", {})
    title = info.get("title", "Generated API")
    prefix = _slugify(title)

    servers = spec.get("servers", [])
    base_url = servers[0].get("url", "").rstrip("/") if servers else ""

    if not base_url and "swagger" in spec:
        host = spec.get("host", "")
        base_path = spec.get("basePath", "")
        schems = spec.get("schemes", ["https"])
        if host:
            base_url = f"{schems[0]}://{host}{base_path}".rstrip("/")

    if source_url and source_url.startswith("http"):
        if base_url.startswith("/"):
            base_url = urljoin(source_url, base_url).rstrip("/")
        elif not base_url:
            base_url = urljoin(source_url, "/").rstrip("/")

    auth_type, env_var_name, api_key_header = _detect_auth(spec, prefix)

    api_meta = {
        "title": title,
        "prefix": prefix,
        "version": info.get("version", "1.0.0"),
        "base_url": base_url,
        "auth_type": auth_type,
        "env_var_name": env_var_name,
        "api_key_header": api_key_header,
    }

    paths: dict = spec.get("paths", {})
    tools: list[ToolSpec] = []
    seen: dict[str, int] = {}

    for path, path_item in paths.items():
        path_item = _resolve_ref(spec, path_item)
        path_params = _resolve_ref(spec, path_item.get("parameters", []))

        for method in _HTTP_METHODS:
            operation = path_item.get(method)
            if not operation:
                continue
            operation = _resolve_ref(spec, operation)

            # --- Endpoint Sanitation ---
            if operation.get("deprecated", False):
                continue

            desc = (
                operation.get("description", "")
                or operation.get("summary", "")
                or f"{method.upper()} {path}"
            )
            desc_lower = desc.lower()
            if any(kw in desc_lower for kw in ["deprecated", "internal use only", "legacy endpoint"]):
                continue

            path_lower = path.lower()
            if any(kw in path_lower for kw in ["/health", "/ping", "/metrics", "/.well-known"]):
                continue

            # --- Function name ---
            raw_id = operation.get("operationId") or _gen_op_id(method, path)
            base_func = _snake(raw_id)
            func = f"{prefix}_{base_func}"

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
            desc = (
                desc.replace('"""', "'''")
                .replace("\n", " ")
                .replace("\\", "\\\\")
                .strip()
            )

            # --- Parameters ---
            all_param_defs = list(path_params) + list(
                _resolve_ref(spec, operation.get("parameters", []))
            )
            params: list[ParamSpec] = []
            for p in all_param_defs:
                p = _resolve_ref(spec, p)
                loc = p.get("in", "query")
                if loc in ("header", "cookie", "body", "formData"):
                    continue  # skip — handled via auth helpers or requestBody
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
            else:
                for p in all_param_defs:
                    if p.get("in") in ("body", "formData"):
                        has_body = True
                        break

            tools.append(
                ToolSpec(
                    name=func,
                    method=method.upper(),
                    path=path,
                    description=desc,
                    params=params,
                    has_body=has_body,
                    prefix=prefix,
                    base_url=base_url,
                    auth_type=auth_type,
                    env_var_name=env_var_name,
                    api_key_header=api_key_header,
                )
            )

    return api_meta, tools
