"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { User } from "@/types";

interface Props {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authenticated" | "unauthenticated">("checking");
  const [, setUser] = useState<User | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("mcper_token");
    if (!token) {
      setStatus("unauthenticated");
      router.replace("/auth");
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.id) {
          setUser(data);
          setStatus("authenticated");
        } else {
          localStorage.removeItem("mcper_token");
          localStorage.removeItem("mcper_user");
          setStatus("unauthenticated");
          router.replace("/auth");
        }
      })
      .catch(() => {
        setStatus("unauthenticated");
        router.replace("/auth");
      });
  }, [router]);

  if (status === "checking") {
    return (
      <div style={{
        minHeight: "100vh", background: "var(--bg)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{
            width: 36, height: 36, borderRadius: "50%",
            border: "3px solid rgba(255,107,26,.15)",
            borderTopColor: "var(--accent)",
            animation: "spin 1s linear infinite",
          }} />
          <p style={{
            color: "var(--text-muted)", fontSize: 13,
            fontFamily: "'Instrument Sans', sans-serif",
          }}>
            Verifying session…
          </p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
