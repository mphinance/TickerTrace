"""
CBOE Options Scanner

Detects newly optionable stocks and weekly-options promotions/demotions by
diffing CBOE's published option universe against the previous run.

Two detection layers:
  Layer 1 — ALL OPTIONABLE: diffs the CBOE Symbol Directory (~5,300 stocks)
            to catch a stock getting options listed for the FIRST time.
  Layer 2 — WEEKLY OPTIONS: diffs CBOE's "Available Weeklys" list (~670
            tickers, split into ETFs and equities) to catch promotions to
            (or removals from) weekly expirations.

Standalone — does NOT read TickerTrace holdings data. It only fetches two
CSVs from CBOE and diffs them against the prior snapshot.

Storage (under etf-dashboard/public/data/ — the dir the API container mounts):
  cboe_snapshot.json          — latest universe, overwritten each run
  cboe_history/YYYY-MM-DD.json — one scan result per day (skips initial baseline)

Run daily via GitHub Actions:  python cboe_scanner.py
"""

import glob
import json
import logging
import os
import time
import urllib.request
from datetime import datetime, timezone

# ─── Constants ───────────────────────────────────────────────────────────────

CBOE_WEEKLYS_URL = "https://www.cboe.com/available_weeklys/get_csv_download/"
CBOE_SYMBOL_DIR_URL = (
    "https://www.cboe.com/us/options/symboldir/equity_index_options/?download=csv"
)

HTTP_HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; TickerTrace/1.0)",
    "Accept": "text/csv, text/plain, */*",
}
FETCH_TIMEOUT = 60  # seconds

DATA_DIR = os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "etf-dashboard", "public", "data"
)
SNAPSHOT_PATH = os.path.join(DATA_DIR, "cboe_snapshot.json")
HISTORY_DIR = os.path.join(DATA_DIR, "cboe_history")

log = logging.getLogger("cboe_scanner")


def _empty_diff() -> dict:
    return {
        "optionable": {"new": {}, "removed": {}},
        "weeklyEtfs": {"new": {}, "removed": {}},
        "weeklyEquities": {"new": {}, "removed": {}},
    }


# ─── CSV fetching & parsing ──────────────────────────────────────────────────

def fetch_cboe_data(url: str) -> str:
    """Fetch a CBOE CSV. Uses stdlib urllib so this module stays dependency-free
    and can be imported by the API container (which has no `requests`)."""
    req = urllib.request.Request(url, headers=HTTP_HEADERS)
    with urllib.request.urlopen(req, timeout=FETCH_TIMEOUT) as resp:
        if resp.status != 200:
            raise RuntimeError(f"CBOE fetch failed: {resp.status} {resp.reason}")
        return resp.read().decode("utf-8", errors="replace")


def parse_csv_line(line: str) -> list[str]:
    """Minimal CSV line parser that handles quoted fields."""
    result: list[str] = []
    current = ""
    in_quotes = False
    for char in line:
        if char == '"':
            in_quotes = not in_quotes
        elif char == "," and not in_quotes:
            result.append(current)
            current = ""
        else:
            current += char
    result.append(current)
    return result


def parse_symbol_directory(raw: str) -> dict[str, str]:
    """Parse the CBOE Symbol Directory CSV (ALL optionable stocks).
    Format: Company Name, Stock Symbol, DPM Name, Post/Station, GTH DPM"""
    result: dict[str, str] = {}
    for line in raw.split("\n"):
        stripped = line.strip()
        if not stripped:
            continue
        parts = parse_csv_line(stripped)
        if len(parts) < 2:
            continue
        name = parts[0].strip()
        ticker = parts[1].strip()
        # Skip header row
        if ticker == "Stock Symbol" or name == "Company Name":
            continue
        # Skip non-ticker rows (indices, etc.)
        if not ticker or not ticker[0].isalpha():
            continue
        result[ticker] = name
    return result


def parse_weeklys_csv(raw: str) -> dict[str, dict[str, str]]:
    """Parse the CBOE Available Weeklys CSV into ETF and equity sections."""
    etfs: dict[str, str] = {}
    equities: dict[str, str] = {}
    current_section: str | None = None

    for line in raw.split("\n"):
        stripped = line.strip()

        if "Exchange Traded Products" in stripped or "ETFs and ETNs" in stripped:
            current_section = "etfs"
            continue
        if stripped.startswith("Available Weeklys - Equity"):
            current_section = "equities"
            continue

        if not stripped or current_section is None:
            continue

        parts = parse_csv_line(stripped)
        if len(parts) < 2:
            continue
        ticker = parts[0].strip()
        name = parts[1].strip()

        # Skip non-ticker rows
        if not ticker or not ticker[0].isalpha():
            continue
        if any(c in ticker for c in "(/ \t"):
            continue

        if current_section == "etfs":
            etfs[ticker] = name
        else:
            equities[ticker] = name

    return {"etfs": etfs, "equities": equities}


# ─── Snapshot persistence ────────────────────────────────────────────────────

def load_snapshot() -> dict | None:
    if not os.path.exists(SNAPSHOT_PATH):
        return None
    try:
        with open(SNAPSHOT_PATH) as fh:
            return json.load(fh)
    except (json.JSONDecodeError, OSError):
        return None


def save_snapshot(
    all_optionable: dict[str, str],
    weekly_etfs: dict[str, str],
    weekly_equities: dict[str, str],
) -> None:
    os.makedirs(DATA_DIR, exist_ok=True)
    snapshot = {
        "lastUpdated": datetime.now(timezone.utc).isoformat(),
        "allOptionable": all_optionable,
        "weeklyEtfs": weekly_etfs,
        "weeklyEquities": weekly_equities,
    }
    with open(SNAPSHOT_PATH, "w") as fh:
        json.dump(snapshot, fh, separators=(",", ":"))


# ─── History persistence ─────────────────────────────────────────────────────

def persist_scan_result(result: dict) -> None:
    """Write a scan result to cboe_history/YYYY-MM-DD.json.
    Skips the initial baseline (nothing to diff against yet). One file per
    day — a same-day re-run overwrites. Failures are logged, not raised."""
    if result["isInitial"]:
        return
    try:
        os.makedirs(HISTORY_DIR, exist_ok=True)
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        path = os.path.join(HISTORY_DIR, f"{date_str}.json")
        with open(path, "w") as fh:
            json.dump(result, fh, indent=2)
    except OSError as e:
        log.error("Failed to persist scan result: %s", e)


def read_history(days: int = 7) -> list[dict]:
    """Return the most recent `days` scan results, newest first."""
    if not os.path.isdir(HISTORY_DIR):
        return []
    files = sorted(glob.glob(os.path.join(HISTORY_DIR, "*.json")), reverse=True)
    results: list[dict] = []
    for path in files[:days]:
        try:
            with open(path) as fh:
                results.append(json.load(fh))
        except (json.JSONDecodeError, OSError):
            continue
    return results


def read_options_listings(days: int = 7) -> dict:
    """API payload — the last `days` of scan history plus the newest scan."""
    history = read_history(days)
    return {
        "status": "ok",
        "latest": history[0] if history else None,
        "history": history,
    }


# ─── Diff engine ─────────────────────────────────────────────────────────────

def diff_sets(
    current: dict[str, str], previous: dict[str, str]
) -> dict[str, dict[str, str]]:
    curr_keys = set(current)
    prev_keys = set(previous)
    new_entries = {k: current[k] for k in curr_keys - prev_keys}
    removed_entries = {k: previous.get(k) or "?" for k in prev_keys - curr_keys}
    return {
        "new": dict(sorted(new_entries.items())),
        "removed": dict(sorted(removed_entries.items())),
    }


def diff_all(
    all_optionable: dict[str, str],
    weekly_etfs: dict[str, str],
    weekly_equities: dict[str, str],
    previous: dict,
) -> dict:
    return {
        "optionable": diff_sets(all_optionable, previous.get("allOptionable") or {}),
        "weeklyEtfs": diff_sets(weekly_etfs, previous.get("weeklyEtfs") or {}),
        "weeklyEquities": diff_sets(
            weekly_equities, previous.get("weeklyEquities") or {}
        ),
    }


# ─── Main scan entrypoint ────────────────────────────────────────────────────

def run_cboe_scan() -> dict:
    """Fetch both CBOE CSVs, diff against the snapshot, save the new snapshot,
    persist a history file, and return the structured scan result."""
    log.info("[CBOE] Fetching Symbol Directory (all optionable)...")
    raw_sym_dir = fetch_cboe_data(CBOE_SYMBOL_DIR_URL)
    all_optionable = parse_symbol_directory(raw_sym_dir)
    log.info("   -> %d optionable stocks", len(all_optionable))

    log.info("[CBOE] Fetching Available Weeklys...")
    raw_weeklys = fetch_cboe_data(CBOE_WEEKLYS_URL)
    weeklys = parse_weeklys_csv(raw_weeklys)
    log.info(
        "   -> %d weekly ETFs, %d weekly equities",
        len(weeklys["etfs"]),
        len(weeklys["equities"]),
    )

    previous = load_snapshot()
    if previous is None:
        log.info("[CBOE] No previous snapshot — creating initial baseline.")
        diff = _empty_diff()
        is_initial = True
    else:
        diff = diff_all(
            all_optionable, weeklys["etfs"], weeklys["equities"], previous
        )
        is_initial = False

    total_changes = sum(
        len(layer["new"]) + len(layer["removed"]) for layer in diff.values()
    )
    has_changes = total_changes > 0

    save_snapshot(all_optionable, weeklys["etfs"], weeklys["equities"])

    if is_initial:
        log.info("[CBOE] Initial snapshot saved.")
    elif has_changes:
        log.info("[CBOE] Snapshot updated (%d change(s)).", total_changes)
    else:
        log.info("[CBOE] Snapshot unchanged (no diffs).")

    result = {
        "date": datetime.now(timezone.utc).isoformat(),
        "isInitial": is_initial,
        "totals": {
            "allOptionable": len(all_optionable),
            "weeklyEtfs": len(weeklys["etfs"]),
            "weeklyEquities": len(weeklys["equities"]),
        },
        "diff": diff,
        "hasChanges": has_changes,
    }

    persist_scan_result(result)
    return result


def generate_report(result: dict) -> str:
    """Human-readable report string for logs."""
    date = result["date"][:10]
    lines = [
        f"CBOE Options Scanner — {date}",
        "-" * 55,
        f"All Optionable: {result['totals']['allOptionable']}  |  "
        f"Weekly ETFs: {result['totals']['weeklyEtfs']}  |  "
        f"Weekly Equities: {result['totals']['weeklyEquities']}",
        "",
    ]
    has_changes = False

    new_opt = sorted(result["diff"]["optionable"]["new"].items())
    if new_opt:
        has_changes = True
        lines.append(f"NEWLY OPTIONABLE — First-Time Options ({len(new_opt)}):")
        lines += [f"  + {t:<8} — {n}" for t, n in new_opt]
        lines.append("")

    removed_opt = sorted(result["diff"]["optionable"]["removed"].items())
    if removed_opt:
        has_changes = True
        lines.append(f"OPTIONS REMOVED ({len(removed_opt)}):")
        lines += [f"  - {t:<8} — {n}" for t, n in removed_opt]
        lines.append("")

    for label, key in (("ETFs", "weeklyEtfs"), ("EQUITIES", "weeklyEquities")):
        new_entries = sorted(result["diff"][key]["new"].items())
        if new_entries:
            has_changes = True
            lines.append(f"NEW WEEKLY {label} ({len(new_entries)}):")
            lines += [f"  + {t:<8} — {n}" for t, n in new_entries]
            lines.append("")
        removed_entries = sorted(result["diff"][key]["removed"].items())
        if removed_entries:
            has_changes = True
            lines.append(f"REMOVED WEEKLY {label} ({len(removed_entries)}):")
            lines += [f"  - {t:<8} — {n}" for t, n in removed_entries]
            lines.append("")

    if not has_changes:
        lines.append("No changes since last scan.")

    lines.append("-" * 55)
    return "\n".join(lines)


def main() -> None:
    logging.basicConfig(
        level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s"
    )
    start = time.perf_counter()
    log.info("[CBOE Job] Starting daily CBOE options scan...")
    try:
        result = run_cboe_scan()
    except Exception:
        log.exception("[CBOE Job] Scan failed")
        raise

    elapsed_ms = round((time.perf_counter() - start) * 1000)
    if result["isInitial"]:
        log.info("[CBOE Job] Initial baseline created in %dms.", elapsed_ms)
    elif result["hasChanges"]:
        log.info("\n%s", generate_report(result))
        log.info("[CBOE Job] Scan complete in %dms — changes detected.", elapsed_ms)
    else:
        log.info(
            "[CBOE Job] Scan complete in %dms — no changes detected.", elapsed_ms
        )


if __name__ == "__main__":
    main()
