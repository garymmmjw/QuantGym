#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/media-storage/readiness-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/347-media-storage-packet-summary.json");
const generatedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const expectedFiles = [
  "README.md",
  "render-api-env-template.txt",
  "r2-bucket-cdn-runbook.md",
  "object-storage-contract.md",
  "live-smoke-checklist.csv"
];

try {
  const runtimeSmoke = readJson("docs/browser-audit-screenshots/329-media-storage-runtime-smoke-summary.json", "media storage runtime smoke");
  const productionFixture = readJson("docs/browser-audit-screenshots/337-media-storage-production-fixture-summary.json", "media storage production fixture");
  if (runtimeSmoke.status !== "pass") warnings.push("Media storage runtime smoke is not currently passing.");
  if (productionFixture.status !== "pass") warnings.push("Media storage production fixture is not currently passing.");

  const packet = buildPacketModel(runtimeSmoke, productionFixture);
  const files = [
    writePacketFile("README.md", renderOverview(packet)),
    writePacketFile("render-api-env-template.txt", renderEnvTemplate(packet)),
    writePacketFile("r2-bucket-cdn-runbook.md", renderBucketCdnRunbook(packet)),
    writePacketFile("object-storage-contract.md", renderObjectStorageContract(packet)),
    writePacketFile("live-smoke-checklist.csv", renderChecklistCsv(packet))
  ];

  const combinedContent = files
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");
  const checks = {
    expectedFilesWritten: expectedFiles.every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
    includesProductionEnvTemplate: combinedContent.includes("QUANTGYM_MEDIA_STORAGE")
      && combinedContent.includes("QUANTGYM_MEDIA_PUBLIC_BASE_URL"),
    includesBucketCdnRunbook: combinedContent.includes("R2 or S3 Bucket and CDN Runbook")
      && combinedContent.includes("readiness-smoke/"),
    includesObjectStorageContract: combinedContent.includes("Object Storage Contract")
      && combinedContent.includes("signed PUT"),
    includesLiveSmokeChecklist: combinedContent.includes("run live media signoff")
      && combinedContent.includes("npm run check:media-storage:production -- --live"),
    usesPlaceholderOnlyForSecrets: combinedContent.includes("<object-storage-access-key-id>")
      && combinedContent.includes("<object-storage-secret-access-key>")
      && !combinedContent.includes("QG_MEDIA_")
      && !combinedContent.includes("qgmediafixture")
      && !combinedContent.includes("qg-media-live-fixture-secret"),
    noCredentialUrlExamples: !/https:\/\/[^/\s"']+:[^@\s"']+@/i.test(combinedContent),
    runtimeSmokePass: runtimeSmoke.status === "pass",
    productionFixturePass: productionFixture.status === "pass",
    fixtureRejectsUnsafeInputs: productionFixture.checks?.negativeFixturesRejected === true
      && productionFixture.checks?.endpointEmbeddedCredentialsRejected === true
      && productionFixture.checks?.publicBaseQueryRejected === true,
    fixtureOutputRedactsSecrets: productionFixture.checks?.validProductionAccessKeyRedacted === true
      && productionFixture.checks?.validProductionSecretRedacted === true
      && productionFixture.checks?.validProductionEndpointUrlRedacted === true
      && productionFixture.checks?.validProductionPublicBaseUrlRedacted === true,
    liveFixtureCoversPutGetPublicDelete: productionFixture.checks?.liveFixturePutGetPublicDelete === true,
    liveFixtureCleansUp: productionFixture.checks?.liveFailureCleanedUp === true
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
      productionNegativeFixtureCount: Number(productionFixture.negativeFixtures?.length || 0),
      liveFixtureStatus: productionFixture.liveFixture?.status || "",
      liveFailureRejected: productionFixture.livePublicFailureFixture?.rejected === true
    },
    requiredEnv: packet.requiredEnv.map((item) => item.name),
    storagePlan: packet.storagePlan,
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
      ["QUANTGYM_MEDIA_STORAGE", "Use r2, s3, object, or object-storage for production."],
      ["QUANTGYM_MEDIA_MAX_BYTES", "Maximum raw upload bytes. Suggested 5242880."],
      ["QUANTGYM_MAX_BODY_BYTES", "JSON request body ceiling after base64 expansion. Suggested 10485760 or larger."],
      ["QUANTGYM_MEDIA_S3_ENDPOINT", "Externally reachable HTTPS S3-compatible endpoint."],
      ["QUANTGYM_MEDIA_S3_BUCKET", "DNS-safe lowercase production bucket name."],
      ["QUANTGYM_MEDIA_S3_REGION", "S3 region or auto for Cloudflare R2."],
      ["QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", "Object storage access key id."],
      ["QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", "Object storage secret access key, at least 24 characters."],
      ["QUANTGYM_MEDIA_S3_PREFIX", "Safe object prefix, suggested media."],
      ["QUANTGYM_MEDIA_PUBLIC_BASE_URL", "CDN/custom public HTTPS base URL, not the raw object endpoint."],
      ["QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS", "Use 5 to 10 seconds; production gate allows 0 to 60."]
    ].map(([name, description]) => ({ name, description })),
    storagePlan: {
      provider: "cloudflare-r2-or-s3",
      bucketNameShape: "quantgym-media-production",
      prefix: "media",
      publicBaseUrlShape: "https://media.quantgym.app",
      liveSmokePrefix: "readiness-smoke/",
      requiredOperations: ["signed PUT", "signed GET", "public CDN GET", "signed DELETE"]
    },
    runtimeSmokePass: runtimeSmoke.status === "pass",
    productionFixturePass: productionFixture.status === "pass",
    liveFixturePutGetPublicDelete: productionFixture.checks?.liveFixturePutGetPublicDelete === true,
    signoffCommand: "npm run check:media-storage:production && npm run check:media-storage:production -- --live"
  };
}

function renderOverview(packet) {
  return [
    "# QuantGym Media Storage Readiness Packet",
    "",
    "This packet turns the production S3/R2 media bucket and CDN blocker into a concrete deployment checklist.",
    "",
    `Generated at: ${packet.generatedAt}`,
    `Runtime smoke currently passing: ${packet.runtimeSmokePass ? "yes" : "no"}`,
    `Production fixture currently passing: ${packet.productionFixturePass ? "yes" : "no"}`,
    `Live fixture covers PUT/GET/public GET/DELETE: ${packet.liveFixturePutGetPublicDelete ? "yes" : "no"}`,
    "",
    "## Files",
    "",
    "- `render-api-env-template.txt`: Render API environment variables to fill with real production values.",
    "- `r2-bucket-cdn-runbook.md`: Bucket, prefix, and CDN/public base URL setup notes.",
    "- `object-storage-contract.md`: Required object storage behavior and safety boundaries.",
    "- `live-smoke-checklist.csv`: Spreadsheet-friendly handoff checklist.",
    "",
    "## Final Signoff",
    "",
    "Fill real values in the deployment provider, then run:",
    "",
    "```bash",
    packet.signoffCommand,
    "```",
    "",
    "The filled environment must not be committed. The gate intentionally rejects local, private-network, credential-bearing, query-bearing, placeholder, and raw-endpoint public media URL values.",
    ""
  ].join("\n");
}

function renderEnvTemplate(packet) {
  return [
    "# QuantGym Render API production media env template.",
    "# Fill these in the provider dashboard. Do not commit filled values.",
    "",
    "QUANTGYM_MEDIA_STORAGE=r2",
    "QUANTGYM_MEDIA_MAX_BYTES=5242880",
    "QUANTGYM_MAX_BODY_BYTES=10485760",
    "QUANTGYM_MEDIA_S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com",
    `QUANTGYM_MEDIA_S3_BUCKET=${packet.storagePlan.bucketNameShape}`,
    "QUANTGYM_MEDIA_S3_REGION=auto",
    "QUANTGYM_MEDIA_S3_ACCESS_KEY_ID=<object-storage-access-key-id>",
    "QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY=<object-storage-secret-access-key>",
    `QUANTGYM_MEDIA_S3_PREFIX=${packet.storagePlan.prefix}`,
    `QUANTGYM_MEDIA_PUBLIC_BASE_URL=${packet.storagePlan.publicBaseUrlShape}`,
    "QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS=5",
    ""
  ].join("\n");
}

function renderBucketCdnRunbook(packet) {
  return [
    "# R2 or S3 Bucket and CDN Runbook",
    "",
    "Create a production object bucket and expose objects through a CDN or custom public media host.",
    "",
    "## Bucket",
    "",
    `- Bucket name shape: \`${packet.storagePlan.bucketNameShape}\``,
    `- Object prefix: \`${packet.storagePlan.prefix}\``,
    "- Bucket name must be lowercase DNS-safe and must not look like an IP address.",
    "- Prefix must not include empty path segments, `..`, backslashes, query markers, fragments, or control characters.",
    "",
    "## Public Media Host",
    "",
    `- Public base URL shape: \`${packet.storagePlan.publicBaseUrlShape}\``,
    "- The public base URL must be HTTPS.",
    "- The public base URL must be a CDN/custom origin, not the raw object storage endpoint.",
    "- Do not include embedded credentials, query strings, or fragments.",
    "",
    "## Live Smoke",
    "",
    `The live signoff writes one tiny object under \`${packet.storagePlan.liveSmokePrefix}\`, reads it through signed storage, reads it through the public media URL, and deletes it.`,
    "",
    "```bash",
    "npm run check:media-storage:production -- --live",
    "```",
    ""
  ].join("\n");
}

function renderObjectStorageContract(packet) {
  return [
    "# Object Storage Contract",
    "",
    "Production media storage must support the operations below with the configured S3-compatible credentials:",
    "",
    ...packet.storagePlan.requiredOperations.map((operation) => `- ${operation}`),
    "",
    "Uploads from the API use authenticated object-storage writes. Public rendering uses the configured CDN/custom public media base URL. Local disk storage remains acceptable for local development and small controlled beta runs, but it intentionally fails the production gate.",
    "",
    "## Safety Boundaries",
    "",
    "- Object endpoint and public base URL must use HTTPS.",
    "- Object endpoint and public base URL must not point to localhost, loopback, or private-network hosts.",
    "- Object endpoint and public base URL must not include embedded credentials, query strings, or fragments.",
    "- Access key and secret must be stored only in provider secret storage.",
    "- Live-smoke failure should still delete any object that was written.",
    ""
  ].join("\n");
}

function renderChecklistCsv(packet) {
  const rows = [
    ["step", "owner", "evidence", "status"],
    ["create production object bucket", "", "bucket name and region recorded", "pending"],
    ["create object credentials", "", "access key id and secret stored outside git", "pending"],
    ["configure CDN or custom public media host", "", "HTTPS public base URL not equal to raw object endpoint", "pending"],
    ["configure Render API env", "", `${packet.requiredEnv.length} required media variables set`, "pending"],
    ["run production media config gate", "", "npm run check:media-storage:production", "pending"],
    ["run live media signoff", "", "npm run check:media-storage:production -- --live", "pending"],
    ["confirm readiness object cleanup", "", "live smoke reports cleanedUp true", "pending"]
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
