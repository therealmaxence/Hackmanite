"""
Converts any supported file type into a processing-ready input dict.

Returns one of:
  { "type": "text",   "text": str }
  { "type": "image",  "data": str }
  { "type": "images", "data": list[str] }
"""

import base64
import io
import logging
from pathlib import Path
import email
from email import policy

from pdfminer.high_level import extract_text as pdf_extract_text
from pdf2image import convert_from_path

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

from services.office_extractor import _extract_docx, _extract_xlsx, _extract_pptx

logger = logging.getLogger(__name__)

MIN_PDF_TEXT_LENGTH: int = 100

IMAGE_MIMES = {
    "image/jpeg", "image/png", "image/gif",
    "image/webp", "image/tiff", "image/bmp",
}
PDF_MIMES = {"application/pdf"}
OFFICE_MIMES = {
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}
PRESENTATION_MIMES = {
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "application/vnd.ms-powerpoint",
}
HTML_MIMES = {"text/html", "application/xhtml+xml", "application/xml", "text/xml"}
SPREADSHEET_MIMES = {
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}
EML_MIMES = {"message/rfc822", "application/mime"}
PST_MIMES = {
    "application/vnd.ms-outlook-pst",
    "application/x-outlook-pst",
    "application/vnd.ms-outlook",
}


def prepare_input(file_path: str, mime_type: str) -> dict:
    path = Path(file_path)
    try:
        if mime_type in IMAGE_MIMES:
            return _load_image(path)
        if mime_type in PDF_MIMES:
            return _load_pdf(path)
        if mime_type in OFFICE_MIMES:
            return {"type": "text", "text": _extract_docx(str(path))}
        if mime_type in PRESENTATION_MIMES:
            return {"type": "text", "text": _extract_pptx(str(path))}
        if mime_type in HTML_MIMES or path.suffix.lower() in {".html", ".htm", ".xml", ".xhtml"}:
            return {"type": "text", "text": _extract_html_text(path)}
        if mime_type in SPREADSHEET_MIMES:
            return {"type": "text", "text": _extract_xlsx(str(path))}
        if mime_type in EML_MIMES or path.suffix.lower() == ".eml":
            return {"type": "text", "text": _extract_eml_text(path)}
        if mime_type in PST_MIMES or path.suffix.lower() == ".pst":
            return {"type": "text", "text": _extract_pst_text(path)}
        return {"type": "text", "text": path.read_text(encoding="utf-8", errors="replace")}
    except Exception as exc:
        logger.error("prepare_input failed for %s: %s", file_path, exc)
        return {"type": "text", "text": f"[File could not be read: {exc}]"}


def _load_image(path: Path) -> dict:
    with open(path, "rb") as f:
        data = base64.b64encode(f.read()).decode("utf-8")
    return {"type": "image", "data": data}


def _load_pdf(path: Path) -> dict:
    try:
        text = pdf_extract_text(str(path))
    except Exception:
        text = ""

    if text and len(text.strip()) >= MIN_PDF_TEXT_LENGTH:
        return {"type": "text", "text": text}

    logger.info("PDF %s appears scanned, converting pages to images", path.name)
    try:
        pages = convert_from_path(str(path), first_page=1, dpi=150)
        data_list = []
        for img in pages:
            with io.BytesIO() as buf:
                img.save(buf, format="PNG")
                data_list.append(base64.b64encode(buf.getvalue()).decode("utf-8"))
        return {"type": "images", "data": data_list}
    except Exception as exc:
        logger.error("PDF→image conversion failed for %s: %s", path.name, exc)
        return {"type": "text", "text": "[Scanned PDF — image conversion failed]"}


def _extract_html_text(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if BeautifulSoup is None:
        return raw
    soup = BeautifulSoup(raw, "html.parser")
    for node in soup(["script", "style", "noscript"]):
        node.decompose()
    return "\n".join(p.strip() for p in soup.stripped_strings if p.strip())


def _extract_eml_text(path: Path) -> str:
    from services.email_parser import parse_eml_file
    emails = parse_eml_file(path)
    if not emails:
        return ""
    separator = "\n\n" + "=" * 40 + "\n\n"
    parts = []
    for em in emails:
        header = "\n".join(filter(None, [
            f"From: {em.get('from_address', '')}",
            f"To: {em.get('to_address', '')}",
            f"Subject: {em.get('subject', '')}",
            f"Date: {em.get('date', '')}",
        ]))
        parts.append(f"{header}\n\n{em.get('body', '')}")
    return separator.join(parts)


def _extract_pst_text(path: Path) -> str:
    from services.email_parser import parse_pst_emails
    emails = parse_pst_emails(path)
    if not emails:
        return "[PST file contains no readable messages]"
    separator = "\n\n" + "=" * 40 + " NEXT EMAIL " + "=" * 40 + "\n\n"
    parts = []
    for em in emails:
        header = "\n".join(filter(None, [
            f"From: {em.get('from_address', '')}",
            f"To: {em.get('to_address', '')}",
            f"Subject: {em.get('subject', '')}",
            f"Date: {em.get('date', '')}",
        ]))
        parts.append(f"{header}\n\n{em.get('body', '')}")
    return separator.join(parts)