// Types used across the MCPer frontend

export type InputMode = "url";

export interface ApiTemplate {
  id: string;
  name: string;
  url: string;
  requiresApiKey: boolean;
  spec: any;
}

export interface ApiEntry {
  id: string;
  mode: InputMode;
  value: string;       // url string
  templateId?: string; // optional ID of the selected template
  name?: string;       // optional friendly label
  apiKey?: string;     // optional API key for authenticated specs
  isVerifying?: boolean; // track individual verification state
  status: "idle" | "loading" | "success" | "error";
  error?: string;
  endpointCount?: number;
  apiTitle?: string;
}

export type BuildStep = "idle" | "loading" | "analyzing" | "generating" | "done" | "error";

export interface BuildResult {
  serverPath: string;
  apiNames: string[];
  totalEndpoints: number;
  configSnippet: string;
  runCommand: string;
}
