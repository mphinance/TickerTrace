"""
TickerTrace FastAPI Server

Public, fully-open REST API for institutional ETF holdings data.
Firebase Auth and Stripe billing were removed May 2026 — TickerTrace is free
forever; we monetize through TraderDaddy.Pro (referral) instead.

The /auth/* endpoints (email+password register/login/me) are kept for any
future internal use, but the dashboard no longer renders auth UI.

Usage:
    uvicorn api.server:app --port 8100 --reload

Env vars (all optional):
    TICKERTRACE_BASE_URL — defaults to http://localhost:8100
    ALLOWED_ORIGINS      — comma-separated CORS allowlist; defaults to known sites
"""

import logging
import os
import re
import time
import uuid
from contextlib import asynccontextmanager
from typing import Optional

import structlog
from fastapi import FastAPI, HTTPException, Query, Request, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware

from . import data
from . import auth
from . import visits
# Heavy import paid at server startup, not on first request (review #18)
from effectiveness import analyze_all_funds, analyze_fund


# ─── Structured logging (review #20) ─────────────────────────────
# JSON output → docker logs are greppable / parseable; per-request bound
# context (request_id, path, method) flows through every log call.
logging.basicConfig(format="%(message)s", level=logging.INFO)
structlog.configure(
    processors=[
        structlog.contextvars.merge_contextvars,
        structlog.processors.add_log_level,
        structlog.processors.TimeStamper(fmt="iso"),
        structlog.processors.StackInfoRenderer(),
        structlog.processors.format_exc_info,
        structlog.processors.JSONRenderer(),
    ],
    wrapper_class=structlog.make_filtering_bound_logger(logging.INFO),
    logger_factory=structlog.PrintLoggerFactory(),
    cache_logger_on_first_use=True,
)
log = structlog.get_logger()


class RequestIdMiddleware(BaseHTTPMiddleware):
    """Attach a request_id to every log line emitted while handling a request."""

    async def dispatch(self, request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=rid,
            path=request.url.path,
            method=request.method,
        )
        start = time.perf_counter()
        try:
            response = await call_next(request)
        except Exception:
            log.exception("request_failed")
            raise
        else:
            duration_ms = round((time.perf_counter() - start) * 1000, 1)
            log.info("request", status=response.status_code, duration_ms=duration_ms)
            response.headers["x-request-id"] = rid
            return response

BASE_URL = os.getenv("TICKERTRACE_BASE_URL", "http://localhost:8100")

# ─── CORS allowlist ──────────────────────────────────────────────
_DEFAULT_ORIGINS = [
    "https://tickertrace.pro",
    "https://www.tickertrace.pro",
    "https://traderdaddy.pro",
    "https://www.traderdaddy.pro",
    "http://localhost:3000",
    "http://localhost:3001",
]
_env_origins = os.getenv("ALLOWED_ORIGINS", "")
ALLOWED_ORIGINS = (
    [o.strip() for o in _env_origins.split(",") if o.strip()]
    if _env_origins
    else _DEFAULT_ORIGINS
)

# ─── Rate limiter (per-IP, in-memory) ────────────────────────────
# headers_enabled is intentionally False: when True, slowapi tries to inject
# X-RateLimit-* headers into the response BEFORE FastAPI has materialized the
# dict return into a JSONResponse, which raises:
#   "parameter `response` must be an instance of starlette.responses.Response"
# and 500s every rate-limited endpoint. Rate limiting itself (the 429 path)
# still works fine; we just don't advertise remaining quota in headers.
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=["120/minute", "10000/day"],
    headers_enabled=False,
)


# ─── Lifespan: one-time startup work ─────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI):
    auth.init_db()
    log.info("startup_complete", allowed_origins=ALLOWED_ORIGINS)
    yield
    # graceful shutdown — close any pooled connections
    auth.close_all_connections()
    log.info("shutdown_complete")


app = FastAPI(
    title="TickerTrace API",
    description=(
        "**Free, open API** for institutional ETF activity — daily holdings "
        "changes, conviction scores, sector flow, and cross-fund divergences.\n\n"
        "Track what ARK Invest, Avantis, YieldMax, Kurv, REX Shares, NestYield, "
        "Roundhill, and Corgi Funds are buying and selling before everyone else.\n\n"
        "Pair with [TraderDaddy.Pro](https://www.traderdaddy.pro/?ref=8DUEMWAJ) "
        "if you want a trading agent that uses this data."
    ),
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
    openapi_tags=[
        {
            "name": "public",
            "description": "Open data endpoints. No API key, no auth — just the data.",
        },
        {
            "name": "marketing",
            "description": "Pointers to TraderDaddy.Pro and other useful destinations.",
        },
        {
            "name": "auth",
            "description": (
                "Email + password account endpoints. Hidden from the dashboard UI; "
                "kept for any future internal use."
            ),
        },
    ],
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Order matters: CORS first so preflight responses get the right headers,
# request-id second so it logs every actual handler invocation.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
    allow_credentials=False,
)
app.add_middleware(RequestIdMiddleware)


# ─── Validation patterns ─────────────────────────────────────────
_TICKER_PATTERN = re.compile(r"^[A-Za-z0-9.\-]{1,10}$")


# ─── Optional auth (only used by /auth/me) ───────────────────────
async def get_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None),
) -> Optional[str]:
    """Extract API key from header. Query-param auth is intentionally not supported
    (keys in URLs are logged by proxies/CDNs/browser history)."""
    return x_api_key


async def require_auth(
    request: Request,
    key: Optional[str] = Depends(get_api_key),
):
    """Require and validate API key. Only used by /auth/me now that the API is open."""
    if not key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Pass as X-API-Key header.",
        )
    allowed, reason = auth.check_access(key, request.url.path)
    if not allowed:
        raise HTTPException(status_code=403, detail=reason)
    auth.log_api_call(key, request.url.path)
    return key


# ─── Public (no auth) endpoints ──────────────────────────────────
@app.get("/health", tags=["public"])
@limiter.exempt
def health():
    return {"status": "ok", "asOfDate": data.get_as_of_date()}


@app.get("/api/v1/signals", tags=["public"])
@limiter.limit("60/minute")
def get_signals(request: Request):
    """
    Full signal payload — conviction-scored buys/sells, daily changes,
    sector flow, divergences. Fully open, no API key required.
    """
    return data.get_full_payload()


@app.get("/api/v1/stats", tags=["public"])
@limiter.limit("120/minute")
def get_stats(request: Request):
    """Global stats — funds tracked, unique underlyings, options counts."""
    return data.get_global_stats()


@app.get("/api/v1/sectors", tags=["public"])
@limiter.limit("120/minute")
def get_sectors(request: Request):
    """Sector-level inflows / outflows."""
    return data.get_sector_flow()


@app.get("/api/v1/changes", tags=["public"])
@limiter.limit("60/minute")
def get_changes(
    request: Request,
    provider: Optional[str] = Query(None),
    fund: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    limit: int = Query(50, ge=1, le=5000),
):
    """Position changes over a window. Filterable by provider, fund, direction.

    `limit` allows up to 5000 because broad value funds (e.g. Avantis AVUV
    holds ~800 names) generate well over a thousand small daily changes — a
    low cap, applied after sorting by magnitude, silently drops them entirely.

    `period` selects the comparison window: 'daily' (latest two snapshots),
    'weekly' (~7 calendar days) or 'monthly' (~30 calendar days). Weekly and
    monthly are the right horizon for active-equity funds, where a NEW or
    REMOVED row means a position was entered or exited over that window.
    """
    if period == "weekly":
        changes = data.compute_weekly_changes()
    elif period == "monthly":
        changes = data.compute_monthly_changes()
    else:
        changes = data.compute_daily_changes()

    if fund:
        changes = [c for c in changes if c["fund"] == fund.upper()]
    elif provider:
        changes = [
            c for c in changes
            if data.FUND_PROVIDERS.get(c["fund"], c["fund"]) == provider
        ]

    # "Buying"/"selling" means the manager traded, so filter on the
    # drift-adjusted move — a position whose weight only rose because the stock
    # rallied is not a fund buying it.
    if direction == "buying":
        changes = [c for c in changes if c["activeWeightDelta"] > 0]
    elif direction == "selling":
        changes = [c for c in changes if c["activeWeightDelta"] < 0]

    return {
        "asOfDate": data.get_as_of_date(),
        "count": len(changes[:limit]),
        "changes": changes[:limit],
    }


@app.get("/api/v1/institutional", tags=["public"])
@limiter.limit("60/minute")
def get_institutional(
    request: Request,
    period: str = Query("daily", regex="^(daily|weekly|monthly)$"),
    limit: int = Query(25, ge=1, le=100),
):
    """Institutions-as-a-whole flow over a daily/weekly/monthly window.

    Blends every stock-picking fund (pure option-income funds excluded) into
    one AUM-weighted portfolio and reports which tickers that combined book is
    net buying and net selling. The 'combined average weight' view — what
    institutions in aggregate are accumulating or trimming.
    """
    return data.compute_institutional_flow(period=period, limit=limit)


@app.get("/api/v1/institutional-trend", tags=["public"])
@limiter.limit("60/minute")
def get_institutional_trend(request: Request, limit: int = Query(15, ge=1, le=50)):
    """Per-ticker institutional flow across day/week/month at once.

    Each ticker carries its blended-weight change over all three horizons
    (one fixed denominator, so they're directly comparable and overlayable)
    plus an accumulation/distribution signal. Ranked by the monthly move.
    Powers the trend-overlay visual: sustained buying vs. the moment selling
    starts.
    """
    return data.compute_institutional_trend(limit=limit)


@app.get("/api/v1/fund/{fund}", tags=["public"])
@limiter.limit("120/minute")
def get_fund(request: Request, fund: str):
    """Fund holdings detail — top holdings, options count, AUM."""
    if not _TICKER_PATTERN.match(fund):
        raise HTTPException(status_code=400, detail="Invalid fund ticker format")
    detail = data.get_fund_detail(fund.upper())
    if not detail:
        raise HTTPException(status_code=404, detail=f"Fund '{fund.upper()}' not found")
    return detail


@app.get("/api/v1/fund-effectiveness", tags=["public"])
@limiter.limit("30/minute")
def get_all_fund_effectiveness(request: Request):
    """
    Compare all option-income funds side-by-side. Returns effectiveness
    analysis for every fund with options data, sorted by composite score.
    """
    results = analyze_all_funds()
    return {"funds": results, "count": len(results)}


@app.get("/api/v1/fund-effectiveness/{fund}", tags=["public"])
@limiter.limit("60/minute")
def get_fund_effectiveness(request: Request, fund: str):
    """Fund effectiveness analysis — option-income strategy execution."""
    if not _TICKER_PATTERN.match(fund):
        raise HTTPException(status_code=400, detail="Invalid fund ticker format")
    result = analyze_fund(fund.upper())
    if not result:
        raise HTTPException(
            status_code=404,
            detail=f"No effectiveness data for '{fund.upper()}'. "
                   "Only option-income funds are analyzed.",
        )
    return result


@app.get("/api/v1/ticker/{ticker}", tags=["public"])
@limiter.limit("120/minute")
def get_ticker(request: Request, ticker: str):
    """Cross-fund ticker detail — who's buying/selling this?"""
    if not _TICKER_PATTERN.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format")
    detail = data.get_ticker_detail(ticker.upper())
    if not detail:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker.upper()}' not found")
    return detail


@app.get("/api/v1/stock/{ticker}", tags=["public"])
@limiter.limit("120/minute")
def get_stock(request: Request, ticker: str):
    """Per-stock page payload — holders + the institutional A/D trend & history."""
    if not _TICKER_PATTERN.match(ticker):
        raise HTTPException(status_code=400, detail="Invalid ticker format")
    detail = data.get_stock_detail(ticker.upper())
    if not detail:
        raise HTTPException(status_code=404, detail=f"Ticker '{ticker.upper()}' not found")
    return detail


@app.get("/api/v1/divergences", tags=["public"])
@limiter.limit("60/minute")
def get_divergences(request: Request):
    """Cross-fund divergences — same ticker, opposite directions."""
    return data.get_divergences()


@app.get("/api/v1/layering-patterns", tags=["public"])
@limiter.limit("60/minute")
def get_layering_patterns(
    request: Request,
    window_days: int = Query(7, ge=2, le=30),
    min_funds: int = Query(3, ge=2, le=10),
    limit: int = Query(20, ge=1, le=100),
):
    """Cross-fund layering — 3+ stock-pickers opening the SAME new position in days.

    Surfaces tickers where multiple institutional funds independently entered a
    brand-new position within `window_days` trading days, ranked by a conviction
    score that favors cross-family agreement. The entry *sequence* (who moved
    first) is the part only daily data can show.
    """
    return data.compute_layering_patterns(
        window_days=window_days, min_funds=min_funds, limit=limit
    )


@app.get("/api/v1/briefing", tags=["public"])
@limiter.limit("60/minute")
def get_briefing(request: Request):
    """
    Pre-market briefing — top buys, top sells, multi-provider convergence,
    active streaks, and notable new option positions.
    """
    return data.get_briefing()


@app.get("/api/v1/activity", tags=["public"])
@limiter.limit("60/minute")
def get_activity(request: Request, period: str = Query("daily", regex="^(daily|weekly|monthly)$")):
    """
    Bucket changes into accumulating, reducing, and optionsActivity over a
    daily, weekly (~7d) or monthly (~30d) window. Includes option records
    with decoded details.
    """
    return data.get_activity(period=period)


@app.get("/api/v1/holdings", tags=["public"])
@limiter.limit("30/minute")
def get_all_holdings(request: Request):
    """
    Every latest holding row across every tracked fund, with today's
    weightDelta / sharesDelta attached. Heavy payload — limited to 30/minute.
    """
    return data.get_all_holdings()


@app.get("/api/v1/funds", tags=["public"])
@limiter.limit("120/minute")
def list_funds(request: Request):
    """List all tracked funds, enriched with holdings counts and top holding.

    Backward-compatible superset of the old shape (fund/provider/category/aum
    are still present) — now also holdingsCount, optionsCount, topHolding.
    Powers the /funds index page.
    """
    return {"funds": data.get_funds_index(), "asOfDate": data.get_as_of_date()}


@app.get("/api/v1/tickers", tags=["public"])
@limiter.limit("120/minute")
def list_tickers(
    request: Request,
    limit: int = Query(100, ge=1, le=1000),
    sort: str = Query("funds", regex="^(funds|weight)$"),
):
    """Most widely-held underlying tickers across all funds — the /stocks index.

    `sort=funds` (default) ranks by how many funds hold the name; `sort=weight`
    ranks by total weight summed across funds. Each row carries net daily
    weight change for momentum.
    """
    tickers = data.get_tickers_index(limit=limit, sort=sort)
    return {"count": len(tickers), "asOfDate": data.get_as_of_date(), "tickers": tickers}


class TrackBody(BaseModel):
    path: str = ""


@app.post("/api/v1/visits/track", tags=["public"])
@limiter.limit("60/minute")
def track_visit(request: Request, body: TrackBody | None = None):
    """Record a pageview. Fire-and-forget from the browser; never returns
    visitor data. Visitor identity is hashed (sha256(ip + salt)) before
    storage so we don't keep raw IPs."""
    try:
        visits.record(
            ip=get_remote_address(request),
            path=(body.path if body else "") or request.headers.get("referer", "")[:120],
        )
    except Exception as e:  # never fail the request — it's telemetry
        log.warning("visit_track_error", error=str(e))
    return {"ok": True}


@app.get("/api/v1/visits/live", tags=["public"])
@limiter.limit("120/minute")
def get_live_visits(request: Request):
    """Public visitor counts — used by the footer pill on every page and
    embeddable by anyone else."""
    return visits.live_counts()


@app.get("/api/v1/signal-performance", tags=["public"])
@limiter.limit("60/minute")
def get_signal_performance(request: Request):
    """Backtest: did the historical buy/sell signals actually work?

    Pre-computed nightly by `python -m api.signal_performance`; served
    from a JSON cache on disk so the request path is fast. Aggregates
    median forward return + win rate across all historical signals,
    overall and per fund family.
    """
    from api import signal_performance
    cached = signal_performance.read_cache()
    if cached is None:
        raise HTTPException(
            status_code=503,
            detail="Signal performance cache not yet generated. Run "
                   "`python -m api.signal_performance` to build it.",
        )
    return cached


@app.get("/api/v1/options-listings", tags=["public"])
@limiter.limit("60/minute")
def get_options_listings(request: Request):
    """CBOE Options Scanner — daily diff of CBOE's published option universe.

    Detects stocks gaining options for the first time (Symbol Directory) and
    weekly-options promotions / demotions (Available Weeklys). Returns the
    last 7 days of scan history; `latest` is the newest scan.

    Standalone CBOE market data — refreshed each weekday morning by
    `python cboe_scanner.py` in the GitHub Actions workflow.
    """
    import cboe_scanner
    return cboe_scanner.read_options_listings()


# ─── Auth endpoints (email+password only — Firebase removed) ─────
class RegisterRequest(BaseModel):
    email: str
    password: str
    source: str = ""


class LoginRequest(BaseModel):
    email: str
    password: str


@app.post("/auth/register", include_in_schema=False, tags=["auth"])
def register(body: RegisterRequest):
    """
    Register for a (free) API key. Kept for any future internal use; the
    dashboard does not surface this endpoint.
    """
    if not body.email or "@" not in body.email:
        raise HTTPException(status_code=400, detail="Valid email required")
    if not body.password or len(body.password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    existing = auth.get_user_by_email(body.email)
    if existing:
        raise HTTPException(status_code=409, detail="Account already exists. Try logging in.")

    user = auth.create_user(email=body.email, source=body.source, password=body.password)
    return {
        "message": "Account created.",
        "api_key": user["api_key"],
        "tier": user["tier"],
        "email": user["email"],
        "docs": f"{BASE_URL}/docs",
    }


@app.post("/auth/login", include_in_schema=False, tags=["auth"])
def login(body: LoginRequest):
    """Log in with email + password. Returns API key."""
    if not body.email or not body.password:
        raise HTTPException(status_code=400, detail="Email and password required")

    user = auth.authenticate(body.email, body.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    usage = auth.get_usage_count(user["api_key"])
    limit = auth.RATE_LIMITS.get(user["tier"], 100)

    return {
        "api_key": user["api_key"],
        "email": user["email"],
        "tier": user["tier"],
        "usage_24h": usage,
        "rate_limit_24h": limit,
    }


@app.get("/auth/me", include_in_schema=False, tags=["auth"])
def get_me(key: str = Depends(require_auth)):
    """Check your API key status, tier, and usage."""
    user = auth.get_user_by_key(key)
    if not user:
        raise HTTPException(status_code=404)
    usage = auth.get_usage_count(key)
    limit = auth.RATE_LIMITS.get(user["tier"], 100)
    return {
        "email": user["email"],
        "tier": user["tier"],
        "api_key": key[:12] + "..." + key[-4:],
        "usage_24h": usage,
        "rate_limit_24h": limit,
        "source": user["source"],
        "created_at": user["created_at"],
    }


# ─── Marketing / hand-off ────────────────────────────────────────
@app.get("/api/v1/traderdaddy", tags=["marketing"])
def traderdaddy_handoff():
    """
    Where to take this data next. Returns the TraderDaddy referral URL and
    a short pitch — designed for agentic clients that want a 'now what?' answer.
    """
    return {
        "name": "TraderDaddy.Pro",
        "tagline": "We track the moves. TraderDaddy trades them.",
        "url": "https://www.traderdaddy.pro/?ref=8DUEMWAJ",
        "why": (
            "TickerTrace surfaces what institutions are buying. TraderDaddy turns "
            "those signals into sized entries, alerts, and option flow plays. It "
            "already consumes this API."
        ),
        "is_referral": True,
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8100)
