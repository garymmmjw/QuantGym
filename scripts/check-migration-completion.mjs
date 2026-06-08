#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const src = path.join(root, "src");
const evidenceDir = path.join(root, "docs", "browser-audit-screenshots");
const args = process.argv.slice(2);
const strict = args.includes("--strict");
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/327-migration-completion-audit-summary.json";

const requirements = [
  reactRouteOwnership(),
  migrationLedgerConverted(),
  noRetiredRouteBridge(),
  routeSmokeEvidence(),
  githubParityEvidence(),
  browserEvidenceManifest(),
  staticBuildConfigEvidence(),
  localServiceBoundaryEvidence(),
  googleTokenHelperEvidence(),
  googleProviderLoginEvidence()
];

const passed = requirements.filter((item) => item.status === "pass");
const pending = requirements.filter((item) => item.status === "pending");
const failed = requirements.filter((item) => item.status === "fail");
const total = requirements.length;
const summary = {
  id: 327,
  date: "2026-06-08",
  surface: "migration completion audit",
  status: failed.length ? "fail" : pending.length ? "partial" : "pass",
  completionPercent: Math.round((passed.length / total) * 100),
  requirements: {
    total,
    passed: passed.length,
    pending: pending.length,
    failed: failed.length
  },
  remainingRequiredWork: pending.map((item) => ({
    id: item.id,
    title: item.title,
    reason: item.reason,
    nextStep: item.nextStep
  })),
  checks: requirements
};

const absoluteSummaryPath = path.resolve(root, summaryPath);
fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);

if (failed.length || (strict && pending.length)) process.exitCode = 1;

function reactRouteOwnership() {
  const manifestIds = extractManifestIds();
  const routeText = read("src/routes/routeConfig.js");
  const reactIds = extractSetIds(routeText, "REACT_PAGE_IDS");
  const bridgeIds = extractSetIds(routeText, "BRIDGE_PAGE_IDS");
  const missingReact = manifestIds.filter((id) => !reactIds.includes(id));
  const extraReact = reactIds.filter((id) => !manifestIds.includes(id));
  const pass = manifestIds.length === 21
    && reactIds.length === manifestIds.length
    && bridgeIds.length === 0
    && missingReact.length === 0
    && extraReact.length === 0;
  return {
    id: "react-route-ownership",
    title: "All routeable modules are React-owned",
    status: pass ? "pass" : "fail",
    evidence: {
      manifestRoutes: manifestIds.length,
      reactRoutes: reactIds.length,
      bridgeRoutes: bridgeIds.length,
      missingReact,
      extraReact
    }
  };
}

function migrationLedgerConverted() {
  const ledger = readJson("docs/react-migration-ledger.json");
  const pages = ledger?.pages || {};
  const entries = Object.entries(pages);
  const converted = entries.filter(([, entry]) => entry.status === "converted").map(([id]) => id);
  const nonConverted = entries.filter(([, entry]) => entry.status !== "converted").map(([id, entry]) => ({ id, status: entry.status }));
  return {
    id: "migration-ledger-converted",
    title: "Migration ledger records all pages as converted",
    status: entries.length === 21 && converted.length === 21 && nonConverted.length === 0 ? "pass" : "fail",
    evidence: {
      ledgerPages: entries.length,
      convertedPages: converted.length,
      nonConverted
    }
  };
}

function noRetiredRouteBridge() {
  const sourceFiles = walkFiles(src, [], (filePath) => /\.(js|jsx)$/.test(filePath));
  const retiredPatterns = [
    { name: "LegacyModuleHost", pattern: /\bLegacyModuleHost\b/ },
    { name: "legacyApp.pageApi", pattern: /\blegacyApp\.pageApi\b/ },
    { name: "runLegacyBootstrap", pattern: /\brunLegacyBootstrap\b/ },
    { name: "ShellBootstrap", pattern: /\bShellBootstrap\b/ },
    { name: "RouteBridge", pattern: /\bRouteBridge\b/ },
    { name: "LegacyAppContext", pattern: /\bLegacyAppContext\b/ },
    { name: "createLegacyApp", pattern: /\bcreateLegacyApp\b/ },
    { name: "ModulePage", pattern: /\bModulePage\b/ },
    { name: "module-partial-root", pattern: /module-partial-root/ },
    { name: "createPortal", pattern: /\bcreatePortal\s*\(/ }
  ];
  const hits = [];
  for (const filePath of sourceFiles) {
    const rel = path.relative(root, filePath);
    const text = fs.readFileSync(filePath, "utf8");
    for (const item of retiredPatterns) {
      if (item.pattern.test(text)) hits.push({ file: rel, symbol: item.name });
    }
  }
  return {
    id: "retired-route-bridge",
    title: "Retired route bridge symbols are absent from src",
    status: hits.length ? "fail" : "pass",
    evidence: {
      checkedFiles: sourceFiles.length,
      hits
    }
  };
}

function routeSmokeEvidence() {
  const data = readJson("docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json");
  const desktop = Array.isArray(data.desktop) ? data.desktop : [];
  const mobile = Array.isArray(data.mobile) ? data.mobile : [];
  const desktopPass = desktop.filter(isPassingRouteSmoke).length;
  const mobilePass = mobile.filter(isPassingRouteSmoke).length;
  const pass = desktop.length === 21
    && mobile.length === 21
    && desktopPass === 21
    && mobilePass === 21
    && (data.significantLogs || []).length === 0;
  return {
    id: "route-smoke-evidence",
    title: "All-route desktop/mobile smoke evidence passes",
    status: pass ? "pass" : "fail",
    evidence: {
      desktopRoutes: desktop.length,
      desktopPass,
      mobileRoutes: mobile.length,
      mobilePass,
      significantLogs: (data.significantLogs || []).length
    }
  };
}

function githubParityEvidence() {
  const data = readJson("docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json");
  const actionableIssues = (data.routes || []).reduce((sum, route) => sum + (route.actionableIssues || []).length, 0);
  const currentProblems = (data.routes || []).filter((route) => {
    return route.current?.key?.visible !== true || route.current?.overlay !== false || route.current?.horizontalOverflow !== false;
  }).map((route) => route.route);
  const pass = data.status === "pass"
    && data.routeCount === 21
    && data.pass === 21
    && data.total === 21
    && actionableIssues === 0
    && currentProblems.length === 0;
  return {
    id: "github-parity-evidence",
    title: "GitHub baseline parity has no actionable route issues",
    status: pass ? "pass" : "fail",
    evidence: {
      status: data.status,
      routeCount: data.routeCount,
      pass: data.pass,
      total: data.total,
      actionableIssues,
      currentProblems
    }
  };
}

function browserEvidenceManifest() {
  const data = readJson("docs/browser-audit-screenshots/326-browser-evidence-manifest-summary.json");
  const pass = data.status === "pass"
    && data.evidenceRefs >= 250
    && data.imageRefs >= 220
    && data.jsonRefs >= 30
    && data.missing === 0
    && data.smallFiles === 0
    && data.invalidJson === 0;
  return {
    id: "browser-evidence-manifest",
    title: "Referenced browser evidence files are present and valid",
    status: pass ? "pass" : "fail",
    evidence: {
      status: data.status,
      evidenceRefs: data.evidenceRefs,
      imageRefs: data.imageRefs,
      jsonRefs: data.jsonRefs,
      missing: data.missing,
      smallFiles: data.smallFiles,
      invalidJson: data.invalidJson
    }
  };
}

function staticBuildConfigEvidence() {
  const data = readJson("docs/browser-audit-screenshots/321-static-build-config-summary.json");
  const checks = data.checks || {};
  const pass = data.status === "pass"
    && checks.npmRunBuildPassed === true
    && checks.distConfigGoogleClientIdSet === true
    && checks.distConfigGoogleLoginEnabled === true
    && checks.distConfigContainsOpenAiKey === false
    && checks.strictModeRejectsLocalHttpEndpoints === true;
  return {
    id: "static-build-config",
    title: "Static build runtime config is safe and populated",
    status: pass ? "pass" : "fail",
    evidence: checks
  };
}

function localServiceBoundaryEvidence() {
  const data = readJson("docs/browser-audit-screenshots/319-production-boundaries-local-services-summary.json");
  const googleLogin = findResult(data.results, "google provider login");
  const resumeReview = findResult(data.results, "LLM resume review");
  const pdfGeneration = findResult(data.results, "LLM PDF question generation");
  const googleLoginCompleted = data.status === "pass"
    && data.passed === 5
    && data.skipped === 0
    && data.failed === 0
    && googleLogin?.status === "pass"
    && googleLogin?.data?.hasToken === true
    && googleLogin?.data?.tokenAudienceMatchesClientId === true;
  const googleLoginIsolated = data.status === "partial"
    && data.passed === 4
    && data.skipped === 1
    && data.failed === 0
    && googleLogin?.status === "skip"
    && googleLogin?.reason === "Set QUANTGYM_GOOGLE_ID_TOKEN.";
  const pass = (googleLoginCompleted || googleLoginIsolated)
    && resumeReview?.status === "pass"
    && Number(resumeReview?.data?.itemCount || 0) > 0
    && pdfGeneration?.status === "pass"
    && Number(pdfGeneration?.data?.questionCount || 0) > 0;
  return {
    id: "local-service-boundaries",
    title: "Local cloud, Google, and LLM boundaries are verified",
    status: pass ? "pass" : "fail",
    evidence: {
      status: data.status,
      passed: data.passed,
      skipped: data.skipped,
      failed: data.failed,
      googleProviderLogin: googleLogin,
      providerLoginCompleted: googleLoginCompleted,
      llmResumeReview: resumeReview?.status,
      llmPdfQuestionGeneration: pdfGeneration?.status
    }
  };
}

function googleTokenHelperEvidence() {
  const helper = readJson("docs/browser-audit-screenshots/324-google-token-helper-summary.json");
  const browser = readJson("docs/browser-audit-screenshots/325-google-token-helper-browser-summary.json");
  const pass = helper.status === "pass"
    && helper.checks?.tokenWrittenToDisk === false
    && helper.checks?.artifactIgnoredByGit === true
    && helper.checks?.verifierChecksTokenStructureAudienceAndExpiry === true
    && browser.status === "pass"
    && browser.checks?.googleButtonVisible === true
    && browser.checks?.verifierSanityTextVisible === true
    && browser.checks?.statusText === "Ready.";
  return {
    id: "google-token-helper",
    title: "Google ID token helper is generated safely and renderable",
    status: pass ? "pass" : "fail",
    evidence: {
      helperStatus: helper.status,
      browserStatus: browser.status,
      artifactIgnoredByGit: helper.checks?.artifactIgnoredByGit,
      tokenWrittenToDisk: helper.checks?.tokenWrittenToDisk,
      verifierChecksTokenStructureAudienceAndExpiry: helper.checks?.verifierChecksTokenStructureAudienceAndExpiry,
      googleButtonVisible: browser.checks?.googleButtonVisible,
      verifierSanityTextVisible: browser.checks?.verifierSanityTextVisible,
      statusText: browser.checks?.statusText
    }
  };
}

function googleProviderLoginEvidence() {
  const browserData = readJson("docs/browser-audit-screenshots/320-iab-google-config-summary.json");
  const boundaryData = readJson("docs/browser-audit-screenshots/319-production-boundaries-local-services-summary.json");
  const googleLogin = findResult(boundaryData.results, "google provider login");
  const rendered = browserData.checks?.googleButtonIframeRendered === true
    && browserData.checks?.googleIframeUsesConfiguredClientId === true
    && browserData.checks?.originNotAllowedWarningPresent === false;
  const completed = boundaryData.status === "pass"
    && googleLogin?.status === "pass"
    && googleLogin?.data?.hasToken === true
    && googleLogin?.data?.tokenAudienceMatchesClientId === true;
  return {
    id: "google-provider-login",
    title: "Real Google provider account login is signed off",
    status: completed ? "pass" : rendered ? "pending" : "fail",
    reason: completed ? "" : "Google Sign-In is configured and renderable, but provider login still needs a short-lived QUANTGYM_GOOGLE_ID_TOKEN.",
    nextStep: completed
      ? ""
      : "Run npm run google:token-helper, complete Google sign-in, then run QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries before the token expires.",
    evidence: {
      googleButtonIframeRendered: browserData.checks?.googleButtonIframeRendered,
      googleIframeUsesConfiguredClientId: browserData.checks?.googleIframeUsesConfiguredClientId,
      originNotAllowedWarningPresent: browserData.checks?.originNotAllowedWarningPresent,
      providerLoginCompleted: completed,
      productionBoundaryStatus: boundaryData.status,
      googleLinked: googleLogin?.data?.googleLinked,
      tokenAudienceMatchesClientId: googleLogin?.data?.tokenAudienceMatchesClientId
    }
  };
}

function isPassingRouteSmoke(entry) {
  return entry.status === "pass"
    && entry.targetSelectorVisible === true
    && entry.overlay === false
    && entry.horizontalOverflow === false;
}

function extractManifestIds() {
  const text = read("src/modules/manifest.js");
  return [...new Set([...text.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]))];
}

function extractSetIds(text, exportName) {
  const pattern = new RegExp(`export\\s+const\\s+${exportName}\\s*=\\s*new\\s+Set\\s*\\(\\s*\\[([\\s\\S]*?)\\]\\s*\\)`);
  const match = text.match(pattern);
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function findResult(results, name) {
  return Array.isArray(results) ? results.find((result) => result.name === name) : undefined;
}

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  return fs.readFileSync(absolutePath, "utf8");
}

function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}

function walkFiles(dir, results = [], filter = () => true) {
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(fullPath, results, filter);
    else if (filter(fullPath)) results.push(fullPath);
  }
  return results;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}
