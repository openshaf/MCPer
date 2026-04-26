"""
api.py — MCPer FastAPI Backend

Endpoints:
  POST /auth/register      Create a new user account
  POST /auth/login         Sign in, receive a Supabase access token
  GET  /auth/me            Validate token, return current user info
  POST /verify             Verify an API spec (public — no auth required)
  POST /build              Generate an MCP server (auth optional; saved if authenticated)
  GET  /builds             Return authenticated user's build history
"""
from __future__ import annotations

import json
import os
import random
import string
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load MCPer's own .env (Supabase credentials etc.) before anything else
load_dotenv()

from app.database import get_user_from_token, sign_in, sign_up, save_build, get_user_builds
from app.ingest.loader import load_spec
from app.analyze.parser import parse_spec
from app.generate.codegen import generate

# ---------------------------------------------------------------------------
# App setup
# ---------------------------------------------------------------------------

app = FastAPI(title="MCPer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

GENERATED_DIR = Path(__file__).parent / "generated"


# ---------------------------------------------------------------------------
# Auth helpers
# ---------------------------------------------------------------------------

def _get_current_user(request: Request) -> dict | None:
    """
    Extract and validate the Supabase access token from the Authorization header.
    Returns the user dict if valid, None if missing or invalid.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    token = auth_header.removeprefix("Bearer ").strip()
    if not token:
        return None
    return get_user_from_token(token)


def _require_user(request: Request) -> dict:
    """Like _get_current_user but raises 401 if not authenticated."""
    user = _get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class RegisterRequest(BaseModel):
    email: str
    password: str
    username: str

class LoginRequest(BaseModel):
    email: str
    password: str

class ApiInput(BaseModel):
    mode: str           # "api" | "url" | "file"
    value: str
    name: Optional[str] = None
    # NOTE: api_key intentionally removed — users add keys to the generated .env file

class BuildRequest(BaseModel):
    apis: list[ApiInput]
    project_name: Optional[str] = None


# ---------------------------------------------------------------------------
# Root
# ---------------------------------------------------------------------------

@app.get("/")
def read_root():
    return {"message": "MCPer API is running. Frontend: http://localhost:3000"}


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

@app.post("/auth/register")
def register(body: RegisterRequest):
    if not body.email or not body.password or not body.username:
        raise HTTPException(status_code=400, detail="email, password, and username are required.")
    try:
        user = sign_up(body.email, body.password, body.username)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@app.post("/auth/login")
def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="email and password are required.")
    try:
        user = sign_in(body.email, body.password)
        return user
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc))


@app.get("/auth/me")
def get_me(request: Request):
    user = _get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user


# ---------------------------------------------------------------------------
# Verify (public — no auth needed)
# ---------------------------------------------------------------------------

@app.post("/verify")
def verify_api(api_input: ApiInput):
    try:
        spec, source = load_spec(
            api=api_input.value.strip() if api_input.mode == "api" else None,
            url=api_input.value.strip() if api_input.mode == "url" else None,
            raw=api_input.value if api_input.mode == "file" else None,
        )
        api_meta, tools = parse_spec(spec, source)
        if not tools:
            raise ValueError("No endpoints found in the specification.")
        return {
            "success": True,
            "apiTitle": api_meta.get("title", "Unknown API"),
            "endpointCount": len(tools),
            "authType": api_meta.get("auth_type", "none"),
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------------------------------------------------------------------
# Build (auth optional — anonymous builds work but aren't saved)
# ---------------------------------------------------------------------------

@app.post("/build")
def build_mcp_server(req: BuildRequest, request: Request):
    if not req.apis:
        raise HTTPException(status_code=400, detail="No APIs provided.")

    # Identify who is building (may be None for anonymous)
    current_user = _get_current_user(request)

    # ── Load specs ──────────────────────────────────────────────────────────
    loaded_specs: list[tuple[dict, str]] = []
    for api_input in req.apis:
        try:
            spec, source = load_spec(
                api=api_input.value.strip() if api_input.mode == "api" else None,
                url=api_input.value.strip() if api_input.mode == "url" else None,
                raw=api_input.value if api_input.mode == "file" else None,
            )
            loaded_specs.append((spec, source))
        except Exception as e:
            raise HTTPException(
                status_code=400,
                detail=f"Failed to load spec for '{api_input.name or api_input.value}': {e}",
            )

    # ── Analyse ──────────────────────────────────────────────────────────────
    all_apis: list[dict] = []
    all_tools: list = []

    for spec, source in loaded_specs:
        api_meta, tools = parse_spec(spec, source)
        all_apis.append(api_meta)
        all_tools.extend(tools)

    if not all_tools:
        raise HTTPException(status_code=400, detail="No endpoints found in the specs.")

    # ── Project name ─────────────────────────────────────────────────────────
    project_name = req.project_name or ""
    if not project_name:
        for api_input in req.apis:
            if api_input.name:
                project_name = api_input.name
                break
    if not project_name:
        project_name = "".join(random.choices(string.ascii_lowercase + string.digits, k=10))

    # ── Generate ─────────────────────────────────────────────────────────────
    try:
        result = generate(all_apis, all_tools, GENERATED_DIR, project_name)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {e}")

    server_path   = result["server_path"]
    server_code   = result["server_code"]
    env_template  = result["env_template"]
    server_slug   = result["server_slug"]

    # ── Build response ────────────────────────────────────────────────────────
    run_command = f'uv run -q --directory "{server_path.parent}" "{server_path}"'

    config_snippet = {
        "mcpServers": {
            project_name.lower().replace(" ", "_"): {
                "command": "uv",
                "args": [
                    "run", "-q",
                    "--directory", str(server_path.parent),
                    str(server_path),
                ],
            }
        }
    }
    config_snippet_str = json.dumps(config_snippet, indent=2)

    api_names = [a.get("title", "Unknown") for a in all_apis]

    response_data: dict = {
        "buildId":        None,   # filled in if authenticated
        "projectName":    project_name,
        "apiNames":       api_names,
        "totalEndpoints": len(all_tools),
        "configSnippet":  config_snippet_str,
        "runCommand":     run_command,
        "serverCode":     server_code,
        "envTemplate":    env_template,
        "serverSlug":     server_slug,
        "authenticated":  current_user is not None,
    }

    # ── Persist if authenticated ──────────────────────────────────────────────
    if current_user:
        try:
            build_record = save_build(
                user_id=current_user["id"],
                build_data={
                    "project_name":    project_name,
                    "api_names":       api_names,
                    "total_endpoints": len(all_tools),
                    "config_snippet":  config_snippet_str,
                    "run_command":     run_command,
                    "server_code":     server_code,
                    "env_template":    env_template,
                    "server_slug":     server_slug,
                },
            )
            response_data["buildId"] = build_record.get("id")
        except Exception:
            # Non-fatal — build still succeeds even if persistence fails
            pass

    return response_data


# ---------------------------------------------------------------------------
# Build history (authenticated)
# ---------------------------------------------------------------------------

@app.get("/builds")
def list_builds(request: Request):
    user = _require_user(request)
    builds = get_user_builds(user["id"])
    return {"builds": builds, "user": user}
