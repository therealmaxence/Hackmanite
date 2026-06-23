"""OCR Service — Tesseract wrapper. Converts images (PIL or base64) to text."""
import base64
import io
import logging
import os
import shutil
import sys
from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)

# Auto-detect Tesseract installation path
paths = (
    [r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"]
    if sys.platform == "win32"
    else ["/usr/bin/tesseract", "/usr/local/bin/tesseract", "/opt/homebrew/bin/tesseract", "/usr/sbin/tesseract"]
)
tcmd = next((p for p in paths if os.path.exists(p)), shutil.which("tesseract"))
tesseract_found = bool(tcmd)

if tcmd:
    pytesseract.pytesseract.tesseract_cmd = tcmd
else:
    logger.warning(
        "Tesseract OCR not found. OCR extraction on images will be disabled.\n"
        "To enable OCR, please install Tesseract on your system:\n"
        "  Mac:     brew install tesseract\n"
        "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
        "  Linux:   sudo apt install tesseract-ocr"
    )

DEFAULT_OCR_LANG = "fra+eng+rus"

def image_to_text(image_data: str | bytes | Image.Image, lang: str = DEFAULT_OCR_LANG) -> str:
    """Extract text from an image using Tesseract."""
    if not tesseract_found:
        logger.error("OCR requested but Tesseract is not installed on this system.")
        return ""
    try:
        if isinstance(image_data, Image.Image):
            img = image_data
        else:
            if isinstance(image_data, str):
                image_data = base64.b64decode(image_data)
            with io.BytesIO(image_data) as buf:
                img = Image.open(buf)
                img.load()
        img = img.convert("L").point(lambda x: 0 if x < 140 else 255, "1")
        text = pytesseract.image_to_string(img, lang=lang)
        logger.info("OCR extracted %d characters", len(text))
        return text.strip()
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return ""