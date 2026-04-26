# MCPer

**MCPer** is a developer tool that converts OpenAPI 3.x specifications into fully functional [FastMCP](https://github.com/jlowin/fastmcp) servers. Point it at any API, and it generates a ready-to-run Python MCP server exposing every endpoint as a native tool — no boilerplate required.

---

## Overview

MCPer bridges traditional REST APIs and AI agent frameworks. Instead of manually authoring MCP server code, MCPer:

- Ingests an OpenAPI spec from a URL, a local file, or via auto-discovery from a base API URL
- Parses all endpoints, parameters, request bodies, and authentication schemes
- Renders a complete, type-annotated FastMCP server using Jinja2 templates
- Outputs a server that is immediately mountable in Claude Desktop, Codex CLI, or the MCP Inspector

---

## Architecture

```
User Input (URL / file)
        |
        v
  Ingestion Layer          app/ingest/loader.py
        |
        v
  Analysis Engine          app/analyze/parser.py
        |
        v
  Code Generator           app/generate/codegen.py + templates/
        |
        v
  Generated MCP Server     generated/<name>/server.py
```

### Frontend (Next.js)

A web interface is included under `frontend/`. It communicates with a local FastAPI backend (`api.py`) running on port 8000 via a Next.js API proxy route.

```
Browser
  |
  v
Next.js (port 3000)  --  /api/build proxy  -->  FastAPI (port 8000)  -->  main.py CLI
```

---

## Project Structure

```
MCPer/
├── app/
│   ├── ingest/         # Spec loading: URL, file, auto-discovery
│   ├── analyze/        # OpenAPI parsing, endpoint extraction, auth detection
│   ├── generate/       # FastMCP code generation via Jinja2
│   └── runtime/        # CLI output formatting and run instructions
├── templates/
│   ├── server.py.j2    # Main server scaffold
│   └── tool.py.j2      # Per-endpoint tool function
├── frontend/           # Next.js + Tailwind + TypeScript web interface
├── generated/          # Output directory for generated MCP servers
├── main.py             # CLI entry point
├── api.py              # FastAPI backend (for the web interface)
└── pyproject.toml
```

---

## Requirements

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) (package and environment manager)
- Node.js 18+ (for the web frontend)

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/openshaf/MCPer.git
cd MCPer
```

### Install Python dependencies

```bash
uv sync
```

### Run via CLI

```bash
# Auto-discover the spec from a base API URL (recommended)
uv run main.py --api https://petstore3.swagger.io/api/v3

# Point directly at a spec file URL
uv run main.py --url https://petstore3.swagger.io/api/v3/openapi.json

# Use a local spec file
uv run main.py --file ./openapi.json
```

The generated server will be written to `generated/<api-name>/server.py`.

### Run the generated server

```bash
uv run generated/<api-name>/server.py
```

---

## Web Interface

The frontend provides a visual way to submit API URLs and retrieve the generated server configuration.

### Start the FastAPI backend

```bash
uv run api.py
```

### Start the Next.js frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Connecting to an MCP Client

### Claude Desktop

Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "my-api": {
      "command": "uv",
      "args": [
        "run",
        "-q",
        "--directory",
        "/absolute/path/to/generated/my-api",
        "/absolute/path/to/generated/my-api/server.py"
      ]
    }
  }
}
```

### Codex CLI

```bash
codex mcp add my-api -- uv run -q --directory "/path/to/generated/my-api" "/path/to/generated/my-api/server.py"
```

### MCP Inspector

```bash
npx @modelcontextprotocol/inspector uv run -q --directory "/path/to/generated/my-api" "server.py"
```

---

## Features

| Feature | Details |
|---|---|
| Auto-discovery | Probes common spec paths (`/openapi.json`, `/swagger.json`, etc.) from a base URL |
| Auth detection | Detects Bearer, API Key, and Basic auth; maps credentials to environment variables |
| Redirect handling | Generated `httpx` calls include `follow_redirects=True` |
| Type-annotated output | All tool functions are fully typed and compatible with FastMCP |
| Relative server URLs | Constructs absolute URLs from specs that use relative paths in the `servers` array |

---

## Known Limitations

- **Single API per server**: Each generated server corresponds to one API. Multi-API composition into a single server is planned but not yet implemented.
- **OpenAPI 3.x only**: Swagger 2.0 (OpenAPI 2) is not supported.
- **REST only**: GraphQL, gRPC, and other protocols are out of scope.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a pull request

---

## License

MIT
