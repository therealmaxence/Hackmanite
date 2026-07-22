import logging
from db.connection import get_write_conn, _write_lock

logger = logging.getLogger(__name__)

_SCHEMA_DDL = [
    "CREATE NODE TABLE IF NOT EXISTS Entity(id STRING, canonical STRING, display_name STRING, type STRING, metadata STRING, PRIMARY KEY(id))",
    "CREATE NODE TABLE IF NOT EXISTS FileRef(id STRING, PRIMARY KEY(id))",
    "CREATE REL TABLE IF NOT EXISTS OCCURS_IN(FROM Entity TO FileRef, count INT64, tfidf DOUBLE, excerpts STRING)",
    "CREATE REL TABLE IF NOT EXISTS CO_OCCURS(FROM Entity TO Entity, weight DOUBLE, distance INT64, snippet STRING, source_offset INT64, target_offset INT64, file_id STRING)",
]

def init_schema() -> None:
    conn = get_write_conn()
    with _write_lock:
        for ddl in _SCHEMA_DDL:
            conn.execute(ddl)
        try:
            conn.execute("ALTER TABLE OCCURS_IN ADD tfidf DOUBLE DEFAULT 0.0")
        except Exception:
            pass
    logger.info("KuzuDB schema ready")
