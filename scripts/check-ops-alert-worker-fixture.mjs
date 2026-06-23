#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/356-ops-alert-worker-fixture-summary.json";
const workerPath = path.join(root, "workers/quantgym-alert-receiver/worker.mjs");
const token = "qg_alert_worker_fixture_token_32_chars";
const failures = [];
const warnings = [];
const startedAt = Date.now();

try {
  if (!fs.existsSync(workerPath)) {
    throw new Error("Cloudflare alert receiver worker module is missing.");
  }
  const worker = await import(`${pathToFileUrl(workerPath)}?fixture=${Date.now()}`);
  const fetchHandler = worker.default?.fetch || worker.fetch || worker.handleAlertRequest;
  if (typeof fetchHandler !== "function") {
    throw new Error("Cloudflare alert receiver worker must export a fetch handler.");
  }

  const validPayload = {
    service: "quantgym-api",
    eventType: "ops.readiness.smoke",
    status: "test",
    statusCode: 500,
    method: "POST",
    path: "/ops/readiness-smoke",
    message: "QuantGym alert webhook readiness smoke.",
    occurredAt: "2026-06-23T00:00:00.000Z"
  };

  const cases = {
    valid: await invokeWorker(fetchHandler, {
      payload: validPayload,
      token,
      authToken: token,
      signatureToken: token
    }),
    wrongBearer: await invokeWorker(fetchHandler, {
      payload: validPayload,
      token,
      authToken: `${token}_wrong`,
      signatureToken: token
    }),
    wrongSignature: await invokeWorker(fetchHandler, {
      payload: validPayload,
      token,
      authToken: token,
      signatureToken: `${token}_wrong`
    }),
    missingEnvToken: await invokeWorker(fetchHandler, {
      payload: validPayload,
      token: "",
      authToken: token,
      signatureToken: token
    }),
    nonPost: await invokeWorker(fetchHandler, {
      payload: validPayload,
      token,
      authToken: token,
      signatureToken: token,
      method: "GET"
    }),
    invalidJson: await invokeWorker(fetchHandler, {
      body: "{\"service\":",
      token,
      authToken: token,
      signatureToken: token
    })
  };

  const checks = {
    validAccepted: cases.valid.status === 200,
    validVerificationHeader: cases.valid.headers["x-quantgym-alert-verified"] === "1",
    validJsonAck: cases.valid.body?.verified === true,
    wrongBearerRejected: cases.wrongBearer.status === 401,
    wrongBearerNoVerificationAck: !cases.wrongBearer.headers["x-quantgym-alert-verified"],
    wrongSignatureRejected: cases.wrongSignature.status === 401,
    wrongSignatureNoVerificationAck: !cases.wrongSignature.headers["x-quantgym-alert-verified"],
    missingEnvTokenRejected: cases.missingEnvToken.status === 500,
    nonPostRejected: cases.nonPost.status === 405 && cases.nonPost.headers.allow === "POST",
    invalidJsonRejected: cases.invalidJson.status === 400,
    noSecretLeak: !JSON.stringify(cases).includes(token)
  };

  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) fail(`Worker fixture check failed: ${name}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    cases,
    checks,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    checks: {},
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

async function invokeWorker(fetchHandler, {
  payload,
  body = JSON.stringify(payload),
  token: envToken,
  authToken,
  signatureToken,
  method = "POST"
}) {
  const signature = signBody(body, signatureToken);
  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${authToken}`,
    "X-QuantGym-Alert-Signature": signature
  };
  const request = new Request("https://alerts.quantgym.test/quantgym-alerts", {
    method,
    headers,
    body: method === "GET" ? undefined : body
  });
  const response = await fetchHandler(request, { QUANTGYM_ALERT_WEBHOOK_TOKEN: envToken }, {});
  const responseText = await response.text();
  let responseJson = null;
  try {
    responseJson = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseJson = null;
  }
  return {
    status: response.status,
    headers: {
      allow: response.headers.get("Allow") || "",
      "cache-control": response.headers.get("Cache-Control") || "",
      "content-type": response.headers.get("Content-Type") || "",
      "x-quantgym-alert-verified": response.headers.get("X-QuantGym-Alert-Verified") || ""
    },
    body: responseJson || summarizeBody(responseText)
  };
}

function signBody(body, secret) {
  const digest = crypto.createHmac("sha256", secret).update(body, "utf8").digest("hex");
  return `sha256=${digest}`;
}

function summarizeBody(value) {
  const text = String(value || "");
  return text.length > 120 ? `${text.slice(0, 120)}...` : text;
}

function pathToFileUrl(filePath) {
  return `file://${filePath.split(path.sep).map(encodeURIComponent).join("/")}`;
}

function fail(message) {
  failures.push(message);
}

function writeSummary(summary) {
  const outPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}
