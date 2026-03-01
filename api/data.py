"""
TickerTrace data layer — shared by FastAPI and FastMCP servers.

Reads CSV history files and computes signals, changes, sector flow, etc.
Same logic as lib/holdings.ts but in Python.
"""

import csv
import os
from collections import defaultdict
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'etf-dashboard', 'public', 'data')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')

EXCLUDED_FUNDS = {'IBIT', 'IVV', 'IWM'}
JUNK_TICKERS = {'CASH', 'OTHER', 'USD', 'Cash&Other', '', 'DUMMY', 'TBD'}

FUND_PROVIDERS = {
    'AVUV': 'Avantis', 'AVLV': 'Avantis', 'AVMV': 'Avantis',
    'ARKK': 'ARK Invest', 'ARKQ': 'ARK Invest', 'ARKW': 'ARK Invest',
    'ARKG': 'ARK Invest', 'ARKF': 'ARK Invest', 'ARKX': 'ARK Invest',
    'KYLD': 'Kurv', 'KQQQ': 'Kurv',
    'ULTY': 'YieldMax',
    'ULTI': 'REX Shares',
    'BLOX': 'Tidal / NicholasX',
}

FUND_AUM = {
    'ARKK': 6.8, 'ARKW': 1.8, 'ARKQ': 1.1, 'ARKG': 1.5, 'ARKF': 0.9, 'ARKX': 0.3,
    'AVUV': 12.5, 'AVLV': 3.2, 'AVMV': 0.8,
    'KYLD': 0.15, 'KQQQ': 0.1,
    'ULTY': 0.5, 'ULTI': 0.05, 'BLOX': 0.02,
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
        key = (r.get('ETF Ticker', ''), r.get('Ticker', ''))
        m[key] = {
            'fund': r.get('ETF Ticker', ''),
            'ticker': r.get('Ticker', ''),
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


def compute_daily_changes() -> list[dict]:
    """Compute all changes between the two most recent days."""
    curr = _build_map(get_latest_holdings())
    prev = _build_map(get_previous_holdings())
    changes = []

    for key, c in curr.items():
        if c['option_type']:
            continue
        p = prev.get(key)
        if p:
            wd = c['weight'] - p['weight']
            if abs(wd) > 0.001:
                changes.append({
                    'fund': c['fund'], 'ticker': c['ticker'], 'name': c['name'],
                    'sector': c['sector'], 'weightDelta': round(wd, 4),
                    'sharesDelta': round(c['shares'] - p['shares'], 2),
                    'type': 'CHANGED', 'isOption': False,
                })
        elif c['weight'] > 0 and c['ticker'] not in JUNK_TICKERS:
            changes.append({
                'fund': c['fund'], 'ticker': c['ticker'], 'name': c['name'],
                'sector': c['sector'], 'weightDelta': round(c['weight'], 4),
                'sharesDelta': round(c['shares'], 2),
                'type': 'NEW', 'isOption': False,
            })

    for key, p in prev.items():
        if p['option_type']:
            continue
        if key not in curr and p['ticker'] not in JUNK_TICKERS:
            changes.append({
                'fund': p['fund'], 'ticker': p['ticker'], 'name': p['name'],
                'sector': p['sector'], 'weightDelta': round(-p['weight'], 4),
                'sharesDelta': round(-p['shares'], 2),
                'type': 'REMOVED', 'isOption': False,
            })

    changes.sort(key=lambda x: -abs(x['weightDelta']))
    return changes


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


def get_signals() -> dict:
    """Top buying/selling signals with conviction scores."""
    changes = compute_daily_changes()

    # Aggregate by ticker
    agg = defaultdict(lambda: {'total_wd': 0, 'funds': [], 'name': '', 'sector': ''})
    for c in changes:
        if c['ticker'] in JUNK_TICKERS:
            continue
        t = c['ticker']
        agg[t]['total_wd'] += c['weightDelta']
        agg[t]['funds'].append(c['fund'])
        agg[t]['name'] = c['name'] or agg[t]['name']
        agg[t]['sector'] = c['sector'] or agg[t]['sector']

    # Compute conviction (AUM-weighted, multi-provider bonus)
    signals = []
    for ticker, v in agg.items():
        providers = set(FUND_PROVIDERS.get(f, f) for f in v['funds'])
        aum_weight = sum(FUND_AUM.get(f, 0.01) for f in v['funds'])
        conviction = round(abs(v['total_wd']) * aum_weight * (1.5 if len(providers) > 1 else 1), 3)
        signals.append({
            'ticker': ticker,
            'name': v['name'],
            'sector': v['sector'],
            'weightDelta': round(v['total_wd'], 4),
            'funds': v['funds'],
            'providers': list(providers),
            'conviction': conviction,
            'direction': 'buying' if v['total_wd'] > 0 else 'selling',
        })

    signals.sort(key=lambda x: -x['conviction'])

    buying = [s for s in signals if s['direction'] == 'buying'][:10]
    selling = [s for s in signals if s['direction'] == 'selling'][:10]

    return {'buying': buying, 'selling': selling}


def get_sector_flow() -> dict:
    """Sector-level weight changes."""
    changes = compute_daily_changes()
    sectors = defaultdict(float)
    for c in changes:
        if c['sector'] and c['ticker'] not in JUNK_TICKERS:
            sectors[c['sector']] += c['weightDelta']

    inflows = []
    outflows = []
    for sector, delta in sorted(sectors.items(), key=lambda x: -abs(x[1])):
        if abs(delta) < 0.001:
            continue
        entry = {'sector': sector, 'delta': round(delta, 4)}
        if delta > 0:
            inflows.append(entry)
        else:
            outflows.append(entry)

    return {'inflows': inflows, 'outflows': outflows}


def get_divergences() -> list[dict]:
    """Cross-fund divergences: same ticker, opposite directions."""
    changes = compute_daily_changes()
    ticker_dirs = defaultdict(lambda: {'buying': [], 'selling': []})
    for c in changes:
        if c['ticker'] in JUNK_TICKERS:
            continue
        if c['weightDelta'] > 0:
            ticker_dirs[c['ticker']]['buying'].append(c['fund'])
        else:
            ticker_dirs[c['ticker']]['selling'].append(c['fund'])

    divs = []
    for ticker, dirs in ticker_dirs.items():
        if dirs['buying'] and dirs['selling']:
            divs.append({
                'ticker': ticker,
                'buying': dirs['buying'],
                'selling': dirs['selling'],
            })
    return divs


def get_fund_detail(fund: str) -> dict | None:
    """Full detail for a specific fund."""
    latest = get_latest_holdings()
    fund_rows = [r for r in latest if r.get('ETF Ticker') == fund]
    if not fund_rows:
        return None

    equities = []
    options = []
    for r in fund_rows:
        if r.get('Option_Type', ''):
            options.append(r)
        elif r.get('Ticker', '') not in JUNK_TICKERS:
            equities.append({
                'ticker': r.get('Ticker', ''),
                'name': r.get('Name', ''),
                'weight': _safe_float(r.get('Weight', '0')),
                'shares': _safe_float(r.get('Share Quantity', '0')),
                'sector': r.get('Sector', ''),
            })

    equities.sort(key=lambda x: -x['weight'])

    return {
        'fund': fund,
        'provider': FUND_PROVIDERS.get(fund, fund),
        'aum': FUND_AUM.get(fund),
        'holdingsCount': len(equities),
        'optionsCount': len(options),
        'totalWeight': round(sum(e['weight'] for e in equities), 2),
        'topHoldings': equities[:20],
    }


def get_ticker_detail(ticker: str) -> dict | None:
    """Cross-fund detail for a specific ticker."""
    latest = get_latest_holdings()
    matches = [r for r in latest if r.get('Ticker', '') == ticker]
    if not matches:
        return None

    funds = []
    for r in matches:
        fund = r.get('ETF Ticker', '')
        funds.append({
            'fund': fund,
            'provider': FUND_PROVIDERS.get(fund, fund),
            'weight': _safe_float(r.get('Weight', '0')),
            'shares': _safe_float(r.get('Share Quantity', '0')),
            'isOption': bool(r.get('Option_Type', '')),
        })

    funds.sort(key=lambda x: -x['weight'])

    return {
        'ticker': ticker,
        'name': matches[0].get('Name', ''),
        'sector': matches[0].get('Sector', ''),
        'fundCount': len(set(f['fund'] for f in funds)),
        'holdings': funds,
    }


def get_full_payload() -> dict:
    """Complete API payload matching /api/signals from Next.js."""
    signals = get_signals()
    return {
        '_meta': {
            'endpoint': '/api/v1/signals',
            'description': 'TickerTrace public API — institutional ETF activity signals.',
            'source': 'FastAPI + FastMCP',
        },
        'asOfDate': get_as_of_date(),
        'stats': get_global_stats(),
        'signals': signals,
        'changes': compute_daily_changes()[:50],
        'sectorFlow': get_sector_flow(),
        'divergences': get_divergences(),
    }
