import re
import unicodedata
from models.schemas import EntityType

_ADDRESS_ABBREVIATIONS: dict[str, str] = {
    r"\brte\b": "route",
    r"\bave\b": "avenue",
    r"\brd\b": "road",
    r"\bblvd\b": "boulevard",
    r"\bdr\b": "drive",
    r"\bln\b": "lane",
    r"\bct\b": "court",
    r"\bpl\b": "place",
    r"\brf\b": "route forestière",
    r"\bst\b": "street",
}

def is_valid_entity(text: str, entity_type: EntityType) -> bool:
    if entity_type in (EntityType.PERSON, EntityType.ORGANIZATION):
        if len(text) < 2:
            return False
        if any(c in text for c in '=+(){}[]/\\;<>*!|%?^$@#"'):
            return False
        if "." in text and re.search(r"\.[a-zA-Z]", text):
            return False
        if re.search(r"^\d|\d$", text):
            return False
        if re.search(r"[a-z]+[A-Z]", text):
            if not re.match(r"^(mc|mac)[A-Z]", text, re.IGNORECASE):
                return False
        keywords = {"let", "const", "var", "function", "import", "class", "return", "null", "undefined", "true", "false"}
        words = set(text.lower().split())
        if words.intersection(keywords):
            return False
    return True

def canonicalize(text: str, entity_type: EntityType) -> str:
    if not is_valid_entity(text, entity_type):
        return ""
    text = text.lower()
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"^[\s\W]+|[\s\W]+$", "", text)
    text = re.sub(r"\s+", " ", text).strip()

    if not text:
        return ""

    if entity_type == EntityType.ADDRESS:
        for abbr, full in _ADDRESS_ABBREVIATIONS.items():
            text = re.sub(abbr, full, text)

    return text[:500]