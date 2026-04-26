"use client";

import { useId, useState, useEffect } from "react";
import { ApiEntry, PredefinedApi } from "@/types";

interface Props {
  entry: ApiEntry;
  index: number;
  onUpdate: (id: string, updates: Partial<ApiEntry>) => void;
  onRemove: (id: string) => void;
  onVerify: (id: string) => void;
  canRemove: boolean;
}

let cachedPredefinedApis: PredefinedApi[] | null = null;
let fetchPromise: Promise<PredefinedApi[]> | null = null;

export default function ApiEntryCard({ entry, index, onUpdate, onRemove, onVerify, canRemove }: Props) {
  const uid = useId();
  const [focused, setFocused] = useState(false);
  const [predefinedApis, setPredefinedApis] = useState<PredefinedApi[]>(cachedPredefinedApis || []);

  useEffect(() => {
    if (cachedPredefinedApis) { setPredefinedApis(cachedPredefinedApis); return; }
    if (!fetchPromise) {
      fetchPromise = fetch("/api/predefined_apis")
        .then(res => res.json())
        .then(data => { const apis = data.apis || []; cachedPredefinedApis = apis; return apis; })
        .catch(() => { cachedPredefinedApis = []; return []; });
    }
    fetchPromise.then(apis => setPredefinedApis(apis));
  }, []);

  const borderColor =
    entry.status === "success" ? "#86EFAC" :
    entry.status === "error"   ? "#FCA5A5" :
    focused                    ? "var(--accent)" :
    "var(--border-input)";

  const hasAuth = entry.status === "success" && entry.authType && entry.authType !== "none";

  return (
    <div style={{
      background: "#fff",
      border: `1px solid ${borderColor}`,
      borderRadius: 10,
      overflow: "hidden",
      transition: "border-color .2s, box-shadow .2s",
      boxShadow: focused
        ? "0 0 0 3px rgba(255,107,26,.10), 0 2px 12px rgba(0,0,0,.06)"
        : entry.status === "success" ? "0 0 0 3px rgba(16,185,129,.08)"
        : entry.status === "error"   ? "0 0 0 3px rgba(239,68,68,.08)"
        : "0 2px 8px rgba(0,0,0,.04)",
    }}>

      {/* ── Header: index + name + badges + remove ── */}
      <div style={{ display: "flex", alignItems: "center", padding: "10px 14px 0 18px", gap: 10 }}>
        <div style={{
          width: 24, height: 24, borderRadius: 6, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 700, color: "#fff",
          background: "var(--accent)",
        }}>
          {index + 1}
        </div>

        <input
          id={`${uid}-name`}
          type="text"
          value={entry.name ?? ""}
          onChange={e => onUpdate(entry.id, { name: e.target.value })}
          placeholder="API name (optional)"
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            color: "var(--text-secondary)", fontSize: 13, fontWeight: 500,
            fontFamily: "'Instrument Sans', sans-serif",
          }}
        />

        {/* Auth type badge */}
        {hasAuth && (
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
            background: "rgba(217,119,6,.08)", color: "#B45309",
            border: "1px solid rgba(217,119,6,.2)",
            fontFamily: "'Instrument Sans', sans-serif", letterSpacing: ".04em", flexShrink: 0,
          }}>
            🔑 {entry.authType}
          </span>
        )}

        {/* Success title badge */}
        {entry.status === "success" && entry.apiTitle && (
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#059669",
            background: "rgba(16,185,129,.08)", border: "1px solid rgba(16,185,129,.2)",
            borderRadius: 6, padding: "3px 8px",
            fontFamily: "'Instrument Sans', sans-serif", letterSpacing: ".04em", flexShrink: 0,
          }}>
            ✓ {entry.apiTitle}
          </span>
        )}

        {canRemove && (
          <button
            onClick={() => onRemove(entry.id)}
            aria-label={`Remove API ${index + 1}`}
            style={{
              width: 28, height: 28, borderRadius: 6, border: "none", cursor: "pointer",
              background: "transparent", color: "var(--text-muted)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
              transition: "color .2s, background .2s", flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#dc2626"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,.06)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >✕</button>
        )}
      </div>

      {/* ── Predefined APIs dropdown ── */}
      {predefinedApis.length > 0 && (
        <div style={{ padding: "10px 18px 0" }}>
          <select
            value={predefinedApis.find(a => a.url === entry.value)?.id ?? "custom"}
            onChange={e => {
              if (e.target.value === "custom") {
                onUpdate(entry.id, { value: "", name: "", status: "idle", error: undefined, mode: "auto" });
              } else {
                const api = predefinedApis.find(a => a.id === e.target.value);
                if (api) onUpdate(entry.id, { value: api.url, name: api.name, status: "idle", error: undefined, mode: "url" });
              }
            }}
            disabled={entry.isVerifying}
            style={{
              width: "100%", padding: "9px 12px", borderRadius: 7,
              background: "#fafaf8", border: "1px solid var(--border-input)",
              color: "var(--text-primary)", fontSize: 13,
              fontFamily: "'Instrument Sans', sans-serif",
              outline: "none", cursor: entry.isVerifying ? "not-allowed" : "pointer",
              transition: "border-color .2s",
            }}
            onFocus={e => (e.target.style.borderColor = "var(--accent)")}
            onBlur={e => (e.target.style.borderColor = "var(--border-input)")}
          >
            <option value="custom">Custom API URL…</option>
            {predefinedApis.map(api => (
              <option key={api.id} value={api.id}>{api.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── URL input + Verify button ── */}
      <div style={{ display: "flex", alignItems: "center", padding: "8px 6px 8px 18px", gap: 8 }}>
        <input
          id={`${uid}-value`}
          type="url"
          value={entry.value}
          onChange={e => onUpdate(entry.id, { value: e.target.value, status: "idle", error: undefined, mode: "auto" })}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="API Base URL or Direct Spec URL"
          disabled={entry.isVerifying}
          style={{
            flex: 1, border: "none", outline: "none",
            background: "transparent",
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 15, color: "var(--text-primary)",
            padding: "10px 0",
            opacity: entry.isVerifying ? 0.55 : 1,
          }}
        />
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
              entry.status === "error"   ? "#dc2626" : "#fff",
            fontSize: entry.isVerifying ? 10 : 18,
            fontWeight: 700, flexShrink: 0,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all .18s",
            opacity: !entry.value.trim() && !entry.isVerifying ? 0.35 : 1,
          }}
        >
          {entry.isVerifying ? "…" : entry.status === "success" ? "✓" : entry.status === "error" ? "!" : "→"}
        </button>
      </div>

      {/* ── Auth hint ── */}
      {hasAuth && (
        <div style={{
          margin: "0 18px 10px", padding: "9px 12px", borderRadius: 7,
          background: "rgba(217,119,6,.06)", border: "1px solid rgba(217,119,6,.2)",
          display: "flex", gap: 8, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 13, color: "#B45309", flexShrink: 0 }}>🔑</span>
          <p style={{ margin: 0, fontSize: 12, color: "#92400E", lineHeight: 1.5, fontFamily: "'Instrument Sans', sans-serif" }}>
            <strong>{entry.authType} auth detected.</strong> A{" "}
            <code style={{ fontFamily: "'JetBrains Mono', monospace", background: "rgba(0,0,0,.06)", padding: "1px 4px", borderRadius: 3 }}>.env</code>{" "}
            file will be generated alongside your server — add your key there.
          </p>
        </div>
      )}

      {/* ── Status messages ── */}
      <div style={{ padding: "0 18px 12px", display: "flex", flexWrap: "wrap", gap: 8 }}>
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
