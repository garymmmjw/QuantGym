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
const skipPackage = Boolean(args.skipPackage);
const skipExtensionCheck = Boolean(args.skipExtensionCheck);

const requiredPackageFiles = [
  "manifest.json",
  "popup.html",
  "popup.css",
  "popup.js",
  "README.md",
  "icons/icon16.png",
  "icons/icon32.png",
  "icons/icon48.png",
  "icons/icon128.png"
];

const results = [];
const warnings = [];

const manifest = readJson(manifestPath, "extension manifest");
const listing = readJson(listingPath, "Chrome Web Store listing");

check("browser extension gate", () => {
  if (skipExtensionCheck) return { skipped: true };
  const gate = spawnSync(process.execPath, [
    path.join(defaultRoot, "scripts", "check-browser-extension.mjs"),
    "--root",
    projectRoot
  ], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert(gate.status === 0, clean(gate.stderr || gate.stdout || "browser extension gate failed"));
  return parseJsonOutput(gate.stdout, "browser extension gate");
});

check("manifest store metadata", () => {
  assertNonEmpty(manifest.name, "manifest.name");
  assertNonEmpty(manifest.version, "manifest.version");
  assertNonEmpty(manifest.description, "manifest.description");
  assert(String(manifest.description).length <= 132, "manifest.description must be no more than 132 characters.");
  assert(manifest.icons?.["128"] === "icons/icon128.png", "manifest.icons.128 must point to icons/icon128.png.");
  assertPngDimensions(path.join(extensionDir, "icons/icon128.png"), [[128, 128]], "store icon");
  return {
    name: manifest.name,
    version: manifest.version,
    descriptionLength: String(manifest.description).length,
    storeIcon: manifest.icons["128"]
  };
});

check("store listing metadata", () => {
  assert(listing.name === manifest.name, "store listing name must match manifest.name.");
  assertNonEmpty(listing.shortDescription, "shortDescription");
  assert(String(listing.shortDescription).length <= 132, "shortDescription must be no more than 132 characters.");
  assertNonEmpty(listing.detailedDescription, "detailedDescription");
  assert(String(listing.detailedDescription).length >= 160, "detailedDescription should explain the extension clearly.");
  assertNonEmpty(listing.category, "category");
  assert(/^[a-z]{2}(?:-[A-Z]{2})?$/.test(String(listing.language || "")), "language must look like en or en-US.");
  assertHttpsUrl(listing.homepageUrl, "homepageUrl");
  if (listing.supportUrl) assertHttpsUrl(listing.supportUrl, "supportUrl");
  assertEmail(listing.supportEmail, "supportEmail");
  assertNonEmpty(listing.privacyPolicyUrl, "privacyPolicyUrl");
  assertHttpsUrl(listing.privacyPolicyUrl, "privacyPolicyUrl");
  assertNonEmpty(listing.singlePurpose, "singlePurpose");
  assert(/capture|problem|quantgym/i.test(listing.singlePurpose), "singlePurpose must describe the QuantGym capture flow.");

  const permissions = Array.isArray(manifest.permissions) ? manifest.permissions : [];
  for (const permission of permissions) {
    assertNonEmpty(listing.permissionJustifications?.[permission], `permissionJustifications.${permission}`);
  }
  const extraJustifications = Object.keys(listing.permissionJustifications || {}).filter((permission) => !permissions.includes(permission));
  assert(extraJustifications.length === 0, `permissionJustifications contains permissions not in manifest: ${extraJustifications.join(", ")}`);

  for (const key of ["collectsPersonalData", "handlesActiveTabContent", "sellsData", "usesDataForAds", "backgroundCollection", "remoteCode"]) {
    assert(typeof listing.dataUsage?.[key] === "boolean", `dataUsage.${key} must be a boolean.`);
  }
  assert(listing.dataUsage.handlesActiveTabContent === true, "dataUsage must disclose active-tab content handling.");
  assert(listing.dataUsage.sellsData === false, "dataUsage.sellsData must remain false.");
  assert(listing.dataUsage.usesDataForAds === false, "dataUsage.usesDataForAds must remain false.");
  assert(listing.dataUsage.backgroundCollection === false, "dataUsage.backgroundCollection must remain false.");
  assert(listing.dataUsage.remoteCode === false, "dataUsage.remoteCode must remain false.");
  assert(Array.isArray(listing.reviewNotes) && listing.reviewNotes.length >= 2, "reviewNotes must include reviewer-facing notes.");
  return {
    shortDescriptionLength: String(listing.shortDescription).length,
    detailedDescriptionLength: String(listing.detailedDescription).length,
    category: listing.category,
    language: listing.language,
    permissionJustifications: permissions.length
  };
});

check("privacy disclosures", () => {
  const privacyDoc = readText(resolveProjectPathFromExtension(listing.privacyPolicyPath), "privacy policy markdown");
  const privacyPage = readText(resolveProjectPathFromExtension(listing.privacyPolicyPagePath), "public privacy policy page");
  for (const [label, text] of [["markdown", privacyDoc], ["public page", privacyPage]]) {
    assertTextIncludes(text, "single purpose", `${label} privacy policy`);
    assertTextIncludes(text, "activeTab", `${label} privacy policy`);
    assertTextIncludes(text, "scripting", `${label} privacy policy`);
    assertTextIncludes(text, "storage", `${label} privacy policy`);
    assertTextIncludes(text, "does not sell", `${label} privacy policy`);
    assertTextIncludes(text, "ads", `${label} privacy policy`);
    assertTextIncludes(text, "background collection", `${label} privacy policy`);
    assertTextIncludes(text, "remote", `${label} privacy policy`);
    assertTextIncludes(text, "clipboard", `${label} privacy policy`);
  }
  return {
    markdown: path.relative(projectRoot, resolveProjectPathFromExtension(listing.privacyPolicyPath)),
    publicPage: path.relative(projectRoot, resolveProjectPathFromExtension(listing.privacyPolicyPagePath)),
    privacyPolicyUrl: listing.privacyPolicyUrl
  };
});

check("store image assets", () => {
  assert(Array.isArray(listing.screenshots) && listing.screenshots.length >= 1, "At least one screenshot is required.");
  assert(listing.screenshots.length <= 5, "Chrome Web Store supports up to 5 screenshots.");
  const screenshots = listing.screenshots.map((relativePath) => {
    const filePath = resolveExtensionPath(relativePath);
    const dimensions = assertPngDimensions(filePath, [[1280, 800], [640, 400]], "store screenshot");
    return { file: path.relative(projectRoot, filePath), ...dimensions };
  });
  const smallPromoPath = resolveExtensionPath(listing.promotionalImages?.small);
  const smallPromo = assertPngDimensions(smallPromoPath, [[440, 280]], "small promotional image");
  let marqueePromo = null;
  if (listing.promotionalImages?.marquee) {
    const marqueePath = resolveExtensionPath(listing.promotionalImages.marquee);
    marqueePromo = {
      file: path.relative(projectRoot, marqueePath),
      ...assertPngDimensions(marqueePath, [[1400, 560]], "marquee promotional image")
    };
  } else {
    warnings.push({
      type: "marquee-promo-missing",
      message: "No marquee promotional image is configured. It is optional, but useful for store featuring."
    });
  }
  return {
    screenshots,
    smallPromo: {
      file: path.relative(projectRoot, smallPromoPath),
      ...smallPromo
    },
    marqueePromo
  };
});

check("upload zip", () => {
  if (skipPackage) return { skipped: true };
  const packageResult = runPackage();
  const repeatPackageResult = runPackage();
  assert(packageResult.output === repeatPackageResult.output, "repeated package output path must be stable.");
  assert(packageResult.sha256 === repeatPackageResult.sha256, "repeated package SHA-256 must be deterministic.");
  assert(packageResult.bytes === repeatPackageResult.bytes, "repeated package byte size must be deterministic.");
  const zipPath = path.resolve(projectRoot, packageResult.output || "");
  assert(fs.existsSync(zipPath), `package zip is missing: ${packageResult.output}`);
  assertSha256(packageResult.sha256, "upload zip sha256");
  assert(packageResult.sha256 === sha256File(zipPath), "upload zip sha256 must match the generated zip.");
  const entries = zipEntries(zipPath);
  assertSameList(entries, requiredPackageFiles, "upload zip entries");
  assert(!entries.some((entry) => entry.startsWith("store-assets/") || entry === "store-listing.json"), "upload zip must not include store-listing assets.");
  for (const entry of entries) {
    const sourcePath = path.join(extensionDir, entry);
    const expectedHash = sha256File(sourcePath);
    const packageHash = packageResult.fileHashes?.[entry];
    assertSha256(packageHash, `package file hash for ${entry}`);
    assert(packageHash === expectedHash, `package file hash for ${entry} must match source file.`);
    assert(sha256ZipEntry(zipPath, entry) === expectedHash, `zip entry ${entry} must match source file bytes.`);
  }
  return {
    output: path.relative(projectRoot, zipPath),
    sha256: packageResult.sha256,
    bytes: fs.statSync(zipPath).size,
    deterministic: true,
    deterministicTimestamp: packageResult.deterministicTimestamp || "",
    files: entries,
    hashedFiles: Object.keys(packageResult.fileHashes || {}).sort()
  };
});

const failed = results.filter((result) => result.status === "fail");
const passed = results.filter((result) => result.status === "pass");
console.log(JSON.stringify({
  status: failed.length ? "fail" : "pass",
  passed: passed.length,
  failed: failed.length,
  warnings,
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

function runPackage() {
  const packaged = spawnSync(process.execPath, [
    path.join(defaultRoot, "scripts", "package-browser-extension.mjs"),
    "--root",
    projectRoot
  ], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert(packaged.status === 0, clean(packaged.stderr || packaged.stdout || "browser extension packaging failed"));
  return parseJsonOutput(packaged.stdout, "browser extension package");
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} is not valid JSON: ${error.message}`);
  }
}

function readText(filePath, label) {
  assert(fs.existsSync(filePath), `${label} is missing: ${path.relative(projectRoot, filePath)}`);
  return fs.readFileSync(filePath, "utf8");
}

function resolveExtensionPath(relativePath) {
  assertNonEmpty(relativePath, "store asset path");
  const resolved = path.resolve(extensionDir, relativePath);
  assert(resolved.startsWith(extensionDir + path.sep), `store asset must stay under browser-extension: ${relativePath}`);
  assert(fs.existsSync(resolved), `store asset is missing: ${path.relative(projectRoot, resolved)}`);
  return resolved;
}

function resolveProjectPathFromExtension(relativePath) {
  assertNonEmpty(relativePath, "project-relative path");
  const resolved = path.resolve(extensionDir, relativePath);
  assert(resolved.startsWith(projectRoot + path.sep), `path escapes project root: ${relativePath}`);
  return resolved;
}

function assertPngDimensions(filePath, allowedDimensions, label) {
  assert(fs.existsSync(filePath), `${label} is missing: ${path.relative(projectRoot, filePath)}`);
  const buffer = fs.readFileSync(filePath);
  assert(buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a", `${label} must be a PNG: ${path.relative(projectRoot, filePath)}`);
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const allowed = allowedDimensions.some(([allowedWidth, allowedHeight]) => width === allowedWidth && height === allowedHeight);
  assert(allowed, `${label} has invalid dimensions ${width}x${height}: ${path.relative(projectRoot, filePath)}`);
  return { width, height };
}

function zipEntries(zipPath) {
  const unzipped = spawnSync("unzip", ["-Z1", zipPath], {
    cwd: projectRoot,
    encoding: "utf8"
  });
  assert(unzipped.status === 0, clean(unzipped.stderr || unzipped.stdout || "could not inspect zip entries"));
  return unzipped.stdout.split(/\r?\n/).map(clean).filter(Boolean).sort();
}

function sha256ZipEntry(zipPath, entry) {
  const unzipped = spawnSync("unzip", ["-p", zipPath, entry], {
    cwd: projectRoot,
    encoding: "buffer",
    maxBuffer: 1024 * 1024 * 10
  });
  assert(unzipped.status === 0, clean(Buffer.concat([unzipped.stderr || Buffer.alloc(0), unzipped.stdout || Buffer.alloc(0)]).toString("utf8")) || `could not inspect zip entry ${entry}`);
  return crypto.createHash("sha256").update(unzipped.stdout).digest("hex");
}

function sha256File(filePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(filePath)).digest("hex");
}

function assertSha256(value, label) {
  assert(/^[0-9a-f]{64}$/i.test(String(value || "")), `${label} must be a SHA-256 hex digest.`);
}

function assertSameList(actual, expected, label) {
  const sortedActual = [...actual].sort();
  const sortedExpected = [...expected].sort();
  const missing = sortedExpected.filter((item) => !sortedActual.includes(item));
  const extra = sortedActual.filter((item) => !sortedExpected.includes(item));
  assert(missing.length === 0 && extra.length === 0, `${label} mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`);
}

function parseJsonOutput(output, label) {
  try {
    return JSON.parse(clean(output));
  } catch (error) {
    throw new Error(`${label} did not return valid JSON: ${error.message}`);
  }
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
}

function assertEmail(value, label) {
  assert(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "")), `${label} must be an email address.`);
}

function assertTextIncludes(text, phrase, label) {
  assert(String(text).toLowerCase().includes(String(phrase).toLowerCase()), `${label} must mention "${phrase}".`);
}

function assertNonEmpty(value, label) {
  assert(clean(value), `${label} is required.`);
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
    } else if (value === "--skip-package") {
      parsed.skipPackage = true;
    } else if (value === "--skip-extension-check") {
      parsed.skipExtensionCheck = true;
    }
  }
  return parsed;
}
