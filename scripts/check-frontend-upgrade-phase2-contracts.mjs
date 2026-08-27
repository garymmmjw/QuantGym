#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkPhase2ContractSet } from "./lib/frontend-upgrade-phase2-contracts.mjs";

const scriptRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
let root = scriptRoot;
for (let index = 0; index < args.length; index += 1) {
  const argument = args[index];
  if (argument === "--root") {
    const value = args[index + 1];
    if (!value || value.startsWith("-")) throw new Error("--root requires a path");
    root = path.resolve(value);
    index += 1;
    continue;
  }
  throw new Error("unsupported argument: " + argument);
}

try {
  const failures = await checkPhase2ContractSet({ root });
  if (failures.length > 0) {
    process.stderr.write(
      "Phase 2 contract check failed:\n"
      + failures.map((failure) => "- " + failure).join("\n")
      + "\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write(
      "Phase 2 contracts pass: 76 gates, 22 visual cases, "
      + "3 native routes, 19 compatibility routes, 22 application tables.\n",
    );
  }
} catch (error) {
  process.stderr.write("Phase 2 contract check failed: " + error.message + "\n");
  process.exitCode = 1;
}
