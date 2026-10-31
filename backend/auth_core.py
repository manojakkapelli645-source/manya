"""
CivicMap Mumbai - login / admin logic.

This file uses only the Python standard library (no extra packages).
main.py calls these functions from the FastAPI routes.
"""

import base64
import hashlib
import hmac
import json
import os
import re
import secrets
import time
from datetime import datetime

# ------------------------------------------------------------
# SETTINGS
# ------------------------------------------------------------

TOKEN_LIFETIME_SECONDS = 12 * 60 * 60  # login lasts 12 hours
PBKDF2_ROUNDS = 200_000

ADMIN_STATUSES = [
    "Complaint Submitted",
    "Verified",
    "Work In Progress",
    "Work Completed",
    "Failed",
]

EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


# ------------------------------------------------------------
# PASSWORDS
# ------------------------------------------------------------

def hash_password(password: str) -> str:
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), bytes.fromhex(salt), PBKDF2_ROUNDS
    ).hex()
    return f"pbkdf2_sha256${PBKDF2_ROUNDS}${salt}${digest}"


def verify_password(password: str, stored: str) -> bool:
    try:
        scheme, rounds, salt, digest = stored.split("$")
        if scheme != "pbkdf2_sha256":
            return False
        check = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt), int(rounds)
        ).hex()
        return hmac.compare_digest(check, digest)
    except (ValueError, TypeError):
        return False


# ------------------------------------------------------------
# LOGIN TOKENS (signed, expire after 12 hours)
# ------------------------------------------------------------

def _b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _unb64(text: str) -> bytes:
    return base64.urlsafe_b64decode(text + "=" * (-len(text) % 4))


def make_token(secret: str, user_id: int, lifetime: int = TOKEN_LIFETIME_SECONDS) -> str:
    payload = json.dumps(
        {"uid": user_id, "exp": int(time.time()) + lifetime},
        separators=(",", ":"),
    ).encode("utf-8")
    signature = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return f"{_b64(payload)}.{_b64(signature)}"


def read_token(secret: str, token: str):
    """Return the token data if it is valid and not expired, else None."""
    try:
        payload_part, signature_part = token.split(".")
        payload = _unb64(payload_part)
        expected = hmac.new(secret.encode("utf-8"), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _unb64(signature_part)):
            return None
        data = json.loads(payload)
        if int(data["exp"]) < time.time():
            return None
        return data
    except (ValueError, KeyError, TypeError, json.JSONDecodeError):
        return None


# ------------------------------------------------------------
# DATABASE SETUP
# ------------------------------------------------------------

try:
    from .db import column_names as _column_names
except ImportError:
    from db import column_names as _column_names


def init_auth(get_db):
    """
    Create the users table, add the new report columns, create the
    admin account on first run and return the secret used to sign tokens.
    Safe to run every time the server starts.
    """
    conn = get_db()

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'citizen',
            created_at TEXT NOT NULL
        )
        """
    )
    conn.execute(
        "CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)"
    )

    # New columns on the existing reports table (old data is kept).
    existing = _column_names(conn, "reports")
    if "user_id" not in existing:
        conn.execute("ALTER TABLE reports ADD COLUMN user_id INTEGER")
    if "admin_updated" not in existing:
        conn.execute("ALTER TABLE reports ADD COLUMN admin_updated INTEGER DEFAULT 0")
    if "failure_reason" not in existing:
        conn.execute("ALTER TABLE reports ADD COLUMN failure_reason TEXT DEFAULT ''")

    # Secret key for login tokens (created once, then reused).
    secret = os.environ.get("CIVICMAP_SECRET", "").strip()
    if not secret:
        row = conn.execute("SELECT value FROM meta WHERE key='secret'").fetchone()
        if row:
            secret = row[0]
        else:
            secret = secrets.token_hex(32)
            conn.execute("INSERT INTO meta (key, value) VALUES ('secret', ?)", (secret,))

    # First admin account.
    has_admin = conn.execute("SELECT 1 FROM users WHERE role='admin' LIMIT 1").fetchone()
    if not has_admin:
        username = os.environ.get("CIVICMAP_ADMIN_USER", "admin").strip().lower() or "admin"
        password = os.environ.get("CIVICMAP_ADMIN_PASSWORD", "Admin@123")
        conn.execute(
            """
            INSERT OR IGNORE INTO users
                (name, username, email, password_hash, role, created_at)
            VALUES (?, ?, ?, ?, 'admin', ?)
            """,
            (
                "CivicMap Admin",
                username,
                f"{username}@civicmap.local",
                hash_password(password),
                datetime.now().isoformat(timespec="seconds"),
            ),
        )
        print(f"[CivicMap] Admin account created. Username: {username}")

    conn.commit()
    conn.close()
    return secret


# ------------------------------------------------------------
# USERS
# ------------------------------------------------------------

def public_user(row):
    return {
        "id": row["id"],
        "name": row["name"],
        "username": row["username"],
        "email": row["email"],
        "role": row["role"],
    }


def get_user(conn, user_id):
    row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
    return public_user(row) if row else None


def create_user(conn, name, email, password):
    name = (name or "").strip()
    email = (email or "").strip().lower()
    password = password or ""

    if len(name) < 2 or len(name) > 60:
        raise ValueError("Please enter your name (2 to 60 letters).")
    if not EMAIL_PATTERN.match(email) or len(email) > 120:
        raise ValueError("Please enter a valid email address.")
    if len(password) < 6:
        raise ValueError("Password must be at least 6 characters.")
    if len(password) > 100:
        raise ValueError("Password is too long.")

    exists = conn.execute(
        "SELECT 1 FROM users WHERE email = ? OR username = ?", (email, email)
    ).fetchone()
    if exists:
        raise ValueError("An account with this email already exists. Please log in.")

    cursor = conn.execute(
        """
        INSERT INTO users (name, username, email, password_hash, role, created_at)
        VALUES (?, ?, ?, ?, 'citizen', ?)
        """,
        (
            name,
            email,
            email,
            hash_password(password),
            datetime.now().isoformat(timespec="seconds"),
        ),
    )
    conn.commit()
    return get_user(conn, cursor.lastrowid)


# Simple protection against password guessing:
# 5 wrong tries on one account -> locked for 60 seconds.
_failed = {}
MAX_FAILS = 5
LOCK_SECONDS = 60


def seconds_locked(identifier):
    count, until = _failed.get(identifier, (0, 0))
    remaining = int(until - time.time())
    return remaining if remaining > 0 else 0


def authenticate(conn, identifier, password):
    """Return the user if the login is right, else None."""
    key = (identifier or "").strip().lower()
    if not key or not password:
        return None

    row = conn.execute(
        "SELECT * FROM users WHERE username = ? OR email = ?", (key, key)
    ).fetchone()

    # Always do the hash work so wrong user / wrong password look the same.
    stored = row["password_hash"] if row else hash_password("dummy-password")
    ok = verify_password(password, stored) and row is not None

    if ok:
        _failed.pop(key, None)
        return public_user(row)

    count, until = _failed.get(key, (0, 0))
    count += 1
    if count >= MAX_FAILS:
        _failed[key] = (0, time.time() + LOCK_SECONDS)
    else:
        _failed[key] = (count, until)
    return None


# ------------------------------------------------------------
# ADMIN FUNCTIONS
# ------------------------------------------------------------

def admin_list_reports(conn):
    rows = conn.execute(
        """
        SELECT r.*, u.name AS reporter_name, u.email AS reporter_email
        FROM reports r
        LEFT JOIN users u ON u.id = r.user_id
        ORDER BY r.created_at DESC
        """
    ).fetchall()
    return [dict(row) for row in rows]


def admin_stats(conn):
    by_status = {
        row[0]: row[1]
        for row in conn.execute("SELECT status, COUNT(*) FROM reports GROUP BY status")
    }
    by_category = {
        row[0]: row[1]
        for row in conn.execute("SELECT category, COUNT(*) FROM reports GROUP BY category")
    }
    return {
        "total": sum(by_status.values()),
        "by_status": by_status,
        "by_category": by_category,
        "users": conn.execute(
            "SELECT COUNT(*) FROM users WHERE role != 'admin'"
        ).fetchone()[0],
        "photos": conn.execute("SELECT COUNT(*) FROM report_photos").fetchone()[0],
    }


def admin_update_status(conn, report_id, status, failure_reason=""):
    status = (status or "").strip()
    failure_reason = (failure_reason or "").strip()[:500]

    if status not in ADMIN_STATUSES:
        raise ValueError("Invalid status.")
    if status != "Failed":
        failure_reason = ""

    cursor = conn.execute(
        """
        UPDATE reports
        SET status = ?, failure_reason = ?, admin_updated = 1
        WHERE id = ?
        """,
        (status, failure_reason, report_id),
    )
    conn.commit()
    return cursor.rowcount > 0


def admin_delete_report(conn, report_id):
    """Delete a complaint. Returns the photo file names to delete, or None."""
    if not conn.execute("SELECT 1 FROM reports WHERE id = ?", (report_id,)).fetchone():
        return None
    filenames = [
        row[0]
        for row in conn.execute(
            "SELECT filename FROM report_photos WHERE report_id = ?", (report_id,)
        )
    ]
    conn.execute("DELETE FROM report_photos WHERE report_id = ?", (report_id,))
    conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
    conn.commit()
    return filenames


def admin_list_users(conn):
    rows = conn.execute(
        """
        SELECT u.id, u.name, u.email, u.role, u.created_at,
               (SELECT COUNT(*) FROM reports r WHERE r.user_id = u.id) AS report_count
        FROM users u
        ORDER BY u.created_at DESC
        """
    ).fetchall()
    return [dict(row) for row in rows]
