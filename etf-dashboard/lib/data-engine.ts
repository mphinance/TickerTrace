import Papa, { type ParseResult } from 'papaparse';

export interface Holding {
    Date: string;
    'ETF Ticker': string;
    Name: string;
    Ticker: string;
    'Security Type': string;
    'Share Quantity': number;
    'Market Value': number;
    Weight: number;
    CUSIP?: string;
    ISIN?: string;
    SEDOL?: string;
    Sector?: string;
    Country?: string;
    Coupon?: string;
    'Maturity Date'?: string;
}

export interface OptionDetails {
    underlying: string;
    strike: number;
    expiry: string;
    type: 'Call' | 'Put';
    originalName: string;
}

export interface PortfolioStats {
    totalAum: number;
    holdingCount: number;
    topEtf: { ticker: string; weight: number };
    majorChanges: {
        gainers: { ticker: string; delta: number }[];
        losers: { ticker: string; delta: number }[];
    };
}

export interface OptionGroup {
    underlying: string;
    putCallRatio: number;
    sentiment: 'Bullish' | 'Bearish' | 'Neutral';
    totalContracts: number;
    options: {
        ticker: string;
        details: OptionDetails;
        heldBy: string[]; // List of ETFs holding this option
        quantity: number;
    }[];
}

export const parseCSV = async (url: string = '/normalized_holdings.csv'): Promise<Holding[]> => {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: (header: string) => header.trim(),
            complete: (results: ParseResult<Holding>) => {
                // Filter out malformed rows and standardise data
                const data = results.data as Holding[];
                resolve(data.filter(row => row.Date && row['ETF Ticker']));
            },
            error: (error: Error) => reject(error),
        });
    });
};

export const parseOption = (name: string, ticker: string): OptionDetails | null => {
    // Common patterns:
    // 1. "Ticker YYMMDD[C/P]Strike" (OCC format in Ticker col) -> "AAPL 230120C00150000"
    // 2. "Underlying Expiry Strike Type" (Name col) -> "NVDA 03/20/2026 185 C"

    // Pattern 1: OCC style in Ticker (e.g., TSLA  250221P00360000 or similar variants)
    // Sometimes scraped as "ALAB 260213P00130000"
    const occRegex = /^([A-Z]+)\s*(\d{2})(\d{2})(\d{2})([CP])(\d{8})$/;

    // Pattern 2: Descriptive Name (e.g., "NVDA 03/20/2026 185 C")
    const descRegex = /^([A-Z]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+(?:\.\d+)?)\s+([CP])$/;

    // Clean inputs
    const cleanTicker = ticker ? ticker.toString().trim() : '';
    const cleanName = name ? name.toString().trim().replace(/\s+/g, ' ') : '';

    let match = cleanTicker.match(occRegex);
    if (match) {
        const [_, underlying, yy, mm, dd, typeChar, strikeStr] = match;
        const strike = parseInt(strikeStr) / 1000;
        const year = `20${yy}`;
        const expiry = `${mm}/${dd}/${year}`;
        return {
            underlying,
            strike,
            expiry,
            type: typeChar === 'C' ? 'Call' : 'Put',
            originalName: cleanName || cleanTicker
        };
    }

    match = cleanName.match(descRegex);
    if (match) {
        const [_, underlying, expiry, strikeStr, typeChar] = match;
        return {
            underlying,
            strike: parseFloat(strikeStr),
            expiry,
            type: typeChar === 'C' ? 'Call' : 'Put',
            originalName: cleanName
        };
    }

    // Fallback for Kurv/YieldMax "Ticker" column details if they contain option info
    // Example: "AAPL 03/20/2026 280 C"
    match = cleanName.match(/^([A-Z]+)\s+(\d{2}\/\d{2}\/\d{4})\s+(\d+(?:\.\d+)?)\s+([CP])(?:all|ut)?$/i); // Relaxed regex
    if (match) {
        const [_, underlying, expiry, strikeStr, typeChar] = match;
        return {
            underlying,
            strike: parseFloat(strikeStr),
            expiry,
            type: typeChar.toUpperCase().startsWith('C') ? 'Call' : 'Put',
            originalName: cleanName
        };
    }

    return null;
};

export const getPortfolioStats = (holdings: Holding[]): PortfolioStats => {
    // 1. Total AUM
    const totalAum = holdings.reduce((sum, h) => sum + (h['Market Value'] || 0), 0);

    // 2. Count
    const holdingCount = holdings.length;

    // 3. Top ETF by Weight (Sum of weights per ETF)
    const etfWeights: Record<string, number> = {};
    holdings.forEach(h => {
        etfWeights[h['ETF Ticker']] = (etfWeights[h['ETF Ticker']] || 0) + (h['Market Value'] || 0);
    });

    let topEtf = { ticker: '', weight: 0 };
    Object.entries(etfWeights).forEach(([ticker, val]) => {
        if (val > topEtf.weight) topEtf = { ticker, weight: val };
    });

    // 4. Major Changes (Mock logic since we only have 1 date for now)
    // In a real app, compare current date vs previous date
    const majorChanges = {
        gainers: [] as { ticker: string; delta: number }[],
        losers: [] as { ticker: string; delta: number }[],
    };

    return { totalAum, holdingCount, topEtf, majorChanges };
};


export const groupOptions = (holdings: Holding[]): OptionGroup[] => {
    const groups: Record<string, OptionGroup> = {};

    holdings.forEach(h => {
        const details = parseOption(h.Name, h.Ticker);
        if (details) {
            if (!groups[details.underlying]) {
                groups[details.underlying] = {
                    underlying: details.underlying,
                    putCallRatio: 0,
                    sentiment: 'Neutral',
                    totalContracts: 0,
                    options: []
                };
            }
            // Check if this option spec already exists to just add the holder
            const existingOpt = groups[details.underlying].options.find(
                o => o.details.strike === details.strike &&
                    o.details.expiry === details.expiry &&
                    o.details.type === details.type
            );

            if (existingOpt) {
                if (!existingOpt.heldBy.includes(h['ETF Ticker'])) {
                    existingOpt.heldBy.push(h['ETF Ticker']);
                }
                existingOpt.quantity += h['Share Quantity'] || 0;
            } else {
                groups[details.underlying].options.push({
                    ticker: h.Ticker,
                    details,
                    heldBy: [h['ETF Ticker']],
                    quantity: h['Share Quantity'] || 0
                });
            }
        }
    });

    // Calculate Ratios
    Object.values(groups).forEach(g => {
        let puts = 0;
        let calls = 0;
        g.options.forEach(o => {
            // Absolute quantity to handle potential negative short positions correctly? 
            // Usually ratio is about volume/OI. Here we have holdings.
            // If we are short puts, that's bullish. LONG puts is bearish.
            // Let's assume standard P/C ratio logic based on absolute count for now, 
            // as determining intent from complex strategy is hard.
            // But visually "Bearish" usually means High P/C Ratio (More Puts).
            const qty = Math.abs(o.quantity);
            if (o.details.type === 'Put') puts += qty;
            else calls += qty;
        });

        g.totalContracts = puts + calls;
        g.putCallRatio = calls > 0 ? puts / calls : (puts > 0 ? 100 : 0); // Cap at 100 if no calls

        // P/C Ratio > 1.0 is often considered Bearish (more puts), < 0.7 Bullish.
        // However, huge institutional put selling (short puts) is Bullish. 
        // For this dashboard, let's stick to standard "High Ratio = Bearish" for the visual, 
        // as requested by the "TraderDaddy" screenshot style.
        if (g.putCallRatio > 1.1) g.sentiment = 'Bearish';
        else if (g.putCallRatio < 0.9) g.sentiment = 'Bullish';
        else g.sentiment = 'Neutral';
    });

    return Object.values(groups).sort((a, b) => b.totalContracts - a.totalContracts); // Sort by activity
};
