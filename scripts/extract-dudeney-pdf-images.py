#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = PROJECT_ROOT / "量化书籍" / "有题目的" / "Dudeney挑战谜题 Challenging Puzzles"
PDF_PATH = BOOK_DIR / "challengingpuzzles.pdf"
TEX_PATHS = [
    BOOK_DIR / "quant_dudeney_book.tex",
    BOOK_DIR / "quant_dudeney_book_zh.tex",
]
OUTPUT_DIR = PROJECT_ROOT / "assets" / "problem-media" / "dudeney-puzzles" / "pdf-extracted"
ASSET_PREFIX = "assets/problem-media/dudeney-puzzles/pdf-extracted"
SOLUTION_START_PAGE = 115


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    image_map = extract_images()
    for tex_path in TEX_PATHS:
        apply_images_to_tex(tex_path, image_map)
    prompt_count = sum(len(v.get("prompt", [])) for v in image_map.values())
    solution_count = sum(len(v.get("solution", [])) for v in image_map.values())
    print(f"extracted prompt images={prompt_count}, solution images={solution_count}, problems={len(image_map)}")


def extract_images() -> dict[int, dict[str, list[str]]]:
    doc = fitz.open(PDF_PATH)
    image_map: dict[int, dict[str, list[str]]] = {}
    previous_problem: int | None = None

    for page_index, page in enumerate(doc):
        page_number = page_index + 1
        scope = "solution" if page_number >= SOLUTION_START_PAGE else "prompt"
        headings = problem_headings(page)
        if headings:
            previous_problem = headings[-1]["problem"]

        image_blocks = [b for b in page.get_text("dict")["blocks"] if b.get("type") == 1]
        for image_index, block in enumerate(image_blocks, start=1):
            problem = nearest_problem_for_image(block["bbox"], headings, previous_problem)
            if not problem or problem < 1 or problem > 123:
                continue
            rect = fitz.Rect(block["bbox"])
            rect = rect + (-4, -4, 4, 4)
            rect &= page.rect
            if rect.width < 12 or rect.height < 12:
                continue
            filename = f"{problem:03d}-{scope}-p{page_number:03d}-{image_index:02d}.png"
            output_path = OUTPUT_DIR / filename
            pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect, alpha=False)
            pix.save(output_path)
            image_map.setdefault(problem, {}).setdefault(scope, []).append(f"{ASSET_PREFIX}/{filename}")

    return image_map


def problem_headings(page: fitz.Page) -> list[dict[str, float | int]]:
    headings: list[dict[str, float | int]] = []
    for block in page.get_text("dict")["blocks"]:
        if block.get("type") != 0:
            continue
        for line in block.get("lines", []):
            text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
            match = re.match(r"^(\d{1,3})\.\s+[A-Z0-9]", text)
            if not match:
                continue
            problem = int(match.group(1))
            if 1 <= problem <= 123:
                x0, y0, x1, y1 = line["bbox"]
                headings.append({
                    "problem": problem,
                    "x0": x0,
                    "x1": x1,
                    "y0": y0,
                    "y1": y1,
                    "cx": (x0 + x1) / 2,
                })
    headings.sort(key=lambda item: (float(item["y0"]), float(item["x0"])))
    return headings


def nearest_problem_for_image(bbox: tuple[float, float, float, float], headings: list[dict[str, float | int]], fallback: int | None) -> int | None:
    x0, y0, x1, _y1 = bbox
    cx = (x0 + x1) / 2
    candidates = [h for h in headings if float(h["y0"]) <= y0 + 8]
    if not candidates:
        return fallback
    candidates.sort(key=lambda h: (abs(cx - float(h["cx"])) > 95, y0 - float(h["y0"]), abs(cx - float(h["cx"]))))
    return int(candidates[-1]["problem"] if False else candidates[0]["problem"])


def apply_images_to_tex(tex_path: Path, image_map: dict[int, dict[str, list[str]]]) -> None:
    text = tex_path.read_text(encoding="utf8")
    text = ensure_graphicx(remove_existing_auto_images(text))
    entries = list(problem_entries(text))
    if len(entries) != 123:
        raise RuntimeError(f"{tex_path} has {len(entries)} problem entries; expected 123")

    pieces: list[str] = []
    cursor = 0
    for index, match in enumerate(entries, start=1):
        pieces.append(text[cursor:match.start()])
        title, prompt, solution = match.group(1), match.group(2).strip(), match.group(3).strip()
        prompt = append_image_block(prompt, image_map.get(index, {}).get("prompt", []), index, "prompt")
        solution = append_image_block(solution, image_map.get(index, {}).get("solution", []), index, "solution")
        pieces.append(
            f"\\subsection{{{title}}}\n\n"
            f"\\begin{{problembox}}\n{prompt}\n\\end{{problembox}}\n\n"
            f"\\solution\n{solution}"
        )
        cursor = match.end()
    pieces.append(text[cursor:])
    tex_path.write_text("".join(pieces), encoding="utf8")


def problem_entries(text: str):
    pattern = re.compile(
        r"\\subsection\{([^}]*)\}\s*\n\s*\\begin\{problembox\}\s*([\s\S]*?)\\end\{problembox\}\s*\n\s*\\solution\s*([\s\S]*?)(?=\n\\subsection\{|\n\\end\{document\}|$)"
    )
    yield from pattern.finditer(text)


def ensure_graphicx(text: str) -> str:
    if "\\usepackage{graphicx}" in text:
        return text
    return text.replace("\\usepackage{amsmath,amssymb,mathtools}", "\\usepackage{amsmath,amssymb,mathtools}\n\\usepackage{graphicx}", 1)


def remove_existing_auto_images(text: str) -> str:
    return re.sub(
        r"\n\n\\begin\{center\}\n% quantgym-auto-image:[^\n]+\n(?:\\includegraphics[^\n]+\n)+\\end\{center\}",
        "",
        text,
    )


def append_image_block(content: str, images: list[str], problem: int, scope: str) -> str:
    if not images:
        return content.strip()
    lines = ["", "\\begin{center}", f"% quantgym-auto-image:{problem:03d}:{scope}"]
    lines.extend(f"\\includegraphics[width=0.82\\linewidth]{{{image}}}" for image in images)
    lines.append("\\end{center}")
    return f"{content.strip()}\n" + "\n".join(lines)


if __name__ == "__main__":
    main()
