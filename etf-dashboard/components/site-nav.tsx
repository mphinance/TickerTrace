'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { WORLD_META, type FundCategory } from '@/lib/providers';

/**
 * Shared app navigation — one familiar top bar across every data page.
 * The marketing landing page (app/page.tsx) keeps its own commercial nav and
 * is NOT affected by this component.
 *
 * The bar is world-aware. TickerTrace covers two kinds of fund that have
 * almost nothing in common — managers who pick stocks, and managers who sell
 * options against a book they hold as collateral — and mixing their numbers
 * produces nonsense (an option-income fund rolling covered-call collateral is
 * not "institutions buying CAT"). So each world gets its own row of links and
 * its own accent.
 *
 * `world` is an explicit prop rather than purely path-derived because
 * /fund/[ticker] only learns its category after the API fetch. Pages that
 * belong to neither world (Stocks, Holdings, Funds) pass nothing and render
 * the shared row only — the ABSENCE of a tinted row is itself the signal that
 * you're looking at something that spans both.
 */

type World = FundCategory;

const SHARED: { href: string; label: string; external?: boolean }[] = [
    { href: '/funds', label: 'Funds' },
    { href: '/stocks', label: 'Stocks' },
    { href: '/holdings', label: 'Holdings' },
    { href: '/options-listings', label: 'CBOE Scanner' },
    { href: 'https://api.tickertrace.pro/docs', label: '📡 API', external: true },
];

// Routes that exist today. /changes and /layering stay at their current URLs
// until the redirect phase moves them under a world — adding the link before
// the route would 404, and in App Router a redirects() entry is silently
// ignored while a real route file still matches.
const WORLD_LINKS: Record<World, { href: string; label: string }[]> = {
    'active-equity': [
        { href: '/equity', label: 'Overview' },
        { href: '/changes', label: 'Δ Changes' },
        { href: '/layering', label: '🪜 Layering' },
    ],
    'option-income': [
        { href: '/income', label: 'Overview' },
        { href: '/effectiveness', label: 'Fund Scores' },
    ],
};

const WORLDS: World[] = ['active-equity', 'option-income'];

function inferWorld(pathname: string): World | null {
    if (pathname.startsWith('/equity')) return 'active-equity';
    if (pathname.startsWith('/income')) return 'option-income';
    return null;
}

/**
 * The shared links, rendered twice: inline on md+, and in their own
 * horizontally-scrolling strip below the identity row on mobile.
 *
 * They used to be a single `flex-1 min-w-0 flex-wrap` container. With the logo,
 * the world switcher and the TraderDaddy CTA all `shrink-0`, that container
 * collapsed to a sliver on a phone and every link wrapped onto its own line,
 * stacked against the right edge with the last one clipped. Wrapping is the
 * wrong behaviour here — a nav rail should scroll, not grow taller.
 */
function SharedLinks({ pathname, className }: { pathname: string; className: string }) {
    return (
        <div className={className}>
            {SHARED.map(l => {
                const isActive = !l.external
                    && (pathname === l.href || pathname.startsWith(l.href + '/'));
                const cls = `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors whitespace-nowrap shrink-0 ${isActive
                    ? 'bg-[#00d4ff]/15 border-[#00d4ff]/40 text-[#00d4ff]'
                    : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`;
                return l.external ? (
                    <a key={l.href} href={l.href} target="_blank" rel="noopener noreferrer" className={cls}>
                        {l.label}
                    </a>
                ) : (
                    <Link key={l.href} href={l.href} className={cls}>{l.label}</Link>
                );
            })}
        </div>
    );
}

export function SiteNav({ world }: { world?: World } = {}) {
    const pathname = usePathname();
    const active: World | null = world ?? inferWorld(pathname);
    const accent = active ? WORLD_META[active].accent : '#00d4ff';

    return (
        <nav className="sticky top-0 z-50 bg-[#111827]/95 backdrop-blur-md border border-[#1f2937] rounded-xl shadow-lg overflow-hidden">
            {/* Row 1 — identity, world switcher, shared links (md+).
                overflow-x-auto because the nav wrapper is overflow-hidden: without
                it the TraderDaddy CTA is clipped rather than reachable on a phone. */}
            <div className="px-4 py-2.5 flex items-center gap-3 overflow-x-auto">
                <Link
                    href="/dashboard"
                    className="text-lg font-black tracking-tight text-[#00d4ff] hover:opacity-80 transition-opacity shrink-0"
                >
                    TICKER<span className="text-foreground">TRACE</span>
                </Link>

                {/* World switcher — the two halves of the product */}
                <div className="flex items-center gap-1 shrink-0 rounded-lg bg-[#0f172a] border border-[#334155] p-0.5">
                    {WORLDS.map(w => {
                        const meta = WORLD_META[w];
                        const on = active === w;
                        return (
                            <Link
                                key={w}
                                href={meta.basePath}
                                title={meta.blurb}
                                className="text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors whitespace-nowrap"
                                style={on
                                    ? { backgroundColor: `${meta.accent}26`, color: meta.accent }
                                    : { color: '#94a3b8' }}
                            >
                                <span aria-hidden>{meta.icon}</span>{' '}
                                <span className="hidden sm:inline">{meta.label}</span>
                                <span className="sm:hidden">{meta.short}</span>
                            </Link>
                        );
                    })}
                </div>

                <SharedLinks
                    pathname={pathname}
                    className="hidden md:flex items-center gap-1 flex-wrap flex-1 min-w-0"
                />

                <a
                    href="https://www.traderdaddy.pro/?ref=8DUEMWAJ"
                    target="_blank"
                    rel="noopener noreferrer"
                    title="We track the moves. TraderDaddy helps you trade them."
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg border border-[#a78bfa]/30 bg-gradient-to-r from-[#a78bfa]/10 to-[#00d4ff]/10 text-[#c4b5fd] hover:text-white hover:border-[#a78bfa]/60 transition-colors whitespace-nowrap shrink-0 ml-auto"
                >
                    <span aria-hidden>🧠</span>
                    <span className="hidden lg:inline">Trade it on TraderDaddy →</span>
                    <span className="lg:hidden">TraderDaddy →</span>
                </a>
            </div>

            {/* Mobile: the shared links get their own scrolling rail rather than
                wrapping into a column against the right edge. */}
            <SharedLinks
                pathname={pathname}
                className="md:hidden px-4 pb-2 flex items-center gap-1 overflow-x-auto"
            />

            {/* Row 2 — only when inside a world. Its absence means "shared view". */}
            {active && (
                <div
                    className="px-4 py-1.5 flex items-center gap-1 overflow-x-auto border-t"
                    style={{ backgroundColor: `${accent}0d`, borderColor: `${accent}33` }}
                >
                    <span className="text-[10px] font-mono uppercase tracking-wider mr-1 shrink-0"
                        style={{ color: accent }}>
                        {WORLD_META[active].label}
                    </span>
                    {WORLD_LINKS[active].map(l => {
                        const isActive = pathname === l.href;
                        return (
                            <Link
                                key={l.href}
                                href={l.href}
                                className="text-xs font-medium px-2.5 py-1 rounded-md transition-colors whitespace-nowrap shrink-0"
                                style={isActive
                                    ? { backgroundColor: `${accent}26`, color: accent }
                                    : { color: '#94a3b8' }}
                            >
                                {l.label}
                            </Link>
                        );
                    })}
                </div>
            )}
        </nav>
    );
}
