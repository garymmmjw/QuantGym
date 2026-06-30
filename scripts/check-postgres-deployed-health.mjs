#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const startedAt = Date.now();
const healthUrlValue = clean(
  getArgValue("--url")
  || process.env.QUANTGYM_POSTGRES_DEPLOYED_HEALTH_URL
  || "https://api.quantgym.app/api/health"
);
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/365-postgres-deployed-health-summary.json"
);
const timeoutMs = parsePositiveInteger(getArgValue("--timeout-ms"))
  || parsePositiveInteger(process.env.QUANTGYM_POSTGRES_DEPLOYED_HEALTH_TIMEOUT_MS)
  || 10000;

const failures = [];
const warnings = [];
const healthUrl = parseHealthUrl(healthUrlValue);
const summary = {
  id: 365,
  date: new Date().toISOString().slice(0, 10),
  surface: "deployed Postgres health",
  status: "fail",
  durationMs: 0,
  healthUrl: healthUrl ? healthUrl.href : healthUrlValue,
  responseStatus: 0,
  database: {},
  checks: {},
  failures,
  warnings
};

if (healthUrl) {
  await fetchHealth();
}

finalizeSummary();
writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.status === "fail") process.exitCode = 1;

async function fetchHealth() {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(healthUrl.href, {
      headers: {
        Accept: "application/json",
        "User-Agent": "QuantGymPostgresDeployedHealth/0.1"
      },
      signal: controller.signal
    });
    summary.responseStatus = response.status;
    const text = await response.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      fail(`Deployed health endpoint returned non-JSON HTTP ${response.status}.`);
    }
    if (data) {
      summary.healthOk = data.ok === true;
      summary.database = sanitizeDatabase(data.database);
      if (response.status !== 200) fail(`Deployed health endpoint returned HTTP ${response.status}.`);
      if (data.ok !== true) fail("Deployed health endpoint did not report ok=true.");
      if (!data.database || typeof data.database !== "object") fail("Deployed health endpoint did not include a database object.");
    }
  } catch (error) {
    fail(error?.name === "AbortError"
      ? `Deployed health request timed out after ${timeoutMs}ms.`
      : `Deployed health request failed: ${error?.message || String(error)}.`);
  } finally {
    clearTimeout(timer);
  }
}

function finalizeSummary() {
  const backend = clean(summary.database.backend).toLowerCase();
  const schemaTables = Number(summary.database.schemaTables || 0);
  summary.durationMs = Date.now() - startedAt;
  summary.checks = {
    healthUrlHttpsDns: healthUrl?.protocol === "https:" && isDnsHostname(healthUrl.hostname),
    publicApiHostProduction: healthUrl?.hostname === "api.quantgym.app",
    healthFetchOk: summary.responseStatus === 200,
    healthOk: summary.healthOk === true,
    databaseObjectPresent: Boolean(summary.database && Object.keys(summary.database).length),
    backendReported: Boolean(backend),
    deployedBackendPostgres: backend === "postgres",
    deployedBackendSqlite: backend === "sqlite",
    writableReported: typeof summary.database.writable === "boolean",
    foreignKeysReported: typeof summary.database.foreignKeys === "boolean" || backend === "postgres",
    schemaTablesReported: Number.isFinite(schemaTables) && schemaTables > 0,
    summaryRedacted: isSummaryRedacted(summary)
  };

  if (failures.length === 0 && !summary.checks.backendReported) fail("Deployed health database backend is missing.");
  if (failures.length === 0 && !["sqlite", "postgres"].includes(backend)) {
    fail(`Deployed health database backend is unexpected: ${backend || "(missing)"}.`);
  }

  if (failures.length) {
    summary.status = "fail";
    return;
  }

  if (backend === "postgres") {
    summary.status = "pass";
  } else {
    summary.status = "partial";
    warnings.push(`Deployed API is still using database.backend=${backend}; managed Postgres cutover is not active yet.`);
  }
}

function parseHealthUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    fail("Deployed Postgres health URL is not a valid URL.");
    return null;
  }
  if (url.protocol !== "https:") fail("Deployed Postgres health URL must use HTTPS.");
  if (url.hostname !== "api.quantgym.app") fail("Deployed Postgres health URL must target api.quantgym.app.");
  if (!isDnsHostname(url.hostname)) fail("Deployed Postgres health URL must use a DNS hostname, not an IP address.");
  if (url.username || url.password) fail("Deployed Postgres health URL must not include embedded credentials.");
  if (url.search || url.hash) fail("Deployed Postgres health URL must not include query strings or fragments.");
  if (url.pathname !== "/api/health") fail("Deployed Postgres health URL must target /api/health.");
  return url;
}

function sanitizeDatabase(database) {
  if (!database || typeof database !== "object") return {};
  return {
    backend: clean(database.backend).toLowerCase(),
    writable: typeof database.writable === "boolean" ? database.writable : null,
    foreignKeys: typeof database.foreignKeys === "boolean" ? database.foreignKeys : null,
    schemaTables: Number.isFinite(Number(database.schemaTables)) ? Number(database.schemaTables) : 0
  };
}

function isDnsHostname(hostname) {
  const host = clean(hostname).toLowerCase();
  if (!host || host === "localhost" || net.isIP(host)) return false;
  if (host.endsWith(".local")) return false;
  return /^[a-z0-9.-]+$/.test(host) && host.includes(".");
}

function isSummaryRedacted(data) {
  const raw = JSON.stringify(data);
  return !/eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/.test(raw)
    && !/postgres(?:ql)?:\/\/[^"\s]+:[^@\s]+@/i.test(raw)
    && !/"(?:password|token|secret|authorization)"\s*:/i.test(raw);
}

function parsePositiveInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1] || "";
  const prefix = `${name}=`;
  const found = args.find((arg) => arg.startsWith(prefix));
  return found ? found.slice(prefix.length) : "";
}

function clean(value) {
  return String(value || "").trim();
}

function fail(message) {
  const text = String(message || "Unknown deployed Postgres health failure.");
  if (!failures.includes(text)) failures.push(text);
}

function writeSummary(data) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(data, null, 2)}\n`);
}
