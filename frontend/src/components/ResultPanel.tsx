"use client";

import { useState } from "react";
import { BuildResult } from "@/types";

interface Props {
  result: BuildResult;
  onReset: () => void;
}

export default function ResultPanel({ result, onReset }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Success banner */}
      <div
        style={{
          borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
          background: "linear-gradient(135deg,rgba(16,185,129,.1),rgba(6,182,212,.07))",
          border: "1px solid rgba(16,185,129,.25)",
        }}
      >
        <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, background: "rgba(16,185,129,.18)" }}>
          🎉
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#6ee7b7", fontSize: 15 }}>MCP Server Generated!</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
            {result.totalEndpoints} endpoint{result.totalEndpoints !== 1 ? "s" : ""} across{" "}
            {result.apiNames.length} API{result.apiNames.length !== 1 ? "s" : ""} → {result.apiNames.join(", ")}
          </p>
        </div>
      </div>

      <CodeBlock label="Server path"          code={result.serverPath}    copyKey="path"   copiedKey={copiedKey} onCopy={copy} />
      <CodeBlock label="Run command"          code={result.runCommand}    copyKey="run"    copiedKey={copiedKey} onCopy={copy} highlight />
      <CodeBlock label="Claude Desktop config" code={result.configSnippet} copyKey="config" copiedKey={copiedKey} onCopy={copy} />

      <button
        id="reset-button"
        onClick={onReset}
        style={{
          width: "100%", padding: "12px 0", borderRadius: 12, cursor: "pointer",
          background: "transparent", border: "1px solid rgba(255,255,255,.1)",
          color: "rgba(255,255,255,.4)", fontSize: 13, fontWeight: 600, fontFamily: "inherit",
          transition: "all .2s",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.2)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.75)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.4)"; }}
      >
        ← Build another server
      </button>
    </div>
  );
}

function CodeBlock({
  label, code, copyKey, copiedKey, onCopy, highlight = false,
}: {
  label: string; code: string; copyKey: string; copiedKey: string | null;
  onCopy: (t: string, k: string) => void; highlight?: boolean;
}) {
  const copied = copiedKey === copyKey;
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.07)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 14px", background: "rgba(0,0,0,.5)", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "rgba(255,255,255,.25)" }}>{label}</span>
        <button
          onClick={() => onCopy(code, copyKey)}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
            background: copied ? "rgba(16,185,129,.2)" : "rgba(99,102,241,.15)",
            color: copied ? "#6ee7b7" : "#a5b4fc",
            transition: "all .2s", fontFamily: "inherit",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      <pre
        style={{
          padding: "12px 14px", margin: 0, fontSize: 12, lineHeight: 1.65, overflowX: "auto",
          background: highlight ? "rgba(99,102,241,.06)" : "rgba(0,0,0,.4)",
          color: highlight ? "#c7d2fe" : "rgba(255,255,255,.65)",
          fontFamily: "'JetBrains Mono', monospace",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
