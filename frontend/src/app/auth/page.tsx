"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode]       = useState<Mode>("login");
  const [email, setEmail]     = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [showPass, setShowPass] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login"
      ? { email, password }
      : { email, password, username };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || "Something went wrong.");
        return;
      }
      // Store token and user info
      if (data.access_token) {
        localStorage.setItem("mcper_token", data.access_token);
        localStorage.setItem("mcper_user", JSON.stringify({ id: data.id, email: data.email, username: data.username }));
      }
      router.push("/");
    } catch {
      setError("Network error — make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#070b14", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative" }}>
      {/* Background orbs */}
      <div style={{ position: "fixed", inset: 0, overflow: "hidden", pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", width: 500, height: 500, top: -150, left: -150, borderRadius: "50%", background: "radial-gradient(circle,rgba(99,102,241,.22) 0%,transparent 70%)", filter: "blur(80px)" }} />
        <div style={{ position: "absolute", width: 400, height: 400, bottom: -100, right: -100, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,.18) 0%,transparent 70%)", filter: "blur(80px)" }} />
      </div>

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, color: "#fff", fontSize: 16, boxShadow: "0 4px 20px rgba(99,102,241,.5)" }}>M</div>
            <span style={{ fontWeight: 800, color: "#fff", fontSize: 20 }}>MCPer</span>
          </div>
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13, marginTop: 8 }}>
            {mode === "login" ? "Sign in to your account" : "Create a new account"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: 24, padding: "32px 28px",
          background: "linear-gradient(145deg,rgba(17,24,39,.97),rgba(13,21,37,.99))",
          border: "1px solid rgba(99,102,241,.18)",
          boxShadow: "0 0 0 1px rgba(99,102,241,.07), 0 40px 80px rgba(0,0,0,.6)",
        }}>
          {/* Tab switcher */}
          <div style={{ display: "flex", background: "rgba(0,0,0,.35)", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid rgba(255,255,255,.06)" }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 9, border: "none", cursor: "pointer",
                  fontFamily: "inherit", fontSize: 13, fontWeight: 700,
                  background: mode === m ? "linear-gradient(135deg,#6366f1,#8b5cf6)" : "transparent",
                  color: mode === m ? "#fff" : "rgba(255,255,255,.35)",
                  boxShadow: mode === m ? "0 2px 12px rgba(99,102,241,.4)" : "none",
                  transition: "all .2s",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <Field id="auth-username" label="Username" type="text" value={username} onChange={setUsername} placeholder="your_handle" autoComplete="username" />
            )}
            <Field id="auth-email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />
            
            {/* Password with show/hide */}
            <div>
              <label htmlFor="auth-password" style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>Password</label>
              <div style={{ position: "relative" }}>
                <input
                  id="auth-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  className="input-glow"
                  style={{
                    width: "100%", padding: "11px 44px 11px 14px", borderRadius: 10,
                    background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.1)",
                    color: "rgba(255,255,255,.85)", fontSize: 14, fontFamily: "inherit",
                    boxSizing: "border-box",
                  }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,.3)", fontSize: 16, lineHeight: 1 }}>
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {error && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)", fontSize: 13, color: "#fca5a5" }}>
                ⚠ {error}
              </div>
            )}

            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading}
              className="btn-lift"
              style={{
                marginTop: 6, padding: "13px 0", borderRadius: 12, border: "none",
                background: loading ? "linear-gradient(135deg,#4338ca,#6d28d9)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
                color: "#fff", fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit", boxShadow: loading ? "none" : "0 6px 24px rgba(99,102,241,.4)",
                opacity: loading ? .7 : 1, transition: "opacity .2s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              {loading ? (
                <>
                  <SpinIcon />
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </>
              ) : mode === "login" ? "Sign In →" : "Create Account →"}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "rgba(255,255,255,.2)" }}>
          <a href="/" style={{ color: "rgba(165,180,252,.5)", textDecoration: "none" }}>← Back to MCPer</a>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function Field({ id, label, type, value, onChange, placeholder, autoComplete }: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; placeholder: string; autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={id} style={{ display: "block", fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,.5)", marginBottom: 6, textTransform: "uppercase", letterSpacing: ".05em" }}>{label}</label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        className="input-glow"
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 10,
          background: "rgba(0,0,0,.4)", border: "1px solid rgba(255,255,255,.1)",
          color: "rgba(255,255,255,.85)", fontSize: 14, fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
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
