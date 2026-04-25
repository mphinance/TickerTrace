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
    ARKK: 'ARK Invest',
    ARKQ: 'ARK Invest',
    ARKW: 'ARK Invest',
    ARKG: 'ARK Invest',
    ARKF: 'ARK Invest',
    ARKX: 'ARK Invest',
    IVV: 'iShares',
    IBIT: 'iShares',
    IWM: 'iShares',
    KYLD: 'Kurv',
    KQQQ: 'Kurv',
    ULTY: 'YieldMax',
    ULTI: 'REX Shares',
    REX_ULTI: 'REX Shares',
    BLOX: 'Tidal / NicholasX',
};

export const PROVIDER_ORDER = ['Avantis', 'ARK Invest', 'iShares', 'Kurv', 'YieldMax', 'REX Shares', 'Tidal / NicholasX'];

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
    if (dates.length > 0) {
        const newestPath = path.join(HISTORY_DIR, `holdings_${dates[0]}.csv`);
        const data = readHoldingsCsv(newestPath);
        if (data.length > 0) return data;
    }
    // Fallback: legacy holdings_latest.csv
    const latestPath = path.join(DATA_DIR, 'holdings_latest.csv');
    return readHoldingsCsv(latestPath);
}

/**
 * Returns holdings for a specific date string (YYYY-MM-DD).
 * Used for the weekly diff.
 */
export function getHistoricalHoldings(dateStr: string): Holding[] {
    const historyPath = path.join(HISTORY_DIR, `holdings_${dateStr}.csv`);
    return readHoldingsCsv(historyPath);
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
