import logging
from enum import Enum
from pathlib import Path
from pypdf import PdfReader

logger = logging.getLogger(__name__)

class ExtractionTier(str, Enum):
    TIER0_STRUCTURED = "tier0_structured"
    TIER1_DOCUMENT   = "tier1_document"
    TIER2_OCR        = "tier2_ocr"

TIER0_MIMES = {
    "text/csv", "text/tab-separated-values", "text/html", "application/json", "application/x-ndjson",
    "application/xml", "text/xml", "text/x-log",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/vnd.ms-excel",
}
TIER0_EXTENSIONS = {
    ".csv", ".tsv", ".json", ".jsonl", ".ndjson", ".xml", ".html", ".htm", ".log", ".access", ".err",
    ".xlsx", ".xls", ".xlsm", ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".c", ".cc",
    ".cpp", ".h", ".hpp", ".cs", ".php", ".rb", ".sql", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
}
DOCUMENT_MIMES = {
    "application/pdf", "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf", "text/plain", "text/markdown", "message/rfc822",
    "application/vnd.ms-outlook", "application/vnd.ms-outlook-pst", "application/x-outlook-pst",
}
DOCUMENT_EXTENSIONS = {".pdf", ".doc", ".docx", ".rtf", ".txt", ".md", ".markdown", ".eml", ".pst"}
IMAGE_MIMES = {"image/jpeg", "image/png", "image/gif", "image/webp", "image/tiff", "image/bmp"}


def decide_routing(file_path: str, mime_type: str) -> ExtractionTier:
    path = Path(file_path)
    ext = path.suffix.lower()

    if mime_type in TIER0_MIMES or ext in TIER0_EXTENSIONS:
        logger.info("Router → TIER0_STRUCTURED [%s] (structured)", path.name)
        return ExtractionTier.TIER0_STRUCTURED

    if mime_type == "application/pdf":
        try:
            reader = PdfReader(file_path)
            if reader.pages and (reader.pages[0].extract_text() or "").strip():
                logger.info("Router → TIER1_DOCUMENT [%s] (text pdf)", path.name)
                return ExtractionTier.TIER1_DOCUMENT
        except Exception as exc:
            logger.warning("Router PDF check failed for %s: %s. Defaulting to OCR.", path.name, exc)
        logger.info("Router → TIER2_OCR [%s] (scanned pdf)", path.name)
        return ExtractionTier.TIER2_OCR

    if mime_type in DOCUMENT_MIMES or ext in DOCUMENT_EXTENSIONS:
        logger.info("Router → TIER1_DOCUMENT [%s] (semi-structured)", path.name)
        return ExtractionTier.TIER1_DOCUMENT

    if mime_type in IMAGE_MIMES:
        logger.info("Router → TIER2_OCR [%s] (image)", path.name)
        return ExtractionTier.TIER2_OCR

    logger.info("Router → TIER0_STRUCTURED [%s] (default)", path.name)
    return ExtractionTier.TIER0_STRUCTURED
