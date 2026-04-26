"""
app/database.py — Supabase client wrapper for MCPer.

Handles auth (via Supabase Auth) and build history (via public tables).
Tables used:
  - mcper_profiles  — extends auth.users with a display username
  - mcper_builds    — build history per user (server code stored here)

These are prefixed with 'mcper_' to avoid conflicts with the teammate's
Prisma-managed tables in the same Supabase project.
"""
from __future__ import annotations

import json
import os
from typing import Any

from supabase import create_client, Client

_supabase: Client | None = None


def get_supabase() -> Client:
    """Return a singleton Supabase client, lazily initialised."""
    global _supabase
    if _supabase is None:
        url = os.environ.get("SUPABASE_URL", "")
        key = os.environ.get("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            raise RuntimeError(
                "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in the .env file."
            )
        _supabase = create_client(url, key)
    return _supabase


# ---------------------------------------------------------------------------
# Auth helpers (delegate to Supabase Auth)
# ---------------------------------------------------------------------------

def sign_up(email: str, password: str, username: str) -> dict:
    """
    Register a new user via Supabase Auth.
    Returns the user dict with access_token on success.
    Raises ValueError on failure.
    """
    sb = get_supabase()
    try:
        res = sb.auth.sign_up({
            "email": email,
            "password": password,
            "options": {"data": {"username": username}},
        })
        if not res.user:
            raise ValueError("Sign-up failed — no user returned.")
        return {
            "id": res.user.id,
            "email": res.user.email,
            "username": username,
            "access_token": res.session.access_token if res.session else None,
        }
    except Exception as exc:
        raise ValueError(f"Registration failed: {exc}") from exc


def sign_in(email: str, password: str) -> dict:
    """
    Sign in an existing user via Supabase Auth.
    Returns the user dict with access_token on success.
    Raises ValueError on failure.
    """
    sb = get_supabase()
    try:
        res = sb.auth.sign_in_with_password({"email": email, "password": password})
        if not res.user:
            raise ValueError("Invalid email or password.")
        username = (res.user.user_metadata or {}).get("username", res.user.email)
        return {
            "id": res.user.id,
            "email": res.user.email,
            "username": username,
            "access_token": res.session.access_token,
        }
    except Exception as exc:
        raise ValueError(f"Login failed: {exc}") from exc


def get_user_from_token(access_token: str) -> dict | None:
    """
    Validate a Supabase access token and return the user dict.
    Returns None if the token is invalid or expired.
    """
    sb = get_supabase()
    try:
        res = sb.auth.get_user(access_token)
        if not res or not res.user:
            return None
        username = (res.user.user_metadata or {}).get("username", res.user.email)
        return {
            "id": res.user.id,
            "email": res.user.email,
            "username": username,
        }
    except Exception:
        return None


# ---------------------------------------------------------------------------
# Build history helpers
# ---------------------------------------------------------------------------

def save_build(user_id: str, build_data: dict) -> dict:
    """
    Insert a build record into mcper_builds.
    build_data should contain:
        project_name, api_names (list), total_endpoints, config_snippet,
        run_command, server_code, env_template, server_slug
    Returns the inserted row.
    """
    sb = get_supabase()
    row = {
        "user_id":        user_id,
        "project_name":   build_data["project_name"],
        "api_names":      json.dumps(build_data.get("api_names", [])),
        "total_endpoints": build_data["total_endpoints"],
        "config_snippet": build_data["config_snippet"],
        "run_command":    build_data["run_command"],
        "server_code":    build_data["server_code"],
        "env_template":   build_data.get("env_template", ""),
        "server_slug":    build_data["server_slug"],
    }
    res = sb.table("mcper_builds").insert(row).execute()
    data = res.data
    if not data:
        raise RuntimeError("Failed to save build to database.")
    return _deserialise_build(data[0])


def get_user_builds(user_id: str) -> list[dict]:
    """Return all builds for a user, newest first."""
    sb = get_supabase()
    res = (
        sb.table("mcper_builds")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return [_deserialise_build(r) for r in (res.data or [])]


def get_build_by_id(build_id: str, user_id: str) -> dict | None:
    """Return a single build, only if it belongs to the given user."""
    sb = get_supabase()
    res = (
        sb.table("mcper_builds")
        .select("*")
        .eq("id", build_id)
        .eq("user_id", user_id)
        .limit(1)
        .execute()
    )
    data = res.data
    return _deserialise_build(data[0]) if data else None


def _deserialise_build(row: dict) -> dict:
    """Parse JSON fields that Supabase returns as strings."""
    if isinstance(row.get("api_names"), str):
        try:
            row["api_names"] = json.loads(row["api_names"])
        except (json.JSONDecodeError, TypeError):
            row["api_names"] = []
    return row


# ---------------------------------------------------------------------------
# Predefined APIs
# ---------------------------------------------------------------------------

def get_predefined_apis() -> list[dict]:
    """Fetch all predefined APIs from the database."""
    sb = get_supabase()
    try:
        res = (
            sb.table("mcper_predefined_apis")
            .select("id, name, url, requires_api_key")
            .order("name", desc=False)
            .execute()
        )
        return res.data or []
    except Exception:
        # If the table doesn't exist yet, return empty list or fallback
        return []
