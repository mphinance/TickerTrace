"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";

const API_BASE = "https://api.tickertrace.mphinance.com";
const COOKIE_KEY = "tt_api_key";
const COOKIE_DAYS = 7;

interface AuthUser {
    email: string;
    tier: "free" | "pro" | "institutional";
    usage_24h: number;
    rate_limit_24h: number;
}

interface AuthContextType {
    isAuthenticated: boolean;
    isPro: boolean;
    user: AuthUser | null;
    apiKey: string | null;
    login: (key: string) => Promise<{ ok: boolean; error?: string }>;
    logout: () => void;
    register: (email: string) => Promise<{ ok: boolean; apiKey?: string; error?: string }>;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isPro: false,
    user: null,
    apiKey: null,
    login: async () => ({ ok: false }),
    logout: () => { },
    register: async () => ({ ok: false }),
    loading: true,
});

function getCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp("(^| )" + name + "=([^;]+)"));
    return match ? decodeURIComponent(match[2]) : null;
}

function setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [apiKey, setApiKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const validateKey = useCallback(async (key: string): Promise<AuthUser | null> => {
        try {
            const res = await fetch(`${API_BASE}/auth/me`, {
                headers: { "X-API-Key": key },
            });
            if (!res.ok) return null;
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    // On mount: restore from cookie
    useEffect(() => {
        const savedKey = getCookie(COOKIE_KEY);
        if (savedKey) {
            validateKey(savedKey).then((u) => {
                if (u) {
                    setUser(u);
                    setApiKey(savedKey);
                } else {
                    deleteCookie(COOKIE_KEY);
                }
                setLoading(false);
            });
        } else {
            setLoading(false);
        }
    }, [validateKey]);

    const login = useCallback(async (key: string): Promise<{ ok: boolean; error?: string }> => {
        const u = await validateKey(key.trim());
        if (!u) return { ok: false, error: "Invalid API key. Get one free at tickertrace.mphinance.com" };
        setUser(u);
        setApiKey(key.trim());
        setCookie(COOKIE_KEY, key.trim(), COOKIE_DAYS);
        return { ok: true };
    }, [validateKey]);

    const logout = useCallback(() => {
        setUser(null);
        setApiKey(null);
        deleteCookie(COOKIE_KEY);
    }, []);

    const register = useCallback(async (email: string): Promise<{ ok: boolean; apiKey?: string; error?: string }> => {
        try {
            const res = await fetch(
                `${API_BASE}/auth/register?email=${encodeURIComponent(email)}&source=DASHBOARD`,
                { method: "POST" }
            );
            if (!res.ok) {
                const err = await res.json();
                return { ok: false, error: err.detail || "Registration failed" };
            }
            const data = await res.json();
            // Auto-login with the new key
            await login(data.api_key);
            return { ok: true, apiKey: data.api_key };
        } catch {
            return { ok: false, error: "Network error. Please try again." };
        }
    }, [login]);

    const isAuthenticated = !!user;
    const isPro = user?.tier === "pro" || user?.tier === "institutional";

    return (
        <AuthContext.Provider value={{ isAuthenticated, isPro, user, apiKey, login, logout, register, loading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
