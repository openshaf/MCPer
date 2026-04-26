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
  const [user, setUser] = useState<User | null>(null);

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
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#070b14" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid rgba(99,102,241,.2)", borderTopColor: "#6366f1", animation: "spin 1s linear infinite" }} />
          <p style={{ color: "rgba(255,255,255,.35)", fontSize: 13 }}>Verifying session…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (status === "unauthenticated") return null;

  return <>{children}</>;
}
