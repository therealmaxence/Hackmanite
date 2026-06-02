import email
from email import policy
import hashlib
import logging
from pathlib import Path
import tempfile
import subprocess
import shutil
from typing import List

try:
    from bs4 import BeautifulSoup
except Exception:
    BeautifulSoup = None

from services.email_date import parse_date_to_iso
from services.email_thread import extract_nested_emails

logger = logging.getLogger(__name__)


def parse_eml_file(file_path: Path) -> List[dict]:
    try:
        with open(file_path, "rb") as f:
            msg = email.message_from_binary_file(f, policy=policy.default)

        message_id = msg.get("Message-ID") or msg.get("Message-Id")
        subject = msg.get("Subject", "(No Subject)")
        from_addr = msg.get("From", "unknown@example.com")
        to_addr = msg.get("To", "unknown@example.com")
        cc_addr = msg.get("Cc")
        date_raw = msg.get("Date")
        in_reply_to = msg.get("In-Reply-To")
        references = msg.get("References")

        if message_id:
            message_id = message_id.strip()
        else:
            hash_input = f"{date_raw}-{from_addr}-{subject}".encode("utf-8", errors="replace")
            message_id = f"<{hashlib.sha1(hash_input).hexdigest()}@datalake.local>"

        if in_reply_to:
            in_reply_to = in_reply_to.strip()
        if references:
            references = references.strip()

        body_parts = []
        html_parts = []
        attachments = []

        for part in msg.walk():
            disposition = part.get_content_disposition()
            filename = part.get_filename()

            if disposition == "attachment" or filename:
                try:
                    payload = part.get_payload(decode=True) or b""
                    size = len(payload)
                except Exception:
                    size = 0
                    payload = b""

                entities_list = []
                if payload and filename:
                    suffix = Path(filename).suffix.lower()
                    if suffix in {".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".html", ".htm", ".xml", ".md", ".csv"}:
                        try:
                            with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp_f:
                                tmp_f.write(payload)
                                tmp_file_path = Path(tmp_f.name)
                            
                            from services.file_to_text import prepare_input
                            from services.mention_extractor import _extract_mentions
                            
                            mime_map = {
                                ".pdf": "application/pdf",
                                ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                                ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                                ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                                ".txt": "text/plain",
                                ".html": "text/html",
                                ".htm": "text/html",
                                ".xml": "application/xml",
                                ".md": "text/markdown",
                            }
                            tmp_mime = mime_map.get(suffix, "text/plain")
                            prepared = prepare_input(str(tmp_file_path), tmp_mime)
                            
                            if prepared.get("type") == "text" and prepared.get("text"):
                                mentions = _extract_mentions(prepared["text"])
                                seen = set()
                                for m in mentions:
                                    k = (m["canonical"], m["type"].value)
                                    if k not in seen:
                                        seen.add(k)
                                        entities_list.append({
                                            "canonical": m["canonical"],
                                            "type": m["type"].value
                                        })
                            
                            tmp_file_path.unlink(missing_ok=True)
                        except Exception as e:
                            logger.error("Failed to parse attachment %s: %s", filename, e)

                attachments.append({
                    "filename": filename or "unnamed_attachment",
                    "size": size,
                    "entities": entities_list
                })
                continue

            content_type = part.get_content_type()
            if content_type == "text/plain":
                try:
                    payload = part.get_content()
                    if payload:
                        body_parts.append(payload.strip())
                except Exception:
                    try:
                        payload = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="replace")
                        if payload:
                            body_parts.append(payload.strip())
                    except Exception:
                        pass
            elif content_type == "text/html":
                try:
                    payload = part.get_content()
                    if payload:
                        html_parts.append(payload.strip())
                except Exception:
                    try:
                        payload = part.get_payload(decode=True).decode(part.get_content_charset() or "utf-8", errors="replace")
                        if payload:
                            html_parts.append(payload.strip())
                    except Exception:
                        pass

        if body_parts:
            body_text = "\n\n".join(body_parts)
        elif html_parts:
            soup_texts = []
            for h_part in html_parts:
                if BeautifulSoup:
                    soup = BeautifulSoup(h_part, "html.parser")
                    for node in soup(["script", "style", "noscript"]):
                        node.decompose()
                    soup_texts.append("\n".join(p.strip() for p in soup.stripped_strings if p.strip()))
                else:
                    soup_texts.append(h_part)
            body_text = "\n\n".join(soup_texts)
        else:
            body_text = ""

        main_email = {
            "message_id": message_id,
            "in_reply_to": in_reply_to,
            "references": references,
            "subject": subject,
            "from_address": from_addr,
            "to_address": to_addr,
            "cc_address": cc_addr,
            "date": parse_date_to_iso(date_raw),
            "body": body_text.strip(),
            "attachments": attachments,
        }
        return extract_nested_emails(main_email)
    except Exception as e:
        logger.error("Error parsing EML file %s: %s", file_path.name, e, exc_info=True)
        return []


def _list_pst_eml_files(file_path: Path, temp_path: Path) -> List[Path]:
    if not shutil.which("readpst"):
        logger.warning("readpst executable not found in PATH; skipping PST extraction.")
        return []
    cmd = ["readpst", "-e", "-M", "-o", str(temp_path), str(file_path)]
    logger.info("Running readpst: %s", " ".join(cmd))
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        logger.error("readpst failed for %s: %s", file_path.name, result.stderr)
        if not any(temp_path.glob("**/*")):
            return []
    files = sorted(
        (item for item in temp_path.glob("**/*") if item.is_file()),
        key=lambda p: p.as_posix(),
    )
    return files


def parse_pst_emails(file_path: Path) -> List[dict]:
    emails_list = []
    try:
        with tempfile.TemporaryDirectory(prefix="pst_extract_") as temp_dir:
            temp_path = Path(temp_dir)
            for f_path in _list_pst_eml_files(file_path, temp_path):
                parsed = parse_eml_file(f_path)
                if parsed:
                    emails_list.extend(parsed)
    except Exception as e:
        logger.error("Error parsing PST file %s: %s", file_path.name, e, exc_info=True)
    return emails_list
