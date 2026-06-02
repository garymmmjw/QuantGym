import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
const options = parseArgs(process.argv.slice(2));
const catalogPath = path.resolve(projectRoot, options.catalog || "data/problem-catalog.json");
const outputDir = path.resolve(projectRoot, options.output || "artifacts/llm-question-bank-review");
const cachePath = path.resolve(outputDir, options.cache || "llm-review-cache.json");
const reportPath = path.resolve(outputDir, options.report || "llm-review-report.json");
const jsonlPath = path.resolve(outputDir, options.jsonl || "llm-review-items.jsonl");
const csvPath = path.resolve(outputDir, options.csv || "llm-review-issues.csv");
const model = String(options.model || process.env.OPENAI_MODEL || "gpt-4.1-mini").trim();
const batchSize = Math.max(1, Math.min(8, Number(options.batchSize || 4)));
const concurrency = Math.max(1, Math.min(4, Number(options.concurrency || 1)));
const timeoutMs = Math.max(10_000, Math.min(300_000, Number(options.timeoutMs || 90_000)));
const sampleSize = Number(options.sample || 0);
const seed = Number(options.seed || 20260601);
const limit = Number(options.limit || 0);
const start = Number(options.start || 0);
const targetIds = parseIdList(options.ids || options.id || "");
const targetSources = parseIdList(options.sources || options.source || "");
const force = Boolean(options.force);
const apiKey = process.env.OPENAI_API_KEY || readDotEnvValue("OPENAI_API_KEY");

if (!apiKey) {
  console.error("OPENAI_API_KEY is required. Put it in the environment or .env.");
  process.exit(1);
}

const payload = readJson(catalogPath, { problems: [] });
const allProblems = Array.isArray(payload) ? payload : payload.problems || [];
let candidates = allProblems.filter((problem) => problem?.visibility !== "disabled");
if (targetSources.size) candidates = candidates.filter((problem) => targetSources.has(String(problem.source || "")));
if (targetIds.size) candidates = candidates.filter((problem) => targetIds.has(String(problem.id || "")));
if (sampleSize > 0 && !targetIds.size) candidates = stratifiedSample(candidates, sampleSize, seed);
if (start || limit > 0) candidates = candidates.slice(start, limit > 0 ? start + limit : undefined);

const cache = readJson(cachePath, {});
const reviews = [];
const failures = [];
let cached = 0;
let reviewed = 0;
let failed = 0;
let completed = 0;

const batches = [];
for (let index = 0; index < candidates.length; index += batchSize) {
  batches.push(candidates.slice(index, index + batchSize));
}

for (let index = 0; index < batches.length; index += concurrency) {
  const group = batches.slice(index, index + concurrency);
  const jobs = [];

  for (const batch of group) {
    const pending = [];
    for (const problem of batch) {
      const key = reviewCacheKey(problem);
      if (!force && cache[key]) {
        reviews.push(cache[key]);
        cached += 1;
        completed += 1;
      } else {
        pending.push({ problem, key });
      }
    }
    if (pending.length) jobs.push({ batchSize: batch.length, pending, job: reviewPending(pending) });
  }

  if (jobs.length) {
    const results = await Promise.allSettled(jobs.map((job) => job.job));
    results.forEach((result, jobIndex) => {
      completed += jobs[jobIndex].batchSize;
      if (result.status === "fulfilled") {
        reviewed += result.value.reviewed;
        failed += result.value.failed;
        failures.push(...result.value.failures);
      } else {
        failed += jobs[jobIndex].pending.length;
        const message = result.reason?.message || String(result.reason || "unknown error");
        failures.push(...jobs[jobIndex].pending.map((item) => ({
          id: item.problem.id,
          source: item.problem.source,
          message
        })));
      }
    });
    writeJson(cachePath, cache);
  }

  console.log(`progress ${Math.min(completed, candidates.length)}/${candidates.length} reviewed=${reviewed} cached=${cached} failed=${failed}`);
}

reviews.sort((a, b) => String(a.source).localeCompare(String(b.source)) || String(a.id).localeCompare(String(b.id)));
const issueRows = flattenIssueRows(reviews);
const report = buildReport(reviews, issueRows, failures);

fs.mkdirSync(outputDir, { recursive: true });
writeJson(reportPath, report);
writeJsonl(jsonlPath, reviews);
writeCsv(csvPath, issueRows);

console.log(JSON.stringify({
  model,
  candidates: candidates.length,
  reviewed,
  cached,
  failed,
  issueRows: issueRows.length,
  blockers: issueRows.filter((row) => row.severity === "blocker").length,
  major: issueRows.filter((row) => row.severity === "major").length,
  report: relativePath(reportPath),
  csv: relativePath(csvPath),
  jsonl: relativePath(jsonlPath)
}, null, 2));

async function reviewPending(pending) {
  try {
    return await reviewPendingBatch(pending);
  } catch (error) {
    if (pending.length <= 1) {
      return {
        reviewed: 0,
        failed: 1,
        failures: [{
          id: pending[0]?.problem?.id,
          source: pending[0]?.problem?.source,
          message: error?.message || String(error || "unknown error")
        }]
      };
    }

    let reviewedCount = 0;
    let failedCount = 0;
    const batchFailures = [];
    for (const item of pending) {
      const result = await reviewPending([item]);
      reviewedCount += result.reviewed;
      failedCount += result.failed;
      batchFailures.push(...result.failures);
    }
    return { reviewed: reviewedCount, failed: failedCount, failures: batchFailures };
  }
}

async function reviewPendingBatch(pending) {
  let reviewedCount = 0;
  let failedCount = 0;
  const batchFailures = [];
  const responseMap = await reviewBatch(pending.map((item) => item.problem));
  const missing = [];
  for (const item of pending) {
    const review = normalizeReview(responseMap.get(item.problem.id), item.problem);
    if (!review) {
      missing.push(item);
      continue;
    }
    cache[item.key] = review;
    reviews.push(review);
    reviewedCount += 1;
  }
  if (missing.length && pending.length > 1) {
    for (const item of missing) {
      const result = await reviewPending([item]);
      reviewedCount += result.reviewed;
      failedCount += result.failed;
      batchFailures.push(...result.failures);
    }
  } else {
    for (const item of missing) {
      failedCount += 1;
      batchFailures.push({ id: item.problem.id, source: item.problem.source, message: "Missing review item in LLM response." });
    }
  }
  return { reviewed: reviewedCount, failed: failedCount, failures: batchFailures };
}

async function reviewBatch(batch) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  let response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
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
              "You are a strict but fair bilingual quant question-bank reviewer.",
              "Review each item for: (1) Chinese translation fidelity against English, (2) math/LaTeX/notation preservation, (3) answer/explanation relevance and completeness, (4) image/file reference plausibility, (5) category, difficulty, and tags.",
              "Use severity pass, minor, major, or blocker. Use blocker only for empty/missing/clearly wrong fields. Use major for meaning-changing translation or wrong answer/category. Use minor for wording/style/local small issues.",
              "Do not invent missing source material. If a field is a deliberate workbook preview or image-backed answer, judge it as acceptable when the metadata says so.",
              "Return only valid JSON with shape {\"items\":[{\"id\":\"...\",\"overall\":\"pass|minor|major|blocker\",\"confidence\":0.0,\"issues\":[{\"dimension\":\"translation|math|answer|image|classification|difficulty|tag|other\",\"severity\":\"minor|major|blocker\",\"message\":\"...\",\"suggestedFix\":\"...\"}],\"notes\":\"...\"}]}."
            ].join(" ")
          },
          {
            role: "user",
            content: JSON.stringify({ items: batch.map(reviewPayload) })
          }
        ]
      })
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(`OpenAI API request timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `OpenAI API returned ${response.status}`);
  }
  const text = extractResponseText(data);
  const json = parseJsonFromText(text);
  const items = Array.isArray(json.items) ? json.items : [];
  return new Map(items.map((item) => [String(item.id || ""), item]));
}

function reviewPayload(problem) {
  return {
    id: problem.id,
    source: problem.source,
    titleEn: problem.titleEn || "",
    titleZh: problem.titleZh || "",
    category: problem.category || "",
    difficulty: problem.difficulty || "",
    tags: Array.isArray(problem.tags) ? problem.tags : [],
    promptEn: truncate(problem.promptEn || "", 1200),
    promptZh: truncate(problem.promptZh || "", 1200),
    answerEn: truncate(problem.answerEn || problem.answer || "", 600),
    answerZh: truncate(problem.answerZh || "", 600),
    explanationEn: truncate(problem.explanationEn || problem.explanation || "", 1800),
    explanationZh: truncate(problem.explanationZh || "", 1800),
    promptImages: collectImages(problem, "prompt"),
    solutionImages: collectImages(problem, "solution"),
    solutionFiles: Array.isArray(problem.solutionFiles) ? problem.solutionFiles : [],
    answerSource: problem.answerSource || null
  };
}

function normalizeReview(raw, problem) {
  if (!raw || typeof raw !== "object") return null;
  const issues = Array.isArray(raw.issues) ? raw.issues : [];
  return {
    id: String(problem.id || ""),
    source: String(problem.source || ""),
    titleEn: String(problem.titleEn || ""),
    titleZh: String(problem.titleZh || ""),
    overall: normalizeSeverity(raw.overall, true),
    confidence: Number(raw.confidence || 0),
    issues: issues.map((issue) => ({
      dimension: normalizeDimension(issue.dimension),
      severity: normalizeSeverity(issue.severity),
      message: String(issue.message || "").trim(),
      suggestedFix: String(issue.suggestedFix || "").trim()
    })).filter((issue) => issue.message),
    notes: String(raw.notes || "").trim(),
    reviewedAt: new Date().toISOString(),
    model
  };
}

function normalizeSeverity(value, allowPass = false) {
  const normalized = String(value || "").toLowerCase();
  if (allowPass && normalized === "pass") return "pass";
  if (["minor", "major", "blocker"].includes(normalized)) return normalized;
  return allowPass ? "pass" : "minor";
}

function normalizeDimension(value) {
  const normalized = String(value || "").toLowerCase();
  const allowed = new Set(["translation", "math", "answer", "image", "classification", "difficulty", "tag", "other"]);
  return allowed.has(normalized) ? normalized : "other";
}

function buildReport(reviewItems, issueRows, failureRows) {
  return {
    generatedAt: new Date().toISOString(),
    model,
    catalog: relativePath(catalogPath),
    reviewedProblems: reviewItems.length,
    failures: failureRows.length,
    byOverall: countBy(reviewItems, "overall"),
    bySource: countBySource(reviewItems),
    issues: {
      total: issueRows.length,
      bySeverity: countBy(issueRows, "severity"),
      byDimension: countBy(issueRows, "dimension"),
      bySource: countBy(issueRows, "source")
    },
    failureRows,
    files: {
      items: relativePath(jsonlPath),
      issues: relativePath(csvPath),
      cache: relativePath(cachePath)
    }
  };
}

function flattenIssueRows(reviewItems) {
  const rows = [];
  for (const review of reviewItems) {
    for (const issue of review.issues || []) {
      rows.push({
        source: review.source,
        id: review.id,
        titleEn: review.titleEn,
        titleZh: review.titleZh,
        overall: review.overall,
        dimension: issue.dimension,
        severity: issue.severity,
        confidence: review.confidence,
        message: issue.message,
        suggestedFix: issue.suggestedFix,
        notes: review.notes
      });
    }
  }
  rows.sort((a, b) => severityRank(b.severity) - severityRank(a.severity) || a.source.localeCompare(b.source) || a.id.localeCompare(b.id));
  return rows;
}

function severityRank(value) {
  return ({ blocker: 3, major: 2, minor: 1 })[value] || 0;
}

function countBy(items, key) {
  const counts = {};
  for (const item of items) {
    const value = String(item[key] || "");
    if (!value) continue;
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function countBySource(items) {
  const counts = {};
  for (const item of items) {
    const source = String(item.source || "");
    if (!source) continue;
    counts[source] ||= { reviewed: 0, pass: 0, minor: 0, major: 0, blocker: 0 };
    counts[source].reviewed += 1;
    counts[source][item.overall] = (counts[source][item.overall] || 0) + 1;
  }
  return counts;
}

function collectImages(problem, role) {
  const keys = role === "prompt"
    ? ["image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl", "promptImage", "promptImages"]
    : ["answerImage", "answerImages", "explanationImage", "explanationImages", "solutionImage", "solutionImages"];
  const values = [];
  const push = (value) => {
    if (!value) return;
    if (Array.isArray(value)) return value.forEach(push);
    if (typeof value === "object") return push(value.url || value.src || value.href);
    const text = String(value || "").trim();
    if (text) values.push(text);
  };
  keys.forEach((key) => push(problem[key]));
  return [...new Set(values)].slice(0, 12);
}

function stratifiedSample(problems, size, sampleSeed) {
  const bySource = new Map();
  for (const problem of problems) {
    const source = String(problem.source || "unknown");
    if (!bySource.has(source)) bySource.set(source, []);
    bySource.get(source).push(problem);
  }
  const rng = mulberry32(sampleSeed);
  const result = [];
  const sources = [...bySource.keys()].sort();
  const base = Math.max(1, Math.floor(size / sources.length));
  for (const source of sources) {
    const group = shuffle([...bySource.get(source)], rng);
    result.push(...group.slice(0, Math.min(base, group.length)));
  }
  if (result.length < size) {
    const selected = new Set(result.map((problem) => problem.id));
    const remaining = shuffle(problems.filter((problem) => !selected.has(problem.id)), rng);
    result.push(...remaining.slice(0, size - result.length));
  }
  return result.slice(0, size);
}

function shuffle(values, rng) {
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function mulberry32(seedValue) {
  let value = seedValue >>> 0;
  return function next() {
    value += 0x6D2B79F5;
    let nextValue = value;
    nextValue = Math.imul(nextValue ^ (nextValue >>> 15), nextValue | 1);
    nextValue ^= nextValue + Math.imul(nextValue ^ (nextValue >>> 7), nextValue | 61);
    return ((nextValue ^ (nextValue >>> 14)) >>> 0) / 4294967296;
  };
}

function reviewCacheKey(problem) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(reviewPayload(problem)))
    .digest("hex");
}

function truncate(text, maxLength) {
  const value = String(text || "").trim();
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength)}...`;
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
  const candidates = [value];
  const match = value.match(/\{[\s\S]*\}/);
  if (match && match[0] !== value) candidates.push(match[0]);
  for (const candidate of candidates) {
    try {
      return JSON.parse(candidate);
    } catch {
      try {
        return JSON.parse(repairJsonEscapes(candidate));
      } catch {
        // Try the next candidate.
      }
    }
  }
  throw new Error("LLM review response did not contain parseable JSON.");
}

function repairJsonEscapes(value) {
  return String(value || "").replace(/\\(?!["\\/bfnrtu])/g, "\\\\");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, rows.map((row) => JSON.stringify(row)).join("\n") + "\n");
}

function writeCsv(filePath, rows) {
  const headers = ["source", "id", "titleEn", "titleZh", "overall", "dimension", "severity", "confidence", "message", "suggestedFix", "notes"];
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

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return fallback;
  }
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
