from db.connection import get_read_conn

def get_node_count(file_ids: list[str]) -> int:
    if not file_ids:
        return 0
    res = get_read_conn().execute("MATCH (e:Entity)-[:OCCURS_IN]->(f:FileRef) WHERE f.id IN $file_ids RETURN count(DISTINCT e.id)", {"file_ids": file_ids})
    return int(res.get_next()[0]) if res.has_next() else 0

def get_top_nodes(file_ids: list[str], limit: int = 50, offset: int = 0, type_filter: list[str] | None = None) -> list[dict]:
    if not file_ids:
        return []
    type_clause = "AND e.type IN $types " if type_filter else ""
    query = f"""
        MATCH (e:Entity)-[r:OCCURS_IN]->(f:FileRef) WHERE f.id IN $file_ids {type_clause}
        RETURN e.id, e.display_name, e.type, sum(r.count), count(f.id), sum(r.tfidf)
        ORDER BY sum(r.tfidf) DESC, sum(r.count) DESC SKIP $offset LIMIT $limit
    """
    params = {"file_ids": file_ids, "offset": offset, "limit": limit}
    if type_filter:
        params["types"] = type_filter

    result = get_read_conn().execute(query, params)
    rows = []
    while result.has_next():
        row = result.get_next()
        rows.append({
            "id": row[0], "display_name": row[1], "type": row[2],
            "total_count": int(row[3]), "file_count": int(row[4]),
            "tfidf": float(row[5]) if row[5] is not None else 0.0,
        })
    return rows

def get_edges_for_nodes(node_ids: list[str]) -> list[dict]:
    if len(node_ids) < 2:
        return []
    result = get_read_conn().execute("""
        MATCH (a:Entity)-[r:CO_OCCURS]->(b:Entity) WHERE a.id IN $ids AND b.id IN $ids
        WITH (CASE WHEN a.id < b.id THEN a.id ELSE b.id END) AS src,
             (CASE WHEN a.id < b.id THEN b.id ELSE a.id END) AS tgt, r.weight AS w, r.distance AS d
        RETURN src, tgt, max(w), min(d)
    """, {"ids": node_ids})
    edges = []
    while result.has_next():
        row = result.get_next()
        edges.append({"source": row[0], "target": row[1], "weight": float(row[2]), "distance": int(row[3])})
    return edges

def get_neighbors(node_id: str, loaded_ids: list[str] | None = None) -> tuple[list[dict], list[dict]]:
    exclude = set(loaded_ids or []) | {node_id}
    result = get_read_conn().execute("""
        MATCH (root:Entity {id: $id})-[r:CO_OCCURS]-(neighbor:Entity)
        RETURN neighbor.id, neighbor.display_name, neighbor.type, max(r.weight), min(r.distance)
    """, {"id": node_id})
    
    neighbor_ids, new_nodes = [], []
    while result.has_next():
        row = result.get_next()
        if row[0] not in exclude:
            neighbor_ids.append(row[0])
            new_nodes.append({"id": row[0], "display_name": row[1], "type": row[2], "total_count": 1, "file_count": 1, "tfidf": 1.0})

    new_edges = get_edges_for_nodes([node_id] + neighbor_ids)
    new_node_set = set(neighbor_ids)
    new_edges = [e for e in new_edges if e["source"] in new_node_set or e["target"] in new_node_set]
    return new_nodes, new_edges

def get_node_by_id(node_id: str) -> dict | None:
    result = get_read_conn().execute("""
        MATCH (e:Entity {id: $id}) OPTIONAL MATCH (e)-[r:OCCURS_IN]->(f:FileRef)
        RETURN e.id, e.canonical, e.display_name, e.type, sum(r.count), count(f.id), sum(r.tfidf)
    """, {"id": node_id})
    if result.has_next():
        row = result.get_next()
        if row[0]:
            return {
                "id": row[0], "canonical": row[1], "display_name": row[2], "type": row[3],
                "total_count": int(row[4]) if row[4] is not None else 0,
                "file_count": int(row[5]) if row[5] is not None else 0,
                "tfidf": float(row[6]) if row[6] is not None else 0.0,
            }
    return None
