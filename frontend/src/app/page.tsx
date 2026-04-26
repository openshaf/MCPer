"use client";

import { useState, useCallback, useEffect } from "react";
import ApiEntryCard from "@/components/ApiEntryCard";
import BuildProgress from "@/components/BuildProgress";
import ResultPanel from "@/components/ResultPanel";
import FeatureCard from "@/components/FeatureCard";
import { ApiEntry, BuildStep, BuildResult, User } from "@/types";

/* ── ID generation ── */
let _counter = 0;
function nextId() { _counter += 1; return `api-${_counter}`; }
function createEntry(): ApiEntry {
  return { id: nextId(), mode: "auto", value: "", status: "idle" };
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function HomePage() {
  const [entries, setEntries]     = useState<ApiEntry[]>(() => [createEntry()]);
  const [buildStep, setBuildStep] = useState<BuildStep>("idle");
  const [result, setResult]       = useState<BuildResult | null>(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [user, setUser]           = useState<User | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isBuilding = ["loading", "analyzing", "generating"].includes(buildStep);

  useEffect(() => {
    const stored = localStorage.getItem("mcper_user");
    if (stored) { try { setUser(JSON.parse(stored)); } catch {} }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("mcper_token");
    localStorage.removeItem("mcper_user");
    setUser(null);
  };

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

  const validate = (): boolean => {
    let ok = true;
    setEntries((p) => p.map((e) => {
      if (!e.value.trim()) { ok = false; return { ...e, error: "This field is required.", status: "error" }; }
      return { ...e, error: undefined };
    }));
    return ok;
  };

  const handleVerify = async (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (!entry || !entry.value.trim()) { updateEntry(id, { error: "This field is required.", status: "error" }); return false; }
    updateEntry(id, { isVerifying: true, status: "loading", error: undefined });
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: entry.mode, value: entry.value }),
      });
      if (!res.ok) { const err = await res.json().catch(() => ({ error: "Verification failed" })); throw new Error(err.error || "Verification failed"); }
      const data = await res.json();
      updateEntry(id, { status: "success", isVerifying: false, apiTitle: data.apiTitle, endpointCount: data.endpointCount, authType: data.authType });
      return true;
    } catch (err) {
      updateEntry(id, { status: "error", isVerifying: false, error: err instanceof Error ? err.message : "Unknown error" });
      return false;
    }
  };

  const handleBuild = async () => {
    setGlobalErr(null);
    setResult(null);
    if (!validate()) return;

    const unverified = entries.filter(e => e.status === "idle");
    if (unverified.length > 0) {
      setBuildStep("loading");
      const results = await Promise.all(unverified.map(e => handleVerify(e.id)));
      if (results.some(s => !s)) { setGlobalErr("Some APIs failed verification. Please fix them before building."); setBuildStep("idle"); return; }
    }
    if (entries.some(e => e.status === "error")) { setGlobalErr("Some APIs have errors. Please fix them before building."); return; }

    setSubmitted(true);
    setBuildStep("loading");

    try {
      const token = localStorage.getItem("mcper_token");
      const payload = entries.map(e => ({ mode: e.mode, value: e.value, name: e.name }));
      const res = await fetch("/api/build", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ apis: payload }),
      });
      setBuildStep("analyzing"); await sleep(600);
      setBuildStep("generating"); await sleep(400);
      if (!res.ok) { const err = await res.json().catch(() => ({ detail: res.statusText })); throw new Error(err.detail ?? "Build failed"); }
      const data: BuildResult = await res.json();
      setEntries(p => p.map(e => ({ ...e, status: "success" as const })));
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
    setSubmitted(false);
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)" }}>

      {/* ── Sticky Nav ── */}
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "16px 40px", borderBottom: "1px solid var(--border)",
        background: "#fff", position: "sticky", top: 0, zIndex: 50,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{
            fontFamily: "'Special Elite', cursive", fontSize: 18, letterSpacing: "1.5px",
            color: "#fff", background: "var(--accent)", padding: "3px 10px",
            borderRadius: 4, display: "inline-block", transform: "rotate(-2deg)",
          }}>toolRelay</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {user ? (
            <>
              <a href="/dashboard" style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textDecoration: "none", fontFamily: "'Instrument Sans', sans-serif" }}>
                Dashboard
              </a>
              <span style={{ fontSize: 13, color: "var(--text-muted)", fontFamily: "'Instrument Sans', sans-serif" }}>
                👤 <strong style={{ color: "var(--text-primary)" }}>{user.username || user.email}</strong>
              </span>
              <button
                onClick={handleLogout}
                style={{ padding: "6px 14px", borderRadius: 7, border: "1px solid var(--border)", background: "transparent", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Instrument Sans', sans-serif", transition: "all .2s" }}
                onMouseEnter={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "rgba(239,68,68,.35)"; b.style.color = "#dc2626"; }}
                onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--text-muted)"; }}
              >Sign out</button>
            </>
          ) : (
            <a href="/auth" style={{ padding: "7px 18px", borderRadius: 7, background: "var(--accent)", color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: "'Instrument Sans', sans-serif", boxShadow: "0 2px 10px rgba(255,107,26,.28)" }}>
              Sign in →
            </a>
          )}
          <a
            href="https://github.com/openshaf/MCPer"
            target="_blank" rel="noopener noreferrer"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textDecoration: "none", fontFamily: "'Instrument Sans', sans-serif", transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--text-primary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >
            <GithubIcon /> GitHub
          </a>
        </div>
      </nav>

      {/* ── Back button (shown after submit) ── */}
      <button
        onClick={handleReset}
        aria-label="Go back"
        style={{
          position: "fixed", top: 72, left: 28, zIndex: 100,
          display: "flex", alignItems: "center", gap: 7,
          background: "transparent", border: "none",
          cursor: submitted ? "pointer" : "default",
          padding: "6px 10px 6px 6px", borderRadius: 8,
          opacity: submitted ? 1 : 0,
          transform: submitted ? "translateX(0)" : "translateX(-16px)",
          transition: "opacity 0.5s ease 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s, background 0.15s",
          pointerEvents: submitted ? "auto" : "none",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,.06)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </svg>
        <span style={{ fontFamily: "'Instrument Sans'", fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>Back</span>
      </button>

      {/* ── Hero ── */}
      {!result && (
        <section style={{
          textAlign: "center", padding: "64px 24px 24px",
          maxWidth: 900, margin: "0 auto",
          opacity: submitted ? 0 : 1,
          transform: submitted ? "translateY(-60px)" : "translateY(0)",
          transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1), transform 0.85s cubic-bezier(0.4,0,0.2,1)",
          pointerEvents: submitted ? "none" : "auto",
        }}>

          <div style={{ position: "relative", display: "inline-block", marginBottom: 20 }}>
            <span className="badge-accent" style={{ position: "absolute", top: "-5px", left: "-8px", transform: "rotate(-8deg)", zIndex: 2, fontFamily: "'Special Elite', cursive", fontSize: 22, letterSpacing: "2px" }}>
              toolRelay
            </span>
            <h1 style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(3rem, 8vw, 5.5rem)", fontWeight: 400, lineHeight: 1.15, letterSpacing: "-0.01em", color: "var(--text-primary)", margin: 0 }}>
              What are you <em style={{ fontStyle: "italic" }}>building?</em>
            </h1>
          </div>

          <p style={{
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)", color: "var(--text-secondary)",
            maxWidth: 560, margin: "0 auto", lineHeight: 1.7,
            fontFamily: "'Instrument Sans', sans-serif",
            opacity: submitted ? 0 : 1,
            transform: submitted ? "translateY(-48px)" : "translateY(0)",
            transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1) 0.12s, transform 0.85s cubic-bezier(0.4,0,0.2,1) 0.12s",
          }}>
            Paste your API URLs — MCPer auto-discovers the OpenAPI spec, extracts every endpoint, and generates a plug-and-play{" "}
            <em style={{ fontStyle: "italic", color: "var(--text-primary)" }}>FastMCP server</em>{" "}
            ready for Claude, Codex, or any MCP-compatible agent.
          </p>
        </section>
      )}

      {/* ── Result panel (always visible after build) ── */}
      {result && (
        <section style={{ padding: "0 16px 80px", maxWidth: 680, margin: "0 auto" }}>
          <div style={{
            borderRadius: 14, padding: "32px 28px",
            background: "#fff", border: "1px solid var(--border)",
            boxShadow: "0 4px 24px rgba(0,0,0,.07)",
            animation: "fadeInUp 0.5s ease both",
          }}>
            <ResultPanel result={result} onReset={handleReset} />
          </div>
        </section>
      )}

      {/* ── Builder card (fades out on submit) ── */}
      {!result && (
      <section style={{
        padding: "0 16px 80px", maxWidth: 680, margin: "0 auto",
        opacity: submitted ? 0 : 1,
        transform: submitted ? "translateY(-36px)" : "translateY(0)",
        transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1) 0.25s, transform 0.85s cubic-bezier(0.4,0,0.2,1) 0.25s",
        pointerEvents: submitted ? "none" : "auto",
      }}>
        <div style={{
          borderRadius: 14, padding: "32px 28px",
          background: "#fff", border: "1px solid var(--border)",
          boxShadow: "0 4px 24px rgba(0,0,0,.07)",
        }}>

              {/* Form header */}
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 24 }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>Your APIs</h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Instrument Sans', sans-serif" }}>
                    Add one or more APIs to combine into a single MCP server
                  </p>
                </div>
                <span style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
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
                <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ color: "#dc2626", flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: 13, color: "#b91c1c", fontFamily: "'Instrument Sans', sans-serif" }}>{globalErr}</span>
                </div>
              )}

              {/* API entries */}
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {entries.map((entry, i) => (
                  <ApiEntryCard key={entry.id} entry={entry} index={i} onUpdate={updateEntry} onRemove={removeEntry} onVerify={handleVerify} canRemove={entries.length > 1} />
                ))}
              </div>

              {/* Add API */}
              {entries.length < 8 && (
                <button
                  id="add-api-button"
                  onClick={addEntry}
                  disabled={isBuilding}
                  style={{
                    width: "100%", marginTop: 12, padding: "13px 0", borderRadius: 8, cursor: isBuilding ? "not-allowed" : "pointer",
                    background: "transparent", border: "1.5px dashed var(--border)", color: "var(--text-muted)",
                    fontSize: 13, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    transition: "all .2s", opacity: isBuilding ? .45 : 1,
                  }}
                  onMouseEnter={e => { if (!isBuilding) { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--accent)"; b.style.color = "var(--accent)"; } }}
                  onMouseLeave={e => { const b = e.currentTarget as HTMLButtonElement; b.style.borderColor = "var(--border)"; b.style.color = "var(--text-muted)"; }}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>+</span> Add another API
                </button>
              )}

              {/* Divider */}
              <div style={{ margin: "24px 0", borderTop: "1px solid var(--border)" }} />

              {/* Multi-API note */}
              <div style={{ marginBottom: 20, padding: "12px 16px", borderRadius: 8, background: "rgba(255,107,26,.05)", border: "1px solid rgba(255,107,26,.15)", display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ color: "var(--accent)", flexShrink: 0, marginTop: 1 }}>ℹ</span>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>
                  <strong style={{ color: "var(--text-primary)", fontWeight: 700 }}>Multi-API composition</strong> is coming soon.
                  Currently the CLI processes one API at a time. The combined-server feature will be wired in when the backend supports it.
                </p>
              </div>

              {/* Build button */}
              <button
                id="build-mcp-button"
                onClick={handleBuild}
                disabled={isBuilding}
                className="btn-primary"
                style={{ width: "100%", padding: "18px 0", borderRadius: 10, fontSize: 16, gap: 10 }}
              >
                {isBuilding ? (<><SpinIcon /> Building MCP server…</>) : (<>Generate MCP Server <span>→</span></>)}
              </button>
        </div>
      </section>
      )}


      {/* ── How it works ── (commented out)
      <section style={{ padding: "0 32px 100px", maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <h2 style={{ textAlign: "center", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", fontWeight: 400, color: "var(--text-primary)", marginBottom: 40 }}>
          How it works
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[
            { n: "01", title: "Paste your API URLs",       desc: "Enter one or more API base URLs or direct OpenAPI spec URLs.", color: "#FF6B1A" },
            { n: "02", title: "Spec ingestion & analysis", desc: "MCPer fetches and parses the OpenAPI 3.x spec, extracting all endpoints, parameters, and auth schemes.", color: "#E55A0A" },
            { n: "03", title: "Code generation",           desc: "Jinja2 templates render a complete FastMCP server.py with typed tool functions for every endpoint.", color: "#C24A08" },
            { n: "04", title: "Run & connect",             desc: "Start the server with uv run and add it to Claude Desktop or Codex CLI with one config snippet.", color: "#9A3A06" },
          ].map(({ n, title, desc, color }) => (
            <div key={n} style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
              <div style={{ width: 42, height: 42, borderRadius: "50%", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 900, color, background: `${color}12`, border: `1px solid ${color}44`, fontFamily: "'Instrument Sans', sans-serif" }}>
                {n}
              </div>
              <div style={{ flex: 1, padding: "14px 18px", borderRadius: 10, background: "#fff", border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,.04)" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "'Instrument Sans', sans-serif", margin: "0 0 5px" }}>{title}</h3>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 40px", background: "#fff" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <span style={{ fontFamily: "'Special Elite', cursive", fontSize: 15, letterSpacing: "1.5px", color: "#fff", background: "var(--accent)", padding: "3px 10px", borderRadius: 4, display: "inline-block", transform: "rotate(-1deg)" }}>
            toolRelay
          </span>
          <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", margin: 0, fontFamily: "'Instrument Sans', sans-serif" }}>
            Turn any OpenAPI spec into a FastMCP server — no boilerplate, just plug and play.
          </p>
          <a href="https://github.com/openshaf/MCPer" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 12, color: "var(--text-muted)", textDecoration: "none", fontFamily: "'Instrument Sans', sans-serif", fontWeight: 600, transition: "color .2s" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--text-muted)")}
          >View on GitHub →</a>
        </div>
      </footer>
      */}

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin  { to{transform:rotate(360deg)} }
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
