"use client";

import { BuildStep } from "@/types";

interface Props {
  step: BuildStep;
  totalApis: number;
}

const STEPS = [
  { key: "loading",    label: "Loading" },
  { key: "analyzing",  label: "Analysing" },
  { key: "generating", label: "Generating" },
  { key: "done",       label: "Ready" },
];

export default function BuildProgress({ step, totalApis }: Props) {
  const currentIdx = STEPS.findIndex((s) => s.key === step);
  const isDoneAll  = step === "done";

  const msgs: Record<string, string> = {
    loading:    `Fetching specs for ${totalApis} API${totalApis !== 1 ? "s" : ""}…`,
    analyzing:  "Parsing endpoints & detecting authentication…",
    generating: "Writing FastMCP tools & assembling server…",
    done:       "MCP server generated successfully!",
    error:      "Build failed. Check the error above.",
  };

  return (
    <div style={{ width: "100%" }}>
      {/* Step dots */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 16 }}>
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone   = isDoneAll || currentIdx > i;
          const dotBg    = isDone ? "#10b981" : isActive ? "#6366f1" : "rgba(255,255,255,.08)";
          const lineW    = isDone ? "100%" : "0%";

          return (
            <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {/* Connector before (skip first) */}
                {i > 0 && (
                  <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,.08)", borderRadius: 1, overflow: "hidden", marginRight: 4 }}>
                    <div style={{ height: "100%", width: isDone ? "100%" : isActive ? "50%" : "0%", background: "#6366f1", borderRadius: 1, transition: "width .5s ease" }} />
                  </div>
                )}
                {/* Dot */}
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: "#fff",
                    background: dotBg,
                    boxShadow: isActive ? "0 0 16px rgba(99,102,241,.6)" : isDone ? "0 0 10px rgba(16,185,129,.4)" : "none",
                    transition: "all .4s",
                  }}
                >
                  {isDone ? "✓" : isActive ? <SpinIcon /> : i + 1}
                </div>
                {/* Connector after (skip last) */}
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,.08)", borderRadius: 1, overflow: "hidden", marginLeft: 4 }}>
                    <div style={{ height: "100%", width: isDone ? "100%" : "0%", background: "#10b981", borderRadius: 1, transition: "width .5s ease" }} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: isDone ? "#6ee7b7" : isActive ? "#a5b4fc" : "rgba(255,255,255,.2)", textAlign: "center" }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
          borderRadius: 10, background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.06)",
        }}
      >
        {step === "done" ? (
          <span style={{ fontSize: 16 }}>🎉</span>
        ) : step === "error" ? (
          <span style={{ fontSize: 16 }}>⚠</span>
        ) : (
          <SpinIcon style={{ color: "#818cf8" }} />
        )}
        <span style={{
          fontSize: 13,
          color: step === "done" ? "#6ee7b7" : step === "error" ? "#f87171" : "rgba(255,255,255,.5)",
          fontWeight: step === "done" ? 600 : 400,
        }}>
          {msgs[step] ?? ""}
        </span>
      </div>
    </div>
  );
}

function SpinIcon({ style }: { style?: React.CSSProperties }) {
  return (
    <svg
      style={{ width: 14, height: 14, flexShrink: 0, animation: "spin 1s linear infinite", ...style }}
      viewBox="0 0 24 24" fill="none"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity=".25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
