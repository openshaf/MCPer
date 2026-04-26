from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Literal, List, Optional
import os
import random
import string
from pathlib import Path

from app.ingest.loader import load_spec
from app.analyze.parser import parse_spec
from app.generate.codegen import generate

app = FastAPI(title="MCPer API")

# Add CORS middleware if the frontend calls this directly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ApiInput(BaseModel):
    mode: Literal["api", "url", "file"]
    value: str
    name: Optional[str] = None
    api_key: Optional[str] = None  # optional API key for authenticated specs

class BuildRequest(BaseModel):
    apis: List[ApiInput]

GENERATED_DIR = Path(__file__).parent / "generated"

@app.get("/")
def read_root():
    return {"message": "MCPer FastAPI Backend is running. Use the Next.js frontend at http://localhost:3000"}

@app.post("/verify")
def verify_api(api_input: ApiInput):
    try:
        spec, source = load_spec(
            api=api_input.value.strip() if api_input.mode == "api" else None,
            url=api_input.value.strip() if api_input.mode == "url" else None,
            raw=api_input.value if api_input.mode == "file" else None,
            api_key=api_input.api_key or None,
        )
        api_meta, tools = parse_spec(spec, source)
        if not tools:
            raise ValueError("No endpoints found in the specification.")
        
        return {
            "success": True,
            "apiTitle": api_meta.get("title", "Unknown API"),
            "endpointCount": len(tools)
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/build")
def build_mcp_server(req: BuildRequest):
    if not req.apis:
        raise HTTPException(status_code=400, detail="No APIs provided.")

    loaded_specs = []
    
    for api_input in req.apis:
        try:
            spec, source = load_spec(
                api=api_input.value.strip() if api_input.mode == "api" else None,
                url=api_input.value.strip() if api_input.mode == "url" else None,
                raw=api_input.value if api_input.mode == "file" else None,
                api_key=api_input.api_key or None,
            )
            loaded_specs.append((spec, source, api_input.api_key))
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to load spec for {api_input.name or 'unnamed'}: {e}")

    # Analyze
    all_apis = []
    all_tools = []

    for spec, source, api_key in loaded_specs:
        api_meta, tools = parse_spec(spec, source)
        # If the user supplied an API key override, store it in meta
        if api_key:
            api_meta["user_api_key"] = api_key
        all_apis.append(api_meta)
        all_tools.extend(tools)
        
    if not all_tools:
        raise HTTPException(status_code=400, detail="No endpoints found in the specs.")

    # Determine Project Name
    project_name = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))
    # We can use the first API's name if available
    for api_input in req.apis:
        if api_input.name:
            project_name = api_input.name
            break

    # Generate
    try:
        server_path = generate(all_apis, all_tools, GENERATED_DIR, project_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    # Build response metrics
    first_server_path = str(server_path)
    total_endpoints = len(all_tools)
    
    # Emulate the config snippet generation from Next.js route
    # Note: the Next.js route previously mapped each API separately, but our unified generator
    # creates ONE server with all tools. The config snippet should point to this one server.
    
    import json
    run_command = f'uv run -q --directory "{server_path.parent}" "{server_path}"'
    
    config_snippet = {
        "mcpServers": {
            project_name.lower().replace(" ", "_"): {
                "command": "uv",
                "args": [
                    "run",
                    "-q",
                    "--directory",
                    str(server_path.parent),
                    str(server_path)
                ]
            }
        }
    }

    return {
        "serverPath": first_server_path,
        "apiNames": [a.get("title", "Unknown") for a in all_apis],
        "totalEndpoints": total_endpoints,
        "configSnippet": json.dumps(config_snippet, indent=2),
        "runCommand": run_command
    }
