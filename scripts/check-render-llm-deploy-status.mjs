#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const startedAt = Date.now();
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/357-render-llm-deploy-status-summary.json"
);
const failures = [];
const warnings = [];

const packageJson = readJson("package.json");
const llmPackageJson = readJson("llm-proxy/package.json");
const existingSummary = readJsonIfExists(path.relative(root, summaryPath));
const headCommit = runText("git", ["rev-parse", "HEAD"]).trim();

const rootUndiciDependencySet = Boolean(packageJson.dependencies?.undici);
const llmProxyUndiciDependencySet = Boolean(llmPackageJson.dependencies?.undici);
expect(rootUndiciDependencySet, "root package.json must list undici in dependencies for root Render installs.");
expect(llmProxyUndiciDependencySet, "llm-proxy/package.json must list undici in dependencies for llm-proxy root-directory installs.");

const compatibility = runJson(process.execPath, ["scripts/check-render-llm-deploy-compat.mjs"]);
const compatibilityChecks = Array.isArray(compatibility.results) ? compatibility.results.length : 0;
const renderLlmDeployCompatibilityPass = compatibility.status === "pass"
  && Number(compatibility.checks || 0) === 15
  && Array.isArray(compatibility.failures)
  && compatibility.failures.length === 0;
expect(renderLlmDeployCompatibilityPass, "Render LLM deploy compatibility gate must pass all 15 checks.");

const deployedApiHealth = await fetchJson("https://api.quantgym.app/api/health");
const deployedLlmHealth = await fetchJson("https://llm.quantgym.app/health");
const deployedVersion = await fetchJson("https://beta.quantgym.app/version.json");
const deployedApiHealthPass = deployedApiHealth.status === 200 && deployedApiHealth.json?.ok === true;
const deployedLlmHealthPass = deployedLlmHealth.status === 200 && deployedLlmHealth.json?.ok === true;
const deployedVersionCommitMatchesHead = deployedVersion.status === 200 && deployedVersion.json?.commit === headCommit;
expect(deployedApiHealthPass, "deployed API health must return 200 { ok: true }.");
expect(deployedLlmHealthPass, "deployed LLM health must return 200 { ok: true }.");
expect(deployedVersionCommitMatchesHead, "deployed beta version.json must match the current HEAD commit.");

const mailAudit = buildMailAudit(existingSummary?.mailAudit || {});
expect(mailAudit.checkedExternally === true, "Render deploy failure mailbox audit must be recorded.");
expect(Number(mailAudit.currentCommitFailureEmails || 0) === 0, "Render deploy mailbox audit must show zero failures for the current commit.");
expect(Number(mailAudit.recentFailureEmails || 0) === 0, "Render deploy mailbox audit must show zero recent failure emails after the current deploy.");

const summary = {
  id: 357,
  date: new Date().toISOString().slice(0, 10),
  surface: "Render LLM deploy status",
  status: failures.length ? "fail" : "pass",
  durationMs: Date.now() - startedAt,
  commit: headCommit,
  checks: {
    rootUndiciDependencySet,
    llmProxyUndiciDependencySet,
    renderLlmDeployCompatibilityPass,
    compatibilityChecks,
    rootUndiciImportPass: resultPassed(compatibility, "root undici import"),
    llmProxyUndiciImportPass: resultPassed(compatibility, "llm-proxy undici import"),
    rootStartCommandsPass: allResultsPass(compatibility, "root "),
    llmProxyStartCommandsPass: allResultsPass(compatibility, "llm-proxy "),
    deployedApiHealthPass,
    deployedLlmHealthPass,
    deployedVersionCommitMatchesHead,
    deployedVersionCommit: clean(deployedVersion.json?.commit),
    renderMailAuditRecorded: mailAudit.checkedExternally === true,
    renderMailCurrentCommitFailuresClear: Number(mailAudit.currentCommitFailureEmails || 0) === 0,
    renderMailRecentFailuresClear: Number(mailAudit.recentFailureEmails || 0) === 0
  },
  deployed: {
    apiHealth: summarizeFetch(deployedApiHealth),
    llmHealth: summarizeFetch(deployedLlmHealth),
    version: summarizeFetch(deployedVersion)
  },
  compatibility: {
    status: compatibility.status || "unknown",
    checks: Number(compatibility.checks || 0),
    failures: compatibility.failures || [],
    resultNames: (compatibility.results || []).map((item) => item.name)
  },
  mailAudit,
  failures,
  warnings
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exit(1);

function buildMailAudit(existing) {
  const reviewedAt = clean(getArgValue("--mail-reviewed-at") || process.env.QUANTGYM_RENDER_MAIL_REVIEWED_AT || existing.reviewedAt);
  const latestFailureUtc = clean(getArgValue("--mail-latest-failure-utc") || process.env.QUANTGYM_RENDER_MAIL_LATEST_FAILURE_UTC || existing.latestFailureUtc);
  const currentCommitFailureEmails = parseNonNegativeInteger(
    getArgValue("--mail-current-commit-failures")
      || process.env.QUANTGYM_RENDER_MAIL_CURRENT_COMMIT_FAILURES
      || existing.currentCommitFailureEmails
  );
  const recentFailureEmails = parseNonNegativeInteger(
    getArgValue("--mail-recent-failures")
      || process.env.QUANTGYM_RENDER_MAIL_RECENT_FAILURES
      || existing.recentFailureEmails
  );
  const checkedExternally = Boolean(reviewedAt)
    && currentCommitFailureEmails != null
    && recentFailureEmails != null;
  return {
    checkedExternally,
    source: clean(existing.source) || "Gmail connector manual search",
    reviewedAt,
    latestFailureUtc,
    currentCommitFailureEmails,
    recentFailureEmails,
    queries: [
      "newer_than:4h (from:render.com OR subject:(deploy failed) OR \"Deploy failed\" OR \"quantgym-llm\" OR \"quantgym-api\" OR current commit/title) -in:spam -in:trash",
      "(current commit OR current full commit OR current commit title) -in:spam -in:trash"
    ],
    note: "The script cannot access Gmail directly; these fields are supplied from the Gmail connector audit and preserved across reruns."
  };
}

function runJson(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20
  });
  if (result.status !== 0) {
    failures.push(`${commandArgs.join(" ")} exited with ${result.status}`);
  }
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  try {
    const start = output.indexOf("{");
    return JSON.parse(start >= 0 ? output.slice(start) : output);
  } catch (error) {
    failures.push(`could not parse JSON output from ${commandArgs.join(" ")}: ${error.message}`);
    return {};
  }
}

function runText(command, commandArgs) {
  const result = spawnSync(command, commandArgs, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024
  });
  if (result.status !== 0) {
    failures.push(`${command} ${commandArgs.join(" ")} exited with ${result.status}`);
    return "";
  }
  return result.stdout || "";
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const started = Date.now();
  try {
    const response = await fetch(`${url}${url.includes("?") ? "&" : "?"}renderDeployStatus=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal
    });
    const text = await response.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return {
      url,
      status: response.status,
      durationMs: Date.now() - started,
      json,
      bodyPreview: text.slice(0, 160)
    };
  } catch (error) {
    return {
      url,
      status: 0,
      durationMs: Date.now() - started,
      error: error.message || String(error),
      json: null,
      bodyPreview: ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeFetch(result) {
  return {
    url: result.url,
    status: result.status,
    durationMs: result.durationMs,
    ok: result.json?.ok === true,
    commit: clean(result.json?.commit),
    bodyPreview: result.bodyPreview,
    error: result.error || ""
  };
}

function resultPassed(summary, name) {
  return (summary.results || []).some((item) => item.name === name && item.status === "pass");
}

function allResultsPass(summary, prefix) {
  const results = (summary.results || []).filter((item) => String(item.name || "").startsWith(prefix));
  return results.length > 0 && results.every((item) => item.status === "pass");
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function readJsonIfExists(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    return null;
  }
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function clean(value) {
  return String(value || "").trim();
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}

function parseNonNegativeInteger(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 ? number : null;
}
