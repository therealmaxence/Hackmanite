import base64
import io
import logging
import os
import shutil
import sys
from PIL import Image
import pytesseract

logger = logging.getLogger(__name__)

_paths = (
    [r"C:\Program Files\Tesseract-OCR\tesseract.exe", r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe"]
    if sys.platform == "win32"
    else ["/usr/bin/tesseract", "/usr/local/bin/tesseract", "/opt/homebrew/bin/tesseract", "/usr/sbin/tesseract"]
)
_tcmd = next((p for p in _paths if os.path.exists(p)), shutil.which("tesseract"))
tesseract_found = bool(_tcmd)

if _tcmd:
    pytesseract.pytesseract.tesseract_cmd = _tcmd
else:
    logger.warning(
        "Tesseract not found. OCR disabled.\n"
        "  Mac: brew install tesseract\n"
        "  Windows: https://github.com/UB-Mannheim/tesseract/wiki\n"
        "  Linux: sudo apt install tesseract-ocr"
    )

def get_tesseract_info() -> tuple[bool, str | None]:
    global _tcmd, tesseract_found
    if not tesseract_found:
        cmd = next((p for p in _paths if os.path.exists(p)), shutil.which("tesseract"))
        if cmd:
            _tcmd = cmd
            tesseract_found = True
            pytesseract.pytesseract.tesseract_cmd = cmd
    return tesseract_found, _tcmd


DEFAULT_OCR_LANG = "fra+eng+rus"


def image_to_text(image_data: str | bytes | Image.Image, lang: str = DEFAULT_OCR_LANG) -> str:
    found, _ = get_tesseract_info()
    if not found:
        logger.error("OCR requested but Tesseract is not installed.")
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
        text = pytesseract.image_to_string(img.convert("L").point(lambda x: 0 if x < 140 else 255, "1"), lang=lang)
        logger.info("OCR extracted %d characters", len(text))
        return text.strip()
    except Exception as e:
        logger.error("OCR failed: %s", e)
        return ""