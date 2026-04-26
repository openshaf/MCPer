"use client";

import { useId, useState } from "react";
import { ApiEntry } from "@/types";

interface Props {
  entry: ApiEntry;
  index: number;
  onUpdate: (id: string, updates: Partial<ApiEntry>) => void;
  onRemove: (id: string) => void;
  onVerify: (id: string) => void;
  canRemove: boolean;
}

export default function ApiEntryCard({ entry, index, onUpdate, onRemove, onVerify, canRemove }: Props) {
  const uid = useId();
  const [showKey, setShowKey] = useState(false);
  const [keyExpanded, setKeyExpanded] = useState(!!entry.apiKey);

  const borderColor =
    entry.status === "success" ? "rgba(16,185,129,0.35)" :
    entry.status === "error"   ? "rgba(239,68,68,0.35)"  :
    "rgba(255,255,255,0.08)";

  return (
    <div
      style={{
        background: "linear-gradient(135deg,rgba(17,24,39,.85),rgba(13,21,37,.95))",
        border: `1px solid ${borderColor}`,
        borderRadius: 16,
        transition: "border-color .3s",
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28, height: 28, borderRadius: 8, display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff",
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 2px 8px rgba(99,102,241,.4)",
              flexShrink: 0,
            }}
          >
            {index + 1}
          </div>
          <input
            id={`${uid}-name`}
            type="text"
            value={entry.name ?? ""}
            onChange={(e) => onUpdate(entry.id, { name: e.target.value })}
            placeholder="API name (optional)"
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "rgba(255,255,255,.65)", fontSize: 13, fontWeight: 500,
              width: 160, fontFamily: "inherit",
            }}
          />
          {entry.status === "success" && entry.apiTitle && (
            <span className="badge badge-emerald" style={{ fontSize: 10 }}>✓ {entry.apiTitle}</span>
          )}
        </div>
        {canRemove && (
          <button
            onClick={() => onRemove(entry.id)}
            aria-label={`Remove API ${index + 1}`}
            style={{
              width: 28, height: 28, borderRadius: 8, border: "none", cursor: "pointer",
              background: "transparent", color: "rgba(255,255,255,.25)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              transition: "color .2s, background .2s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,.1)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.25)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Input area ── */}
      <div style={{ padding: "10px 20px 20px" }}>
        <div style={{ position: "relative", display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              id={`${uid}-value`}
              type="url"
              value={entry.value}
              onChange={(e) => onUpdate(entry.id, { value: e.target.value, status: "idle", error: undefined })}
              placeholder="API Base URL or Direct Spec URL"
              className="input-glow font-mono-custom"
              disabled={entry.isVerifying}
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.8)", fontSize: 13, fontFamily: "inherit",
                transition: "border-color .2s",
                opacity: entry.isVerifying ? 0.6 : 1,
              }}
            />
          </div>
          <button
            onClick={() => onVerify(entry.id)}
            disabled={entry.isVerifying || !entry.value.trim()}
            style={{
              padding: "0 16px", borderRadius: 12, border: "none", cursor: entry.isVerifying || !entry.value.trim() ? "not-allowed" : "pointer",
              background: entry.status === "success" ? "rgba(16,185,129,.15)" : entry.status === "error" ? "rgba(239,68,68,.15)" : "rgba(99,102,241,.15)",
              color: entry.status === "success" ? "#10b981" : entry.status === "error" ? "#ef4444" : "#818cf8",
              fontWeight: 600, fontSize: 13, transition: "all .2s",
              display: "flex", alignItems: "center", justifyContent: "center", minWidth: 80,
              border: `1px solid ${entry.status === "success" ? "rgba(16,185,129,.3)" : entry.status === "error" ? "rgba(239,68,68,.3)" : "rgba(99,102,241,.3)"}`,
            }}
          >
            {entry.isVerifying ? "..." : entry.status === "success" ? "Verified" : "Verify"}
          </button>
        </div>
        {/* ── API Key (optional) ── */}
        <div style={{ marginTop: 8 }}>
          {!keyExpanded ? (
            <button
              id={`${uid}-add-key`}
              onClick={() => setKeyExpanded(true)}
              style={{
                background: "transparent", border: "none", cursor: "pointer",
                color: "rgba(255,255,255,.28)", fontSize: 12, fontFamily: "inherit",
                display: "flex", alignItems: "center", gap: 5, padding: 0,
                transition: "color .2s",
              }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(165,180,252,.8)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}
            >
              <span style={{ fontSize: 14 }}>🔑</span> Add API key (optional)
            </button>
          ) : (
            <div style={{ position: "relative", marginTop: 4 }}>
              <input
                id={`${uid}-apikey`}
                type={showKey ? "text" : "password"}
                value={entry.apiKey ?? ""}
                onChange={(e) => onUpdate(entry.id, { apiKey: e.target.value })}
                placeholder="Paste your API key…"
                autoComplete="off"
                className="input-glow font-mono-custom"
                style={{
                  width: "100%", padding: "10px 44px 10px 14px", borderRadius: 10,
                  background: "rgba(99,102,241,.07)", border: "1px solid rgba(99,102,241,.25)",
                  color: "rgba(255,255,255,.75)", fontSize: 13, fontFamily: "monospace",
                  transition: "border-color .2s",
                }}
              />
              {/* toggle visibility */}
              <button
                onClick={() => setShowKey(v => !v)}
                style={{
                  position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                  background: "transparent", border: "none", cursor: "pointer",
                  color: "rgba(255,255,255,.3)", fontSize: 14, lineHeight: 1, padding: 4,
                }}
                aria-label={showKey ? "Hide API key" : "Show API key"}
              >
                {showKey ? "🙈" : "👁"}
              </button>
            </div>
          )}
        </div>

        {entry.error && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#f87171", display: "flex", gap: 5, alignItems: "flex-start" }}>
            <span>⚠</span>{entry.error}
          </p>
        )}
        {entry.status === "success" && entry.endpointCount !== undefined && (
          <p style={{ marginTop: 8, fontSize: 12, color: "#6ee7b7", display: "flex", gap: 5 }}>
            <span>✓</span>{entry.endpointCount} endpoint{entry.endpointCount !== 1 ? "s" : ""} found
          </p>
        )}
      </div>
    </div>
  );
}
