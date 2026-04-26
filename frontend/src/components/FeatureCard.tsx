"use client";

interface Props {
  icon: string;
  title: string;
  description: string;
  badge?: string;
  badgeVariant?: "accent" | "success" | "warning" | "neutral";
}

const BADGE_STYLES: Record<NonNullable<Props["badgeVariant"]>, React.CSSProperties> = {
  accent:  { background: "rgba(255,107,26,.10)", color: "#FF6B1A",  border: "1px solid rgba(255,107,26,.25)" },
  success: { background: "rgba(5,150,105,.08)",  color: "#059669",  border: "1px solid rgba(5,150,105,.2)" },
  warning: { background: "rgba(217,119,6,.08)",  color: "#B45309",  border: "1px solid rgba(217,119,6,.2)" },
  neutral: { background: "#F0EDE6",              color: "#7A7470",  border: "1px solid #E8E4DC" },
};

export default function FeatureCard({
  icon, title, description, badge, badgeVariant = "accent",
}: Props) {
  return (
    <div
      style={{
        padding: "20px 24px",
        borderRadius: 12,
        display: "flex",
        alignItems: "flex-start",
        gap: 16,
        background: "#fff",
        border: "1px solid var(--border)",
        boxShadow: "0 2px 8px rgba(0,0,0,.04)",
        transition: "border-color .2s, box-shadow .2s",
        cursor: "default",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--accent)";
        el.style.boxShadow = "0 4px 16px rgba(255,107,26,.08)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,.04)";
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 40, height: 40, borderRadius: 10, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
          background: "rgba(255,107,26,.08)",
          border: "1px solid rgba(255,107,26,.15)",
        }}
      >
        {icon}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}>
          <h3 style={{
            fontSize: 14, fontWeight: 700,
            color: "var(--text-primary)",
            fontFamily: "'Instrument Sans', sans-serif",
            margin: 0,
          }}>
            {title}
          </h3>
          {badge && (
            <span style={{
              ...BADGE_STYLES[badgeVariant],
              display: "inline-flex", alignItems: "center",
              padding: "2px 8px", borderRadius: 999,
              fontSize: 9, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase",
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              {badge}
            </span>
          )}
        </div>
        <p style={{
          fontSize: 13, color: "var(--text-secondary)",
          lineHeight: 1.6, margin: 0,
          fontFamily: "'Instrument Sans', sans-serif",
        }}>
          {description}
        </p>
      </div>
    </div>
  );
}
