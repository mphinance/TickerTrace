"""
TickerTrace data layer — shared by FastAPI and FastMCP servers.

Reads CSV history files and computes signals, changes, sector flow,
divergences, streaks, briefings, and activity buckets. This is the
authoritative source of truth; `etf-dashboard/lib/holdings.ts` is deprecated
(review #10).
"""

import csv
import os
import re
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'etf-dashboard', 'public', 'data')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')

# IBIT/IVV/IWM: passive ETFs removed from scraping.
# MSII/COII/HOII/PLTI: REX Growth & Income funds liquidated 2026-06-16 (trading
# halted 2026-06-09). Filtered so their residual CSV history doesn't surface as
# stale/unlabeled rows. The history files are left on disk — reversible.
EXCLUDED_FUNDS = {'IBIT', 'IVV', 'IWM', 'MSII', 'COII', 'HOII', 'PLTI'}
JUNK_TICKERS = {'CASH', 'OTHER', 'USD', 'CASH&OTHER', '', 'DUMMY', 'TBD', 'B', 'WEEK', 'TBILL'}

# NYSE market holidays (YYYY-MM-DD in ET). Mirrors NYSE_HOLIDAYS in
# etf-dashboard/lib/marketHours.ts — keep the two in sync. Update annually.
# Streaks and week/month lookbacks count *trading days*, so non-market-day
# snapshot files (stray weekend scrapes, holiday runs) must be filtered out at
# read time — otherwise a "5-day streak" silently includes a Saturday, and a
# weekend bad-scrape pollutes the day-over-day delta.
_NYSE_HOLIDAYS = frozenset({
    # 2026
    '2026-01-01', '2026-01-19', '2026-02-16', '2026-04-03', '2026-05-25',
    '2026-06-19', '2026-07-03', '2026-09-07', '2026-11-26', '2026-12-25',
    # 2027
    '2027-01-01', '2027-01-18', '2027-02-15', '2027-03-26', '2027-05-31',
    '2027-06-18', '2027-07-05', '2027-09-06', '2027-11-25', '2027-12-24',
})


def _is_trading_day(iso: str) -> bool:
    """True if `iso` ('YYYY-MM-DD') is a weekday and not an NYSE holiday."""
    d = _parse_iso(iso)
    if d is None:
        return True  # unparseable — don't silently drop, let downstream handle
    return d.weekday() < 5 and iso not in _NYSE_HOLIDAYS

# Common money-market fund tickers — these end in 'XX'/'XXX' but the previous
# heuristic ('.endswith("XX")') matched random tickers too. Allowlist only.
_MONEY_MARKET_FUNDS = frozenset({
    'FGXXX', 'SPAXX', 'TTTXX', 'FZFXX', 'FDRXX', 'SPRXX', 'FNSXX',
    'VMFXX', 'VMRXX', 'VUSXX', 'SWVXX', 'SNAXX', 'SNVXX', 'SNOXX',
})

# Valid ticker shape: starts with a letter, 1-10 chars, alphanumeric + dot/dash.
# Anything that fails this is almost certainly a CUSIP / ISIN / placeholder.
_VALID_TICKER_RE = re.compile(r'^[A-Z][A-Z0-9.\-]{0,9}$')


def _is_junk_ticker(ticker: str) -> bool:
    """
    True if the ticker should be hidden — cash placeholders, money-market funds,
    raw CUSIPs, Total-Return-Swap entries.

    Review #13: positive-allowlist on ticker shape instead of a tower of
    heuristics that also caught valid international tickers.
    """
    if not ticker:
        return True
    t = ticker.strip().upper()
    if t in JUNK_TICKERS or t in _MONEY_MARKET_FUNDS:
        return True
    if ' TRS ' in t:  # "88160R101 TRS 031926 NM"
        return True
    # Anything not matching the real-ticker shape is almost certainly an identifier.
    if not _VALID_TICKER_RE.match(t):
        return True
    return False


# Bloomberg exchange suffixes (ARK funds use these: "RKLB UQ", "NU UN", etc.)
_BLOOMBERG_SUFFIX_RE = re.compile(r'\s+(?:UQ|UN|UW|UP|UA|FP|LN|GY|SJ|AU|CT|CN|JP|HK|SW|SS|IT|SM|NA|BB|PL|DC|NO|AV|ID|MK|TB|PM|IJ)$')

def _clean_ticker(ticker: str) -> str:
    """Strip Bloomberg exchange suffixes and whitespace from ticker strings."""
    return _BLOOMBERG_SUFFIX_RE.sub('', ticker.strip())


# ─── Significance thresholds (review #10 — porting from holdings.ts) ──────────
# Broad-index funds (AVUV/AVLV with 700+ holdings) need a smaller threshold to
# pick up real moves. Concentrated funds (ARK with 30-70 holdings) move bigger.
_BROAD_FUNDS = {'AVUV', 'AVLV'}
_SIGNIFICANCE_BROAD = 0.01           # 1 bp
_SIGNIFICANCE_CONCENTRATED = 0.02    # 2 bps


def _significance_threshold(fund: str) -> float:
    """Minimum weightDelta magnitude (percentage points) that counts as a signal."""
    return _SIGNIFICANCE_BROAD if fund in _BROAD_FUNDS else _SIGNIFICANCE_CONCENTRATED

FUND_PROVIDERS = {
    'AVUV': 'Avantis', 'AVLV': 'Avantis', 'AVMV': 'Avantis',
    'ARKK': 'ARK Invest', 'ARKQ': 'ARK Invest', 'ARKW': 'ARK Invest',
    'ARKG': 'ARK Invest', 'ARKF': 'ARK Invest', 'ARKX': 'ARK Invest',
    'KYLD': 'Kurv', 'KQQQ': 'Kurv',
    'ULTY': 'YieldMax',
    'SLTY': 'YieldMax',
    'ULTI': 'REX Shares',
    'BLOX': 'Tidal / NicholasX',
    'EGGQ': 'Tidal / NestYield',
    'EGGY': 'Tidal / NestYield',
    'EGGS': 'Tidal / NestYield',
    # Weekly pay suite
    'MSTW': 'Roundhill', 'NVDW': 'Roundhill', 'COIW': 'Roundhill',
    'TSLW': 'Roundhill', 'HOOW': 'Roundhill', 'PLTW': 'Roundhill',
    'QDTE': 'Roundhill', 'XDTE': 'Roundhill', 'RDTE': 'Roundhill', 'YBTC': 'Roundhill',
    'MSTY': 'YieldMax', 'NVDY': 'YieldMax', 'CONY': 'YieldMax',
    'TSLY': 'YieldMax', 'HOOY': 'YieldMax', 'PLTY': 'YieldMax',
    'NVII': 'REX Shares', 'TSII': 'REX Shares',
    # Corgi Funds — thematic + founder-led (launched May 2026)
    'EUV': 'Corgi Funds', 'CMAG': 'Corgi Funds', 'CQTM': 'Corgi Funds',
    'XA': 'Corgi Funds', 'EYES': 'Corgi Funds', 'KYC': 'Corgi Funds',
    'GNMX': 'Corgi Funds', 'AV': 'Corgi Funds', 'DOCK': 'Corgi Funds',
    'WATS': 'Corgi Funds', 'GLAM': 'Corgi Funds', 'NYNY': 'Corgi Funds',
    'STYL': 'Corgi Funds', 'WNDR': 'Corgi Funds', 'FDRS': 'Corgi Funds',
    'FDRX': 'Corgi Funds',
    # Sprott — actively managed precious metals miners
    'GBUG': 'Sprott',
}

FUND_AUM = {
    'ARKK': 6.8, 'ARKW': 1.8, 'ARKQ': 1.1, 'ARKG': 1.5, 'ARKF': 0.9, 'ARKX': 0.3,
    'AVUV': 12.5, 'AVLV': 3.2, 'AVMV': 0.8,
    'KYLD': 0.15, 'KQQQ': 0.1,
    'ULTY': 0.5, 'SLTY': 0.02, 'ULTI': 0.05, 'BLOX': 0.02,
    'EGGQ': 0.06, 'EGGY': 0.02, 'EGGS': 0.02,
    # Weekly pay suite
    'MSTW': 0.05, 'NVDW': 0.04, 'COIW': 0.03, 'TSLW': 0.04, 'HOOW': 0.02, 'PLTW': 0.03,
    'QDTE': 0.3, 'XDTE': 0.2, 'RDTE': 0.1, 'YBTC': 0.1,
    'MSTY': 1.1, 'NVDY': 1.3, 'CONY': 0.4, 'TSLY': 0.9, 'HOOY': 0.05, 'PLTY': 0.05,
    'NVII': 0.04, 'TSII': 0.03,
    # Corgi Funds (launched May 2026, AUM placeholder $50M each)
    'EUV': 0.05, 'CMAG': 0.05, 'CQTM': 0.05, 'XA': 0.05, 'EYES': 0.05,
    'KYC': 0.05, 'GNMX': 0.05, 'AV': 0.05, 'DOCK': 0.05, 'WATS': 0.05,
    'GLAM': 0.05, 'NYNY': 0.05, 'STYL': 0.05, 'WNDR': 0.05, 'FDRS': 0.05,
    'FDRX': 0.05,
    # Sprott
    'GBUG': 0.16,
}


# ─── Fund categories ─────────────────────────────────────────────
# Two fundamentally different fund types need different treatment:
#
#   active-equity  — the manager picks stocks. The signal a trader cares
#                    about is conviction over time: what's been accumulated
#                    over a week or a month, what positions were newly
#                    entered, what was fully exited. Daily noise matters less
#                    than the trend. (Avantis, ARK, Corgi Funds, Sprott.)
#
#   option-income  — the fund sells options for yield. Its equity book churns
#                    by design, so day-to-day holdings deltas are not a
#                    "signal" — the option strategy (covered calls / cash-
#                    secured puts, strikes, expiries) is the story.
#                    (Kurv, YieldMax, REX Shares, Roundhill, NestYield,
#                    NicholasX.)
_OPTION_INCOME_PROVIDERS = frozenset({
    'Kurv', 'YieldMax', 'REX Shares', 'Roundhill',
    'Tidal / NestYield', 'Tidal / NicholasX',
})


def get_fund_category(fund: str) -> str:
    """Return 'option-income' or 'active-equity' for a fund ticker.

    Derived from the fund's provider — see _OPTION_INCOME_PROVIDERS. Unknown
    funds default to 'active-equity'.
    """
    provider = FUND_PROVIDERS.get(fund, '')
    return 'option-income' if provider in _OPTION_INCOME_PROVIDERS else 'active-equity'


# Providers whose equity book is purely a vehicle for an options-income
# strategy — their stock holdings churn for the overlay, not from conviction.
# The institutional-flow aggregate excludes these entirely. Note this is a
# NARROWER exclusion than _OPTION_INCOME_PROVIDERS: NicholasX (BLOX) and
# NestYield (EGG*) are kept, because their equity books are real stock picks
# even though they run an option overlay on top.
_INCOME_ONLY_PROVIDERS = frozenset({'Kurv', 'YieldMax', 'REX Shares', 'Roundhill'})


def is_institutional_fund(fund: str) -> bool:
    """True if a fund's equity holdings reflect genuine stock-picking conviction.

    Excludes the pure option-income providers (Kurv, YieldMax, REX, Roundhill);
    keeps Avantis, ARK, Corgi, Sprott, plus the equity books of NicholasX
    (BLOX) and NestYield (EGG*). Unknown funds are treated as institutional.
    """
    return FUND_PROVIDERS.get(fund, '') not in _INCOME_ONLY_PROVIDERS


def _read_csv(path: str) -> list[dict]:
    """Read a holdings CSV, filter excluded funds, and dedupe to one row
    per (fund, ticker).

    Defensive dedup: some providers (notably the Corgi Funds JSON API) have
    historically returned multi-day time-series in a single snapshot file.
    Without collapsing, /api/v1/ticker/<symbol> ends up showing the same
    fund holding the same ticker N times. We keep the row with the most
    recent `holding_date` if present, otherwise the last row encountered
    (input order). An ETF holding the same ticker more than once at the
    same moment is always a data error, so this is safe to apply globally.
    """
    rows = []
    for r in csv.DictReader(open(path)):
        if r.get('ETF Ticker', '') not in EXCLUDED_FUNDS:
            rows.append(r)

    # Group by (fund, ticker) and keep the freshest row per group.
    seen: dict[tuple[str, str], dict] = {}
    for r in rows:
        key = (r.get('ETF Ticker', ''), r.get('Ticker', ''))
        existing = seen.get(key)
        if existing is None:
            seen[key] = r
            continue
        # Both rows present — pick the one with the later holding_date.
        # Empty / missing dates sort last, so a real date beats nothing.
        if r.get('holding_date', '') > existing.get('holding_date', ''):
            seen[key] = r
    return list(seen.values())


def _safe_float(v: str, default: float = 0.0) -> float:
    try:
        return float(v or '0')
    except (ValueError, TypeError):
        return default


def _nullable_float(v: str | None) -> float | None:
    """Parse a float, or None when the value is blank/missing.

    Distinct from _safe_float's 0.0: for option analytics a real 0 is
    meaningful (a 0-DTE contract, a perfectly at-the-money strike), so a
    missing value must not masquerade as one.
    """
    if v is None or str(v).strip() == '':
        return None
    try:
        return float(v)
    except (ValueError, TypeError):
        return None


def get_available_dates() -> list[str]:
    """Return sorted (newest-first) list of *trading-day* dates with history files.

    Non-market-day files (weekend scrapes, holiday runs) are filtered out so that
    streaks and week/month lookbacks count real trading days only.
    """
    files = [f for f in os.listdir(HISTORY_DIR) if f.startswith('holdings_') and f.endswith('.csv')]
    dates = [f.replace('holdings_', '').replace('.csv', '') for f in files]
    return sorted([d for d in dates if _is_trading_day(d)], reverse=True)


def get_as_of_date() -> str:
    dates = get_available_dates()
    return dates[0] if dates else 'unknown'


def get_latest_holdings() -> list[dict]:
    dates = get_available_dates()
    if not dates:
        return []
    return _read_csv(os.path.join(HISTORY_DIR, f'holdings_{dates[0]}.csv'))


def get_previous_holdings() -> list[dict]:
    dates = get_available_dates()
    if len(dates) < 2:
        return []
    return _read_csv(os.path.join(HISTORY_DIR, f'holdings_{dates[1]}.csv'))


def _parse_iso(s: str) -> date | None:
    """Parse a 'YYYY-MM-DD' history-file date; None if it can't be parsed."""
    try:
        return date.fromisoformat(s)
    except (ValueError, TypeError):
        return None


def _snapshot_for_lookback(days_back: int) -> list[dict]:
    """
    Holdings rows from the snapshot closest to `days_back` CALENDAR days
    before the latest snapshot.

    History files land on an irregular cadence — weekends are occasionally
    present, market holidays leave gaps — so counting files ("5 files ago")
    drifts away from the intended window. We instead pick the newest snapshot
    whose date is on or before (latest - days_back), and fall back to the
    oldest snapshot we have when history doesn't reach back that far.
    """
    dates = get_available_dates()  # ISO strings, newest-first
    if len(dates) < 2:
        return []
    latest = _parse_iso(dates[0])
    if latest is None:
        # Unparseable filename date — degrade gracefully to index-based lookup
        # (~5 trading days per 7 calendar days).
        idx = min(max(1, round(days_back * 5 / 7)), len(dates) - 1)
        return _read_csv(os.path.join(HISTORY_DIR, f'holdings_{dates[idx]}.csv'))
    target = latest - timedelta(days=days_back)
    chosen = None
    for d in dates[1:]:  # skip the latest snapshot itself
        pd = _parse_iso(d)
        if pd is not None and pd <= target:
            chosen = d
            break
    if chosen is None:
        chosen = dates[-1]  # not enough history — use the oldest snapshot we have
    return _read_csv(os.path.join(HISTORY_DIR, f'holdings_{chosen}.csv'))


def _build_map(rows: list[dict]) -> dict:
    m = {}
    for r in rows:
        raw_ticker = _clean_ticker(r.get('Ticker', ''))
        key = (r.get('ETF Ticker', ''), raw_ticker)
        m[key] = {
            'fund': r.get('ETF Ticker', ''),
            'ticker': raw_ticker,
            'name': r.get('Name', ''),
            'sector': r.get('Sector', ''),
            'weight': _safe_float(r.get('Weight', '0')),
            'shares': _safe_float(r.get('Share Quantity', '0')),
            'option_type': r.get('Option_Type', ''),
            'underlying': r.get('Underlying_Ticker', ''),
            'strike': r.get('Option_Strike', ''),
            'expiry': r.get('Option_Expiry', ''),
        }
    return m


def _changes_between(curr_rows: list[dict], prev_rows: list[dict], *, include_options: bool = False) -> list[dict]:
    """
    Compute change records between two holdings snapshots.

    By default options are excluded (matches existing /api/v1/changes contract).
    Pass include_options=True to get a richer payload with `isOption` and
    `optionDetails` — used by /api/v1/activity and /api/v1/briefing.
    """
    curr = _build_map(curr_rows)
    prev = _build_map(prev_rows)
    changes: list[dict] = []

    def _record(c: dict, kind: str, weight_delta: float, shares_delta: float,
                prev_weight: float = 0.0, prev_shares: float = 0.0) -> dict:
        is_option = bool(c.get('option_type'))
        rec: dict = {
            'fund': c['fund'],
            'ticker': c['ticker'],
            'name': c['name'],
            'sector': c['sector'],
            'weightDelta': round(weight_delta, 4),
            'sharesDelta': round(shares_delta, 2),
            'currentWeight': round(c['weight'], 4),
            'previousWeight': round(prev_weight, 4),
            'currentShares': round(c['shares'], 2),
            'previousShares': round(prev_shares, 2),
            'type': kind,
            'isOption': is_option,
        }
        if include_options and is_option:
            rec['optionDetails'] = {
                'type': c.get('option_type', ''),
                'strike': _safe_float(c.get('strike', '0')),
                'expiry': c.get('expiry', ''),
                'underlying': c.get('underlying', ''),
            }
        return rec

    for key, c in curr.items():
        if c['option_type']:
            if not include_options:
                continue
            # Option tickers (e.g. "NVDA  260522C00200000") are deliberately
            # "junk-shaped" — they must skip the equity junk-ticker filter,
            # which otherwise drops every option row even when include_options.
        elif _is_junk_ticker(c['ticker']):
            continue
        p = prev.get(key)
        if p:
            wd = c['weight'] - p['weight']
            sd = c['shares'] - p['shares']
            if abs(wd) > 0.0001 or abs(sd) > 0:
                changes.append(_record(c, 'CHANGED', wd, sd,
                                       prev_weight=p['weight'], prev_shares=p['shares']))
        elif c['weight'] > 0 or (c['option_type'] and (c['weight'] != 0 or c['shares'] != 0)):
            # Equities count as NEW only with positive weight; an option can be
            # written (negative weight), so any non-zero position counts.
            changes.append(_record(c, 'NEW', c['weight'], c['shares']))

    for key, p in prev.items():
        if p['option_type']:
            if not include_options:
                continue
        elif _is_junk_ticker(p['ticker']):
            continue
        if key in curr:
            continue
        # The "removed" record uses the previous snapshot's fields
        c_like = {**p, 'weight': 0.0, 'shares': 0.0}
        changes.append(_record(c_like, 'REMOVED', -p['weight'], -p['shares'],
                               prev_weight=p['weight'], prev_shares=p['shares']))

    changes.sort(key=lambda x: -abs(x['weightDelta']))
    return changes


def compute_daily_changes() -> list[dict]:
    """Compute all changes between the two most recent days (equities only)."""
    return _changes_between(get_latest_holdings(), get_previous_holdings(), include_options=False)


def compute_daily_changes_with_options() -> list[dict]:
    """Daily changes including option rows, with optionDetails attached."""
    return _changes_between(get_latest_holdings(), get_previous_holdings(), include_options=True)


def compute_weekly_changes(*, include_options: bool = False) -> list[dict]:
    """Changes between today and the snapshot closest to 7 calendar days ago.

    A position present today but absent a week ago surfaces as a NEW change;
    one present a week ago but gone today surfaces as REMOVED — that's the
    week-over-week "entered / exited a position" view.
    """
    older = _snapshot_for_lookback(7)
    if not older:
        return []
    return _changes_between(get_latest_holdings(), older, include_options=include_options)


def compute_monthly_changes(*, include_options: bool = False) -> list[dict]:
    """Changes between today and the snapshot closest to 30 calendar days ago.

    Same NEW / REMOVED semantics as compute_weekly_changes, over a month —
    the right horizon for slower-moving active-equity funds (Avantis, ARK).
    """
    older = _snapshot_for_lookback(30)
    if not older:
        return []
    return _changes_between(get_latest_holdings(), older, include_options=include_options)


def _blend_institutional(rows: list[dict], total_aum: float) -> tuple[dict, dict, dict, dict]:
    """AUM-weighted blended portfolio weight per underlying ticker.

    Treats every institutional fund as one combined portfolio of size
    `total_aum` ($B). A ticker's blended weight is the sum over funds of
    (fund weight in % × fund AUM) / total_aum — i.e. the percentage of the
    combined institutional book sitting in that ticker. Options rows, junk
    tickers, income-only funds, and funds with no AUM figure are skipped.

    Returns (blended_weight, name, sector, funds_holding) keyed by ticker.
    """
    weight: dict[str, float] = defaultdict(float)
    name: dict[str, str] = {}
    sector: dict[str, str] = {}
    funds: dict[str, set] = defaultdict(set)
    for r in rows:
        if r.get('Option_Type'):
            continue
        fund = r.get('ETF Ticker', '')
        if not is_institutional_fund(fund):
            continue
        aum = FUND_AUM.get(fund, 0.0)
        if aum <= 0:
            continue
        ticker = _clean_ticker(r.get('Ticker', ''))
        if _is_junk_ticker(ticker):
            continue
        weight[ticker] += _safe_float(r.get('Weight', '0')) * aum / total_aum
        name.setdefault(ticker, r.get('Name', ''))
        sector.setdefault(ticker, r.get('Sector', ''))
        funds[ticker].add(fund)
    return weight, name, sector, funds


def compute_institutional_flow(period: str = 'daily', limit: int = 25) -> dict:
    """Cross-fund 'institutions as a whole' flow over a daily/weekly/monthly window.

    Blends every stock-picking fund (income funds excluded) into one
    AUM-weighted portfolio and reports how the combined weight of each ticker
    shifted over the window — the net buying/selling of institutions in
    aggregate. Positive weightDelta = the combined book grew its position.
    """
    latest = get_latest_holdings()
    if period == 'weekly':
        older = _snapshot_for_lookback(7)
    elif period == 'monthly':
        older = _snapshot_for_lookback(30)
    else:
        period = 'daily'
        older = get_previous_holdings()

    empty = {'period': period, 'asOfDate': get_as_of_date(),
             'fundCount': 0, 'totalAum': 0.0, 'buying': [], 'selling': []}
    if not latest or not older:
        return empty

    # Fixed denominator across both snapshots: the AUM of institutional funds
    # present today. Using one constant keeps the day-vs-window delta apples-to-
    # apples — a fund absent from the older snapshot simply contributes 0 then,
    # which correctly surfaces a freshly built position.
    inst_funds = {r.get('ETF Ticker', '') for r in latest
                  if is_institutional_fund(r.get('ETF Ticker', ''))}
    total_aum = sum(FUND_AUM.get(f, 0.0) for f in inst_funds)
    if total_aum <= 0:
        return empty

    new_w, name, sector, funds_now = _blend_institutional(latest, total_aum)
    old_w, _, _, _ = _blend_institutional(older, total_aum)

    rows: list[dict] = []
    for ticker in set(new_w) | set(old_w):
        delta = new_w.get(ticker, 0.0) - old_w.get(ticker, 0.0)
        if round(delta, 4) == 0:
            continue
        rows.append({
            'ticker': ticker,
            'name': name.get(ticker, ''),
            'sector': sector.get(ticker, ''),
            'blendedWeight': round(new_w.get(ticker, 0.0), 4),
            'previousBlendedWeight': round(old_w.get(ticker, 0.0), 4),
            'weightDelta': round(delta, 4),
            'fundCount': len(funds_now.get(ticker, set())),
            'funds': sorted(funds_now.get(ticker, set())),
            'direction': 'buying' if delta > 0 else 'selling',
        })

    buying = sorted([r for r in rows if r['weightDelta'] > 0],
                    key=lambda x: -x['weightDelta'])[:limit]
    selling = sorted([r for r in rows if r['weightDelta'] < 0],
                     key=lambda x: x['weightDelta'])[:limit]
    return {
        'period': period,
        'asOfDate': get_as_of_date(),
        'fundCount': len(inst_funds),
        'totalAum': round(total_aum, 2),
        'buying': buying,
        'selling': selling,
    }


def _trend_signal(monthly: float, weekly: float, daily: float) -> str:
    """Classify an accumulation/distribution trajectory from the dominant
    (monthly) trend versus the most recent (daily) move.

      accumulating          monthly up, still buying today
      distribution-starting monthly up but selling today — the topping signal
      distributing          monthly down, still selling today
      bottoming             monthly down but buying today
    """
    if monthly >= 0:
        return 'accumulating' if daily >= 0 else 'distribution-starting'
    return 'distributing' if daily <= 0 else 'bottoming'


def compute_institutional_trend(limit: int = 15) -> dict:
    """Per-ticker institutional flow across all three horizons at once.

    Blends every stock-picking fund into one AUM-weighted book (income funds
    excluded — see is_institutional_fund) and, for each ticker, reports the
    change in its blended weight over the day, week, and month using ONE fixed
    denominator (today's institutional AUM) so the three are directly
    comparable and can be overlaid. Ranked by the monthly move — the dominant
    trend — so sustained accumulation and fresh distribution both surface.
    """
    latest = get_latest_holdings()
    mo = _snapshot_for_lookback(30)
    empty = {'asOfDate': get_as_of_date(), 'fundCount': 0, 'tickers': []}
    if not latest or not mo:
        return empty

    inst_funds = {r.get('ETF Ticker', '') for r in latest
                  if is_institutional_fund(r.get('ETF Ticker', ''))}
    total_aum = sum(FUND_AUM.get(f, 0.0) for f in inst_funds)
    if total_aum <= 0:
        return empty

    cur_w, name, sector, funds_now = _blend_institutional(latest, total_aum)
    prev = get_previous_holdings()
    wk = _snapshot_for_lookback(7)
    prev_w = _blend_institutional(prev, total_aum)[0] if prev else {}
    wk_w = _blend_institutional(wk, total_aum)[0] if wk else {}
    mo_w = _blend_institutional(mo, total_aum)[0]

    rows = []
    for t in set(cur_w) | set(mo_w):
        cur = cur_w.get(t, 0.0)
        daily = cur - prev_w.get(t, 0.0)
        weekly = cur - wk_w.get(t, 0.0)
        monthly = cur - mo_w.get(t, 0.0)
        if round(monthly, 4) == 0 and round(weekly, 4) == 0 and round(daily, 4) == 0:
            continue
        rows.append({
            'ticker': t,
            'name': name.get(t, ''),
            'sector': sector.get(t, ''),
            'blendedWeight': round(cur, 4),
            'daily': round(daily, 4),
            'weekly': round(weekly, 4),
            'monthly': round(monthly, 4),
            'fundCount': len(funds_now.get(t, set())),
            'signal': _trend_signal(monthly, weekly, daily),
        })

    rows.sort(key=lambda x: -abs(x['monthly']))
    return {
        'asOfDate': get_as_of_date(),
        'fundCount': len(inst_funds),
        'tickers': rows[:limit],
    }


def get_global_stats() -> dict:
    latest = get_latest_holdings()
    funds = set()
    tickers = set()
    options = 0
    puts = 0
    calls = 0

    for r in latest:
        funds.add(r.get('ETF Ticker', ''))
        if r.get('Option_Type', ''):
            options += 1
            if r.get('Option_Type', '') == 'Put':
                puts += 1
            elif r.get('Option_Type', '') == 'Call':
                calls += 1
        else:
            tickers.add(r.get('Ticker', ''))

    return {
        'fundsTracked': len(funds),
        'uniqueTickers': len(tickers),
        'optionsContracts': options,
        'putCallRatio': round(puts / calls, 2) if calls > 0 else 0,
    }


def _compute_streaks(max_days: int = 10) -> dict[tuple[str, str], int]:
    """
    Read up to `max_days` of history files and compute consecutive-day weight
    streaks per (fund, ticker). Positive = accumulating, negative = reducing.
    Only streaks of magnitude >= 2 are returned.

    Mirrors getStreaks() from holdings.ts (review #10).
    """
    dates = get_available_dates()
    if len(dates) < 2:
        return {}

    snapshots: list[dict[tuple[str, str], dict]] = []
    for d in dates[:max_days]:
        rows = _read_csv(os.path.join(HISTORY_DIR, f'holdings_{d}.csv'))
        snap = {
            (r.get('ETF Ticker', ''), _clean_ticker(r.get('Ticker', ''))): {
                'weight': _safe_float(r.get('Weight', '0')),
                'option_type': r.get('Option_Type', ''),
            }
            for r in rows
        }
        snapshots.append(snap)

    streaks: dict[tuple[str, str], int] = {}
    newest = snapshots[0]
    for key, curr in newest.items():
        if curr['option_type']:
            continue
        streak = 0
        for i in range(1, len(snapshots)):
            prev = snapshots[i].get(key)
            if prev is None:
                if streak == 0:
                    streak = 1
                break
            day_delta = snapshots[i - 1].get(key, {}).get('weight', 0.0) - prev['weight']
            if day_delta > 0.001:
                if streak >= 0:
                    streak += 1
                else:
                    break
            elif day_delta < -0.001:
                if streak <= 0:
                    streak -= 1
                else:
                    break
            else:
                break
        if abs(streak) >= 2:
            streaks[key] = streak
    return streaks


def _signals_from(changes: list[dict], streaks: dict[tuple[str, str], int] | None = None) -> dict:
    """
    Compute top buying/selling signals from a precomputed changes list.

    Enriched in review #10 finale: now includes per-fund details, fundCount,
    providerCount, totalWeightDelta, convictionScore, and streak — matching
    what the dashboard's holdings.ts produced. Original fields (ticker, name,
    weightDelta, funds, providers, conviction, direction) are retained for
    backwards-compat with existing API consumers.
    """
    if streaks is None:
        streaks = {}

    # Group equity changes by ticker (options live in their own bucket)
    by_ticker: dict[str, dict] = defaultdict(lambda: {
        'name': '', 'sector': '',
        'fundDetails': [],  # list of {fund, weightDelta, currentWeight, type}
    })
    for c in changes:
        if c.get('isOption') or _is_junk_ticker(c['ticker']):
            continue
        # Significance filter — small moves don't count
        threshold = _significance_threshold(c['fund'])
        if abs(c['weightDelta']) < threshold:
            continue
        entry = by_ticker[c['ticker']]
        entry['name'] = c['name'] or entry['name']
        entry['sector'] = c['sector'] or entry['sector']
        entry['fundDetails'].append({
            'fund': c['fund'],
            'weightDelta': c['weightDelta'],
            'currentWeight': c.get('currentWeight', 0.0),
            'type': c['type'],
        })

    signals: list[dict] = []
    for ticker, v in by_ticker.items():
        for direction_label, direction_filter in (('buying', lambda f: f['weightDelta'] > 0),
                                                   ('selling', lambda f: f['weightDelta'] < 0)):
            side_funds = [f for f in v['fundDetails'] if direction_filter(f)]
            if not side_funds:
                continue
            total_wd = sum(f['weightDelta'] for f in side_funds)
            providers = sorted({FUND_PROVIDERS.get(f['fund'], f['fund']) for f in side_funds})
            aum_total = sum(FUND_AUM.get(f['fund'], 0.01) for f in side_funds)
            avg_aum = aum_total / len(side_funds)
            # Streak — max abs streak across funds in this signal
            streak = 0
            for f in side_funds:
                s = streaks.get((f['fund'], ticker), 0)
                if abs(s) > abs(streak):
                    streak = s

            signals.append({
                'ticker': ticker,
                'name': v['name'],
                'sector': v['sector'],
                # Backwards-compatible fields:
                'weightDelta': round(total_wd, 4),
                'funds': [f['fund'] for f in side_funds],
                'providers': providers,
                'conviction': round(abs(total_wd) * aum_total * (1.5 if len(providers) > 1 else 1), 3),
                'direction': direction_label,
                # Enriched fields (review #10):
                'fundDetails': side_funds,
                'fundCount': len(side_funds),
                'providerCount': len(providers),
                'totalWeightDelta': round(total_wd, 4),
                'avgWeightDelta': round(total_wd / len(side_funds), 4),
                'convictionScore': round(len(side_funds) * abs(total_wd) * avg_aum, 4),
                'streak': abs(streak) if abs(streak) >= 2 else None,
            })

    # Two sort modes coexist:
    # - 'conviction' (legacy) is what the existing API consumer sees
    # - 'convictionScore' (new, dashboard-shaped) is the additive richer score
    # We sort by convictionScore since that's what the dashboard uses.
    signals.sort(key=lambda x: -x['convictionScore'])
    return {
        'buying': [s for s in signals if s['direction'] == 'buying'][:10],
        'selling': [s for s in signals if s['direction'] == 'selling'][:10],
    }


def _activity_from(changes: list[dict]) -> dict:
    """
    Bucket changes into accumulating / reducing / optionsActivity, applying
    the per-fund significance threshold. Mirrors getBuyingSelling() from
    holdings.ts.
    """
    accumulating: list[dict] = []
    reducing: list[dict] = []
    options_activity: list[dict] = []
    for r in changes:
        if _is_junk_ticker(r['ticker']):
            continue
        if r.get('isOption'):
            options_activity.append(r)
            continue
        if abs(r['weightDelta']) < _significance_threshold(r['fund']):
            continue
        (accumulating if r['weightDelta'] > 0 else reducing).append(r)

    accumulating.sort(key=lambda r: -r['weightDelta'])
    reducing.sort(key=lambda r: r['weightDelta'])
    options_activity.sort(key=lambda r: -abs(r['weightDelta']))
    return {
        'accumulating': accumulating,
        'reducing': reducing,
        'optionsActivity': options_activity,
    }


def _decode_option_signal(record: dict) -> dict | None:
    """Translate a covered call or cash-secured put record into plain English."""
    if not record.get('isOption') or 'optionDetails' not in record:
        return None
    opt = record['optionDetails']
    type_str = (opt.get('type') or '').lower()
    strike = opt.get('strike', 0)
    moneyness = 'OTM (likely)' if record.get('currentWeight', 0) > 0 else 'ATM/ITM'
    if type_str.startswith('p'):
        return {
            'strategy': 'Cash-Secured Put',
            'directionalView': f'Bullish above ${strike}',
            'moneyness': moneyness,
        }
    if type_str.startswith('c'):
        return {
            'strategy': 'Covered Call',
            'directionalView': f'Capping upside at ${strike}',
            'moneyness': moneyness,
        }
    return None


def _briefing_from(
    signals: dict,
    activity: dict,
    streaks: dict[tuple[str, str], int],
) -> dict:
    """
    Pre-market briefing: top buys/sells, multi-provider convergence, active
    streaks, notable new options. Mirrors getPreMarketBriefing() from
    holdings.ts.
    """
    buying = signals.get('buying', [])
    selling = signals.get('selling', [])

    cross_fund = sorted(
        [s for s in buying + selling if s.get('providerCount', 0) >= 2],
        key=lambda s: -s.get('convictionScore', 0),
    )[:5]

    notable_options: list[dict] = []
    for r in activity.get('optionsActivity', [])[:5]:
        if r.get('type') != 'NEW':
            continue
        sig = _decode_option_signal(r)
        if sig:
            notable_options.append({'record': r, 'signal': sig})

    active_streaks = [
        {
            'fund': fund,
            'ticker': ticker,
            'days': abs(days),
            'direction': 'up' if days > 0 else 'down',
        }
        for (fund, ticker), days in streaks.items()
        if abs(days) >= 3
    ]
    active_streaks.sort(key=lambda s: -s['days'])

    return {
        'topBuys': buying[:3],
        'topSells': selling[:3],
        'crossFundConvergence': cross_fund,
        'activeStreaks': active_streaks[:10],
        'notableOptions': notable_options,
    }


def _sector_flow_from(changes: list[dict]) -> dict:
    """Compute sector flow from a precomputed changes list."""
    sectors: dict[str, float] = defaultdict(float)
    for c in changes:
        if c['sector'] and not _is_junk_ticker(c['ticker']):
            sectors[c['sector']] += c['weightDelta']

    inflows: list[dict] = []
    outflows: list[dict] = []
    for sector, delta in sorted(sectors.items(), key=lambda x: -abs(x[1])):
        if abs(delta) < 0.001:
            continue
        entry = {'sector': sector, 'delta': round(delta, 4)}
        (inflows if delta > 0 else outflows).append(entry)
    return {'inflows': inflows, 'outflows': outflows}


def _divergences_from(changes: list[dict]) -> list[dict]:
    """
    Compute divergences from a precomputed changes list.

    Enriched in review #10: applies the per-fund significance threshold, adds
    name + provider + per-fund weightDelta, and flags `intrashop` when buying
    and selling funds share a provider. The original simple shape (`buying` /
    `selling` as plain fund-name lists) is kept for backwards compat.
    """
    grouped: dict[str, dict] = defaultdict(lambda: {
        'name': '',
        'buyingFunds': [],
        'sellingFunds': [],
    })
    for c in changes:
        if c.get('isOption') or _is_junk_ticker(c['ticker']):
            continue
        if abs(c['weightDelta']) < _significance_threshold(c['fund']):
            continue
        entry = grouped[c['ticker']]
        entry['name'] = c['name'] or entry['name']
        record = {
            'fund': c['fund'],
            'provider': FUND_PROVIDERS.get(c['fund'], c['fund']),
            'weightDelta': c['weightDelta'],
        }
        (entry['buyingFunds'] if c['weightDelta'] > 0 else entry['sellingFunds']).append(record)

    divs: list[dict] = []
    for ticker, d in grouped.items():
        if not d['buyingFunds'] or not d['sellingFunds']:
            continue
        buying_providers = {f['provider'] for f in d['buyingFunds']}
        selling_providers = {f['provider'] for f in d['sellingFunds']}
        intrashop = bool(buying_providers & selling_providers)
        divs.append({
            'ticker': ticker,
            'name': d['name'],
            # Backwards-compat plain lists:
            'buying': [f['fund'] for f in d['buyingFunds']],
            'selling': [f['fund'] for f in d['sellingFunds']],
            # Enriched fields:
            'buyingFunds': d['buyingFunds'],
            'sellingFunds': d['sellingFunds'],
            'intrashop': intrashop,
        })

    # Sort: intrashop first, then by total conflict magnitude
    def _magnitude(d: dict) -> float:
        return sum(abs(f['weightDelta']) for f in d['buyingFunds'] + d['sellingFunds'])

    divs.sort(key=lambda d: (not d['intrashop'], -_magnitude(d)))
    return divs


# ─── Public wrappers (each still callable standalone) ──────────────
def get_signals() -> dict:
    """Top buying/selling signals with conviction scores."""
    return _signals_from(compute_daily_changes(), _compute_streaks())


def get_sector_flow() -> dict:
    """Sector-level weight changes."""
    return _sector_flow_from(compute_daily_changes())


def get_divergences() -> list[dict]:
    """Cross-fund divergences: same ticker, opposite directions."""
    return _divergences_from(compute_daily_changes())


def compute_layering_patterns(window_days: int = 5, min_funds: int = 3,
                              limit: int = 20) -> dict:
    """Cross-fund 'layering': stock-pickers piling into the SAME new name in days.

    A layering pattern is a ticker where >= ``min_funds`` distinct institutional
    funds each opened a BRAND-NEW position (held nothing -> holds it) inside a
    rolling window of ``window_days`` trading days. Daily granularity is the
    whole point: only day-by-day snapshots reveal the *order* funds piled in
    ("ARK Mon -> Corgi Tue -> Avantis Wed") — a quarterly 13F can't.

    Only genuine stock-pickers count (``is_institutional_fund`` — the pure
    option-income books churn equities for their overlay, not from conviction),
    and only equity entries (options excluded). Ranked by a conviction score
    that blends distinct funds, distinct *families* (cross-provider layering is
    the strong signal), and combined AUM.
    """
    window_days = max(2, int(window_days))
    min_funds = max(2, int(min_funds))

    dates = get_available_dates()          # ISO strings, newest-first, trading days
    if len(dates) < 2:
        return {'asOfDate': get_as_of_date(), 'windowDays': window_days,
                'minFunds': min_funds, 'patterns': [], 'total': 0}

    ordered = list(reversed(dates))        # oldest -> newest
    # Scan recent entries so patterns are *active*; read one extra prior snapshot
    # so we can tell "brand new" from "already held" on the earliest scanned day.
    scan_len = min(len(ordered) - 1, max(window_days * 2, 10))
    start = len(ordered) - scan_len        # first index we detect entries ON (needs start-1)

    # Read each needed snapshot once; index maps by trading-day position.
    maps: dict[int, dict] = {}
    for i in range(start - 1, len(ordered)):
        maps[i] = _build_map(_read_csv(os.path.join(HISTORY_DIR, f'holdings_{ordered[i]}.csv')))

    def _held(m: dict, fund: str, ticker: str) -> bool:
        row = m.get((fund, ticker))
        return bool(row) and not row.get('option_type') and row.get('weight', 0) > 0

    # Collect each fund's FIRST new-entry per ticker within the scan window.
    # events[ticker][fund] = {idx, date, weight, name, sector}
    events: dict[str, dict[str, dict]] = defaultdict(dict)
    for i in range(start, len(ordered)):
        curr, prev = maps[i], maps[i - 1]
        for (fund, ticker), row in curr.items():
            if row.get('option_type') or row.get('weight', 0) <= 0:
                continue
            if not ticker or _is_junk_ticker(ticker) or not is_institutional_fund(fund):
                continue
            if _held(prev, fund, ticker):
                continue                    # not new — already held yesterday
            if fund not in events[ticker]:  # keep the earliest entry in-window
                events[ticker][fund] = {
                    'idx': i, 'date': ordered[i], 'weight': round(row.get('weight', 0), 4),
                    'name': row.get('name', ''), 'sector': row.get('sector', ''),
                }

    patterns: list[dict] = []
    for ticker, per_fund in events.items():
        entries = sorted(per_fund.items(), key=lambda kv: kv[1]['idx'])  # (fund, ev)
        # Slide a window_days-wide window; find the densest distinct-fund cluster.
        best: list = []
        lo = 0
        for hi in range(len(entries)):
            while entries[hi][1]['idx'] - entries[lo][1]['idx'] > window_days - 1:
                lo += 1
            if hi - lo + 1 > len(best):
                best = entries[lo:hi + 1]
        if len(best) < min_funds:
            continue

        funds = [f for f, _ in best]
        providers = sorted({FUND_PROVIDERS.get(f, 'Unknown') for f in funds})
        consensus_aum = round(sum(FUND_AUM.get(f, 0.0) for f in funds), 3)
        first_idx = best[0][1]['idx']
        meta = best[-1][1]                  # freshest entry carries name/sector
        seq = [{
            'fund': f, 'provider': FUND_PROVIDERS.get(f, 'Unknown'),
            'entryDate': ev['date'], 'weight': ev['weight'],
            'aum': FUND_AUM.get(f, 0.0), 'daysIntoLayering': ev['idx'] - first_idx,
        } for f, ev in best]
        # Cross-FAMILY layering (independent shops agreeing) is the strong
        # signal, so distinct providers carry more weight than raw fund count.
        raw = len(funds) + 1.25 * len(providers) + 0.3 * (consensus_aum ** 0.5)
        patterns.append({
            'ticker': ticker, 'name': meta['name'], 'sector': meta['sector'],
            'distinctFunds': len(funds), 'distinctProviders': len(providers),
            'providers': providers, 'consensusAum': consensus_aum,
            'firstEntry': best[0][1]['date'], 'lastEntry': best[-1][1]['date'],
            'entrySequence': seq, '_raw': raw,
        })

    patterns.sort(key=lambda p: p['_raw'], reverse=True)
    total = len(patterns)
    patterns = patterns[:max(1, int(limit))]
    top = patterns[0]['_raw'] if patterns else 1.0
    for p in patterns:
        p['layeringStrength'] = round(100 * p.pop('_raw') / top) if top else 0

    return {'asOfDate': dates[0], 'windowDays': window_days, 'minFunds': min_funds,
            'patterns': patterns, 'total': total}


def get_activity(period: str = 'daily') -> dict:
    """
    Bucket changes into accumulating / reducing / optionsActivity.
    `period` accepts 'daily' (latest two snapshots), 'weekly' (~7 calendar
    days) or 'monthly' (~30 calendar days).
    """
    if period == 'weekly':
        changes = compute_weekly_changes(include_options=True)
    elif period == 'monthly':
        changes = compute_monthly_changes(include_options=True)
    else:
        changes = compute_daily_changes_with_options()
    return _activity_from(changes)


def get_briefing() -> dict:
    """Pre-market briefing — top moves, multi-provider convergence, streaks, options."""
    changes = compute_daily_changes_with_options()
    streaks = _compute_streaks()
    signals = _signals_from([c for c in changes if not c.get('isOption')], streaks)
    activity = _activity_from(changes)
    return _briefing_from(signals, activity, streaks)


def get_all_holdings() -> dict:
    """
    Return every latest holding row across every tracked fund, enriched with
    today's weightDelta + sharesDelta. Used by the dashboard's full-holdings
    page (review #10 finale).
    """
    latest = get_latest_holdings()
    # Build a prev-day map keyed on (fund, ticker) for delta computation.
    prev_map: dict[tuple[str, str], dict] = {}
    for r in get_previous_holdings():
        key = (r.get('ETF Ticker', ''), _clean_ticker(r.get('Ticker', '')))
        prev_map[key] = {
            'weight': _safe_float(r.get('Weight', '0')),
            'shares': _safe_float(r.get('Share Quantity', '0')),
        }

    rows: list[dict] = []
    for r in latest:
        fund = r.get('ETF Ticker', '')
        ticker = _clean_ticker(r.get('Ticker', ''))
        weight = _safe_float(r.get('Weight', '0'))
        shares = _safe_float(r.get('Share Quantity', '0'))
        prev = prev_map.get((fund, ticker))
        rows.append({
            'fund': fund,
            'ticker': ticker,
            'name': r.get('Name', ''),
            'sector': r.get('Sector', ''),
            'weight': weight,
            'shares': shares,
            'weightDelta': round(weight - prev['weight'], 4) if prev else 0.0,
            'sharesDelta': round(shares - prev['shares'], 2) if prev else 0.0,
            'isOption': bool(r.get('Option_Type')),
            'cusip': r.get('CUSIP', ''),
        })
    return {
        'asOfDate': get_as_of_date(),
        'count': len(rows),
        'holdings': rows,
    }


def get_fund_detail(fund: str) -> dict | None:
    """
    Full detail for a specific fund. Enriched in review #10 with per-holding
    weightDelta/sharesDelta vs. previous day and a recentChanges list.
    """
    latest = get_latest_holdings()
    fund_rows = [r for r in latest if r.get('ETF Ticker') == fund]
    if not fund_rows:
        return None

    # Previous-day map for delta computation
    prev_map: dict[str, dict] = {}
    for r in get_previous_holdings():
        if r.get('ETF Ticker') == fund and not r.get('Option_Type') and not _is_junk_ticker(r.get('Ticker', '')):
            prev_map[_clean_ticker(r.get('Ticker', ''))] = {
                'weight': _safe_float(r.get('Weight', '0')),
                'shares': _safe_float(r.get('Share Quantity', '0')),
            }

    equities = []
    options = []
    for r in fund_rows:
        if r.get('Option_Type', ''):
            options.append(r)
        elif not _is_junk_ticker(r.get('Ticker', '')):
            ticker = _clean_ticker(r.get('Ticker', ''))
            weight = _safe_float(r.get('Weight', '0'))
            shares = _safe_float(r.get('Share Quantity', '0'))
            prev = prev_map.get(ticker)
            equities.append({
                'ticker': ticker,
                'name': r.get('Name', ''),
                'weight': weight,
                'shares': shares,
                'sector': r.get('Sector', ''),
                'weightDelta': round(weight - prev['weight'], 4) if prev else 0.0,
                'sharesDelta': round(shares - prev['shares'], 2) if prev else 0.0,
            })

    equities.sort(key=lambda x: -x['weight'])

    # Current option book — the fund's live option positions (type/strike/
    # expiry/underlying). Used by the income-fund Portfolio section.
    option_holdings = []
    for r in options:
        option_holdings.append({
            'ticker': _clean_ticker(r.get('Ticker', '')),
            'name': r.get('Name', ''),
            'weight': _safe_float(r.get('Weight', '0')),
            'shares': _safe_float(r.get('Share Quantity', '0')),
            'optionType': r.get('Option_Type', ''),
            'underlying': r.get('Underlying_Ticker', ''),
            'strike': _safe_float(r.get('Option_Strike', '0')),
            'expiry': r.get('Option_Expiry', ''),
            # Option analytics — already produced by the scraper, surfaced here
            # for the option-income fund page (ITM/OTM badges, days-to-expiry,
            # distance-to-strike). Nullable: a blank column must not read as a
            # real 0-DTE / at-the-money value.
            'dte': _nullable_float(r.get('DTE')),
            'moneyness': _nullable_float(r.get('Moneyness')),
            'underlyingPrice': _nullable_float(r.get('Underlying_Price')),
        })
    option_holdings.sort(key=lambda x: -abs(x['weight']))

    # Recent changes for this fund — include option activity so the
    # option-income view can show contracts opened/closed, not just equities.
    recent_changes = [c for c in compute_daily_changes_with_options() if c['fund'] == fund]

    # Active accumulation / distribution streaks among this fund's holdings —
    # consecutive-day weight moves of magnitude >= 2 days. Drives the streak
    # tracker on the active-equity fund view.
    fund_streaks = sorted(
        (
            {
                'ticker': tk,
                'days': abs(days),
                'direction': 'up' if days > 0 else 'down',
            }
            for (fd, tk), days in _compute_streaks().items()
            if fd == fund
        ),
        key=lambda s: -s['days'],
    )

    # Net fund flow — change in shares outstanding over the recent window, as a
    # percent of shares outstanding. Shares outstanding move only via
    # creations/redemptions, so this is the fund's organic growth from inflows
    # vs outflows. We deliberately do NOT dollar-value it: the scraper's
    # per-share price is unreliable for several providers, and a bad price
    # produces a wildly wrong dollar figure (a $50M fund showed "+$2.9B").
    # Share counts are clean integer data. None when the provider doesn't
    # report shares outstanding at all (ARK and Avantis don't; option-income
    # and Corgi funds do).
    def _fund_shares_out(rows: list[dict]) -> float | None:
        """Shares outstanding for `fund` — a fund-level field repeated on every
        row; return the first non-blank value seen."""
        for r in rows:
            if r.get('ETF Ticker') != fund:
                continue
            so = _nullable_float(r.get('SharesOutstanding') or r.get('shares_outstanding'))
            if so is not None:
                return so
        return None

    so_now = _fund_shares_out(latest)
    flow = None
    latest_date = _parse_iso(get_as_of_date())
    if so_now is not None and so_now > 0 and latest_date is not None:
        # Compare against the furthest-back snapshot within 7 days that still
        # reports shares outstanding for this fund. The scraper began capturing
        # it only recently, so a 7-day-old file may not have it yet —
        # periodDays reflects the real span actually found.
        for d in get_available_dates()[1:]:
            pd = _parse_iso(d)
            if pd is None:
                continue
            span = (latest_date - pd).days
            if span > 7:
                break
            so_then = _fund_shares_out(
                _read_csv(os.path.join(HISTORY_DIR, f'holdings_{d}.csv'))
            )
            if so_then is not None:
                shares_delta = so_now - so_then
                flow = {
                    'sharesOutstanding': round(so_now, 0),
                    'sharesDelta': round(shares_delta, 0),
                    'flowPct': round((shares_delta / so_now) * 100, 2),
                    'periodDays': span,
                }

    # Option rolls — a contract closed + another opened on the same underlying
    # (same call/put) is the fund rolling its position, e.g. NVDA C200 -> C210.
    # Framed as strategy mechanics, not a buy + a sell.
    roll_groups: dict[tuple[str, str], dict] = defaultdict(lambda: {'closed': [], 'opened': []})
    for c in recent_changes:
        if not c.get('isOption'):
            continue
        od = c.get('optionDetails') or {}
        underlying = od.get('underlying') or ''
        if not underlying:
            continue
        leg = {'strike': od.get('strike', 0.0), 'expiry': od.get('expiry', '')}
        key = (underlying, od.get('type') or '')
        if c['type'] == 'REMOVED':
            roll_groups[key]['closed'].append(leg)
        elif c['type'] == 'NEW':
            roll_groups[key]['opened'].append(leg)
    option_rolls = [
        {
            'underlying': underlying,
            'optionType': otype,
            'closed': grp['closed'],
            'opened': grp['opened'],
        }
        for (underlying, otype), grp in sorted(roll_groups.items())
        if grp['closed'] and grp['opened']
    ]

    return {
        'fund': fund,
        'provider': FUND_PROVIDERS.get(fund, fund),
        'category': get_fund_category(fund),
        'aum': FUND_AUM.get(fund),
        'holdingsCount': len(equities),
        'optionsCount': len(options),
        'totalWeight': round(sum(e['weight'] for e in equities), 2),
        'topHoldings': equities[:20],
        'optionHoldings': option_holdings,
        'recentChanges': recent_changes,
        'streaks': fund_streaks,
        'flow': flow,
        'optionRolls': option_rolls,
    }


def get_ticker_detail(ticker: str) -> dict | None:
    """
    Cross-fund detail for a specific ticker. Enriched in review #10 with
    optionDetails per option holding and a `changes` list of recent moves.
    """
    latest = get_latest_holdings()
    matches = [
        r for r in latest
        if _clean_ticker(r.get('Ticker', '')) == ticker
        or r.get('Underlying_Ticker', '') == ticker
    ]
    if not matches:
        return None

    funds = []
    for r in matches:
        fund = r.get('ETF Ticker', '')
        is_option = bool(r.get('Option_Type'))
        entry: dict = {
            'fund': fund,
            'provider': FUND_PROVIDERS.get(fund, fund),
            'weight': _safe_float(r.get('Weight', '0')),
            'shares': _safe_float(r.get('Share Quantity', '0')),
            'isOption': is_option,
        }
        if is_option:
            entry['optionDetails'] = {
                'type': r.get('Option_Type', ''),
                'strike': _safe_float(r.get('Option_Strike', '0')),
                'expiry': r.get('Option_Expiry', ''),
            }
        funds.append(entry)

    funds.sort(key=lambda x: -x['weight'])

    # Name/sector from an EQUITY row, not an option (an option row's Name is the
    # contract string, e.g. "NVDA 06/18/2026 186 C" — wrong for the header).
    name_src = next((m for m in matches if not m.get('Option_Type')), matches[0])

    # Recent changes that match this ticker (or its option underlying)
    all_changes = compute_daily_changes_with_options()
    changes = [
        c for c in all_changes
        if c['ticker'] == ticker
        or (c.get('isOption') and c.get('optionDetails', {}).get('underlying') == ticker)
    ]

    return {
        'ticker': ticker,
        'name': name_src.get('Name', ''),
        'sector': name_src.get('Sector', ''),
        'fundCount': len({f['fund'] for f in funds}),
        'holdings': funds,
        'totalWeight': round(sum(f['weight'] for f in funds if not f['isOption']), 4),
        'changes': changes,
    }


def _blended_weight_for(rows: list[dict], ticker: str, total_aum: float) -> tuple[float, int]:
    """AUM-blended institutional weight of a single ticker in one snapshot.

    Returns (blended_weight_pct, holding_fund_count). Mirrors the per-ticker
    contribution in _blend_institutional but for just one name, so we can walk
    the history cheaply.
    """
    w = 0.0
    funds = 0
    for r in rows:
        if r.get('Option_Type'):
            continue
        fund = r.get('ETF Ticker', '')
        if not is_institutional_fund(fund):
            continue
        aum = FUND_AUM.get(fund, 0.0)
        if aum <= 0:
            continue
        if _clean_ticker(r.get('Ticker', '')) != ticker:
            continue
        w += _safe_float(r.get('Weight', '0')) * aum / total_aum
        funds += 1
    return w, funds


def get_stock_detail(ticker: str, history_days: int = 30) -> dict | None:
    """Per-stock page payload: cross-fund holders + the institutional trend.

    Builds on get_ticker_detail (holders, recent changes) and adds the
    AUM-blended institutional view: the day/week/month deltas + A/D signal,
    plus a trading-day history series of the blended weight and ownership
    breadth so the page can chart the name's trend over time.
    """
    ticker = _clean_ticker(ticker)
    base = get_ticker_detail(ticker)
    if not base:
        return None

    latest = get_latest_holdings()
    inst_funds = {r.get('ETF Ticker', '') for r in latest
                  if is_institutional_fund(r.get('ETF Ticker', ''))}
    total_aum = sum(FUND_AUM.get(f, 0.0) for f in inst_funds) or 1.0

    # Trading-day history series (oldest → newest) for charting.
    dates = get_available_dates()[:history_days]  # newest-first, trading days only
    history = []
    for d in reversed(dates):
        rows = _read_csv(os.path.join(HISTORY_DIR, f'holdings_{d}.csv'))
        w, fc = _blended_weight_for(rows, ticker, total_aum)
        history.append({'date': d, 'blendedWeight': round(w, 4), 'fundCount': fc})

    cur = history[-1]['blendedWeight'] if history else 0.0
    prev = get_previous_holdings()
    wk = _snapshot_for_lookback(7)
    mo = _snapshot_for_lookback(30)
    daily = cur - (_blended_weight_for(prev, ticker, total_aum)[0] if prev else cur)
    weekly = cur - (_blended_weight_for(wk, ticker, total_aum)[0] if wk else cur)
    monthly = cur - (_blended_weight_for(mo, ticker, total_aum)[0] if mo else cur)

    # Blended-weight streak — consecutive daily moves in the same direction.
    # Computed from the history already loaded; no extra file reads.
    streak = 0
    if len(history) >= 2:
        for i in range(len(history) - 1, 0, -1):
            delta = history[i]['blendedWeight'] - history[i - 1]['blendedWeight']
            if delta > 0.001:
                if streak >= 0:
                    streak += 1
                else:
                    break
            elif delta < -0.001:
                if streak <= 0:
                    streak -= 1
                else:
                    break
            else:
                break

    return {
        **base,
        'institutional': {
            'blendedWeight': round(cur, 4),
            'daily': round(daily, 4),
            'weekly': round(weekly, 4),
            'monthly': round(monthly, 4),
            'fundCount': history[-1]['fundCount'] if history else 0,
            'signal': _trend_signal(monthly, weekly, daily),
            'streak': streak if abs(streak) >= 2 else None,
        },
        'history': history,
    }


def get_funds_index() -> list[dict]:
    """All tracked funds enriched with holdings counts and top holding.

    Powers the /funds index page (HedgeFollow-style "funds we follow" list).
    Based on the funds actually present in the latest snapshot, so delisted
    funds drop off; provider/category/AUM come from the static maps.
    """
    latest = get_latest_holdings()
    by_fund: dict[str, dict] = {}
    for r in latest:
        fund = r.get('ETF Ticker', '')
        if not fund or fund in EXCLUDED_FUNDS:
            continue
        d = by_fund.setdefault(fund, {'holdings': 0, 'options': 0, 'top': None})
        if r.get('Option_Type'):
            d['options'] += 1
            continue
        ticker = _clean_ticker(r.get('Ticker', ''))
        if _is_junk_ticker(ticker):
            continue
        d['holdings'] += 1
        w = _safe_float(r.get('Weight', '0'))
        if d['top'] is None or w > d['top']['weight']:
            d['top'] = {'ticker': ticker, 'weight': round(w, 4)}

    out = []
    for fund in sorted(by_fund):
        d = by_fund[fund]
        if d['holdings'] == 0 and d['options'] == 0:
            continue
        out.append({
            'fund': fund,
            'provider': FUND_PROVIDERS.get(fund, 'Other'),
            'category': get_fund_category(fund),
            'aum': FUND_AUM.get(fund),
            'holdingsCount': d['holdings'],
            'optionsCount': d['options'],
            'topHolding': d['top'],
        })
    return out


def get_tickers_index(limit: int = 100, sort: str = 'funds') -> list[dict]:
    """Most widely-held underlying tickers across all tracked funds.

    Powers the /stocks index page (HedgeFollow-style "most popular stocks").
    Equities only — options are excluded. `sort` is 'funds' (breadth of
    ownership, default) or 'weight' (total weight summed across funds). Each
    row also carries the net daily weight change, a list of any funds that
    opened a brand-new position today, and the strongest multi-day
    accumulation/distribution streak across any fund holding the ticker.
    """
    latest = get_latest_holdings()
    daily: dict[str, float] = {}
    new_entries: dict[str, list[str]] = {}
    for c in compute_daily_changes():
        ticker = c['ticker']
        daily[ticker] = daily.get(ticker, 0.0) + c['weightDelta']
        if c.get('type') == 'NEW':
            new_entries.setdefault(ticker, []).append(c['fund'])

    # Per-ticker streak: strongest (by abs value) fund-level streak for each ticker.
    # Positive = buying, negative = selling. None = no streak of 2+ days.
    raw_streaks = _compute_streaks()
    ticker_streaks: dict[str, int] = {}
    for (_, ticker), streak_val in raw_streaks.items():
        if ticker not in ticker_streaks or abs(streak_val) > abs(ticker_streaks[ticker]):
            ticker_streaks[ticker] = streak_val

    agg: dict[str, dict] = {}
    for r in latest:
        if r.get('Option_Type'):
            continue
        fund = r.get('ETF Ticker', '')
        if fund in EXCLUDED_FUNDS:
            continue
        ticker = _clean_ticker(r.get('Ticker', ''))
        if _is_junk_ticker(ticker):
            continue
        d = agg.setdefault(ticker, {
            'name': r.get('Name', ''), 'sector': r.get('Sector', ''),
            'funds': set(), 'totalWeight': 0.0,
        })
        d['funds'].add(fund)
        d['totalWeight'] += _safe_float(r.get('Weight', '0'))

    rows = [{
        'ticker': t,
        'name': d['name'],
        'sector': d['sector'],
        'fundCount': len(d['funds']),
        'funds': sorted(d['funds']),
        'totalWeight': round(d['totalWeight'], 4),
        'netChange': round(daily.get(t, 0.0), 4),
        'newEntryFunds': sorted(new_entries.get(t, [])),
        'streak': ticker_streaks.get(t),
    } for t, d in agg.items()]

    if sort == 'weight':
        rows.sort(key=lambda x: -x['totalWeight'])
    else:
        rows.sort(key=lambda x: (-x['fundCount'], -x['totalWeight']))
    return rows[:limit]


def get_full_payload() -> dict:
    """
    Complete API payload — the single endpoint everything else can be derived from.

    Compute changes (including options) ONCE, derive an equity-only view by
    filtering, then thread both through every downstream computation. (Review
    #14 + #10 finale.)
    """
    changes_all = compute_daily_changes_with_options()
    changes_eq = [c for c in changes_all if not c.get('isOption')]
    streaks = _compute_streaks()
    signals = _signals_from(changes_eq, streaks)
    activity = _activity_from(changes_all)
    return {
        '_meta': {
            'endpoint': '/api/v1/signals',
            'description': 'TickerTrace public API — institutional ETF activity signals.',
            'source': 'FastAPI + FastMCP',
        },
        'asOfDate': get_as_of_date(),
        'stats': get_global_stats(),
        'signals': signals,
        'changes': changes_eq[:50],
        'sectorFlow': _sector_flow_from(changes_eq),
        'divergences': _divergences_from(changes_eq),
        'briefing': _briefing_from(signals, activity, streaks),
        'activity': activity,
    }
