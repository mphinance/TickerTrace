import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { format } from 'date-fns';

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
export const FUND_PROVIDERS: Record<string, string> = {
    AVUV: 'Avantis',
    AVLV: 'Avantis',
    AVMV: 'Avantis',
    ARKK: 'ARK Invest',
    ARKQ: 'ARK Invest',
    ARKW: 'ARK Invest',
    ARKG: 'ARK Invest',
    ARKF: 'ARK Invest',
    ARKX: 'ARK Invest',
    KYLD: 'Kurv',
    KQQQ: 'Kurv',
    ULTY: 'YieldMax',
    SLTY: 'YieldMax',
    ULTI: 'REX Shares',
    BLOX: 'Tidal / NicholasX',
    EGGQ: 'Tidal / NestYield',
    EGGY: 'Tidal / NestYield',
    EGGS: 'Tidal / NestYield',
    // Weekly pay suite
    MSTW: 'Roundhill',
    NVDW: 'Roundhill',
    COIW: 'Roundhill',
    TSLW: 'Roundhill',
    HOOW: 'Roundhill',
    PLTW: 'Roundhill',
    QDTE: 'Roundhill',
    XDTE: 'Roundhill',
    RDTE: 'Roundhill',
    YBTC: 'Roundhill',
    MSTY: 'YieldMax',
    NVDY: 'YieldMax',
    CONY: 'YieldMax',
    TSLY: 'YieldMax',
    HOOY: 'YieldMax',
    PLTY: 'YieldMax',
    MSII: 'REX Shares',
    NVII: 'REX Shares',
    COII: 'REX Shares',
    TSII: 'REX Shares',
    HOII: 'REX Shares',
    PLTI: 'REX Shares',
};

export const PROVIDER_ORDER = ['Avantis', 'ARK Invest', 'Kurv', 'YieldMax', 'REX Shares', 'Roundhill', 'Tidal / NicholasX', 'Tidal / NestYield'];

// Passive ETFs removed from scraping — filter any residual data from CSVs
export const EXCLUDED_FUNDS = new Set(['IBIT', 'IVV', 'IWM']);

// Approximate AUM in $B (for conviction weighting)
export const FUND_AUM: Record<string, number> = {
    AVUV: 12.5,
    AVLV: 3.2,
    AVMV: 0.8,
    ARKK: 6.8,
    ARKQ: 1.1,
    ARKW: 1.5,
    ARKG: 1.8,
    ARKF: 0.9,
    ARKX: 0.3,
    KYLD: 0.15,
    KQQQ: 0.08,
    ULTY: 0.6,
    SLTY: 0.02,
    ULTI: 0.1,
    BLOX: 0.05,
    EGGQ: 0.06,
    EGGY: 0.02,
    EGGS: 0.02,
    // Weekly pay suite
    MSTW: 0.05,
    NVDW: 0.04,
    COIW: 0.03,
    TSLW: 0.04,
    HOOW: 0.02,
    PLTW: 0.03,
    QDTE: 0.3,
    XDTE: 0.2,
    RDTE: 0.1,
    YBTC: 0.1,
    MSTY: 1.1,
    NVDY: 1.3,
    CONY: 0.4,
    TSLY: 0.9,
    HOOY: 0.05,
    PLTY: 0.05,
    MSII: 0.03,
    NVII: 0.04,
    COII: 0.03,
    TSII: 0.03,
    HOII: 0.02,
    PLTI: 0.02,
};

export function getProvider(fund: string): string {
    return FUND_PROVIDERS[fund] ?? 'Other';
}

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

function computeDiff(current: Holding[], previous: Holding[]): HoldingsDiff | null {
    if (!previous || previous.length === 0) return null;

    const currentMap = new Map<string, Holding>();
    const previousMap = new Map<string, Holding>();

    current.forEach(h => currentMap.set(holdingKey(h), h));
    previous.forEach(h => previousMap.set(holdingKey(h), h));

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
                currentShares: curr['Share Quantity'] || 0,
                previousShares: 0,
                isOption,
                optionDetails
            });
        } else {
            const weightDelta = (curr.Weight || 0) - (prev.Weight || 0);
            const sharesChanged = (curr['Share Quantity'] || 0) !== (prev['Share Quantity'] || 0);

            // Bug 4 fix: lowered threshold from 0.1 to 0.01 (1 basis point)
            // so small-weight rebalances are not silently dropped.
            if (Math.abs(weightDelta) > 0.01 || sharesChanged) {
                changedPositions.push({
                    type: 'CHANGED',
                    fund: curr['ETF Ticker'],
                    ticker: curr.Ticker,
                    name: curr.Name,
                    currentWeight: curr.Weight || 0,
                    previousWeight: prev.Weight || 0,
                    weightDelta: weightDelta,
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
                currentShares: 0,
                previousShares: prev['Share Quantity'] || 0,
                isOption,
                optionDetails
            });
        }
    });

    // Sort by absolute weight delta descending
    newPositions.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));
    removedPositions.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));
    changedPositions.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));

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

    // Money market funds (FGXXX, SPAXX, TTTXX, FIGXX, etc.)
    if (up.endsWith('XXX') || up.endsWith('XX')) return true;

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
const BROAD_FUNDS = new Set(['AVUV', 'AVLV']);
const SIGNIFICANCE_BROAD = 0.1;   // 10 bps for 700+ holding funds
const SIGNIFICANCE_CONCENTRATED = 0.05; // 5 bps for 30–70 holding funds

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

        // Apply significance filter for equities
        if (Math.abs(r.weightDelta) < threshold) continue;

        if (r.weightDelta > 0) {
            accumulating.push(r);
        } else if (r.weightDelta < 0) {
            reducing.push(r);
        }
    }

    // Sort by weight delta magnitude (biggest moves first)
    accumulating.sort((a, b) => b.weightDelta - a.weightDelta);
    reducing.sort((a, b) => a.weightDelta - b.weightDelta);
    optionsActivity.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));

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
        if (Math.abs(r.weightDelta) < threshold) continue;

        if (!tickerMap.has(r.ticker)) {
            tickerMap.set(r.ticker, { name: r.name, funds: [] });
        }
        tickerMap.get(r.ticker)!.funds.push({
            fund: r.fund,
            weightDelta: r.weightDelta,
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

    // Load all snapshots (max 10 days to keep it fast)
    const snapshots: Map<string, Holding>[] = [];
    const datesToUse = dates.slice(0, 10);
    for (const d of datesToUse) {
        const holdings = getHistoricalHoldings(d);
        const map = new Map<string, Holding>();
        for (const h of holdings) {
            map.set(`${h['ETF Ticker']}|${h.Ticker}`, h);
        }
        snapshots.push(map);
    }

    const streaks = new Map<string, number>();

    // For each position in the most recent snapshot
    const newest = snapshots[0];
    newest.forEach((curr, key) => {
        if (curr.Option_Type) return; // skip options

        let streak = 0;
        for (let i = 1; i < snapshots.length; i++) {
            const prev = snapshots[i].get(key);
            if (!prev) {
                // Position didn't exist → if streak is 0, this is day 1 of being new
                if (streak === 0) streak = 1;
                break;
            }
            const delta = (curr.Weight || 0) - (prev.Weight || 0);
            // For day-over-day, compare consecutive pairs
            const dayDelta = (snapshots[i - 1].get(key)?.Weight || 0) - (prev.Weight || 0);

            if (dayDelta > 0.001) {
                if (streak >= 0) streak++;
                else break;
            } else if (dayDelta < -0.001) {
                if (streak <= 0) streak--;
                else break;
            } else {
                break; // no change, streak ends
            }
        }

        if (Math.abs(streak) >= 2) {
            streaks.set(key, streak);
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

    // Aggregate weights by sector for current and previous
    const currSectors = new Map<string, { weight: number; funds: Set<string> }>();
    const prevSectors = new Map<string, { weight: number; funds: Set<string> }>();

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
        if (!prevSectors.has(sector)) prevSectors.set(sector, { weight: 0, funds: new Set() });
        const s = prevSectors.get(sector)!;
        s.weight += h.Weight || 0;
        s.funds.add(h['ETF Ticker']);
    }

    const allSectors = new Set([...currSectors.keys(), ...prevSectors.keys()]);
    const flows: SectorFlow[] = [];

    allSectors.forEach(sector => {
        const curr = currSectors.get(sector);
        const prev = prevSectors.get(sector);
        const currentWeight = curr?.weight ?? 0;
        const previousWeight = prev?.weight ?? 0;
        const delta = currentWeight - previousWeight;

        if (Math.abs(delta) > 0.001) {
            flows.push({
                sector,
                currentWeight,
                previousWeight,
                weightDelta: delta,
                fundCount: curr?.funds.size ?? 0,
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
                weightDelta: prev ? weight - prev.weight : 0,
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
        recentChanges.sort((a, b) => Math.abs(b.weightDelta) - Math.abs(a.weightDelta));
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
        if (Math.abs(r.weightDelta) < threshold) continue;

        if (!tickerMap.has(r.ticker)) {
            tickerMap.set(r.ticker, { name: r.name, buying: [], selling: [] });
        }

        const entry = tickerMap.get(r.ticker)!;
        const record = { fund: r.fund, provider: getProvider(r.fund), weightDelta: r.weightDelta };

        if (r.weightDelta > 0) {
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
