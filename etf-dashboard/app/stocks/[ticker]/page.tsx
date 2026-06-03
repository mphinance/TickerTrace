import { api } from '@/lib/api';
import type { TrendSignal } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { WeightSparkline } from '@/components/weight-sparkline';
import { FUND_PROVIDERS } from '@/lib/providers';
import { ArrowLeft, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

const SIGNAL_META: Record<TrendSignal, { label: string; cls: string }> = {
    'accumulating': { label: 'Accumulating', cls: 'text-[#00ff88] border-[#00ff88]/30 bg-[#00ff88]/10' },
    'distribution-starting': { label: 'Selling starting', cls: 'text-[#f59e0b] border-[#f59e0b]/30 bg-[#f59e0b]/10' },
    'distributing': { label: 'Distributing', cls: 'text-[#ff4444] border-[#ff4444]/30 bg-[#ff4444]/10' },
    'bottoming': { label: 'Bottoming?', cls: 'text-[#00d4ff] border-[#00d4ff]/30 bg-[#00d4ff]/10' },
};

function Delta({ label, value }: { label: string; value: number }) {
    const c = value > 0 ? 'text-[#00ff88]' : value < 0 ? 'text-[#ff4444]' : 'text-slate-500';
    return (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-2 text-center">
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

    // Per-fund daily change for the holders table.
    const changeByFund = new Map<string, number>();
    for (const c of detail.changes) {
        if (!c.isOption) changeByFund.set(c.fund, c.weightDelta);
    }
    const equityHolders = detail.holdings
        .filter(h => !h.isOption)
        .sort((a, b) => b.weight - a.weight);
    const optionHolders = detail.holdings.filter(h => h.isOption);

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <Link href="/stocks" className="text-xs text-slate-500 hover:text-white transition-colors flex items-center gap-1 mb-2">
                    <ArrowLeft className="h-3 w-3" /> All stocks
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="text-3xl font-black tracking-tight font-mono text-[#00d4ff]">{detail.ticker}</h1>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${sig.cls}`}>{sig.label}</span>
                </div>
                <p className="text-sm text-slate-400 mt-1">{detail.name}{detail.sector ? ` · ${detail.sector}` : ''}</p>
                <p className="text-xs text-slate-500 font-mono mt-1">
                    Held by {detail.fundCount} equity fund{detail.fundCount === 1 ? '' : 's'} ·
                    institutional blended weight {inst.blendedWeight.toFixed(3)}%
                </p>
            </div>

            {/* Trend: chart + D/W/M deltas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2 bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg p-4">
                    <h2 className="text-sm font-black tracking-tight mb-1">
                        Institutional <span className="text-[#00d4ff]">blended weight</span> over time
                    </h2>
                    <p className="text-[11px] text-slate-500 mb-3">
                        AUM-weighted weight of {detail.ticker} across all stock-picking funds, last {detail.history.length} trading sessions.
                    </p>
                    <WeightSparkline points={detail.history} up={inst.monthly >= 0} />
                </div>
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg p-4">
                    <h2 className="text-sm font-black tracking-tight mb-3">Net flow</h2>
                    <div className="grid grid-cols-3 gap-2">
                        <Delta label="Day" value={inst.daily} />
                        <Delta label="Week" value={inst.weekly} />
                        <Delta label="Month" value={inst.monthly} />
                    </div>
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
            <div className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-[#1f2937]">
                    <h2 className="text-sm font-black tracking-tight">Who holds it</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase tracking-wider">
                            <tr className="border-b border-[#1f2937]">
                                <th className="text-left font-semibold px-4 py-2.5">Fund</th>
                                <th className="text-left font-semibold px-4 py-2.5 hidden sm:table-cell">Provider</th>
                                <th className="text-right font-semibold px-4 py-2.5">Weight</th>
                                <th className="text-right font-semibold px-4 py-2.5">Δ today</th>
                            </tr>
                        </thead>
                        <tbody>
                            {equityHolders.map(h => {
                                const d = changeByFund.get(h.fund) ?? 0;
                                return (
                                    <tr key={h.fund} className="border-b border-[#1f2937] hover:bg-[#1a2333]/50">
                                        <td className="px-4 py-2.5">
                                            <Link href={`/fund/${h.fund}`} className="font-mono font-bold text-[#00d4ff] hover:underline">{h.fund}</Link>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-400 hidden sm:table-cell">{h.provider}</td>
                                        <td className="px-4 py-2.5 text-right font-mono text-slate-300">{h.weight.toFixed(3)}%</td>
                                        <td className={`px-4 py-2.5 text-right font-mono ${d > 0 ? 'text-[#00ff88]' : d < 0 ? 'text-[#ff4444]' : 'text-slate-600'}`}>
                                            {d !== 0 ? `${d > 0 ? '+' : ''}${d.toFixed(3)}` : '—'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
                {optionHolders.length > 0 && (
                    <p className="px-4 py-2 text-[11px] text-slate-500 border-t border-[#1f2937]">
                        Plus {optionHolders.length} option position{optionHolders.length === 1 ? '' : 's'} on {detail.ticker} (income funds) — excluded from the institutional blend.
                    </p>
                )}
            </div>
        </div>
    );
}
