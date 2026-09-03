# TickerTrace — Comprehensive Code Review

> Generated May 16, 2026. This is a prioritized list of suggestions, not a rewrite. Each item explains *why* the current code could be improved and shows a concrete fix.
>
> Findings are tagged P0 → P3 by urgency. Cross-references by review dimension (architecture / readability / performance / security / error handling) appear at the end.

---

## P0 — Fix this week

### 1. Stale API base URL in auth-context (already broken in prod)

**Where:** `etf-dashboard/components/auth-context.tsx:11`, `etf-dashboard/components/auth-modal.tsx:246`

```ts
const API_BASE = "https://api.tickertrace.pro";  // ← does not exist
```

`CLAUDE.md` is explicit: `api.tickertrace.mphinance.com` is the ONLY working API domain. Every other file uses it correctly. These two files would silently fail any Firebase sync or checkout if a user did hit them. Since you've now hidden the auth UI, this is dormant — but if you ever re-enable, it's an immediate broken flow.

**Fix:**

```ts
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.tickertrace.mphinance.com";
```

Pull the base URL out of every component and centralize it in `lib/api.ts`:

```ts
// etf-dashboard/lib/api.ts
export const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "https://api.tickertrace.mphinance.com";
export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => res.statusText)}`);
  return res.json();
}
```

Then `grep` the repo and replace every hardcoded URL.

---

### 2. CORS wildcard with auth+billing endpoints

**Where:** `api/server.py:78-83`

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

`allow_origins=["*"]` is fine for purely public data, but the same app exposes `/auth/firebase-login`, `/billing/checkout`, `/admin/promo`, `/billing/webhook`. With `allow_credentials` off (default) you're not exposing cookies, but you *are* letting any site CSRF-style POST to `/auth/firebase-login` with a stolen-then-used token. More importantly, `*` blocks you from ever using credentialed requests later.

**Fix:**

```python
ALLOWED_ORIGINS = [
    "https://tickertrace.pro",
    "https://www.tickertrace.pro",
    "https://traderdaddy.pro",
    "https://www.traderdaddy.pro",
    "https://tradermatrix.pro",
    "https://www.tradermatrix.pro",
    "http://localhost:3000",
    "http://localhost:3001",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type", "X-API-Key"],
    allow_credentials=False,  # explicit
)
```

If you keep the public-data endpoints truly anonymous, you can mount a second `app` instance under `/api/v1/*` with `allow_origins=["*"]` and keep `/auth` + `/billing` locked down.

---

### 3. SQLite "open new connection per call" pattern

**Where:** every function in `api/auth.py`

```python
def get_user_by_email(email: str) -> Optional[dict]:
    conn = _get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None
```

There are ~15 such functions. Each opens a file handle, runs the WAL pragma, executes one statement, closes. Under `uvicorn --workers 2` you get WAL lock contention; under load each request does 3-4 of these in series.

**Fix:** thread-local connection wrapped in a contextmanager.

```python
import threading
_tls = threading.local()

def _get_db() -> sqlite3.Connection:
    conn = getattr(_tls, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        _tls.conn = conn
    return conn

@contextmanager
def tx():
    conn = _get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
```

Then every helper becomes:

```python
def get_user_by_email(email: str) -> Optional[dict]:
    row = _get_db().execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    return dict(row) if row else None
```

No more close-per-call. If you outgrow SQLite, migrate to Postgres with `asyncpg` — same shape, async-native.

---

### 4. Stripe webhook lacks idempotency

**Where:** `api/server.py:470-520`

Stripe retries webhooks on any non-2xx and on timeout. The current handler:

- Has no record of "did I already process event `evt_XXXXX`?"
- Does `upgrade_user` / `downgrade_user` without checking the order events arrived
- A `subscription.updated` (status="active") that arrives *after* a `subscription.deleted` will silently revive a cancelled user

**Fix:** dedupe by `event.id` and process in-order.

```python
# Add to schema
CREATE TABLE IF NOT EXISTS stripe_events (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    received_at TEXT NOT NULL
);

# In handler:
event_id = event["id"]
with tx() as conn:
    cur = conn.execute("INSERT OR IGNORE INTO stripe_events (id, type, received_at) VALUES (?, ?, ?)",
                       (event_id, event["type"], datetime.now(timezone.utc).isoformat()))
    if cur.rowcount == 0:
        return {"received": True, "duplicate": True}
```

Also: store the subscription's `current_period_end` so you can ignore stale `updated` events.

---

### 5. `init_db()` runs at module import

**Where:** `api/auth.py:328` — `init_db()` at end of file.

```python
# At end of auth.py:
init_db()  # ← runs on every import, in every process, before app even starts
```

Three problems:

1. With `--workers 2` you race on `ALTER TABLE` migrations
2. A corrupted DB file makes `import api.auth` fail, which makes the entire app fail to boot
3. CLI tools that import `auth` for one function (like `check_db.py`, `cleanup_db.py`) pay the migration cost too

**Fix:** lifespan hook.

```python
# api/auth.py — remove `init_db()` from module bottom

# api/server.py:
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    auth.init_db()  # one-time, app-startup
    yield

app = FastAPI(lifespan=lifespan, ...)
```

Or graduate to Alembic if the schema grows.

---

### 6. `require_auth` does 4 DB round-trips per request

**Where:** `api/server.py:99-117` + `api/auth.py:check_access`

For one authenticated request:

1. `get_user_by_key()` — SELECT users
2. `get_usage_count()` — SELECT count from api_usage
3. `log_api_call` → INSERT api_usage
4. `log_api_call` → UPDATE users.last_api_call

That's 4 statements before your handler runs. On SQLite over a Docker volume this matters.

**Fix:** consolidate to one read, defer the write.

```python
# auth.py — single read
def get_user_with_usage(api_key: str, hours: int = 24) -> Optional[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    row = _get_db().execute("""
        SELECT u.*, COALESCE((
            SELECT COUNT(*) FROM api_usage
             WHERE api_key = u.api_key AND timestamp > ?
        ), 0) AS usage_24h
          FROM users u WHERE u.api_key = ?
    """, (cutoff, api_key)).fetchone()
    return dict(row) if row else None

# server.py — defer the log
from fastapi import BackgroundTasks

async def require_auth(
    request: Request,
    background: BackgroundTasks,
    key: Optional[str] = Depends(get_api_key),
):
    if not key: raise HTTPException(401, "...")
    user = auth.get_user_with_usage(key)
    if not user: raise HTTPException(401, "Invalid key")
    if user["usage_24h"] >= auth.RATE_LIMITS.get(user["tier"], 100):
        raise HTTPException(429, "Rate limit exceeded")
    background.add_task(auth.log_api_call, key, request.url.path)
    return key
```

The user sees the response immediately; the audit log is written after.

---

## P1 — Worth doing this month

### 7. `scrape_avantis.py` is a 793-line monolith

**Where:** `scrape_avantis.py`

One file does HTTP, HTML parsing, CSV parsing, option parsing, dedupe, DB persistence, CSV output. Every fund family has special-cased branching inside `main()`. Hard to test, hard to retry a single fund, hard to add a new provider.

**Fix:** one module per provider, one tiny orchestrator.

```
scrapers/
  __init__.py
  base.py          # ABC with .ticker, .fetch() -> DataFrame, .normalize(df)
  avantis.py
  arkfunds.py
  kurv.py
  tidal.py         # YieldMax + NestYield + NicholasX share format
  rex.py
  roundhill.py
  corgi.py
run_scrape.py      # iterates, retries per provider, writes one CSV
```

```python
# scrapers/base.py
from abc import ABC, abstractmethod
import pandas as pd

class FundScraper(ABC):
    provider: str
    @abstractmethod
    def fetch(self, ticker: str) -> pd.DataFrame: ...
    def normalize(self, df: pd.DataFrame) -> pd.DataFrame:
        # default normalization — providers override only if needed
        ...
```

Each provider becomes ~40 lines. `pytest` can mock `requests` per-provider.

---

### 8. Bare/broad exception handling masks real bugs

Examples:

```python
# auth-context.tsx:83
} catch {
    return { ok: false, error: "Network error. Please try again." };
}
```

```python
# server.py:42-48
try: _init_firebase()
except Exception as e:
    print(f"[CRITICAL] Firebase Admin SDK init failed: {e}")
    sys.exit(1)
```

```python
# auth.py:114
except sqlite3.IntegrityError:
    # User already exists — return existing
    return get_user_by_email(email)
```

The auth.py catch is *especially* misleading: `IntegrityError` could be email collision OR api_key collision (extremely unlikely with 48 hex chars, but the comment is wrong by assumption). The auth-context one swallows AbortError, parsing errors, and CORS failures into one message.

**Fix:** narrow types and surface them.

```python
except sqlite3.IntegrityError as e:
    if "users.email" in str(e):
        return get_user_by_email(email)
    raise  # don't swallow api_key collision — that's a real bug
```

```ts
} catch (err) {
    if (err instanceof TypeError) return { ok: false, error: "Network error" };
    if (err instanceof SyntaxError) return { ok: false, error: "Server returned bad JSON" };
    throw err;
}
```

---

### 9. `dashboard/page.tsx` is 931 lines of inline components

**Where:** `etf-dashboard/app/dashboard/page.tsx`

Every UI primitive (`KPICard`, `DivergenceRow`, `TickerDetailCard`, `BriefingCard`, `SignalsHero`, `ProviderGroupedTable`, `OptionsTable`, etc.) is declared inside the page file. Two of them (`SignalsHero`, `ActivityViewer`) are 80+ lines each.

**Fix:** extract to `components/dashboard/`:

```
components/dashboard/
  kpi-card.tsx
  divergence-row.tsx
  ticker-detail-card.tsx
  briefing-card.tsx
  signals-hero.tsx
  signal-row.tsx
  activity-viewer.tsx
  equity-table.tsx
  options-table.tsx
  fund-badge.tsx
  utils.ts        # getETFColor, groupByProvider
```

`page.tsx` shrinks to ~150 lines that just composes. Storybook-able. Diffable. Each file becomes a unit you can refactor without rebasing on 900 lines of unrelated JSX.

---

### 10. `holdings.ts` and `api/data.py` duplicate the same logic in two languages — *mostly addressed*

**Status (May 16, 2026 — finale):** Done for everything user-visible. The dashboard, changes page, fund profile pages, and `/api/signals` proxy all fetch from FastAPI via `lib/api.ts`. The Python implementation is the single source of truth. Tests cover the new shapes (briefing, activity, enriched signals, divergences with intrashop, fund detail with deltas). `holdings.ts` is reduced to a static-reference-data file plus the single remaining raw-row consumer at `/holdings`.

**What's left:** the `/holdings` page (the full database table). It needs CSV-shaped fields (`Option_Type`, `Option_Strike`, `DTE`, etc.) that the API's `/api/v1/holdings` endpoint doesn't expose. Migrating it would require either reshaping that endpoint or rewriting the data-table columns. Low-priority; the page works fine on `holdings.ts` and the deprecation header points future contributors at `api/data.py` for any change that affects shared logic.



**Where:** `etf-dashboard/lib/holdings.ts` (1067 lines) + `api/data.py` (396 lines)

Both compute conviction scores, signals, sector flow, divergences. Both maintain a copy of `FUND_PROVIDERS`, `FUND_AUM`, junk-ticker filters. Drift is inevitable: I already see `FUND_PROVIDERS` having different membership in each (e.g. the Roundhill family). When you add a fund, you have to edit both.

**Fix:** pick a single source of truth. Two options:

**Option A (recommended) — Server-side render the data, drop holdings.ts:**

The Next.js dashboard already calls `getDailyDiff()` from `holdings.ts` at request time. Replace those with `fetch('/api/v1/signals')` from the FastAPI server. You already proxy through `app/api/signals/`. Nuke holdings.ts.

```tsx
// app/dashboard/page.tsx
export const revalidate = 3600;

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const params = await searchParams;
  const data = await fetch(`${API_BASE}/api/v1/signals`, { next: { revalidate: 3600 } })
                       .then(r => r.json());
  // ... pass data.signals, data.changes, etc. into components
}
```

Dashboard becomes UI-only. Python is the truth.

**Option B — Generate TS types from Python:** keep both implementations but auto-generate types/constants from the Python source so they can't drift. Heavier lift.

**Why the migration is bigger than first framed:** the dashboard's signal cards render fields (`streak`, `currentWeight`, `fundCount`, `providerCount`) and richer per-fund objects that the current FastAPI response doesn't include. A full migration means either (a) enriching the FastAPI schemas with those fields, or (b) accepting some dashboard feature loss. Option (a) is the right play but is a separate work session. The deprecation header on `holdings.ts` is a guardrail so any change there is also reflected in `api/data.py`.

---

### 11. No rate limiting on public endpoints

**Where:** `api/server.py:131-253`

`/api/v1/signals`, `/api/v1/changes`, `/api/v1/funds`, `/api/v1/ticker/{ticker}` — none have rate limits. Now that the API is fully open, you're a tweet away from someone scraping it in a tight loop.

**Fix:** `slowapi` with Redis or in-memory.

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute", "10000/day"])
app.state.limiter = limiter

@app.get("/api/v1/signals")
@limiter.limit("60/minute")
def get_signals(request: Request):
    return data.get_full_payload()
```

Or put Cloudflare in front of `api.tickertrace.mphinance.com` and configure WAF rate rules.

---

### 12. Owner email hardcoded in source

**Where:** `api/server.py:321` → `OWNER_EMAIL = "mphanko@gmail.com"`

```python
if email.lower() == OWNER_EMAIL:
    auth.upgrade_user(email, tier="pro")
```

Anyone reading the repo (public-ish) knows your auto-pro email. They can't *use* it without your Firebase password, but it's a useful piece of recon for spear-phishing.

**Fix:**

```python
OWNER_EMAILS = {e.strip().lower() for e in os.getenv("TICKERTRACE_OWNER_EMAILS", "").split(",") if e.strip()}
```

Set `TICKERTRACE_OWNER_EMAILS` in `api/.env`. Now the email lives in your server env, not git history.

---

### 13. `_is_junk_ticker` is broader than it claims

**Where:** `api/data.py:22-44`

```python
# Shorter CUSIPs that start with 3+ digits (e.g. '912797RS8' with 9 chars already caught,
# but catch any starting-with-digits pattern)
if len(ticker) >= 6 and ticker[:3].isdigit():
    return True
```

This filters out any ticker ≥6 chars whose first 3 are digits. There are valid tickers that fit (think future ETFs starting with numerics; less common in US listings but real in international ones — and you have international Bloomberg suffixes). And:

```python
if ticker.upper().endswith('XXX') or ticker.upper().endswith('XX'):
    return True
```

`ends with 'XX'` matches any 2-letter `XX` ending. Edge case, but it's a footgun.

**Fix:** explicit allowlist for the "shape" of a valid ticker, plus the explicit junk set.

```python
_VALID_TICKER_RE = re.compile(r"^[A-Z][A-Z0-9.\-]{0,9}$")  # starts with letter, alphanumeric
_MONEY_MARKET_FUNDS = {"FGXXX", "SPAXX", "TTTXX", "FZFXX", ...}

def _is_junk_ticker(ticker: str) -> bool:
    t = ticker.strip().upper()
    if not t or t in JUNK_TICKERS or t in _MONEY_MARKET_FUNDS:
        return True
    if not _VALID_TICKER_RE.match(t):
        return True  # CUSIPs and other identifiers fail this naturally
    return False
```

Faster, narrower, less surprising.

---

### 14. `get_full_payload` recomputes the same changes list 4×

**Where:** `api/data.py:381-396`

```python
def get_full_payload() -> dict:
    signals = get_signals()              # calls compute_daily_changes()
    return {
        ...,
        'signals': signals,
        'changes': compute_daily_changes()[:50],   # again
        'sectorFlow': get_sector_flow(),  # again
        'divergences': get_divergences(), # again
    }
```

Each of those re-reads the CSVs and re-aggregates. For the most-hit endpoint.

**Fix:** compute once, pass down.

```python
def get_full_payload() -> dict:
    changes = compute_daily_changes()
    return {
        'asOfDate': get_as_of_date(),
        'stats': get_global_stats(),
        'signals': _signals_from(changes),
        'changes': changes[:50],
        'sectorFlow': _sector_flow_from(changes),
        'divergences': _divergences_from(changes),
    }
```

Or wrap with `functools.lru_cache(maxsize=1)` keyed on `get_as_of_date()`:

```python
from functools import lru_cache

@lru_cache(maxsize=1)
def _cached_changes(date_key: str) -> tuple:
    return tuple(compute_daily_changes())

def compute_daily_changes_cached() -> list[dict]:
    return list(_cached_changes(get_as_of_date()))
```

(Tuple-ify to make hashable. Cache invalidates when `as_of_date` changes — i.e. after the daily scrape.)

---

## P2 — Polish

### 15. Stale URL in tier-access error message

**Where:** `api/auth.py:316`

```python
return False, f"Endpoint '{endpoint}' requires Pro tier. Upgrade at https://ticker-trace.vercel.app"
```

Domain hasn't been `ticker-trace.vercel.app` in weeks. And — with the API fully open now — this whole branch is dead code. Either remove the message entirely (just `return False, "Forbidden"`) or set everyone to `tier='pro'` permission-wise and stop checking.

---

### 16. Inline-style CSS in `auth-modal.tsx`

**Where:** `etf-dashboard/components/auth-modal.tsx`

300+ lines of CSS-in-JS objects (`inputStyle`, `btnPrimary`, `googleBtnStyle`...). Every other component uses Tailwind. Mixed conventions hurt grep and discoverability.

**Fix (when re-enabling):** convert to Tailwind:

```tsx
const inputClass = "w-full px-3.5 py-2.5 bg-white/5 border border-white/10 rounded-lg text-slate-200 text-sm outline-none focus:border-indigo-500/60";
```

Low priority because nothing renders this right now.

---

### 17. Scrapers have no per-fund retry or parallelism

**Where:** `scrape_avantis.py` — sequential `requests.get(url, timeout=30)` for each of ~40 funds.

If one fund is slow, the whole pipeline pays. If one fund 503s, you lose its data for the day.

**Fix:** `tenacity` for retry, `ThreadPoolExecutor` for parallelism.

```python
from tenacity import retry, stop_after_attempt, wait_exponential
from concurrent.futures import ThreadPoolExecutor, as_completed

@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=2, max=10))
def fetch_csv(url: str, headers: dict, timeout: int = 30):
    r = requests.get(url, headers=headers, timeout=timeout)
    r.raise_for_status()
    return r.content

with ThreadPoolExecutor(max_workers=6) as pool:
    futures = {pool.submit(scrape_one, f): f for f in FUNDS}
    for fut in as_completed(futures):
        fund = futures[fut]
        try:
            results[fund['ticker']] = fut.result()
        except Exception as e:
            logger.error("fund=%s failed: %s", fund['ticker'], e)
```

Wall time drops from "~40 × slow fund" to "max(slow fund) + small overhead". Also makes failures isolated.

---

### 18. Heavy import inside endpoint handlers

**Where:** `api/server.py:203,215` → `from effectiveness import analyze_all_funds`

`effectiveness.py` is 1358 lines and imports a lot of analytical machinery. Putting the import inside the function:

```python
@app.get("/api/v1/fund-effectiveness")
def get_all_fund_effectiveness():
    from effectiveness import analyze_all_funds  # first call pays full import
```

means the first user to hit it eats the slow import. Make the cost startup-time, not request-time.

**Fix:**

```python
# top of server.py
from effectiveness import analyze_all_funds, analyze_fund
```

If `effectiveness` has expensive *module-level* work (e.g. building scoring tables), wrap that in `@lru_cache` so it amortizes across requests but still runs at import.

---

### 19. `tests/test_parser.py` is the only test (42 lines)

**Where:** `tests/test_parser.py`

It exercises `parse_option`. That's it. Zero coverage on:

- `compute_daily_changes` (the heart of the app)
- `get_signals` conviction scoring
- `get_divergences`
- `_is_junk_ticker` edge cases (and there are many)
- The Stripe webhook event handlers
- Any of the dashboard data-fetching code

**Fix:** snapshot tests with fixture CSVs.

```
tests/
  fixtures/
    holdings_2026-05-15.csv
    holdings_2026-05-16.csv
  test_parser.py
  test_data.py          # changes, signals, divergences, sector flow
  test_junk_filter.py   # parametrized cases for _is_junk_ticker
  test_auth.py          # in-memory SQLite, register/login/upgrade/promo flow
  test_webhook.py       # idempotency, event ordering
```

```python
# tests/test_data.py
import api.data as d

def test_compute_daily_changes(tmp_path, monkeypatch):
    monkeypatch.setattr(d, "HISTORY_DIR", "tests/fixtures")
    changes = d.compute_daily_changes()
    assert len(changes) > 0
    assert all("ticker" in c for c in changes)
    # snapshot-style: dump and compare
    assert sum(c["weightDelta"] for c in changes if c["type"] == "NEW") > 0
```

Add a `pytest` job to GitHub Actions next to the scrape workflow.

---

### 20. No structured logging or request IDs

**Where:** `api/server.py` — `print("[WARN] ...")` for everything.

You can't correlate logs across a request. You can't filter by user or endpoint. `docker logs tickertrace-api` is a wall of text.

**Fix:** `structlog`:

```python
import structlog, uuid
from starlette.middleware.base import BaseHTTPMiddleware

log = structlog.get_logger()

class RequestIdMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex[:12]
        structlog.contextvars.bind_contextvars(request_id=rid, path=request.url.path)
        response = await call_next(request)
        response.headers["x-request-id"] = rid
        return response

app.add_middleware(RequestIdMiddleware)
```

Then `log.info("api_call", endpoint=path, tier=user["tier"])` produces JSON lines that grep cleanly.

---

### 21. CI commits SQLite binary to git

**Where:** `.github/workflows/scrape.yml:51`

```yaml
git add data/holdings.db scraper.log normalized_holdings.csv etf-dashboard/public/data/
```

`data/holdings.db` is a binary SQLite file. Every day it gets diffed → bloats the repo. Worse: the API container reads `api/data/tickertrace.db`, NOT `data/holdings.db`. So this committed binary is dead weight.

**Fix:**

```yaml
# .gitignore
data/holdings.db
data/*.db-journal
scraper.log
```

And in the workflow, only commit the CSVs:

```yaml
git add normalized_holdings.csv etf-dashboard/public/data/
```

---

### 22. Firebase error detail leaks to caller

**Where:** `api/server.py:339-341`

```python
try:
    decoded = fb_auth.verify_id_token(body.id_token)
except Exception as e:
    raise HTTPException(status_code=401, detail=f"Invalid Firebase token: {e}")
```

Firebase exceptions can contain project metadata, certificate fingerprints, or rate-limit details. Don't ship those to anonymous callers.

**Fix:**

```python
try:
    decoded = fb_auth.verify_id_token(body.id_token)
except Exception as e:
    log.warning("firebase_verify_failed", err=str(e), token_prefix=body.id_token[:12])
    raise HTTPException(status_code=401, detail="Authentication failed")
```

Same pattern for the Stripe handler (line 433, 462, 569) — log the real error, return a generic 4xx to the client.

---

## P3 — Future / nice-to-have

23. **OpenAPI tags** — `/auth/*`, `/billing/*`, `/api/v1/*` are flat in `/docs`. Add `tags=["billing"]` etc. to each decorator so Swagger groups them.

24. **Background-job framework** — webhooks, scrapers, and effectiveness recomputes all run inline. RQ or Arq with a tiny Redis would let you queue work and observe failures.

25. **TypeScript looseness** — `holdings.ts` exports good interfaces but several internals (`getETFColor`, `groupByProvider`) accept `string` without narrowing. Some `unknown`/`any` slip through.

26. **CI runs nothing** — only the daily scrape workflow exists. Add a `ci.yml` that runs `pytest` and `npm run build` on push/PR.

27. **Vercel + Vultr split** adds DNS, CORS, and "two places to deploy" coupling. If you ever consolidate, putting FastAPI behind Next.js's serverless functions (or moving the dashboard onto Vultr alongside the API) is one less moving part.

---

## Cross-reference by review dimension

The user asked for findings across 5 dimensions. Here's the map.

**Architecture and Design:** 7 (scraper monolith), 9 (dashboard monolith), 10 (duplicate logic in TS+Py), 14 (recomputation), 18 (lazy imports), 23-24 (tagging/jobs), 27 (deploy topology)

**Readability and Maintainability:** 8 (broad excepts), 9 (page.tsx size), 15 (stale URL), 16 (inline CSS), 19 (test coverage), 20 (logging), 25 (TS typing)

**Performance Optimization:** 3 (SQLite per-call), 6 (4 round-trips per request), 11 (no rate limit), 14 (4× recomputation), 17 (sequential scraper), 18 (import cost)

**Security Best Practices:** 2 (CORS wildcard), 4 (webhook idempotency), 11 (no rate limit = DoS surface), 12 (hardcoded owner email), 22 (info leak in errors)

**Error Handling and Testing:** 4 (idempotent webhooks), 5 (migrate at import), 8 (broad excepts), 19 (coverage), 20 (request IDs), 22 (error sanitization), 26 (no CI)

---

## What I'd do this weekend if it were my repo

If you only have a few hours:

1. **Fix #1** (API base URL) — 5 minutes, prevents a future "I forgot we changed this" outage.
2. **Apply #14** (recomputation) — 20 minutes, biggest perf win per LOC changed.
3. **Apply #21** (stop committing the SQLite binary) — 2 minutes.
4. **Apply #2** (CORS allowlist) — 10 minutes, real security improvement.
5. **Sketch #10** (kill `holdings.ts`, have the Next dashboard `fetch()` from the API) — bigger refactor, but every hour you wait is more drift.

Everything else can be tracked as issues and chipped at over weeks.
