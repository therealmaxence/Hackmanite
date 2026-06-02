from __future__ import annotations

import structlog

from models.schemas import ExtractedEntity, EntityType
from services.mention_extractor import _extract_mentions

logger = structlog.get_logger()

WINDOW_SIZE: int = 400


def extract_entities_and_neighborhoods(text: str, keywords: list[dict], window_size: int = 400) -> tuple[list[ExtractedEntity], list[dict]]:
    mentions = _extract_mentions(text)
    return _build_entities_and_neighborhoods(text, mentions, keywords, window_size)


def _build_entities_and_neighborhoods(text: str, mentions: list[dict], keywords: list[dict], window_size: int = 400) -> tuple[list[ExtractedEntity], list[dict]]:
    grouped: dict[tuple[str, EntityType], dict] = {}

    def snippet(start: int, end: int) -> str:
        padding = max(window_size, 500)
        left = max(0, start - padding)
        right = min(len(text), end + padding)
        value = text[left:right].strip()
        if left > 0:
            value = f"…{value}"
        if right < len(text):
            value = f"{value}…"
        return value

    for mention in mentions:
        key = (mention["canonical"], mention["type"])
        bucket = grouped.setdefault(key, {
            "canonical": mention["canonical"],
            "display_name": mention["display_name"],
            "type": mention["type"],
            "count": 0,
            "excerpts": [],
        })
        bucket["count"] += 1
        bucket["excerpts"].append({
            "text": snippet(mention["start"], mention["end"]),
            "offset": mention["start"],
            "end": mention["end"],
        })

    entities = [
        ExtractedEntity(
            canonical=v["canonical"],
            display_name=v["display_name"],
            type=v["type"],
            count=v["count"],
            excerpts=v["excerpts"],
        )
        for v in grouped.values()
    ]

    mention_entries: list[dict] = []
    for v in grouped.values():
        for excerpt in v["excerpts"]:
            mention_entries.append({
                "canonical": v["canonical"],
                "display_name": v["display_name"],
                "type": v["type"],
                "start": int(excerpt["offset"]),
                "end": int(excerpt["end"]),
                "snippet": excerpt["text"],
            })
    mention_entries.sort(key=lambda item: item["start"])

    best_pairs: dict[tuple, dict] = {}
    for i, source in enumerate(mention_entries):
        for target in mention_entries[i + 1:]:
            if target["start"] - source["start"] > window_size:
                break
            if target["end"] - source["start"] > window_size:
                continue
            if source["canonical"] == target["canonical"] and source["type"] == target["type"]:
                continue

            # Sort source/target lexicographically to canonicalize the undirected edge key
            is_swapped = False
            if source["canonical"] > target["canonical"]:
                is_swapped = True
            elif source["canonical"] == target["canonical"] and source["type"].value > target["type"].value:
                is_swapped = True

            first = target if is_swapped else source
            second = source if is_swapped else target

            pair_key = (first["canonical"], first["type"], second["canonical"], second["type"])
            distance_between = target["start"] - source["end"]
            weight = max(0.0, 1.0 - (max(0, distance_between) / window_size))

            if pair_key in best_pairs and weight <= best_pairs[pair_key]["weight"]:
                continue

            padding = max(window_size // 2, 200)
            left = max(0, source["start"] - padding)
            right = min(len(text), target["end"] + padding)
            edge_snippet = text[left:right].strip()
            if left > 0:
                edge_snippet = f"…{edge_snippet}"
            if right < len(text):
                edge_snippet = f"{edge_snippet}…"

            best_pairs[pair_key] = {
                "source_canonical": first["canonical"],
                "source_display_name": first["display_name"],
                "source_type": first["type"],
                "target_canonical": second["canonical"],
                "target_display_name": second["display_name"],
                "target_type": second["type"],
                "weight": weight,
                "distance": distance_between,
                "snippet": edge_snippet,
                "source_offset": first["start"],
                "target_offset": second["start"],
            }

    return entities, list(best_pairs.values())