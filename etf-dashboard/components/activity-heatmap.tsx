'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

interface HeatmapRecord {
    fund: string;
    ticker: string;
    name: string;
    weightDelta: number;
    type: string;
}

interface HeatmapProps {
    records: HeatmapRecord[];
    providers: string[];
}

/**
 * Heatmap grid: tickers on Y-axis, funds on X-axis.
 * Cell color intensity = weight delta magnitude.
 * Green = accumulating, Red = reducing, brighter = bigger move.
 */
export function ActivityHeatmap({ records, providers }: HeatmapProps) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);

    // Filter by provider
    const filtered = selectedProvider
        ? records.filter(r => {
            const prov = getProviderClient(r.fund);
            return prov === selectedProvider;
        })
        : records;

    // Build grid data: unique tickers and funds
    const tickerMap = new Map<string, Map<string, { delta: number; type: string }>>();
    const fundSet = new Set<string>();

    for (const r of filtered) {
        fundSet.add(r.fund);
        if (!tickerMap.has(r.ticker)) tickerMap.set(r.ticker, new Map());
        tickerMap.get(r.ticker)!.set(r.fund, { delta: r.weightDelta, type: r.type });
    }

    // Sort tickers by total absolute delta (most active first)
    const tickers = [...tickerMap.entries()]
        .map(([ticker, funds]) => {
            let totalDelta = 0;
            funds.forEach(v => { totalDelta += Math.abs(v.delta); });
            return { ticker, totalDelta };
        })
        .sort((a, b) => b.totalDelta - a.totalDelta)
        .slice(0, 30) // cap at 30 tickers
        .map(t => t.ticker);

    const funds = [...fundSet].sort();

    if (tickers.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <p className="text-sm">No activity to display.</p>
                <p className="text-xs mt-1 text-slate-600">Data updates on weekday mornings.</p>
            </div>
        );
    }

    // Max delta for color scaling
    const maxDelta = Math.max(...filtered.map(r => Math.abs(r.weightDelta)), 0.01);

    return (
        <div className="space-y-3">
            {/* Provider filter pills */}
            <div className="flex flex-wrap gap-1.5">
                <button
                    onClick={() => setSelectedProvider(null)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${selectedProvider === null
                        ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                        : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
                        }`}
                >
                    All ({records.length})
                </button>
                {providers.map(p => {
                    const count = records.filter(r => getProviderClient(r.fund) === p).length;
                    if (count === 0) return null;
                    return (
                        <button
                            key={p}
                            onClick={() => setSelectedProvider(selectedProvider === p ? null : p)}
                            className={`text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-colors ${selectedProvider === p
                                ? 'bg-[#00d4ff]/20 border-[#00d4ff]/40 text-[#00d4ff]'
                                : 'bg-[#1e293b] border-[#334155] text-slate-400 hover:text-white'
                                }`}
                        >
                            {p} ({count})
                        </button>
                    );
                })}
            </div>

            {/* Heatmap grid — funds on Y-axis, tickers on X-axis */}
            <div className="overflow-x-auto rounded-lg border border-[#1f2937]">
                <table className="text-[10px] w-full">
                    <thead>
                        <tr className="bg-[#0f172a]">
                            <th className="px-2 py-1.5 text-left text-slate-400 uppercase tracking-wider sticky left-0 bg-[#0f172a] z-10 min-w-[70px]">
                                Fund
                            </th>
                            {tickers.map(t => (
                                <th key={t} className="px-1.5 py-1.5 text-center text-slate-500 font-mono whitespace-nowrap">
                                    {t}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {funds.map(fund => (
                            <tr key={fund} className="border-t border-[#1f2937]/50 hover:bg-[#1a2333]/30">
                                <td className="px-2 py-1 font-mono font-bold text-white sticky left-0 bg-[#111827] z-10 whitespace-nowrap">
                                    {fund}
                                </td>
                                {tickers.map(ticker => {
                                    const cell = tickerMap.get(ticker)?.get(fund);
                                    if (!cell) {
                                        return <td key={ticker} className="px-1.5 py-1 text-center text-slate-700">·</td>;
                                    }
                                    const intensity = Math.min(Math.abs(cell.delta) / maxDelta, 1);
                                    const isPositive = cell.delta > 0;
                                    const alpha = 0.15 + intensity * 0.6;
                                    const bg = isPositive
                                        ? `rgba(0, 255, 136, ${alpha})`
                                        : `rgba(255, 68, 68, ${alpha})`;
                                    const textColor = isPositive ? '#00ff88' : '#ff4444';
                                    const label = cell.type === 'NEW' ? '★' : cell.type === 'REMOVED' ? '✕' :
                                        `${cell.delta > 0 ? '+' : ''}${cell.delta.toFixed(2)}`;

                                    return (
                                        <td
                                            key={ticker}
                                            className="px-1.5 py-1 text-center font-mono cursor-default transition-colors"
                                            style={{ backgroundColor: bg, color: textColor }}
                                            title={`${ticker} in ${fund}: ${cell.delta > 0 ? '+' : ''}${cell.delta.toFixed(3)}% (${cell.type})`}
                                        >
                                            {label}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-4 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(0, 255, 136, 0.5)' }} />
                    Accumulating
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{ backgroundColor: 'rgba(255, 68, 68, 0.5)' }} />
                    Reducing
                </span>
                <span>★ New position</span>
                <span>✕ Exited</span>
                <span className="ml-auto italic">brighter = larger weight change</span>
            </div>
        </div>
    );
}

// Client-side provider mapping (mirrors server-side FUND_PROVIDERS)
function getProviderClient(fund: string): string {
    const map: Record<string, string> = {
        AVUV: 'Avantis', AVLV: 'Avantis', AVMV: 'Avantis',
        ARKK: 'ARK Invest', ARKQ: 'ARK Invest', ARKW: 'ARK Invest',
        ARKG: 'ARK Invest', ARKF: 'ARK Invest', ARKX: 'ARK Invest',
        KYLD: 'Kurv', KQQQ: 'Kurv',
        ULTY: 'YieldMax', SLTY: 'YieldMax',
        ULTI: 'REX Shares',
        BLOX: 'Tidal / NicholasX',
    };
    return map[fund] || fund;
}
