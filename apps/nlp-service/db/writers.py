import logging
import json
import uuid
from db.connection import get_write_conn, _write_lock

logger = logging.getLogger(__name__)

MATCH_ENTITY           = "MATCH (e:Entity {id: $id}) RETURN e.id LIMIT 1"
CREATE_ENTITY          = "CREATE (:Entity {id: $id, canonical: $canonical, display_name: $display_name, type: $type, metadata: $metadata})"
MATCH_FILE_REF         = "MATCH (f:FileRef {id: $id}) RETURN f.id LIMIT 1"
CREATE_FILE_REF        = "CREATE (:FileRef {id: $id})"
DELETE_OCCURRENCE      = "MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->(f:FileRef {id: $fid}) DELETE r"
CREATE_OCCURRENCE      = "MATCH (e:Entity {id: $eid}), (f:FileRef {id: $fid}) CREATE (e)-[:OCCURS_IN {count: $count, excerpts: $excerpts}]->(f)"
MATCH_CO_OCCURRENCE    = "MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid}) RETURN r.weight LIMIT 1"
DELETE_CO_OCCURRENCE   = "MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid}) DELETE r"
CREATE_CO_OCCURRENCE   = "MATCH (a:Entity {id: $sid}), (b:Entity {id: $tid}) CREATE (a)-[:CO_OCCURS {weight: $weight, distance: $distance, snippet: $snippet, source_offset: $source_offset, target_offset: $target_offset, file_id: $file_id}]->(b)"
DELETE_ENTITY_CO_SRC   = "MATCH (a:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity) WHERE r.file_id = $fid DELETE r"
DELETE_ENTITY_CO_TGT   = "MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity {id: $eid}) WHERE r.file_id = $fid DELETE r"
CHECK_ENTITY_HAS_OCCUR = "MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->() RETURN r LIMIT 1"
DELETE_ALL_CO_SRC      = "MATCH (e:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity) DELETE r"
DELETE_ALL_CO_TGT      = "MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity {id: $eid}) DELETE r"
DELETE_ENTITY_NODE     = "MATCH (e:Entity {id: $eid}) DELETE e"
DELETE_CO_BY_FILE      = "MATCH (a:Entity)-[r:CO_OCCURS {file_id: $fid}]->(b:Entity) DELETE r"
DELETE_OCCUR_BY_FILE   = "MATCH (e:Entity)-[r:OCCURS_IN]->(f:FileRef {id: $fid}) DELETE r"
DELETE_FILE_REF_NODE   = "MATCH (f:FileRef {id: $fid}) DELETE f"
DELETE_ORPHAN_CO_SRC   = "MATCH (e:Entity)-[r:CO_OCCURS]->(b:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE r"
DELETE_ORPHAN_CO_TGT   = "MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE r"
DELETE_ORPHAN_ENTITIES = "MATCH (e:Entity) WHERE NOT (e)-[:OCCURS_IN]->() DELETE e"


def _upsert_file_ref(conn, file_id: str) -> None:
    if not conn.execute(MATCH_FILE_REF, {"id": file_id}).has_next():
        conn.execute(CREATE_FILE_REF, {"id": file_id})

def _upsert_entity(conn, eid: str, canonical: str, display_name: str, etype: str, metadata: str = "{}") -> None:
    if not conn.execute(MATCH_ENTITY, {"id": eid}).has_next():
        conn.execute(CREATE_ENTITY, {"id": eid, "canonical": canonical[:500], "display_name": display_name[:500], "type": etype, "metadata": metadata})

def _upsert_occurrence(conn, eid: str, fid: str, count: int, excerpts: str = "[]") -> None:
    conn.execute(DELETE_OCCURRENCE, {"eid": eid, "fid": fid})
    conn.execute(CREATE_OCCURRENCE, {"eid": eid, "fid": fid, "count": count, "excerpts": excerpts})

def _upsert_co_occurrence(conn, sid: str, tid: str, weight: float, distance: int, snippet: str, src_off: int, tgt_off: int, fid: str) -> None:
    result = conn.execute(MATCH_CO_OCCURRENCE, {"sid": sid, "tid": tid, "fid": fid})
    if result.has_next():
        if weight <= result.get_next()[0]:
            return
        conn.execute(DELETE_CO_OCCURRENCE, {"sid": sid, "tid": tid, "fid": fid})
    conn.execute(CREATE_CO_OCCURRENCE, {"sid": sid, "tid": tid, "weight": weight, "distance": distance, "snippet": snippet, "source_offset": src_off, "target_offset": tgt_off, "file_id": fid})

def _rollback(conn) -> None:
    try: conn.execute("ROLLBACK")
    except Exception as e: logger.error("ROLLBACK failed: %s", e)

def _cleanup_orphans(conn) -> None:
    conn.execute(DELETE_ORPHAN_CO_SRC)
    conn.execute(DELETE_ORPHAN_CO_TGT)
    conn.execute(DELETE_ORPHAN_ENTITIES)


def upsert_entity(eid: str, canonical: str, display_name: str, etype: str, metadata: str = "{}") -> None:
    with _write_lock: _upsert_entity(get_write_conn(), eid, canonical, display_name, etype, metadata)

def upsert_file_ref(file_id: str) -> None:
    with _write_lock: _upsert_file_ref(get_write_conn(), file_id)

def upsert_occurrence(eid: str, fid: str, count: int, excerpts: str = "[]") -> None:
    with _write_lock: _upsert_occurrence(get_write_conn(), eid, fid, count, excerpts)

def upsert_co_occurrence(sid: str, tid: str, weight: float, distance: int, snippet: str, src_off: int, tgt_off: int, fid: str) -> None:
    with _write_lock: _upsert_co_occurrence(get_write_conn(), sid, tid, weight, distance, snippet, src_off, tgt_off, fid)


def delete_entity_occurrences(entity_id: str, file_ids: list[str]) -> None:
    conn = get_write_conn()
    with _write_lock:
        for fid in file_ids:
            conn.execute(DELETE_OCCURRENCE,    {"eid": entity_id, "fid": fid})
            conn.execute(DELETE_ENTITY_CO_SRC, {"eid": entity_id, "fid": fid})
            conn.execute(DELETE_ENTITY_CO_TGT, {"eid": entity_id, "fid": fid})
        if not conn.execute(CHECK_ENTITY_HAS_OCCUR, {"eid": entity_id}).has_next():
            conn.execute(DELETE_ALL_CO_SRC,  {"eid": entity_id})
            conn.execute(DELETE_ALL_CO_TGT,  {"eid": entity_id})
            conn.execute(DELETE_ENTITY_NODE, {"eid": entity_id})

def delete_file_ref(file_id: str) -> None:
    conn = get_write_conn()
    with _write_lock:
        conn.execute(DELETE_CO_BY_FILE,    {"fid": file_id})
        conn.execute(DELETE_OCCUR_BY_FILE, {"fid": file_id})
        conn.execute(DELETE_FILE_REF_NODE, {"fid": file_id})
        _cleanup_orphans(conn)

def delete_files_ref(file_ids: list[str]) -> None:
    if not file_ids:
        return
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            for fid in file_ids:
                conn.execute(DELETE_CO_BY_FILE,    {"fid": fid})
                conn.execute(DELETE_OCCUR_BY_FILE, {"fid": fid})
                conn.execute(DELETE_FILE_REF_NODE, {"fid": fid})
            _cleanup_orphans(conn)
            conn.execute("COMMIT")
        except Exception:
            _rollback(conn)
            raise

def bulk_import_transaction(file_ids: list[str], nodes: list, edges: list) -> dict:
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            seen_files: set = set()
            for fid in file_ids:
                if fid not in seen_files:
                    _upsert_file_ref(conn, fid)
                    seen_files.add(fid)
            seen_entities: set = set()
            for node in nodes:
                if node.id not in seen_entities:
                    _upsert_entity(conn, node.id, node.canonical, node.display_name, node.type, node.metadata or "{}")
                    seen_entities.add(node.id)
                for occ in node.occurrences:
                    _upsert_occurrence(conn, node.id, occ.file_id, occ.count, occ.excerpts or "[]")
            for edge in edges:
                s, t = (edge.source, edge.target) if edge.source < edge.target else (edge.target, edge.source)
                conn.execute(CREATE_CO_OCCURRENCE, {"sid": s, "tid": t, "weight": edge.weight, "distance": edge.distance, "snippet": edge.snippet, "source_offset": edge.source_offset, "target_offset": edge.target_offset, "file_id": edge.file_id})
            conn.execute("COMMIT")
            return {"success": True, "files_imported": len(file_ids), "nodes_imported": len(nodes), "edges_imported": len(edges)}
        except Exception:
            _rollback(conn)
            raise

def update_tfidf_properties(updates: list[dict]) -> None:
    if updates:
        with _write_lock:
            get_write_conn().execute("UNWIND $updates AS u MATCH (e:Entity {id: u.entity_id})-[r:OCCURS_IN]->(f:FileRef {id: u.file_id}) SET r.tfidf = u.tfidf", {"updates": updates})

def save_extraction_results(file_id: str, entities: list, neighborhoods: list) -> None:
    conn = get_write_conn()
    with _write_lock:
        conn.execute("BEGIN TRANSACTION")
        try:
            _upsert_file_ref(conn, file_id)
            entity_id_map: dict = {}
            seen: set = set()
            for entity in entities:
                canonical = entity.canonical[:500]
                etype = entity.type.value
                eid = str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{etype}:{canonical}"))
                entity_id_map[(canonical, entity.type)] = eid
                if eid not in seen:
                    meta = json.dumps(entity.metadata or {}) if hasattr(entity, "metadata") else "{}"
                    _upsert_entity(conn, eid, canonical, entity.display_name[:500], etype, meta)
                    seen.add(eid)
                _upsert_occurrence(conn, eid, file_id, entity.count, json.dumps(list(entity.excerpts) if entity.excerpts else []))
            for nb in neighborhoods:
                src = entity_id_map.get((nb.source_canonical[:500], nb.source_type))
                tgt = entity_id_map.get((nb.target_canonical[:500], nb.target_type))
                if src and tgt and src != tgt:
                    s, t = (src, tgt) if src < tgt else (tgt, src)
                    _upsert_co_occurrence(conn, s, t, nb.weight, nb.distance, nb.snippet, nb.source_offset, nb.target_offset, file_id)
            conn.execute("COMMIT")
        except Exception:
            _rollback(conn)
            raise
