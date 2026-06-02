import re
import logging
from datetime import timezone
from typing import Optional

logger = logging.getLogger(__name__)

MONTHS_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6,
    'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6,
    'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6,
    'juil': 7, 'août': 8, 'sept': 9, 'déc': 12,
    'janvier': 1, 'février': 2, 'avril': 4, 'juillet': 7, 'décembre': 12,
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'май': 5, 'июн': 6,
    'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
    'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6,
    'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
    'январь': 1, 'февраль': 2, 'март': 3, 'апрель': 4, 'июнь': 6,
    'июль': 7, 'август': 8, 'сентябрь': 9, 'октябрь': 10, 'ноябрь': 11, 'декабрь': 12,
}

_MONTH_RES = {
    name: re.compile(r'(?<![a-zа-яё])' + re.escape(name) + r'(?![a-zа-яё])')
    for name in MONTHS_MAP
}


def parse_colloquial_date(date_str: str, reference_tz: Optional[timezone] = None) -> Optional[str]:
    if not date_str:
        return None
    try:
        date_str_lower = date_str.lower()

        month = None
        for name, num in MONTHS_MAP.items():
            if _MONTH_RES[name].search(date_str_lower):
                if month is None or len(name) > len(month[0]):
                    month = (name, num)

        if not month:
            return None

        month_num = month[1]
        str_clean = date_str_lower.replace(month[0], " ")

        year_match = re.search(r'\b(19\d{2}|20\d{2})\b', str_clean)
        if not year_match:
            return None
        year = int(year_match.group(1))
        str_clean = str_clean.replace(year_match.group(1), " ")

        time_match = re.search(r'\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b', str_clean)
        hour = minute = second = 0
        if time_match:
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            if time_match.group(3):
                second = int(time_match.group(3))
            ampm = time_match.group(4)
            if ampm == 'pm' and hour < 12:
                hour += 12
            elif ampm == 'am' and hour == 12:
                hour = 0
            str_clean = str_clean[:time_match.start()] + " " + str_clean[time_match.end():]
        else:
            time_match_fr = re.search(r'\b(\d{1,2})h(\d{2})\b', str_clean)
            if time_match_fr:
                hour = int(time_match_fr.group(1))
                minute = int(time_match_fr.group(2))
                str_clean = str_clean[:time_match_fr.start()] + " " + str_clean[time_match_fr.end():]

        day = next(
            (int(dm) for dm in re.findall(r'\b(\d{1,2})\b', str_clean) if 1 <= int(dm) <= 31),
            None,
        )
        if not day:
            return None

        from datetime import datetime
        tz = reference_tz if reference_tz is not None else timezone.utc
        return datetime(year, month_num, day, hour, minute, second, tzinfo=tz).isoformat()
    except Exception as e:
        logger.warning("Failed to parse colloquial date '%s': %s", date_str, e)
        return None


def parse_date_to_iso(date_str: Optional[str], reference_tz: Optional[timezone] = None) -> Optional[str]:
    if not date_str:
        return None
    try:
        import email.utils
        dt = email.utils.parsedate_to_datetime(date_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except Exception:
        colloquial = parse_colloquial_date(date_str, reference_tz=reference_tz)
        if colloquial:
            return colloquial
        logger.warning("Could not parse email date: %s", date_str)
        return None
