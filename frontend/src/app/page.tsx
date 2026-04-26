"use client";

import { useState, useCallback } from "react";
import ApiEntryCard from "@/components/ApiEntryCard";
import BuildProgress from "@/components/BuildProgress";
import ResultPanel from "@/components/ResultPanel";
import { ApiEntry, BuildStep, BuildResult } from "@/types";

function createEntry(): ApiEntry {
  const id = typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `api-${Math.random().toString(36).slice(2)}`;
  return { id, mode: "url", value: "", status: "idle" };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ═══════════════════════════════════════════════════════════════ */
export default function HomePage() {
  const [entries, setEntries]     = useState<ApiEntry[]>(() => [createEntry()]);
  const [buildStep, setBuildStep] = useState<BuildStep>("idle");
  const [result, setResult]       = useState<BuildResult | null>(null);
  const [globalErr, setGlobalErr] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const isBuilding = ["loading", "analyzing", "generating"].includes(buildStep);

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
    setSubmitted(true);

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
    setSubmitted(false);
  };

  /* ── Render ── */
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>

      {/* ── Back button (top-left, appears when submitted) ── */}
      <button
        onClick={handleReset}
        aria-label="Go back"
        style={{
          position: "fixed",
          top: 24,
          left: 28,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          gap: 7,
          background: "transparent",
          border: "none",
          cursor: submitted ? "pointer" : "default",
          padding: "6px 10px 6px 6px",
          borderRadius: 8,
          opacity: submitted ? 1 : 0,
          transform: submitted ? "translateX(0)" : "translateX(-16px)",
          transition: "opacity 0.5s ease 0.4s, transform 0.5s cubic-bezier(0.34,1.56,0.64,1) 0.4s, background 0.15s",
          pointerEvents: submitted ? "auto" : "none",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,0,0,.06)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-primary)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M5 12l7-7M5 12l7 7" />
        </svg>
        <span style={{
          fontFamily: "'Instrument Sans', sans-serif",
          fontSize: 14,
          fontWeight: 600,
          color: "var(--text-primary)",
          letterSpacing: ".01em",
        }}>
          Back
        </span>
      </button>

      {/* ── Main content ── */}
      <div style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "40px 32px 48px", textAlign: "center" }}>

        {/* Hero heading — badge overlaps the W, fades out on submit */}
        <div
          className="animate-fade-in-up"
          style={{
            position: "relative",
            display: "inline-block",
            marginBottom: 20,
            opacity: submitted ? 0 : 1,
            transform: submitted ? "translateY(-60px)" : "translateY(0)",
            transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1), transform 0.85s cubic-bezier(0.4,0,0.2,1)",
            pointerEvents: submitted ? "none" : "auto",
          }}
        >
          {/* Badge — floated over the W, also fades with the heading */}
          <span
            className="badge-accent"
            style={{
              position: "absolute",
              top: "-5px",
              left: "-8px",
              transform: "rotate(-8deg)",
              zIndex: 2,
              fontFamily: "'Special Elite', cursive",
              fontSize: 22,
              letterSpacing: "2px",
            }}
          >
            toolRelay
          </span>

          <h1
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontSize: "clamp(3rem, 8vw, 5.5rem)",
              fontWeight: 400,
              lineHeight: 1.15,
              letterSpacing: "-0.01em",
              color: "var(--text-primary)",
              margin: 0,
            }}
          >
            What are you{" "}
            <em style={{ fontStyle: "italic" }}>building?</em>
          </h1>
        </div>

        {/* Sub-copy — slight delay so it chases the heading out */}
        <p
          style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
            color: "var(--text-secondary)",
            maxWidth: 520,
            margin: "0 auto 32px",
            lineHeight: 1.7,
            opacity: submitted ? 0 : 1,
            transform: submitted ? "translateY(-48px)" : "translateY(0)",
            transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1) 0.12s, transform 0.85s cubic-bezier(0.4,0,0.2,1) 0.12s",
            pointerEvents: submitted ? "none" : "auto",
          }}
        >
          Describe your AI agent&rsquo;s purpose, and we&rsquo;ll configure the perfect set of MCP servers for{" "}
          <em style={{ fontStyle: "italic", color: "var(--text-primary)" }}>it</em>.
        </p>

        {/* ── Form / Result ── */}
        {result ? (
          <div className="animate-fade-in-up result-card" style={{ textAlign: "left" }}>
            <ResultPanel result={result} onReset={handleReset} />
          </div>
        ) : (
          <div
            style={{
              opacity: submitted ? 0 : 1,
              transform: submitted ? "translateY(-36px)" : "translateY(0)",
              transition: "opacity 0.85s cubic-bezier(0.4,0,0.2,1) 0.25s, transform 0.85s cubic-bezier(0.4,0,0.2,1) 0.25s",
              pointerEvents: submitted ? "none" : "auto",
            }}
          >
            {/* Progress */}
            {buildStep !== "idle" && buildStep !== "error" && (
              <div style={{ marginBottom: 20 }}>
                <BuildProgress step={buildStep} totalApis={entries.length} />
              </div>
            )}

            {/* Global error */}
            {globalErr && (
              <div style={{ marginBottom: 16, padding: "12px 16px", borderRadius: 8, background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)", display: "flex", gap: 10, alignItems: "flex-start", textAlign: "left" }}>
                <span style={{ color: "#dc2626", flexShrink: 0 }}>⚠</span>
                <span style={{ fontSize: 13, color: "#b91c1c", fontFamily: "'Instrument Sans', sans-serif" }}>{globalErr}</span>
              </div>
            )}

            {/* API entries */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
              {entries.map((entry, i) => (
                <ApiEntryCard
                  key={entry.id}
                  entry={entry}
                  index={i}
                  onUpdate={updateEntry}
                  onRemove={removeEntry}
                  onVerify={handleVerify}
                  canRemove={entries.length > 1}
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
                  width: "100%", marginBottom: 24, padding: "13px 0", borderRadius: 8, cursor: isBuilding ? "not-allowed" : "pointer",
                  background: "transparent", border: "1.5px dashed var(--border)", color: "var(--text-muted)",
                  fontSize: 13, fontWeight: 600, fontFamily: "'Instrument Sans', sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  transition: "all .2s", opacity: isBuilding ? .45 : 1,
                }}
                onMouseEnter={e => { if (!isBuilding) { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--accent)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)"; } }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLButtonElement).style.color = "var(--text-muted)"; }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>+</span>
                Add another API
              </button>
            )}

            {/* Generate button */}
            <button
              id="build-mcp-button"
              onClick={handleBuild}
              disabled={isBuilding}
              className="btn-primary"
              style={{ width: "100%", padding: "18px 0", borderRadius: 10, fontSize: 16 }}
            >
              {isBuilding ? (
                <>
                  <SpinIcon />
                  Building MCP server…
                </>
              ) : (
                <>
                  Generate MCP Server
                  <span style={{ fontSize: 18 }}>→</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Inline keyframes */}
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
