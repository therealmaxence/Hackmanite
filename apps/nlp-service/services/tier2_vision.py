"""
Tier 2 OCR extraction.
Used for images and scanned PDFs.
(Tesseract OCR)
"""
import logging
from pathlib import Path

from services.file_to_text import prepare_input
from services.ocr import image_to_text

logger = logging.getLogger(__name__)

def extract(file_path: str, mime_type: str) -> str:
    """Run OCR on an image or scanned PDF and return raw extracted text."""
    prepared = prepare_input(file_path, mime_type)
    input_type = prepared["type"]
    filename = Path(file_path).name

    if input_type == "text":
        logger.info("Tier2: %s is already text, skipping OCR", filename)
        return prepared["text"]

    if input_type == "image":
        logger.info("Tier2: running OCR on single image %s", filename)
        return image_to_text(prepared["data"])

    if input_type == "images":
        logger.info("Tier2: running OCR on %d pages for %s", len(prepared["data"]), filename)
        ocr_results = []
        for i, img_data in enumerate(prepared["data"], start=1):
            if page_text := image_to_text(img_data):
                ocr_results.append(page_text)
            else:
                logger.warning("Tier2: OCR returned empty result for page %d of %s", i, filename)

        if not ocr_results:
            logger.warning("Tier2: OCR produced no text for any page of %s", filename)

        return "\n\n".join(ocr_results)

    logger.error("Tier2: unexpected input type '%s' for %s", input_type, filename)
    return ""