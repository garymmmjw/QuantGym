"""Purple Book text for authenticated personal practice only.

The archived source remains excluded from the public problem catalog. This
projection is served only by the authenticated practice endpoint, never static
frontend assets or the public problems API.
"""

from functools import lru_cache
import json
from pathlib import Path
import re

SOURCE_PATH = Path(__file__).resolve().parents[1] / "data/question-banks/question-bank/problems.json"
MAX_TEXT_LENGTH = 80_000


def text(value):
    return value.strip() if isinstance(value, str) else ""


def eligible_text(value):
    return bool(value) and len(value) <= MAX_TEXT_LENGTH and not re.search(
        r"!\[[^\]]*\]\(|<\s*/?\s*[A-Za-z][A-Za-z0-9-]*(?:\s[^<>]*)?\s*/?>|\\includegraphics\b", value, re.IGNORECASE
    )


def normalize_technical_questions(rows):
    questions, seen = [], set()
    for row in rows if isinstance(rows, list) else []:
        if not isinstance(row, dict) or (row.get("source") != "question-bank" and row.get("bookSlug") != "question-bank"):
            continue
        if text(row.get("category")).lower() in {"leetcode", "coding", "programming", "algorithms", "behavioral", "behavioural"}:
            continue
        identity = text(row.get("id"))
        prompt = text(row.get("promptZh")) or text(row.get("prompt")) or text(row.get("promptEn"))
        prompt_en = text(row.get("promptEn")) or prompt
        reference = "\n\n".join(filter(None, [text(row.get(f"{field}Zh")) or text(row.get(field)) for field in ("answer", "explanation", "solution")]))
        reference_en = "\n\n".join(filter(None, [text(row.get(f"{field}En")) or text(row.get(field)) for field in ("answer", "explanation", "solution")])) or reference
        reference = reference or reference_en
        if not identity or len(identity) > 512 or identity in seen or not all(eligible_text(value) for value in (prompt, prompt_en, reference, reference_en)):
            continue
        if re.match(r"^(?:tbd|todo|暂无|待补充|无答案|no answer)\b", reference, re.IGNORECASE):
            continue
        seen.add(identity)
        title = text(row.get("titleZh")) or text(row.get("title")) or text(row.get("titleEn")) or "紫皮书技术题"
        questions.append({
            "id": identity, "title": title[:500], "titleEn": (text(row.get("titleEn")) or title)[:500],
            "prompt": prompt, "promptEn": prompt_en, "reference": reference, "referenceEn": reference_en,
            "source": "question-bank", "sourceLabel": "紫皮书",
        })
    return questions


@lru_cache(maxsize=1)
def load_technical_questions():
    payload = json.loads(SOURCE_PATH.read_text(encoding="utf-8"))
    rows = payload if isinstance(payload, list) else payload.get("problems", [])
    return normalize_technical_questions(rows)
