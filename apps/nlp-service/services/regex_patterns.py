import re
from models.schemas import EntityType

ENTITY_REGEX_PATTERNS: list[tuple[EntityType, re.Pattern[str]]] = [
    (EntityType.EMAIL,          re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}", re.IGNORECASE)),
    (EntityType.URL,            re.compile(r"https?://[^\s\"'<>()]+" , re.IGNORECASE)),
    (EntityType.IP_ADDRESS,     re.compile(r"\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b|\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b")),
    (EntityType.DATE,           re.compile(r"\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{2,4})\b")),
    (EntityType.ADDRESS,        re.compile(
        r"\b\d{1,5}(?:,\s?|\s)(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Court|Ct|Rue|Place|Quai|Allée|Impasse|Route|Rte|Chemin)\b(?:\s(?:de\s|la\s|des\s|l')?[A-Za-z]+){1,3}"
        r"|\b\d{1,5}\s(?:[A-Za-z]+\s?){1,3}(?:Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd|Drive|Dr|Way|Lane|Ln|Court|Ct|Rue|Place|Quai|Allée|Impasse|Route|Rte|Chemin)\b"
        r"|(?:улица|ул\.|проспект|пр-т|пр\.|переулок|пер\.|бульвар|б-р|набережная|наб\.|площадь|пл\.|шоссе|ш\.|аллея|проезд|тупик)\s+[А-ЯЁа-яё][А-ЯЁа-яёA-Za-z\s\-]{1,40},?\s*\d{1,5}"
        r"|[А-ЯЁа-яё][А-ЯЁа-яё\s\-]{2,40}\s+(?:улица|ул\.|проспект|пр-т|переулок|пер\.|бульвар|б-р|набережная|наб\.|площадь|пл\.),?\s*\d{1,5}",
        re.IGNORECASE | re.UNICODE
    )),
    (EntityType.ORGANIZATION,   re.compile(
        r"\b(?:[A-Z][a-zA-Z0-9]*\s+){1,3}(?:Inc|Corp|LLC|Ltd|Group|Company|Co|S\.A\.|Sarl|GmbH|Enterprise)\b"
        r"|(?:ООО|ОАО|ЗАО|ПАО|АО|НКО|ИП)\s+(?:«[^»]{1,60}»|\"[^\"]{1,60}\"|[А-ЯЁA-Z][А-ЯЁа-яёA-Za-z0-9\s\-]{1,50})"
        r"|(?:«[^»]{1,60}»)\s+(?:ООО|ОАО|ЗАО|ПАО|АО|НКО)",
        re.UNICODE
    )),
]
