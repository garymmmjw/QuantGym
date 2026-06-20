#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/337-media-storage-production-fixture-summary.json";
const startedAt = Date.now();
const failures = [];
const warnings = [];

const validProductionEnv = {
  QUANTGYM_MEDIA_STORAGE: "r2",
  QUANTGYM_MEDIA_MAX_BYTES: String(5 * 1024 * 1024),
  QUANTGYM_MAX_BODY_BYTES: String(10 * 1024 * 1024),
  QUANTGYM_MEDIA_S3_ENDPOINT: "https://r2.quantgym.test",
  QUANTGYM_MEDIA_S3_BUCKET: "quantgym-media-fixture",
  QUANTGYM_MEDIA_S3_REGION: "auto",
  QUANTGYM_MEDIA_S3_ACCESS_KEY_ID: "QG_MEDIA_FIXTURE_ACCESS",
  QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY: "qgmediafixture6n8z2p4v1x9c",
  QUANTGYM_MEDIA_S3_PREFIX: "media",
  QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://media.quantgym.test",
  QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS: "5"
};

const negativeCases = [
  {
    name: "local storage rejected in production",
    env: { QUANTGYM_MEDIA_STORAGE: "local" },
    expectedError: "Production media storage must use"
  },
  {
    name: "http object endpoint rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "http://r2.quantgym.test" },
    expectedError: "Production object storage endpoint must use HTTPS"
  },
  {
    name: "local object endpoint rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "https://localhost/quantgym-media" },
    expectedError: "must not point to localhost"
  },
  {
    name: "private object endpoint rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "https://172.20.10.8/quantgym-media" },
    expectedError: "private network address"
  },
  {
    name: "endpoint embedded credentials rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "https://access:secret@r2.quantgym.test" },
    expectedError: "embedded credentials"
  },
  {
    name: "endpoint query rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "https://r2.quantgym.test?token=leaky" },
    expectedError: "query strings or fragments"
  },
  {
    name: "missing public base rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "" },
    expectedError: "QUANTGYM_MEDIA_PUBLIC_BASE_URL"
  },
  {
    name: "http public base rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "http://media.quantgym.test" },
    expectedError: "Production public media URL must use HTTPS"
  },
  {
    name: "private public base rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://192.168.12.12/media" },
    expectedError: "private network address"
  },
  {
    name: "public base embedded credentials rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://cdn:secret@media.quantgym.test/assets" },
    expectedError: "embedded credentials"
  },
  {
    name: "public base query rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://media.quantgym.test/assets?token=leaky" },
    expectedError: "query strings or fragments"
  },
  {
    name: "raw endpoint public base rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://r2.quantgym.test" },
    expectedError: "CDN/custom public origin"
  },
  {
    name: "raw provider public host rejected",
    env: { QUANTGYM_MEDIA_PUBLIC_BASE_URL: "https://quantgym-media-fixture.s3.amazonaws.com/media" },
    expectedError: "raw object storage host"
  },
  {
    name: "placeholder endpoint rejected",
    env: { QUANTGYM_MEDIA_S3_ENDPOINT: "https://<account-id>.r2.cloudflarestorage.com" },
    expectedError: "placeholder brackets"
  },
  {
    name: "placeholder secret rejected",
    env: { QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY: "..." },
    expectedError: "placeholder ellipsis"
  },
  {
    name: "placeholder access key rejected",
    env: { QUANTGYM_MEDIA_S3_ACCESS_KEY_ID: "change-me-access-key" },
    expectedError: "placeholder value"
  },
  {
    name: "short secret key rejected",
    env: { QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY: "short-secret" },
    expectedError: "at least 24 characters"
  },
  {
    name: "unsafe bucket name rejected",
    env: { QUANTGYM_MEDIA_S3_BUCKET: "QuantGym Media" },
    expectedError: "DNS-safe lowercase bucket name"
  },
  {
    name: "unsafe object prefix rejected",
    env: { QUANTGYM_MEDIA_S3_PREFIX: "../media" },
    expectedError: "parent-directory"
  },
  {
    name: "oversized media envelope rejected",
    env: {
      QUANTGYM_MEDIA_MAX_BYTES: String(8 * 1024 * 1024),
      QUANTGYM_MAX_BODY_BYTES: String(8 * 1024 * 1024)
    },
    expectedError: "too high for QUANTGYM_MAX_BODY_BYTES"
  },
  {
    name: "excessive timeout rejected",
    env: { QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS: "61" },
    expectedError: "QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS"
  }
];

try {
  const validProduction = await runConfig(["--production", "--no-dotenv"], validProductionEnv);
  const productionFixture = summarizeProductionFixture(validProduction);
  validateValidProductionFixture(validProduction, productionFixture);

  const negativeFixtures = [];
  for (const fixture of negativeCases) {
    const result = await runConfig(["--production", "--no-dotenv"], {
      ...validProductionEnv,
      ...fixture.env
    });
    const summary = summarizeNegativeFixture(fixture, result);
    negativeFixtures.push(summary);
    if (!summary.rejected) fail(`Negative fixture "${fixture.name}" should fail production media validation.`);
    if (!summary.expectedErrorObserved) {
      fail(`Negative fixture "${fixture.name}" did not mention expected error text "${fixture.expectedError}".`);
    }
  }

  const liveFixture = await runLiveFixture({ failPublicGet: false });
  validateLiveFixture(liveFixture);
  const livePublicFailureFixture = await runLiveFixture({ failPublicGet: true });
  validateLivePublicFailureFixture(livePublicFailureFixture);

  const checks = {
    validProductionPass: productionFixture.status === "pass",
    validProductionHasAllChecks: productionFixture.passed === 5 && productionFixture.failed === 0,
    validProductionAccessKeyRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_ACCESS_KEY_ID),
    validProductionSecretRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY),
    validProductionBucketRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_BUCKET),
    validProductionEndpointUrlRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_ENDPOINT),
    validProductionPublicBaseUrlRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_PUBLIC_BASE_URL),
    negativeFixturesRejected: negativeFixtures.every((fixture) => fixture.rejected),
    negativeFixturesMentionExpectedErrors: negativeFixtures.every((fixture) => fixture.expectedErrorObserved),
    endpointEmbeddedCredentialsRejected: findNegativeFixture(negativeFixtures, "endpoint embedded credentials rejected")?.rejected === true,
    endpointQueryRejected: findNegativeFixture(negativeFixtures, "endpoint query rejected")?.rejected === true,
    publicBaseEmbeddedCredentialsRejected: findNegativeFixture(negativeFixtures, "public base embedded credentials rejected")?.rejected === true,
    publicBaseQueryRejected: findNegativeFixture(negativeFixtures, "public base query rejected")?.rejected === true,
    rawProviderPublicBaseRejected: findNegativeFixture(negativeFixtures, "raw provider public host rejected")?.rejected === true,
    placeholderAccessKeyRejected: findNegativeFixture(negativeFixtures, "placeholder access key rejected")?.rejected === true,
    shortSecretKeyRejected: findNegativeFixture(negativeFixtures, "short secret key rejected")?.rejected === true,
    unsafeBucketNameRejected: findNegativeFixture(negativeFixtures, "unsafe bucket name rejected")?.rejected === true,
    unsafeObjectPrefixRejected: findNegativeFixture(negativeFixtures, "unsafe object prefix rejected")?.rejected === true,
    liveFixturePassed: liveFixture.status === "pass",
    liveFixturePutGetPublicDelete: liveFixture.putSigned
      && liveFixture.signedGetStatus === 200
      && liveFixture.publicGetStatus === 200
      && liveFixture.deleteObserved,
    liveFixturePreservesContentType: liveFixture.contentTypePreserved === true,
    liveFailureRejected: livePublicFailureFixture.rejected,
    liveFailureCleanedUp: livePublicFailureFixture.deleteObserved && livePublicFailureFixture.objectsRemaining === 0
  };

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    productionFixture,
    negativeFixtures,
    liveFixture,
    livePublicFailureFixture,
    checks,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

function validateValidProductionFixture(result, summary) {
  if (result.exitCode !== 0) fail(`Valid production fixture exited ${result.exitCode}: ${firstFailure(result)}`);
  if (summary.status !== "pass") fail("Valid production media fixture did not report pass.");
  if (summary.passed !== 5 || summary.failed !== 0) fail(`Valid production media fixture expected 5 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (summary.storage !== "r2") fail(`Valid production media fixture expected r2 storage, got ${summary.storage}.`);
  if (summary.endpointProtocol !== "https") fail(`Valid production media fixture expected HTTPS endpoint, got ${summary.endpointProtocol}.`);
  if (summary.endpointHost !== "r2.quantgym.test") fail(`Valid production media fixture endpoint host mismatch: ${summary.endpointHost}.`);
  if (summary.publicHost !== "media.quantgym.test") fail(`Valid production media fixture public host mismatch: ${summary.publicHost}.`);
  if (!summary.accessKeyIdSet || !summary.secretAccessKeySet) fail("Valid production media fixture should require both object-storage credentials.");
  if (summary.bucket === validProductionEnv.QUANTGYM_MEDIA_S3_BUCKET) fail("Valid production media fixture output did not redact bucket name.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_ACCESS_KEY_ID)) fail("Valid production media fixture output leaked access key id.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY)) fail("Valid production media fixture output leaked secret key.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_S3_ENDPOINT)) fail("Valid production media fixture output leaked full object endpoint URL.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_MEDIA_PUBLIC_BASE_URL)) fail("Valid production media fixture output leaked full public base URL.");
}

function validateLiveFixture(summary) {
  if (summary.status !== "pass") fail(`Live media fixture should pass, got ${summary.status}.`);
  if (summary.childExitCode !== 0) fail(`Live media fixture child exited ${summary.childExitCode}.`);
  if (summary.putStatus < 200 || summary.putStatus >= 300) fail(`Live media fixture PUT status should be 2xx, got ${summary.putStatus}.`);
  if (summary.signedGetStatus !== 200) fail(`Live media fixture signed GET status should be 200, got ${summary.signedGetStatus}.`);
  if (summary.publicGetStatus !== 200) fail(`Live media fixture public GET status should be 200, got ${summary.publicGetStatus}.`);
  if (![200, 202, 204].includes(summary.deleteStatus)) fail(`Live media fixture DELETE status should be success, got ${summary.deleteStatus}.`);
  if (!String(summary.signedGetContentType || "").toLowerCase().includes("text/plain")) fail(`Live media fixture signed GET should preserve text/plain Content-Type, got ${summary.signedGetContentType}.`);
  if (!String(summary.publicGetContentType || "").toLowerCase().includes("text/plain")) fail(`Live media fixture public GET should preserve text/plain Content-Type, got ${summary.publicGetContentType}.`);
  if (!summary.contentTypePreserved) fail("Live media fixture public GET should report Content-Type preservation.");
  if (!summary.putSigned) fail("Live media fixture PUT should include SigV4 headers.");
  if (!summary.signedGetSigned) fail("Live media fixture signed GET should include SigV4 headers.");
  if (!summary.deleteSigned) fail("Live media fixture DELETE should include SigV4 headers.");
  if (!summary.publicGetOk) fail("Live media fixture public GET should read through fake CDN.");
  if (summary.objectsRemaining !== 0) fail(`Live media fixture should clean up all objects, got ${summary.objectsRemaining}.`);
}

function validateLivePublicFailureFixture(summary) {
  if (!summary.rejected) fail("Live public failure fixture should fail the live smoke.");
  if (!summary.expectedErrorObserved) fail("Live public failure fixture should report the public GET failure.");
  if (!summary.deleteObserved) fail("Live public failure fixture should still issue object DELETE.");
  if (summary.objectsRemaining !== 0) fail(`Live public failure fixture should clean up the object, got ${summary.objectsRemaining}.`);
  if (!summary.deleteSigned) fail("Live public failure fixture DELETE should include SigV4 headers.");
}

async function runLiveFixture({ failPublicGet }) {
  const fakeS3 = await createFakeS3Server();
  const fakeCdn = await createFakeCdnServer(fakeS3, {
    bucket: "quantgym-live-fixture",
    mountPath: "/cdn",
    failPublicGet
  });
  try {
    const result = await runConfig(["--live", "--no-dotenv"], {
      QUANTGYM_MEDIA_STORAGE: "s3",
      QUANTGYM_MEDIA_MAX_BYTES: "1024",
      QUANTGYM_MAX_BODY_BYTES: "8192",
      QUANTGYM_MEDIA_S3_ENDPOINT: fakeS3.endpoint,
      QUANTGYM_MEDIA_S3_BUCKET: "quantgym-live-fixture",
      QUANTGYM_MEDIA_S3_REGION: "us-east-1",
      QUANTGYM_MEDIA_S3_ACCESS_KEY_ID: "QG_MEDIA_LIVE_FIXTURE_ACCESS",
      QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY: "qg-media-live-fixture-secret",
      QUANTGYM_MEDIA_S3_PREFIX: "fixture-media",
      QUANTGYM_MEDIA_PUBLIC_BASE_URL: `${fakeCdn.endpoint}/cdn`,
      QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS: "5"
    });
    const live = findResult(result.parsed?.results, "object storage live smoke");
    const liveData = live?.data || {};
    const putRequest = fakeS3.requests.find((request) => request.method === "PUT");
    const signedGetRequest = fakeS3.requests.find((request) => request.method === "GET");
    const deleteRequest = fakeS3.requests.find((request) => request.method === "DELETE");
    const firstFailureText = result.exitCode === 0 ? "" : firstFailure(result);
    return {
      status: result.parsed?.status || "unknown",
      childExitCode: result.exitCode,
      rejected: result.exitCode !== 0 && (result.parsed?.status === "fail" || Number(result.parsed?.failed || 0) > 0),
      expectedErrorObserved: firstFailureText.includes("Public media live GET returned HTTP 502"),
      error: firstFailureText,
      putStatus: Number(liveData.putStatus || 0),
      signedGetStatus: Number(liveData.signedGetStatus || 0),
      publicGetStatus: Number(liveData.publicGetStatus || 0),
      deleteStatus: Number(liveData.deleteStatus || 0),
      signedGetContentType: liveData.signedGetContentType || "",
      publicGetContentType: liveData.publicGetContentType || "",
      contentTypePreserved: liveData.contentTypePreserved === true,
      bytes: Number(liveData.bytes || 0),
      cleanedUp: liveData.cleanedUp === true,
      putSigned: hasSigV4Headers(putRequest),
      signedGetSigned: hasSigV4Headers(signedGetRequest),
      deleteSigned: hasSigV4Headers(deleteRequest),
      deleteObserved: Boolean(deleteRequest),
      publicGetOk: fakeCdn.requests.some((request) => request.statusCode === 200),
      publicGetFailureObserved: fakeCdn.requests.some((request) => request.statusCode === 502),
      s3Requests: summarizeRequests(fakeS3.requests),
      cdnRequests: summarizeRequests(fakeCdn.requests),
      objectsRemaining: fakeS3.objects.size
    };
  } finally {
    await closeServer(fakeCdn.server);
    await closeServer(fakeS3.server);
  }
}

async function runConfig(configArgs, envOverrides) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/check-media-storage-config.mjs", ...configArgs], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: isolatedEnv(envOverrides)
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) child.kill("SIGKILL");
    }, 30000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });
    child.on("error", (error) => {
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: 1, stdout, stderr: `${stderr}\n${error.message}`, parsed: null, combinedOutput: `${stdout}\n${stderr}\n${error.message}` });
    });
    child.on("close", (code, signal) => {
      settled = true;
      clearTimeout(timeout);
      const combinedOutput = `${stdout}\n${stderr}`;
      resolve({
        exitCode: typeof code === "number" ? code : 1,
        signal: signal || "",
        stdout,
        stderr,
        parsed: parseLastJson(stdout),
        combinedOutput
      });
    });
  });
}

function createFakeS3Server() {
  const objects = new Map();
  const requests = [];
  const server = http.createServer((request, response) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      const body = Buffer.concat(chunks);
      const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
      const item = {
        method: request.method || "",
        path: decodeURIComponent(requestUrl.pathname),
        headers: request.headers,
        body,
        statusCode: 0
      };
      requests.push(item);
      if (request.method === "PUT") {
        objects.set(item.path, {
          body,
          contentType: request.headers["content-type"] || "application/octet-stream"
        });
        item.statusCode = 200;
        response.writeHead(200, { ETag: "\"quantgym-media-fixture\"" });
        response.end();
        return;
      }
      if (request.method === "GET") {
        const object = objects.get(item.path);
        if (!object) {
          item.statusCode = 404;
          response.writeHead(404, { "Content-Type": "application/json" });
          response.end(JSON.stringify({ error: "not found" }));
          return;
        }
        item.statusCode = 200;
        response.writeHead(200, {
          "Content-Type": object.contentType,
          "Content-Length": String(object.body.length)
        });
        response.end(object.body);
        return;
      }
      if (request.method === "DELETE") {
        objects.delete(item.path);
        item.statusCode = 204;
        response.writeHead(204);
        response.end();
        return;
      }
      item.statusCode = 405;
      response.writeHead(405, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "method not allowed" }));
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        endpoint: `http://127.0.0.1:${server.address().port}`,
        objects,
        requests
      });
    });
  });
}

function createFakeCdnServer(fakeS3, { bucket, mountPath, failPublicGet }) {
  const requests = [];
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url || "/", `http://${request.headers.host || "127.0.0.1"}`);
    const item = {
      method: request.method || "",
      path: decodeURIComponent(requestUrl.pathname),
      statusCode: 0
    };
    requests.push(item);
    if (failPublicGet) {
      item.statusCode = 502;
      response.writeHead(502, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "simulated CDN failure" }));
      return;
    }
    const prefix = `${mountPath.replace(/\/+$/, "")}/`;
    const key = item.path.startsWith(prefix) ? item.path.slice(prefix.length) : "";
    const object = fakeS3.objects.get(`/${bucket}/${key}`);
    if (!object) {
      item.statusCode = 404;
      response.writeHead(404, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ error: "not found" }));
      return;
    }
    item.statusCode = 200;
    response.writeHead(200, {
      "Content-Type": object.contentType,
      "Content-Length": String(object.body.length)
    });
    response.end(object.body);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      resolve({
        server,
        endpoint: `http://127.0.0.1:${server.address().port}`,
        requests
      });
    });
  });
}

function summarizeProductionFixture(result) {
  const parsed = result.parsed || {};
  const storageBackend = findResult(parsed.results, "storage backend")?.data || {};
  const uploadEnvelope = findResult(parsed.results, "upload size envelope")?.data || {};
  const credentials = findResult(parsed.results, "object storage credentials")?.data || {};
  const publicUrl = findResult(parsed.results, "public media URL")?.data || {};
  return {
    status: parsed.status || "unknown",
    mode: parsed.mode || "",
    storage: parsed.storage || storageBackend.storage || "",
    passed: Number(parsed.passed || 0),
    failed: Number(parsed.failed || 0),
    objectStorage: storageBackend.objectStorage === true,
    mediaMaxBytes: Number(uploadEnvelope.mediaMaxBytes || 0),
    estimatedJsonBodyBytes: Number(uploadEnvelope.estimatedJsonBodyBytes || 0),
    endpointHost: credentials.endpointHost || "",
    endpointProtocol: credentials.endpointProtocol || "",
    bucket: credentials.bucket || "",
    region: credentials.region || "",
    prefix: credentials.prefix || "",
    accessKeyIdSet: credentials.accessKeyIdSet === true,
    secretAccessKeySet: credentials.secretAccessKeySet === true,
    publicHost: publicUrl.host || "",
    publicProtocol: publicUrl.protocol || ""
  };
}

function summarizeNegativeFixture(fixture, result) {
  const parsed = result.parsed || {};
  const errorText = firstFailure(result);
  return {
    name: fixture.name,
    rejected: result.exitCode !== 0 && (parsed.status === "fail" || Number(parsed.failed || 0) > 0),
    expectedErrorObserved: errorText.includes(fixture.expectedError),
    failed: Number(parsed.failed || 0),
    error: errorText
  };
}

function firstFailure(result) {
  const parsed = result.parsed || {};
  const failed = Array.isArray(parsed.results) ? parsed.results.find((item) => item.status === "fail") : null;
  return String(failed?.error || result.stderr || result.stdout || "").trim();
}

function summarizeRequests(requests = []) {
  return requests.map((request) => ({
    method: request.method,
    signed: hasSigV4Headers(request),
    statusCode: Number(request.statusCode || 0)
  }));
}

function hasSigV4Headers(request) {
  if (!request) return false;
  return /^AWS4-HMAC-SHA256\b/.test(String(request.headers?.authorization || ""))
    && /^[0-9a-f]{64}$/i.test(String(request.headers?.["x-amz-content-sha256"] || ""))
    && /^\d{8}T\d{6}Z$/.test(String(request.headers?.["x-amz-date"] || ""));
}

function isolatedEnv(overrides = {}) {
  const inherited = {};
  for (const key of ["PATH", "HOME", "TMPDIR", "TEMP", "TMP", "LANG", "LC_ALL", "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_OPTIONS"]) {
    if (process.env[key] != null) inherited[key] = process.env[key];
  }
  return { ...inherited, ...overrides };
}

function parseLastJson(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  const start = trimmed.lastIndexOf("\n{");
  const candidate = start >= 0 ? trimmed.slice(start + 1) : trimmed.slice(trimmed.indexOf("{"));
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function findResult(results, name) {
  return Array.isArray(results) ? results.find((item) => item.name === name) : null;
}

function findNegativeFixture(fixtures, name) {
  return Array.isArray(fixtures) ? fixtures.find((item) => item.name === name) : null;
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function fail(message) {
  failures.push(String(message));
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}
