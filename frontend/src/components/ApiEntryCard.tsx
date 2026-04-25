"use client";

import { useState, useCallback, useId } from "react";
import { ApiEntry, InputMode } from "@/types";

const MODE_LABELS: Record<InputMode, string> = {
  api: "Base URL",
  url: "Spec URL",
  file: "Local File",
};

const MODE_PLACEHOLDERS: Record<InputMode, string> = {
  api: "https://petstore3.swagger.io/api/v3",
  url: "https://api.example.com/openapi.json",
  file: "Drop or browse a .json / .yaml file",
};

interface Props {
  entry: ApiEntry;
  index: number;
  onUpdate: (id: string, updates: Partial<ApiEntry>) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}

export default function ApiEntryCard({ entry, index, onUpdate, onRemove, canRemove }: Props) {
  const uid = useId();
  const [dragOver, setDragOver] = useState(false);

  const handleModeChange = (mode: InputMode) =>
    onUpdate(entry.id, { mode, value: "", fileName: undefined, fileContent: undefined, error: undefined });

  const handleFileSelect = useCallback(
    async (file: File) => {
      const text = await file.text();
      onUpdate(entry.id, { value: file.name, fileName: file.name, fileContent: text, status: "idle", error: undefined });
    },
    [entry.id, onUpdate]
  );

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

      {/* ── Mode tabs ── */}
      <div style={{ padding: "0 20px 12px" }}>
        <div style={{ display: "flex", gap: 4, padding: 4, borderRadius: 12, background: "rgba(0,0,0,.35)" }}>
          {(["api", "url", "file"] as InputMode[]).map((m) => (
            <button
              key={m}
              id={`${uid}-mode-${m}`}
              onClick={() => handleModeChange(m)}
              style={{
                flex: 1, padding: "6px 0", borderRadius: 8, border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, fontFamily: "inherit",
                background: entry.mode === m ? "#6366f1" : "transparent",
                color: entry.mode === m ? "#fff" : "rgba(255,255,255,.35)",
                boxShadow: entry.mode === m ? "0 2px 8px rgba(99,102,241,.4)" : "none",
                transition: "all .2s",
              }}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Input area ── */}
      <div style={{ padding: "0 20px 20px" }}>
        {entry.mode === "file" ? (
          <label
            htmlFor={`${uid}-file`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileSelect(f); }}
            style={{
              display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
              gap: 8, padding: "24px 16px", borderRadius: 12, cursor: "pointer",
              border: `2px dashed ${dragOver ? "#6366f1" : entry.fileName ? "rgba(16,185,129,.4)" : "rgba(255,255,255,.1)"}`,
              background: dragOver ? "rgba(99,102,241,.08)" : entry.fileName ? "rgba(16,185,129,.04)" : "transparent",
              transition: "all .2s",
            }}
          >
            <input id={`${uid}-file`} type="file" accept=".json,.yaml,.yml" style={{ display: "none" }}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
            {entry.fileName ? (
              <>
                <span style={{ fontSize: 24 }}>📄</span>
                <span style={{ fontSize: 12, color: "#6ee7b7", fontFamily: "monospace" }}>{entry.fileName}</span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)" }}>Click to change</span>
              </>
            ) : (
              <>
                <span style={{ fontSize: 28, opacity: .35 }}>⬆</span>
                <span style={{ fontSize: 13, color: "rgba(255,255,255,.35)" }}>Drop .json / .yaml or click to browse</span>
              </>
            )}
          </label>
        ) : (
          <div style={{ position: "relative" }}>
            <input
              id={`${uid}-value`}
              type="url"
              value={entry.value}
              onChange={(e) => onUpdate(entry.id, { value: e.target.value, status: "idle", error: undefined })}
              placeholder={MODE_PLACEHOLDERS[entry.mode]}
              className="input-glow font-mono-custom"
              style={{
                width: "100%", padding: "12px 16px", borderRadius: 12,
                background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.08)",
                color: "rgba(255,255,255,.8)", fontSize: 13, fontFamily: "inherit",
                transition: "border-color .2s",
                paddingRight: entry.mode === "api" ? 120 : 16,
              }}
            />
            {entry.mode === "api" && (
              <span className="badge badge-indigo" style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 9, pointerEvents: "none" }}>
                Auto-discover
              </span>
            )}
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
