"""
Tier 0 structured documents.
"""

from __future__ import annotations

import logging
from pathlib import Path

from services.file_to_text import prepare_input
from services.keyword_extractor import extract_keywords
from services.entity_extraction import extract_entities_and_neighborhoods

logger = logging.getLogger(__name__)


def extract(file_path: str, mime_type: str, window_size: int = 400) -> dict:
    """
    Run text extraction + structural mention detection.
    Returns a dict compatible with the rest of the pipeline.
    """
    path = Path(file_path)
    ext = path.suffix.lower()

    try:
        prepared = prepare_input(file_path, mime_type)
        if prepared["type"] == "image":
            logger.warning("Tier0 cannot process image data without OCR: %s", path.name)
            return _empty(str(path.name))

        text = prepared["text"]
    except Exception as exc:
        logger.error("Tier0 file conversion failed: %s", exc)
        return _empty(str(path.name))

    return analyze_text(text, path.name, ext, window_size)


def analyze_text(text: str, filename: str, ext: str = ".txt", window_size: int = 400) -> dict:
    """
    Core analysis logic
    """
    keywords = extract_keywords(text, top_n=1000000)
    entities, neighborhoods = extract_entities_and_neighborhoods(text, keywords, window_size)

    return {
        "filename": filename,
        "file_extension": ext,
        "entities_structured": entities,
        "neighborhoods": neighborhoods,
        "extractor_used": "tier0_structured",
        "error": None
    }

def _empty(filename: str) -> dict:
    return {
        "filename": filename,
        "file_extension": "unknown",
        "entities_structured": [],
        "neighborhoods": [],
        "extractor_used": "tier0_structured:failed",
        "error": "file_read_error"
    }