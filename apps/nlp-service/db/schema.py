import logging
from db.connection import get_write_conn, _write_lock

logger = logging.getLogger(__name__)


_SCHEMA_DDL = [
    # Entity node table. "canonical" is a normalized form of the display name for deduplication.
    """
    CREATE NODE TABLE IF NOT EXISTS Entity(
        id STRING,
        canonical STRING,
        display_name STRING,
        type STRING,
        metadata STRING,
        PRIMARY KEY(id)
    )
    """,
    # Lightweight file reference (more infos about files stored in SQLite)
    """
    CREATE NODE TABLE IF NOT EXISTS FileRef(
        id STRING,
        PRIMARY KEY(id)
    )
    """,
    # Entity appears in a file N times
    """
    CREATE REL TABLE IF NOT EXISTS OCCURS_IN(
        FROM Entity TO FileRef,
        count INT64,
        excerpts STRING
    )
    """,
    # Two entities co-occur in the same text window
    """
    CREATE REL TABLE IF NOT EXISTS CO_OCCURS(
        FROM Entity TO Entity,
        weight DOUBLE,
        distance INT64,
        snippet STRING,
        source_offset INT64,
        target_offset INT64,
        file_id STRING
    )
    """,
]


def init_schema() -> None:
    """Create tables if they don't exist yet. Called once at service startup."""
    conn = get_write_conn()
    with _write_lock:
        for ddl in _SCHEMA_DDL:
            conn.execute(ddl.strip())
    logger.info("KuzuDB schema ready")
