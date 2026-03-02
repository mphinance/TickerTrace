"use client";

import { useAuth } from "./auth-context";
import { AuthModal } from "./auth-modal";
import { useState } from "react";

interface ProGateProps {
    children: React.ReactNode;
    /** Label shown in the blur overlay CTA, e.g. "Full Signal List" */
    label?: string;
    /** If true, shows a blurred preview of children. If false, shows nothing. Default: true */
    preview?: boolean;
    /** Minimum height for the blur placeholder */
    minHeight?: string;
}

export function ProGate({ children, label = "Pro Feature", preview = true, minHeight = "200px" }: ProGateProps) {
    const { isPro, loading } = useAuth();
    const [modalOpen, setModalOpen] = useState(false);

    if (loading) {
        return (
            <div style={{ minHeight, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4 }}>
                <span style={{ fontSize: "13px", color: "#888" }}>Loading…</span>
            </div>
        );
    }

    if (isPro) return <>{children}</>;

    return (
        <>
            <div style={{ position: "relative" }}>
                {preview && (
                    <div
                        style={{
                            minHeight,
                            overflow: "hidden",
                            filter: "blur(6px)",
                            opacity: 0.35,
                            pointerEvents: "none",
                            userSelect: "none",
                        }}
                    >
                        {children}
                    </div>
                )}

                {/* Overlay CTA */}
                <div
                    style={{
                        position: preview ? "absolute" : "relative",
                        inset: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        minHeight: preview ? undefined : minHeight,
                        padding: "24px",
                    }}
                >
                    <div style={{
                        background: "rgba(15,20,30,0.85)",
                        border: "1px solid rgba(99,102,241,0.4)",
                        borderRadius: "12px",
                        padding: "20px 28px",
                        textAlign: "center",
                        backdropFilter: "blur(8px)",
                        maxWidth: "340px",
                    }}>
                        <div style={{ fontSize: "22px", marginBottom: "8px" }}>🔒</div>
                        <div style={{ fontSize: "14px", fontWeight: 600, color: "#e2e8f0", marginBottom: "4px" }}>
                            {label}
                        </div>
                        <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "16px" }}>
                            Unlock with a free API key or Pro account
                        </div>
                        <button
                            onClick={() => setModalOpen(true)}
                            style={{
                                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                color: "white",
                                border: "none",
                                borderRadius: "8px",
                                padding: "10px 24px",
                                fontSize: "13px",
                                fontWeight: 600,
                                cursor: "pointer",
                                width: "100%",
                            }}
                        >
                            Enter API Key →
                        </button>
                    </div>
                </div>
            </div>

            <AuthModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </>
    );
}
