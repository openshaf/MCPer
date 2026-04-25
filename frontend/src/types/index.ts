// Types used across the MCPer frontend

export type InputMode = "api" | "url" | "file";

export interface ApiEntry {
  id: string;
  mode: InputMode;
  value: string;       // url string or raw text
  fileName?: string;   // for file mode
  fileContent?: string;
  name?: string;       // optional friendly label
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
