import { api } from '@/lib/api';
import type { ApiIncomeFundSummary, IncomeArchetype } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { Coins, AlertCircle, EyeOff } from 'lucide-react';
import Link from 'next/link';
import { formatAum } from '@/lib/utils';

// ISR, not force-dynamic: the Vultr box serves every request live and this
// page fans out over the whole income lineup. 10 minutes is well inside the
// daily scrape cadence.
export const revalidate = 600;

const ACCENT = '#fbbf24';

/**
 * Archetype display order. Covered-call funds first because they're the ones a
 * reader's mental model of "income ETF" actually fits; the further down you go,
 * the more the page has to explain why the usual numbers are missing.
 */
const ORDER: IncomeArchetype[] = [
    'covered-call', 'synthetic', 'leap-proxy', 'short-equity', 'swap', 'unknown',
];

function pct(v: number | null | undefined, digits = 1): string {
    return v === null || v === undefined ? '—' : `${v.toFixed(digits)}%`;
}

/** Written at/above spot means the upside is already sold. */
function moneynessTone(v: number | null): string {
    if (v === null) return 'text-slate-500';
    if (v > 0) return 'text-[#ff4444]';
    if (v > -3) return 'text-[#fbbf24]';
    return 'text-[#00ff88]';
}

function Tile({ label, value, sub, tone }: {
    label: string; value: string; sub?: string; tone?: string;
}) {
    return (
        <div className="bg-[#0f172a] border border-[#1f2937] rounded-lg px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-500 font-mono">{label}</div>
            <div className={`text-lg font-black tabular-nums ${tone ?? 'text-white'}`}>{value}</div>
            {sub && <div className="text-[10px] text-slate-500 font-mono mt-0.5">{sub}</div>}
        </div>
    );
}

function FundCard({ f }: { f: ApiIncomeFundSummary }) {
    const t = f.tiles;
    return (
        <Link
            href={`/income/${f.fund}`}
            className="block bg-[#111827] border border-[#1f2937] hover:border-[#fbbf24]/40 rounded-xl p-4 transition-colors"
        >
            <div className="flex items-baseline justify-between gap-3 flex-wrap mb-3">
                <div className="flex items-baseline gap-2">
                    <span className="font-mono text-base font-black text-[#fbbf24]">{f.fund}</span>
                    <span className="text-xs text-slate-400">{f.provider}</span>
                    {f.aum ? <span className="text-[11px] text-slate-500 font-mono">{formatAum(f.aum)}</span> : null}
                </div>
                <span className="text-[11px] text-slate-500 font-mono">
                    {f.counts.underlyings} underlying{f.counts.underlyings === 1 ? '' : 's'} · {f.counts.optionLegs} legs
                </span>
            </div>

            {f.incomeLegVisible ? (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <Tile
                        label="Call coverage"
                        value={pct(t.callCoveragePct)}
                        sub="of equity sleeve"
                    />
                    <Tile
                        label="Wtd moneyness"
                        value={pct(t.weightedMoneynessPct, 2)}
                        sub={t.weightedMoneynessPct === null ? 'no spot data'
                            : t.weightedMoneynessPct > 0 ? 'in the money' : 'out of the money'}
                        tone={moneynessTone(t.weightedMoneynessPct)}
                    />
                    <Tile
                        label="Wtd DTE"
                        value={t.weightedDte === null ? '—' : `${t.weightedDte.toFixed(1)}d`}
                        sub={t.weightedDte === null ? '' : t.weightedDte < 3 ? 'daily cycle'
                            : t.weightedDte < 10 ? 'weekly cycle' : 'monthly+'}
                    />
                    <Tile
                        label="Capped"
                        value={`${t.cappedNames}/${t.namesWithWrittenCalls}`}
                        sub="already past strike"
                        tone={t.cappedNames > 0 ? 'text-[#ff4444]' : 'text-white'}
                    />
                </div>
            ) : (
                <div className="flex items-start gap-2 bg-[#0f172a] border border-[#fbbf24]/20 rounded-lg px-3 py-2">
                    <EyeOff className="h-4 w-4 text-[#fbbf24] shrink-0 mt-0.5" />
                    <p className="text-[11px] text-slate-400 leading-relaxed">
                        Income leg not visible in holdings data — contracts are written and
                        expire in the same session, so no end-of-day file ever contains one.
                        We can show what this fund owns, not what it sold.
                    </p>
                </div>
            )}
        </Link>
    );
}

export default async function IncomePage() {
    const resp = await api.income();
    const funds = resp?.funds ?? [];
    const grouped = new Map<IncomeArchetype, ApiIncomeFundSummary[]>();
    for (const f of funds) {
        if (!grouped.has(f.archetype)) grouped.set(f.archetype, []);
        grouped.get(f.archetype)!.push(f);
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav world="option-income" />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Coins className="h-6 w-6" style={{ color: ACCENT }} />
                    Premium Sellers
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Funds that sell options for income. Their stock book churns by design —
                    it&apos;s collateral for the overlay, not conviction — so none of the
                    conviction scoring on the Stock Pickers side applies here. The option
                    book is the story.
                </p>
                <p className="text-xs text-slate-500 font-mono mt-2">
                    {resp === null
                        ? 'Data unavailable — refresh to try again'
                        : `${resp.asOfDate} · ${resp.fundCount} funds · ${resp.archetypes.length} distinct structures`}
                </p>
            </div>

            {resp === null ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Couldn&apos;t reach the API just now.</p>
                </div>
            ) : (
                <>
                    <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-4">
                        <h2 className="text-sm font-bold text-white mb-1">
                            &ldquo;Income ETF&rdquo; is not one thing
                        </h2>
                        <p className="text-xs text-slate-400 leading-relaxed max-w-3xl">
                            These funds get lumped together because they all pay a big distribution,
                            but structurally they have almost nothing in common. One owns 27 stocks
                            and writes calls on them. Another owns no shares at all — just Treasuries
                            and an options structure. A third writes contracts that expire before the
                            day ends, so they never show up in a holdings file. Grouped by what they
                            actually are:
                        </p>
                    </div>

                    {ORDER.filter(k => grouped.has(k)).map(key => {
                        const meta = resp.archetypes.find(a => a.key === key);
                        const list = grouped.get(key)!;
                        return (
                            <section key={key} className="space-y-3">
                                <div className="flex items-baseline gap-3 flex-wrap border-l-2 pl-3"
                                    style={{ borderColor: ACCENT }}>
                                    <h2 className="text-base font-black text-white">{meta?.label ?? key}</h2>
                                    <span className="text-[11px] font-mono text-slate-500">
                                        {list.length} fund{list.length === 1 ? '' : 's'}
                                    </span>
                                    <p className="text-xs text-slate-400 basis-full max-w-3xl leading-relaxed">
                                        {meta?.summary}
                                    </p>
                                </div>
                                <div className="grid gap-3 lg:grid-cols-2">
                                    {list.map(f => <FundCard key={f.fund} f={f} />)}
                                </div>
                            </section>
                        );
                    })}
                </>
            )}
        </div>
    );
}
