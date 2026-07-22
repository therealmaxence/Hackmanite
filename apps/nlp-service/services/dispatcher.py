import logging
import time
from pathlib import Path
from services.router import decide_routing, ExtractionTier
from models.schemas import ExtractionResult
from services import tier0_regex, tier1_text, tier2_vision
from db import kuzu_db

logger = logging.getLogger(__name__)

def dispatch(file_id: str, file_path: str, mime_type: str, window_size: int = 400, persist: bool = True) -> ExtractionResult:
    start = time.monotonic()
    entities, neighborhoods, emails, extractor, error = [], [], [], "unknown", None
    tier = decide_routing(file_path, mime_type)
    logger.info(f"Dispatching file {file_id} with tier {tier}")
    path = Path(file_path)
    suffix = path.suffix.lower()

    try:
        from services.email_parser import parse_eml_file, parse_pst_emails
        if mime_type in ("message/rfc822", "application/mime") or suffix == ".eml":
            logger.info(f"Parsing structured EML headers/body for {file_id}")
            emails.extend(parse_eml_file(path) or [])
        elif mime_type in ("application/vnd.ms-outlook-pst", "application/x-outlook-pst", "application/vnd.ms-outlook") or suffix == ".pst":
            logger.info(f"Parsing structured PST archives for {file_id}")
            emails.extend(parse_pst_emails(path) or [])
    except Exception as exc:
        logger.error(f"Structured email parsing failed for file {file_id}: {exc}")

    try:
        if tier == ExtractionTier.TIER0_STRUCTURED:
            result = tier0_regex.extract(file_path, mime_type, window_size)
        elif tier == ExtractionTier.TIER1_DOCUMENT:
            result = tier1_text.extract(file_path, mime_type, window_size)
        elif tier == ExtractionTier.TIER2_OCR:
            text = tier2_vision.extract(file_path, mime_type)
            result = tier0_regex.analyze_text(text, path.name, suffix, window_size)
            result["extractor_used"] = "tier2_ocr"
        else:
            raise ValueError(f"Unknown tier: {tier}")
        entities, neighborhoods = result.get("entities_structured", []), result.get("neighborhoods", [])
        extractor, error = result["extractor_used"], result.get("error")
    except Exception as exc:
        logger.error(f"Dispatch failed for file {file_id}: {exc}", exc_info=True)
        extractor, error = "failed", str(exc)

    elapsed_ms = int((time.monotonic() - start) * 1000)
    logger.info(f"Dispatch complete | file={file_id} tier={tier} entities={len(entities)} neighborhoods={len(neighborhoods)} emails={len(emails)} time={elapsed_ms}ms")

    res = ExtractionResult(file_id=file_id, entities=entities, neighborhoods=neighborhoods, emails=emails, processing_time_ms=elapsed_ms, extractor_used=extractor, error=error)
    if persist and not error and entities:
        try:
            kuzu_db.save_extraction_results(file_id, res.entities, res.neighborhoods)
            logger.info(f"KuzuDB write complete | file={file_id} entities={len(res.entities)} neighborhoods={len(res.neighborhoods)}")
        except Exception as exc:
            logger.error(f"KuzuDB write failed for file {file_id}: {exc}", exc_info=True)
    return res
