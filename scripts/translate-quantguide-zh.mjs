import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const sourcePath = path.join(projectRoot, "data", "question-banks", "quantguide", "problems.json");
const cachePath = path.resolve(projectRoot, options.cache || "artifacts/question-bank-audit/quantguide-zh-cache.json");
const model = String(options.model || process.env.OPENAI_MODEL || "gpt-5-nano").trim();
const batchSize = Math.max(1, Math.min(30, Number(options.batchSize || 12)));
const concurrency = Math.max(1, Math.min(5, Number(options.concurrency || 1)));
const limit = Number(options.limit || 0);
const start = Number(options.start || 0);
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
  .filter((problem) => needsChinesePrompt(problem))
  .slice(start, limit > 0 ? start + limit : undefined);

let translated = 0;
let cached = 0;
let failed = 0;
let completed = 0;

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
      if (cache[key]) {
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
      } else {
        failed += jobs[jobIndex].pending.length;
        console.error(`Batch failed near offset ${start + (index + jobIndex) * batchSize}: ${result.reason?.message || result.reason}`);
      }
    });
    writeJson(cachePath, cache);
  }

  console.log(`progress ${Math.min(completed, targets.length)}/${targets.length} translated=${translated} cached=${cached} failed=${failed}`);
}

problems.forEach((problem) => {
  delete problem.__translationSlots;
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

console.log(JSON.stringify({
  targets: targets.length,
  translated,
  cached,
  failed,
  applied: apply,
  sourcePath: relativePath(sourcePath),
  cachePath: relativePath(cachePath)
}, null, 2));

async function translatePending(pending) {
  let translatedCount = 0;
  let failedCount = 0;
  const translations = await translateBatch(pending.map((item) => item.problem));
  for (const item of pending) {
    const translation = translations.get(item.problem.id);
    if (!translation?.titleZh || !translation?.promptZh) {
      failedCount += 1;
      continue;
    }
    cache[item.key] = {
      id: item.problem.id,
      titleZh: restoreProtectedSegments(translation.titleZh, item.problem.__translationSlots),
      promptZh: restoreProtectedSegments(translation.promptZh, item.problem.__translationSlots),
      model,
      translatedAt: new Date().toISOString()
    };
    applyTranslation(item.problem, cache[item.key]);
    translatedCount += 1;
  }
  return { translated: translatedCount, failed: failedCount };
}

async function translateBatch(batch) {
  const protectedItems = batch.map((problem) => {
    const title = protectSegments(problem.titleEn || problem.titleZh || "");
    const prompt = protectSegments(problem.promptEn || problem.promptZh || "");
    problem.__translationSlots = [...title.slots, ...prompt.slots];
    const promptOffset = title.slots.length;
    return {
      id: problem.id,
      titleEn: title.text,
      promptEn: prompt.text.replace(/__QG_SLOT_(\d+)__/g, (_, slot) => `__QG_SLOT_${Number(slot) + promptOffset}__`)
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
            "You translate quant interview question titles and prompts into natural Simplified Chinese.",
            "Preserve all placeholder tokens like __QG_SLOT_0__ exactly.",
            "Preserve company names, variable names, code identifiers, and mathematical notation.",
            "Return only valid JSON with shape {\"items\":[{\"id\":\"...\",\"titleZh\":\"...\",\"promptZh\":\"...\"}]}."
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

function needsChinesePrompt(problem) {
  const titleEn = String(problem.titleEn || "").trim();
  const titleZh = String(problem.titleZh || "").trim();
  const promptEn = String(problem.promptEn || "").trim();
  const promptZh = String(problem.promptZh || "").trim();
  if (!promptEn) return false;
  if (!promptZh || compact(promptZh) === compact(promptEn)) return true;
  if (!containsCjk(promptZh) && /[A-Za-z]{3,}/.test(promptZh)) return true;
  if (titleEn && (!titleZh || compact(titleZh) === compact(titleEn))) return true;
  return false;
}

function applyTranslation(problem, translation) {
  if (translation.titleZh) problem.titleZh = normalizeChineseText(translation.titleZh);
  if (translation.promptZh) problem.promptZh = normalizeChineseText(translation.promptZh);
  problem.updatedAt = new Date().toISOString();
}

function protectSegments(text) {
  const slots = [];
  const pattern = /```[\s\S]*?```|`[^`]*`|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|\\\[[\s\S]*?\\\]|\\\([^)]*\\\)|https?:\/\/[^\s)]+/g;
  const next = String(text || "").replace(pattern, (match) => {
    const token = `__QG_SLOT_${slots.length}__`;
    slots.push(match);
    return token;
  });
  return { text: next, slots };
}

function restoreProtectedSegments(text, slots = []) {
  return String(text || "").replace(/__QG_SLOT_(\d+)__/g, (_, index) => slots[Number(index)] || `__QG_SLOT_${index}__`);
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

function cacheKey(problem) {
  const hash = crypto
    .createHash("sha256")
    .update(JSON.stringify({
      id: problem.id,
      titleEn: problem.titleEn || "",
      promptEn: problem.promptEn || ""
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
