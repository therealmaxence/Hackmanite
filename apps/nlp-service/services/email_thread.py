import re
import logging
import hashlib
from typing import List

from services.email_date import parse_date_to_iso
from services.email_body import clean_body_text, clean_quoted_lines

logger = logging.getLogger(__name__)


class HeaderMatch:
    def __init__(self, start_idx, end_idx, header_type, date_str=None, author_str=None, to_str=None, subject_str=None, cc_str=None, is_forward=False):
        self.start_idx = start_idx
        self.end_idx = end_idx
        self.header_type = header_type
        self.date_str = date_str
        self.author_str = author_str
        self.to_str = to_str
        self.subject_str = subject_str
        self.cc_str = cc_str
        self.is_forward = is_forward


INLINE_HEADER_PATTERNS = [
    re.compile(r'(?:\r?\n|^)>*\s*(On\s+([\s\S]{1,500}?)\s+wrote\s*:)', re.IGNORECASE),
    re.compile(r'(?:\r?\n|^)>*\s*(Le\s+([\s\S]{1,500}?)\s+a\s+écrit\s*(?::|:))', re.IGNORECASE),
    re.compile(r'(?:\r?\n|^)>*\s*(([\s\S]{1,500}?)\s+(?:пишет|написал\(а\)|написал|написала)\s*:)', re.IGNORECASE),
]


def find_headers(body: str) -> List[HeaderMatch]:
    matches = []

    for pattern in INLINE_HEADER_PATTERNS:
        for m in pattern.finditer(body):
            if any(existing.start_idx <= m.start(1) < existing.end_idx for existing in matches):
                continue

            content = m.group(2)
            author_str = ""
            date_str = ""

            time_match = re.search(r'\b(\d{1,2})[:h](\d{2})(?::(\d{2}))?\s*(am|pm)?\b', content, re.IGNORECASE)
            if time_match:
                date_str = content[:time_match.end()]
                author_str = content[time_match.end():]
            else:
                year_match = re.search(r'\b(19\d{2}|20\d{2})\b(?:\s*(?:г\.|г|year|année))?', content, re.IGNORECASE)
                if year_match:
                    date_str = content[:year_match.end()]
                    author_str = content[year_match.end():]
                else:
                    email_match = re.search(r'(<[^>]+>|\S+@\S+)', content)
                    if email_match:
                        date_str = content[:email_match.start()]
                        author_str = content[email_match.start():]
                    else:
                        parts = content.rsplit(',', 1)
                        if len(parts) == 2:
                            date_str, author_str = parts[0], parts[1]
                        else:
                            author_str = content

            author_str = author_str.strip()
            author_str = re.sub(r'^[,;:\s]+', '', author_str)
            author_str = re.sub(r'^(?:пользователь|user|à|at|to)\s+', '', author_str, flags=re.IGNORECASE)

            author_lines = author_str.splitlines()
            cleaned_author_lines = []
            for al in author_lines:
                al_stripped = al.strip()
                if al_stripped == '>':
                    continue
                if al_stripped.startswith('>'):
                    al_stripped = al_stripped[1:].strip()
                if al_stripped:
                    cleaned_author_lines.append(al_stripped)
            author_str = " ".join(cleaned_author_lines).strip(" ,;:\r\n\t\xa0")

            date_str = re.sub(r'[,;:\s\(\)]+$', '', date_str.strip())

            matches.append(HeaderMatch(
                start_idx=m.start(1),
                end_idx=m.end(1),
                header_type='inline',
                date_str=date_str,
                author_str=author_str,
            ))

    block_start_pattern = re.compile(r'^>?\s*(From|De|От)\s*:\s*(.*)', re.IGNORECASE | re.MULTILINE)
    field_patterns = {
        'from':    re.compile(r'^>?\s*(?:From|De|От)\s*:\s*(.*)', re.IGNORECASE),
        'sent':    re.compile(r'^>?\s*(?:Sent|Envoyé|Date|Отправлено|Дата)\s*:\s*(.*)', re.IGNORECASE),
        'to':      re.compile(r'^>?\s*(?:To|À|Кому)\s*:\s*(.*)', re.IGNORECASE),
        'cc':      re.compile(r'^>?\s*(?:Cc|Сс|Copie|Копия)\s*:\s*(.*)', re.IGNORECASE),
        'subject': re.compile(r'^>?\s*(?:Subject|Objet|Sujet|Тема)\s*:\s*(.*)', re.IGNORECASE),
    }

    for m in block_start_pattern.finditer(body):
        start_pos = m.start()
        if any(existing.start_idx <= start_pos < existing.end_idx for existing in matches):
            continue

        lines = body[start_pos:start_pos + 1000].splitlines()
        if not lines:
            continue

        fields: dict = {}
        header_lines_count = 0
        current_field = None

        for line in lines:
            matched_field = False
            for f_name, pat in field_patterns.items():
                fl_match = pat.match(line)
                if fl_match:
                    fields[f_name] = fl_match.group(1).strip()
                    current_field = f_name
                    matched_field = True
                    header_lines_count += 1
                    break
            if not matched_field:
                stripped_line = line.lstrip('>')
                if current_field and (
                    line.startswith(' ') or
                    line.startswith('\t') or
                    (line.startswith('>') and (stripped_line.startswith(' ') or stripped_line.startswith('\t') or stripped_line.strip()))
                ):
                    fields[current_field] += " " + stripped_line.strip()
                    header_lines_count += 1
                else:
                    break

        if 'from' not in fields or ('sent' not in fields and 'subject' not in fields):
            continue

        header_text = "\n".join(lines[:header_lines_count])
        end_pos = start_pos + len(header_text)

        if any(existing.start_idx <= start_pos < existing.end_idx for existing in matches):
            continue

        preceding_text = body[max(0, start_pos - 150):start_pos].lower()
        is_fwd = any(p in preceding_text for p in [
            "forwarded message", "message transféré", "пересылаемое сообщение",
            "forwarded", "transféré", "----------",
        ])

        matches.append(HeaderMatch(
            start_idx=start_pos,
            end_idx=end_pos,
            header_type='block',
            date_str=fields.get('sent'),
            author_str=fields.get('from'),
            to_str=fields.get('to'),
            subject_str=fields.get('subject'),
            cc_str=fields.get('cc'),
            is_forward=is_fwd,
        ))

    matches.sort(key=lambda x: x.start_idx)
    return matches


def extract_nested_emails(main_email: dict) -> List[dict]:
    body = main_email.get("body", "")
    if not body:
        return [main_email]

    matches = find_headers(body)
    if not matches:
        return [main_email]

    main_email["body"] = clean_body_text(body[:matches[0].start_idx])

    from datetime import datetime, timedelta
    ref_tz = None
    if main_email.get("date"):
        try:
            main_dt = datetime.fromisoformat(main_email["date"])
            if main_dt.tzinfo is not None:
                ref_tz = main_dt.tzinfo
        except Exception:
            pass

    nested_list = []
    for i, match in enumerate(matches):
        raw_body = body[match.end_idx: matches[i + 1].start_idx if i + 1 < len(matches) else len(body)]

        parsed_date = parse_date_to_iso(match.date_str, reference_tz=ref_tz)
        if not parsed_date:
            parent_date_str = main_email["date"] if i == 0 else nested_list[i - 1]["date"]
            if parent_date_str:
                try:
                    parsed_date = (datetime.fromisoformat(parent_date_str) - timedelta(minutes=1)).isoformat()
                except Exception:
                    parsed_date = parent_date_str

        subj = match.subject_str
        if not subj:
            parent_subj = main_email["subject"]
            subj = parent_subj if parent_subj.lower().startswith(("re:", "fwd:")) else "Re: " + parent_subj

        if match.is_forward:
            parent_email = main_email if i == 0 else nested_list[i - 1]
            parent_subj = parent_email["subject"]
            if not parent_subj.lower().startswith(("fwd:", "fw:", "tr:", "forward:")):
                clean_parent_subj = re.sub(r'^((re|aw|antw|rif|reply):\s*)+', '', parent_subj, flags=re.IGNORECASE).strip()
                parent_email["subject"] = "Fwd: " + clean_parent_subj

        nested_list.append({
            "subject": subj,
            "from_address": match.author_str or "unknown@example.com",
            "to_address": match.to_str or main_email["from_address"],
            "cc_address": match.cc_str or None,
            "date": parsed_date,
            "body": clean_body_text(clean_quoted_lines(raw_body)),
            "attachments": [],
        })

    for email_item in nested_list:
        hash_input = f"{email_item['from_address']}-{email_item['date']}-{email_item['subject']}-{email_item['body']}".encode("utf-8", errors="replace")
        email_item["message_id"] = f"<{hashlib.sha1(hash_input).hexdigest()}@datalake.local>"

    main_email["in_reply_to"] = nested_list[0]["message_id"]
    for i in range(len(nested_list)):
        nested_list[i]["in_reply_to"] = nested_list[i + 1]["message_id"] if i + 1 < len(nested_list) else None

    return [main_email] + nested_list
