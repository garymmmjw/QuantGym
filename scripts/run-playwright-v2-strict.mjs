#!/usr/bin/env node

import { execFile } from "node:child_process";
import { lstat, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { assertStrictPlaywrightReport } from "./lib/frontend-upgrade-strict-test-outcomes.mjs";
import {
  STRICT_PLAYWRIGHT_TEST_COUNTS,
} from "./lib/frontend-upgrade-strict-test-inventory.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_REPORT_BYTES = 64 * 1024 * 1024;

const sanitizeArguments = (argumentsList) => {
  const output = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--list" || argument.startsWith("--list=")) {
      throw new Error("strict Playwright execution cannot be replaced by list mode");
    }
    if (argument === "--reporter" || argument === "--retries") {
      const value = argumentsList[index + 1];
      if (argument === "--reporter" && value !== "json") {
        throw new Error("strict Playwright reporter must remain json");
      }
      if (argument === "--retries" && value !== "0") {
        throw new Error("strict Playwright retries must remain zero");
      }
      index += 1;
      continue;
    }
    if (argument.startsWith("--reporter=")) {
      if (argument !== "--reporter=json") {
        throw new Error("strict Playwright reporter must remain json");
      }
      continue;
    }
    if (argument.startsWith("--retries=")) {
      if (argument !== "--retries=0") {
        throw new Error("strict Playwright retries must remain zero");
      }
      continue;
    }
    output.push(argument);
  }
  return output;
};

const filterValues = (argumentsList, name) => {
  const values = [];
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === name) {
      const value = argumentsList[index + 1];
      if (typeof value !== "string" || value.length === 0 || value.startsWith("--")) {
        throw new Error(`${name} requires a non-empty value`);
      }
      values.push(value);
      index += 1;
      continue;
    }
    if (argument.startsWith(`${name}=`)) {
      const value = argument.slice(name.length + 1);
      if (value.length === 0) throw new Error(`${name} requires a non-empty value`);
      values.push(value);
    }
  }
  return values;
};

export const expectedCountFor = (argumentsList) => {
  const greps = filterValues(argumentsList, "--grep");
  const grepInverts = filterValues(argumentsList, "--grep-invert");
  if (greps.length === 0 && grepInverts.length === 0) {
    return STRICT_PLAYWRIGHT_TEST_COUNTS.full;
  }
  if (greps.length === 1 && grepInverts.length === 0) {
    if (greps[0] === "@visual:") return STRICT_PLAYWRIGHT_TEST_COUNTS.visual;
    if (greps[0] === "@phase2:") return STRICT_PLAYWRIGHT_TEST_COUNTS.phase2;
    if (greps[0] === "@e2e:phase2-performance") {
      return STRICT_PLAYWRIGHT_TEST_COUNTS.performance;
    }
  }
  if (greps.length === 0 && grepInverts.length === 1) {
    if (grepInverts[0] === "@visual:") return STRICT_PLAYWRIGHT_TEST_COUNTS.nonvisual;
    if (grepInverts[0] === "@phase2:") return STRICT_PLAYWRIGHT_TEST_COUNTS.nonphase2;
  }
  throw new Error("strict Playwright filter is not part of the frozen inventory");
};

export async function runStrictPlaywright(argumentsList = []) {
  const sanitized = sanitizeArguments(argumentsList);
  const expectedCount = expectedCountFor(sanitized);
  const providedReportPath = process.env.PLAYWRIGHT_JSON_OUTPUT_FILE;
  const temporaryDirectory = providedReportPath
    ? null
    : await mkdtemp(path.join(tmpdir(), "quantgym-playwright-strict-"));
  const reportPath = providedReportPath ?? path.join(temporaryDirectory, "playwright.json");
  let executionError;
  try {
    try {
      await execFileAsync(process.execPath, [
        path.join("node_modules", "playwright", "cli.js"),
        "test",
        "--config",
        "playwright.v2.config.ts",
        ...sanitized,
        "--reporter=json",
        "--retries=0",
      ], {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          PLAYWRIGHT_JSON_OUTPUT_FILE: reportPath,
        },
        maxBuffer: 16 * 1024 * 1024,
      });
    } catch (error) {
      executionError = error;
    }
    const metadata = await lstat(reportPath).catch(() => null);
    if (
      !metadata?.isFile()
      || metadata.isSymbolicLink()
      || metadata.size <= 0
      || metadata.size > MAX_REPORT_BYTES
    ) throw new Error("strict Playwright JSON report is missing or oversized", {
      cause: executionError,
    });
    let report;
    try {
      report = JSON.parse(await readFile(reportPath, "utf8"));
    } catch (error) {
      throw new Error("strict Playwright JSON report is invalid", { cause: error });
    }
    const summary = assertStrictPlaywrightReport(report, {
      expectedCount,
    });
    if (executionError) {
      throw new Error("strict Playwright execution failed", { cause: executionError });
    }
    process.stdout.write(`Playwright strict gate passed: ${summary.testCount} tests\n`);
    return summary;
  } finally {
    if (temporaryDirectory) {
      await rm(temporaryDirectory, { force: true, recursive: true });
    }
  }
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    await runStrictPlaywright(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Strict Playwright failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
