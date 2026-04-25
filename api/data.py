"""
TickerTrace data layer — shared by FastAPI and FastMCP servers.

Reads CSV history files and computes signals, changes, sector flow, etc.
Same logic as lib/holdings.ts but in Python.
"""

import csv
import os
import re
from collections import defaultdict
from typing import Any

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'etf-dashboard', 'public', 'data')
HISTORY_DIR = os.path.join(DATA_DIR, 'history')

EXCLUDED_FUNDS = {'IBIT', 'IVV', 'IWM'}
JUNK_TICKERS = {'CASH', 'OTHER', 'USD', 'Cash&Other', '', 'DUMMY', 'TBD'}
# T-bill / treasury CUSIP prefixes (9-char alphanumeric identifiers from YieldMax funds)
TREASURY_CUSIP_PREFIXES = ('912797', '912796', '912795', '912810', '912828')

def _is_junk_ticker(ticker: str) -> bool:
    """Return True if the ticker should be hidden (cash, T-bills, raw CUSIPs, money markets)."""
    if ticker in JUNK_TICKERS:
        return True
    # Raw 9-char CUSIP codes (e.g. '912797RG4') — unresolved identifiers
    if len(ticker) == 9 and ticker[:6].isdigit():
        return True
    if ticker.startswith(TREASURY_CUSIP_PREFIXES):
        return True
    # Shorter CUSIPs that start with 3+ digits (e.g. '912797RS8' with 9 chars already caught,
    # but catch any starting-with-digits pattern)
    if len(ticker) >= 6 and ticker[:3].isdigit():
        return True
    # Money market funds end in XXX (e.g. FGXXX, SPAXX, TTTXX)
    if ticker.upper().endswith('XXX') or ticker.upper().endswith('XX'):
        return True
    # TRS (Total Return Swap) entries like "88160R101 TRS 031926 NM"
    if ' TRS ' in ticker.upper():
        return True
    # Generic placeholder tickers
    if ticker.upper() in ('B', 'WEEK'):
        return True
    return False


# Bloomberg exchange suffixes (ARK funds use these: "RKLB UQ", "NU UN", etc.)
_BLOOMBERG_SUFFIX_RE = re.compile(r'\s+(?:UQ|UN|UW|UP|UA|FP|LN|GY|SJ|AU|CT|CN|JP|HK|SW|SS|IT|SM|NA|BB|PL|DC|NO|AV|ID|MK|TB|PM|IJ)$')

def _clean_ticker(ticker: str) -> str:
    """Strip Bloomberg exchange suffixes and whitespace from ticker strings."""
    return _BLOOMBERG_SUFFIX_RE.sub('', ticker.strip())

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


def compute_daily_changes() -> list[dict]:
    """Compute all changes between the two most recent days."""
    curr = _build_map(get_latest_holdings())
    prev = _build_map(get_previous_holdings())
    changes = []

    for key, c in curr.items():
        if c['option_type'] or _is_junk_ticker(c['ticker']):
            continue
        p = prev.get(key)
        if p:
            wd = c['weight'] - p['weight']
            sd = c['shares'] - p['shares']
            if abs(wd) > 0.0001 or abs(sd) > 0:
                changes.append({
                    'fund': c['fund'], 'ticker': c['ticker'], 'name': c['name'],
                    'sector': c['sector'], 'weightDelta': round(wd, 4),
                    'sharesDelta': round(sd, 2),
                    'type': 'CHANGED', 'isOption': False,
                })
        elif c['weight'] > 0 and not _is_junk_ticker(c['ticker']):
            changes.append({
                'fund': c['fund'], 'ticker': c['ticker'], 'name': c['name'],
                'sector': c['sector'], 'weightDelta': round(c['weight'], 4),
                'sharesDelta': round(c['shares'], 2),
                'type': 'NEW', 'isOption': False,
            })

    for key, p in prev.items():
        if p['option_type']:
            continue
        if key not in curr and not _is_junk_ticker(p['ticker']):
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
        if _is_junk_ticker(c['ticker']):
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
        if c['sector'] and not _is_junk_ticker(c['ticker']):
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
        if _is_junk_ticker(c['ticker']):
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
        elif not _is_junk_ticker(r.get('Ticker', '')):
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
