// Types used across the MCPer frontend

export type InputMode = "url" | "api" | "file" | "auto";

export interface ApiEntry {
  id: string;
  mode: InputMode;
  value: string;       // url string
  name?: string;       // optional friendly label
  isVerifying?: boolean;
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  endpointCount?: number;
  apiTitle?: string;
  authType?: string;   // auth scheme detected (e.g. "bearer", "none")
}

export type BuildStep = "idle" | "loading" | "analyzing" | "generating" | "done" | "error";

export interface BuildResult {
  buildId: string | null;
  projectName: string;
  apiNames: string[];
  totalEndpoints: number;
  configSnippet: string;
  runCommand: string;
  serverCode: string;    // full generated server.py content
  envTemplate: string;   // generated .env file content
  serverSlug: string;
  authenticated: boolean;
}

export interface User {
  id: string;
  email: string;
  username: string;
}

export interface BuildRecord {
  id: string;
  project_name: string;
  api_names: string[];
  total_endpoints: number;
  config_snippet: string;
  run_command: string;
  server_code: string;
  env_template: string;
  server_slug: string;
  created_at: string;
}

export interface PredefinedApi {
  id: string;
  name: string;
  url: string;
  requires_api_key: boolean;
}
