import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDir, "..");
loadEnvFromProjectRoot();
const outputDir = path.resolve(projectRoot, process.env.QUANTGYM_WEB_DIST || "dist");
const strict = process.argv.includes("--strict") || process.env.QUANTGYM_WEB_STRICT === "1";
const runtimeConfig = loadRuntimeConfig();

const webConfig = {
  cloudApiEndpoint: value("QUANTGYM_WEB_API_ENDPOINT", "QUANTGYM_CLOUD_API_ENDPOINT", "CLOUD_API_ENDPOINT") || clean(runtimeConfig.cloudApiEndpoint),
  llmEndpoint: value("QUANTGYM_WEB_LLM_ENDPOINT", "QUANTGYM_LLM_ENDPOINT", "LLM_ENDPOINT") || clean(runtimeConfig.llmEndpoint),
  llmModel: value("QUANTGYM_WEB_LLM_MODEL", "QUANTGYM_LLM_MODEL", "OPENAI_MODEL") || clean(runtimeConfig.llmModel) || "gpt-5-nano",
  googleClientId: value("QUANTGYM_WEB_GOOGLE_CLIENT_ID", "QUANTGYM_GOOGLE_CLIENT_ID") || clean(runtimeConfig.googleClientId),
  googleLoginEnabled: false
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
copyRuntimeStaticFiles(outputDir);

// Locale entry pages (/zh/ and /en/) are generated after Vite build because
// they reference the hashed asset URLs already in dist/index.html.
writeLocaleEntries(outputDir);
writeSpaFallbackRules(outputDir);

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

function writeSpaFallbackRules(distDir) {
  const indexPath = path.join(distDir, "index.html");
  if (!fs.existsSync(indexPath)) return;
  // Cloudflare Pages serves unknown paths with 200 SPA fallback only when no
  // top-level 404.html exists. Keep the explicit rewrite rule, but do not emit
  // a custom 404 page that would turn valid React routes into HTTP 404s.
  fs.writeFileSync(path.join(distDir, "_redirects"), "/* /index.html 200\n");
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
