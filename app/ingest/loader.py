"""
app/ingest/loader.py — OpenAPI spec ingestion.

Supports:
  - Auto-discovery from a base API URL  (--api)
  - Explicit URL to a spec              (--url)
  - Local file path                     (--file)
  - Raw JSON/YAML string                (--raw)
"""
from __future__ import annotations

import json
from pathlib import Path

import httpx
import yaml

# Ordered list of well-known OpenAPI/Swagger discovery paths
DISCOVERY_PATHS = [
    "/openapi.json",
    "/openapi.yaml",
    "/openapi.yml",
    "/swagger.json",
    "/swagger.yaml",
    "/swagger.yml",
    "/api-docs",
    "/api-docs/swagger.json",
    "/api/openapi.json",
    "/api/swagger.json",
    "/api/docs/openapi.json",
    "/v1/openapi.json",
    "/v2/openapi.json",
    "/v3/openapi.json",
    "/docs/openapi.json",
    "/spec/openapi.json",
    "/.well-known/openapi.json",
]


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _parse_content(content: str, source: str = "") -> dict:
    """Try JSON first, then YAML. Raise ValueError on failure."""
    content = content.strip()
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        pass
    try:
        result = yaml.safe_load(content)
        if isinstance(result, dict):
            return result
    except yaml.YAMLError:
        pass
    raise ValueError(f"Cannot parse content from {source!r} as JSON or YAML.")


def _validate(spec: dict) -> None:
    """Ensure this is a somewhat valid OpenAPI/Swagger document."""
    if "openapi" not in spec and "swagger" not in spec:
        raise ValueError("Not a valid OpenAPI/Swagger spec: missing 'openapi' or 'swagger' field.")



# ---------------------------------------------------------------------------
# Public loaders
# ---------------------------------------------------------------------------

def load_from_file(path: str) -> dict:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"File not found: {path}")
    spec = _parse_content(p.read_text(encoding="utf-8"), path)
    _validate(spec)
    return spec


def load_from_url(url: str) -> dict:
    try:
        resp = httpx.get(url, timeout=15, follow_redirects=True)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        raise ValueError(f"Failed to fetch {url!r}: {exc}") from exc

    spec = _parse_content(resp.text, url)
    _validate(spec)
    return spec


def load_from_raw(raw: str) -> dict:
    spec = _parse_content(raw, "<raw string>")
    _validate(spec)
    return spec


def load_from_api(base_url: str) -> tuple[dict, str]:
    """
    Auto-discover an OpenAPI spec by probing common paths under *base_url*.

    Returns (spec_dict, discovered_url).
    Raises ValueError if no spec is found.
    """
    base_url = base_url.rstrip("/")
    tried: list[str] = []

    with httpx.Client(timeout=10, follow_redirects=True) as client:
        for path in DISCOVERY_PATHS:
            url = base_url + path
            tried.append(url)

            try:
                resp = client.get(url)
                resp.raise_for_status()
            except (httpx.ConnectError, httpx.TimeoutException, httpx.RequestError):
                continue
            except httpx.HTTPStatusError:
                continue

            if resp.status_code != 200:
                continue

            ct = resp.headers.get("content-type", "")
            if not any(t in ct for t in ["json", "yaml", "text", "octet", "x-yaml"]):
                # Accept empty content-type too — some servers omit it
                if ct and "html" in ct:
                    continue

            try:
                spec = _parse_content(resp.text, url)
                _validate(spec)
                return spec, url
            except (ValueError, Exception):
                continue

    raise ValueError(
        f"Could not auto-discover an OpenAPI 3.x spec from {base_url!r}.\n"
        f"Tried {len(tried)} common paths. Examples:\n"
        + "\n".join(f"  {u}" for u in tried[:8])
        + ("\n  ..." if len(tried) > 8 else "")
        + "\n\nTip: use --url to point directly at the spec, or --file for a local file."
    )


# ---------------------------------------------------------------------------
# Unified entry point
# ---------------------------------------------------------------------------

def load_spec(
    *,
    api: str | None = None,
    url: str | None = None,
    file: str | None = None,
    raw: str | None = None,
    auto: str | None = None,
) -> tuple[dict, str]:
    """
    Load and validate an OpenAPI 3.x spec from any source.
    Returns (spec_dict, source_description).
    """
    if auto:
        # Smart detection for unknown inputs
        lower_link = auto.split("?")[0].lower()
        if lower_link.endswith((".json", ".yaml", ".yml")):
            return load_from_url(auto), auto
        else:
            spec, discovered = load_from_api(auto)
            return spec, discovered

    if api:
        spec, discovered = load_from_api(api)
        return spec, discovered
    if url:
        return load_from_url(url), url
    if file:
        return load_from_file(file), file
    if raw:
        return load_from_raw(raw), "<raw string>"
    
    raise ValueError("Provide one of: --api, --url, --file, --raw, or --auto")
