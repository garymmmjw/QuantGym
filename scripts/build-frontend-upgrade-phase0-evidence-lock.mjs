import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PHASE0_EVIDENCE_LOCK_PATH,
  buildPhase0EvidenceLock,
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let rootValue;
let checkOnly = false;
let printOnly = false;
const seen = new Set();
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--output") throw new Error("--output is not supported; the lock path is fixed");
  if (argument === "--root") {
    if (seen.has(argument)) throw new Error("--root may be provided only once");
    if (!process.argv[index + 1] || process.argv[index + 1].startsWith("--")) {
      throw new Error("--root requires a directory path");
    }
    seen.add(argument);
    rootValue = process.argv[index + 1];
    index += 1;
  } else if (argument === "--check" || argument === "--stdout") {
    if (seen.has(argument)) throw new Error(`${argument} may be provided only once`);
    seen.add(argument);
    if (argument === "--check") checkOnly = true;
    if (argument === "--stdout") printOnly = true;
  } else {
    throw new Error(`unknown argument: ${argument}`);
  }
}
const root = path.resolve(rootValue ?? defaultRoot);
const outputPath = path.resolve(root, PHASE0_EVIDENCE_LOCK_PATH);
if (checkOnly && printOnly) throw new Error("--check and --stdout cannot be combined");

const lock = await buildPhase0EvidenceLock({ root });
const serialized = `${JSON.stringify(lock, null, 2)}\n`;

if (printOnly) {
  process.stdout.write(serialized);
} else if (checkOnly) {
  const checkedIn = await readFile(outputPath, "utf8");
  if (checkedIn !== serialized) {
    console.error("FAIL: Phase 0 evidence lock differs from accepted tracked Git objects");
    process.exitCode = 1;
  } else {
    console.log(`Phase 0 evidence lock current: ${lock.entryCount} tracked files.`);
  }
} else {
  await writeFileAtomicallyWithinTrustedRoot({
    root,
    relativePath: PHASE0_EVIDENCE_LOCK_PATH,
    data: serialized,
    mode: 0o644,
  });
  console.log(`Wrote Phase 0 evidence lock for ${lock.entryCount} tracked files.`);
}
