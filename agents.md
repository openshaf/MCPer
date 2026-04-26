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

## 🌐 Next.js Frontend Integration

## 🌐 Next.js Frontend Integration

To provide a seamless user experience, a Next.js web interface was integrated to orchestrate the backend Python process. The architecture was recently refactored from a CLI-based child process to a localized client-server model:
- **FastAPI Backend (`api.py`)**: A local Uvicorn server runs the MCPer generation logic, exposing a `POST /build` REST endpoint.
- **API Bridge Route**: The Next.js App Router API route (`src/app/api/build/route.ts`) acts as a proxy, forwarding user requests (API URLs or raw spec files) to the local FastAPI server.
- **Response Handling**: The FastAPI backend performs the generation and returns the generated server path, total endpoint count, and the Claude Desktop configuration snippet as a JSON response, which the React frontend displays.

---

## 🔐 User Authentication & Dashboard

Added a complete user authentication system and build-history dashboard:

- **Supabase Auth**: Email/password registration and login via `supabase-py`. Access tokens returned by Supabase are used directly as Bearer tokens throughout the stack.
- **FastAPI auth endpoints**: `POST /auth/register`, `POST /auth/login`, `GET /auth/me` validate and return Supabase sessions.
- **Auth-optional `/build`**: Anonymous users can still generate MCP servers (for demo/judge access). Authenticated users get their builds saved to Supabase automatically.
- **`GET /builds`**: Returns authenticated user's full build history from the `mcper_builds` table.
- **Frontend**: Login/register page at `/auth`, dashboard at `/dashboard` (protected by `AuthGuard`). Auth token stored in `localStorage`. Nav shows Sign In / Dashboard / username / Sign Out depending on state.
- **`ServerCodeViewer` component**: Modal for displaying full generated Python code or `.env` file content with copy-all and download buttons.

### Supabase Table Schema (run in Supabase SQL editor)

```sql
-- mcper_profiles: synced from auth.users
CREATE TABLE IF NOT EXISTS public.mcper_profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username   TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.mcper_handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.mcper_profiles (id, username)
    VALUES (new.id, new.raw_user_meta_data->>'username');
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER mcper_on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.mcper_handle_new_user();

-- mcper_builds: build history
CREATE TABLE IF NOT EXISTS public.mcper_builds (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name    TEXT NOT NULL,
    api_names       TEXT NOT NULL DEFAULT '[]',
    total_endpoints INTEGER NOT NULL DEFAULT 0,
    config_snippet  TEXT NOT NULL,
    run_command     TEXT NOT NULL,
    server_code     TEXT NOT NULL,
    env_template    TEXT NOT NULL DEFAULT '',
    server_slug     TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.mcper_builds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own builds"   ON public.mcper_builds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own builds" ON public.mcper_builds FOR INSERT WITH CHECK (auth.uid() = user_id);
```

> **Prisma coexistence**: All MCPer tables are prefixed `mcper_` to avoid conflicts with the teammate's Prisma-managed tables in the same Supabase project. MCPer uses `supabase-py` directly (no Prisma).

---

## 🔑 .env-Based API Key Management

Removed API key collection from MCPer entirely. Instead:

- **No API key input field** in the frontend — the "🔑 Add API key" section was deleted from `ApiEntryCard.tsx`
- **Auth detection hint**: After spec verification, if authentication is required, a callout appears telling the user to fill in their key in the generated `.env` file
- **Generated `.env`**: `templates/env.j2` generates a `.env` file alongside `server.py` with blank placeholders for each required env var
- **Generated `.env.example`**: `templates/env_example.j2` generates a commitable example file with placeholder values and comments
- **`server.py.j2` updated**: Added `from dotenv import load_dotenv` + `load_dotenv()` at startup. All `os.environ.get()` calls have no hardcoded fallback key values
- **`codegen.py` updated**: `generate()` now returns a dict (`server_path`, `server_code`, `env_template`, `server_slug`) instead of just a path, enabling inline return in the API response
- **`requirements.txt`** in generated servers now includes `python-dotenv>=1.0.0`


The system now reliably ingests APIs (single or multiple) and generates code that can be immediately mounted to any agent via:
```bash
uv run main.py --api <API_BASE_URL_1> --api <API_BASE_URL_2> --name <CUSTOM_NAME>
```
Followed by binding it to a client:
```bash
# Example: Adding to Codex CLI
codex mcp add <API_NAME> -- uv run -q --directory "<PROJECT_ROOT>" "<GENERATED_DIR>/server.py"
```
