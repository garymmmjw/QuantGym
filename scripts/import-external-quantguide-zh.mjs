import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const inputDir = path.resolve(projectRoot, options.input || "artifacts/external-translation");
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const reportDir = path.resolve(projectRoot, options.reportDir || "artifacts/external-translation");
const apply = Boolean(options.apply);
const rebuild = Boolean(options.rebuild || apply);

if (!fs.existsSync(inputDir)) {
  console.error(`Missing input directory: ${inputDir}`);
  process.exit(1);
}
if (!fs.existsSync(sourcePath)) {
  console.error(`Missing QuantGuide source: ${sourcePath}`);
  process.exit(1);
}

const sourcePayload = readJson(sourcePath, {});
const problems = Array.isArray(sourcePayload) ? sourcePayload : sourcePayload.problems || [];
const quantguideProblems = problems.filter((problem) => problem?.source === "quantguide");
const problemById = new Map(quantguideProblems.map((problem) => [String(problem.id || ""), problem]));
const translationFiles = fs.readdirSync(inputDir)
  .filter((file) => /\.zh\.json$/i.test(file) || /^translated-\d+\.json$/i.test(file))
  .sort()
  .map((file) => path.join(inputDir, file));

const translations = new Map();
const fileSummaries = [];
const issues = [];

for (const filePath of translationFiles) {
  const summary = { file: relativePath(filePath), items: 0, accepted: 0, issues: 0 };
  let parsed;
  try {
    parsed = parseJsonFile(filePath);
  } catch (error) {
    pushIssue(summary, "error", "invalid_json", "", error.message);
    fileSummaries.push(summary);
    continue;
  }
  const items = Array.isArray(parsed) ? parsed : parsed.items;
  if (!Array.isArray(items)) {
    pushIssue(summary, "error", "missing_items", "", "File does not contain an items array.");
    fileSummaries.push(summary);
    continue;
  }
  summary.items = items.length;
  for (const item of items) {
    const id = String(item?.id || "").trim();
    const titleZh = normalizeChineseText(item?.titleZh || "");
    const promptZh = normalizeChineseText(item?.promptZh || "");
    if (!id) {
      pushIssue(summary, "error", "missing_id", "", "Translation item has no id.");
      continue;
    }
    if (!problemById.has(id)) {
      pushIssue(summary, "error", "unknown_id", id, "Translation id is not present in QuantGuide source.");
      continue;
    }
    if (!titleZh || !promptZh) {
      pushIssue(summary, "error", "missing_translation_field", id, "titleZh or promptZh is empty.");
      continue;
    }
    if (!containsCjk(titleZh) && likelyEnglish(titleZh)) {
      pushIssue(summary, "warning", "title_likely_untranslated", id, "titleZh appears to be English.");
    }
    if (!containsCjk(promptZh) && likelyEnglish(promptZh)) {
      pushIssue(summary, "warning", "prompt_likely_untranslated", id, "promptZh appears to be English.");
    }
    if (translations.has(id)) {
      pushIssue(summary, "warning", "duplicate_id", id, "Duplicate translation id; later file overwrote earlier value.");
    }
    translations.set(id, {
      id,
      titleZh,
      promptZh,
      file: relativePath(filePath)
    });
    summary.accepted += 1;
  }
  fileSummaries.push(summary);
}

let applied = 0;
let skippedAlreadyTranslated = 0;
const remaining = [];

for (const problem of quantguideProblems) {
  const id = String(problem.id || "");
  const translation = translations.get(id);
  if (!translation) {
    if (needsChinesePrompt(problem)) remaining.push(id);
    continue;
  }
  if (!needsChinesePrompt(problem) && !options.force) {
    skippedAlreadyTranslated += 1;
    continue;
  }
  problem.titleZh = translation.titleZh;
  problem.promptZh = translation.promptZh;
  problem.updatedAt = new Date().toISOString();
  applied += 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  inputDir: relativePath(inputDir),
  sourcePath: relativePath(sourcePath),
  translationFileCount: translationFiles.length,
  translationItemCount: [...translations.keys()].length,
  quantguideProblemCount: quantguideProblems.length,
  applied,
  skippedAlreadyTranslated,
  remainingNeedingChinesePrompt: remaining.length,
  apply,
  rebuild,
  fileSummaries,
  issues
};

fs.mkdirSync(reportDir, { recursive: true });
writeJson(path.join(reportDir, "external-translation-import-report.json"), report);
writeCsv(path.join(reportDir, "external-translation-import-issues.csv"), issues);

if (apply) {
  writeJson(sourcePath, Array.isArray(sourcePayload) ? problems : { ...sourcePayload, problems });
  if (rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  translationFiles: report.translationFileCount,
  translationItems: report.translationItemCount,
  quantguideProblems: report.quantguideProblemCount,
  applied: report.applied,
  skippedAlreadyTranslated: report.skippedAlreadyTranslated,
  remainingNeedingChinesePrompt: report.remainingNeedingChinesePrompt,
  issues: report.issues.length,
  apply: report.apply,
  report: relativePath(path.join(reportDir, "external-translation-import-report.json"))
}, null, 2));

function pushIssue(summary, severity, code, id, message) {
  const issue = {
    severity,
    code,
    id,
    file: summary.file,
    message
  };
  issues.push(issue);
  summary.issues += 1;
}

function needsChinesePrompt(problem) {
  const titleEn = String(problem.titleEn || "").trim();
  const titleZh = String(problem.titleZh || "").trim();
  const promptEn = String(problem.promptEn || "").trim();
  const promptZh = String(problem.promptZh || "").trim();
  if (!promptEn) return false;
  if (!promptZh || compact(promptZh) === compact(promptEn)) return true;
  if (!containsCjk(promptZh) && likelyEnglish(promptZh)) return true;
  if (titleEn && (!titleZh || compact(titleZh) === compact(titleEn))) return true;
  return false;
}

function parseJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8").trim();
  try {
    return JSON.parse(raw);
  } catch {
    const withoutFence = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      return JSON.parse(withoutFence);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (!match) throw new Error("No JSON object found.");
      return JSON.parse(match[0]);
    }
  }
}

function normalizeChineseText(text) {
  return String(text || "")
    .replace(/\$\\\$\s+\$(\d)/g, "$\\$$$1")
    .replace(/\$\\\$\s+(\d)/g, "$\\$$$1")
    .replace(/\s+([，。！？；：、）])/g, "$1")
    .replace(/([（])\s+/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function compact(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
}

function likelyEnglish(text) {
  const value = String(text || "");
  const latin = (value.match(/[A-Za-z]{3,}/g) || []).join("").length;
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 20 && latin > cjk * 2;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeCsv(filePath, rows) {
  if (!rows.length) {
    fs.writeFileSync(filePath, "");
    return;
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((header) => csvValue(row[header])).join(","));
  }
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function csvValue(value) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function relativePath(filePath) {
  const rel = path.relative(projectRoot, filePath);
  return rel && !rel.startsWith("..") ? rel : filePath;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index];
    if (!token.startsWith("--")) continue;
    const [rawKey, inlineValue] = token.slice(2).split("=");
    const key = rawKey.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
    if (inlineValue !== undefined) {
      parsed[key] = inlineValue;
      continue;
    }
    const next = args[index + 1];
    if (!next || next.startsWith("--")) parsed[key] = true;
    else {
      parsed[key] = next;
      index += 1;
    }
  }
  return parsed;
}
