from db.connection import get_write_conn, _write_lock

def upsert_entity(entity_id: str, canonical: str, display_name: str,
                  entity_type: str, metadata: str = "{}") -> None:
    """
    Insert entity node if it doesn't exist yet.
    KuzuDB has no native MERGE/UPSERT for nodes, so we check existence first.
    The write lock ensures no two threads race on the same entity.
    """
    conn = get_write_conn()
    with _write_lock:
        result = conn.execute(
            "MATCH (e:Entity {id: $id}) RETURN e.id LIMIT 1",
            {"id": entity_id}
        )
        if not result.has_next():
            conn.execute(
                """
                CREATE (:Entity {
                    id: $id,
                    canonical: $canonical,
                    display_name: $display_name,
                    type: $type,
                    metadata: $metadata
                })
                """,
                {
                    "id": entity_id,
                    "canonical": canonical,
                    "display_name": display_name,
                    "type": entity_type,
                    "metadata": metadata,
                },
            )


def upsert_file_ref(file_id: str) -> None:
    """Ensure a FileRef node exists for this file."""
    conn = get_write_conn()
    with _write_lock:
        result = conn.execute(
            "MATCH (f:FileRef {id: $id}) RETURN f.id LIMIT 1",
            {"id": file_id}
        )
        if not result.has_next():
            conn.execute(
                "CREATE (:FileRef {id: $id})",
                {"id": file_id}
            )


def upsert_occurrence(entity_id: str, file_id: str, count: int,
                      excerpts_json: str = "[]") -> None:
    """
    Create or update the OCCURS_IN relationship between an entity and a file.
    We delete-then-insert since KuzuDB relationships can't be updated in-place.
    """
    conn = get_write_conn()
    with _write_lock:
        conn.execute(
            """
            MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->(f:FileRef {id: $fid})
            DELETE r
            """,
            {"eid": entity_id, "fid": file_id},
        )
        conn.execute(
            """
            MATCH (e:Entity {id: $eid}), (f:FileRef {id: $fid})
            CREATE (e)-[:OCCURS_IN {count: $count, excerpts: $excerpts}]->(f)
            """,
            {
                "eid": entity_id,
                "fid": file_id,
                "count": count,
                "excerpts": excerpts_json,
            },
        )


def upsert_co_occurrence(
    source_id: str, target_id: str,
    weight: float, distance: int,
    snippet: str, source_offset: int, target_offset: int,
    file_id: str,
) -> None:
    """
    Create or update the CO_OCCURS edge between two entities.
    """
    conn = get_write_conn()
    with _write_lock:
        # Check if a higher-weight edge already exists for this pair+file
        result = conn.execute(
            """
            MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid})
            RETURN r.weight LIMIT 1
            """,
            {"sid": source_id, "tid": target_id, "fid": file_id},
        )
        if result.has_next():
            existing_weight = result.get_next()[0]
            if weight <= existing_weight:
                return   # keep the existing better edge
            conn.execute(
                """
                MATCH (a:Entity {id: $sid})-[r:CO_OCCURS {file_id: $fid}]->(b:Entity {id: $tid})
                DELETE r
                """,
                {"sid": source_id, "tid": target_id, "fid": file_id},
            )

        conn.execute(
            """
            MATCH (a:Entity {id: $sid}), (b:Entity {id: $tid})
            CREATE (a)-[:CO_OCCURS {
                weight: $weight,
                distance: $distance,
                snippet: $snippet,
                source_offset: $source_offset,
                target_offset: $target_offset,
                file_id: $file_id
            }]->(b)
            """,
            {
                "sid": source_id,
                "tid": target_id,
                "weight": weight,
                "distance": distance,
                "snippet": snippet,
                "source_offset": source_offset,
                "target_offset": target_offset,
                "file_id": file_id,
            },
        )


def delete_entity_occurrences(entity_id: str, file_ids: list[str]) -> None:
    """
    Delete OCCURS_IN and CO_OCCURS relationships for the given entity in specific files.
    If the entity has no remaining OCCURS_IN relationships, delete the Entity node itself.
    """
    conn = get_write_conn()
    with _write_lock:
        # 1. Delete OCCURS_IN relationships for specified files
        for file_id in file_ids:
            conn.execute(
                """
                MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->(f:FileRef {id: $fid})
                DELETE r
                """,
                {"eid": entity_id, "fid": file_id}
            )

        # 2. Delete CO_OCCURS relationships involving this entity in the specified files.
        for file_id in file_ids:
            conn.execute(
                """
                MATCH (a:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity)
                WHERE r.file_id = $fid
                DELETE r
                """,
                {"eid": entity_id, "fid": file_id}
            )
            conn.execute(
                """
                MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity {id: $eid})
                WHERE r.file_id = $fid
                DELETE r
                """,
                {"eid": entity_id, "fid": file_id}
            )

        # 3. Clean up the Entity node if it has no remaining OCCURS_IN relationships.
        result = conn.execute(
            """
            MATCH (e:Entity {id: $eid})-[r:OCCURS_IN]->()
            RETURN r LIMIT 1
            """,
            {"eid": entity_id}
        )
        if not result.has_next():
            # Delete remaining CO_OCCURS relationships before deleting the node
            conn.execute(
                """
                MATCH (e:Entity {id: $eid})-[r:CO_OCCURS]->(b:Entity)
                DELETE r
                """,
                {"eid": entity_id}
            )
            conn.execute(
                """
                MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity {id: $eid})
                DELETE r
                """,
                {"eid": entity_id}
            )
            conn.execute(
                """
                MATCH (e:Entity {id: $eid})
                DELETE e
                """,
                {"eid": entity_id}
            )


def delete_file_ref(file_id: str) -> None:
    """Delete a FileRef node, its occurrences, and associated co-occurrence relationships in KuzuDB."""
    conn = get_write_conn()
    with _write_lock:
        # 1. Delete CO_OCCURS relationships associated with this file
        conn.execute(
            """
            MATCH (a:Entity)-[r:CO_OCCURS {file_id: $fid}]->(b:Entity)
            DELETE r
            """,
            {"fid": file_id}
        )

        # 2. Delete OCCURS_IN relationships connected to this file
        conn.execute(
            """
            MATCH (e:Entity)-[r:OCCURS_IN]->(f:FileRef {id: $fid})
            DELETE r
            """,
            {"fid": file_id}
        )

        # 3. Delete the FileRef node
        conn.execute(
            """
            MATCH (f:FileRef {id: $fid})
            DELETE f
            """,
            {"fid": file_id}
        )

        # 4. Clean up any orphan Entity nodes with no remaining occurrences
        conn.execute(
            """
            MATCH (e:Entity)-[r:CO_OCCURS]->(b:Entity)
            WHERE NOT (e)-[:OCCURS_IN]->()
            DELETE r
            """
        )
        conn.execute(
            """
            MATCH (a:Entity)-[r:CO_OCCURS]->(e:Entity)
            WHERE NOT (e)-[:OCCURS_IN]->()
            DELETE r
            """
        )
        # Then delete the Entity nodes
        conn.execute(
            """
            MATCH (e:Entity)
            WHERE NOT (e)-[:OCCURS_IN]->()
            DELETE e
            """
        )
