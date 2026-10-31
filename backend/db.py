"""
CivicMap Mumbai - database layer.

* If the environment variable DATABASE_URL is set (Neon / Postgres),
  the app uses Postgres.
* Otherwise it uses the local SQLite file (backend/civicmap.db), exactly
  like before, so running on your own computer still works.

The rest of the code keeps using SQLite-style SQL ("?" placeholders).
For Postgres this file converts that SQL automatically.
"""

import os
import re
import sqlite3

DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
IS_PG = DATABASE_URL.startswith(("postgres://", "postgresql://"))

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SQLITE_PATH = os.path.join(BASE_DIR, "civicmap.db")

if IS_PG:
    import psycopg2
    import psycopg2.extras


# ------------------------------------------------------------
# SQL translation (SQLite style -> Postgres)
# ------------------------------------------------------------

_RETURNING_TABLES = re.compile(
    r"^\s*INSERT\s+INTO\s+(users|report_photos)\b", re.IGNORECASE
)


def translate_sql(sql):
    """Convert SQLite-style SQL to Postgres. Returns (sql, wants_returning_id)."""
    sql = sql.replace("%", "%%")
    sql = sql.replace("?", "%s")
    sql = re.sub(r"INTEGER\s+PRIMARY\s+KEY\s+AUTOINCREMENT",
                 "SERIAL PRIMARY KEY", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\bREAL\b", "DOUBLE PRECISION", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\bBLOB\b", "BYTEA", sql, flags=re.IGNORECASE)

    ignore = re.search(r"INSERT\s+OR\s+IGNORE\s+INTO", sql, re.IGNORECASE)
    if ignore:
        sql = re.sub(r"INSERT\s+OR\s+IGNORE\s+INTO", "INSERT INTO",
                     sql, flags=re.IGNORECASE)
        sql = sql.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"

    wants_id = bool(_RETURNING_TABLES.match(sql)) and not ignore
    if wants_id:
        sql = sql.rstrip().rstrip(";") + " RETURNING id"
    return sql, wants_id


# ------------------------------------------------------------
# Postgres wrappers that behave like sqlite3 connection / cursor
# ------------------------------------------------------------

class _PgCursor:
    def __init__(self, raw):
        self._cur = raw
        self.lastrowid = None

    def execute(self, sql, params=()):
        sql, wants_id = translate_sql(sql)
        params = tuple(
            psycopg2.Binary(p) if isinstance(p, (bytes, bytearray)) else p
            for p in (params or ())
        )
        self._cur.execute(sql, params)
        if wants_id:
            row = self._cur.fetchone()
            self.lastrowid = row[0] if row else None
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    def __iter__(self):
        return iter(self._cur.fetchall())

    @property
    def rowcount(self):
        return self._cur.rowcount


class _PgConnection:
    def __init__(self, raw):
        self._conn = raw

    def cursor(self):
        return _PgCursor(
            self._conn.cursor(cursor_factory=psycopg2.extras.DictCursor)
        )

    def execute(self, sql, params=()):
        return self.cursor().execute(sql, params)

    def commit(self):
        self._conn.commit()

    def rollback(self):
        self._conn.rollback()

    def close(self):
        self._conn.close()


# ------------------------------------------------------------
# Public helpers
# ------------------------------------------------------------

def get_db():
    if IS_PG:
        return _PgConnection(psycopg2.connect(DATABASE_URL))
    connection = sqlite3.connect(SQLITE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def column_names(conn, table):
    """Names of the columns that already exist in a table."""
    if IS_PG:
        rows = conn.execute(
            "SELECT column_name FROM information_schema.columns "
            "WHERE table_name = ?", (table,)
        ).fetchall()
        return {row[0] for row in rows}
    return {row[1] for row in conn.execute(f"PRAGMA table_info({table})")}


def row_bytes(value):
    """Photo data comes back as memoryview on Postgres - make it bytes."""
    if value is None:
        return None
    return bytes(value)
