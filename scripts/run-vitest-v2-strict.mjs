#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { assertStrictVitestReport } from "./lib/frontend-upgrade-strict-test-outcomes.mjs";
import {
  STRICT_VITEST_V2_FILE_COUNT,
  STRICT_VITEST_V2_SUITE_COUNT,
  STRICT_VITEST_V2_TEST_FILES,
  STRICT_VITEST_V2_TEST_COUNT,
} from "./lib/frontend-upgrade-strict-test-inventory.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_REPORT_BYTES = 32 * 1024 * 1024;

const sanitizedArguments = (argumentsList) => {
  if (!Array.isArray(argumentsList) || argumentsList.some((argument) => argument !== "--run")) {
    throw new Error("strict Vitest gate does not accept filters or overrides");
  }
  return [];
};

export async function runStrictVitest(argumentsList = []) {
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-vitest-strict-"));
  const reportPath = path.join(temporaryDirectory, "vitest.json");
  let executionError;
  try {
    try {
      await execFileAsync(process.execPath, [
        path.join("node_modules", "vitest", "vitest.mjs"),
        "--config",
        "vitest.v2.config.ts",
        "run",
        ...sanitizedArguments(argumentsList),
        "--reporter=json",
        `--outputFile=${reportPath}`,
      ], {
        cwd: root,
        encoding: "utf8",
        env: process.env,
        maxBuffer: 32 * 1024 * 1024,
      });
    } catch (error) {
      executionError = error;
    }
    const bytes = await readFile(reportPath).catch(() => null);
    if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_REPORT_BYTES) {
      throw new Error("strict Vitest JSON report is missing or oversized", {
        cause: executionError,
      });
    }
    let report;
    try {
      report = JSON.parse(bytes.toString("utf8"));
    } catch (error) {
      throw new Error("strict Vitest JSON report is invalid", { cause: error });
    }
    const summary = assertStrictVitestReport(report, {
      expectedCount: STRICT_VITEST_V2_TEST_COUNT,
      expectedFileCount: STRICT_VITEST_V2_FILE_COUNT,
      expectedFiles: STRICT_VITEST_V2_TEST_FILES,
      root,
      expectedSuiteCount: STRICT_VITEST_V2_SUITE_COUNT,
    });
    if (executionError) throw new Error("strict Vitest execution failed", { cause: executionError });
    process.stdout.write(`Vitest strict gate passed: ${summary.testCount} tests\n`);
    return summary;
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    await runStrictVitest(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Strict Vitest failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
