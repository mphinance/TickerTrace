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
    limit: int = Query(50, ge=1, le=200),
):
    """All daily position changes. Filterable by provider, fund, direction."""
    changes = data.compute_daily_changes()

    if fund:
        changes = [c for c in changes if c["fund"] == fund.upper()]
    elif provider:
        changes = [
            c for c in changes
            if data.FUND_PROVIDERS.get(c["fund"], c["fund"]) == provider
        ]

    if direction == "buying":
        changes = [c for c in changes if c["weightDelta"] > 0]
    elif direction == "selling":
        changes = [c for c in changes if c["weightDelta"] < 0]

    return {
        "asOfDate": data.get_as_of_date(),
        "count": len(changes[:limit]),
        "changes": changes[:limit],
    }


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


@app.get("/api/v1/divergences", tags=["public"])
@limiter.limit("60/minute")
def get_divergences(request: Request):
    """Cross-fund divergences — same ticker, opposite directions."""
    return data.get_divergences()


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
def get_activity(request: Request, period: str = Query("daily", regex="^(daily|weekly)$")):
    """
    Bucket today's (or this week's) changes into accumulating, reducing,
    and optionsActivity. Includes option records with decoded details.
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
    """List all tracked funds with provider and AUM."""
    funds = []
    for fund, provider in sorted(data.FUND_PROVIDERS.items()):
        funds.append({
            "fund": fund,
            "provider": provider,
            "aum": data.FUND_AUM.get(fund),
        })
    return {"funds": funds}


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
