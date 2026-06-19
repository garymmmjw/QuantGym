#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || defaultRoot);
const summaryPath = path.resolve(root, args.summary || "docs/browser-audit-screenshots/328-browser-route-smoke-summary.json");
const failures = [];
const warnings = [];

const { MODULE_MANIFEST } = await import(pathToFileURL(path.join(root, "src", "modules", "manifest.js")));
const { MODULE_OWNERSHIP } = await import(pathToFileURL(path.join(root, "src", "modules", "ownership.js")));

const manifestIds = MODULE_MANIFEST.map((entry) => entry.id);
const ownershipIds = MODULE_OWNERSHIP.map((entry) => entry.id);
const ownershipById = new Map(MODULE_OWNERSHIP.map((entry) => [entry.id, entry]));
const routeSmoke = readJson(summaryPath, "browser route smoke summary");
const routeSmokeRouteIds = new Set((routeSmoke.routes?.results || []).map((entry) => entry.id));
const routeSmokeInteractions = new Set((routeSmoke.interactions?.results || []).map((entry) => entry.name));
const mappedInteractions = getMappedInteractions();
const unmappedInteractions = getUnmappedInteractions();

checkShape();
checkManifestCoverage();
checkOwnedFiles();
checkBrowserSmokeCoverage();

const ownerGroups = countBy(MODULE_OWNERSHIP, (entry) => entry.owner);
const navGroups = countBy(MODULE_OWNERSHIP, (entry) => entry.navGroup);
const stateDomains = countBy(
  MODULE_OWNERSHIP.flatMap((entry) => Array.isArray(entry.stateDomains) ? entry.stateDomains : []),
  (entry) => entry
);

const summary = {
  status: failures.length ? "fail" : "pass",
  modules: MODULE_OWNERSHIP.length,
  manifestRoutes: MODULE_MANIFEST.length,
  ownerGroups,
  navGroups,
  stateDomains,
  browserSmoke: {
    summaryPath: path.relative(root, summaryPath),
    status: routeSmoke.status || "",
    routesChecked: Number(routeSmoke.routes?.checked || 0),
    interactionsChecked: Number(routeSmoke.interactions?.checked || 0),
    mappedInteractions: mappedInteractions.size,
    unmappedInteractions
  },
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

function checkShape() {
  expect(Array.isArray(MODULE_OWNERSHIP), "MODULE_OWNERSHIP must be an array.");
  expectNoDuplicates(ownershipIds, "MODULE_OWNERSHIP ids");
  for (const entry of MODULE_OWNERSHIP) {
    const label = entry.id || "(missing id)";
    for (const field of ["id", "owner", "navGroup", "page", "featureEntry"]) {
      expect(Boolean(clean(entry[field])), `${label} ownership entry missing ${field}.`);
    }
    expect(/^[a-z][a-z0-9-]*$/.test(clean(entry.id)), `${label} ownership id must be slug-like.`);
    expect(/^[a-z][a-z0-9-]*$/.test(clean(entry.owner)), `${label} owner must be slug-like.`);
    expect(Array.isArray(entry.stateDomains) && entry.stateDomains.length > 0, `${label} must list stateDomains.`);
    expect(Array.isArray(entry.browserSmokeInteractions) && entry.browserSmokeInteractions.length > 0, `${label} must list browserSmokeInteractions.`);
    for (const domain of entry.stateDomains || []) {
      expect(/^[a-z][A-Za-z0-9]*$/.test(clean(domain)), `${label} state domain "${domain}" must be camelCase-like.`);
    }
  }
}

function checkManifestCoverage() {
  expectSameMembers(ownershipIds, manifestIds, "module ownership ids");
  for (const manifestEntry of MODULE_MANIFEST) {
    const ownership = ownershipById.get(manifestEntry.id);
    if (!ownership) continue;
    expect(ownership.navGroup === manifestEntry.navGroup, `${manifestEntry.id} ownership navGroup must match MODULE_MANIFEST.`);
  }
}

function checkOwnedFiles() {
  for (const entry of MODULE_OWNERSHIP) {
    const pagePath = path.join(root, entry.page || "");
    const featurePath = path.join(root, entry.featureEntry || "");
    expect(fs.existsSync(pagePath), `${entry.id} page file is missing: ${entry.page}`);
    expect(fs.existsSync(featurePath), `${entry.id} feature entry is missing: ${entry.featureEntry}`);
    const expectedFeaturePrefix = path.join(root, "src", "features", entry.id) + path.sep;
    expect(featurePath.startsWith(expectedFeaturePrefix), `${entry.id} feature entry must live under src/features/${entry.id}/.`);
    if (fs.existsSync(pagePath) && fs.existsSync(featurePath)) {
      const pageText = fs.readFileSync(pagePath, "utf8");
      const featureName = path.basename(entry.featureEntry, ".jsx");
      expect(pageText.includes(featureName), `${entry.id} page must import/render ${featureName}.`);
    }
  }
}

function checkBrowserSmokeCoverage() {
  expect(routeSmoke.status === "pass", "Browser route smoke summary must be pass before module ownership sign-off.");
  expect(Number(routeSmoke.routes?.checked || 0) === MODULE_MANIFEST.length, "Browser route smoke must check every manifest route.");
  expect(Number(routeSmoke.routes?.failed || 0) === 0, "Browser route smoke must have zero route failures.");
  for (const id of manifestIds) {
    expect(routeSmokeRouteIds.has(id), `Browser route smoke summary missing route ${id}.`);
  }
  for (const entry of MODULE_OWNERSHIP) {
    for (const interaction of entry.browserSmokeInteractions || []) {
      expect(routeSmokeInteractions.has(interaction), `${entry.id} references missing browser smoke interaction: ${interaction}`);
    }
  }
  expect(unmappedInteractions.length === 0, `Browser route smoke interactions missing ownership mapping: ${unmappedInteractions.join(", ") || "none"}`);
}

function getMappedInteractions() {
  const mapped = new Set();
  for (const entry of MODULE_OWNERSHIP) {
    for (const interaction of entry.browserSmokeInteractions || []) mapped.add(interaction);
  }
  return mapped;
}

function getUnmappedInteractions() {
  return [...routeSmokeInteractions].filter((interaction) => !mappedInteractions.has(interaction));
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function countBy(items, getKey) {
  const counts = {};
  for (const item of items) {
    const key = clean(getKey(item));
    if (!key) continue;
    counts[key] = Number(counts[key] || 0) + 1;
  }
  return counts;
}

function expectNoDuplicates(values, label) {
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  expect(duplicates.length === 0, `${label} contain duplicates: ${duplicates.join(", ")}`);
}

function expectSameMembers(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  expect(missing.length === 0 && extra.length === 0, `${label} mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function clean(value) {
  return String(value || "").trim();
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (argv[index] === "--summary") {
      parsed.summary = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}
