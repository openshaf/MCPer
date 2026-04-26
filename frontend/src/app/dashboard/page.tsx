"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/components/AuthGuard";
import ServerCodeViewer from "@/components/ServerCodeViewer";
import { BuildRecord, User } from "@/types";

export default function DashboardPage() {
  return (
    <AuthGuard>
      <Dashboard />
    </AuthGuard>
  );
}

function Dashboard() {
  const router = useRouter();
  const [user, setUser]         = useState<User | null>(null);
  const [builds, setBuilds]     = useState<BuildRecord[]>([]);
  const [loading, setLoading]   = useState(true);
  const [viewer, setViewer]     = useState<{ build: BuildRecord; type: "server" | "env" } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("mcper_token");
    const stored = localStorage.getItem("mcper_user");
    if (stored) setUser(JSON.parse(stored));

    fetch("/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => {
        setBuilds(data.builds || []);
        if (data.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mcper_token");
    localStorage.removeItem("mcper_user");
    router.push("/");
  };

  const copy = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const totalEndpoints = builds.reduce((sum, b) => sum + b.total_endpoints, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px",
        borderBottom: "1px solid var(--border)",
        background: "#fff",
        position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <a href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              fontFamily: "'Special Elite', cursive",
              fontSize: 18, letterSpacing: "1.5px",
              color: "#fff",
              background: "var(--accent)",
              padding: "3px 10px", borderRadius: 4,
              display: "inline-block", transform: "rotate(-2deg)",
            }}>
              toolRelay
            </span>
          </a>
          <span style={{ color: "var(--border)", fontSize: 16, margin: "0 2px" }}>›</span>
          <span style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontWeight: 600, fontSize: 14, color: "var(--text-secondary)",
          }}>
            Dashboard
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user && (
            <span style={{
              fontSize: 13, color: "var(--text-secondary)",
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              👤 <strong style={{ color: "var(--text-primary)" }}>{user.username || user.email}</strong>
            </span>
          )}
          <button
            onClick={handleLogout}
            style={{
              padding: "7px 16px", borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent", color: "var(--text-muted)",
              fontSize: 13, fontWeight: 600, cursor: "pointer",
              fontFamily: "'Instrument Sans', sans-serif",
              transition: "all .2s",
            }}
            onMouseEnter={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = "rgba(239,68,68,.35)";
              b.style.color = "#dc2626";
            }}
            onMouseLeave={e => {
              const b = e.currentTarget as HTMLButtonElement;
              b.style.borderColor = "var(--border)";
              b.style.color = "var(--text-muted)";
            }}
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* ── Page content ── */}
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>

        {/* Page title */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: "clamp(1.8rem, 4vw, 2.4rem)",
            fontWeight: 400, color: "var(--text-primary)",
            margin: "0 0 6px", letterSpacing: "-.01em",
          }}>
            Your MCP Servers
          </h1>
          <p style={{
            fontSize: 14, color: "var(--text-secondary)", margin: 0,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>
            All your generated FastMCP servers in one place
          </p>
        </div>

        {/* Stats bar */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
          {[
            { label: "Total Builds",    value: builds.length,  icon: "🔧" },
            { label: "Total Endpoints", value: totalEndpoints, icon: "⚡" },
          ].map(stat => (
            <div key={stat.label} style={{
              padding: "20px 22px", borderRadius: 10,
              background: "#fff", border: "1px solid var(--border)",
              display: "flex", alignItems: "center", gap: 14,
              boxShadow: "0 1px 4px rgba(0,0,0,.04)",
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: "rgba(255,107,26,.08)",
                border: "1px solid rgba(255,107,26,.15)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 18, flexShrink: 0,
              }}>
                {stat.icon}
              </div>
              <div>
                <p style={{ fontSize: 24, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{stat.value}</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>{stat.label}</p>
              </div>
            </div>
          ))}
          {/* Build CTA */}
          <div style={{
            padding: "20px 22px", borderRadius: 10,
            background: "rgba(255,107,26,.06)", border: "1px dashed rgba(255,107,26,.3)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <a href="/" style={{
              fontSize: 13, fontWeight: 700, color: "var(--accent)",
              textDecoration: "none",
              fontFamily: "'Instrument Sans', sans-serif",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              + Build a new server
            </a>
          </div>
        </div>

        {/* Build list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <div style={{
              display: "inline-block", width: 32, height: 32, borderRadius: "50%",
              border: "3px solid rgba(255,107,26,.15)", borderTopColor: "var(--accent)",
              animation: "spin 1s linear infinite",
            }} />
            <p style={{ color: "var(--text-muted)", marginTop: 12, fontSize: 13, fontFamily: "'Instrument Sans', sans-serif" }}>Loading builds…</p>
          </div>
        ) : builds.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0",
            borderRadius: 12, border: "2px dashed var(--border)",
          }}>
            <p style={{ fontSize: 40, marginBottom: 12 }}>🚀</p>
            <p style={{
              color: "var(--text-secondary)", fontSize: 14, marginBottom: 20,
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              No builds yet — generate your first MCP server
            </p>
            <a href="/" style={{
              display: "inline-flex", padding: "11px 28px", borderRadius: 8,
              background: "var(--accent)", color: "#fff",
              fontWeight: 700, fontSize: 13, textDecoration: "none",
              fontFamily: "'Instrument Sans', sans-serif",
              boxShadow: "0 4px 16px rgba(255,107,26,.28)",
            }}>
              Build your first MCP server
            </a>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {builds.map(build => (
              <BuildCard
                key={build.id}
                build={build}
                copiedId={copiedId}
                onCopy={copy}
                onViewServer={() => setViewer({ build, type: "server" })}
                onViewEnv={() => setViewer({ build, type: "env" })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Code viewer modal */}
      {viewer && (
        <ServerCodeViewer
          title={viewer.type === "server" ? `${viewer.build.project_name} — server.py` : `${viewer.build.project_name} — .env`}
          code={viewer.type === "server" ? viewer.build.server_code : viewer.build.env_template}
          language={viewer.type === "env" ? "env" : "python"}
          onClose={() => setViewer(null)}
        />
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function BuildCard({ build, copiedId, onCopy, onViewServer, onViewEnv }: {
  build: BuildRecord;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onViewServer: () => void;
  onViewEnv: () => void;
}) {
  const date = new Date(build.created_at).toLocaleString(undefined, {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div
      style={{
        borderRadius: 10, padding: "18px 22px",
        background: "#fff", border: "1px solid var(--border)",
        boxShadow: "0 1px 4px rgba(0,0,0,.04)",
        transition: "border-color .2s, box-shadow .2s",
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--accent)";
        el.style.boxShadow = "0 4px 16px rgba(255,107,26,.08)";
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.borderColor = "var(--border)";
        el.style.boxShadow = "0 1px 4px rgba(0,0,0,.04)";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <h3 style={{
              fontSize: 15, fontWeight: 700, color: "var(--text-primary)", margin: 0,
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              {build.project_name}
            </h3>
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "monospace" }}>{date}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(Array.isArray(build.api_names) ? build.api_names : []).map(name => (
              <span key={name} style={{
                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
                background: "rgba(255,107,26,.08)", color: "var(--accent)",
                border: "1px solid rgba(255,107,26,.2)",
                fontFamily: "'Instrument Sans', sans-serif", letterSpacing: ".04em",
              }}>
                {name}
              </span>
            ))}
            <span style={{
              fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999,
              background: "rgba(5,150,105,.08)", color: "#059669",
              border: "1px solid rgba(5,150,105,.2)",
              fontFamily: "'Instrument Sans', sans-serif",
            }}>
              ⚡ {build.total_endpoints} endpoints
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", flexShrink: 0 }}>
          <ActionBtn onClick={onViewServer} label="🐍 server.py" />
          <ActionBtn onClick={onViewEnv} label="⚙️ .env" />
          <ActionBtn onClick={() => onCopy(build.config_snippet, `config-${build.id}`)} label={copiedId === `config-${build.id}` ? "✓ Copied" : "📋 Config"} />
          <ActionBtn onClick={() => onCopy(build.run_command, `run-${build.id}`)} label={copiedId === `run-${build.id}` ? "✓ Copied" : "▶ Run"} />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "6px 14px", borderRadius: 7,
        border: "1px solid var(--border)",
        background: "transparent", color: "var(--text-secondary)",
        fontSize: 12, fontWeight: 600, cursor: "pointer",
        fontFamily: "'Instrument Sans', sans-serif",
        transition: "all .2s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "rgba(255,107,26,.08)";
        b.style.color = "var(--accent)";
        b.style.borderColor = "rgba(255,107,26,.3)";
      }}
      onMouseLeave={e => {
        const b = e.currentTarget as HTMLButtonElement;
        b.style.background = "transparent";
        b.style.color = "var(--text-secondary)";
        b.style.borderColor = "var(--border)";
      }}
    >
      {label}
    </button>
  );
}
