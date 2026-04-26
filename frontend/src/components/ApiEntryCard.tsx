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
  const [focused, setFocused] = useState(false);

  const borderColor =
    entry.status === "success" ? "#86EFAC" :
    entry.status === "error"   ? "#FCA5A5" :
    focused                    ? "var(--accent)" :
    "var(--border-input)";

  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${borderColor}`,
        borderRadius: 10,
        transition: "border-color .2s, box-shadow .2s",
        boxShadow: focused
          ? "0 0 0 3px rgba(255,107,26,.10), 0 2px 12px rgba(0,0,0,.06)"
          : entry.status === "success"
          ? "0 0 0 3px rgba(16,185,129,.08)"
          : entry.status === "error"
          ? "0 0 0 3px rgba(239,68,68,.08)"
          : "0 2px 8px rgba(0,0,0,.04)",
        overflow: "hidden",
      }}
    >
      {/* ── Main input row ── */}
      <div style={{ display: "flex", alignItems: "center", padding: "6px 6px 6px 18px", gap: 8 }}>
        {/* Index number */}
        {canRemove && (
          <span style={{
            fontSize: 12, fontWeight: 700, color: "var(--text-muted)",
            fontFamily: "'Instrument Sans', sans-serif",
            flexShrink: 0, minWidth: 18,
          }}>
            {index + 1}
          </span>
        )}

        {/* URL input */}
        <input
          id={`${uid}-value`}
          type="url"
          value={entry.value}
          onChange={(e) => onUpdate(entry.id, { value: e.target.value, status: "idle", error: undefined })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="API Base URL or Direct Spec URL"
          disabled={entry.isVerifying}
          style={{
            flex: 1,
            border: "none",
            outline: "none",
            background: "transparent",
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 16,
            color: "var(--text-primary)",
            padding: "14px 0",
            opacity: entry.isVerifying ? 0.55 : 1,
          }}
        />

        {/* Status badge */}
        {entry.status === "success" && entry.apiTitle && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#059669",
            background: "rgba(16,185,129,.08)",
            border: "1px solid rgba(16,185,129,.2)",
            borderRadius: 6, padding: "3px 8px",
            fontFamily: "'Instrument Sans', sans-serif",
            letterSpacing: ".04em", flexShrink: 0,
          }}>
            ✓ {entry.apiTitle}
          </span>
        )}

        {/* Verify button */}
        <button
          onClick={() => onVerify(entry.id)}
          disabled={entry.isVerifying || !entry.value.trim()}
          aria-label="Verify API"
          style={{
            width: 44, height: 44, borderRadius: 8, border: "none",
            cursor: entry.isVerifying || !entry.value.trim() ? "not-allowed" : "pointer",
            background:
              entry.status === "success" ? "rgba(16,185,129,.12)" :
              entry.status === "error"   ? "rgba(239,68,68,.10)" :
              "var(--accent)",
            color:
              entry.status === "success" ? "#059669" :
              entry.status === "error"   ? "#dc2626" :
              "#fff",
            fontSize: entry.isVerifying ? 10 : 18,
            fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            transition: "all .18s",
            opacity: !entry.value.trim() && !entry.isVerifying ? 0.35 : 1,
          }}
        >
          {entry.isVerifying ? "…" : entry.status === "success" ? "✓" : entry.status === "error" ? "!" : "→"}
        </button>

        {/* Remove button */}
        {canRemove && (
          <button
            onClick={() => onRemove(entry.id)}
            aria-label={`Remove API ${index + 1}`}
            style={{
              width: 36, height: 36, borderRadius: 6, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14,
              transition: "color .2s, background .2s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Footer row ── */}
      <div style={{ padding: "0 18px 12px", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        {/* API key toggle */}
        {!keyExpanded ? (
          <button
            id={`${uid}-add-key`}
            onClick={() => setKeyExpanded(true)}
            style={{
              background: "transparent", border: "none", cursor: "pointer",
              color: "var(--text-muted)", fontSize: 12,
              fontFamily: "'Instrument Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 4, padding: 0,
              transition: "color .2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <span style={{ fontSize: 13 }}>🔑</span> Add API key
          </button>
        ) : (
          <div style={{ position: "relative", flex: 1 }}>
            <input
              id={`${uid}-apikey`}
              type={showKey ? "text" : "password"}
              value={entry.apiKey ?? ""}
              onChange={(e) => onUpdate(entry.id, { apiKey: e.target.value })}
              placeholder="Paste your API key…"
              autoComplete="off"
              style={{
                width: "100%", padding: "9px 40px 9px 12px", borderRadius: 7,
                border: "1px solid var(--border-input)",
                background: "#fafafa",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12, color: "var(--text-primary)", outline: "none",
              }}
            />
            <button
              onClick={() => setShowKey(v => !v)}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "transparent", border: "none", cursor: "pointer",
                color: "var(--text-muted)", fontSize: 13, lineHeight: 1, padding: 4,
              }}
              aria-label={showKey ? "Hide API key" : "Show API key"}
            >
              {showKey ? "🙈" : "👁"}
            </button>
          </div>
        )}

        {/* Status messages */}
        {entry.error && (
          <span style={{ fontSize: 12, color: "#dc2626", fontFamily: "'Instrument Sans', sans-serif", display: "flex", alignItems: "center", gap: 4 }}>
            ⚠ {entry.error}
          </span>
        )}
        {entry.status === "success" && entry.endpointCount !== undefined && (
          <span style={{ fontSize: 12, color: "#059669", fontFamily: "'Instrument Sans', sans-serif" }}>
            ✓ {entry.endpointCount} endpoint{entry.endpointCount !== 1 ? "s" : ""} found
          </span>
        )}
      </div>
    </div>
  );
}

function entries_gt_1(index: number) {
  return index >= 0;
}
