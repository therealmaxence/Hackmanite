from dataclasses import dataclass
from datetime import datetime, timedelta
import hashlib
import logging
import re
from typing import List

from services.email_date import parse_date_to_iso
from services.email_body import clean_body_text, clean_quoted_lines

logger = logging.getLogger(__name__)

@dataclass
class HeaderMatch:
    start_idx: int
    end_idx: int
    header_type: str
    date_str: str = None
    author_str: str = None
    to_str: str = None
    subject_str: str = None
    cc_str: str = None
    is_forward: bool = False

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

            author_lines = [al.strip()[1:].strip() if al.strip().startswith('>') else al.strip() for al in author_str.splitlines()]
            author_str = " ".join(al for al in author_lines if al).strip(" ,;:\r\n\t\xa0")
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
                if fl_match := pat.match(line):
                    fields[f_name] = fl_match.group(1).strip()
                    current_field, matched_field = f_name, True
                    header_lines_count += 1
                    break
            if not matched_field:
                stripped = line.lstrip('>')
                if current_field and (line.startswith((' ', '\t')) or (line.startswith('>') and (stripped.startswith((' ', '\t')) or stripped.strip()))):
                    fields[current_field] += " " + stripped.strip()
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

    return sorted(matches, key=lambda x: x.start_idx)

def extract_nested_emails(main_email: dict) -> List[dict]:
    body = main_email.get("body", "")
    if not body:
        return [main_email]

    matches = find_headers(body)
    if not matches:
        return [main_email]

    main_email["body"] = clean_body_text(body[:matches[0].start_idx])

    ref_tz = None
    if main_email.get("date"):
        try:
            ref_tz = datetime.fromisoformat(main_email["date"]).tzinfo
        except Exception:
            pass

    nested_list = []
    for i, match in enumerate(matches):
        raw_body = body[match.end_idx : matches[i + 1].start_idx if i + 1 < len(matches) else len(body)]
        parsed_date = parse_date_to_iso(match.date_str, reference_tz=ref_tz)
        if not parsed_date:
            p_date = main_email["date"] if i == 0 else nested_list[i - 1]["date"]
            try:
                parsed_date = (datetime.fromisoformat(p_date) - timedelta(minutes=1)).isoformat() if p_date else None
            except Exception:
                parsed_date = p_date

        subj = match.subject_str or (
            main_email["subject"] if main_email["subject"].lower().startswith(("re:", "fwd:")) else "Re: " + main_email["subject"]
        )

        if match.is_forward:
            parent = main_email if i == 0 else nested_list[i - 1]
            if not parent["subject"].lower().startswith(("fwd:", "fw:", "tr:", "forward:")):
                parent["subject"] = "Fwd: " + re.sub(r'^((re|aw|antw|rif|reply):\s*)+', '', parent["subject"], flags=re.IGNORECASE).strip()

        nested_list.append({
            "subject": subj,
            "from_address": match.author_str or "unknown@example.com",
            "to_address": match.to_str or main_email["from_address"],
            "cc_address": match.cc_str or None,
            "date": parsed_date,
            "body": clean_body_text(clean_quoted_lines(raw_body)),
            "attachments": [],
        })

    for i, item in enumerate(nested_list):
        h_in = f"{item['from_address']}-{item['date']}-{item['subject']}-{item['body']}".encode("utf-8", errors="replace")
        item["message_id"] = f"<{hashlib.sha1(h_in).hexdigest()}@datalake.local>"

    main_email["in_reply_to"] = nested_list[0]["message_id"]
    for i, item in enumerate(nested_list):
        item["in_reply_to"] = nested_list[i + 1]["message_id"] if i + 1 < len(nested_list) else None

    return [main_email] + nested_list
