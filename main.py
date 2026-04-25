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
        description="Turn one or more OpenAPI 3.x specs into a ready-to-run FastMCP server.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    p.add_argument("--api", action="append", default=[], help="Base URL of the API to auto-discover")
    p.add_argument("--url", action="append", default=[], help="Direct URL to the OpenAPI spec")
    p.add_argument("--file", action="append", default=[], help="Path to a local OpenAPI spec file")
    p.add_argument("--raw", action="append", default=[], help="Raw OpenAPI spec string")
    p.add_argument(
        "--name",
        help="Name of the generated project. If omitted, a random 10-character name will be generated.",
    )
    p.add_argument(
        "--out",
        default=str(GENERATED_DIR),
        help=f"Output directory (default: {GENERATED_DIR})",
    )
    return p


# ---------------------------------------------------------------------------
# Step helpers
# ---------------------------------------------------------------------------

def _step_load(args: argparse.Namespace) -> list[tuple[dict, str]]:
    results = []
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        for api in args.api:
            task = prog.add_task(f"🔍  Auto-discovering spec from {api} …")
            results.append(load_spec(api=api))
            prog.update(task, completed=True)
            
        for url in args.url:
            task = prog.add_task(f"⬇️   Fetching spec from {url} …")
            results.append(load_spec(url=url))
            prog.update(task, completed=True)
            
        for file in args.file:
            task = prog.add_task(f"📂  Loading {file} …")
            results.append(load_spec(file=file))
            prog.update(task, completed=True)
            
        for raw in args.raw:
            task = prog.add_task("📝  Parsing raw spec …")
            results.append(load_spec(raw=raw))
            prog.update(task, completed=True)

    for spec, source in results:
        info = spec.get("info", {})
        console.print(
            f"[green]✓[/] Loaded spec: [bold]{info.get('title', 'Untitled')}[/] "
            f"v{info.get('version', '?')}  ([dim]{source}[/])"
        )
    return results


def _step_analyze(loaded_specs: list[tuple[dict, str]]) -> tuple[list[dict], list]:
    all_apis = []
    all_tools = []
    
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        task = prog.add_task("🔬  Analysing endpoints …")
        for spec, source in loaded_specs:
            api_meta, tools = parse_spec(spec, source)
            all_apis.append(api_meta)
            all_tools.extend(tools)
        prog.update(task, completed=True)

    # Summary table
    table = Table(
        "API", "Method", "Path", "Function", "Params", "Body",
        title=f"[bold]📋  Found {len(all_tools)} endpoint(s) across {len(all_apis)} API(s)",
        show_lines=False,
        header_style="bold magenta",
    )
    METHOD_COLORS = {
        "GET": "green", "POST": "yellow", "PUT": "cyan",
        "PATCH": "blue", "DELETE": "red",
    }
    for t in all_tools:
        color = METHOD_COLORS.get(t.method, "white")
        table.add_row(
            t.prefix,
            f"[{color}]{t.method}[/]",
            t.path,
            f"[cyan]{t.name}[/]",
            str(len(t.params)),
            "✓" if t.has_body else "–",
        )
    console.print(table)
    console.print()

    # Auth hints
    for api_meta in all_apis:
        if api_meta["auth_type"] != "none":
            console.print(
                f"[yellow]🔒  Auth detected for {api_meta['title']}:[/] {api_meta['auth_type']}  "
                f"→ env var [bold cyan]{api_meta['env_var_name']}[/]"
            )
    console.print()

    return all_apis, all_tools


def _step_generate(apis: list[dict], tools: list, out: Path, project_name: str) -> Path:
    with Progress(
        SpinnerColumn(),
        TextColumn("[bold blue]{task.description}"),
        console=console,
        transient=True,
    ) as prog:
        task = prog.add_task(f"⚙️   Generating MCP server ({len(tools)} tools) …")
        server_path = generate(apis, tools, out, project_name)
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
            "[dim]Turns OpenAPI specs into a FastMCP server[/]",
            border_style="bright_magenta",
            padding=(0, 2),
        )
    )

    parser = build_parser()
    args   = parser.parse_args()
    out    = Path(args.out)

    if not (args.api or args.url or args.file or args.raw):
        console.print("[red]Please provide at least one API source (--api, --url, --file, or --raw).[/]")
        sys.exit(1)

    import random
    import string
    project_name = args.name
    if not project_name:
        project_name = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))

    try:
        # 1. Load
        loaded_specs = _step_load(args)

        # 2. Analyse
        apis, tools = _step_analyze(loaded_specs)

        if not tools:
            console.print("[red]No endpoints found in the specs. Nothing to generate.[/]")
            sys.exit(1)

        # 3. Generate
        server_path = _step_generate(apis, tools, out, project_name)

        # 4. Print run instructions
        from app.runtime.runner import print_instructions
        print_instructions(server_path, apis, project_name)

    except (ValueError, FileNotFoundError) as exc:
        console.print(f"\n[bold red]Error:[/] {exc}")
        sys.exit(1)
    except KeyboardInterrupt:
        console.print("\n[dim]Aborted.[/]")
        sys.exit(0)


if __name__ == "__main__":
    main()
