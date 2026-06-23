#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import crypto from "node:crypto";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/336-ops-alert-production-fixture-summary.json";
const startedAt = Date.now();
const failures = [];
const warnings = [];

const validProductionEnv = {
  QUANTGYM_ALERT_WEBHOOK_URL: "https://alerts.quantgym.test/readiness-webhook",
  QUANTGYM_ALERT_WEBHOOK_TOKEN: "qgprod_7j4k9m2p6s8v1x3z5a7c9e2r",
  QUANTGYM_ALERT_MIN_STATUS_CODE: "500",
  QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS: "3",
  QUANTGYM_RATE_LIMIT_WINDOW_SECONDS: "60",
  QUANTGYM_AUTH_RATE_LIMIT_MAX: "30",
  QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX: "5",
  QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX: "20",
  QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX: "20",
  QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX: "20",
  QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX: "5",
  QUANTGYM_TRUST_PROXY_HEADERS: "1",
  QUANTGYM_TRUSTED_PROXY_CIDRS: "173.245.48.0/20,103.21.244.0/22",
  QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED: "1",
  QUANTGYM_EDGE_RATE_LIMIT_PROVIDER: "cloudflare",
  QUANTGYM_EDGE_RATE_LIMIT_NOTES: "Cloudflare edge rule limits /api/auth/* bursts by client IP and applies managed challenge before Render.",
  QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://dash.cloudflare.com/readiness/rulesets/quantgym-auth-rate-limit"
};

const negativeCases = [
  {
    name: "missing webhook token",
    env: { QUANTGYM_ALERT_WEBHOOK_TOKEN: "" },
    expectedError: "QUANTGYM_ALERT_WEBHOOK_TOKEN"
  },
  {
    name: "short webhook token rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_TOKEN: "short-token" },
    expectedError: "at least 24 characters"
  },
  {
    name: "placeholder webhook token rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_TOKEN: "change-me-alert-webhook-token" },
    expectedError: "placeholder value"
  },
  {
    name: "local webhook rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "https://localhost/quantgym-alerts" },
    expectedError: "must not point to localhost"
  },
  {
    name: "private webhook rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "https://10.42.0.8/quantgym-alerts" },
    expectedError: "private network address"
  },
  {
    name: "public IP webhook rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "https://8.8.8.8/quantgym-alerts" },
    expectedError: "DNS hostname"
  },
  {
    name: "webhook embedded credentials rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "https://alert-user:secret@alerts.quantgym.test/readiness-webhook" },
    expectedError: "embedded credentials"
  },
  {
    name: "webhook query rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "https://alerts.quantgym.test/readiness-webhook?token=leaky" },
    expectedError: "query strings or fragments"
  },
  {
    name: "http webhook rejected",
    env: { QUANTGYM_ALERT_WEBHOOK_URL: "http://alerts.quantgym.test/readiness-webhook" },
    expectedError: "must use HTTPS"
  },
  {
    name: "disabled in-process limiter rejected",
    env: { QUANTGYM_RATE_LIMIT_DISABLED: "1" },
    expectedError: "must not set QUANTGYM_RATE_LIMIT_DISABLED"
  },
  {
    name: "excessive auth limiter rejected",
    env: { QUANTGYM_AUTH_RATE_LIMIT_MAX: "121" },
    expectedError: "no more than 120"
  },
  {
    name: "trusted proxy without CIDR rejected",
    env: { QUANTGYM_TRUSTED_PROXY_CIDRS: "" },
    expectedError: "QUANTGYM_TRUSTED_PROXY_CIDRS"
  },
  {
    name: "trusted proxy wildcard CIDR rejected",
    env: { QUANTGYM_TRUSTED_PROXY_CIDRS: "0.0.0.0/0" },
    expectedError: "must not trust every source address"
  },
  {
    name: "missing edge provider rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_PROVIDER: "" },
    expectedError: "QUANTGYM_EDGE_RATE_LIMIT_PROVIDER"
  },
  {
    name: "placeholder edge evidence rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://dash.cloudflare.com/<account>/rulesets/<rule>" },
    expectedError: "placeholder brackets"
  },
  {
    name: "private edge evidence rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://192.168.10.20/rulesets/quantgym-auth-rate-limit" },
    expectedError: "private network address"
  },
  {
    name: "public IP edge evidence rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://8.8.4.4/rulesets/quantgym-auth-rate-limit" },
    expectedError: "DNS hostname"
  },
  {
    name: "edge evidence embedded credentials rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://reviewer:secret@dash.cloudflare.com/readiness/rulesets/quantgym-auth-rate-limit" },
    expectedError: "embedded credentials"
  },
  {
    name: "edge evidence query rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL: "https://dash.cloudflare.com/readiness/rulesets/quantgym-auth-rate-limit?token=leaky" },
    expectedError: "query strings or fragments"
  },
  {
    name: "short edge notes rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_NOTES: "too short" },
    expectedError: "QUANTGYM_EDGE_RATE_LIMIT_NOTES"
  },
  {
    name: "generic edge notes rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_NOTES: "Production edge controls are configured and reviewed." },
    expectedError: "protected auth surface"
  },
  {
    name: "edge notes missing client identity rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_NOTES: "Cloudflare edge rule rate-limits /api/auth/* bursts before Render." },
    expectedError: "client identity or IP"
  },
  {
    name: "edge notes missing enforcement action rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_NOTES: "Cloudflare edge rule observes /api/auth/* requests by client IP before Render." },
    expectedError: "enforcement action"
  },
  {
    name: "unconfirmed edge limiter rejected",
    env: { QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED: "0" },
    expectedError: "QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED"
  }
];

try {
  const defaultSummaryPath = path.join(root, "docs/browser-audit-screenshots/361-ops-alert-production-signoff-summary.json");
  const previousDefaultSummary = readOptionalFile(defaultSummaryPath);
  const defaultSummarySentinel = `${JSON.stringify({
    status: "pass",
    smoke: true,
    fixtureSentinel: "preserve-real-production-signoff-summary"
  }, null, 2)}\n`;
  fs.mkdirSync(path.dirname(defaultSummaryPath), { recursive: true });
  fs.writeFileSync(defaultSummaryPath, defaultSummarySentinel);
  const validProduction = await runConfigWithTempSummary(["--production", "--no-dotenv"], validProductionEnv, "valid");
  const defaultSummaryAfterValidFixture = readOptionalFile(defaultSummaryPath);
  restoreOptionalFile(defaultSummaryPath, previousDefaultSummary);
  if (defaultSummaryAfterValidFixture !== defaultSummarySentinel) {
    fail("Valid production fixture must not mutate the real production signoff summary; use an explicit fixture summary path.");
  }
  const productionFixture = summarizeProductionFixture(validProduction);
  validateValidProductionFixture(validProduction, productionFixture);

  const negativeFixtures = [];
  for (const fixture of negativeCases) {
    const result = await runConfigWithTempSummary(["--production", "--no-dotenv"], {
      ...validProductionEnv,
      ...fixture.env
    }, `negative-${fixture.name}`);
    const summary = summarizeNegativeFixture(fixture, result);
    negativeFixtures.push(summary);
    if (!summary.rejected) fail(`Negative fixture "${fixture.name}" should fail production config validation.`);
    if (!summary.expectedErrorObserved) {
      fail(`Negative fixture "${fixture.name}" did not mention expected error text "${fixture.expectedError}".`);
    }
  }

  const localWebhookSmoke = await runLocalWebhookSmoke();
  validateLocalWebhookSmoke(localWebhookSmoke);
  const noVerificationAckSmoke = await runSmokeWithoutVerificationAck();
  validateNoVerificationAckSmoke(noVerificationAckSmoke);
  const blockedProductionSmoke = await runBlockedProductionSmokeNoDelivery();
  validateBlockedProductionSmoke(blockedProductionSmoke);
  const productionSignoffSummary = await runProductionSignoffSummaryFixture();
  validateProductionSignoffSummaryFixture(productionSignoffSummary);
  const missingProductionEnvSummary = await runMissingProductionEnvSummaryFixture();
  validateMissingProductionEnvSummaryFixture(missingProductionEnvSummary);

  const checks = {
    validProductionPass: productionFixture.status === "pass",
    validProductionHasAllChecks: productionFixture.passed === 4 && productionFixture.failed === 0,
    validProductionWebhookTokenRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_TOKEN),
    validProductionWebhookUrlRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_URL),
    validProductionEdgeEvidenceUrlRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL),
    validProductionEdgeNotesRedacted: !validProduction.combinedOutput.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_NOTES),
    validProductionEdgeNotesDescribeAuthSurface: productionFixture.edgeNotesDescribeAuthSurface === true,
    validProductionEdgeNotesDescribeClientIdentity: productionFixture.edgeNotesDescribeClientIdentity === true,
    validProductionEdgeNotesDescribeEnforcementAction: productionFixture.edgeNotesDescribeEnforcementAction === true,
    negativeFixturesRejected: negativeFixtures.every((fixture) => fixture.rejected),
    negativeFixturesMentionExpectedErrors: negativeFixtures.every((fixture) => fixture.expectedErrorObserved),
    shortWebhookTokenRejected: negativeFixtures.some((fixture) => fixture.name === "short webhook token rejected" && fixture.rejected === true),
    placeholderWebhookTokenRejected: negativeFixtures.some((fixture) => fixture.name === "placeholder webhook token rejected" && fixture.rejected === true),
    webhookUrlRawIpRejected: negativeFixtures.some((fixture) => fixture.name === "public IP webhook rejected" && fixture.rejected === true),
    webhookUrlEmbeddedCredentialsRejected: negativeFixtures.some((fixture) => fixture.name === "webhook embedded credentials rejected" && fixture.rejected === true),
    webhookUrlQueryRejected: negativeFixtures.some((fixture) => fixture.name === "webhook query rejected" && fixture.rejected === true),
    edgeEvidenceUrlRawIpRejected: negativeFixtures.some((fixture) => fixture.name === "public IP edge evidence rejected" && fixture.rejected === true),
    edgeEvidenceUrlEmbeddedCredentialsRejected: negativeFixtures.some((fixture) => fixture.name === "edge evidence embedded credentials rejected" && fixture.rejected === true),
    edgeEvidenceUrlQueryRejected: negativeFixtures.some((fixture) => fixture.name === "edge evidence query rejected" && fixture.rejected === true),
    genericEdgeNotesRejected: negativeFixtures.some((fixture) => fixture.name === "generic edge notes rejected" && fixture.rejected === true),
    edgeNotesMissingClientIdentityRejected: negativeFixtures.some((fixture) => fixture.name === "edge notes missing client identity rejected" && fixture.rejected === true),
    edgeNotesMissingEnforcementActionRejected: negativeFixtures.some((fixture) => fixture.name === "edge notes missing enforcement action rejected" && fixture.rejected === true),
    localWebhookSmokeDelivered: localWebhookSmoke.delivered,
    localWebhookSmokeAuthorized: localWebhookSmoke.tokenAccepted,
    localWebhookSmokeSignatureValid: localWebhookSmoke.signatureValid,
    localWebhookSmokeVerificationAcked: localWebhookSmoke.signatureVerificationAcknowledged === true,
    localWebhookSmokePayloadSafe: localWebhookSmoke.payloadSanitized,
    smokeWithoutVerificationAckRejected: noVerificationAckSmoke.rejected === true,
    smokeWithoutVerificationAckNoDeliverySecretLeak: noVerificationAckSmoke.secretSafe === true,
    productionSmokeBlockedWhenConfigInvalid: blockedProductionSmoke.blocked === true,
    productionSmokeNoDeliveryWhenConfigInvalid: blockedProductionSmoke.delivered === false,
    productionSmokeFailureExplained: blockedProductionSmoke.failureExplained === true,
    productionSignoffSummaryWritten: productionSignoffSummary.summaryWritten === true,
    productionSignoffSummaryPass: productionSignoffSummary.productionSignoffPass === true,
    productionSignoffSummaryRedacted: productionSignoffSummary.secretSafe === true,
    missingProductionEnvDoesNotWriteDefaultSignoffSummary: missingProductionEnvSummary.createdDefaultSummary === false
  };

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    productionFixture,
    negativeFixtures,
    localWebhookSmoke,
    noVerificationAckSmoke,
    blockedProductionSmoke,
    productionSignoffSummary,
    missingProductionEnvSummary,
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
  if (summary.status !== "pass") fail("Valid production fixture did not report pass.");
  if (summary.passed !== 4 || summary.failed !== 0) fail(`Valid production fixture expected 4 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (!summary.alertWebhookTokenSet) fail("Valid production fixture did not require a webhook token.");
  if (summary.alertWebhookProtocol !== "https") fail(`Valid production fixture expected HTTPS webhook protocol, got ${summary.alertWebhookProtocol}.`);
  if (summary.edgeProvider !== "cloudflare") fail(`Valid production fixture expected cloudflare edge provider, got ${summary.edgeProvider}.`);
  if (summary.edgeEvidenceHost !== "dash.cloudflare.com") fail(`Valid production fixture expected dash.cloudflare.com evidence host, got ${summary.edgeEvidenceHost}.`);
  if (!summary.edgeNotesDescribeAuthSurface) fail("Valid production fixture notes must describe the protected auth surface.");
  if (!summary.edgeNotesDescribeClientIdentity) fail("Valid production fixture notes must describe client identity or IP.");
  if (!summary.edgeNotesDescribeEnforcementAction) fail("Valid production fixture notes must describe the enforcement action.");
  if (!summary.proxyHeaderTrustEnabled) fail("Valid production fixture did not enable explicit proxy-header trust.");
  if (summary.trustedProxyCidrCount < 2) fail("Valid production fixture did not validate trusted proxy CIDRs.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_TOKEN)) fail("Valid production fixture output leaked the webhook token.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_URL)) fail("Valid production fixture output leaked the full webhook URL.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL)) fail("Valid production fixture output leaked the full edge evidence URL.");
  if (result.combinedOutput.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_NOTES)) fail("Valid production fixture output leaked the edge rule notes.");
}

function validateLocalWebhookSmoke(summary) {
  if (summary.status !== "pass") fail(`Local webhook smoke child should pass, got ${summary.status}.`);
  if (!summary.delivered) fail("Local webhook smoke did not deliver a request.");
  if (!summary.tokenAccepted) fail("Local webhook smoke did not send the expected bearer token.");
  if (!summary.signatureValid) fail("Local webhook smoke did not send a valid HMAC signature.");
  if (!summary.signatureVerificationAcknowledged) fail("Local webhook smoke did not require receiver verification acknowledgement.");
  if (!summary.contentTypeJson) fail("Local webhook smoke should send application/json.");
  if (summary.payload?.eventType !== "ops.readiness.smoke") fail(`Local webhook smoke event type mismatch: ${summary.payload?.eventType}.`);
  if (summary.payload?.path !== "/ops/readiness-smoke") fail(`Local webhook smoke path mismatch: ${summary.payload?.path}.`);
  if (summary.payload?.statusCode !== 500) fail(`Local webhook smoke statusCode mismatch: ${summary.payload?.statusCode}.`);
  if (!summary.payload?.hasOccurredAt) fail("Local webhook smoke payload should include occurredAt.");
  if (!summary.payloadSanitized) fail("Local webhook smoke payload should not contain tokens or credentials.");
}

function validateBlockedProductionSmoke(summary) {
  if (!summary.blocked) fail("Production smoke with invalid config should fail before delivery.");
  if (summary.delivered) fail("Production smoke with invalid config must not deliver a webhook request.");
  if (!summary.failureExplained) fail("Blocked production smoke should explain that config checks failed first.");
  if (summary.childExitCode === 0) fail("Blocked production smoke child should exit non-zero.");
}

function validateProductionSignoffSummaryFixture(summary) {
  if (!summary.summaryWritten) fail("Production signoff fixture should write an explicit summary file.");
  if (summary.childExitCode !== 0) fail(`Production signoff summary child should pass, got exit ${summary.childExitCode}.`);
  if (summary.status !== "pass") fail(`Production signoff summary should report pass, got ${summary.status}.`);
  if (summary.mode !== "production") fail(`Production signoff summary should record production mode, got ${summary.mode}.`);
  if (summary.smoke !== false) fail("Production signoff summary without --smoke should record smoke=false.");
  if (!summary.productionSignoffPass) fail("Production signoff summary should set productionSignoffPass.");
  if (!summary.alertWebhookTokenSet) fail("Production signoff summary should record that the webhook token is set.");
  if (summary.alertWebhookHost !== "alerts.quantgym.test") fail(`Production signoff summary webhook host mismatch: ${summary.alertWebhookHost}.`);
  if (summary.edgeProvider !== "cloudflare") fail(`Production signoff summary edge provider mismatch: ${summary.edgeProvider}.`);
  if (summary.edgeEvidenceHost !== "dash.cloudflare.com") fail(`Production signoff summary evidence host mismatch: ${summary.edgeEvidenceHost}.`);
  if (!summary.secretSafe) fail("Production signoff summary must not leak tokens, full webhook URLs, full dashboard URLs, or edge notes.");
}

function validateMissingProductionEnvSummaryFixture(summary) {
  if (summary.childExitCode === 0) fail("Missing production env fixture should fail.");
  if (summary.createdDefaultSummary) fail("Missing production env fixture must not write the default production signoff summary.");
  if (!summary.failureExplained) fail("Missing production env fixture should explain the missing webhook URL.");
}

function validateNoVerificationAckSmoke(summary) {
  if (!summary.rejected) fail("Webhook smoke without receiver verification acknowledgement should fail.");
  if (!summary.failureExplained) fail("Webhook smoke without receiver verification acknowledgement should explain the missing acknowledgement.");
  if (!summary.secretSafe) fail("Webhook smoke without receiver verification acknowledgement should not leak the bearer token.");
}

async function runProductionSignoffSummaryFixture() {
  const explicitSummaryPath = path.join("/tmp", `quantgym-ops-alert-production-signoff-${process.pid}.json`);
  fs.rmSync(explicitSummaryPath, { force: true });
  const result = await runConfig(["--production", "--no-dotenv", "--summary", explicitSummaryPath], validProductionEnv);
  const summaryWritten = fs.existsSync(explicitSummaryPath);
  let summary = null;
  if (summaryWritten) {
    try {
      summary = JSON.parse(fs.readFileSync(explicitSummaryPath, "utf8"));
    } catch {
      summary = null;
    }
  }
  fs.rmSync(explicitSummaryPath, { force: true });
  const serialized = summary ? JSON.stringify(summary) : "";
  return {
    childExitCode: result.exitCode,
    summaryWritten,
    status: summary?.status || "",
    mode: summary?.mode || "",
    smoke: summary?.smoke,
    productionSignoffPass: summary?.checks?.productionSignoffPass === true,
    webhookSmokePass: summary?.checks?.webhookSmokePass === true,
    alertWebhookHost: summary?.alertWebhookHost || "",
    alertWebhookTokenSet: summary?.checks?.alertWebhookTokenSet === true,
    edgeProvider: summary?.edgeProvider || "",
    edgeEvidenceHost: summary?.edgeEvidenceHost || "",
    secretSafe: !serialized.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_TOKEN)
      && !serialized.includes(validProductionEnv.QUANTGYM_ALERT_WEBHOOK_URL)
      && !serialized.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL)
      && !serialized.includes(validProductionEnv.QUANTGYM_EDGE_RATE_LIMIT_NOTES),
    outputPreview: result.combinedOutput.slice(0, 700)
  };
}

async function runMissingProductionEnvSummaryFixture() {
  const defaultSummaryPath = path.join(root, "docs/browser-audit-screenshots/361-ops-alert-production-signoff-summary.json");
  const existingSummary = fs.existsSync(defaultSummaryPath)
    ? fs.readFileSync(defaultSummaryPath, "utf8")
    : null;
  fs.rmSync(defaultSummaryPath, { force: true });
  const result = await runConfig(["--production", "--no-dotenv"], {});
  const createdDefaultSummary = fs.existsSync(defaultSummaryPath);
  fs.rmSync(defaultSummaryPath, { force: true });
  if (existingSummary !== null) {
    fs.mkdirSync(path.dirname(defaultSummaryPath), { recursive: true });
    fs.writeFileSync(defaultSummaryPath, existingSummary);
  }
  return {
    childExitCode: result.exitCode,
    createdDefaultSummary,
    failureExplained: /QUANTGYM_ALERT_WEBHOOK_URL is required/i.test(firstFailure(result)),
    outputPreview: result.combinedOutput.slice(0, 700)
  };
}

async function runLocalWebhookSmoke() {
  const received = [];
  const token = "quantgym-local-config-smoke-token";
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const rawBody = Buffer.concat(chunks).toString("utf8");
      let payload = null;
      try {
        payload = JSON.parse(rawBody);
      } catch {
        // Keep the raw body for the summary below.
      }
      received.push({
        method: req.method || "",
        url: req.url || "",
        authorization: req.headers.authorization || "",
        signature: req.headers["x-quantgym-alert-signature"] || "",
        contentType: req.headers["content-type"] || "",
        rawBody,
        payload
      });
      res.writeHead(200, {
        "Content-Type": "application/json",
        "X-QuantGym-Alert-Verified": "1"
      });
      res.end(JSON.stringify({ ok: true, verified: true }));
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const url = `http://127.0.0.1:${server.address().port}/ops-alert-config-smoke`;
    const result = await runConfig(["--smoke", "--no-dotenv"], {
      QUANTGYM_ALERT_WEBHOOK_URL: url,
      QUANTGYM_ALERT_WEBHOOK_TOKEN: token,
      QUANTGYM_ALERT_MIN_STATUS_CODE: "500",
      QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS: "2",
      QUANTGYM_RATE_LIMIT_WINDOW_SECONDS: "60",
      QUANTGYM_AUTH_RATE_LIMIT_MAX: "30",
      QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX: "5"
    });
    const request = received[0] || {};
    const payload = request.payload || {};
    const smokeResult = findResult(result.parsed?.results, "alert webhook smoke") || {};
    return {
      status: result.parsed?.status || "unknown",
      childExitCode: result.exitCode,
      delivered: received.length === 1,
      tokenAccepted: request.authorization === `Bearer ${token}`,
      signaturePresent: Boolean(request.signature),
      signatureValid: request.signature === signWebhookBody(token, request.rawBody || ""),
      signatureVerificationAcknowledged: smokeResult.data?.signatureVerificationAcknowledged === true,
      contentTypeJson: /^application\/json\b/i.test(String(request.contentType || "")),
      payload: {
        eventType: payload.eventType || "",
        statusCode: Number(payload.statusCode || 0),
        method: payload.method || "",
        path: payload.path || "",
        hasOccurredAt: isIsoTimestamp(payload.occurredAt)
      },
      payloadSanitized: isPayloadSanitized(payload),
      childPassed: result.exitCode === 0 && result.parsed?.status === "pass"
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runSmokeWithoutVerificationAck() {
  const received = [];
  const token = "quantgym-no-ack-smoke-token";
  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      received.push({
        authorization: req.headers.authorization || "",
        signature: req.headers["x-quantgym-alert-signature"] || "",
        rawBody: Buffer.concat(chunks).toString("utf8")
      });
      res.writeHead(204);
      res.end();
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const url = `http://127.0.0.1:${server.address().port}/ops-alert-no-ack-smoke`;
    const result = await runConfig(["--smoke", "--no-dotenv"], {
      QUANTGYM_ALERT_WEBHOOK_URL: url,
      QUANTGYM_ALERT_WEBHOOK_TOKEN: token,
      QUANTGYM_ALERT_MIN_STATUS_CODE: "500",
      QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS: "2",
      QUANTGYM_RATE_LIMIT_WINDOW_SECONDS: "60",
      QUANTGYM_AUTH_RATE_LIMIT_MAX: "30",
      QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX: "5"
    });
    const smokeResult = findResult(result.parsed?.results, "alert webhook smoke") || {};
    const combined = result.combinedOutput || "";
    return {
      childExitCode: result.exitCode,
      delivered: received.length === 1,
      rejected: result.exitCode !== 0 && result.parsed?.status === "fail" && smokeResult.status === "fail",
      failureExplained: /signature verification/i.test(String(smokeResult.error || "")),
      secretSafe: !combined.includes(token)
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

function signWebhookBody(token, body) {
  return `sha256=${crypto.createHmac("sha256", token).update(String(body || ""), "utf8").digest("hex")}`;
}

async function runBlockedProductionSmokeNoDelivery() {
  const received = [];
  const server = http.createServer((req, res) => {
    received.push({
      method: req.method || "",
      url: req.url || "",
      authorization: req.headers.authorization || ""
    });
    res.writeHead(204);
    res.end();
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  try {
    const url = `http://127.0.0.1:${server.address().port}/should-not-receive-production-smoke`;
    const result = await runConfigWithTempSummary(["--production", "--smoke", "--no-dotenv"], {
      ...validProductionEnv,
      QUANTGYM_ALERT_WEBHOOK_URL: url,
      QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED: "0"
    }, "blocked-smoke");
    const smokeResult = findResult(result.parsed?.results, "alert webhook smoke") || {};
    return {
      childExitCode: result.exitCode,
      blocked: result.exitCode !== 0 && result.parsed?.status === "fail" && smokeResult.status === "fail",
      delivered: received.length > 0,
      receivedCount: received.length,
      failureExplained: /configuration checks failed before external delivery/i.test(String(smokeResult.error || "")),
      firstFailure: firstFailure(result)
    };
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

async function runConfig(configArgs, envOverrides) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/check-ops-alert-config.mjs", ...configArgs], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
      env: isolatedEnv(envOverrides)
    });
    let stdout = "";
    let stderr = "";
    let settled = false;
    const timeout = setTimeout(() => {
      if (!settled) child.kill("SIGKILL");
    }, 15000);
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

async function runConfigWithTempSummary(configArgs, envOverrides, label) {
  const safeLabel = String(label || "fixture").replace(/[^a-z0-9._-]+/gi, "-").slice(0, 80);
  const tempSummaryPath = path.join("/tmp", `quantgym-ops-alert-production-fixture-${process.pid}-${safeLabel}.json`);
  fs.rmSync(tempSummaryPath, { force: true });
  try {
    return await runConfig([...configArgs, "--summary", tempSummaryPath], envOverrides);
  } finally {
    fs.rmSync(tempSummaryPath, { force: true });
  }
}

function summarizeProductionFixture(result) {
  const parsed = result.parsed || {};
  const alertShape = findResult(parsed.results, "alert webhook shape")?.data || {};
  const authRateLimits = findResult(parsed.results, "auth rate limits")?.data || {};
  const edgeSignoff = findResult(parsed.results, "edge rate-limit signoff")?.data || {};
  const proxyHeaderTrust = findResult(parsed.results, "proxy header trust")?.data || {};
  return {
    status: parsed.status || "unknown",
    passed: Number(parsed.passed || 0),
    failed: Number(parsed.failed || 0),
    alertWebhookHost: alertShape.host || "",
    alertWebhookProtocol: alertShape.protocol || "",
    alertWebhookTokenSet: alertShape.tokenSet === true,
    alertMinStatusCode: Number(alertShape.minStatusCode || 0),
    rateLimitDisabled: authRateLimits.disabled === true,
    authRateLimitMax: Number(authRateLimits.authRateLimitMax || 0),
    passwordResetRateLimitMax: Number(authRateLimits.passwordResetRateLimitMax || 0),
    proxyHeaderTrustEnabled: proxyHeaderTrust.enabled === true,
    trustedProxyCidrCount: Number(proxyHeaderTrust.cidrCount || 0),
    edgeProvider: edgeSignoff.provider || "",
    edgeNotesLength: Number(edgeSignoff.notesLength || 0),
    edgeNotesDescribeAuthSurface: edgeSignoff.describesAuthSurface === true,
    edgeNotesDescribeClientIdentity: edgeSignoff.describesClientIdentity === true,
    edgeNotesDescribeEnforcementAction: edgeSignoff.describesEnforcementAction === true,
    edgeEvidenceHost: edgeSignoff.evidenceHost || ""
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

function isPayloadSanitized(payload = {}) {
  const raw = JSON.stringify(payload).toLowerCase();
  for (const forbidden of ["authorization", "credential", "password", "token", "state", "community", "problems", "body"]) {
    if (raw.includes(forbidden)) return false;
  }
  return true;
}

function isIsoTimestamp(value) {
  try {
    return Boolean(value) && !Number.isNaN(Date.parse(value));
  } catch {
    return false;
  }
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

function readOptionalFile(filePath) {
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, "utf8") : null;
}

function restoreOptionalFile(filePath, content) {
  if (content === null) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content);
}
