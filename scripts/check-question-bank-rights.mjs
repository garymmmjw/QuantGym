#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const mode = args.mode || "private-beta";
const allowedModes = new Set(["private-beta", "public", "commercial"]);
const sourceRoot = path.join(projectRoot, "data", "question-banks");
const catalogManifestPath = path.join(sourceRoot, "catalog-manifest.json");
const rightsManifestPath = path.join(sourceRoot, "source-rights-manifest.json");
const compiledCatalogPath = path.join(projectRoot, "data", "problem-catalog.json");
const PRIVATE_BETA_STATUSES = new Set(["allowed", "blocked", "needs-review"]);
const PUBLIC_COMMERCIAL_STATUSES = new Set(["approved", "blocked", "needs-review"]);
const APPROVAL_TYPES = new Set(["direct-permission", "open-license", "public-domain", "owned-original", "source-removed"]);
const REDISTRIBUTION_SCOPES = new Set(["public-web", "redistribution", "compiled-catalog", "derived-adaptation", "commercial-use"]);
const REQUIRED_PUBLIC_SCOPES = ["public-web", "redistribution", "compiled-catalog", "derived-adaptation"];
const REQUIRED_COMMERCIAL_SCOPES = [...REQUIRED_PUBLIC_SCOPES, "commercial-use"];
const APPROVAL_MAX_AGE_DAYS = 366;
const PLACEHOLDER_PATTERN = /\b(tbd|todo|placeholder|example|xxx)\b/i;

const failures = [];
const warnings = [];

if (!allowedModes.has(mode)) {
  failures.push(`Unsupported mode "${mode}". Use private-beta, public, or commercial.`);
}

const catalogManifest = readJson(catalogManifestPath, "catalog manifest");
const rightsManifest = readJson(rightsManifestPath, "source rights manifest");
const compiledCatalog = readJson(compiledCatalogPath, "compiled problem catalog");

const catalogSources = Array.isArray(catalogManifest.sources) ? catalogManifest.sources : [];
const rightsSources = Array.isArray(rightsManifest.sources) ? rightsManifest.sources : [];
const compiledProblems = Array.isArray(compiledCatalog) ? compiledCatalog : compiledCatalog.problems;

const catalogBySlug = new Map(catalogSources.map((source) => [clean(source.slug), source]));
const rightsBySlug = new Map(rightsSources.map((source) => [clean(source.slug), source]));
const activeCatalogSources = catalogSources.filter((source) => clean(source.slug) && !source.disabled && !source.excludeFromCatalog);
const activeSlugs = new Set(activeCatalogSources.map((source) => clean(source.slug)));
const compiledBySource = countBy(compiledProblems || [], (problem) => clean(problem.source));
const visibilityBySource = groupVisibility(compiledProblems || []);
const sourceChecks = [];

checkShape();
checkSourceCoverage();
checkCompiledCatalog();
checkReleaseMode();

const summary = {
  status: failures.length ? "fail" : "pass",
  mode,
  activeSources: activeCatalogSources.length,
  compiledProblems: Array.isArray(compiledProblems) ? compiledProblems.length : 0,
  rightsSources: rightsSources.length,
  rightsStatus: summarizeRightsStatus(),
  sourceChecks,
  failures,
  warnings
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;

function checkShape() {
  if (!Array.isArray(catalogManifest.sources)) failures.push("catalog-manifest.json must contain a sources array.");
  if (!Array.isArray(rightsManifest.sources)) failures.push("source-rights-manifest.json must contain a sources array.");
  if (!Array.isArray(compiledProblems)) failures.push("data/problem-catalog.json must contain a problems array.");

  expectNoDuplicates(catalogSources.map((source) => clean(source.slug)).filter(Boolean), "catalog source slugs");
  expectNoDuplicates(rightsSources.map((source) => clean(source.slug)).filter(Boolean), "rights source slugs");
}

function checkSourceCoverage() {
  for (const catalogSource of catalogSources) {
    const slug = clean(catalogSource.slug);
    if (!slug) continue;
    const rights = rightsBySlug.get(slug);
    if (!rights) {
      failures.push(`Missing rights manifest entry for source "${slug}".`);
      continue;
    }

    const expectedActive = Boolean(rights.expectedActive);
    const actualActive = !catalogSource.disabled && !catalogSource.excludeFromCatalog;
    if (expectedActive !== actualActive) {
      failures.push(`${slug} expectedActive=${expectedActive} does not match catalog active=${actualActive}.`);
    }

    const problemPayload = readJson(path.join(sourceRoot, catalogSource.problemFile || `${slug}/problems.json`), `${slug} problems`);
    const sourceProblems = Array.isArray(problemPayload) ? problemPayload : problemPayload.problems;
    if (!Array.isArray(sourceProblems)) {
      failures.push(`${slug} problems.json must contain a problems array.`);
      continue;
    }

    const expectedProblemCount = Number(rights.expectedProblemCount);
    if (sourceProblems.length !== expectedProblemCount) {
      failures.push(`${slug} expectedProblemCount=${expectedProblemCount} but source package has ${sourceProblems.length}.`);
    }
    if (Number(catalogSource.problemCount) !== sourceProblems.length) {
      failures.push(`${slug} catalog-manifest problemCount=${catalogSource.problemCount} but source package has ${sourceProblems.length}.`);
    }

    const sourceVisibility = [...new Set(sourceProblems.map((problem) => clean(problem.visibility || "public")))].sort();
    const allowedVisibility = Array.isArray(rights.allowedCatalogVisibility) ? rights.allowedCatalogVisibility.map(clean).sort() : [];
    const disallowedVisibility = sourceVisibility.filter((visibility) => !allowedVisibility.includes(visibility));
    if (disallowedVisibility.length) {
      failures.push(`${slug} has source visibility outside allowedCatalogVisibility: ${disallowedVisibility.join(", ")}`);
    }

    sourceChecks.push({
      slug,
      active: actualActive,
      sourceProblems: sourceProblems.length,
      compiledProblems: compiledBySource.get(slug) || 0,
      visibility: sourceVisibility,
      privateBetaStatus: rights.privateBeta?.status || "",
      publicCommercialStatus: rights.publicCommercial?.status || "",
      publicCommercialApprovalType: rights.publicCommercial?.approvalType || "",
      publicCommercialScopes: Array.isArray(rights.publicCommercial?.redistributionScope)
        ? rights.publicCommercial.redistributionScope
        : []
    });
  }

  for (const rightsSource of rightsSources) {
    const slug = clean(rightsSource.slug);
    if (slug && !catalogBySlug.has(slug)) {
      failures.push(`Rights manifest entry "${slug}" is not present in catalog-manifest.json.`);
    }
  }
}

function checkCompiledCatalog() {
  if (!Array.isArray(compiledProblems)) return;
  const compiledSources = [...compiledBySource.keys()].filter(Boolean).sort();
  const expectedCompiledSources = [...activeSlugs].sort();
  expectSameMembers(compiledSources, expectedCompiledSources, "compiled catalog sources");

  for (const source of activeCatalogSources) {
    const slug = clean(source.slug);
    const compiledCount = compiledBySource.get(slug) || 0;
    if (compiledCount !== Number(source.problemCount)) {
      failures.push(`${slug} compiled count=${compiledCount} but active source problemCount=${source.problemCount}.`);
    }

    const rights = rightsBySlug.get(slug);
    const allowedVisibility = new Set((rights?.allowedCatalogVisibility || []).map(clean));
    const compiledVisibility = visibilityBySource.get(slug) || new Set();
    const disallowed = [...compiledVisibility].filter((visibility) => !allowedVisibility.has(visibility));
    if (disallowed.length) {
      failures.push(`${slug} compiled catalog visibility outside rights manifest: ${disallowed.join(", ")}`);
    }
  }

  for (const source of catalogSources.filter((item) => item.disabled || item.excludeFromCatalog)) {
    const slug = clean(source.slug);
    if ((compiledBySource.get(slug) || 0) > 0) {
      failures.push(`Disabled source "${slug}" is present in compiled catalog.`);
    }
  }
}

function checkReleaseMode() {
  for (const source of catalogSources) {
    const slug = clean(source.slug);
    if (!slug) continue;
    const rights = rightsBySlug.get(slug);
    if (!rights) continue;
    const active = activeSlugs.has(slug);
    const privateStatus = clean(rights.privateBeta?.status);
    const publicStatus = clean(rights.publicCommercial?.status);

    requireReviewFields(rights.privateBeta, `${slug}.privateBeta`, PRIVATE_BETA_STATUSES);
    requirePublicFields(rights.publicCommercial, `${slug}.publicCommercial`);

    if (mode === "private-beta") {
      if (active && privateStatus !== "allowed") {
        failures.push(`${slug} is active but privateBeta.status is "${privateStatus}".`);
      }
      if (!active && privateStatus === "allowed") {
        warnings.push(`${slug} is inactive but privateBeta.status is allowed.`);
      }
      continue;
    }

    if (!active) continue;
    if (publicStatus !== "approved") {
      failures.push(`${slug} blocks ${mode} release: publicCommercial.status is "${publicStatus}".`);
      continue;
    }
    for (const field of ["basis", "reviewedBy", "reviewedAt", "evidenceUrl"]) {
      if (!clean(rights.publicCommercial?.[field])) {
        failures.push(`${slug} publicCommercial approval requires ${field}.`);
      }
    }
    validateApprovalEvidenceUrl(rights.publicCommercial?.evidenceUrl, `${slug}.publicCommercial.evidenceUrl`);
    validateIsoReviewDate(rights.publicCommercial?.reviewedAt, `${slug}.publicCommercial.reviewedAt`);
    validateApprovedPublicCommercial(rights.publicCommercial, `${slug}.publicCommercial`, mode, active);
  }
}

function requireReviewFields(entry, label, allowedStatuses) {
  for (const field of ["status", "basis", "reviewedBy", "reviewedAt"]) {
    if (!clean(entry?.[field])) failures.push(`${label}.${field} is required.`);
  }
  validateStatus(entry?.status, allowedStatuses, `${label}.status`);
  validateRequiredText(entry?.basis, `${label}.basis`);
  validateRequiredText(entry?.reviewedBy, `${label}.reviewedBy`);
  validateIsoReviewDate(entry?.reviewedAt, `${label}.reviewedAt`);
}

function requirePublicFields(entry, label) {
  for (const field of ["status", "basis"]) {
    if (!clean(entry?.[field])) failures.push(`${label}.${field} is required.`);
  }
  validateStatus(entry?.status, PUBLIC_COMMERCIAL_STATUSES, `${label}.status`);
  validateRequiredText(entry?.basis, `${label}.basis`);
  if (clean(entry?.status) !== "approved") {
    if (!clean(entry?.requiredNextStep)) failures.push(`${label}.requiredNextStep is required until status is approved.`);
    validateRequiredText(entry?.requiredNextStep, `${label}.requiredNextStep`);
  }
}

function readJson(filePath, label) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`${label} is not valid JSON: ${error.message}`);
    return {};
  }
}

function countBy(items, getKey) {
  const counts = new Map();
  if (!Array.isArray(items)) return counts;
  for (const item of items) {
    const key = getKey(item);
    if (!key) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function groupVisibility(items) {
  const grouped = new Map();
  if (!Array.isArray(items)) return grouped;
  for (const item of items) {
    const source = clean(item.source);
    if (!source) continue;
    if (!grouped.has(source)) grouped.set(source, new Set());
    grouped.get(source).add(clean(item.visibility || "public"));
  }
  return grouped;
}

function expectNoDuplicates(values, label) {
  const duplicates = [...new Set(values.filter((value, index) => values.indexOf(value) !== index))];
  if (duplicates.length) failures.push(`${label} contain duplicates: ${duplicates.join(", ")}`);
}

function expectSameMembers(actual, expected, label) {
  const missing = expected.filter((item) => !actual.includes(item));
  const extra = actual.filter((item) => !expected.includes(item));
  if (missing.length || extra.length) {
    failures.push(`${label} mismatch. Missing: ${missing.join(", ") || "none"}; extra: ${extra.join(", ") || "none"}`);
  }
}

function validateStatus(value, allowedStatuses, label) {
  const status = clean(value);
  if (!status) return;
  if (!allowedStatuses.has(status)) {
    failures.push(`${label} must be one of ${[...allowedStatuses].join(", ")}; got "${status}".`);
  }
}

function validateRequiredText(value, label) {
  const text = clean(value);
  if (!text) return;
  if (PLACEHOLDER_PATTERN.test(text)) {
    failures.push(`${label} must not contain placeholder text.`);
  }
}

function validateIsoReviewDate(value, label) {
  const date = clean(value);
  if (!date) return;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    failures.push(`${label} must use YYYY-MM-DD format.`);
    return;
  }
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    failures.push(`${label} must be a valid calendar date.`);
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  if (date > today) failures.push(`${label} must not be in the future.`);
}

function validateApprovalEvidenceUrl(value, label) {
  const text = clean(value);
  if (!text) return;
  if (PLACEHOLDER_PATTERN.test(text)) {
    failures.push(`${label} must not contain placeholder text.`);
  }
  let url;
  try {
    url = new URL(text);
  } catch {
    failures.push(`${label} must be a valid HTTPS URL.`);
    return;
  }
  if (url.protocol !== "https:") failures.push(`${label} must use HTTPS.`);
  if (url.username || url.password) failures.push(`${label} must not include embedded credentials.`);
  if (url.search || url.hash) failures.push(`${label} must not include query strings or fragments.`);
  const host = url.hostname.toLowerCase();
  if (isPlaceholderHost(host)) failures.push(`${label} must not point at placeholder hosts.`);
  if (isLocalOrPrivateHost(host)) failures.push(`${label} must not point at localhost, loopback, or private-network hosts.`);
  if (isIpLiteral(host)) failures.push(`${label} must use a DNS hostname, not an IP address.`);
}

function validateApprovedPublicCommercial(entry, label, releaseMode, active) {
  const approvalType = clean(entry?.approvalType);
  validateStatus(approvalType, APPROVAL_TYPES, `${label}.approvalType`);
  if (!approvalType) failures.push(`${label}.approvalType is required when status is approved.`);
  if (approvalType === "source-removed" && active) {
    failures.push(`${label}.approvalType=source-removed cannot approve an active catalog source.`);
  }

  validateRequiredText(entry?.evidenceSummary, `${label}.evidenceSummary`);
  if (clean(entry?.evidenceSummary).length < 40) {
    failures.push(`${label}.evidenceSummary must explain the approval evidence in at least 40 characters.`);
  }
  validateApprovalFreshness(entry?.reviewedAt, `${label}.reviewedAt`);

  const scopes = Array.isArray(entry?.redistributionScope) ? entry.redistributionScope.map(clean).filter(Boolean) : [];
  if (!scopes.length) failures.push(`${label}.redistributionScope must list approved redistribution scopes.`);
  for (const scope of scopes) {
    if (!REDISTRIBUTION_SCOPES.has(scope)) {
      failures.push(`${label}.redistributionScope contains unsupported scope "${scope}".`);
    }
  }
  const requiredScopes = releaseMode === "commercial" ? REQUIRED_COMMERCIAL_SCOPES : REQUIRED_PUBLIC_SCOPES;
  const missingScopes = requiredScopes.filter((scope) => !scopes.includes(scope));
  if (missingScopes.length) {
    failures.push(`${label}.redistributionScope missing required ${releaseMode} scopes: ${missingScopes.join(", ")}.`);
  }

  if (approvalType === "direct-permission") {
    if (!clean(entry?.permissionGrantor)) failures.push(`${label}.permissionGrantor is required for direct permission.`);
    validateRequiredText(entry?.permissionGrantor, `${label}.permissionGrantor`);
  }
  if (approvalType === "open-license" || approvalType === "public-domain") {
    if (!clean(entry?.licenseName)) failures.push(`${label}.licenseName is required for ${approvalType}.`);
    if (!clean(entry?.licenseUrl)) failures.push(`${label}.licenseUrl is required for ${approvalType}.`);
    validateRequiredText(entry?.licenseName, `${label}.licenseName`);
    validateApprovalEvidenceUrl(entry?.licenseUrl, `${label}.licenseUrl`);
  }
  if (approvalType === "owned-original") {
    if (!clean(entry?.owner)) failures.push(`${label}.owner is required for owned-original approvals.`);
    validateRequiredText(entry?.owner, `${label}.owner`);
  }
}

function validateApprovalFreshness(value, label) {
  const date = clean(value);
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return;
  const reviewed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(reviewed.getTime())) return;
  const ageDays = Math.floor((Date.now() - reviewed.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays > APPROVAL_MAX_AGE_DAYS) {
    failures.push(`${label} is older than ${APPROVAL_MAX_AGE_DAYS} days; refresh public/commercial approval evidence.`);
  }
}

function summarizeRightsStatus() {
  const publicCommercial = {};
  const privateBeta = {};
  const activePublicCommercial = {};
  for (const source of rightsSources) {
    const slug = clean(source.slug);
    increment(privateBeta, clean(source.privateBeta?.status) || "missing");
    increment(publicCommercial, clean(source.publicCommercial?.status) || "missing");
    if (activeSlugs.has(slug)) {
      increment(activePublicCommercial, clean(source.publicCommercial?.status) || "missing");
    }
  }
  return {
    privateBeta,
    publicCommercial,
    activePublicCommercial
  };
}

function increment(target, key) {
  target[key] = Number(target[key] || 0) + 1;
}

function clean(value) {
  return String(value || "").trim();
}

function isPlaceholderHost(host) {
  return host === "example.com"
    || host === "example.test"
    || host.endsWith(".example.com")
    || host.endsWith(".example.test");
}

function isLocalOrPrivateHost(host) {
  const value = clean(host).replace(/^\[|\]$/g, "").toLowerCase();
  if (value === "localhost" || value.endsWith(".localhost") || value.endsWith(".local")) return true;
  if (!net.isIP(value)) return false;
  if (value === "0.0.0.0" || value === "::") return true;
  if (value === "::1" || value.startsWith("127.")) return true;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  if (mapped) return isLocalOrPrivateHost(mapped[1]);
  if (net.isIP(value) === 4) {
    const parts = value.split(".").map((part) => Number(part));
    return parts[0] === 10
      || parts[0] === 127
      || (parts[0] === 169 && parts[1] === 254)
      || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31)
      || (parts[0] === 192 && parts[1] === 168);
  }
  return value.startsWith("fc")
    || value.startsWith("fd")
    || value.startsWith("fe80:");
}

function isIpLiteral(host) {
  return net.isIP(clean(host).replace(/^\[|\]$/g, "").toLowerCase()) !== 0;
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (value === "--mode") {
      parsed.mode = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}
