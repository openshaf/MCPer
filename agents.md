# Agentic Build Log — Custom MCP Builder

This document summarizes the development process, architectural decisions, and bug fixes implemented by the AI agent during the creation of the **MCPer (Custom MCP Builder)** project.

## 🎯 Project Overview
Developed a command-line utility that dynamically parses OpenAPI 3.x specifications (via URL, auto-discovery, or local file) and automatically generates a fully runnable, local **FastMCP** server. The generated server exposes every API endpoint as a native MCP tool, making it plug-and-play for AI agents and LLMs.

---

## 🏗 Architecture & Modules Implemented

1. **Ingestion Layer (`app/ingest/loader.py`)**
   - Implemented spec loading from local files, direct URLs, and raw string inputs.
   - Built an **auto-discovery feature** that probes common API routes (e.g., `/openapi.json`, `/api-docs/swagger.json`) when given a base API URL.
   
2. **Analysis Layer (`app/analyze/parser.py`)**
   - Parses the OpenAPI spec into an intermediate `ToolSpec` representation.
   - Extracts endpoints, HTTP methods, operation IDs, parameters, and descriptions.
   - Detects API authentication schemes (Bearer, API Key, Basic) and dynamically maps them to environment variables.
   - **Bug Fix:** Implemented `urllib.parse.urljoin` to gracefully handle APIs that specify relative paths in their `servers` array.

3. **Code Generation Layer (`app/generate/codegen.py` & `templates/`)**
   - Utilizes Jinja2 templates (`server.py.j2`, `tool.py.j2`) to scaffold the Python server.
   - Generates fully annotated, type-hinted `@mcp.tool()` functions for FastMCP.
   - **Bug Fix:** Resolved severe indentation and formatting issues caused by Jinja2's aggressive whitespace control macros (`{%-`).
   - **Bug Fix:** Injected `follow_redirects=True` into generated `httpx` calls to automatically resolve HTTP 301/302 redirects (discovered via the XKCD API edge case).

4. **CLI & Runtime (`main.py` & `app/runtime/runner.py`)**
   - Built a rich, terminal-based CLI using the `rich` library.
   - Displays real-time progress spinners, an endpoint summary table, and formatted setup instructions.
   - Auto-generates the exact JSON config snippet required to plug the server into Claude Desktop.

5. **Environment & Dependency Management**
   - Transitioned project initialization and dependency management entirely to **`uv`**.
   - Created isolated, lightning-fast virtual environments with pinned dependencies (`fastmcp`, `httpx`, `pyyaml`, `jinja2`, `rich`).

---

## 🧪 Testing & Integration Edge Cases Resolved

During live testing against the **Swagger Petstore** and **XKCD** APIs, the following integrations were established and debugged:

* **Relative Server URLs:** Modified the parser to construct absolute URLs dynamically if an API spec lacked a hostname.
* **API Server Health (HTTP 500):** Validated that the generated tools correctly bubble up underlying backend failures natively.
* **JSON-RPC Handshake Failures:** Identified that executing `uv run` from a background TUI (like Codex CLI) without a specified context crashes the MCP handshake.
* **Integration Patterns:** Documented the exact execution flags needed (`--directory`, `-q`) to mount the generated Python MCP servers flawlessly into strict MCP clients like **Codex CLI**, **Claude Desktop**, and the **MCP Inspector**.

---

## 🌐 Multi-API Aggregation Feature

Upgraded the architecture to allow ingesting multiple APIs simultaneously into a single unified MCP server:
- **CLI Updates**: Refactored `main.py` arguments (`--api`, `--url`, `--file`, `--raw`) to support `action="append"`. Added an optional `--name` flag to specify the output directory, falling back to a 10-character random string if omitted.
- **Conflict Resolution**: Implemented automatic prefixing for all tools and environment variables (`[api-prefix]_[endpoint_name]`) to prevent naming collisions when combining different APIs (e.g., `petstore_add_pet`, `xkcd_get_info_0_json`).
- **Template Restructuring**: Rewrote `server.py.j2` and `tool.py.j2` to iterate over all loaded APIs, generating isolated configuration blocks for each API (`BASE_URL` and specific auth helpers) at the top of the file, allowing each tool to reference its respective API's config.

---

## 🚀 Final Usage

The system now reliably ingests APIs (single or multiple) and generates code that can be immediately mounted to any agent via:
```bash
uv run main.py --api <API_BASE_URL_1> --api <API_BASE_URL_2> --name <CUSTOM_NAME>
```
Followed by binding it to a client:
```bash
# Example: Adding to Codex CLI
codex mcp add <API_NAME> -- uv run -q --directory "<PROJECT_ROOT>" "<GENERATED_DIR>/server.py"
```
