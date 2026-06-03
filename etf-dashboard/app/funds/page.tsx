import { api } from '@/lib/api';
import type { ApiFundSummary } from '@/lib/api';
import { SiteNav } from '@/components/site-nav';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

type Sort = 'aum' | 'holdings' | 'name';
const SORTS: { key: Sort; label: string }[] = [
    { key: 'aum', label: 'Largest AUM' },
    { key: 'holdings', label: 'Most holdings' },
    { key: 'name', label: 'A–Z' },
];

function sortFunds(funds: ApiFundSummary[], sort: Sort): ApiFundSummary[] {
    const f = [...funds];
    if (sort === 'holdings') return f.sort((a, b) => (b.holdingsCount ?? 0) - (a.holdingsCount ?? 0));
    if (sort === 'name') return f.sort((a, b) => a.fund.localeCompare(b.fund));
    return f.sort((a, b) => (b.aum ?? 0) - (a.aum ?? 0)); // aum
}

export default async function FundsPage({
    searchParams,
}: {
    searchParams: Promise<{ sort?: string }>;
}) {
    const sp = await searchParams;
    const sort: Sort = sp.sort === 'holdings' || sp.sort === 'name' ? sp.sort : 'aum';

    // revalidate: 0 (uncached) on purpose. /api/v1/funds was cached site-wide
    // by the dashboard before it grew holdingsCount/topHolding, so Vercel's
    // persistent Data Cache would otherwise serve the stale thin shape here
    // (rendering "—" in the Holdings/Top-holding columns). The endpoint is
    // cheap and this index page should reflect current holdings anyway.
    const resp = await api.funds({ revalidate: 0 });
    const funds = sortFunds(resp?.funds ?? [], sort);
    const totalAum = funds.reduce((s, f) => s + (f.aum ?? 0), 0);
    const providers = new Set(funds.map(f => f.provider)).size;

    return (
        <div className="min-h-screen bg-[#0a0f1e] text-foreground p-6 space-y-6 font-sans">
            <SiteNav />

            <div className="bg-[#111827] border border-[#1f2937] p-4 rounded-xl shadow-lg">
                <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                    <Building2 className="h-6 w-6 text-[#00d4ff]" />
                    Funds we track
                </h1>
                <p className="text-sm text-slate-400 font-mono mt-1">
                    {funds.length} funds · {providers} providers · ${totalAum.toFixed(1)}B combined AUM
                </p>
            </div>

            <div className="flex gap-1.5">
                {SORTS.map(s => (
                    <Link
                        key={s.key}
                        href={s.key === 'aum' ? '/funds' : `/funds?sort=${s.key}`}
                        scroll={false}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${sort === s.key
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'}`}
                    >{s.label}</Link>
                ))}
            </div>

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
                                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${f.category === 'option-income'
                                            ? 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#c4b5fd]'
                                            : 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'}`}>
                                            {f.category === 'option-income' ? 'option income' : 'active equity'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                                        {f.aum != null ? `$${f.aum}B` : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right font-mono text-slate-300">
                                        {f.holdingsCount ?? '—'}
                                        {f.optionsCount ? <span className="text-slate-600"> +{f.optionsCount}⚡</span> : null}
                                    </td>
                                    <td className="px-4 py-2.5 hidden md:table-cell">
                                        {f.topHolding ? (
                                            <span className="font-mono text-xs text-slate-400">
                                                {f.topHolding.ticker} <span className="text-slate-600">({f.topHolding.weight.toFixed(1)}%)</span>
                                            </span>
                                        ) : <span className="text-slate-600">—</span>}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
