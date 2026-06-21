#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const productionMode = Boolean(args.production);
const loadDotEnv = !args.noDotenv;
const summaryPath = args.summary
  ? path.resolve(projectRoot, args.summary)
  : productionMode
    ? path.resolve(projectRoot, "docs/browser-audit-screenshots/360-render-api-build-filter-production-summary.json")
    : "";

if (loadDotEnv) loadEnvFromProjectRoot();

const recommendedPaths = ["api-server/**", "data/**"];
const allowedMethods = new Set(["dashboard", "api", "blueprint"]);
const env = process.env;
const config = {
  confirmed: truthy(env.QUANTGYM_RENDER_API_BUILD_FILTER_CONFIRMED),
  method: clean(env.QUANTGYM_RENDER_API_BUILD_FILTER_METHOD).toLowerCase(),
  service: clean(env.QUANTGYM_RENDER_API_BUILD_FILTER_SERVICE),
  paths: parsePathList(env.QUANTGYM_RENDER_API_BUILD_FILTER_PATHS),
  evidenceUrl: clean(env.QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL),
  notes: clean(env.QUANTGYM_RENDER_API_BUILD_FILTER_NOTES)
};
const failures = [];

if (productionMode) validateProduction();

const checks = {
  productionMode,
  productionSignoffPass: productionMode && failures.length === 0,
  recommendedPathsExact: sameSet(config.paths, recommendedPaths),
  hasApiServerPath: config.paths.includes("api-server/**"),
  hasDataPath: config.paths.includes("data/**"),
  noUnexpectedPaths: config.paths.every((item) => recommendedPaths.includes(item)),
  methodAllowed: allowedMethods.has(config.method),
  serviceNamePass: config.service === "quantgym-api",
  evidenceUrlSafe: productionMode ? isSafeEvidenceUrl(config.evidenceUrl) : null,
  notesSpecific: productionMode ? notesAreSpecific(config.notes) : null
};

const summary = {
  id: 360,
  date: new Date().toISOString().slice(0, 10),
  surface: "Render API build filter signoff",
  status: failures.length ? "fail" : "pass",
  mode: productionMode ? "production" : "local",
  service: config.service || "quantgym-api",
  method: config.method || "",
  recommendedPaths,
  configuredPaths: config.paths,
  evidenceHost: summarizeEvidenceHost(config.evidenceUrl),
  checks,
  failures
};

if (summaryPath) writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exit(1);

function validateProduction() {
  expect(config.confirmed, "QUANTGYM_RENDER_API_BUILD_FILTER_CONFIRMED must be 1 after the Render build filter is configured.");
  expect(config.service === "quantgym-api", "QUANTGYM_RENDER_API_BUILD_FILTER_SERVICE must be quantgym-api.");
  expect(allowedMethods.has(config.method), "QUANTGYM_RENDER_API_BUILD_FILTER_METHOD must be dashboard, api, or blueprint.");
  expect(config.paths.length > 0, "QUANTGYM_RENDER_API_BUILD_FILTER_PATHS is required.");
  expect(config.paths.includes("api-server/**"), "Render API build filter paths must include api-server/**.");
  expect(config.paths.includes("data/**"), "Render API build filter paths must include data/**.");
  for (const item of config.paths) {
    expect(recommendedPaths.includes(item), `Unexpected Render API build filter path ${item}; do not include docs/**, src/**, scripts/**, public/**, artifacts/**, or other non-API runtime paths without adding a new fixture first.`);
  }
  expect(sameSet(config.paths, recommendedPaths), "Render API build filter paths must currently be exactly api-server/** and data/**.");
  validateEvidenceUrl(config.evidenceUrl);
  expect(notesAreSpecific(config.notes), "QUANTGYM_RENDER_API_BUILD_FILTER_NOTES must mention quantgym-api, api-server/**, data/**, and that docs/frontend/tooling commits should not restart or deploy the API.");
}

function validateEvidenceUrl(value) {
  expect(value, "QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL is required.");
  expectNoPlaceholder("QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL", value);
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("QUANTGYM_RENDER_API_BUILD_FILTER_EVIDENCE_URL must be a valid HTTPS URL.");
    return;
  }
  expect(url.protocol === "https:", "Render API build filter evidence URL must use HTTPS.");
  expect(!url.username && !url.password, "Render API build filter evidence URL must not include embedded credentials.");
  expect(!url.search && !url.hash, "Render API build filter evidence URL must not include query strings or fragments.");
  expect(isDnsHostname(url.hostname), "Render API build filter evidence URL must use a DNS hostname, not a raw IP address.");
  expect(!isLocalOrPrivateHost(url.hostname), "Render API build filter evidence URL must not point at localhost, loopback, or a private network address.");
  expect(url.hostname === "render.com" || url.hostname.endsWith(".render.com"), "Render API build filter evidence URL should point at Render dashboard or Render API evidence.");
}

function notesAreSpecific(value) {
  const text = clean(value).toLowerCase();
  return text.length >= 60
    && text.includes("quantgym-api")
    && text.includes("api-server/**")
    && text.includes("data/**")
    && /(docs|documentation)/.test(text)
    && /(frontend|src\/\*\*)/.test(text)
    && /(tooling|scripts\/\*\*)/.test(text)
    && /(restart|deploy)/.test(text);
}

function isSafeEvidenceUrl(value) {
  const before = failures.length;
  validateEvidenceUrl(value);
  return failures.length === before;
}

function summarizeEvidenceHost(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

function parsePathList(value) {
  return [...new Set(String(value || "")
    .split(/[,\n;]/)
    .map((item) => clean(item).replace(/^\.\//, "").replace(/\/+$/, "/").replace(/\/$/, ""))
    .filter(Boolean))];
}

function sameSet(left, right) {
  return left.length === right.length && right.every((item) => left.includes(item));
}

function isDnsHostname(hostname) {
  return Boolean(hostname) && net.isIP(hostname) === 0 && /^[a-z0-9.-]+$/i.test(hostname) && hostname.includes(".");
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".local")) return true;
  if (host === "::1") return true;
  if (net.isIP(host) === 4) {
    const parts = host.split(".").map(Number);
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
  }
  if (net.isIP(host) === 6) {
    return host === "::1" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe80");
  }
  return false;
}

function expectNoPlaceholder(name, value) {
  expect(!/[<>{}]|example|placeholder|change-me|todo|your-/i.test(String(value || "")), `${name} must not be a placeholder value.`);
}

function truthy(value) {
  return /^(1|true|yes|confirmed)$/i.test(String(value || "").trim());
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, "utf8");
  for (const rawLine of content.split(/\r?\n/)) {
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

function writeSummary(data) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(data, null, 2)}\n`);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  failures.push(message);
}

function clean(value) {
  return String(value || "").trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--production") parsed.production = true;
    else if (value === "--no-dotenv") parsed.noDotenv = true;
    else if (value === "--summary") {
      parsed.summary = argv[index + 1] || "";
      index += 1;
    }
  }
  return parsed;
}
