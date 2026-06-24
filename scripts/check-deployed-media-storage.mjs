#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const startedAt = Date.now();
const apiBaseUrl = trimSlash(getArgValue("--api-url") || process.env.QUANTGYM_DEPLOYED_MEDIA_API_URL || "https://api.quantgym.app");
const publicBaseUrl = trimSlash(getArgValue("--public-base-url") || process.env.QUANTGYM_DEPLOYED_MEDIA_PUBLIC_BASE_URL || "https://media.quantgym.app/media");
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/362-deployed-media-storage-summary.json"
);
const email = clean(
  getArgValue("--email")
  || process.env.QUANTGYM_DEPLOYED_MEDIA_SMOKE_EMAIL
  || process.env.QUANTGYM_BETA_SMOKE_EMAIL
  || process.env.QUANTGYM_LIVE_EMAIL
);
const tinyPngBase64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=";
const tinyPng = Buffer.from(tinyPngBase64, "base64");
const failures = [];
const warnings = [];

let password = "";
try {
  password = await readPassword();
} catch (error) {
  fail(error.message || String(error));
}

const apiUrl = parseUrl(apiBaseUrl, "API base URL");
const publicUrl = parseUrl(publicBaseUrl, "public media base URL");

assert(apiUrl?.protocol === "https:", "Deployed media smoke API URL must use HTTPS.");
assert(apiUrl?.hostname === "api.quantgym.app", "Deployed media smoke must target api.quantgym.app by default.");
assert(!apiUrl?.username && !apiUrl?.password, "Deployed media smoke API URL must not include embedded credentials.");
assert(!apiUrl?.search && !apiUrl?.hash, "Deployed media smoke API URL must not include query strings or fragments.");
assert(publicUrl?.protocol === "https:", "Deployed media public base URL must use HTTPS.");
assert(publicUrl?.hostname === "media.quantgym.app", "Deployed media smoke must target media.quantgym.app by default.");
assert(!publicUrl?.username && !publicUrl?.password, "Deployed media public base URL must not include embedded credentials.");
assert(!publicUrl?.search && !publicUrl?.hash, "Deployed media public base URL must not include query strings or fragments.");
assert(Boolean(email), "Set QUANTGYM_DEPLOYED_MEDIA_SMOKE_EMAIL, QUANTGYM_BETA_SMOKE_EMAIL, QUANTGYM_LIVE_EMAIL, or pass --email.");
assert(Boolean(password), "Set QUANTGYM_DEPLOYED_MEDIA_SMOKE_PASSWORD, QUANTGYM_BETA_SMOKE_PASSWORD, QUANTGYM_LIVE_PASSWORD, or pass --password-stdin.");

const summary = {
  id: 362,
  date: new Date().toISOString().slice(0, 10),
  surface: "deployed media storage smoke",
  status: "fail",
  durationMs: 0,
  apiHost: apiUrl?.hostname || "",
  apiPath: apiUrl?.pathname || "",
  publicHost: publicUrl?.hostname || "",
  publicPathPrefix: publicUrl?.pathname || "",
  auth: {
    emailRedacted: redactEmail(email),
    tokenReturned: false
  },
  upload: {},
  publicGet: {},
  publicRange: {},
  apiGet: {},
  checks: {},
  failures,
  warnings
};

if (failures.length === 0) {
  try {
    await runSmoke();
  } catch (error) {
    fail(error.stack || error.message || String(error));
  }
}

finalizeSummary();
writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status !== "pass") process.exitCode = 1;

async function runSmoke() {
  const login = await postJson(`${apiBaseUrl}/api/auth/login`, { email, password });
  summary.auth.loginStatus = login.status;
  const token = login.data?.token || "";
  summary.auth.tokenReturned = Boolean(token);
  assert(login.status === 200, `Deployed media smoke login returned HTTP ${login.status}.`);
  assert(Boolean(token), "Deployed media smoke login did not return a bearer token.");

  const upload = await postJson(
    `${apiBaseUrl}/api/media`,
    {
      dataUrl: `data:image/png;base64,${tinyPngBase64}`,
      name: `deployed-media-smoke-${Date.now()}.png`,
      type: "image",
      context: "deployed-media-storage-smoke"
    },
    token
  );
  summary.upload.status = upload.status;
  summary.upload.error = upload.data?.error || upload.data?.detail || "";
  const media = upload.data?.media || {};
  const mediaUrl = parseUrl(media.url || "", "media URL", { optional: true });
  summary.upload.media = {
    idPresent: Boolean(media.id),
    storage: media.storage || "",
    contentType: media.contentType || "",
    byteSize: Number(media.byteSize || 0),
    path: media.path || "",
    urlHost: mediaUrl?.hostname || "",
    urlPathPrefix: mediaUrl ? mediaUrl.pathname.split("/").slice(0, 3).join("/") : "",
    responseDoesNotInlineDataUrl: typeof media.dataUrl !== "string" || !media.dataUrl.startsWith("data:")
  };
  assert(upload.status === 201, `Deployed media upload returned HTTP ${upload.status}: ${summary.upload.error || "no JSON error"}.`);
  assert(media.storage === "s3-media", `Deployed media upload must report s3-media storage, got ${media.storage || "(missing)"}.`);
  assert(media.contentType === "image/png", `Deployed media upload contentType must be image/png, got ${media.contentType || "(missing)"}.`);
  assert(Number(media.byteSize) === tinyPng.length, `Deployed media upload byteSize must be ${tinyPng.length}, got ${media.byteSize}.`);
  assert(typeof media.url === "string" && media.url.startsWith(`${publicBaseUrl}/`), `Deployed media URL must use ${publicBaseUrl}/.`);
  assert(mediaUrl?.hostname === publicUrl?.hostname, "Deployed media URL host must match the configured public media host.");
  assert(!mediaUrl?.username && !mediaUrl?.password, "Deployed media URL must not include embedded credentials.");
  assert(!mediaUrl?.search && !mediaUrl?.hash, "Deployed media URL must not include query strings or fragments.");

  const publicGet = await fetch(media.url);
  const publicBytes = Buffer.from(await publicGet.arrayBuffer());
  summary.publicGet = {
    status: publicGet.status,
    contentType: publicGet.headers.get("content-type") || "",
    bytes: publicBytes.length,
    bytesMatch: publicBytes.equals(tinyPng)
  };
  assert(publicGet.status === 200, `Public media GET returned HTTP ${publicGet.status}.`);
  assert(publicBytes.equals(tinyPng), "Public media GET bytes did not match the uploaded payload.");
  assert(String(publicGet.headers.get("content-type") || "").toLowerCase().includes("image/png"), "Public media GET did not preserve image/png Content-Type.");

  const rangeGet = await fetch(media.url, { headers: { Range: "bytes=0-0" } });
  const rangeBytes = Buffer.from(await rangeGet.arrayBuffer());
  summary.publicRange = {
    status: rangeGet.status,
    contentRange: rangeGet.headers.get("content-range") || "",
    bytes: rangeBytes.length
  };
  assert(rangeGet.status === 206, `Public media Range GET returned HTTP ${rangeGet.status}.`);
  assert(/^bytes 0-0\//.test(summary.publicRange.contentRange), `Public media Range GET returned invalid Content-Range: ${summary.publicRange.contentRange || "(missing)"}.`);
  assert(rangeBytes.length === 1, `Public media Range GET should return one byte, got ${rangeBytes.length}.`);

  const apiGet = await fetch(`${apiBaseUrl}${media.path || `/api/media/${media.id}`}`, { redirect: "manual" });
  const redirectLocation = apiGet.headers.get("location") || "";
  const redirectUrl = parseUrl(redirectLocation, "API media redirect URL", { optional: true });
  summary.apiGet = {
    status: apiGet.status,
    locationHost: redirectUrl?.hostname || "",
    redirectsToPublicMedia: redirectLocation === media.url
  };
  assert(apiGet.status === 302, `API GET /api/media/:id should redirect to public media, got HTTP ${apiGet.status}.`);
  assert(redirectLocation === media.url, "API media redirect location must match the uploaded media URL.");
}

function finalizeSummary() {
  summary.durationMs = Date.now() - startedAt;
  summary.checks = {
    apiHttps: apiUrl?.protocol === "https:",
    apiHostProduction: apiUrl?.hostname === "api.quantgym.app",
    apiUrlSafe: apiUrl && !apiUrl.username && !apiUrl.password && !apiUrl.search && !apiUrl.hash,
    publicBaseHttps: publicUrl?.protocol === "https:",
    publicBaseHostProduction: publicUrl?.hostname === "media.quantgym.app",
    publicBaseUrlSafe: publicUrl && !publicUrl.username && !publicUrl.password && !publicUrl.search && !publicUrl.hash,
    emailRedacted: summary.auth.emailRedacted.includes("***"),
    loginOk: Number(summary.auth.loginStatus || 0) === 200,
    tokenReturned: summary.auth.tokenReturned === true,
    uploadCreated: Number(summary.upload.status || 0) === 201,
    uploadReportsS3Media: summary.upload.media?.storage === "s3-media",
    uploadContentTypePng: summary.upload.media?.contentType === "image/png",
    uploadByteSizeMatches: Number(summary.upload.media?.byteSize || 0) === tinyPng.length,
    uploadUrlUsesPublicBase: summary.upload.media?.urlHost === "media.quantgym.app"
      && String(summary.upload.media?.urlPathPrefix || "").startsWith("/media/"),
    uploadResponseDoesNotInlineDataUrl: summary.upload.media?.responseDoesNotInlineDataUrl === true,
    publicGetOk: Number(summary.publicGet.status || 0) === 200,
    publicGetBytesMatch: summary.publicGet.bytesMatch === true,
    publicGetContentTypePng: String(summary.publicGet.contentType || "").toLowerCase().includes("image/png"),
    publicRangeSupported: Number(summary.publicRange.status || 0) === 206,
    publicRangeHeaderValid: /^bytes 0-0\//.test(summary.publicRange.contentRange || ""),
    apiGetRedirectsToPublicMedia: Number(summary.apiGet.status || 0) === 302
      && summary.apiGet.locationHost === "media.quantgym.app"
      && summary.apiGet.redirectsToPublicMedia === true
  };
  summary.status = failures.length ? "fail" : "pass";
}

async function postJson(url, body, token = "") {
  const headers = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "QuantGymDeployedMediaSmoke/0.1"
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body)
  });
  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  return { status: response.status, data };
}

async function readPassword() {
  if (args.includes("--password-stdin")) {
    const input = await new Promise((resolve, reject) => {
      let data = "";
      process.stdin.setEncoding("utf8");
      process.stdin.on("data", (chunk) => {
        data += chunk;
      });
      process.stdin.on("end", () => resolve(data));
      process.stdin.on("error", reject);
    });
    return clean(String(input).split(/\r?\n/)[0] || input);
  }
  return clean(
    getArgValue("--password")
    || process.env.QUANTGYM_DEPLOYED_MEDIA_SMOKE_PASSWORD
    || process.env.QUANTGYM_BETA_SMOKE_PASSWORD
    || process.env.QUANTGYM_LIVE_PASSWORD
  );
}

function parseUrl(value, label, options = {}) {
  const text = clean(value);
  if (!text && options.optional) return null;
  try {
    return new URL(text);
  } catch {
    fail(`${label} is not a valid URL.`);
    return null;
  }
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || "";
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function trimSlash(value) {
  return clean(value).replace(/\/+$/, "");
}

function clean(value) {
  return String(value || "").trim();
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  const text = String(message || "Unknown deployed media smoke failure.");
  if (!failures.includes(text)) failures.push(text);
}

function redactEmail(value) {
  const text = clean(value);
  const [local, domain] = text.split("@");
  if (!local || !domain) return "***";
  return `${local.slice(0, 2)}***@${domain}`;
}

function writeSummary(data) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(data, null, 2)}\n`);
}
