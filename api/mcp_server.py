"""
TickerTrace FastMCP Server

Model Context Protocol server — lets AI agents query institutional ETF signals.

Usage:
    python -m api.mcp_server

MCP tools exposed:
    - get_signals: Top buying/selling signals with conviction scores
    - get_changes: All daily position changes (filterable)
    - get_fund_detail: Full holdings for a specific fund
    - get_ticker_detail: Cross-fund detail for a specific ticker
    - get_sector_flow: Money flowing in/out of sectors
    - get_divergences: Cross-fund conflicts
"""

from fastmcp import FastMCP
from . import data

mcp = FastMCP("TickerTrace")


@mcp.tool()
def get_signals() -> dict:
    """
    Get today's top institutional buying and selling signals.
    Signals are ranked by conviction score (AUM-weighted, multi-provider bonus).
    Returns buying and selling lists with ticker, funds, providers, and conviction.
    """
    return data.get_signals()


@mcp.tool()
def get_changes(provider: str = "", fund: str = "", direction: str = "") -> dict:
    """
    Get all daily position changes across tracked ETFs.

    Args:
        provider: Filter by provider name (e.g. 'ARK Invest', 'Kurv', 'YieldMax')
        fund: Filter by specific fund ticker (e.g. 'ARKK', 'KYLD')
        direction: Filter by 'buying' or 'selling'

    Returns:
        List of position changes sorted by absolute weight delta.
    """
    changes = data.compute_daily_changes()

    if fund:
        changes = [c for c in changes if c['fund'] == fund.upper()]
    elif provider:
        changes = [c for c in changes
                   if data.FUND_PROVIDERS.get(c['fund'], c['fund']) == provider]

    if direction == 'buying':
        changes = [c for c in changes if c['weightDelta'] > 0]
    elif direction == 'selling':
        changes = [c for c in changes if c['weightDelta'] < 0]

    return {
        'asOfDate': data.get_as_of_date(),
        'count': len(changes[:50]),
        'changes': changes[:50],
    }


@mcp.tool()
def get_fund_detail(fund: str) -> dict:
    """
    Get full detail for a specific ETF fund.

    Args:
        fund: ETF ticker (e.g. 'ARKK', 'AVUV', 'KYLD')

    Returns:
        Provider, AUM, holdings count, top 20 holdings with weights and shares.
    """
    detail = data.get_fund_detail(fund.upper())
    return detail or {"error": f"Fund '{fund.upper()}' not found"}


@mcp.tool()
def get_ticker_detail(ticker: str) -> dict:
    """
    Get cross-fund detail for a specific stock ticker.
    Shows every fund holding this ticker, their weights, and share counts.

    Args:
        ticker: Stock ticker (e.g. 'TSLA', 'NVDA', 'AMZN')

    Returns:
        Fund-by-fund breakdown of the position.
    """
    detail = data.get_ticker_detail(ticker.upper())
    return detail or {"error": f"Ticker '{ticker.upper()}' not found"}


@mcp.tool()
def get_sector_flow() -> dict:
    """
    Get sector-level weight changes.
    Shows which economic sectors are seeing institutional inflows vs outflows.

    Returns:
        Inflows and outflows lists with sector name and weight delta.
    """
    return data.get_sector_flow()


@mcp.tool()
def get_divergences() -> list:
    """
    Get cross-fund divergences — tickers where different funds disagree.
    One fund is buying while another is selling the same ticker.
    These are rare and notable.

    Returns:
        List of divergences with buying and selling fund lists.
    """
    return data.get_divergences()


@mcp.tool()
def get_layering_patterns(window_days: int = 7, min_funds: int = 3, limit: int = 20) -> dict:
    """
    Get cross-fund "layering" patterns — tickers where multiple institutional
    stock-pickers each opened a BRAND-NEW position within a few trading days of
    each other. This is real-time consensus building that quarterly 13F data
    can't see; the entry order (who moved first) often precedes a breakout.

    Args:
        window_days: trading-day window the entries must fall within (default 7).
        min_funds: minimum distinct funds required to count as layering (default 3).
        limit: maximum number of patterns to return, ranked by strength (default 20).

    Returns:
        Patterns ranked by conviction (cross-family agreement weighted highest),
        each with the full entry sequence: fund, provider, entry date, and weight.
    """
    return data.compute_layering_patterns(
        window_days=window_days, min_funds=min_funds, limit=limit
    )


@mcp.tool()
def get_market_summary() -> dict:
    """
    Get a complete market summary: stats, top signals, sector flow, and divergences.
    Best for getting a quick overview of institutional activity today.
    """
    return data.get_full_payload()


if __name__ == "__main__":
    mcp.run()
