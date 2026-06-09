"""
Graph read API endpoints served by the Python NLP service.

All graph queries run against KuzuDB.
The web layer (Next.js) resolves session → file IDs from SQLite.
This keeps graph traversal fully inside Python,
where KuzuDB's native Cypher engine can run it optimally.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, Query, HTTPException
from pydantic import BaseModel
from typing import Optional

from db import kuzu_db

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/graph", tags=["graph"])


# Response models for graph queries

class NodeOut(BaseModel):
    id: str
    display_name: str
    type: str
    total_count: int
    file_count: int
    tfidf: float


class NodeDetailsOut(BaseModel):
    id: str
    canonical: str
    display_name: str
    type: str
    total_count: int
    file_count: int
    tfidf: float


class EdgeOut(BaseModel):
    source: str
    target: str
    weight: float
    distance: int


class NodesResponse(BaseModel):
    nodes: list[NodeOut]
    total: int
    offset: int
    has_more: bool


class EdgesResponse(BaseModel):
    edges: list[EdgeOut]


class NeighborsResponse(BaseModel):
    nodes: list[NodeOut]
    edges: list[EdgeOut]


# Input schemas for Import

class OccurrenceIn(BaseModel):
    file_id: str
    count: int
    excerpts: Optional[str] = "[]"


class NodeIn(BaseModel):
    id: str
    canonical: str
    display_name: str
    type: str
    metadata: Optional[str] = "{}"
    occurrences: list[OccurrenceIn]


class EdgeIn(BaseModel):
    source: str
    target: str
    weight: float
    distance: int
    snippet: str
    source_offset: int
    target_offset: int
    file_id: str


class ImportGraphRequest(BaseModel):
    file_ids: list[str]
    nodes: list[NodeIn]
    edges: list[EdgeIn]


class NodeCountPostRequest(BaseModel):
    file_ids: list[str]


class NodesPostRequest(BaseModel):
    file_ids: list[str]
    limit: Optional[int] = 50
    offset: Optional[int] = 0
    types: Optional[str] = None


class EdgesPostRequest(BaseModel):
    node_ids: list[str]


class NeighborsPostRequest(BaseModel):
    node_id: str
    loaded_ids: Optional[list[str]] = []


# API Endpoints

@router.post("/import", response_model=dict)
async def import_graph(req: ImportGraphRequest):
    """
    Bulk import a graph session into KuzuDB using a single transaction.
    Called when a session is imported or synchronized from SQLite.
    """
    try:
        return kuzu_db.bulk_import_transaction(
            file_ids=req.file_ids,
            nodes=req.nodes,
            edges=req.edges
        )
    except Exception as exc:
        logger.error("import_graph failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("", response_model=dict)
async def clear_graph():
    """Clear all data from KuzuDB (detach delete all nodes and edges)."""
    conn = kuzu_db.get_write_conn()
    with kuzu_db._write_lock:
        try:
            conn.execute("MATCH (n:Entity) DETACH DELETE n")
            conn.execute("MATCH (f:FileRef) DETACH DELETE f")
            return {"success": True}
        except Exception as exc:
            logger.error("clear_graph failed: %s", exc, exc_info=True)
            raise HTTPException(status_code=500, detail=str(exc))


@router.get("/node-count", response_model=dict)
async def node_count(
    file_ids: str = Query(..., description="Comma-separated file IDs"),
):
    """Return total number of distinct entities across the given files."""
    ids = [f.strip() for f in file_ids.split(",") if f.strip()]
    if not ids:
        return {"count": 0}
    try:
        count = kuzu_db.get_node_count(ids)
        return {"count": count}
    except Exception as exc:
        logger.error("node-count failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/node-count", response_model=dict)
async def node_count_post(req: NodeCountPostRequest):
    """Return total number of distinct entities across the given files (POST version)."""
    if not req.file_ids:
        return {"count": 0}
    try:
        count = kuzu_db.get_node_count(req.file_ids)
        return {"count": count}
    except Exception as exc:
        logger.error("node-count post failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


class OccurrenceTfidfUpdate(BaseModel):
    entity_id: str
    file_id: str
    tfidf: float


class RecomputeTfidfRequest(BaseModel):
    updates: list[OccurrenceTfidfUpdate]


@router.post("/recompute-tfidf", response_model=dict)
async def recompute_tfidf(req: RecomputeTfidfRequest):
    """Update TF-IDF values for occurrences in KuzuDB."""
    try:
        updates_list = [
            {"entity_id": u.entity_id, "file_id": u.file_id, "tfidf": u.tfidf}
            for u in req.updates
        ]
        kuzu_db.update_tfidf_properties(updates_list)
        return {"success": True}
    except Exception as exc:
        logger.error("recompute_tfidf failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/nodes", response_model=NodesResponse)
async def get_nodes(
    file_ids: str = Query(..., description="Comma-separated file IDs"),
    limit: int = Query(50, ge=1, le=500),
    offset: int = Query(0, ge=0),
    types: Optional[str] = Query(None, description="Comma-separated entity types to filter"),
):
    """
    Return a paginated batch of top entities (by occurrence).
    Ordered descending so the most representative nodes arrive first.
    """
    ids = [f.strip() for f in file_ids.split(",") if f.strip()]
    if not ids:
        return NodesResponse(nodes=[], total=0, offset=offset, has_more=False)

    type_filter = [t.strip() for t in types.split(",") if t.strip()] if types else None

    try:
        rows = kuzu_db.get_top_nodes(ids, limit=limit, offset=offset, type_filter=type_filter)
        total = kuzu_db.get_node_count(ids)

        nodes = [
            NodeOut(
                id=r["id"],
                display_name=r["display_name"],
                type=r["type"],
                total_count=r["total_count"],
                file_count=r["file_count"],
                tfidf=r.get("tfidf", 0.0),
            )
            for r in rows
        ]
        return NodesResponse(
            nodes=nodes,
            total=total,
            offset=offset,
            has_more=(offset + limit) < total,
        )
    except Exception as exc:
        logger.error("get_nodes failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/nodes", response_model=NodesResponse)
async def get_nodes_post(req: NodesPostRequest):
    """Return a paginated batch of top entities (POST version)."""
    if not req.file_ids:
        return NodesResponse(nodes=[], total=0, offset=req.offset, has_more=False)

    type_filter = [t.strip() for t in req.types.split(",") if t.strip()] if req.types else None

    try:
        rows = kuzu_db.get_top_nodes(req.file_ids, limit=req.limit, offset=req.offset, type_filter=type_filter)
        total = kuzu_db.get_node_count(req.file_ids)

        nodes = [
            NodeOut(
                id=r["id"],
                display_name=r["display_name"],
                type=r["type"],
                total_count=r["total_count"],
                file_count=r["file_count"],
                tfidf=r.get("tfidf", 0.0),
            )
            for r in rows
        ]
        return NodesResponse(
            nodes=nodes,
            total=total,
            offset=req.offset,
            has_more=(req.offset + req.limit) < total,
        )
    except Exception as exc:
        logger.error("get_nodes_post failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/edges", response_model=EdgesResponse)
async def get_edges(
    node_ids: str = Query(..., description="Comma-separated entity IDs to find edges between"),
):
    """
    Return all CO_OCCURS edges where both endpoints are in the given node set.
    Called after each batch of nodes is loaded to wire up visible connections.
    """
    ids = [n.strip() for n in node_ids.split(",") if n.strip()]
    if len(ids) < 2:
        return EdgesResponse(edges=[])

    try:
        raw = kuzu_db.get_edges_for_nodes(ids)
        edges = [EdgeOut(**e) for e in raw]
        return EdgesResponse(edges=edges)
    except Exception as exc:
        logger.error("get_edges failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/edges", response_model=EdgesResponse)
async def get_edges_post(req: EdgesPostRequest):
    """Return all CO_OCCURS edges where both endpoints are in the given node set (POST version)."""
    if len(req.node_ids) < 2:
        return EdgesResponse(edges=[])

    try:
        raw = kuzu_db.get_edges_for_nodes(req.node_ids)
        edges = [EdgeOut(**e) for e in raw]
        return EdgesResponse(edges=edges)
    except Exception as exc:
        logger.error("get_edges_post failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/neighbors", response_model=NeighborsResponse)
async def get_neighbors(
    node_id: str = Query(..., description="Entity ID to expand"),
    loaded_ids: Optional[str] = Query(None, description="Comma-separated IDs already in the graph (to skip)"),
):
    """
    Return 1-hop neighbors of a node that aren't already in the graph.
    Used for click-to-expand in the UI.
    """
    already_loaded = [i.strip() for i in loaded_ids.split(",") if i.strip()] if loaded_ids else []

    try:
        new_nodes_raw, new_edges_raw = kuzu_db.get_neighbors(node_id, already_loaded)
        nodes = [NodeOut(**n) for n in new_nodes_raw]
        edges = [EdgeOut(**e) for e in new_edges_raw]
        return NeighborsResponse(nodes=nodes, edges=edges)
    except Exception as exc:
        logger.error("get_neighbors failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.post("/neighbors", response_model=NeighborsResponse)
async def get_neighbors_post(req: NeighborsPostRequest):
    """Return 1-hop neighbors of a node that aren't already in the graph (POST version)."""
    try:
        new_nodes_raw, new_edges_raw = kuzu_db.get_neighbors(req.node_id, req.loaded_ids or [])
        nodes = [NodeOut(**n) for n in new_nodes_raw]
        edges = [EdgeOut(**e) for e in new_edges_raw]
        return NeighborsResponse(nodes=nodes, edges=edges)
    except Exception as exc:
        logger.error("get_neighbors_post failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/node/{node_id}", response_model=NodeDetailsOut)
async def get_node(node_id: str):
    """Retrieve a single entity node's properties from KuzuDB by ID."""
    try:
        node = kuzu_db.get_node_by_id(node_id)
        if not node:
            raise HTTPException(status_code=404, detail="Entity not found in graph")
        return NodeDetailsOut(**node)
    except HTTPException:
        raise
    except Exception as exc:
        logger.error("get_node failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/node/{node_id}")
async def delete_node(
    node_id: str,
    file_ids: str = Query(..., description="Comma-separated file IDs to delete occurrences in"),
):
    """Delete node occurrences and connections in the given files in KuzuDB."""
    ids = [f.strip() for f in file_ids.split(",") if f.strip()]
    if not ids:
        return {"success": True}
    try:
        kuzu_db.delete_entity_occurrences(node_id, ids)
        return {"success": True}
    except Exception as exc:
        logger.error("delete_node failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))


@router.delete("/file/{file_id}")
async def delete_file(file_id: str):
    """Delete all occurrences and relationships associated with this file in KuzuDB."""
    try:
        kuzu_db.delete_file_ref(file_id)
        return {"success": True}
    except Exception as exc:
        logger.error("delete_file failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

class DeleteFilesRequest(BaseModel):
    file_ids: list[str]

@router.post("/files/delete", response_model=dict)
async def delete_files(req: DeleteFilesRequest):
    """Delete all occurrences and relationships associated with multiple files in KuzuDB."""
    try:
        kuzu_db.delete_files_ref(req.file_ids)
        return {"success": True}
    except Exception as exc:
        logger.error("delete_files failed: %s", exc, exc_info=True)
        raise HTTPException(status_code=500, detail=str(exc))

