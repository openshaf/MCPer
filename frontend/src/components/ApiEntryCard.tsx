"use client";

import { useId, useState, useEffect } from "react";
import { ApiEntry, PredefinedApi } from "@/types";

let cachedPredefinedApis: PredefinedApi[] | null = null;
let fetchPromise: Promise<PredefinedApi[]> | null = null;

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
  const [predefinedApis, setPredefinedApis] = useState<PredefinedApi[]>(cachedPredefinedApis || []);

  useEffect(() => {
    if (cachedPredefinedApis) return;
    if (!fetchPromise) {
      fetchPromise = fetch("/api/predefined_apis")
        .then(res => res.json())
        .then(data => {
          const apis = data.apis || [];
          cachedPredefinedApis = apis;
          return apis;
        })
        .catch(err => {
          console.error("Failed to fetch predefined APIs:", err);
          return [];
        });
    }
    fetchPromise.then(apis => setPredefinedApis(apis));
  }, []);

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
          {entry.status === "success" && entry.authType && entry.authType !== "none" && (
            <span className="badge badge-amber" style={{ fontSize: 10 }}>🔑 {entry.authType}</span>
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
        {predefinedApis.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <select
              value={predefinedApis.find(a => a.url === entry.value)?.id || "custom"}
              onChange={(e) => {
                if (e.target.value === "custom") {
                  onUpdate(entry.id, { value: "", name: "", status: "idle", error: undefined, mode: "auto" });
                } else {
                  const api = predefinedApis.find(a => a.id === e.target.value);
                  if (api) {
                    onUpdate(entry.id, { value: api.url, name: api.name, status: "idle", error: undefined, mode: "url" });
                  }
                }
              }}
              disabled={entry.isVerifying}
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 10,
                background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.8)", fontSize: 13, fontFamily: "inherit",
                outline: "none", cursor: entry.isVerifying ? "not-allowed" : "pointer",
              }}
            >
              <option value="custom">Custom API URL...</option>
              {predefinedApis.map(api => (
                <option key={api.id} value={api.id}>{api.name}</option>
              ))}
            </select>
          </div>
        )}

        <div style={{ position: "relative", display: "flex", gap: 10 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              id={`${uid}-value`}
              type="url"
              value={entry.value}
              onChange={(e) => onUpdate(entry.id, { value: e.target.value, status: "idle", error: undefined, mode: "auto" })}
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

        {/* Auth hint — shown after successful verification if auth is required */}
        {entry.status === "success" && entry.authType && entry.authType !== "none" && (
          <div style={{ marginTop: 8, padding: "8px 12px", borderRadius: 8, background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ fontSize: 13, color: "#fbbf24", flexShrink: 0 }}>🔑</span>
            <p style={{ margin: 0, fontSize: 12, color: "rgba(253,211,77,.7)", lineHeight: 1.5 }}>
              <strong style={{ color: "rgba(253,211,77,.9)" }}>{entry.authType} auth detected.</strong> A{" "}
              <code style={{ fontFamily: "monospace", background: "rgba(0,0,0,.3)", padding: "1px 4px", borderRadius: 4 }}>.env</code>{" "}
              file will be generated alongside your server — add your key there.
            </p>
          </div>
        )}

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
