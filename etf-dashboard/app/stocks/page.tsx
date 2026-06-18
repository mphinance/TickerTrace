import { api } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { FUND_PROVIDERS } from '@/lib/providers';
import { ArrowUpRight, ArrowDownRight, LineChart, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Sort = 'funds' | 'weight' | 'change';
const SORTS: { key: Sort; label: string }[] = [
    { key: 'funds', label: 'Most widely held' },
    { key: 'weight', label: 'Most weight' },
    { key: 'change', label: 'Biggest Δ today' },
];

const SORT_DESC: Record<Sort, string> = {
    funds: 'how many funds hold them',
    weight: 'total weight across funds',
    change: 'biggest institutional weight move today',
};

export default async function StocksPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string }>;
}) {
    const sp = await searchParams;
    const sort: Sort =
        sp.sort === 'weight' ? 'weight' : sp.sort === 'change' ? 'change' : 'funds';

    // 'change' isn't a sort the API knows — fetch all 150 by fund count and
    // sort server-side by |netChange|. 150 tickers covers everything
    // institutionally significant, so nothing noteworthy gets missed.
    const apiSort: 'funds' | 'weight' = sort === 'change' ? 'funds' : sort;
    const resp = await api.tickers(apiSort, 150);
    let tickers = resp?.tickers ?? [];

    if (sort === 'change') {
        tickers = [...tickers].sort((a, b) => Math.abs(b.netChange) - Math.abs(a.netChange));
    }

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <LineChart className="h-6 w-6 text-[#00d4ff]" />
                    Most-held stocks
                </h1>
                <p className="text-sm text-slate-400 font-mono mt-1">
                    {resp === null
                        ? 'Data unavailable — refresh to try again'
                        : `${tickers.length} tickers ranked by ${SORT_DESC[sort]}`}
                </p>
            </div>

            <div className="flex gap-1.5">
                {SORTS.map(s => (
                    <Link
                        key={s.key}
                        href={s.key === 'funds' ? '/stocks' : `/stocks?sort=${s.key}`}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${sort === s.key
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{s.label}</Link>
                ))}
            </div>

            {resp === null ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Couldn&apos;t reach the API right now.</p>
                    <p className="text-slate-600 text-sm mt-1">Try refreshing — the data usually comes right back.</p>
                </div>
            ) : (
            <div className="rounded-lg border border-[#1f2937] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase tracking-wider">
                            <tr className="border-b border-[#1f2937]">
                                <th className="text-right font-semibold px-3 py-3 w-12">#</th>
                                <th className="text-left font-semibold px-4 py-3">Ticker</th>
                                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Name</th>
                                <th className="text-right font-semibold px-4 py-3">Funds</th>
                                <th className="text-right font-semibold px-4 py-3">Total wt</th>
                                <th className="text-right font-semibold px-4 py-3">Δ today</th>
                                <th className="text-left font-semibold px-4 py-3 hidden lg:table-cell">Held by</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tickers.map((t, i) => (
                                <tr key={t.ticker} className="border-b border-[#1f2937] hover:bg-[#1a2333]/50">
                                    <td className="px-3 py-2.5 text-right font-mono text-slate-600">{i + 1}</td>
                                    <td className="px-4 py-2.5">
                                        <Link href={`/stocks/${t.ticker}`} className="font-mono font-bold text-[#00d4ff] hover:underline">
                                            {t.ticker}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400 text-xs hidden md:table-cell max-w-[220px] truncate">
                                        {t.name}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-white font-semibold">{t.fundCount}</td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">{t.totalWeight.toFixed(2)}%</td>
                                    <td className={`px-4 py-2.5 text-right font-mono font-semibold ${t.netChange > 0 ? 'text-[#00ff88]' : t.netChange < 0 ? 'text-[#ff4444]' : 'text-slate-500'}`}>
                                        <span className="inline-flex items-center justify-end gap-0.5">
                                            {t.netChange > 0 ? <ArrowUpRight className="h-3 w-3" /> : t.netChange < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                            {t.netChange === 0 ? '—' : `${t.netChange > 0 ? '+' : ''}${t.netChange.toFixed(3)}%`}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 hidden lg:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {t.funds.slice(0, 6).map(f => (
                                                <Link
                                                    key={f}
                                                    href={`/fund/${f}`}
                                                    title={FUND_PROVIDERS[f] ?? f}
                                                    className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-[#334155] bg-[#1e293b] text-slate-400 hover:text-white"
                                                >{f}</Link>
                                            ))}
                                            {t.funds.length > 6 && (
                                                <span className="text-[10px] text-slate-600 px-1 py-0.5">+{t.funds.length - 6}</span>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
}
