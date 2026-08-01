'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const EQUITY_LINKS: { href: string; label: string }[] = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/funds', label: 'Funds' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/layering', label: '🪜 Layering' },
    { href: '/changes', label: 'Δ Changes' },
    { href: '/holdings', label: 'Holdings' },
];

const INCOME_LINKS: { href: string; label: string }[] = [
    { href: '/effectiveness', label: 'Fund Scores' },
    { href: '/options-listings', label: 'CBOE Scanner' },
];

export function SiteNav() {
    const pathname = usePathname();

    const equityCls = (href: string) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${active
            ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`;
    };

    const incomeCls = (href: string) => {
        const active = pathname === href || pathname.startsWith(href + '/');
        return `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap ${active
            ? 'bg-[#f59e0b]/15 border-[#f59e0b]/40 text-[#f59e0b]'
            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`;
    };

    return (
        <nav className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-xl shadow-lg px-4 py-2.5 flex items-center gap-4 flex-wrap">
            <Link
                href="/dashboard"
                className="text-lg font-black tracking-tight text-[#00d4ff] hover:opacity-80 transition-opacity shrink-0"
            >
                TICKER<span className="text-foreground">TRACE</span>
            </Link>

            <div className="flex items-center gap-1 flex-wrap flex-1 min-w-0">
                {/* Equity section */}
                <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest pr-0.5 select-none hidden sm:inline">📈</span>
                {EQUITY_LINKS.map(l => (
                    <Link key={l.href} href={l.href} className={equityCls(l.href)}>
                        {l.label}
                    </Link>
                ))}

                {/* Divider */}
                <span className="text-[#334155] mx-1.5 select-none text-base leading-none">│</span>

                {/* Income section */}
                <span className="text-[10px] text-[#f59e0b] font-semibold uppercase tracking-widest pr-0.5 select-none hidden sm:inline">💰</span>
                {INCOME_LINKS.map(l => (
                    <Link key={l.href} href={l.href} className={incomeCls(l.href)}>
                        {l.label}
                    </Link>
                ))}

                {/* External */}
                <span className="text-[#334155] mx-1.5 select-none text-base leading-none">│</span>
                <a
                    href="https://api.tickertrace.pro/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white"
                >
                    📡 API
                </a>
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
