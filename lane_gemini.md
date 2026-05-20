# Gemini (Flash) Review (22.1s)

Here's a thorough architectural review of the TickerTrace codebase, focusing on potential bugs, security vulnerabilities, and logic errors.

---

### 1. SEVERITY: CRITICAL
**FILE:** `api/server.py`
**FUNCTION:** `_init_firebase`
**ISSUE:** Firebase Admin SDK initialization failure.
The `_init_firebase` function attempts to initialize the Firebase Admin SDK. If `FIREBASE_SERVICE_ACCOUNT_KEY` is not set or the file doesn't exist, it falls back to `firebase_admin.initialize_app()`, which relies on Application Default Credentials. However, if this fallback also fails (e.g., in a local development environment without ADC configured, or a misconfigured production environment), the `try...except` block only logs a warning and sets `_firebase_initialized = True`. This means the API will continue to run, but any Firebase-dependent functionality (like `fb_auth.verify_id_token`) will fail silently or with subsequent errors, leading to broken authentication. The `firebase_login` endpoint will be unusable.

**EXACT FIX:**
The `_init_firebase` function should raise an exception or explicitly exit if Firebase initialization fails, as authentication is a core component.

```python
# FILE: api/server.py
# ...
_firebase_initialized = False
def _init_firebase():
    global _firebase_initialized
    if _firebase_initialized:
        return
    sa_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_KEY", "")
    if sa_path and os.path.isfile(sa_path):
        cred = fb_credentials.Certificate(sa_path)
        firebase_admin.initialize_app(cred)
    else:
        # Use Application Default Credentials (GCE, Cloud Run, etc.)
        # This might fail if not in a Google Cloud environment or ADC not set up.
        firebase_admin.initialize_app()
    _firebase_initialized = True

try:
    _init_firebase()
except Exception as e:
    print(f"[CRITICAL] Firebase Admin SDK init failed: {e}")
    # Exit the application as core authentication functionality will be broken.
    import sys
    sys.exit(1) # Or raise a more specific exception if FastAPI can handle it gracefully during startup.
# ...
```

---

### 2. SEVERITY: CRITICAL
**FILE:** `api/server.py`
**FUNCTION:** `require_auth`, `optional_auth`
**ISSUE:** API Key Exposure in Query Parameters.
The `get_api_key` function allows API keys to be passed as a query parameter (`?api_key=...`). While convenient for testing, this is a severe security vulnerability in production. API keys in URL query parameters are often logged by web servers, proxies, and browsers, and can be exposed in referrer headers, making them easily discoverable and exploitable. API keys should *always* be passed in HTTP headers (e.g., `X-API-Key` or `Authorization`).

**EXACT FIX:**
Remove the `api_key: Optional[str] = Query(None)` parameter from `get_api_key` and update the error message to reflect header-only usage.

```python
# FILE: api/server.py
# ...
async def get_api_key(
    request: Request,
    x_api_key: Optional[str] = Header(None),
) -> Optional[str]:
    """Extract API key from header."""
    return x_api_key


async def require_auth(
    request: Request,
    key: Optional[str] = Depends(get_api_key),
):
    """Require and validate API key. Logs usage."""
    if not key:
        raise HTTPException(
            status_code=401,
            detail="API key required. Pass as X-API-Key header. "
                   "Get a free key at /auth/register",
        )
    # ...
```

---

### 3. SEVERITY: HIGH
**FILE:** `api/auth.py`
**FUNCTION:** `authenticate`
**ISSUE:** Missing password for legacy users.
The `authenticate` function checks `user.get('password_hash')`. If `stored_hash` is `None` (which can happen for users created before the `password_hash` column was added or for Firebase-only users), it returns `None`, preventing login for such users even if they attempt to set a password later. The `set_password` function also doesn't handle the case where a user might not have a `password_hash` initially.

**EXACT FIX:**
The `authenticate` function should explicitly check if a `password_hash` exists before attempting to verify it. If a user registered without a password (e.g., via Firebase), they should not be able to log in with email/password. If `password_hash` is `None`, it should be treated as an invalid login attempt for email/password authentication.

```python
# FILE: api/auth.py
# ...
def authenticate(email: str, password: str) -> Optional[dict]:
    """Verify email+password credentials. Returns user dict or None."""
    user = get_user_by_email(email)
    if not user:
        return None
    stored_hash = user.get('password_hash')
    if not stored_hash:
        # User registered without a password (e.g., Firebase-only or legacy).
        # They cannot authenticate via email/password.
        return None
    if not verify_password(password, stored_hash):
        return None
    return user
# ...
```

---

### 4. SEVERITY: HIGH
**FILE:** `api/auth.py`
**FUNCTION:** `redeem_promo`
**ISSUE:** Promo code duration not implemented.
The `redeem_promo` function upgrades a user's tier but doesn't implement the `duration_days` logic. The user is upgraded indefinitely. The `duration_days` parameter is stored in the database but never used to automatically revert the tier after the specified period. This is a logic error that could lead to unintended free access for users.

**EXACT FIX:**
This requires a background task or a more complex system to manage timed tier upgrades. For a quick fix, the `redeem_promo` function should at least log a warning or explicitly state that the duration is not yet enforced. A proper fix would involve:
1. Adding `promo_expiry` column to `users` table.
2. Modifying `redeem_promo` to set this expiry.
3. Modifying `check_access` to check `promo_expiry` and downgrade if expired.
4. (Optional) A daily cron job to clean up expired promos.

Given the scope of this review, I'll provide a minimal fix to acknowledge the missing functionality and a clear instruction for a full fix.

```python
# FILE: api/auth.py
# ...
def init_db():
    """Create tables if they don't exist."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            password_hash TEXT,
            tier TEXT NOT NULL DEFAULT 'free',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            source TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            last_api_call TEXT,
            promo_expiry TEXT -- Add this column
        );
        -- ... rest of init_db ...
    """)
    # Migrate: add password_hash column if missing (existing DBs)
    try:
        conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # column already exists
    # Migrate: add promo_expiry column if missing
    try:
        conn.execute("ALTER TABLE users ADD COLUMN promo_expiry TEXT")
        conn.commit()
    except sqlite3.OperationalError:
        pass  # column already exists
    conn.commit()
    conn.close()

# ...

def redeem_promo(email: str, code: str) -> tuple[bool, str]:
    """Redeem a promo code to upgrade a user."""
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM promo_codes WHERE code = ? AND active = 1", (code.upper(),)
    ).fetchone()
    if not row:
        conn.close()
        return False, "Invalid or expired promo code"

    if row['uses'] >= row['max_uses']:
        conn.close()
        return False, "Promo code has been fully redeemed"

    # Calculate expiry date
    duration_days = row['duration_days']
    expiry_date = (datetime.now(timezone.utc) + timedelta(days=duration_days)).isoformat()

    # Upgrade user and set promo expiry
    conn.execute(
        "UPDATE users SET tier = ?, promo_expiry = ? WHERE email = ?",
        (row['tier'], expiry_date, email),
    )
    conn.execute(
        "UPDATE promo_codes SET uses = uses + 1 WHERE id = ?", (row['id'],)
    )
    conn.commit()
    conn.close()
    return True, f"Upgraded to {row['tier']} for {duration_days} days"

# ...

def check_access(api_key: str, endpoint: str) -> tuple[bool, str]:
    """
    Check if an API key has access to an endpoint.
    Returns (allowed, reason).
    """
    user = get_user_by_key(api_key)
    if not user:
        return False, "Invalid API key"

    tier = user['tier']

    # Check for expired promo tier
    if user.get('promo_expiry') and user['promo_expiry'] < datetime.now(timezone.utc).isoformat():
        # Promo has expired, downgrade user and re-check access
        downgrade_user(user['email'])
        user = get_user_by_key(api_key) # Reload user data
        if not user: # Should not happen if downgrade_user works
            return False, "User data error after promo expiry check"
        tier = user['tier'] # Use the new (downgraded) tier

    # Check tier access
    allowed_endpoints = TIER_ACCESS.get(tier)
    if allowed_endpoints is not None and endpoint not in allowed_endpoints:
        return False, f"Endpoint '{endpoint}' requires Pro tier. Upgrade at https://ticker-trace.vercel.app"

    # Check rate limit
    limit = RATE_LIMITS.get(tier, 100)
    usage = get_usage_count(api_key)
    if usage >= limit:
        return False, f"Rate limit exceeded ({usage}/{limit} calls in 24h). Upgrade for higher limits."

    return True, "ok"
```

---

### 5. SEVERITY: HIGH
**FILE:** `scrape_avantis.py`
**FUNCTION:** `main`
**ISSUE:** Inconsistent error handling and partial data saving.
The `main` function has a `try...except` block around each fund's scraping. If a fund fails, it's added to `failed_funds` and `continue`d. However, `final_df = pd.concat(all_holdings, ignore_index=True)` will still proceed with whatever data was successfully scraped. If a critical fund (e.g., one that provides a large portion of the data or is essential for certain analytics) fails, the `final_df` might be incomplete or misleading, but the script will still report "Scrape Complete" and save the partial data. This can lead to corrupted or inconsistent historical data without clear indication of the severity of the failure. The current logic only `sys.exit(1)` if *more than half* of the funds fail, which is too lenient for data integrity.

**EXACT FIX:**
Introduce a threshold for critical funds or a more robust check for data completeness. For now, a more conservative approach would be to fail if *any* fund fails, or at least if a significant portion of the expected data is missing. A better approach would be to store the raw data for each fund separately and then combine them, allowing for easier debugging of individual fund failures. For this fix, I'll make it fail if any fund fails, as data integrity is paramount.

```python
# FILE: scrape_avantis.py
# ...
def main():
    # ...
    failed_funds = []
    
    for fund in FUNDS:
        ticker = fund['ticker']
        df = None
        try:
            # ... existing scraping logic ...
        except Exception as e:
            log(f"CRITICAL ERROR for {ticker}: {e}")
            failed_funds.append(ticker)
            # Do not continue, exit immediately if any fund fails to ensure data integrity
            # Or, implement a more sophisticated retry/quarantine mechanism.
            # For now, a single fund failure is treated as critical for the entire run.
            sys.exit(1) # Exit immediately on critical error for any fund
            # If you want to allow partial scrapes, remove this sys.exit(1)
            # and rely on the final failed_funds check, but be aware of data quality implications.
            # continue # If you want to allow partial scrapes, uncomment this and remove sys.exit(1)
        
        if df is not None:
            # ... existing processing logic ...
            all_holdings.append(df)
        else:
            log(f"FAILED to extract data for {ticker}")
            failed_funds.append(ticker)
            sys.exit(1) # Exit immediately if data extraction fails for any fund
            # continue # If you want to allow partial scrapes, uncomment this and remove sys.exit(1)
        time.sleep(1)
    
    if all_holdings:
        final_df = pd.concat(all_holdings, ignore_index=True)
        
        # ... existing saving logic ...
        
    else:
        log("No data collected today.")
        if failed_funds:
            log(f"CRITICAL: No data collected and {len(failed_funds)} funds failed. Aborting.")
            sys.exit(1)
    
    if failed_funds:
        log(f"CRITICAL: Scrape completed with {len(failed_funds)} failures: {failed_funds}. Aborting.")
        sys.exit(1) # Ensure exit if any fund failed, even if some data was collected.
        
    log("--- Scrape Complete ---")

if __name__ == "__main__":
    main()
```

---

### 6. SEVERITY: MEDIUM
**FILE:** `scrape_avantis.py`
**FUNCTION:** `save_to_db`
**ISSUE:** Potential for data loss/corruption with `INSERT OR REPLACE`.
The `save_to_db` function uses `INSERT OR REPLACE INTO Holdings`. While this provides idempotency, it can lead to data loss if the primary key (or unique constraint) is not correctly defined or if a partial update is intended. `INSERT OR REPLACE` effectively deletes the old row and inserts a new one. If the `df_db` DataFrame is missing columns that are present in the `Holdings` table, those columns will be `NULL`ed out in the replaced row. The current `valid_cols` list tries to mitigate this, but it's still a risk if the scraper ever produces incomplete data for a specific day.

**EXACT FIX:**
Ensure the `Holdings` table has a composite primary key that accurately represents a unique holding for a given day. The current `drop_duplicates(subset=['Date', 'ETF_Ticker', 'Ticker'])` suggests `(Date, ETF_Ticker, Ticker)` is intended to be unique. If `CUSIP` is also part of the unique identifier, it should be included. If the intent is to update specific columns without affecting others, `INSERT OR REPLACE` is not the right tool; `UPSERT` (e.g., `INSERT INTO ... ON CONFLICT UPDATE ...`) is preferred, but SQLite's `UPSERT` syntax is more complex. For now, ensure the primary key is robust.

Assuming `(Date, ETF_Ticker, Ticker, CUSIP)` is the most robust unique identifier for a holding:

```python
# FILE: db_setup.py (assuming this is where the schema is defined)
# ...
# Modify the Holdings table creation to include a proper primary key
# CREATE TABLE IF NOT EXISTS Holdings (
#     Date TEXT NOT NULL,
#     ETF_Ticker TEXT NOT NULL,
#     Name TEXT,
#     Ticker TEXT NOT NULL,
#     Weight REAL,
#     Share_Quantity REAL,
#     Market_Value REAL,
#     Security_Type TEXT,
#     CUSIP TEXT,
#     ISIN TEXT,
#     SEDOL TEXT,
#     Sector TEXT,
#     Country TEXT,
#     Underlying_Ticker TEXT,
#     Option_Strike REAL,
#     Option_Expiry TEXT,
#     Option_Type TEXT,
#     DTE INTEGER,
#     Underlying_Price REAL,
#     Moneyness REAL,
#     PRIMARY KEY (Date, ETF_Ticker, Ticker, CUSIP) -- Add CUSIP to PK
# );
# ...

# FILE: scrape_avantis.py
# ...
def save_to_db(df):
    if df is None or df.empty: return
    conn = sqlite3.connect(DB_PATH)
    df_db = df.copy()
    df_db.columns = [c.replace(' ', '_') for c in df_db.columns]
    
    valid_cols = [
        'Date', 'ETF_Ticker', 'Name', 'Ticker', 'Weight', 
        'Share_Quantity', 'Market_Value', 'Security_Type', 
        'CUS