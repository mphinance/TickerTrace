'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { DESTINATIONS, getActiveDestination } from '@/components/site-nav';

/**
 * Fixed five-item bottom tab bar for phones — replaces the three
 * horizontally-scrolling rails that used to stack in site-nav.tsx
 * (docs/REDESIGN-PLAN.md Phase 3). Mounted once from app/layout.tsx so
 * every data route gets it without per-page wiring, and so the spacer that
 * reserves its height lives in one place instead of being copy-pasted onto
 * every page's outer div.
 *
 * Hidden on the landing page ('/'), which keeps its own commercial nav and
 * CTA structure (see site-nav.tsx's top comment) — a second nav system
 * competing with that page's own funnel would work against it, not with it.
 */
export function BottomNav() {
    const pathname = usePathname();
    if (pathname === '/') return null;

    const active = getActiveDestination(pathname);

    return (
        <>
            {/* Reserves the space the fixed bar below occupies, so it never
                sits on top of page content. Lives here — once, via layout —
                rather than as bottom padding a per-page file would have to
                remember to add. */}
            <div aria-hidden className="md:hidden" style={{ height: 'calc(4rem + env(safe-area-inset-bottom))' }} />

            <nav
                className="md:hidden fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 bg-surface/97 backdrop-blur-md border-t border-rule"
                style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
                aria-label="Primary"
            >
                {DESTINATIONS.map(d => {
                    const Icon = d.icon;
                    const isActive = active?.key === d.key;
                    return (
                        <Link
                            key={d.key}
                            href={d.href}
                            aria-current={isActive ? 'page' : undefined}
                            // min-h-16 (64px) keeps the tap target well past the
                            // 44px floor even with the safe-area padding above.
                            className="relative flex flex-col items-center justify-center gap-1 min-h-16 text-[11px] font-semibold transition-colors"
                            style={{ color: isActive ? 'var(--equity)' : '#64748b' }}
                        >
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute top-0 inset-x-4 h-0.5 rounded-full"
                                    style={{ backgroundColor: 'var(--equity)' }}
                                />
                            )}
                            <Icon className="h-5 w-5" />
                            <span>{d.label}</span>
                        </Link>
                    );
                })}
            </nav>
        </>
    );
}
