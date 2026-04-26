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
        prefix=tool.prefix,
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
    apis: list[dict],
    tools: list[ToolSpec],
    output_root: Path,
    project_name: str,
) -> dict:
    """
    Render server.py, .env, .env.example, and requirements.txt into
    output_root/<project_slug>/.

    Returns a dict containing:
        server_path   — Path object pointing to the generated server.py
        server_code   — full content of server.py as a string
        env_template  — content of the generated .env as a string
        server_slug   — directory name (slug)
    """
    slug = _project_slug(project_name)
    out_dir = output_root / slug
    out_dir.mkdir(parents=True, exist_ok=True)

    env = _jinja_env()

    generated_at = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    render_ctx = dict(project_name=project_name, apis=apis, generated_at=generated_at)

    # ── server.py ────────────────────────────────────────────────────────────
    rendered_tools = [_render_tool(env, t) for t in tools]
    server_code = env.get_template("server.py.j2").render(
        **render_ctx,
        tools=rendered_tools,
    )
    server_path = out_dir / "server.py"
    server_path.write_text(server_code, encoding="utf-8")

    # ── .env (blank placeholders) ────────────────────────────────────────────
    env_content = env.get_template("env.j2").render(**render_ctx)
    env_path = out_dir / ".env"
    env_path.write_text(env_content, encoding="utf-8")

    # ── .env.example (with placeholder values & comments) ────────────────────
    env_example_content = env.get_template("env_example.j2").render(**render_ctx)
    env_example_path = out_dir / ".env.example"
    env_example_path.write_text(env_example_content, encoding="utf-8")

    # ── requirements.txt ─────────────────────────────────────────────────────
    reqs_path = out_dir / "requirements.txt"
    reqs_path.write_text(
        "fastmcp>=2.0.0\nhttpx>=0.27.0\npython-dotenv>=1.0.0\n",
        encoding="utf-8",
    )

    return {
        "server_path":  server_path,
        "server_code":  server_code,
        "env_template": env_content,
        "server_slug":  slug,
    }
