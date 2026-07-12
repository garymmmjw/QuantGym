#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const allowlistPath = path.join(
  root,
  "docs/frontend-upgrade/expected-legacy-ui-contract-findings.json",
);
const summaryPath = path.join(
  root,
  "docs/browser-audit-screenshots/370-frontend-upgrade-legacy-ui-contract-summary.json",
);

export function parseUiContractFindings(output) {
  const findings = [];

  for (const line of String(output || "").split(/\r?\n/)) {
    if (!line.includes("✗")) continue;

    const marker = line.match(/^\s*✗\s+(.+?)\s*$/);
    if (!marker) {
      throw new Error(`Unparseable UI-contract finding: ${line.trim()}`);
    }

    const payload = marker[1];
    const missingArtifact = payload.match(
      /^missing screenshot artifact\s+(\S+)$/,
    );
    if (missingArtifact) {
      findings.push({
        path: missingArtifact[1],
        message: "missing screenshot artifact",
      });
      continue;
    }

    const pathAndMessage = payload.match(/^([^:]+):\s+(.+)$/);
    if (!pathAndMessage) {
      throw new Error(`Unparseable UI-contract finding: ${line.trim()}`);
    }

    findings.push({
      path: pathAndMessage[1],
      message: pathAndMessage[2],
    });
  }

  return findings;
}

export function classifyLegacyUiContractResult({
  exitCode,
  stdout = "",
  stderr = "",
  allowlist,
}) {
  if (exitCode !== 0 && exitCode !== 1) {
    throw new Error(
      `UI-contract command exit must be 0 or 1; received ${String(exitCode)}.`,
    );
  }

  const findings = parseUiContractFindings(`${stdout}\n${stderr}`);
  const entries = allowlist?.findings;
  if (!Array.isArray(entries)) {
    throw new Error("Legacy UI-contract allowlist findings must be an array.");
  }

  const matchedEntryIndexes = new Set();
  for (const finding of findings) {
    const entryIndex = entries.findIndex((entry) => (
      entry.path === finding.path
      && new RegExp(entry.message).test(finding.message)
    ));

    if (entryIndex < 0) {
      throw new Error(
        `Unexpected UI-contract finding: ${finding.path}: ${finding.message}`,
      );
    }
    matchedEntryIndexes.add(entryIndex);
  }

  if (exitCode === 1 && findings.length === 0) {
    throw new Error("UI-contract command exited 1 without any UI-contract findings.");
  }

  return {
    status: exitCode === 0 ? "pass" : "expected-legacy-findings",
    rawCommandExit: exitCode,
    findings,
    unusedAllowlistEntries: entries.filter(
      (_entry, index) => !matchedEntryIndexes.has(index),
    ),
  };
}

async function main() {
  const allowlistBytes = fs.readFileSync(allowlistPath);
  const allowlist = JSON.parse(allowlistBytes.toString("utf8"));
  if (allowlist.version !== 1) {
    throw new Error(`Unsupported legacy UI-contract allowlist version: ${allowlist.version}`);
  }
  if (allowlist.command !== "npm run check:ui-contracts") {
    throw new Error(`Unexpected legacy UI-contract command: ${allowlist.command}`);
  }

  const command = spawnSync("npm", ["run", "check:ui-contracts"], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (command.stdout) process.stdout.write(command.stdout);
  if (command.stderr) process.stderr.write(command.stderr);
  if (command.error) throw command.error;

  const classified = classifyLegacyUiContractResult({
    exitCode: command.status,
    stdout: command.stdout,
    stderr: command.stderr,
    allowlist,
  });
  const summary = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: classified.status,
    command: allowlist.command,
    rawCommandExit: classified.rawCommandExit,
    allowlistSha256: createHash("sha256").update(allowlistBytes).digest("hex"),
    findings: classified.findings,
    unusedAllowlistEntries: classified.unusedAllowlistEntries,
  };

  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  console.log(`Wrote ${path.relative(root, summaryPath)} (${summary.status}).`);
  if (summary.unusedAllowlistEntries.length) {
    console.warn(
      `Cleanup warning: ${summary.unusedAllowlistEntries.length} unused legacy UI-contract allowlist entries.`,
    );
  }
}

const invokedPath = process.argv[1]
  ? pathToFileURL(path.resolve(process.argv[1])).href
  : "";
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error?.stack || error?.message || String(error));
    process.exitCode = 1;
  });
}
