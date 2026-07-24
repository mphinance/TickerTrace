import { api } from '@/lib/api';
import type { ApiFundSummary, FundCategory } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { Building2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { formatAum } from '@/lib/utils';

export const dynamic = 'force-dynamic';

type Sort = 'aum' | 'holdings' | 'name';
const SORTS: { key: Sort; label: string }[] = [
    { key: 'aum', label: 'Largest AUM' },
    { key: 'holdings', label: 'Most holdings' },
    { key: 'name', label: 'A–Z' },
];

const CATEGORIES: { key: FundCategory | 'all'; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'active-equity', label: 'Active Equity' },
    { key: 'option-income', label: 'Option Income' },
];

function sortFunds(funds: ApiFundSummary[], sort: Sort): ApiFundSummary[] {
    const f = [...funds];
    if (sort === 'holdings') return f.sort((a, b) => (b.holdingsCount ?? 0) - (a.holdingsCount ?? 0));
    if (sort === 'name') return f.sort((a, b) => a.fund.localeCompare(b.fund));
    return f.sort((a, b) => (b.aum ?? 0) - (a.aum ?? 0));
}

/** Build a /funds URL preserving whichever params are active. */
function fundsUrl(params: { sort?: Sort; category?: FundCategory | 'all' }): string {
    const sp = new URLSearchParams();
    if (params.sort && params.sort !== 'aum') sp.set('sort', params.sort);
    if (params.category && params.category !== 'all') sp.set('category', params.category);
    const qs = sp.toString();
    return `/funds${qs ? `?${qs}` : ''}`;
}

export default async function FundsPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string; category?: string }>;
}) {
    const sp = await searchParams;
    const sort: Sort = sp.sort === 'holdings' || sp.sort === 'name' ? sp.sort : 'aum';
    const category: FundCategory | 'all' =
        sp.category === 'active-equity' || sp.category === 'option-income'
            ? sp.category
            : 'all';

    // revalidate: 0 (uncached) on purpose. /api/v1/funds was cached site-wide
    // by the dashboard before it grew holdingsCount/topHolding, so Vercel's
    // persistent Data Cache would otherwise serve the stale thin shape here
    // (rendering "—" in the Holdings/Top-holding columns). The endpoint is
    // cheap and this index page should reflect current holdings anyway.
    const resp = await api.funds({ revalidate: 0 });
    const allFunds = resp?.funds ?? [];
    const filtered = category === 'all'
        ? allFunds
        : allFunds.filter(f => f.category === category);
    const funds = sortFunds(filtered, sort);

    const totalAum = funds.reduce((s, f) => s + (f.aum ?? 0), 0);
    const providers = new Set(funds.map(f => f.provider)).size;
    const categoryLabel = category === 'active-equity' ? 'active equity ' : category === 'option-income' ? 'option income ' : '';

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-[#00d4ff]" />
                    Funds we track
                </h1>
                <p className="text-sm text-slate-400 font-mono mt-1">
                    {resp === null
                        ? 'Data unavailable — refresh to try again'
                        : `${resp.asOfDate ? `${resp.asOfDate} · ` : ''}${funds.length} ${categoryLabel}funds · ${providers} providers · $${totalAum.toFixed(1)}B combined AUM`}
                </p>
            </div>

            {/* Sort pills */}
            <div className="flex gap-1.5 flex-wrap">
                {SORTS.map(s => (
                    <Link
                        key={s.key}
                        href={fundsUrl({ sort: s.key, category: category !== 'all' ? category : undefined })}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${sort === s.key
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{s.label}</Link>
                ))}
            </div>

            {/* Category filter pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-500 font-mono shrink-0">type:</span>
                {CATEGORIES.map(c => (
                    <Link
                        key={c.key}
                        href={fundsUrl({ sort: sort !== 'aum' ? sort : undefined, category: c.key })}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${category === c.key
                            ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#c4b5fd]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{c.label}</Link>
                ))}
            </div>

            {resp === null ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">Couldn&apos;t reach the API right now.</p>
                    <p className="text-slate-600 text-sm mt-1">Try refreshing — the data usually comes right back.</p>
                </div>
            ) : funds.length === 0 ? (
                <div className="bg-[#111827] border border-[#1f2937] rounded-xl p-10 text-center">
                    <AlertCircle className="h-8 w-8 text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400">No {categoryLabel}funds in today&apos;s data.</p>
                    <p className="text-slate-600 text-sm mt-1">
                        Try <Link href={fundsUrl({ sort: sort !== 'aum' ? sort : undefined })} className="text-[#a78bfa] hover:underline">All types</Link> to see everything.
                    </p>
                </div>
            ) : (
            <div className="rounded-lg border border-[#1f2937] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase tracking-wider">
                            <tr className="border-b border-[#1f2937]">
                                <th className="text-left font-semibold px-4 py-3">Fund</th>
                                <th className="text-left font-semibold px-4 py-3">Provider</th>
                                <th className="text-left font-semibold px-4 py-3 hidden sm:table-cell">Type</th>
                                <th className="text-right font-semibold px-4 py-3">AUM</th>
                                <th className="text-right font-semibold px-4 py-3">Holdings</th>
                                <th className="text-left font-semibold px-4 py-3 hidden md:table-cell">Top holding</th>
                            </tr>
                        </thead>
                        <tbody>
                            {funds.map(f => (
                                <tr key={f.fund} className="border-b border-[#1f2937] hover:bg-[#1a2333]/50">
                                    <td className="px-4 py-2.5">
                                        <Link href={`/fund/${f.fund}`} className="font-mono font-bold text-[#00d4ff] hover:underline">
                                            {f.fund}
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-300">{f.provider}</td>
                                    <td className="px-4 py-2.5 hidden sm:table-cell">
                                        {category === 'all' && (
                                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${f.category === 'option-income'
                                                ? 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#c4b5fd]'
                                                : 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'}`}>
                                                {f.category === 'option-income' ? 'option income' : 'active equity'}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                                        {f.aum != null ? formatAum(f.aum) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                                        {f.holdingsCount ?? '—'}
                                        {f.optionsCount ? <span className="text-slate-600"> +{f.optionsCount}⚡</span> : null}
                                    </td>
                                    <td className="px-4 py-2.5 hidden md:table-cell">
                                        {f.topHolding ? (
                                            <Link href={`/stocks/${f.topHolding.ticker}`} className="font-mono text-xs text-slate-400 hover:text-[#00d4ff] transition-colors">
                                                {f.topHolding.ticker} <span className="text-slate-600">({f.topHolding.weight.toFixed(1)}%)</span>
                                            </Link>
                                        ) : <span className="text-slate-600">—</span>}
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
