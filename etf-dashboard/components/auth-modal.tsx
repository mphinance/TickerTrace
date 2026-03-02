"use client";

import { useState } from "react";
import { useAuth } from "./auth-context";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
    const { login, register, user, logout, isPro } = useAuth();

    const [tab, setTab] = useState<"login" | "register">("login");
    const [apiKey, setApiKey] = useState("");
    const [email, setEmail] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess(""); setLoading(true);
        const result = await login(apiKey);
        setLoading(false);
        if (result.ok) {
            setSuccess("Logged in! Pro features unlocked.");
            setTimeout(onClose, 1200);
        } else {
            setError(result.error || "Invalid key");
        }
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess(""); setLoading(true);
        const result = await register(email);
        setLoading(false);
        if (result.ok) {
            setSuccess(`Key created! Save it: ${result.apiKey}`);
            setTimeout(onClose, 2500);
        } else {
            setError(result.error || "Registration failed");
        }
    };

    const inputStyle: React.CSSProperties = {
        width: "100%",
        padding: "10px 14px",
        background: "rgba(255,255,255,0.06)",
        border: "1px solid rgba(255,255,255,0.12)",
        borderRadius: "8px",
        color: "#e2e8f0",
        fontSize: "13px",
        outline: "none",
        boxSizing: "border-box",
    };

    const btnPrimary: React.CSSProperties = {
        width: "100%",
        padding: "11px",
        background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
        color: "white",
        border: "none",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        opacity: loading ? 0.7 : 1,
    };

    return (
        <div
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                background: "rgba(0,0,0,0.7)",
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "24px",
            }}
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div style={{
                background: "#0f141e",
                border: "1px solid rgba(99,102,241,0.3)",
                borderRadius: "16px",
                padding: "28px",
                width: "100%",
                maxWidth: "400px",
                boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            }}>
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <div>
                        <div style={{ fontSize: "18px", fontWeight: 700, color: "#e2e8f0" }}>
                            {user ? "Account" : "Unlock TickerTrace Pro"}
                        </div>
                        {!user && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                Free API key • No credit card
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>×</button>
                </div>

                {/* Logged in state */}
                {user ? (
                    <div style={{ textAlign: "center" }}>
                        <div style={{ fontSize: "32px", marginBottom: "8px" }}>{isPro ? "⭐" : "🔓"}</div>
                        <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>{user.email}</div>
                        <div style={{
                            display: "inline-block",
                            margin: "8px 0 16px",
                            padding: "3px 12px",
                            borderRadius: "20px",
                            fontSize: "12px",
                            fontWeight: 600,
                            background: isPro ? "rgba(99,102,241,0.2)" : "rgba(100,116,139,0.2)",
                            color: isPro ? "#818cf8" : "#94a3b8",
                            border: isPro ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(100,116,139,0.3)",
                        }}>
                            {user.tier.toUpperCase()}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b", marginBottom: "20px" }}>
                            {user.usage_24h} / {user.rate_limit_24h} requests today
                        </div>
                        <button
                            onClick={() => { logout(); onClose(); }}
                            style={{ ...btnPrimary, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                        >
                            Sign Out
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div style={{ display: "flex", gap: "4px", marginBottom: "20px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "4px" }}>
                            {(["login", "register"] as const).map((t) => (
                                <button
                                    key={t}
                                    onClick={() => { setTab(t); setError(""); setSuccess(""); }}
                                    style={{
                                        flex: 1, padding: "8px", borderRadius: "6px", border: "none",
                                        background: tab === t ? "rgba(99,102,241,0.3)" : "transparent",
                                        color: tab === t ? "#a5b4fc" : "#64748b",
                                        fontSize: "13px", fontWeight: 600, cursor: "pointer",
                                    }}
                                >
                                    {t === "login" ? "I have a key" : "Get free key"}
                                </button>
                            ))}
                        </div>

                        {tab === "login" ? (
                            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <input
                                    style={inputStyle}
                                    placeholder="tt_live_..."
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    required
                                />
                                <button type="submit" style={btnPrimary} disabled={loading}>
                                    {loading ? "Validating…" : "Unlock Pro Features →"}
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <input
                                    style={inputStyle}
                                    type="email"
                                    placeholder="you@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                                <button type="submit" style={btnPrimary} disabled={loading}>
                                    {loading ? "Creating key…" : "Create Free API Key →"}
                                </button>
                            </form>
                        )}

                        <div style={{ fontSize: "11px", color: "#475569", textAlign: "center", marginTop: "12px" }}>
                            {tab === "register"
                                ? "Free key: 100 req/day. Pro ($15/mo): full access, no limits."
                                : "No account? Switch to 'Get free key' tab."}
                        </div>
                    </>
                )}

                {error && (
                    <div style={{ marginTop: "12px", padding: "10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", fontSize: "13px", color: "#f87171" }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ marginTop: "12px", padding: "10px", background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: "8px", fontSize: "13px", color: "#4ade80" }}>
                        {success}
                    </div>
                )}
            </div>
        </div>
    );
}
