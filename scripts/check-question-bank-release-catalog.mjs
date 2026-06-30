#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/question-bank-rights/release-catalog");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/364-question-bank-release-catalog-summary.json");
const generatedAt = new Date().toISOString();
const sourceRoot = path.join(projectRoot, "data", "question-banks");
const rightsManifest = readJson(path.join(sourceRoot, "source-rights-manifest.json"), "source rights manifest");
const catalogManifest = readJson(path.join(sourceRoot, "catalog-manifest.json"), "catalog manifest");
const compiledCatalog = readJson(path.join(projectRoot, "data", "problem-catalog.json"), "compiled problem catalog");
const fullProblems = Array.isArray(compiledCatalog.problems) ? compiledCatalog.problems : [];
const rightsSources = Array.isArray(rightsManifest.sources) ? rightsManifest.sources : [];
const catalogSources = Array.isArray(catalogManifest.sources) ? catalogManifest.sources : [];
const activeSlugs = new Set(
  catalogSources
    .filter((source) => clean(source.slug) && !source.disabled && !source.excludeFromCatalog)
    .map((source) => clean(source.slug))
);
const failures = [];
const warnings = [];

const releaseCatalogs = {
  public: buildReleaseCatalog("public"),
  commercial: buildReleaseCatalog("commercial")
};

const indexHtml = readText(path.join(projectRoot, "index.html"));
const mainJsx = readText(path.join(projectRoot, "src/main.jsx"));
const buildStaticSite = readText(path.join(projectRoot, "scripts/build-static-site.mjs"));

const checks = {
  privateBetaCatalogRetained: fullProblems.length === 2997,
  publicCatalogGenerated: releaseCatalogs.public.generated === true,
  commercialCatalogGenerated: releaseCatalogs.commercial.generated === true,
  publicNoUnapprovedProblems: releaseCatalogs.public.unapprovedProblemCount === 0,
  commercialNoUnapprovedProblems: releaseCatalogs.commercial.unapprovedProblemCount === 0,
  publicAllNeedsReviewExcluded: releaseCatalogs.public.excludedNeedsReviewSourceCount === releaseCatalogs.public.needsReviewSourceCount,
  commercialAllNeedsReviewExcluded: releaseCatalogs.commercial.excludedNeedsReviewSourceCount === releaseCatalogs.commercial.needsReviewSourceCount,
  indexDoesNotHardcodeDefaultProblemCatalog: !/script\s+src=["']data\/problem-catalog\.js/i.test(indexHtml),
  runtimeConfigSelectableCatalogScript: mainJsx.includes("problemCatalogScript")
    && mainJsx.includes("/data/problem-catalog.js?v=2"),
  buildConfigEmitsProblemCatalogScript: buildStaticSite.includes("problemCatalogScript")
    && buildStaticSite.includes("QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT")
};

for (const [name, pass] of Object.entries(checks)) {
  if (pass !== true) failures.push(`Check failed: ${name}`);
}
for (const [mode, catalog] of Object.entries(releaseCatalogs)) {
  if (catalog.problemCount === 0) {
    warnings.push(`${mode} release catalog contains no problems because no active source has public/commercial approval yet.`);
  }
}

const summary = {
  id: 364,
  date: "2026-06-26",
  surface: "question-bank release catalog",
  status: failures.length ? "fail" : "pass",
  generatedAt,
  outDir: path.relative(projectRoot, outDir),
  fullPrivateBetaProblemCount: fullProblems.length,
  releaseCatalogs,
  checks,
  failures,
  warnings
};

writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

function buildReleaseCatalog(mode) {
  const requiredScopes = mode === "commercial"
    ? ["public-web", "redistribution", "compiled-catalog", "derived-adaptation", "commercial-use"]
    : ["public-web", "redistribution", "compiled-catalog", "derived-adaptation"];
  const approvedSlugs = new Set();
  const needsReviewSlugs = [];
  const blockedSlugs = [];
  for (const source of rightsSources) {
    const slug = clean(source.slug);
    if (!slug || !activeSlugs.has(slug)) continue;
    const publicCommercial = source.publicCommercial || {};
    const status = clean(publicCommercial.status);
    if (status === "needs-review") needsReviewSlugs.push(slug);
    if (status === "blocked") blockedSlugs.push(slug);
    const scopes = Array.isArray(publicCommercial.redistributionScope)
      ? publicCommercial.redistributionScope.map(clean)
      : [];
    const hasScopes = requiredScopes.every((scope) => scopes.includes(scope));
    if (status === "approved" && hasScopes) approvedSlugs.add(slug);
  }

  const problems = fullProblems.filter((problem) => approvedSlugs.has(clean(problem.source)));
  const unapprovedProblemCount = problems.filter((problem) => !approvedSlugs.has(clean(problem.source))).length;
  const modeDir = path.join(outDir, mode);
  fs.mkdirSync(modeDir, { recursive: true });
  fs.writeFileSync(path.join(modeDir, "problem-catalog.json"), `${JSON.stringify({ problems }, null, 2)}\n`);
  fs.writeFileSync(path.join(modeDir, "problem-catalog.js"), [
    "// Generated by scripts/check-question-bank-release-catalog.mjs.",
    `window.quantProblemCatalog = ${JSON.stringify(problems, null, 2)};`,
    ""
  ].join("\n"));

  return {
    generated: true,
    problemCount: problems.length,
    approvedSourceSlugs: [...approvedSlugs].sort(),
    needsReviewSourceCount: needsReviewSlugs.length,
    blockedSourceCount: blockedSlugs.length,
    excludedNeedsReviewSourceCount: needsReviewSlugs.filter((slug) => !approvedSlugs.has(slug)).length,
    unapprovedProblemCount,
    artifactJson: path.relative(projectRoot, path.join(modeDir, "problem-catalog.json")),
    artifactScript: path.relative(projectRoot, path.join(modeDir, "problem-catalog.js"))
  };
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function clean(value) {
  return String(value || "").trim();
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const prefix = `${name}=`;
  const match = args.find((value) => value.startsWith(prefix));
  return match ? match.slice(prefix.length) : "";
}
