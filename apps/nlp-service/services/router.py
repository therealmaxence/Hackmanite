"""
Adaptive extraction router.
Decides which tier (0/1/2) handles a given file, based on MIME type,
extension, and content inspection for PDFs and emails.
"""

import logging
from enum import Enum
from pathlib import Path

from pdfminer.high_level import extract_text as pdf_extract_text

logger = logging.getLogger(__name__)


class ExtractionTier(str, Enum):
    TIER0_STRUCTURED = "tier0_structured"
    TIER1_DOCUMENT = "tier1_document"
    TIER2_OCR = "tier2_ocr"


# Tier 0: structured documents

REGEX_ONLY_MIMES = {
    "text/csv",
    "text/tab-separated-values",
    "text/html",
    "application/json",
    "application/x-ndjson",
    "application/xml",
    "text/xml",
    "text/x-log",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-excel",
}

REGEX_ONLY_EXTENSIONS = {
    ".csv", ".tsv", ".json", ".jsonl", ".ndjson",
    ".xml", ".html", ".htm", ".log", ".access", ".err",
    ".xlsx", ".xls", ".xlsm",
    ".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs",
    ".c", ".cc", ".cpp", ".h", ".hpp", ".cs", ".php", ".rb",
    ".sql", ".yml", ".yaml", ".toml", ".ini", ".cfg", ".conf",
}

# Tier 1: semi-structured documents

DOCUMENT_MIMES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/rtf",
    "text/plain",
    "text/markdown",
    "message/rfc822",
    "application/vnd.ms-outlook",
    "application/vnd.ms-outlook-pst",
    "application/x-outlook-pst",
}

DOCUMENT_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".rtf", ".txt", ".md", ".markdown",
    ".eml", ".pst",
}

# Tier 2: OCR only

IMAGE_MIMES = {
    "image/jpeg", "image/png", "image/gif",
    "image/webp", "image/tiff", "image/bmp",
}

PDF_MIME = "application/pdf"


def decide_routing(file_path: str, mime_type: str) -> ExtractionTier:
    """
    Returns the appropriate ExtractionTier for the given file.
    """
    path = Path(file_path)
    ext = path.suffix.lower()


    if mime_type in REGEX_ONLY_MIMES or ext in REGEX_ONLY_EXTENSIONS:
        logger.info("Router → TIER0_STRUCTURED [%s] (structured)", path.name)
        return ExtractionTier.TIER0_STRUCTURED

    if mime_type == PDF_MIME:
        try:
            text = pdf_extract_text(file_path, page_numbers=[0])
            if len(text.strip()) > 0:
                logger.info("Router → TIER1_DOCUMENT [%s] (text pdf)", path.name)
                return ExtractionTier.TIER1_DOCUMENT
            logger.info("Router → TIER2_OCR [%s] (scanned pdf)", path.name)
            return ExtractionTier.TIER2_OCR
        except Exception as exc:
            logger.warning("Router PDF check failed for %s: %s. Defaulting to OCR.", path.name, exc)
            return ExtractionTier.TIER2_OCR

    if mime_type in DOCUMENT_MIMES or ext in DOCUMENT_EXTENSIONS:
        logger.info("Router → TIER1_DOCUMENT [%s] (semi-structured)", path.name)
        return ExtractionTier.TIER1_DOCUMENT
    
            
    if mime_type in IMAGE_MIMES:
        logger.info("Router → TIER2_OCR [%s] (image)", path.name)
        return ExtractionTier.TIER2_OCR


    logger.info("Router → TIER0_STRUCTURED [%s] (default)", path.name)
    return ExtractionTier.TIER0_STRUCTURED
