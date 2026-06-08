#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const warnings = [];
const failures = [];

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function exists(filePath) {
  return fs.existsSync(filePath);
}

function fail(message) {
  failures.push(message);
}

function warn(message) {
  warnings.push(message);
}

function countLines(filePath) {
  return read(filePath).split("\n").length;
}

function walkJsFiles(dir, results = []) {
  if (!exists(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(fullPath, results);
    else if (entry.name.endsWith(".js") || entry.name.endsWith(".jsx")) results.push(fullPath);
  }
  return results;
}

function extractManifestIds() {
  const manifestPath = path.join(src, "modules", "manifest.js");
  if (!exists(manifestPath)) return [];
  const text = read(manifestPath);
  const ids = [...text.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]);
  return [...new Set(ids)];
}

function extractHtmlModuleIds(attr) {
  const htmlPath = path.join(root, "index.html");
  if (!exists(htmlPath)) return [];
  const text = read(htmlPath);
  const pattern = new RegExp(`${attr}="([^"]+)"`, "g");
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1]))];
}

function checkNoRootAppJs() {
  if (exists(path.join(root, "app.js"))) fail("Root app.js must not exist.");
}

function checkRouter() {
  if (!exists(path.join(src, "router.js"))) fail("src/router.js is missing.");
}

function checkManifest() {
  const manifestPath = path.join(src, "modules", "manifest.js");
  if (!exists(manifestPath)) fail("src/modules/manifest.js is missing.");
}

function checkModuleIndexes(manifestIds) {
  const stage = String(process.env.QUANTGYM_STAGE || "2");
  const reactOwned = stage !== "1";
  for (const id of manifestIds) {
    const indexPath = path.join(src, "modules", id, "index.js");
    if (exists(indexPath)) continue;
    const message = `Missing module entry: src/modules/${id}/index.js`;
    if (reactOwned) warn(`${message} (React-owned module; registrar optional)`);
    else fail(message);
  }
}

function checkHtmlManifestAlignment(manifestIds) {
  const viewIds = extractHtmlModuleIds("data-module-view");
  const tabIds = extractHtmlModuleIds("data-module-tab");
  const manifestSet = new Set(manifestIds);

  for (const id of viewIds) {
    if (!manifestSet.has(id)) fail(`index.html data-module-view="${id}" has no manifest entry.`);
  }

  const allowedTabExceptions = new Set(["account"]);
  for (const id of tabIds) {
    if (!manifestSet.has(id) && !allowedTabExceptions.has(id)) {
      fail(`index.html data-module-tab="${id}" has no manifest entry.`);
    }
  }
}

function checkNoReactDeps() {
  const pkg = JSON.parse(read(path.join(root, "package.json")));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  const hasReact = ["react", "react-dom", "react-router-dom"].some((name) => deps[name]);
  if (hasReact && !exists(path.join(src, "main.jsx"))) {
    warn("React dependencies found without src/main.jsx bridge entry.");
  }
}

function checkMainJsSize() {
  const mainPath = path.join(src, "main.js");
  if (!exists(mainPath)) {
    fail("src/main.js is missing.");
    return;
  }
  const lines = countLines(mainPath);
  const hardCeiling = Number(process.env.STAGE1_MAIN_JS_MAX || 700);
  const target = Number(process.env.STAGE1_MAIN_JS_TARGET || 500);
  if (lines > hardCeiling) fail(`src/main.js has ${lines} lines (max ${hardCeiling}).`);
  else if (lines > target) warn(`src/main.js has ${lines} lines (target ${target}).`);
}

function checkNoImportsFromMain() {
  const pattern = /from\s+['"][^'"]*main(?:\.js|\.jsx)['"]/;
  for (const filePath of walkJsFiles(src)) {
    if (filePath.endsWith(`${path.sep}main.js`) || filePath.endsWith(`${path.sep}main.jsx`)) continue;
    const text = read(filePath);
    if (pattern.test(text)) fail(`${path.relative(root, filePath)} imports from main.js`);
  }
}

function checkFetchAllowlist() {
  const allowlist = new Set([
    path.join(src, "api", "client.js")
  ]);
  const fetchPattern = /\bfetch\s*\(/;
  for (const filePath of walkJsFiles(src)) {
    if (allowlist.has(filePath)) continue;
    if (filePath.includes(`${path.sep}api${path.sep}`)) continue;
    const text = read(filePath);
    if (fetchPattern.test(text)) {
      fail(`${path.relative(root, filePath)} contains fetch() outside api layer.`);
    }
  }
}

function checkBootstrapFiles() {
  const required = [
    "app/startVanillaApp.js",
    "app/createAppContext.js",
    "app/registerAppModules.js"
  ];
  for (const rel of required) {
    if (!exists(path.join(src, rel))) warn(`Missing recommended Stage 1 file: src/${rel}`);
  }
}

function checkRecoveryScripts() {
  const scriptsDir = path.join(root, "scripts");
  if (!exists(scriptsDir)) return;
  for (const entry of fs.readdirSync(scriptsDir)) {
    if (entry.startsWith("recover-")) fail(`Temporary recovery script must be removed: scripts/${entry}`);
  }
}

function checkImplSize() {
  const implPath = path.join(src, "app", "createAppContext.impl.js");
  const buildContextPath = path.join(src, "app", "createAppContext", "buildContext.js");
  const targetPath = exists(implPath) ? implPath : buildContextPath;
  if (!exists(targetPath)) return;
  const lines = countLines(targetPath);
  const label = path.relative(root, targetPath);
  const stage = String(process.env.QUANTGYM_STAGE || "2");
  const hard = Number(process.env.STAGE1_IMPL_MAX || (stage === "1" ? 700 : 2500));
  const target = Number(process.env.STAGE1_IMPL_TARGET || (stage === "1" ? 500 : 700));
  if (lines > hard) fail(`${label} has ${lines} lines (max ${hard}).`);
  else if (lines > target) warn(`${label} has ${lines} lines (target ${target}).`);
}

function checkModuleControllersRetired() {
  const filePath = path.join(src, "app", "moduleControllers.js");
  if (exists(filePath)) {
    fail("moduleControllers.js must be deleted after full React page migration.");
  }
}

function checkGeneratedRuntimeSlices() {
  const stage = String(process.env.QUANTGYM_STAGE || "2");
  if (stage === "1") return;
  const contextDir = path.join(src, "app", "createAppContext");
  if (!exists(contextDir)) return;
  const patterns = [/\bnew Function\b/, /\bconst body = /, /\bimportKeys\b/, /\bctxKeys\b/];
  for (const filePath of walkJsFiles(contextDir)) {
    const rel = path.relative(root, filePath);
    const text = read(filePath);
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        warn(`${rel} uses generated runtime execution (${pattern}); replace with normal modules.`);
      }
    }
  }
}

function checkDomainStoresWired() {
  const paths = [
    path.join(src, "app", "createAppContext.js"),
    path.join(src, "app", "createAppContext", "buildContext.js"),
    path.join(src, "app", "storeBridge.js")
  ].filter(exists);
  const text = paths.map(read).join("\n");
  const required = ["createAuthStore", "createUserStateStore", "createAppStore"];
  for (const name of required) {
    if (!text.includes(name)) warn(`Domain store factory ${name} is not wired in app context yet.`);
  }
  const servicesDir = path.join(src, "app", "services");
  if (!exists(servicesDir)) warn("Missing src/app/services/ directory for domain service extraction.");
}

function checkStrictStage1() {
  const stage = String(process.env.QUANTGYM_STAGE || "2");
  if (stage !== "1") return;
  const pkg = JSON.parse(read(path.join(root, "package.json")));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ["react", "react-dom", "react-router-dom"]) {
    if (deps[name]) fail(`Strict Stage 1 forbids React dependency: ${name}`);
  }
  const reactDirs = ["routes", "layouts", "pages", "features", "legacy"];
  for (const dir of reactDirs) {
    if (exists(path.join(src, dir))) fail(`Strict Stage 1 forbids src/${dir}/ while React bridge is active.`);
  }
  if (exists(path.join(src, "main.jsx"))) fail("Strict Stage 1 forbids src/main.jsx.");
  if (exists(path.join(src, "App.jsx"))) fail("Strict Stage 1 forbids src/App.jsx.");
}

function main() {
  checkNoRootAppJs();
  checkRouter();
  checkManifest();
  const manifestIds = extractManifestIds();
  checkModuleIndexes(manifestIds);
  checkHtmlManifestAlignment(manifestIds);
  checkNoReactDeps();
  checkMainJsSize();
  checkNoImportsFromMain();
  checkFetchAllowlist();
  checkBootstrapFiles();
  checkRecoveryScripts();
  checkImplSize();
  checkModuleControllersRetired();
  checkGeneratedRuntimeSlices();
  checkDomainStoresWired();
  checkStrictStage1();

  if (warnings.length) {
    console.log("Stage 1 warnings:");
    warnings.forEach((message) => console.log(`  ⚠ ${message}`));
  }

  if (failures.length) {
    console.error("Stage 1 check failed:");
    failures.forEach((message) => console.error(`  ✗ ${message}`));
    process.exit(1);
  }

  console.log("Stage 1 check passed.");
  if (warnings.length) process.exit(0);
}

main();
