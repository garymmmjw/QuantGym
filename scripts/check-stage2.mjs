#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import zlib from "node:zlib";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const failures = [];
const warnings = [];
const args = new Set(process.argv.slice(2));
const fullMode = args.has("--full");
const bridgeMode = fullMode || args.has("--bridge") || args.size === 0;
const strictFull = args.has("--strict") || process.env.QUANTGYM_STAGE2_STRICT === "1";

const BRIDGE_IMPORTS = [
  "createBridgePage",
  "PartialBridgeContent",
  "ReactPageShell"
];

const COMPAT_NAMES = [
  "runLegacyBootstrap",
  "ShellBootstrap",
  "RouteBridge",
  "LegacyAppContext",
  "createLegacyApp"
];

const COMPAT_ADAPTER_PATHS = [];

const GENERATED_RUNTIME_PATTERNS = [
  /\bnew Function\b/,
  /\bconst body = /,
  /\bimportKeys\b/,
  /\bctxKeys\b/
];

const GLOBAL_SHADOW_NAMES = [
  "Array",
  "Date",
  "Map",
  "Set",
  "Object",
  "Number",
  "String",
  "Boolean",
  "Symbol",
  "BigInt",
  "JSON",
  "Math",
  "Promise",
  "RegExp",
  "Error",
  "URL",
  "URLSearchParams",
  "globalThis",
  "window",
  "document",
  "history",
  "navigator",
  "location",
  "localStorage",
  "sessionStorage",
  "requestAnimationFrame",
  "setTimeout",
  "clearTimeout",
  "setInterval",
  "clearInterval",
  "FileReader",
  "IntersectionObserver",
  "MutationObserver",
  "CustomEvent",
  "Event",
  "crypto",
  "parseInt",
  "parseFloat",
  "isNaN",
  "isFinite",
  "encodeURIComponent",
  "decodeURIComponent"
];

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

function walkFiles(dir, results = [], filter = () => true) {
  if (!exists(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, results, filter);
    else if (filter(fullPath)) results.push(fullPath);
  }
  return results;
}

function parseSetFromRouteConfig(name) {
  const text = read(path.join(src, "routes", "routeConfig.js"));
  const block = text.match(new RegExp(`export const ${name} = new Set\\(\\[([\\s\\S]*?)\\]\\);`));
  if (!block) return new Set();
  return new Set([...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

function getPageBridgeImports(pagePath) {
  const text = read(pagePath);
  return BRIDGE_IMPORTS.filter((symbol) => text.includes(symbol));
}

function loadMigrationLedger() {
  const ledgerPath = path.join(root, "docs", "react-migration-ledger.json");
  if (!exists(ledgerPath)) {
    warn("Missing docs/react-migration-ledger.json");
    return null;
  }
  return JSON.parse(read(ledgerPath));
}

function checkRecoveryScripts() {
  const scriptsDir = path.join(root, "scripts");
  for (const entry of fs.readdirSync(scriptsDir)) {
    if (entry.startsWith("recover-")) fail(`Temporary recovery script must be removed: scripts/${entry}`);
    if (entry === "__pycache__") fail("scripts/__pycache__ must be removed.");
  }
}

function checkGeneratedRuntimeSlices(reportAsFailure = false) {
  const contextDir = path.join(src, "app", "createAppContext");
  if (!exists(contextDir)) return;
  for (const filePath of walkFiles(contextDir, [], (p) => p.endsWith(".js"))) {
    const rel = path.relative(root, filePath);
    const text = read(filePath);
    for (const pattern of GENERATED_RUNTIME_PATTERNS) {
      if (pattern.test(text)) {
        const message = `${rel} uses generated runtime execution (${pattern})`;
        if (reportAsFailure) fail(message);
        else warn(message);
      }
    }
  }
}

function checkPortalCompatibility(reportAsFailure = false) {
  const partialRoot = path.join(src, "components", "shell", "AppShellMain.jsx");
  if (exists(partialRoot) && read(partialRoot).includes("module-partial-root")) {
    const message = "AppShellMain.jsx still renders .module-partial-root placeholders";
    if (reportAsFailure) fail(message);
    else warn(message);
  }
}

function checkPageApiWhitelist(ledger) {
  if (!ledger?.pages) return;
  const featuresDir = path.join(src, "features");
  for (const filePath of walkFiles(featuresDir, [], (p) => /\.(js|jsx)$/.test(p))) {
    const text = read(filePath);
    if (text.includes("legacyApp.pageApi")) {
      fail(`${path.relative(root, filePath)} must use usePageApi instead of legacyApp.pageApi`);
    }
    text.split(/\r?\n/).forEach((line, index) => {
      if (!line.includes("usePageApi(")) return;
      if (/^\s*const\s+[A-Za-z0-9_$]+\s*=\s*usePageApi\(/.test(line)) return;
      fail(`${path.relative(root, filePath)}:${index + 1} must call usePageApi only as a top-level hook assignment`);
    });
    if (text.includes("document.addEventListener") && !filePath.includes("library/")) {
      warn(`${path.relative(root, filePath)} attaches document-level listeners`);
    }
  }
  const partial = Object.entries(ledger.pages).filter(([, e]) => e.status === "partial").map(([id]) => id);
  if (partial.length) warn(`Migration ledger partial pages: ${partial.join(", ")}`);

  const islands = Object.entries(ledger.pages).filter(([, entry]) => entry.status === "island");
  for (const [pageId, entry] of islands) {
    const scope = entry.island?.scope;
    if (!Array.isArray(scope) || !scope.length) {
      warn(`Migration ledger island page "${pageId}" missing island.scope documentation`);
    }
  }
}

function isCompatAdapterPath(relPath) {
  return COMPAT_ADAPTER_PATHS.includes(relPath.replace(/\\/g, "/"));
}

function checkCompatNames(reportAsFailure = false) {
  for (const name of COMPAT_NAMES) {
    const hits = [];
    for (const filePath of walkFiles(src, [], (p) => /\.(js|jsx)$/.test(p))) {
      const rel = path.relative(root, filePath);
      if (isCompatAdapterPath(rel)) continue;
      if (read(filePath).includes(name)) hits.push(rel);
    }
    if (hits.length) {
      const message = `Compatibility symbol "${name}" still used in: ${hits.slice(0, 4).join(", ")}${hits.length > 4 ? "…" : ""}`;
      if (reportAsFailure) fail(message);
      else warn(message);
    }
  }
}

function checkModulePageRetired(reportAsFailure = false) {
  const pagesDir = path.join(src, "pages");
  if (!exists(pagesDir)) return;
  for (const filePath of walkFiles(pagesDir, [], (p) => p.endsWith(".jsx"))) {
    const text = read(filePath);
    if (text.includes("ModulePage")) {
      const message = `${path.relative(root, filePath)} must not import ModulePage`;
      if (reportAsFailure) fail(message);
      else warn(message);
    }
  }
}

function checkImplReadable(reportAsFailure = false) {
  const implDir = path.join(src, "app", "createAppContext", "slices", "impl");
  if (!exists(implDir)) return;
  for (const filePath of walkFiles(implDir, [], (p) => p.endsWith(".impl.js"))) {
    const text = read(filePath);
    for (const name of GLOBAL_SHADOW_NAMES) {
      if (new RegExp(`^\\s*${name},\\s*$`, "m").test(text)) {
        const message = `${path.relative(root, filePath)} shadows browser/global builtin "${name}"`;
        if (reportAsFailure) fail(message);
        else warn(message);
      }
    }
    if (text.includes("__sliceScope")) {
      const message = `${path.relative(root, filePath)} still uses __sliceScope`;
      if (reportAsFailure) fail(message);
      else warn(message);
    }
  }
}

function checkLazyRoutes(reportAsFailure = false) {
  const routesPath = path.join(src, "routes", "routes.jsx");
  if (!exists(routesPath)) return;
  const text = read(routesPath);
  if (!text.includes("React.lazy") && !text.includes("lazy(")) {
    const message = "routes.jsx has no React.lazy route imports";
    if (reportAsFailure) fail(message);
    else warn(message);
  }
}

function checkBundleBudget(ledger) {
  const distAssets = path.join(root, "dist", "assets");
  if (!exists(distAssets)) {
    warn("dist/assets missing; run npm run build to check bundle budget");
    return;
  }
  const jsFiles = fs.readdirSync(distAssets).filter((name) => name.startsWith("index-") && name.endsWith(".js"));
  if (!jsFiles.length) {
    warn("No main index-*.js chunk found in dist/assets");
    return;
  }
  const mainPath = path.join(distAssets, jsFiles[0]);
  const raw = fs.readFileSync(mainPath);
  const rawKb = Math.round(raw.length / 1024);
  const gzipKb = Math.round(zlib.gzipSync(raw).length / 1024);
  const budget = ledger?.bundleBudget || { mainChunkRawKb: 800, mainChunkGzipKb: 400 };
  if (rawKb > budget.mainChunkRawKb) {
    warn(`Main chunk ${rawKb}KB raw exceeds budget ${budget.mainChunkRawKb}KB`);
  }
  if (gzipKb > budget.mainChunkGzipKb) {
    warn(`Main chunk ${gzipKb}KB gzip exceeds budget ${budget.mainChunkGzipKb}KB`);
  }
}

function checkPokerAudit() {
  const pokerHooks = path.join(src, "features", "poker", "pokerHooks.js");
  if (!exists(pokerHooks)) return;
  const text = read(pokerHooks);
  if (text.includes("document.addEventListener")) {
    warn("pokerHooks.js still attaches document-level listeners");
  }
  if (text.includes("legacyApp.pageApi") || text.includes("pageApi?.poker")) {
    warn("pokerHooks.js still depends on pageApi.poker");
  }
}

function checkLegacyDir() {
  const legacyDir = path.join(src, "legacy");
  if (exists(legacyDir)) {
    const files = walkFiles(legacyDir);
    if (files.length) warn(`src/legacy/ contains ${files.length} file(s); document or remove before final sign-off`);
  }
}

function checkBridgeMode() {
  const pkg = JSON.parse(read(path.join(root, "package.json")));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };
  for (const name of ["react", "react-dom", "react-router-dom"]) {
    if (!deps[name]) fail(`Missing React dependency: ${name}`);
  }

  const requiredFiles = [
    "src/main.jsx",
    "src/App.jsx",
    "src/routes/ProtectedRoute.jsx",
    "src/routes/routeConfig.js",
    "src/app/createAppServices.js",
    "src/routes/HashCompatRedirect.jsx",
    "src/stores/AppServicesContext.jsx",
    "src/stores/useExternalStore.js"
  ];

  for (const rel of requiredFiles) {
    if (!exists(path.join(root, rel))) fail(`Missing Stage 2 file: ${rel}`);
  }

  const html = read(path.join(root, "index.html"));
  if (!html.includes("/src/main.jsx")) fail("index.html must point to /src/main.jsx");

  const routeConfigText = read(path.join(src, "routes", "routeConfig.js"));
  if (!routeConfigText.includes("MODULE_MANIFEST")) fail("routeConfig must be derived from MODULE_MANIFEST.");
  if (!routeConfigText.includes("BRIDGE_PAGE_IDS")) fail("routeConfig must define BRIDGE_PAGE_IDS.");
  if (!routeConfigText.includes("mode:")) fail("routeConfig must define explicit route mode per manifest entry.");

  const appSource = read(path.join(src, "App.jsx"));
  if (!appSource.includes("BrowserRouter")) fail("App.jsx must use BrowserRouter for path routing.");

  const buildScript = read(path.join(root, "scripts", "build-static-site.mjs"));
  if (!buildScript.includes("_redirects")) {
    fail("build-static-site.mjs must emit Cloudflare Pages SPA rewrite rules.");
  }
  if (buildScript.includes('path.join(distDir, "404.html")')) {
    fail("build-static-site.mjs must not emit a top-level 404.html; Cloudflare Pages uses that for real 404 responses.");
  }

  const reactIds = parseSetFromRouteConfig("REACT_PAGE_IDS");
  const bridgeIds = parseSetFromRouteConfig("BRIDGE_PAGE_IDS");
  const pageFiles = walkFiles(path.join(src, "pages"), [], (p) => p.endsWith(".jsx"));

  for (const pagePath of pageFiles) {
    const pageName = path.basename(pagePath, ".jsx");
    const idMap = {
      news: "news", companies: "companies", settings: "settings", courses: "courses",
      jobs: "jobs", resume: "resume", experiences: "experiences", messages: "messages",
      network: "network", memory: "memory", overview: "overview", account: "account",
      library: "library", community: "community", problems: "problems", interview: "interview",
      skills: "skills", tools: "tools", plan: "plan", pk: "pk", poker: "poker"
    };
    const manifestId = Object.entries(idMap).find(([, v]) => pageName.toLowerCase().startsWith(v))?.[1]
      || pageName.replace(/Page$/i, "").toLowerCase();

    const imports = getPageBridgeImports(pagePath);
    if (reactIds.has(manifestId) && imports.length) {
      fail(`${path.relative(root, pagePath)} is in REACT_PAGE_IDS but still imports: ${imports.join(", ")}`);
    }
    if (bridgeIds.has(manifestId) && reactIds.has(manifestId)) {
      fail(`Route "${manifestId}" is listed in both REACT_PAGE_IDS and BRIDGE_PAGE_IDS.`);
    }
  }

  if (reactIds.has("poker") && bridgeIds.size > 0) {
    fail("poker must not be in REACT_PAGE_IDS until other bridge pages are migrated.");
  }

  const manifestPath = path.join(src, "modules", "manifest.js");
  const manifestCount = exists(manifestPath)
    ? [...read(manifestPath).matchAll(/id:\s*"([^"]+)"/g)].length
    : 0;
  const modeCounts = {
    react: reactIds.size,
    bridge: bridgeIds.size,
    legacy: Math.max(0, manifestCount - reactIds.size - bridgeIds.size)
  };

  for (const id of reactIds) {
    const page = pageFiles.find((p) => read(p).includes(`"${id}"`) || path.basename(p).toLowerCase().includes(id));
    if (page) {
      const imports = getPageBridgeImports(page);
      if (imports.length) fail(`REACT_PAGE_IDS contains "${id}" but page still uses bridge imports.`);
    }
  }

  checkRecoveryScripts();

  return modeCounts;
}

function checkFullMode() {
  const ledger = loadMigrationLedger();
  const routeConfigText = read(path.join(src, "routes", "routeConfig.js"));
  if (/mode:\s*"(legacy|bridge)"/.test(routeConfigText)) {
    fail("Full React check requires no legacy or bridge route modes.");
  }

  const srcFiles = walkFiles(src, [], (p) => /\.(js|jsx)$/.test(p));
  for (const filePath of srcFiles) {
    const rel = path.relative(root, filePath);
    if (rel.startsWith("src/pages/") || rel.startsWith("src/features/")) {
      const text = read(filePath);
      for (const symbol of BRIDGE_IMPORTS) {
        if (text.includes(symbol)) fail(`${rel} must not import ${symbol} in full React mode.`);
      }
      if (text.includes("useModuleControllerPage")) {
        fail(`${rel} must not use useModuleControllerPage in full React mode.`);
      }
      if (text.includes("PageMarkup")) {
        warn(`${rel} still uses generated PageMarkup; prefer hook-driven PageContent.`);
      }
    }
  }

  const servicesDir = path.join(src, "app", "services");
  if (!exists(servicesDir) || walkFiles(servicesDir).length < 2) {
    warn("Expected src/app/services/ with domain service modules.");
  }

  if (exists(path.join(src, "app", "moduleControllers.js"))) {
    fail("moduleControllers.js must be deleted in full React mode.");
  }
  if (exists(path.join(src, "app", "buildModuleControllerContexts.js"))) {
    fail("buildModuleControllerContexts.js must be deleted in full React mode.");
  }
  if (exists(path.join(src, "features", "shared", "useModuleControllerPage.js"))) {
    fail("useModuleControllerPage.js must be deleted in full React mode.");
  }

  const implPath = path.join(src, "app", "createAppContext.impl.js");
  if (exists(implPath) && read(implPath).split("\n").length > 700) {
    fail("createAppContext.impl.js must be split or deleted before full React check passes.");
  }

  if (!exists(path.join(root, "docs", "react-migration-ledger.md"))) {
    fail("Missing docs/react-migration-ledger.md");
  }

  checkGeneratedRuntimeSlices(strictFull);
  checkPortalCompatibility(strictFull);
  checkPageApiWhitelist(ledger);
  checkModulePageRetired(strictFull);
  checkImplReadable(strictFull);
  checkCompatNames(strictFull);
  checkLazyRoutes(strictFull);
  checkBundleBudget(ledger);
  checkPokerAudit();
  checkLegacyDir();
}

function main() {
  if (!bridgeMode && !fullMode) {
    fail("Specify --bridge or --full.");
  }

  const modeCounts = checkBridgeMode();
  if (fullMode) checkFullMode();

  if (warnings.length) {
    console.log("Stage 2 warnings:");
    warnings.forEach((message) => console.log(`  ⚠ ${message}`));
  }

  if (failures.length) {
    console.error(`Stage 2 ${fullMode ? "full" : "bridge"} check failed:`);
    failures.forEach((message) => console.error(`  ✗ ${message}`));
    process.exit(1);
  }

  console.log(`Stage 2 ${fullMode ? "full" : "bridge"} check passed.`);
  if (modeCounts) {
    console.log(`legacy routes: ${modeCounts.legacy || 0}`);
    console.log(`bridge routes: ${modeCounts.bridge || 0}`);
    console.log(`react routes: ${modeCounts.react || 0}`);
  }
}

main();
