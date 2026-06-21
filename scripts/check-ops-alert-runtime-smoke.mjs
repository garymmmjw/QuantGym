#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/334-ops-alert-runtime-smoke-summary.json";
const token = "quantgym-local-alert-smoke-token";
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-ops-alert-"));
const tempDb = path.join(tempDir, "quantgym-alert-smoke.sqlite3");
const failures = [];
const warnings = [];
const received = [];
let webhookServer;
let apiProcess;

try {
  webhookServer = await createWebhookServer();
  const webhookUrl = `http://127.0.0.1:${webhookServer.address().port}/quantgym-alert-smoke`;
  const apiPort = await findFreePort();
  apiProcess = startApi(apiPort, webhookUrl);
  await waitForHealth(apiPort);

  const smokePath = `/api/ops-alert-runtime-smoke-${Date.now()}`;
  const response = await fetch(`http://127.0.0.1:${apiPort}${smokePath}?credential=SHOULD_NOT_LEAK`, {
    headers: {
      Authorization: "Bearer SHOULD_NOT_LEAK",
      "X-Smoke-Secret": "SHOULD_NOT_LEAK"
    }
  });
  if (response.status !== 404) failures.push(`Expected runtime smoke endpoint to return 404, got ${response.status}.`);

  const firstRequest = await waitForWebhookCount(1);
  validateWebhookRequest(firstRequest?.[0], {
    path: "/quantgym-alert-smoke",
    statusCode: 404,
    eventType: "http.error.404",
    method: "GET",
    payloadPath: smokePath,
    message: "Not found"
  });
  const authRateLimit = await exerciseAuthRateLimit(apiPort);
  await waitForWebhookCount(4);
  const spoofedForwardedForRateLimit = await exerciseSpoofedForwardedForRateLimit(apiPort);
  await waitForWebhookCount(7);
  const alertChecks = validateAllWebhookRequests(smokePath);

  const summary = {
    status: failures.length ? "fail" : "pass",
    webhookReceived: received.length,
    apiPort,
    dbPath: tempDb,
    payload: firstRequest?.[0]?.payload ? {
      eventType: firstRequest[0].payload.eventType,
      statusCode: firstRequest[0].payload.statusCode,
      method: firstRequest[0].payload.method,
      path: firstRequest[0].payload.path,
      hasOccurredAt: Boolean(firstRequest[0].payload.occurredAt)
    } : null,
    alerts: received.map((request) => ({
      eventType: request.payload?.eventType || "",
      statusCode: request.payload?.statusCode || 0,
      method: request.payload?.method || "",
      path: request.payload?.path || "",
      hasOccurredAt: Boolean(request.payload?.occurredAt)
    })),
    checks: alertChecks,
    authRateLimit,
    spoofedForwardedForRateLimit,
    failures,
    warnings
  };
  writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exitCode = 1;
} catch (error) {
  const summary = {
    status: "fail",
    webhookReceived: received.length,
    dbPath: tempDb,
    error: error.message || String(error),
    apiStdoutTail: tail(apiProcess?.stdoutText || ""),
    apiStderrTail: tail(apiProcess?.stderrText || ""),
    failures,
    warnings
  };
  writeSummary(summary);
  console.log(JSON.stringify(summary, null, 2));
  process.exitCode = 1;
} finally {
  if (apiProcess) await stopProcess(apiProcess);
  if (webhookServer) await closeServer(webhookServer);
  fs.rmSync(tempDir, { recursive: true, force: true });
}

function createWebhookServer() {
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      let payload = null;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        failures.push("Webhook body was not valid JSON.");
      }
      received.push({
        method: req.method,
        url: req.url,
        headers: req.headers,
        rawBody,
        payload
      });
      res.writeHead(204);
      res.end();
    });
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

function findFreePort() {
  const server = http.createServer();
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
  });
}

function startApi(port, webhookUrl) {
  const child = spawn("python3", ["api-server/server.py"], {
    cwd: projectRoot,
    stdio: ["ignore", "pipe", "pipe"],
    env: {
      ...process.env,
      PYTHONDONTWRITEBYTECODE: "1",
      PORT: String(port),
      QUANTGYM_HOST: "127.0.0.1",
      QUANTGYM_DB: tempDb,
      QUANTGYM_ALERT_WEBHOOK_URL: webhookUrl,
      QUANTGYM_ALERT_WEBHOOK_TOKEN: token,
      QUANTGYM_ALERT_MIN_STATUS_CODE: "400",
      QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS: "2",
      QUANTGYM_RATE_LIMIT_WINDOW_SECONDS: "60",
      QUANTGYM_AUTH_RATE_LIMIT_MAX: "30",
      QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX: "2",
      QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX: "2",
      QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX: "5",
      QUANTGYM_GOOGLE_CLIENT_ID: "runtime-smoke.apps.googleusercontent.com"
    }
  });
  child.stdoutText = "";
  child.stderrText = "";
  child.stdout.on("data", (chunk) => {
    child.stdoutText += chunk.toString("utf8");
  });
  child.stderr.on("data", (chunk) => {
    child.stderrText += chunk.toString("utf8");
  });
  return child;
}

async function waitForHealth(port) {
  const started = Date.now();
  while (Date.now() - started < 15000) {
    if (apiProcess.exitCode != null) {
      throw new Error(`API exited before health check. stderr: ${tail(apiProcess.stderrText || "")}`);
    }
    try {
      const response = await fetch(`http://127.0.0.1:${port}/api/health`);
      const data = await response.json().catch(() => ({}));
      if (response.ok && data.ok === true) return;
    } catch {
      // Keep polling until startup finishes or timeout.
    }
    await delay(200);
  }
  throw new Error("Timed out waiting for API health.");
}

async function waitForWebhookCount(expectedCount) {
  const started = Date.now();
  while (Date.now() - started < 5000) {
    if (received.length >= expectedCount) return received;
    await delay(100);
  }
  failures.push(`Webhook received ${received.length} alert(s), expected at least ${expectedCount}.`);
  return received;
}

function validateWebhookRequest(request, expectation = {}) {
  if (!request) return;
  if (request.method !== "POST") failures.push(`Webhook method should be POST, got ${request.method}.`);
  if (request.url !== expectation.path) failures.push(`Webhook path mismatch: ${request.url}.`);
  if (request.headers.authorization !== `Bearer ${token}`) failures.push("Webhook Authorization bearer token was missing or wrong.");
  if (!/^application\/json\b/i.test(String(request.headers["content-type"] || ""))) failures.push("Webhook content-type should be application/json.");
  if (!verifyWebhookSignature(request)) failures.push("Webhook HMAC signature was missing or wrong.");

  const payload = request.payload || {};
  const expectedPayload = {
    service: "quantgym-api",
    eventType: expectation.eventType,
    status: expectation.statusCode >= 500 ? "error" : "fail",
    statusCode: expectation.statusCode,
    method: expectation.method,
    path: expectation.payloadPath,
    message: expectation.message
  };
  for (const [key, value] of Object.entries(expectedPayload)) {
    if (payload[key] !== value) failures.push(`Webhook payload ${key} expected ${JSON.stringify(value)}, got ${JSON.stringify(payload[key])}.`);
  }
  if (!isIsoTimestamp(payload.occurredAt)) failures.push("Webhook payload occurredAt must be an ISO timestamp.");

  validatePayloadSanitization(payload);
}

function validateAllWebhookRequests(smokePath) {
  const expectations = [
    {
      path: "/quantgym-alert-smoke",
      statusCode: 404,
      eventType: "http.error.404",
      method: "GET",
      payloadPath: smokePath,
      message: "Not found"
    },
    {
      path: "/quantgym-alert-smoke",
      statusCode: 401,
      eventType: "http.error.401",
      method: "POST",
      payloadPath: "/api/auth/login",
      message: "Authentication request failed."
    },
    {
      path: "/quantgym-alert-smoke",
      statusCode: 401,
      eventType: "http.error.401",
      method: "POST",
      payloadPath: "/api/auth/login",
      message: "Authentication request failed."
    },
    {
      path: "/quantgym-alert-smoke",
      statusCode: 429,
      eventType: "http.error.429",
      method: "POST",
      payloadPath: "/api/auth/login",
      message: "Too many requests."
    }
  ];
  for (const [index, expectation] of expectations.entries()) {
    validateWebhookRequest(received[index], expectation);
  }
  const statuses = received.map((request) => Number(request.payload?.statusCode || 0));
  const authAlerts = received.filter((request) => request.payload?.path === "/api/auth/login");
  const googleAlerts = received.filter((request) => request.payload?.path === "/api/auth/google");
  const sanitized = received.every((request) => isPayloadSanitized(request.payload));
  if (!sanitized) failures.push("One or more webhook payloads leaked forbidden field/text.");
  return {
    expectedAlerts: expectations.length,
    allExpectedAlertsDelivered: received.length >= expectations.length,
    webhookAuthorizationOk: received.every((request) => request.headers.authorization === `Bearer ${token}`),
    webhookSignaturesOk: received.every((request) => verifyWebhookSignature(request)),
    allWebhookPayloadsSanitized: sanitized,
    statusCodes: statuses,
    authFailureAlertsDelivered: authAlerts.filter((request) => request.payload?.statusCode === 401).length,
    authRateLimitAlertDelivered: authAlerts.some((request) => request.payload?.statusCode === 429),
    spoofedForwardedForRateLimitAlertDelivered: googleAlerts.some((request) => request.payload?.statusCode === 429)
  };
}

function verifyWebhookSignature(request = {}) {
  const actual = String(request.headers?.["x-quantgym-alert-signature"] || "");
  const expected = `sha256=${crypto.createHmac("sha256", token).update(String(request.rawBody || ""), "utf8").digest("hex")}`;
  return actual === expected;
}

function validatePayloadSanitization(payload = {}) {
  if (!isPayloadSanitized(payload)) failures.push("Webhook payload leaked forbidden field/text.");
}

function isPayloadSanitized(payload = {}) {
  const raw = JSON.stringify(payload).toLowerCase();
  for (const forbidden of ["should_not_leak", "authorization", "credential", "password", "token", "state", "community", "problems", "body"]) {
    if (raw.includes(forbidden)) return false;
  }
  return true;
}

async function exerciseAuthRateLimit(apiPort) {
  const statuses = [];
  const errors = [];
  const email = `rate-limit-${Date.now()}@example.test`;
  for (let index = 0; index < 3; index += 1) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password: "wrong-password-for-rate-limit-smoke"
      })
    });
    const body = await response.json().catch(() => ({}));
    statuses.push(response.status);
    errors.push(String(body.error || ""));
  }

  const expectedStatuses = [401, 401, 429];
  if (JSON.stringify(statuses) !== JSON.stringify(expectedStatuses)) {
    failures.push(`Auth login rate limit expected statuses ${expectedStatuses.join(",")}, got ${statuses.join(",")}.`);
  }
  if (!/too many requests/i.test(errors[2] || "")) {
    failures.push(`Auth login rate limit final error should mention too many requests, got ${JSON.stringify(errors[2] || "")}.`);
  }

  return {
    scope: "auth:login",
    configuredMaxRequests: 2,
    attemptedRequests: statuses.length,
    statuses,
    rateLimited: statuses[2] === 429
  };
}

async function exerciseSpoofedForwardedForRateLimit(apiPort) {
  const statuses = [];
  const errors = [];
  for (let index = 0; index < 3; index += 1) {
    const response = await fetch(`http://127.0.0.1:${apiPort}/api/auth/google`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": `203.0.113.${10 + index}`
      },
      body: JSON.stringify({
        credential: "",
        account: {}
      })
    });
    const body = await response.json().catch(() => ({}));
    statuses.push(response.status);
    errors.push(String(body.error || ""));
  }

  const expectedStatuses = [400, 400, 429];
  if (JSON.stringify(statuses) !== JSON.stringify(expectedStatuses)) {
    failures.push(`Spoofed X-Forwarded-For rate limit expected statuses ${expectedStatuses.join(",")}, got ${statuses.join(",")}.`);
  }
  if (!/too many requests/i.test(errors[2] || "")) {
    failures.push(`Spoofed X-Forwarded-For rate limit final error should mention too many requests, got ${JSON.stringify(errors[2] || "")}.`);
  }

  return {
    scope: "auth:google",
    configuredMaxRequests: 2,
    attemptedRequests: statuses.length,
    spoofedForwardedForValues: 3,
    statuses,
    rateLimited: statuses[2] === 429
  };
}

function isIsoTimestamp(value) {
  try {
    return Boolean(value) && !Number.isNaN(Date.parse(value));
  } catch {
    return false;
  }
}

function stopProcess(child) {
  return new Promise((resolve) => {
    if (child.exitCode != null) return resolve();
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode == null) child.kill("SIGKILL");
      resolve();
    }, 2000).unref();
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(resolve));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tail(value, max = 2000) {
  const text = String(value || "");
  return text.length > max ? text.slice(-max) : text;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(projectRoot, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}
