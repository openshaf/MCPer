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
        background: "rgba(26,26,26,.55)",
        backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        style={{
          width: "100%", maxWidth: 860, maxHeight: "85vh",
          borderRadius: 14, overflow: "hidden",
          background: "#fff",
          border: "1px solid var(--border)",
          boxShadow: "0 24px 60px rgba(0,0,0,.18)",
          display: "flex", flexDirection: "column",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg)",
          flexShrink: 0,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 16 }}>{language === "env" ? "⚙️" : "🐍"}</span>
            <span style={{
              fontWeight: 700, color: "var(--text-primary)", fontSize: 14,
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              {title}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 999,
              background: "rgba(255,107,26,.1)", color: "var(--accent)",
              border: "1px solid rgba(255,107,26,.2)",
              fontFamily: "'Instrument Sans', sans-serif",
              letterSpacing: ".06em", textTransform: "uppercase",
            }}>
              {language === "env" ? ".env" : "Python"}
            </span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Download */}
            <button
              onClick={handleDownload}
              style={{
                padding: "6px 14px", borderRadius: 7,
                border: "1px solid var(--border)",
                background: "transparent", color: "var(--text-secondary)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Instrument Sans', sans-serif",
                transition: "all .2s",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.borderColor = "var(--accent)";
                b.style.color = "var(--accent)";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.borderColor = "var(--border)";
                b.style.color = "var(--text-secondary)";
              }}
            >
              ↓ Download
            </button>
            {/* Copy */}
            <button
              onClick={handleCopy}
              style={{
                padding: "6px 14px", borderRadius: 7, border: "none",
                background: copied ? "rgba(5,150,105,.1)" : "rgba(255,107,26,.1)",
                color: copied ? "#059669" : "var(--accent)",
                fontSize: 12, fontWeight: 600, cursor: "pointer",
                fontFamily: "'Instrument Sans', sans-serif",
                transition: "all .2s",
              }}
            >
              {copied ? "✓ Copied!" : "Copy all"}
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              style={{
                width: 32, height: 32, borderRadius: 7, border: "1px solid var(--border)",
                cursor: "pointer",
                background: "transparent", color: "var(--text-muted)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, transition: "all .2s", fontFamily: "inherit",
              }}
              onMouseEnter={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "rgba(239,68,68,.06)";
                b.style.borderColor = "rgba(239,68,68,.25)";
                b.style.color = "#dc2626";
              }}
              onMouseLeave={e => {
                const b = e.currentTarget as HTMLButtonElement;
                b.style.background = "transparent";
                b.style.borderColor = "var(--border)";
                b.style.color = "var(--text-muted)";
              }}
              aria-label="Close"
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
            color: language === "env" ? "#A3E635" : "#D4CFC9",
            background: language === "env" ? "#1C1917" : "#2A2623",
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            whiteSpace: "pre",
            overflowX: "auto",
          }}>
            <code>{code}</code>
          </pre>
        </div>

        {/* Footer */}
        <div style={{
          padding: "8px 20px",
          borderTop: "1px solid var(--border)",
          background: "var(--bg)",
          fontSize: 11, color: "var(--text-muted)", flexShrink: 0,
          fontFamily: "'JetBrains Mono', monospace",
        }}>
          {code.split("\n").length} lines · {(new Blob([code]).size / 1024).toFixed(1)} KB
        </div>
      </div>
    </div>
  );
}
