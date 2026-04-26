"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ApiEntryCard from "@/components/ApiEntryCard";
import BuildProgress from "@/components/BuildProgress";
import ResultPanel from "@/components/ResultPanel";
import FeatureCard from "@/components/FeatureCard";
import { ApiEntry, BuildStep, BuildResult, InputMode, ApiTemplate } from "@/types";

/* ── ID generation ── */
let _counter = 0;
function nextId() {
  _counter += 1;
  return `api-${_counter}`;
}

function createEntry(): ApiEntry {
  return { id: nextId(), mode: "url", value: "", status: "idle" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [entries, setEntries]     = useState<ApiEntry[]>(() => [createEntry()]);
  const [buildStep, setBuildStep] = useState<BuildStep>("idle");
  const [result, setResult]       = useState<BuildResult | null>(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const isBuilding = ["loading", "analyzing", "generating"].includes(buildStep);

  useEffect(() => {
    fetch("/api/templates")
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setTemplates(data);
      })
      .catch(console.error);
  }, []);

  /* ── Entry management ── */
  const addEntry = () => {
    if (entries.length >= 8) return;
    setEntries((p) => [...p, createEntry()]);
  };

  const updateEntry = useCallback((id: string, updates: Partial<ApiEntry>) => {
    setEntries((p) => p.map((e) => (e.id === id ? { ...e, ...updates } : e)));
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((p) => p.filter((e) => e.id !== id));
  }, []);

  /* ── Validate ── */
  const validate = (): boolean => {
    let ok = true;
    setEntries((p) =>
      p.map((e) => {
        if (!e.value.trim()) {
          ok = false;
          return { ...e, error: "This field is required.", status: "error" };
        }
        return { ...e, error: undefined };
      })
    );
    return ok;
  };

  /* ── Verify ── */
  const handleVerify = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry || !entry.value.trim()) {
      updateEntry(id, { error: "This field is required.", status: "error" });
      return false;
    }

    updateEntry(id, { isVerifying: true, status: "loading", error: undefined });

    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: entry.mode,
          value: entry.value,
          api_key: entry.apiKey || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Verification failed" }));
        throw new Error(err.error || "Verification failed");
      }

      const data = await res.json();
      updateEntry(id, { 
        status: "success", 
        isVerifying: false,
        apiTitle: data.apiTitle,
        endpointCount: data.endpointCount
      });
      return true;
    } catch (err) {
      updateEntry(id, { 
        status: "error", 
        isVerifying: false,
        error: err instanceof Error ? err.message : "Unknown error"
      });
      return false;
    }
  };

  /* ── Build ── */
  const handleBuild = async () => {
    setGlobalErr(null);
    setResult(null);
    if (!validate()) return;

    // Verify any idle entries automatically
    const unverified = entries.filter(e => e.status === "idle");
    if (unverified.length > 0) {
      setBuildStep("loading");
      const results = await Promise.all(unverified.map(e => handleVerify(e.id)));
      if (results.some(success => !success)) {
        setGlobalErr("Some APIs failed verification. Please fix them before building.");
        setBuildStep("idle");
        return;
      }
    }

    // Check if any entries are in error state
    // We get the fresh state because handleVerify updates are async and might not be fully reflected in the local closure scope,
    // actually Promise.all with handleVerify will update the React state but the local 'entries' closure is stale.
    // However, if results.some is false, we already aborted above.
    // Let's just double check if the current closure had errors before we even verified.
    if (entries.some(e => e.status === "error")) {
        setGlobalErr("Some APIs have errors. Please fix them before building.");
        return;
    }

    setBuildStep("loading");
    // We need to mark them as loading for the build step, but they are already success.
    // Let's just set the global buildStep to loading.

    try {
      const payload = entries.map((e) => ({
        mode: e.mode,
        value: e.value,
        name: e.name,
        api_key: e.apiKey || undefined,
      }));

      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apis: payload }),
      });

      setBuildStep("analyzing");
      await sleep(600);
      setBuildStep("generating");
      await sleep(400);

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail ?? "Build failed");
      }

      const data: BuildResult = await res.json();
      setEntries((p) => p.map((e) => ({ ...e, status: "success" as const })));
      setBuildStep("done");
      setResult(data);
    } catch (err) {
      setGlobalErr(err instanceof Error ? err.message : "Unknown error");
      setBuildStep("error");
    }
  };

  const handleReset = () => {
    setEntries([createEntry()]);
    setBuildStep("idle");
    setResult(null);
    setGlobalErr(null);
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", position: "relative", background: "#070b14" }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 600, height: 600, top: -200, left: -200, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.28) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 450, height: 450, top: "35%", right: -150, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.2) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, bottom: -100, left: "40%", borderRadius: "50%", background: "radial-gradient(circle,rgba(6,182,212,.12) 0%,transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1 }}>
        {/* ── Nav ── */}
        <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 40px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", boxShadow: "0 4px 16px rgba(99,102,241,.45)", flexShrink: 0 }}>
              M
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#fff", letterSpacing: "-.02em" }}>MCPer</span>
            <span className="badge badge-indigo" style={{ fontSize: 9 }}>beta</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <a href="https://github.com/openshaf/MCPer" target="_blank" rel="noopener noreferrer" id="github-link"
              style={{ display: "flex", alignItems: "center", gap: 6, color: "rgba(255,255,255,.38)", fontSize: 13, textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.75)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.38)")}
            >
              <GithubIcon />
              GitHub
            </a>
            <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer" id="mcp-docs-link"
              style={{ color: "rgba(255,255,255,.38)", fontSize: 13, textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.75)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.38)")}
            >
              MCP Docs
            </a>
          </div>
        </nav>

        {/* ── Hero ── */}
        <section style={{ textAlign: "center", padding: "64px 24px 48px", maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 24, padding: "5px 14px", borderRadius: 999, background: "rgba(99,102,241,.12)", border: "1px solid rgba(99,102,241,.25)", fontSize: 11, fontWeight: 700, color: "#a5b4fc", letterSpacing: ".06em", textTransform: "uppercase" }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", animation: "pulse 2s ease-in-out infinite" }} />
            OpenAPI → FastMCP in seconds
          </div>
          <h1 style={{ fontSize: "clamp(2.2rem,6vw,4rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-.03em", color: "#fff", margin: "0 0 20px" }}>
            Turn any API into<br />
            <span className="gradient-text">an MCP server</span>
          </h1>
          <p style={{ fontSize: "clamp(.9rem,2vw,1.1rem)", color: "rgba(255,255,255,.38)", maxWidth: 560, margin: "0 auto", lineHeight: 1.7 }}>
            Paste your API URLs — MCPer auto-discovers the OpenAPI spec, extracts every endpoint, and generates a plug-and-play{" "}
            <span style={{ color: "#a5b4fc", fontWeight: 500 }}>FastMCP server</span>{" "}
            ready for Claude, Codex, or any MCP-compatible agent.
          </p>
        </section>

        {/* ── Builder card ── */}
        <section style={{ padding: "0 16px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              borderRadius: 24, padding: "32px 28px",
              background: "linear-gradient(145deg,rgba(17,24,39,.97),rgba(13,21,37,.99))",
              border: "1px solid rgba(99,102,241,.18)",
              boxShadow: "0 0 0 1px rgba(99,102,241,.07), 0 40px 100px rgba(0,0,0,.65), 0 0 80px rgba(99,102,241,.05)",
            }}
          >
            {result ? (
              <ResultPanel result={result} onReset={handleReset} />
            ) : (
              <>
                {/* Form header */}
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#fff", margin: 0 }}>Your APIs</h2>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,.28)", marginTop: 4 }}>
                      Add one or more APIs to combine into a single MCP server
                    </p>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.18)", fontFamily: "monospace", flexShrink: 0 }}>
                    {entries.length} / 8
                  </span>
                </div>

                {/* Progress */}
                {buildStep !== "idle" && buildStep !== "error" && (
                  <div style={{ marginBottom: 24 }}>
                    <BuildProgress step={buildStep} totalApis={entries.length} />
                  </div>
                )}

                {/* Global error */}
                {globalErr && (
                  <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ color: "#f87171", flexShrink: 0 }}>⚠</span>
                    <span style={{ fontSize: 13, color: "#fca5a5" }}>{globalErr}</span>
                  </div>
                )}

                {/* API entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {entries.map((entry, i) => (
                    <ApiEntryCard
                      key={entry.id}
                      entry={entry}
                      index={i}
                      onUpdate={updateEntry}
                      onRemove={removeEntry}
                      onVerify={handleVerify}
                      canRemove={entries.length > 1}
                      templates={templates}
                    />
                  ))}
                </div>

                {/* Add API */}
                {entries.length < 8 && (
                  <button
                    id="add-api-button"
                    onClick={addEntry}
                    disabled={isBuilding}
                    style={{
                      width: "100%", marginTop: 12, padding: "12px 0", borderRadius: 12, cursor: isBuilding ? "not-allowed" : "pointer",
                      background: "transparent", border: "2px dashed rgba(255,255,255,.1)", color: "rgba(255,255,255,.28)",
                      fontSize: 13, fontWeight: 600, fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center",
                      gap: 8, transition: "all .2s", opacity: isBuilding ? .45 : 1,
                    }}
                    onMouseEnter={e => { if (!isBuilding) { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(99,102,241,.4)"; (e.currentTarget as HTMLButtonElement).style.color = "#a5b4fc"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(99,102,241,.05)"; } }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,.1)"; (e.currentTarget as HTMLButtonElement).style.color = "rgba(255,255,255,.28)"; (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: 18, lineHeight: 1 }}>+</span>
                    Add another API
                  </button>
                )}

                {/* Divider */}
                <div style={{ margin: "24px 0", borderTop: "1px solid rgba(255,255,255,.05)" }} />

                {/* Multi-API note */}
                <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 12, background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#fbbf24", flexShrink: 0, marginTop: 1 }}>ℹ</span>
                  <p style={{ fontSize: 12, color: "rgba(253,211,77,.6)", lineHeight: 1.6, margin: 0 }}>
                    <strong style={{ color: "rgba(253,211,77,.85)", fontWeight: 700 }}>Multi-API composition</strong> is coming soon.
                    Currently the CLI processes one API at a time. The combined-server feature will be wired in when the backend supports it.
                  </p>
                </div>

                {/* Build button */}
                <button
                  id="build-mcp-button"
                  onClick={handleBuild}
                  disabled={isBuilding}
                  className="btn-lift"
                  style={{
                    width: "100%", padding: "15px 0", borderRadius: 16, border: "none", cursor: isBuilding ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontSize: 15, fontWeight: 700, color: "#fff",
                    background: isBuilding ? "linear-gradient(135deg,#4338ca,#6d28d9)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    boxShadow: isBuilding ? "none" : "0 6px 28px rgba(99,102,241,.45)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                    opacity: isBuilding ? .7 : 1,
                  }}
                >
                  {isBuilding ? (
                    <>
                      <SpinIcon />
                      Building MCP server…
                    </>
                  ) : (
                    <>
                      <span>⚡</span>
                      Generate MCP Server
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </section>

        {/* ── Features grid ── */}
        <section style={{ padding: "0 24px 80px", maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#fff", marginBottom: 8 }}>
            Everything you need
          </h2>
          <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,.28)", marginBottom: 40 }}>
            MCPer handles the entire pipeline from spec to running server
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 14 }}>
            <FeatureCard icon="🔍" title="Auto-discovery"    badge="Smart"  badgeVariant="indigo"  description="Just paste the API base URL — MCPer probes common paths to find the OpenAPI spec automatically." />
            <FeatureCard icon="📥" title="Smart Input Routing"                                      description="Simply paste any link. MCPer instantly detects whether it's a direct spec URL or requires API auto-discovery." />
            <FeatureCard icon="🔒" title="Auth Detection"    badge="Secure" badgeVariant="emerald" description="Automatically detects Bearer, API Key, and Basic auth schemes, mapping them to environment variables." />
            <FeatureCard icon="⚡" title="FastMCP Generation"                                       description="Generates fully type-annotated @mcp.tool() functions using Jinja2 templates and FastMCP." />
            <FeatureCard icon="🔄" title="Redirect Handling" badge="Robust" badgeVariant="cyan"    description="Injects follow_redirects=True so tools transparently handle HTTP 301/302 redirects." />
            <FeatureCard icon="🤖" title="Agent Ready" badge="Coming: Multi-API" badgeVariant="amber" description="Generated servers plug directly into Claude Desktop, Codex CLI, or the MCP Inspector." />
          </div>
        </section>

        {/* ── How it works ── */}
        <section style={{ padding: "0 24px 100px", maxWidth: 760, margin: "0 auto" }}>
          <h2 style={{ textAlign: "center", fontSize: "clamp(1.5rem,3vw,2rem)", fontWeight: 800, color: "#fff", marginBottom: 40 }}>
            How it works
          </h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              { n: "01", title: "Paste your API URLs",         desc: "Enter one or more API base URLs or direct OpenAPI spec URLs.",                                              color: "#6366f1" },
              { n: "02", title: "Spec ingestion & analysis",  desc: "MCPer fetches and parses the OpenAPI 3.x spec, extracting all endpoints, parameters, and auth schemes.",                          color: "#8b5cf6" },
              { n: "03", title: "Code generation",            desc: "Jinja2 templates render a complete FastMCP server.py with typed tool functions for every endpoint.",                               color: "#06b6d4" },
              { n: "04", title: "Run & connect",              desc: "Start the server with uv run and add it to Claude Desktop or Codex CLI with one config snippet.",                                 color: "#10b981" },
            ].map(({ n, title, desc, color }) => (
              <div key={n} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color, background: `${color}18`, border: `1px solid ${color}44` }}>
                  {n}
                </div>
                <div style={{ flex: 1, padding: "14px 18px", borderRadius: 14, background: "rgba(17,24,39,.75)", border: "1px solid rgba(255,255,255,.06)" }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: "rgba(255,255,255,.9)", margin: "0 0 6px" }}>{title}</h3>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,.38)", lineHeight: 1.6, margin: 0 }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer ── */}
        <footer style={{ borderTop: "1px solid rgba(255,255,255,.05)", padding: "28px 40px" }}>
          <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, color: "#fff", background: "linear-gradient(135deg,#6366f1,#8b5cf6)" }}>M</div>
              <span style={{ color: "rgba(255,255,255,.3)", fontSize: 13 }}>MCPer</span>
            </div>
            <p style={{ fontSize: 12, color: "rgba(255,255,255,.18)", textAlign: "center", margin: 0 }}>
              Turn any OpenAPI spec into a FastMCP server — no boilerplate, just plug and play.
            </p>
            <a href="https://github.com/openshaf/MCPer" target="_blank" rel="noopener noreferrer"
              style={{ fontSize: 12, color: "rgba(255,255,255,.28)", textDecoration: "none", transition: "color .2s" }}
              onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,.65)")}
              onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,.28)")}
            >
              View on GitHub →
            </a>
          </div>
        </footer>
      </div>

      {/* Inline keyframes for pulse dot */}
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.4} }
        @keyframes spin   { to{transform:rotate(360deg)} }
      `}</style>
    </div>
  );
}

function SpinIcon() {
  return (
    <svg style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity=".25" />
      <path fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function GithubIcon() {
  return (
    <svg style={{ width: 15, height: 15 }} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}
