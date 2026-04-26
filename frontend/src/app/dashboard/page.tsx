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
    <div style={{ minHeight: "100vh", background: "#070b14", position: "relative" }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, top: -200, left: -200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, bottom: 0, right: -100, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.15) 0%,transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Nav */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 14, boxShadow: "0 4px 16px rgba(99,102,241,.45)" }}>M</div>
              <span style={{ fontWeight: 800, fontSize: 16, color: "#fff" }}>MCPer</span>
            </a>
            <span style={{ color: "rgba(255,255,255,.2)", fontSize: 13, margin: "0 4px" }}>›</span>
            <span style={{ fontWeight: 600, fontSize: 14, color: "rgba(255,255,255,.6)" }}>Dashboard</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {user && (
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.4)" }}>
                👤 <strong style={{ color: "rgba(255,255,255,.7)" }}>{user.username || user.email}</strong>
              </span>
            )}
            <button
              onClick={handleLogout}
              style={{ padding: "7px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,.1)", background: "transparent", color: "rgba(255,255,255,.4)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.4)"; }}
            >
              Sign out
            </button>
          </div>
        </nav>

        <div style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 80px" }}>
          {/* Page title */}
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: "#fff", margin: "0 0 6px", letterSpacing: "-.02em" }}>Your MCP Servers</h1>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,.35)", margin: 0 }}>All your generated FastMCP servers in one place</p>
          </div>

          {/* Stats bar */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 32 }}>
            {[
              { label: "Total Builds",    value: builds.length,   icon: "🔧", color: "#6366f1" },
              { label: "Total Endpoints", value: totalEndpoints,  icon: "⚡", color: "#8b5cf6" },
            ].map(stat => (
              <div key={stat.label} style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(17,24,39,.85)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `${stat.color}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{stat.icon}</div>
                <div>
                  <p style={{ fontSize: 24, fontWeight: 800, color: "#fff", margin: 0 }}>{stat.value}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,.35)", margin: 0 }}>{stat.label}</p>
                </div>
              </div>
            ))}
            <div style={{ padding: "20px 22px", borderRadius: 16, background: "rgba(99,102,241,.08)", border: "1px solid rgba(99,102,241,.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <a href="/" style={{ fontSize: 13, fontWeight: 700, color: "#a5b4fc", textDecoration: "none", display: "flex", alignItems: "center", gap: 6 }}>
                ⚡ Build a new server
              </a>
            </div>
          </div>

          {/* Build list */}
          {loading ? (
            <div style={{ textAlign: "center", padding: "60px 0" }}>
              <div style={{ display: "inline-block", width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin 1s linear infinite" }} />
              <p style={{ color: "rgba(255,255,255,.3)", marginTop: 12, fontSize: 13 }}>Loading builds…</p>
            </div>
          ) : builds.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 0", borderRadius: 20, border: "2px dashed rgba(255,255,255,.08)" }}>
              <p style={{ fontSize: 40, marginBottom: 16 }}>🚀</p>
              <p style={{ color: "rgba(255,255,255,.4)", fontSize: 14, marginBottom: 16 }}>No builds yet</p>
              <a href="/" style={{ display: "inline-flex", padding: "10px 24px", borderRadius: 10, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>Build your first MCP server</a>
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
    <div style={{
      borderRadius: 16, padding: "20px 24px",
      background: "linear-gradient(145deg,rgba(17,24,39,.9),rgba(13,21,37,.95))",
      border: "1px solid rgba(255,255,255,.07)",
      transition: "border-color .2s",
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(99,102,241,.2)"; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(255,255,255,.07)"; }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        {/* Left: info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: 0 }}>{build.project_name}</h3>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,.25)", fontFamily: "monospace" }}>{date}</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {(Array.isArray(build.api_names) ? build.api_names : []).map(name => (
              <span key={name} className="badge badge-indigo" style={{ fontSize: 10 }}>{name}</span>
            ))}
            <span className="badge badge-emerald" style={{ fontSize: 10 }}>⚡ {build.total_endpoints} endpoints</span>
          </div>
        </div>

        {/* Right: actions */}
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
        padding: "6px 14px", borderRadius: 9, border: "1px solid rgba(255,255,255,.1)",
        background: "rgba(255,255,255,.04)", color: "rgba(255,255,255,.55)",
        fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        transition: "all .2s", whiteSpace: "nowrap",
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.15)"; (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,.3)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,.04)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.55)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.1)"; }}
    >
      {label}
    </button>
  );
}
