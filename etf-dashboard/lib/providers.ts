/**
 * Static reference data — fund → provider map, AUM table, display ordering.
 *
 * This file has NO server-only imports (no `fs`, no `path`, no `papaparse`)
 * specifically so client components can import from it without dragging the
 * whole CSV-reading layer into the browser bundle. lib/holdings.ts (server
 * only) re-exports these for back-compat.
 *
 * The authoritative source of truth for the provider mapping is
 * api/data.py's FUND_PROVIDERS. Keep this file in sync.
 */

export const FUND_PROVIDERS: Record<string, string> = {
    AVUV: 'Avantis', AVLV: 'Avantis', AVMV: 'Avantis',
    ARKK: 'ARK Invest', ARKQ: 'ARK Invest', ARKW: 'ARK Invest',
    ARKG: 'ARK Invest', ARKF: 'ARK Invest', ARKX: 'ARK Invest',
    KYLD: 'Kurv', KQQQ: 'Kurv',
    ULTY: 'YieldMax', SLTY: 'YieldMax',
    ULTI: 'REX Shares',
    BLOX: 'Tidal / NicholasX',
    EGGQ: 'Tidal / NestYield', EGGY: 'Tidal / NestYield', EGGS: 'Tidal / NestYield',
    // Weekly pay suite
    MSTW: 'Roundhill', NVDW: 'Roundhill', COIW: 'Roundhill',
    TSLW: 'Roundhill', HOOW: 'Roundhill', PLTW: 'Roundhill',
    QDTE: 'Roundhill', XDTE: 'Roundhill', RDTE: 'Roundhill', YBTC: 'Roundhill',
    MSTY: 'YieldMax', NVDY: 'YieldMax', CONY: 'YieldMax',
    TSLY: 'YieldMax', HOOY: 'YieldMax', PLTY: 'YieldMax',
    MSII: 'REX Shares', NVII: 'REX Shares', COII: 'REX Shares',
    TSII: 'REX Shares', HOII: 'REX Shares', PLTI: 'REX Shares',
    // Corgi Funds — thematic + founder-led (launched May 2026)
    EUV: 'Corgi Funds', CMAG: 'Corgi Funds', CQTM: 'Corgi Funds',
    XA: 'Corgi Funds', EYES: 'Corgi Funds', KYC: 'Corgi Funds',
    GNMX: 'Corgi Funds', AV: 'Corgi Funds', DOCK: 'Corgi Funds',
    WATS: 'Corgi Funds', GLAM: 'Corgi Funds', NYNY: 'Corgi Funds',
    STYL: 'Corgi Funds', WNDR: 'Corgi Funds', FDRS: 'Corgi Funds',
    FDRX: 'Corgi Funds',
    // Sprott — actively managed precious metals miners
    GBUG: 'Sprott',
};

export const PROVIDER_ORDER = [
    'Avantis', 'ARK Invest', 'Corgi Funds', 'Sprott', 'Kurv', 'YieldMax',
    'REX Shares', 'Roundhill', 'Tidal / NicholasX', 'Tidal / NestYield',
];

// Passive ETFs removed from scraping — filter any residual data from CSVs
export const EXCLUDED_FUNDS = new Set(['IBIT', 'IVV', 'IWM']);

// Approximate AUM in $B — used for conviction-weighting and as a /B label
// on the fund profile page. Updated manually; not authoritative.
export const FUND_AUM: Record<string, number> = {
    AVUV: 12.5, AVLV: 3.2, AVMV: 0.8,
    ARKK: 6.8, ARKQ: 1.1, ARKW: 1.5, ARKG: 1.8, ARKF: 0.9, ARKX: 0.3,
    KYLD: 0.15, KQQQ: 0.08,
    ULTY: 0.6, SLTY: 0.02, ULTI: 0.1, BLOX: 0.05,
    EGGQ: 0.06, EGGY: 0.02, EGGS: 0.02,
    MSTW: 0.05, NVDW: 0.04, COIW: 0.03, TSLW: 0.04, HOOW: 0.02, PLTW: 0.03,
    QDTE: 0.3, XDTE: 0.2, RDTE: 0.1, YBTC: 0.1,
    MSTY: 1.1, NVDY: 1.3, CONY: 0.4, TSLY: 0.9, HOOY: 0.05, PLTY: 0.05,
    MSII: 0.03, NVII: 0.04, COII: 0.03, TSII: 0.03, HOII: 0.02, PLTI: 0.02,
    EUV: 0.05, CMAG: 0.05, CQTM: 0.05, XA: 0.05, EYES: 0.05,
    KYC: 0.05, GNMX: 0.05, AV: 0.05, DOCK: 0.05, WATS: 0.05,
    GLAM: 0.05, NYNY: 0.05, STYL: 0.05, WNDR: 0.05, FDRS: 0.05, FDRX: 0.05,
    // Sprott
    GBUG: 0.16,
};

export function getProvider(fund: string): string {
    return FUND_PROVIDERS[fund] ?? 'Other';
}

/**
 * Fund-family category. Mirrors api/data.py's get_fund_category(). Derived
 * from the provider map above, so there's no second table to keep in sync.
 *
 *   active-equity  — picks stocks; the signal is conviction over a week/month
 *   option-income  — sells options for yield; the option book is the story
 */
export type FundCategory = 'active-equity' | 'option-income';

const OPTION_INCOME_PROVIDERS = new Set<string>([
    'Kurv', 'YieldMax', 'REX Shares', 'Roundhill',
    'Tidal / NestYield', 'Tidal / NicholasX',
]);

export function getFundCategory(fund: string): FundCategory {
    return OPTION_INCOME_PROVIDERS.has(getProvider(fund))
        ? 'option-income'
        : 'active-equity';
}
