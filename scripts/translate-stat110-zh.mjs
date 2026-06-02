import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.resolve(projectRoot, options.source || "data/question-banks/stat110-strategic-practice/problems.json");
const cachePath = path.resolve(projectRoot, options.cache || "artifacts/question-bank-audit/stat110-zh-cache.json");
const reportPath = path.resolve(projectRoot, options.report || "artifacts/question-bank-audit/stat110-zh-translation-report.json");
const model = String(options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
const batchSize = Math.max(1, Math.min(5, Number(options.batchSize || 2)));
const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 2)));
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
  console.error(`Missing Stat110 source: ${sourcePath}`);
  process.exit(1);
}

const payload = readJson(sourcePath, {});
const problems = Array.isArray(payload) ? payload : payload.problems || [];
const cache = readJson(cachePath, {});
const now = new Date().toISOString();

const targets = problems
  .filter((problem) => problem?.source === "stat110-strategic-practice")
  .filter((problem) => targetIds.size ? targetIds.has(problem.id) : needsTranslation(problem))
  .filter((problem) => String(problem.promptEn || "").trim())
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
      const sourceHash = translationHash(problem);
      const cachedTranslation = cache[problem.id];
      if (!force && cachedTranslation?.sourceHash === sourceHash && validTranslation(cachedTranslation)) {
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
    const normalized = normalizeTranslation(item.problem, translation);
    if (!validTranslation(normalized)) {
      failedCount += 1;
      failedItemsForBatch.push({
        id: item.problem.id,
        titleEn: item.problem.titleEn,
        message: "Missing Chinese title/prompt/explanation in translation response."
      });
      continue;
    }

    const cacheEntry = {
      id: item.problem.id,
      titleEn: item.problem.titleEn || "",
      titleZh: normalized.titleZh,
      promptZh: normalized.promptZh,
      answerZh: normalized.answerZh || "见下方官方详解。",
      explanationZh: normalized.explanationZh,
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
  const prepared = batch.map((problem) => protectProblem(problem));
  const items = prepared.map(({ problem, fields }) => ({
    id: problem.id,
    titleEn: fields.titleEn,
    promptEn: fields.promptEn,
    explanationEn: fields.explanationEn
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
            "You translate Harvard Statistics 110 probability practice problems and official worked solutions into natural Simplified Chinese.",
            "Translate titleEn, promptEn, and explanationEn completely; do not summarize, omit repeated problem statements, or add new math.",
            "Preserve placeholder tokens such as __STAT110_SLOT_0__ exactly.",
            "Preserve variable names, event names, distributions, equations, numeric values, URLs, and English proper nouns when they are identifiers.",
            "Use standard Chinese probability terminology: random variable=随机变量, PMF=概率质量函数, PDF=概率密度函数, CDF=分布函数, MGF=矩母函数, conditional=条件, covariance=协方差, Markov chain=马尔可夫链.",
            "Return only valid JSON with shape {\"items\":[{\"id\":\"...\",\"titleZh\":\"...\",\"promptZh\":\"...\",\"answerZh\":\"见下方官方详解。\",\"explanationZh\":\"...\"}]}."
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
  const byId = new Map(responseItems.map((item) => [String(item.id || ""), item]));
  const restored = new Map();
  for (const item of prepared) {
    const translated = byId.get(item.problem.id);
    if (!translated) continue;
    restored.set(item.problem.id, {
      id: item.problem.id,
      titleZh: restoreProtectedSegments(translated.titleZh, item.slots),
      promptZh: restoreProtectedSegments(translated.promptZh, item.slots),
      answerZh: restoreProtectedSegments(translated.answerZh, item.slots),
      explanationZh: restoreProtectedSegments(translated.explanationZh, item.slots)
    });
  }
  return restored;
}

function protectProblem(problem) {
  const slots = [];
  const titleEn = protectSegments(problem.titleEn || "", slots);
  const promptEn = protectSegments(problem.promptEn || "", slots);
  const explanationEn = protectSegments(problem.explanationEn || problem.explanation || "", slots);
  return { problem, slots, fields: { titleEn, promptEn, explanationEn } };
}

function protectSegments(text, slots) {
  const pattern = /```[\s\S]*?```|`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\]|\\\([^)]*\\\)|https?:\/\/[^\s)]+|__[\w-]+__/g;
  return String(text || "").replace(pattern, (match) => {
    const token = `__STAT110_SLOT_${slots.length}__`;
    slots.push(match);
    return token;
  });
}

function restoreProtectedSegments(text, slots = []) {
  return String(text || "").replace(/__STAT110_SLOT_(\d+)__/g, (_, index) => slots[Number(index)] || `__STAT110_SLOT_${index}__`);
}

function normalizeTranslation(problem, translation) {
  return {
    titleZh: normalizeChineseText(translation?.titleZh || ""),
    promptZh: normalizeChineseText(translation?.promptZh || ""),
    answerZh: normalizeChineseText(translation?.answerZh || "见下方官方详解。"),
    explanationZh: normalizeChineseText(translation?.explanationZh || "")
  };
}

function validTranslation(translation) {
  return Boolean(
    containsCjk(translation?.titleZh)
    && containsCjk(translation?.promptZh)
    && containsCjk(translation?.explanationZh)
  );
}

function needsTranslation(problem) {
  const titleEn = String(problem.titleEn || "").trim();
  const titleZh = String(problem.titleZh || "").trim();
  const promptEn = String(problem.promptEn || "").trim();
  const promptZh = String(problem.promptZh || "").trim();
  const explanationEn = String(problem.explanationEn || problem.explanation || "").trim();
  const explanationZh = String(problem.explanationZh || "").trim();
  if (titleEn && (!titleZh || compact(titleZh) === compact(titleEn))) return true;
  if (promptEn && (!promptZh || compact(promptZh) === compact(promptEn) || likelyEnglish(promptZh))) return true;
  if (explanationEn && (!explanationZh || compact(explanationZh) === compact(explanationEn) || likelyEnglish(explanationZh))) return true;
  return false;
}

function applyTranslation(problem, translation) {
  problem.titleZh = translation.titleZh;
  problem.promptZh = translation.promptZh;
  problem.answerZh = translation.answerZh || "见下方官方详解。";
  problem.explanationZh = translation.explanationZh;
  problem.translationReview = {
    status: "machine_translated_pending_spot_check",
    model: translation.model || model,
    translatedAt: translation.translatedAt || new Date().toISOString()
  };
  problem.translationHash = translation.sourceHash || translationHash(problem);
  problem.updatedAt = new Date().toISOString();
}

function translationHash(problem) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({
      titleEn: problem.titleEn || "",
      promptEn: problem.promptEn || "",
      explanationEn: problem.explanationEn || problem.explanation || ""
    }))
    .digest("hex");
}

function normalizeChineseText(text) {
  return String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+([，。！？；：、）】])/g, "$1")
    .replace(/([（【])\s+/g, "$1")
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

function likelyEnglish(text) {
  const value = String(text || "");
  const latin = (value.match(/[A-Za-z]{3,}/g) || []).join("").length;
  const cjk = (value.match(/[\u3400-\u9fff]/g) || []).length;
  return latin > 40 && latin > cjk * 2;
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
