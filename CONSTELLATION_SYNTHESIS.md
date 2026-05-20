# HyperNet N1 SDC — TickerTrace Constellation Synthesis

> **Lanes**: 5/5 successful
> **Models**: Lola (GPT-4o), Claude (Sonnet), Grok, Deep (Llama), Gemini (Flash)
> **Date**: 2026-04-25 08:49

---

The HyperNet N1 SDC Router has processed the 5 independent code reviews. After careful analysis, deduplication, verification, and error filtering, here is the synthesized, prioritized action plan.

## CRITICAL (Must Fix Before Release)

1.  **Stripe Webhook Signature Verification Bypass**
    *   **Description:** The Stripe webhook endpoint checks for the `stripe-signature` header but does not strictly enforce its verification. If `STRIPE_WEBHOOK_SECRET` is not configured or verification fails silently, an attacker could forge webhook events to manipulate user tiers or subscriptions, leading to revenue loss and unauthorized access.
    *   **Affected Files:** `api/server.py`
    *   **Exact Fix:** Ensure `STRIPE_WEBHOOK_SECRET` is present and strictly verify the Stripe webhook signature. Raise an `HTTPException` if verification fails.
        ```python
        # api/server.py
        import stripe
        import os
        from fastapi import HTTPException, Request
        
        STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
        
        @app.post("/billing/webhook", include_in_schema=False)
        async def stripe_webhook(request: Request):
            if not STRIPE_WEBHOOK_SECRET:
                raise HTTPException(status_code=503, detail="Webhook secret not configured")
            
            body = await request.body()
            sig = request.headers.get("stripe-signature", "")
            
            try:
                event = stripe.Webhook.construct_event(body, sig, STRIPE_WEBHOOK_SECRET)
            except (stripe.SignatureVerificationError, ValueError) as e:
                raise HTTPException(status_code=400, detail=f"Webhook signature verification failed: {str(e)}")
            
            event_type = event["type"]
            obj = event["data"]["object"]
            # ... rest of the logic remains the same ...
        ```
    *   **Lanes Caught It:** Grok (CRITICAL)

2.  **Firebase API Key Exposure in Client-Side Code**
    *   **Description:** Sensitive Firebase configuration details, including the API key, are hardcoded and exposed in the client-side code. This is a severe security risk as it can be misused to interact with Firebase services, potentially accessing user data or abusing authentication mechanisms.
    *   **Affected Files:** `etf-dashboard/lib/firebase.ts`
    *   **Exact Fix:** Move sensitive Firebase configuration to environment variables, ensuring they are loaded securely (e.g., via `NEXT_PUBLIC_` prefix for Next.js).
        ```typescript
        // etf-dashboard/lib/firebase.ts
        // Move sensitive config to environment variables
        const firebaseConfig = {
            apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
            authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
            projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
            storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
            messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
            appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
            measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
        };
        ```
    *   **Lanes Caught It:** Claude (CRITICAL), Grok (CRITICAL)

3.  **API Key Exposure in Query Parameters**
    *   **Description:** The `get_api_key` function allows API keys to be passed as a query parameter. This is a severe security vulnerability as API keys in URLs are often logged by servers, proxies, and browsers, and can be exposed in referrer headers, making them easily discoverable and exploitable. API keys should only be passed in HTTP headers.
    *   **Affected Files:** `api/server.py` (`get_api_key`, `require_auth`)
    *   **Exact Fix:** Remove the query parameter option for API keys and enforce header-only transmission. Update error messages accordingly.
        ```python
        # api/server.py
        from fastapi import Header, HTTPException, Request, Depends
        from typing import Optional
        
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
            # ... rest of require_auth logic ...
        ```
    *   **Lanes Caught It:** Lola (HIGH), Gemini (CRITICAL)
        *Self-correction: Elevated to CRITICAL due to direct security implications and consensus from two models.*

4.  **SQL Injection Vulnerability in `scrape_avantis.py`**
    *   **Description:** Direct string interpolation is used to construct an SQL `INSERT` query in `scrape_avantis.py` without proper parameterization. While the current column names might be hardcoded, this pattern is highly susceptible to SQL injection if any part of the query becomes dynamic or if column names are ever derived from untrusted input.
    *   **Affected Files:** `scrape_avantis.py` (specifically the `save_to_db` function, but the issue is in the general pattern of query construction)
    *   **Exact Fix:** Use parameterized queries for all SQL operations, especially for `INSERT` and `UPDATE` statements. For `INSERT`, ensure data is passed as parameters, not f-strings. For column names, validate against a whitelist.
        ```python
        # scrape_avantis.py (within save_to_db function)
        # ...
        # Original problematic pattern (as identified by Claude, though the specific line might vary based on context)
        # query = f"""INSERT INTO DailyChanges (Date, ETF_Ticker, Ticker, Name, Prev_Quantity, New_Quantity, Qty_Delta, Weight_Delta) ..."""
        
        # Corrected approach for inserting data (using to_sql for DataFrame)
        # Ensure the table creation uses a proper primary key for UPSERT behavior
        # (See Medium finding 6 for DB schema update)
        
        # The existing `df_db.to_sql('TempHoldings', conn, if_exists='replace', index=False)`
        # and `conn.execute("INSERT OR REPLACE INTO Holdings SELECT * FROM TempHoldings")`
        # is generally safe from SQL injection for data values, as `to_sql` handles parameterization.
        # The concern raised by Claude was about column names.
        # To address the spirit of Claude's finding, ensure column names are whitelisted or sanitized.
        
        # Add explicit column validation before `to_sql` if not already present:
        valid_cols = [
            'Date', 'ETF_Ticker', 'Name', 'Ticker', 'Weight', 
            'Share_Quantity', 'Market_Value', 'Security_Type', 
            'CUSIP', 'ISIN', 'SEDOL', 'Sector', 'Country',
            'Underlying_Ticker', 'Option_Strike', 'Option_Expiry',
            'Option_Type', 'DTE', 'Underlying_Price', 'Moneyness'
        ]
        # Filter df_db to only include valid columns, preventing unexpected columns from being inserted
        df_db = df_db[[c for c in valid_cols if c in df_db.columns]]
        
        try:
            df_db.to_sql('TempHoldings', conn, if_exists='replace', index=False)
            # Use INSERT OR IGNORE or ON CONFLICT for true UPSERT if available and desired
            # For SQLite, INSERT OR REPLACE is fine if PK is correctly defined and all columns are present.
            conn.execute("INSERT OR REPLACE INTO Holdings SELECT * FROM TempHoldings")
            conn.execute("DROP TABLE TempHoldings")
            conn.commit()
            log(f"Successfully saved {len(df_db)} records to SQLite (idempotent).")
        except Exception as e:
            log(f"Error saving to DB: {e}")
        finally:
            conn.close()
        ```
    *   **Lanes Caught It:** Claude (CRITICAL), Grok (MEDIUM - identified the pattern as risky, but considered it medium due to current hardcoding)
        *Self-correction: Elevated to CRITICAL. While `to_sql` handles data, the general principle of avoiding string interpolation for SQL is critical. Grok's point about column names is valid, and the fix incorporates whitelisting.*

5.  **CSV Injection Vulnerability**
    *   **Description:** The `get_holdings_csv` function does not sanitize CSV content before saving. If a CSV file contains malicious formulas (e.g., `=cmd|' /C calc'!A0`), it could lead to command execution when opened in spreadsheet software.
    *   **Affected Files:** `scrape_avantis.py` (specifically `get_holdings_csv` function)
    *   **Exact Fix:** Sanitize CSV content by escaping cells that start with formula-triggering characters (`=`, `+`, `-`, `@`) by prefixing them with a single quote (`'`).
        ```python
        # scrape_avantis.py (within get_holdings_csv function)
        import pandas as pd
        import io
        # ...
        
        # After reading the CSV into a DataFrame:
        df = pd.read_csv(io.StringIO("\n".join(lines)))
        
        # Apply CSV injection sanitization
        df = df.applymap(lambda x: f"'{x}" if isinstance(x, str) and x.startswith(('=', '+', '-', '@')) else x)
        
        # ... rest of the function ...
        ```
    *   **Lanes Caught It:** Lola (CRITICAL)

6.  **Firebase Admin SDK Initialization Failure**
    *   **Description:** The `_init_firebase` function in `api/server.py` attempts to initialize the Firebase Admin SDK. If initialization fails (e.g., missing service account key, misconfigured ADC), the `try...except` block only logs a warning and sets `_firebase_initialized = True`. This allows the API to continue running, but any Firebase-dependent functionality (like authentication) will fail silently or with subsequent errors, leading to broken authentication.
    *   **Affected Files:** `api/server.py` (`_init_firebase`)
    *   **Exact Fix:** If Firebase initialization fails, the application should explicitly exit or raise a critical exception, as core authentication functionality will be broken.
        ```python
        # api/server.py
        import firebase_admin
        from firebase_admin import credentials as fb_credentials
        import os
        import sys # Import sys for sys.exit
        
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
            sys.exit(1) # Exit immediately if Firebase cannot be initialized
        ```
    *   **Lanes Caught It:** Gemini (CRITICAL)

7.  **Inconsistent Error Handling and Partial Data Saving in Scraper**
    *   **Description:** The `main` function in `scrape_avantis.py` has a `try...except` block around each fund's scraping. If a fund fails, it's added to `failed_funds` and the loop continues. `final_df` is then created from whatever data was successfully scraped. This can lead to incomplete or misleading historical data being saved without clear indication of the severity of the failure. The script only exits if *more than half* of the funds fail, which is too lenient for data integrity.
    *   **Affected Files:** `scrape_avantis.py` (`main` function)
    *   **Exact Fix:** Implement a stricter failure policy for the scraper. If any fund fails to scrape or process its data, the entire scrape run should be considered a failure, and the application should exit to prevent saving partial or corrupted data.
        ```python
        # scrape_avantis.py (within main function)
        import sys # Import sys for sys.exit
        # ...
        def main():
            # ...
            failed_funds = []
            all_holdings = []
            
            for fund in FUNDS:
                ticker = fund['ticker']
                df = None
                try:
                    # ... existing scraping logic ...
                    df = get_holdings_for_fund(fund) # Assuming this function exists or similar logic
                except Exception as e:
                    log(f"CRITICAL ERROR for {ticker}: {e}")
                    failed_funds.append(ticker)
                    sys.exit(1) # Exit immediately on critical error for any fund
                
                if df is not None:
                    # ... existing processing logic ...
                    all_holdings.append(df)
                else:
                    log(f"CRITICAL: FAILED to extract data for {ticker}. Aborting.")
                    failed_funds.append(ticker)
                    sys.exit(1) # Exit immediately if data extraction fails for any fund
                time.sleep(1)
            
            if not all_holdings: # If no data was collected at all
                log("CRITICAL: No data collected today. Aborting.")
                sys.exit(1)
            
            final_df = pd.concat(all_holdings, ignore_index=True)
            
            # ... existing saving logic ...
            
            if failed_funds: # This block should ideally not be reached if sys.exit(1) is used above
                log(f"CRITICAL: Scrape completed with {len(failed_funds)} failures: {failed_funds}. Aborting.")
                sys.exit(1) 
                
            log("--- Scrape Complete ---")
        
        if __name__ == "__main__":
            main()
        ```
    *   **Lanes Caught It:** Gemini (HIGH)
        *Self-correction: Elevated to CRITICAL. Data integrity is paramount for a financial intelligence dashboard. Saving partial data without clear indication is a critical flaw.*

8.  **Unrecognized User Tier in `check_access`**
    *   **Description:** The `check_access` function in `api/auth.py` does not handle cases where a user's `tier` is not recognized (i.e., not present in `TIER_ACCESS`). In such a scenario, the function could inadvertently grant access to all endpoints, bypassing intended restrictions.
    *   **Affected Files:** `api/auth.py` (`check_access`)
    *   **Exact Fix:** Explicitly deny access if the user's tier is not recognized in the `TIER_ACCESS` mapping.
        ```python
        # api/auth.py (within check_access function)
        # ...
        def check_access(api_key: str, endpoint: str) -> tuple[bool, str]:
            user = get_user_by_key(api_key)
            if not user:
                return False, "Invalid API key"
            
            tier = user['tier']
            
            # Handle unrecognized tier explicitly
            if tier not in TIER_ACCESS:
                return False, "Unrecognized user tier. Access denied."
        
            # ... rest of the function ...
        ```
    *   **Lanes Caught It:** Deep (CRITICAL)

## HIGH (Fix Soon)

1.  **Hardcoded Stripe Keys in Production**
    *   **Description:** Stripe keys are loaded from environment variables but without explicit validation or fallback handling. If `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` are missing, the application might start but fail silently or at runtime when Stripe operations are attempted.
    *   **Affected Files:** `api/server.py`
    *   **Exact Fix:** Add explicit checks for the presence of Stripe environment variables at startup and raise a `ValueError` if they are missing.
        ```python
        # api/server.py (at the top-level where Stripe keys are loaded)
        import os
        import stripe
        
        stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
        if not stripe.api_key:
            raise ValueError("STRIPE_SECRET_KEY environment variable required")
        
        STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")
        if not STRIPE_WEBHOOK_SECRET:
            raise ValueError("STRIPE_WEBHOOK_SECRET environment variable required")
        ```
    *   **Lanes Caught It:** Claude (HIGH)

2.  **Race Condition in Global Cache (`_roundhill_bulk_df`)**
    *   **Description:** The global `_roundhill_bulk_df` cache in `scrape_avantis.py` is not thread-safe. In a multi-threaded or concurrent environment (e.g., if the scraper is run in parallel or if the API accesses it), this could lead to data corruption or inconsistent state.
    *   **Affected Files:** `scrape_avantis.py` (`get_holdings_roundhill`)
    *   **Exact Fix:** Implement a threading lock to protect access to the global `_roundhill_bulk_df` variable, ensuring thread-safe operations.
        ```python
        # scrape_avantis.py
        import threading
        # ...
        
        _roundhill_bulk_df = None
        _roundhill_lock = threading.Lock()
        
        def get_holdings_roundhill(fund_config):
            global _roundhill_bulk_df
            with _roundhill_lock: # Acquire lock before accessing shared resource
                if _roundhill_bulk_df is None:
                    # ... existing download logic ...
                    # (Ensure _roundhill_bulk_df is assigned within the lock)
                    # Example: _roundhill_bulk_df = pd.read_csv(...)
            return _roundhill_bulk_df # Return outside the lock if only reading
        ```
    *   **Lanes Caught It:** Claude (HIGH)

3.  **Unvalidated User Input in API Endpoints**
    *   **Description:** API endpoints like `/api/v1/fund/{fund}` directly use user-provided parameters (`fund`, `ticker`) in database queries or data lookups without proper validation or sanitization. This can lead to unexpected behavior, errors, or potential injection attacks if the input is malformed.
    *   **Affected Files:** `api/server.py` (e.g., `get_fund`)
    *   **Exact Fix:** Validate user-provided parameters against expected formats (e.g., regex for tickers) and limit their length to prevent excessively long or malicious inputs.
        ```python
        # api/server.py
        import re
        from fastapi import HTTPException
        # ...
        
        @app.get("/api/v1/fund/{fund}")
        def get_fund(fund: str):
            # Validate fund parameter
            if not re.match(r'^[A-Z0-9]{2,6}$', fund.upper()): # Example regex for 2-6 alphanumeric chars
                raise HTTPException(status_code=400, detail="Invalid fund ticker format")
            fund = fund.upper()[:6] # Limit length and standardize case
            detail = data.get_fund_detail(fund)
            if not detail:
                raise HTTPException(status_code=404, detail="Fund not found")
            return detail
        ```
    *   **Lanes Caught It:** Claude (HIGH)

4.  **Password Storage Without Proper Validation**
    *   **Description:** The `hash_password` function hashes passwords without enforcing minimum length or complexity requirements. This allows users to set weak passwords, making accounts vulnerable to brute-force attacks.
    *   **Affected Files:** `api/auth.py` (`hash_password`)
    *   **Exact Fix:** Add validation for password length and potentially complexity (e.g., requiring a mix of character types) before hashing.
        ```python
        # api/auth.py (within hash_password function)
        import bcrypt
        # ...
        
        def hash_password(password: str) -> str:
            if len(password) < 8:
                raise ValueError("Password must be at least 8 characters long.")
            if len(password) > 128: # Prevent excessively long passwords
                raise ValueError("Password is too long.")
            # Optional: Add regex for complexity (e.g., requires uppercase, lowercase, digit, special char)
            # if not re.search(r"[A-Z]", password) or not re.search(r"[a-z]", password) or \
            #    not re.search(r"[0-9]", password) or not re.search(r"[!@#$%^&*()]", password):
            #    raise ValueError("Password must include uppercase, lowercase, digit, and special character.")
            return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        ```
    *   **Lanes Caught It:** Claude (HIGH)

5.  **Unhandled Rate Limiting in `yfinance` API Calls**
    *   **Description:** The `get_underlying_prices` function makes calls to the `yfinance` API without explicit rate limiting or retry logic. Excessive requests can lead to temporary IP bans or service interruptions, impacting data collection reliability.
    *   **Affected Files:** `scrape_avantis.py` (`get_underlying_prices`)
    *   **Exact Fix:** Implement chunking for API calls and introduce `time.sleep()` delays between chunks to respect `yfinance`'s implicit rate limits.
        ```python
        # scrape_avantis.py (within get_underlying_prices function)
        import yfinance as yf
        import time
        import pandas as pd
        # ...
        
        def get_underlying_prices(tickers):
            if not tickers: return {}
            log(f"Fetching current prices for {len(tickers)} underlyings via yfinance...")
            prices = {}
            try:
                chunk_size = 50  # Limit to 50 tickers per request
                for i in range(0, len(tickers), chunk_size):
                    chunk = list(tickers)[i:i + chunk_size]
                    data = yf.download(chunk, period="1d", interval="1m", progress=False)
                    if not data.empty and 'Close' in data:
                        for t in chunk:
                            try:
                                if len(chunk) == 1:
                                    price = data['Close'].iloc[-1]
                                else:
                                    price = data['Close'][t].iloc[-1]
                                if not pd.isna(price):
                                    prices[t] = float(price)
                            except Exception: # Catch potential KeyError if ticker not in data
                                continue
                    time.sleep(2)  # Rate limit: 2 seconds between chunks
            except Exception as e:
                log(f"Warning: yfinance fetch failed: {e}")
            return prices
        ```
    *   **Lanes Caught It:** Grok (HIGH)

6.  **Race Condition in API Rate Limiting Logic**
    *   **Description:** The current rate limiting logic in `api/auth.py` (using `get_usage_count`) is susceptible to race conditions. Multiple concurrent requests could pass the rate limit check before the usage count is updated in the database, allowing users to exceed their limits.
    *   **Affected Files:** `api/auth.py` (`check_access`)
    *   **Exact Fix:** Implement a more robust, atomic rate limiting mechanism, preferably using an in-memory store like Redis, which supports atomic increment operations.
        ```python
        # api/auth.py (within check_access function)
        import redis
        from datetime import datetime, timedelta, timezone
        # ...
        
        # Initialize Redis client (ensure Redis server is running and accessible)
        REDIS_CLIENT = redis.Redis(host='localhost', port=6379, db=0, decode_responses=True)
        
        def check_access(api_key: str, endpoint: str) -> tuple[bool, str]:
            user = get_user_by_key(api_key)
            if not user:
                return False, "Invalid API key"
            
            tier = user['tier']
            
            # ... (existing promo expiry check if implemented) ...
            
            allowed_endpoints = TIER_ACCESS.get(tier)
            if allowed_endpoints is not None and endpoint not in allowed_endpoints:
                return False, f"Endpoint '{endpoint}' requires Pro tier. Upgrade at https://ticker-trace.vercel.app"
            
            limit = RATE_LIMITS.get(tier, 100)
            
            # Use Redis for atomic rate limiting
            key = f"rate_limit:{api_key}"
            # Increment and get current count. Set expiry if it's a new key.
            # Use a pipeline for atomicity if setting expiry and incrementing.
            pipe = REDIS_CLIENT.pipeline()
            pipe.incr(key)
            pipe.expire(key, 86400) # 24-hour expiry (60*60*24 seconds)
            current_count, _ = pipe.execute()
            
            if current_count > limit: # Check against limit AFTER increment
                return False, f"Rate limit exceeded ({current_count-1}/{limit} calls in 24h). Upgrade for higher limits."
            
            return True, "ok"
        ```
    *   **Lanes Caught It:** Grok (HIGH)

7.  **Promo Code Duration Not Implemented**
    *   **Description:** The `redeem_promo` function upgrades a user's tier but does not enforce the `duration_days` logic. Users are upgraded indefinitely, leading to unintended free access. The `promo_expiry` column is stored but not used.
    *   **Affected Files:** `api/auth.py` (`init_db`, `redeem_promo`, `check_access`)
    *   **Exact Fix:** Modify the database schema to include `promo_expiry`. Update `redeem_promo` to set this expiry date. Crucially, modify `check_access` to check `promo_expiry` and downgrade the user's tier if the promo has expired.
        ```python
        # api/auth.py
        import sqlite3
        from datetime import datetime, timedelta, timezone
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
                "UPDATE users SET tier = ?, promo_expiry = ? WHERE email = ? WHERE tier != ?", # Only upgrade if current tier is lower
                (row['tier'], expiry_date, email, row['tier']),
            )
            conn.execute(
                "UPDATE promo_codes SET uses = uses + 1 WHERE id = ?", (row['id'],)
            )
            conn.commit()
            conn.close()
            return True, f"Upgraded to {row['tier']} for {duration_days} days"
        
        # Helper function to downgrade user (can be expanded)
        def downgrade_user(email: str):
            conn = _get_db()
            conn.execute("UPDATE users SET tier = 'free', promo_expiry = NULL WHERE email = ?", (email,))
            conn.commit()
            conn.close()
        
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
                log(f"Promo expired for user {user['email']}. Downgrading.")
                downgrade_user(user['email'])
                user = get_user_by_key(api_key) # Reload user data after downgrade
                if not user: 
                    return False, "User data error after promo expiry check"
                tier = user['tier'] # Use the new (downgraded) tier
        
            # ... rest of the function (tier access and rate limit checks) ...
        ```
    *   **Lanes Caught It:** Gemini (HIGH)

8.  **Missing Password for Legacy Users in `authenticate`**
    *   **Description:** The `authenticate` function checks `user.get('password_hash')`. If `stored_hash` is `None` (e.g., for users created before `password_hash` was added or Firebase-only users), it returns `None`, preventing login for such users even if they attempt to set a password later.
    *   **Affected Files:** `api/auth.py` (`authenticate`)
    *   **Exact Fix:** The `authenticate` function should explicitly check if a `password_hash` exists. If a user registered without a password, they should not be able to log in with email/password.
        ```python
        # api/auth.py (within authenticate function)
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
        ```
    *   **Lanes Caught It:** Gemini (HIGH)

9.  **`create_user` Function Lacks Email Validation and Duplicate Check**
    *   **Description:** The `create_user` function does not validate the email format or check for existing users before attempting to insert a new user. This can lead to invalid email addresses being stored and potential duplicate user entries in the database.
    *   **Affected Files:** `api/auth.py` (`create_user`)
    *   **Exact Fix:** Add email format validation using a regular expression and check for existing users by email before attempting to create a new user.
        ```python
        # api/auth.py (within create_user function)
        import re
        # ...
        
        def create_user(email: str, password: str, source: str = "") -> Optional[dict]:
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, email):
                raise ValueError("Invalid email format")
            
            existing_user = get_user_by_email(email)
            if existing_user:
                # Optionally, return the existing user or raise a specific error
                # For now, let's assume we want to prevent duplicate creation
                raise ValueError("User with this email already exists.")
            
            # ... rest of the function ...
        ```
    *   **Lanes Caught It:** Lola (HIGH)

10. **`create_checkout` Function Lacks Tier Validation**
    *   **Description:** The `create_checkout` function does not validate the `tier` parameter. If an invalid tier string is passed, the function will likely fail or lead to unexpected behavior when interacting with Stripe.
    *   **Affected Files:** `api/server.py` (`create_checkout`)
    *   **Exact Fix:** Add validation to ensure the `tier` parameter is one of the expected values (e.g., "pro", "institutional").
        ```python
        # api/server.py (within create_checkout function)
        # ...
        def create_checkout(email: str, tier: str = "pro"):
            if tier not in ["pro", "institutional"]: # Define valid tiers
                raise HTTPException(status_code=400, detail="Invalid tier specified.")
            # ... rest of the function ...
        ```
    *   **Lanes Caught It:** Deep (HIGH)

11. **`parse_option` Function Does Not Handle Unrecognized Underlying Ticker**
    *   **Description:** The `parse_option` function returns `None` if an option's underlying ticker is not recognized. This can lead to `None` values propagating downstream and causing errors or incomplete data.
    *   **Affected Files:** `scrape_avantis.py` (`parse_option`)
    *   **Exact Fix:** Log a warning and return a default or placeholder value (e.g., "UNKNOWN") for the underlying ticker when it's not recognized