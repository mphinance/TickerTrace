# Claude (Sonnet) Review (28.8s)

I'll conduct a thorough architectural review of this TickerTrace financial intelligence dashboard codebase. Let me analyze each component systematically.

## FINDINGS

### 1. CRITICAL - API Key Exposure in Client Code
**FILE:** `etf-dashboard/lib/firebase.ts` (lines 15-22)
**ISSUE:** Firebase configuration with sensitive keys exposed in client-side code
**EXACT FIX:** 
```typescript
// Move sensitive config to environment variables
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    // ... other public config
};
```
Add `.env.local` with proper Firebase public keys (API key is safe for client use, but should still be env-managed).

### 2. CRITICAL - SQL Injection Vulnerability
**FILE:** `scrape_avantis.py` (line 438)
**ISSUE:** Direct string interpolation in SQL query without parameterization
**EXACT FIX:**
```python
# Replace this dangerous query construction:
query = f"""
INSERT INTO DailyChanges (Date, ETF_Ticker, Ticker, Name, Prev_Quantity, New_Quantity, Qty_Delta, Weight_Delta)
SELECT * FROM (
    SELECT 
        ? as Date,  -- Use parameter
        curr.ETF_Ticker,
        # ... rest of query
"""
# Then execute with parameters:
conn.execute(query, (today, today, prev_date, today, prev_date))
```

### 3. HIGH - Hardcoded Stripe Keys in Production
**FILE:** `api/server.py` (lines 25-29)
**ISSUE:** Stripe keys loaded from environment but no validation/fallback handling
**EXACT FIX:**
```python
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
if not stripe.api_key:
    raise ValueError("STRIPE_SECRET_KEY environment variable required")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
if not STRIPE_WEBHOOK_SECRET:
    raise ValueError("STRIPE_WEBHOOK_SECRET environment variable required")
```

### 4. HIGH - Race Condition in Global Cache
**FILE:** `scrape_avantis.py` (lines 183-186)
**ISSUE:** Global `_roundhill_bulk_df` cache not thread-safe, could cause data corruption
**EXACT FIX:**
```python
import threading
_roundhill_bulk_df = None
_roundhill_lock = threading.Lock()

def get_holdings_roundhill(fund_config):
    global _roundhill_bulk_df
    with _roundhill_lock:
        if _roundhill_bulk_df is None:
            # ... existing download logic
```

### 5. HIGH - Unvalidated User Input in API
**FILE:** `api/server.py` (lines 156-159)
**ISSUE:** Direct database queries with user-provided fund/ticker parameters without sanitization
**EXACT FIX:**
```python
@app.get("/api/v1/fund/{fund}")
def get_fund(fund: str):
    # Validate fund parameter
    if not re.match(r'^[A-Z]{2,6}$', fund.upper()):
        raise HTTPException(status_code=400, detail="Invalid fund ticker format")
    fund = fund.upper()[:6]  # Limit length
    detail = data.get_fund_detail(fund)
```

### 6. HIGH - Password Storage Without Proper Validation
**FILE:** `api/auth.py` (lines 67-71)
**ISSUE:** Password hashing without length/complexity validation
**EXACT FIX:**
```python
def hash_password(password: str) -> str:
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    if len(password) > 128:
        raise ValueError("Password too long")
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
```

### 7. MEDIUM - Potential Memory Leak in CSV Processing
**FILE:** `scrape_avantis.py` (lines 130-140)
**ISSUE:** Large CSV files loaded entirely into memory without streaming
**EXACT FIX:**
```python
def get_holdings_csv(fund_config):
    # Add memory limit check
    response = requests.get(url, headers=headers, timeout=30, stream=True)
    content_length = response.headers.get('content-length')
    if content_length and int(content_length) > 50_000_000:  # 50MB limit
        raise ValueError(f"CSV too large: {content_length} bytes")
    
    content = response.content.decode('utf-8-sig')
```

### 8. MEDIUM - Insufficient Rate Limiting Granularity
**FILE:** `api/auth.py` (lines 188-195)
**ISSUE:** Rate limiting only by 24-hour windows, no burst protection
**EXACT FIX:**
```python
def check_rate_limit(api_key: str) -> tuple[bool, str]:
    # Add burst protection (10 requests per minute)
    conn = _get_db()
    one_minute_ago = (datetime.now(timezone.utc) - timedelta(minutes=1)).isoformat()
    burst_count = conn.execute(
        "SELECT COUNT(*) as cnt FROM api_usage WHERE api_key = ? AND timestamp > ?",
        (api_key, one_minute_ago)
    ).fetchone()['cnt']
    
    if burst_count >= 10:
        return False, "Rate limit: max 10 requests per minute"
```

### 9. MEDIUM - Weak CUSIP Validation
**FILE:** `cusip_lookup.py` (lines 95-105)
**ISSUE:** CUSIP validation allows invalid formats that could cause downstream errors
**EXACT FIX:**
```python
@staticmethod
def _is_valid_cusip(cusip: str) -> bool:
    if not cusip or len(cusip) not in [8, 9]:
        return False
    # CUSIP format: 6 alphanumeric + 2 digits + optional check digit
    if not re.match(r'^[A-Z0-9]{6}[0-9]{2}[0-9]?$', cusip.upper()):
        return False
    return True
```

### 10. MEDIUM - Missing Error Boundaries in React Context
**FILE:** `etf-dashboard/components/auth-context.tsx` (lines 45-70)
**ISSUE:** Firebase auth errors could crash the entire app without proper error boundaries
**EXACT FIX:**
```typescript
const syncWithBackend = useCallback(async (): Promise<{ ok: boolean; error?: string }> => {
    try {
        const currentUser = auth.currentUser;
        if (!currentUser) return { ok: false, error: "Not signed in" };
        
        const idToken = await currentUser.getIdToken();
        // ... rest of logic
    } catch (error) {
        console.error('Auth sync error:', error);
        // Don't crash the app - return graceful error
        return { ok: false, error: "Authentication sync failed" };
    }
}, []);
```

### 11. LOW - Inefficient Database Queries
**FILE:** `api/data.py` (lines 180-190)
**ISSUE:** Multiple file reads for each request instead of caching
**EXACT FIX:**
```python
from functools import lru_cache
from datetime import datetime, timedelta

@lru_cache(maxsize=10)
def _cached_read_csv(path: str, mtime: float) -> list[dict]:
    # Cache based on file modification time
    return _read_csv(path)

def get_latest_holdings() -> list[dict]:
    dates = get_available_dates()
    if not dates:
        return []
    path = os.path.join(HISTORY_DIR, f'holdings_{dates[0]}.csv')
    mtime = os.path.getmtime(path)
    return _cached_read_csv(path, mtime)
```

### 12. LOW - Hardcoded File Paths
**FILE:** `etf-dashboard/lib/holdings.ts` (lines 35-37)
**ISSUE:** Hardcoded paths make deployment/testing difficult
**EXACT FIX:**
```typescript
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'public', 'data');
const HISTORY_DIR = process.env.HISTORY_DIR || path.join(DATA_DIR, 'history');
```

## SUMMARY

**Critical Issues:** 2 (SQL injection, API key exposure)
**High Issues:** 4 (race conditions, input validation, auth security)
**Medium Issues:** 4 (memory leaks, rate limiting, validation)
**Low Issues:** 2 (performance optimizations)

The most urgent fixes are the SQL injection vulnerability and proper environment variable management. The codebase shows good architectural patterns overall but needs security hardening before production deployment.