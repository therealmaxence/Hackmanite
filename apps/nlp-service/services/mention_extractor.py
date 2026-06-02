from __future__ import annotations

import structlog
import threading


from models.schemas import EntityType
from services.entity_normalizer import canonicalize
from services.person_regex import _extract_persons
from services.regex_patterns import ENTITY_REGEX_PATTERNS

try:
    import spacy
except Exception:
    spacy = None

logger = structlog.get_logger()

_SPACY_CANDIDATES: dict[str, list[str]] = {
    "en": ["en_core_web_lg"],
    "fr": ["fr_core_news_lg"],
    "ru": ["ru_core_news_lg"],
}

_spacy_lock = threading.Lock()
SPACY_MODELS: dict[str, any] = {}

def get_spacy_model(lang: str) -> any:
    global SPACY_MODELS
    if spacy is None:
        return None
    if lang in SPACY_MODELS:
        return SPACY_MODELS[lang]
    
    if lang in _SPACY_CANDIDATES:
        with _spacy_lock:
            if lang in SPACY_MODELS:
                return SPACY_MODELS[lang]
            for candidate in _SPACY_CANDIDATES[lang]:
                try:
                    logger.info("loading_spacy_model", lang=lang, model=candidate)
                    nlp = spacy.load(candidate)
                    SPACY_MODELS[lang] = nlp
                    logger.info("spacy_model_loaded", lang=lang, model=candidate)
                    return nlp
                except Exception as e:
                    logger.error("failed_to_load_spacy_model", lang=lang, model=candidate, error=str(e))
    return None


def _extract_mentions(text: str) -> list[dict]:
    mentions: list[dict] = []
    seen: set[tuple[str, int, int, EntityType]] = set()

    def add_mention(display_name: str, entity_type: EntityType, start: int, end: int) -> None:
        canonical = canonicalize(display_name, entity_type)
        if not canonical:
            return
        key = (canonical, start, end, entity_type)
        if key in seen:
            return
        seen.add(key)
        mentions.append({
            "canonical": canonical,
            "display_name": display_name,
            "type": entity_type,
            "start": start,
            "end": end,
        })

    try:
        from langdetect import detect_langs
        langs = detect_langs(text[:3000])
        if langs:
            best_lang = langs[0]
            if best_lang.prob >= 0.8:
                lang = best_lang.lang
                model = get_spacy_model(lang)
                if model is not None:
                    doc = model(text[:1_000_000])
                    for ent in doc.ents:
                        logger.info("spacy_entity_detected", lang=lang, prob=best_lang.prob,
                                    text=ent.text, label=ent.label_, start=ent.start_char, end=ent.end_char)
                        if ent.label_ == "PERSON":
                            add_mention(ent.text, EntityType.PERSON, ent.start_char, ent.end_char)
                        elif ent.label_ == "ORG":
                            add_mention(ent.text, EntityType.ORGANIZATION, ent.start_char, ent.end_char)
                        elif ent.label_ in {"GPE", "LOC"}:
                            add_mention(ent.text, EntityType.LOCATION, ent.start_char, ent.end_char)
                        elif ent.label_ in {"DATE", "TIME"}:
                            add_mention(ent.text, EntityType.DATE, ent.start_char, ent.end_char)
                        elif ent.label_ in {"EMAIL", "EMAIL_ADDRESS"}:
                            add_mention(ent.text, EntityType.EMAIL, ent.start_char, ent.end_char)
                        elif ent.label_ in {"URL", "WEB_ADDRESS"}:
                            add_mention(ent.text, EntityType.URL, ent.start_char, ent.end_char)
                else:
                    logger.info("spacy_lang_unsupported", lang=lang, prob=best_lang.prob, fallback="regex")
            else:
                logger.info("spacy_lang_low_confidence", lang=best_lang.lang, prob=best_lang.prob, fallback="regex")
    except ImportError:
        logger.warning("langdetect_not_installed", fallback="regex")
    except Exception as e:
        logger.warning("langdetect_failed", error=str(e), fallback="regex")

    for entity_type, pattern in ENTITY_REGEX_PATTERNS:
        for match in pattern.finditer(text):
            value = match.group(1) if match.lastindex else match.group(0)
            add_mention(value, entity_type, match.start(), match.end())

    if not any(m["type"] == EntityType.PERSON for m in mentions):
        for value in _extract_persons(text):
            add_mention(value["text"], EntityType.PERSON, int(value["start"]), int(value["end"]))

    return mentions
