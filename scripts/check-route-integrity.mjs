#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root || defaultRoot);
const src = path.join(root, "src");
const failures = [];
const warnings = [];

const { MODULE_MANIFEST } = await import(pathToFileURL(path.join(src, "modules", "manifest.js")));
const {
  REACT_PAGE_IDS,
  BRIDGE_PAGE_IDS,
  routeConfig,
  getRouteModuleId,
  getModulePath,
  countRouteModes
} = await import(pathToFileURL(path.join(src, "routes", "routeConfig.js")));

const routesText = read("src/routes/routes.jsx");
const buildScriptText = read("scripts/build-static-site.mjs");
const manifestIds = MODULE_MANIFEST.map((entry) => entry.id);
const reactIds = [...REACT_PAGE_IDS];
const bridgeIds = [...BRIDGE_PAGE_IDS];
const routeConfigIds = routeConfig.map((entry) => entry.id);

checkManifestShape();
checkRouteConfigSync();
checkRoutesJsx();
checkPageWrappers();
checkPublicFallbackPages();
checkStaticBuildFallbacks();

const summary = {
  status: failures.length ? "fail" : "pass",
  routes: manifestIds.length,
  reactRoutes: reactIds.length,
  bridgeRoutes: bridgeIds.length,
  publicFallbackPages: manifestIds.length,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

function checkManifestShape() {
  expect(MODULE_MANIFEST.length === 21, `MODULE_MANIFEST should contain 21 routeable modules, found ${MODULE_MANIFEST.length}.`);
  for (const field of ["id", "hash", "path", "labelKey", "navGroup", "protected", "stage2Priority"]) {
    const missing = MODULE_MANIFEST.filter((entry) => entry[field] === undefined).map((entry) => entry.id || "(missing id)");
    expect(missing.length === 0, `MODULE_MANIFEST entries missing ${field}: ${missing.join(", ")}`);
  }
  expectNoDuplicates(manifestIds, "MODULE_MANIFEST ids");
  expectNoDuplicates(MODULE_MANIFEST.map((entry) => entry.hash), "MODULE_MANIFEST hashes");
  expectNoDuplicates(MODULE_MANIFEST.map((entry) => normalizePath(entry.path)), "MODULE_MANIFEST paths");

  for (const entry of MODULE_MANIFEST) {
    expect(/^[a-z][a-z0-9-]*$/.test(entry.id), `Invalid module id: ${entry.id}`);
    expect(entry.hash === `#${entry.id}`, `${entry.id} hash must be #${entry.id}.`);
    expect(entry.path === "/" || entry.path === `/${entry.id}`, `${entry.id} path must be / or /${entry.id}.`);
    expect(entry.protected === true, `${entry.id} should stay protected behind the app auth gate.`);
    expect(Number.isInteger(entry.stage2Priority), `${entry.id} stage2Priority must be an integer.`);
    expect(typeof entry.labelKey === "string" && entry.labelKey.length > 0, `${entry.id} labelKey is required.`);
    expect(typeof entry.navGroup === "string" && entry.navGroup.length > 0, `${entry.id} navGroup is required.`);
  }
}

function checkRouteConfigSync() {
  expectSameMembers(routeConfigIds, manifestIds, "routeConfig ids");
  expectSameMembers(reactIds, manifestIds, "REACT_PAGE_IDS");
  expect(bridgeIds.length === 0, `BRIDGE_PAGE_IDS must remain empty, found: ${bridgeIds.join(", ")}`);

  const counts = countRouteModes();
  expect(counts.react === manifestIds.length, `countRouteModes().react should be ${manifestIds.length}, got ${counts.react}.`);
  expect(counts.bridge === 0, `countRouteModes().bridge should be 0, got ${counts.bridge}.`);
  expect(counts.legacy === 0, `countRouteModes().legacy should be 0, got ${counts.legacy}.`);

  for (const manifestEntry of MODULE_MANIFEST) {
    const routeEntry = routeConfig.find((entry) => entry.id === manifestEntry.id);
    expect(Boolean(routeEntry), `routeConfig missing ${manifestEntry.id}.`);
    if (!routeEntry) continue;
    expect(routeEntry.path === manifestEntry.path, `${manifestEntry.id} routeConfig path differs from MODULE_MANIFEST.`);
    expect(routeEntry.protected === manifestEntry.protected, `${manifestEntry.id} routeConfig protected flag differs from MODULE_MANIFEST.`);
    expect(routeEntry.mode === "react", `${manifestEntry.id} routeConfig mode must be react.`);
    expect(getRouteModuleId(manifestEntry.path) === manifestEntry.id, `getRouteModuleId(${manifestEntry.path}) must return ${manifestEntry.id}.`);
    expect(getModulePath(manifestEntry.id) === manifestEntry.path, `getModulePath(${manifestEntry.id}) must return ${manifestEntry.path}.`);
  }
  expect(getRouteModuleId("/missing-route") === "overview", "Unknown paths must fall back to overview.");
}

function checkRoutesJsx() {
  expect(routesText.includes("routeConfig.map"), "routes.jsx must derive app routes from routeConfig.map.");
  expect(routesText.includes('<Route path="*" element={<Navigate to="/" replace />} />'), "routes.jsx must keep wildcard navigation fallback to overview.");
  expect(routesText.includes('<Route path="/login" element={null} />'), "routes.jsx must keep the /login auth-shell route.");
  expect(routesText.includes("<ProtectedRoute />"), "routes.jsx must wrap app routes in ProtectedRoute.");
  expect(routesText.includes("<AppChromeLayout />"), "routes.jsx must render protected routes inside AppChromeLayout.");

  for (const id of manifestIds) {
    const pageName = pageComponentName(id);
    expect(new RegExp(`const\\s+${pageName}\\s*=\\s*lazy\\(`).test(routesText), `routes.jsx missing lazy import for ${pageName}.`);
    expect(routesText.includes(`../pages/${pageName}.jsx`), `routes.jsx lazy import path missing ../pages/${pageName}.jsx.`);
    expect(routesText.includes(`default: m.${pageName}`), `routes.jsx lazy import for ${pageName} must select the named export.`);
    expect(new RegExp(`${id}:\\s*${pageName}\\b`).test(routesText), `REACT_PAGES missing ${id}: ${pageName}.`);
  }
}

function checkPageWrappers() {
  for (const id of manifestIds) {
    const pageName = pageComponentName(id);
    const featureName = `${pageName}Content`;
    const pagePath = path.join(src, "pages", `${pageName}.jsx`);
    expectFile(pagePath, `page wrapper for ${id}`);
    if (!fs.existsSync(pagePath)) continue;
    const text = fs.readFileSync(pagePath, "utf8");
    expect(text.includes('import { useSyncModuleRoute } from "../hooks/useSyncModuleRoute.js";'), `${pageName}.jsx must import useSyncModuleRoute.`);
    expect(text.includes(`export function ${pageName}()`), `${pageName}.jsx must export function ${pageName}.`);
    expect(text.includes(`useSyncModuleRoute("${id}")`), `${pageName}.jsx must sync module route "${id}".`);
    expect(text.includes(`import { ${featureName} } from "../features/${id}/${featureName}.jsx";`), `${pageName}.jsx must import ${featureName} from the matching feature folder.`);
    expect(text.includes(`return <${featureName} />;`), `${pageName}.jsx must render ${featureName}.`);
  }
}

function checkPublicFallbackPages() {
  for (const id of manifestIds) {
    const htmlPath = path.join(root, "public", "pages", `${id}.html`);
    expectFile(htmlPath, `public fallback page for ${id}`);
  }
}

function checkStaticBuildFallbacks() {
  expect(
    buildScriptText.includes("writeAssetNotFoundPage(outputDir)"),
    "build-static-site.mjs must write an assets-level 404 page."
  );
  expect(
    buildScriptText.includes('path.join(assetsDir, "404.html")'),
    "build-static-site.mjs must write dist/assets/404.html for missing hashed assets."
  );
  expect(
    !/path\.join\(distDir,\s*["']404\.html["']\)/.test(buildScriptText),
    "build-static-site.mjs must not emit a top-level dist/404.html because that disables Cloudflare Pages SPA fallback."
  );
}

function pageComponentName(id) {
  return `${String(id).split("-").filter(Boolean).map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("")}Page`;
}

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function expectFile(filePath, label) {
  expect(fs.existsSync(filePath), `Missing ${label}: ${path.relative(root, filePath)}`);
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

function normalizePath(value) {
  return String(value || "").replace(/\/+$/, "") || "/";
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
