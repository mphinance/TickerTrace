'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FUND_PROVIDERS as DEFAULT_FUND_PROVIDERS } from '@/lib/providers';

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
    /**
     * Optional override map from fund ticker -> provider name.
     * If not provided, the built-in mapping (mirrors api/data.py FUND_PROVIDERS) is used.
     */
    fundProviders?: Record<string, string>;
}

/**
 * Heatmap grid — tickers as ROWS, funds as COLUMNS, grouped by provider.
 *
 * Layout:
 *  - First column: clickable ticker symbols (sticky on horizontal scroll).
 *  - Header rows: provider band spanning its funds (sticky), then a row of clickable
 *    fund tickers per column.
 *  - Cells: small colored block, opacity = magnitude. ★ overlay for NEW, ✕ for REMOVED.
 *    Hover surfaces a small custom tooltip (not the native `title` attribute).
 */
export function ActivityHeatmap({ records, providers, fundProviders }: HeatmapProps) {
    const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
    const [hoverKey, setHoverKey] = useState<string | null>(null);

    const providerFor = (fund: string): string =>
        (fundProviders && fundProviders[fund]) || DEFAULT_FUND_PROVIDERS[fund] || fund;

    // Filter by provider
    const filtered = selectedProvider
        ? records.filter(r => providerFor(r.fund) === selectedProvider)
        : records;

    // Build grid data: ticker -> (fund -> {delta, type})
    const tickerMap = new Map<string, Map<string, { delta: number; type: string }>>();
    const fundSet = new Set<string>();

    for (const r of filtered) {
        fundSet.add(r.fund);
        if (!tickerMap.has(r.ticker)) tickerMap.set(r.ticker, new Map());
        tickerMap.get(r.ticker)!.set(r.fund, { delta: r.weightDelta, type: r.type });
    }

    // Sort tickers by total absolute delta (most active first), cap at 30
    const tickers = [...tickerMap.entries()]
        .map(([ticker, funds]) => {
            let totalDelta = 0;
            funds.forEach(v => { totalDelta += Math.abs(v.delta); });
            return { ticker, totalDelta };
        })
        .sort((a, b) => b.totalDelta - a.totalDelta)
        .slice(0, 30)
        .map(t => t.ticker);

    // Sort funds: by provider name, then alphabetically within provider
    const funds = [...fundSet].sort((a, b) => {
        const pa = providerFor(a);
        const pb = providerFor(b);
        if (pa !== pb) return pa.localeCompare(pb);
        return a.localeCompare(b);
    });

    // Build provider grouping — sequential runs of funds sharing a provider
    const providerGroups: { provider: string; funds: string[] }[] = [];
    for (const f of funds) {
        const p = providerFor(f);
        const last = providerGroups[providerGroups.length - 1];
        if (last && last.provider === p) last.funds.push(f);
        else providerGroups.push({ provider: p, funds: [f] });
    }

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
            {/* Title hint + provider filter pills */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="text-[10px] italic text-slate-500">
                    brighter = larger weight change
                </span>
                <div className="flex flex-wrap gap-1.5 ml-auto">
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
                        const count = records.filter(r => providerFor(r.fund) === p).length;
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
            </div>

            {/* Heatmap grid — tickers as rows, funds as columns grouped by provider */}
            <div className="relative overflow-auto rounded-lg border border-[#1f2937] max-h-[640px]">
                <table className="text-[10px] border-separate border-spacing-0">
                    <thead>
                        {/* Provider band — sticky top row */}
                        <tr>
                            <th
                                rowSpan={2}
                                className="sticky top-0 left-0 z-30 bg-[#0a0f1e] border-b border-r border-[#1f2937] px-2 py-1.5 text-left text-slate-400 uppercase tracking-wider min-w-[88px]"
                            >
                                Ticker
                            </th>
                            {providerGroups.map((grp, gi) => (
                                <th
                                    key={`${grp.provider}-${gi}`}
                                    colSpan={grp.funds.length}
                                    className={`sticky top-0 z-20 bg-[#0a0f1e] border-b border-[#1f2937] px-1.5 py-1 text-center text-[9px] uppercase tracking-wider text-[#a78bfa] font-semibold whitespace-nowrap ${gi > 0 ? 'border-l border-[#1f2937]' : ''
                                        }`}
                                >
                                    {grp.provider}
                                </th>
                            ))}
                        </tr>
                        {/* Fund-ticker header row — also sticky */}
                        <tr>
                            {providerGroups.map((grp, gi) =>
                                grp.funds.map((fund, fi) => (
                                    <th
                                        key={fund}
                                        className={`sticky top-[26px] z-20 bg-[#0f172a] border-b border-[#1f2937] px-1.5 py-1 text-center font-mono whitespace-nowrap ${gi > 0 && fi === 0 ? 'border-l border-[#1f2937]' : ''
                                            }`}
                                    >
                                        <Link
                                            href={`/fund/${fund}`}
                                            className="text-slate-300 hover:text-[#00d4ff] transition-colors"
                                        >
                                            {fund}
                                        </Link>
                                    </th>
                                ))
                            )}
                        </tr>
                    </thead>
                    <tbody>
                        {tickers.map(ticker => (
                            <tr key={ticker} className="group">
                                <td className="sticky left-0 z-10 bg-[#111827] group-hover:bg-[#1a2333] border-b border-r border-[#1f2937]/60 px-2 py-1 font-mono font-bold whitespace-nowrap transition-colors">
                                    <Link
                                        href={`/dashboard?q=${ticker}`}
                                        className="text-white hover:text-[#00d4ff] transition-colors"
                                    >
                                        {ticker}
                                    </Link>
                                </td>
                                {providerGroups.map((grp, gi) =>
                                    grp.funds.map((fund, fi) => {
                                        const cell = tickerMap.get(ticker)?.get(fund);
                                        const cellKey = `${ticker}|${fund}`;
                                        const groupBorder = gi > 0 && fi === 0 ? 'border-l border-[#1f2937]' : '';
                                        if (!cell) {
                                            return (
                                                <td
                                                    key={fund}
                                                    className={`border-b border-[#1f2937]/40 px-1 py-1 text-center text-slate-700 ${groupBorder}`}
                                                >
                                                    <div className="h-4 w-full" />
                                                </td>
                                            );
                                        }
                                        const intensity = Math.min(Math.abs(cell.delta) / maxDelta, 1);
                                        const isPositive = cell.delta > 0;
                                        const alpha = 0.15 + intensity * 0.7;
                                        const bg = isPositive
                                            ? `rgba(0, 255, 136, ${alpha})`
                                            : `rgba(255, 68, 68, ${alpha})`;
                                        const overlay = cell.type === 'NEW' ? '★' : cell.type === 'REMOVED' ? '✕' : null;
                                        const overlayColor = isPositive ? '#00ff88' : '#ff4444';
                                        const showTip = hoverKey === cellKey;
                                        const sign = cell.delta > 0 ? '+' : '';
                                        return (
                                            <td
                                                key={fund}
                                                className={`relative border-b border-[#1f2937]/40 p-0 ${groupBorder}`}
                                                onMouseEnter={() => setHoverKey(cellKey)}
                                                onMouseLeave={() => setHoverKey(prev => (prev === cellKey ? null : prev))}
                                            >
                                                <div
                                                    className="h-4 w-full min-w-[28px] flex items-center justify-center font-mono leading-none cursor-default"
                                                    style={{ backgroundColor: bg }}
                                                >
                                                    {overlay && (
                                                        <span
                                                            className="text-[10px]"
                                                            style={{ color: overlayColor, textShadow: '0 0 2px rgba(0,0,0,0.6)' }}
                                                        >
                                                            {overlay}
                                                        </span>
                                                    )}
                                                </div>
                                                {showTip && (
                                                    <div className="absolute z-40 left-1/2 -translate-x-1/2 -top-1 -translate-y-full pointer-events-none whitespace-nowrap rounded border border-[#1f2937] bg-[#0a0f1e] px-2 py-1 shadow-lg">
                                                        <div className="text-[10px] font-mono text-white">
                                                            <span className="text-[#a78bfa]">{fund}</span>
                                                            <span className="text-slate-500"> · </span>
                                                            <span className="text-slate-300">{ticker}</span>
                                                        </div>
                                                        <div
                                                            className="text-[10px] font-mono font-bold"
                                                            style={{ color: isPositive ? '#00ff88' : '#ff4444' }}
                                                        >
                                                            {sign}{cell.delta.toFixed(3)}%
                                                            <span className="text-slate-500 font-normal ml-1">({cell.type})</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        );
                                    })
                                )}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Slim legend */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(0, 255, 136, 0.6)' }} />
                    Accumulating
                </span>
                <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: 'rgba(255, 68, 68, 0.6)' }} />
                    Reducing
                </span>
                <span><span className="text-[#00ff88]">★</span> New</span>
                <span><span className="text-[#ff4444]">✕</span> Exited</span>
            </div>
        </div>
    );
}

// DEFAULT_FUND_PROVIDERS is imported from @/lib/providers at the top of
// this file — single source of truth. The inline copy that used to live
// here was deleted as part of the May 2026 dedup pass.
