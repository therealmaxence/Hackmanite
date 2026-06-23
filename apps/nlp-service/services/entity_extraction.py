from __future__ import annotations
import structlog
from models.schemas import ExtractedEntity
from services.mention_extractor import _extract_mentions

logger = structlog.get_logger()

def _get_snippet(text: str, start: int, end: int, padding: int) -> str:
    left, right = max(0, start - padding), min(len(text), end + padding)
    val = text[left:right].strip()
    return f"{'…' if left > 0 else ''}{val}{'…' if right < len(text) else ''}"

def extract_entities_and_neighborhoods(text: str, keywords: list[dict], window_size: int = 400) -> tuple[list[ExtractedEntity], list[dict]]:
    mentions = _extract_mentions(text)
    grouped = {}
    mention_entries = []
    for m in mentions:
        snip = _get_snippet(text, m["start"], m["end"], max(window_size, 500))
        key = (m["canonical"], m["type"])
        bucket = grouped.setdefault(key, {
            "canonical": m["canonical"],
            "display_name": m["display_name"],
            "type": m["type"],
            "count": 0,
            "excerpts": [],
        })
        bucket["count"] += 1
        bucket["excerpts"].append({"text": snip, "offset": m["start"], "end": m["end"]})
        mention_entries.append({
            "canonical": m["canonical"],
            "display_name": m["display_name"],
            "type": m["type"],
            "start": int(m["start"]),
            "end": int(m["end"]),
            "snippet": snip,
        })

    mention_entries.sort(key=lambda x: x["start"])
    entities = [ExtractedEntity(**v) for v in grouped.values()]

    best_pairs = {}
    for i, source in enumerate(mention_entries):
        for target in mention_entries[i + 1:]:
            if target["start"] - source["start"] > window_size:
                break
            if target["end"] - source["start"] > window_size:
                continue
            if source["canonical"] == target["canonical"] and source["type"] == target["type"]:
                continue

            is_swapped = (source["canonical"] > target["canonical"]) or (
                source["canonical"] == target["canonical"] and source["type"].value > target["type"].value
            )
            first, second = (target, source) if is_swapped else (source, target)
            pair_key = (first["canonical"], first["type"], second["canonical"], second["type"])
            dist = target["start"] - source["end"]
            weight = max(0.0, 1.0 - (max(0, dist) / window_size))

            if pair_key in best_pairs and weight <= best_pairs[pair_key]["weight"]:
                continue

            best_pairs[pair_key] = {
                "source_canonical": first["canonical"],
                "source_display_name": first["display_name"],
                "source_type": first["type"],
                "target_canonical": second["canonical"],
                "target_display_name": second["display_name"],
                "target_type": second["type"],
                "weight": weight,
                "distance": dist,
                "snippet": _get_snippet(text, source["start"], target["end"], max(window_size // 2, 200)),
                "source_offset": first["start"],
                "target_offset": second["start"],
            }

    return entities, list(best_pairs.values())