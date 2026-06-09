from db.connection import get_read_conn

def get_node_count(file_ids: list[str]) -> int:
    """Count distinct entities that appear in any of the given files."""
    if not file_ids:
        return 0
    conn = get_read_conn()
    result = conn.execute(
        """
        MATCH (e:Entity)-[:OCCURS_IN]->(f:FileRef)
        WHERE f.id IN $file_ids
        RETURN count(DISTINCT e.id)
        """,
        {"file_ids": file_ids},
    )
    row = result.get_next()
    return int(row[0]) if row else 0


def get_top_nodes(file_ids: list[str], limit: int = 50, offset: int = 0,
                  type_filter: list[str] | None = None) -> list[dict]:
    """
    Return the top `limit` entities (ordered by TF-IDF descending).
    Supports optional entity type filter.
    """
    if not file_ids:
        return []
    conn = get_read_conn()

    type_clause = "AND e.type IN $types " if type_filter else ""
    query = f"""
        MATCH (e:Entity)-[r:OCCURS_IN]->(f:FileRef)
        WHERE f.id IN $file_ids {type_clause}
        RETURN
            e.id          AS id,
            e.display_name AS display_name,
            e.type        AS type,
            sum(r.count)  AS total_count,
            count(f.id)   AS file_count,
            sum(r.tfidf)  AS total_tfidf
        ORDER BY total_tfidf DESC, total_count DESC
        SKIP $offset
        LIMIT $limit
    """
    params: dict = {"file_ids": file_ids, "offset": offset, "limit": limit}
    if type_filter:
        params["types"] = type_filter

    result = conn.execute(query, params)
    rows = []
    while result.has_next():
        row = result.get_next()
        rows.append({
            "id": row[0],
            "display_name": row[1],
            "type": row[2],
            "total_count": int(row[3]),
            "file_count": int(row[4]),
            "tfidf": float(row[5]) if row[5] is not None else 0.0,
        })
    return rows


def get_edges_for_nodes(node_ids: list[str]) -> list[dict]:
    """
    Return all CO_OCCURS edges where BOTH endpoints are in node_ids.
    We pick the best (highest weight) edge per unordered pair.
    """
    if len(node_ids) < 2:
        return []
    conn = get_read_conn()
    result = conn.execute(
        """
        MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity)
        WHERE a.id IN $ids AND b.id IN $ids
        RETURN
            a.id        AS source,
            b.id        AS target,
            max(r.weight)    AS weight,
            min(r.distance)  AS distance
        """,
        {"ids": node_ids},
    )
    edges = []
    seen: set[tuple[str, str]] = set()
    while result.has_next():
        row = result.get_next()
        src, tgt = row[0], row[1]
        # Canonicalize pair so (a,b) and (b,a) become the same key
        key = (min(src, tgt), max(src, tgt))
        if key in seen:
            continue
        seen.add(key)
        edges.append({
            "source": key[0],
            "target": key[1],
            "weight": float(row[2]),
            "distance": int(row[3]),
        })
    return edges


def get_neighbors(node_id: str, loaded_ids: list[str] | None = None) -> tuple[list[dict], list[dict]]:
    """
    Return 1-hop neighbors of node_id that are NOT already in loaded_ids (plus the edges connecting them).
    Returns (new_nodes, new_edges).
    """
    conn = get_read_conn()
    exclude = set(loaded_ids or [])
    exclude.add(node_id)

    # Fetch direct neighbors via CO_OCCURS in both directions
    result = conn.execute(
        """
        MATCH (root:Entity {id: $id})-[r:CO_OCCURS]-(neighbor:Entity)
        RETURN
            neighbor.id          AS id,
            neighbor.display_name AS display_name,
            neighbor.type        AS type,
            max(r.weight)        AS weight,
            min(r.distance)      AS distance
        """,
        {"id": node_id},
    )

    neighbor_ids: list[str] = []
    new_nodes: list[dict] = []

    while result.has_next():
        row = result.get_next()
        nid = row[0]
        if nid in exclude:
            continue
        neighbor_ids.append(nid)
        new_nodes.append({
            "id": nid,
            "display_name": row[1],
            "type": row[2],
            "total_count": 1,
            "file_count": 1,
            "tfidf": 1.0,
        })

    all_relevant = [node_id] + neighbor_ids
    new_edges = get_edges_for_nodes(all_relevant)

    new_node_set = set(neighbor_ids)
    new_edges = [
        e for e in new_edges
        if e["source"] in new_node_set or e["target"] in new_node_set
    ]

    return new_nodes, new_edges


def get_node_by_id(node_id: str) -> dict | None:
    """Retrieve a single Entity node by its ID."""
    conn = get_read_conn()
    result = conn.execute(
        """
        MATCH (e:Entity {id: $id})
        OPTIONAL MATCH (e)-[r:OCCURS_IN]->(f:FileRef)
        RETURN
            e.id          AS id,
            e.canonical   AS canonical,
            e.display_name AS display_name,
            e.type        AS type,
            sum(r.count)  AS total_count,
            count(f.id)   AS file_count,
            sum(r.tfidf)  AS tfidf
        """,
        {"id": node_id},
    )
    if result.has_next():
        row = result.get_next()
        if not row[0]:
            return None
        return {
            "id": row[0],
            "canonical": row[1],
            "display_name": row[2],
            "type": row[3],
            "total_count": int(row[4]) if row[4] is not None else 0,
            "file_count": int(row[5]) if row[5] is not None else 0,
            "tfidf": float(row[6]) if row[6] is not None else 0.0,
        }
    return None

