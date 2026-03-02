"use client";

import { useState } from "react";
import { useAuth } from "./auth-context";
import { AuthModal } from "./auth-modal";

export function AuthButton() {
    const { isPro, isAuthenticated, user, loading } = useAuth();
    const [open, setOpen] = useState(false);

    if (loading) {
        return <div style={{ width: 80, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.05)" }} />;
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                style={{
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: 600,
                    cursor: "pointer",
                    border: isAuthenticated
                        ? "1px solid rgba(99,102,241,0.4)"
                        : "1px solid rgba(255,255,255,0.15)",
                    background: isAuthenticated
                        ? "rgba(99,102,241,0.15)"
                        : "rgba(255,255,255,0.06)",
                    color: isAuthenticated ? "#a5b4fc" : "#94a3b8",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    whiteSpace: "nowrap",
                }}
            >
                {isAuthenticated ? (
                    <>
                        {isPro ? "⭐" : "🔓"}
                        {user?.email?.split("@")[0]}
                    </>
                ) : (
                    <>🔑 Log In</>
                )}
            </button>
            <AuthModal open={open} onClose={() => setOpen(false)} />
        </>
    );
}
