import base64
import io
import logging
from pathlib import Path
from pypdf import PdfReader
from pdf2image import convert_from_path

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

from services.office_extractor import _extract_docx, _extract_xlsx, _extract_pptx

logger = logging.getLogger(__name__)

MIN_PDF_TEXT_LENGTH = 100
IMAGE_MIMES        = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/bmp"}
PDF_MIMES          = {"application/pdf"}
OFFICE_MIMES       = {"application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/msword"}
PRESENTATION_MIMES = {"application/vnd.openxmlformats-officedocument.presentationml.presentation", "application/vnd.ms-powerpoint"}
HTML_MIMES         = {"text/html", "application/xhtml+xml", "application/xml", "text/xml"}
SPREADSHEET_MIMES  = {"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel"}
EML_MIMES          = {"message/rfc822", "application/mime"}
PST_MIMES          = {"application/vnd.ms-outlook-pst", "application/x-outlook-pst", "application/vnd.ms-outlook"}
_HTML_EXTS         = {".html", ".htm", ".xml", ".xhtml"}
_EML_SEP           = "\n\n" + "=" * 40 + "\n\n"
_PST_SEP           = "\n\n" + "=" * 40 + " NEXT EMAIL " + "=" * 40 + "\n\n"


def prepare_input(file_path: str, mime_type: str) -> dict:
    path = Path(file_path)
    try:
        if mime_type in IMAGE_MIMES:
            return {"type": "image", "data": base64.b64encode(path.read_bytes()).decode()}
        if mime_type in PDF_MIMES:
            return _load_pdf(path)
        if mime_type in OFFICE_MIMES:
            return {"type": "text", "text": _extract_docx(str(path))}
        if mime_type in PRESENTATION_MIMES:
            return {"type": "text", "text": _extract_pptx(str(path))}
        if mime_type in HTML_MIMES or path.suffix.lower() in _HTML_EXTS:
            return {"type": "text", "text": _extract_html(path)}
        if mime_type in SPREADSHEET_MIMES:
            return {"type": "text", "text": _extract_xlsx(str(path))}
        if mime_type in EML_MIMES or path.suffix.lower() == ".eml":
            from services.email_parser import parse_eml_file
            return {"type": "text", "text": _fmt_emails(parse_eml_file(path), _EML_SEP, "")}
        if mime_type in PST_MIMES or path.suffix.lower() == ".pst":
            from services.email_parser import parse_pst_emails
            return {"type": "text", "text": _fmt_emails(parse_pst_emails(path), _PST_SEP, "[PST file contains no readable messages]")}
        return {"type": "text", "text": path.read_text(encoding="utf-8", errors="replace")}
    except Exception as exc:
        logger.error("prepare_input failed for %s: %s", file_path, exc)
        return {"type": "text", "text": f"[File could not be read: {exc}]"}


def _load_pdf(path: Path) -> dict:
    try:
        text = "\n".join(p.extract_text() or "" for p in PdfReader(path).pages)
        if len(text.strip()) >= MIN_PDF_TEXT_LENGTH:
            return {"type": "text", "text": text}
    except Exception:
        pass
    logger.info("PDF %s appears scanned, converting to images", path.name)
    try:
        pages = []
        for img in convert_from_path(str(path), first_page=1, dpi=150):
            with io.BytesIO() as buf:
                img.save(buf, format="PNG")
                pages.append(base64.b64encode(buf.getvalue()).decode())
        return {"type": "images", "data": pages}
    except Exception as exc:
        logger.error("PDF→image conversion failed for %s: %s", path.name, exc)
        return {"type": "text", "text": "[Scanned PDF — image conversion failed]"}


def _extract_html(path: Path) -> str:
    raw = path.read_text(encoding="utf-8", errors="replace")
    if not BeautifulSoup:
        return raw
    soup = BeautifulSoup(raw, "html.parser")
    for node in soup(["script", "style", "noscript"]):
        node.decompose()
    return "\n".join(p.strip() for p in soup.stripped_strings if p.strip())


def _fmt_emails(emails: list, sep: str, fallback: str) -> str:
    if not emails:
        return fallback
    return sep.join(
        f"From: {e.get('from_address', '')}\nTo: {e.get('to_address', '')}\nSubject: {e.get('subject', '')}\nDate: {e.get('date', '')}\n\n{e.get('body', '')}"
        for e in emails
    )