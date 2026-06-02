from __future__ import annotations

import os
import threading
import logging
from pathlib import Path
from typing import Optional

import kuzu

logger = logging.getLogger(__name__)

_db: Optional[kuzu.Database] = None
_write_conn: Optional[kuzu.Connection] = None
_write_lock = threading.Lock()   # KuzuDB is single-writer;

_DB_PATH = os.environ.get("KUZU_DB_PATH", "./kuzu_data/kuzu.db")


def get_db() -> kuzu.Database:
    global _db
    if _db is None:
        db_path = Path(_DB_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        _db = kuzu.Database(str(db_path))
        logger.info("KuzuDB opened at %s", db_path)
    return _db


def get_write_conn() -> kuzu.Connection:
    global _write_conn
    if _write_conn is None:
        _write_conn = kuzu.Connection(get_db())
    return _write_conn


def get_read_conn() -> kuzu.Connection:
    """Return a fresh read connection. (KuzuDB allows concurrent readers.)"""
    return kuzu.Connection(get_db())