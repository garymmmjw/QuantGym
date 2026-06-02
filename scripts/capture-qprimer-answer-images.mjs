import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const pdfPath = path.join(projectRoot, "量化书籍", "有题目的", "Quantitative Primer", "QuantitativePrimer.pdf");
const outputDir = path.join(projectRoot, "assets", "problem-media", "quantitative-primer");

const crops = [
  { page: 7, file: "qprimer-problem-001-dice-matrix.png", rect: [190, 155, 405, 350] },
  { page: 9, file: "qprimer-problem-002-bivariate-normal-plots.png", rect: [80, 95, 520, 315] },
  { page: 24, file: "qprimer-problem-010-normal-approximation.png", rect: [120, 430, 475, 580] },
  { page: 31, file: "qprimer-problem-015-bayes-square.png", rect: [145, 285, 460, 525] },
  { page: 34, file: "qprimer-problem-017-log-over-x-plot.png", rect: [190, 455, 455, 630] },
  { page: 41, file: "qprimer-problem-024-romeo-juliet-square.png", rect: [80, 400, 510, 655] },
  { page: 43, file: "qprimer-problem-025-adjacency-matrices-1.png", rect: [190, 160, 405, 590] },
  { page: 44, file: "qprimer-problem-025-adjacency-matrices-2.png", rect: [190, 250, 455, 640] },
  { page: 45, file: "qprimer-problem-025-adjacency-matrices-3.png", rect: [160, 90, 485, 315] },
  { page: 49, file: "qprimer-problem-029-measurement-strategy.png", rect: [115, 245, 485, 565] }
];

if (!fs.existsSync(pdfPath)) {
  throw new Error(`Missing Quantitative Primer PDF: ${pdfPath}`);
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
matrix = fitz.Matrix(2, 2)

for crop in crops:
    page_index = int(crop["page"]) - 1
    if page_index < 0 or page_index >= doc.page_count:
        print(f"skip page {crop['page']}: out of range", file=sys.stderr)
        continue
    rect = fitz.Rect(*crop["rect"])
    page = doc.load_page(page_index)
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
