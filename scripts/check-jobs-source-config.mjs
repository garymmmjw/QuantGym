#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import https from "node:https";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const productionMode = args.has("--production");
const liveMode = args.has("--live");
const loadDotEnv = !args.has("--no-dotenv");
const MIN_PRODUCTION_SOURCE_TOKEN_LENGTH = 24;
const DEFAULT_PUBLIC_ATS_JOBS_SOURCE_URL = "https://beta.quantgym.app/data/jobs/public-ats-feed.json";

if (loadDotEnv) loadEnvFromProjectRoot();

const env = process.env;
const config = {
  catalogPath: path.resolve(projectRoot, clean(env.QUANTGYM_JOBS_CATALOG || "data/jobs-catalog.json")),
  sourceUrl: resolveSourceUrl(env.QUANTGYM_JOBS_SOURCE_URL),
  sourceDefaulted: shouldUseDefaultSource(env.QUANTGYM_JOBS_SOURCE_URL),
  sourceToken: clean(env.QUANTGYM_JOBS_SOURCE_TOKEN),
  cacheSeconds: parseInteger(env.QUANTGYM_JOBS_SOURCE_CACHE_SECONDS, 300),
  timeoutSeconds: parseNumber(env.QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS, 5),
  maxBytes: parseInteger(env.QUANTGYM_JOBS_SOURCE_MAX_BYTES, 1024 * 1024)
};

const results = [];
const warnings = [];

const localCatalog = check("local jobs catalog", () => {
  assert(fs.existsSync(config.catalogPath), `Jobs catalog is missing: ${path.relative(projectRoot, config.catalogPath)}`);
  const payload = readJson(config.catalogPath, "jobs catalog");
  const jobs = extractJobsPayload(payload).map(normalizeJobItem).filter(Boolean);
  assert(jobs.length > 0, "Jobs catalog must contain at least one job.");
  assert(jobs.some((job) => job.type === "internship"), "Jobs catalog must include at least one internship.");
  assert(jobs.some((job) => job.type === "fulltime"), "Jobs catalog must include at least one fulltime role.");
  const invalidUrls = jobs.filter((job) => !isHttpUrl(job.url)).map((job) => job.id);
  assert(invalidUrls.length === 0, `Jobs catalog contains invalid URLs: ${invalidUrls.join(", ")}`);
  const duplicateIds = findDuplicates(jobs.map((job) => job.id));
  assert(duplicateIds.length === 0, `Jobs catalog contains duplicate ids: ${duplicateIds.join(", ")}`);
  return {
    path: path.relative(projectRoot, config.catalogPath),
    count: jobs.length,
    internships: jobs.filter((job) => job.type === "internship").length,
    fulltime: jobs.filter((job) => job.type === "fulltime").length,
    firstId: jobs[0]?.id || ""
  };
});

check("source configuration", () => {
  if (!config.sourceUrl) {
    assert(!productionMode, "Production jobs source must set QUANTGYM_JOBS_SOURCE_URL.");
    return { configured: false };
  }
  assertNoPlaceholder("QUANTGYM_JOBS_SOURCE_URL", config.sourceUrl);
  const url = parseHttpUrl(config.sourceUrl, "QUANTGYM_JOBS_SOURCE_URL");
  if (productionMode) {
    assert(url.protocol === "https:", "Production jobs source URL must use HTTPS.");
    assert(!isLocalOrPrivateHost(url.hostname), "Production jobs source URL must not point to localhost, loopback, or a private network address.");
    assertUrlHasNoSensitiveParts("QUANTGYM_JOBS_SOURCE_URL", url);
  }
  if (!config.sourceToken) {
    warnings.push({
      type: "jobs-source-token-missing",
      message: "QUANTGYM_JOBS_SOURCE_TOKEN is optional in the API, but recommended for non-public crawler/vendor feeds."
    });
  } else {
    assertNoPlaceholder("QUANTGYM_JOBS_SOURCE_TOKEN", config.sourceToken);
    if (productionMode) {
      assertStrongProductionValue("QUANTGYM_JOBS_SOURCE_TOKEN", config.sourceToken, MIN_PRODUCTION_SOURCE_TOKEN_LENGTH);
    }
  }
  assertPositiveInteger("QUANTGYM_JOBS_SOURCE_CACHE_SECONDS", config.cacheSeconds);
  assert(config.cacheSeconds >= 30 && config.cacheSeconds <= 3600, "QUANTGYM_JOBS_SOURCE_CACHE_SECONDS should be between 30 and 3600 seconds.");
  assert(config.timeoutSeconds > 0 && config.timeoutSeconds <= 15, "QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS must be between 0 and 15 seconds.");
  assert(Number.isInteger(config.maxBytes) && config.maxBytes >= 4096 && config.maxBytes <= 5 * 1024 * 1024, "QUANTGYM_JOBS_SOURCE_MAX_BYTES must be between 4 KiB and 5 MiB.");
  return {
    configured: true,
    host: url.hostname,
    protocol: url.protocol.replace(":", ""),
    defaulted: config.sourceDefaulted,
    tokenSet: Boolean(config.sourceToken),
    cacheSeconds: config.cacheSeconds,
    timeoutSeconds: config.timeoutSeconds,
    maxBytes: config.maxBytes
  };
});

if (liveMode) {
  await checkAsync("source live fetch", async () => {
    assert(config.sourceUrl, "QUANTGYM_JOBS_SOURCE_URL is required for --live.");
    const url = parseHttpUrl(config.sourceUrl, "QUANTGYM_JOBS_SOURCE_URL");
    const response = await fetchJson(url, {
      token: config.sourceToken,
      timeoutMs: Math.ceil(config.timeoutSeconds * 1000),
      maxBytes: config.maxBytes
    });
    const jobs = extractJobsPayload(response.payload).map(normalizeJobItem).filter(Boolean);
    assert(jobs.length > 0, "Jobs source returned no usable jobs.");
    assert(jobs.some((job) => job.type === "internship"), "Jobs source must include at least one internship role.");
    assert(jobs.some((job) => job.type === "fulltime"), "Jobs source must include at least one fulltime role.");
    const duplicateIds = findDuplicates(jobs.map((job) => job.id));
    assert(duplicateIds.length === 0, `Jobs source contains duplicate ids: ${duplicateIds.join(", ")}`);
    const invalidUrls = jobs.filter((job) => !isHttpUrl(job.url)).map((job) => job.id);
    assert(invalidUrls.length === 0, `Jobs source contains invalid URLs: ${invalidUrls.join(", ")}`);
    const defaultedFields = jobs.filter((job) => (
      job.company === "Quant Firm"
        || job.title === "Quant Role"
        || job.postedAt === "crawler-ready"
    )).map((job) => job.id);
    assert(defaultedFields.length === 0, `Jobs source must provide valid company/title/postedAt fields: ${defaultedFields.join(", ")}`);
    return {
      statusCode: response.statusCode,
      bytes: response.bytes,
      count: jobs.length,
      internships: jobs.filter((job) => job.type === "internship").length,
      fulltime: jobs.filter((job) => job.type === "fulltime").length,
      firstId: jobs[0]?.id || "",
      tokenSent: Boolean(config.sourceToken)
    };
  });
}

const failed = results.filter((item) => item.status === "fail");
const passed = results.filter((item) => item.status === "pass");

console.log(JSON.stringify({
  status: failed.length ? "fail" : "pass",
  mode: productionMode ? "production" : "local",
  live: liveMode,
  passed: passed.length,
  failed: failed.length,
  warnings,
  results
}, null, 2));

if (failed.length) process.exitCode = 1;

function check(name, fn) {
  try {
    const data = fn();
    results.push({ name, status: "pass", data });
    return data;
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
    return null;
  }
}

async function checkAsync(name, fn) {
  try {
    const data = await fn();
    results.push({ name, status: "pass", data });
    return data;
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
    return null;
  }
}

function readJson(file, label) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
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
  const company = clean(raw.company || "Quant Firm").slice(0, 120) || "Quant Firm";
  const title = clean(raw.title || "Quant Role").slice(0, 180) || "Quant Role";
  let id = clean(raw.id).slice(0, 160);
  if (!id) id = `job-${stableHash(`${company}:${title}`)}`;
  let type = clean(raw.type || "internship").toLowerCase();
  if (!["internship", "fulltime"].includes(type)) type = "internship";
  const tags = Array.isArray(raw.tags)
    ? raw.tags.map((item) => clean(item)).filter(Boolean)
    : typeof raw.tags === "string"
      ? raw.tags.split(/[,，#/|]/).map((item) => clean(item)).filter(Boolean)
      : [];
  return {
    id,
    company,
    title,
    type,
    location: clean(raw.location || "Global").slice(0, 180) || "Global",
    url: safeJobUrl(raw.url),
    postedAt: safeJobPostedAt(raw.postedAt || raw.createdAt),
    tags: tags.slice(0, 12)
  };
}

function stableHash(value) {
  let hash = 0;
  for (const char of String(value)) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0").slice(0, 12);
}

function fetchJson(url, { token = "", timeoutMs = 5000, maxBytes = 1024 * 1024 } = {}) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const rejectOnce = (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    };
    const client = url.protocol === "https:" ? https : http;
    const request = client.request(url, {
      method: "GET",
      timeout: timeoutMs,
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantGymJobsReadiness/0.1",
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    }, (response) => {
      const chunks = [];
      let bytes = 0;
      response.on("error", rejectOnce);
      response.on("data", (chunk) => {
        if (settled) return;
        bytes += chunk.length;
        if (bytes > maxBytes) {
          rejectOnce(new Error("Jobs source payload is too large."));
          response.destroy();
          request.destroy();
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        if (settled) return;
        settled = true;
        const statusCode = response.statusCode || 0;
        if (statusCode < 200 || statusCode >= 300) {
          reject(new Error(`Jobs source returned HTTP ${statusCode}.`));
          return;
        }
        try {
          resolve({
            statusCode,
            bytes,
            payload: JSON.parse(Buffer.concat(chunks).toString("utf8"))
          });
        } catch (error) {
          reject(new Error(`Jobs source did not return valid JSON: ${error.message}`));
        }
      });
    });
    request.on("timeout", () => {
      rejectOnce(new Error("Jobs source request timed out."));
      request.destroy();
    });
    request.on("error", rejectOnce);
    request.end();
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPositiveInteger(name, value) {
  assert(Number.isInteger(value) && value > 0, `${name} must be a positive integer.`);
}

function assertNoPlaceholder(name, value) {
  const text = String(value || "");
  assert(!/[<>]/.test(text), `${name} still contains placeholder brackets.`);
  assert(!/\.\.\./.test(text), `${name} still contains a placeholder ellipsis.`);
  assert(!/example\.com|jobs-source|feed-token|optional-|placeholder|change-?me|todo|tbd|your[-_ ]/i.test(text), `${name} still contains a placeholder value.`);
}

function assertStrongProductionValue(name, value, minLength) {
  const text = String(value || "");
  assert(text.length >= minLength, `${name} must be at least ${minLength} characters in production.`);
}

function resolveSourceUrl(value) {
  const explicit = clean(value);
  if (explicit && !isDisabledValue(explicit)) return explicit;
  return shouldUseDefaultSource(value) ? DEFAULT_PUBLIC_ATS_JOBS_SOURCE_URL : "";
}

function shouldUseDefaultSource(value) {
  const explicit = clean(value);
  if (explicit && isDisabledValue(explicit)) return false;
  return productionMode && !explicit;
}

function isDisabledValue(value) {
  return ["0", "false", "off", "disabled", "none", "no"].includes(clean(value).toLowerCase());
}

function assertUrlHasNoSensitiveParts(name, url) {
  assert(!url.username && !url.password, `${name} must not include embedded credentials.`);
  assert(!url.search && !url.hash, `${name} must not include query strings or fragments.`);
}

function parseHttpUrl(value, name) {
  try {
    const url = new URL(value);
    assert(["http:", "https:"].includes(url.protocol), `${name} must be an HTTP(S) URL.`);
    return url;
  } catch (error) {
    if (error.message.includes(name)) throw error;
    throw new Error(`${name} must be a valid URL.`);
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(String(value || ""));
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

function safeJobUrl(value) {
  const text = clean(value).slice(0, 600);
  if (!isHttpUrl(text)) return "#";
  return text;
}

function safeJobPostedAt(value) {
  const text = clean(value).slice(0, 80);
  if (!text) return "crawler-ready";
  const timestamp = Date.parse(text);
  if (Number.isNaN(timestamp)) return "crawler-ready";
  if (timestamp > Date.now() + 24 * 60 * 60 * 1000) return "crawler-ready";
  return text;
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const family = net.isIP(host);
  if (family === 4) return isPrivateIpv4(host);
  if (family === 6) return isPrivateIpv6(host);
  return false;
}

function isPrivateIpv4(host) {
  const parts = host.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host) {
  const normalized = host.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  return (
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
  );
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].sort();
}

function parseInteger(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseNumber(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  return Number(String(value).trim());
}

function clean(value) {
  return String(value || "").trim();
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}
