"use client";

interface ProGateProps {
    children: React.ReactNode;
    label?: string;
    preview?: boolean;
    minHeight?: string;
}

// Auth gates removed — all features open access.
// To re-enable: import { useAuth } from "./auth-context" and check isPro.
export function ProGate({ children }: ProGateProps) {
    return <>{children}</>;
}
