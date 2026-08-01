"""
Parametrized tests for _is_junk_ticker (api/data.py).

This filter is consulted by every downstream calculation (signals, changes,
divergences, sector flow). Getting it wrong shows up as either:
  - Junk in user-facing data (CUSIPs, money-market funds)
  - Real tickers silently disappearing

Review #13 rewrote this filter to use a positive allowlist on ticker shape.
These tests pin the behavior so we don't regress.
"""

import pytest

from api.data import _is_junk_ticker


@pytest.mark.parametrize("ticker", [
    "AAPL", "TSLA", "NVDA", "MSFT", "AMZN",  # vanilla US tickers
    "BRK.A", "BRK.B",                          # dotted tickers
    "BF-A",                                    # hyphenated
    "F", "T", "X",                             # 1-character tickers
    "GOOG", "GOOGL",
    "AV",                                      # short ticker that previously got eaten
])
def test_real_tickers_pass(ticker):
    """Real, valid tickers should NOT be classified as junk."""
    assert _is_junk_ticker(ticker) is False, f"{ticker} was wrongly flagged as junk"


@pytest.mark.parametrize("ticker", [
    "",                       # empty
    "CASH",                   # cash placeholder
    "OTHER",
    "USD",
    "Cash&Other",             # case-insensitive
    "DUMMY",
    "TBD",
    "B",                      # known placeholder
    "WEEK",
])
def test_known_junk_caught(ticker):
    assert _is_junk_ticker(ticker) is True, f"{ticker} should be junk"


@pytest.mark.parametrize("ticker", [
    "912797RG4",               # raw 9-char CUSIP
    "912828ABC",               # treasury CUSIP
    "88160R101 TRS 031926 NM",  # TRS entry
    "12345678",                 # 8-digit numeric (CUSIP-like)
])
def test_cusips_and_trs_filtered(ticker):
    assert _is_junk_ticker(ticker) is True, f"{ticker} should be junk"


@pytest.mark.parametrize("ticker", [
    "FGXXX", "SPAXX", "TTTXX", "FZFXX", "VMFXX", "SWVXX",
])
def test_money_market_funds_filtered(ticker):
    assert _is_junk_ticker(ticker) is True, f"{ticker} is a money-market fund"


@pytest.mark.parametrize("ticker", [
    "1XYZ",   # starts with digit, fails shape (CUSIP-like)
    "@!#$",   # garbage symbols
    " ",      # whitespace only
])
def test_malformed_filtered(ticker):
    assert _is_junk_ticker(ticker) is True


def test_lowercase_normalized():
    """Filter should be case-insensitive on its allowlists."""
    assert _is_junk_ticker("cash") is True
    assert _is_junk_ticker("spaxx") is True
    assert _is_junk_ticker("aapl") is False  # valid


def test_whitespace_stripped():
    """Surrounding whitespace shouldn't matter."""
    assert _is_junk_ticker("  AAPL  ") is False
    assert _is_junk_ticker("  CASH  ") is True


# ─── Money-market leak ───────────────────────────────────────────────────────
# The allowlist silently missed AGPXX and FIGXX. AGPXX became the #1 buying
# signal on the dashboard (conviction 10.15) and FIGXX drove a top divergence
# that auto-expanded the card with an "intra-shop conflict" badge — two Kurv
# funds disagreeing about a money-market fund.
#
# A bare endsWith('XX') is not the fix: it eats IDXX (IDEXX Labs) and SPXX.
# Across every snapshot on disk, 5-char XX tickers are all money-market funds
# and shorter ones are all real securities.

@pytest.mark.parametrize("ticker", ["AGPXX", "FIGXX", "FGXXX", "SPAXX", "VMFXX"])
def test_money_market_funds_are_junk(ticker):
    assert _is_junk_ticker(ticker)


@pytest.mark.parametrize("ticker", ["IDXX", "SPXX"])
def test_short_xx_tickers_are_real_securities(ticker):
    """IDXX is IDEXX Laboratories. The old TS heuristic ate it."""
    assert not _is_junk_ticker(ticker)
