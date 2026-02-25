import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { format, subDays } from 'date-fns';

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

export function getLatestHoldings(): Holding[] {
    const latestPath = path.join(DATA_DIR, 'holdings_latest.csv');
    if (!fs.existsSync(latestPath)) {
        return [];
    }
    const fileContent = fs.readFileSync(latestPath, 'utf8');
    const { data } = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });
    return data as Holding[];
}

export function getHistoricalHoldings(date: Date): Holding[] {
    const dateStr = format(date, 'yyyy-MM-dd');
    const historyPath = path.join(DATA_DIR, 'history', `holdings_${dateStr}.csv`);

    if (!fs.existsSync(historyPath)) {
        return [];
    }

    const fileContent = fs.readFileSync(historyPath, 'utf8');
    const { data } = Papa.parse(fileContent, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
    });

    return data as Holding[];
}

function computeDiff(current: Holding[], previous: Holding[]): HoldingsDiff | null {
    if (!previous || previous.length === 0) return null;

    const currentMap = new Map<string, Holding>();
    const previousMap = new Map<string, Holding>();

    // Using composite key: ETF Ticker + Holding Ticker
    current.forEach(h => currentMap.set(`${h['ETF Ticker']}_${h.Ticker}`, h));
    previous.forEach(h => previousMap.set(`${h['ETF Ticker']}_${h.Ticker}`, h));

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

            // Flag if weight changed by more than 0.1% or shares changed explicitly
            if (Math.abs(weightDelta) > 0.1 || sharesChanged) {
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

// Helper to find the most recent valid history file if exactly yesterday isn't present 
// (e.g. weekends, holidays)
function getMostRecentHistoryBefore(currentData: Holding[], defaultSubDays: number): Holding[] {
    let daysBack = defaultSubDays;
    let attempts = 0;
    while (attempts < 5) {
        const targetDate = subDays(new Date(), daysBack);
        const history = getHistoricalHoldings(targetDate);
        if (history.length > 0) return history;
        daysBack++;
        attempts++;
    }
    return [];
}

export function getDailyDiff(): HoldingsDiff | null {
    const current = getLatestHoldings();
    if (current.length === 0) return null;
    const previous = getMostRecentHistoryBefore(current, 1);
    return computeDiff(current, previous);
}

export function getWeeklyDiff(): HoldingsDiff | null {
    const current = getLatestHoldings();
    if (current.length === 0) return null;
    const previous = getMostRecentHistoryBefore(current, 7);
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
