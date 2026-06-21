#!/usr/bin/env node

import fs from "node:fs";
import crypto from "node:crypto";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const extensionDir = path.join(projectRoot, "browser-extension");
const manifestPath = path.join(extensionDir, "manifest.json");
const listingPath = path.join(extensionDir, "store-listing.json");
const publishedMode = Boolean(args.published);
const env = process.env;
const results = [];

const manifest = readJson(manifestPath, "extension manifest");
const listing = readJson(listingPath, "Chrome Web Store listing");
const readiness = runChromeStoreReadiness();
const uploadZip = findResult(readiness.results, "upload zip")?.data || {};

check("store readiness handoff", () => {
  assert(readiness.status === "pass", "Chrome store readiness must pass before submission handoff.");
  assert(Number(readiness.failed || 0) === 0, "Chrome store readiness must have zero failures.");
  assert(uploadZip.output, "Chrome store readiness must report upload zip output.");
  const zipPath = path.resolve(projectRoot, uploadZip.output);
  assert(fs.existsSync(zipPath), `Upload zip is missing: ${uploadZip.output}`);
  assertSha256(uploadZip.sha256, "upload zip SHA-256");
  assert(uploadZip.sha256 === sha256File(zipPath), "Upload zip SHA-256 must match current file bytes.");
  assert(uploadZip.bytes > 0, "Upload zip must be non-empty.");
  assert(Array.isArray(uploadZip.files) && uploadZip.files.includes("manifest.json"), "Upload zip must include manifest.json.");
  assert(Array.isArray(uploadZip.hashedFiles) && uploadZip.hashedFiles.length === uploadZip.files.length, "Upload zip must hash every packaged file.");
  return {
    name: manifest.name,
    version: manifest.version,
    output: uploadZip.output,
    sha256: uploadZip.sha256,
    bytes: uploadZip.bytes,
    fileCount: uploadZip.files.length
  };
});

check("submission listing handoff", () => {
  assert(listing.name === manifest.name, "Store listing name must match manifest name.");
  assertHttpsUrl(listing.homepageUrl, "homepageUrl");
  assertHttpsUrl(listing.privacyPolicyUrl, "privacyPolicyUrl");
  assertEmail(listing.supportEmail, "supportEmail");
  assert(Array.isArray(listing.screenshots) && listing.screenshots.length >= 1, "Store listing must include at least one screenshot.");
  assert(listing.promotionalImages?.small, "Store listing must include a small promotional image.");
  assert(Array.isArray(listing.reviewNotes) && listing.reviewNotes.length >= 2, "Store listing must include reviewer notes.");
  assert(listing.dataUsage?.handlesActiveTabContent === true, "Store listing must disclose active tab content handling.");
  assert(listing.dataUsage?.sellsData === false, "Store listing must state data is not sold.");
  assert(listing.dataUsage?.usesDataForAds === false, "Store listing must state data is not used for ads.");
  return {
    category: listing.category,
    language: listing.language,
    homepageUrl: listing.homepageUrl,
    privacyPolicyUrl: listing.privacyPolicyUrl,
    supportEmail: listing.supportEmail,
    screenshots: listing.screenshots.length,
    reviewerNotes: listing.reviewNotes.length
  };
});

if (publishedMode) {
  check("published Chrome Web Store evidence", () => {
    const itemId = clean(env.QUANTGYM_CHROME_WEB_STORE_ITEM_ID);
    const listingUrl = clean(env.QUANTGYM_CHROME_WEB_STORE_LISTING_URL);
    const evidenceUrl = clean(env.QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL || listingUrl);
    const status = clean(env.QUANTGYM_CHROME_WEB_STORE_STATUS).toLowerCase();
    const submittedVersion = clean(env.QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION);
    const uploadSha256 = clean(env.QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256).toLowerCase();

    assert(itemId, "QUANTGYM_CHROME_WEB_STORE_ITEM_ID is required for published signoff.");
    assertNoPlaceholder("QUANTGYM_CHROME_WEB_STORE_ITEM_ID", itemId);
    assert(/^[a-p]{32}$/.test(itemId), "QUANTGYM_CHROME_WEB_STORE_ITEM_ID must look like a Chrome extension id.");
    assertNotPlaceholderChromeExtensionId(itemId);
    const listingParsed = assertHttpsUrl(listingUrl, "QUANTGYM_CHROME_WEB_STORE_LISTING_URL");
    assertNoPlaceholder("QUANTGYM_CHROME_WEB_STORE_LISTING_URL", listingUrl);
    assertChromeStoreListingUrl(listingParsed, itemId, "QUANTGYM_CHROME_WEB_STORE_LISTING_URL");
    const evidenceParsed = assertHttpsUrl(evidenceUrl, "QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL");
    assertNoPlaceholder("QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL", evidenceUrl);
    assertChromeStoreListingUrl(evidenceParsed, itemId, "QUANTGYM_CHROME_WEB_STORE_EVIDENCE_URL");
    assert(status === "published", "QUANTGYM_CHROME_WEB_STORE_STATUS must be published for final signoff.");
    assert(submittedVersion === manifest.version, `QUANTGYM_CHROME_WEB_STORE_SUBMITTED_VERSION must equal manifest version ${manifest.version}.`);
    assertSha256(uploadSha256, "QUANTGYM_CHROME_WEB_STORE_UPLOAD_SHA256");
    assert(uploadSha256 === String(uploadZip.sha256 || "").toLowerCase(), "Published upload SHA-256 must match the current release package.");
    return {
      itemId,
      listingHost: listingParsed.hostname,
      evidenceHost: evidenceParsed.hostname,
      status,
      submittedVersion,
      uploadSha256
    };
  });
}

const failed = results.filter((result) => result.status === "fail");
const passed = results.filter((result) => result.status === "pass");
const summary = {
  status: failed.length ? "fail" : "pass",
  mode: publishedMode ? "published-signoff" : "submission-handoff",
  published: publishedMode,
  passed: passed.length,
  failed: failed.length,
  manualSubmissionRequired: !publishedMode,
  results
};

console.log(JSON.stringify(summary, null, 2));
if (failed.length) process.exitCode = 1;

function runChromeStoreReadiness() {
  const result = spawnSync(process.execPath, [
    path.join(defaultRoot, "scripts", "check-chrome-store-readiness.mjs"),
    "--root",
    projectRoot
  ], {
    cwd: projectRoot,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (result.status !== 0) {
    return {
      status: "fail",
      failed: 1,
      results: [
        {
          name: "chrome store readiness",
          status: "fail",
          error: clean(result.stderr || result.stdout || "Chrome store readiness failed.")
        }
      ]
    };
  }
  return parseJsonOutput(result.stdout, "Chrome store readiness");
}

function check(name, fn) {
  try {
    const data = fn();
    results.push({ name, status: "pass", data });
  } catch (error) {
    results.push({ name, status: "fail", error: error.message || String(error) });
  }
}

function findResult(items, name) {
  return Array.isArray(items) ? items.find((item) => item.name === name) : null;
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function parseJsonOutput(output, label) {
  try {
    return JSON.parse(clean(output));
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}`);
  }
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertHttpsUrl(value, label) {
  let url;
  try {
    url = new URL(String(value || ""));
  } catch {
    throw new Error(`${label} must be a valid HTTPS URL.`);
  }
  assert(url.protocol === "https:", `${label} must use HTTPS.`);
  assert(!isLocalOrPrivateHost(url.hostname), `${label} must not point to localhost, loopback, or a private network address.`);
  assertDnsHostname(label, url.hostname);
  assert(!url.username && !url.password, `${label} must not include embedded credentials.`);
  assert(!url.search && !url.hash, `${label} must not include query strings or fragments.`);
  return url;
}

function assertEmail(value, label) {
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")), `${label} must be an email address.`);
}

function assertSha256(value, label) {
  assert(/^[0-9a-f]{64}$/i.test(String(value || "")), `${label} must be a SHA-256 hex digest.`);
}

function assertNoPlaceholder(name, value) {
  const text = String(value || "");
  assert(!/[<>]/.test(text), `${name} still contains placeholder brackets.`);
  assert(!/\.\.\./.test(text), `${name} still contains a placeholder ellipsis.`);
  assert(!/example|placeholder|item-id|extension-id|sha256|change-?me|todo|tbd|your[-_ ]/i.test(text), `${name} still contains a placeholder value.`);
}

function assertNotPlaceholderChromeExtensionId(itemId) {
  assert(!/^([a-p])\1{31}$/.test(itemId), "QUANTGYM_CHROME_WEB_STORE_ITEM_ID looks like a placeholder Chrome extension id.");
}

function assertDnsHostname(label, hostname) {
  const host = String(hostname || "").trim().toLowerCase().replace(/^\[|\]$/g, "");
  assert(net.isIP(host) === 0, `${label} must use a DNS hostname, not a raw IP address.`);
}

function assertChromeStoreListingUrl(url, itemId, label) {
  assert(
    url.hostname === "chromewebstore.google.com",
    `${label} must point to the current chromewebstore.google.com Chrome Web Store listing host.`
  );
  const segments = url.pathname.split("/").map(clean).filter(Boolean);
  const detailIndex = segments.indexOf("detail");
  assert(detailIndex >= 0, `${label} must point to a Chrome Web Store detail listing.`);
  assert(segments.slice(detailIndex + 1).includes(itemId), `${label} must include the item id.`);
  assert(segments.at(-1) === itemId, `${label} must end with the item id.`);
  assert(
    detailIndex === 0 && segments.length === 3 && segments[1] && segments[2] === itemId,
    `${label} must use a Chrome Web Store detail path of /detail/<extension-slug>/<item id>.`
  );
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function clean(value) {
  return String(value || "").trim();
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

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (value === "--published") {
      parsed.published = true;
    }
  }
  return parsed;
}
