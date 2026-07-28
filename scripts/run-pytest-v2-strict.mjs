#!/usr/bin/env node

import { execFile } from "node:child_process";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";

import { parseStrictPytestEvidence } from "./lib/frontend-upgrade-phase2-contract-evidence.mjs";
import {
  STRICT_API_PYTEST_TEST_COUNT,
  STRICT_API_PYTEST_TEST_FILES,
  assertExactStringInventory,
} from "./lib/frontend-upgrade-strict-test-inventory.mjs";

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function discoverStrictApiPytestFiles(repositoryRoot = root) {
  const files = [];
  const visit = async (relativeDirectory) => {
    const entries = await readdir(path.join(repositoryRoot, relativeDirectory), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      const relativePath = `${relativeDirectory}/${entry.name}`;
      if (entry.isDirectory()) await visit(relativePath);
      else if (entry.isFile() && /^test_[a-z0-9_]+\.py$/u.test(entry.name)) {
        files.push(relativePath);
      }
    }
  };
  await visit("api/tests");
  return Object.freeze(files.sort());
}

export async function runStrictApiPytest() {
  assertExactStringInventory({
    actual: await discoverStrictApiPytestFiles(root),
    expected: STRICT_API_PYTEST_TEST_FILES,
    label: "API pytest source files",
  });
  const python = process.env.QUANTGYM_PYTHON_313 ?? "python3.13";
  const temporaryDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-pytest-strict-"));
  const junitPath = path.join(temporaryDirectory, "pytest-junit.xml");
  let executionError;
  try {
    let stdout = "";
    let stderr = "";
    try {
      const result = await execFileAsync(python, [
        "-B",
        "-m",
        "pytest",
        "api/tests",
        "-ra",
        "--strict-config",
        "--strict-markers",
        `--junitxml=${junitPath}`,
      ], {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
        maxBuffer: 32 * 1024 * 1024,
      });
      stdout = result.stdout;
      stderr = result.stderr;
    } catch (error) {
      executionError = error;
      stdout = typeof error?.stdout === "string" ? error.stdout : "";
      stderr = typeof error?.stderr === "string" ? error.stderr : "";
    }
    process.stdout.write(stdout);
    process.stderr.write(stderr);
    const junitXml = await readFile(junitPath, "utf8").catch(() => "");
    const summary = parseStrictPytestEvidence({
      junitXml,
      stdout,
      stderr,
      expectedCount: STRICT_API_PYTEST_TEST_COUNT,
      expectedFiles: STRICT_API_PYTEST_TEST_FILES,
    });
    if (executionError) throw new Error("strict API pytest execution failed", {
      cause: executionError,
    });
    process.stdout.write(`Pytest strict gate passed: ${summary.tests} tests\n`);
    return summary;
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    await runStrictApiPytest();
  } catch (error) {
    process.stderr.write(`Strict pytest failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
