from __future__ import annotations
import structlog
from models.schemas import ExtractedEntity

logger = structlog.get_logger()

def _snippet(text: str, start: int, end: int, pad: int) -> str:
    l, r = max(0, start - pad), min(len(text), end + pad)
    return f"{'…' if l > 0 else ''}{text[l:r].strip()}{'…' if r < len(text) else ''}"

def extract_entities_and_neighborhoods(text: str, keywords: list[dict], window_size: int = 400) -> tuple[list[ExtractedEntity], list[dict]]:
    from services.mention_extractor import _extract_mentions
    pad = max(window_size, 500)
    grouped: dict = {}
    entries: list[dict] = []

    for m in _extract_mentions(text):
        snip = _snippet(text, m["start"], m["end"], pad)
        key = (m["canonical"], m["type"])
        bucket = grouped.setdefault(key, {"canonical": m["canonical"], "display_name": m["display_name"], "type": m["type"], "count": 0, "excerpts": []})
        bucket["count"] += 1
        bucket["excerpts"].append({"text": snip, "offset": m["start"], "end": m["end"]})
        entries.append({"canonical": m["canonical"], "display_name": m["display_name"], "type": m["type"],
                        "start": int(m["start"]), "end": int(m["end"]), "snippet": snip})

    entries.sort(key=lambda x: x["start"])
    entities = [ExtractedEntity(**v) for v in grouped.values()]

    best: dict = {}
    half_pad = max(window_size // 2, 200)
    for i, src in enumerate(entries):
        for tgt in entries[i + 1:]:
            if tgt["start"] - src["start"] > window_size:
                break
            if tgt["end"] - src["start"] > window_size:
                continue
            if src["canonical"] == tgt["canonical"] and src["type"] == tgt["type"]:
                continue
            swap = src["canonical"] > tgt["canonical"] or (src["canonical"] == tgt["canonical"] and src["type"].value > tgt["type"].value)
            a, b = (tgt, src) if swap else (src, tgt)
            pk = (a["canonical"], a["type"], b["canonical"], b["type"])
            dist = tgt["start"] - src["end"]
            w = max(0.0, 1.0 - max(0, dist) / window_size)
            if pk in best and w <= best[pk]["weight"]:
                continue
            best[pk] = {
                "source_canonical": a["canonical"], "source_display_name": a["display_name"], "source_type": a["type"],
                "target_canonical": b["canonical"], "target_display_name": b["display_name"], "target_type": b["type"],
                "weight": w, "distance": dist,
                "snippet": _snippet(text, src["start"], tgt["end"], half_pad),
                "source_offset": a["start"], "target_offset": b["start"],
            }

    return entities, list(best.values())