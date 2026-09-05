'use client';

/**
 * Registers public/sw.js on mount. Renders nothing.
 *
 * Mounted once from app/layout.tsx (same pattern as LiveStats/BottomNav)
 * so every route gets it without per-page wiring. The registration itself
 * is what makes the app installable — see sw.js's header comment for why
 * it exists and what it deliberately does not cache.
 */

import { useEffect } from 'react';

export function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) return;
        navigator.serviceWorker.register('/sw.js').catch((err) => {
            // Never surface this to the user — install-prompt eligibility is
            // a nice-to-have, not something worth an error state over.
            console.warn('Service worker registration failed:', err);
        });
    }, []);

    return null;
}
