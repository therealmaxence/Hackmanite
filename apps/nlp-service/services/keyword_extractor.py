import re
from collections import Counter, defaultdict
from services.text_words import STOPWORDS

_TOKEN_RE = re.compile(r"\b[a-zA-ZÀ-ÿ][a-zA-ZÀ-ÿ\-]{2,}\b|[А-ЯЁа-яё][А-ЯЁа-яё\-]{2,}")

def extract_keywords(text: str, top_n: int = 100000) -> list[dict]:
    if not text or not text.strip():
        return []
    limit = min(min(500, max(50, len(text) // 300)), top_n)
    counts = Counter()
    spans = defaultdict(list)
    for m in _TOKEN_RE.finditer(text):
        tok = m.group(0).lower()
        if tok not in STOPWORDS and len(tok) > 2:
            counts[tok] += 1
            spans[tok].append({"text": m.group(0), "offset": m.start(), "end": m.end()})
    return [
        {"canonical": w, "display_name": w, "count": f, "excerpts": spans[w]}
        for w, f in counts.most_common(limit) if f >= 2
    ]