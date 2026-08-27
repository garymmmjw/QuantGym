#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || defaultRoot);
const failures = [];
const warnings = [];

const { MODULE_MANIFEST } = await import(
  pathToFileURL(path.join(root, "src", "modules", "manifest.js"))
);
const ownershipSource = read("src/core/router/businessRouteOwnership.ts");
const allowlistSource = read("src/legacy-preview/unmigratedRoutes.ts");
const routerSource = read("src/core/router/router.tsx");
const buildScriptSource = read("scripts/build-static-site.mjs");

const manifestRoutes = MODULE_MANIFEST.map(({ id, path: routePath }) => ({ id, path: routePath }));
const ownershipRoutes = [...ownershipSource.matchAll(
  /\{\s*id:\s*"([^"]+)",\s*owner:\s*"(native|compatibility)",\s*path:\s*"([^"]+)"\s*\}/gu,
)].map((match) => ({ id: match[1], owner: match[2], path: match[3] }));
const allowlistRoutes = [...allowlistSource.matchAll(
  /\{\s*id:\s*"([^"]+)",\s*path:\s*"([^"]+)",\s*label:/gu,
)].map((match) => ({ id: match[1], path: match[2] }));
const nativeRoutes = ownershipRoutes.filter(({ owner }) => owner === "native");
const compatibilityRoutes = ownershipRoutes.filter(({ owner }) => owner === "compatibility");

checkManifest();
checkOwnership();
checkRouter();
checkStaticFallbackPolicy();

const summary = {
  status: failures.length ? "fail" : "pass",
  routes: manifestRoutes.length,
  nativeRoutes: nativeRoutes.length,
  compatibilityRoutes: compatibilityRoutes.length,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

function checkManifest() {
  expect(MODULE_MANIFEST.length === 22, `MODULE_MANIFEST should contain 22 routes, found ${MODULE_MANIFEST.length}.`);
  expectNoDuplicates(manifestRoutes.map(({ id }) => id), "MODULE_MANIFEST ids");
  expectNoDuplicates(manifestRoutes.map(({ path: routePath }) => normalizePath(routePath)), "MODULE_MANIFEST paths");
  for (const entry of MODULE_MANIFEST) {
    for (const field of ["id", "hash", "path", "labelKey", "navGroup", "protected", "stage2Priority"]) {
      expect(entry[field] !== undefined, `${entry.id || "(missing id)"} manifest entry missing ${field}.`);
    }
    expect(entry.hash === `#${entry.id}`, `${entry.id} hash must be #${entry.id}.`);
    expect(entry.path === "/" || entry.path === `/${entry.id}`, `${entry.id} path is not canonical.`);
    expect(entry.protected === true, `${entry.id} must remain protected.`);
  }
}

function checkOwnership() {
  expect(ownershipRoutes.length === 22, `business route ownership should contain 22 routes, found ${ownershipRoutes.length}.`);
  expectNoDuplicates(ownershipRoutes.map(({ id }) => id), "business ownership ids");
  expectNoDuplicates(ownershipRoutes.map(({ path: routePath }) => routePath), "business ownership paths");
  expectSameRouteSet(ownershipRoutes, manifestRoutes, "business ownership");

  const expectedNative = [
    { id: "overview", path: "/" },
    { id: "plan", path: "/plan" },
    { id: "problems", path: "/problems" }
  ];
  expectSameRouteSet(nativeRoutes, expectedNative, "native ownership");
  expect(compatibilityRoutes.length === 19, `compatibility ownership should contain 19 routes, found ${compatibilityRoutes.length}.`);
  expectSameRouteSet(allowlistRoutes, compatibilityRoutes, "legacy preview allowlist");

  for (const relativePath of [
    "src/pages/training/OverviewPage.tsx",
    "src/pages/plan/PlanPage.tsx",
    "src/pages/training/ProblemsPage.tsx"
  ]) {
    expect(fs.existsSync(path.join(root, relativePath)), `native route file is missing: ${relativePath}`);
  }
  for (const retiredPath of [
    "src/pages/OverviewPage.jsx",
    "src/pages/PlanPage.jsx",
    "src/pages/ProblemsPage.jsx"
  ]) {
    expect(!fs.existsSync(path.join(root, retiredPath)), `retired route wrapper still exists: ${retiredPath}`);
  }
}

function checkRouter() {
  expect(routerSource.includes("COMPATIBILITY_BUSINESS_ROUTES"), "V2 router must derive compatibility children from ownership.");
  expect(routerSource.includes("../../legacy-preview/LegacyRouteAdapter"), "V2 router must keep the isolated compatibility adapter.");
  for (const marker of [
    'import("../../pages/training/OverviewPage")',
    'import("../../pages/plan/PlanPage")',
    'import("../../pages/training/ProblemsPage")'
  ]) {
    expect(routerSource.includes(marker), `V2 router is missing native lazy route ${marker}.`);
  }
  for (const retiredPath of ["OverviewPage.jsx", "PlanPage.jsx", "ProblemsPage.jsx"]) {
    expect(!routerSource.includes(retiredPath), `V2 router still references retired ${retiredPath}.`);
  }
  expect(routerSource.includes('path: "plan"'), "V2 router is missing the native /plan child.");
  expect(routerSource.includes('path: "problems"'), "V2 router is missing the native /problems child.");
  expect(routerSource.includes('path: "*"'), "V2 router must keep a wildcard not-found child.");
}

function checkStaticFallbackPolicy() {
  expect(
    buildScriptSource.includes("writeAssetNotFoundPage(outputDir)"),
    "build-static-site.mjs must keep an assets-level 404 page."
  );
  expect(
    buildScriptSource.includes('path.join(assetsDir, "404.html")'),
    "build-static-site.mjs must write dist/assets/404.html."
  );
  expect(
    !/path\.join\(distDir,\s*["']404\.html["']\)/u.test(buildScriptSource),
    "build-static-site.mjs must not disable SPA fallback with a top-level 404.html."
  );
}

function read(relativePath) {
  try {
    return fs.readFileSync(path.join(root, relativePath), "utf8");
  } catch (error) {
    failures.push(`missing ${relativePath}: ${error.message}`);
    return "";
  }
}

function expectSameRouteSet(actual, expected, label) {
  const serialize = ({ id, path: routePath }) => `${id}:${normalizePath(routePath)}`;
  const actualSet = new Set(actual.map(serialize));
  const expectedSet = new Set(expected.map(serialize));
  const missing = [...expectedSet].filter((value) => !actualSet.has(value));
  const extra = [...actualSet].filter((value) => !expectedSet.has(value));
  expect(
    missing.length === 0 && extra.length === 0,
    `${label} mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}.`
  );
}

function expectNoDuplicates(values, label) {
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  expect(duplicates.length === 0, `${label} contain duplicates: ${duplicates.join(", ")}`);
}

function normalizePath(value) {
  return String(value || "").replace(/\/+$/u, "") || "/";
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}
