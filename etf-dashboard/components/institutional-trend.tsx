'use client';

import { useState } from 'react';
import type { ApiInstitutionalTrend, ApiTrendEntry, TrendSignal } from '@/lib/api';
import { Activity } from 'lucide-react';
import Link from 'next/link';

type Horizon = 'all' | 'D' | 'W' | 'M';

const SIGNAL_META: Record<TrendSignal, { label: string; text: string; border: string; bg: string }> = {
    'accumulating': { label: 'Accumulating', text: 'text-buy', border: 'border-buy/30', bg: 'bg-buy/10' },
    'distribution-starting': { label: 'Selling starting', text: 'text-warning', border: 'border-warning/30', bg: 'bg-warning/10' },
    'distributing': { label: 'Distributing', text: 'text-sell', border: 'border-sell/30', bg: 'bg-sell/10' },
    'bottoming': { label: 'Bottoming?', text: 'text-equity', border: 'border-equity/30', bg: 'bg-equity/10' },
};

// Display order of the signal groups: buying → turning down → selling → turning up.
const GROUP_ORDER: TrendSignal[] = ['accumulating', 'distribution-starting', 'distributing', 'bottoming'];

// Baseline opacity per horizon when nothing is spotlighted ("All").
const BASE_OPACITY: Record<'D' | 'W' | 'M', number> = { M: 0.38, W: 0.62, D: 1 };

function opacityFor(row: 'D' | 'W' | 'M', selected: Horizon): number {
    if (selected === 'all') return BASE_OPACITY[row];
    return selected === row ? 1 : 0.12;
}

function Bar({ value, max, opacity }: { value: number; max: number; opacity: number }) {
    const frac = max > 0 ? Math.min(Math.abs(value) / max, 1) * 50 : 0;
    const pos = value >= 0;
    return (
        <div className="relative h-1.5 bg-surface-alt rounded-sm overflow-hidden">
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-rule-strong" />
            <div
                className="absolute top-0 bottom-0 rounded-sm transition-opacity duration-200"
                style={{
                    background: pos ? 'var(--buy)' : 'var(--sell)',
                    opacity,
                    width: `${frac}%`,
                    left: pos ? '50%' : `${50 - frac}%`,
                }}
            />
        </div>
    );
}

function Row({ t, max, selected }: { t: ApiTrendEntry; max: number; selected: Horizon }) {
    const rows: ['D' | 'W' | 'M', number][] = [['M', t.monthly], ['W', t.weekly], ['D', t.daily]];
    return (
        <div className="py-2.5 border-b border-rule last:border-0 grid grid-cols-1 md:grid-cols-[150px_1fr] gap-x-4 gap-y-1.5 items-center">
            <div className="min-w-0">
                <Link href={`/stocks/${t.ticker}`} className="font-mono font-bold text-sm text-equity hover:underline">
                    {t.ticker}
                </Link>
                <p className="text-[11px] text-slate-500 truncate">{t.name} · {t.fundCount} funds</p>
            </div>
            <div className="space-y-1">
                {rows.map(([lbl, val]) => {
                    const op = opacityFor(lbl, selected);
                    const dimLabel = selected !== 'all' && selected !== lbl;
                    return (
                        <div key={lbl} className="flex items-center gap-2" style={{ opacity: dimLabel ? 0.4 : 1 }}>
                            <span className={`text-[9px] font-mono w-3 shrink-0 ${selected === lbl ? 'text-equity font-bold' : 'text-slate-500'}`}>{lbl}</span>
                            <div className="flex-1"><Bar value={val} max={max} opacity={op} /></div>
                            <span className={`text-[10px] font-mono w-16 text-right shrink-0 ${val > 0 ? 'text-buy' : val < 0 ? 'text-sell' : 'text-slate-600'}`}>
                                {val > 0 ? '+' : ''}{val.toFixed(3)}%
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

/**
 * Accumulation / distribution trend overlay — rows grouped by signal, with an
 * interactive Day/Week/Month spotlight. Pick a horizon and it pops across every
 * ticker; "All" shows the three nested (Month faint → Day bright). Buying
 * extends right (green), selling left (red).
 */
export function InstitutionalTrend({ trend }: { trend: ApiInstitutionalTrend }) {
    const [selected, setSelected] = useState<Horizon>('all');
    const tickers = trend.tickers;
    if (!tickers.length) return null;

    const max = Math.max(
        0.0001,
        ...tickers.flatMap(t => [Math.abs(t.daily), Math.abs(t.weekly), Math.abs(t.monthly)]),
    );

    // Sort each group by the spotlighted horizon's magnitude — pick "Day" and
    // each group reorders by today's move, not the month's.
    const sortKey: 'daily' | 'weekly' | 'monthly' =
        selected === 'D' ? 'daily' : selected === 'W' ? 'weekly' : 'monthly';
    const groups = GROUP_ORDER
        .map(sig => ({
            sig,
            rows: tickers
                .filter(t => t.signal === sig)
                .sort((a, b) => Math.abs(b[sortKey]) - Math.abs(a[sortKey])),
        }))
        .filter(g => g.rows.length > 0);

    const TOGGLE: { key: Horizon; label: string }[] = [
        { key: 'all', label: 'All' },
        { key: 'D', label: 'Day' },
        { key: 'W', label: 'Week' },
        { key: 'M', label: 'Month' },
    ];

    return (
        <div className="bg-surface border border-rule rounded-xl shadow-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-rule">
                <div className="flex items-center gap-2 flex-wrap">
                    <Activity className="h-4 w-4 text-equity" />
                    <h2 className="text-sm font-black tracking-tight">
                        Accumulation / distribution <span className="text-equity">trend</span>
                    </h2>
                    <span className="ml-auto flex items-center gap-3 text-[10px] text-slate-500">
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-buy" /> buying</span>
                        <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-sell" /> selling</span>
                    </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                    Grouped by signal. Pick a horizon to spotlight it across every name — or keep
                    &ldquo;All&rdquo; to see Month (faint) · Week · Day (bright) stacked.
                </p>
                {/* Horizon spotlight toggle */}
                <div className="flex gap-1.5 mt-2.5">
                    {TOGGLE.map(h => (
                        <button
                            key={h.key}
                            onClick={() => setSelected(h.key)}
                            className={`text-[11px] font-semibold px-3 py-1 rounded-full border transition-colors ${selected === h.key
                                ? 'bg-equity/20 border-equity/40 text-equity'
                                : 'bg-surface-elevated border-rule-strong text-slate-400 hover:text-white'}`}
                        >{h.label}</button>
                    ))}
                </div>
            </div>

            <div className="divide-y divide-rule">
                {groups.map(({ sig, rows }) => {
                    const m = SIGNAL_META[sig];
                    return (
                        <div key={sig}>
                            <div className={`px-4 py-1.5 flex items-center gap-2 ${m.bg}`}>
                                <span className={`text-[11px] font-bold uppercase tracking-wider ${m.text}`}>{m.label}</span>
                                <span className="text-[10px] text-slate-500">{rows.length}</span>
                            </div>
                            <div className="px-4">
                                {rows.map(t => <Row key={t.ticker} t={t} max={max} selected={selected} />)}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
