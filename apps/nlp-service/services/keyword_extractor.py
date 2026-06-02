"""
Keyword extraction using token frequency.
Used by the deterministic extraction tiers.
"""

import re
from collections import Counter
from collections import defaultdict

from services.text_words import STOPWORDS

MIN_KEYWORD_FREQ: int = 2
MAX_KEYWORDS: int = 100000

_TOKEN_RE = re.compile(
    r"\b[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\-]{2,}\b"
    r"|"
    r"[А-ЯЁа-яё][А-ЯЁа-яё\-]{2,}",
    re.UNICODE,
)


def extract_keywords(text: str, top_n: int = MAX_KEYWORDS) -> list[dict]:
    """
    Extract the most frequent meaningful tokens from text with their spans.
    """
    if not text or not text.strip():
        return []

    dynamic_limit = min(500, max(50, len(text) // 300))
    limit = min(dynamic_limit, top_n)

    counts: Counter[str] = Counter()
    spans: dict[str, list[dict[str, int | str]]] = defaultdict(list)

    for match in _TOKEN_RE.finditer(text):
        token = match.group(0).lower()
        if token in STOPWORDS or len(token) <= 2:
            continue

        counts[token] += 1
        spans[token].append({
            "text": match.group(0),
            "offset": match.start(),
            "end": match.end(),
        })

    if not counts:
        return []

    return [
        {
            "canonical": word,
            "display_name": word,
            "count": freq,
            "excerpts": spans[word],
        }
        for word, freq in counts.most_common(limit)
        if freq >= MIN_KEYWORD_FREQ
    ]