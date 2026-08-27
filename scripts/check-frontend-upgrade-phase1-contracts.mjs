import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PHASE0_EVIDENCE_LOCK_PATH,
  validatePhase1ContractSet,
  verifyPhase0EvidenceLock,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const argumentsList = process.argv.slice(2);
let root = defaultRoot;
if (argumentsList.length > 0) {
  if (argumentsList[0] !== "--root") {
    throw new Error(`unknown argument: ${argumentsList[0]}`);
  }
  if (!argumentsList[1] || argumentsList[1].startsWith("--")) {
    throw new Error("--root requires a directory path");
  }
  if (argumentsList.slice(2).includes("--root")) {
    throw new Error("--root may be provided only once");
  }
  if (argumentsList.length !== 2) {
    throw new Error(`trailing arguments are not allowed: ${argumentsList.slice(2).join(" ")}`);
  }
  root = path.resolve(argumentsList[1]);
}
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);

const evidenceLock = await readJson(PHASE0_EVIDENCE_LOCK_PATH);
const beforeFailures = await verifyPhase0EvidenceLock({ root, lock: evidenceLock });
const [previewContract, providerSchema, acceptanceManifest, schemaContract] = await Promise.all([
  readJson("docs/frontend-upgrade/phase-1-preview-contract.json"),
  readJson("docs/frontend-upgrade/phase-1-provider-evidence.schema.json"),
  readJson("docs/frontend-upgrade/phase-1-acceptance-manifest.json"),
  readJson("docs/frontend-upgrade/phase-1-schema-contract.json"),
]);
const contractFailures = validatePhase1ContractSet({
  evidenceLock,
  previewContract,
  providerSchema,
  acceptanceManifest,
  schemaContract,
});
const afterFailures = await verifyPhase0EvidenceLock({ root, lock: evidenceLock });
const failures = [...new Set([
  ...beforeFailures.map((failure) => `before: ${failure}`),
  ...contractFailures,
  ...afterFailures.map((failure) => `after: ${failure}`),
])];

if (failures.length > 0) {
  failures.forEach((failure) => console.error(`FAIL: ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Frontend upgrade Phase 1 contracts valid: ${acceptanceManifest.systemSurfaces.length} systems, `
    + `${acceptanceManifest.gates.length} gates, `
    + `${acceptanceManifest.activatedPhase0FutureStates.length} activated future states, `
    + `${schemaContract.applicationTables.length} application tables; `
    + `${evidenceLock.entryCount} Phase 0 files locked.`,
  );
}
