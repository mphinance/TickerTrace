"""
TickerTrace FastAPI Server

Public REST API for institutional ETF activity signals.
Runs alongside the Next.js frontend, sharing the same CSV data.

Usage:
    uvicorn api.server:app --port 8100 --reload

Or:
    python -m api.server
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
from . import data

app = FastAPI(
    title="TickerTrace API",
    description="Institutional ETF activity signals — daily holdings changes, conviction scores, sector flow, and divergences.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.get("/api/v1/signals")
def get_signals():
    """
    Full signal payload: stats, buying/selling signals, changes, sector flow, divergences.
    Equivalent to the Next.js /api/signals endpoint.
    """
    return data.get_full_payload()


@app.get("/api/v1/changes")
def get_changes(
    provider: Optional[str] = Query(None, description="Filter by provider name (e.g. 'ARK Invest', 'Kurv')"),
    fund: Optional[str] = Query(None, description="Filter by fund ticker (e.g. 'ARKK', 'KYLD')"),
    direction: Optional[str] = Query(None, description="Filter: 'buying' or 'selling'"),
    limit: int = Query(50, ge=1, le=200, description="Max results"),
):
    """
    All daily position changes, filterable by provider, fund, and direction.
    Sorted by absolute weight delta (biggest moves first).
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
        'count': len(changes[:limit]),
        'changes': changes[:limit],
    }


@app.get("/api/v1/fund/{fund}")
def get_fund(fund: str):
    """
    Full detail for a specific fund: top holdings, options count, AUM, total weight.
    """
    detail = data.get_fund_detail(fund.upper())
    if not detail:
        raise HTTPException(status_code=404, detail=f"Fund '{fund.upper()}' not found")
    return detail


@app.get("/api/v1/ticker/{ticker}")
def get_ticker(ticker: str):
    """
    Cross-fund detail for a specific ticker: every fund holding it, weights, and shares.
    """
    detail = data.get_ticker_detail(ticker.upper())
    if not detail:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker.upper()}' not found")
    return detail


@app.get("/api/v1/sectors")
def get_sectors():
    """Sector-level weight flow: inflows and outflows."""
    return data.get_sector_flow()


@app.get("/api/v1/divergences")
def get_divergences():
    """Tickers where funds disagree — buying and selling simultaneously."""
    return data.get_divergences()


@app.get("/api/v1/stats")
def get_stats():
    """Global stats: funds tracked, unique tickers, put/call ratio."""
    return data.get_global_stats()


@app.get("/api/v1/funds")
def list_funds():
    """List all tracked funds with their providers and AUM."""
    funds = []
    for fund, provider in sorted(data.FUND_PROVIDERS.items()):
        funds.append({
            'fund': fund,
            'provider': provider,
            'aum': data.FUND_AUM.get(fund),
        })
    return {'funds': funds}


@app.get("/health")
def health():
    return {"status": "ok", "asOfDate": data.get_as_of_date()}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8100)
