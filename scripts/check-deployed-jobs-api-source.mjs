#!/usr/bin/env node

import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const startedAt = Date.now();
const apiUrl = getArgValue("--api-url") || "https://api.quantgym.app/api/jobs?max=200";
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/354-deployed-jobs-api-source-summary.json";
const failures = [];
const warnings = [];
const parsedApiUrl = parseUrl(apiUrl);

assert(parsedApiUrl?.protocol === "https:", "Deployed jobs API smoke must use HTTPS.");
assert(parsedApiUrl?.hostname === "api.quantgym.app", "Deployed jobs API smoke must target api.quantgym.app by default.");
assert(parsedApiUrl?.pathname === "/api/jobs", "Deployed jobs API smoke must target /api/jobs.");
assert(!parsedApiUrl?.username && !parsedApiUrl?.password, "Deployed jobs API URL must not include embedded credentials.");

let response = {
  statusCode: 0,
  contentType: "",
  bytes: 0,
  payload: {}
};

if (failures.length === 0) {
  try {
    response = await fetchJson(parsedApiUrl, { timeoutMs: 10000, maxBytes: 1024 * 1024 });
  } catch (error) {
    fail(error.message || String(error));
  }
}

const jobs = extractJobsPayload(response.payload).map(normalizeJobItem).filter(Boolean);
const duplicateIds = findDuplicates(jobs.map((job) => job.id));
const invalidUrls = jobs.filter((job) => !isHttpUrl(job.url)).map((job) => job.id);
const invalidPostedAt = jobs.filter((job) => !isValidPostedAt(job.postedAt)).map((job) => job.id);
const defaultedMetadata = jobs.filter((job) => (
  job.company === "Quant Firm"
  || job.title === "Quant Role"
  || job.postedAt === "crawler-ready"
)).map((job) => job.id);

assert(response.statusCode === 200, `Deployed jobs API returned HTTP ${response.statusCode}.`);
assert(String(response.contentType).toLowerCase().includes("application/json"), "Deployed jobs API must return JSON.");
assert(response.payload?.source === "catalog+source", `Deployed jobs API source must be catalog+source, got ${response.payload?.source || "(missing)"}.`);
assert(response.payload?.sourceStatus === "ok", `Deployed jobs API sourceStatus must be ok, got ${response.payload?.sourceStatus || "(missing)"}.`);
assert(jobs.length >= 150, `Deployed jobs API must return the public ATS feed, expected at least 150 jobs and got ${jobs.length}.`);
assert(jobs.some((job) => job.type === "internship"), "Deployed jobs API must include internship roles.");
assert(jobs.some((job) => job.type === "fulltime"), "Deployed jobs API must include fulltime roles.");
assert(duplicateIds.length === 0, `Deployed jobs API contains duplicate ids: ${duplicateIds.join(", ")}`);
assert(invalidUrls.length === 0, `Deployed jobs API contains invalid URLs: ${invalidUrls.join(", ")}`);
assert(invalidPostedAt.length === 0, `Deployed jobs API contains invalid postedAt values: ${invalidPostedAt.join(", ")}`);
assert(defaultedMetadata.length === 0, `Deployed jobs API still contains defaulted source metadata: ${defaultedMetadata.join(", ")}`);
assert(jobs[0]?.id === "hudson-river-trading-1229082", `Deployed jobs API first source job changed unexpectedly: ${jobs[0]?.id || "(missing)"}`);

const summary = {
  id: 354,
  date: "2026-06-19",
  surface: "deployed jobs API source smoke",
  status: failures.length ? "fail" : "pass",
  durationMs: Date.now() - startedAt,
  apiHost: parsedApiUrl?.hostname || "",
  apiPath: parsedApiUrl?.pathname || "",
  statusCode: response.statusCode,
  contentType: response.contentType,
  bytes: response.bytes,
  source: response.payload?.source || "",
  sourceStatus: response.payload?.sourceStatus || "",
  count: jobs.length,
  internships: jobs.filter((job) => job.type === "internship").length,
  fulltime: jobs.filter((job) => job.type === "fulltime").length,
  firstId: jobs[0]?.id || "",
  firstPostedAt: jobs[0]?.postedAt || "",
  checks: {
    apiHttps: parsedApiUrl?.protocol === "https:",
    apiHostProduction: parsedApiUrl?.hostname === "api.quantgym.app",
    apiPathJobs: parsedApiUrl?.pathname === "/api/jobs",
    httpOk: response.statusCode === 200,
    jsonContentType: String(response.contentType).toLowerCase().includes("application/json"),
    sourceMerged: response.payload?.source === "catalog+source",
    sourceStatusOk: response.payload?.sourceStatus === "ok",
    countLooksLikePublicAtsFeed: jobs.length >= 150,
    includesInternshipAndFulltime: jobs.some((job) => job.type === "internship")
      && jobs.some((job) => job.type === "fulltime"),
    uniqueIds: duplicateIds.length === 0,
    validUrls: invalidUrls.length === 0,
    validPostedAt: invalidPostedAt.length === 0,
    realMetadata: defaultedMetadata.length === 0,
    firstSourceJobMatchesStaticFeed: jobs[0]?.id === "hudson-river-trading-1229082"
  },
  failures,
  warnings
};

writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function fetchJson(url, { timeoutMs, maxBytes }) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = https.request(url, {
      method: "GET",
      timeout: timeoutMs,
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantGymDeployedJobsSmoke/0.1"
      }
    }, (res) => {
      const chunks = [];
      let bytes = 0;
      res.on("error", rejectOnce);
      res.on("data", (chunk) => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > maxBytes) {
          rejectOnce(new Error("Deployed jobs API response is too large."));
          res.destroy();
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      res.on("end", () => {
        if (settled) return;
        settled = true;
        const body = Buffer.concat(chunks).toString("utf8");
        try {
          resolve({
            statusCode: res.statusCode || 0,
            contentType: res.headers["content-type"] || "",
            bytes,
            payload: body ? JSON.parse(body) : {}
          });
        } catch (error) {
          reject(new Error(`Deployed jobs API did not return valid JSON: ${error.message}`));
        }
      });
    });
    request.on("timeout", () => {
      rejectOnce(new Error("Deployed jobs API request timed out."));
      request.destroy();
    });
    request.on("error", rejectOnce);
    request.end();

    function rejectOnce(error) {
      if (settled) return;
      settled = true;
      reject(error);
    }
  });
}

function extractJobsPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];
  for (const key of ["jobs", "items", "results", "data"]) {
    const value = payload[key];
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") {
      const nested = extractJobsPayload(value);
      if (nested.length) return nested;
    }
  }
  return [];
}

function normalizeJobItem(raw) {
  if (!raw || typeof raw !== "object") return null;
  return {
    id: clean(raw.id),
    company: clean(raw.company || "Quant Firm") || "Quant Firm",
    title: clean(raw.title || "Quant Role") || "Quant Role",
    type: ["internship", "fulltime"].includes(clean(raw.type).toLowerCase())
      ? clean(raw.type).toLowerCase()
      : "internship",
    url: clean(raw.url),
    postedAt: clean(raw.postedAt || raw.createdAt || "crawler-ready")
  };
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  failures.push(String(message));
}

function clean(value) {
  return String(value || "").trim();
}

function isHttpUrl(value) {
  const url = parseUrl(value);
  return Boolean(url && ["http:", "https:"].includes(url.protocol) && url.hostname);
}

function isValidPostedAt(value) {
  const parsed = Date.parse(clean(value));
  return !Number.isNaN(parsed) && parsed <= Date.now() + 24 * 60 * 60 * 1000;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (!value) continue;
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function writeSummary(summary) {
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}
