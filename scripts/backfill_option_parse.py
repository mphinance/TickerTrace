#!/usr/bin/env python3
"""
backfill_option_parse.py — repair option rows that predate the OCC root fix.

Why this exists
───────────────
`parse_option()` in scrape_avantis.py required an all-alpha OCC root
(`^([A-Z]+)`), which rejected the exchange-prefixed roots that Kurv, Roundhill,
REX, YieldMax and NicholasX actually publish ("2MU  260918C00950000",
"4NDX  260918C02250000"). Most such rows were rescued by the descriptive-name
regex; Roundhill's FLEX index options were not, because their name carries both
a digit-prefixed root and a trailing " FLX".

The result: those legs were written to history with every option column blank,
so downstream code treated them as ordinary equity holdings. RDTE's single
largest position — 45.8% of the fund — and 44.9% of QDTE were filed as stock.

Fixing only the scraper leaves history wrong, and the first post-fix scrape then
reads as a phantom event: a 45.8% equity position "exiting" and an option
"opening" on the same day. So we repair the existing snapshots too.

What it fills
─────────────
  Underlying_Ticker, Option_Strike, Option_Expiry, Option_Type, DTE

DTE is derived from (Option_Expiry - snapshot date), which is deterministic.

What it deliberately does NOT fill
──────────────────────────────────
  Underlying_Price, Moneyness

Those need the underlying's spot price *as of that historical session*, which we
cannot reconstruct honestly after the fact. They stay blank; the UI already has
to handle missing moneyness (it is absent for 13 funds for unrelated reasons).

Only rows whose Option_Type is currently blank AND which now parse are touched.
Rows that already parsed are left byte-identical.

Usage:
    python3 scripts/backfill_option_parse.py --dry-run
    python3 scripts/backfill_option_parse.py
"""

import argparse
import csv
import datetime
import glob
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HISTORY_DIR = os.path.join(REPO, "etf-dashboard", "public", "data", "history")

OPTION_COLS = ("Underlying_Ticker", "Option_Strike", "Option_Expiry", "Option_Type", "DTE")


def _load_parse_option():
    """Import parse_option without dragging in the scraper's heavy deps."""
    src = open(os.path.join(REPO, "scrape_avantis.py")).read()
    start = src.index("def parse_option")
    end = src.index("\ndef ", start + 10)
    ns = {"re": re, "datetime": datetime}
    exec(src[start:end], ns)
    return ns["parse_option"]


def _snapshot_date(path: str):
    m = re.search(r"holdings_(\d{4}-\d{2}-\d{2})\.csv$", os.path.basename(path))
    if not m:
        return None
    try:
        return datetime.datetime.strptime(m.group(1), "%Y-%m-%d").date()
    except ValueError:
        return None


def backfill_file(path: str, parse_option, dry_run: bool) -> tuple[int, dict]:
    as_of = _snapshot_date(path)
    with open(path, newline="") as fh:
        reader = csv.DictReader(fh)
        fieldnames = reader.fieldnames or []
        rows = list(reader)

    if not all(c in fieldnames for c in OPTION_COLS):
        return 0, {}

    fixed = 0
    by_fund: dict[str, int] = {}

    for row in rows:
        if (row.get("Option_Type") or "").strip():
            continue  # already parsed — leave untouched
        opt = parse_option(row.get("Name"), row.get("Ticker"))
        if not opt:
            continue

        row["Underlying_Ticker"] = opt["underlying"]
        row["Option_Strike"] = opt["strike"]
        row["Option_Expiry"] = opt["expiry"]
        row["Option_Type"] = opt["type"]

        if as_of:
            try:
                expiry = datetime.datetime.strptime(opt["expiry"], "%Y-%m-%d").date()
                row["DTE"] = float((expiry - as_of).days)
            except ValueError:
                pass

        fixed += 1
        fund = row.get("ETF Ticker", "?")
        by_fund[fund] = by_fund.get(fund, 0) + 1

    if fixed and not dry_run:
        tmp = path + ".tmp"
        with open(tmp, "w", newline="") as fh:
            writer = csv.DictWriter(fh, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(rows)
        os.replace(tmp, path)

    return fixed, by_fund


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true", help="report without writing")
    args = ap.parse_args()

    parse_option = _load_parse_option()

    targets = sorted(glob.glob(os.path.join(HISTORY_DIR, "holdings_*.csv")))
    for extra in ("holdings_latest.csv",):
        p = os.path.join(REPO, "etf-dashboard", "public", "data", extra)
        if os.path.exists(p):
            targets.append(p)
    root_csv = os.path.join(REPO, "normalized_holdings.csv")
    if os.path.exists(root_csv):
        targets.append(root_csv)

    total = 0
    totals_by_fund: dict[str, int] = {}
    touched_files = 0

    for path in targets:
        fixed, by_fund = backfill_file(path, parse_option, args.dry_run)
        if fixed:
            touched_files += 1
            total += fixed
            for f, n in by_fund.items():
                totals_by_fund[f] = totals_by_fund.get(f, 0) + n
            print(f"{os.path.basename(path):32} {fixed:4} rows  {dict(sorted(by_fund.items()))}")

    verb = "would repair" if args.dry_run else "repaired"
    print(f"\n{verb} {total} option rows across {touched_files} files")
    if totals_by_fund:
        print("by fund:", dict(sorted(totals_by_fund.items(), key=lambda x: -x[1])))


if __name__ == "__main__":
    main()
