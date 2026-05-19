/**
 * Typed client for the TickerTrace public API (FastAPI on Vultr).
 *
 * As of review #10 (May 2026 finale) the FastAPI server is feature-complete
 * for the dashboard: briefing, activity, streaks, and enriched signals all
 * live on the API side. This client mirrors those response shapes 1:1 so the
 * Next.js dashboard can render directly from the API without holdings.ts.
 *
 * Base URL: NEXT_PUBLIC_API_URL or api.tickertrace.pro.
 * Inside the Next.js app, /api/v1/* also works via the rewrite in next.config.ts.
 */

export const API_BASE =
    process.env.NEXT_PUBLIC_API_URL ?? "https://api.tickertrace.pro";

// ─── Shared row types ───────────────────────────────────────────────────────

export type ChangeType = "NEW" | "REMOVED" | "CHANGED";

export interface ApiOptionDetails {
    type: string;
    strike: number;
    expiry: string;
    underlying?: string;
}

export interface ApiChangeRecord {
    fund: string;
    ticker: string;
    name: string;
    sector: string;
    weightDelta: number;
    sharesDelta: number;
    currentWeight: number;
    previousWeight: number;
    currentShares: number;
    previousShares: number;
    type: ChangeType;
    isOption: boolean;
    optionDetails?: ApiOptionDetails;
}

export interface ApiFundDetailRow {
    fund: string;
    weightDelta: number;
    currentWeight: number;
    type: ChangeType;
}

// ─── Endpoint response types ────────────────────────────────────────────────

export interface ApiStats {
    fundsTracked: number;
    uniqueTickers: number;
    optionsContracts: number;
    putCallRatio: number;
}

export interface ApiSignal {
    ticker: string;
    name: string;
    sector: string;
    /** Legacy: aggregate weight delta. Same value as totalWeightDelta. */
    weightDelta: number;
    /** Legacy: list of fund names. Prefer fundDetails for richer info. */
    funds: string[];
    providers: string[];
    /** Legacy: AUM-weighted conviction (kept for back-compat). */
    conviction: number;
    direction: "buying" | "selling";
    // Enriched (review #10):
    fundDetails: ApiFundDetailRow[];
    fundCount: number;
    providerCount: number;
    totalWeightDelta: number;
    avgWeightDelta: number;
    convictionScore: number;
    streak: number | null;
}

export interface ApiSignals {
    buying: ApiSignal[];
    selling: ApiSignal[];
}

export interface ApiSectorEntry {
    sector: string;
    delta: number;
}

export interface ApiSectorFlow {
    inflows: ApiSectorEntry[];
    outflows: ApiSectorEntry[];
}

export interface ApiDivergenceFund {
    fund: string;
    provider: string;
    weightDelta: number;
}

export interface ApiDivergence {
    ticker: string;
    name: string;
    // Legacy:
    buying: string[];
    selling: string[];
    // Enriched:
    buyingFunds: ApiDivergenceFund[];
    sellingFunds: ApiDivergenceFund[];
    intrashop: boolean;
}

export interface ApiActivity {
    accumulating: ApiChangeRecord[];
    reducing: ApiChangeRecord[];
    optionsActivity: ApiChangeRecord[];
}

export interface ApiOptionSignal {
    strategy: string;
    directionalView: string;
    moneyness: string;
}

export interface ApiBriefing {
    topBuys: ApiSignal[];
    topSells: ApiSignal[];
    crossFundConvergence: ApiSignal[];
    activeStreaks: {
        fund: string;
        ticker: string;
        days: number;
        direction: "up" | "down";
    }[];
    notableOptions: {
        record: ApiChangeRecord;
        signal: ApiOptionSignal;
    }[];
}

export interface ApiFundSummary {
    fund: string;
    provider: string;
    aum: number | null;
}

export interface ApiFundDetail {
    fund: string;
    provider: string;
    aum: number | null;
    holdingsCount: number;
    optionsCount: number;
    totalWeight: number;
    topHoldings: {
        ticker: string;
        name: string;
        weight: number;
        shares: number;
        sector: string;
        weightDelta: number;
        sharesDelta: number;
    }[];
    recentChanges: ApiChangeRecord[];
}

export interface ApiTickerHolding {
    fund: string;
    provider: string;
    weight: number;
    shares: number;
    isOption: boolean;
    optionDetails?: ApiOptionDetails;
}

export interface ApiTickerDetail {
    ticker: string;
    name: string;
    sector: string;
    fundCount: number;
    holdings: ApiTickerHolding[];
    totalWeight: number;
    changes: ApiChangeRecord[];
}

export interface ApiFullPayload {
    _meta: {
        endpoint: string;
        description: string;
        source: string;
    };
    asOfDate: string;
    stats: ApiStats;
    signals: ApiSignals;
    changes: ApiChangeRecord[];
    sectorFlow: ApiSectorFlow;
    divergences: ApiDivergence[];
    briefing: ApiBriefing;
    activity: ApiActivity;
}

export interface ApiTraderDaddyHandoff {
    name: string;
    tagline: string;
    url: string;
    why: string;
    is_referral: boolean;
}

export interface ApiPerformanceAggregate {
    /** Median forward return on the underlying. e.g. 0.0209 = +2.09%. */
    medianReturn: number;
    /** Fraction of signals where the direction matched the price move. */
    winRate: number;
    /** Number of signals in this bucket. */
    n: number;
}

export interface ApiSignalPerformance {
    asOf: string;
    generatedAt: string;
    lookbackDays: number;
    totalSignals: number;
    withReturns: number;
    overall: {
        buying: ApiPerformanceAggregate;
        selling: ApiPerformanceAggregate;
    };
    byProvider: Record<string, {
        buying: ApiPerformanceAggregate;
        selling: ApiPerformanceAggregate;
    }>;
}

// ─── Fetch wrapper ──────────────────────────────────────────────────────────

interface ApiOptions {
    /** Next.js revalidation in seconds. Defaults to 1 hour. */
    revalidate?: number;
    /** Throw on non-2xx (default true). Set false to return null on 404 etc. */
    throwOnError?: boolean;
}

async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T | null> {
    const { revalidate = 3600, throwOnError = true } = opts;
    const url = `${API_BASE}${path}`;
    try {
        const res = await fetch(url, { next: { revalidate } });
        if (!res.ok) {
            if (throwOnError) {
                throw new Error(`API ${res.status} on ${path}: ${await res.text().catch(() => res.statusText)}`);
            }
            return null;
        }
        return res.json() as Promise<T>;
    } catch (e) {
        // Network-level failures (DNS, TLS, connect refused) land here.
        // Honor throwOnError so callers using { throwOnError: false } get
        // the same graceful-null behavior they already get for 4xx/5xx.
        if (throwOnError) throw e;
        return null;
    }
}

// ─── Endpoint wrappers ──────────────────────────────────────────────────────

export const api = {
    /** Full headline payload — signals, changes, sector flow, divergences, briefing, activity. */
    signals: (opts?: ApiOptions) =>
        apiFetch<ApiFullPayload>("/api/v1/signals", opts),

    stats: (opts?: ApiOptions) =>
        apiFetch<ApiStats>("/api/v1/stats", opts),

    sectors: (opts?: ApiOptions) =>
        apiFetch<ApiSectorFlow>("/api/v1/sectors", opts),

    divergences: (opts?: ApiOptions) =>
        apiFetch<ApiDivergence[]>("/api/v1/divergences", opts),

    briefing: (opts?: ApiOptions) =>
        apiFetch<ApiBriefing>("/api/v1/briefing", opts),

    activity: (period: "daily" | "weekly" = "daily", opts?: ApiOptions) =>
        apiFetch<ApiActivity>(`/api/v1/activity?period=${period}`, opts),

    funds: (opts?: ApiOptions) =>
        apiFetch<{ funds: ApiFundSummary[] }>("/api/v1/funds", opts),

    fund: (ticker: string, opts?: ApiOptions) =>
        apiFetch<ApiFundDetail>(`/api/v1/fund/${encodeURIComponent(ticker)}`, {
            throwOnError: false,
            ...opts,
        }),

    ticker: (ticker: string, opts?: ApiOptions) =>
        apiFetch<ApiTickerDetail>(`/api/v1/ticker/${encodeURIComponent(ticker)}`, {
            throwOnError: false,
            ...opts,
        }),

    changes: (
        params: { provider?: string; fund?: string; direction?: "buying" | "selling"; limit?: number } = {},
        opts?: ApiOptions,
    ) => {
        const qs = new URLSearchParams();
        if (params.provider) qs.set("provider", params.provider);
        if (params.fund) qs.set("fund", params.fund);
        if (params.direction) qs.set("direction", params.direction);
        if (params.limit) qs.set("limit", String(params.limit));
        const query = qs.toString();
        return apiFetch<{ asOfDate: string; count: number; changes: ApiChangeRecord[] }>(
            `/api/v1/changes${query ? `?${query}` : ""}`,
            opts,
        );
    },

    traderdaddy: (opts?: ApiOptions) =>
        apiFetch<ApiTraderDaddyHandoff>("/api/v1/traderdaddy", opts),

    signalPerformance: (opts?: ApiOptions) =>
        apiFetch<ApiSignalPerformance>("/api/v1/signal-performance", {
            throwOnError: false,
            ...opts,
        }),

    holdings: (opts?: ApiOptions) =>
        apiFetch<{
            asOfDate: string;
            count: number;
            holdings: {
                fund: string;
                ticker: string;
                name: string;
                sector: string;
                weight: number;
                shares: number;
                weightDelta: number;
                sharesDelta: number;
                isOption: boolean;
                cusip: string;
            }[];
        }>("/api/v1/holdings", opts),
};
