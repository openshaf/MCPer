"use client";

import { useState } from "react";

interface Props {
  title: string;
  code: string;
  language?: string;
  onClose: () => void;
}

export default function ServerCodeViewer({ title, code, language = "python", onClose }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = language === "env" ? ".env" : ".py";
    const filename = language === "env" ? ".env" : "server.py";
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,.75)", backdropFilter: "blur(8px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 860, maxHeight: "85vh",
          borderRadius: 20, overflow: "hidden",
          background: "linear-gradient(145deg,#0d1525,#111827)",
          border: "1px solid rgba(99,102,241,.25)",
          boxShadow: "0 40px 100px rgba(0,0,0,.8), 0 0 0 1px rgba(99,102,241,.1)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "16px 20px", borderBottom: "1px solid rgba(255,255,255,.06)",
          background: "rgba(0,0,0,.3)", flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{language === "env" ? "⚙️" : "🐍"}</span>
            <span style={{ fontWeight: 700, color: "#fff", fontSize: 14 }}>{title}</span>
            <span className="badge badge-indigo" style={{ fontSize: 9 }}>
              {language === "env" ? ".env" : "Python"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={handleDownload}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(99,102,241,.3)",
                background: "rgba(99,102,241,.12)", color: "#a5b4fc",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all .2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.25)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.12)"; }}
            >
              ↓ Download
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px", borderRadius: 8, border: "none",
                background: copied ? "rgba(16,185,129,.2)" : "rgba(99,102,241,.2)",
                color: copied ? "#6ee7b7" : "#a5b4fc",
                fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
                transition: "all .2s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy all"}
            </button>
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer",
                background: "rgba(255,255,255,.06)", color: "rgba(255,255,255,.5)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
                transition: "all .2s", fontFamily: "inherit",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.06)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.5)"; }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Code content */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          <pre style={{
            margin: 0, padding: "20px 24px",
            fontSize: 12.5, lineHeight: 1.7,
            color: language === "env" ? "#a5f3a5" : "#c7d2fe",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            whiteSpace: "pre",
            overflowX: "auto",
          }}>
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer line count */}
        <div style={{
          padding: "8px 20px", borderTop: "1px solid rgba(255,255,255,.04)",
          fontSize: 11, color: "rgba(255,255,255,.2)", flexShrink: 0,
          fontFamily: "monospace",
        }}>
          {code.split("\n").length} lines · {(new Blob([code]).size / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
}
