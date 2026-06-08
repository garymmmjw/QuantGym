#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
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
  { name: "UI contracts", command: "npm", args: ["run", "check:ui-contracts"] },
  { name: "Static build", command: "npm", args: ["run", "build"] },
  {
    name: "Production boundaries",
    command: "npm",
    args: ["run", "verify:production-boundaries"],
    parseJson: true,
    allowPartial: allowPartialProduction
  }
];

const results = gates.map(runGate);
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

function runGate(gate) {
  const startedAt = Date.now();
  const child = spawnSync(gate.command, gate.args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 20,
    env: process.env
  });
  const durationMs = Date.now() - startedAt;
  const stdout = child.stdout || "";
  const stderr = child.stderr || "";
  const exitCode = typeof child.status === "number" ? child.status : 1;
  const parsed = gate.parseJson ? parseLastJson(stdout) : null;

  if (exitCode !== 0) {
    return {
      name: gate.name,
      status: "fail",
      durationMs,
      exitCode,
      error: child.error?.message || firstNonEmptyLine(stderr, stdout) || `Exited with ${exitCode}`,
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
      error: gate.allowPartial ? undefined : "Nested check is partial; run with required production credentials"
    };
  }

  return {
    name: gate.name,
    status: "pass",
    durationMs,
    exitCode,
    data: parsed || summarizeStdout(stdout)
  };
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
