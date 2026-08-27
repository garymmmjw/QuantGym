import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");
const EXPECTED_BRANCH = "codex/frontend-v2-preview";

const clean = (value) => typeof value === "string" ? value.trim() : "";
const required = (value, name) => {
  const normalized = clean(value);
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
};

const isPreviewApiHostname = (hostname) => (
  hostname.toLowerCase() === "quantgym-v2-preview-api.onrender.com"
);

const validateApiBase = (source) => {
  let url;
  try {
    url = new URL(required(source, "QUANTGYM_PREVIEW_API_BASE"));
  } catch (error) {
    if (error.message === "QUANTGYM_PREVIEW_API_BASE is required") throw error;
    throw new Error("API base must be an absolute HTTPS URL");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("API base must not contain credentials, query parameters, or fragments");
  }
  if (url.protocol !== "https:") throw new Error("API base must be an absolute HTTPS URL");
  if (url.pathname !== "/api/v2") throw new Error("API base path must equal /api/v2");
  if (
    url.port
    || !isPreviewApiHostname(url.hostname)
    || /(?:^|\.)api\.quantgym\.app$/i.test(url.hostname)
    || /(?:^|\.)beta\.quantgym\.app$/i.test(url.hostname)
  ) {
    throw new Error("API base must use the Preview API origin");
  }
  return url.href;
};

const validateOutputDirectory = (outDir) => {
  const resolved = path.resolve(required(outDir, "--out-dir"));
  if (path.basename(resolved) !== "dist-preview") {
    throw new Error("--out-dir must end with dist-preview");
  }
  if (resolved === path.parse(resolved).root || resolved === defaultRoot) {
    throw new Error("refusing unsafe --out-dir");
  }
  return resolved;
};

export async function buildFrontendUpgradePreviewWeb({ outDir, env = process.env } = {}) {
  const destination = validateOutputDirectory(outDir);
  const pagesCommit = required(env.CF_PAGES_COMMIT_SHA, "CF_PAGES_COMMIT_SHA");
  const pagesBranch = required(env.CF_PAGES_BRANCH, "CF_PAGES_BRANCH");
  const environment = required(
    env.QUANTGYM_PREVIEW_ENVIRONMENT,
    "QUANTGYM_PREVIEW_ENVIRONMENT",
  );
  const service = required(env.QUANTGYM_PREVIEW_SERVICE, "QUANTGYM_PREVIEW_SERVICE");
  const configuredCommit = required(env.QUANTGYM_PREVIEW_COMMIT, "QUANTGYM_PREVIEW_COMMIT");
  const configuredBranch = required(env.QUANTGYM_PREVIEW_BRANCH, "QUANTGYM_PREVIEW_BRANCH");

  if (environment !== "preview-v2") throw new Error("environment must equal preview-v2");
  if (service !== "web") throw new Error("service must equal web");
  if (pagesBranch !== EXPECTED_BRANCH) {
    throw new Error(`CF_PAGES_BRANCH must equal ${EXPECTED_BRANCH}`);
  }
  if (configuredCommit !== pagesCommit) {
    throw new Error("commit must match CF_PAGES_COMMIT_SHA");
  }
  if (configuredBranch !== pagesBranch) {
    throw new Error("branch must match CF_PAGES_BRANCH");
  }
  const apiBase = validateApiBase(env.QUANTGYM_PREVIEW_API_BASE);

  const version = {
    environment,
    service,
    commit: pagesCommit,
    branch: pagesBranch,
    buildSource: "cloudflare-pages",
  };
  const config = { ...version, apiBase };
  const index = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>QuantGym Preview v2 probe</title>
  </head>
  <body>
    <main>
      <h1>QuantGym Preview v2</h1>
      <p>Minimal environment-isolation probe.</p>
      <pre id="probe" aria-live="polite">Loading…</pre>
    </main>
    <script type="module">
      const [config, version] = await Promise.all([
        fetch("./config.json", { credentials: "omit" }).then((response) => response.json()),
        fetch("./version.json", { credentials: "omit" }).then((response) => response.json()),
      ]);
      document.querySelector("#probe").textContent = JSON.stringify({ config, version }, null, 2);
    </script>
  </body>
</html>
`;

  await rm(destination, { recursive: true, force: true });
  await mkdir(destination, { recursive: true });
  await Promise.all([
    writeFile(path.join(destination, "index.html"), index, "utf8"),
    writeFile(path.join(destination, "config.json"), `${JSON.stringify(config, null, 2)}\n`, "utf8"),
    writeFile(path.join(destination, "version.json"), `${JSON.stringify(version, null, 2)}\n`, "utf8"),
  ]);
  return { outDir: destination, files: ["index.html", "config.json", "version.json"] };
}

const parseOutDir = (argv) => {
  if (argv.length !== 2 || argv[0] !== "--out-dir" || !argv[1]) {
    throw new Error("usage: build-frontend-upgrade-preview-web.mjs --out-dir dist-preview");
  }
  return argv[1];
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await buildFrontendUpgradePreviewWeb({
      outDir: parseOutDir(process.argv.slice(2)),
      env: process.env,
    });
    console.log(`Wrote minimal Preview web probe to ${result.outDir} (3 files)`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
