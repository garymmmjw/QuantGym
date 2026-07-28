#!/usr/bin/env node

import { spawn } from "node:child_process";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseStrictUnittestOutput } from "./lib/frontend-upgrade-strict-test-outcomes.mjs";
import {
  STRICT_PHASE1_UNITTEST_TEST_COUNT,
  STRICT_PHASE1_UNITTEST_TEST_FILES,
  STRICT_PHASE1_UNITTEST_TEST_IDS,
  assertExactStringInventory,
} from "./lib/frontend-upgrade-strict-test-inventory.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;

export async function runStrictPhase1Unittest() {
  const discoveredFiles = (await readdir(path.join(root, "tests"), {
    withFileTypes: true,
  }))
    .filter((entry) => (
      entry.isFile()
      && entry.name.startsWith("test_frontend_upgrade_phase1_")
      && entry.name.endsWith(".py")
    ))
    .map((entry) => `tests/${entry.name}`)
    .sort();
  assertExactStringInventory({
    actual: discoveredFiles,
    expected: STRICT_PHASE1_UNITTEST_TEST_FILES,
    label: "Phase 1 unittest discover files",
  });
  const python = process.env.QUANTGYM_PYTHON_313 ?? "python3.13";
  const child = spawn(python, [
    "-B",
    "-m",
    "unittest",
    "discover",
    "-s",
    "tests",
    "-p",
    "test_frontend_upgrade_phase1_*.py",
    "-v",
  ], {
    cwd: root,
    env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    shell: false,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  let bytes = 0;
  for (const [stream, target] of [[child.stdout, stdout], [child.stderr, stderr]]) {
    stream.on("data", (chunk) => {
      bytes += chunk.length;
      if (bytes <= MAX_OUTPUT_BYTES) target.push(chunk);
    });
  }
  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode, signal) => resolve({ exitCode, signal }));
  });
  if (bytes > MAX_OUTPUT_BYTES) throw new Error("unittest strict output is oversized");
  const output = {
    stdout: Buffer.concat(stdout).toString("utf8"),
    stderr: Buffer.concat(stderr).toString("utf8"),
  };
  process.stdout.write(output.stdout);
  process.stderr.write(output.stderr);
  const summary = parseStrictUnittestOutput({
    ...output,
    expectedCount: STRICT_PHASE1_UNITTEST_TEST_COUNT,
    expectedTestIds: STRICT_PHASE1_UNITTEST_TEST_IDS,
  });
  if (result.exitCode !== 0 || result.signal !== null) {
    throw new Error("unittest strict execution failed");
  }
  return summary;
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    await runStrictPhase1Unittest();
  } catch (error) {
    process.stderr.write(`Strict unittest failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
