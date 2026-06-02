#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = PROJECT_ROOT / "量化书籍" / "有题目的" / "黄皮书 150 Most Frequently Asked Questions on Quant Interviews"
PDF_PATH = BOOK_DIR / "黄皮书150 Most Frequently Asked Questions on Quant Interviews.pdf"
TEX_PATHS = [
    BOOK_DIR / "quant_yellow_book.tex",
    BOOK_DIR / "quant_yellow_book_zh.tex",
]
OUTPUT_DIR = PROJECT_ROOT / "assets" / "problem-media" / "yellow-book" / "pdf-extracted"
ASSET_PREFIX = "assets/problem-media/yellow-book/pdf-extracted"

AUTO_IMAGE_RE = re.compile(
    r"\n\n\\begin\{center\}\n% quantgym-auto-image:yellow-book-figure-[^\n]+\n"
    r"\\includegraphics[^\n]+\n\\end\{center\}",
    re.M,
)

FIGURES = {
    "3.1": {
        "page": 141,
        "clip": (0, 42, 304, 205),
        "filename": "figure-3-1-yellow-regions.png",
        "needles": [
            "see Figure 3.1.",
            "见图 3.1。",
        ],
        "comment": "yellow-book-figure-3-1",
    },
    "3.2": {
        "page": 187,
        "clip": (0, 40, 304, 230),
        "filename": "figure-3-2-mulder-escape.png",
        "needles": [
            "see Figure 3.2.",
            "参见图 3.2。",
        ],
        "comment": "yellow-book-figure-3-2",
    },
}


def main() -> None:
    if not PDF_PATH.exists():
        raise FileNotFoundError(PDF_PATH)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image_paths = extract_figures()
    for tex_path in TEX_PATHS:
        insert_images(tex_path, image_paths)

    print(f"extracted figures={len(image_paths)}, output={OUTPUT_DIR}")


def extract_figures() -> dict[str, str]:
    doc = fitz.open(PDF_PATH)
    image_paths: dict[str, str] = {}
    for figure, item in FIGURES.items():
        page = doc[int(item["page"]) - 1]
        rect = fitz.Rect(*item["clip"])
        output_path = OUTPUT_DIR / str(item["filename"])
        pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), clip=rect, alpha=False)
        pix.save(output_path)
        image_paths[figure] = f"{ASSET_PREFIX}/{item['filename']}"
    return image_paths


def insert_images(tex_path: Path, image_paths: dict[str, str]) -> None:
    text = tex_path.read_text(encoding="utf8")
    text = AUTO_IMAGE_RE.sub("", text)

    for figure, asset in image_paths.items():
        item = FIGURES[figure]
        block = (
            "\n\n\\begin{center}\n"
            f"% quantgym-auto-image:{item['comment']}\n"
            f"\\includegraphics[width=0.82\\linewidth]{{{asset}}}\n"
            "\\end{center}"
        )
        for needle in item["needles"]:
            if needle in text:
                text = text.replace(needle, f"{needle}{block}", 1)
                break
        else:
            raise RuntimeError(f"{tex_path} does not contain a reference to Figure {figure}")

    tex_path.write_text(text, encoding="utf8")


if __name__ == "__main__":
    main()
