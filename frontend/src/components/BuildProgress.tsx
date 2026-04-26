"use client";

import { BuildStep } from "@/types";

interface Props {
  step: BuildStep;
  totalApis: number;
}

const STEPS = [
  { key: "loading",    label: "Fetching" },
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
    <div style={{ width: "100%", fontFamily: "'Instrument Sans', sans-serif" }}>

      {/* Step track */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 4, marginBottom: 16 }}>
        {STEPS.map((s, i) => {
          const isActive = s.key === step;
          const isDone   = isDoneAll || currentIdx > i;

          const dotBg =
            isDone   ? "#FF6B1A" :
            isActive ? "#FF6B1A" :
            "#E8E4DC";

          const dotColor = isDone || isActive ? "#fff" : "#9A948C";

          return (
            <div key={s.key} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%" }}>
                {/* Connector before */}
                {i > 0 && (
                  <div style={{ flex: 1, height: 2, background: "#E8E4DC", borderRadius: 1, overflow: "hidden", marginRight: 4 }}>
                    <div style={{ height: "100%", width: isDone ? "100%" : isActive ? "50%" : "0%", background: "#FF6B1A", borderRadius: 1, transition: "width .6s ease" }} />
                  </div>
                )}
                {/* Dot */}
                <div
                  style={{
                    width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, fontWeight: 700, color: dotColor,
                    background: dotBg,
                    boxShadow: isActive ? "0 0 0 4px rgba(255,107,26,.15)" : "none",
                    transition: "all .4s",
                  }}
                >
                  {isDone ? "✓" : isActive ? <SpinIcon /> : i + 1}
                </div>
                {/* Connector after */}
                {i < STEPS.length - 1 && (
                  <div style={{ flex: 1, height: 2, background: "#E8E4DC", borderRadius: 1, overflow: "hidden", marginLeft: 4 }}>
                    <div style={{ height: "100%", width: isDone ? "100%" : "0%", background: "#FF6B1A", borderRadius: 1, transition: "width .6s ease" }} />
                  </div>
                )}
              </div>
              <span style={{
                fontSize: 10, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase",
                color: isDone ? "#FF6B1A" : isActive ? "#FF6B1A" : "#C8C4BC",
                textAlign: "center",
              }}>
                {s.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Status bar */}
      <div
        style={{
          display: "flex", alignItems: "center", gap: 10, padding: "12px 16px",
          borderRadius: 8, background: "#fff", border: "1px solid #E8E4DC",
          boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        }}
      >
        {step === "done" ? (
          <span style={{ fontSize: 16 }}>✓</span>
        ) : step === "error" ? (
          <span style={{ fontSize: 16, color: "#dc2626" }}>⚠</span>
        ) : (
          <SpinIcon style={{ color: "#FF6B1A" }} />
        )}
        <span style={{
          fontSize: 13,
          color: step === "done" ? "#059669" : step === "error" ? "#dc2626" : "#5A5550",
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
      style={{ width: 14, height: 14, flexShrink: 0, animation: "spin 1s linear infinite", color: "currentColor", ...style }}
      viewBox="0 0 24 24" fill="none"
    >
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity=".25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}
