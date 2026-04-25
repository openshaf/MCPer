"""
app/runtime/runner.py — Print run instructions after code generation.
"""
from __future__ import annotations

from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.syntax import Syntax

console = Console()


def print_instructions(server_path: Path, apis: list[dict], project_name: str) -> None:
    """Pretty-print everything the user needs to run their new MCP server."""
    console.print()
    console.rule("[bold green]✅  Generation complete")
    console.print()

    # Auth env-var hint
    for api_meta in apis:
        auth_type    = api_meta.get("auth_type", "none")
        env_var_name = api_meta.get("env_var_name", "")
        api_key_hdr  = api_meta.get("api_key_header", "")
        title        = api_meta.get("title", "API")

        if auth_type == "bearer":
            console.print(
                f"[yellow]🔑  {title} Auth required[/] — set env var before running:\n"
                f"   [bold cyan]set {env_var_name}=<your-token>[/]  (Windows)\n"
                f"   [bold cyan]export {env_var_name}=<your-token>[/]  (Linux/macOS)\n"
            )
        elif auth_type == "apiKey":
            console.print(
                f"[yellow]🔑  {title} Auth required[/] — API key sent as header [bold]{api_key_hdr}[/]\n"
                f"   [bold cyan]set {env_var_name}=<your-key>[/]  (Windows)\n"
                f"   [bold cyan]export {env_var_name}=<your-key>[/]  (Linux/macOS)\n"
            )
        elif auth_type == "basic":
            console.print(
                f"[yellow]🔑  {title} Basic auth required[/]\n"
                f"   [bold cyan]set {env_var_name}_USERNAME=...[/]\n"
                f"   [bold cyan]set {env_var_name}_PASSWORD=...[/]\n"
            )

    # Run commands
    run_script = (
        f"cd {server_path.parent}\n"
        f"pip install -r requirements.txt\n"
        f"python server.py"
    )
    console.print(
        Panel(
            Syntax(run_script, "bash", theme="monokai"),
            title="[bold]▶  Run your MCP server",
            border_style="bright_blue",
        )
    )

    # Claude Desktop config snippet
    config = (
        '{\n'
        '  "mcpServers": {\n'
        f'    "{project_name}": {{\n'
        '      "command": "python",\n'
        f'      "args": ["{server_path.as_posix()}"]\n'
        '    }\n'
        '  }\n'
        '}'
    )
    console.print()
    console.print(
        Panel(
            Syntax(config, "json", theme="monokai"),
            title="[bold]🤖  Claude Desktop config snippet",
            border_style="dim",
        )
    )
    console.print()
