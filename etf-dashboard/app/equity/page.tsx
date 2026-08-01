import { api, API_BASE } from '@/lib/api';
import type { ApiFullPayload, ApiSignal, ApiDivergence } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { InstitutionalSummary } from '@/components/institutional-summary';
import { Crosshair, AlertCircle, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';

// ISR — signals move once a day when the scrape lands.
export const revalidate = 300;

const ACCENT = '#00d4ff';

/**
 * The Stock Pickers overview.
 *
 * Everything here is fetched with category=active-equity, which is the whole
 * point of the page. On the old mixed dashboard the top buys included CAT and
 * NVDA because ULTY was rolling covered-call collateral, and the #1 sell was
 * KO because DIVO trimmed an overlay position — neither is a view on the
 * company. Filtering has to happen server-side before conviction is scored:
 * convictionScore is a cross-fund aggregate, so filtering the output would
 * leave the numbers computed over the mixed universe and therefore wrong.
 */
async function fetchEquity(): Promise<ApiFullPayload | null> {
    try {
        const res = await fetch(`${API_BASE}/api/v1/signals?category=active-equity`, {
            next: { revalidate: 300 },
        });
        if (!res.ok) return null;
        return (await res.json()) as ApiFullPayload;
    } catch {
        return null;
    }
}

function SignalRow({ s, direction }: { s: ApiSignal; direction: 'buy' | 'sell' }) {
    const color = direction === 'buy' ? '#00ff88' : '#ff4444';
    return (
        <div className="flex items-center justify-between gap-3 px-3 py-2 border-t border-[#1f2937] hover:bg-[#0f172a]/60">
            <div className="min-w-0">
                <Link href={`/stocks/${s.ticker}`} className="font-mono text-xs font-bold text-white hover:text-[#00d4ff]">
                    {s.ticker}
                </Link>
                <div className="text-[11px] text-slate-500 truncate max-w-[22ch]">{s.name}</div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
                <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
                    {s.funds?.length ?? 0} fund{(s.funds?.length ?? 0) === 1 ? '' : 's'}
                </span>
                <span className="font-mono text-xs font-bold tabular-nums" style={{ color }}>
                    {s.weightDelta > 0 ? '+' : ''}{s.weightDelta.toFixed(3)}
                </span>
            </div>
        </div>
    );
}

function DivergenceRow({ d }: { d: ApiDivergence }) {
    return (
        <div className="px-3 py-2 border-t border-[#1f2937]">
            <div className="flex items-center gap-2 flex-wrap">
                <Link href={`/stocks/${d.ticker}`} className="font-mono text-xs font-bold text-white hover:text-[#00d4ff]">
                    {d.ticker}
                </Link>
                {d.intrashop && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[#fbbf24]">
                        INTRA-SHOP
                    </span>
                )}
            </div>
            <div className="text-[11px] font-mono mt-1">
                <span className="text-[#00ff88]">{d.buying.join(', ')}</span>
                <span className="text-slate-600"> vs </span>
                <span className="text-[#ff4444]">{d.selling.join(', ')}</span>
            </div>
        </div>
    );
}

function Panel({ title, sub, children }: {
    title: string; sub?: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl overflow-hidden">
            <div className="px-3 py-2.5">
                <h2 className="text-sm font-bold text-white">{title}</h2>
                {sub && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
            </div>
            {children}
        </div>
    );
}

export default async function EquityPage() {
    const [payload, institutional] = await Promise.all([
        fetchEquity(),
        api.institutional('daily', 12, { throwOnError: false }),
    ]);

    const buying = payload?.signals?.buying ?? [];
    const selling = payload?.signals?.selling ?? [];
    const divergences = payload?.divergences ?? [];
    const sectors = payload?.sectorFlow;

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-4 sm:p-6 space-y-4 font-sans">
            <SiteNav world="active-equity" />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Crosshair className="h-6 w-6" style={{ color: ACCENT }} />
                    Stock Pickers
                </h1>
                <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
                    Funds that buy things because someone decided to. ARK, Avantis, Corgi,
                    Sprott and Amplify&apos;s thematic line. Option-income funds are excluded
                    here on purpose — their stock book is collateral for an overlay and churns
                    by design, so counting it as conviction was putting other people&apos;s
                    mechanics on this board.
                </p>
                <p className="text-xs text-slate-500 font-mono mt-2">
                    {payload === null ? 'Data unavailable — refresh to try again'
                        : `${payload.asOfDate} · active-equity funds only`}
                </p>
            </div>

            {payload === null ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-8 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">Couldn&apos;t reach the API just now.</p>
                </div>
            ) : (
                <>
                    {institutional && <InstitutionalSummary flow={institutional} />}

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel title="Accumulating" sub="Conviction-scored buys across stock-picking funds">
                            {buying.length === 0
                                ? <p className="px-3 py-4 text-xs text-slate-500">Nothing above the significance threshold today.</p>
                                : buying.slice(0, 10).map(s => <SignalRow key={s.ticker} s={s} direction="buy" />)}
                        </Panel>

                        <Panel title="Reducing" sub="Conviction-scored sells across stock-picking funds">
                            {selling.length === 0
                                ? <p className="px-3 py-4 text-xs text-slate-500">Nothing above the significance threshold today.</p>
                                : selling.slice(0, 10).map(s => <SignalRow key={s.ticker} s={s} direction="sell" />)}
                        </Panel>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                        <Panel
                            title="Divergences"
                            sub="Same name, opposite directions — stock-pickers only"
                        >
                            {divergences.length === 0 ? (
                                <p className="px-3 py-4 text-xs text-slate-500 leading-relaxed">
                                    No genuine conflicts today. Most &ldquo;divergences&rdquo; on the old
                                    mixed board were an equity manager on one side and an option
                                    overlay on the other, which isn&apos;t a disagreement — one made a
                                    call on the company, the other needed something to write contracts
                                    against.
                                </p>
                            ) : divergences.map(d => <DivergenceRow key={d.ticker} d={d} />)}
                        </Panel>

                        <Panel title="Sector flow" sub="Drift-adjusted weight movement by sector">
                            {!sectors || (sectors.inflows.length === 0 && sectors.outflows.length === 0) ? (
                                <p className="px-3 py-4 text-xs text-slate-500">No sector moves above the noise floor.</p>
                            ) : (
                                <div className="px-3 pb-3 space-y-1">
                                    {sectors.inflows.slice(0, 5).map(s => (
                                        <div key={s.sector} className="flex items-center justify-between text-[11px] font-mono">
                                            <span className="text-slate-300 flex items-center gap-1">
                                                <TrendingUp className="h-3 w-3 text-[#00ff88]" />{s.sector}
                                            </span>
                                            <span className="text-[#00ff88] tabular-nums">+{s.delta.toFixed(3)}</span>
                                        </div>
                                    ))}
                                    {sectors.outflows.slice(0, 5).map(s => (
                                        <div key={s.sector} className="flex items-center justify-between text-[11px] font-mono">
                                            <span className="text-slate-300 flex items-center gap-1">
                                                <TrendingDown className="h-3 w-3 text-[#ff4444]" />{s.sector}
                                            </span>
                                            <span className="text-[#ff4444] tabular-nums">{s.delta.toFixed(3)}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </Panel>
                    </div>
                </>
            )}
        </div>
    );
}
