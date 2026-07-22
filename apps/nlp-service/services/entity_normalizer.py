import re
import unicodedata
from models.schemas import EntityType

_ADDRESS_ABBREVIATIONS = {
    r"\brte\b": "route",   r"\bave\b": "avenue",  r"\brd\b": "road",
    r"\bblvd\b": "boulevard", r"\bdr\b": "drive", r"\bln\b": "lane",
    r"\bct\b": "court",   r"\bpl\b": "place",     r"\brf\b": "route forestière",
    r"\bst\b": "street",
}

_CAMEL_EXCEPTIONS = re.compile(r"^(mc|mac|de|di|le|la|von|van|der|al|el|o')[A-Z]", re.IGNORECASE)
_INVALID_CHARS = set('=+(){}[]/\\;<>*!|%?^$@#"')
_PROG_KEYWORDS = frozenset({
    "let", "const", "var", "function", "import", "class", "return", "null", "undefined",
    "true", "false", "content", "value", "object", "array", "string", "number", "boolean",
    "if", "else", "while", "switch", "case", "continue", "default", "try", "catch", "throw",
    "this", "super", "extends", "implements", "interface", "package", "static", "yield",
    "async", "await",
})
_HAS_EXT            = re.compile(r"\.[a-zA-Z]{2,}")
_STARTS_ENDS_DIGIT  = re.compile(r"^\d|\d$")
_CAMEL_CASE         = re.compile(r"[a-z]+[A-Z]")
_NORMALIZE_WS       = re.compile(r"\s+")
_STRIP_NON_WORD     = re.compile(r"^[\s\W]+|[\s\W]+$")


def is_valid_entity(text: str, entity_type: EntityType) -> bool:
    if entity_type in (EntityType.PERSON, EntityType.ORGANIZATION):
        if not (2 <= len(text) <= 100) or _INVALID_CHARS.intersection(text):
            return False
        if _HAS_EXT.search(text) or _STARTS_ENDS_DIGIT.search(text):
            return False
        if _CAMEL_CASE.search(text) and not _CAMEL_EXCEPTIONS.match(text):
            return False
        if " " not in text and text.lower() in _PROG_KEYWORDS:
            return False
    return True


def canonicalize(text: str, entity_type: EntityType) -> str:
    if not is_valid_entity(text, entity_type):
        return ""
    text = _NORMALIZE_WS.sub(" ", _STRIP_NON_WORD.sub("", unicodedata.normalize("NFC", text).lower())).strip()
    if not text:
        return ""
    if entity_type == EntityType.ADDRESS:
        for abbr, full in _ADDRESS_ABBREVIATIONS.items():
            text = re.sub(abbr, full, text)
    return text[:500]