#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  buildFrontendUpgradePhase2Review,
} from "./lib/frontend-upgrade-phase2-review.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let root = defaultRoot;
let expectedCommit;
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${argument} requires a value`);
  if (argument === "--root") root = path.resolve(value);
  else if (argument === "--expected-commit") expectedCommit = value;
  else throw new Error(`unsupported argument: ${argument}`);
  index += 1;
}

try {
  const result = await buildFrontendUpgradePhase2Review({ root, expectedCommit });
  console.log(JSON.stringify({
    status: result.status,
    output: path.relative(root, result.output),
    sha256: result.sha256,
  }, null, 2));
} catch {
  console.error("FAIL: Phase 2 review is not ready to generate");
  process.exitCode = 1;
}
