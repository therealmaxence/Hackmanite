import logging
from pathlib import Path
from services.file_to_text import prepare_input
from services.ocr import image_to_text

logger = logging.getLogger(__name__)

def extract(file_path: str, mime_type: str) -> str:
    prepared = prepare_input(file_path, mime_type)
    t, filename = prepared["type"], Path(file_path).name
    if t == "text":
        logger.info("Tier2: %s is already text, skipping OCR", filename)
        return prepared["text"]
    if t == "image":
        logger.info("Tier2: running OCR on single image %s", filename)
        return image_to_text(prepared["data"])
    if t == "images":
        pages = prepared["data"]
        logger.info("Tier2: running OCR on %d pages for %s", len(pages), filename)
        results = []
        for i, img in enumerate(pages, 1):
            text = image_to_text(img)
            if text:
                results.append(text)
            else:
                logger.warning("Tier2: OCR empty for page %d of %s", i, filename)
        if not results:
            logger.warning("Tier2: no OCR text produced for %s", filename)
        return "\n\n".join(results)
    logger.error("Tier2: unexpected input type '%s' for %s", t, filename)
    return ""