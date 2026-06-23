import logging
from pathlib import Path
from services.file_to_text import prepare_input

logger = logging.getLogger(__name__)

def extract(file_path: str, mime_type: str, window_size: int = 400) -> dict:
    from services.tier0_regex import analyze_text
    prep = prepare_input(file_path, mime_type)
    text = "" if prep["type"] in ("image", "images") else prep["text"][:10_000_000]
    p = Path(file_path)
    if not p.suffix:
        logger.warning(f"No file extension found for {file_path}; defaulting to .txt")
    res = analyze_text(text, p.name, p.suffix.lower(), window_size)
    res["extractor_used"] = "tier1_document"
    return res