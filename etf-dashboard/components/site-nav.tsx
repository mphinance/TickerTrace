'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/**
 * Shared app navigation — one familiar top bar across every data page
 * (dashboard, changes, holdings, effectiveness, scanner). The marketing
 * landing page (app/page.tsx) keeps its own commercial nav and is NOT
 * affected by this component.
 *
 * Links point only at routes that exist today. A Funds index and a Stocks
 * index are planned (HedgeFollow-style) but not yet built — add them here
 * when those pages land.
 */
const LINKS: { href: string; label: string; external?: boolean }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/funds', label: 'Funds' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/layering', label: '🪜 Layering' },
    { href: '/changes', label: 'Δ Changes' },
    { href: '/holdings', label: 'Holdings' },
    { href: '/effectiveness', label: 'Fund Scores' },
    { href: '/options-listings', label: 'CBOE Scanner' },
    { href: 'https://api.tickertrace.pro/docs', label: '📡 API', external: true },
];

export function SiteNav() {
    const pathname = usePathname();

    return (
        <nav className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <Link
                href="/dashboard"
                className="text-lg font-black tracking-tight text-[#00d4ff] hover:opacity-80 transition-opacity shrink-0"
            >
                TICKER<span className="text-foreground">TRACE</span>
            </Link>

            <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                {LINKS.map(l => {
                    const active = !l.external && (pathname === l.href || pathname.startsWith(l.href + '/'));
                    const cls = `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${active
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

            <a
                href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
                target="_blank"
                rel="noopener noreferrer"
                title="We track the moves. TraderDaddy helps you trade them."
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#a78bfa]/30 bg-gradient-to-r from-[#a78bfa]/10 to-[#00d4ff]/10 text-[#c4b5fd] hover:text-white hover:border-[#a78bfa]/60 transition-colors whitespace-nowrap shrink-0"
            >
                🧠 Trade it on TraderDaddy →
            </a>
        </nav>
    );
}
