import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import crypto from "node:crypto";

const HULL_BOOK_DIR = path.join("纯textbook", "Hull期权期货及其他衍生品 Options Futures and Other Derivatives");
const ANSWER_DIR = path.join(HULL_BOOK_DIR, "answers", "HullOFOD11e_GE_Answers to End of Chapter Questions");

export function hydrateHullSolutionsFromAnswerPack(problems, { bookRoot, mediaRoot, book, translationCachePath = "" }) {
  const answerDir = path.join(bookRoot, ANSWER_DIR);
  if (!fs.existsSync(answerDir)) {
    console.warn(`Hull answer pack not found: ${answerDir}`);
    return { matchedPdf: 0, matchedSpreadsheet: 0, missing: [] };
  }

  const expectedNumbers = [...new Set(problems.map(hullPracticeNumber).filter(Boolean))];
  const mediaDir = path.join(mediaRoot, book.slug);
  fs.mkdirSync(mediaDir, { recursive: true });

  const payload = extractHullAnswerPack(answerDir, mediaDir, expectedNumbers, book.slug);
  const answerMap = new Map(Object.entries(payload.answers || {}));
  const spreadsheetMap = new Map(Object.entries(payload.spreadsheets || {}));
  const translationCache = readTranslationCache(translationCachePath);
  let matchedPdf = 0;
  let matchedSpreadsheet = 0;
  const missing = [];

  for (const problem of problems) {
    const number = hullPracticeNumber(problem);
    if (!number) continue;

    const answer = answerMap.get(number);
    if (answer?.text || answer?.images?.length) {
      matchedPdf += 1;
      problem.answerEn = "See the official worked solution below.";
      problem.answerZh = "见下方官方详解。";
      problem.answer = problem.answerEn;
      problem.explanationEn = answer.text || `Official worked solution from ${answer.sourcePdf}.`;
      problem.explanationZh = "";
      problem.explanation = problem.explanationEn;
      problem.solutionImages = [
        ...new Set([
          ...(Array.isArray(problem.solutionImages) ? problem.solutionImages : []),
          ...(Array.isArray(answer.images) ? answer.images : [])
        ])
      ];
      problem.answerSource = {
        type: "hull-answer-pack-pdf",
        file: path.join(ANSWER_DIR, answer.sourcePdf),
        pages: answer.pages || []
      };
      problem.answerSourceFiles = [path.join(ANSWER_DIR, answer.sourcePdf)];
      applyCachedSolutionTranslation(problem, translationCache);
      continue;
    }

    const spreadsheet = spreadsheetMap.get(number);
    if (spreadsheet) {
      matchedSpreadsheet += 1;
      problem.answerEn = "See the official Excel workbook for the worked solution.";
      problem.answerZh = "见下方官方 Excel 工作簿预览和原始文件。";
      problem.answer = problem.answerEn;
      problem.explanationEn = [
        "The official Hull answer pack provides this problem's worked solution as an Excel workbook.",
        `Workbook: ${spreadsheet.fileName}`,
        spreadsheet.images?.length ? "A rendered workbook preview is shown below." : "A rendered workbook preview could not be generated in this environment.",
        "Stored in the Hull book answers folder."
      ].join("\n");
      problem.explanationZh = [
        "Hull 官方答案包将本题的详解作为 Excel 工作簿提供。",
        `工作簿：${spreadsheet.fileName}`,
        spreadsheet.images?.length ? "下方展示了该工作簿的预览图。" : "当前环境未能生成工作簿预览图。",
        "完整计算表保存在 Hull 书籍答案文件夹中。"
      ].join("\n");
      problem.explanation = problem.explanationEn;
      problem.solutionImages = [
        ...new Set([
          ...(Array.isArray(problem.solutionImages) ? problem.solutionImages : []),
          ...(Array.isArray(spreadsheet.images) ? spreadsheet.images : [])
        ])
      ];
      problem.solutionFiles = [spreadsheet.relativePath];
      problem.answerSource = {
        type: "hull-answer-pack-spreadsheet",
        file: spreadsheet.relativePath,
        previewImages: spreadsheet.images || []
      };
      problem.answerSourceFiles = [spreadsheet.relativePath];
      applyCachedSolutionTranslation(problem, translationCache);
      continue;
    }

    missing.push(number);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    expectedProblems: expectedNumbers.length,
    matchedPdf,
    matchedSpreadsheet,
    missing,
    pdfAnswersExtracted: Object.keys(payload.answers || {}).length,
    spreadsheetAnswersFound: Object.keys(payload.spreadsheets || {}).length,
    spreadsheetImages: payload.spreadsheetImages || 0,
    extraPdfAnswers: payload.extraPdfAnswers || [],
    renderedPdfImages: payload.renderedImages || 0,
    renderedImages: (payload.renderedImages || 0) + (payload.spreadsheetImages || 0),
    answerDir: ANSWER_DIR
  };
  fs.writeFileSync(path.join(answerDir, "hull_answer_import_report.json"), `${JSON.stringify(report, null, 2)}\n`);

  if (missing.length) {
    console.warn(`Hull answer pack missing ${missing.length} problem(s): ${missing.join(", ")}`);
  }
  console.log(`Hydrated Hull answer pack: ${matchedPdf} PDF solution(s), ${matchedSpreadsheet} spreadsheet solution(s), ${payload.spreadsheetImages || 0} spreadsheet preview image(s).`);

  return report;
}

export function hullSolutionTranslationHash(problem) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      id: problem.id,
      explanationEn: problem.explanationEn || problem.explanation || ""
    }))
    .digest("hex");
}

function readTranslationCache(cachePath) {
  if (!cachePath || !fs.existsSync(cachePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  } catch {
    return {};
  }
}

function applyCachedSolutionTranslation(problem, cache) {
  const cached = cache?.[problem.id];
  if (!cached?.explanationZh || !containsCjk(cached.explanationZh)) return false;
  if (cached.sourceHash && cached.sourceHash !== hullSolutionTranslationHash(problem)) return false;
  problem.explanationZh = cached.explanationZh;
  problem.answerZh = cached.answerZh || problem.answerZh || "见下方官方详解。";
  return true;
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function hullPracticeNumber(problem) {
  return [problem.titleEn, problem.titleZh, problem.promptEn, problem.promptZh]
    .map((value) => String(value || "").match(/(?:Practice|Question|问题)\s*(\d{1,2}\.\d{1,2})/i)?.[1])
    .find(Boolean) || "";
}

function extractHullAnswerPack(answerDir, mediaDir, expectedNumbers, slug) {
  const result = spawnSync("python3", ["-", answerDir, mediaDir, slug, JSON.stringify(expectedNumbers)], {
    input: String.raw`
import json
import os
import re
import sys
from pathlib import Path

try:
    import fitz
except Exception as exc:
    print(json.dumps({"error": f"PyMuPDF import failed: {exc}"}))
    raise SystemExit(0)

try:
    import xlrd
except Exception:
    xlrd = None

try:
    from PIL import Image, ImageDraw, ImageFont
except Exception:
    Image = ImageDraw = ImageFont = None

answer_dir = Path(sys.argv[1])
media_dir = Path(sys.argv[2])
slug = sys.argv[3]
expected_numbers = set(json.loads(sys.argv[4]))
asset_prefix = f"assets/problem-media/{slug}"
media_dir.mkdir(parents=True, exist_ok=True)

symbol_map = {
    "\uf020": " ", "\uf021": "!", "\uf022": '"', "\uf023": "#", "\uf024": "$",
    "\uf025": "%", "\uf026": "&", "\uf027": "'", "\uf028": "(", "\uf029": ")",
    "\uf02a": "*", "\uf02b": "+", "\uf02c": ",", "\uf02d": "-", "\uf02e": ".",
    "\uf02f": "/", "\uf03a": ":", "\uf03b": ";", "\uf03c": "<", "\uf03d": "=",
    "\uf03e": ">", "\uf03f": "?", "\uf044": "Delta", "\uf057": "Omega",
    "\uf061": "alpha", "\uf062": "beta", "\uf063": "chi", "\uf064": "delta",
    "\uf065": "epsilon", "\uf066": "phi", "\uf067": "gamma", "\uf068": "eta",
    "\uf069": "iota", "\uf06a": "varphi", "\uf06b": "kappa", "\uf06c": "lambda",
    "\uf06d": "mu", "\uf06e": "nu", "\uf06f": "omicron", "\uf070": "pi",
    "\uf071": "theta", "\uf072": "rho", "\uf073": "sigma", "\uf074": "tau",
    "\uf075": "upsilon", "\uf076": "omega", "\uf077": "omega", "\uf078": "xi",
    "\uf079": "psi", "\uf07a": "zeta", "\uf0a3": "<=", "\uf0b3": ">=",
    "\uf0b1": "+/-", "\uf0b4": "x", "\uf0d7": "x", "\uf0e5": "sum"
}

def normalize_symbol_text(text):
    value = str(text or "")
    for old, new in symbol_map.items():
        value = value.replace(old, new)
    value = value.replace("\u00ad", "").replace("\x08", " ")
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    value = re.sub(r"[ \t]{2,}", " ", value)
    return value.strip()

def chapter_from_name(path):
    match = re.search(r"Ch(\d{2})", path.name)
    return int(match.group(1)) if match else None

def marker_number(chapter, text):
    bare = str(text or "").strip().rstrip(".")
    if re.fullmatch(rf"{chapter}\.\d{{1,2}}", bare):
        return bare
    if chapter == 5 and bare == "56":
        return "5.6"
    return None

def collect_markers(doc, chapter):
    markers = []
    for page_index, page in enumerate(doc):
        data = page.get_text("dict")
        for block in data.get("blocks", []):
            if block.get("type") != 0:
                continue
            for line in block.get("lines", []):
                spans = line.get("spans", [])
                if not spans:
                    continue
                text = "".join(span.get("text", "") for span in spans).strip()
                number = marker_number(chapter, text)
                if not number:
                    continue
                bold = any("Bold" in span.get("font", "") for span in spans)
                x0 = min(span["bbox"][0] for span in spans)
                size = max(span.get("size", 0) for span in spans)
                if bold and x0 < 110 and size >= 10:
                    markers.append({
                        "number": number,
                        "page": page_index,
                        "y0": line["bbox"][1],
                        "y1": line["bbox"][3],
                    })
    markers.sort(key=lambda item: (item["page"], item["y0"]))
    return markers

def clip_rects(doc, marker, next_marker):
    start_page = marker["page"]
    end_page = next_marker["page"] if next_marker else start_page
    rects = []
    for page_index in range(start_page, end_page + 1):
        page = doc.load_page(page_index)
        page_rect = page.rect
        top = marker["y0"] - 5 if page_index == start_page else 44
        bottom = next_marker["y0"] - 7 if next_marker and page_index == next_marker["page"] else page_rect.height - 44
        top = max(36, top)
        bottom = min(page_rect.height - 36, bottom)
        if bottom - top < 28:
            continue
        rects.append((page_index, fitz.Rect(48, top, page_rect.width - 48, bottom)))
    return rects

def render_clip(doc, number, part, page_index, rect):
    safe_number = number.replace(".", "-")
    out_name = f"hull-answer-{safe_number}-{part:02d}.png"
    out_path = media_dir / out_name
    if not out_path.exists():
        page = doc.load_page(page_index)
        pix = page.get_pixmap(matrix=fitz.Matrix(1.45, 1.45), clip=rect, alpha=False)
        pix.save(out_path)
    return f"{asset_prefix}/{out_name}"

def clean_answer_text(text, number):
    value = normalize_symbol_text(text)
    value = re.sub(r"\$(?=\d)", "USD ", value)
    value = re.sub(r"(^|\n)\\(?=[A-Za-z])", r"\1", value)
    value = re.split(r"\n\s*\d{1,2}\.\d{1,2}\s+\(Excel file\)", value, maxsplit=1)[0]
    if number == "5.6":
        value = re.sub(r"^\s*56\b", "5.6", value)
    value = re.sub(r"^\s*(\d{1,2}\.\d{1,2})\s*\n", r"\1\n", value)
    value = re.sub(r"\n\s*(CHAPTER\s+\d+|Practice Questions|Short Concept Questions)\s*\n", "\n", value, flags=re.I)
    return value.strip()

def column_label(index):
    value = ""
    index += 1
    while index:
        index, rem = divmod(index - 1, 26)
        value = chr(65 + rem) + value
    return value

def safe_file_part(value):
    return re.sub(r"[^A-Za-z0-9._-]+", "-", str(value or "sheet")).strip("-") or "sheet"

def workbook_cell_text(value):
    if value is None:
        return ""
    if isinstance(value, float):
        if abs(value - round(value)) < 1e-9:
            return str(int(round(value)))
        return f"{value:.8g}"
    return normalize_symbol_text(value)

def non_empty_sheet_bounds(sheet):
    rows = []
    cols = []
    for row in range(sheet.nrows):
        for col in range(sheet.ncols):
            if workbook_cell_text(sheet.cell_value(row, col)).strip():
                rows.append(row)
                cols.append(col)
    if not rows:
        return None
    return min(rows), max(rows), min(cols), max(cols)

def choose_indices(indices, head, tail):
    values = sorted(set(indices))
    if len(values) <= head + tail + 1:
        return values
    return values[:head] + [None] + values[-tail:]

def load_table_font(size=13, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Supplemental/Helvetica Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Helvetica.ttf",
        "/Library/Fonts/Arial Bold.ttf" if bold else "/Library/Fonts/Arial.ttf",
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except Exception:
            pass
    return ImageFont.load_default()

def ellipsize(text, max_chars):
    text = str(text or "").replace("\n", " ").strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1].rstrip() + "…"

def render_workbook_sheet_preview(book_name, sheet, number, sheet_index):
    if Image is None or ImageDraw is None or ImageFont is None:
        return None
    bounds = non_empty_sheet_bounds(sheet)
    if not bounds:
        return None

    min_row, max_row, min_col, max_col = bounds
    source_rows = list(range(min_row, max_row + 1))
    source_cols = list(range(min_col, max_col + 1))
    display_rows = choose_indices(source_rows, 64, 16)
    display_cols = choose_indices(source_cols, 14, 6)

    font = load_table_font(13)
    header_font = load_table_font(13, bold=True)
    title_font = load_table_font(17, bold=True)
    meta_font = load_table_font(12)

    col_widths = []
    for col in display_cols:
        if col is None:
            col_widths.append(34)
            continue
        samples = [column_label(col)]
        for row in display_rows:
            if row is None:
                continue
            samples.append(workbook_cell_text(sheet.cell_value(row, col)))
        longest = max((len(str(sample)) for sample in samples), default=4)
        col_widths.append(max(72, min(180, longest * 8 + 18)))

    row_header_width = 58
    row_height = 26
    title_height = 68
    table_header_height = 28
    width = row_header_width + sum(col_widths) + 2
    height = title_height + table_header_height + len(display_rows) * row_height + 2

    image = Image.new("RGB", (width, height), "white")
    draw = ImageDraw.Draw(image)
    grid = "#d7dde6"
    header_bg = "#edf2f7"
    omitted_bg = "#f7f8fb"
    title_color = "#172033"
    muted = "#697386"

    draw.rectangle([0, 0, width, title_height], fill="#f8fafc")
    draw.text((14, 10), f"Hull {number} workbook preview", fill=title_color, font=title_font)
    meta = (
        f"{book_name} · sheet: {sheet.name} · used range "
        f"{column_label(min_col)}{min_row + 1}:{column_label(max_col)}{max_row + 1}"
    )
    draw.text((14, 38), ellipsize(meta, max(40, width // 8)), fill=muted, font=meta_font)

    y = title_height
    draw.rectangle([0, y, width, y + table_header_height], fill=header_bg)
    draw.rectangle([0, y, row_header_width, y + table_header_height], outline=grid)
    x = row_header_width
    for col, col_width in zip(display_cols, col_widths):
        label = "…" if col is None else column_label(col)
        draw.rectangle([x, y, x + col_width, y + table_header_height], outline=grid, fill=header_bg)
        draw.text((x + 6, y + 7), label, fill=title_color, font=header_font)
        x += col_width

    y += table_header_height
    for row in display_rows:
        if row is None:
            draw.rectangle([0, y, width, y + row_height], fill=omitted_bg, outline=grid)
            draw.text((row_header_width + 8, y + 7), "… rows omitted …", fill=muted, font=meta_font)
            y += row_height
            continue

        draw.rectangle([0, y, row_header_width, y + row_height], outline=grid, fill=header_bg)
        draw.text((8, y + 7), str(row + 1), fill=muted, font=meta_font)
        x = row_header_width
        for col, col_width in zip(display_cols, col_widths):
            if col is None:
                draw.rectangle([x, y, x + col_width, y + row_height], outline=grid, fill=omitted_bg)
                draw.text((x + 10, y + 7), "…", fill=muted, font=font)
                x += col_width
                continue
            text = ellipsize(workbook_cell_text(sheet.cell_value(row, col)), max(8, (col_width - 14) // 7))
            draw.rectangle([x, y, x + col_width, y + row_height], outline=grid)
            if text:
                draw.text((x + 6, y + 7), text, fill="#111827", font=font)
            x += col_width
        y += row_height

    safe_number = number.replace(".", "-")
    out_name = f"hull-answer-workbook-{safe_number}-{sheet_index:02d}-{safe_file_part(sheet.name)}.png"
    out_path = media_dir / out_name
    image.save(out_path, optimize=True)
    return f"{asset_prefix}/{out_name}"

def render_workbook_previews(xls_path, number):
    if xlrd is None:
        return [], "xlrd is not installed; workbook preview skipped."
    if Image is None or ImageDraw is None or ImageFont is None:
        return [], "Pillow is not installed; workbook preview skipped."
    previews = []
    try:
        workbook = xlrd.open_workbook(xls_path)
    except Exception as exc:
        return [], f"Could not read workbook: {exc}"
    for index, sheet in enumerate(workbook.sheets(), start=1):
        if non_empty_sheet_bounds(sheet) is None:
            continue
        preview = render_workbook_sheet_preview(xls_path.name, sheet, number, index)
        if preview:
            previews.append(preview)
    return previews, ""

answers = {}
extra_pdf_answers = []
rendered_images = 0

for pdf_path in sorted(answer_dir.glob("HullOFOD11eSolutionsCh*.pdf")):
    chapter = chapter_from_name(pdf_path)
    if not chapter:
        continue
    doc = fitz.open(pdf_path)
    markers = collect_markers(doc, chapter)
    for index, marker in enumerate(markers):
        number = marker["number"]
        next_marker = markers[index + 1] if index + 1 < len(markers) else None
        if number not in expected_numbers:
            extra_pdf_answers.append(number)
            continue
        rects = clip_rects(doc, marker, next_marker)
        text_parts = []
        images = []
        for part, (page_index, rect) in enumerate(rects, start=1):
            page = doc.load_page(page_index)
            text_parts.append(page.get_text("text", clip=rect))
            before = len(images)
            images.append(render_clip(doc, number, part, page_index, rect))
            if len(images) > before:
                rendered_images += 1
        text = clean_answer_text("\n".join(text_parts), number)
        answers[number] = {
            "text": text,
            "sourcePdf": pdf_path.name,
            "pages": sorted(set(page_index + 1 for page_index, _rect in rects)),
            "images": images,
        }

spreadsheets = {}
spreadsheet_images = 0
for xls_path in sorted(answer_dir.glob("*.xls")):
    match = re.search(r"Problem\s+(\d{2})_(\d{2})", xls_path.name)
    if not match:
        continue
    number = f"{int(match.group(1))}.{int(match.group(2))}"
    images, preview_error = render_workbook_previews(xls_path, number)
    spreadsheet_images += len(images)
    spreadsheets[number] = {
        "fileName": xls_path.name,
        "relativePath": str(Path("量化书籍") / Path("纯textbook") / Path("Hull期权期货及其他衍生品 Options Futures and Other Derivatives") / Path("answers") / Path("HullOFOD11e_GE_Answers to End of Chapter Questions") / xls_path.name),
        "images": images,
        "previewError": preview_error
    }

print(json.dumps({
    "answers": answers,
    "spreadsheets": spreadsheets,
    "extraPdfAnswers": sorted(set(extra_pdf_answers), key=lambda value: tuple(int(part) for part in value.split("."))),
    "renderedImages": rendered_images,
    "spreadsheetImages": spreadsheet_images,
}, ensure_ascii=False))
`,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 80
  });

  if (result.status !== 0) {
    throw new Error(`Hull answer pack extraction failed: ${result.stderr || result.stdout}`);
  }
  const payload = JSON.parse(result.stdout || "{}");
  if (payload.error) throw new Error(payload.error);
  return payload;
}
