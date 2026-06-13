'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shuffle, ArrowUpRight, ArrowDownRight } from 'lucide-react';

// Matches scripts/rotation_tracker.py -> <fund>_rotation.json
interface RotationData {
    fund: string;
    groupBy: string;   // "theme" | "sector"
    blurb: string;
    asOf: string;
    holdings: number;
    dates: string[];
    themes: string[];  // generic group keys
    timeline: { date: string; weights: Record<string, number> }[];
    currentThemes: Record<string, number>;
    churnSincePrior: { added: string[]; dropped: string[]; held: string[]; rate: number };
    unmapped: string[];
}

// Funds that have a rotation report (a <fund>_rotation.json exists). Keeps the
// component from firing pointless 404s on the ~50 funds that don't rotate.
const ROTATION_FUNDS = new Set(['ULTI', 'ULTY']);

// Stable group palette (assigned by sorted-group index). "Uncategorized" is
// always slate so a not-yet-mapped name reads as exactly that, not a real group.
const PALETTE = [
    '#f7931a', '#00d4ff', '#a78bfa', '#34d399', '#60a5fa', '#f472b6', '#fbbf24',
    '#22d3ee', '#c084fc', '#4ade80', '#fb7185', '#38bdf8', '#e879f9', '#facc15',
];
function groupColor(group: string, sortedGroups: string[]): string {
    if (group === 'Uncategorized') return '#64748b';
    const i = sortedGroups.indexOf(group);
    return PALETTE[i % PALETTE.length] || '#64748b';
}

function hexWithAlpha(hex: string, alpha: number): string {
    const a = Math.round(Math.min(1, Math.max(0, alpha)) * 255).toString(16).padStart(2, '0');
    return `${hex}${a}`;
}

export function RotationPanel({ fund }: { fund: string }) {
    const [data, setData] = useState<RotationData | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        if (!ROTATION_FUNDS.has(fund.toUpperCase())) return;
        fetch(`/data/${fund.toLowerCase()}_rotation.json`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then(setData)
            .catch(() => setFailed(true));
    }, [fund]);

    // Self-gating: render nothing for non-rotating funds or if the file is missing.
    if (!ROTATION_FUNDS.has(fund.toUpperCase()) || failed || !data) return null;

    const title = `${data.groupBy.charAt(0).toUpperCase()}${data.groupBy.slice(1)} Rotation`;

    // Groups sorted by current weight (desc), Uncategorized always last.
    const sorted = [...data.themes].sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return (data.currentThemes[b] || 0) - (data.currentThemes[a] || 0);
    });
    const maxCell = Math.max(1, ...data.timeline.flatMap((t) => Object.values(t.weights)));
    const churn = data.churnSincePrior;

    return (
        <Card className="bg-[#111827] border-[#1f2937] mt-6">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Shuffle className="h-5 w-5 text-[#f7931a]" /> {title}
                    <span className="ml-auto text-xs font-normal text-slate-500">
                        {data.holdings} holdings · as of {data.asOf}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
                <p className="text-[11px] text-slate-400 mb-4 leading-relaxed">{data.blurb}</p>

                {/* Current allocation bars */}
                <div className="space-y-1.5 mb-5">
                    {sorted
                        .filter((t) => (data.currentThemes[t] || 0) > 0)
                        .map((t) => {
                            const w = data.currentThemes[t] || 0;
                            const c = groupColor(t, sorted);
                            return (
                                <div key={t} className="flex items-center gap-2 text-xs">
                                    <span className="w-40 shrink-0 text-slate-300 truncate">{t}</span>
                                    <div className="flex-1 h-3 bg-[#0b1220] rounded overflow-hidden">
                                        <div className="h-full rounded" style={{ width: `${Math.min(100, w * 2)}%`, backgroundColor: c }} />
                                    </div>
                                    <span className="w-10 text-right font-mono text-slate-400">{w.toFixed(0)}%</span>
                                </div>
                            );
                        })}
                </div>

                {/* Drift heatmap: groups x weeks */}
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
                                const c = groupColor(t, sorted);
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
                    {churn.added.length === 0 && churn.dropped.length === 0 ? (
                        <p className="text-[10px] text-slate-500">No names rotated in or out since the prior sample.</p>
                    ) : (
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
                    )}
                    {data.unmapped.length > 0 && (
                        <p className="text-[9px] text-slate-500 mt-2">
                            Uncategorized (newly added, {data.groupBy} TBD): {data.unmapped.join(', ')}
                        </p>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
