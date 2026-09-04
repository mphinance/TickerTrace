import { api } from '@/lib/api';
import type { TrendSignal } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { WeightSparkline } from '@/components/weight-sparkline';
import { FUND_PROVIDERS, FUND_AUM } from '@/lib/providers';
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Flame } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const SIGNAL_META: Record<TrendSignal, { label: string; cls: string }> = {
    'accumulating': { label: 'Accumulating', cls: 'text-buy border-buy/30 bg-buy/10' },
    'distribution-starting': { label: 'Selling starting', cls: 'text-warning border-warning/30 bg-warning/10' },
    'distributing': { label: 'Distributing', cls: 'text-sell border-sell/30 bg-sell/10' },
    'bottoming': { label: 'Bottoming?', cls: 'text-equity border-equity/30 bg-equity/10' },
};

function formatAsOfDate(asOf: string): string {
    const d = new Date(`${asOf}T00:00:00Z`);
    if (isNaN(d.getTime())) return asOf || '—';
    return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC',
    });
}

function formatExpiry(expiry: string): string {
    const d = new Date(`${expiry}T00:00:00Z`);
    if (isNaN(d.getTime())) return expiry || '—';
    return d.toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', timeZone: 'UTC',
    });
}

function formatExposure(m: number): string {
    if (m >= 1000) return `$${(m / 1000).toFixed(1)}B`;
    return `$${Math.round(m)}M`;
}

/** Estimate dollar exposure for one fund holding: AUM × weight%. Returns null when AUM is unknown or too small to matter. */
function fundExposure(aumB: number | null | undefined, weight: number): string | null {
    if (!aumB) return null;
    const m = weight / 100 * aumB * 1000;
    if (m < 0.5) return null;
    if (m >= 1000) return `~$${(m / 1000).toFixed(1)}B`;
    if (m >= 10) return `~$${Math.round(m)}M`;
    return `~$${m.toFixed(1)}M`;
}

function Delta({ label, value }: { label: string; value: number }) {
    const c = value > 0 ? 'text-buy' : value < 0 ? 'text-sell' : 'text-slate-500';
    return (
        <div className="bg-surface-alt border border-surface-elevated rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
            <p className={`font-mono font-semibold text-sm flex items-center justify-center gap-0.5 ${c}`}>
                {value > 0 ? <ArrowUpRight className="h-3 w-3" /> : value < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                {value > 0 ? '+' : ''}{value.toFixed(3)}%
            </p>
        </div>
    );
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
    const { ticker: raw } = await params;
    const ticker = decodeURIComponent(raw).toUpperCase();
    const detail = await api.stock(ticker);
    if (!detail) notFound();

    const inst = detail.institutional;
    const sig = SIGNAL_META[inst.signal];

    // Per-fund daily change + change type for the holders table.
    const changeByFund = new Map<string, number>();
    const changeTypeByFund = new Map<string, string>();
    for (const c of detail.changes) {
        if (!c.isOption) {
            changeByFund.set(c.fund, c.activeWeightDelta ?? c.weightDelta);
            changeTypeByFund.set(c.fund, c.type);
        }
    }
    const equityHolders = detail.holdings
        .filter(h => !h.isOption)
        .sort((a, b) => b.weight - a.weight);
    const optionHolders = detail.holdings.filter(h => h.isOption)
        .sort((a, b) => b.weight - a.weight);
    const distinctFamilies = new Set(equityHolders.map(h => h.provider)).size;

    // Derive the snapshot date from the last history point — history is sorted
    // oldest → newest, so the last entry is today's snapshot.
    const asOfDate = detail.history.length > 0
        ? detail.history[detail.history.length - 1].date
        : null;

    return (
        <div className="min-h-screen bg-canvas text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-surface border border-rule p-4 rounded-xl shadow-lg">
                <Link href="/stocks" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                    <ArrowLeft className="h-3 w-3" /> All stocks
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight font-mono text-equity">{detail.ticker}</h1>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${sig.cls}`}>{sig.label}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">
                    {detail.name}
                    {detail.sector && (
                        <>
                            {' · '}
                            <Link
                                href={`/stocks?sector=${encodeURIComponent(detail.sector)}`}
                                className="hover:text-meta-bright hover:underline transition-colors"
                            >
                                {detail.sector}
                            </Link>
                        </>
                    )}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                    {asOfDate && <>{formatAsOfDate(asOfDate)} · </>}
                    Held by {detail.fundCount} equity fund{detail.fundCount === 1 ? '' : 's'}
                    {detail.fundCount > 1 && <> across {distinctFamilies} {distinctFamilies === 1 ? 'family' : 'families'}</>}
                    {' · '}institutional blended weight {inst.blendedWeight.toFixed(3)}%
                    {(inst.estimatedExposureM ?? 0) > 0 && (
                        <> · ~{formatExposure(inst.estimatedExposureM!)} est. exposure</>
                    )}
                </p>
            </div>

            {/* Trend: chart + D/W/M deltas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-surface border border-rule rounded-xl shadow-lg p-4">
                    <h2 className="text-sm font-black tracking-tight mb-1">
                        Institutional <span className="text-equity">blended weight</span> over time
                    </h2>
                    <p className="text-[11px] text-slate-500 mb-3">
                        AUM-weighted weight of {detail.ticker} across all stock-picking funds, last {detail.history.length} trading sessions.
                    </p>
                    <WeightSparkline points={detail.history} up={inst.monthly >= 0} />
                </div>
                <div className="bg-surface border border-rule rounded-xl shadow-lg p-4">
                    <h2 className="text-sm font-black tracking-tight mb-3">Net flow</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Delta label="Day" value={inst.daily} />
                        <Delta label="Week" value={inst.weekly} />
                        <Delta label="Month" value={inst.monthly} />
                    </div>
                    {inst.streak != null && (
                        <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${
                            inst.streak > 0
                                ? 'bg-warning/10 border-warning/30'
                                : 'bg-sell/10 border-sell/30'
                        }`}>
                            <Flame className={`h-3.5 w-3.5 shrink-0 ${inst.streak > 0 ? 'text-warning' : 'text-sell'}`} />
                            <span className={`text-xs font-semibold ${inst.streak > 0 ? 'text-warning' : 'text-sell'}`}>
                                {Math.abs(inst.streak)}-day {inst.streak > 0 ? 'buying' : 'selling'} streak
                            </span>
                            <span className="text-[10px] text-slate-500 ml-auto">blended weight</span>
                        </div>
                    )}
                    <p className="text-[11px] text-slate-500 mt-3">
                        Change in blended weight over each window. {sig.label === 'Selling starting'
                            ? 'Bought over the month/week but being sold today — distribution may be starting.'
                            : sig.label === 'Bottoming?'
                                ? 'Sold over the month but being bought recently — may be turning.'
                                : sig.label === 'Accumulating'
                                    ? 'Bought across every horizon — sustained accumulation.'
                                    : 'Sold across every horizon — sustained distribution.'}
                    </p>
                </div>
            </div>

            {/* Holders */}
            <div className="bg-surface border border-rule rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-rule">
                    <h2 className="text-sm font-black tracking-tight">Who holds it</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-surface-alt text-slate-400 text-xs uppercase tracking-wider">
                            <tr className="border-b border-rule">
                                <th className="text-left font-semibold px-4 py-2.5">Fund</th>
                                <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">Provider</th>
                                <th className="text-right font-semibold px-4 py-2.5 hidden md:table-cell">Shares</th>
                                <th className="text-right font-semibold px-4 py-2.5">Weight</th>
                                <th className="text-right font-semibold px-4 py-2.5">Δ today</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equityHolders.map(h => {
                                const d = changeByFund.get(h.fund) ?? 0;
                                const ct = changeTypeByFund.get(h.fund);
                                return (
                                    <tr key={h.fund} className="border-b border-rule hover:bg-surface-hover/50">
                                        <td className="px-4 py-2.5">
                                            <Link href={`/fund/${h.fund}`} className="font-mono font-bold text-equity hover:underline">{h.fund}</Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">{h.provider}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-500 hidden md:table-cell">
                                            {h.shares > 0 ? Math.round(h.shares).toLocaleString() : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <div className="font-mono text-slate-300">{h.weight.toFixed(3)}%</div>
                                            {(() => {
                                                const exp = fundExposure(h.aum ?? FUND_AUM[h.fund], h.weight);
                                                return exp ? <div className="text-[10px] text-slate-600 font-mono tabular-nums">{exp}</div> : null;
                                            })()}
                                        </td>
                                        <td className={`px-4 py-2.5 text-right font-mono ${d > 0 ? 'text-buy' : d < 0 ? 'text-sell' : 'text-slate-600'}`}>
                                            <div className="inline-flex items-center justify-end gap-1.5">
                                                {ct === 'NEW' && (
                                                    <span className="text-[9px] font-bold px-1 rounded border border-buy/30 bg-buy/10 text-buy">NEW</span>
                                                )}
                                                {ct === 'REMOVED' && (
                                                    <span className="text-[9px] font-bold px-1 rounded border border-sell/30 bg-sell/10 text-sell">EXIT</span>
                                                )}
                                                {d !== 0 ? `${d > 0 ? '+' : ''}${d.toFixed(3)}%` : '—'}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Option positions — income funds writing options against this ticker */}
            {optionHolders.length > 0 && (
                <div className="bg-surface border border-rule rounded-xl shadow-lg overflow-hidden">
                    <div className="px-4 py-3 border-b border-rule">
                        <h2 className="text-sm font-black tracking-tight">Options written against it</h2>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                            {optionHolders.length} position{optionHolders.length === 1 ? '' : 's'} from income funds — excluded from the institutional blend above. Covered call strikes indicate near-term resistance.
                        </p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-alt text-slate-400 text-xs uppercase tracking-wider">
                                <tr className="border-b border-rule">
                                    <th className="text-left font-semibold px-4 py-2.5">Fund</th>
                                    <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">Provider</th>
                                    <th className="text-left font-semibold px-4 py-2.5">Type</th>
                                    <th className="text-right font-semibold px-4 py-2.5">Strike</th>
                                    <th className="text-right font-semibold px-4 py-2.5">Expiry</th>
                                    <th className="text-right font-semibold px-4 py-2.5 hidden md:table-cell">Wt in fund</th>
                                </tr>
                            </thead>
                            <tbody>
                                {optionHolders.map((h, i) => {
                                    const optType = h.optionDetails?.type?.toLowerCase() ?? '';
                                    const isCall = optType.startsWith('c');
                                    const isPut = optType.startsWith('p');
                                    const strategy = isCall ? 'Covered Call' : isPut ? 'Cash-Secured Put' : (h.optionDetails?.type ?? '—');
                                    const expiry = h.optionDetails?.expiry ?? null;
                                    return (
                                        <tr
                                            key={`${h.fund}-${h.optionDetails?.strike ?? ''}-${h.optionDetails?.expiry ?? ''}-${i}`}
                                            className="border-b border-rule hover:bg-surface-hover/50"
                                        >
                                            <td className="px-4 py-2.5">
                                                <Link href={`/fund/${h.fund}`} className="font-mono font-bold text-equity hover:underline">{h.fund}</Link>
                                            </td>
                                            <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">{h.provider}</td>
                                            <td className="px-4 py-2.5">
                                                <span
                                                    title={strategy}
                                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                                                        isCall
                                                            ? 'border-warning/30 bg-warning/10 text-warning'
                                                            : isPut
                                                                ? 'border-equity/30 bg-equity/10 text-equity'
                                                                : 'border-rule-strong bg-surface-elevated text-slate-400'
                                                    }`}
                                                >
                                                    {isCall ? 'CALL' : isPut ? 'PUT' : (h.optionDetails?.type ?? '?')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                                                {h.optionDetails?.strike != null ? `$${h.optionDetails.strike.toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-400 text-xs">
                                                {expiry ? formatExpiry(expiry) : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-right font-mono text-slate-300 hidden md:table-cell">
                                                {h.weight.toFixed(2)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
