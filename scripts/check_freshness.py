#!/usr/bin/env python3
"""
Data-freshness canary.

Hits the live API's /health, reads `asOfDate`, and fails (exit 1) only if the
data is more than ONE business day stale — so a normal weekend/Monday never
trips it, but a genuine freeze (the "~a week stale" failure of 2026-06-09)
does. Quiet and exit 0 when fresh.

Usage:
    python3 scripts/check_freshness.py [API_BASE]
    # default API_BASE = https://api.tickertrace.pro
"""
import datetime
import json
import sys
import urllib.request

API_BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://api.tickertrace.pro").rstrip("/")
MAX_BUSINESS_DAY_LAG = 1  # alert when the live data is >1 business day behind

def business_days_between(start: datetime.date, end: datetime.date) -> int:
    """Count weekdays strictly after `start` up to and including `end`."""
    days, d = 0, start
    while d < end:
        d += datetime.timedelta(days=1)
        if d.weekday() < 5:  # Mon–Fri
            days += 1
    return days

def main() -> int:
    url = f"{API_BASE}/health"
    try:
        with urllib.request.urlopen(url, timeout=20) as resp:
            payload = json.load(resp)
    except Exception as e:
        print(f"::error::Freshness canary could not reach {url}: {e}")
        return 1

    asof_str = payload.get("asOfDate")
    if not asof_str:
        print(f"::error::/health returned no asOfDate: {payload}")
        return 1

    asof = datetime.date.fromisoformat(asof_str)
    today = datetime.datetime.now(datetime.timezone.utc).date()
    lag = business_days_between(asof, today)
    print(f"Live API: {API_BASE} | asOfDate={asof} | today(UTC)={today} | business-day lag={lag}")

    if lag > MAX_BUSINESS_DAY_LAG:
        print(f"::error::STALE DATA — live site is {lag} business days behind (asOf {asof}). "
              f"The daily scrape or the box self-sync (sync_data.sh) likely broke.")
        return 1

    print("✅ Data is fresh.")
    return 0

if __name__ == "__main__":
    sys.exit(main())
