#!/usr/bin/env python3
"""Build the reader-style library catalog and first-page cover thumbnails."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import fitz
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
COVER_DIR = ROOT / "assets" / "library-covers"
JSON_PATH = ROOT / "data" / "library-catalog.json"
JS_PATH = ROOT / "data" / "library-catalog.js"
PRIVATE_ASSETS_PATH = ROOT / "api-server" / "library-assets.json"
COVER_SIZE = (360, 500)


ENTRIES: list[dict[str, Any]] = [
    {
        "id": "green-book",
        "kind": "book",
        "titleZh": "绿皮书",
        "titleEn": "A Practical Guide to Quantitative Finance Interviews",
        "sourceSlug": "green-book",
        "problemCount": 183,
        "category": "Quant Interview",
        "language": "EN + ZH",
        "tags": ["brain-teasers", "probability", "markets"],
        "pdfCandidates": [
            "量化书籍/有题目的/绿皮书 A Practical Guide to Quantitative Finance Interviews/绿皮书-A Practical Guide to Quantitative Finance Interviews.pdf",
        ],
    },
    {
        "id": "yellow-book",
        "kind": "book",
        "titleZh": "黄皮书",
        "titleEn": "150 Most Frequently Asked Questions on Quant Interviews",
        "sourceSlug": "yellow-book",
        "problemCount": 153,
        "category": "Quant Interview",
        "language": "EN + ZH",
        "tags": ["interviews", "probability", "derivatives"],
        "pdfCandidates": [
            "量化书籍/有题目的/黄皮书 150 Most Frequently Asked Questions on Quant Interviews/黄皮书150 Most Frequently Asked Questions on Quant Interviews.pdf",
        ],
    },
    {
        "id": "red-book",
        "kind": "book",
        "titleZh": "红宝书",
        "titleEn": "Quant Job Interview Questions And Answers",
        "sourceSlug": "red-book",
        "problemCount": 242,
        "category": "Quant Interview",
        "language": "EN + ZH",
        "tags": ["interviews", "answers", "case drills"],
        "pdfCandidates": [
            "量化书籍/有题目的/红宝书 Quant Job Interview Questions And Answers/红宝书Quant Job Interview Questions And Answers (2008, CreateSpace) - libgen.li.pdf",
        ],
    },
    {
        "id": "hull-derivatives",
        "kind": "book",
        "titleZh": "Hull 衍生品",
        "titleEn": "Options, Futures, and Other Derivatives",
        "sourceSlug": "hull-derivatives",
        "problemCount": 763,
        "category": "Derivatives",
        "language": "EN + ZH",
        "tags": ["options", "futures", "risk-neutral pricing"],
        "pdfCandidates": [
            "量化书籍/纯textbook/Hull期权期货及其他衍生品 Options Futures and Other Derivatives/option futures and other derivatives 11th.pdf",
        ],
    },
    {
        "id": "stefanica-fe-math",
        "kind": "book",
        "titleZh": "金融工程数学入门",
        "titleEn": "A Primer for the Mathematics of Financial Engineering",
        "sourceSlug": "stefanica-fe-math",
        "problemCount": 35,
        "category": "Financial Math",
        "language": "EN + ZH",
        "tags": ["calculus", "probability", "stochastic basics"],
        "pdfCandidates": [
            "量化书籍/纯textbook/Stefanica金融工程数学入门 A Primer for the Mathematics of Financial Engineering/A Primer For The Mathematics Of Financial Engineering - Stefanica.pdf",
        ],
    },
    {
        "id": "dudeney-puzzles",
        "kind": "book",
        "titleZh": "Dudeney 挑战谜题",
        "titleEn": "Challenging Puzzles",
        "sourceSlug": "dudeney-puzzles",
        "problemCount": 123,
        "category": "Puzzles",
        "language": "EN + ZH",
        "tags": ["logic", "combinatorics", "classic puzzles"],
        "pdfCandidates": [
            "量化书籍/有题目的/Dudeney挑战谜题 Challenging Puzzles/challengingpuzzles.pdf",
        ],
    },
    {
        "id": "linalg-primer",
        "kind": "book",
        "titleZh": "金融工程线性代数入门",
        "titleEn": "A Linear Algebra Primer for Financial Engineering",
        "sourceSlug": "linalg-primer",
        "problemCount": 18,
        "category": "Linear Algebra",
        "language": "EN + ZH",
        "tags": ["vectors", "matrices", "factorization"],
        "pdfCandidates": [
            "量化书籍/纯textbook/金融工程线性代数入门 A Linear Algebra Primer for Financial Engineering/A Linear Algebra Primer for Financial Engineering.pdf",
        ],
    },
    {
        "id": "quantitative-primer",
        "kind": "book",
        "titleZh": "Quantitative Primer",
        "titleEn": "Quantitative Primer",
        "sourceSlug": "quantitative-primer",
        "problemCount": 41,
        "category": "Quant Basics",
        "language": "EN + ZH",
        "tags": ["math drills", "probability", "finance basics"],
        "pdfCandidates": [
            "量化书籍/有题目的/Quantitative Primer/QuantitativePrimer.pdf",
        ],
    },
    {
        "id": "probability-stochastic-10",
        "kind": "book",
        "titleZh": "概率随机分析 10 题",
        "titleEn": "First 10 Questions - Probability Stochastic Calc IQs",
        "sourceSlug": "probability-stochastic-10",
        "problemCount": 10,
        "category": "Probability",
        "language": "EN + ZH",
        "tags": ["stochastic calculus", "probability", "interview"],
        "pdfCandidates": [
            "量化书籍/有题目的/概率随机分析10题 First 10 Questions - Probability Stochastic Calc IQs/First 10 Questions - Probability Stochastic Calc IQs.pdf",
        ],
    },
    {
        "id": "boyd-convex-optimization",
        "kind": "book",
        "titleZh": "凸优化",
        "titleEn": "Convex Optimization",
        "sourceSlug": "boyd-cvxbook-additional-exercises",
        "problemCount": 10,
        "category": "Optimization",
        "language": "EN + ZH",
        "tags": ["convex sets", "duality", "optimization"],
        "pdfCandidates": [
            "量化书籍/纯textbook/凸优化 Convex Optimization/bv_cvxbook.pdf",
        ],
    },
    {
        "id": "probabilitycourse-textbook",
        "kind": "book",
        "titleZh": "概率统计与随机过程",
        "titleEn": "Introduction to Probability, Statistics, and Random Processes",
        "sourceSlug": "probabilitycourse-solved-samples",
        "problemCount": 16,
        "category": "Probability",
        "language": "EN + ZH",
        "tags": ["probability", "statistics", "random processes"],
        "readType": "external",
        "readUrl": "https://www.probabilitycourse.com/",
    },
    {
        "id": "mike-giles-mlmc",
        "kind": "book",
        "titleZh": "多层蒙特卡洛方法",
        "titleEn": "Multilevel Monte Carlo Methods",
        "problemCount": 0,
        "category": "Monte Carlo",
        "language": "EN",
        "tags": ["simulation", "numerical methods", "research notes"],
        "pdfCandidates": [
            "量化书籍/纯textbook/多层蒙特卡洛方法 Multilevel Monte Carlo Methods/mcqmc12_giles.pdf",
        ],
    },
    {
        "id": "market-microstructure",
        "kind": "book",
        "titleZh": "市场微观结构讲义",
        "titleEn": "Market Microstructure Lecture Notes",
        "problemCount": 0,
        "category": "Market Microstructure",
        "language": "EN",
        "tags": ["order books", "liquidity", "trading"],
        "pdfCandidates": [
            "量化书籍/纯textbook/市场微观结构讲义 Market Microstructure Lecture Notes/Microstructure.pdf",
        ],
    },
    {
        "id": "stat110-strategic-practice",
        "kind": "questionSet",
        "titleZh": "Stat 110 战略练习",
        "titleEn": "Statistics 110 Strategic Practice",
        "sourceSlug": "stat110-strategic-practice",
        "problemCount": 184,
        "category": "Probability",
        "language": "EN + ZH",
        "tags": ["Harvard", "practice sheets", "probability"],
        "pdfCandidates": [
            "量化书籍/有题目的/Harvard Stat 110 概率论战略练习 Statistics 110 Strategic Practice/strategic_practice_and_homework_1.pdf",
        ],
    },
    {
        "id": "stanford-msande214-hw3",
        "kind": "questionSet",
        "titleZh": "Stanford MS&E 214 HW3",
        "titleEn": "Financial Optimization Homework 3",
        "sourceSlug": "stanford-msande214-hw3",
        "problemCount": 5,
        "category": "Optimization",
        "language": "EN + ZH",
        "tags": ["Stanford", "homework", "portfolio optimization"],
        "pdfCandidates": [
            "量化书籍/有题目的/Stanford MS&E 214 优化金融讲义 Stanford MS&E 214 Handouts/hw3_files/hw3_files/hw3.pdf",
        ],
    },
    {
        "id": "boyd-cvxbook-additional-exercises",
        "kind": "questionSet",
        "titleZh": "Boyd 凸优化补充题",
        "titleEn": "Convex Optimization Additional Exercises",
        "sourceSlug": "boyd-cvxbook-additional-exercises",
        "problemCount": 10,
        "category": "Optimization",
        "language": "EN + ZH",
        "tags": ["convex optimization", "exercises", "duality"],
        "pdfCandidates": [
            "artifacts/source-research-report/downloads/boyd-convex-optimization/cvxbook_additional_exercises/additional_exercises.pdf",
        ],
    },
    {
        "id": "etheridge-finmath-problem-sheets",
        "kind": "questionSet",
        "titleZh": "Etheridge 金融数学题单",
        "titleEn": "Financial Mathematics Problem Sheets",
        "sourceSlug": "etheridge-finmath-problem-sheets",
        "problemCount": 10,
        "category": "Financial Math",
        "language": "EN + ZH",
        "tags": ["martingales", "Black-Scholes", "problem sheets"],
        "pdfCandidates": [
            "artifacts/source-research-report/downloads/alison-etheridge-finmath/finanq.pdf",
        ],
    },
    {
        "id": "probabilitycourse-solved-samples",
        "kind": "questionSet",
        "titleZh": "ProbabilityCourse 已解析样题",
        "titleEn": "ProbabilityCourse Solved Sample Problems",
        "sourceSlug": "probabilitycourse-solved-samples",
        "problemCount": 16,
        "category": "Probability",
        "language": "EN + ZH",
        "tags": ["worked examples", "statistics", "random processes"],
        "readType": "external",
        "readUrl": "https://www.probabilitycourse.com/",
    },
    {
        "id": "quantguide",
        "kind": "questionSet",
        "titleZh": "QuantGuide 题库",
        "titleEn": "QuantGuide Interview Problems",
        "sourceSlug": "quantguide",
        "problemCount": 1204,
        "category": "Quant Interview",
        "language": "EN + ZH",
        "tags": ["interview bank", "probability", "markets"],
    },
]


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/PingFang.ttc",
        "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
        "/Library/Fonts/Arial Unicode.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size=size, index=1 if bold else 0)
        except Exception:
            continue
    return ImageFont.load_default()


def wrap_text(draw: ImageDraw.ImageDraw, text: str, face: ImageFont.ImageFont, width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for char in text:
        candidate = current + char
        if draw.textbbox((0, 0), candidate, font=face)[2] <= width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = char
    if current:
        lines.append(current)
    return lines


def draw_placeholder(entry: dict[str, Any], target: Path) -> None:
    palette = [
        ("#f5f0e8", "#0f172a", "#2f855a"),
        ("#eef5f7", "#132238", "#b45309"),
        ("#f7f2f8", "#231942", "#0e7490"),
        ("#f4f5ed", "#1f2937", "#9f1239"),
    ]
    bg, ink, accent = palette[abs(hash(entry["id"])) % len(palette)]
    img = Image.new("RGB", COVER_SIZE, bg)
    draw = ImageDraw.Draw(img)
    draw.rectangle((0, 0, COVER_SIZE[0], 18), fill=accent)
    draw.rectangle((32, 56, COVER_SIZE[0] - 32, COVER_SIZE[1] - 48), outline="#d6d3d1", width=2)
    draw.text((46, 84), "QUANTGYM", font=font(18, True), fill=accent)
    y = 140
    title_face = font(34, True)
    for line in wrap_text(draw, entry["titleZh"], title_face, COVER_SIZE[0] - 92)[:4]:
        draw.text((46, y), line, font=title_face, fill=ink)
        y += 44
    y += 8
    sub_face = font(18)
    for line in wrap_text(draw, entry.get("titleEn", ""), sub_face, COVER_SIZE[0] - 92)[:5]:
        draw.text((46, y), line, font=sub_face, fill="#475569")
        y += 26
    pill = "题单" if entry["kind"] == "questionSet" else "书籍"
    draw.rounded_rectangle((46, COVER_SIZE[1] - 104, 132, COVER_SIZE[1] - 66), radius=18, fill=accent)
    draw.text((70, COVER_SIZE[1] - 97), pill, font=font(18, True), fill="#ffffff")
    img.save(target, "WEBP", quality=88)


def render_pdf_cover(pdf_path: Path, target: Path) -> bool:
    try:
        doc = fitz.open(pdf_path)
        if not doc.page_count:
            return False
        page = doc.load_page(0)
        page_rect = page.rect
        scale = min(COVER_SIZE[0] / page_rect.width, COVER_SIZE[1] / page_rect.height) * 2
        pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
        img = Image.frombytes("RGB", (pix.width, pix.height), pix.samples)
        img.thumbnail((COVER_SIZE[0] - 12, COVER_SIZE[1] - 12), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", COVER_SIZE, "#f8fafc")
        x = (COVER_SIZE[0] - img.width) // 2
        y = (COVER_SIZE[1] - img.height) // 2
        canvas.paste(img, (x, y))
        canvas.save(target, "WEBP", quality=88)
        return True
    except Exception as exc:
        print(f"cover fallback for {pdf_path}: {exc}")
        return False


def relative_url(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def enrich_entry(entry: dict[str, Any]) -> dict[str, Any]:
    enriched = {key: value for key, value in entry.items() if key != "pdfCandidates"}
    cover_path = COVER_DIR / f"{entry['id']}.webp"
    pdf_path = None

    for candidate in entry.get("pdfCandidates", []):
        full_path = ROOT / candidate
        if full_path.exists():
            pdf_path = full_path
            break

    if pdf_path:
        enriched["readType"] = "pdf"
        enriched["readAssetId"] = entry["id"]
        if not cover_path.exists() or cover_path.stat().st_mtime < pdf_path.stat().st_mtime:
            if not render_pdf_cover(pdf_path, cover_path):
                draw_placeholder(entry, cover_path)
    else:
        enriched.setdefault("readType", "html" if enriched.get("readUrl") else "none")
        if not cover_path.exists():
            draw_placeholder(entry, cover_path)

    enriched["coverUrl"] = relative_url(cover_path)
    return enriched


def make_private_asset(entry: dict[str, Any]) -> dict[str, Any] | None:
    for candidate in entry.get("pdfCandidates", []):
        full_path = ROOT / candidate
        if full_path.exists():
            return {
                "id": entry["id"],
                "kind": entry["kind"],
                "titleZh": entry.get("titleZh", ""),
                "titleEn": entry.get("titleEn", ""),
                "sourceSlug": entry.get("sourceSlug", ""),
                "path": relative_url(full_path),
                "contentType": "application/pdf",
                "minTier": "registered",
                "visibility": "registered",
            }
    return None


def main() -> None:
    COVER_DIR.mkdir(parents=True, exist_ok=True)
    catalog = [enrich_entry(entry) for entry in ENTRIES]
    private_assets = [asset for entry in ENTRIES if (asset := make_private_asset(entry))]
    JSON_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    JS_PATH.write_text(
        "window.quantLibraryCatalog = "
        + json.dumps(catalog, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    PRIVATE_ASSETS_PATH.write_text(
        json.dumps({"assets": private_assets}, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"wrote {len(catalog)} library entries")
    print(f"private assets: {PRIVATE_ASSETS_PATH.relative_to(ROOT)} ({len(private_assets)})")
    print(f"covers: {COVER_DIR.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
