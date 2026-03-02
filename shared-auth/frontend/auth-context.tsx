"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import {
    auth,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    type User,
} from "@/lib/firebase";

const API_BASE = "https://api.tickertrace.mphinance.com";

interface AuthUser {
    email: string;
    tier: "free" | "pro" | "institutional";
    usage_24h: number;
    rate_limit_24h: number;
    displayName?: string;
    photoURL?: string;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isPro: boolean;
    user: AuthUser | null;
    firebaseUser: User | null;
    apiKey: string | null;
    logout: () => void;
    loading: boolean;
    /** Called after Firebase sign-in to sync with backend */
    syncWithBackend: () => Promise<{ ok: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isPro: false,
    user: null,
    firebaseUser: null,
    apiKey: null,
    logout: () => { },
    loading: true,
    syncWithBackend: async () => ({ ok: false }),
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * After Firebase auth, send the ID token to our backend.
     * Backend verifies it, creates/finds the user, returns API key.
     */
    const syncWithBackend = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
        const currentUser = auth.currentUser;
        if (!currentUser) return { ok: false, error: "Not signed in" };

        try {
            const idToken = await currentUser.getIdToken();
            const res = await fetch(`${API_BASE}/auth/firebase-login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id_token: idToken }),
            });

            if (!res.ok) {
                const err = await res.json();
                return { ok: false, error: err.detail || "Backend sync failed" };
            }

            const data = await res.json();
            setUser({
                email: data.email,
                tier: data.tier,
                usage_24h: data.usage_24h,
                rate_limit_24h: data.rate_limit_24h,
                displayName: currentUser.displayName || undefined,
                photoURL: currentUser.photoURL || undefined,
            });
            setApiKey(data.api_key);
            return { ok: true };
        } catch {
            return { ok: false, error: "Network error. Please try again." };
        }
    }, []);

    // Listen for Firebase auth state changes
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
            setFirebaseUser(fbUser);

            if (fbUser) {
                // User is signed in → sync with our backend
                try {
                    const idToken = await fbUser.getIdToken();
                    const res = await fetch(`${API_BASE}/auth/firebase-login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ id_token: idToken }),
                    });

                    if (res.ok) {
                        const data = await res.json();
                        setUser({
                            email: data.email,
                            tier: data.tier,
                            usage_24h: data.usage_24h,
                            rate_limit_24h: data.rate_limit_24h,
                            displayName: fbUser.displayName || undefined,
                            photoURL: fbUser.photoURL || undefined,
                        });
                        setApiKey(data.api_key);
                    } else {
                        // Backend sync failed — still show as authenticated via Firebase
                        setUser({
                            email: fbUser.email || "",
                            tier: "free",
                            usage_24h: 0,
                            rate_limit_24h: 100,
                            displayName: fbUser.displayName || undefined,
                            photoURL: fbUser.photoURL || undefined,
                        });
                    }
                } catch {
                    // Network error — show basic Firebase user info
                    setUser({
                        email: fbUser.email || "",
                        tier: "free",
                        usage_24h: 0,
                        rate_limit_24h: 100,
                        displayName: fbUser.displayName || undefined,
                        photoURL: fbUser.photoURL || undefined,
                    });
                }
            } else {
                // User is signed out
                setUser(null);
                setApiKey(null);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const logout = useCallback(() => {
        firebaseSignOut(auth);
        setUser(null);
        setApiKey(null);
    }, []);

    const isAuthenticated = !!user;
    const isPro = user?.tier === "pro" || user?.tier === "institutional";

    return (
        <AuthContext.Provider value={{ isAuthenticated, isPro, user, firebaseUser, apiKey, logout, loading, syncWithBackend }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
