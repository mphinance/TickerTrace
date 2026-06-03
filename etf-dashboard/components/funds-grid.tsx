import type { ApiFundSummary } from '@/lib/api';
import { Building2 } from 'lucide-react';
import Link from 'next/link';

/**
 * Compact "tracked funds" grid for the dashboard home — funds grouped by
 * provider, biggest first, each chip linking to its fund profile. The
 * HedgeFollow-style "here are the funds we follow" overview.
 */
export function FundsGrid({ funds }: { funds: ApiFundSummary[] }) {
    if (!funds.length) return null;

    // Group by provider, order providers by total AUM (biggest shop first),
    // and funds within a provider by AUM too.
    const byProvider = new Map<string, ApiFundSummary[]>();
    for (const f of funds) {
        const list = byProvider.get(f.provider) ?? [];
        list.push(f);
        byProvider.set(f.provider, list);
    }
    const providers = [...byProvider.entries()]
        .map(([provider, list]) => ({
            provider,
            list: [...list].sort((a, b) => (b.aum ?? 0) - (a.aum ?? 0)),
            totalAum: list.reduce((s, f) => s + (f.aum ?? 0), 0),
        }))
        .sort((a, b) => b.totalAum - a.totalAum);

    return (
        <div className="bg-[#111827] border border-[#1f2937] rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1f2937] flex items-center gap-2">
                <Building2 className="h-4 w-4 text-[#00d4ff]" />
                <h2 className="text-sm font-black tracking-tight">Tracked funds</h2>
                <span className="text-[11px] text-slate-500">
                    {funds.length} funds across {providers.length} shops
                </span>
            </div>
            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-4">
                {providers.map(({ provider, list, totalAum }) => (
                    <div key={provider}>
                        <div className="flex items-baseline justify-between mb-1.5">
                            <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-300">{provider}</p>
                            {totalAum > 0 && (
                                <span className="text-[10px] text-slate-500 font-mono">${totalAum.toFixed(1)}B</span>
                            )}
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                            {list.map(f => (
                                <Link
                                    key={f.fund}
                                    href={`/fund/${f.fund}`}
                                    title={`${f.fund}${f.aum ? ` · $${f.aum}B` : ''} · ${f.category === 'option-income' ? 'option income' : 'active equity'}`}
                                    className={`font-mono text-[11px] font-bold px-2 py-1 rounded-md border transition-colors hover:opacity-80 ${f.category === 'option-income'
                                        ? 'bg-[#a78bfa]/10 border-[#a78bfa]/30 text-[#c4b5fd]'
                                        : 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'}`}
                                >
                                    {f.fund}
                                </Link>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
