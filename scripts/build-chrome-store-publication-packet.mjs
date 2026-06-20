#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const outDir = path.resolve(projectRoot, getArgValue("--out-dir") || "artifacts/chrome-store-publication/readiness-packet");
const summaryPath = path.resolve(projectRoot, getArgValue("--summary") || "docs/browser-audit-screenshots/348-chrome-store-publication-packet-summary.json");
const generatedAt = new Date().toISOString();
const failures = [];
const warnings = [];

const expectedFiles = [
  "README.md",
  "developer-dashboard-submission.md",
  "listing-fields.md",
  "published-signoff-env-template.txt",
  "release-package-evidence.json",
  "signoff-checklist.csv"
];

try {
  const manifest = readJson("browser-extension/manifest.json", "Chrome extension manifest");
  const listing = readJson("browser-extension/store-listing.json", "Chrome Web Store listing");
  const publicationFixture = readJson("docs/browser-audit-screenshots/339-chrome-store-publication-fixture-summary.json", "Chrome store publication fixture");
  const handoff = publicationFixture.submissionHandoff || {};
  const releasePackagePath = path.resolve(projectRoot, handoff.uploadOutput || "");

  if (publicationFixture.status !== "pass") warnings.push("Chrome store publication fixture is not currently passing.");
  if (!fs.existsSync(releasePackagePath)) fail(`Release package is missing: ${handoff.uploadOutput || "(none)"}`);
  if (fs.existsSync(releasePackagePath) && sha256File(releasePackagePath) !== handoff.uploadSha256) {
    fail("Release package SHA-256 does not match the publication fixture summary.");
  }

  const packet = buildPacketModel({ manifest, listing, publicationFixture, handoff, releasePackagePath });
  const files = [
    writePacketFile("README.md", renderOverview(packet)),
    writePacketFile("developer-dashboard-submission.md", renderDeveloperDashboardSubmission(packet)),
    writePacketFile("listing-fields.md", renderListingFields(packet)),
    writePacketFile("published-signoff-env-template.txt", renderPublishedSignoffEnv(packet)),
    writePacketFile("release-package-evidence.json", `${JSON.stringify(packet.releasePackageEvidence, null, 2)}\n`),
    writePacketFile("signoff-checklist.csv", renderChecklistCsv(packet))
  ];

  const combinedContent = files
    .map((file) => fs.readFileSync(path.join(projectRoot, file), "utf8"))
    .join("\n");
  const checks = {
    expectedFilesWritten: expectedFiles.every((file) => files.includes(path.relative(projectRoot, path.join(outDir, file)))),
    includesDeveloperDashboardChecklist: combinedContent.includes("Developer Dashboard Submission")
      && /upload package/i.test(combinedContent),
    includesReleasePackageSha: combinedContent.includes(packet.releasePackageEvidence.uploadSha256),
    includesPublishedSignoffEnvTemplate: combinedContent.includes("QUANTGYM_CHROME_WEB_STORE_ITEM_ID")
      && combinedContent.includes("QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256"),
    includesEvidenceUrlStoreDetailRequirement: combinedContent.includes("same Chrome Web Store detail URL")
      && combinedContent.includes("same item id"),
    includesRawIpUrlRule: combinedContent.includes("DNS hostname")
      && combinedContent.includes("raw IP address"),
    includesListingSnapshot: combinedContent.includes("Store Listing Fields")
      && combinedContent.includes(packet.manifest.name)
      && combinedContent.includes(packet.listing.shortDescription),
    includesFinalSignoffChecklist: combinedContent.includes("run published signoff")
      && combinedContent.includes("npm run check:chrome-store-publication:published"),
    usesPlaceholdersForPublishedIds: combinedContent.includes("<real-chrome-extension-id>")
      && !combinedContent.includes("abcdefghijklmnopabcdefghijklmnop"),
    releasePackageExists: fs.existsSync(releasePackagePath),
    releasePackageShaMatches: fs.existsSync(releasePackagePath)
      && sha256File(releasePackagePath) === packet.releasePackageEvidence.uploadSha256,
    publicationFixturePass: publicationFixture.status === "pass",
    submissionHandoffPass: publicationFixture.checks?.submissionHandoffPass === true,
    publishedFixturePass: publicationFixture.checks?.publishedFixturePass === true,
    negativeFixturesRejected: publicationFixture.checks?.negativeFixturesRejected === true,
    publishedEvidenceUrlBoundToStoreListing: publicationFixture.checks?.evidenceUrlNonStoreRejected === true
      && publicationFixture.checks?.evidenceUrlWithoutItemIdRejected === true,
    publishedUrlsRejectRawIp: publicationFixture.checks?.listingUrlRawIpRejected === true
      && publicationFixture.checks?.evidenceUrlRawIpRejected === true,
    finalSignoffCommandRecorded: publicationFixture.finalSignoffCommand === "npm run check:chrome-store-publication:published",
    externalPublicationStillRequired: publicationFixture.checks?.externalPublicationStillRequired === true
  };

  for (const [name, value] of Object.entries(checks)) {
    if (value !== true) fail(`Packet check failed: ${name}`);
  }

  const summary = {
    status: failures.length ? "fail" : "pass",
    generatedAt,
    outDir,
    filesWritten: files,
    releasePackage: packet.releasePackageEvidence,
    listing: {
      name: packet.manifest.name,
      version: packet.manifest.version,
      category: packet.listing.category,
      language: packet.listing.language,
      screenshots: packet.listing.screenshots.length,
      reviewerNotes: packet.listing.reviewNotes.length
    },
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

function buildPacketModel({ manifest, listing, publicationFixture, handoff, releasePackagePath }) {
  return {
    generatedAt,
    manifest,
    listing: {
      ...listing,
      screenshots: Array.isArray(listing.screenshots) ? listing.screenshots : [],
      reviewNotes: Array.isArray(listing.reviewNotes) ? listing.reviewNotes : []
    },
    releasePackageEvidence: {
      name: handoff.name || manifest.name,
      version: handoff.version || manifest.version,
      uploadOutput: handoff.uploadOutput || path.relative(projectRoot, releasePackagePath),
      uploadSha256: String(handoff.uploadSha256 || "").toLowerCase(),
      uploadBytes: Number(handoff.uploadBytes || (fs.existsSync(releasePackagePath) ? fs.statSync(releasePackagePath).size : 0)),
      uploadFileCount: Number(handoff.uploadFileCount || 0),
      generatedBy: "scripts/check-chrome-store-publication.mjs"
    },
    fixture: publicationFixture,
    signoffCommand: "npm run check:chrome-store-publication:published"
  };
}

function renderOverview(packet) {
  return [
    "# QuantGym Chrome Web Store Publication Packet",
    "",
    "This packet turns the Chrome Web Store publication blocker into a concrete developer-dashboard handoff. It does not mean the extension is already published.",
    "",
    `Generated at: ${packet.generatedAt}`,
    `Extension: ${packet.manifest.name}`,
    `Version: ${packet.manifest.version}`,
    `Release package: ${packet.releasePackageEvidence.uploadOutput}`,
    `Release package SHA-256: ${packet.releasePackageEvidence.uploadSha256}`,
    "",
    "## Files",
    "",
    "- `developer-dashboard-submission.md`: upload and review steps for the Chrome Web Store developer dashboard.",
    "- `listing-fields.md`: store listing fields copied from `browser-extension/store-listing.json`.",
    "- `published-signoff-env-template.txt`: environment variables to fill after publication.",
    "- `release-package-evidence.json`: package path, SHA-256, version, and byte count.",
    "- `signoff-checklist.csv`: spreadsheet-friendly handoff checklist.",
    "",
    "## Final Signoff",
    "",
    "After the developer dashboard shows the item as published, fill real values and run:",
    "",
    "```bash",
    packet.signoffCommand,
    "```",
    "",
    "The published signoff rejects placeholder item ids, draft status, mismatched versions or package hashes, non-store listing/evidence URLs, evidence URLs for a different item id, raw-IP listing/evidence URLs, and private or credential/query-bearing evidence URLs. Listing and evidence URLs must use HTTPS DNS hostnames.",
    ""
  ].join("\n");
}

function renderDeveloperDashboardSubmission(packet) {
  return [
    "# Developer Dashboard Submission",
    "",
    "Use the Chrome Web Store developer account to submit this release package.",
    "",
    "## Upload Package",
    "",
    `- Package: \`${packet.releasePackageEvidence.uploadOutput}\``,
    `- Version: \`${packet.releasePackageEvidence.version}\``,
    `- SHA-256: \`${packet.releasePackageEvidence.uploadSha256}\``,
    `- Bytes: \`${packet.releasePackageEvidence.uploadBytes}\``,
    "",
    "## Store Listing",
    "",
    `- Name: ${packet.manifest.name}`,
    `- Category: ${packet.listing.category}`,
    `- Language: ${packet.listing.language}`,
    `- Homepage URL: ${packet.listing.homepageUrl}`,
    `- Privacy Policy URL: ${packet.listing.privacyPolicyUrl}`,
    `- Support email set: ${Boolean(packet.listing.supportEmail) ? "yes" : "no"}`,
    "",
    "## Review Notes",
    "",
    ...packet.listing.reviewNotes.map((note) => `- ${note}`),
    "",
    "## After Approval",
    "",
    "Record the real item id, Chrome Web Store detail listing URL, published status, submitted version, upload SHA-256, and evidence URL in the signoff environment template. The listing and evidence URLs must use HTTPS DNS hostnames, not raw IP addresses. The evidence URL must be the same Chrome Web Store detail URL, or another Chrome Web Store detail URL ending in the same item id.",
    ""
  ].join("\n");
}

function renderListingFields(packet) {
  return [
    "# Store Listing Fields",
    "",
    `Name: ${packet.listing.name}`,
    `Short description: ${packet.listing.shortDescription}`,
    "",
    "## Detailed Description",
    "",
    packet.listing.detailedDescription,
    "",
    "## Permission Justifications",
    "",
    ...Object.entries(packet.listing.permissionJustifications || {}).map(([permission, justification]) => `- ${permission}: ${justification}`),
    "",
    "## Data Usage",
    "",
    ...Object.entries(packet.listing.dataUsage || {}).map(([key, value]) => `- ${key}: ${value}`),
    "",
    "## Assets",
    "",
    ...packet.listing.screenshots.map((screenshot) => `- Screenshot: ${screenshot}`),
    `- Small promo: ${packet.listing.promotionalImages?.small || ""}`,
    `- Marquee promo: ${packet.listing.promotionalImages?.marquee || ""}`,
    ""
  ].join("\n");
}

function renderPublishedSignoffEnv(packet) {
  return [
    "# Chrome Web Store published signoff env template.",
    "# Fill these only after the developer dashboard shows the item as published.",
    "# The listing and evidence URLs must both be Chrome Web Store detail URLs for the same item id.",
    "# They must use HTTPS DNS hostnames, not raw IP addresses.",
    "",
    "QUANTGYM_CHROME_WEB_STORE_ITEM_ID=<real-chrome-extension-id>",
    "QUANTGYM_CHROME_WEB_STORE_LISTING_URL=https://chromewebstore.google.com/detail/quantgym-collector/<real-chrome-extension-id>",
    "QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL=https://chromewebstore.google.com/detail/quantgym-collector/<real-chrome-extension-id>",
    "QUANTGYM_CHROME_WEB_STORE_STATUS=published",
    `QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION=${packet.manifest.version}`,
    `QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256=${packet.releasePackageEvidence.uploadSha256}`,
    "",
    "# Then run:",
    "npm run check:chrome-store-publication:published",
    ""
  ].join("\n");
}

function renderChecklistCsv(packet) {
  const rows = [
    ["step", "owner", "evidence", "status"],
    ["run extension runtime smoke", "", "npm run check:browser-extension:runtime-smoke", "pending"],
    ["run store readiness", "", "npm run check:chrome-store-readiness", "pending"],
    ["upload release package", "", packet.releasePackageEvidence.uploadOutput, "pending"],
    ["verify upload sha", "", packet.releasePackageEvidence.uploadSha256, "pending"],
    ["submit for review", "", "Chrome Web Store developer dashboard submission id or screenshot", "pending"],
    ["wait for published status", "", "dashboard shows published", "pending"],
    ["record listing evidence", "", "Chrome Web Store detail URL with DNS hostname, no raw IP, no query or credentials, and the same item id", "pending"],
    ["run published signoff", "", "npm run check:chrome-store-publication:published", "pending"]
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

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
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
