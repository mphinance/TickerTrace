"""
TickerTrace auth + user management.

SQLite database for users, API keys, and (legacy) subscription tracking.
Firebase/Stripe were removed May 2026; the schema retains stripe_customer_id /
stripe_subscription_id columns so existing rows don't break.

Connection strategy (P0 #3 in REVIEW.md):
    A single SQLite connection is held in thread-local storage. SQLite WAL
    handles per-thread concurrency, and reusing the connection eliminates the
    open/close overhead that previously hit every helper.
"""

import os
import secrets
import sqlite3
import threading
from contextlib import contextmanager
from datetime import datetime, timezone, timedelta
from typing import Optional, Iterator

import bcrypt

DB_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'tickertrace.db')

# ─── Thread-local connection pool ────────────────────────────────
_tls = threading.local()
_tls_registry: list[sqlite3.Connection] = []
_tls_registry_lock = threading.Lock()


def _get_db() -> sqlite3.Connection:
    """Return a per-thread connection, opening it lazily on first use."""
    conn = getattr(_tls, "conn", None)
    if conn is None:
        conn = sqlite3.connect(DB_PATH, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA synchronous=NORMAL")
        _tls.conn = conn
        with _tls_registry_lock:
            _tls_registry.append(conn)
    return conn


@contextmanager
def tx() -> Iterator[sqlite3.Connection]:
    """Transactional context manager. Commits on success, rolls back on error."""
    conn = _get_db()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise


def close_all_connections() -> None:
    """Close every thread-local connection. Called from FastAPI lifespan shutdown."""
    with _tls_registry_lock:
        for conn in _tls_registry:
            try:
                conn.close()
            except sqlite3.Error:
                pass
        _tls_registry.clear()


# ─── Schema bootstrap (called once from FastAPI lifespan) ────────
def init_db() -> None:
    """Create tables if they don't exist. Idempotent."""
    with tx() as conn:
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
                promo_expiry TEXT
            );

            CREATE TABLE IF NOT EXISTS api_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                api_key TEXT NOT NULL,
                endpoint TEXT NOT NULL,
                timestamp TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS promo_codes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                code TEXT UNIQUE NOT NULL,
                tier TEXT NOT NULL DEFAULT 'pro',
                duration_days INTEGER DEFAULT 30,
                max_uses INTEGER DEFAULT 1,
                uses INTEGER DEFAULT 0,
                active INTEGER DEFAULT 1,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_users_api_key ON users(api_key);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id);
            CREATE INDEX IF NOT EXISTS idx_usage_key ON api_usage(api_key);
            CREATE INDEX IF NOT EXISTS idx_promo_code ON promo_codes(code);
        """)
        # Backfill migrations for older DBs — narrowed catch: only swallow
        # "duplicate column name" errors, re-raise anything else.
        for column_sql in (
            "ALTER TABLE users ADD COLUMN password_hash TEXT",
            "ALTER TABLE users ADD COLUMN promo_expiry TEXT",
        ):
            try:
                conn.execute(column_sql)
            except sqlite3.OperationalError as e:
                if "duplicate column name" not in str(e).lower():
                    raise


# ─── Crypto helpers ──────────────────────────────────────────────
def generate_api_key() -> str:
    """Generate a unique API key: tt_live_xxxx."""
    return f"tt_live_{secrets.token_hex(24)}"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


# ─── User CRUD ───────────────────────────────────────────────────
def create_user(
    email: str,
    source: str = "",
    tier: str = "free",
    password: Optional[str] = None,
) -> dict:
    """Create a new user and return their record. Idempotent on email collision."""
    api_key = generate_api_key()
    now = datetime.now(timezone.utc).isoformat()
    pw_hash = hash_password(password) if password else None

    try:
        with tx() as conn:
            conn.execute(
                "INSERT INTO users (email, api_key, password_hash, tier, source, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (email, api_key, pw_hash, tier, source, now),
            )
    except sqlite3.IntegrityError as e:
        # Narrowed catch (review #8): re-raise unless it's the specific
        # email-already-exists collision we expect.
        msg = str(e).lower()
        if "users.email" in msg or "unique constraint failed: users.email" in msg:
            existing = get_user_by_email(email)
            if existing:
                return existing
        raise

    return get_user_by_email(email)  # type: ignore[return-value]


def set_password(email: str, password: str) -> bool:
    """Set or update a user's password."""
    pw_hash = hash_password(password)
    with tx() as conn:
        cursor = conn.execute(
            "UPDATE users SET password_hash = ? WHERE email = ?",
            (pw_hash, email),
        )
        return cursor.rowcount > 0


def authenticate(email: str, password: str) -> Optional[dict]:
    """Verify email+password credentials. Returns user dict or None."""
    user = get_user_by_email(email)
    if not user:
        return None
    stored_hash = user.get("password_hash")
    if not stored_hash:
        return None  # user registered without password (legacy)
    if not verify_password(password, stored_hash):
        return None
    return user


def get_user_by_key(api_key: str) -> Optional[dict]:
    row = _get_db().execute(
        "SELECT * FROM users WHERE api_key = ?", (api_key,)
    ).fetchone()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    row = _get_db().execute(
        "SELECT * FROM users WHERE email = ?", (email,)
    ).fetchone()
    return dict(row) if row else None


def get_user_by_stripe_id(stripe_customer_id: str) -> Optional[dict]:
    """Legacy lookup — kept so old DB rows are still queryable."""
    row = _get_db().execute(
        "SELECT * FROM users WHERE stripe_customer_id = ?",
        (stripe_customer_id,),
    ).fetchone()
    return dict(row) if row else None


def upgrade_user(email: str, tier: str = "pro") -> None:
    with tx() as conn:
        conn.execute("UPDATE users SET tier = ? WHERE email = ?", (tier, email))


def downgrade_user(email: str, tier: str = "free") -> None:
    upgrade_user(email, tier)


def log_api_call(api_key: str, endpoint: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    with tx() as conn:
        conn.execute(
            "INSERT INTO api_usage (api_key, endpoint, timestamp) VALUES (?, ?, ?)",
            (api_key, endpoint, now),
        )
        conn.execute(
            "UPDATE users SET last_api_call = ? WHERE api_key = ?",
            (now, api_key),
        )


def get_usage_count(api_key: str, hours: int = 24) -> int:
    """Count API calls in the last N hours."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    row = _get_db().execute(
        "SELECT COUNT(*) AS cnt FROM api_usage WHERE api_key = ? AND timestamp > ?",
        (api_key, cutoff),
    ).fetchone()
    return row["cnt"] if row else 0


def get_all_users() -> list[dict]:
    rows = _get_db().execute(
        "SELECT * FROM users ORDER BY created_at DESC"
    ).fetchall()
    return [dict(r) for r in rows]


# ─── Rate limits per tier (24h windows) ──────────────────────────
RATE_LIMITS = {
    "free": 100,
    "pro": 5000,
    "institutional": 50000,
}

# Tier access: which endpoints are allowed. None = no restriction.
TIER_ACCESS: dict[str, Optional[set[str]]] = {
    "free": {"/api/v1/signals", "/api/v1/stats", "/api/v1/sectors", "/health"},
    "pro": None,
    "institutional": None,
}


def check_access(api_key: str, endpoint: str) -> tuple[bool, str]:
    """
    Check if an API key has access to an endpoint. Returns (allowed, reason).
    Only /auth/me uses this now; the public data endpoints don't require auth.
    """
    user = get_user_by_key(api_key)
    if not user:
        return False, "Invalid API key"

    tier = user["tier"]
    if tier not in TIER_ACCESS:
        return False, f"Unrecognized account tier '{tier}'. Contact support."

    # Auto-downgrade expired promo tiers
    promo_expiry = user.get("promo_expiry")
    if promo_expiry and promo_expiry < datetime.now(timezone.utc).isoformat():
        downgrade_user(user["email"])
        tier = "free"

    allowed_endpoints = TIER_ACCESS.get(tier)
    if allowed_endpoints is not None and endpoint not in allowed_endpoints:
        return False, "Forbidden"

    limit = RATE_LIMITS.get(tier, 100)
    usage = get_usage_count(api_key)
    if usage >= limit:
        return False, f"Rate limit exceeded ({usage}/{limit} calls in 24h)."

    return True, "ok"
