#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const productionMode = args.has("--production");
const liveMode = args.has("--live");
const loadDotEnv = !args.has("--no-dotenv");
const MIN_PRODUCTION_ACCESS_KEY_LENGTH = 12;
const MIN_PRODUCTION_SECRET_KEY_LENGTH = 24;
const MAX_PRODUCTION_PREFIX_LENGTH = 128;

if (loadDotEnv) loadEnvFromProjectRoot();

const env = process.env;
const config = {
  storage: clean(env.QUANTGYM_MEDIA_STORAGE || "local").toLowerCase() || "local",
  mediaRoot: clean(env.QUANTGYM_MEDIA_ROOT || "api-server/data/media"),
  mediaMaxBytes: parseInteger(env.QUANTGYM_MEDIA_MAX_BYTES, 5 * 1024 * 1024),
  maxBodyBytes: parseInteger(env.QUANTGYM_MAX_BODY_BYTES, 25 * 1024 * 1024),
  endpoint: clean(env.QUANTGYM_MEDIA_S3_ENDPOINT).replace(/\/+$/, ""),
  bucket: clean(env.QUANTGYM_MEDIA_S3_BUCKET),
  region: clean(env.QUANTGYM_MEDIA_S3_REGION || "us-east-1") || "us-east-1",
  accessKeyId: clean(env.QUANTGYM_MEDIA_S3_ACCESS_KEY_ID),
  secretAccessKey: clean(env.QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY),
  prefix: clean(env.QUANTGYM_MEDIA_S3_PREFIX || "media").replace(/^\/+|\/+$/g, ""),
  publicBaseUrl: clean(env.QUANTGYM_MEDIA_PUBLIC_BASE_URL).replace(/\/+$/, ""),
  timeoutSeconds: parseNumber(env.QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS, 10)
};

const results = [];

check("storage backend", () => {
  const supported = ["", "local", "disk", "s3", "r2", "object", "object-storage"];
  assert(supported.includes(config.storage), `Unsupported QUANTGYM_MEDIA_STORAGE: ${config.storage}`);
  if (productionMode) {
    assert(isObjectStorage(config.storage), "Production media storage must use s3/r2/object/object-storage.");
  }
  return {
    storage: config.storage,
    objectStorage: isObjectStorage(config.storage)
  };
});

check("upload size envelope", () => {
  assert(Number.isInteger(config.mediaMaxBytes) && config.mediaMaxBytes > 0, "QUANTGYM_MEDIA_MAX_BYTES must be a positive integer.");
  assert(Number.isInteger(config.maxBodyBytes) && config.maxBodyBytes > 0, "QUANTGYM_MAX_BODY_BYTES must be a positive integer.");
  const estimatedJsonBodyBytes = Math.ceil(config.mediaMaxBytes * 1.37) + 4096;
  assert(
    estimatedJsonBodyBytes <= config.maxBodyBytes,
    "QUANTGYM_MEDIA_MAX_BYTES is too high for QUANTGYM_MAX_BODY_BYTES after base64 JSON expansion."
  );
  return {
    mediaMaxBytes: config.mediaMaxBytes,
    maxBodyBytes: config.maxBodyBytes,
    estimatedJsonBodyBytes
  };
});

check("local media root", () => {
  if (isObjectStorage(config.storage)) {
    return { required: false };
  }
  assert(config.mediaRoot, "QUANTGYM_MEDIA_ROOT is required for local/disk media storage.");
  const absoluteRoot = path.resolve(projectRoot, config.mediaRoot);
  const underProject = pathIsInside(absoluteRoot, projectRoot);
  if (productionMode) {
    assert(!underProject, "Production local media root must not live inside the repository checkout.");
  }
  return {
    required: true,
    absolute: path.isAbsolute(config.mediaRoot),
    underProject
  };
});

check("object storage credentials", () => {
  if (!isObjectStorage(config.storage)) {
    return { required: false };
  }
  assertPresent("QUANTGYM_MEDIA_S3_ENDPOINT", config.endpoint);
  assertPresent("QUANTGYM_MEDIA_S3_BUCKET", config.bucket);
  assertPresent("QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", config.accessKeyId);
  assertPresent("QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", config.secretAccessKey);
  assertNoPlaceholder("QUANTGYM_MEDIA_S3_ENDPOINT", config.endpoint);
  assertNoPlaceholder("QUANTGYM_MEDIA_S3_BUCKET", config.bucket);
  assertNoPlaceholder("QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", config.accessKeyId);
  assertNoPlaceholder("QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", config.secretAccessKey);
  const endpointUrl = parseUrl(config.endpoint, "QUANTGYM_MEDIA_S3_ENDPOINT");
  if (productionMode) {
    assert(endpointUrl.protocol === "https:", "Production object storage endpoint must use HTTPS.");
    assert(!isLocalOrPrivateHost(endpointUrl.hostname), "Production object storage endpoint must not point to localhost, loopback, or a private network address.");
    assertUrlHasNoSensitiveParts("QUANTGYM_MEDIA_S3_ENDPOINT", endpointUrl);
    assertValidProductionBucketName("QUANTGYM_MEDIA_S3_BUCKET", config.bucket);
    assertStrongProductionValue("QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", config.accessKeyId, MIN_PRODUCTION_ACCESS_KEY_LENGTH);
    assertStrongProductionValue("QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", config.secretAccessKey, MIN_PRODUCTION_SECRET_KEY_LENGTH);
    assertSafeProductionPrefix("QUANTGYM_MEDIA_S3_PREFIX", config.prefix);
  }
  assert(config.timeoutSeconds > 0 && config.timeoutSeconds <= 60, "QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS must be between 0 and 60 seconds.");
  return {
    required: true,
    endpointHost: endpointUrl.hostname,
    endpointProtocol: endpointUrl.protocol.replace(":", ""),
    bucket: redactBucket(config.bucket),
    region: config.region,
    prefix: config.prefix || "",
    accessKeyIdSet: Boolean(config.accessKeyId),
    secretAccessKeySet: Boolean(config.secretAccessKey),
    timeoutSeconds: config.timeoutSeconds
  };
});

check("public media URL", () => {
  if (!config.publicBaseUrl) {
    assert(!productionMode, "Production media storage must set QUANTGYM_MEDIA_PUBLIC_BASE_URL for CDN/public object delivery.");
    return { configured: false };
  }
  assertNoPlaceholder("QUANTGYM_MEDIA_PUBLIC_BASE_URL", config.publicBaseUrl);
  const publicUrl = parseUrl(config.publicBaseUrl, "QUANTGYM_MEDIA_PUBLIC_BASE_URL");
  if (productionMode) {
    assert(publicUrl.protocol === "https:", "Production public media URL must use HTTPS.");
    assert(!isLocalOrPrivateHost(publicUrl.hostname), "Production public media URL must not point to localhost, loopback, or a private network address.");
    assertUrlHasNoSensitiveParts("QUANTGYM_MEDIA_PUBLIC_BASE_URL", publicUrl);
    assertPublicBaseNotRawObjectStorageHost("QUANTGYM_MEDIA_PUBLIC_BASE_URL", publicUrl);
  }
  if (isObjectStorage(config.storage) && config.endpoint) {
    const endpointUrl = parseUrl(config.endpoint, "QUANTGYM_MEDIA_S3_ENDPOINT");
    assert(
      publicUrl.origin !== endpointUrl.origin || !productionMode,
      "Production public media URL should be a CDN/custom public origin, not the raw object storage endpoint."
    );
  }
  return {
    configured: true,
    host: publicUrl.hostname,
    protocol: publicUrl.protocol.replace(":", "")
  };
});

if (liveMode) {
  await checkAsync("object storage live smoke", async () => {
    assert(isObjectStorage(config.storage), "Live media smoke requires QUANTGYM_MEDIA_STORAGE=s3/r2/object/object-storage.");
    assertPresent("QUANTGYM_MEDIA_S3_ENDPOINT", config.endpoint);
    assertPresent("QUANTGYM_MEDIA_S3_BUCKET", config.bucket);
    assertPresent("QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", config.accessKeyId);
    assertPresent("QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", config.secretAccessKey);
    assertPresent("QUANTGYM_MEDIA_PUBLIC_BASE_URL", config.publicBaseUrl);

    const body = Buffer.from(`quantgym media live smoke ${new Date().toISOString()}\n`, "utf8");
    const key = joinKey(config.prefix, `readiness-smoke/${Date.now()}-${crypto.randomUUID()}.txt`);
    const objectUrl = objectStorageUrl(key);
    const publicUrl = `${config.publicBaseUrl}/${encodeObjectKey(key)}`;
    let putResponse = null;
    let getResponse = null;
    let publicResponse = null;
    let deleteResponse = null;
    let cleanupError = "";
    try {
      putResponse = await signedObjectRequest("PUT", objectUrl, body, "text/plain; charset=utf-8");
      assert(putResponse.statusCode >= 200 && putResponse.statusCode < 300, `Object storage live PUT returned HTTP ${putResponse.statusCode}.`);

      getResponse = await signedObjectRequest("GET", objectUrl);
      assert(getResponse.statusCode === 200, `Object storage live signed GET returned HTTP ${getResponse.statusCode}.`);
      assert(Buffer.compare(getResponse.body, body) === 0, "Object storage live signed GET bytes did not match PUT payload.");
      assertContentTypeIncludes(getResponse.headers, "text/plain", "Object storage live signed GET");

      publicResponse = await httpRequest(publicUrl, { method: "GET", timeoutMs: Math.ceil(config.timeoutSeconds * 1000) });
      assert(publicResponse.statusCode === 200, `Public media live GET returned HTTP ${publicResponse.statusCode}.`);
      assert(Buffer.compare(publicResponse.body, body) === 0, "Public media live GET bytes did not match PUT payload.");
      assertContentTypeIncludes(publicResponse.headers, "text/plain", "Public media live GET");
    } finally {
      if (putResponse?.statusCode >= 200 && putResponse.statusCode < 300) {
        try {
          deleteResponse = await signedObjectRequest("DELETE", objectUrl);
        } catch (error) {
          cleanupError = error.message || String(error);
        }
      }
    }
    assert(
      deleteResponse?.statusCode === 204 || deleteResponse?.statusCode === 200 || deleteResponse?.statusCode === 202,
      cleanupError
        ? `Object storage live DELETE failed (${cleanupError}); test object may need manual cleanup: ${key}`
        : `Object storage live DELETE returned HTTP ${deleteResponse?.statusCode || 0}; test object may need manual cleanup: ${key}`
    );
    const publicHost = parseUrl(config.publicBaseUrl, "QUANTGYM_MEDIA_PUBLIC_BASE_URL").hostname;
    const endpointHost = parseUrl(config.endpoint, "QUANTGYM_MEDIA_S3_ENDPOINT").hostname;
    return {
      keyPrefix: config.prefix || "",
      smokeKeySuffix: path.posix.basename(key),
      endpointHost,
      publicHost,
      putStatus: putResponse?.statusCode || 0,
      signedGetStatus: getResponse?.statusCode || 0,
      publicGetStatus: publicResponse?.statusCode || 0,
      deleteStatus: deleteResponse.statusCode,
      signedGetContentType: responseContentType(getResponse?.headers),
      publicGetContentType: responseContentType(publicResponse?.headers),
      contentTypePreserved: responseContentType(publicResponse?.headers).toLowerCase().includes("text/plain"),
      bytes: body.length,
      cleanedUp: true
    };
  });
}

const failed = results.filter((item) => item.status === "fail");
const passed = results.filter((item) => item.status === "pass");

console.log(JSON.stringify({
  status: failed.length ? "fail" : "pass",
  mode: productionMode ? "production" : "local",
  live: liveMode,
  passed: passed.length,
  failed: failed.length,
  storage: config.storage,
  results
}, null, 2));

if (failed.length) process.exitCode = 1;

function check(name, fn) {
  try {
    const data = fn();
    results.push({ name, status: "pass", data });
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
  }
}

async function checkAsync(name, fn) {
  try {
    const data = await fn();
    results.push({ name, status: "pass", data });
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertPresent(name, value) {
  assert(Boolean(value), `${name} is required.`);
}

function assertNoPlaceholder(name, value) {
  const text = String(value || "");
  assert(!/[<>]/.test(text), `${name} still contains placeholder brackets.`);
  assert(!/\.\.\./.test(text), `${name} still contains a placeholder ellipsis.`);
  assert(!/example\.com|account-id|placeholder|change-?me|todo|tbd|your[-_ ]|access[-_ ]?key|secret[-_ ]?key/i.test(text), `${name} still contains a placeholder value.`);
}

function assertStrongProductionValue(name, value, minLength) {
  const text = String(value || "");
  assert(text.length >= minLength, `${name} must be at least ${minLength} characters in production.`);
}

function assertUrlHasNoSensitiveParts(name, url) {
  assert(!url.username && !url.password, `${name} must not include embedded credentials.`);
  assert(!url.search && !url.hash, `${name} must not include query strings or fragments.`);
}

function assertPublicBaseNotRawObjectStorageHost(name, url) {
  assert(
    !isRawObjectStoragePublicHost(url.hostname),
    `${name} must use a CDN/custom public host, not a raw object storage host.`
  );
}

function assertContentTypeIncludes(headers, expected, label) {
  const contentType = responseContentType(headers).toLowerCase();
  assert(contentType.includes(expected.toLowerCase()), `${label} must preserve Content-Type ${expected}.`);
}

function responseContentType(headers = {}) {
  return String(headers?.["content-type"] || headers?.["Content-Type"] || "");
}

function assertValidProductionBucketName(name, value) {
  const text = String(value || "");
  assert(text.length >= 3 && text.length <= 63, `${name} must be a DNS-safe bucket name between 3 and 63 characters.`);
  assert(/^[a-z0-9][a-z0-9.-]*[a-z0-9]$/.test(text), `${name} must be a DNS-safe lowercase bucket name.`);
  assert(!text.includes("..") && !text.includes(".-") && !text.includes("-."), `${name} must not contain unsafe dot/hyphen sequences.`);
  assert(!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(text), `${name} must not look like an IP address.`);
}

function assertSafeProductionPrefix(name, value) {
  const text = String(value || "");
  if (!text) return;
  assert(text.length <= MAX_PRODUCTION_PREFIX_LENGTH, `${name} must be ${MAX_PRODUCTION_PREFIX_LENGTH} characters or fewer in production.`);
  assert(!/[\\?#]/.test(text), `${name} must not contain backslashes, query markers, or fragments.`);
  assert(!/[\x00-\x1f\x7f]/.test(text), `${name} must not contain control characters.`);
  const segments = text.split("/");
  assert(
    segments.every((segment) => segment && segment !== "." && segment !== ".."),
    `${name} must not contain empty, current-directory, or parent-directory segments.`
  );
  assert(
    segments.every((segment) => /^[A-Za-z0-9][A-Za-z0-9._=-]*$/.test(segment)),
    `${name} must use URL-safe object key segments.`
  );
}

function parseUrl(value, name) {
  try {
    const url = new URL(value);
    assert(["http:", "https:"].includes(url.protocol), `${name} must be an HTTP(S) URL.`);
    return url;
  } catch (error) {
    if (error.message.includes(name)) throw error;
    throw new Error(`${name} must be a valid URL.`);
  }
}

function objectStorageUrl(key) {
  return `${config.endpoint}/${encodeURIComponent(config.bucket)}/${encodeObjectKey(key)}`;
}

function joinKey(...parts) {
  return parts
    .map((part) => String(part || "").trim().replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");
}

function encodeObjectKey(key) {
  return String(key || "")
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function signedObjectRequest(method, url, payload = Buffer.alloc(0), contentType = "") {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.from(payload || "");
  const headers = awsSigV4Headers(method, url, body, contentType);
  return httpRequest(url, {
    method,
    body: method === "GET" || method === "HEAD" ? undefined : body,
    headers,
    timeoutMs: Math.ceil(config.timeoutSeconds * 1000)
  });
}

function awsSigV4Headers(method, url, payload = Buffer.alloc(0), contentType = "") {
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const parsed = new URL(url);
  const payloadHash = crypto.createHash("sha256").update(payload || Buffer.alloc(0)).digest("hex");
  const canonicalHeaders = [
    `host:${parsed.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`
  ].join("\n") + "\n";
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method.toUpperCase(),
    parsed.pathname || "/",
    parsed.search ? parsed.search.slice(1) : "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const credentialScope = `${dateStamp}/${config.region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    crypto.createHash("sha256").update(canonicalRequest).digest("hex")
  ].join("\n");
  const signature = hmac(signingKey(dateStamp), stringToSign).toString("hex");
  return {
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "X-Amz-Content-Sha256": payloadHash,
    "X-Amz-Date": amzDate,
    ...(contentType ? { "Content-Type": contentType } : {})
  };
}

function signingKey(dateStamp) {
  return hmac(
    hmac(
      hmac(
        hmac(Buffer.from(`AWS4${config.secretAccessKey}`, "utf8"), dateStamp),
        config.region
      ),
      "s3"
    ),
    "aws4_request"
  );
}

function hmac(key, value) {
  return crypto.createHmac("sha256", key).update(value).digest();
}

async function httpRequest(url, { method = "GET", body, headers = {}, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal: controller.signal
    });
    const responseBody = Buffer.from(await response.arrayBuffer());
    return {
      statusCode: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body: responseBody
    };
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`${method} ${redactUrl(url)} timed out.`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.protocol}//${url.host}${url.pathname ? "/..." : ""}`;
  } catch {
    return "(invalid-url)";
  }
}

function isObjectStorage(value) {
  return ["s3", "r2", "object", "object-storage"].includes(value);
}

function isLocalOrPrivateHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  if (!host) return false;
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) return true;
  const family = net.isIP(host);
  if (family === 4) return isPrivateIpv4(host);
  if (family === 6) return isPrivateIpv6(host);
  return false;
}

function isRawObjectStoragePublicHost(hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/\.$/, "");
  if (!host) return false;
  if (host === "r2.cloudflarestorage.com" || host.endsWith(".r2.cloudflarestorage.com")) return true;
  if (host === "r2.dev" || host.endsWith(".r2.dev")) return true;
  if (host === "storage.googleapis.com" || host.endsWith(".storage.googleapis.com")) return true;
  if (host.endsWith(".amazonaws.com")) {
    return host.split(".").some((label) => label === "s3" || label.startsWith("s3-"));
  }
  return [
    ".digitaloceanspaces.com",
    ".backblazeb2.com",
    ".b2clouddn.com",
    ".wasabisys.com",
    ".linodeobjects.com"
  ].some((suffix) => host === suffix.slice(1) || host.endsWith(suffix));
}

function isPrivateIpv4(host) {
  const parts = host.split(".").map((item) => Number(item));
  if (parts.length !== 4 || parts.some((item) => !Number.isInteger(item) || item < 0 || item > 255)) return false;
  const [a, b] = parts;
  return (
    a === 0
    || a === 10
    || a === 127
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  );
}

function isPrivateIpv6(host) {
  const normalized = host.toLowerCase();
  const mappedIpv4 = normalized.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/)?.[1];
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4);
  return (
    normalized === "::"
    || normalized === "::1"
    || normalized.startsWith("fc")
    || normalized.startsWith("fd")
    || normalized.startsWith("fe80:")
  );
}

function pathIsInside(child, parent) {
  const relative = path.relative(parent, child);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function parseInteger(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  const parsed = Number(String(value).trim());
  return Number.isInteger(parsed) ? parsed : NaN;
}

function parseNumber(value, fallback) {
  if (value == null || String(value).trim() === "") return fallback;
  return Number(String(value).trim());
}

function clean(value) {
  return String(value || "").trim();
}

function redactBucket(value) {
  const text = String(value || "");
  if (text.length <= 4) return "***";
  return `${text.slice(0, 2)}***${text.slice(-2)}`;
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const equalIndex = line.indexOf("=");
    if (equalIndex <= 0) continue;
    const key = line.slice(0, equalIndex).trim();
    let value = line.slice(equalIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (process.env[key] == null) process.env[key] = value;
  }
}
