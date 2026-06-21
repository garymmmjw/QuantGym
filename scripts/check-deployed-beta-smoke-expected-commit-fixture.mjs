#!/usr/bin/env node

import { spawn, spawnSync } from "node:child_process";
import http from "node:http";

const headCommit = runText("git", ["rev-parse", "HEAD"]).trim();
const shortCommit = headCommit.slice(0, 7);

const apiServer = http.createServer((request, response) => {
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
      buildCommit: "${headCommit}",
      buildBranch: "main",
      buildSource: "fixture"
    };`);
    return;
  }
  if (request.url.startsWith("/version.json")) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ commit: headCommit, branch: "main", source: "fixture" }));
    return;
  }
  response.writeHead(200, { "Content-Type": "text/html" });
  response.end("<!doctype html><title>Expected Commit Fixture</title>");
});

await listen(betaServer);
betaOrigin = `http://127.0.0.1:${betaServer.address().port}`;

try {
  const cases = [
    { name: "HEAD", expectedCommit: "HEAD" },
    { name: "short SHA", expectedCommit: shortCommit }
  ];
  const results = [];
  for (const testCase of cases) {
    const result = await runChild(process.execPath, [
      "scripts/check-deployed-beta-smoke.mjs",
      "--base-url",
      betaOrigin,
      "--expected-commit",
      testCase.expectedCommit,
      "--readiness-only",
      "--readiness-timeout-ms",
      "500",
      "--readiness-interval-ms",
      "50",
      "--summary",
      `/tmp/quantgym-deployed-beta-smoke-expected-commit-${testCase.name.replace(/\W+/g, "-")}.json`
    ]);
    const output = `${result.stdout || ""}\n${result.stderr || ""}`.trim();
    const json = parseFirstJson(output);
    results.push({
      name: testCase.name,
      expectedCommit: testCase.expectedCommit,
      status: result.status,
      smokeStatus: json?.status || "",
      summaryExpectedCommit: json?.expectedCommit || "",
      versionCommit: json?.version?.commit || "",
      expectedCommitMatch: json?.version?.expectedCommitMatch,
      outputPreview: output.slice(0, 500)
    });
  }

  const checks = {
    headResolved: results.find((item) => item.name === "HEAD")?.expectedCommitMatch === true,
    shortShaResolved: results.find((item) => item.name === "short SHA")?.expectedCommitMatch === true,
    allExitedZero: results.every((item) => item.status === 0),
    summariesKeepFullCommit: results.every((item) => item.summaryExpectedCommit === headCommit)
  };
  const failures = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([name]) => name);
  const summary = {
    status: failures.length ? "fail" : "pass",
    headCommit,
    shortCommit,
    checks,
    results,
    failures
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

function runText(command, args) {
  const result = spawnSync(command, args, {
    cwd: new URL("..", import.meta.url).pathname,
    encoding: "utf8"
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed`);
  return result.stdout || "";
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
