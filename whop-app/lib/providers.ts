/**
 * Static reference: fund ticker → human-readable provider name.
 *
 * Pure display data, mirrors the same map in etf-dashboard/lib/holdings.ts.
 * Lives here so we don't have to drag the rest of holdings.ts into the
 * Whop app just for this lookup.
 */
export const FUND_PROVIDERS: Record<string, string> = {
  // Avantis
  AVUV: "Avantis",
  AVLV: "Avantis",
  AVMV: "Avantis",
  // ARK Invest
  ARKK: "ARK Invest",
  ARKQ: "ARK Invest",
  ARKW: "ARK Invest",
  ARKG: "ARK Invest",
  ARKF: "ARK Invest",
  ARKX: "ARK Invest",
  // Kurv
  KYLD: "Kurv",
  KQQQ: "Kurv",
  // YieldMax
  ULTY: "YieldMax",
  SLTY: "YieldMax",
  // REX Shares
  ULTI: "REX Shares",
  // NicholasX
  BLOX: "NicholasX",
  // NestYield
  EGGQ: "NestYield",
  EGGY: "NestYield",
  EGGS: "NestYield",
};

export const PROVIDER_ORDER = [
  "ARK Invest",
  "Avantis",
  "Kurv",
  "YieldMax",
  "REX Shares",
  "NestYield",
  "NicholasX",
];

export function getProvider(fund: string): string {
  return FUND_PROVIDERS[fund] ?? "Other";
}
