#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  checkPhase2ProviderEvidence,
} from "./lib/frontend-upgrade-phase2-provider-evidence.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let root = defaultRoot;
for (let index = 2; index < process.argv.length; index += 1) {
  if (process.argv[index] !== "--root") throw new Error("unsupported argument");
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) throw new Error("--root requires a directory");
  root = path.resolve(value);
  index += 1;
}

try {
  const result = await checkPhase2ProviderEvidence({ root });
  console.log(JSON.stringify({
    status: "pass",
    applicationCommit: result.evidence.applicationCommit,
    providerEvidenceSha256: result.sha256,
  }, null, 2));
} catch {
  console.error("FAIL: Phase 2 provider evidence did not pass");
  process.exitCode = 1;
}
