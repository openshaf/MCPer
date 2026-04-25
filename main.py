"""
main.py — CLI entry point for Custom MCP Builder.

Usage
-----
  python main.py --api  https://petstore3.swagger.io/api/v3      # auto-discover spec
  python main.py --url  https://petstore3.swagger.io/api/v3/openapi.json
  python main.py --file openapi.json
  python main.py --raw  '{"openapi":"3.0.0",...}'
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

from rich.console import Console
from rich.panel import Panel
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.table import Table

from app.ingest.loader import load_spec
from app.analyze.parser import parse_spec
from app.generate.codegen import generate
from app.runtime.runner import print_instructions

console = Console()

GENERATED_DIR = Path(__file__).parent / "generated"


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="mcpbuilder",
        description="Turn any OpenAPI 3.x spec into a ready-to-run FastMCP server.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Auto-discover the spec from a base API URL  (recommended — just paste the API root)
  python main.py --api https://petstore3.swagger.io/api/v3

  # Point directly at a remote spec file
  python main.py --url https://petstore3.swagger.io/api/v3/openapi.json

  # Use a local spec file
  python main.py --file ./openapi.json

  # Pipe raw JSON/YAML
  python main.py --raw "$(cat openapi.yaml)"
        """,
    )
    src = p.add_mutually_exclusive_group(required=True)
    src.add_argument(
        "--api",
        metavar="BASE_URL",
        help=(
            "Base URL of the API. MCPer will automatically probe well-known paths "
            "(/openapi.json, /swagger.json, …) to find the spec — "
            "you don't need to know the spec URL."
        ),
    )
    src.add_argument(
        "--url",
        metavar="SPEC_URL",
        help="Direct URL to the OpenAPI spec file (JSON or YAML).",
    )
    src.add_argument(
        "--file",
        metavar="PATH",
        help="Path to a local OpenAPI spec file (JSON or YAML).",
    )
    src.add_argument(
        "--raw",
        metavar="STRING",
        help="Raw OpenAPI spec as a JSON or YAML string.",
    )
    p.add_argument(
        "--out",
        metavar="DIR",
        default=str(GENERATED_DIR),
        help=f"Output directory (default: {GENERATED_DIR})",
    )
    return p


# ---------------------------------------------------------------------------
# Step helpers
# ---------------------------------------------------------------------------

def _step_load(args: argparse.Namespace) -> tuple[dict, str]:
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        if args.api:
            task = prog.add_task(f"🔍  Auto-discovering spec from {args.api} …")
        elif args.url:
            task = prog.add_task(f"⬇️   Fetching spec from {args.url} …")
        elif args.file:
            task = prog.add_task(f"📂  Loading {args.file} …")
        else:
            task = prog.add_task("📝  Parsing raw spec …")

        spec, source = load_spec(
            api=args.api,
            url=args.url,
            file=args.file,
            raw=args.raw,
        )
        prog.update(task, completed=True)

    info = spec.get("info", {})
    console.print(
        f"[green]✓[/] Loaded spec: [bold]{info.get('title', 'Untitled')}[/] "
        f"v{info.get('version', '?')}  ([dim]{source}[/])"
    )
    return spec, source


def _step_analyze(spec: dict, source: str) -> tuple[dict, list]:
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        task = prog.add_task("🔬  Analysing endpoints …")
        api_meta, tools = parse_spec(spec, source)
        prog.update(task, completed=True)

    # Summary table
    table = Table(
        "Method", "Path", "Function", "Params", "Body",
        title=f"[bold]📋  Found {len(tools)} endpoint(s)",
        show_lines=False,
        header_style="bold magenta",
    )
    METHOD_COLORS = {
        "GET": "green", "POST": "yellow", "PUT": "cyan",
        "PATCH": "blue", "DELETE": "red",
    }
    for t in tools:
        color = METHOD_COLORS.get(t.method, "white")
        table.add_row(
            f"[{color}]{t.method}[/]",
            t.path,
            f"[cyan]{t.name}[/]",
            str(len(t.params)),
            "✓" if t.has_body else "–",
        )
    console.print(table)
    console.print()

    # Auth hint
    if api_meta["auth_type"] != "none":
        console.print(
            f"[yellow]🔒  Auth detected:[/] {api_meta['auth_type']}  "
            f"→ env var [bold cyan]{api_meta['env_var_name']}[/]"
        )
        console.print()

    return api_meta, tools


def _step_generate(api_meta: dict, tools: list, out: Path, source: str) -> Path:
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        task = prog.add_task(f"⚙️   Generating MCP server ({len(tools)} tools) …")
        server_path = generate(api_meta, tools, out, source)
        prog.update(task, completed=True)

    console.print(
        f"[green]✓[/] Server written to [bold]{server_path}[/]"
    )
    return server_path


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    console.print(
        Panel(
            "[bold white]MCPer[/] — Custom MCP Builder\n"
            "[dim]Turns any OpenAPI 3.x spec into a FastMCP server[/]",
            border_style="bright_magenta",
            padding=(0, 2),
        )
    )

    parser = build_parser()
    args   = parser.parse_args()
    out    = Path(args.out)

    try:
        # 1. Load
        spec, source = _step_load(args)

        # 2. Analyse
        api_meta, tools = _step_analyze(spec, source)

        if not tools:
            console.print("[red]No endpoints found in the spec. Nothing to generate.[/]")
            sys.exit(1)

        # 3. Generate
        server_path = _step_generate(api_meta, tools, out, source)

        # 4. Print run instructions
        print_instructions(server_path, api_meta)

    except (ValueError, FileNotFoundError) as exc:
        console.print(f"\n[bold red]Error:[/] {exc}")
        sys.exit(1)
    except KeyboardInterrupt:
        console.print("\n[dim]Aborted.[/]")
        sys.exit(0)


if __name__ == "__main__":
    main()
