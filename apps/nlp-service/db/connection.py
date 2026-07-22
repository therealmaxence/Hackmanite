import os
import threading
import logging
from pathlib import Path
import kuzu

logger = logging.getLogger(__name__)

_db = None
_write_conn = None
_write_lock = threading.Lock()
_DB_PATH = os.environ.get("KUZU_DB_PATH", "./kuzu_data/kuzu.db")

def get_db() -> kuzu.Database:
    global _db
    if _db is None:
        db_path = Path(_DB_PATH)
        db_path.parent.mkdir(parents=True, exist_ok=True)
        size_str = os.environ.get("KUZU_BUFFER_POOL_SIZE")
        if size_str and size_str.strip() not in ("", "0", "default"):
            try:
                size = int(size_str)
                _db = kuzu.Database(str(db_path), buffer_pool_size=size)
                logger.info(f"KuzuDB opened at {db_path} (buffer pool size: {size} bytes)")
                return _db
            except ValueError:
                logger.warning(f"Invalid KUZU_BUFFER_POOL_SIZE: {size_str}. Using Kùzu default.")
        _db = kuzu.Database(str(db_path))
        logger.info(f"KuzuDB opened at {db_path} (Kùzu default buffer pool size)")
    return _db

def get_write_conn() -> kuzu.Connection:
    global _write_conn
    if _write_conn is None:
        _write_conn = kuzu.Connection(get_db())
    return _write_conn

def get_read_conn() -> kuzu.Connection:
    return kuzu.Connection(get_db())