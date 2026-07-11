import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
if (process.env.QUANTGYM_WEB_IGNORE_DOTENV !== "1") loadEnvFromProjectRoot();
const outputDir = path.resolve(projectRoot, process.env.QUANTGYM_WEB_DIST || "dist");
const strict = process.argv.includes("--strict") || process.env.QUANTGYM_WEB_STRICT === "1";
const runtimeConfig = process.env.QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG === "1" ? {} : loadRuntimeConfig();

const webConfig = {
  cloudApiEndpoint: value("QUANTGYM_WEB_API_ENDPOINT", "QUANTGYM_CLOUD_API_ENDPOINT", "CLOUD_API_ENDPOINT") || clean(runtimeConfig.cloudApiEndpoint),
  llmEndpoint: value("QUANTGYM_WEB_LLM_ENDPOINT", "QUANTGYM_LLM_ENDPOINT", "LLM_ENDPOINT") || clean(runtimeConfig.llmEndpoint),
  llmModel: value("QUANTGYM_WEB_LLM_MODEL", "QUANTGYM_LLM_MODEL", "OPENAI_MODEL") || clean(runtimeConfig.llmModel) || "gpt-5-nano",
  googleClientId: value("QUANTGYM_WEB_GOOGLE_CLIENT_ID", "QUANTGYM_GOOGLE_CLIENT_ID") || clean(runtimeConfig.googleClientId),
  problemCatalogScript: value("QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT") || clean(runtimeConfig.problemCatalogScript) || "/data/problem-catalog.js?v=2",
  googleLoginEnabled: false,
  buildCommit: resolveBuildCommit(),
  buildBranch: resolveBuildBranch(),
  buildSource: resolveBuildSource()
};
webConfig.googleLoginEnabled = boolValue(
  "QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED",
  runtimeConfig.googleLoginEnabled ?? Boolean(webConfig.googleClientId)
);

if (strict) {
  requireHttps("QUANTGYM_WEB_API_ENDPOINT", webConfig.cloudApiEndpoint);
  requireHttps("QUANTGYM_WEB_LLM_ENDPOINT", webConfig.llmEndpoint);
}

// Run Vite build. Reads vite.config.js, bundles src/main.js and its imports,
// and outputs hashed HTML/CSS/JS/assets to dist/.
console.log("Running vite build...");
execSync("node_modules/.bin/vite build", {
  cwd: projectRoot,
  stdio: "inherit",
  env: {
    ...process.env,
    QUANTGYM_WEB_API_ENDPOINT: webConfig.cloudApiEndpoint,
    QUANTGYM_WEB_LLM_ENDPOINT: webConfig.llmEndpoint,
    QUANTGYM_WEB_LLM_MODEL: webConfig.llmModel,
    QUANTGYM_WEB_GOOGLE_CLIENT_ID: webConfig.googleClientId,
    QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED: String(webConfig.googleLoginEnabled)
  }
});

// Vite leaves classic script tags untouched, and dynamic asset paths in the app
// are not visible to Rollup. Copy those static runtime files explicitly.
writeConfig(outputDir);
writeVersionFile(outputDir);
copyRuntimeStaticFiles(outputDir);

// Locale entry pages (/zh/ and /en/) are generated after Vite build because
// they reference the hashed asset URLs already in dist/index.html.
writeLocaleEntries(outputDir);
writeSpaFallbackRules(outputDir);
writeAssetNotFoundPage(outputDir);

console.log(`Built static site in ${path.relative(projectRoot, outputDir) || outputDir}`);
if (!webConfig.cloudApiEndpoint || !webConfig.llmEndpoint) {
  console.warn("Warning: generated config.js has empty endpoints; will fall back to local dev URLs.");
}

function value(...names) {
  for (const name of names) {
    const current = clean(process.env[name]);
    if (current) return current;
  }
  return "";
}

function clean(valueToClean) {
  return String(valueToClean || "").trim();
}

function boolValue(name, fallback = false) {
  const raw = value(name).toLowerCase();
  if (!raw) return fallback;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return ["1", "true", "yes", "on"].includes(raw);
}

function requireHttps(name, endpoint) {
  if (!endpoint) throw new Error(`${name} is required when --strict is used`);
  if (!endpoint.startsWith("https://")) throw new Error(`${name} must start with https:// for beta deployment`);
}

function writeLocaleEntries(distDir) {
  // Emit /zh/index.html and /en/index.html from the Vite-built dist/index.html.
  const builtHtml = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
  for (const locale of ["zh", "en"]) {
    const htmlLang = locale === "en" ? "en" : "zh-CN";
    const content = builtHtml
      .replace(/<html lang="[^"]*">/, `<html lang="${htmlLang}">`)
      .replace(/src="config\.js"/g, 'src="/config.js"')
      .replace(/src="data\//g, 'src="/data/');
    const to = path.join(distDir, locale, "index.html");
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, content);
  }
}

function copyRuntimeStaticFiles(distDir) {
  const dataDir = path.join(projectRoot, "data");
  const distDataDir = path.join(distDir, "data");
  fs.mkdirSync(distDataDir, { recursive: true });
  for (const fileName of fs.readdirSync(dataDir)) {
    if (fileName.endsWith(".js")) {
      fs.copyFileSync(path.join(dataDir, fileName), path.join(distDataDir, fileName));
    }
  }
  copyConfiguredProblemCatalog(distDir);

  const generatedAssetsDir = path.join(projectRoot, "assets", "generated");
  const distGeneratedAssetsDir = path.join(distDir, "assets", "generated");
  fs.cpSync(generatedAssetsDir, distGeneratedAssetsDir, { recursive: true });

  const problemMediaDir = path.join(projectRoot, "assets", "problem-media");
  if (fs.existsSync(problemMediaDir)) {
    fs.cpSync(problemMediaDir, path.join(distDir, "assets", "problem-media"), { recursive: true });
  }

  const libraryCoversDir = path.join(projectRoot, "assets", "library-covers");
  if (fs.existsSync(libraryCoversDir)) {
    fs.cpSync(libraryCoversDir, path.join(distDir, "assets", "library-covers"), { recursive: true });
  }
}

function copyConfiguredProblemCatalog(distDir) {
  const source = clean(process.env.QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE);
  if (!source) return;
  const scriptPath = clean(webConfig.problemCatalogScript).split(/[?#]/, 1)[0];
  if (!scriptPath.startsWith("/data/") || !scriptPath.endsWith(".js") || scriptPath.includes("..")) {
    throw new Error("QUANTGYM_WEB_PROBLEM_CATALOG_SCRIPT must be a site-relative /data/*.js path when QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE is set.");
  }
  const sourcePath = path.resolve(projectRoot, source);
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`QUANTGYM_WEB_PROBLEM_CATALOG_SOURCE not found: ${source}`);
  }
  const destination = path.join(distDir, scriptPath.replace(/^\/+/, ""));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(sourcePath, destination);
}

function writeSpaFallbackRules(distDir) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) return;
  // Cloudflare Pages serves unknown paths with 200 SPA fallback only when no
  // top-level 404.html exists. Keep the explicit rewrite rule, but do not emit
  // a custom 404 page that would turn valid React routes into HTTP 404s.
  fs.writeFileSync(path.join(distDir, "_redirects"), "/* /index.html 200\n");
}

function writeAssetNotFoundPage(distDir) {
  const assetsDir = path.join(distDir, "assets");
  if (!fs.existsSync(assetsDir)) return;
  // Keep the SPA fallback for application routes, but let missing hashed chunks
  // under /assets fail as 404s instead of returning index.html as text/html.
  fs.writeFileSync(
    path.join(assetsDir, "404.html"),
    "<!doctype html><meta charset=\"utf-8\"><title>Asset not found</title><p>Asset not found.</p>\n"
  );
}

function writeConfig(distDir) {
  fs.mkdirSync(distDir, { recursive: true });
  const configPath = path.join(distDir, "config.js");
  const content = [
    "// Generated by scripts/build-static-site.mjs.",
    "window.QUANTGYM_CONFIG = " + JSON.stringify(webConfig, null, 2) + ";",
    ""
  ].join("\n");
  fs.writeFileSync(configPath, content);
}

function writeVersionFile(distDir) {
  fs.mkdirSync(distDir, { recursive: true });
  const versionPath = path.join(distDir, "version.json");
  const version = {
    commit: webConfig.buildCommit,
    branch: webConfig.buildBranch,
    source: webConfig.buildSource
  };
  fs.writeFileSync(versionPath, `${JSON.stringify(version, null, 2)}\n`);
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) continue;
    process.env[key] = unquoteEnvValue(trimmed.slice(separatorIndex + 1).trim());
  }
}

function resolveBuildCommit() {
  return clean(
    value("QUANTGYM_WEB_BUILD_COMMIT", "CF_PAGES_COMMIT_SHA", "GITHUB_SHA", "VERCEL_GIT_COMMIT_SHA", "RENDER_GIT_COMMIT")
      || gitOutput("git rev-parse HEAD")
  ).slice(0, 40);
}

function resolveBuildBranch() {
  return clean(
    value("QUANTGYM_WEB_BUILD_BRANCH", "CF_PAGES_BRANCH", "GITHUB_REF_NAME", "VERCEL_GIT_COMMIT_REF", "RENDER_GIT_BRANCH")
      || gitOutput("git rev-parse --abbrev-ref HEAD")
  );
}

function resolveBuildSource() {
  if (clean(process.env.CF_PAGES_COMMIT_SHA)) return "cloudflare-pages";
  if (clean(process.env.GITHUB_SHA)) return "github";
  if (clean(process.env.VERCEL_GIT_COMMIT_SHA)) return "vercel";
  if (clean(process.env.RENDER_GIT_COMMIT)) return "render";
  return "local-git";
}

function gitOutput(command) {
  try {
    return execSync(command, {
      cwd: projectRoot,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    });
  } catch {
    return "";
  }
}

function unquoteEnvValue(valueToUnquote) {
  if (
    (valueToUnquote.startsWith('"') && valueToUnquote.endsWith('"'))
    || (valueToUnquote.startsWith("'") && valueToUnquote.endsWith("'"))
  ) {
    return valueToUnquote.slice(1, -1);
  }
  return valueToUnquote;
}

function loadRuntimeConfig() {
  const configPath = path.join(projectRoot, "config.js");
  if (!fs.existsSync(configPath)) return {};
  const context = { window: {} };
  vm.createContext(context);
  try {
    vm.runInContext(fs.readFileSync(configPath, "utf8"), context, { filename: configPath });
    return context.window.QUANTGYM_CONFIG || {};
  } catch (error) {
    if (strict) throw error;
    console.warn(`Warning: could not read root config.js: ${error.message}`);
    return {};
  }
}
