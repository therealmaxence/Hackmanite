import logging
logger = logging.getLogger(__name__)
STOPWORDS: set[str] = set()
try:
    import spacy
    for lang in ("en", "fr", "ru"):
        try:
            STOPWORDS.update(spacy.blank(lang).Defaults.stop_words)
        except Exception as e:
            logger.error(f"Failed to load spaCy stop words for language '{lang}': {e}")
except ImportError:
    logger.warning("spaCy is not installed. STOPWORDS set will be empty.")