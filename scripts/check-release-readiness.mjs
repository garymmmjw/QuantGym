#!/usr/bin/env node

import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import vm from "node:vm";
import { spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const allowPartialProduction = args.includes("--allow-partial-production")
  || process.env.QUANTGYM_RELEASE_ALLOW_PARTIAL_PRODUCTION === "1";
const summaryPath = getArgValue("--summary");

const gates = [
  { name: "git diff --check", command: "git", args: ["diff", "--check"] },
  { name: "Stage 1", command: "npm", args: ["run", "check:stage1"] },
  { name: "Stage 2 bridge", command: "npm", args: ["run", "check:stage2"] },
  { name: "Stage 2 full", command: "npm", args: ["run", "check:stage2:full"] },
  { name: "Stage 2 strict", command: "npm", args: ["run", "check:stage2:strict"] },
  { name: "Browser evidence", command: "npm", args: ["run", "check:browser-evidence"], parseJson: true },
  {
    name: "Migration completion audit",
    command: "npm",
    args: ["run", "check:migration-completion"],
    parseJson: true,
    allowPartial: allowPartialProduction
  },
  { name: "Route integrity", command: "npm", args: ["run", "check:route-integrity"], parseJson: true },
  { name: "Route interactions", command: "npm", args: ["run", "check:route-interactions"], parseJson: true },
  { name: "Browser route smoke", command: "npm", args: ["run", "check:browser-route-smoke"], parseJson: true },
  { name: "Module ownership", command: "npm", args: ["run", "check:module-ownership"], parseJson: true },
  { name: "Chrome store readiness", command: "npm", args: ["run", "check:chrome-store-readiness"], parseJson: true },
  { name: "Chrome store publication fixture", command: "npm", args: ["run", "check:chrome-store-publication:fixture"], parseJson: true },
  { name: "Browser extension runtime smoke", command: "npm", args: ["run", "check:browser-extension:runtime-smoke"], parseJson: true },
  { name: "Media storage runtime smoke", command: "npm", args: ["run", "check:media-storage:runtime-smoke"], parseJson: true },
  { name: "Media storage production fixture", command: "npm", args: ["run", "check:media-storage:production-fixture"], parseJson: true },
  { name: "Ops alert runtime smoke", command: "npm", args: ["run", "check:ops-alerts:runtime-smoke"], parseJson: true },
  { name: "Ops alert production fixture", command: "npm", args: ["run", "check:ops-alerts:production-fixture"], parseJson: true },
  { name: "Jobs source runtime smoke", command: "npm", args: ["run", "check:jobs-source:runtime-smoke"], parseJson: true },
  { name: "Jobs source production fixture", command: "npm", args: ["run", "check:jobs-source:production-fixture"], parseJson: true },
  { name: "Jobs public ATS static feed", command: "npm", args: ["run", "check:jobs-feed:static"], parseJson: true },
  { name: "Question-bank rights", command: "npm", args: ["run", "check:question-bank-rights"], parseJson: true },
  { name: "Question-bank rights public smoke", command: "npm", args: ["run", "check:question-bank-rights:public-smoke"], parseJson: true },
  { name: "Question-bank rights release blockers", command: "npm", args: ["run", "check:question-bank-rights:release-blockers"], parseJson: true },
  { name: "Apex/WWW domain", command: "npm", args: ["run", "check:apex-www-domain"], parseJson: true },
  {
    name: "External launch blockers",
    command: "npm",
    args: ["run", "check:external-launch-blockers", "--", "--skip-release-summary-content"],
    parseJson: true
  },
  { name: "Postgres cutover export smoke", command: "npm", args: ["run", "check:postgres-cutover:export-smoke"], parseJson: true },
  { name: "Postgres cutover", command: "npm", args: ["run", "check:postgres-cutover"], parseJson: true },
  { name: "Static build", command: "npm", args: ["run", "build"] },
  {
    name: "Production boundaries",
    command: "npm",
    args: ["run", "verify:production-boundaries"],
    parseJson: true,
    allowPartial: allowPartialProduction,
    manageLocalBoundaryServices: true
  },
  { name: "UI contracts", command: "npm", args: ["run", "check:ui-contracts", "--", "--skip-release-summary-content"] }
];

const results = [];
for (const gate of gates) {
  results.push(await runGate(gate));
}
const failed = results.filter((item) => item.status === "fail");
const partial = results.filter((item) => item.status === "partial");
const summary = {
  status: failed.length ? "fail" : partial.length ? "partial" : "pass",
  allowPartialProduction,
  passed: results.filter((item) => item.status === "pass").length,
  partial: partial.length,
  failed: failed.length,
  results
};

const output = `${JSON.stringify(summary, null, 2)}\n`;
if (summaryPath) {
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, output);
}
process.stdout.write(output);

if (failed.length) process.exitCode = 1;

async function runGate(gate) {
  const startedAt = Date.now();
  let localBoundaryServices = null;
  let child = null;
  try {
    if (gate.manageLocalBoundaryServices) {
      localBoundaryServices = await maybeStartLocalBoundaryServices();
    }
    child = spawnSync(gate.command, gate.args, {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 1024 * 1024 * 20,
      env: process.env
    });
  } catch (error) {
    await stopManagedServices(localBoundaryServices);
    return {
      name: gate.name,
      status: "fail",
      durationMs: Date.now() - startedAt,
      exitCode: 1,
      error: error.message || String(error),
      data: summarizeManagedServices(localBoundaryServices)
    };
  } finally {
    await stopManagedServices(localBoundaryServices);
  }

  const durationMs = Date.now() - startedAt;
  const stdout = child?.stdout || "";
  const stderr = child?.stderr || "";
  const exitCode = typeof child?.status === "number" ? child.status : 1;
  const parsed = gate.parseJson ? parseLastJson(stdout) : null;
  const serviceData = summarizeManagedServices(localBoundaryServices);

  if (exitCode !== 0) {
    return {
      name: gate.name,
      status: "fail",
      durationMs,
      exitCode,
      error: child?.error?.message || firstNonEmptyLine(stderr, stdout) || `Exited with ${exitCode}`,
      data: serviceData,
      stdoutTail: tail(stdout),
      stderrTail: tail(stderr)
    };
  }

  if (parsed?.status === "fail" || parsed?.failed > 0) {
    return {
      name: gate.name,
      status: "fail",
      durationMs,
      exitCode,
      data: parsed,
      serviceData,
      error: "Nested check reported failure"
    };
  }

  if (parsed?.status === "partial" || parsed?.skipped > 0) {
    return {
      name: gate.name,
      status: gate.allowPartial ? "partial" : "fail",
      durationMs,
      exitCode,
      data: parsed,
      serviceData,
      error: gate.allowPartial ? undefined : "Nested check is partial; run with required production credentials"
    };
  }

  return {
    name: gate.name,
    status: "pass",
    durationMs,
    exitCode,
    data: parsed || summarizeStdout(stdout),
    serviceData
  };
}

async function maybeStartLocalBoundaryServices() {
  if (!allowPartialProduction) return null;
  if (process.env.QUANTGYM_RELEASE_MANAGE_LOCAL_BOUNDARY_SERVICES === "0") return null;

  const runtimeConfig = loadLocalRuntimeConfig();
  const apiEndpoint = clean(process.env.QUANTGYM_CLOUD_API_ENDPOINT || process.env.CLOUD_API_ENDPOINT || runtimeConfig.cloudApiEndpoint);
  const llmEndpoint = clean(process.env.QUANTGYM_LLM_ENDPOINT || process.env.LLM_ENDPOINT || runtimeConfig.llmEndpoint);
  const apiUrl = toUrl(apiEndpoint);
  const llmUrl = toUrl(llmEndpoint);
  if (!apiUrl || !llmUrl || !isLoopbackHost(apiUrl.hostname) || !isLoopbackHost(llmUrl.hostname)) {
    return null;
  }

  const services = {
    managed: true,
    api: {
      name: "QuantGym API",
      host: normalizeLoopbackHost(apiUrl.hostname),
      port: Number(apiUrl.port || defaultPort(apiUrl.protocol)),
      healthUrl: `${apiEndpoint.replace(/\/+$/, "")}/health`,
      alreadyRunning: false,
      started: false
    },
    llm: {
      name: "QuantGym LLM proxy",
      host: normalizeLoopbackHost(llmUrl.hostname),
      port: Number(llmUrl.port || defaultPort(llmUrl.protocol)),
      healthUrl: new URL("/health", llmUrl.origin).toString(),
      alreadyRunning: false,
      started: false
    }
  };

  await ensureLocalService(services.api, {
    command: "python3",
    args: ["api-server/server.py"],
    env: {
      ...process.env,
      PORT: String(services.api.port),
      QUANTGYM_HOST: services.api.host,
      QUANTGYM_REQUIRE_EMAIL_VERIFICATION: process.env.QUANTGYM_REQUIRE_EMAIL_VERIFICATION || "0",
      QUANTGYM_GOOGLE_CLIENT_ID: process.env.QUANTGYM_GOOGLE_CLIENT_ID || runtimeConfig.googleClientId || ""
    }
  });
  await ensureLocalService(services.llm, {
    command: process.execPath,
    args: ["llm-proxy/server.mjs"],
    env: {
      ...process.env,
      PORT: String(services.llm.port),
      LLM_PROXY_HOST: services.llm.host,
      LLM_AUTH_API_BASE: ""
    }
  });

  return services;
}

async function ensureLocalService(service, spec) {
  if (await isTcpListening(service.host, service.port)) {
    service.alreadyRunning = true;
    await waitForHttp(service.healthUrl, { service });
    return;
  }

  const child = spawn(spec.command, spec.args, {
    cwd: root,
    env: spec.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  service.child = child;
  service.started = true;
  service.stdout = "";
  service.stderr = "";
  child.stdout.on("data", (chunk) => {
    service.stdout = tail(`${service.stdout}${chunk}`, 4000);
  });
  child.stderr.on("data", (chunk) => {
    service.stderr = tail(`${service.stderr}${chunk}`, 4000);
  });
  child.once("exit", (code, signal) => {
    service.exit = { code, signal };
  });
  await waitForHttp(service.healthUrl, { service });
}

async function waitForHttp(url, options = {}) {
  const service = options.service || {};
  const deadline = Date.now() + 30000;
  let lastError = "";
  while (Date.now() < deadline) {
    if (service.exit) {
      throw new Error(`${service.name || "local service"} exited before becoming healthy: ${JSON.stringify(service.exit)} ${service.stderr || service.stdout || ""}`.trim());
    }
    let timeout = null;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), 1000);
      const response = await fetch(url, { signal: controller.signal });
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error.message || String(error);
    } finally {
      if (timeout) clearTimeout(timeout);
    }
    await delay(250);
  }
  throw new Error(`${service.name || "local service"} did not become healthy at ${url}: ${lastError}`);
}

async function stopManagedServices(services) {
  if (!services) return;
  await Promise.all([services.llm, services.api].map(stopManagedService));
}

async function stopManagedService(service) {
  if (!service?.started || !service.child || service.exit) return;
  await new Promise((resolve) => {
    const timeout = setTimeout(() => {
      try {
        service.child.kill("SIGKILL");
      } catch {
        // The process may already be gone.
      }
      resolve();
    }, 2000);
    service.child.once("exit", () => {
      clearTimeout(timeout);
      resolve();
    });
    try {
      service.child.kill("SIGTERM");
    } catch {
      clearTimeout(timeout);
      resolve();
    }
  });
}

function summarizeManagedServices(services) {
  if (!services) return undefined;
  return {
    api: summarizeManagedService(services.api),
    llm: summarizeManagedService(services.llm)
  };
}

function summarizeManagedService(service) {
  if (!service) return undefined;
  return {
    host: service.host,
    port: service.port,
    healthUrl: service.healthUrl,
    alreadyRunning: service.alreadyRunning,
    started: service.started,
    exit: service.exit,
    stdoutTail: service.stdout ? tail(service.stdout, 1000) : undefined,
    stderrTail: service.stderr ? tail(service.stderr, 1000) : undefined
  };
}

function loadLocalRuntimeConfig() {
  const configPath = path.join(root, "config.js");
  if (!fs.existsSync(configPath)) return {};
  try {
    const context = { window: {} };
    vm.createContext(context);
    vm.runInContext(fs.readFileSync(configPath, "utf8"), context, {
      filename: configPath,
      timeout: 1000
    });
    return context.window?.QUANTGYM_CONFIG || {};
  } catch {
    return {};
  }
}

function toUrl(value) {
  try {
    return value ? new URL(value) : null;
  } catch {
    return null;
  }
}

function isLoopbackHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "127.0.0.1" || host === "localhost" || host === "::1" || host === "[::1]";
}

function normalizeLoopbackHost(hostname) {
  const host = String(hostname || "").toLowerCase();
  return host === "::1" || host === "[::1]" ? "::1" : "127.0.0.1";
}

function defaultPort(protocol) {
  return protocol === "https:" ? 443 : 80;
}

function isTcpListening(host, port) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolve(value);
    };
    const socket = net.createConnection({ host, port });
    socket.setTimeout(500);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clean(value) {
  return String(value || "").trim();
}

function parseLastJson(text) {
  const trimmed = String(text || "").trim();
  for (let index = trimmed.lastIndexOf("{"); index >= 0; index = trimmed.lastIndexOf("{", index - 1)) {
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Keep searching; npm wrappers and nested JSON can precede the final object.
    }
  }
  return null;
}

function summarizeStdout(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.slice(-8);
}

function tail(text, max = 2000) {
  const value = String(text || "").trim();
  return value.length > max ? value.slice(-max) : value;
}

function firstNonEmptyLine(...values) {
  for (const value of values) {
    const line = String(value || "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(Boolean);
    if (line) return line;
  }
  return "";
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index === -1) return "";
  return args[index + 1] || "";
}
