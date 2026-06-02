#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

import fitz


PROJECT_ROOT = Path(__file__).resolve().parents[1]
BOOK_DIR = PROJECT_ROOT / "量化书籍" / "有题目的" / "绿皮书 A Practical Guide to Quantitative Finance Interviews"
PDF_PATH = BOOK_DIR / "绿皮书-A Practical Guide to Quantitative Finance Interviews.pdf"
TEX_PATHS = [
    BOOK_DIR / "quant_green_book.tex",
    BOOK_DIR / "quant_green_book_zh.tex",
]
OUTPUT_DIR = PROJECT_ROOT / "assets" / "problem-media" / "green-book" / "pdf-extracted"
ASSET_PREFIX = "assets/problem-media/green-book/pdf-extracted"

FIGURE_REF_RE = re.compile(r"Figure\s+([0-9]\s*\.\s*[0-9]+[A-Z]?)", re.I)
FIGURE_ALIASES = {
    "2.4A": "2.4",
    "2.48": "2.4",
    "4.28": "4.2A",
    "4.2B": "4.2A",
}
MANUAL_CLIPS = [
    {
        "problem": 108,
        "scope": "solution",
        "name": "manual-108-random-ants-switch",
        "needle": "Before collision:",
        "top_offset": -22,
        "bottom_offset": 22,
    },
    {
        "problem": 113,
        "scope": "solution",
        "name": "manual-113-table-5-1",
        "needle": "Table 5.1 Player 2's winning probability",
        "top_offset": -125,
        "bottom_offset": 28,
    },
    {
        "problem": 118,
        "scope": "solution",
        "name": "manual-118-coin-sequence-diagram",
        "needle": "P=l/2",
        "top_offset": -26,
        "bottom_offset": 58,
    },
]
AUTO_IMAGE_RE = re.compile(
    r"\n\n\\begin\{center\}\n% quantgym-auto-image:[^\n]+\n"
    r"(?:\\includegraphics[^\n]+\n)+\\end\{center\}",
    re.M,
)


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    figure_refs = collect_tex_figure_refs(TEX_PATHS[0])
    figure_images = extract_figure_images(figure_refs)
    manual_images = extract_manual_images()
    for tex_path in TEX_PATHS:
        apply_images_to_tex(tex_path, figure_refs, figure_images, manual_images)

    linked = sum(len(scopes) for scopes in figure_refs.values())
    print(
        f"extracted figures={len(figure_images)}, manual images={sum(len(v) for v in manual_images.values())}, "
        f"linked problem scopes={linked}, "
        f"output={OUTPUT_DIR}"
    )


def normalize_figure_number(value: str) -> str:
    normalized = re.sub(r"\s+", "", value).replace("..", ".")
    return FIGURE_ALIASES.get(normalized, normalized)


def collect_tex_figure_refs(tex_path: Path) -> dict[int, dict[str, list[str]]]:
    text = tex_path.read_text(encoding="utf8")
    entries = list(problem_entries(text))
    if len(entries) != 183:
        raise RuntimeError(f"{tex_path} has {len(entries)} problem entries; expected 183")

    refs: dict[int, dict[str, list[str]]] = {}
    for problem_index, match in enumerate(entries, start=1):
        prompt_refs = extract_figure_refs(match.group(2))
        solution_refs = extract_figure_refs(match.group(3))
        if prompt_refs:
            refs.setdefault(problem_index, {})["prompt"] = prompt_refs
        if solution_refs:
            refs.setdefault(problem_index, {})["solution"] = solution_refs
    return refs


def extract_figure_refs(text: str) -> list[str]:
    refs: list[str] = []
    for match in FIGURE_REF_RE.finditer(text):
        ref = normalize_figure_number(match.group(1))
        if ref not in refs:
            refs.append(ref)
    return refs


def extract_figure_images(figure_refs: dict[int, dict[str, list[str]]]) -> dict[str, str]:
    required = {
        figure
        for scopes in figure_refs.values()
        for figures in scopes.values()
        for figure in figures
    }
    doc = fitz.open(PDF_PATH)
    captions = find_captions(doc)
    missing = sorted(required - set(captions))
    if missing:
        print(f"missing figure captions: {', '.join(missing)}")

    images: dict[str, str] = {}
    for figure in sorted(required & set(captions), key=figure_sort_key):
        caption = captions[figure]
        page = doc[caption["page_index"]]
        rect = clip_rect_for_caption(page, caption, captions)
        filename = f"figure-{figure.replace('.', '-')}.png"
        output_path = OUTPUT_DIR / filename
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect, alpha=False)
        pix.save(output_path)
        images[figure] = f"{ASSET_PREFIX}/{filename}"
    return images


def extract_manual_images() -> dict[int, dict[str, list[str]]]:
    doc = fitz.open(PDF_PATH)
    images: dict[int, dict[str, list[str]]] = {}
    for item in MANUAL_CLIPS:
        found = find_line(doc, str(item["needle"]))
        if not found:
            print(f"missing manual clip anchor: {item['needle']}")
            continue
        page_index, bbox = found
        page = doc[page_index]
        y0 = float(bbox[1]) + float(item["top_offset"])
        y1 = float(bbox[3]) + float(item["bottom_offset"])
        rect = fitz.Rect(42, max(58, y0), page.rect.width - 42, min(page.rect.height - 36, y1)) & page.rect
        filename = f"{item['name']}.png"
        output_path = OUTPUT_DIR / filename
        pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), clip=rect, alpha=False)
        pix.save(output_path)
        images.setdefault(int(item["problem"]), {}).setdefault(str(item["scope"]), []).append(
            f"{ASSET_PREFIX}/{filename}"
        )
    return images


def find_line(doc: fitz.Document, needle: str) -> tuple[int, tuple[float, float, float, float]] | None:
    for page_index, page in enumerate(doc):
        for block in page.get_text("dict").get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                text = "".join(span.get("text", "") for span in line.get("spans", [])).strip()
                if needle in text:
                    return page_index, tuple(line.get("bbox", [0, 0, 0, 0]))
    return None


def find_captions(doc: fitz.Document) -> dict[str, dict[str, float | int | str]]:
    captions: dict[str, dict[str, float | int | str]] = {}
    for page_index, page in enumerate(doc):
        for block in page.get_text("dict").get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                text = "".join(span.get("text", "") for span in spans).strip()
                match = re.match(r"^Figure\s+([0-9]\s*\.\s*[0-9]+[A-Z]?)\b", text, re.I)
                if not match:
                    continue
                figure = normalize_figure_number(match.group(1))
                if figure in captions:
                    continue
                x0, y0, x1, y1 = line.get("bbox", [0, 0, 0, 0])
                captions[figure] = {
                    "page_index": page_index,
                    "page_number": page_index + 1,
                    "x0": x0,
                    "y0": y0,
                    "x1": x1,
                    "y1": y1,
                    "text": text,
                }
    return captions


def clip_rect_for_caption(
    page: fitz.Page,
    caption: dict[str, float | int | str],
    captions: dict[str, dict[str, float | int | str]],
) -> fitz.Rect:
    page_index = int(caption["page_index"])
    y0 = float(caption["y0"])
    y1 = float(caption["y1"])
    same_page = sorted(
        (item for item in captions.values() if int(item["page_index"]) == page_index),
        key=lambda item: float(item["y0"]),
    )
    previous_caption_y = None
    next_caption_y = None
    for item in same_page:
        item_y = float(item["y0"])
        if item_y < y0:
            previous_caption_y = item_y
        elif item_y > y0 and next_caption_y is None:
            next_caption_y = item_y

    figure = str(next(k for k, v in captions.items() if v is caption))
    height = 230
    if figure in {"2.1", "5.9"}:
        height = 310
    elif figure in {"4.2A", "5.7", "5.8"}:
        height = 260
    elif figure in {"6.2", "6.3", "6.4", "7.2"}:
        height = 250

    top = max(58, y0 - height)
    if previous_caption_y is not None:
        top = max(top, previous_caption_y + 24)
    bottom = min(page.rect.height - 36, y1 + 26)
    if next_caption_y is not None and next_caption_y < bottom:
        bottom = next_caption_y - 10
    if bottom - top < 70:
        top = max(58, y0 - 170)
        bottom = min(page.rect.height - 36, y1 + 26)

    return fitz.Rect(42, top, page.rect.width - 42, bottom) & page.rect


def apply_images_to_tex(
    tex_path: Path,
    figure_refs: dict[int, dict[str, list[str]]],
    figure_images: dict[str, str],
    manual_images: dict[int, dict[str, list[str]]],
) -> None:
    text = ensure_graphicx(remove_existing_auto_images(tex_path.read_text(encoding="utf8")))
    entries = list(problem_entries(text))
    if len(entries) != 183:
        raise RuntimeError(f"{tex_path} has {len(entries)} problem entries; expected 183")

    pieces: list[str] = []
    cursor = 0
    for index, match in enumerate(entries, start=1):
        pieces.append(text[cursor:match.start()])
        title, prompt, solution = match.group(1), match.group(2).strip(), match.group(3).strip()
        prompt = append_image_block(
            prompt,
            images_for_scope(figure_refs, figure_images, manual_images, index, "prompt"),
            index,
            "prompt",
        )
        solution = append_image_block(
            solution,
            images_for_scope(figure_refs, figure_images, manual_images, index, "solution"),
            index,
            "solution",
        )
        pieces.append(
            f"\\subsection{{{title}}}\n\n"
            f"\\begin{{problembox}}\n{prompt}\n\\end{{problembox}}\n\n"
            f"\\solution\n{solution}"
        )
        cursor = match.end()
    pieces.append(text[cursor:])
    tex_path.write_text("".join(pieces), encoding="utf8")


def images_for_scope(
    figure_refs: dict[int, dict[str, list[str]]],
    figure_images: dict[str, str],
    manual_images: dict[int, dict[str, list[str]]],
    problem_index: int,
    scope: str,
) -> list[str]:
    images = [
        figure_images[figure]
        for figure in figure_refs.get(problem_index, {}).get(scope, [])
        if figure in figure_images
    ]
    images.extend(manual_images.get(problem_index, {}).get(scope, []))
    return images


def problem_entries(text: str):
    pattern = re.compile(
        r"\\subsection\{([^}]*)\}\s*\n\s*\\begin\{problembox\}\s*([\s\S]*?)"
        r"\\end\{problembox\}\s*\n\s*\\solution\s*([\s\S]*?)"
        r"(?=\n\\subsection\{|\n\\section\{|\n\\chapter\{|\n\\end\{document\}|$)"
    )
    yield from pattern.finditer(text)


def ensure_graphicx(text: str) -> str:
    if "\\usepackage{graphicx}" in text:
        return text
    return text.replace(
        "\\usepackage{amsmath,amssymb,amsthm,mathtools}",
        "\\usepackage{amsmath,amssymb,amsthm,mathtools}\n\\usepackage{graphicx}",
        1,
    )


def remove_existing_auto_images(text: str) -> str:
    return AUTO_IMAGE_RE.sub("", text)


def append_image_block(content: str, images: list[str], problem: int, scope: str) -> str:
    if not images:
        return content.strip()
    lines = ["", "\\begin{center}", f"% quantgym-auto-image:{problem:03d}:{scope}"]
    lines.extend(f"\\includegraphics[width=0.82\\linewidth]{{{image}}}" for image in images)
    lines.append("\\end{center}")
    return f"{content.strip()}\n" + "\n".join(lines)


def figure_sort_key(value: str) -> tuple[int, int, str]:
    match = re.match(r"^(\d+)\.(\d+)([A-Z]?)$", value)
    if not match:
        return (999, 999, value)
    return (int(match.group(1)), int(match.group(2)), match.group(3))


if __name__ == "__main__":
    main()
