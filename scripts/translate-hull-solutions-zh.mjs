import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { hullSolutionTranslationHash } from "./hull-answer-pack.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/hull-derivatives/problems.json");
const cachePath = path.resolve(projectRoot, options.cache || "artifacts/question-bank-audit/hull-solution-zh-cache.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-audit/hull-solution-zh-translation-report.json");
const model = String(options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
const batchSize = Math.max(1, Math.min(8, Number(options.batchSize || 3)));
const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 1)));
const limit = Number(options.limit || 0);
const start = Number(options.start || 0);
const targetIds = parseIdList(options.ids || options.id || "");
const force = Boolean(options.force);
const apply = Boolean(options.apply);
const rebuild = Boolean(options.rebuild || apply);
const apiKey = process.env.OPENAI_API_KEY || readDotEnvValue("OPENAI_API_KEY");

if (!apiKey) {
  console.error("OPENAI_API_KEY is required. Put it in the environment or .env.");
  process.exit(1);
}
if (!fs.existsSync(sourcePath)) {
  console.error(`Missing Hull source: ${sourcePath}`);
  process.exit(1);
}

const payload = readJson(sourcePath, {});
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const cache = readJson(cachePath, {});
const now = new Date().toISOString();

let deterministicSpreadsheetZh = 0;
for (const problem of problems) {
  if (isHullSpreadsheetAnswer(problem)) {
    applySpreadsheetChinese(problem);
    deterministicSpreadsheetZh += 1;
  }
}

const targets = problems
  .filter((problem) => problem?.source === "hull-derivatives")
  .filter((problem) => isHullPdfAnswer(problem))
  .filter((problem) => targetIds.size ? targetIds.has(problem.id) : needsChineseSolution(problem))
  .filter((problem) => String(problem.explanationEn || problem.explanation || "").trim())
  .slice(start, limit > 0 ? start + limit : undefined);

let translated = 0;
let cached = 0;
let failed = 0;
let completed = 0;
const failedItems = [];

const batches = [];
for (let index = 0; index < targets.length; index += batchSize) {
  batches.push(targets.slice(index, index + batchSize));
}

for (let index = 0; index < batches.length; index += concurrency) {
  const group = batches.slice(index, index + concurrency);
  const jobs = [];

  for (const batch of group) {
    const pending = [];
    for (const problem of batch) {
      const cachedTranslation = cache[problem.id];
      const sourceHash = hullSolutionTranslationHash(problem);
      if (!force && cachedTranslation?.sourceHash === sourceHash && containsCjk(cachedTranslation.explanationZh)) {
        applyTranslation(problem, cachedTranslation);
        cached += 1;
        completed += 1;
      } else {
        pending.push({ problem, sourceHash });
      }
    }
    if (pending.length) jobs.push({ batchSize: batch.length, pending, job: translatePending(pending) });
  }

  if (jobs.length) {
    const results = await Promise.allSettled(jobs.map((job) => job.job));
    results.forEach((result, jobIndex) => {
      completed += jobs[jobIndex].batchSize;
      if (result.status === "fulfilled") {
        translated += result.value.translated;
        failed += result.value.failed;
        failedItems.push(...result.value.failedItems);
      } else {
        failed += jobs[jobIndex].pending.length;
        const message = result.reason?.message || String(result.reason || "unknown error");
        failedItems.push(...jobs[jobIndex].pending.map((item) => ({ id: item.problem.id, titleEn: item.problem.titleEn, message })));
        console.error(`Batch failed near offset ${start + index * batchSize}: ${message}`);
      }
    });
    writeJson(cachePath, cache);
  }

  console.log(`progress ${Math.min(completed, targets.length)}/${targets.length} translated=${translated} cached=${cached} failed=${failed}`);
}

if (apply) {
  writeJson(sourcePath, Array.isArray(payload) ? problems : { ...payload, problems });
  if (rebuild) {
    const result = spawnSync(process.execPath, [path.join(projectRoot, "scripts", "build-problem-catalog.mjs")], {
      cwd: projectRoot,
      stdio: "inherit"
    });
    if (result.status !== 0) process.exit(result.status || 1);
  }
}

const report = {
  generatedAt: now,
  model,
  sourcePath: relativePath(sourcePath),
  cachePath: relativePath(cachePath),
  targets: targets.length,
  translated,
  cached,
  failed,
  deterministicSpreadsheetZh,
  applied: apply,
  failedItems
};
writeJson(reportPath, report);

console.log(JSON.stringify({
  targets: targets.length,
  translated,
  cached,
  failed,
  deterministicSpreadsheetZh,
  applied: apply,
  sourcePath: relativePath(sourcePath),
  cachePath: relativePath(cachePath),
  reportPath: relativePath(reportPath)
}, null, 2));

async function translatePending(pending) {
  let translatedCount = 0;
  let failedCount = 0;
  const failedItemsForBatch = [];
  const translations = await translateBatch(pending.map((item) => item.problem));

  for (const item of pending) {
    const translation = translations.get(item.problem.id);
    const explanationZh = normalizeChineseText(translation?.explanationZh || "");
    if (!explanationZh || !containsCjk(explanationZh)) {
      failedCount += 1;
      failedItemsForBatch.push({
        id: item.problem.id,
        titleEn: item.problem.titleEn,
        message: "Missing or non-Chinese explanationZh in translation response."
      });
      continue;
    }

    const cacheEntry = {
      id: item.problem.id,
      titleEn: item.problem.titleEn || "",
      answerZh: "见下方官方详解。",
      explanationZh,
      sourceHash: item.sourceHash,
      model,
      translatedAt: new Date().toISOString()
    };
    cache[item.problem.id] = cacheEntry;
    applyTranslation(item.problem, cacheEntry);
    translatedCount += 1;
  }
  return { translated: translatedCount, failed: failedCount, failedItems: failedItemsForBatch };
}

async function translateBatch(batch) {
  const items = batch.map((problem) => ({
    id: problem.id,
    titleEn: problem.titleEn || "",
    titleZh: problem.titleZh || "",
    promptEn: truncateForContext(problem.promptEn || "", 700),
    promptZh: truncateForContext(problem.promptZh || "", 700),
    explanationEn: protectSegments(problem.explanationEn || problem.explanation || "")
  }));

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "system",
          content: [
            "You translate official Hull Options, Futures, and Other Derivatives worked solutions into natural Simplified Chinese.",
            "Translate explanationEn into explanationZh completely; do not summarize, omit steps, or add new solution steps.",
            "Preserve numeric values, units, equations, variables, option notation, Greek-letter names, table labels, figure references, DerivaGem, Excel, URLs, and placeholder tokens exactly when present.",
            "Use clear Chinese for quant finance interview study. Keep paragraph breaks readable.",
            "Return only valid JSON with shape {\"items\":[{\"id\":\"...\",\"explanationZh\":\"...\"}]}."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({ items })
        }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }

  const text = extractResponseText(data);
  const json = parseJsonFromText(text);
  const responseItems = Array.isArray(json.items) ? json.items : [];
  return new Map(responseItems.map((item) => [String(item.id || ""), item]));
}

function isHullPdfAnswer(problem) {
  return problem?.answerSource?.type === "hull-answer-pack-pdf";
}

function isHullSpreadsheetAnswer(problem) {
  return problem?.answerSource?.type === "hull-answer-pack-spreadsheet";
}

function needsChineseSolution(problem) {
  const explanationEn = String(problem.explanationEn || problem.explanation || "").trim();
  const explanationZh = String(problem.explanationZh || "").trim();
  if (!explanationEn) return false;
  if (!explanationZh) return true;
  if (!containsCjk(explanationZh) && /[A-Za-z]{3,}/.test(explanationZh)) return true;
  return false;
}

function applySpreadsheetChinese(problem) {
  const fileName = path.basename(String(problem.answerSource?.file || problem.solutionFiles?.[0] || "Excel workbook"));
  problem.answerZh = "见下方官方 Excel 工作簿预览和原始文件。";
  problem.explanationZh = [
    "Hull 官方答案包将本题的详解作为 Excel 工作簿提供。",
    `工作簿：${fileName}`,
    Array.isArray(problem.solutionImages) && problem.solutionImages.length
      ? "下方展示了该工作簿的预览图。"
      : "当前题目数据中没有工作簿预览图。",
    "完整计算表保存在 Hull 书籍答案文件夹中。"
  ].join("\n");
  problem.updatedAt = new Date().toISOString();
}

function applyTranslation(problem, translation) {
  problem.answerZh = translation.answerZh || "见下方官方详解。";
  problem.explanationZh = normalizeChineseText(translation.explanationZh);
  problem.updatedAt = new Date().toISOString();
}

function protectSegments(text) {
  return String(text || "")
    .replace(/```[\s\S]*?```|`[^`]*`|https?:\/\/[^\s)]+/g, (match) => match)
    .trim();
}

function normalizeChineseText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+([，。！？；：、）])/g, "$1")
    .replace(/([（])\s+/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function extractResponseText(data) {
  if (typeof data.output_text === "string") return data.output_text;
  const chunks = [];
  for (const item of data.output || []) {
    for (const content of item.content || []) {
      if (content.text) chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function parseJsonFromText(text) {
  const value = String(text || "").trim();
  try {
    return JSON.parse(value);
  } catch {
    const match = value.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Translation response did not contain JSON.");
    const jsonText = match[0];
    try {
      return JSON.parse(jsonText);
    } catch {
      const repaired = jsonText.replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
      return JSON.parse(repaired);
    }
  }
}

function truncateForContext(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function containsCjk(text) {
  return /[\u3400-\u9fff]/.test(String(text || ""));
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

function readDotEnvValue(name) {
  const filePath = path.join(projectRoot, ".env");
  if (!fs.existsSync(filePath)) return "";
  const pattern = new RegExp(`^${name}=([\\s\\S]*)$`);
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(pattern);
    if (!match) continue;
    return match[1].trim().replace(/^["']|["']$/g, "");
  }
  return "";
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

function parseIdList(value) {
  return new Set(String(value || "")
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean));
}
