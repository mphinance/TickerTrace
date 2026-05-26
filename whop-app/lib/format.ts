/**
 * Display formatters shared across pages. Kept tiny and stringly-typed
 * so server components can pass results straight into JSX without
 * worrying about hydration mismatches.
 */

const PCT = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const PCT_UNSIGNED = new Intl.NumberFormat("en-US", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const COMPACT_USD = new Intl.NumberFormat("en-US", {
  notation: "compact",
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 1,
});

const INT = new Intl.NumberFormat("en-US");

/** Signed percent ("+1.23%"). Pass the raw fraction (0.0123). */
export const pct = (frac: number) => PCT.format(frac / 100);

/** Unsigned percent ("1.23%"). Pass the raw fraction (0.0123). */
export const pctUnsigned = (frac: number) => PCT_UNSIGNED.format(frac / 100);

/** Compact USD, e.g. "$1.2B". Null → "n/a". */
export const aum = (v: number | null) =>
  v == null ? "n/a" : COMPACT_USD.format(v);

/** Whole-number with thousands separators. */
export const int = (v: number) => INT.format(v);

/** A safe direction badge tone for buying/selling. */
export const directionTone = (d: "buying" | "selling") =>
  d === "buying"
    ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
    : "bg-rose-500/15 text-rose-300 border border-rose-500/30";
