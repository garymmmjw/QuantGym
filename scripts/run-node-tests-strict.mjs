#!/usr/bin/env node

import { spawn } from "node:child_process";
import { lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { parseStrictNodeTap } from "./lib/frontend-upgrade-strict-test-outcomes.mjs";
import {
  STRICT_BUILD_ISOLATION_NODE_TEST_COUNT,
  STRICT_BUILD_ISOLATION_NODE_TEST_FILES,
  STRICT_DESIGN_SYSTEM_NODE_TEST_COUNT,
  STRICT_DESIGN_SYSTEM_NODE_TEST_FILES,
  STRICT_PHASE1_NODE_TEST_COUNT,
  STRICT_PHASE1_NODE_TEST_FILES,
  STRICT_PHASE2_NODE_TEST_COUNT,
  STRICT_PHASE2_NODE_TEST_FILES,
  assertExactStringInventory,
} from "./lib/frontend-upgrade-strict-test-inventory.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MAX_OUTPUT_BYTES = 32 * 1024 * 1024;
const parseArguments = (argumentsList) => {
  const files = [];
  let prefix = null;
  let concurrency = "1";
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (["--file", "--prefix", "--test-concurrency"].includes(argument)) {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
      if (argument === "--file") files.push(value);
      if (argument === "--prefix") prefix = value;
      if (argument === "--test-concurrency") concurrency = value;
      index += 1;
      continue;
    }
    throw new Error(`unsupported strict Node test argument: ${argument}`);
  }
  if ((prefix === null) === (files.length === 0)) {
    throw new Error("strict Node tests require exactly one of --prefix or --file");
  }
  return { concurrency, files, prefix };
};

const discoverPrefixFiles = async ({ prefix, root }) => (
  (await readdir(path.join(root, "tests"), { withFileTypes: true }))
    .filter((entry) => (
      entry.isFile()
      && entry.name.startsWith(prefix)
      && entry.name.endsWith(".test.mjs")
    ))
    .map((entry) => `tests/${entry.name}`)
    .sort()
);

const gateForArguments = ({ files, prefix }) => {
  if (prefix === "frontend-upgrade-phase1" && files.length === 0) {
    return {
      expectedCount: STRICT_PHASE1_NODE_TEST_COUNT,
      expectedFiles: STRICT_PHASE1_NODE_TEST_FILES,
      label: "Phase 1 Node tests",
    };
  }
  if (prefix === "frontend-upgrade-phase2" && files.length === 0) {
    return {
      expectedCount: STRICT_PHASE2_NODE_TEST_COUNT,
      expectedFiles: STRICT_PHASE2_NODE_TEST_FILES,
      label: "Phase 2 Node tests",
    };
  }
  if (
    prefix === null
    && files.length === 1
    && files[0] === STRICT_DESIGN_SYSTEM_NODE_TEST_FILES[0]
  ) return {
    expectedCount: STRICT_DESIGN_SYSTEM_NODE_TEST_COUNT,
    expectedFiles: STRICT_DESIGN_SYSTEM_NODE_TEST_FILES,
    label: "design-system Node tests",
  };
  if (
    prefix === null
    && files.length === 1
    && files[0] === STRICT_BUILD_ISOLATION_NODE_TEST_FILES[0]
  ) return {
    expectedCount: STRICT_BUILD_ISOLATION_NODE_TEST_COUNT,
    expectedFiles: STRICT_BUILD_ISOLATION_NODE_TEST_FILES,
    label: "build-isolation Node tests",
  };
  throw new Error("strict Node test invocation is outside the frozen gate inventory");
};

export const resolveStrictNodeGate = async (argumentsList, { root = defaultRoot } = {}) => {
  const parsed = parseArguments(argumentsList);
  if (parsed.concurrency !== "1") {
    throw new Error("strict Node tests require test concurrency 1");
  }
  const gate = gateForArguments(parsed);
  if (!Number.isSafeInteger(gate.expectedCount) || gate.expectedCount <= 0) {
    throw new Error(`${gate.label} exact test count is not frozen`);
  }
  const files = parsed.prefix === null
    ? [...parsed.files]
    : await discoverPrefixFiles({ prefix: parsed.prefix, root });
  if (files.length === 0) throw new Error("strict Node test inventory is empty");
  assertExactStringInventory({
    actual: files,
    expected: gate.expectedFiles,
    label: gate.label,
  });
  const modes = await Promise.all(files.map(async (file) => (
    (await lstat(path.join(root, file))).isFile()
  )));
  if (modes.some((isFile) => !isFile)) throw new Error(`${gate.label} contains a non-regular file`);
  return Object.freeze({ ...gate, files: Object.freeze(files), parsed });
};

export const runStrictNodeTests = async (argumentsList) => {
  const gate = await resolveStrictNodeGate(argumentsList);
  const child = spawn(process.execPath, [
    "--test",
    "--test-reporter=tap",
    `--test-concurrency=${gate.parsed.concurrency}`,
    ...gate.files,
  ], {
    cwd: defaultRoot,
    env: process.env,
    shell: false,
    stdio: ["ignore", "pipe", "inherit"],
  });
  const chunks = [];
  let bytes = 0;
  child.stdout.on("data", (chunk) => {
    bytes += chunk.length;
    if (bytes <= MAX_OUTPUT_BYTES) chunks.push(chunk);
  });
  const exitCode = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code, signal) => {
      if (signal !== null) reject(new Error(`strict Node tests terminated by ${signal}`));
      else resolve(code);
    });
  });
  if (bytes > MAX_OUTPUT_BYTES) throw new Error("strict Node TAP report is oversized");
  const tap = Buffer.concat(chunks).toString("utf8");
  process.stdout.write(tap);
  const summary = parseStrictNodeTap(tap, { expectedCount: gate.expectedCount });
  if (exitCode !== 0) throw new Error("strict Node tests failed");
  return summary;
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    await runStrictNodeTests(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`Strict Node tests failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
