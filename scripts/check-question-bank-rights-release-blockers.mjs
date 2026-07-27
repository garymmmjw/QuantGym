#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/340-question-bank-rights-release-blockers-summary.json";
const startedAt = Date.now();
const failures = [];
const warnings = [];

const privateBeta = runRights("private-beta");
const publicRelease = runRights("public");
const commercialRelease = runRights("commercial");

validatePrivateBeta(privateBeta);
validateBlockedRelease(publicRelease, "public");
validateBlockedRelease(commercialRelease, "commercial");

const serverPreviewCatalog = validateServerPreviewCatalog();
const nativeV2CatalogBoundary = validateNativeV2CatalogBoundary();

const publicBlockerSlugs = blockerSlugs(publicRelease.data);
const commercialBlockerSlugs = blockerSlugs(commercialRelease.data);
const activeSlugs = activeSourceSlugs(privateBeta.data);
if (!sameList(publicBlockerSlugs, activeSlugs)) {
  fail(`Public blocker slugs must match active sources. Expected ${activeSlugs.join(", ")}, got ${publicBlockerSlugs.join(", ")}.`);
}
if (!sameList(commercialBlockerSlugs, activeSlugs)) {
  fail(`Commercial blocker slugs must match active sources. Expected ${activeSlugs.join(", ")}, got ${commercialBlockerSlugs.join(", ")}.`);
}

const summary = {
  status: failures.length ? "fail" : "pass",
  durationMs: Date.now() - startedAt,
  releaseBlocked: true,
  privateBeta: summarizeRun(privateBeta),
  publicRelease: summarizeRun(publicRelease),
  commercialRelease: summarizeRun(commercialRelease),
  blockerSlugs: {
    public: publicBlockerSlugs,
    commercial: commercialBlockerSlugs
  },
  checks: {
    privateBetaPass: privateBeta.exitCode === 0 && privateBeta.data?.status === "pass",
    publicReleaseRejected: publicRelease.exitCode !== 0 && publicRelease.data?.status === "fail",
    commercialReleaseRejected: commercialRelease.exitCode !== 0 && commercialRelease.data?.status === "fail",
    publicRejectedForAllActiveSources: sameList(publicBlockerSlugs, activeSlugs),
    commercialRejectedForAllActiveSources: sameList(commercialBlockerSlugs, activeSlugs),
    activePublicCommercialNeedsReview: Number(privateBeta.data?.rightsStatus?.activePublicCommercial?.["needs-review"] || 0) === Number(privateBeta.data?.activeSources || 0),
    noActivePublicCommercialApprovals: Number(privateBeta.data?.rightsStatus?.activePublicCommercial?.approved || 0) === 0,
    quantguideStillPrivateAndBlocked: sourceBySlug(privateBeta.data, "quantguide")?.visibility?.includes("private") === true
      && sourceBySlug(privateBeta.data, "quantguide")?.publicCommercialStatus === "needs-review",
    serverPreviewFixtureValid: serverPreviewCatalog.valid,
    serverPreviewFixtureInternalOnly: serverPreviewCatalog.internalOnly,
    serverPreviewFixtureExcludedFromPublicCommercial: serverPreviewCatalog.excludedFromPublicCommercial,
    nativeV2HasNoLegacyGlobalCatalog: nativeV2CatalogBoundary.valid
  },
  serverPreviewCatalog,
  nativeV2CatalogBoundary,
  failures,
  warnings
};

writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function runRights(mode) {
  const run = spawnSync(process.execPath, ["scripts/check-question-bank-rights.mjs", "--mode", mode], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  return {
    mode,
    exitCode: typeof run.status === "number" ? run.status : 1,
    stdout: run.stdout || "",
    stderr: run.stderr || "",
    data: parseLastJson(run.stdout || "")
  };
}

function validatePrivateBeta(run) {
  const data = run.data || {};
  if (run.exitCode !== 0) fail(`Private beta rights check must pass: ${firstFailure(run)}`);
  if (data.status !== "pass") fail("Private beta rights check must report pass.");
  if (data.mode !== "private-beta") fail(`Private beta rights mode mismatch: ${data.mode}.`);
  if (Number(data.activeSources || 0) !== 15) fail(`Private beta rights must track 15 active sources, got ${data.activeSources}.`);
  if (Number(data.compiledProblems || 0) !== 2997) fail(`Private beta rights must track 2997 compiled problems, got ${data.compiledProblems}.`);
  if (Number(data.rightsStatus?.privateBeta?.allowed || 0) !== Number(data.activeSources || 0)) {
    fail("Private beta rights must allow every active source.");
  }
}

function validateBlockedRelease(run, mode) {
  const data = run.data || {};
  if (run.exitCode === 0) fail(`${mode} rights check must reject current active source rights.`);
  if (data.status !== "fail") fail(`${mode} rights check must report fail while active sources need review.`);
  if (data.mode !== mode) fail(`${mode} rights mode mismatch: ${data.mode}.`);
  const activeSources = Number(data.activeSources || 0);
  const needsReview = Number(data.rightsStatus?.activePublicCommercial?.["needs-review"] || 0);
  const approved = Number(data.rightsStatus?.activePublicCommercial?.approved || 0);
  if (activeSources !== 15) fail(`${mode} rights check must track 15 active sources, got ${activeSources}.`);
  if (needsReview !== activeSources) fail(`${mode} rights check must keep every active source in needs-review.`);
  if (approved !== 0) fail(`${mode} rights check must not report active public/commercial approvals.`);
  const failuresList = Array.isArray(data.failures) ? data.failures : [];
  if (failuresList.length !== activeSources) {
    fail(`${mode} rights check must report one blocker per active source, got ${failuresList.length}.`);
  }
  const expectedText = `blocks ${mode} release: publicCommercial.status is "needs-review"`;
  for (const item of failuresList) {
    if (!String(item).includes(expectedText)) fail(`${mode} blocker has unexpected failure text: ${item}`);
  }
}

function validateServerPreviewCatalog() {
  const relativePath = "api/catalogs/phase2-preview-v1.json";
  const absolutePath = path.join(root, relativePath);
  let data;
  try {
    data = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch (error) {
    fail(`Server Preview catalog must be readable JSON: ${error instanceof Error ? error.message : String(error)}.`);
    return {
      path: relativePath,
      valid: false,
      internalOnly: false,
      excludedFromPublicCommercial: false,
      sourceCount: 0,
      problemCount: 0
    };
  }

  const sources = Array.isArray(data.sources) ? data.sources : [];
  const problemCount = sources.reduce(
    (total, source) => total + (Array.isArray(source?.problems) ? source.problems.length : 0),
    0
  );
  const valid = data.schemaVersion === 1
    && data.catalogId === "quantgym-phase2-preview-synthetic"
    && data.synthetic === true
    && typeof data.contentVersion === "string"
    && /^\d{4}-\d{2}-\d{2}\.[1-9]\d*$/.test(data.contentVersion)
    && sources.length > 0
    && problemCount > 0;
  const internalOnly = sources.length > 0 && sources.every(
    (source) => source?.rightsStatus === "internal_preview"
      && source?.releaseScope === "preview"
      && Array.isArray(source?.problems)
      && source.problems.length > 0
  );
  const excludedFromPublicCommercial = internalOnly && sources.every(
    (source) => source?.releaseScope !== "public" && source?.rightsStatus !== "approved"
  );

  if (!valid) fail("Server Preview catalog must be the non-empty, versioned synthetic Phase 2 fixture.");
  if (!internalOnly) fail("Every server Preview catalog source must be internal_preview and preview-scoped.");
  if (!excludedFromPublicCommercial) fail("Server Preview catalog must remain excluded from public and commercial releases.");
  return {
    path: relativePath,
    catalogId: typeof data.catalogId === "string" ? data.catalogId : "",
    contentVersion: typeof data.contentVersion === "string" ? data.contentVersion : "",
    synthetic: data.synthetic === true,
    sourceCount: sources.length,
    problemCount,
    valid,
    internalOnly,
    excludedFromPublicCommercial
  };
}

function validateNativeV2CatalogBoundary() {
  const roots = [
    "src/core",
    "src/shared",
    "src/domains",
    "src/pages/plan",
    "src/pages/training",
    "src/pages/v2",
  ];
  const forbiddenPatterns = [
    { label: "legacy problem catalog module", pattern: /(?:data\/problem-catalog|problem-catalog\.js)/ },
    { label: "legacy catalog data module", pattern: /(?:src\/catalog-data|catalog-data\.js)/ },
    { label: "legacy global catalog symbol", pattern: /\bquantProblemCatalog\b/ }
  ];
  const violations = [];
  for (const relativeRoot of roots) {
    const absoluteRoot = path.join(root, relativeRoot);
    if (!fs.existsSync(absoluteRoot)) continue;
    for (const absoluteFile of walkFiles(absoluteRoot)) {
      if (!/\.(?:[cm]?[jt]sx?|css|json)$/.test(absoluteFile)) continue;
      const source = fs.readFileSync(absoluteFile, "utf8");
      for (const forbidden of forbiddenPatterns) {
        if (forbidden.pattern.test(source)) {
          violations.push({
            file: path.relative(root, absoluteFile).split(path.sep).join("/"),
            reason: forbidden.label
          });
        }
      }
    }
  }
  if (violations.length) {
    fail(`Native V2 must not import or embed the legacy global problem catalog: ${violations.map((item) => `${item.file} (${item.reason})`).join(", ")}.`);
  }
  return { roots, valid: violations.length === 0, violations };
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}

function summarizeRun(run) {
  const data = run.data || {};
  return {
    mode: run.mode,
    exitCode: run.exitCode,
    status: data.status || "unknown",
    activeSources: Number(data.activeSources || 0),
    compiledProblems: Number(data.compiledProblems || 0),
    rightsSources: Number(data.rightsSources || 0),
    rightsStatus: data.rightsStatus || {},
    failureCount: Array.isArray(data.failures) ? data.failures.length : 0,
    failures: Array.isArray(data.failures) ? data.failures : []
  };
}

function activeSourceSlugs(data = {}) {
  return (Array.isArray(data.sourceChecks) ? data.sourceChecks : [])
    .filter((source) => source.active === true)
    .map((source) => String(source.slug || ""))
    .filter(Boolean)
    .sort();
}

function blockerSlugs(data = {}) {
  return (Array.isArray(data.sourceChecks) ? data.sourceChecks : [])
    .filter((source) => source.active === true && source.publicCommercialStatus === "needs-review")
    .map((source) => String(source.slug || ""))
    .filter(Boolean)
    .sort();
}

function sourceBySlug(data = {}, slug) {
  return (Array.isArray(data.sourceChecks) ? data.sourceChecks : []).find((source) => source.slug === slug);
}

function sameList(left, right) {
  return JSON.stringify([...left].sort()) === JSON.stringify([...right].sort());
}

function firstFailure(run) {
  const data = run.data || {};
  return Array.isArray(data.failures) && data.failures.length
    ? data.failures[0]
    : String(run.stderr || run.stdout || "").trim();
}

function parseLastJson(text) {
  const trimmed = String(text || "").trim();
  for (let index = trimmed.lastIndexOf("{"); index >= 0; index = trimmed.lastIndexOf("{", index - 1)) {
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Keep searching; nested JSON can precede the final object.
    }
  }
  return {};
}

function fail(message) {
  failures.push(String(message));
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}
