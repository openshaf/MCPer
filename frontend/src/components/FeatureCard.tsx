"use client";

interface Props {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "indigo" | "cyan" | "emerald" | "amber";
}

const BADGE_STYLES = {
  indigo:  { background: "rgba(99,102,241,.15)",  color: "#a5b4fc", border: "1px solid rgba(99,102,241,.3)" },
  cyan:    { background: "rgba(6,182,212,.12)",   color: "#67e8f9", border: "1px solid rgba(6,182,212,.25)" },
  emerald: { background: "rgba(16,185,129,.12)",  color: "#6ee7b7", border: "1px solid rgba(16,185,129,.25)" },
  amber:   { background: "rgba(245,158,11,.12)",  color: "#fcd34d", border: "1px solid rgba(245,158,11,.25)" },
};

export default function FeatureCard({ icon, title, description, badge, badgeVariant = "indigo" }: Props) {
  return (
    <div
      style={{
        padding: 20, borderRadius: 16, display: "flex", alignItems: "flex-start", gap: 16,
        background: "linear-gradient(135deg,rgba(17,24,39,.8),rgba(13,21,37,.7))",
        border: "1px solid rgba(255,255,255,.06)",
        boxShadow: "0 4px 24px rgba(0,0,0,.3)",
        transition: "border-color .3s",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,.25)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.06)"; }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: 12, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          background: "linear-gradient(135deg,rgba(99,102,241,.18),rgba(139,92,246,.12))",
          border: "1px solid rgba(99,102,241,.18)",
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,.9)", margin: 0 }}>{title}</h3>
          {badge && (
            <span style={{
              ...BADGE_STYLES[badgeVariant],
              display: "inline-flex", alignItems: "center", padding: "2px 8px",
              borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
            }}>
              {badge}
            </span>
          )}
        </div>
        <p style={{ fontSize: 12, color: "rgba(255,255,255,.38)", lineHeight: 1.6, margin: 0 }}>{description}</p>
      </div>
    </div>
  );
}
