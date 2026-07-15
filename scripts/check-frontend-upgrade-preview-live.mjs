import { spawnSync } from "node:child_process";
import { access, constants as fsConstants, lstat, open, mkdir, mkdtemp, readdir, readFile, realpath, rename, rm, stat, writeFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { buildFrontendUpgradePreviewWeb } from "./build-frontend-upgrade-preview-web.mjs";
import { runFrontendUpgradePreviewR2Check } from "./check-frontend-upgrade-preview-r2.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");

const BRANCH = "codex/frontend-v2-preview";
const WEB_HOST = "quantgym-v2-preview.pages.dev";
const API_HOST = "quantgym-v2-preview-api.onrender.com";
const SOURCE = "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation";
const REPOSITORY = "https://github.com/garymmmjw/QuantGym";
const REMOTE_REPOSITORY = "https://github.com/garymmmjw/QuantGym.git";
const PAGES_BUILD = (
  "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview"
);
const RENDER_START = "node scripts/serve-frontend-upgrade-preview-probe.mjs";
const EVIDENCE_RELATIVE = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);
const SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json"
);
const MAX_EVIDENCE_BYTES = 256 * 1024;
const MAX_VENV_CONFIG_BYTES = 16 * 1024;
const MAX_VENV_ENTRIES = 50_000;
const MAX_GIT_OUTPUT_BYTES = 4 * 1024 * 1024;
const MAX_JSON_BYTES = 64 * 1024;
const MAX_HTML_BYTES = 128 * 1024;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const FUTURE_SKEW_MS = 5 * 60 * 1000;
const TRUSTED_GIT_PATH = "/usr/bin/git";
const PREVIEW_CHECK_PYTHON_PATH = "/tmp/quantgym-preview-check-venv/bin/python3";
const PREVIEW_RUNTIME_FILES = Object.freeze([
  "scripts/build-frontend-upgrade-preview-web.mjs",
  "scripts/check-frontend-upgrade-preview-live.mjs",
  "scripts/check-frontend-upgrade-preview-postgres.py",
  "scripts/check-frontend-upgrade-preview-r2.mjs",
]);
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const COMMIT_PATTERN = /^[a-f0-9]{40}$/;
const CREDENTIAL_KEY = /(?:^|[-_])(?:api[-_]?token|access[-_]?key|secret(?:[-_]?access[-_]?key)?|password|authorization|cookie|private[-_]?key|connection[-_]?string|dsn)(?:$|[-_])/i;

export const TEST_ONLY_PREVIEW_LIVE = Symbol("frontend-upgrade-preview-live-test-only");
export const TEST_ONLY_PREVIEW_POSTGRES_RUNNER_SOURCE = (
  "import runpy,sys; "
  + "site_packages,script=sys.argv[1:3]; "
  + "sys.argv=[script]; "
  + "sys.path.append(site_packages); "
  + "runpy.run_path(script, run_name='__main__')"
);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);
const fail = (message) => { throw new Error(message); };
const requireText = (value, label) => {
  if (typeof value !== "string" || value !== value.trim() || !value || /[\u0000-\u001f\u007f]/.test(value)) {
    fail(`${label} is invalid`);
  }
  return value;
};
const requireHash = (value, label) => {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) fail(`${label} is invalid`);
  return value;
};
const requireBoolean = (value, expected, label) => {
  if (value !== expected) fail(`${label} is invalid`);
};
const requireExactKeys = (value, keys, label) => {
  if (!isPlainObject(value)) fail(`${label} is invalid`);
  const expected = [...keys].sort();
  const actual = Object.keys(value).sort();
  if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) {
    fail(`${label} has an unapproved shape`);
  }
  return value;
};
const requireHashArray = (value, label, { length } = {}) => {
  if (!Array.isArray(value) || (length !== undefined && value.length !== length)) {
    fail(`${label} is invalid`);
  }
  value.forEach((entry, index) => requireHash(entry, `${label}[${index}]`));
  if (new Set(value).size !== value.length) fail(`${label} must be unique`);
  return value;
};

const rejectCredentialKeys = (value, label = "provider evidence") => {
  if (Array.isArray(value)) {
    value.forEach((entry, index) => rejectCredentialKeys(entry, `${label}[${index}]`));
    return;
  }
  if (!isPlainObject(value)) return;
  for (const [key, entry] of Object.entries(value)) {
    if (CREDENTIAL_KEY.test(key)) fail(`${label} contains a credential field`);
    rejectCredentialKeys(entry, `${label}.${key}`);
  }
};

const normalizeOrigin = (value, kind) => {
  const source = requireText(value, `Preview ${kind} origin`);
  let url;
  try {
    url = new URL(source);
  } catch {
    fail(`Preview ${kind} origin is invalid`);
  }
  const hostname = url.hostname.toLowerCase();
  const webHostValid = hostname === WEB_HOST || hostname.endsWith(`.${WEB_HOST}`);
  const hostValid = kind === "web" ? webHostValid : hostname === API_HOST;
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.search
    || url.hash
    || url.pathname !== "/"
    || hostname.endsWith(".")
    || hostname.includes("xn--")
    || isIP(hostname) !== 0
    || !hostValid
  ) fail(`Preview ${kind} origin is invalid`);
  return url.origin;
};

const requireCommit = (value) => {
  const commit = requireText(value, "expected commit");
  if (!COMMIT_PATTERN.test(commit)) fail("expected commit is invalid");
  return commit;
};

const requireTemporaryTestRoot = async (root) => {
  let rootRealPath;
  let defaultRealPath;
  let temporaryRealPath;
  try {
    [rootRealPath, defaultRealPath, temporaryRealPath] = await Promise.all([
      realpath(root),
      realpath(defaultRoot),
      realpath(tmpdir()),
    ]);
  } catch {
    fail("test-only live injection requires an existing temporary root");
  }
  const relative = path.relative(temporaryRealPath, rootRealPath);
  if (
    rootRealPath === defaultRealPath
    || relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) fail("test-only live injection requires an isolated temporary root");
};

const readEvidence = async (root, configuredPath) => {
  const expectedDirectory = path.resolve(
    root,
    "artifacts/frontend-upgrade/preview-environment",
  );
  const candidate = path.resolve(root, configuredPath || EVIDENCE_RELATIVE);
  if (
    path.dirname(candidate) !== expectedDirectory
    || path.basename(candidate) !== "provider-evidence.redacted.json"
  ) fail("provider evidence path is outside the approved operator directory");

  let directoryRealPath;
  let rootRealPath;
  try {
    rootRealPath = await realpath(root);
    directoryRealPath = await realpath(expectedDirectory);
  } catch {
    fail("provider evidence directory is unavailable");
  }
  const expectedDirectoryRealPath = path.join(
    rootRealPath,
    "artifacts/frontend-upgrade/preview-environment",
  );
  if (directoryRealPath !== expectedDirectoryRealPath) {
    fail("provider evidence directory is unsafe");
  }

  let handle;
  try {
    handle = await open(candidate, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch {
    fail("provider evidence is unavailable");
  }
  try {
    const stats = await handle.stat();
    if (!stats.isFile() || stats.size <= 0 || stats.size > MAX_EVIDENCE_BYTES) {
      fail("provider evidence file is invalid");
    }
    if ((stats.mode & 0o077) !== 0) fail("provider evidence permissions must be owner-only");
    if (await realpath(candidate) !== path.join(
      expectedDirectoryRealPath,
      "provider-evidence.redacted.json",
    )) fail("provider evidence file is unsafe");
    const bytes = await handle.readFile();
    const afterRead = await handle.stat();
    if (
      bytes.length !== stats.size
      || bytes.length > MAX_EVIDENCE_BYTES
      || afterRead.dev !== stats.dev
      || afterRead.ino !== stats.ino
      || afterRead.size !== stats.size
      || afterRead.mtimeMs !== stats.mtimeMs
    ) {
      fail("provider evidence file changed while being read");
    }
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      fail("provider evidence JSON is invalid");
    }
    return { value, bytes, sha256: sha256(bytes), path: candidate };
  } finally {
    await handle.close();
  }
};

const validateDate = (value, now) => {
  const capturedAt = requireText(value, "provider evidence capture time");
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(capturedAt)) {
    fail("provider evidence capture time is invalid");
  }
  const captured = new Date(capturedAt);
  if (!Number.isFinite(captured.getTime()) || captured.toISOString() !== capturedAt) {
    fail("provider evidence capture time is invalid");
  }
  if (captured.getTime() > now.getTime() + FUTURE_SKEW_MS) {
    fail("provider evidence capture time is in the future");
  }
  if (now.getTime() - captured.getTime() > SEVEN_DAYS_MS) {
    fail("provider evidence has expired");
  }
  return captured;
};

const validateService = (service, expected, allowedGroups, productionGroups) => {
  requireExactKeys(service, [
    "serviceIdHash", "name", "type", "repo", "branch", "buildCommand", "startCommand",
    "nodeVersion", "linkedGroupIdHashes",
  ], `Render ${expected.name} service`);
  requireHash(service.serviceIdHash, "Render service identity");
  if (
    service.name !== expected.name
    || service.type !== expected.type
    || service.repo !== REPOSITORY
    || service.branch !== BRANCH
    || service.buildCommand !== "npm ci"
    || service.startCommand !== RENDER_START
    || service.nodeVersion !== "20.20.2"
  ) fail(`Render ${expected.name} service contract is invalid`);
  const linked = requireHashArray(service.linkedGroupIdHashes, "Render linked groups");
  for (const group of linked) {
    if (!allowedGroups.has(group)) fail("Render linked group is outside the Preview allowlist");
    if (productionGroups.has(group)) fail("Render service links a production group");
  }
  return service;
};

const validateProviderEvidence = (value, { expectedCommit, webOrigin, now }) => {
  rejectCredentialKeys(value);
  requireExactKeys(value, [
    "schemaVersion", "authenticatedSource", "capturedAt", "operator", "budgetOwner",
    "destroyOwner", "cloudflare", "render",
  ], "provider evidence");
  if (value.schemaVersion !== 1 || value.authenticatedSource !== SOURCE) {
    fail("provider evidence source is not authenticated");
  }
  for (const [key, label] of [
    ["operator", "operator"],
    ["budgetOwner", "budget owner"],
    ["destroyOwner", "destroy owner"],
  ]) requireText(value[key], label);
  const captured = validateDate(value.capturedAt, now);

  const cloudflare = requireExactKeys(value.cloudflare, [
    "accountIdHash", "pages", "productionPagesProjectIdHash", "r2",
    "productionR2BucketIdentityHash",
  ], "Cloudflare evidence");
  requireHash(cloudflare.accountIdHash, "Cloudflare account identity");
  requireHash(cloudflare.productionPagesProjectIdHash, "production Pages identity");
  requireHash(cloudflare.productionR2BucketIdentityHash, "production R2 identity");

  const pages = requireExactKeys(cloudflare.pages, [
    "projectIdHash", "name", "productionBranch", "buildCommand", "destinationDir",
    "latestDeploymentCommit", "latestDeploymentStatus",
  ], "Pages evidence");
  requireHash(pages.projectIdHash, "Pages project identity");
  if (
    pages.name !== "quantgym-v2-preview"
    || pages.productionBranch !== BRANCH
    || pages.buildCommand !== PAGES_BUILD
    || pages.destinationDir !== "dist-preview"
    || pages.latestDeploymentCommit !== expectedCommit
    || pages.latestDeploymentStatus !== "success"
  ) fail("Pages deployment evidence is invalid");
  if (pages.projectIdHash === cloudflare.productionPagesProjectIdHash) {
    fail("Pages Preview and production identities overlap");
  }

  const r2 = requireExactKeys(cloudflare.r2, [
    "bucketIdentityHash", "bucketName", "jurisdiction", "endpointAccountIdHash", "private",
    "r2DevEnabled", "credentialScope", "signingRegion", "lifecycleDays", "corsOrigin",
  ], "R2 evidence");
  requireHash(r2.bucketIdentityHash, "R2 bucket identity");
  requireHash(r2.endpointAccountIdHash, "R2 endpoint account identity");
  if (
    r2.bucketName !== "quantgym-v2-preview-media"
    || !new Set(["default", "eu", "fedramp"]).has(r2.jurisdiction)
    || r2.private !== true
    || r2.r2DevEnabled !== false
    || r2.credentialScope !== "single-bucket-read-write"
    || r2.signingRegion !== "auto"
    || r2.lifecycleDays !== 7
    || r2.corsOrigin !== webOrigin
  ) fail("R2 provider evidence is invalid");
  if (r2.endpointAccountIdHash !== cloudflare.accountIdHash) {
    fail("R2 endpoint account identity does not match Cloudflare evidence");
  }
  if (r2.bucketIdentityHash === cloudflare.productionR2BucketIdentityHash) {
    fail("R2 Preview and production identities overlap");
  }

  const render = requireExactKeys(value.render, [
    "workspaceIdHash", "services", "productionServiceIdHashes",
    "previewAllowedGroupIdHashes", "productionGroupIdHashes", "postgres",
    "productionPostgresResourceIdHash",
  ], "Render evidence");
  requireHash(render.workspaceIdHash, "Render workspace identity");
  const productionServices = requireHashArray(
    render.productionServiceIdHashes,
    "Render production services",
    { length: 2 },
  );
  const allowedGroupValues = requireHashArray(
    render.previewAllowedGroupIdHashes,
    "Render Preview group allowlist",
  );
  const productionGroupValues = requireHashArray(
    render.productionGroupIdHashes,
    "Render production groups",
  );
  const allowedGroups = new Set(allowedGroupValues);
  const productionGroups = new Set(productionGroupValues);
  for (const group of allowedGroups) {
    if (productionGroups.has(group)) fail("Preview and production environment groups overlap");
  }
  if (!Array.isArray(render.services) || render.services.length !== 2) {
    fail("Render Preview service evidence is invalid");
  }
  const byName = new Map(render.services.map((service) => [service?.name, service]));
  if (byName.size !== 2) fail("Render Preview service names must be unique");
  const api = validateService(
    byName.get("quantgym-v2-preview-api"),
    { name: "quantgym-v2-preview-api", type: "web_service" },
    allowedGroups,
    productionGroups,
  );
  const llm = validateService(
    byName.get("quantgym-v2-preview-llm"),
    { name: "quantgym-v2-preview-llm", type: "private_service" },
    allowedGroups,
    productionGroups,
  );
  if (api.serviceIdHash === llm.serviceIdHash) fail("Render Preview service identities overlap");
  for (const identity of [api.serviceIdHash, llm.serviceIdHash]) {
    if (productionServices.includes(identity)) fail("Render Preview and production services overlap");
  }
  const usedGroups = new Set([
    ...api.linkedGroupIdHashes,
    ...llm.linkedGroupIdHashes,
  ]);
  if ([...allowedGroups].some((group) => !usedGroups.has(group))) {
    fail("Render Preview group allowlist contains an unlinked group");
  }

  const postgres = requireExactKeys(render.postgres, [
    "resourceIdHash", "hostHash", "databaseHash", "roleHash",
  ], "Postgres evidence");
  for (const [key, label] of [
    ["resourceIdHash", "Postgres resource identity"],
    ["hostHash", "Postgres host identity"],
    ["databaseHash", "Postgres database identity"],
    ["roleHash", "Postgres role identity"],
  ]) requireHash(postgres[key], label);
  requireHash(render.productionPostgresResourceIdHash, "production Postgres identity");
  if (postgres.resourceIdHash === render.productionPostgresResourceIdHash) {
    fail("Postgres Preview and production identities overlap");
  }

  return { captured, cloudflare, pages, r2, render, postgres };
};

const requestBytes = async ({ fetchImpl, url, method = "GET", headers = {}, maxBytes, label }) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: {
        "cache-control": "no-cache",
        ...headers,
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    fail(`${label} request failed`);
  }
  if (!response.ok) fail(`${label} returned a non-success status`);
  const declaredLengthSource = response.headers.get("content-length") || "";
  if (declaredLengthSource && !/^\d+$/.test(declaredLengthSource)) {
    fail(`${label} response length is invalid`);
  }
  const declaredLength = Number(declaredLengthSource || 0);
  if (declaredLength > maxBytes) fail(`${label} response is too large`);
  const reader = response.body?.getReader?.();
  if (!reader) fail(`${label} response body is unavailable`);
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      length += chunk.length;
      if (length > maxBytes) {
        await reader.cancel();
        fail(`${label} response is too large`);
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof Error && error.message === `${label} response is too large`) throw error;
    fail(`${label} response could not be read`);
  }
  const bytes = Buffer.concat(chunks, length);
  return { response, bytes };
};

const requestJson = async (options) => {
  const result = await requestBytes({ ...options, maxBytes: MAX_JSON_BYTES });
  const contentType = result.response.headers.get("content-type") || "";
  if (!/^application\/json(?:\s*;|$)/i.test(contentType)) {
    fail(`${options.label} did not return JSON`);
  }
  let value;
  try {
    value = JSON.parse(result.bytes.toString("utf8"));
  } catch {
    fail(`${options.label} returned invalid JSON`);
  }
  return { ...result, value };
};

const requireExactRecord = (actual, expected, label) => {
  requireExactKeys(actual, Object.keys(expected), label);
  for (const [key, value] of Object.entries(expected)) {
    if (actual[key] !== value) fail(`${label}.${key} is invalid`);
  }
};

const buildExpectedWebArtifacts = async (expectedCommit, apiOrigin) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "quantgym-preview-live-web-"));
  const outDir = path.join(temporaryRoot, "dist-preview");
  try {
    await buildFrontendUpgradePreviewWeb({
      outDir,
      env: {
        CF_PAGES_COMMIT_SHA: expectedCommit,
        CF_PAGES_BRANCH: BRANCH,
        QUANTGYM_PREVIEW_ENVIRONMENT: "preview-v2",
        QUANTGYM_PREVIEW_SERVICE: "web",
        QUANTGYM_PREVIEW_COMMIT: expectedCommit,
        QUANTGYM_PREVIEW_BRANCH: BRANCH,
        QUANTGYM_PREVIEW_API_BASE: `${apiOrigin}/api/v2`,
      },
    });
    const entries = await Promise.all(["index.html", "config.json", "version.json"].map(
      async (name) => [name, await readFile(path.join(outDir, name))],
    ));
    return new Map(entries);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
};

const fingerprintArtifacts = (artifacts) => {
  const hash = createHash("sha256");
  for (const name of ["index.html", "config.json", "version.json"]) {
    const bytes = artifacts.get(name);
    hash.update(name);
    hash.update("\0");
    hash.update(String(bytes.length));
    hash.update("\0");
    hash.update(bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
};

const checkWeb = async ({ fetchImpl, webOrigin, apiOrigin, expectedCommit }) => {
  const expected = await buildExpectedWebArtifacts(expectedCommit, apiOrigin);
  const live = new Map();
  for (const [name, maxBytes] of [
    ["index.html", MAX_HTML_BYTES],
    ["config.json", MAX_JSON_BYTES],
    ["version.json", MAX_JSON_BYTES],
  ]) {
    const result = await requestBytes({
      fetchImpl,
      url: `${webOrigin}/${name}`,
      maxBytes,
      label: `Preview web ${name}`,
    });
    if (!result.bytes.equals(expected.get(name))) fail(`Preview web ${name} does not match the minimal probe`);
    live.set(name, result.bytes);
  }

  const version = JSON.parse(live.get("version.json").toString("utf8"));
  requireExactRecord(version, {
    environment: "preview-v2",
    service: "web",
    commit: expectedCommit,
    branch: BRANCH,
    buildSource: "cloudflare-pages",
  }, "Preview web version");
  const config = JSON.parse(live.get("config.json").toString("utf8"));
  requireExactRecord(config, {
    ...version,
    apiBase: `${apiOrigin}/api/v2`,
  }, "Preview web config");
  rejectCredentialKeys(config, "Preview web config");
  return fingerprintArtifacts(live);
};

const checkApiHealth = async ({ fetchImpl, apiOrigin, webOrigin, expectedCommit }) => {
  const { response, value } = await requestJson({
    fetchImpl,
    url: `${apiOrigin}/api/v2/health`,
    headers: { accept: "application/json", origin: webOrigin },
    label: "Preview API health",
  });
  requireExactRecord(value, {
    status: "ok",
    environment: "preview-v2",
    service: "api",
    commit: expectedCommit,
    legacySchemaLoaded: false,
    llmVerified: true,
    llmCommit: expectedCommit,
  }, "Preview API health");
  if (
    response.headers.get("access-control-allow-origin") !== webOrigin
    || response.headers.get("access-control-allow-credentials") === "true"
    || !(response.headers.get("vary") || "").split(",")
      .map((entry) => entry.trim().toLowerCase()).includes("origin")
  ) fail("Preview API GET CORS is invalid");
};

const preflight = async ({ fetchImpl, apiOrigin, origin, expectedOrigin }) => {
  let response;
  try {
    response = await fetchImpl(`${apiOrigin}/api/v2/health`, {
      method: "OPTIONS",
      headers: {
        origin,
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    fail("Preview API CORS request failed");
  }
  const allowOrigin = response.headers.get("access-control-allow-origin");
  const allowCredentials = response.headers.get("access-control-allow-credentials");
  if (expectedOrigin) {
    const methods = new Set((response.headers.get("access-control-allow-methods") || "")
      .split(",").map((entry) => entry.trim().toUpperCase()).filter(Boolean));
    const allowedHeaders = new Set((response.headers.get("access-control-allow-headers") || "")
      .split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean));
    const vary = new Set((response.headers.get("vary") || "")
      .split(",").map((entry) => entry.trim().toLowerCase()).filter(Boolean));
    if (
      response.status !== 204
      || allowOrigin !== expectedOrigin
      || allowCredentials === "true"
      || !methods.has("GET")
      || !methods.has("OPTIONS")
      || !allowedHeaders.has("content-type")
      || !vary.has("origin")
    ) fail("Preview API CORS allow response is invalid");
    return;
  }
  if (allowOrigin === "*" || allowOrigin === origin || allowCredentials === "true") {
    fail("Preview API grants CORS to a forbidden origin");
  }
};

const requireTrustedExecutable = async (file, label) => {
  let resolved;
  let stats;
  try {
    await access(file, fsConstants.X_OK);
    resolved = await realpath(file);
    stats = await stat(resolved);
  } catch {
    fail(`${label} executable is unavailable`);
  }
  if (
    !stats.isFile()
    || (stats.mode & 0o111) === 0
    || (stats.mode & 0o022) !== 0
    || stats.uid !== 0
  ) fail(`${label} executable is unsafe`);
  return resolved;
};

const requireTrustedVenvDirectory = async (directory, expectedRealPath, uid) => {
  let linkStats;
  let resolved;
  try {
    [linkStats, resolved] = await Promise.all([lstat(directory), realpath(directory)]);
  } catch {
    fail("Preview check Python environment is unavailable");
  }
  if (
    !linkStats.isDirectory()
    || resolved !== expectedRealPath
    || (linkStats.uid !== 0 && linkStats.uid !== uid)
    || (linkStats.mode & 0o022) !== 0
  ) fail("Preview check Python environment is unsafe");
  return resolved;
};

const readTrustedVenvConfig = async (file, expectedRealPath, uid) => {
  let handle;
  try {
    handle = await open(file, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
  } catch {
    fail("Preview check Python configuration is unavailable");
  }
  try {
    const before = await handle.stat();
    if (
      !before.isFile()
      || before.size <= 0
      || before.size > MAX_VENV_CONFIG_BYTES
      || (before.uid !== 0 && before.uid !== uid)
      || (before.mode & 0o022) !== 0
      || await realpath(file) !== expectedRealPath
    ) fail("Preview check Python configuration is unsafe");
    const bytes = await handle.readFile();
    const after = await handle.stat();
    if (
      bytes.length !== before.size
      || after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
    ) fail("Preview check Python configuration changed while being read");
    return bytes.toString("utf8");
  } finally {
    await handle.close();
  }
};

const parseTrustedVenvConfig = (source) => {
  if (/\u0000|\r(?!\n)/.test(source)) fail("Preview check Python configuration is invalid");
  const values = new Map();
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const match = /^([A-Za-z][A-Za-z0-9_-]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || values.has(match[1])) fail("Preview check Python configuration is invalid");
    values.set(match[1], match[2]);
  }
  if (values.get("include-system-site-packages") !== "false") {
    fail("Preview check Python cannot include system site-packages");
  }
  const home = values.get("home");
  if (!home || !path.isAbsolute(home) || /[\u0000-\u001f\u007f]/.test(home)) {
    fail("Preview check Python home is invalid");
  }
  return { home };
};

const requireTrustedSitePackagesTree = async (sitePackages, uid) => {
  const pending = [sitePackages];
  let entries = 0;
  while (pending.length > 0) {
    const directory = pending.pop();
    let names;
    try {
      names = await readdir(directory);
    } catch {
      fail("Preview check Python dependency tree is unavailable");
    }
    for (const name of names) {
      entries += 1;
      if (entries > MAX_VENV_ENTRIES) fail("Preview check Python dependency tree is too large");
      const candidate = path.join(directory, name);
      let entryStats;
      try {
        entryStats = await lstat(candidate);
      } catch {
        fail("Preview check Python dependency tree changed while being verified");
      }
      if (
        (entryStats.uid !== 0 && entryStats.uid !== uid)
        || (entryStats.mode & 0o022) !== 0
        || (!entryStats.isDirectory() && !entryStats.isFile())
      ) fail("Preview check Python dependency tree is unsafe");
      if (entryStats.isDirectory()) pending.push(candidate);
    }
  }
};

const requireTrustedPreviewPython = async () => {
  const venvRoot = path.dirname(path.dirname(PREVIEW_CHECK_PYTHON_PATH));
  const venvBin = path.dirname(PREVIEW_CHECK_PYTHON_PATH);
  const temporaryRoot = path.dirname(venvRoot);
  let uid;
  let temporaryRealPath;
  let venvRealPath;
  let binRealPath;
  let pythonRealPath;
  let temporaryStats;
  let venvStats;
  let binStats;
  let pythonLinkStats;
  let pythonStats;
  try {
    if (typeof process.getuid !== "function") fail("Preview check Python ownership is unavailable");
    uid = process.getuid();
    [temporaryRealPath, venvRealPath, binRealPath, pythonRealPath] = await Promise.all([
      realpath(temporaryRoot),
      realpath(venvRoot),
      realpath(venvBin),
      realpath(PREVIEW_CHECK_PYTHON_PATH),
    ]);
    [temporaryStats, venvStats, binStats, pythonLinkStats, pythonStats] = await Promise.all([
      stat(temporaryRoot),
      lstat(venvRoot),
      lstat(venvBin),
      lstat(PREVIEW_CHECK_PYTHON_PATH),
      stat(pythonRealPath),
    ]);
    await access(PREVIEW_CHECK_PYTHON_PATH, fsConstants.X_OK);
  } catch (error) {
    if (error instanceof Error && error.message === "Preview check Python ownership is unavailable") {
      throw error;
    }
    fail("Preview check Python executable is unavailable");
  }
  if (
    !temporaryStats.isDirectory()
    || temporaryStats.uid !== 0
    || (temporaryStats.mode & 0o1000) === 0
    || venvRealPath !== path.join(temporaryRealPath, path.basename(venvRoot))
    || binRealPath !== path.join(venvRealPath, "bin")
    || !venvStats.isDirectory()
    || !binStats.isDirectory()
    || venvStats.uid !== uid
    || binStats.uid !== uid
    || (venvStats.mode & 0o022) !== 0
    || (binStats.mode & 0o022) !== 0
    || (!pythonLinkStats.isFile() && !pythonLinkStats.isSymbolicLink())
    || pythonLinkStats.uid !== uid
    || !pythonStats.isFile()
    || (pythonStats.mode & 0o111) === 0
    || (pythonStats.mode & 0o022) !== 0
    || (pythonStats.uid !== 0 && pythonStats.uid !== uid)
  ) fail("Preview check Python executable is unsafe");

  const configPath = path.join(venvRoot, "pyvenv.cfg");
  const config = parseTrustedVenvConfig(await readTrustedVenvConfig(
    configPath,
    path.join(venvRealPath, "pyvenv.cfg"),
    uid,
  ));
  let homeRealPath;
  let homeStats;
  try {
    [homeRealPath, homeStats] = await Promise.all([realpath(config.home), stat(config.home)]);
  } catch {
    fail("Preview check Python home is unavailable");
  }
  if (
    homeRealPath !== path.dirname(pythonRealPath)
    || !homeStats.isDirectory()
    || (homeStats.uid !== 0 && homeStats.uid !== uid)
    || (homeStats.mode & 0o022) !== 0
  ) fail("Preview check Python home is unsafe");

  const libPath = path.join(venvRoot, "lib");
  const libRealPath = path.join(venvRealPath, "lib");
  await requireTrustedVenvDirectory(libPath, libRealPath, uid);
  let libEntries;
  try {
    libEntries = await readdir(libPath, { withFileTypes: true });
  } catch {
    fail("Preview check Python library directory is unavailable");
  }
  const versionDirectories = libEntries.filter((entry) => (
    entry.isDirectory() && /^python\d+\.\d+$/.test(entry.name)
  ));
  if (versionDirectories.length !== 1) fail("Preview check Python library directory is unsafe");
  const versionDirectory = path.join(libPath, versionDirectories[0].name);
  const versionRealPath = path.join(libRealPath, versionDirectories[0].name);
  await requireTrustedVenvDirectory(versionDirectory, versionRealPath, uid);
  const sitePackages = path.join(versionDirectory, "site-packages");
  const sitePackagesRealPath = path.join(versionRealPath, "site-packages");
  await requireTrustedVenvDirectory(sitePackages, sitePackagesRealPath, uid);
  await requireTrustedSitePackagesTree(sitePackages, uid);
  return { executable: PREVIEW_CHECK_PYTHON_PATH, sitePackages };
};

const productionGitCheck = async ({ root, expectedCommit }) => {
  const git = await requireTrustedExecutable(TRUSTED_GIT_PATH, "Git");
  const gitEnvironment = {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_NO_REPLACE_OBJECTS: "1",
    GIT_TERMINAL_PROMPT: "0",
  };
  const localPrefix = [
    "-c", "core.fsmonitor=false",
    "-c", "core.untrackedCache=false",
    "-c", "core.ignoreStat=false",
    "-C", root,
  ];
  const run = (args, timeout = 10_000) => spawnSync(git, [...localPrefix, ...args], {
    encoding: "utf8",
    timeout,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
    env: gitEnvironment,
  });
  // Running outside the repository prevents local url.*.insteadOf rules from
  // redirecting the literal GitHub URL to attacker-controlled local storage.
  const runRemote = (args, timeout = 30_000) => spawnSync(git, args, {
    cwd: "/",
    encoding: "utf8",
    timeout,
    maxBuffer: MAX_GIT_OUTPUT_BYTES,
    windowsHide: true,
    env: gitEnvironment,
  });
  const worktree = run([
    "status", "--porcelain=v1", "--untracked-files=all", "--", ".",
    `:(exclude,top)${SUMMARY_RELATIVE}`,
  ]);
  const originUrl = run(["config", "--local", "--get-all", "remote.origin.url"]);
  const current = run(["branch", "--show-current"]);
  const local = run(["rev-parse", "--verify", `refs/heads/${BRANCH}^{commit}`]);
  const origin = run(["rev-parse", "--verify", `refs/remotes/origin/${BRANCH}^{commit}`]);
  const remote = runRemote([
    "ls-remote", "--exit-code", REMOTE_REPOSITORY, `refs/heads/${BRANCH}`,
  ]);
  const localAncestor = run(["merge-base", "--is-ancestor", expectedCommit, "HEAD"]);
  const descendant = run([
    "diff", "--name-only", expectedCommit, "HEAD", "--", ".",
    `:(exclude,top)${SUMMARY_RELATIVE}`,
  ]);
  const replaceRefs = run(["for-each-ref", "--format=%(refname)", "refs/replace"]);
  const graftPath = run(["rev-parse", "--git-path", "info/grafts"]);
  const indexFlags = run(["ls-files", "-v", "-z"]);
  const fsmonitorFlags = run(["ls-files", "-f", "-z"]);
  let graftsAbsent = false;
  const graftPathLines = graftPath.stdout.trim().split(/\r?\n/).filter(Boolean);
  if (
    graftPath.status === 0
    && graftPathLines.length === 1
    && !/[\u0000-\u001f\u007f]/.test(graftPathLines[0])
  ) {
    try {
      await lstat(path.resolve(root, graftPathLines[0]));
    } catch (error) {
      graftsAbsent = error?.code === "ENOENT";
    }
  }
  const runtimeFilesMatchExpectedCommit = (await Promise.all(
    PREVIEW_RUNTIME_FILES.map(async (file) => {
      let fileStats;
      try {
        fileStats = await lstat(path.join(root, file));
      } catch {
        return false;
      }
      if (
        !fileStats.isFile()
        || (fileStats.uid !== 0 && fileStats.uid !== process.getuid())
        || (fileStats.mode & 0o022) !== 0
      ) return false;
      const expectedBlob = run(["rev-parse", "--verify", `${expectedCommit}:${file}`]);
      const actualBlob = run(["hash-object", "--no-filters", "--", file]);
      const expectedHash = expectedBlob.stdout.trim();
      return (
        expectedBlob.status === 0
        && actualBlob.status === 0
        && /^[a-f0-9]{40,64}$/.test(expectedHash)
        && actualBlob.stdout.trim() === expectedHash
      );
    }),
  )).every(Boolean);
  const indexRecords = indexFlags.stdout.split("\u0000").filter(Boolean);
  const fsmonitorRecords = fsmonitorFlags.stdout.split("\u0000").filter(Boolean);
  const originUrls = originUrl.stdout.trim().split(/\r?\n/).filter(Boolean);
  const remoteLines = remote.stdout.trim().split(/\r?\n/).filter(Boolean);
  return {
    worktreeClean: worktree.status === 0 && worktree.stdout === "",
    originUrlExact: (
      originUrl.status === 0
      && originUrls.length === 1
      && originUrls[0] === REMOTE_REPOSITORY
    ),
    currentBranchExact: current.status === 0 && current.stdout.trim() === BRANCH,
    localBranchExists: local.status === 0,
    originBranchContainsCommit: origin.status === 0 && origin.stdout.trim() === expectedCommit,
    remoteBranchExact: (
      remote.status === 0
      && remoteLines.length === 1
      && remoteLines[0] === `${expectedCommit}\trefs/heads/${BRANCH}`
    ),
    deployedCommitAncestorOfHead: localAncestor.status === 0,
    descendantChangesRestricted: descendant.status === 0 && descendant.stdout === "",
    replaceRefsAbsent: replaceRefs.status === 0 && replaceRefs.stdout === "",
    graftsAbsent,
    indexFlagsSafe: (
      indexFlags.status === 0
      && indexRecords.length > 0
      && indexRecords.every((record) => record.startsWith("H "))
      && fsmonitorFlags.status === 0
      && fsmonitorRecords.length === indexRecords.length
      && fsmonitorRecords.every((record) => record.startsWith("H "))
    ),
    runtimeFilesMatchExpectedCommit,
  };
};

const validateGit = (value) => {
  const git = requireExactKeys(value, [
    "worktreeClean", "originUrlExact", "currentBranchExact", "localBranchExists",
    "originBranchContainsCommit", "remoteBranchExact", "deployedCommitAncestorOfHead",
    "descendantChangesRestricted",
    "replaceRefsAbsent", "graftsAbsent", "indexFlagsSafe",
    "runtimeFilesMatchExpectedCommit",
  ], "Git evidence");
  for (const [key, result] of Object.entries(git)) {
    if (result !== true) fail(`Git check ${key} failed`);
  }
  return git;
};

const runPostgresSubprocess = async ({ root, env, evidencePath, evidenceSha256 }) => {
  const python = await requireTrustedPreviewPython();
  const childEnv = {
    PATH: "/usr/bin:/bin",
    LANG: "C",
    LC_ALL: "C",
    PYTHONDONTWRITEBYTECODE: "1",
    PYTHONNOUSERSITE: "1",
    QUANTGYM_PREVIEW_POSTGRES_URL: env.QUANTGYM_PREVIEW_POSTGRES_URL || "",
    QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH: evidencePath,
    QUANTGYM_PREVIEW_EXPECTED_PROVIDER_EVIDENCE_SHA256: evidenceSha256,
  };
  const result = spawnSync(python.executable, [
    "-I",
    "-S",
    "-c",
    TEST_ONLY_PREVIEW_POSTGRES_RUNNER_SOURCE,
    python.sitePackages,
    path.join(root, "scripts/check-frontend-upgrade-preview-postgres.py"),
  ], {
    cwd: root,
    env: childEnv,
    encoding: "utf8",
    timeout: 30_000,
    maxBuffer: 256 * 1024,
    windowsHide: true,
  });
  if (result.status !== 0 || result.error || result.signal) fail("Postgres isolation subprocess failed");
  let summary;
  try {
    summary = JSON.parse(result.stdout);
  } catch {
    fail("Postgres isolation subprocess returned invalid output");
  }
  return summary;
};

const validatePostgresSummary = (value, evidence, evidenceSha256) => {
  requireExactKeys(value, [
    "schemaVersion", "check", "status", "evidenceSha256", "hashes", "checks",
    "publicBaseTableCount", "failureCodes",
  ], "Postgres child summary");
  if (
    value.schemaVersion !== 1
    || value.check !== "frontend-v2-preview-postgres"
    || value.status !== "pass"
    || value.evidenceSha256 !== evidenceSha256
    || value.publicBaseTableCount !== 0
    || !Array.isArray(value.failureCodes)
    || value.failureCodes.length !== 0
  ) fail("Postgres child summary is invalid");
  requireExactKeys(value.hashes, [
    "resourceIdHash", "hostHash", "databaseHash", "roleHash",
  ], "Postgres child hashes");
  for (const key of ["resourceIdHash", "hostHash", "databaseHash", "roleHash"]) {
    requireHash(value.hashes[key], `Postgres child ${key}`);
    if (value.hashes[key] !== evidence[key]) fail("Postgres child identity does not match provider evidence");
  }
  requireExactKeys(value.checks, [
    "selectOne", "sslForCurrentBackend", "hostMatchesProviderEvidence",
    "databaseMatchesProviderEvidence", "roleMatchesProviderEvidence",
    "resourceDistinctFromProduction", "publicSchemaEmpty",
  ], "Postgres child checks");
  for (const result of Object.values(value.checks)) requireBoolean(result, true, "Postgres child check");
  return value;
};

const validateR2Summary = (value, evidence, evidenceSha256) => {
  requireExactKeys(value, [
    "schemaVersion", "check", "status", "evidenceSha256", "hashes", "checks",
    "failureCodes",
  ], "R2 child summary");
  if (
    value.schemaVersion !== 1
    || value.check !== "frontend-v2-preview-r2"
    || value.status !== "pass"
    || value.evidenceSha256 !== evidenceSha256
    || !Array.isArray(value.failureCodes)
    || value.failureCodes.length !== 0
  ) fail("R2 child summary is invalid");
  requireExactKeys(value.hashes, ["endpointAccountIdHash", "bucketIdentityHash"], "R2 child hashes");
  if (
    value.hashes.endpointAccountIdHash !== evidence.endpointAccountIdHash
    || value.hashes.bucketIdentityHash !== evidence.bucketIdentityHash
  ) fail("R2 child identity does not match provider evidence");
  requireExactKeys(value.checks, [
    "endpointAccountMatchesProviderEvidence", "bucketIdentityMatchesProviderEvidence",
    "resourceDistinctFromProduction", "signingRegionAuto", "bytesMatch", "objectDeleted",
  ], "R2 child checks");
  for (const result of Object.values(value.checks)) requireBoolean(result, true, "R2 child check");
  return value;
};

const atomicWriteSummary = async (root, summary) => {
  const output = path.join(root, SUMMARY_RELATIVE);
  await mkdir(path.dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(summary, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o644,
    });
    await rename(temporary, output);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
  return output;
};

export async function runFrontendUpgradePreviewLiveCheck(options = {}) {
  const testOnly = options[TEST_ONLY_PREVIEW_LIVE];
  if (testOnly && options.env?.NODE_ENV !== "test") {
    fail("test-only live injection requires NODE_ENV=test");
  }
  const root = testOnly?.root ? path.resolve(testOnly.root) : defaultRoot;
  const env = testOnly ? options.env : process.env;
  if (testOnly) await requireTemporaryTestRoot(root);
  // A failed rerun must not leave a still-fresh passing artifact for an aggregate gate to trust.
  await rm(path.join(root, SUMMARY_RELATIVE), { force: true });
  const now = new Date(testOnly?.now ?? Date.now());
  if (!Number.isFinite(now.getTime())) fail("live check time is invalid");
  const expectedCommit = requireCommit(env.QUANTGYM_PREVIEW_EXPECTED_COMMIT);
  if (env.QUANTGYM_PREVIEW_EXPECTED_BRANCH !== BRANCH) fail("expected branch is invalid");
  const webOrigin = normalizeOrigin(env.QUANTGYM_PREVIEW_WEB_URL, "web");
  const apiOrigin = normalizeOrigin(env.QUANTGYM_PREVIEW_API_ORIGIN, "API");
  const fetchImpl = testOnly?.fetchImpl ?? fetch;

  const evidenceFile = await readEvidence(
    root,
    env.QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH || EVIDENCE_RELATIVE,
  );
  const evidence = validateProviderEvidence(evidenceFile.value, {
    expectedCommit,
    webOrigin,
    now,
  });

  const gitCheck = testOnly?.gitCheck ?? productionGitCheck;
  validateGit(await gitCheck({
    root,
    expectedCommit,
  }));
  const minimalWebArtifactSha256 = await checkWeb({
    fetchImpl,
    webOrigin,
    apiOrigin,
    expectedCommit,
  });
  await checkApiHealth({ fetchImpl, apiOrigin, webOrigin, expectedCommit });
  await preflight({ fetchImpl, apiOrigin, origin: webOrigin, expectedOrigin: webOrigin });
  await preflight({ fetchImpl, apiOrigin, origin: "https://beta.quantgym.app" });
  await preflight({ fetchImpl, apiOrigin, origin: "https://unrelated.invalid" });

  const postgresRaw = await (testOnly?.runPostgresCheck ?? runPostgresSubprocess)({
    root,
    env,
    evidencePath: evidenceFile.path,
    evidence: evidenceFile.value,
    evidenceSha256: evidenceFile.sha256,
  });
  const postgres = validatePostgresSummary(
    postgresRaw,
    evidence.postgres,
    evidenceFile.sha256,
  );
  const r2Raw = await (testOnly?.runR2Check ?? runFrontendUpgradePreviewR2Check)({
    env,
    evidence: evidenceFile.value,
    evidenceSha256: evidenceFile.sha256,
  });
  const r2 = validateR2Summary(r2Raw, evidence.r2, evidenceFile.sha256);

  // Reopen both operator evidence and Git state after every live probe. A
  // long-running check must not publish a pass from replaced evidence or from
  // a branch/worktree/remote state that changed while the probes were running.
  const git = validateGit(await gitCheck({ root, expectedCommit }));
  const finalEvidenceFile = await readEvidence(
    root,
    env.QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH || EVIDENCE_RELATIVE,
  );
  if (finalEvidenceFile.sha256 !== evidenceFile.sha256) {
    fail("provider evidence changed during the live check");
  }
  const checkedAt = testOnly
    ? new Date(testOnly.completedAt ?? now)
    : new Date();
  if (!Number.isFinite(checkedAt.getTime())) fail("live check completion time is invalid");
  validateDate(finalEvidenceFile.value.capturedAt, checkedAt);
  const evidenceExpiresAt = new Date(evidence.captured.getTime() + SEVEN_DAYS_MS).toISOString();
  const summary = {
    schemaVersion: 1,
    status: "pass",
    checkedAt: checkedAt.toISOString(),
    evidenceCapturedAt: evidence.captured.toISOString(),
    evidenceExpiresAt,
    branch: BRANCH,
    resourceIsolation: "pass",
    applicationBindings: "deferred-to-phase1",
    providerEvidenceSha256: evidenceFile.sha256,
    minimalWebArtifactSha256,
    hashes: {
      webOriginHash: sha256(webOrigin),
      apiOriginHash: sha256(apiOrigin),
      cloudflareAccountIdHash: evidence.cloudflare.accountIdHash,
      pagesProjectIdHash: evidence.pages.projectIdHash,
      renderWorkspaceIdHash: evidence.render.workspaceIdHash,
      postgresResourceIdHash: evidence.postgres.resourceIdHash,
      r2BucketIdentityHash: evidence.r2.bucketIdentityHash,
    },
    git,
    checks: {
      minimalWebArtifactMatches: true,
      exactWebConfiguration: true,
      apiHealthAndInternalLlmVerified: true,
      previewOnlyCors: true,
      providerEvidenceFresh: true,
      providerIdentitiesDisjoint: true,
      postgresIsolation: true,
      r2Isolation: true,
    },
    postgres,
    r2,
  };
  const serialized = JSON.stringify(summary);
  for (const value of [
    env.QUANTGYM_PREVIEW_POSTGRES_URL,
    env.QUANTGYM_PREVIEW_R2_ENDPOINT,
    env.QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID,
    env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY,
    evidence.r2.bucketName,
    webOrigin,
    apiOrigin,
  ]) {
    if (typeof value === "string" && value && serialized.includes(value)) {
      fail("live summary contains a raw operator value");
    }
  }
  const output = await atomicWriteSummary(root, summary);
  return { output, summary };
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.length !== 2) {
    console.error("FAIL: unsupported arguments");
    process.exitCode = 1;
  } else {
    try {
      const result = await runFrontendUpgradePreviewLiveCheck();
      console.log(JSON.stringify(result.summary, null, 2));
    } catch {
      console.error("FAIL: frontend v2 Preview live isolation check failed");
      process.exitCode = 1;
    }
  }
}
