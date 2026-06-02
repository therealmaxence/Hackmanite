"""
Tier 1 document preprocessing.
Used for semi-structured documents.
"""

import logging
from pathlib import Path

from services.file_to_text import prepare_input

logger = logging.getLogger(__name__)

MAX_TEXT_CHARS: int = 10_000_000


def extract(file_path: str, mime_type: str, window_size: int = 400) -> dict:
    """
    Preprocess document content, then run deterministic tier 0 analysis.
    """
    from services.tier0_regex import analyze_text

    prepared = prepare_input(file_path, mime_type)

    input_type = prepared["type"]

    if input_type in ("image", "images"):
        logger.warning(
            "Tier1 received %s input for %s; returning empty document result",
            input_type,
            file_path,
        )
        text = ""
    else:
        text = prepared["text"][:MAX_TEXT_CHARS]

    path = Path(file_path)
    filename = path.name
    ext = path.suffix.lower()

    if not path.suffix:
        logger.warning("No file extension found for %s; defaulting to .txt", file_path)

    result = analyze_text(text, filename, ext, window_size)
    result["extractor_used"] = "tier1_document"
    return result