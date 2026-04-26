"use client";

import { useState } from "react";
import { BuildResult } from "@/types";
import ServerCodeViewer from "./ServerCodeViewer";

interface Props {
  result: BuildResult;
  onReset: () => void;
}

export default function ResultPanel({ result, onReset }: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewer, setViewer] = useState<"server" | "env" | null>(null);

  const copy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Success banner ── */}
      <div style={{
        borderRadius: 10, padding: "16px 20px",
        display: "flex", alignItems: "center", gap: 14,
        background: "rgba(255,107,26,.06)",
        border: "1px solid rgba(255,107,26,.2)",
      }}>

        <div>
          <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 15, margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>
          MCP Server Generated!
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, margin: "3px 0 0", fontFamily: "'Instrument Sans', sans-serif" }}>
            {result.totalEndpoints} endpoint{result.totalEndpoints !== 1 ? "s" : ""} across{" "}
            {result.apiNames.length} API{result.apiNames.length !== 1 ? "s" : ""} — {result.apiNames.join(", ")}
          </p>
          {!result.authenticated && (
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4, margin: "4px 0 0", fontFamily: "'Instrument Sans', sans-serif" }}>
              <a href="/auth" style={{ color: "var(--accent)", textDecoration: "underline" }}>Sign in</a>{" "}
              to save this build to your dashboard
            </p>
          )}
        </div>
      </div>

      {/* ── .env instructions callout ── */}
      <div style={{
        padding: "12px 16px", borderRadius: 8,
        background: "rgba(217,119,6,.05)", border: "1px solid rgba(217,119,6,.18)",
        display: "flex", gap: 10, alignItems: "flex-start",
      }}>

        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "#92400E", fontFamily: "'Instrument Sans', sans-serif" }}>
            Add API keys to the .env file
          </p>
          <p style={{ margin: 0, fontSize: 12, color: "#B45309", lineHeight: 1.6, fontFamily: "'Instrument Sans', sans-serif" }}>
            A <code style={{ fontFamily: "'JetBrains Mono', monospace", background: "rgba(0,0,0,.06)", padding: "1px 4px", borderRadius: 3 }}>.env</code>{" "}
            file was generated alongside your server with placeholder values.
            Open it in the server folder and paste your API keys before running.
          </p>
        </div>
      </div>

      {/* ── View / Download buttons ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setViewer("server")}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            border: "1px solid rgba(255,107,26,.25)",
            background: "rgba(255,107,26,.06)", color: "var(--accent)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Instrument Sans', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,107,26,.14)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,107,26,.06)"; }}
        >
           View server.py
        </button>
        <button
          onClick={() => setViewer("env")}
          style={{
            flex: 1, padding: "11px 0", borderRadius: 8,
            border: "1px solid rgba(217,119,6,.25)",
            background: "rgba(217,119,6,.05)", color: "#B45309",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
            fontFamily: "'Instrument Sans', sans-serif",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,.12)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(217,119,6,.05)"; }}
        >
          View .env template
        </button>
      </div>

      {/* ── Code blocks ── */}
      <CodeBlock label="Run command"          code={result.runCommand}    copyKey="run"    copiedKey={copiedKey} onCopy={copy} highlight />
      <CodeBlock label="Claude Desktop config" code={result.configSnippet} copyKey="config" copiedKey={copiedKey} onCopy={copy} />

      {/* ── Reset ── */}
      <button
        id="reset-button"
        onClick={onReset}
        style={{
          width: "100%", padding: "13px 0", borderRadius: 8, cursor: "pointer",
          background: "transparent",
          border: "1.5px dashed #D8D4CC",
          color: "var(--text-muted)", fontSize: 13, fontWeight: 600,
          fontFamily: "'Instrument Sans', sans-serif",
          transition: "all .2s",
        }}
        onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--accent)"; b.style.color = "var(--accent)"; }}
        onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "#D8D4CC"; b.style.color = "var(--text-muted)"; }}
      >
        ← Build another server
      </button>

      {/* ── Code viewer modals ── */}
      {viewer === "server" && (
        <ServerCodeViewer
          title="server.py"
          code={result.serverCode}
          language="python"
          onClose={() => setViewer(null)}
        />
      )}
      {viewer === "env" && (
        <ServerCodeViewer
          title=".env template"
          code={result.envTemplate}
          language="env"
          onClose={() => setViewer(null)}
        />
      )}
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
    <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "8px 14px",
        background: "var(--bg)", borderBottom: "1px solid #E8E4DC",
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--text-muted)", fontFamily: "'Instrument Sans', sans-serif" }}>
          {label}
        </span>
        <button
          onClick={() => onCopy(code, copyKey)}
          style={{
            padding: "3px 10px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 10, fontWeight: 700,
            background: copied ? "rgba(5,150,105,.12)" : "rgba(255,107,26,.10)",
            color: copied ? "#059669" : "var(--accent)",
            transition: "all .2s", fontFamily: "'Instrument Sans', sans-serif",
          }}
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
      </div>
      {/* Code */}
      <pre style={{
        padding: "12px 14px", margin: 0, fontSize: 12, lineHeight: 1.65, overflowX: "auto",
        background: highlight ? "#1C1917" : "#2A2623",
        color: highlight ? "#FCD34D" : "#D4CFC9",
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
