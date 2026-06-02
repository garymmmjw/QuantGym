#!/usr/bin/env python3
"""Import Harvard Stat 110 strategic practice PDFs into a normalized source.

The PDFs are official public course materials. This script keeps the extraction
rule explicit: split each PDF into Strategic Practice, Strategic Practice
Solutions, Homework, and Homework Solutions, then match problems by section and
local problem number.
"""

from __future__ import annotations

import json
import re
import shutil
import subprocess
from datetime import datetime, timezone
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = PROJECT_ROOT / "量化书籍" / "有题目的" / "Harvard Stat 110 概率论战略练习 Statistics 110 Strategic Practice"
SOURCE_DIR = PROJECT_ROOT / "data" / "question-banks" / "stat110-strategic-practice"
MANIFEST_PATH = PROJECT_ROOT / "data" / "question-banks" / "catalog-manifest.json"
SLUG = "stat110-strategic-practice"
SOURCE_URL = "https://stat110.hsites.harvard.edu/strategic-practice-problems"
BOOK_NAME = "Harvard Stat 110 概率论战略练习 Statistics 110 Strategic Practice"
ASSET_DIR = PROJECT_ROOT / "assets" / "problem-media" / SLUG


SECTION_TITLE_ALIASES = {
    "Distributions and Expected Values for Discrete": "Distributions and Expected Values for Discrete Random Variables",
    "Indicator Random Variables and Linearity of": "Indicator Random Variables and Linearity of Expectation",
}

VALID_STRATEGIC_SECTIONS = {
    "Naive Definition of Probability",
    "Story Proofs",
    "Inclusion-Exclusion",
    "Independence",
    "Thinking Conditionally",
    "Continuing with Conditioning",
    "Simpson's Paradox",
    "Gambler's Ruin",
    "Bernoulli and Binomial",
    "Distributions and Expected Values for Discrete Random Variables",
    "Indicator Random Variables and Linearity of Expectation",
    "Poisson Distribution and Poisson Paradigm",
    "Seeking Sublime Symmetry",
    "Continuous Distributions",
    "LOTUS",
    "Exponential Distribution and Memorylessness",
    "Moment Generating Functions (MGFs)",
    "Joint, Conditional, and Marginal Distributions",
    "Covariance and Correlation",
    "Transformations",
    "Existence",
    "Beta and Gamma Distributions",
    "Order Statistics",
    "Conditional Expectation",
    "Conditional Expectation & Conditional Variance",
    "Inequalities",
    "Law of Large Numbers, Central Limit Theorem",
    "Multivariate Normal",
    "Markov Chains",
}

MEDIA_SPECS = {
    "stat110-strategic-practice-homework-02-001": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 2,
            "page": 11,
            "clip": [104, 206, 414, 294],
            "filename": "homework-02-001-certificate.png",
        }
    ],
    "stat110-strategic-practice-homework-04-002": [
        {
            "roles": ["solutionImages"],
            "set": 4,
            "page": 12,
            "clip": [104, 480, 292, 502],
            "filename": "homework-04-002-hatched-eggs.png",
        }
    ],
    "stat110-strategic-practice-homework-04-004": [
        {
            "roles": ["solutionImages"],
            "set": 4,
            "page": 13,
            "clip": [100, 318, 496, 366],
            "filename": "homework-04-004-empty-boxes.png",
        }
    ],
    "stat110-strategic-practice-strategic-08-005": [
        {
            "roles": ["solutionImages"],
            "set": 8,
            "page": 7,
            "clip": [86, 112, 526, 305],
            "filename": "strategic-08-005-scatterplots.png",
        }
    ],
    "stat110-strategic-practice-strategic-11-011": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 11,
            "page": 3,
            "clip": [220, 88, 392, 190],
            "filename": "strategic-11-011-markov-chain.png",
        }
    ],
    "stat110-strategic-practice-strategic-11-013": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 11,
            "page": 3,
            "clip": [220, 416, 392, 592],
            "filename": "strategic-11-013-chessboard.png",
        }
    ],
    "stat110-strategic-practice-homework-11-004": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 11,
            "page": 15,
            "clip": [210, 520, 400, 610],
            "filename": "homework-11-004-two-state-markov-chain.png",
        }
    ],
    "stat110-strategic-practice-homework-08-007": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 8,
            "page": 15,
            "clip": [198, 392, 432, 464],
            "filename": "homework-08-007-network-clique-anticlique.png",
        }
    ],
    "stat110-strategic-practice-homework-11-007": [
        {
            "roles": ["promptImages", "solutionImages"],
            "set": 11,
            "page": 17,
            "clip": [80, 214, 548, 468],
            "filename": "homework-11-007-us-map-coloring.png",
        }
    ],
}

FIGURE_REVIEW_NOTES = {
    "stat110-strategic-practice-homework-08-001": {
        "prompt": "false_positive source_checked_no_image: Chinese text contains 表1 as part of 代表110, not a table reference.",
        "solution": "false_positive source_checked_no_image: Chinese text contains 表1 as part of 代表110, not a table reference.",
    }
}


def main() -> None:
    problems = []
    now = datetime.now(timezone.utc).isoformat()
    existing_by_id = load_existing_problem_map()
    for set_number in range(1, 12):
        pdf_path = BOOK_DIR / f"strategic_practice_and_homework_{set_number}.pdf"
        if not pdf_path.exists():
            raise SystemExit(f"Missing Stat 110 PDF: {pdf_path}")
        text = extract_text(pdf_path)
        chunks = split_document(text, set_number)

        strategic_prompts = parse_chunk(
            chunks["strategic"],
            default_section=f"Strategic Practice {set_number}",
        )
        strategic_solutions = parse_chunk(
            chunks["strategic_solutions"],
            default_section=f"Strategic Practice {set_number}",
        )
        homework_prompts = parse_chunk(chunks["homework"], default_section=f"Homework {set_number}")
        homework_solutions = parse_chunk(chunks["homework_solutions"], default_section=f"Homework {set_number}")

        problems.extend(
            build_problems(
                set_number=set_number,
                kind="strategic",
                kind_label="Strategic Practice",
                entries=strategic_prompts,
                solutions=strategic_solutions,
                created_at=now,
                existing_by_id=existing_by_id,
            )
        )
        problems.extend(
            build_problems(
                set_number=set_number,
                kind="homework",
                kind_label="Homework",
                entries=homework_prompts,
                solutions=homework_solutions,
                created_at=now,
                existing_by_id=existing_by_id,
            )
        )

    SOURCE_DIR.mkdir(parents=True, exist_ok=True)
    write_json(SOURCE_DIR / "problems.json", {"problems": problems})
    write_json(
        SOURCE_DIR / "metadata.json",
        {
            "slug": SLUG,
            "name": BOOK_NAME,
            "type": "pdf",
            "sourceUrl": SOURCE_URL,
            "problemCount": len(problems),
            "generatedAt": now,
            "sourceFiles": [f"strategic_practice_and_homework_{i}.pdf" for i in range(1, 12)],
            "rightsNote": "Official public Harvard Stat 110 course practice/homework PDFs. Keep distribution status reviewed before publishing beyond the local app.",
        },
    )
    upsert_manifest(len(problems), now)
    result = subprocess.run(["node", "scripts/build-problem-catalog.mjs"], cwd=PROJECT_ROOT)
    if result.returncode != 0:
        raise SystemExit(result.returncode)
    print(json.dumps({"source": SLUG, "problems": len(problems)}, indent=2))


def extract_text(pdf_path: Path) -> str:
    doc = fitz.open(pdf_path)
    text = "\n".join(page.get_text("text") for page in doc)
    return normalize_text(text)


def normalize_text(text: str) -> str:
    replacements = {
        "\ufb01": "fi",
        "\ufb02": "fl",
        "\ufb00": "ff",
        "\u2212": "-",
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2018": "'",
        "\u2019": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u21b5": "",
        "\u2028": "\n",
    }
    for old, new in replacements.items():
        text = text.replace(old, new)
    text = re.sub(r"[ \t]+\n", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_document(text: str, set_number: int) -> dict[str, str]:
    strategic_solution_marker = f"Stat 110 Strategic Practice {set_number} Solutions"
    if set_number == 10:
        homework_marker = "Stat 110 Penultimate Homework,"
        homework_solution_marker = "Stat 110 Penultimate Homework Solutions"
    elif set_number == 11:
        homework_marker = "Stat 110 Ultimate Homework,"
        homework_solution_marker = "Stat 110 Ultimate Homework Solutions"
    else:
        homework_marker = f"Stat 110 Homework {set_number},"
        homework_solution_marker = f"Stat 110 Homework {set_number} Solutions"
    a = text.find(strategic_solution_marker)
    b = text.find(homework_marker)
    c = text.find(homework_solution_marker)
    if c < 0:
        c = text.find(homework_marker, b + len(homework_marker))
    if min(a, b, c) < 0:
        raise ValueError(f"Could not find all Stat 110 markers for set {set_number}")
    return {
        "strategic": strip_header(text[:a]),
        "strategic_solutions": strip_header(text[a:b]),
        "homework": strip_header(text[b:c]),
        "homework_solutions": strip_header(text[c:]),
    }


def strip_header(text: str) -> str:
    lines = text.splitlines()
    stripped = []
    for line in lines:
        if re.match(r"^Stat 110 (Strategic Practice|Homework)", line):
            continue
        if "Prof. Joe Blitzstein" in line:
            continue
        stripped.append(line)
    return "\n".join(stripped).strip()


def parse_chunk(text: str, default_section: str) -> list[dict]:
    sections = split_sections(text, default_section)
    entries = []
    for section_index, section_title, body in sections:
        for problem_number, problem_text in split_numbered_items(body):
            cleaned = clean_problem_text(problem_text)
            if not cleaned or len(cleaned) < 10:
                continue
            entries.append(
                {
                    "sectionIndex": section_index,
                    "sectionTitle": section_title,
                    "problemNumber": problem_number,
                    "text": cleaned,
                    "key": item_key(section_index, section_title, problem_number),
                }
            )
    return entries


def split_sections(text: str, default_section: str) -> list[tuple[int, str, str]]:
    matches = list(re.finditer(r"(?m)^\s*(\d{1,2})\s*\n([A-Z][^\n]{2,80})\n", text))
    valid = []
    for match in matches:
        title = canonical_section_title(match.group(2).strip())
        if not title:
            continue
        if re.search(r"^(Stat 110|Prof\.|Fall 2011|[0-9]+$)", title):
            continue
        if re.search(r"Solutions?, Fall|Department of Statistics", title):
            continue
        valid.append(match)
    if not valid:
        return [(1, default_section, text)]

    sections = []
    prefix = text[: valid[0].start()].strip()
    if prefix and re.search(r"(?m)^\s*\d+\.\s", prefix):
        sections.append((0, default_section, prefix))
    for index, match in enumerate(valid):
        start = match.end()
        end = valid[index + 1].start() if index + 1 < len(valid) else len(text)
        title = canonical_section_title(match.group(2).strip()) or " ".join(match.group(2).split())
        sections.append((int(match.group(1)), title, text[start:end]))
    return sections


def canonical_section_title(title: str) -> str | None:
    normalized = " ".join(title.split())
    normalized = normalized.replace("Deﬁnition", "Definition")
    normalized = normalized.replace("Simpson’s", "Simpson's")
    normalized = normalized.replace("Gambler’s", "Gambler's")
    normalized = SECTION_TITLE_ALIASES.get(normalized, normalized)
    if normalized in VALID_STRATEGIC_SECTIONS:
        return normalized
    return None


def split_numbered_items(text: str) -> list[tuple[int, str]]:
    matches = list(re.finditer(r"(?m)^\s*(\d{1,2})\.\s+", text))
    items = []
    for index, match in enumerate(matches):
        start = match.start()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        number = int(match.group(1))
        body = text[start:end].strip()
        if looks_like_page_artifact(body):
            continue
        items.append((number, body))
    return items


def looks_like_page_artifact(text: str) -> bool:
    compact = re.sub(r"\s+", " ", text).strip()
    if re.fullmatch(r"\d+\.", compact):
        return True
    if len(compact) < 8:
        return True
    return False


def clean_problem_text(text: str) -> str:
    lines = []
    for line in text.splitlines():
        clean = line.strip()
        if not clean:
            lines.append("")
            continue
        if re.fullmatch(r"\d+", clean):
            continue
        if clean == "Stat 110":
            continue
        lines.append(clean)
    text = "\n".join(lines)
    text = re.sub(r"(?<!\\)\$(?=\d)", r"\\$", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def build_problems(
    *,
    set_number: int,
    kind: str,
    kind_label: str,
    entries: list[dict],
    solutions: list[dict],
    created_at: str,
    existing_by_id: dict[str, dict],
) -> list[dict]:
    solution_by_key = {entry["key"]: entry for entry in solutions}
    solution_by_sequence = {index: entry for index, entry in enumerate(solutions, start=1)}
    number_counts = {}
    for entry in solutions:
        number_counts[entry["problemNumber"]] = number_counts.get(entry["problemNumber"], 0) + 1
    unique_solution_by_number = {
        entry["problemNumber"]: entry for entry in solutions if number_counts.get(entry["problemNumber"]) == 1
    }

    problems = []
    for sequence, entry in enumerate(entries, start=1):
        solution = (
            solution_by_key.get(entry["key"])
            or unique_solution_by_number.get(entry["problemNumber"])
            or solution_by_sequence.get(sequence)
        )
        source_file = f"strategic_practice_and_homework_{set_number}.pdf"
        problem_id = f"{SLUG}-{kind}-{set_number:02d}-{sequence:03d}"
        section_title = entry["sectionTitle"]
        title = f"{kind_label} {set_number} - {section_title} #{entry['problemNumber']}"
        difficulty = infer_difficulty(set_number, kind, entry["text"], solution["text"] if solution else "")
        problem = {
            "id": problem_id,
            "titleEn": title,
            "titleZh": title,
            "category": "probabilityExpectation",
            "difficulty": difficulty,
            "tags": [
                "Harvard Stat 110",
                "Probability",
                "Strategic Practice" if kind == "strategic" else "Homework",
                section_title,
                difficulty,
            ],
            "classificationReviewed": True,
            "classificationReview": {
                "category": "probabilityExpectation",
                "difficulty": difficulty,
                "logic": "Harvard Stat 110 is a probability course. Difficulty is inferred from set number, homework/strategic role, proof wording, and extracted prompt/solution length.",
                "reviewedBy": "Codex deterministic import",
            },
            "source": SLUG,
            "sourceUrl": SOURCE_URL,
            "sourceType": "course",
            "bookSlug": SLUG,
            "bookName": BOOK_NAME,
            "visibility": "public",
            "promptEn": entry["text"],
            "promptZh": "",
            "answer": "",
            "answerEn": "",
            "answerZh": "",
            "explanation": solution["text"] if solution else "",
            "explanationEn": solution["text"] if solution else "",
            "explanationZh": "",
            "createdAt": created_at,
            "updatedAt": created_at,
            "course": {
                "name": "Statistics 110: Probability",
                "institution": "Harvard University",
                "instructor": "Joe Blitzstein",
                "setNumber": set_number,
                "kind": kind,
                "section": section_title,
                "problemNumber": entry["problemNumber"],
                "sourceFile": source_file,
            },
        }
        preserve_existing_fields(problem, existing_by_id.get(problem_id))
        attach_figure_review(problem)
        attach_media(problem)
        problems.append(problem)
    return problems


def attach_media(problem: dict) -> None:
    specs = MEDIA_SPECS.get(problem["id"], [])
    for spec in specs:
        asset_path = render_media_spec(spec)
        for role in spec["roles"]:
            problem.setdefault(role, [])
            if asset_path not in problem[role]:
                problem[role].append(asset_path)


def render_media_spec(spec: dict) -> str:
    output_path = ASSET_DIR / spec["filename"]
    output_path.parent.mkdir(parents=True, exist_ok=True)
    source_pdf = BOOK_DIR / f"strategic_practice_and_homework_{spec['set']}.pdf"
    if not source_pdf.exists():
        raise FileNotFoundError(source_pdf)
    clip = fitz.Rect(*spec["clip"])
    with fitz.open(source_pdf) as doc:
        page = doc[spec["page"] - 1]
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=clip, alpha=False)
        pix.save(output_path)
    return str(output_path.relative_to(PROJECT_ROOT))


def preserve_existing_fields(problem: dict, existing: dict | None) -> None:
    if not existing:
        return
    for field in ("titleZh", "promptZh", "answerZh", "explanationZh"):
        value = existing.get(field)
        if isinstance(value, str) and value.strip():
            problem[field] = value
    if existing.get("translationReview"):
        problem["translationReview"] = existing["translationReview"]
    if existing.get("translationHash"):
        problem["translationHash"] = existing["translationHash"]
    if existing.get("figureReview"):
        problem["figureReview"] = existing["figureReview"]


def attach_figure_review(problem: dict) -> None:
    review = FIGURE_REVIEW_NOTES.get(problem["id"])
    if review:
        problem["figureReview"] = {**problem.get("figureReview", {}), **review}


def infer_difficulty(set_number: int, kind: str, prompt: str, solution: str) -> str:
    text = f"{prompt}\n{solution}".lower()
    total_length = len(prompt) + len(solution)
    score = 0
    if kind == "homework":
        score += 2
    if set_number >= 9:
        score += 3
    elif set_number >= 7:
        score += 2
    elif set_number >= 4:
        score += 1
    if re.search(r"\b(prove|show that|derive|find the joint|conditional|stationary|markov|marginal|variance)\b", text):
        score += 1
    if total_length > 2600:
        score += 1
    if total_length < 700 and kind == "strategic" and set_number <= 2:
        score -= 1
    if score >= 4:
        return "Hard"
    if score <= 0:
        return "Easy"
    return "Medium"


def item_key(section_index: int, section_title: str, problem_number: int) -> str:
    normalized = re.sub(r"[^a-z0-9]+", "-", section_title.lower()).strip("-")
    return f"{section_index}:{normalized}:{problem_number}"


def upsert_manifest(problem_count: int, imported_at: str) -> None:
    manifest = read_json(MANIFEST_PATH, {"version": 1, "sources": []})
    sources = manifest.setdefault("sources", [])
    entry = next((source for source in sources if source.get("slug") == SLUG), None)
    if entry is None:
        entry = {"slug": SLUG}
        sources.append(entry)
    entry.update(
        {
            "name": BOOK_NAME,
            "type": "pdf",
            "sourceUrl": SOURCE_URL,
            "sourcePdfPath": "有题目的/Harvard Stat 110 概率论战略练习 Statistics 110 Strategic Practice",
            "problemFile": f"{SLUG}/problems.json",
            "problemCount": problem_count,
            "lastImportedAt": imported_at,
            "rightsNote": "Official public Harvard Stat 110 course materials; distribution review required before public redistribution.",
        }
    )
    write_json(MANIFEST_PATH, manifest)


def read_json(path: Path, fallback):
    if not path.exists():
        return fallback
    return json.loads(path.read_text(encoding="utf-8"))


def load_existing_problem_map() -> dict[str, dict]:
    payload = read_json(SOURCE_DIR / "problems.json", {"problems": []})
    problems = payload if isinstance(payload, list) else payload.get("problems", [])
    if not isinstance(problems, list):
        return {}
    return {problem.get("id"): problem for problem in problems if isinstance(problem, dict) and problem.get("id")}


def write_json(path: Path, value) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
