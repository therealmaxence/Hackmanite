"""
Dispatcher, orchestrator for the extraction tiers.
"""

import json
import logging
import time
import uuid
from pathlib import Path

from services.router import decide_routing, ExtractionTier
from models.schemas import ExtractionResult
from services import tier0_regex, tier1_text, tier2_vision
from db import kuzu_db

logger = logging.getLogger(__name__)

def dispatch(file_id: str, file_path: str, mime_type: str, window_size: int = 400) -> ExtractionResult:
    start = time.monotonic()
    error = None
    entities = []
    neighborhoods = []
    emails = []
    extractor = "unknown"


    tier = decide_routing(file_path, mime_type)
    logger.info("Dispatching file %s with tier %s", file_id, tier)

    # Parse structured email content
    try:
        path = Path(file_path)
        suffix = path.suffix.lower()
        from services.email_parser import parse_eml_file, parse_pst_emails

        if mime_type in {"message/rfc822", "application/mime"} or suffix == ".eml":
            logger.info("Parsing structured EML headers/body for %s", file_id)
            parsed_list = parse_eml_file(path)
            if parsed_list:
                emails.extend(parsed_list)
        elif mime_type in {"application/vnd.ms-outlook-pst", "application/x-outlook-pst", "application/vnd.ms-outlook"} or suffix == ".pst":
            logger.info("Parsing structured PST archives for %s", file_id)
            parsed_list = parse_pst_emails(path)
            if parsed_list:
                emails.extend(parsed_list)
    except Exception as exc:
        logger.error("Structured email parsing failed for file %s: %s", file_id, exc)

    try:
        if tier == ExtractionTier.TIER0_STRUCTURED:
            result = tier0_regex.extract(file_path, mime_type, window_size)
            entities     = result.get("entities_structured", [])
            neighborhoods = result.get("neighborhoods", [])
            extractor    = result["extractor_used"]
            error        = result.get("error")
        
        elif tier == ExtractionTier.TIER1_DOCUMENT:
            result = tier1_text.extract(file_path, mime_type, window_size)
            entities     = result.get("entities_structured", [])
            neighborhoods = result.get("neighborhoods", [])
            extractor    = result["extractor_used"]
            error        = result.get("error")

        elif tier == ExtractionTier.TIER2_OCR:
            text = tier2_vision.extract(file_path, mime_type)
            path = Path(file_path)
            result = tier0_regex.analyze_text(text, path.name, path.suffix.lower(), window_size)
            
            entities     = result.get("entities_structured", [])
            neighborhoods = result.get("neighborhoods", [])
            extractor    = "tier2_ocr"
            error        = result.get("error")
        
        else:
            raise ValueError(f"Unknown tier: {tier}")

    except Exception as exc:
        logger.error("Dispatch failed for file %s: %s", file_id, exc, exc_info=True)
        entities     = []
        neighborhoods = []
        extractor    = "failed"
        error        = str(exc)

    elapsed_ms = int((time.monotonic() - start) * 1000)
    logger.info(
        "Dispatch complete | file=%s tier=%s entities=%d neighborhoods=%d emails=%d time=%dms",
        file_id, tier, len(entities), len(neighborhoods), len(emails), elapsed_ms
    )

    extraction_result = ExtractionResult(
        file_id=file_id,
        entities=entities,
        neighborhoods=neighborhoods,
        emails=emails,
        processing_time_ms=elapsed_ms,
        extractor_used=extractor,
        error=error,
    )

    if not error and entities:
        write_to_kuzu(extraction_result, file_id)

    return extraction_result


def _entity_id(canonical: str, entity_type: str) -> str:
    """
    Generate a stable UUID for an entity from its canonical form + type.
    Using UUID5 (SHA-1 namespace hash) guarantees the same ID across runs,
    which lets us upsert without first querying for existing rows.
    """
    return str(uuid.uuid5(uuid.NAMESPACE_DNS, f"{entity_type}:{canonical}"))


def write_to_kuzu(result: ExtractionResult, file_id: str) -> None:
    """
    Persist extraction results to KuzuDB.
    Called after every successful extraction so the graph DB stays in sync.
    """
    try:
        # Ensure a FileRef node exists for this file
        kuzu_db.upsert_file_ref(file_id)

        # Build a local canonical→id map so neighbourhood upserts can resolve IDs
        entity_id_map: dict[tuple[str, str], str] = {}
        seen_entities = set()

        for entity in result.entities:
            canonical = entity.canonical[:500]
            eid = _entity_id(canonical, entity.type)
            entity_id_map[(canonical, entity.type)] = eid

            if eid not in seen_entities:
                kuzu_db.upsert_entity(
                    entity_id=eid,
                    canonical=canonical,
                    display_name=entity.display_name[:500],
                    entity_type=entity.type,
                    metadata=json.dumps(entity.metadata or {}),
                )
                seen_entities.add(eid)

            kuzu_db.upsert_occurrence(
                entity_id=eid,
                file_id=file_id,
                count=entity.count,
                excerpts_json=json.dumps([e for e in entity.excerpts] if entity.excerpts else []),
            )

        for nb in result.neighborhoods:
            src_canonical = nb.source_canonical[:500]
            tgt_canonical = nb.target_canonical[:500]
            src_id = entity_id_map.get((src_canonical, nb.source_type))
            tgt_id = entity_id_map.get((tgt_canonical, nb.target_type))

            if not src_id or not tgt_id or src_id == tgt_id:
                continue

            # Canonicalize edge direction so a→b and b→a share the same row
            if src_id > tgt_id:
                src_id, tgt_id = tgt_id, src_id

            kuzu_db.upsert_co_occurrence(
                source_id=src_id,
                target_id=tgt_id,
                weight=nb.weight,
                distance=nb.distance,
                snippet=nb.snippet,
                source_offset=nb.source_offset,
                target_offset=nb.target_offset,
                file_id=file_id,
            )

        logger.info(
            "KuzuDB write complete | file=%s entities=%d neighborhoods=%d",
            file_id, len(result.entities), len(result.neighborhoods),
        )
    except Exception as exc:
        logger.error("KuzuDB write failed for file %s: %s", file_id, exc, exc_info=True)
