# 🚀 Custom MCP Builder

A developer-first tool that converts **OpenAPI / Swagger APIs** into fully functional **MCP (Model Context Protocol) servers**, ready to run locally using **FastMCP**.

---

## 📌 Overview

Custom MCP Builder bridges the gap between traditional APIs and AI agents.

Instead of manually writing MCP servers, this tool:

- Understands your API from OpenAPI specs
- Automatically generates MCP-compatible tools, resources, and prompts
- Spins up a local MCP server on `localhost`

This allows AI agents to **interact with any API instantly**.

---

## ⚡ Key Features

- 📥 **Multi-format Input**
  - Upload `openapi.json` / `.yaml`
  - Paste raw spec
  - Provide Swagger/OpenAPI URL

- 🧠 **Smart API Understanding**
  - Extracts endpoints, parameters, and schemas
  - Detects authentication types (API Key, Bearer, etc.)
  - Filters useful vs noisy endpoints

- 🛠 **Automatic MCP Generation**
  - Converts endpoints into MCP tools
  - Generates resources for documentation
  - Adds prompts for guided usage

- 🖥 **Local MCP Server**
  - Runs on `localhost`
  - Supports `stdio` and HTTP transport
  - Works with MCP-compatible clients

- 🔒 **Safe by Default**
  - Write/delete endpoints require explicit enablement
  - Secrets handled via environment variables

---

## 🏗 Architecture

```
User Input (OpenAPI)
        ↓
Spec Ingestion Layer
        ↓
API Analysis Engine
        ↓
MCP Code Generator (FastMCP)
        ↓
Local MCP Server (localhost)
```

---

## 📂 Project Structure

```
custom-mcp-builder/
│
├── app/
│   ├── ingest/        # OpenAPI parsing & validation
│   ├── analyze/       # Endpoint classification & scoring
│   ├── generate/      # MCP code generation
│   ├── runtime/       # Server execution
│   └── ui/            # Optional frontend
│
├── templates/         # Code templates (Jinja2)
├── generated/         # Output MCP servers
├── examples/          # Sample APIs
├── tests/             # Unit tests
└── README.md
```

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/openshaf/MCPer.git
cd custom-mcp-builder
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Run the Builder

```bash
python main.py
```

---

## 🧪 Usage

### Input Options

- Upload a file:

```bash
--file openapi.json
```

- Use a URL:

```bash
--url https://api.example.com/openapi.json
```

- Paste raw spec (CLI prompt)

---

### Generate MCP Server

```bash
python main.py --file openapi.json
```

Output:

```
generated/
  my_api_mcp/
    server.py
```

---

### Run MCP Server

```bash
cd generated/my_api_mcp
python server.py
```

Server runs on:

```
http://localhost:8000
```

---

## 🔧 Example

### Input (OpenAPI Endpoint)

```json
GET /users
```

### Generated MCP Tool

```python
@mcp.tool()
def get_users():
    """Fetch list of users"""
    return requests.get(BASE_URL + "/users").json()
```

---

## 🧠 How It Works

1. **Parse OpenAPI Spec**
   - Extract paths, methods, schemas

2. **Analyze API**
   - Identify useful endpoints
   - Group by functionality

3. **Generate MCP Components**
   - Tools → API actions
   - Resources → documentation
   - Prompts → usage guidance

4. **Run Server**
   - Hosted locally via FastMCP

---

## 🔐 Security Considerations

- Localhost-only by default
- Secrets stored in `.env`
- Optional filtering of sensitive endpoints
- HTTP mode includes origin validation

---

## 🧩 Future Improvements

- OAuth2 automation
- GraphQL support
- Cloud-hosted MCP registry
- UI dashboard for endpoint selection
- Multi-API composition into a single MCP server

---

## 🎯 MVP Scope

- OpenAPI 3.x support
- REST APIs only
- Local server generation
- Manual endpoint selection
- Basic authentication support

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repo
2. Create a feature branch
3. Submit a PR

---

## 📄 License

MIT License

---

## 💡 Vision

In a world of AI agents, **tools define capability**.

Custom MCP Builder makes every API instantly usable by AI —
no manual wiring, no boilerplate, just plug and play.

---
