#!/usr/bin/env node

import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const startedAt = performance.now();
const keepTemp = process.argv.includes("--keep-temp");
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-render-llm-"));
const failures = [];
const results = [];

try {
  prepareFixture();
  await runCommand({
    label: "root npm install",
    cwd: tempRoot,
    command: npmCommand,
    args: ["install", "--no-audit", "--no-fund"],
    timeoutMs: 120000
  });
  await runCommand({
    label: "root undici import",
    cwd: tempRoot,
    command: process.execPath,
    args: ["-e", "import('undici')"],
    timeoutMs: 10000
  });

  await probeStartCommands("root", tempRoot, [
    { label: "npm start", command: npmCommand, args: ["--silent", "start"] },
    { label: "node server.mjs", command: process.execPath, args: ["server.mjs"] },
    { label: "node server.js", command: process.execPath, args: ["server.js"] },
    { label: "node index.js", command: process.execPath, args: ["index.js"] },
    { label: "node llm-proxy/server.mjs", command: process.execPath, args: ["llm-proxy/server.mjs"] }
  ]);

  const llmRoot = path.join(tempRoot, "llm-proxy");
  await runCommand({
    label: "llm-proxy npm install",
    cwd: llmRoot,
    command: npmCommand,
    args: ["install", "--no-audit", "--no-fund"],
    timeoutMs: 120000
  });
  await runCommand({
    label: "llm-proxy npm run build",
    cwd: llmRoot,
    command: npmCommand,
    args: ["--silent", "run", "build"],
    timeoutMs: 30000
  });
  await runCommand({
    label: "llm-proxy undici import",
    cwd: llmRoot,
    command: process.execPath,
    args: ["-e", "import('undici')"],
    timeoutMs: 10000
  });

  await probeStartCommands("llm-proxy", llmRoot, [
    { label: "npm start", command: npmCommand, args: ["--silent", "start"] },
    { label: "node server.mjs", command: process.execPath, args: ["server.mjs"] },
    { label: "node server.js", command: process.execPath, args: ["server.js"] },
    { label: "node index.js", command: process.execPath, args: ["index.js"] },
    { label: "node llm-proxy/server.mjs", command: process.execPath, args: ["llm-proxy/server.mjs"] }
  ]);
} finally {
  if (!keepTemp) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

const summary = {
  status: failures.length ? "fail" : "pass",
  durationMs: Math.round(performance.now() - startedAt),
  tempRoot: keepTemp ? tempRoot : undefined,
  checks: results.length,
  results,
  failures
};

console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exit(1);

function prepareFixture() {
  for (const file of [
    "package.json",
    "package-lock.json",
    ".node-version",
    "server.mjs",
    "server.js",
    "index.js"
  ]) {
    copyFile(file);
  }

  fs.cpSync(path.join(root, "llm-proxy"), path.join(tempRoot, "llm-proxy"), {
    recursive: true,
    filter(source) {
      return !source.split(path.sep).includes("node_modules");
    }
  });
}

function copyFile(relativePath) {
  const source = path.join(root, relativePath);
  const target = path.join(tempRoot, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.copyFileSync(source, target);
}

async function probeStartCommands(scope, cwd, commands) {
  for (const item of commands) {
    await probeStartCommand({
      label: `${scope} ${item.label}`,
      cwd,
      command: item.command,
      args: item.args
    });
  }
}

async function probeStartCommand({ label, cwd, command, args }) {
  const port = await getFreePort();
  const output = { stdout: "", stderr: "" };
  const child = spawn(command, args, {
    cwd,
    detached: process.platform !== "win32",
    env: {
      ...process.env,
      PORT: String(port),
      OPENAI_API_KEY: "render-compat-test-key",
      LLM_PROXY_HOST: "127.0.0.1",
      HOST: "127.0.0.1"
    },
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    output.stdout = trimOutput(output.stdout + chunk.toString("utf8"));
  });
  child.stderr.on("data", (chunk) => {
    output.stderr = trimOutput(output.stderr + chunk.toString("utf8"));
  });

  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  const deadline = Date.now() + 10000;
  let health = null;
  let exited = null;
  while (Date.now() < deadline) {
    exited = await Promise.race([
      exitPromise,
      sleep(0).then(() => null)
    ]);
    if (exited) break;
    health = await fetchHealth(port);
    if (health?.ok === true) break;
    await sleep(250);
  }

  await stopChild(child, exitPromise);

  if (health?.ok === true) {
    results.push({ name: label, status: "pass", port });
    return;
  }

  const reason = exited
    ? `process exited before health passed: code=${exited.code} signal=${exited.signal || ""}`
    : "health endpoint did not pass before timeout";
  const failure = {
    name: label,
    reason,
    stdout: output.stdout,
    stderr: output.stderr
  };
  failures.push(failure);
  results.push({ name: label, status: "fail", ...failure });
}

async function runCommand({ label, cwd, command, args, timeoutMs }) {
  const output = { stdout: "", stderr: "" };
  const child = spawn(command, args, {
    cwd,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  child.stdout.on("data", (chunk) => {
    output.stdout = trimOutput(output.stdout + chunk.toString("utf8"));
  });
  child.stderr.on("data", (chunk) => {
    output.stderr = trimOutput(output.stderr + chunk.toString("utf8"));
  });

  const exitPromise = new Promise((resolve) => {
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  const timeoutPromise = sleep(timeoutMs, { unref: true }).then(() => ({ timeout: true }));
  const outcome = await Promise.race([exitPromise, timeoutPromise]);

  if (outcome.timeout) {
    await stopChild(child, exitPromise);
    const failure = { name: label, reason: `timed out after ${timeoutMs}ms`, stdout: output.stdout, stderr: output.stderr };
    failures.push(failure);
    results.push({ name: label, status: "fail", ...failure });
    return;
  }

  if (outcome.code === 0) {
    results.push({ name: label, status: "pass" });
    return;
  }

  const failure = {
    name: label,
    reason: `exited with code=${outcome.code} signal=${outcome.signal || ""}`,
    stdout: output.stdout,
    stderr: output.stderr
  };
  failures.push(failure);
  results.push({ name: label, status: "fail", ...failure });
}

async function fetchHealth(port) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 1000);
  timer.unref();
  try {
    const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: controller.signal });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getFreePort() {
  return await new Promise((resolve, reject) => {
    const server = http.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function stopChild(child, exitPromise) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  signalChildTree(child, "SIGTERM");
  const outcome = await Promise.race([
    exitPromise,
    sleep(1000, { unref: true }).then(() => ({ timeout: true }))
  ]);
  if (outcome?.timeout && child.exitCode === null && child.signalCode === null) {
    signalChildTree(child, "SIGKILL");
    await exitPromise;
  }
}

function signalChildTree(child, signal) {
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // Fall through to signaling the direct child if the process group is gone.
    }
  }
  child.kill(signal);
}

function trimOutput(value) {
  const text = String(value || "");
  return text.length > 4000 ? text.slice(-4000) : text;
}

function sleep(ms, options = {}) {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, ms);
    if (options.unref === true) timer.unref();
  });
}
