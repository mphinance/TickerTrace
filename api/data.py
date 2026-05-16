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
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'etf-dashboard', 'public', 'data')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')

EXCLUDED_FUNDS = {'IBIT', 'IVV', 'IWM'}
JUNK_TICKERS = {'CASH', 'OTHER', 'USD', 'CASH&OTHER', '', 'DUMMY', 'TBD', 'B', 'WEEK'}

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
    'MSII': 'REX Shares', 'NVII': 'REX Shares', 'COII': 'REX Shares',
    'TSII': 'REX Shares', 'HOII': 'REX Shares', 'PLTI': 'REX Shares',
    # Corgi Funds — thematic + founder-led (launched May 2026)
    'EUV': 'Corgi Funds', 'CMAG': 'Corgi Funds', 'CQTM': 'Corgi Funds',
    'XA': 'Corgi Funds', 'EYES': 'Corgi Funds', 'KYC': 'Corgi Funds',
    'GNMX': 'Corgi Funds', 'AV': 'Corgi Funds', 'DOCK': 'Corgi Funds',
    'WATS': 'Corgi Funds', 'GLAM': 'Corgi Funds', 'NYNY': 'Corgi Funds',
    'STYL': 'Corgi Funds', 'WNDR': 'Corgi Funds', 'FDRS': 'Corgi Funds',
    'FDRX': 'Corgi Funds',
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
    'MSII': 0.03, 'NVII': 0.04, 'COII': 0.03, 'TSII': 0.03, 'HOII': 0.02, 'PLTI': 0.02,
    # Corgi Funds (launched May 2026, AUM placeholder $50M each)
    'EUV': 0.05, 'CMAG': 0.05, 'CQTM': 0.05, 'XA': 0.05, 'EYES': 0.05,
    'KYC': 0.05, 'GNMX': 0.05, 'AV': 0.05, 'DOCK': 0.05, 'WATS': 0.05,
    'GLAM': 0.05, 'NYNY': 0.05, 'STYL': 0.05, 'WNDR': 0.05, 'FDRS': 0.05,
    'FDRX': 0.05,
}


def _read_csv(path: str) -> list[dict]:
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            if r.get('ETF Ticker', '') not in EXCLUDED_FUNDS:
                rows.append(r)
    return rows


def _safe_float(v: str, default: float = 0.0) -> float:
    try:
        return float(v or '0')
    except (ValueError, TypeError):
        return default


def get_available_dates() -> list[str]:
    """Return sorted (newest-first) list of dates with history files."""
    files = [f for f in os.listdir(HISTORY_DIR) if f.startswith('holdings_') and f.endswith('.csv')]
    return sorted([f.replace('holdings_', '').replace('.csv', '') for f in files], reverse=True)


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

    def _record(c: dict, kind: str, weight_delta: float, shares_delta: float, prev_weight: float = 0.0) -> dict:
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
        if c['option_type'] and not include_options:
            continue
        if _is_junk_ticker(c['ticker']):
            continue
        p = prev.get(key)
        if p:
            wd = c['weight'] - p['weight']
            sd = c['shares'] - p['shares']
            if abs(wd) > 0.0001 or abs(sd) > 0:
                changes.append(_record(c, 'CHANGED', wd, sd, prev_weight=p['weight']))
        elif c['weight'] > 0:
            changes.append(_record(c, 'NEW', c['weight'], c['shares']))

    for key, p in prev.items():
        if p['option_type'] and not include_options:
            continue
        if key in curr or _is_junk_ticker(p['ticker']):
            continue
        # The "removed" record uses the previous snapshot's fields
        c_like = {**p, 'weight': 0.0, 'shares': 0.0}
        changes.append(_record(c_like, 'REMOVED', -p['weight'], -p['shares'], prev_weight=p['weight']))

    changes.sort(key=lambda x: -abs(x['weightDelta']))
    return changes


def compute_daily_changes() -> list[dict]:
    """Compute all changes between the two most recent days (equities only)."""
    return _changes_between(get_latest_holdings(), get_previous_holdings(), include_options=False)


def compute_daily_changes_with_options() -> list[dict]:
    """Daily changes including option rows, with optionDetails attached."""
    return _changes_between(get_latest_holdings(), get_previous_holdings(), include_options=True)


def compute_weekly_changes(*, include_options: bool = False) -> list[dict]:
    """Compute changes between today and ~5 trading days ago (or oldest available)."""
    dates = get_available_dates()
    if len(dates) < 2:
        return []
    # Use the 6th-newest snapshot when available (5 trading-day window); fall back to oldest.
    older_idx = min(5, len(dates) - 1)
    older = _read_csv(os.path.join(HISTORY_DIR, f'holdings_{dates[older_idx]}.csv'))
    return _changes_between(get_latest_holdings(), older, include_options=include_options)


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


def get_activity(period: str = 'daily') -> dict:
    """
    Bucket changes into accumulating / reducing / optionsActivity.
    `period` accepts 'daily' (latest two snapshots) or 'weekly' (~5 days).
    """
    changes = (compute_daily_changes_with_options() if period == 'daily'
               else compute_weekly_changes(include_options=True))
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

    # Recent changes for this fund
    recent_changes = [c for c in compute_daily_changes() if c['fund'] == fund]

    return {
        'fund': fund,
        'provider': FUND_PROVIDERS.get(fund, fund),
        'aum': FUND_AUM.get(fund),
        'holdingsCount': len(equities),
        'optionsCount': len(options),
        'totalWeight': round(sum(e['weight'] for e in equities), 2),
        'topHoldings': equities[:20],
        'recentChanges': recent_changes,
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

    # Recent changes that match this ticker (or its option underlying)
    all_changes = compute_daily_changes_with_options()
    changes = [
        c for c in all_changes
        if c['ticker'] == ticker
        or (c.get('isOption') and c.get('optionDetails', {}).get('underlying') == ticker)
    ]

    return {
        'ticker': ticker,
        'name': matches[0].get('Name', ''),
        'sector': matches[0].get('Sector', ''),
        'fundCount': len({f['fund'] for f in funds}),
        'holdings': funds,
        'totalWeight': round(sum(f['weight'] for f in funds if not f['isOption']), 4),
        'changes': changes,
    }


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
