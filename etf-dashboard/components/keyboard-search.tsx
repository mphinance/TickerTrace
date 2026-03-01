'use client';

import { useEffect } from 'react';

/**
 * Adds keyboard shortcut: press '/' to focus the search input.
 * Standard convention used by GitHub, YouTube, etc.
 */
export function KeyboardSearch() {
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            // Don't fire if user is typing in an input/textarea
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === '/') {
                e.preventDefault();
                const searchInput = document.querySelector('input[name="q"]') as HTMLInputElement;
                searchInput?.focus();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    return null;
}
