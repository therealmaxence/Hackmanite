"""
Shared stop words used by the NLP tiers. Loaded dynamically from spaCy.
"""

import logging

logger = logging.getLogger(__name__)

STOPWORDS: set[str] = set()

try:
    import spacy
    for lang in ["en", "fr", "ru"]:
        try:
            nlp = spacy.blank(lang)
            STOPWORDS.update(nlp.Defaults.stop_words)
        except Exception as e:
            logger.error("Failed to load spaCy stop words for language '%s': %s", lang, e)
except ImportError:
    logger.warning("spaCy is not installed. STOPWORDS set will be empty.")