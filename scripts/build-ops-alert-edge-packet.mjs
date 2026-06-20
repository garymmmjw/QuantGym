#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/ops-alert-edge/readiness-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/346-ops-alert-edge-packet-summary.json");
const generatedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const expectedFiles = [
  "README.md",
  "render-api-env-template.txt",
  "cloudflare-rate-limit-rule.md",
  "webhook-contract.md",
  "smoke-payload.sample.json",
  "signoff-checklist.csv"
];

try {
  const runtimeSmoke = readJson("docs/browser-audit-screenshots/334-ops-alert-runtime-smoke-summary.json", "ops alert runtime smoke");
  const productionFixture = readJson("docs/browser-audit-screenshots/336-ops-alert-production-fixture-summary.json", "ops alert production fixture");
  if (runtimeSmoke.status !== "pass") warnings.push("Ops alert runtime smoke is not currently passing.");
  if (productionFixture.status !== "pass") warnings.push("Ops alert production fixture is not currently passing.");

  const packet = buildPacketModel(runtimeSmoke, productionFixture);
  const files = [
    writePacketFile("README.md", renderOverview(packet)),
    writePacketFile("render-api-env-template.txt", renderEnvTemplate(packet)),
    writePacketFile("cloudflare-rate-limit-rule.md", renderCloudflareRule(packet)),
    writePacketFile("webhook-contract.md", renderWebhookContract(packet)),
    writePacketFile("smoke-payload.sample.json", `${JSON.stringify(packet.smokePayload, null, 2)}\n`),
    writePacketFile("signoff-checklist.csv", renderChecklistCsv(packet))
  ];

  const combinedContent = files
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");
  const checks = {
    expectedFilesWritten: expectedFiles.every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
    includesProductionEnvTemplate: combinedContent.includes("QUANTGYM_ALERT_WEBHOOK_URL")
      && combinedContent.includes("QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL"),
    includesWebhookContract: combinedContent.includes("Alert Webhook Contract")
      && combinedContent.includes("2xx response"),
    includesCloudflareRuleRunbook: combinedContent.includes("Cloudflare Edge Rate-Limit Rule")
      && combinedContent.includes("/api/auth/*"),
    includesSignoffChecklist: combinedContent.includes("run production signoff")
      && combinedContent.includes("npm run check:ops-alerts:production"),
    includesWebhookSmokeSignoff: combinedContent.includes("run production webhook smoke")
      && combinedContent.includes("npm run check:ops-alerts:production -- --smoke")
      && packet.signoffCommand.includes("npm run check:ops-alerts:production -- --smoke"),
    usesPlaceholderOnlyForToken: combinedContent.includes("<generate-with-openssl-rand-base64-32>")
      && !combinedContent.includes("qgprod_")
      && !combinedContent.includes("quantgym-local-config-smoke-token"),
    noDashboardQueryOrFragmentExamples: !/dash\.cloudflare\.com\/[^\s"']*[?#]/i.test(combinedContent),
    runtimeSmokePass: runtimeSmoke.status === "pass",
    productionFixturePass: productionFixture.status === "pass",
    fixtureRejectsUnsafeInputs: productionFixture.checks?.negativeFixturesRejected === true
      && productionFixture.checks?.shortWebhookTokenRejected === true
      && productionFixture.checks?.placeholderWebhookTokenRejected === true,
    fixtureRequiresSpecificEdgeNotes: productionFixture.checks?.validProductionEdgeNotesDescribeAuthSurface === true
      && productionFixture.checks?.validProductionEdgeNotesDescribeClientIdentity === true
      && productionFixture.checks?.validProductionEdgeNotesDescribeEnforcementAction === true
      && productionFixture.checks?.genericEdgeNotesRejected === true
      && productionFixture.checks?.edgeNotesMissingClientIdentityRejected === true
      && productionFixture.checks?.edgeNotesMissingEnforcementActionRejected === true,
    fixtureOutputRedactsSecrets: productionFixture.checks?.validProductionWebhookTokenRedacted === true
      && productionFixture.checks?.validProductionWebhookUrlRedacted === true
      && productionFixture.checks?.validProductionEdgeEvidenceUrlRedacted === true
  };

  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) fail(`Packet check failed: ${name}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    generatedAt,
    outDir,
    filesWritten: files,
    evidence: {
      runtimeSmokePass: runtimeSmoke.status === "pass",
      productionFixturePass: productionFixture.status === "pass",
      runtimeAlertCount: Number(runtimeSmoke.alerts?.length || 0),
      productionNegativeFixtureCount: Number(productionFixture.negativeFixtures?.length || 0)
    },
    requiredEnv: packet.requiredEnv.map((item) => item.name),
    edgeRule: packet.edgeRule,
    signoffCommand: packet.signoffCommand,
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
    generatedAt,
    outDir,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
}

function buildPacketModel(runtimeSmoke, productionFixture) {
  return {
    generatedAt,
    requiredEnv: [
      ["QUANTGYM_ALERT_WEBHOOK_URL", "Externally reachable HTTPS receiver endpoint."],
      ["QUANTGYM_ALERT_WEBHOOK_TOKEN", "Random bearer token, at least 24 chars. Generate with openssl rand -base64 32."],
      ["QUANTGYM_ALERT_MIN_STATUS_CODE", "Default 500. Use 400 only if the receiver should see client errors too."],
      ["QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS", "Use 2 to 5 seconds; production gate allows 0 to 15."],
      ["QUANTGYM_RATE_LIMIT_WINDOW_SECONDS", "Suggested 60."],
      ["QUANTGYM_AUTH_RATE_LIMIT_MAX", "Suggested 30."],
      ["QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX", "Suggested 5."],
      ["QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX", "Suggested 20."],
      ["QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX", "Suggested 20."],
      ["QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX", "Suggested 20."],
      ["QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX", "Suggested 5."],
      ["QUANTGYM_TRUST_PROXY_HEADERS", "Set to 1 only behind trusted Cloudflare/Render/reverse-proxy forwarding."],
      ["QUANTGYM_TRUSTED_PROXY_CIDRS", "Comma-separated trusted proxy CIDRs, never 0.0.0.0/0."],
      ["QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED", "Set to 1 only after the edge rule is live."],
      ["QUANTGYM_EDGE_RATE_LIMIT_PROVIDER", "cloudflare, render, reverse-proxy, load-balancer, or other."],
      ["QUANTGYM_EDGE_RATE_LIMIT_NOTES", "Short description of the live edge rule."],
      ["QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL", "Externally reachable HTTPS evidence URL without credentials, query, or fragment."]
    ].map(([name, description]) => ({ name, description })),
    edgeRule: {
      provider: "cloudflare",
      expression: '(http.host in {"api.quantgym.app"} and starts_with(http.request.uri.path, "/api/auth/"))',
      characteristic: "client IP",
      windowSeconds: 60,
      threshold: "20 to 30 requests per IP per window",
      action: "managed challenge or block",
      evidenceUrlShape: "https://dash.cloudflare.com/account/rulesets/rule-id"
    },
    smokePayload: {
      service: "quantgym-api",
      eventType: "ops.readiness.smoke",
      status: "test",
      statusCode: 500,
      method: "POST",
      path: "/ops/readiness-smoke",
      message: "QuantGym alert webhook readiness smoke.",
      occurredAt: "2026-06-19T00:00:00.000Z"
    },
    runtimeSmokePass: runtimeSmoke.status === "pass",
    productionFixturePass: productionFixture.status === "pass",
    signoffCommand: "npm run check:ops-alerts:production && npm run check:ops-alerts:production -- --smoke"
  };
}

function renderOverview(packet) {
  return [
    "# QuantGym Ops Alert and Edge Rate-Limit Readiness Packet",
    "",
    "This packet turns the remaining production alert receiver and edge rate-limit blocker into a concrete deployment checklist.",
    "",
    `Generated at: ${packet.generatedAt}`,
    `Runtime smoke currently passing: ${packet.runtimeSmokePass ? "yes" : "no"}`,
    `Production fixture currently passing: ${packet.productionFixturePass ? "yes" : "no"}`,
    "",
    "## Files",
    "",
    "- `render-api-env-template.txt`: Render API environment variables to fill with real production values.",
    "- `cloudflare-rate-limit-rule.md`: Suggested edge rule shape for `/api/auth/*` bursts.",
    "- `webhook-contract.md`: Receiver contract and safe alert payload shape.",
    "- `smoke-payload.sample.json`: Non-secret sample payload for receiver setup.",
    "- `signoff-checklist.csv`: Spreadsheet-friendly handoff checklist.",
    "",
    "## Final Signoff",
    "",
    "Fill real values in the deployment provider, then run:",
    "",
    "```bash",
    packet.signoffCommand,
    "```",
    "",
    "The filled environment must not be committed. The gate intentionally rejects placeholder, local, private-network, credential-bearing, query-bearing, and incomplete evidence values.",
    ""
  ].join("\n");
}

function renderEnvTemplate(packet) {
  const lines = [
    "# QuantGym Render API production env template.",
    "# Fill these in the provider dashboard. Do not commit filled values.",
    "",
    "QUANTGYM_ALERT_WEBHOOK_URL=https://<your-alert-receiver-host>/quantgym-alerts",
    "QUANTGYM_ALERT_WEBHOOK_TOKEN=<generate-with-openssl-rand-base64-32>",
    "QUANTGYM_ALERT_MIN_STATUS_CODE=500",
    "QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS=3",
    "",
    "QUANTGYM_RATE_LIMIT_WINDOW_SECONDS=60",
    "QUANTGYM_AUTH_RATE_LIMIT_MAX=30",
    "QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX=5",
    "QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX=20",
    "QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX=20",
    "QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX=20",
    "QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX=5",
    "QUANTGYM_RATE_LIMIT_DISABLED=0",
    "",
    "# Enable forwarded IP parsing only after the app is behind a trusted proxy.",
    "QUANTGYM_TRUST_PROXY_HEADERS=1",
    "QUANTGYM_TRUSTED_PROXY_CIDRS=<cloudflare-or-platform-cidrs>",
    "",
    "# Set these only after the edge rule is live.",
    "QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1",
    `QUANTGYM_EDGE_RATE_LIMIT_PROVIDER=${packet.edgeRule.provider}`,
    "QUANTGYM_EDGE_RATE_LIMIT_NOTES=Cloudflare edge rule limits /api/auth/* bursts by client IP and applies managed challenge before Render.",
    `QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL=${packet.edgeRule.evidenceUrlShape}`,
    ""
  ];
  return lines.join("\n");
}

function renderCloudflareRule(packet) {
  return [
    "# Cloudflare Edge Rate-Limit Rule",
    "",
    "Create this as an edge-level rule before marking `QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1`.",
    "",
    `Expression: \`${packet.edgeRule.expression}\``,
    `Characteristic: ${packet.edgeRule.characteristic}`,
    `Window: ${packet.edgeRule.windowSeconds} seconds`,
    `Threshold: ${packet.edgeRule.threshold}`,
    `Action: ${packet.edgeRule.action}`,
    "",
    "## Evidence",
    "",
    "- Capture or link the dashboard rule page as an HTTPS URL.",
    "- The evidence URL must not include embedded credentials, query strings, or fragments.",
    `- Expected shape: \`${packet.edgeRule.evidenceUrlShape}\``,
    "",
    "## Local Check",
    "",
    "After provider setup, export the real environment variables and run:",
    "",
    "```bash",
    "npm run check:ops-alerts:production",
    "```",
    ""
  ].join("\n");
}

function renderWebhookContract(packet) {
  return [
    "# Alert Webhook Contract",
    "",
    "The receiver must accept HTTPS `POST` requests with JSON bodies and return a 2xx response within the configured timeout.",
    "",
    "## Authentication",
    "",
    "- QuantGym sends the configured bearer token in the `Authorization` header.",
    "- Store the token only in the receiver and Render/API secret stores.",
    "- Rotate the token by updating both sides, then rerun the smoke signoff.",
    "",
    "## Payload",
    "",
    "The API sends compact alert payloads with service, event type, status code, method, path, message, and timestamp. Request bodies, credentials, bearer tokens, synced state, community payloads, and uploaded problem payloads must not appear in alerts.",
    "",
    "```json",
    JSON.stringify(packet.smokePayload, null, 2),
    "```",
    "",
    "## Smoke",
    "",
    "After the receiver is live and the environment is set, run:",
    "",
    "```bash",
    "npm run check:ops-alerts:production -- --smoke",
    "```",
    ""
  ].join("\n");
}

function renderChecklistCsv(packet) {
  const rows = [
    ["step", "owner", "evidence", "status"],
    ["create alert receiver", "", "receiver HTTPS URL", "pending"],
    ["store webhook bearer token", "", "token generated with openssl rand -base64 32 and stored outside git", "pending"],
    ["configure Render API env", "", `${packet.requiredEnv.length} required variables set`, "pending"],
    ["configure trusted proxy CIDRs", "", "Cloudflare/Render/reverse-proxy CIDRs only, no wildcard", "pending"],
    ["create edge auth rate limit", "", "Cloudflare or reverse-proxy rule for /api/auth/* by client IP", "pending"],
    ["record edge evidence URL", "", "HTTPS dashboard/evidence URL with no credentials/query/fragment", "pending"],
    ["run production signoff", "", "npm run check:ops-alerts:production", "pending"],
    ["run production webhook smoke", "", "npm run check:ops-alerts:production -- --smoke", "pending"]
  ];
  return rows.map((row) => row.map(csvCell).join(",")).join("\n") + "\n";
}

function writePacketFile(relativePath, content) {
  const absolutePath = path.join(outDir, relativePath);
  fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
  fs.writeFileSync(absolutePath, content, "utf8");
  return path.relative(projectRoot, absolutePath);
}

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
}

function readJson(relativePath, label) {
  try {
    return JSON.parse(fs.readFileSync(path.join(projectRoot, relativePath), "utf8"));
  } catch (error) {
    fail(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function fail(message) {
  failures.push(message);
}
