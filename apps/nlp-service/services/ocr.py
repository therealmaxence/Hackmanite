"""
OCR Service — Tesseract wrapper.
Converts images (PIL or base64) to text.
"""

import base64
import io
import logging
from PIL import Image
import pytesseract
import os
import sys
import shutil

logger = logging.getLogger(__name__)

# Auto-detect Tesseract installation path
tesseract_found = False

if sys.platform == "win32":
    for p in [
        r"C:\Program Files\Tesseract-OCR\tesseract.exe",
        r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
    ]:
        if os.path.exists(p):
            pytesseract.pytesseract.tesseract_cmd = p
            tesseract_found = True
            break

if not tesseract_found:
    which = shutil.which("tesseract")
    if which:
        pytesseract.pytesseract.tesseract_cmd = which
        tesseract_found = True

if not tesseract_found:
    raise EnvironmentError(
        "Tesseract OCR not found.\n"
        "  Mac:     brew install tesseract\n"
        "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
        "  Linux:   sudo apt install tesseract-ocr"
    )


DEFAULT_OCR_LANG: str = "fra+eng+rus"

def image_to_text(image_data: str | bytes | Image.Image, lang: str = DEFAULT_OCR_LANG) -> str:
    """
    Extract text from an image using Tesseract.
    image_data can be a base64 string, raw bytes, or a PIL Image.
    """
    try:
        img = _to_pil(image_data)
        img = _preprocess(img)
        text = pytesseract.image_to_string(img, lang=lang)
        logger.info("OCR extracted %d characters", len(text))
        return text.strip()
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return ""

def _to_pil(image_data: str | bytes | Image.Image) -> Image.Image:
    if isinstance(image_data, Image.Image):
        return image_data
    if isinstance(image_data, str):
        image_data = base64.b64decode(image_data)
    with io.BytesIO(image_data) as buf:
        img = Image.open(buf)
        img.load()
    return img

def _preprocess(img: Image.Image) -> Image.Image:
    """Grayscale + binarize to improve Tesseract accuracy on scanned documents."""
    img = img.convert("L")
    img = img.point(lambda x: 0 if x < 140 else 255, "1")
    return img