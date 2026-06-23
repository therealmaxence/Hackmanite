import re

def clean_quoted_lines(text: str) -> str:
    return "\n".join(line.lstrip('>').strip() for line in text.splitlines()).strip()

def clean_body_text(text: str) -> str:
    lines = [l for l in text.splitlines() if not any(p in l.lower() for p in ("hide quoted history", "show quoted history"))]
    while lines:
        last = lines[-1].strip()
        if not last or re.match(r'^[-=_*~]{3,}$', last) or any(p in last.lower() for p in ("original message", "message d'origine", "исходное сообщение", "transféré", "forwarded")):
            lines.pop()
        else:
            break
    first = next((i for i, l in enumerate(lines) if l.strip()), len(lines))
    return "\n".join(lines[first:]).strip()
