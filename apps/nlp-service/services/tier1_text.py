import logging
from pathlib import Path
from services.file_to_text import prepare_input
from services.tier0_regex import analyze_text

logger = logging.getLogger(__name__)

def extract(file_path: str, mime_type: str, window_size: int = 400) -> dict:
    p = Path(file_path)
    prep = prepare_input(file_path, mime_type)
    text = "" if prep["type"] in ("image", "images") else prep["text"][:10_000_000]
    if not p.suffix:
        logger.warning("No file extension found for %s; defaulting to .txt", file_path)
    res = analyze_text(text, p.name, p.suffix.lower(), window_size)
    res["extractor_used"] = "tier1_document"
    return res