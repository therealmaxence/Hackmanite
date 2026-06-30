import re

_CAP_TOKEN_RE    = re.compile(r"\b([A-Z][a-z]{2,})\b")
_RU_CAP_TOKEN_RE = re.compile(r"(?<![А-ЯЁа-яё])([А-ЯЁ][а-яё]{2,})(?![А-ЯЁа-яё])")
_TRIGGER_RE      = re.compile(r"\b(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?|Prof\.?|Mister|Miss|Sir|Lord|Lady|called|named|by|from|Monsieur|Madame|Mademoiselle)\s+", re.IGNORECASE)
_RU_TRIGGER_RE   = re.compile(r"(?:Господин|Госпожа|Товарищ|Гражданин|Гражданка|[Дд]октор|[Пп]рофессор|[Аа]кадемик|[Гг]енерал|[Пп]олковник|[Мм]айор|[Кк]апитан|[Лл]ейтенант|[Сс]ержант|[Пп]резидент|[Мм]инистр|[Дд]иректор|[Рр]уководитель|называемый|именуемый|известный\s+как|по\s+имени)\s+", re.UNICODE)
_SENT_END_RE     = re.compile(r"[.!?\n]\s*$")
_VALID_GAP_RE    = re.compile(r"^[\s\-]+$")

_DENYLIST: frozenset[str] = frozenset({
    "the", "this", "that", "these", "those", "and", "but", "or", "nor", "yet", "so",
    "when", "where", "what", "how", "why", "which", "who", "if", "then", "because",
    "although", "however", "therefore", "furthermore", "moreover", "nevertheless",
    "meanwhile", "also", "thus", "hence",
    "par", "aussi", "mais", "car", "donc", "ni", "le", "la", "les", "un", "une",
    "des", "du", "de", "en", "aux", "au", "et", "pour", "dans", "sur", "avec",
    "sans", "sous", "devant", "derrière",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "france", "germany", "spain", "italy", "england", "america", "europe", "africa", "asia", "australia",
    "president", "minister", "director", "manager", "chief", "chairman", "secretary",
    "commissioner", "officer", "internet", "university", "institute", "department",
    "centre", "center", "company", "corporation", "association", "foundation", "organization",
    "report", "chapter", "section", "table", "figure", "appendix",
    "introduction", "conclusion", "abstract", "summary", "overview",
})

_RU_DENYLIST: frozenset[str] = frozenset({
    "и", "или", "но", "да", "либо", "однако", "зато", "хотя", "если",
    "когда", "пока", "после", "до", "как", "что", "чтобы", "потому",
    "поэтому", "так", "также", "тоже", "ни",
    "в", "на", "с", "по", "за", "из", "от", "до", "без", "при",
    "под", "над", "между", "через", "для", "у", "об", "про", "ко", "во",
    "он", "она", "они", "мы", "вы", "я", "это", "тот", "та", "те",
    "его", "её", "их", "наш", "ваш", "свой",
    "не", "ни", "уже", "ещё", "всё", "очень", "там", "тут", "здесь",
    "тогда", "теперь", "сейчас", "всегда", "никогда", "только", "даже",
    "понедельник", "вторник", "среда", "четверг", "пятница", "суббота", "воскресенье",
    "январь", "февраль", "март", "апрель", "май", "июнь",
    "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
    "россия", "франция", "германия", "китай", "америка", "европа",
    "москва", "санкт", "петербург", "новосибирск",
    "университет", "институт", "академия", "министерство",
    "правительство", "компания", "организация", "ассоциация", "федерация",
    "введение", "заключение", "глава", "раздел", "таблица", "рисунок", "приложение",
    "президент", "министр", "директор", "руководитель", "председатель",
    "генерал", "полковник", "майор", "капитан", "сержант", "лейтенант",
})


def _run_extraction(text, token_re, trigger_re, denylist, results, seen):
    triggers = {m.end() + o for m in trigger_re.finditer(text) for o in range(3)}
    tokens = list(token_re.finditer(text))
    i = 0
    while i < len(tokens):
        m0 = tokens[i]
        if m0.group(1).lower() in denylist:
            i += 1
            continue
        span, j = [m0], i + 1
        while j < len(tokens) and len(span) < 4:
            mn = tokens[j]
            if not _VALID_GAP_RE.match(text[span[-1].end():mn.start()]) or mn.group(1).lower() in denylist:
                break
            span.append(mn)
            j += 1
        s = span[0].start()
        if s not in triggers:
            prefix = text[:s].rstrip()
            if len(span) == 1 or bool(_SENT_END_RE.search(prefix)) or prefix == "":
                i += 1
                continue
        name, e = " ".join(t.group(1) for t in span), span[-1].end()
        if (k := (name, s, e)) not in seen:
            seen.add(k)
            results.append({"text": name, "start": s, "end": e})
        i = j if len(span) > 1 else i + 1


def _extract_persons(text: str) -> list[dict]:
    if not text:
        return []
    results, seen = [], set()
    _run_extraction(text, _CAP_TOKEN_RE, _TRIGGER_RE, _DENYLIST, results, seen)
    _run_extraction(text, _RU_CAP_TOKEN_RE, _RU_TRIGGER_RE, _RU_DENYLIST, results, seen)
    return results
