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
    <div style={{ display: "flex", flexDirection: "column", gap: 16, fontFamily: "'Instrument Sans', sans-serif" }}>

      {/* Success banner */}
      <div
        style={{
          borderRadius: 10, padding: "16px 20px",
          display: "flex", alignItems: "center", gap: 14,
          background: "rgba(255,107,26,.06)",
          border: "1px solid rgba(255,107,26,.2)",
        }}
      >
        <div style={{
          width: 40, height: 40, borderRadius: 10, display: "flex",
          alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0,
          background: "rgba(255,107,26,.12)",
        }}>
          🎉
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#1A1A1A", fontSize: 15, margin: 0 }}>
            MCP Server Generated!
          </p>
          <p style={{ fontSize: 12, color: "#7A7470", marginTop: 3, margin: 0 }}>
            {result.totalEndpoints} endpoint{result.totalEndpoints !== 1 ? "s" : ""} across{" "}
            {result.apiNames.length} API{result.apiNames.length !== 1 ? "s" : ""} — {result.apiNames.join(", ")}
          </p>
        </div>
      </div>

      <CodeBlock label="Server path"           code={result.serverPath}    copyKey="path"   copiedKey={copiedKey} onCopy={copy} />
      <CodeBlock label="Run command"           code={result.runCommand}    copyKey="run"    copiedKey={copiedKey} onCopy={copy} highlight />
      <CodeBlock label="Claude Desktop config" code={result.configSnippet} copyKey="config" copiedKey={copiedKey} onCopy={copy} />

      <button
        id="reset-button"
        onClick={onReset}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 8, cursor: "pointer",
          background: "transparent",
          border: "1.5px dashed #D8D4CC",
          color: "#9A948C", fontSize: 13, fontWeight: 600,
          fontFamily: "'Instrument Sans', sans-serif",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
          transition: "all .2s",
        }}
        onMouseEnter={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = "#FF6B1A";
          b.style.color = "#FF6B1A";
        }}
        onMouseLeave={e => {
          const b = e.currentTarget as HTMLButtonElement;
          b.style.borderColor = "#D8D4CC";
          b.style.color = "#9A948C";
        }}
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
    <div style={{ borderRadius: 8, overflow: "hidden", border: "1px solid #E8E4DC" }}>
      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px",
        background: "#F5F1E8",
        borderBottom: "1px solid #E8E4DC",
      }}>
        <span style={{
          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
          letterSpacing: ".08em", color: "#9A948C",
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          {label}
        </span>
        <button
          onClick={() => onCopy(code, copyKey)}
          style={{
            padding: "3px 10px", borderRadius: 5, border: "none", cursor: "pointer",
            fontSize: 10, fontWeight: 700,
            background: copied ? "rgba(5,150,105,.12)" : "rgba(255,107,26,.1)",
            color: copied ? "#059669" : "#FF6B1A",
            transition: "all .2s",
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      {/* Code body */}
      <pre
        style={{
          padding: "12px 14px", margin: 0, fontSize: 12, lineHeight: 1.65, overflowX: "auto",
          background: highlight ? "#1C1917" : "#2A2623",
          color: highlight ? "#FCD34D" : "#D4CFC9",
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
          whiteSpace: "pre-wrap", wordBreak: "break-all",
        }}
      >
        <code>{code}</code>
      </pre>
    </div>
  );
}
