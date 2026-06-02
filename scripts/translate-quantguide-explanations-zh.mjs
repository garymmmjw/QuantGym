import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/quantguide/problems.json");
const cachePath = path.resolve(projectRoot, options.cache || "artifacts/question-bank-audit/quantguide-explanation-zh-cache.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-audit/quantguide-explanation-zh-translation-report.json");
const model = String(options.model || process.env.OPENAI_MODEL || "gpt-5-nano").trim();
const batchSize = Math.max(1, Math.min(12, Number(options.batchSize || 6)));
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
  console.error(`Missing QuantGuide source: ${sourcePath}`);
  process.exit(1);
}

const payload = readJson(sourcePath, {});
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const cache = readJson(cachePath, {});
const targets = problems
  .filter((problem) => problem?.source === "quantguide")
  .filter((problem) => targetIds.size ? targetIds.has(problem.id) : needsChineseExplanation(problem))
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
      const key = cacheKey(problem);
      if (!force && cache[key]) {
        applyTranslation(problem, cache[key]);
        cached += 1;
        completed += 1;
      } else {
        pending.push({ problem, key });
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
        console.error(`Batch failed near offset ${start + (index + jobIndex) * batchSize}: ${message}`);
      }
    });
    writeJson(cachePath, cache);
  }

  console.log(`progress ${Math.min(completed, targets.length)}/${targets.length} translated=${translated} cached=${cached} failed=${failed}`);
}

problems.forEach((problem) => {
  delete problem.__explanationSlots;
});

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
  generatedAt: new Date().toISOString(),
  model,
  sourcePath: relativePath(sourcePath),
  cachePath: relativePath(cachePath),
  targets: targets.length,
  translated,
  cached,
  failed,
  applied: apply,
  failedItems
};
writeJson(reportPath, report);

console.log(JSON.stringify({
  targets: targets.length,
  translated,
  cached,
  failed,
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
    const explanationZh = restoreProtectedSegments(translation?.explanationZh || "", item.problem.__explanationSlots);
    if (!explanationZh || !containsCjk(explanationZh)) {
      failedCount += 1;
      failedItemsForBatch.push({ id: item.problem.id, titleEn: item.problem.titleEn, message: "Missing or non-Chinese explanationZh in translation response." });
      continue;
    }
    cache[item.key] = {
      id: item.problem.id,
      explanationZh,
      model,
      translatedAt: new Date().toISOString()
    };
    applyTranslation(item.problem, cache[item.key]);
    translatedCount += 1;
  }
  return { translated: translatedCount, failed: failedCount, failedItems: failedItemsForBatch };
}

async function translateBatch(batch) {
  const protectedItems = batch.map((problem, itemIndex) => {
    const explanation = protectSegments(problem.explanationEn || problem.explanation || "", itemIndex);
    problem.__explanationSlots = explanation.slots;
    return {
      id: problem.id,
      titleEn: problem.titleEn || "",
      titleZh: problem.titleZh || "",
      promptEn: truncateForContext(problem.promptEn || "", 900),
      promptZh: truncateForContext(problem.promptZh || "", 900),
      answer: problem.answer || "",
      explanationEn: explanation.text
    };
  });

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
            "You translate QuantGuide quant interview explanations into natural Simplified Chinese.",
            "Translate only explanationEn into explanationZh.",
            "Preserve all placeholder tokens like __QG_SLOT_0_0__ exactly.",
            "Preserve LaTeX, math symbols, variables, code identifiers, URLs, and numeric answers exactly.",
            "Do not leave English prose in the translation unless it is a proper noun, ticker, acronym, or required technical term.",
            "Use clear Chinese for quant interview prep.",
            "Return only valid JSON with shape {\"items\":[{\"id\":\"...\",\"explanationZh\":\"...\"}]}."
          ].join(" ")
        },
        {
          role: "user",
          content: JSON.stringify({ items: protectedItems })
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
  const items = Array.isArray(json.items) ? json.items : [];
  return new Map(items.map((item) => [String(item.id || ""), item]));
}

function needsChineseExplanation(problem) {
  const explanationEn = String(problem.explanationEn || problem.explanation || "").trim();
  const explanationZh = String(problem.explanationZh || "").trim();
  if (!explanationEn) return false;
  if (!explanationZh) return true;
  if (!containsCjk(explanationZh) && /[A-Za-z]{3,}/.test(explanationZh)) return true;
  return false;
}

function applyTranslation(problem, translation) {
  if (translation.explanationZh) problem.explanationZh = normalizeChineseText(translation.explanationZh);
  problem.updatedAt = new Date().toISOString();
}

function protectSegments(text, itemIndex) {
  const slots = [];
  const pattern = /```[\s\S]*?```|`[^`]*`|(?<!\\)\$\$[\s\S]*?(?<!\\)\$\$|(?<!\\)\$(?:\\.|[^$\\\n])*(?<!\\)\$|\\\[[\s\S]*?\\\]|\\\([^)]*\\\)|https?:\/\/[^\s)]+/g;
  const next = String(text || "").replace(pattern, (match) => {
    const token = `__QG_SLOT_${itemIndex}_${slots.length}__`;
    slots.push(match);
    return token;
  });
  return { text: next, slots };
}

function restoreProtectedSegments(text, slots = []) {
  return String(text || "").replace(/__QG_SLOT_(\d+)_(\d+)__/g, (match, _itemIndex, slotIndex) => slots[Number(slotIndex)] || match);
}

function normalizeChineseText(text) {
  return String(text || "")
    .replace(/\$\\\$\s+\$(\d)/g, "$\\$$$1")
    .replace(/\$\\\$\s+(\d)/g, "$\\$$$1")
    .replace(/\s+([，。！？；：、）])/g, "$1")
    .replace(/([（])\s+/g, "$1")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function cacheKey(problem) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      id: problem.id,
      explanationEn: problem.explanationEn || problem.explanation || ""
    }))
    .digest("hex");
  return `${problem.id}:${hash}`;
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
    return JSON.parse(match[0]);
  }
}

function truncateForContext(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
}

function compact(text) {
  return String(text || "").toLowerCase().replace(/\s+/g, " ").trim();
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
