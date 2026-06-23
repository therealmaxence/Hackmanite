"""
Specialized file for person regex.
"""

import re


# ── Latin script (English / French) ───────────────────────────────────────────

_CAP_TOKEN_RE = re.compile(r"\b([A-Z][a-z]{2,})\b")

_TRIGGER_RE = re.compile(
    r"\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Mister|Miss|Sir|Lord|Lady"
    r"|called|named|by|from|Monsieur|Madame|Mademoiselle)\s+",
    re.IGNORECASE,
)

# ── Cyrillic script (Russian) ──────────────────────────────────────────────────

_RU_CAP_TOKEN_RE = re.compile(
    r"(?<![А-ЯЁа-яё])([А-ЯЁ][а-яё]{2,})(?![А-ЯЁа-яё])"
)

# Honorifics and relational triggers that precede Russian person names.
# Господин / Госпожа = Mr / Ms (formal)
# Товарищ = Comrade (Soviet/military)
# Гражданин / Гражданка = Citizen (official/legal)
# доктор / профессор / академик = academic titles
# генерал / полковник / майор / капитан / лейтенант = military ranks
# называемый / именуемый / известный как = "known as / called"

_RU_TRIGGER_RE = re.compile(
    r"(?:"
    r"Господин|Госпожа|Товарищ|Гражданин|Гражданка"
    r"|[Дд]октор|[Пп]рофессор|[Аа]кадемик"
    r"|[Гг]енерал|[Пп]олковник|[Мм]айор|[Кк]апитан|[Лл]ейтенант|[Сс]ержант"
    r"|[Пп]резидент|[Мм]инистр|[Дд]иректор|[Рр]уководитель"
    r"|называемый|именуемый|известный\s+как|по\s+имени"
    r")\s+",
    re.UNICODE,
)

# ── Shared config ──────────────────────────────────────────────────────────────

_SENT_END_RE = re.compile(r"[.!?\n]\s*$")
_VALID_GAP_RE = re.compile(r"^[\s\-]+$")

# ── Denylists ─────────────────────────────────────────────────────────────────

# Latin denylist — stored lowercase
_DENYLIST: frozenset[str] = frozenset({
    # English conjunctions / determiners
    "the", "this", "that", "these", "those",
    "and", "but", "or", "nor", "yet", "so",
    "when", "where", "what", "how", "why", "which", "who",
    "if", "then", "because", "although", "however", "therefore",
    "furthermore", "moreover", "nevertheless", "meanwhile",
    "also", "thus", "hence",
    # French conjunctions / determiners
    "par", "aussi", "mais", "car", "donc", "ni",
    "le", "la", "les", "un", "une", "des", "du", "de", "en", "aux", "au",
    "et", "pour", "dans", "sur", "avec", "sans", "sous", "devant", "derrière",
    # Days and months
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    # Countries / continents
    "france", "germany", "spain", "italy", "england", "america",
    "europe", "africa", "asia", "australia",
    # Roles / institutions
    "president", "minister", "director", "manager", "chief",
    "chairman", "secretary", "commissioner", "officer",
    "internet", "university", "institute", "department", "centre", "center",
    "company", "corporation", "association", "foundation", "organization",
    # Document structure
    "report", "chapter", "section", "table", "figure", "appendix",
    "introduction", "conclusion", "abstract", "summary", "overview",
})

# Cyrillic denylist — stored lowercase (Cyrillic lowercase)
_RU_DENYLIST: frozenset[str] = frozenset({
    # Conjunctions
    "и", "или", "но", "да", "либо", "однако", "зато", "хотя", "если",
    "когда", "пока", "после", "до", "как", "что", "чтобы", "потому",
    "поэтому", "так", "также", "тоже", "ни",
    # Prepositions
    "в", "на", "с", "по", "за", "из", "от", "до", "без", "при",
    "под", "над", "между", "через", "для", "у", "об", "про", "ко", "во",
    # Pronouns
    "он", "она", "они", "мы", "вы", "я", "это", "тот", "та", "те",
    "его", "её", "их", "наш", "ваш", "свой",
    # Common adverbs / particles
    "не", "ни", "уже", "ещё", "всё", "очень", "там", "тут", "здесь",
    "тогда", "теперь", "сейчас", "всегда", "никогда", "только", "даже",
    # Days of the week
    "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье",
    # Months
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
    # Countries / major cities (capitalised in text but not names)
    "россия", "франция", "германия", "китай", "америка", "европа",
    "москва", "санкт", "петербург", "новосибирск",
    # Institutions / organisations
    "университет", "институт", "академия", "министерство",
    "правительство", "компания", "организация", "ассоциация", "федерация",
    # Document structure
    "введение", "заключение", "глава", "раздел", "таблица", "рисунок", "приложение",
    # Roles (when standalone, not as prefix)
    "президент", "министр", "директор", "руководитель", "председатель",
    "генерал", "полковник", "майор", "капитан", "сержант", "лейтенант",
})


# ── Extraction logic ───────────────────────────────────────────────────────────

def _extract_persons(text: str) -> list[dict[str, int | str]]:
    """
    Multi-rule person-name extractor for Latin and Cyrillic scripts.
    """
    if not text:
        return []

    results: list[dict[str, int | str]] = []
    seen: set[tuple[str, int, int]] = set()

    _run_extraction(
        text=text,
        token_re=_CAP_TOKEN_RE,
        trigger_re=_TRIGGER_RE,
        denylist=_DENYLIST,
        normalize=str.lower,
        results=results,
        seen=seen,
    )
    _run_extraction(
        text=text,
        token_re=_RU_CAP_TOKEN_RE,
        trigger_re=_RU_TRIGGER_RE,
        denylist=_RU_DENYLIST,
        normalize=str.lower,
        results=results,
        seen=seen,
    )

    return results


def _run_extraction(
    text: str,
    token_re: re.Pattern,
    trigger_re: re.Pattern,
    denylist: frozenset[str],
    normalize,
    results: list[dict[str, int | str]],
    seen: set[tuple[str, int, int]],
) -> None:
    """
    Shared extraction loop — works for any script given the right regexes and denylist.
    """
    trigger_ends = {m.end() + offset for m in trigger_re.finditer(text) for offset in range(3)}
    cap_tokens = list(token_re.finditer(text))

    i = 0
    while i < len(cap_tokens):
        m0 = cap_tokens[i]
        word = m0.group(1)

        if normalize(word) in denylist:
            i += 1
            continue

        span_tokens = [m0]
        j = i + 1
        while j < len(cap_tokens) and len(span_tokens) < 4:
            m_next = cap_tokens[j]
            if not _VALID_GAP_RE.match(text[span_tokens[-1].end():m_next.start()]) or normalize(m_next.group(1)) in denylist:
                break
            span_tokens.append(m_next)
            j += 1

        span_start = span_tokens[0].start()
        if span_start not in trigger_ends:
            prefix = text[:span_start].rstrip()
            if len(span_tokens) == 1 or not prefix or _SENT_END_RE.search(prefix):
                i += 1
                continue

        name = " ".join(t.group(1) for t in span_tokens)
        span_end = span_tokens[-1].end()
        if (name, span_start, span_end) not in seen:
            seen.add((name, span_start, span_end))
            results.append({"text": name, "start": span_start, "end": span_end})

        i = j if len(span_tokens) > 1 else i + 1