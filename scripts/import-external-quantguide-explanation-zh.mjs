import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const inputDir = path.resolve(projectRoot, options.input || "artifacts/external-translation/quantguide-explanations");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/external-translation/quantguide-explanation-import-report.json");
const issuePath = path.resolve(projectRoot, options.issues || "artifacts/external-translation/quantguide-explanation-import-issues.csv");

const payload = readJson(sourcePath, { problems: [] });
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const byId = new Map(problems
  .filter((problem) => problem?.source === "quantguide")
  .map((problem) => [String(problem.id || ""), problem]));
const translations = readTranslationItems(inputDir);

const report = {
  generatedAt: new Date().toISOString(),
  dryRun: !options.apply,
  input: relativePath(inputDir),
  source: relativePath(sourcePath),
  filesRead: translations.filesRead,
  sourceBatchFilesSkipped: translations.sourceBatchFilesSkipped,
  itemsRead: translations.items.length,
  applied: 0,
  skippedExisting: 0,
  missingProblem: 0,
  invalid: 0
};
const issues = [];
const seen = new Set();
const now = new Date().toISOString();

for (const item of translations.items) {
  const id = String(item.id || "").trim();
  const explanationZh = normalizeExplanation(item.explanationZh);
  if (!id) {
    report.invalid += 1;
    issues.push({ id, code: "missing_id", message: "Translation item has no id." });
    continue;
  }
  if (seen.has(id)) {
    issues.push({ id, code: "duplicate_id", message: "Duplicate translation id; later item ignored." });
    continue;
  }
  seen.add(id);
  const problem = byId.get(id);
  if (!problem) {
    report.missingProblem += 1;
    issues.push({ id, code: "missing_problem", message: "No matching QuantGuide problem exists." });
    continue;
  }
  if (!explanationZh || !containsCjk(explanationZh)) {
    report.invalid += 1;
    issues.push({ id, code: "invalid_explanation_zh", message: "explanationZh is empty or does not contain Chinese." });
    continue;
  }
  if (!options.force && String(problem.explanationZh || "").trim()) {
    report.skippedExisting += 1;
    continue;
  }

  problem.explanationZh = explanationZh;
  problem.updatedAt = now;
  report.applied += 1;
}

if (options.apply) {
  fs.writeFileSync(sourcePath, `${JSON.stringify(payload, null, 2)}\n`);
  if (options.rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
writeCsv(issuePath, issues);
console.log(JSON.stringify({
  dryRun: report.dryRun,
  filesRead: report.filesRead,
  sourceBatchFilesSkipped: report.sourceBatchFilesSkipped,
  itemsRead: report.itemsRead,
  applied: report.applied,
  skippedExisting: report.skippedExisting,
  missingProblem: report.missingProblem,
  invalid: report.invalid,
  issues: relativePath(issuePath),
  report: relativePath(reportPath)
}, null, 2));

function readTranslationItems(dirPath) {
  if (!fs.existsSync(dirPath)) return { filesRead: 0, sourceBatchFilesSkipped: 0, items: [] };
  const files = fs.readdirSync(dirPath)
    .filter((file) => /\.json$/i.test(file) && !/^manifest\.json$/i.test(file))
    .sort();
  const items = [];
  let filesRead = 0;
  let sourceBatchFilesSkipped = 0;
  for (const file of files) {
    const filePath = path.join(dirPath, file);
    let payloadForFile;
    try {
      payloadForFile = JSON.parse(fs.readFileSync(filePath, "utf8"));
    } catch {
      items.push({ id: "", explanationZh: "", _invalidFile: file });
      continue;
    }
    filesRead += 1;
    const fileItems = Array.isArray(payloadForFile) ? payloadForFile : payloadForFile.items;
    if (Array.isArray(fileItems)) {
      const hasExplanationZh = fileItems.some((item) => Object.prototype.hasOwnProperty.call(item || {}, "explanationZh"));
      if (!hasExplanationZh) {
        sourceBatchFilesSkipped += 1;
        continue;
      }
      items.push(...fileItems);
    }
  }
  return { filesRead, sourceBatchFilesSkipped, items };
}

function normalizeExplanation(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function containsCjk(value) {
  return /[\u3400-\u9fff]/.test(String(value || ""));
}

function writeCsv(filePath, rows) {
  const headers = ["id", "code", "message"];
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const lines = [headers.join(",")];
  for (const row of rows) lines.push(headers.map((header) => csvCell(row[header] || "")).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvCell(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--apply") {
      parsed.apply = true;
    } else if (arg === "--rebuild") {
      parsed.rebuild = true;
    } else if (arg === "--force") {
      parsed.force = true;
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2);
      parsed[key] = args[index + 1];
      index += 1;
    }
  }
  return parsed;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function relativePath(filePath) {
  return path.relative(projectRoot, filePath);
}
