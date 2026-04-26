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
        borderRadius: 16, padding: "16px 20px", display: "flex", alignItems: "center", gap: 14,
        background: "linear-gradient(135deg,rgba(16,185,129,.1),rgba(6,182,212,.07))",
        border: "1px solid rgba(16,185,129,.25)",
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0, background: "rgba(16,185,129,.18)" }}>
          🎉
        </div>
        <div>
          <p style={{ fontWeight: 700, color: "#6ee7b7", fontSize: 15 }}>MCP Server Generated!</p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,.4)", marginTop: 2 }}>
            {result.totalEndpoints} endpoint{result.totalEndpoints !== 1 ? "s" : ""} across{" "}
            {result.apiNames.length} API{result.apiNames.length !== 1 ? "s" : ""} → {result.apiNames.join(", ")}
          </p>
          {!result.authenticated && (
            <p style={{ fontSize: 11, color: "rgba(165,180,252,.6)", marginTop: 4 }}>
              <a href="/auth" style={{ color: "#a5b4fc", textDecoration: "underline" }}>Sign in</a> to save this build to your dashboard
            </p>
          )}
        </div>
      </div>

      {/* ── .env instructions callout ── */}
      <div style={{ padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", display: "flex", gap: 10, alignItems: "flex-start" }}>
        <span style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1, fontSize: 14 }}>🔑</span>
        <div>
          <p style={{ margin: "0 0 4px", fontSize: 12, fontWeight: 700, color: "rgba(253,211,77,.9)" }}>Add API keys to the .env file</p>
          <p style={{ margin: 0, fontSize: 12, color: "rgba(253,211,77,.6)", lineHeight: 1.6 }}>
            A <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,.3)", padding: "1px 4px", borderRadius: 3 }}>.env</code> file was generated alongside your server with placeholder values.
            Open it in the server folder and paste your API keys before running.
          </p>
        </div>
      </div>

      {/* ── View code buttons ── */}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setViewer("server")}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(99,102,241,.3)",
            background: "rgba(99,102,241,.1)", color: "#a5b4fc",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.2)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.1)"; }}
        >
          🐍 View server.py
        </button>
        <button
          onClick={() => setViewer("env")}
          style={{
            flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(245,158,11,.25)",
            background: "rgba(245,158,11,.07)", color: "#fcd34d",
            fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            transition: "all .2s",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,.15)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(245,158,11,.07)"; }}
        >
          ⚙️ View .env template
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

      {/* ── Code viewer modal ── */}
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
      <pre style={{
        padding: "12px 14px", margin: 0, fontSize: 12, lineHeight: 1.65, overflowX: "auto",
        background: highlight ? "rgba(99,102,241,.06)" : "rgba(0,0,0,.4)",
        color: highlight ? "#c7d2fe" : "rgba(255,255,255,.65)",
        fontFamily: "'JetBrains Mono', monospace",
        whiteSpace: "pre-wrap", wordBreak: "break-all",
      }}>
        <code>{code}</code>
      </pre>
    </div>
  );
}
