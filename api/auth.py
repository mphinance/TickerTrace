"""
TickerTrace auth + user management.

SQLite database for users, API keys, and subscription tracking.
"""

import hashlib
import os
import secrets
import sqlite3
from datetime import datetime, timezone
from typing import Optional

DB_DIR = os.path.join(os.path.dirname(__file__), 'data')
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, 'tickertrace.db')


def _get_db() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn


def init_db():
    """Create tables if they don't exist."""
    conn = _get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            api_key TEXT UNIQUE NOT NULL,
            tier TEXT NOT NULL DEFAULT 'free',
            stripe_customer_id TEXT,
            stripe_subscription_id TEXT,
            source TEXT DEFAULT '',
            created_at TEXT NOT NULL,
            last_api_call TEXT
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
    conn.commit()
    conn.close()


def generate_api_key() -> str:
    """Generate a unique API key: tt_live_xxxx."""
    raw = secrets.token_hex(24)
    return f"tt_live_{raw}"


def create_user(email: str, source: str = "", tier: str = "free") -> dict:
    """Create a new user and return their record."""
    conn = _get_db()
    api_key = generate_api_key()
    now = datetime.now(timezone.utc).isoformat()

    try:
        conn.execute(
            "INSERT INTO users (email, api_key, tier, source, created_at) VALUES (?, ?, ?, ?, ?)",
            (email, api_key, tier, source, now),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        # User already exists — return existing
        return get_user_by_email(email)  # type: ignore

    user = get_user_by_email(email)
    conn.close()
    return user  # type: ignore


def get_user_by_key(api_key: str) -> Optional[dict]:
    conn = _get_db()
    row = conn.execute("SELECT * FROM users WHERE api_key = ?", (api_key,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_email(email: str) -> Optional[dict]:
    conn = _get_db()
    row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_stripe_id(stripe_customer_id: str) -> Optional[dict]:
    conn = _get_db()
    row = conn.execute(
        "SELECT * FROM users WHERE stripe_customer_id = ?", (stripe_customer_id,)
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def update_user_stripe(email: str, stripe_customer_id: str, stripe_subscription_id: str):
    conn = _get_db()
    conn.execute(
        "UPDATE users SET stripe_customer_id = ?, stripe_subscription_id = ? WHERE email = ?",
        (stripe_customer_id, stripe_subscription_id, email),
    )
    conn.commit()
    conn.close()


def upgrade_user(email: str, tier: str = "pro"):
    conn = _get_db()
    conn.execute("UPDATE users SET tier = ? WHERE email = ?", (tier, email))
    conn.commit()
    conn.close()


def downgrade_user(email: str, tier: str = "free"):
    upgrade_user(email, tier)


def log_api_call(api_key: str, endpoint: str):
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO api_usage (api_key, endpoint, timestamp) VALUES (?, ?, ?)",
        (api_key, endpoint, now),
    )
    conn.execute(
        "UPDATE users SET last_api_call = ? WHERE api_key = ?",
        (now, api_key),
    )
    conn.commit()
    conn.close()


def get_usage_count(api_key: str, hours: int = 24) -> int:
    """Count API calls in the last N hours."""
    conn = _get_db()
    from datetime import timedelta
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    row = conn.execute(
        "SELECT COUNT(*) as cnt FROM api_usage WHERE api_key = ? AND timestamp > ?",
        (api_key, cutoff),
    ).fetchone()
    conn.close()
    return row['cnt'] if row else 0


def get_all_users() -> list[dict]:
    conn = _get_db()
    rows = conn.execute("SELECT * FROM users ORDER BY created_at DESC").fetchall()
    conn.close()
    return [dict(r) for r in rows]


# Rate limits per tier (requests per 24h)
RATE_LIMITS = {
    'free': 100,
    'pro': 5000,
    'institutional': 50000,
}


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

    # Upgrade user
    upgrade_user(email, row['tier'])
    conn.execute(
        "UPDATE promo_codes SET uses = uses + 1 WHERE id = ?", (row['id'],)
    )
    conn.commit()
    conn.close()
    return True, f"Upgraded to {row['tier']} for {row['duration_days']} days"


def create_promo(code: str, tier: str = 'pro', duration_days: int = 30, max_uses: int = 1) -> dict:
    """Create a promo code (admin function)."""
    conn = _get_db()
    now = datetime.now(timezone.utc).isoformat()
    try:
        conn.execute(
            "INSERT INTO promo_codes (code, tier, duration_days, max_uses, created_at) VALUES (?, ?, ?, ?, ?)",
            (code.upper(), tier, duration_days, max_uses, now),
        )
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return {'error': 'Code already exists'}
    conn.close()
    return {'code': code.upper(), 'tier': tier, 'duration_days': duration_days, 'max_uses': max_uses}

# Tier access: which endpoints are allowed
TIER_ACCESS = {
    'free': {'/api/v1/signals', '/api/v1/stats', '/api/v1/sectors', '/health'},
    'pro': None,  # None = all endpoints
    'institutional': None,
}


def check_access(api_key: str, endpoint: str) -> tuple[bool, str]:
    """
    Check if an API key has access to an endpoint.
    Returns (allowed, reason).
    """
    user = get_user_by_key(api_key)
    if not user:
        return False, "Invalid API key"

    tier = user['tier']

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


# Initialize DB on import
init_db()
