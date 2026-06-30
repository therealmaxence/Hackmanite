from __future__ import annotations
import structlog
from models.schemas import EntityType
from services.entity_normalizer import canonicalize
from services.regex_patterns import ENTITY_REGEX_PATTERNS
from services.spacy_registry import get_configured_model, get_model_for_lang

logger = structlog.get_logger()

SPACY_LABEL_MAP = {
    "PERSON":        EntityType.PERSON,
    "ORG":           EntityType.ORGANIZATION,
    "GPE":           EntityType.LOCATION,
    "LOC":           EntityType.LOCATION,
    "DATE":          EntityType.DATE,
    "TIME":          EntityType.DATE,
    "EMAIL":         EntityType.EMAIL,
    "EMAIL_ADDRESS": EntityType.EMAIL,
    "URL":           EntityType.URL,
    "WEB_ADDRESS":   EntityType.URL,
}


def _run_spacy(model, text: str, **log_kw):
    for ent in model(text[:1_000_000]).ents:
        logger.info("spacy_entity_detected", **log_kw, text=ent.text, label=ent.label_, start=ent.start_char, end=ent.end_char)
        yield ent.label_, ent.text, ent.start_char, ent.end_char


def _extract_mentions(text: str) -> list[dict]:
    mentions: list[dict] = []
    seen: set = set()

    def add(display_name: str, etype: EntityType, start: int, end: int) -> None:
        canonical = canonicalize(display_name, etype)
        if canonical and (key := (canonical, start, end, etype)) not in seen:
            seen.add(key)
            mentions.append({"canonical": canonical, "display_name": display_name, "type": etype, "start": start, "end": end})

    if model := get_configured_model():
        try:
            for label, txt, s, e in _run_spacy(model, text, source="selected"):
                if etype := SPACY_LABEL_MAP.get(label):
                    add(txt, etype, s, e)
        except Exception as ex:
            logger.error("spacy_extraction_failed", error=str(ex))
    else:
        try:
            from langdetect import detect_langs
            if (langs := detect_langs(text[:3000])) and langs[0].prob >= 0.8:
                best = langs[0]
                if nlp := get_model_for_lang(best.lang):
                    for label, txt, s, e in _run_spacy(nlp, text, lang=best.lang, prob=best.prob):
                        if etype := SPACY_LABEL_MAP.get(label):
                            add(txt, etype, s, e)
                else:
                    logger.info("spacy_lang_unsupported", lang=best.lang, prob=best.prob)
            elif langs:
                logger.info("spacy_lang_low_confidence", lang=langs[0].lang, prob=langs[0].prob)
        except ImportError:
            logger.warning("langdetect_not_installed")
        except Exception as ex:
            logger.warning("langdetect_failed", error=str(ex))

    for etype, pattern in ENTITY_REGEX_PATTERNS:
        for m in pattern.finditer(text):
            add(m.group(1) if m.lastindex else m.group(0), etype, m.start(), m.end())

    return mentions
