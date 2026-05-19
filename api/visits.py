"""
Lightweight public visit tracker.

POST /api/v1/visits/track   — fired on every page load by the browser
GET  /api/v1/visits/live    — returns the current counts for the footer pill

Storage: tiny SQLite DB at api/data/visits.db (the docker-compose mount
already covers that path). Two tables:

  visit_events  — one row per pageview, ~30-day retention
  visit_meta    — key/value: lifetime_visits counter, last_prune_ts

"Live now" is the count of distinct visitor hashes seen in the last 5
minutes. Today / week / all-time are simple COUNT(*) queries over the
events table (+ the lifetime counter for all-time, which survives pruning).

Visitor identity is sha256(ip + server_salt)[:16]. The IP itself is never
persisted — only the hash — so the table is GDPR-friendly out of the box.
"""

from __future__ import annotations

import hashlib
import os
import sqlite3
import threading
import time
from contextlib import contextmanager
from typing import Iterator

DB_PATH = os.path.join(os.path.dirname(__file__), 'data', 'visits.db')
# Salt randomizes the IP hash; rotating it would shuffle "live now"
# cardinality but doesn't matter for correctness. A stable env-provided
# salt prevents trivial reverse-lookup if the DB were ever leaked.
SALT = os.getenv('VISIT_HASH_SALT', 'tickertrace-default-salt-2026')
LIVE_WINDOW_SEC = 5 * 60
PRUNE_AFTER_DAYS = 30
PRUNE_EVERY_SEC = 6 * 3600  # at most every 6h on the request path

_init_lock = threading.Lock()
_initialized = False


@contextmanager
def _conn() -> Iterator[sqlite3.Connection]:
    """Per-call connection. SQLite + WAL is plenty for this volume."""
    global _initialized
    if not _initialized:
        with _init_lock:
            if not _initialized:
                _ensure_schema()
                _initialized = True
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = sqlite3.connect(DB_PATH, timeout=5.0)
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA synchronous=NORMAL')
    try:
        yield c
        c.commit()
    finally:
        c.close()


def _ensure_schema() -> None:
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    c = sqlite3.connect(DB_PATH, timeout=5.0)
    try:
        c.executescript("""
            CREATE TABLE IF NOT EXISTS visit_events (
                id            INTEGER PRIMARY KEY AUTOINCREMENT,
                ts            INTEGER NOT NULL,
                visitor_hash  TEXT    NOT NULL,
                path          TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_visits_ts ON visit_events(ts);
            CREATE INDEX IF NOT EXISTS idx_visits_visitor_ts ON visit_events(visitor_hash, ts);

            CREATE TABLE IF NOT EXISTS visit_meta (
                key   TEXT PRIMARY KEY,
                value INTEGER NOT NULL
            );
            INSERT OR IGNORE INTO visit_meta (key, value) VALUES ('lifetime_visits', 0);
            INSERT OR IGNORE INTO visit_meta (key, value) VALUES ('last_prune_ts', 0);
        """)
        c.commit()
    finally:
        c.close()


def _visitor_hash(ip: str) -> str:
    digest = hashlib.sha256(f'{ip}|{SALT}'.encode()).hexdigest()
    return digest[:16]


def record(ip: str, path: str = '') -> None:
    """Record a single pageview. Also kicks off a background prune if it's
    been a while. Caller is responsible for rate limiting upstream."""
    now = int(time.time())
    vh = _visitor_hash(ip)
    path = (path or '')[:120]  # cap path length to avoid runaway storage
    with _conn() as c:
        c.execute(
            'INSERT INTO visit_events (ts, visitor_hash, path) VALUES (?, ?, ?)',
            (now, vh, path),
        )
        c.execute(
            'UPDATE visit_meta SET value = value + 1 WHERE key = ?',
            ('lifetime_visits',),
        )
        # Cheap, infrequent retention prune.
        row = c.execute(
            'SELECT value FROM visit_meta WHERE key = ?',
            ('last_prune_ts',),
        ).fetchone()
        last_prune = row[0] if row else 0
        if now - last_prune > PRUNE_EVERY_SEC:
            cutoff = now - PRUNE_AFTER_DAYS * 86400
            c.execute('DELETE FROM visit_events WHERE ts < ?', (cutoff,))
            c.execute(
                'UPDATE visit_meta SET value = ? WHERE key = ?',
                (now, 'last_prune_ts'),
            )


def live_counts() -> dict:
    """Return the snapshot rendered by the footer pill."""
    now = int(time.time())
    # Compute "today" as the events table's idea of midnight (UTC). The pill
    # is approximate; precision doesn't matter and timezone drift is OK.
    midnight_utc = now - (now % 86400)
    week_ago = now - 7 * 86400
    live_floor = now - LIVE_WINDOW_SEC
    with _conn() as c:
        live_row = c.execute(
            'SELECT COUNT(DISTINCT visitor_hash) FROM visit_events WHERE ts > ?',
            (live_floor,),
        ).fetchone()
        today_row = c.execute(
            'SELECT COUNT(*) FROM visit_events WHERE ts >= ?',
            (midnight_utc,),
        ).fetchone()
        week_row = c.execute(
            'SELECT COUNT(*) FROM visit_events WHERE ts >= ?',
            (week_ago,),
        ).fetchone()
        lifetime_row = c.execute(
            'SELECT value FROM visit_meta WHERE key = ?',
            ('lifetime_visits',),
        ).fetchone()
    return {
        'now': int(live_row[0] or 0),
        'today': int(today_row[0] or 0),
        'week': int(week_row[0] or 0),
        'allTime': int(lifetime_row[0] or 0) if lifetime_row else 0,
        'asOf': now,
    }
