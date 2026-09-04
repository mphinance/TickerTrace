#!/usr/bin/env python3
"""
Data-freshness canary.

Two independent checks against the live API's /health:

  DATA   `asOfDate` more than ONE business day stale — a normal weekend/Monday
         never trips it, but a genuine freeze (2026-06-09) does.

  CODE   `commit` behind origin/main by more than MAX_COMMITS_BEHIND. This
         exists because on 2026-09-03 the Vultr box sat FOUR PRs behind for
         hours while asOfDate stayed perfectly current: sync_data.sh hit a
         tracked local edit, correctly refused to force, and logged
         "ff-only merge BLOCKED" into a file nobody reads. Every check was
         green and the fix was not live. Fresh data proves nothing about
         whether the code serving it is current.

Usage:
    python3 scripts/check_freshness.py [API_BASE]
    # default API_BASE = https://api.tickertrace.pro
"""
import datetime
import json
import os
import sys
import urllib.request

API_BASE = (sys.argv[1] if len(sys.argv) > 1 else "https://api.tickertrace.pro").rstrip("/")
MAX_BUSINESS_DAY_LAG = 1   # alert when the live DATA is >1 business day behind
MAX_COMMITS_BEHIND = 5     # alert when the deployed CODE is >5 commits behind main.
                           # The box syncs every 15 min and the nightly scrape commits
                           # on its own, so being 1-2 behind is normal transient lag.
REPO = "tradernetwork/etf-holdings-tracker"

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

    failed = False
    if lag > MAX_BUSINESS_DAY_LAG:
        print(f"::error::STALE DATA — live site is {lag} business days behind (asOf {asof}). "
              f"The daily scrape or the box self-sync (sync_data.sh) likely broke.")
        failed = True
    else:
        print("✅ Data is fresh.")

    if check_code_drift(payload.get("commit")):
        failed = True

    return 1 if failed else 0


def check_code_drift(commit: str | None) -> bool:
    """True if the DEPLOYED COMMIT is too far behind main. Never fails the run
    on an inconclusive answer — an unreachable GitHub API or an image built
    before GIT_SHA existed is not evidence of a freeze."""
    if not commit or commit == "unknown":
        print("::warning::/health reports no commit — the image predates GIT_SHA, "
              "or sync_data.sh did not pass it. Code drift cannot be checked.")
        return False

    url = f"https://api.github.com/repos/{REPO}/compare/{commit}...main"
    req = urllib.request.Request(url, headers={"Accept": "application/vnd.github+json"})
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            behind = json.load(resp).get("behind_by")
    except Exception as e:
        print(f"::warning::Could not compare deployed commit against main: {e}")
        return False

    if behind is None:
        print("::warning::GitHub compare returned no behind_by; skipping drift check.")
        return False

    print(f"Deployed commit {commit[:8]} is {behind} commit(s) behind main.")
    if behind > MAX_COMMITS_BEHIND:
        print(f"::error::STALE CODE — the box is running a build {behind} commits behind "
              f"main while its data looks current. Check sync_data.sh's log on the box: "
              f"tail /var/log/tickertrace-sync.log — an 'ff-only merge BLOCKED' line means "
              f"a tracked local edit is stopping the pull.")
        return True

    print("✅ Deployed code is current.")
    return False

if __name__ == "__main__":
    sys.exit(main())
