'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shuffle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Matches scripts/ulti_theme_tracker.py -> ulti_rotation.json
interface RotationData {
    fund: string;
    asOf: string;
    holdings: number;
    dates: string[];
    themes: string[];
    timeline: { date: string; weights: Record<string, number> }[];
    currentThemes: Record<string, number>;
    churnSincePrior: { added: string[]; dropped: string[]; held: string[]; rate: number };
    unmapped: string[];
}

// Stable theme palette (assigned by sorted-theme index). "Uncategorized" is
// always slate so a not-yet-mapped name reads as exactly that, not a real theme.
const PALETTE = [
    '#f7931a', // bitcoin orange
    '#00d4ff', // space cyan
    '#a78bfa', // quantum violet
    '#34d399', // clean-energy green
    '#60a5fa', // semis blue
    '#f472b6', // drones pink
    '#fbbf24', // materials amber
    '#22d3ee', '#c084fc', '#4ade80', '#fb7185', '#38bdf8', '#e879f9', '#facc15',
];
function themeColor(theme: string, sortedThemes: string[]): string {
    if (theme === 'Uncategorized') return '#64748b';
    const i = sortedThemes.indexOf(theme);
    return PALETTE[i % PALETTE.length] || '#64748b';
}

function hexWithAlpha(hex: string, alpha: number): string {
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
}

export function UltiRotation({ fund }: { fund: string }) {
    const [data, setData] = useState<RotationData | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (fund.toUpperCase() !== 'ULTI') return;
        fetch('/data/ulti_rotation.json', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setData)
            .catch(() => setFailed(true));
    }, [fund]);

    // Self-gating: render nothing for non-ULTI funds or if the file is missing.
    if (fund.toUpperCase() !== 'ULTI' || failed || !data) return null;

    // Themes sorted by current weight (desc), Uncategorized always last.
    const sorted = [...data.themes].sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return (data.currentThemes[b] || 0) - (data.currentThemes[a] || 0);
    });
    const maxCell = Math.max(
        1,
        ...data.timeline.flatMap((t) => Object.values(t.weights))
    );
    const churn = data.churnSincePrior;

    return (
        <Card className="bg-[#111827] border-[#1f2937] mt-6">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Shuffle className="h-5 w-5 text-[#f7931a]" /> Theme Rotation
                    <span className="ml-auto text-xs font-normal text-slate-500">
                        {data.holdings} holdings · as of {data.asOf}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">
                    ULTI rebuilds its speculative basket aggressively — this tracks how its
                    theme weights drift and which names rotate in and out, week over week.
                </p>

                {/* Current allocation bars */}
                <div className="space-y-1.5 mb-5">
                    {sorted
                        .filter((t) => (data.currentThemes[t] || 0) > 0)
                        .map((t) => {
                            const w = data.currentThemes[t] || 0;
                            const c = themeColor(t, sorted);
                            return (
                                <div key={t} className="flex items-center gap-2 text-xs">
                                    <span className="w-40 shrink-0 text-slate-300 truncate">{t}</span>
                                    <div className="flex-1 h-3 bg-[#0b1220] rounded overflow-hidden">
                                        <div className="h-full rounded" style={{ width: `${w * 4}%`, backgroundColor: c }} />
                                    </div>
                                    <span className="w-10 text-right font-mono text-slate-400">{w.toFixed(0)}%</span>
                                </div>
                            );
                        })}
                </div>

                {/* Drift heatmap: themes x weeks */}
                <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wide">
                    Weekly drift
                </div>
                <div className="overflow-x-auto">
                    <table className="border-separate" style={{ borderSpacing: '2px' }}>
                        <thead>
                            <tr>
                                <th className="w-36"></th>
                                {data.dates.map((d) => (
                                    <th key={d} className="text-[9px] font-normal text-slate-500 px-0.5 align-bottom">
                                        {d.slice(5)}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((t) => {
                                const c = themeColor(t, sorted);
                                return (
                                    <tr key={t}>
                                        <td className="text-[10px] text-slate-300 pr-2 whitespace-nowrap">{t}</td>
                                        {data.timeline.map((cell) => {
                                            const w = cell.weights[t] || 0;
                                            return (
                                                <td
                                                    key={cell.date}
                                                    title={w > 0 ? `${t} · ${cell.date}: ${w.toFixed(1)}%` : ''}
                                                    className="w-6 h-5 rounded-sm text-center"
                                                    style={{
                                                        backgroundColor: w > 0 ? hexWithAlpha(c, 0.15 + 0.85 * (w / maxCell)) : '#0b1220',
                                                    }}
                                                >
                                                    <span className="text-[8px] text-white/70">{w >= 5 ? w.toFixed(0) : ''}</span>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Roster churn */}
                <div className="mt-5 pt-3 border-t border-[#1f2937]">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] text-slate-500 font-semibold uppercase tracking-wide">
                            Latest churn
                        </span>
                        <Badge variant="outline" className="text-[9px] border-[#f7931a]/40 text-[#f7931a]">
                            {Math.round(churn.rate * 100)}% turned over
                        </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        {churn.added.map((tk) => (
                            <span key={`a-${tk}`} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <ArrowUpRight className="h-2.5 w-2.5" />{tk}
                            </span>
                        ))}
                        {churn.dropped.map((tk) => (
                            <span key={`d-${tk}`} className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                <ArrowDownRight className="h-2.5 w-2.5" />{tk}
                            </span>
                        ))}
                    </div>
                    {data.unmapped.length > 0 && (
                        <p className="text-[9px] text-slate-500 mt-2">
                            Uncategorized (newly added, theme TBD): {data.unmapped.join(', ')}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
