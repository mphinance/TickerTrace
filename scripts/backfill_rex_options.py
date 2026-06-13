#!/usr/bin/env python3
"""
backfill_rex_options.py — one-off repair for ULTI/REX option legs that were
silently dropped to untyped "OTHER" equity rows.

Root cause: REX intermittently served its options CSV with a descriptive name
("CLSK US 06/12/26 C16") and a blank ticker instead of the OCC option symbol.
The scraper's parse_option() didn't recognise that format (now fixed), so on
those days every option leg fell through unparsed.

The raw Name field still holds the full option description, and the short/long
sign survives on Share Quantity, so the legs are fully recoverable. For each
affected row this script:
  • re-parses Name -> underlying / strike / expiry / type (via the FIXED parser)
  • re-derives the underlying price from the fund's OWN equity holding in the
    same snapshot (market value / share quantity) — more faithful to the
    historical date than refetching a live price
  • recomputes DTE (from the snapshot date) and Moneyness, using the exact
    same conventions as scrape_avantis.enrich_with_analytics
  • synthesises the OCC ticker so the row is indistinguishable from a good day

Idempotent: only rows whose Option_Type is blank AND whose Name parses as an
option are touched, so re-running is a no-op.
"""
import csv
import datetime
import glob
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scrape_avantis import parse_option  # noqa: E402

HISTORY = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "etf-dashboard", "public", "data", "history",
)


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


def occ_ticker(underlying, expiry, otype, strike):
    yy, mm, dd = expiry[2:4], expiry[5:7], expiry[8:10]
    cp = "C" if otype == "Call" else "P"
    return f"{underlying.ljust(6)}{yy}{mm}{dd}{cp}{int(round(strike * 1000)):08d}"


def _serialize(values):
    """Serialize one row to a CSV line matching the source format exactly
    (Unix \\n endings, minimal quoting) so untouched columns stay byte-stable."""
    buf = io.StringIO()
    csv.writer(buf, lineterminator="\n", quoting=csv.QUOTE_MINIMAL).writerow(values)
    return buf.getvalue()


def process_file(path):
    # Read raw lines so every untouched line is preserved byte-for-byte.
    with open(path, newline="") as f:
        raw = f.readlines()
    if not raw:
        return 0
    fieldnames = next(csv.reader([raw[0]]))
    idx = {name: i for i, name in enumerate(fieldnames)}

    # Parse data rows once to build an (ETF, ticker) -> price map from equities.
    parsed = [next(csv.reader([line])) for line in raw[1:]]

    def col(vals, name):
        i = idx.get(name)
        return vals[i] if i is not None and i < len(vals) else None

    price_map = {}
    for vals in parsed:
        if (col(vals, "Option_Type") or "").strip():
            continue
        tk = (col(vals, "Ticker") or "").strip()
        sh, mv = _f(col(vals, "Share Quantity")), _f(col(vals, "Market Value"))
        if tk and tk not in ("OTHER", "CASH") and sh and mv and sh != 0:
            price_map[(col(vals, "ETF Ticker"), tk)] = abs(mv) / abs(sh)

    changed = 0
    for li, vals in enumerate(parsed):
        if len(vals) != len(fieldnames):
            continue  # never touch a row whose shape we don't fully understand
        if (col(vals, "Option_Type") or "").strip():
            continue  # already classified — leave it
        opt = parse_option(col(vals, "Name"), col(vals, "Ticker"))
        if not opt:
            continue

        etf = col(vals, "ETF Ticker")
        vals[idx["Underlying_Ticker"]] = opt["underlying"]
        vals[idx["Option_Strike"]] = opt["strike"]
        vals[idx["Option_Expiry"]] = opt["expiry"]
        vals[idx["Option_Type"]] = opt["type"]
        vals[idx["Ticker"]] = occ_ticker(opt["underlying"], opt["expiry"], opt["type"], opt["strike"])

        snap = (col(vals, "Date") or col(vals, "holding_date") or "").strip()
        try:
            snap_d = datetime.datetime.strptime(snap, "%Y-%m-%d").date()
            exp_d = datetime.datetime.strptime(opt["expiry"], "%Y-%m-%d").date()
            vals[idx["DTE"]] = (exp_d - snap_d).days
        except ValueError:
            pass

        up = price_map.get((etf, opt["underlying"]))
        if up and opt["strike"]:
            vals[idx["Underlying_Price"]] = up
            vals[idx["Moneyness"]] = (
                (up - opt["strike"]) / opt["strike"]
                if opt["type"] == "Call"
                else (opt["strike"] - up) / opt["strike"]
            )
        raw[li + 1] = _serialize(vals)  # replace ONLY this line
        changed += 1

    if changed:
        with open(path, "w", newline="") as f:
            f.writelines(raw)
    return changed


def main():
    total_files = total_rows = 0
    for path in sorted(glob.glob(os.path.join(HISTORY, "holdings_*.csv"))):
        n = process_file(path)
        if n:
            total_files += 1
            total_rows += n
            print(f"  {os.path.basename(path)}: recovered {n} option legs")
    print(f"\nDone: {total_rows} legs across {total_files} files.")


if __name__ == "__main__":
    main()
