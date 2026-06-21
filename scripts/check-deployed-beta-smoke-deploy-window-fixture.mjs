#!/usr/bin/env node

import { spawn } from "node:child_process";
import http from "node:http";

const expectedCommit = "deploy-window-fixture-commit";
let apiAttempts = 0;

const apiServer = http.createServer((request, response) => {
  apiAttempts += 1;
  if (apiAttempts <= 2) {
    response.writeHead(502, { "Content-Type": "text/html" });
    response.end("<h1>Render deploy window</h1>");
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": betaOrigin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, Range"
    });
    response.end();
    return;
  }
  response.writeHead(200, { "Content-Type": "application/json" });
  response.end(JSON.stringify({ ok: true, database: { backend: "sqlite", writable: true } }));
});

await listen(apiServer);
const apiOrigin = `http://127.0.0.1:${apiServer.address().port}`;

let betaOrigin = "";
const betaServer = http.createServer((request, response) => {
  if (request.url.startsWith("/config.js")) {
    response.writeHead(200, { "Content-Type": "application/javascript" });
    response.end(`window.QUANTGYM_CONFIG = {
      cloudApiEndpoint: "${apiOrigin}/api",
      llmEndpoint: "https://llm.quantgym.app/interview",
      googleLoginEnabled: true,
      googleClientId: "fixture.apps.googleusercontent.com",
      buildCommit: "${expectedCommit}",
      buildBranch: "main",
      buildSource: "fixture"
    };`);
    return;
  }
  if (request.url.startsWith("/version.json")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ commit: expectedCommit, branch: "main", source: "fixture" }));
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end("<!doctype html><title>Fixture</title>");
});

await listen(betaServer);
betaOrigin = `http://127.0.0.1:${betaServer.address().port}`;

try {
  const result = await runChild(process.execPath, [
    "scripts/check-deployed-beta-smoke.mjs",
    "--base-url",
    betaOrigin,
    "--expected-commit",
    expectedCommit,
    "--readiness-only",
    "--readiness-timeout-ms",
    "12000",
    "--readiness-interval-ms",
    "100",
    "--summary",
    "/tmp/quantgym-deployed-beta-smoke-deploy-window-fixture.json"
  ]);
  const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
  const json = parseFirstJson(output);
  const checks = {
    exitedZero: result.status === 0,
    readinessPassed: json?.deployReadiness?.status === "pass",
    observedTransientFailure: Number(json?.deployReadiness?.apiHealth?.failedAttempts || 0) >= 1,
    apiRecovered: json?.deployReadiness?.apiHealth?.status === "pass",
    corsRecovered: json?.deployReadiness?.corsPreflight?.status === "pass",
    versionMatched: json?.version?.expectedCommitMatch === true
  };
  const failures = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([name]) => name);
  const summary = {
    status: failures.length ? "fail" : "pass",
    apiAttempts,
    checks,
    failures,
    childStatus: result.status,
    childOutputPreview: output.slice(0, 1000)
  };
  console.log(JSON.stringify(summary, null, 2));
  if (failures.length) process.exit(1);
} finally {
  await close(betaServer);
  await close(apiServer);
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
}

function close(server) {
  return new Promise((resolve) => server.close(resolve));
}

function runChild(command, childArgs) {
  return new Promise((resolve) => {
    const child = spawn(command, childArgs, {
      cwd: new URL("..", import.meta.url).pathname,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (status) => {
      resolve({ status, stdout, stderr });
    });
  });
}

function parseFirstJson(output) {
  const start = String(output || "").indexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(String(output).slice(start));
  } catch {
    return null;
  }
}
