// Income-fund "Portfolio" section — the fund's own book, reinterpreted from
// decay-derby's personal-portfolio dashboard. Pure server component: every
// number is derived from the ApiFundDetail the fund page already fetched.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { ApiFundDetail, ApiOptionHolding } from '@/lib/api';
import { Briefcase, PieChart, Zap } from 'lucide-react';

// Deterministic sector palette — TickerTrace accent colors, assigned by
// descending sector weight so the bar and legend always line up.
const SECTOR_PALETTE = [
    'var(--equity)', 'var(--buy)', 'var(--meta)', 'var(--warning)',
    'var(--sell)', '#f472b6', '#38bdf8', '#facc15',
];

function classifyOption(optionType: string): { label: string; color: string } | null {
    const t = (optionType || '').trim().toLowerCase();
    if (t.startsWith('c')) return { label: 'Covered Call', color: 'var(--warning)' };
    if (t.startsWith('p')) return { label: 'Cash-Secured Put', color: 'var(--equity)' };
    return null;
}

function daysUntil(expiry: string): number | null {
    if (!expiry) return null;
    const d = new Date(expiry);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/**
 * Effective days-to-expiry. Prefers the scraper's DTE (captured at snapshot
 * time); falls back to computing it from the expiry date string.
 */
function effectiveDte(o: ApiOptionHolding): number | null {
    // `!= null` (not `!== null`) so a missing field (undefined, e.g. from an
    // API response that predates option analytics) falls back too, instead of
    // reaching Math.round(undefined) -> NaN.
    if (o.dte != null) return Math.round(o.dte);
    return daysUntil(o.expiry);
}

/**
 * ITM / OTM / ATM badge from the scraper's signed moneyness ratio
 * (> 0 in-the-money, < 0 out-of-the-money, ~0 at-the-money).
 *
 * Colours encode what it means for a fund that WRITES these options: OTM is
 * the goal — the contract expires worthless and the fund keeps the premium —
 * so OTM is green, and ITM (working against the fund) is red.
 */
function moneynessBadge(m: number | null | undefined): { label: string; color: string } | null {
    // `== null` catches both null and a missing field (undefined). Without it,
    // undefined falls through every comparison below and wrongly renders ATM.
    if (m == null) return null;
    const pct = Math.abs(m) * 100;
    if (m > 0.01) return { label: `ITM ${pct.toFixed(1)}%`, color: 'var(--sell)' };
    if (m < -0.01) return { label: `OTM ${pct.toFixed(1)}%`, color: 'var(--buy)' };
    return { label: 'ATM', color: 'var(--warning)' };
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function MetricCard({ accent, label, value, sub }: {
    accent: string; label: string; value: string; sub?: string;
}) {
    return (
        <div
            className="bg-surface-alt border border-surface-elevated border-l-2 rounded-lg px-3 py-2.5"
            style={{ borderLeftColor: accent }}
        >
            <div className="text-[10px] text-slate-400 uppercase tracking-wider">{label}</div>
            <div className="text-xl font-bold font-mono text-white mt-0.5">{value}</div>
            {sub && <div className="text-[11px] text-slate-500 mt-0.5 truncate">{sub}</div>}
        </div>
    );
}

function Meta({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
    return (
        <div>
            <div className="text-[9px] text-slate-500 uppercase tracking-wider">{label}</div>
            <div className={`font-mono text-xs ${valueClass || 'text-slate-200'}`}>{value}</div>
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FundPortfolio({ detail }: { detail: ApiFundDetail }) {
    const options = detail.optionHoldings ?? [];

    // Group the option book by expiry, soonest first — the option-income view
    // reads as an expiration ladder, not a flat list. Contracts with no expiry
    // date sort last.
    const expiryGroups = (() => {
        const map = new Map<string, ApiOptionHolding[]>();
        for (const o of options) {
            const key = o.expiry || 'Unknown';
            const bucket = map.get(key);
            if (bucket) bucket.push(o);
            else map.set(key, [o]);
        }
        return [...map.entries()].sort(([a], [b]) => {
            if (a === 'Unknown') return 1;
            if (b === 'Unknown') return -1;
            return a < b ? -1 : a > b ? 1 : 0;
        });
    })();

    // Sector exposure of the underlying equity book (from top holdings).
    const sectorMap = new Map<string, number>();
    for (const h of detail.topHoldings) {
        const name = h.sector || 'Unknown';
        sectorMap.set(name, (sectorMap.get(name) ?? 0) + h.weight);
    }
    const sectorTotal = [...sectorMap.values()].reduce((a, b) => a + b, 0);
    const sectors = [...sectorMap.entries()]
        .map(([name, weight]) => ({
            name,
            weight,
            pct: sectorTotal > 0 ? (weight / sectorTotal) * 100 : 0,
        }))
        .sort((a, b) => b.weight - a.weight);
    const topSector = sectors[0];

    return (
        <Card className="bg-surface border-rule mt-6">
            <CardHeader className="pb-3 border-b border-rule">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Briefcase className="h-5 w-5 text-buy" /> Portfolio
                    <span className="text-xs font-normal text-slate-500 ml-auto">
                        the fund&apos;s own book
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">

                {/* Metric cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <MetricCard
                        accent="var(--equity)"
                        label="Equity Holdings"
                        value={detail.holdingsCount.toString()}
                    />
                    <MetricCard
                        accent="var(--meta)"
                        label="Option Contracts"
                        value={detail.optionsCount.toString()}
                    />
                    <MetricCard
                        accent="var(--buy)"
                        label="Equity Weight"
                        value={`${detail.totalWeight.toFixed(1)}%`}
                    />
                    <MetricCard
                        accent="var(--warning)"
                        label="Top Sector"
                        value={topSector ? `${topSector.pct.toFixed(0)}%` : '—'}
                        sub={topSector?.name}
                    />
                </div>

                {/* Sector allocation bar */}
                {sectors.length > 0 && (
                    <div className="mt-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-2">
                            <PieChart className="h-3.5 w-3.5 text-equity" /> Sector Exposure
                            <span className="text-slate-500 font-normal ml-auto normal-case">
                                underlying equity · top {detail.topHoldings.length}
                            </span>
                        </div>
                        <div className="flex h-3 rounded-full overflow-hidden bg-surface-elevated">
                            {sectors.map((s, i) => (
                                <div
                                    key={s.name}
                                    style={{
                                        width: `${s.pct}%`,
                                        backgroundColor: SECTOR_PALETTE[i % SECTOR_PALETTE.length],
                                    }}
                                    title={`${s.name}: ${s.pct.toFixed(1)}%`}
                                />
                            ))}
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                            {sectors.map((s, i) => (
                                <span key={s.name} className="text-[11px] text-slate-400 flex items-center gap-1.5">
                                    <span
                                        className="w-2 h-2 rounded-sm shrink-0"
                                        style={{ backgroundColor: SECTOR_PALETTE[i % SECTOR_PALETTE.length] }}
                                    />
                                    {s.name}
                                    <span className="text-slate-500 font-mono">{s.pct.toFixed(0)}%</span>
                                    {s.pct > 40 && <span className="text-warning">⚠ heavy</span>}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Option book — grouped by expiry, soonest first */}
                {options.length > 0 && (
                    <div className="mt-5">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5 mb-3">
                            <Zap className="h-3.5 w-3.5 text-meta" /> Option Book
                            <span className="text-slate-500 font-normal ml-auto normal-case">
                                {options.length} contract{options.length !== 1 ? 's' : ''} · {expiryGroups.length} expir{expiryGroups.length === 1 ? 'y' : 'ies'}
                            </span>
                        </div>
                        <div className="space-y-4">
                            {expiryGroups.map(([expiry, groupOptions]) => {
                                const groupDte = effectiveDte(groupOptions[0]);
                                const dteLabel = groupDte === null
                                    ? null
                                    : groupDte < 0 ? `expired ${-groupDte}d ago`
                                        : groupDte === 0 ? '0DTE — expires today'
                                            : `${groupDte}d out`;
                                const dteClass = groupDte === null || groupDte > 1
                                    ? 'text-slate-500'
                                    : groupDte < 0 ? 'text-sell' : 'text-warning';
                                return (
                                    <div key={expiry}>
                                        {/* Expiry header */}
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <span className="text-[11px] font-mono font-semibold text-meta">
                                                {expiry === 'Unknown' ? 'No expiry date' : expiry}
                                            </span>
                                            {dteLabel && expiry !== 'Unknown' && (
                                                <span className={`text-[10px] font-mono ${dteClass}`}>{dteLabel}</span>
                                            )}
                                            <div className="flex-1 h-px bg-surface-elevated" />
                                            <span className="text-[10px] text-slate-600">
                                                {groupOptions.length} contract{groupOptions.length !== 1 ? 's' : ''}
                                            </span>
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                            {groupOptions.map((o, i) => {
                                                const cls = classifyOption(o.optionType);
                                                const mny = moneynessBadge(o.moneyness);
                                                return (
                                                    <div
                                                        key={`${o.ticker}-${i}`}
                                                        className="bg-surface-alt border border-surface-elevated rounded-lg p-3"
                                                    >
                                                        <div className="flex items-center justify-between gap-2 mb-2">
                                                            <span className="font-mono font-bold text-sm text-white truncate">
                                                                {o.underlying || o.ticker}
                                                            </span>
                                                            {cls && (
                                                                <Badge
                                                                    variant="outline"
                                                                    className="text-[9px] font-semibold shrink-0"
                                                                    style={{ color: cls.color, borderColor: `color-mix(in srgb, ${cls.color} 33%, transparent)` }}
                                                                >
                                                                    {cls.label}
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2 mb-2">
                                                            <Meta
                                                                label="Strike"
                                                                value={o.strike > 0 ? `$${o.strike}` : '—'}
                                                            />
                                                            <Meta
                                                                label="Weight"
                                                                value={`${o.weight.toFixed(2)}%`}
                                                                valueClass={o.weight < 0 ? 'text-sell' : 'text-buy'}
                                                            />
                                                            <Meta
                                                                label="Spot"
                                                                value={o.underlyingPrice ? `$${o.underlyingPrice.toFixed(2)}` : '—'}
                                                            />
                                                        </div>
                                                        {mny ? (
                                                            <span
                                                                className="inline-block text-[9px] font-bold tracking-wide px-1.5 py-px rounded border"
                                                                style={{
                                                                    color: mny.color,
                                                                    borderColor: `color-mix(in srgb, ${mny.color} 33%, transparent)`,
                                                                    backgroundColor: `color-mix(in srgb, ${mny.color} 8%, transparent)`,
                                                                }}
                                                            >
                                                                {mny.label}
                                                            </span>
                                                        ) : (
                                                            <span className="text-[9px] text-slate-600">moneyness n/a</span>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <p className="text-[10px] text-slate-600 mt-4">
                    Derived from the fund&apos;s latest daily holdings snapshot. Option positions
                    are labelled by structure (covered call vs. cash-secured put); negative
                    weight indicates a written/short contract. Not investment advice.
                </p>
            </CardContent>
        </Card>
    );
}
