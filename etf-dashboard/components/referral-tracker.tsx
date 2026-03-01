'use client';

import { useEffect } from 'react';

/**
 * Invisible client component that reads ?ref= from the URL
 * and persists it to localStorage on first visit.
 * Source is also set for X, Substack etc via different ref codes.
 */
export function ReferralTracker() {
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const ref = params.get('ref');
        if (ref) {
            localStorage.setItem('tt_ref', ref.toUpperCase().slice(0, 32));
            localStorage.setItem('tt_ref_ts', new Date().toISOString());
        }
    }, []);

    return null;
}

/**
 * Hook for reading the stored referral source.
 * Returns the ref code if present, otherwise null.
 */
export function useReferralSource(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tt_ref');
}
