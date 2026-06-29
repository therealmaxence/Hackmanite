from __future__ import annotations
import structlog
import threading
import json
from pathlib import Path
from models.schemas import EntityType
from services.entity_normalizer import canonicalize
from services.person_regex import _extract_persons
from services.regex_patterns import ENTITY_REGEX_PATTERNS

try:
    import spacy
except Exception:
    spacy = None

logger = structlog.get_logger()

_SPACY_CANDIDATES = {
    "en": ["en_core_web_lg", "en_core_web_md", "en_core_web_sm"],
    "fr": ["fr_core_news_lg", "fr_core_news_md", "fr_core_news_sm"],
    "ru": ["ru_core_news_lg", "ru_core_news_md", "ru_core_news_sm"],
    "es": ["es_core_news_lg", "es_core_news_md", "es_core_news_sm"],
    "de": ["de_core_news_lg", "de_core_news_md", "de_core_news_sm"],
    "zh": ["zh_core_web_lg", "zh_core_web_md", "zh_core_web_sm"],
    "ja": ["ja_core_news_lg", "ja_core_news_md", "ja_core_news_sm"],
    "pt": ["pt_core_news_lg", "pt_core_news_md", "pt_core_news_sm"],
    "it": ["it_core_news_lg", "it_core_news_md", "it_core_news_sm"],
    "nl": ["nl_core_news_lg", "nl_core_news_md", "nl_core_news_sm"],
    "pl": ["pl_core_news_lg", "pl_core_news_md", "pl_core_news_sm"],
    "el": ["el_core_news_lg", "el_core_news_md", "el_core_news_sm"],
    "ro": ["ro_core_news_lg", "ro_core_news_md", "ro_core_news_sm"],
    "ca": ["ca_core_news_lg", "ca_core_news_md", "ca_core_news_sm"],
    "hr": ["hr_core_news_lg", "hr_core_news_md", "hr_core_news_sm"],
    "da": ["da_core_news_lg", "da_core_news_md", "da_core_news_sm"],
    "fi": ["fi_core_news_lg", "fi_core_news_md", "fi_core_news_sm"],
    "ko": ["ko_core_news_lg", "ko_core_news_md", "ko_core_news_sm"],
    "nb": ["nb_core_news_lg", "nb_core_news_md", "nb_core_news_sm"],
    "sv": ["sv_core_news_lg", "sv_core_news_md", "sv_core_news_sm"],
    "uk": ["uk_core_news_lg", "uk_core_news_md", "uk_core_news_sm"],
}

SPACY_LABEL_MAP = {
    "PERSON": EntityType.PERSON,
    "ORG": EntityType.ORGANIZATION,
    "GPE": EntityType.LOCATION,
    "LOC": EntityType.LOCATION,
    "DATE": EntityType.DATE,
    "TIME": EntityType.DATE,
    "EMAIL": EntityType.EMAIL,
    "EMAIL_ADDRESS": EntityType.EMAIL,
    "URL": EntityType.URL,
    "WEB_ADDRESS": EntityType.URL,
}

_spacy_lock = threading.Lock()
SPACY_MODELS = {}

MODELS_DIR = Path.home() / ".hackmanite" / "models"
SETTINGS_FILE = MODELS_DIR / "settings.json"

def get_selected_model() -> str:
    if SETTINGS_FILE.exists():
        try:
            with open(SETTINGS_FILE, "r") as f:
                return json.load(f).get("selected", "auto")
        except Exception:
            pass
    return "auto"

def _load_local_model(model_name: str) -> any:
    if MODELS_DIR.exists():
        for p in MODELS_DIR.glob(f"**/{model_name}*"):
            if (p / "config.cfg").exists():
                logger.info("loading_local_spacy_model", model=model_name, path=str(p))
                return spacy.load(p)
            for sub in p.glob("**/config.cfg"):
                logger.info("loading_local_spacy_model_nested", model=model_name, path=str(sub.parent))
                return spacy.load(sub.parent)
    return None

def get_configured_spacy_model() -> any:
    if spacy is None:
        return None
    selected = get_selected_model()
    if selected == "auto":
        return None
    if selected in SPACY_MODELS:
        return SPACY_MODELS[selected]
    with _spacy_lock:
        if selected not in SPACY_MODELS:
            try:
                local_model = _load_local_model(selected)
                if local_model:
                    SPACY_MODELS[selected] = local_model
                    logger.info("local_spacy_model_loaded", model=selected)
                    return local_model
                logger.info("loading_spacy_package", model=selected)
                SPACY_MODELS[selected] = spacy.load(selected)
                logger.info("spacy_package_loaded", model=selected)
            except Exception as e:
                logger.error("failed_to_load_spacy_model", model=selected, error=str(e))
    return SPACY_MODELS.get(selected)

def get_spacy_model(lang: str) -> any:
    if spacy is None or lang not in _SPACY_CANDIDATES:
        return None
    if lang not in SPACY_MODELS:
        with _spacy_lock:
            if lang not in SPACY_MODELS:
                for candidate in _SPACY_CANDIDATES[lang]:
                    try:
                        local_model = _load_local_model(candidate)
                        if local_model:
                            SPACY_MODELS[lang] = local_model
                            logger.info("local_spacy_model_loaded", lang=lang, model=candidate)
                            return local_model
                        logger.info("loading_spacy_package", lang=lang, model=candidate)
                        SPACY_MODELS[lang] = spacy.load(candidate)
                        logger.info("spacy_package_loaded", lang=lang, model=candidate)
                        break
                    except Exception as e:
                        logger.error("failed_to_load_spacy_model", lang=lang, model=candidate, error=str(e))
    return SPACY_MODELS.get(lang)

def _extract_mentions(text: str) -> list[dict]:
    mentions = []
    seen = set()

    def add_mention(display_name: str, entity_type: EntityType, start: int, end: int) -> None:
        canonical = canonicalize(display_name, entity_type)
        if not canonical:
            return
        key = (canonical, start, end, entity_type)
        if key not in seen:
            seen.add(key)
            mentions.append({"canonical": canonical, "display_name": display_name, "type": entity_type, "start": start, "end": end})

    model = get_configured_spacy_model()
    if model:
        try:
            for ent in model(text[:1_000_000]).ents:
                logger.info("spacy_entity_detected", model="selected", text=ent.text, label=ent.label_, start=ent.start_char, end=ent.end_char)
                if etype := SPACY_LABEL_MAP.get(ent.label_):
                    add_mention(ent.text, etype, ent.start_char, ent.end_char)
        except Exception as e:
            logger.error("spacy_extraction_failed", error=str(e))
    else:
        try:
            from langdetect import detect_langs
            if langs := detect_langs(text[:3000]):
                best_lang = langs[0]
                if best_lang.prob >= 0.8:
                    if model := get_spacy_model(best_lang.lang):
                        for ent in model(text[:1_000_000]).ents:
                            logger.info("spacy_entity_detected", lang=best_lang.lang, prob=best_lang.prob, text=ent.text, label=ent.label_, start=ent.start_char, end=ent.end_char)
                            if etype := SPACY_LABEL_MAP.get(ent.label_):
                                add_mention(ent.text, etype, ent.start_char, ent.end_char)
                    else:
                        logger.info("spacy_lang_unsupported", lang=best_lang.lang, prob=best_lang.prob, fallback="regex")
                else:
                    logger.info("spacy_lang_low_confidence", lang=best_lang.lang, prob=best_lang.prob, fallback="regex")
        except ImportError:
            logger.warning("langdetect_not_installed", fallback="regex")
        except Exception as e:
            logger.warning("langdetect_failed", error=str(e), fallback="regex")

    for entity_type, pattern in ENTITY_REGEX_PATTERNS:
        for match in pattern.finditer(text):
            add_mention(match.group(1) if match.lastindex else match.group(0), entity_type, match.start(), match.end())

    if not any(m["type"] == EntityType.PERSON for m in mentions):
        for val in _extract_persons(text):
            add_mention(val["text"], EntityType.PERSON, int(val["start"]), int(val["end"]))

    return mentions
