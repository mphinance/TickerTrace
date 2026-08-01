/**
 * @deprecated Mostly retired in the review #10 finale (May 16, 2026).
 *
 * The Python implementation in api/data.py is the authoritative source of
 * truth for the public /api/v1/* endpoints. The Next.js dashboard now
 * fetches from there via @/lib/api in:
 *   - app/dashboard/page.tsx (signals, briefing, activity, divergences, ...)
 *   - app/changes/page.tsx
 *   - app/fund/[ticker]/page.tsx
 *   - app/api/signals/route.ts (now a thin proxy)
 *
 * What's still pulled from this file (intentionally — static reference data
 * or where the API surface doesn't yet cover the use case):
 *   - PROVIDER_ORDER, getProvider, FUND_PROVIDERS — used by table grouping
 *   - FUND_AUM — used by fund-profile page header
 *   - getLatestHoldings, getDailyDiff — used by app/holdings/page.tsx,
 *     which needs raw CSV-shaped rows with Option_Type, Option_Strike, DTE,
 *     etc. that the current API doesn't expose. Migrating that page would
 *     require either reshaping /api/v1/holdings or rewriting the columns.
 *
 * Anything you change here MUST also be reflected in api/data.py if it
 * affects the public-facing data (junk filter, conviction scoring, etc.).
 *
 * Active weight (2026-07-30): every change/signal path in this file now keys
 * off `activeWeightDelta` (price drift removed) rather than raw weight —
 * `activeWeightDeltas`/`splitFactor`/`rowPrice` below are a faithful port of
 * api/data.py's `_active_weight_deltas`/`_split_factor`/`_row_price`, verified
 * position-for-position against it. Raw `weightDelta` is retained on every
 * record for transparency. Keep the two implementations in lockstep.
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { isTradingDay } from './marketHours';

export interface Holding {
    Date: string;
    'ETF Ticker': string;
    Name: string;
    Ticker: string;
    Weight: number;
    'Share Quantity': number;
    'Market Value': number;
    Underlying_Ticker?: string;
    Option_Strike?: number;
    Option_Expiry?: string;
    Option_Type?: string;
    DTE?: number;
    Underlying_Price?: number;
    Moneyness?: number;
    Sector?: string;
    Country?: string;
}

export type ChangeType = 'NEW' | 'REMOVED' | 'CHANGED';

export interface ChangeRecord {
    type: ChangeType;
    fund: string;
    ticker: string;
    name: string;
    currentWeight: number;
    previousWeight: number;
    weightDelta: number;
    /** Manager-attributable weight change, price drift removed (see
     *  activeWeightDeltas). Direction/significance/sort key off THIS, not the
     *  raw weightDelta — a holding's raw weight moves on price alone. */
    activeWeightDelta: number;
    currentShares: number;
    previousShares: number;
    isOption: boolean;
    optionDetails?: {
        type: string;
        strike: number;
        expiry: string;
    };
}

export interface HoldingsDiff {
    newPositions: ChangeRecord[];
    removedPositions: ChangeRecord[];
    changedPositions: ChangeRecord[];
}

const DATA_DIR = path.join(process.cwd(), 'public', 'data');
const HISTORY_DIR = path.join(DATA_DIR, 'history');

// Static provider map — update when adding new funds to scrape_avantis.py
// Pure-data reference (provider map, AUM, ordering) lives in lib/providers.ts
// so client components can import it without pulling in this file's `fs`
// dependency. Imported below for internal use, then re-exported for
// back-compat with existing server-side imports of `lib/holdings`.
import {
    FUND_PROVIDERS,
    PROVIDER_ORDER,
    EXCLUDED_FUNDS,
    FUND_AUM,
    getProvider,
} from './providers';
export { FUND_PROVIDERS, PROVIDER_ORDER, EXCLUDED_FUNDS, FUND_AUM, getProvider };

// ─── History file helpers ───────────────────────────────────────────────────

/**
 * Returns all available history dates (sorted descending, newest first).
 * Scans for files matching `holdings_YYYY-MM-DD.csv` in the history dir.
 */
function getAvailableHistoryDates(): string[] {
    if (!fs.existsSync(HISTORY_DIR)) return [];
    return fs
        .readdirSync(HISTORY_DIR)
        .map(f => f.match(/^holdings_(\d{4}-\d{2}-\d{2})\.csv$/)?.[1])
        .filter((d): d is string => !!d)
        .filter(isTradingDay) // drop weekend/holiday snapshots — count trading days only
        .sort()   // lexicographic sort works for ISO dates
        .reverse(); // newest first
}

function readHoldingsCsv(filePath: string): Holding[] {
    if (!fs.existsSync(filePath)) return [];
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const { data } = Papa.parse<Holding>(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });
    // Filter out junk rows (e.g., iShares disclaimer text rows that sneak through)
    return (data as Holding[]).filter(
        h => h['ETF Ticker'] && h.Ticker && typeof h.Weight === 'number'
    );
}

/**
 * Returns the latest holdings snapshot.
 * Prefers the newest file in data/history/; falls back to holdings_latest.csv.
 */
export function getLatestHoldings(): Holding[] {
    const dates = getAvailableHistoryDates();
    let data: Holding[] = [];
    if (dates.length > 0) {
        const newestPath = path.join(HISTORY_DIR, `holdings_${dates[0]}.csv`);
        data = readHoldingsCsv(newestPath);
    }
    if (data.length === 0) {
        const latestPath = path.join(DATA_DIR, 'holdings_latest.csv');
        data = readHoldingsCsv(latestPath);
    }
    return data.filter(h => !EXCLUDED_FUNDS.has(h['ETF Ticker']));
}

/**
 * Returns holdings for a specific date string (YYYY-MM-DD).
 * Used for the weekly diff.
 */
export function getHistoricalHoldings(dateStr: string): Holding[] {
    const historyPath = path.join(HISTORY_DIR, `holdings_${dateStr}.csv`);
    return readHoldingsCsv(historyPath).filter(h => !EXCLUDED_FUNDS.has(h['ETF Ticker']));
}

// ─── Diff logic ───────────────────────────────────────────────────────────

/**
 * Composite key: fund + ticker + option expiry + option strike.
 * This correctly differentiates two options on the same underlying
 * with different strikes or expiries.
 */
function holdingKey(h: Holding): string {
    return [
        h['ETF Ticker'] ?? '',
        h.Ticker ?? '',
        h.Option_Expiry ?? '',
        h.Option_Strike != null ? String(h.Option_Strike) : '',
    ].join('|');
}

// ─── Active weight (price drift removed) ────────────────────────────────────
// Ported from api/data.py's _active_weight_deltas / _split_factor / _row_price
// — keep in sync with that file. A holding's RAW weight moves whenever its
// price moves, even if nobody trades a share; active weight subtracts each
// position's price-only drift (renormalized across the fund's whole book), so
// what's left is the manager's actual reallocation. On real trades this lifts
// direction accuracy from ~59% to ~81%; raw weight agreed with the true share
// change only ~49% of the time. Everything downstream keys off active weight.

/**
 * Per-unit price for a row: Market Value / Shares, falling back to a Price
 * column, else 0 ("price unknown" → assume no drift rather than invent a return).
 */
function rowPrice(h: Holding): number {
    const shares = h['Share Quantity'] || 0;
    const mv = h['Market Value'] || 0;
    if (shares && mv) return mv / shares;
    const p = (h as { Price?: number }).Price;
    return typeof p === 'number' && isFinite(p) ? p : 0;
}

// Share ratios a split can plausibly produce (k:1 and 1:k). A split multiplies
// shares by k and divides price by k, leaving the position's VALUE untouched —
// which is how we tell it apart from a trade.
const SPLIT_FACTORS: number[] = (() => {
    const base = [1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10, 20];
    return [...base, ...base.map(k => 1 / k)];
})();

/**
 * Detect a stock / reverse split between two snapshots. 1.0 = none. A split
 * preserves value (share_ratio * price_ratio ≈ 1); a real trade does not.
 * Without this a 4:1 split reads as a huge phantom buy that (active weight
 * being zero-sum within a fund) manufactures false sell signals on every
 * untouched holding.
 */
function splitFactor(prevShares: number, currShares: number, prevPrice: number, currPrice: number): number {
    if (prevShares <= 0 || currShares <= 0 || prevPrice <= 0 || currPrice <= 0) return 1;
    const shareRatio = currShares / prevShares;
    const priceRatio = currPrice / prevPrice;
    for (const k of SPLIT_FACTORS) {
        if (Math.abs(shareRatio / k - 1) < 0.02 && Math.abs(priceRatio * k - 1) < 0.15) return k;
    }
    return 1;
}

/**
 * Manager-attributable weight change per position, price drift removed.
 * Keyed by holdingKey(). Mirrors api/data.py:_active_weight_deltas:
 *
 *     drift_i  = w_prev_i * ratio_i / Σ_j(w_prev_j * ratio_j) * Σ w_prev
 *     active_i = w_curr_i - drift_i
 *
 * Renormalizing the drift over the previous snapshot's total cancels price
 * moves AND creation/redemption flow in one step: a pro-rata inflow leaves
 * every weight unchanged, so every active_i ≈ 0 (Σ active_i ≈ 0 per fund).
 * Options/cash are INCLUDED in the denominator — weights sum to 100 across the
 * whole book. A position absent from `previous` is entirely active (a brand-new
 * position is 100% a decision). Funds with no usable previous weights are
 * omitted, and callers fall back to the raw delta for those keys.
 */
function activeWeightDeltas(current: Holding[], previous: Holding[]): Map<string, number> {
    const currMap = new Map<string, Holding>();
    const prevMap = new Map<string, Holding>();
    current.forEach(h => currMap.set(holdingKey(h), h));
    previous.forEach(h => prevMap.set(holdingKey(h), h));

    // Group previous keys by fund so each renormalization sees the whole book.
    const prevByFund = new Map<string, string[]>();
    prevMap.forEach((h, key) => {
        const fund = h['ETF Ticker'];
        const arr = prevByFund.get(fund);
        if (arr) arr.push(key); else prevByFund.set(fund, [key]);
    });

    const active = new Map<string, number>();
    prevByFund.forEach(keys => {
        const prevSum = keys.reduce((s, k) => s + (prevMap.get(k)!.Weight || 0), 0);
        if (prevSum <= 0) return; // nothing to renormalize against — use raw delta
        const ratios = new Map<string, number>();
        let denom = 0;
        for (const k of keys) {
            const p = prevMap.get(k)!;
            const c = currMap.get(k);
            // Price unknown on either side (or a removed row) → assume no drift.
            let ratio = 1;
            const pPrice = rowPrice(p);
            if (c) {
                const cPrice = rowPrice(c);
                if (pPrice > 0 && cPrice > 0) {
                    const split = splitFactor(p['Share Quantity'] || 0, c['Share Quantity'] || 0, pPrice, cPrice);
                    ratio = (cPrice / pPrice) * split;
                }
            }
            ratios.set(k, ratio);
            denom += (p.Weight || 0) * ratio;
        }
        if (denom <= 0) return;
        for (const k of keys) {
            const drift = (prevMap.get(k)!.Weight || 0) * ratios.get(k)! / denom * prevSum;
            const currWeight = currMap.get(k)?.Weight ?? 0;
            active.set(k, currWeight - drift);
        }
    });

    // A position with no previous snapshot has no drift to subtract — all of it
    // is a decision the manager made today.
    currMap.forEach((h, key) => {
        if (!prevMap.has(key)) active.set(key, h.Weight || 0);
    });

    return active;
}

function computeDiff(current: Holding[], previous: Holding[]): HoldingsDiff | null {
    if (!previous || previous.length === 0) return null;

    const currentMap = new Map<string, Holding>();
    const previousMap = new Map<string, Holding>();

    current.forEach(h => currentMap.set(holdingKey(h), h));
    previous.forEach(h => previousMap.set(holdingKey(h), h));

    // Active weight per position (price drift removed), computed over the FULL
    // book (options + cash) before any filtering, so per-fund renormalization
    // sees all 100%. Records fall back to the raw delta where a key is absent.
    const active = activeWeightDeltas(current, previous);

    const newPositions: ChangeRecord[] = [];
    const removedPositions: ChangeRecord[] = [];
    const changedPositions: ChangeRecord[] = [];

    // Check for NEW and CHANGED
    currentMap.forEach((curr, key) => {
        const prev = previousMap.get(key);
        const isOption = !!curr.Option_Type;
        const optionDetails = isOption ? {
            type: curr.Option_Type!,
            strike: curr.Option_Strike!,
            expiry: curr.Option_Expiry!
        } : undefined;

        if (!prev) {
            newPositions.push({
                type: 'NEW',
                fund: curr['ETF Ticker'],
                ticker: curr.Ticker,
                name: curr.Name,
                currentWeight: curr.Weight || 0,
                previousWeight: 0,
                weightDelta: curr.Weight || 0,
                activeWeightDelta: active.get(key) ?? (curr.Weight || 0),
                currentShares: curr['Share Quantity'] || 0,
                previousShares: 0,
                isOption,
                optionDetails
            });
        } else {
            const weightDelta = (curr.Weight || 0) - (prev.Weight || 0);
            const sharesChanged = (curr['Share Quantity'] || 0) !== (prev['Share Quantity'] || 0);

            // Bug 4 fix: lowered threshold from 0.1 to 0.01 (1 basis point)
            // so small-weight rebalances are not silently dropped. Gate on a
            // real share move OR raw-weight move so price-only drift alone does
            // not manufacture a "change" row — active weight is what's shown.
            if (Math.abs(weightDelta) > 0.01 || sharesChanged) {
                changedPositions.push({
                    type: 'CHANGED',
                    fund: curr['ETF Ticker'],
                    ticker: curr.Ticker,
                    name: curr.Name,
                    currentWeight: curr.Weight || 0,
                    previousWeight: prev.Weight || 0,
                    weightDelta: weightDelta,
                    activeWeightDelta: active.get(key) ?? weightDelta,
                    currentShares: curr['Share Quantity'] || 0,
                    previousShares: prev['Share Quantity'] || 0,
                    isOption,
                    optionDetails
                });
            }
        }
    });

    // Check for REMOVED
    previousMap.forEach((prev, key) => {
        if (!currentMap.has(key)) {
            const isOption = !!prev.Option_Type;
            const optionDetails = isOption ? {
                type: prev.Option_Type!,
                strike: prev.Option_Strike!,
                expiry: prev.Option_Expiry!
            } : undefined;

            removedPositions.push({
                type: 'REMOVED',
                fund: prev['ETF Ticker'],
                ticker: prev.Ticker,
                name: prev.Name,
                currentWeight: 0,
                previousWeight: prev.Weight || 0,
                weightDelta: -(prev.Weight || 0),
                activeWeightDelta: active.get(key) ?? -(prev.Weight || 0),
                currentShares: 0,
                previousShares: prev['Share Quantity'] || 0,
                isOption,
                optionDetails
            });
        }
    });

    // Sort by absolute ACTIVE weight delta descending (price drift removed).
    newPositions.sort((a, b) => Math.abs(b.activeWeightDelta) - Math.abs(a.activeWeightDelta));
    removedPositions.sort((a, b) => Math.abs(b.activeWeightDelta) - Math.abs(a.activeWeightDelta));
    changedPositions.sort((a, b) => Math.abs(b.activeWeightDelta) - Math.abs(a.activeWeightDelta));

    return { newPositions, removedPositions, changedPositions };
}

// ─── Public diff API ─────────────────────────────────────────────────────────

/**
 * Compares the two most-recent history snapshots (daily diff).
 * Falls back to holdings_latest.csv when only one history file exists.
 */
export function getDailyDiff(): HoldingsDiff | null {
    const dates = getAvailableHistoryDates();
    const current = getLatestHoldings();
    if (current.length === 0) return null;

    // If we have ≥2 history files, use index [1] as previous (second-newest)
    if (dates.length >= 2) {
        const previous = getHistoricalHoldings(dates[1]);
        return computeDiff(current, previous);
    }

    // If only 1 history file, try holdings_latest.csv as previous
    const latestPath = path.join(DATA_DIR, 'holdings_latest.csv');
    if (fs.existsSync(latestPath)) {
        const previous = readHoldingsCsv(latestPath);
        if (previous.length > 0) return computeDiff(current, previous);
    }

    return null;
}

/**
 * Compares the most-recent snapshot against the one closest to 7 days ago.
 */
export function getWeeklyDiff(): HoldingsDiff | null {
    const dates = getAvailableHistoryDates();
    const current = getLatestHoldings();
    if (current.length === 0 || dates.length < 2) return null;

    // Pick the history entry that is at least 7 positions back (or the oldest available)
    const targetIndex = Math.min(6, dates.length - 1);
    const previous = getHistoricalHoldings(dates[targetIndex]);
    return computeDiff(current, previous);
}

export function getAsOfDate(): string {
    const latest = getLatestHoldings();
    if (latest.length > 0 && latest[0].Date) {
        return latest[0].Date;
    }
    return format(new Date(), 'yyyy-MM-dd');
}

export function getGlobalStats() {
    const latest = getLatestHoldings();
    const funds = new Set<string>();
    const underlyings = new Set<string>();
    let puts = 0;
    let calls = 0;

    latest.forEach(h => {
        if (h['ETF Ticker']) funds.add(h['ETF Ticker']);
        if (h.Option_Type) {
            if (h.Underlying_Ticker) underlyings.add(h.Underlying_Ticker);
            if (h.Option_Type.toLowerCase().startsWith('p')) puts += Math.abs(h['Share Quantity'] || 0);
            if (h.Option_Type.toLowerCase().startsWith('c')) calls += Math.abs(h['Share Quantity'] || 0);
        }
    });

    const pcRatio = calls > 0 ? (puts / calls) : 0;

    return {
        totalFunds: funds.size,
        totalUnderlyings: underlyings.size,
        pcRatio: pcRatio.toFixed(2)
    };
}

// ─── Institutional Signal Aggregation ─────────────────────────────────────────

// Tickers to exclude from signals (cash, accounting entries, etc.)
const JUNK_TICKERS = new Set([
    'CASH', 'CASH&OTHER', 'OTHER', 'TBILL', 'MARGIN VARIATION',
    'NET OTHER ASSETS', 'TOTAL', 'COLLATERAL', 'FGXXX',
    'B', 'WEEK',  // T-bill tickers from Roundhill weekly pay suite
]);

// Bloomberg exchange suffixes (ARK uses these: "RKLB UQ", "NU UN", "DSY FP")
const BLOOMBERG_SUFFIX_RE = /\s+(?:UQ|UN|UW|UP|UA|FP|LN|GY|SJ|AU|CT|CN|JP|HK|SW|SS|IT|SM|NA|BB|PL|DC|NO|AV|ID|MK|TB|PM|IJ)$/;

export function cleanTicker(ticker: string | number | null | undefined): string {
    if (ticker == null) return '';
    return String(ticker).trim().replace(BLOOMBERG_SUFFIX_RE, '');
}

function isJunkTicker(ticker: string | number | null | undefined): boolean {
    if (ticker == null) return true;
    const up = cleanTicker(ticker).toUpperCase();
    if (!up || up.length === 0) return true;
    if (JUNK_TICKERS.has(up)) return true;
    if (up.includes('CASH') || up.includes('OTHER ASSET') || up.includes('TREASURY BILL')) return true;
    if (up.includes('NET ') || up.includes('TOTAL ') || up.includes('PAYABLE') || up.includes('RECEIVABLE')) return true;

    // Money market funds (FGXXX, SPAXX, AGPXX, FIGXX ...). Mutual-fund tickers
    // are always 5 chars; a bare endsWith('XX') also swallowed IDXX (IDEXX Labs)
    // and SPXX. Mirrors _is_money_market() in api/data.py — keep in lockstep.
    if (up.length === 5 && up.endsWith('XX')) return true;

    // CUSIPs / Treasuries (9-char codes starting with digits like 912797RG4)
    if (up.length >= 6 && /^\d{3,}/.test(up)) return true;

    // TRS (Total Return Swap) entries like "88160R101 TRS 031926 NM"
    if (up.includes(' TRS ')) return true;

    // OCC-style option tickers starting with digits (e.g. "2MSTR 260306C00038490")
    // These are handled separately by the options logic
    if (/^\d+[A-Z]/.test(up) && up.length > 10) return true;

    return false;
}

// Broad funds have hundreds of holdings → need higher threshold to be meaningful
// AVMV holds 286 positions — more than AVLV's 272 — and was missing here.
// Mirrors _BROAD_FUNDS in api/data.py; keep in lockstep.
const BROAD_FUNDS = new Set(['AVUV', 'AVLV', 'AVMV']);
const SIGNIFICANCE_BROAD = 0.01;   // 1 bp for 700+ holding funds
const SIGNIFICANCE_CONCENTRATED = 0.02; // 2 bps for 30–70 holding funds

function getSignificanceThreshold(fund: string): number {
    return BROAD_FUNDS.has(fund) ? SIGNIFICANCE_BROAD : SIGNIFICANCE_CONCENTRATED;
}

export interface BuyingSelling {
    accumulating: ChangeRecord[];
    reducing: ChangeRecord[];
    optionsActivity: ChangeRecord[];
}

/**
 * Splits a HoldingsDiff into accumulating / reducing / options buckets.
 * Applies per-fund significance thresholds.
 */
export function getBuyingSelling(diff: HoldingsDiff | null): BuyingSelling | null {
    if (!diff) return null;

    const accumulating: ChangeRecord[] = [];
    const reducing: ChangeRecord[] = [];
    const optionsActivity: ChangeRecord[] = [];

    const allRecords = [
        ...diff.newPositions,
        ...diff.removedPositions,
        ...diff.changedPositions,
    ];

    for (const r of allRecords) {
        // Skip cash, accounting entries, etc.
        if (isJunkTicker(r.ticker)) continue;

        const threshold = getSignificanceThreshold(r.fund);

        // Options go to their own bucket (always, regardless of threshold)
        if (r.isOption) {
            optionsActivity.push(r);
            continue;
        }

        // Apply significance filter for equities — on ACTIVE weight, so a
        // price-only drift never clears the threshold as a fake accumulation.
        if (Math.abs(r.activeWeightDelta) < threshold) continue;

        if (r.activeWeightDelta > 0) {
            accumulating.push(r);
        } else if (r.activeWeightDelta < 0) {
            reducing.push(r);
        }
    }

    // Sort by active weight delta magnitude (biggest real moves first)
    accumulating.sort((a, b) => b.activeWeightDelta - a.activeWeightDelta);
    reducing.sort((a, b) => a.activeWeightDelta - b.activeWeightDelta);
    optionsActivity.sort((a, b) => Math.abs(b.activeWeightDelta) - Math.abs(a.activeWeightDelta));

    return { accumulating, reducing, optionsActivity };
}

export interface InstitutionalSignal {
    ticker: string;
    name: string;
    funds: { fund: string; weightDelta: number; currentWeight: number; type: ChangeType }[];
    fundCount: number;
    providerCount: number;
    avgWeightDelta: number;
    totalWeightDelta: number;
    convictionScore: number;
    direction: 'BUYING' | 'SELLING';
    streak?: number;
}

/**
 * Aggregates changes across all funds to find which tickers institutions
 * are collectively buying or selling. Ranked by conviction score
 * (number of funds × avg weight delta).
 */
export function getInstitutionalSignals(diff: HoldingsDiff | null): {
    buying: InstitutionalSignal[];
    selling: InstitutionalSignal[];
} {
    if (!diff) return { buying: [], selling: [] };

    const allRecords = [
        ...diff.newPositions,
        ...diff.removedPositions,
        ...diff.changedPositions,
    ];

    // Only equity positions for the cross-fund signal (options are per-fund strategies)
    const equityRecords = allRecords.filter(r => !r.isOption && !isJunkTicker(r.ticker));

    // Group by underlying ticker
    const tickerMap = new Map<string, {
        name: string;
        funds: { fund: string; weightDelta: number; currentWeight: number; type: ChangeType }[];
    }>();

    for (const r of equityRecords) {
        const threshold = getSignificanceThreshold(r.fund);
        // Significance and, via the stored delta, direction/conviction all key
        // off ACTIVE weight (price drift removed), matching api/data.py.
        if (Math.abs(r.activeWeightDelta) < threshold) continue;

        if (!tickerMap.has(r.ticker)) {
            tickerMap.set(r.ticker, { name: r.name, funds: [] });
        }
        tickerMap.get(r.ticker)!.funds.push({
            fund: r.fund,
            weightDelta: r.activeWeightDelta,
            currentWeight: r.currentWeight,
            type: r.type,
        });
    }

    const buying: InstitutionalSignal[] = [];
    const selling: InstitutionalSignal[] = [];

    tickerMap.forEach(({ name, funds }, ticker) => {
        const buyingFunds = funds.filter(f => f.weightDelta > 0);
        const sellingFunds = funds.filter(f => f.weightDelta < 0);

        if (buyingFunds.length > 0) {
            const total = buyingFunds.reduce((s, f) => s + f.weightDelta, 0);
            const providers = new Set(buyingFunds.map(f => getProvider(f.fund)));
            const avgAum = buyingFunds.reduce((s, f) => s + (FUND_AUM[f.fund] ?? 0.1), 0) / buyingFunds.length;
            buying.push({
                ticker,
                name,
                funds: buyingFunds,
                fundCount: buyingFunds.length,
                providerCount: providers.size,
                avgWeightDelta: total / buyingFunds.length,
                totalWeightDelta: total,
                convictionScore: buyingFunds.length * Math.abs(total) * avgAum,
                direction: 'BUYING',
            });
        }

        if (sellingFunds.length > 0) {
            const total = sellingFunds.reduce((s, f) => s + f.weightDelta, 0);
            const providers = new Set(sellingFunds.map(f => getProvider(f.fund)));
            const avgAum = sellingFunds.reduce((s, f) => s + (FUND_AUM[f.fund] ?? 0.1), 0) / sellingFunds.length;
            selling.push({
                ticker,
                name,
                funds: sellingFunds,
                fundCount: sellingFunds.length,
                providerCount: providers.size,
                avgWeightDelta: total / sellingFunds.length,
                totalWeightDelta: total,
                convictionScore: sellingFunds.length * Math.abs(total) * avgAum,
                direction: 'SELLING',
            });
        }
    });

    // Sort by conviction score (AUM-weighted)
    buying.sort((a, b) => b.convictionScore - a.convictionScore);
    selling.sort((a, b) => b.convictionScore - a.convictionScore);

    // Attach streaks if available
    const streaks = getStreaks();
    for (const signal of [...buying, ...selling]) {
        for (const f of signal.funds) {
            const key = `${f.fund}|${signal.ticker}`;
            const s = streaks.get(key);
            if (s && Math.abs(s) >= 2) {
                signal.streak = Math.max(signal.streak ?? 0, Math.abs(s));
            }
        }
    }

    return { buying, selling };
}

// ─── Streak Tracking ──────────────────────────────────────────────────────────

/**
 * Scans all history files to find consecutive-day weight changes.
 * Returns Map<"FUND|TICKER", streakDays> where positive = accumulating, negative = reducing.
 */
export function getStreaks(): Map<string, number> {
    const dates = getAvailableHistoryDates(); // newest first
    if (dates.length < 2) return new Map();

    // Load all snapshots (max 10 days to keep it fast), keyed by holdingKey.
    const datesToUse = dates.slice(0, 10);
    const holdingsByDate = datesToUse.map(d => getHistoricalHoldings(d));
    const snapshots = holdingsByDate.map(hs => {
        const map = new Map<string, Holding>();
        for (const h of hs) map.set(holdingKey(h), h);
        return map;
    });

    // Day-over-day ACTIVE weight delta for each consecutive pair: pairActive[i]
    // maps holdingKey → active delta from snapshot[i] (older) to snapshot[i-1]
    // (newer). A streak is consecutive days of real accumulation/reduction, so
    // it must ignore price drift — a stock quietly rising for a week is not a
    // 5-day buy streak.
    const pairActive: Map<string, number>[] = [];
    for (let i = 1; i < snapshots.length; i++) {
        pairActive[i] = activeWeightDeltas(holdingsByDate[i - 1], holdingsByDate[i]);
    }

    const streaks = new Map<string, number>();

    // For each position in the most recent snapshot
    const newest = snapshots[0];
    newest.forEach((curr, hKey) => {
        if (curr.Option_Type) return; // skip options
        const streakKey = `${curr['ETF Ticker']}|${curr.Ticker}`;

        let streak = 0;
        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i].get(hKey);
            if (!prev) {
                // Position didn't exist → if streak is 0, this is day 1 of being new
                if (streak === 0) streak = 1;
                break;
            }
            const dayDelta = pairActive[i].get(hKey) ?? 0;

            if (dayDelta > 0.001) {
                if (streak >= 0) streak++;
                else break;
            } else if (dayDelta < -0.001) {
                if (streak <= 0) streak--;
                else break;
            } else {
                break; // no real move, streak ends
            }
        }

        if (Math.abs(streak) >= 2) {
            streaks.set(streakKey, streak);
        }
    });

    return streaks;
}

// ─── Option Flow Decoder ──────────────────────────────────────────────────────

export interface OptionSignal {
    strategy: string;
    directionalView: string;
    moneyness: string;
}

/**
 * Translates a CSP/CC position into a plain-English directional view.
 */
export function decodeOptionSignal(record: ChangeRecord): OptionSignal | null {
    if (!record.isOption || !record.optionDetails) return null;

    const isCall = record.optionDetails.type.toLowerCase().startsWith('c');
    const isPut = record.optionDetails.type.toLowerCase().startsWith('p');
    const strike = record.optionDetails.strike;

    // Determine moneyness from the strike vs name context (rough heuristic)
    const moneyness = record.currentWeight > 0 ? 'OTM (likely)' : record.currentWeight < 0 ? 'ITM (likely)' : 'ATM';

    if (isPut) {
        return {
            strategy: 'Cash-Secured Put',
            directionalView: `Bullish above $${strike}`,
            moneyness,
        };
    } else if (isCall) {
        return {
            strategy: 'Covered Call',
            directionalView: `Capping upside at $${strike}`,
            moneyness,
        };
    }
    return null;
}

// ─── Pre-Market Briefing ──────────────────────────────────────────────────────

export interface PreMarketBriefing {
    topBuys: InstitutionalSignal[];
    topSells: InstitutionalSignal[];
    notableOptions: { record: ChangeRecord; signal: OptionSignal }[];
    activeStreaks: { fund: string; ticker: string; days: number; direction: 'up' | 'down' }[];
    crossFundConvergence: InstitutionalSignal[];
}

export function getPreMarketBriefing(diff: HoldingsDiff | null): PreMarketBriefing | null {
    if (!diff) return null;

    const { buying, selling } = getInstitutionalSignals(diff);
    const buySell = getBuyingSelling(diff);

    // Top 3 buys and sells
    const topBuys = buying.slice(0, 3);
    const topSells = selling.slice(0, 3);

    // Cross-fund convergence (≥2 distinct providers)
    const crossFundConvergence = [...buying, ...selling]
        .filter(s => s.providerCount >= 2)
        .sort((a, b) => b.convictionScore - a.convictionScore)
        .slice(0, 5);

    // Notable options (largest new positions)
    const notableOptions: { record: ChangeRecord; signal: OptionSignal }[] = [];
    if (buySell) {
        const newOpts = buySell.optionsActivity
            .filter(r => r.type === 'NEW')
            .slice(0, 5);
        for (const r of newOpts) {
            const sig = decodeOptionSignal(r);
            if (sig) notableOptions.push({ record: r, signal: sig });
        }
    }

    // Active streaks ≥ 3 days
    const streaks = getStreaks();
    const activeStreaks: PreMarketBriefing['activeStreaks'] = [];
    streaks.forEach((days, key) => {
        if (Math.abs(days) >= 3) {
            const [fund, ticker] = key.split('|');
            activeStreaks.push({
                fund,
                ticker,
                days: Math.abs(days),
                direction: days > 0 ? 'up' : 'down',
            });
        }
    });
    activeStreaks.sort((a, b) => b.days - a.days);

    return { topBuys, topSells, notableOptions, activeStreaks, crossFundConvergence };
}

// ─── Sector Flow ──────────────────────────────────────────────────────────────

export interface SectorFlow {
    sector: string;
    currentWeight: number;
    previousWeight: number;
    weightDelta: number;
    fundCount: number;
}

/**
 * Computes sector-level weight changes across all funds.
 */
export function getSectorFlow(): SectorFlow[] {
    const dates = getAvailableHistoryDates();
    const current = getLatestHoldings();
    if (current.length === 0 || dates.length < 2) return [];

    const previous = getHistoricalHoldings(dates[1]);
    if (previous.length === 0) return [];

    // Per-position active weight delta (price drift removed), then aggregated to
    // the sector. The flow is Σ active over the sector's positions — NOT the
    // difference of two point-in-time sector weights, which would swing on price
    // alone. currentWeight/previousWeight are kept as raw point-in-time sums for
    // display context only.
    const active = activeWeightDeltas(current, previous);
    const meta = new Map<string, { sector: string; junk: boolean }>();
    for (const h of previous) meta.set(holdingKey(h), { sector: h.Sector || '', junk: isJunkTicker(h.Ticker) });
    for (const h of current) meta.set(holdingKey(h), { sector: h.Sector || '', junk: isJunkTicker(h.Ticker) });

    const currSectors = new Map<string, { weight: number; funds: Set<string> }>();
    const prevWeight = new Map<string, number>();
    const sectorFlow = new Map<string, number>();

    for (const h of current) {
        const sector = h.Sector || '';
        if (!sector || isJunkTicker(h.Ticker)) continue;
        if (!currSectors.has(sector)) currSectors.set(sector, { weight: 0, funds: new Set() });
        const s = currSectors.get(sector)!;
        s.weight += h.Weight || 0;
        s.funds.add(h['ETF Ticker']);
    }

    for (const h of previous) {
        const sector = h.Sector || '';
        if (!sector || isJunkTicker(h.Ticker)) continue;
        prevWeight.set(sector, (prevWeight.get(sector) ?? 0) + (h.Weight || 0));
    }

    // Every position's active delta rolls up to its sector (covers NEW, CHANGED,
    // and REMOVED, since `active` spans the full current ∪ previous key set).
    active.forEach((delta, key) => {
        const m = meta.get(key);
        if (!m || !m.sector || m.junk) return;
        sectorFlow.set(m.sector, (sectorFlow.get(m.sector) ?? 0) + delta);
    });

    const allSectors = new Set([...currSectors.keys(), ...prevWeight.keys()]);
    const flows: SectorFlow[] = [];

    allSectors.forEach(sector => {
        const currentWeight = currSectors.get(sector)?.weight ?? 0;
        const previousWeight = prevWeight.get(sector) ?? 0;
        const delta = sectorFlow.get(sector) ?? 0;

        if (Math.abs(delta) > 0.001) {
            flows.push({
                sector,
                currentWeight,
                previousWeight,
                weightDelta: delta,
                fundCount: currSectors.get(sector)?.funds.size ?? 0,
            });
        }
    });

    flows.sort((a, b) => b.weightDelta - a.weightDelta);
    return flows;
}

// ─── Ticker Detail (for search) ───────────────────────────────────────────────

export interface TickerDetail {
    ticker: string;
    name: string;
    holdings: {
        fund: string;
        weight: number;
        shares: number;
        isOption: boolean;
        optionDetails?: { type: string; strike: number; expiry: string };
    }[];
    changes: ChangeRecord[];
    totalWeight: number;
}

/**
 * Returns all holdings and changes for a specific ticker across all funds.
 */
export function getTickerDetail(searchTicker: string, diff: HoldingsDiff | null): TickerDetail | null {
    const latest = getLatestHoldings();
    const normalizedSearch = String(searchTicker).toUpperCase().trim();
    if (!normalizedSearch) return null;

    const matchingHoldings = latest.filter(h =>
        String(h.Ticker).toUpperCase().trim() === normalizedSearch ||
        String(h.Underlying_Ticker || '').toUpperCase().trim() === normalizedSearch
    );

    if (matchingHoldings.length === 0) return null;

    const name = matchingHoldings[0]?.Name || searchTicker;
    const holdings = matchingHoldings.map(h => ({
        fund: h['ETF Ticker'],
        weight: h.Weight || 0,
        shares: h['Share Quantity'] || 0,
        isOption: !!h.Option_Type,
        optionDetails: h.Option_Type ? {
            type: h.Option_Type,
            strike: h.Option_Strike || 0,
            expiry: h.Option_Expiry || '',
        } : undefined,
    }));

    const totalWeight = holdings.reduce((s, h) => s + h.weight, 0);

    // Find changes for this ticker
    const changes: ChangeRecord[] = [];
    if (diff) {
        const allChanges = [...diff.newPositions, ...diff.removedPositions, ...diff.changedPositions];
        for (const c of allChanges) {
            if (String(c.ticker).toUpperCase().trim() === normalizedSearch) {
                changes.push(c);
            }
        }
    }

    return { ticker: normalizedSearch, name, holdings, changes, totalWeight };
}

// ─── Fund Detail (for profile pages) ──────────────────────────────────────────

export interface FundDetail {
    fund: string;
    provider: string;
    holdingsCount: number;
    topHoldings: { ticker: string; name: string; weight: number; shares: number; weightDelta: number; sharesDelta: number }[];
    optionsCount: number;
    totalWeight: number;
    recentChanges: ChangeRecord[];
}

export function getFundDetail(fund: string, diff: HoldingsDiff | null): FundDetail | null {
    const latest = getLatestHoldings();
    const fundHoldings = latest.filter(h => h['ETF Ticker'] === fund);
    if (fundHoldings.length === 0) return null;

    const provider = getProvider(fund);
    const equities = fundHoldings.filter(h => !h.Option_Type && !isJunkTicker(h.Ticker));
    const options = fundHoldings.filter(h => !!h.Option_Type);

    // Get previous day holdings for delta calculation
    const dates = getAvailableHistoryDates();
    const prevHoldings = dates.length >= 2 ? getHistoricalHoldings(dates[1]) : [];
    const prevFundMap = new Map<string, { weight: number; shares: number }>();
    prevHoldings
        .filter(h => h['ETF Ticker'] === fund && !h.Option_Type && !isJunkTicker(h.Ticker))
        .forEach(h => {
            prevFundMap.set(String(h.Ticker), { weight: h.Weight || 0, shares: h['Share Quantity'] || 0 });
        });

    // Active weight per position, computed over the FULL book (all funds, but
    // renormalized per-fund inside) so this fund's positions are price-adjusted.
    const active = prevHoldings.length
        ? activeWeightDeltas(latest, prevHoldings)
        : new Map<string, number>();

    const topHoldings = equities
        .map(h => {
            const ticker = String(h.Ticker);
            const weight = h.Weight || 0;
            const shares = h['Share Quantity'] || 0;
            const prev = prevFundMap.get(ticker);
            return {
                ticker,
                name: h.Name || ticker,
                weight,
                shares,
                // Manager's active move (price drift removed); falls back to the
                // raw delta only when there's no usable previous snapshot.
                weightDelta: active.get(holdingKey(h)) ?? (prev ? weight - prev.weight : 0),
                sharesDelta: prev ? shares - prev.shares : 0,
            };
        })
        .sort((a, b) => b.weight - a.weight)
        .slice(0, 20);

    const totalWeight = equities.reduce((s, h) => s + (h.Weight || 0), 0);

    const recentChanges: ChangeRecord[] = [];
    if (diff) {
        const allChanges = [...diff.newPositions, ...diff.removedPositions, ...diff.changedPositions];
        for (const c of allChanges) {
            if (c.fund === fund && !isJunkTicker(c.ticker)) {
                recentChanges.push(c);
            }
        }
        recentChanges.sort((a, b) => Math.abs(b.activeWeightDelta) - Math.abs(a.activeWeightDelta));
    }

    return {
        fund,
        provider,
        holdingsCount: equities.length,
        topHoldings,
        optionsCount: options.length,
        totalWeight,
        recentChanges,
    };
}

// ─── Available Funds ──────────────────────────────────────────────────────────

export function getAvailableFunds(): string[] {
    const latest = getLatestHoldings();
    const funds = new Set<string>();
    latest.forEach(h => { if (h['ETF Ticker']) funds.add(h['ETF Ticker']); });
    return [...funds].sort();
}

// ─── Divergence Detector ──────────────────────────────────────────────────────

export interface Divergence {
    ticker: string;
    name: string;
    /** Funds actively adding weight */
    buyingFunds: { fund: string; provider: string; weightDelta: number }[];
    /** Funds actively reducing weight */
    sellingFunds: { fund: string; provider: string; weightDelta: number }[];
    /** True when buying and selling funds share the same provider (e.g. ARKK vs ARKW) */
    intrashop: boolean;
}

/**
 * Finds tickers where some funds are buying while others are selling.
 * Sorted by total conflict magnitude (sum of abs deltas on both sides).
 */
export function getDivergences(diff: HoldingsDiff | null): Divergence[] {
    if (!diff) return [];

    const allRecords = [
        ...diff.newPositions,
        ...diff.removedPositions,
        ...diff.changedPositions,
    ].filter(r => !r.isOption && !isJunkTicker(r.ticker));

    // Group by ticker
    const tickerMap = new Map<string, {
        name: string;
        buying: { fund: string; provider: string; weightDelta: number }[];
        selling: { fund: string; provider: string; weightDelta: number }[];
    }>();

    for (const r of allRecords) {
        const threshold = getSignificanceThreshold(r.fund);
        // Direction of the conflict is on ACTIVE weight — two funds truly on
        // opposite sides, not one drifting up on price while the other trades.
        if (Math.abs(r.activeWeightDelta) < threshold) continue;

        if (!tickerMap.has(r.ticker)) {
            tickerMap.set(r.ticker, { name: r.name, buying: [], selling: [] });
        }

        const entry = tickerMap.get(r.ticker)!;
        const record = { fund: r.fund, provider: getProvider(r.fund), weightDelta: r.activeWeightDelta };

        if (r.activeWeightDelta > 0) {
            entry.buying.push(record);
        } else {
            entry.selling.push(record);
        }
    }

    const divergences: Divergence[] = [];

    tickerMap.forEach(({ name, buying, selling }, ticker) => {
        if (buying.length === 0 || selling.length === 0) return;

        const buyingProviders = new Set(buying.map(f => f.provider));
        const sellingProviders = new Set(selling.map(f => f.provider));
        const sharedProviders = [...buyingProviders].filter(p => sellingProviders.has(p));

        divergences.push({
            ticker,
            name,
            buyingFunds: buying,
            sellingFunds: selling,
            intrashop: sharedProviders.length > 0,
        });
    });

    // Sort: intrashop first (rarer, more interesting), then by total conflict magnitude
    divergences.sort((a, b) => {
        if (a.intrashop !== b.intrashop) return a.intrashop ? -1 : 1;
        const magA = [...a.buyingFunds, ...a.sellingFunds].reduce((s, f) => s + Math.abs(f.weightDelta), 0);
        const magB = [...b.buyingFunds, ...b.sellingFunds].reduce((s, f) => s + Math.abs(f.weightDelta), 0);
        return magB - magA;
    });

    return divergences;
}
