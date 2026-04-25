"""
app/generate/codegen.py — Render a FastMCP server from ToolSpec objects via Jinja2.
"""
from __future__ import annotations

import re
from datetime import datetime, timezone
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined

from app.analyze.parser import ToolSpec

_TEMPLATES_DIR = Path(__file__).parent.parent.parent / "templates"


def _jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATES_DIR)),
        undefined=StrictUndefined,
        trim_blocks=True,
        lstrip_blocks=True,
    )


def _render_tool(env: Environment, tool: ToolSpec) -> str:
    tmpl = env.get_template("tool.py.j2")
    return tmpl.render(
        name=tool.name,
        method=tool.method,
        path=tool.path,
        description=tool.description,
        params=tool.params,
        path_params=tool.path_params,
        query_params=tool.query_params,
        has_body=tool.has_body,
    )


def _project_slug(title: str) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]", "_", title.lower()).strip("_")
    return re.sub(r"_+", "_", slug) or "api"


def generate(
    api_meta: dict,
    tools: list[ToolSpec],
    output_root: Path,
    source: str = "",
) -> Path:
    """
    Render server.py + requirements.txt into output_root/<project_name>/.
    Returns the path to the generated server.py.
    """
    project_name = _project_slug(api_meta["title"])
    out_dir = output_root / project_name
    out_dir.mkdir(parents=True, exist_ok=True)

    env = _jinja_env()

    rendered_tools = [_render_tool(env, t) for t in tools]

    server_code = env.get_template("server.py.j2").render(
        api_title=api_meta["title"],
        base_url=api_meta["base_url"],
        auth_type=api_meta["auth_type"],
        env_var_name=api_meta["env_var_name"],
        api_key_header=api_meta["api_key_header"],
        generated_at=datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"),
        source=source,
        tools=rendered_tools,
    )

    server_path = out_dir / "server.py"
    server_path.write_text(server_code, encoding="utf-8")

    reqs_path = out_dir / "requirements.txt"
    reqs_path.write_text(
        "fastmcp>=2.0.0\nhttpx>=0.27.0\n",
        encoding="utf-8",
    )

    return server_path
