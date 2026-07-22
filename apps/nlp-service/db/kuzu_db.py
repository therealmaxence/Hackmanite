"""
KuzuDB connection manager and graph data layer.
"""

from db.connection import (
    get_db,
    get_write_conn,
    get_read_conn,
    _db,
    _write_conn,
    _write_lock,
    _DB_PATH
)
from db.schema import init_schema, _SCHEMA_DDL
from db.writers import (
    upsert_entity,
    upsert_file_ref,
    upsert_occurrence,
    upsert_co_occurrence,
    delete_entity_occurrences,
    delete_file_ref,
    delete_files_ref,
    bulk_import_transaction,
    update_tfidf_properties,
    save_extraction_results
)
from db.readers import (
    get_node_count,
    get_top_nodes,
    get_edges_for_nodes,
    get_neighbors,
    get_node_by_id
)
