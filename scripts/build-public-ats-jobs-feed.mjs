#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const startedAt = Date.now();
const options = {
  sourcesPath: path.resolve(projectRoot, getArgValue("--sources") || "data/jobs-feed-sources.json"),
  outPath: getArgValue("--out"),
  summaryPath: getArgValue("--summary"),
  maxPerSource: parseInteger(getArgValue("--max-per-source"), 40),
  maxTotal: parseInteger(getArgValue("--max-total"), 160),
  timeoutMs: parseInteger(getArgValue("--timeout-ms"), 15000),
  pretty: args.includes("--pretty"),
  strict: args.includes("--strict"),
  dryRun: args.includes("--dry-run")
};

const failures = [];
const warnings = [];

try {
  const sourceConfig = readJson(options.sourcesPath, "jobs feed sources");
  const sources = Array.isArray(sourceConfig.sources) ? sourceConfig.sources : [];
  assert(sources.length > 0, "jobs feed sources must include at least one source");
  const includeRegex = buildKeywordRegex(sourceConfig.includeKeywords || []);
  const excludeRegex = buildKeywordRegex(sourceConfig.excludeKeywords || []);

  const sourceResults = [];
  const jobs = [];
  for (const source of sources) {
    const result = await fetchSourceJobs(source, { includeRegex, excludeRegex });
    sourceResults.push(result.summary);
    jobs.push(...result.jobs.slice(0, options.maxPerSource));
  }

  const normalizedJobs = dedupeJobs(jobs)
    .sort((a, b) => Date.parse(b.postedAt) - Date.parse(a.postedAt))
    .slice(0, options.maxTotal);
  validateGeneratedJobs(normalizedJobs);

  const payload = {
    generatedAt: new Date().toISOString(),
    generatedBy: "scripts/build-public-ats-jobs-feed.mjs",
    source: "public-ats-greenhouse",
    jobs: normalizedJobs
  };
  const output = `${JSON.stringify(payload, null, options.pretty ? 2 : 0)}\n`;
  if (options.outPath && !options.dryRun) {
    const absoluteOutPath = path.resolve(projectRoot, options.outPath);
    fs.mkdirSync(path.dirname(absoluteOutPath), { recursive: true });
    fs.writeFileSync(absoluteOutPath, output);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    sources: sourceResults,
    output: {
      path: options.outPath || "",
      written: Boolean(options.outPath && !options.dryRun),
      count: normalizedJobs.length,
      internships: normalizedJobs.filter((job) => job.type === "internship").length,
      fulltime: normalizedJobs.filter((job) => job.type === "fulltime").length,
      firstId: normalizedJobs[0]?.id || "",
      firstPostedAt: normalizedJobs[0]?.postedAt || ""
    },
    warnings,
    failures
  };
  writeSummary(summary);
  if (!options.outPath || options.dryRun) process.stdout.write(output);
  process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    warnings,
    failures
  };
  writeSummary(summary);
  process.stderr.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

async function fetchSourceJobs(source, { includeRegex, excludeRegex }) {
  const sourceId = clean(source.id);
  const company = clean(source.company);
  const provider = clean(source.provider || "greenhouse");
  const sourceUrl = clean(source.url) || greenhouseUrl(clean(source.boardToken));
  const summary = {
    id: sourceId,
    provider,
    company,
    status: "pass",
    fetched: 0,
    kept: 0,
    internships: 0,
    fulltime: 0
  };
  try {
    assert(sourceId, "source id is required");
    assert(company, `source ${sourceId} must set company`);
    assert(provider === "greenhouse", `source ${sourceId} uses unsupported provider: ${provider}`);
    assert(isHttpsUrl(sourceUrl), `source ${sourceId} must use an HTTPS URL`);
    const response = await fetchJson(sourceUrl);
    const rawJobs = Array.isArray(response.jobs) ? response.jobs : [];
    summary.fetched = rawJobs.length;
    const jobs = rawJobs
      .map((job) => normalizeGreenhouseJob(job, { sourceId, company, includeRegex, excludeRegex }))
      .filter(Boolean);
    summary.kept = jobs.length;
    summary.internships = jobs.filter((job) => job.type === "internship").length;
    summary.fulltime = jobs.filter((job) => job.type === "fulltime").length;
    if (!jobs.length) warnings.push(`${sourceId} returned no jobs after filtering`);
    return { summary, jobs };
  } catch (error) {
    summary.status = "fail";
    summary.error = error.message || String(error);
    const message = `${sourceId || "unknown source"} failed: ${summary.error}`;
    if (options.strict) fail(message);
    else warnings.push(message);
    return { summary, jobs: [] };
  }
}

function normalizeGreenhouseJob(job, { sourceId, company, includeRegex, excludeRegex }) {
  if (!job || typeof job !== "object") return null;
  const title = clean(job.title).slice(0, 180);
  const url = clean(job.absolute_url);
  const postedAt = normalizePostedAt(job.first_published || job.updated_at);
  const haystack = collectGreenhouseText(job);
  if (!title || !isHttpUrl(url) || !postedAt) return null;
  if (excludeRegex && excludeRegex.test(haystack)) return null;
  if (includeRegex && !includeRegex.test(haystack)) return null;
  const type = inferJobType(haystack);
  const location = clean(job.location?.name || collectOfficeLocations(job).join(" / ") || "Multiple locations").slice(0, 180);
  return {
    id: `${sourceId}-${String(job.id || stableHash(`${company}:${title}:${url}`)).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
    company,
    title,
    type,
    location,
    url,
    postedAt,
    tags: buildTags({ sourceId, provider: "greenhouse", type, text: haystack })
  };
}

function collectGreenhouseText(job) {
  return [
    job.title,
    job.location?.name,
    ...collectOfficeLocations(job),
    ...(Array.isArray(job.departments) ? job.departments.map((item) => item?.name) : []),
    ...(Array.isArray(job.offices) ? job.offices.map((item) => item?.name) : []),
    ...(Array.isArray(job.metadata) ? job.metadata.flatMap((item) => metadataValues(item?.value)) : [])
  ].filter(Boolean).join(" ");
}

function collectOfficeLocations(job) {
  return Array.isArray(job.offices)
    ? job.offices.flatMap((office) => [office?.location, office?.name]).filter(Boolean)
    : [];
}

function metadataValues(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function inferJobType(text) {
  return /intern|internship|co-?op/i.test(text) ? "internship" : "fulltime";
}

function normalizePostedAt(value) {
  const parsed = Date.parse(String(value || ""));
  if (Number.isNaN(parsed)) return "";
  if (parsed > Date.now() + 24 * 60 * 60 * 1000) return "";
  return new Date(parsed).toISOString();
}

function validateGeneratedJobs(jobs) {
  assert(jobs.length > 0, "generated jobs feed is empty");
  assert(jobs.some((job) => job.type === "internship"), "generated jobs feed must include at least one internship");
  assert(jobs.some((job) => job.type === "fulltime"), "generated jobs feed must include at least one fulltime role");
  const ids = new Set();
  for (const job of jobs) {
    assert(!ids.has(job.id), `duplicate generated job id: ${job.id}`);
    ids.add(job.id);
    assert(job.company && job.company !== "Quant Firm", `job ${job.id} is missing a real company`);
    assert(job.title && job.title !== "Quant Role", `job ${job.id} is missing a real title`);
    assert(["internship", "fulltime"].includes(job.type), `job ${job.id} has invalid type ${job.type}`);
    assert(isHttpUrl(job.url), `job ${job.id} has invalid URL`);
    assert(normalizePostedAt(job.postedAt), `job ${job.id} has invalid postedAt`);
  }
}

function dedupeJobs(jobs) {
  const seen = new Set();
  const output = [];
  for (const job of jobs) {
    const key = job.id || `${job.company}:${job.title}:${job.url}`;
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(job);
  }
  return output;
}

function buildTags({ sourceId, provider, type, text }) {
  const tags = new Set([provider, sourceId, type]);
  const keywordTags = [
    ["ai", /\bai\b|machine learning|ml\b/i],
    ["algo", /algo|algorithm/i],
    ["engineering", /engineer|developer|software|systems/i],
    ["research", /research|researcher/i],
    ["trading", /trader|trading|market/i],
    ["quant", /quant/i]
  ];
  for (const [tag, pattern] of keywordTags) {
    if (pattern.test(text)) tags.add(tag);
  }
  return [...tags].slice(0, 12);
}

function buildKeywordRegex(keywords) {
  const terms = (Array.isArray(keywords) ? keywords : [])
    .map((item) => clean(item))
    .filter(Boolean)
    .map(escapeRegex);
  return terms.length ? new RegExp(terms.join("|"), "i") : null;
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantGymJobsFeedBuilder/0.1"
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function greenhouseUrl(boardToken) {
  assert(boardToken, "greenhouse boardToken is required when url is omitted");
  return `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
}

function isHttpsUrl(value) {
  try {
    return new URL(String(value || "")).protocol === "https:";
  } catch {
    return false;
  }
}

function isHttpUrl(value) {
  try {
    return ["http:", "https:"].includes(new URL(String(value || "")).protocol);
  } catch {
    return false;
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function writeSummary(summary) {
  if (!options.summaryPath) return;
  const absoluteSummaryPath = path.resolve(projectRoot, options.summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function parseInteger(value, fallback) {
  if (!value) return fallback;
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : fallback;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fail(message) {
  failures.push(message);
}

function clean(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, 12);
}
