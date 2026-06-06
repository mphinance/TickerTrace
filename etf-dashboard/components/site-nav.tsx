'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Menu, X } from 'lucide-react';

/**
 * Shared app navigation — one familiar top bar across every data page
 * (dashboard, changes, holdings, effectiveness, scanner, research). The
 * marketing landing page (app/page.tsx) keeps its own commercial nav and is
 * NOT affected by this component.
 *
 * Responsive: full inline bar on desktop (md+), collapses into a hamburger
 * dropdown on small screens so the link row doesn't wrap into a mess.
 */
const LINKS: { href: string; label: string; external?: boolean }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/funds', label: 'Funds' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/changes', label: 'Δ Changes' },
    { href: '/holdings', label: 'Holdings' },
    { href: '/effectiveness', label: 'Fund Scores' },
    { href: '/options-listings', label: 'CBOE Scanner' },
    { href: '/research', label: 'Research' },
    { href: 'https://api.tickertrace.pro/docs', label: '📡 API', external: true },
];

const CTA_HREF = 'https://www.traderdaddy.pro/?ref=8DUEMWAJ';

export function SiteNav() {
    const pathname = usePathname();
    const [open, setOpen] = useState(false);

    const isActive = (l: { href: string; external?: boolean }) =>
        !l.external && (pathname === l.href || pathname.startsWith(l.href + '/'));

    return (
        <nav className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-xl shadow-lg px-4 py-2.5">
            <div className="flex items-center gap-4">
                <Link
                    href="/dashboard"
                    className="text-lg font-black tracking-tight text-[#00d4ff] hover:opacity-80 transition-opacity shrink-0"
                >
                    TICKER<span className="text-foreground">TRACE</span>
                </Link>

                {/* Desktop links */}
                <div className="hidden md:flex items-center gap-1 flex-wrap flex-1 min-w-0">
                    {LINKS.map(l => {
                        const cls = `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${isActive(l)
                            ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`;
                        return l.external ? (
                            <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>
                                {l.label}
                            </a>
                        ) : (
                            <Link key={l.href} href={l.href} className={cls}>
                                {l.label}
                            </Link>
                        );
                    })}
                </div>

                {/* Desktop CTA */}
                <a
                    href={CTA_HREF}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="We track the moves. TraderDaddy helps you trade them."
                    className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#a78bfa]/30 bg-gradient-to-r from-[#a78bfa]/10 to-[#00d4ff]/10 text-[#c4b5fd] hover:text-white hover:border-[#a78bfa]/60 transition-colors whitespace-nowrap shrink-0"
                >
                    🧠 Trade it on TraderDaddy →
                </a>

                {/* Mobile hamburger */}
                <button
                    type="button"
                    onClick={() => setOpen(o => !o)}
                    aria-label="Toggle navigation"
                    aria-expanded={open}
                    className="md:hidden ml-auto inline-flex items-center justify-center h-9 w-9 rounded-md border border-[#334155] bg-[#1e293b] text-slate-300 hover:text-white transition-colors shrink-0"
                >
                    {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
            </div>

            {/* Mobile dropdown */}
            {open && (
                <div className="md:hidden mt-3 pt-3 border-t border-[#1f2937] flex flex-col gap-1.5">
                    {LINKS.map(l => {
                        const cls = `text-sm font-medium px-3 py-2 rounded-md border transition-colors ${isActive(l)
                            ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-300 hover:text-white'}`;
                        return l.external ? (
                            <a
                                key={l.href}
                                href={l.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={() => setOpen(false)}
                                className={cls}
                            >
                                {l.label}
                            </a>
                        ) : (
                            <Link key={l.href} href={l.href} onClick={() => setOpen(false)} className={cls}>
                                {l.label}
                            </Link>
                        );
                    })}
                    <a
                        href={CTA_HREF}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => setOpen(false)}
                        className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-bold rounded-lg border border-[#a78bfa]/30 bg-gradient-to-r from-[#a78bfa]/10 to-[#00d4ff]/10 text-[#c4b5fd] hover:text-white hover:border-[#a78bfa]/60 transition-colors"
                    >
                        🧠 Trade it on TraderDaddy →
                    </a>
                </div>
            )}
        </nav>
    );
}
