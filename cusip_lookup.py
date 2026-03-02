"""
CUSIP → Ticker lookup for TickerTrace.

Builds a mapping from CUSIP identifiers to stock ticker symbols using:
1. Cross-fund data — existing holdings CSVs already contain 1,300+ CUSIP→ticker pairs
2. SEC EDGAR fallback — free API for CUSIPs not in our data
3. JSON cache — persists resolved mappings to avoid repeated lookups

Usage:
    from cusip_lookup import CusipLookup
    cl = CusipLookup()
    ticker = cl.resolve("88080T104")  # -> "WULF"
"""

import csv
import json
import os
import re
import sqlite3
import time
from typing import Optional

import requests

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
CACHE_PATH = os.path.join(DATA_DIR, "cusip_cache.json")
DB_PATH = os.path.join(DATA_DIR, "holdings.db")
HISTORY_DIR = os.path.join(SCRIPT_DIR, "etf-dashboard", "public", "data", "history")

# CUSIPs to skip (money market funds, cash equivalents)
SKIP_CUSIPS = {
    "Cash&Other", "", "CASH", "OTHER",
}

USER_AGENT = "Mozilla/5.0 (TickerTrace/1.0; +https://tickertrace.mphinance.com)"


class CusipLookup:
    def __init__(self, auto_seed: bool = True):
        self._cache: dict[str, str] = {}
        self._load_cache()
        if auto_seed:
            self._seed_from_existing_data()

    # ─── Cache persistence ──────────────────────────────────────────

    def _load_cache(self):
        """Load cached CUSIP→ticker mappings from JSON file."""
        if os.path.exists(CACHE_PATH):
            try:
                with open(CACHE_PATH) as f:
                    self._cache = json.load(f)
            except (json.JSONDecodeError, IOError):
                self._cache = {}

    def _save_cache(self):
        """Persist the CUSIP→ticker cache to disk."""
        os.makedirs(os.path.dirname(CACHE_PATH), exist_ok=True)
        with open(CACHE_PATH, "w") as f:
            json.dump(self._cache, f, indent=2, sort_keys=True)

    # ─── Seeding from existing fund data ────────────────────────────

    def _seed_from_existing_data(self):
        """
        Extract CUSIP→ticker pairs from our existing holdings data.
        Funds like ULTY, ARK, Kurv already include proper tickers+CUSIPs.
        """
        added = 0

        # 1. Seed from history CSVs
        if os.path.isdir(HISTORY_DIR):
            for fname in os.listdir(HISTORY_DIR):
                if fname.endswith(".csv"):
                    added += self._seed_from_csv(os.path.join(HISTORY_DIR, fname))

        # 2. Seed from latest CSV
        latest_csv = os.path.join(SCRIPT_DIR, "etf-dashboard", "public", "data", "holdings_latest.csv")
        if os.path.exists(latest_csv):
            added += self._seed_from_csv(latest_csv)

        # 3. Seed from SQLite DB (raw scraper data)
        if os.path.exists(DB_PATH):
            added += self._seed_from_db()

        if added > 0:
            self._save_cache()

    def _seed_from_csv(self, path: str) -> int:
        """Extract CUSIP→ticker pairs from a holdings CSV."""
        added = 0
        try:
            with open(path) as f:
                for row in csv.DictReader(f):
                    cusip = (row.get("CUSIP") or "").strip()
                    ticker = (row.get("Ticker") or row.get("StockTicker") or "").strip()
                    if self._is_valid_pair(cusip, ticker):
                        if cusip not in self._cache:
                            self._cache[cusip] = ticker
                            added += 1
        except Exception:
            pass
        return added

    def _seed_from_db(self) -> int:
        """Extract CUSIP→ticker pairs from the holdings SQLite DB."""
        added = 0
        try:
            conn = sqlite3.connect(DB_PATH)
            conn.row_factory = sqlite3.Row
            rows = conn.execute(
                "SELECT DISTINCT CUSIP, Ticker FROM Holdings WHERE CUSIP IS NOT NULL AND CUSIP != ''"
            ).fetchall()
            for row in rows:
                cusip = (row["CUSIP"] or "").strip()
                ticker = (row["Ticker"] or "").strip()
                if self._is_valid_pair(cusip, ticker):
                    if cusip not in self._cache:
                        self._cache[cusip] = ticker
                        added += 1
            conn.close()
        except Exception:
            pass
        return added

    @staticmethod
    def _is_valid_pair(cusip: str, ticker: str) -> bool:
        """Check if a CUSIP→ticker pair looks valid (not junk)."""
        if not cusip or not ticker:
            return False
        if cusip in SKIP_CUSIPS or ticker in SKIP_CUSIPS:
            return False
        junk = {"OTHER", "CASH", "nan", "None", "", "TBD", "DUMMY", "Cash&Other", "USD"}
        if ticker.upper() in junk:
            return False
        # Skip option-formatted tickers (e.g. "AAPL  250221P00150000")
        if len(ticker) > 15 or "  " in ticker:
            return False
        # CUSIP should be 9 chars (sometimes 8 without check digit)
        if len(cusip) < 6:
            return False
        return True

    # ─── Ticker cleanup ─────────────────────────────────────────────

    # Manual overrides for CUSIPs that OpenFIGI returns wrong/foreign tickers for
    MANUAL_OVERRIDES = {
        "N97284108": "NBIS",   # Nebius Group NV (Dutch-registered)
        "916896103": "UEC",    # Uranium Energy Corp (OpenFIGI returns "U6Z")
    }

    @staticmethod
    def _clean_ticker(ticker: str) -> str:
        """
        Normalize tickers returned by OpenFIGI.
        Strips exchange suffixes (e.g. "RKLB UQ" → "RKLB") and whitespace.
        """
        ticker = ticker.strip()
        # OpenFIGI sometimes returns "TICKER EXCHANGE" format
        if " " in ticker:
            ticker = ticker.split()[0]
        return ticker.upper()

    # ─── Lookup ─────────────────────────────────────────────────────

    def resolve(self, cusip: str) -> Optional[str]:
        """
        Resolve a CUSIP to a ticker symbol.
        Checks manual overrides, then local cache, then OpenFIGI API.
        """
        cusip = cusip.strip()
        if not cusip or cusip in SKIP_CUSIPS:
            return None

        # 0. Manual overrides
        if cusip in self.MANUAL_OVERRIDES:
            ticker = self.MANUAL_OVERRIDES[cusip]
            self._cache[cusip] = ticker
            return ticker

        # 1. Local cache
        if cusip in self._cache:
            return self._clean_ticker(self._cache[cusip])

        # 2. OpenFIGI fallback
        ticker = self._lookup_openfigi(cusip)
        if ticker:
            ticker = self._clean_ticker(ticker)
            self._cache[cusip] = ticker
            self._save_cache()
            return ticker

        return None

    def resolve_batch(self, cusips: list[str]) -> dict[str, str]:
        """Resolve a batch of CUSIPs. Returns {cusip: ticker} for resolved ones."""
        results = {}
        unresolved = []

        for cusip in cusips:
            cusip = cusip.strip()
            if not cusip or cusip in SKIP_CUSIPS:
                continue
            # Manual overrides
            if cusip in self.MANUAL_OVERRIDES:
                results[cusip] = self.MANUAL_OVERRIDES[cusip]
                self._cache[cusip] = self.MANUAL_OVERRIDES[cusip]
                continue
            if cusip in self._cache:
                results[cusip] = self._clean_ticker(self._cache[cusip])
            else:
                unresolved.append(cusip)

        # Batch resolve unresolved via OpenFIGI (with rate limiting)
        for cusip in unresolved:
            ticker = self._lookup_openfigi(cusip)
            if ticker:
                ticker = self._clean_ticker(ticker)
                self._cache[cusip] = ticker
                results[cusip] = ticker
            time.sleep(0.15)  # OpenFIGI rate limit: ~25 req/min

        if unresolved:
            self._save_cache()

        return results

    def _lookup_openfigi(self, cusip: str) -> Optional[str]:
        """
        Use OpenFIGI API to resolve a CUSIP to a ticker.
        Free tier: 25 requests/minute, no API key needed.
        """
        try:
            url = "https://api.openfigi.com/v3/mapping"
            payload = [{"idType": "ID_CUSIP", "idValue": cusip}]
            headers = {"Content-Type": "application/json"}
            resp = requests.post(url, json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                if data and isinstance(data, list) and len(data) > 0:
                    result = data[0]
                    if "data" in result and len(result["data"]) > 0:
                        ticker = result["data"][0].get("ticker")
                        if ticker:
                            return ticker.strip()
        except Exception:
            pass
        return None

    # ─── Stats ──────────────────────────────────────────────────────

    def stats(self) -> dict:
        return {
            "cached_mappings": len(self._cache),
            "cache_path": CACHE_PATH,
        }


# ─── CLI for testing / manual seeding ───────────────────────────────

if __name__ == "__main__":
    import sys

    cl = CusipLookup()
    print(f"Cache loaded: {cl.stats()}")

    if len(sys.argv) > 1:
        for cusip in sys.argv[1:]:
            ticker = cl.resolve(cusip)
            print(f"  {cusip} → {ticker or '???'}")
    else:
        # Demo: resolve ULTI's CUSIPs
        test_cusips = [
            "88080T104",  # TeraWulf
            "093712107",  # Bloom Energy
            "55024U109",  # Lumentum
            "767292105",  # Riot Platforms
            "19210854",   # Coeur Mining (truncated CUSIP)
        ]
        print("\nTest lookups:")
        results = cl.resolve_batch(test_cusips)
        for cusip, ticker in results.items():
            print(f"  {cusip} → {ticker}")

        unresolved = [c for c in test_cusips if c not in results]
        if unresolved:
            print(f"\nUnresolved: {unresolved}")
