"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Mode = "login" | "register";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode]         = useState<Mode>("login");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
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
    <div style={{
      minHeight: "100vh",
      background: "var(--bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{ width: "100%", maxWidth: 420 }}>

        {/* Logo / wordmark */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ display: "inline-block", marginBottom: 16 }}>
            <span
              style={{
                fontFamily: "'Special Elite', cursive",
                fontSize: 28,
                letterSpacing: "2px",
                color: "#fff",
                background: "var(--accent)",
                padding: "6px 18px",
                borderRadius: 6,
                display: "inline-block",
                transform: "rotate(-2deg)",
              }}
            >
              toolRelay
            </span>
          </div>
          <p style={{
            fontFamily: "'Instrument Sans', sans-serif",
            fontSize: 14,
            color: "var(--text-secondary)",
            margin: 0,
          }}>
            {mode === "login" ? "Welcome back — sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: "#fff",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "32px 28px",
          boxShadow: "0 4px 24px rgba(0,0,0,.06)",
        }}>
          {/* Tab switcher */}
          <div style={{
            display: "flex",
            background: "var(--bg)",
            borderRadius: 8,
            padding: 4,
            marginBottom: 28,
            border: "1px solid var(--border)",
          }}>
            {(["login", "register"] as Mode[]).map(m => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(null); }}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 6, border: "none",
                  cursor: "pointer",
                  fontFamily: "'Instrument Sans', sans-serif",
                  fontSize: 13, fontWeight: 700,
                  background: mode === m ? "var(--accent)" : "transparent",
                  color: mode === m ? "#fff" : "var(--text-muted)",
                  boxShadow: mode === m ? "0 2px 10px rgba(255,107,26,.28)" : "none",
                  transition: "all .2s",
                }}
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {mode === "register" && (
              <Field id="auth-username" label="Username" type="text" value={username} onChange={setUsername} placeholder="your_handle" autoComplete="username" />
            )}
            <Field id="auth-email" label="Email" type="email" value={email} onChange={setEmail} placeholder="you@example.com" autoComplete="email" />

            {/* Password with show/hide */}
            <div>
              <label htmlFor="auth-password" style={{
                display: "block", fontSize: 11, fontWeight: 700,
                color: "var(--text-muted)", marginBottom: 6,
                textTransform: "uppercase", letterSpacing: ".06em",
                fontFamily: "'Instrument Sans', sans-serif",
              }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="auth-password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  required
                  style={{
                    width: "100%", padding: "11px 44px 11px 14px", borderRadius: 8,
                    background: "#fafaf8",
                    border: "1px solid var(--border-input)",
                    color: "var(--text-primary)", fontSize: 14,
                    fontFamily: "'Instrument Sans', sans-serif",
                    outline: "none", boxSizing: "border-box",
                    transition: "border-color .2s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "var(--accent)")}
                  onBlur={e => (e.target.style.borderColor = "var(--border-input)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer",
                    color: "var(--text-muted)", fontSize: 16, lineHeight: 1, padding: 4,
                  }}
                  aria-label={showPass ? "Hide password" : "Show password"}
                >
                  {showPass ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: "10px 14px", borderRadius: 8,
                background: "rgba(239,68,68,.06)",
                border: "1px solid rgba(239,68,68,.18)",
                fontSize: 13, color: "#b91c1c",
                fontFamily: "'Instrument Sans', sans-serif",
                display: "flex", gap: 8, alignItems: "flex-start",
              }}>
                <span style={{ flexShrink: 0 }}>⚠</span> {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="auth-submit-button"
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{ marginTop: 6, padding: "13px 0", borderRadius: 8, width: "100%", fontSize: 14 }}
            >
              {loading ? (
                <><SpinIcon />{mode === "login" ? "Signing in…" : "Creating account…"}</>
              ) : (
                mode === "login" ? "Sign In →" : "Create Account →"
              )}
            </button>
          </form>
        </div>

        {/* Back link */}
        <p style={{
          textAlign: "center", marginTop: 20, fontSize: 13,
          fontFamily: "'Instrument Sans', sans-serif",
          color: "var(--text-muted)",
        }}>
          <a href="/" style={{ color: "var(--accent)", textDecoration: "none", fontWeight: 600 }}>
            ← Back to toolRelay
          </a>
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
      <label htmlFor={id} style={{
        display: "block", fontSize: 11, fontWeight: 700,
        color: "var(--text-muted)", marginBottom: 6,
        textTransform: "uppercase", letterSpacing: ".06em",
        fontFamily: "'Instrument Sans', sans-serif",
      }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required
        style={{
          width: "100%", padding: "11px 14px", borderRadius: 8,
          background: "#fafaf8",
          border: "1px solid var(--border-input)",
          color: "var(--text-primary)", fontSize: 14,
          fontFamily: "'Instrument Sans', sans-serif",
          outline: "none", boxSizing: "border-box",
          transition: "border-color .2s",
        }}
        onFocus={e => (e.target.style.borderColor = "var(--accent)")}
        onBlur={e => (e.target.style.borderColor = "var(--border-input)")}
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
