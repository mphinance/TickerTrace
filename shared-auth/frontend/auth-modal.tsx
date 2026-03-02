"use client";

import { useState } from "react";
import { useAuth } from "./auth-context";
import {
    auth,
    googleProvider,
    signInWithPopup,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    sendPasswordResetEmail,
} from "@/lib/firebase";

interface AuthModalProps {
    open: boolean;
    onClose: () => void;
}

export function AuthModal({ open, onClose }: AuthModalProps) {
    const { user, logout, isPro, syncWithBackend } = useAuth();

    const [tab, setTab] = useState<"login" | "register">("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [loading, setLoading] = useState(false);

    if (!open) return null;

    const handleGoogleSignIn = async () => {
        setError(""); setSuccess(""); setLoading(true);
        try {
            await signInWithPopup(auth, googleProvider);
            const result = await syncWithBackend();
            if (result.ok) {
                setSuccess("Signed in with Google!");
                setTimeout(onClose, 1200);
            } else {
                setError(result.error || "Backend sync failed");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Google sign-in failed";
            if (!msg.includes("popup-closed")) {
                setError(msg);
            }
        }
        setLoading(false);
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess(""); setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            const result = await syncWithBackend();
            if (result.ok) {
                setSuccess("Logged in! Pro features unlocked.");
                setTimeout(onClose, 1200);
            } else {
                setError(result.error || "Backend sync failed");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Login failed";
            if (msg.includes("invalid-credential") || msg.includes("wrong-password")) {
                setError("Invalid email or password");
            } else if (msg.includes("user-not-found")) {
                setError("No account with this email. Sign up first.");
            } else {
                setError(msg);
            }
        }
        setLoading(false);
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(""); setSuccess("");

        if (password.length < 6) {
            setError("Password must be at least 6 characters");
            return;
        }
        if (password !== confirmPassword) {
            setError("Passwords don't match");
            return;
        }

        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
            const result = await syncWithBackend();
            if (result.ok) {
                setSuccess("Account created! You're logged in.");
                setTimeout(onClose, 1500);
            } else {
                setError(result.error || "Backend sync failed");
            }
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : "Registration failed";
            if (msg.includes("email-already-in-use")) {
                setError("This email already has an account. Try logging in.");
            } else if (msg.includes("weak-password")) {
                setError("Password is too weak. Use at least 6 characters.");
            } else {
                setError(msg);
            }
        }
        setLoading(false);
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError("Enter your email first, then click 'Forgot password?'");
            return;
        }
        setError(""); setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccess("Password reset email sent! Check your inbox.");
        } catch {
            setError("Couldn't send reset email. Check the email address.");
        }
        setLoading(false);
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

    const googleBtnStyle: React.CSSProperties = {
        width: "100%",
        padding: "11px",
        background: "rgba(255,255,255,0.06)",
        color: "#e2e8f0",
        border: "1px solid rgba(255,255,255,0.15)",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: loading ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        transition: "background 0.2s",
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
                            {user ? "Account" : "Welcome to TickerTrace"}
                        </div>
                        {!user && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>
                                {tab === "login" ? "Sign in to unlock Pro features" : "Create a free account"}
                            </div>
                        )}
                    </div>
                    <button onClick={onClose} style={{ background: "none", border: "none", color: "#64748b", fontSize: "20px", cursor: "pointer" }}>×</button>
                </div>

                {/* Logged in state */}
                {user ? (
                    <div style={{ textAlign: "center" }}>
                        {user.photoURL ? (
                            <img
                                src={user.photoURL}
                                alt=""
                                style={{ width: 48, height: 48, borderRadius: "50%", marginBottom: 8 }}
                            />
                        ) : (
                            <div style={{ fontSize: "32px", marginBottom: "8px" }}>{isPro ? "⭐" : "🔓"}</div>
                        )}
                        <div style={{ fontSize: "14px", color: "#e2e8f0", fontWeight: 600 }}>
                            {user.displayName || user.email}
                        </div>
                        {user.displayName && (
                            <div style={{ fontSize: "12px", color: "#64748b", marginTop: "2px" }}>{user.email}</div>
                        )}
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

                        {!isPro && (
                            <button
                                onClick={async () => {
                                    setLoading(true);
                                    setError("");
                                    try {
                                        const res = await fetch(
                                            `https://api.tickertrace.mphinance.com/billing/checkout?email=${encodeURIComponent(user.email)}&tier=pro`,
                                            { method: "POST" }
                                        );
                                        if (!res.ok) throw new Error("Checkout failed");
                                        const { checkout_url } = await res.json();
                                        window.location.href = checkout_url;
                                    } catch {
                                        setError("Couldn't start checkout. Try again.");
                                        setLoading(false);
                                    }
                                }}
                                disabled={loading}
                                style={{
                                    ...btnPrimary,
                                    marginBottom: "10px",
                                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                }}
                            >
                                {loading ? "Loading…" : "⭐ Upgrade to Pro — $15/mo"}
                            </button>
                        )}

                        <button
                            onClick={() => { logout(); onClose(); }}
                            style={{ ...btnPrimary, background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#f87171" }}
                        >
                            Sign Out
                        </button>
                    </div>

                ) : (
                    <>
                        {/* Google Sign-In Button */}
                        <button
                            onClick={handleGoogleSignIn}
                            disabled={loading}
                            style={googleBtnStyle}
                            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.1)")}
                            onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.06)")}
                        >
                            <svg width="18" height="18" viewBox="0 0 24 24">
                                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                            </svg>
                            {loading ? "Signing in…" : "Continue with Google"}
                        </button>

                        {/* Divider */}
                        <div style={{ display: "flex", alignItems: "center", margin: "16px 0", gap: "12px" }}>
                            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
                            <span style={{ fontSize: "11px", color: "#475569", textTransform: "uppercase", letterSpacing: "0.5px" }}>or</span>
                            <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.1)" }} />
                        </div>

                        {/* Tabs */}
                        <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "rgba(255,255,255,0.04)", borderRadius: "8px", padding: "4px" }}>
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
                                    {t === "login" ? "Email Login" : "Sign Up"}
                                </button>
                            ))}
                        </div>

                        {tab === "login" ? (
                            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <input
                                    style={inputStyle}
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                                <input
                                    style={inputStyle}
                                    type="password"
                                    placeholder="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="current-password"
                                    required
                                />
                                <button type="submit" style={btnPrimary} disabled={loading}>
                                    {loading ? "Signing in…" : "Log In →"}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleForgotPassword}
                                    style={{
                                        background: "none", border: "none", color: "#6366f1",
                                        fontSize: "12px", cursor: "pointer", padding: 0,
                                    }}
                                >
                                    Forgot password?
                                </button>
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                                <input
                                    style={inputStyle}
                                    type="email"
                                    placeholder="Email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    autoComplete="email"
                                    required
                                />
                                <input
                                    style={inputStyle}
                                    type="password"
                                    placeholder="Password (min 6 characters)"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                                <input
                                    style={inputStyle}
                                    type="password"
                                    placeholder="Confirm password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                                <button type="submit" style={btnPrimary} disabled={loading}>
                                    {loading ? "Creating account…" : "Create Account →"}
                                </button>
                            </form>
                        )}
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
