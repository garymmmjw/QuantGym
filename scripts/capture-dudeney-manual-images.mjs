import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const pdfPath = path.join(projectRoot, "量化书籍", "有题目的", "Dudeney挑战谜题 Challenging Puzzles", "challengingpuzzles.pdf");
const outputDir = path.join(projectRoot, "assets", "problem-media", "dudeney-puzzles");

const crops = [
  { page: 42, file: "dudeney-problem-040-prompt-quilt.png", rect: [32, 56, 316, 279] },
  { page: 46, file: "dudeney-problem-046-prompt-yorkshire-estates.png", rect: [171, 55, 316, 151] },
  { page: 69, file: "dudeney-problem-072-prompt-odd-board.png", rect: [171, 57, 333, 155] },
  { page: 69, file: "dudeney-problem-073-prompt-grand-lama.png", rect: [48, 360, 198, 510] },
  { page: 80, file: "dudeney-problem-084-prompt-new-bishop.png", rect: [176, 55, 318, 226] },
  { page: 84, file: "dudeney-problem-092-prompt-checkmate.png", rect: [100, 65, 247, 219] },
  { page: 85, file: "dudeney-problem-094-prompt-monstrosity.png", rect: [48, 140, 194, 291] },
  { page: 95, file: "dudeney-problem-104-prompt-dice-trick.png", rect: [207, 62, 334, 107] },
  { page: 126, file: "dudeney-problem-035-solution-joiner-dissection.png", rect: [43, 116, 153, 230] },
  { page: 139, file: "dudeney-problem-072-solution-odd-board-cuts.png", rect: [47, 200, 188, 282] },
  { page: 139, file: "dudeney-problem-073-solution-grand-lama.png", rect: [196, 214, 336, 351] },
  { page: 152, file: "dudeney-problem-101-solution-card-frame.png", rect: [50, 124, 151, 224] }
];

if (!fs.existsSync(pdfPath)) {
  throw new Error(`Missing Dudeney PDF: ${pdfPath}`);
}

fs.mkdirSync(outputDir, { recursive: true });

const result = spawnSync("python3", ["-", pdfPath, outputDir, JSON.stringify(crops)], {
  input: String.raw`
import json
import os
import sys

try:
    import fitz
except Exception as exc:
    print(f"PyMuPDF import failed: {exc}", file=sys.stderr)
    raise SystemExit(1)

pdf_path, output_dir, crops_json = sys.argv[1:4]
crops = json.loads(crops_json)
doc = fitz.open(pdf_path)
matrix = fitz.Matrix(2.2, 2.2)

for crop in crops:
    page_index = int(crop["page"]) - 1
    if page_index < 0 or page_index >= doc.page_count:
        print(f"skip page {crop['page']}: out of range", file=sys.stderr)
        continue
    page = doc.load_page(page_index)
    rect = fitz.Rect(*crop["rect"]) & page.rect
    pix = page.get_pixmap(matrix=matrix, clip=rect, alpha=False)
    output = os.path.join(output_dir, crop["file"])
    pix.save(output)
    print(output)
`,
  cwd: projectRoot,
  encoding: "utf8",
  maxBuffer: 1024 * 1024
});

if (result.status !== 0) {
  process.stderr.write(result.stderr || result.stdout);
  process.exit(result.status || 1);
}

process.stdout.write(result.stdout);
