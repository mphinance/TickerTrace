// Option Strategy Map — a per-underlying view of where each underlying's spot
// price sits relative to the strike the fund WROTE. Built for option-income
// ETFs (YieldMax, Kurv, REX, etc.) that sell covered calls / cash-secured puts.
//
// Each row is a horizontal price-band "track": one marker for the underlying
// SPOT, one for the written STRIKE. Colour encodes moneyness from the fund's
// perspective — OTM (contract expires worthless, fund keeps the premium) is
// green; ITM (working against the fund) is red; near-ATM is amber.
//
// Pure server component — every number is derived from the options prop the
// fund page already fetched. No 'use client'.
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ApiOptionHolding } from '@/lib/api';
import { Crosshair } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface StrategyRow {
    underlying: string;
    optionType: string;       // "Call" | "Put" (best-guess from the chosen contract)
    spot: number;             // > 0, guaranteed usable
    strike: number;           // > 0, guaranteed usable
    weight: number;           // summed abs option weight on this underlying
    dte: number | null;
    /**
     * Distance from spot to strike as a signed fraction of spot.
     * For a CALL: spot above strike => ITM => positive.
     * For a PUT:  spot below strike => ITM => positive.
     */
    moneyness: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isCall(optionType: string): boolean {
    return (optionType || '').trim().toLowerCase().startsWith('c');
}

function daysUntil(expiry: string): number | null {
    if (!expiry) return null;
    const d = new Date(expiry);
    if (isNaN(d.getTime())) return null;
    return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

/**
 * Effective days-to-expiry. Prefers the scraper's DTE; falls back to computing
 * it from the expiry string. `!= null` so a missing/undefined field falls back
 * too instead of reaching Math.round(undefined) -> NaN.
 */
function effectiveDte(o: ApiOptionHolding): number | null {
    if (o.dte != null && Number.isFinite(o.dte)) return Math.round(o.dte);
    return daysUntil(o.expiry);
}

/**
 * Signed moneyness for this contract as a fraction of spot. Prefers the
 * scraper's signed `moneyness` ratio; otherwise derives it from spot vs.
 * strike, accounting for call/put direction. Returns null if undeterminable.
 */
function deriveMoneyness(o: ApiOptionHolding): number | null {
    if (o.moneyness != null && Number.isFinite(o.moneyness)) return o.moneyness;
    const spot = o.underlyingPrice;
    const strike = o.strike;
    if (spot == null || !Number.isFinite(spot) || spot <= 0) return null;
    if (!Number.isFinite(strike) || strike <= 0) return null;
    // Call ITM when spot > strike; put ITM when spot < strike.
    const raw = (spot - strike) / spot;
    return isCall(o.optionType) ? raw : -raw;
}

/** A row is renderable only when both spot and strike are positive finite. */
function isUsable(o: ApiOptionHolding): boolean {
    const s = o.underlyingPrice;
    return (
        s != null && Number.isFinite(s) && s > 0 &&
        Number.isFinite(o.strike) && o.strike > 0
    );
}

interface Moneyness {
    label: string;     // "ITM" | "OTM" | "ATM"
    color: string;
    statusText: string; // e.g. "ITM 3.2%"
}

function classifyMoneyness(m: number): Moneyness {
    const pct = Math.abs(m) * 100;
    if (m > 0.01) return { label: 'ITM', color: '#ff4444', statusText: `ITM ${pct.toFixed(1)}%` };
    if (m < -0.01) return { label: 'OTM', color: '#00ff88', statusText: `OTM ${pct.toFixed(1)}%` };
    return { label: 'ATM', color: '#f59e0b', statusText: 'ATM' };
}

function fmtPrice(n: number): string {
    return `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// ─── Sub-components ──────────────────────────────────────────────────────────

/** Legend swatch for the moneyness colour key. */
function LegendDot({ color, label }: { color: string; label: string }) {
    return (
        <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: color }} />
            {label}
        </span>
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

/**
 * One underlying's price-band track. The band spans a padded range that
 * contains both spot and strike; markers are positioned by linear interpolation
 * so they never overflow and never produce NaN (guarded by the caller).
 */
function StrategyTrack({ row }: { row: StrategyRow }) {
    const mny = classifyMoneyness(row.moneyness);
    const isCallContract = isCall(row.optionType);

    // Build a price band that comfortably contains both markers. 12% padding on
    // each side of the spot/strike spread so neither marker sits at the edge.
    const lo = Math.min(row.spot, row.strike);
    const hi = Math.max(row.spot, row.strike);
    const spread = hi - lo;
    // When spot === strike the spread is 0; fall back to a 5%-of-price window so
    // the band still has width and pct math stays finite.
    const pad = spread > 0 ? spread * 0.6 : Math.max(hi * 0.05, 0.01);
    const bandLo = lo - pad;
    const bandHi = hi + pad;
    const bandRange = bandHi - bandLo; // always > 0 by construction

    const pctOf = (v: number) => {
        const p = ((v - bandLo) / bandRange) * 100;
        return Math.min(98, Math.max(2, p));
    };
    const spotPct = pctOf(row.spot);
    const strikePct = pctOf(row.strike);

    // The shaded segment between strike and spot — visualises the gap and is
    // tinted by moneyness so the eye lands on whether the fund is winning.
    const segLeft = Math.min(spotPct, strikePct);
    const segWidth = Math.abs(spotPct - strikePct);

    const dteLabel = row.dte == null
        ? null
        : row.dte < 0 ? `expired ${-row.dte}d ago`
            : row.dte === 0 ? '0DTE'
                : `${row.dte}d to expiry`;
    const dteClass = row.dte == null || row.dte > 1
        ? 'text-slate-500'
        : row.dte < 0 ? 'text-[#ff4444]' : 'text-[#f59e0b]';

    return (
        <div className="bg-[#0f172a] border border-[#1e293b] border-l-2 rounded-lg px-3 py-2.5"
            style={{ borderLeftColor: mny.color }}>
            {/* Header row — ticker, structure, status badge */}
            <div className="flex items-center gap-2 mb-2">
                <span className="font-mono font-bold text-sm text-white truncate">{row.underlying}</span>
                <span className="text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                    {isCallContract ? 'Covered Call' : 'Cash-Secured Put'}
                </span>
                <span
                    className="ml-auto inline-block text-[9px] font-bold tracking-wide px-1.5 py-px rounded border shrink-0"
                    style={{
                        color: mny.color,
                        borderColor: `${mny.color}55`,
                        backgroundColor: `${mny.color}14`,
                    }}
                >
                    {mny.statusText}
                </span>
            </div>

            {/* The price-band track */}
            <div className="relative h-7 mb-2">
                {/* Base band */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-1.5 rounded-full bg-[#1e293b]" />
                {/* Tinted spot↔strike segment */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 h-1.5 rounded-full"
                    style={{
                        left: `${segLeft}%`,
                        width: `${segWidth}%`,
                        backgroundColor: `${mny.color}66`,
                    }}
                />
                {/* Strike marker — diamond */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${strikePct}%` }}
                    title={`Written strike: ${fmtPrice(row.strike)}`}
                >
                    <div
                        className="w-2.5 h-2.5 rotate-45 border"
                        style={{ backgroundColor: '#0f172a', borderColor: '#a78bfa' }}
                    />
                </div>
                {/* Spot marker — filled dot */}
                <div
                    className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2"
                    style={{ left: `${spotPct}%` }}
                    title={`Underlying spot: ${fmtPrice(row.spot)}`}
                >
                    <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{ backgroundColor: '#00d4ff', borderColor: '#0f172a' }}
                    />
                </div>
            </div>

            {/* Numeric readout */}
            <div className="grid grid-cols-4 gap-2">
                <Meta label="Spot" value={fmtPrice(row.spot)} valueClass="text-[#00d4ff]" />
                <Meta label="Strike" value={fmtPrice(row.strike)} valueClass="text-[#a78bfa]" />
                <Meta label="Status" value={mny.statusText} valueClass={
                    mny.label === 'ITM' ? 'text-[#ff4444]'
                        : mny.label === 'OTM' ? 'text-[#00ff88]' : 'text-[#f59e0b]'
                } />
                <Meta label="Opt. Weight" value={`${row.weight.toFixed(2)}%`} />
            </div>

            {dteLabel && (
                <div className={`text-[10px] font-mono mt-1.5 ${dteClass}`}>{dteLabel}</div>
            )}
        </div>
    );
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Option Strategy Map. Aggregates the fund's option book by underlying — one
 * row per underlying using its nearest-dated contract (largest-weight on a tie)
 * — and renders each as a spot-vs-strike price track. Caps at 12 underlyings,
 * sorted by total option weight magnitude descending.
 *
 * Returns null when there are no options or no row has usable price data; the
 * parent decides whether to render the section at all.
 */
export function OptionStrategyChart({ options }: { options: ApiOptionHolding[] }) {
    if (!options || options.length === 0) return null;

    // Keep only contracts we can actually plot, then collapse to one row per
    // underlying. The "representative" contract is the nearest-dated one; ties
    // broken by the larger absolute weight.
    const byUnderlying = new Map<string, { rep: ApiOptionHolding; totalWeight: number }>();

    for (const o of options) {
        if (!isUsable(o)) continue;
        const key = (o.underlying || o.ticker || '').trim().toUpperCase();
        if (!key) continue;

        const absWeight = Math.abs(o.weight) || 0;
        const existing = byUnderlying.get(key);
        if (!existing) {
            byUnderlying.set(key, { rep: o, totalWeight: absWeight });
            continue;
        }
        existing.totalWeight += absWeight;

        // Choose the representative contract: nearest expiry wins; on a tie the
        // larger absolute weight wins. A null DTE is treated as "furthest out".
        const curDte = effectiveDte(existing.rep);
        const newDte = effectiveDte(o);
        const curRank = curDte == null ? Number.POSITIVE_INFINITY : curDte;
        const newRank = newDte == null ? Number.POSITIVE_INFINITY : newDte;
        if (
            newRank < curRank ||
            (newRank === curRank && absWeight > (Math.abs(existing.rep.weight) || 0))
        ) {
            existing.rep = o;
        }
    }

    // Build renderable rows. deriveMoneyness can still fail (e.g. spot===strike
    // with no scraper moneyness is fine — it returns 0); only drop a row when
    // moneyness is genuinely undeterminable.
    const rows: StrategyRow[] = [];
    for (const [underlying, { rep, totalWeight }] of byUnderlying.entries()) {
        const moneyness = deriveMoneyness(rep);
        if (moneyness == null || !Number.isFinite(moneyness)) continue;
        const spot = rep.underlyingPrice;
        if (spot == null) continue; // guarded by isUsable, but satisfies TS
        rows.push({
            underlying,
            optionType: rep.optionType,
            spot,
            strike: rep.strike,
            weight: totalWeight,
            dte: effectiveDte(rep),
            moneyness,
        });
    }

    if (rows.length === 0) return null;

    // Sort by total option weight magnitude descending; cap at 12 for legibility.
    rows.sort((a, b) => b.weight - a.weight);
    const visible = rows.slice(0, 12);
    const hidden = rows.length - visible.length;

    // Quick tally for the header — how many underlyings are working for vs.
    // against the fund right now.
    const otmCount = visible.filter((r) => r.moneyness < -0.01).length;
    const itmCount = visible.filter((r) => r.moneyness > 0.01).length;

    return (
        <Card className="bg-[#111827] border-[#1f2937] mt-6">
            <CardHeader className="pb-3 border-b border-[#1f2937]">
                <CardTitle className="text-base font-bold flex items-center gap-2 text-white">
                    <Crosshair className="h-5 w-5 text-[#00d4ff]" /> Option Strategy Map
                    <span className="text-xs font-normal text-slate-500 ml-auto">
                        spot vs. written strike
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">

                {/* Legend + tally */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-4">
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full border-2 shrink-0"
                            style={{ backgroundColor: '#00d4ff', borderColor: '#0f172a' }} />
                        Spot
                    </span>
                    <span className="text-[10px] text-slate-400 flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rotate-45 border shrink-0"
                            style={{ backgroundColor: '#0f172a', borderColor: '#a78bfa' }} />
                        Written strike
                    </span>
                    <span className="text-slate-700">|</span>
                    <LegendDot color="#00ff88" label="OTM — fund keeps premium" />
                    <LegendDot color="#f59e0b" label="Near ATM" />
                    <LegendDot color="#ff4444" label="ITM — capped / assigned" />
                    <span className="text-[10px] text-slate-500 font-mono ml-auto">
                        {otmCount} OTM · {itmCount} ITM
                    </span>
                </div>

                {/* Tracks — one per underlying */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {visible.map((row) => (
                        <StrategyTrack key={row.underlying} row={row} />
                    ))}
                </div>

                {hidden > 0 && (
                    <div className="text-[10px] text-slate-500 mt-3 text-center">
                        + {hidden} more underlying{hidden !== 1 ? 's' : ''} not shown
                    </div>
                )}

                <p className="text-[10px] text-slate-600 mt-4">
                    One row per underlying, using its nearest-dated contract (largest option
                    weight on a tie). For a covered call, spot above the strike means upside is
                    capped and shares may be called away; spot below means the option likely
                    expires worthless and the fund keeps the premium. Not investment advice.
                </p>
            </CardContent>
        </Card>
    );
}
