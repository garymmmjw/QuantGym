"""Private source credits and a link-only appendix, excluded from practice draws."""

from functools import lru_cache
import json
from pathlib import Path
import re

from technical_metadata import valid_source_url
from technical_source import load_technical_bundle

SOURCE_PATH = Path(__file__).resolve().parents[1] / "data/question-banks/question-bank/reading-list.json"


def plain_text(value, maximum):
    if not isinstance(value, str):
        return ""
    value = value.strip()
    try:
        return value if len(value.encode("utf-16-le")) // 2 <= maximum else ""
    except UnicodeEncodeError:
        return ""


def normalize_technical_supplements(payload):
    groups, seen = [], set()
    if not isinstance(payload, dict):
        return {"readingList": [], "sourceMetadata": None}
    for group in payload.get("groups", []) if isinstance(payload.get("groups"), list) else []:
        if not isinstance(group, dict):
            continue
        identity, label = plain_text(group.get("id"), 100), plain_text(group.get("label"), 500)
        if not re.fullmatch(r"[A-Za-z0-9_-]+", identity) or not label or identity in {item["id"] for item in groups}:
            continue
        questions = []
        for row in group.get("questions", []) if isinstance(group.get("questions"), list) else []:
            if not isinstance(row, dict):
                continue
            number, slug = plain_text(row.get("frontendId"), 20), plain_text(row.get("slug"), 200)
            title, source_page = plain_text(row.get("titleZh"), 500), plain_text(row.get("sourcePage"), 100)
            pdf_page = row.get("pdfPage")
            if not re.fullmatch(r"[0-9]{1,8}", number) or number in seen or not re.fullmatch(r"[a-z0-9-]+", slug) or not title or not source_page or type(pdf_page) is not int or not 1 <= pdf_page <= 100_000:
                continue
            seen.add(number)
            questions.append({
                "frontendId": number, "titleZh": title, "slug": slug,
                "url": f"https://leetcode.cn/problems/{slug}/",
                "sourcePage": source_page, "pdfPage": pdf_page,
            })
        if questions and identity not in {item["id"] for item in groups}:
            groups.append({"id": identity, "label": label, "questions": questions})
    metadata = payload.get("sourceMetadata")
    source_metadata = None
    if isinstance(metadata, dict):
        strings = {field: plain_text(metadata.get(field), maximum) for field, maximum in (
            ("title", 500), ("author", 300), ("edition", 300), ("sourceUrl", 2048))}
        page_count = metadata.get("pdfPageCount")
        if all(strings.values()) and valid_source_url(strings["sourceUrl"]) and type(page_count) is int and 1 <= page_count <= 100_000:
            source_metadata = {**strings, "pdfPageCount": page_count}
    return {"readingList": groups, "sourceMetadata": source_metadata}


@lru_cache(maxsize=1)
def load_technical_supplements():
    bundle = load_technical_bundle()
    if bundle is not None:
        return normalize_technical_supplements(bundle["supplements"])
    if not SOURCE_PATH.exists():
        return normalize_technical_supplements({})
    return normalize_technical_supplements(json.loads(SOURCE_PATH.read_text(encoding="utf-8")))
