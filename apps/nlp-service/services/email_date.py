import re
import email.utils
import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

MONTHS_MAP = {
    'jan': 1, 'feb': 2, 'mar': 3, 'apr': 4, 'may': 5, 'jun': 6, 'jul': 7, 'aug': 8, 'sep': 9, 'oct': 10, 'nov': 11, 'dec': 12,
    'january': 1, 'february': 2, 'march': 3, 'april': 4, 'june': 6, 'july': 7, 'august': 8, 'september': 9, 'october': 10, 'november': 11, 'december': 12,
    'janv': 1, 'févr': 2, 'mars': 3, 'avr': 4, 'mai': 5, 'juin': 6, 'juil': 7, 'août': 8, 'sept': 9, 'déc': 12,
    'janvier': 1, 'février': 2, 'avril': 4, 'juillet': 7, 'décembre': 12,
    'янв': 1, 'фев': 2, 'мар': 3, 'апр': 4, 'май': 5, 'июн': 6, 'июл': 7, 'авг': 8, 'сен': 9, 'окт': 10, 'ноя': 11, 'дек': 12,
    'января': 1, 'февраля': 2, 'марта': 3, 'апреля': 4, 'мая': 5, 'июня': 6, 'июля': 7, 'августа': 8, 'сентября': 9, 'октября': 10, 'ноября': 11, 'декабря': 12,
    'январь': 1, 'февраль': 2, 'март': 3, 'апрель': 4, 'июнь': 6, 'июль': 7, 'август': 8, 'сентябрь': 9, 'октябрь': 10, 'ноябрь': 11, 'декабрь': 12,
}
_MONTH_RES = {name: re.compile(r'(?<![a-zа-яё])' + re.escape(name) + r'(?![a-zа-яё])') for name in MONTHS_MAP}
_YEAR_RE = re.compile(r'\b(19\d{2}|20\d{2})\b')
_TIME_RE = re.compile(r'\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?\b')
_TIME_FR_RE = re.compile(r'\b(\d{1,2})h(\d{2})\b')
_DAY_RE = re.compile(r'\b(\d{1,2})\b')


def parse_colloquial_date(date_str: str, reference_tz: Optional[timezone] = None) -> Optional[str]:
    if not date_str:
        return None
    try:
        s = date_str.lower()
        month = None
        for name, num in MONTHS_MAP.items():
            if _MONTH_RES[name].search(s):
                if month is None or len(name) > len(month[0]):
                    month = (name, num)
        if not month:
            return None
        s = s.replace(month[0], " ")
        ym = _YEAR_RE.search(s)
        if not ym:
            return None
        year = int(ym.group(1))
        s = s.replace(ym.group(1), " ")

        hour = minute = second = 0
        if tm := _TIME_RE.search(s):
            hour, minute = int(tm.group(1)), int(tm.group(2))
            if tm.group(3):
                second = int(tm.group(3))
            if tm.group(4) == 'pm' and hour < 12:
                hour += 12
            elif tm.group(4) == 'am' and hour == 12:
                hour = 0
            s = s[:tm.start()] + " " + s[tm.end():]
        elif tmf := _TIME_FR_RE.search(s):
            hour, minute = int(tmf.group(1)), int(tmf.group(2))
            s = s[:tmf.start()] + " " + s[tmf.end():]

        day = next((int(d) for d in _DAY_RE.findall(s) if 1 <= int(d) <= 31), None)
        if not day:
            return None
        return datetime(year, month[1], day, hour, minute, second, tzinfo=reference_tz or timezone.utc).isoformat()
    except Exception as e:
        logger.warning("Failed to parse colloquial date '%s': %s", date_str, e)
        return None


def parse_date_to_iso(date_str: Optional[str], reference_tz: Optional[timezone] = None) -> Optional[str]:
    if not date_str:
        return None
    try:
        dt = email.utils.parsedate_to_datetime(date_str)
        return dt.replace(tzinfo=timezone.utc).isoformat() if dt.tzinfo is None else dt.isoformat()
    except Exception:
        result = parse_colloquial_date(date_str, reference_tz=reference_tz)
        if not result:
            logger.warning("Could not parse email date: %s", date_str)
        return result
