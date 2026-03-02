'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import Link from 'next/link';

// Client-side provider mapping
const FUND_PROVIDERS: Record<string, string> = {
    AVUV: 'Avantis', AVLV: 'Avantis', AVMV: 'Avantis',
    ARKK: 'ARK Invest', ARKQ: 'ARK Invest', ARKW: 'ARK Invest',
    ARKG: 'ARK Invest', ARKF: 'ARK Invest', ARKX: 'ARK Invest',
    KYLD: 'Kurv', KQQQ: 'Kurv',
    ULTY: 'YieldMax', SLTY: 'YieldMax',
    ULTI: 'REX Shares',
    BLOX: 'Tidal / NicholasX',
};

interface Change {
    fund: string;
    ticker: string;
    name: string;
    type: string;
    weightDelta: number;
    isOption: boolean;
}

export function ChangesClient({ changes, asOfDate, providers }: {
    changes: Change[];
    asOfDate: string;
    providers: string[];
}) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [selectedFund, setSelectedFund] = useState<string | null>(null);
    const [showType, setShowType] = useState<'all' | 'buys' | 'sells' | 'new' | 'exit'>('all');

    // Filter by provider
    let filtered = changes;
    if (selectedProvider) {
        filtered = filtered.filter(c => (FUND_PROVIDERS[c.fund] || c.fund) === selectedProvider);
    }
    if (selectedFund) {
        filtered = filtered.filter(c => c.fund === selectedFund);
    }
    if (showType === 'buys') filtered = filtered.filter(c => c.weightDelta > 0 && c.type !== 'NEW');
    else if (showType === 'sells') filtered = filtered.filter(c => c.weightDelta < 0 && c.type !== 'REMOVED');
    else if (showType === 'new') filtered = filtered.filter(c => c.type === 'NEW');
    else if (showType === 'exit') filtered = filtered.filter(c => c.type === 'REMOVED');

    // Sort by absolute weight delta
    filtered.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));

    // Get funds for selected provider
    const fundsForProvider = selectedProvider
        ? [...new Set(changes.filter(c => (FUND_PROVIDERS[c.fund] || c.fund) === selectedProvider).map(c => c.fund))].sort()
        : [...new Set(changes.map(c => c.fund))].sort();

    // Stats
    const buys = filtered.filter(c => c.weightDelta > 0).length;
    const sells = filtered.filter(c => c.weightDelta < 0).length;
    const newPos = filtered.filter(c => c.type === 'NEW').length;
    const exits = filtered.filter(c => c.type === 'REMOVED').length;

    return (
        <div className="space-y-4">
            {/* Stats bar */}
            <div className="flex flex-wrap gap-3 text-xs">
                <span className="bg-[#0f172a] border border-[#1e293b] rounded-lg px-3 py-1.5 text-slate-400">
                    {filtered.length} changes
                </span>
                <span className="bg-[#00ff88]/10 border border-[#00ff88]/20 rounded-lg px-3 py-1.5 text-[#00ff88]">
                    ↑ {buys} buys
                </span>
                <span className="bg-[#ff4444]/10 border border-[#ff4444]/20 rounded-lg px-3 py-1.5 text-[#ff4444]">
                    ↓ {sells} sells
                </span>
                {newPos > 0 && (
                    <span className="bg-[#00d4ff]/10 border border-[#00d4ff]/20 rounded-lg px-3 py-1.5 text-[#00d4ff]">
                        ★ {newPos} new
                    </span>
                )}
                {exits > 0 && (
                    <span className="bg-[#f59e0b]/10 border border-[#f59e0b]/20 rounded-lg px-3 py-1.5 text-[#f59e0b]">
                        ✕ {exits} exits
                    </span>
                )}
            </div>

            {/* Provider filter pills */}
            <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                    <button
                        onClick={() => { setSelectedProvider(null); setSelectedFund(null); }}
                        className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${!selectedProvider
                            ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                            : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
                            }`}
                    >
                        All Providers
                    </button>
                    {providers.map(p => {
                        const count = changes.filter(c => (FUND_PROVIDERS[c.fund] || c.fund) === p).length;
                        if (count === 0) return null;
                        return (
                            <button
                                key={p}
                                onClick={() => { setSelectedProvider(selectedProvider === p ? null : p); setSelectedFund(null); }}
                                className={`text-[11px] font-semibold px-3 py-1.5 rounded-full border transition-colors ${selectedProvider === p
                                    ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
                                    }`}
                            >
                                {p} ({count})
                            </button>
                        );
                    })}
                </div>

                {/* Fund sub-filter */}
                {selectedProvider && fundsForProvider.length > 1 && (
                    <div className="flex flex-wrap gap-1.5 pl-4">
                        <button
                            onClick={() => setSelectedFund(null)}
                            className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${!selectedFund
                                ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]'
                                : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-white'
                                }`}
                        >
                            All Funds
                        </button>
                        {fundsForProvider.map(f => (
                            <button
                                key={f}
                                onClick={() => setSelectedFund(selectedFund === f ? null : f)}
                                className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-colors ${selectedFund === f
                                    ? 'bg-[#a78bfa]/20 border-[#a78bfa]/40 text-[#a78bfa]'
                                    : 'bg-[#1e293b] border-[#334155] text-slate-500 hover:text-white'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Type filter */}
            <div className="flex gap-1.5">
                {(['all', 'buys', 'sells', 'new', 'exit'] as const).map(t => (
                    <button
                        key={t}
                        onClick={() => setShowType(t)}
                        className={`text-[10px] font-semibold px-3 py-1.5 rounded-md border transition-colors uppercase tracking-wider ${showType === t
                            ? 'bg-[#00d4ff]/10 border-[#00d4ff]/30 text-[#00d4ff]'
                            : 'bg-[#0f172a] border-[#1e293b] text-slate-500 hover:text-white'
                            }`}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* Changes list */}
            <div className="rounded-lg border border-[#1f2937] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-[#0f172a] text-slate-400 text-xs uppercase font-semibold border-b border-[#1f2937]">
                            <tr>
                                <th className="px-4 py-3">Ticker</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Fund</th>
                                <th className="px-4 py-3 text-center">Type</th>
                                <th className="px-4 py-3 text-right">Δ Weight</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1f2937]">
                            {filtered.map((c, i) => (
                                <tr key={`${c.fund}-${c.ticker}-${i}`} className="hover:bg-[#1a2333]/50 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <Link href={`/dashboard?q=${c.ticker}`} className="font-mono font-bold text-[#00d4ff] hover:underline">
                                            {c.ticker}
                                        </Link>
                                        {c.isOption && <span className="text-[10px] text-slate-500 ml-1">⚡</span>}
                                    </td>
                                    <td className="px-4 py-2.5 text-slate-400 text-xs max-w-[200px] truncate">{c.name}</td>
                                    <td className="px-4 py-2.5">
                                        <Link href={`/fund/${c.fund}`}>
                                            <Badge variant="outline" className="font-mono text-[10px] cursor-pointer hover:opacity-80">
                                                {c.fund}
                                            </Badge>
                                        </Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${c.type === 'NEW' ? 'text-[#00d4ff] border-[#00d4ff]/30' :
                                            c.type === 'REMOVED' ? 'text-[#f59e0b] border-[#f59e0b]/30' :
                                                c.weightDelta > 0 ? 'text-[#00ff88] border-[#00ff88]/30' :
                                                    'text-[#ff4444] border-[#ff4444]/30'
                                            }`}>
                                            {c.type === 'NEW' ? '★ NEW' : c.type === 'REMOVED' ? '✕ EXIT' : c.weightDelta > 0 ? 'ADD' : 'TRIM'}
                                        </Badge>
                                    </td>
                                    <td className={`px-4 py-2.5 text-right font-mono text-sm font-semibold ${c.weightDelta > 0 ? 'text-[#00ff88]' : c.weightDelta < 0 ? 'text-[#ff4444]' : 'text-slate-400'
                                        }`}>
                                        <span className="flex items-center justify-end gap-0.5">
                                            {c.weightDelta > 0 ? <ArrowUpRight className="h-3 w-3" /> : c.weightDelta < 0 ? <ArrowDownRight className="h-3 w-3" /> : null}
                                            {c.weightDelta > 0 ? '+' : ''}{c.weightDelta.toFixed(3)}%
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filtered.length === 0 && (
                    <div className="text-center py-12 text-slate-500">
                        <p className="text-sm font-medium">No changes match your filters</p>
                        <p className="text-xs mt-1 text-slate-600">Try selecting a different provider or type.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
