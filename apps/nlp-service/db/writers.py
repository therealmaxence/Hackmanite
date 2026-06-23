import logging
import json
import uuid
from db.connection import get_write_conn, _write_lock

logger = logging.getLogger(__name__)

# Query Constants
MATCH_ENTITY = "MATCH (e:Entity {id: $id}) RETURN e.id LIMIT 1"
CREATE_ENTITY = "CREATE (:Entity {id: $id, canonical: $canonical, display_name: $display_name, type: $type, metadata: $metadata})"
MATCH_FILE_REF = "MATCH (f:FileRef {id: $id}) RETURN f.id LIMIT 1"
CREATE_FILE_REF = "CREATE (:FileRef {id: $id})"
DELETE_OCCURRENCE = "MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->(f:FileRef {id: $fid}) DELETE r"
CREATE_OCCURRENCE = "MATCH (e:Entity {id: $eid}), (f:FileRef {id: $fid}) CREATE (e)-[:OCCURS_IN {count: $count, excerpts: $excerpts}]->(f)"
MATCH_CO_OCCURRENCE = "MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid}) RETURN r.weight LIMIT 1"
DELETE_CO_OCCURRENCE = "MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid}) DELETE r"
CREATE_CO_OCCURRENCE = "MATCH (a:Entity {id: $sid}), (b:Entity {id: $tid}) CREATE (a)-[:CO_OCCURS {weight: $weight, distance: $distance, snippet: $snippet, source_offset: $source_offset, target_offset: $target_offset, file_id: $file_id}]->(b)"
DELETE_ENTITY_CO_OCCURS_SRC = "MATCH (a:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity) WHERE r.file_id = $fid DELETE r"
DELETE_ENTITY_CO_OCCURS_TGT = "MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity {id: $eid}) WHERE r.file_id = $fid DELETE r"
CHECK_ENTITY_HAS_OCCURRENCES = "MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->() RETURN r LIMIT 1"
DELETE_ALL_CO_OCCURS_SRC = "MATCH (e:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity) DELETE r"
DELETE_ALL_CO_OCCURS_TGT = "MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity {id: $eid}) DELETE r"
DELETE_ENTITY_NODE = "MATCH (e:Entity {id: $eid}) DELETE e"
DELETE_CO_OCCURS_BY_FILE = "MATCH (a:Entity)-[r:CO_OCCURS {file_id: $fid}]->(b:Entity) DELETE r"
DELETE_OCCURRENCES_BY_FILE = "MATCH (e:Entity)-[r:OCCURS_IN]->(f:FileRef {id: $fid}) DELETE r"
DELETE_FILE_REF_NODE = "MATCH (f:FileRef {id: $fid}) DELETE f"
DELETE_ORPHAN_CO_OCCURS_SRC = "MATCH (e:Entity)-[r:CO_OCCURS]->(b:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE r"
DELETE_ORPHAN_CO_OCCURS_TGT = "MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE r"
DELETE_ORPHAN_ENTITIES = "MATCH (e:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE e"

def _upsert_file_ref_conn(conn, file_id: str) -> None:
    if not conn.execute(MATCH_FILE_REF, {"id": file_id}).has_next():
        conn.execute(CREATE_FILE_REF, {"id": file_id})

def _upsert_entity_conn(conn, entity_id: str, canonical: str, display_name: str, entity_type: str, metadata: str = "{}") -> None:
    if not conn.execute(MATCH_ENTITY, {"id": entity_id}).has_next():
        conn.execute(CREATE_ENTITY, {"id": entity_id, "canonical": canonical[:500], "display_name": display_name[:500], "type": entity_type, "metadata": metadata})

def _upsert_occurrence_conn(conn, entity_id: str, file_id: str, count: int, excerpts_json: str = "[]") -> None:
    conn.execute(DELETE_OCCURRENCE, {"eid": entity_id, "fid": file_id})
    conn.execute(CREATE_OCCURRENCE, {"eid": entity_id, "fid": file_id, "count": count, "excerpts": excerpts_json})

def _upsert_co_occurrence_conn(conn, source_id: str, target_id: str, weight: float, distance: int, snippet: str, source_offset: int, target_offset: int, file_id: str) -> None:
    result = conn.execute(MATCH_CO_OCCURRENCE, {"sid": source_id, "tid": target_id, "fid": file_id})
    if result.has_next():
        if weight <= result.get_next()[0]:
            return
        conn.execute(DELETE_CO_OCCURRENCE, {"sid": source_id, "tid": target_id, "fid": file_id})
    conn.execute(CREATE_CO_OCCURRENCE, {"sid": source_id, "tid": target_id, "weight": weight, "distance": distance, "snippet": snippet, "source_offset": source_offset, "target_offset": target_offset, "file_id": file_id})

def upsert_entity(entity_id: str, canonical: str, display_name: str, entity_type: str, metadata: str = "{}") -> None:
    with _write_lock: _upsert_entity_conn(get_write_conn(), entity_id, canonical, display_name, entity_type, metadata)

def upsert_file_ref(file_id: str) -> None:
    with _write_lock: _upsert_file_ref_conn(get_write_conn(), file_id)

def upsert_occurrence(entity_id: str, file_id: str, count: int, excerpts_json: str = "[]") -> None:
    with _write_lock: _upsert_occurrence_conn(get_write_conn(), entity_id, file_id, count, excerpts_json)

def upsert_co_occurrence(source_id: str, target_id: str, weight: float, distance: int, snippet: str, source_offset: int, target_offset: int, file_id: str) -> None:
    with _write_lock: _upsert_co_occurrence_conn(get_write_conn(), source_id, target_id, weight, distance, snippet, source_offset, target_offset, file_id)

def delete_entity_occurrences(entity_id: str, file_ids: list[str]) -> None:
    conn = get_write_conn()
    with _write_lock:
        for file_id in file_ids:
            conn.execute(DELETE_OCCURRENCE, {"eid": entity_id, "fid": file_id})
            conn.execute(DELETE_ENTITY_CO_OCCURS_SRC, {"eid": entity_id, "fid": file_id})
            conn.execute(DELETE_ENTITY_CO_OCCURS_TGT, {"eid": entity_id, "fid": file_id})
        if not conn.execute(CHECK_ENTITY_HAS_OCCURRENCES, {"eid": entity_id}).has_next():
            conn.execute(DELETE_ALL_CO_OCCURS_SRC, {"eid": entity_id})
            conn.execute(DELETE_ALL_CO_OCCURS_TGT, {"eid": entity_id})
            conn.execute(DELETE_ENTITY_NODE, {"eid": entity_id})

def delete_file_ref(file_id: str) -> None:
    conn = get_write_conn()
    with _write_lock:
        conn.execute(DELETE_CO_OCCURS_BY_FILE, {"fid": file_id})
        conn.execute(DELETE_OCCURRENCES_BY_FILE, {"fid": file_id})
        conn.execute(DELETE_FILE_REF_NODE, {"fid": file_id})
        conn.execute(DELETE_ORPHAN_CO_OCCURS_SRC)
        conn.execute(DELETE_ORPHAN_CO_OCCURS_TGT)
        conn.execute(DELETE_ORPHAN_ENTITIES)

def _rollback(conn):
    try: conn.execute("ROLLBACK")
    except Exception as e: logger.error(f"ROLLBACK failed: {e}")

def delete_files_ref(file_ids: list[str]) -> None:
    if not file_ids:
        return
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            for file_id in file_ids:
                conn.execute(DELETE_CO_OCCURS_BY_FILE, {"fid": file_id})
                conn.execute(DELETE_OCCURRENCES_BY_FILE, {"fid": file_id})
                conn.execute(DELETE_FILE_REF_NODE, {"fid": file_id})
            conn.execute(DELETE_ORPHAN_CO_OCCURS_SRC)
            conn.execute(DELETE_ORPHAN_CO_OCCURS_TGT)
            conn.execute(DELETE_ORPHAN_ENTITIES)
            conn.execute("COMMIT")
        except Exception as exc:
            _rollback(conn)
            raise exc

def bulk_import_transaction(file_ids: list[str], nodes: list, edges: list) -> dict:
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            inserted_files, inserted_entities = set(), set()
            for file_id in file_ids:
                if file_id not in inserted_files:
                    _upsert_file_ref_conn(conn, file_id)
                    inserted_files.add(file_id)
            for node in nodes:
                if node.id not in inserted_entities:
                    _upsert_entity_conn(conn, node.id, node.canonical, node.display_name, node.type, node.metadata or "{}")
                    inserted_entities.add(node.id)
                for occ in node.occurrences:
                    _upsert_occurrence_conn(conn, node.id, occ.file_id, occ.count, occ.excerpts or "[]")
            for edge in edges:
                src_id, tgt_id = (edge.source, edge.target) if edge.source < edge.target else (edge.target, edge.source)
                conn.execute(CREATE_CO_OCCURRENCE, {"sid": src_id, "tid": tgt_id, "weight": edge.weight, "distance": edge.distance, "snippet": edge.snippet, "source_offset": edge.source_offset, "target_offset": edge.target_offset, "file_id": edge.file_id})
            conn.execute("COMMIT")
            return {"success": True, "files_imported": len(file_ids), "nodes_imported": len(nodes), "edges_imported": len(edges)}
        except Exception as exc:
            _rollback(conn)
            raise exc

def update_tfidf_properties(updates: list[dict]) -> None:
    if updates:
        with _write_lock: get_write_conn().execute("UNWIND $updates AS u MATCH (e:Entity {id: u.entity_id})-[r:OCCURS_IN]->(f:FileRef {id: u.file_id}) SET r.tfidf = u.tfidf", {"updates": updates})

def save_extraction_results(file_id: str, entities: list, neighborhoods: list) -> None:
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            _upsert_file_ref_conn(conn, file_id)
            entity_id_map, seen_entities = {}, set()
            for entity in entities:
                canonical = entity.canonical[:500]
                etype = entity.type.value if hasattr(entity.type, "value") else str(entity.type)
                eid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{etype}:{canonical}"))
                entity_id_map[(canonical, entity.type)] = eid
                if eid not in seen_entities:
                    _upsert_entity_conn(conn, eid, canonical, entity.display_name[:500], etype, json.dumps(entity.metadata or {}) if hasattr(entity, "metadata") else "{}")
                    seen_entities.add(eid)
                _upsert_occurrence_conn(conn, eid, file_id, entity.count, json.dumps(list(entity.excerpts) if entity.excerpts else []))
            for nb in neighborhoods:
                src_id = entity_id_map.get((nb.source_canonical[:500], nb.source_type))
                tgt_id = entity_id_map.get((nb.target_canonical[:500], nb.target_type))
                if src_id and tgt_id and src_id != tgt_id:
                    s, t = (src_id, tgt_id) if src_id < tgt_id else (tgt_id, src_id)
                    _upsert_co_occurrence_conn(conn, s, t, nb.weight, nb.distance, nb.snippet, nb.source_offset, nb.target_offset, file_id)
            conn.execute("COMMIT")
        except Exception as exc:
            _rollback(conn)
            raise exc
