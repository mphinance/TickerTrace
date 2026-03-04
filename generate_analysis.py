#!/usr/bin/env python3
"""
generate_analysis.py — Automated TickerTrace daily analysis.

Reads the latest two days' CSV history files, computes cross-fund
and per-provider breakdowns, and writes a markdown analysis to
analyses/daily_analysis_YYYY-MM-DD.md + analyses/latest.md.

Usage:
    python3 generate_analysis.py

Designed to run after the scraper, e.g. in a cron job:
    30 7 * * 1-5  cd /path/to/TickerTrace && python3 generate_analysis.py
"""

import csv
import os
import shutil
from collections import defaultdict
from datetime import datetime

DATA_DIR = os.path.join(os.path.dirname(__file__), 'etf-dashboard', 'public', 'data', 'history')
OUT_DIR = os.path.join(os.path.dirname(__file__), 'analyses')
EXCLUDED = {'IBIT', 'IVV', 'IWM'}
JUNK = {'CASH', 'OTHER', 'USD', 'Cash&Other', ''}

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
}


def read_csv(path):
    rows = []
    with open(path) as f:
        for r in csv.DictReader(f):
            if r.get('ETF Ticker', '') not in EXCLUDED:
                rows.append(r)
    return rows


def build_map(rows):
    m = {}
    for r in rows:
        key = (r.get('ETF Ticker', ''), r.get('Ticker', ''))
        try:
            w = float(r.get('Weight', '0') or '0')
            s = float(r.get('Share Quantity', '0') or '0')
        except ValueError:
            w, s = 0, 0
        m[key] = {
            'weight': w, 'shares': s,
            'name': r.get('Name', ''), 'sector': r.get('Sector', ''),
            'fund': r.get('ETF Ticker', ''), 'ticker': r.get('Ticker', ''),
            'option_type': r.get('Option_Type', ''),
            'underlying': r.get('Underlying_Ticker', ''),
            'strike': r.get('Option_Strike', ''),
            'expiry': r.get('Option_Expiry', ''),
        }
    return m


def compute_changes(curr_map, prev_map):
    changes = []
    for key, curr in curr_map.items():
        if curr['option_type']:
            continue
        p = prev_map.get(key)
        if p:
            wd = curr['weight'] - p['weight']
            if abs(wd) > 0.001:
                changes.append({**curr, 'wd': wd, 'sd': curr['shares'] - p['shares'], 'type': 'CHANGED'})
        elif curr['weight'] > 0:
            changes.append({**curr, 'wd': curr['weight'], 'sd': curr['shares'], 'type': 'NEW'})
    for key, p in prev_map.items():
        if p['option_type']:
            continue
        if key not in curr_map:
            changes.append({**p, 'wd': -p['weight'], 'sd': -p['shares'], 'type': 'REMOVED'})
    return changes


def aggregate(changes):
    """Aggregate changes by ticker across all funds."""
    agg = defaultdict(lambda: {'total_wd': 0, 'funds': [], 'sector': '', 'name': ''})
    for c in changes:
        t = c['ticker']
        if t in JUNK:
            continue
        agg[t]['total_wd'] += c['wd']
        agg[t]['funds'].append(f"{c['fund']}({c['wd']:+.3f}%)")
        agg[t]['sector'] = c.get('sector') or agg[t]['sector']
        agg[t]['name'] = c.get('name') or agg[t]['name']
    return agg


def fmt_delta(v):
    """Format a weight delta with sign."""
    return f"+{v:.3f}%" if v > 0 else f"{v:.3f}%"


def generate_markdown(date_str, changes, curr_map, prev_map):
    agg = aggregate(changes)
    buys = sorted([(k, v) for k, v in agg.items() if v['total_wd'] > 0], key=lambda x: -x[1]['total_wd'])
    sells = sorted([(k, v) for k, v in agg.items() if v['total_wd'] < 0], key=lambda x: x[1]['total_wd'])
    multi = sorted(
        [(k, v) for k, v in agg.items() if len(set(f.split('(')[0] for f in v['funds'])) >= 2],
        key=lambda x: -abs(x[1]['total_wd'])
    )

    # New options
    new_opts = [(c['fund'], c) for key, c in curr_map.items()
                if c['option_type'] and key not in prev_map]

    lines = [
        f"# 📊 TickerTrace Daily Intel — {date_str}",
        "",
        f"*Auto-generated from {len(set(c['fund'] for c in changes))} actively-managed ETFs. "
        f"Changes vs. previous trading day.*",
        "",
        "---",
        "",
        f"## Summary",
        "",
        f"- **{len(changes)}** position changes across **{len(set(c['fund'] for c in changes))}** funds",
        f"- **{len(buys)}** tickers accumulated, **{len(sells)}** tickers reduced",
        f"- **{len(multi)}** cross-provider signals (same ticker, multiple fund families)",
        f"- **{len(new_opts)}** new option contracts",
        "",
    ]

    # Cross-provider signals
    if multi:
        lines += [
            "## 🔀 Cross-Provider Signals",
            "",
            "These tickers are being moved by **multiple independent fund families** — the strongest signal type.",
            "",
            "| Ticker | Direction | Δ Weight | Funds |",
            "|--------|-----------|----------|-------|",
        ]
        for t, v in multi[:10]:
            direction = "📈 BUYING" if v['total_wd'] > 0 else "📉 SELLING"
            lines.append(f"| **{t}** | {direction} | {fmt_delta(v['total_wd'])} | {', '.join(v['funds'])} |")
        lines.append("")

    # Top buys
    if buys:
        lines += [
            "## 📈 Top Buys (aggregate)",
            "",
            "| Ticker | Δ Weight | Funds |",
            "|--------|----------|-------|",
        ]
        for t, v in buys[:10]:
            lines.append(f"| **{t}** | {fmt_delta(v['total_wd'])} | {', '.join(v['funds'])} |")
        lines.append("")

    # Top sells
    if sells:
        lines += [
            "## 📉 Top Sells (aggregate)",
            "",
            "| Ticker | Δ Weight | Funds |",
            "|--------|----------|-------|",
        ]
        for t, v in sells[:10]:
            lines.append(f"| **{t}** | {fmt_delta(v['total_wd'])} | {', '.join(v['funds'])} |")
        lines.append("")

    # --- Per-provider breakdown ---
    lines += ["---", "", "## 🏢 Per-Provider Breakdown", ""]

    # Group changes by provider
    provider_changes = defaultdict(list)
    for c in changes:
        if c['ticker'] in JUNK:
            continue
        prov = FUND_PROVIDERS.get(c['fund'], c['fund'])
        provider_changes[prov].append(c)

    for prov in sorted(provider_changes.keys()):
        pchanges = provider_changes[prov]
        funds_in_prov = sorted(set(c['fund'] for c in pchanges))
        prov_buys = [c for c in pchanges if c['wd'] > 0]
        prov_sells = [c for c in pchanges if c['wd'] < 0]
        prov_buys.sort(key=lambda x: -x['wd'])
        prov_sells.sort(key=lambda x: x['wd'])

        lines.append(f"### {prov} ({', '.join(funds_in_prov)})")
        lines.append("")
        lines.append(f"**{len(prov_buys)} buys**, **{len(prov_sells)} sells**")
        lines.append("")

        if prov_buys:
            lines.append("**Buying:**")
            lines.append("")
            lines.append("| Fund | Ticker | Δ Weight | Type |")
            lines.append("|------|--------|----------|------|")
            for c in prov_buys[:8]:
                t = "★ NEW" if c['type'] == 'NEW' else "ADD"
                lines.append(f"| {c['fund']} | **{c['ticker']}** | {fmt_delta(c['wd'])} | {t} |")
            lines.append("")

        if prov_sells:
            lines.append("**Selling:**")
            lines.append("")
            lines.append("| Fund | Ticker | Δ Weight | Type |")
            lines.append("|------|--------|----------|------|")
            for c in prov_sells[:8]:
                t = "✕ EXIT" if c['type'] == 'REMOVED' else "TRIM"
                lines.append(f"| {c['fund']} | **{c['ticker']}** | {fmt_delta(c['wd'])} | {t} |")
            lines.append("")

    # Options
    if new_opts:
        lines += ["---", "", "## ⚡ New Options Activity", ""]
        lines.append("| Fund | Type | Underlying | Strike | Expiry | Signal |")
        lines.append("|------|------|------------|--------|--------|--------|")
        for fund, c in new_opts[:15]:
            otype = c['option_type']
            ut = c['underlying']
            strike = c['strike']
            exp = c['expiry']
            try:
                strike_f = float(strike)
                signal = f"Bullish above ${strike_f:,.0f}" if otype == 'Put' else f"Capping upside at ${strike_f:,.0f}"
            except (ValueError, TypeError):
                signal = ""
            lines.append(f"| {fund} | {otype} | {ut} | ${strike} | {exp} | {signal} |")
        lines.append("")

    # Footer
    lines += [
        "---",
        "",
        f"*Data from [TickerTrace](https://tickertrace.pro/dashboard) — tracking what institutions buy before everyone else knows.*",
        "",
    ]

    return "\n".join(lines)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    # Get latest two dates
    files = [f for f in os.listdir(DATA_DIR) if f.startswith('holdings_') and f.endswith('.csv')]
    dates = sorted([f.replace('holdings_', '').replace('.csv', '') for f in files], reverse=True)

    if len(dates) < 2:
        print("Need at least 2 history files to compute changes.")
        return

    today = dates[0]
    yesterday = dates[1]
    print(f"Computing changes: {yesterday} → {today}")

    curr = read_csv(os.path.join(DATA_DIR, f'holdings_{today}.csv'))
    prev = read_csv(os.path.join(DATA_DIR, f'holdings_{yesterday}.csv'))

    curr_map = build_map(curr)
    prev_map = build_map(prev)
    changes = compute_changes(curr_map, prev_map)

    md = generate_markdown(today, changes, curr_map, prev_map)

    # Write dated file
    dated_path = os.path.join(OUT_DIR, f'daily_analysis_{today}.md')
    with open(dated_path, 'w') as f:
        f.write(md)
    print(f"Wrote {dated_path}")

    # Copy to latest
    latest_path = os.path.join(OUT_DIR, 'latest.md')
    shutil.copy2(dated_path, latest_path)
    print(f"Copied to {latest_path}")


if __name__ == '__main__':
    main()
