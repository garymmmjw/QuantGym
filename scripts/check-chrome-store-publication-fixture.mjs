#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/339-chrome-store-publication-fixture-summary.json";
const startedAt = Date.now();
const failures = [];
const warnings = [];
const fixtureItemId = "abcdefghijklmnopabcdefghijklmnop";
const fixtureListingUrl = `https://chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}`;

try {
  const submissionResult = await runPublication([]);
  const submissionHandoff = summarizeSubmissionHandoff(submissionResult);
  validateSubmissionHandoff(submissionResult, submissionHandoff);

  const validPublishedEnv = {
    QUANTGYM_CHROME_WEB_STORE_ITEM_ID: fixtureItemId,
    QUANTGYM_CHROME_WEB_STORE_LISTING_URL: fixtureListingUrl,
    QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: fixtureListingUrl,
    QUANTGYM_CHROME_WEB_STORE_STATUS: "published",
    QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION: submissionHandoff.version,
    QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256: submissionHandoff.uploadSha256
  };
  const validPublishedResult = await runPublication(["--published"], validPublishedEnv);
  const publishedFixture = summarizePublishedFixture(validPublishedResult);
  validatePublishedFixture(validPublishedResult, publishedFixture, submissionHandoff);

  const negativeCases = [
    {
      name: "missing item id rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_ITEM_ID: "" },
      expectedError: "QUANTGYM_CHROME_WEB_STORE_ITEM_ID"
    },
    {
      name: "malformed item id rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_ITEM_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      expectedError: "Chrome extension id"
    },
    {
      name: "placeholder item id rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_ITEM_ID: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" },
      expectedError: "placeholder Chrome extension id"
    },
    {
      name: "http listing URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `http://chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "must use HTTPS"
    },
    {
      name: "listing URL embedded credentials rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://user:secret@chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "embedded credentials"
    },
    {
      name: "listing URL query rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}?utm=handoff` },
      expectedError: "query strings or fragments"
    },
    {
      name: "non-store listing URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://quantgym.app/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "Chrome Web Store listing"
    },
    {
      name: "legacy store listing URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://chrome.google.com/webstore/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "chromewebstore.google.com"
    },
    {
      name: "raw IP listing URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://8.8.8.8/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "DNS hostname"
    },
    {
      name: "non-detail listing URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://chromewebstore.google.com/search/${fixtureItemId}` },
      expectedError: "detail listing"
    },
    {
      name: "listing URL without item id rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: "https://chromewebstore.google.com/detail/quantgym-collector/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      expectedError: "must include the item id"
    },
    {
      name: "listing URL extra path rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_LISTING_URL: `https://chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}/reviews` },
      expectedError: "must end with the item id"
    },
    {
      name: "draft status rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_STATUS: "draft" },
      expectedError: "must be published"
    },
    {
      name: "submitted version mismatch rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION: "0.0.0-fixture" },
      expectedError: "must equal manifest version"
    },
    {
      name: "upload SHA mismatch rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256: "0".repeat(64) },
      expectedError: "must match the current release package"
    },
    {
      name: "placeholder evidence URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: "https://chromewebstore.google.com/detail/<item-id>" },
      expectedError: "placeholder brackets"
    },
    {
      name: "private evidence URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: "https://192.168.10.10/chrome-store-evidence" },
      expectedError: "private network address"
    },
    {
      name: "raw IP evidence URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: "https://8.8.4.4/chrome-store-evidence" },
      expectedError: "DNS hostname"
    },
    {
      name: "non-store evidence URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: "https://quantgym.app/chrome-store-evidence" },
      expectedError: "Chrome Web Store listing"
    },
    {
      name: "legacy store evidence URL rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: `https://chrome.google.com/webstore/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "chromewebstore.google.com"
    },
    {
      name: "evidence URL without item id rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: "https://chromewebstore.google.com/detail/quantgym-collector/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
      expectedError: "must include the item id"
    },
    {
      name: "evidence URL embedded credentials rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: `https://user:secret@chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}` },
      expectedError: "embedded credentials"
    },
    {
      name: "evidence URL query rejected",
      env: { QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL: `https://chromewebstore.google.com/detail/quantgym-collector/${fixtureItemId}?token=leaky` },
      expectedError: "query strings or fragments"
    }
  ];

  const negativeFixtures = [];
  for (const fixture of negativeCases) {
    const result = await runPublication(["--published"], {
      ...validPublishedEnv,
      ...fixture.env
    });
    const summary = summarizeNegativeFixture(fixture, result);
    negativeFixtures.push(summary);
    if (!summary.rejected) fail(`Negative fixture "${fixture.name}" should fail published signoff validation.`);
    if (!summary.expectedErrorObserved) {
      fail(`Negative fixture "${fixture.name}" did not mention expected error text "${fixture.expectedError}".`);
    }
  }

  const checks = {
    submissionHandoffPass: submissionHandoff.status === "pass",
    submissionHandoffManualSubmissionRequired: submissionHandoff.manualSubmissionRequired === true,
    publishedFixturePass: publishedFixture.status === "pass",
    publishedFixtureHasAllChecks: publishedFixture.passed === 3 && publishedFixture.failed === 0,
    publishedFixtureMatchesUploadSha: publishedFixture.uploadSha256 === submissionHandoff.uploadSha256,
    publishedFixtureVersionMatchesManifest: publishedFixture.submittedVersion === submissionHandoff.version,
    negativeFixturesRejected: negativeFixtures.every((fixture) => fixture.rejected),
    negativeFixturesMentionExpectedErrors: negativeFixtures.every((fixture) => fixture.expectedErrorObserved),
    placeholderItemIdRejected: findNegativeFixture(negativeFixtures, "placeholder item id rejected")?.rejected === true,
    listingUrlRawIpRejected: findNegativeFixture(negativeFixtures, "raw IP listing URL rejected")?.rejected === true,
    listingUrlEmbeddedCredentialsRejected: findNegativeFixture(negativeFixtures, "listing URL embedded credentials rejected")?.rejected === true,
    listingUrlQueryRejected: findNegativeFixture(negativeFixtures, "listing URL query rejected")?.rejected === true,
    listingUrlDetailPathRejected: findNegativeFixture(negativeFixtures, "non-detail listing URL rejected")?.rejected === true,
    listingUrlExtraPathRejected: findNegativeFixture(negativeFixtures, "listing URL extra path rejected")?.rejected === true,
    evidenceUrlNonStoreRejected: findNegativeFixture(negativeFixtures, "non-store evidence URL rejected")?.rejected === true,
    evidenceUrlWithoutItemIdRejected: findNegativeFixture(negativeFixtures, "evidence URL without item id rejected")?.rejected === true,
    evidenceUrlRawIpRejected: findNegativeFixture(negativeFixtures, "raw IP evidence URL rejected")?.rejected === true,
    listingUrlLegacyHostRejected: findNegativeFixture(negativeFixtures, "legacy store listing URL rejected")?.rejected === true,
    evidenceUrlLegacyHostRejected: findNegativeFixture(negativeFixtures, "legacy store evidence URL rejected")?.rejected === true,
    evidenceUrlEmbeddedCredentialsRejected: findNegativeFixture(negativeFixtures, "evidence URL embedded credentials rejected")?.rejected === true,
    evidenceUrlQueryRejected: findNegativeFixture(negativeFixtures, "evidence URL query rejected")?.rejected === true,
    externalPublicationStillRequired: true
  };

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    externalPublicationRequired: true,
    finalSignoffCommand: "npm run check:chrome-store-publication:published",
    submissionHandoff,
    publishedFixture,
    negativeFixtures,
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

function validateSubmissionHandoff(result, summary) {
  if (result.exitCode !== 0) fail(`Submission handoff fixture exited ${result.exitCode}: ${firstFailure(result)}`);
  if (summary.status !== "pass") fail("Submission handoff fixture did not report pass.");
  if (summary.mode !== "submission-handoff") fail(`Submission handoff fixture mode mismatch: ${summary.mode}.`);
  if (summary.published !== false) fail("Submission handoff fixture should run in unpublished mode.");
  if (summary.manualSubmissionRequired !== true) fail("Submission handoff fixture should report manual submission required.");
  if (summary.passed !== 2 || summary.failed !== 0) fail(`Submission handoff fixture expected 2 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (!/^artifacts\/browser-extension\/quantgym-collector-v\d+\.\d+\.\d+\.zip$/.test(summary.uploadOutput)) {
    fail(`Submission handoff fixture upload output is not versioned: ${summary.uploadOutput}.`);
  }
  if (!/^[0-9a-f]{64}$/i.test(summary.uploadSha256)) fail("Submission handoff fixture must report upload SHA-256.");
  if (summary.uploadBytes <= 0) fail("Submission handoff fixture upload ZIP must be non-empty.");
  if (summary.uploadFileCount < 1) fail("Submission handoff fixture upload ZIP should include packaged files.");
  if (summary.screenshots < 1) fail("Submission handoff fixture should include at least one store screenshot.");
  if (summary.reviewerNotes < 2) fail("Submission handoff fixture should include reviewer notes.");
}

function validatePublishedFixture(result, summary, submissionHandoff) {
  if (result.exitCode !== 0) fail(`Published fixture exited ${result.exitCode}: ${firstFailure(result)}`);
  if (summary.status !== "pass") fail("Published fixture did not report pass.");
  if (summary.mode !== "published-signoff") fail(`Published fixture mode mismatch: ${summary.mode}.`);
  if (summary.published !== true) fail("Published fixture should run in published mode.");
  if (summary.manualSubmissionRequired !== false) fail("Published fixture should not report manual submission required.");
  if (summary.passed !== 3 || summary.failed !== 0) fail(`Published fixture expected 3 pass / 0 fail, got ${summary.passed} / ${summary.failed}.`);
  if (summary.itemId !== fixtureItemId) fail(`Published fixture item id mismatch: ${summary.itemId}.`);
  if (summary.listingHost !== "chromewebstore.google.com") fail(`Published fixture listing host mismatch: ${summary.listingHost}.`);
  if (summary.evidenceHost !== "chromewebstore.google.com") fail(`Published fixture evidence host mismatch: ${summary.evidenceHost}.`);
  if (summary.publicationStatus !== "published") fail(`Published fixture status mismatch: ${summary.publicationStatus}.`);
  if (summary.submittedVersion !== submissionHandoff.version) fail("Published fixture submitted version should match manifest version.");
  if (summary.uploadSha256 !== submissionHandoff.uploadSha256) fail("Published fixture upload SHA-256 should match submission handoff package.");
}

async function runPublication(publicationArgs = [], envOverrides = {}) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/check-chrome-store-publication.mjs", ...publicationArgs], {
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

function summarizeSubmissionHandoff(result) {
  const parsed = result.parsed || {};
  const upload = findResult(parsed.results, "store readiness handoff")?.data || {};
  const listing = findResult(parsed.results, "submission listing handoff")?.data || {};
  return {
    status: parsed.status || "unknown",
    mode: parsed.mode || "",
    published: parsed.published === true,
    manualSubmissionRequired: parsed.manualSubmissionRequired === true,
    passed: Number(parsed.passed || 0),
    failed: Number(parsed.failed || 0),
    name: upload.name || "",
    version: upload.version || "",
    uploadOutput: upload.output || "",
    uploadSha256: String(upload.sha256 || "").toLowerCase(),
    uploadBytes: Number(upload.bytes || 0),
    uploadFileCount: Number(upload.fileCount || 0),
    listingCategory: listing.category || "",
    listingLanguage: listing.language || "",
    listingHost: safeHost(listing.homepageUrl),
    privacyPolicyHost: safeHost(listing.privacyPolicyUrl),
    supportEmailSet: Boolean(listing.supportEmail),
    screenshots: Number(listing.screenshots || 0),
    reviewerNotes: Number(listing.reviewerNotes || 0)
  };
}

function summarizePublishedFixture(result) {
  const parsed = result.parsed || {};
  const handoff = summarizeSubmissionHandoff(result);
  const publishedEvidence = findResult(parsed.results, "published Chrome Web Store evidence")?.data || {};
  return {
    ...handoff,
    itemId: publishedEvidence.itemId || "",
    listingHost: publishedEvidence.listingHost || "",
    evidenceHost: publishedEvidence.evidenceHost || "",
    publicationStatus: publishedEvidence.status || "",
    submittedVersion: publishedEvidence.submittedVersion || "",
    uploadSha256: String(publishedEvidence.uploadSha256 || "").toLowerCase()
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

function safeHost(url) {
  try {
    return new URL(String(url || "")).hostname;
  } catch {
    return "";
  }
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
