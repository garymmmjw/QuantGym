import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateAcceptanceCatalog,
  validateDesignSystemContract,
  validatePhaseRegistry,
  validateSurfaceContracts,
} from "./lib/frontend-upgrade-contracts.mjs";
import { APPROVED_ACCEPTANCE_POLICY } from "./lib/frontend-upgrade-approved-acceptance.mjs";
import { APPROVED_MUTATION_INVENTORY } from "./lib/frontend-upgrade-approved-mutations.mjs";
import { MODULE_MANIFEST } from "../src/modules/manifest.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = async (relativePath) => JSON.parse(
  await readFile(path.join(root, relativePath), "utf8"),
);

const [designSystem, phaseRegistry, surfaceContract, acceptanceCatalog, designManifest] = await Promise.all([
  readJson("docs/frontend-upgrade/design-system-contract.json"),
  readJson("docs/frontend-upgrade/phase-registry.json"),
  readJson("docs/frontend-upgrade/surface-contracts.json"),
  readJson("docs/frontend-upgrade/acceptance-catalog.json"),
  readJson("docs/ui-reference/playful-precision/source-manifest.json"),
]);

const manifestIds = MODULE_MANIFEST.map((item) => item.id);
const failures = [
  ...validateDesignSystemContract(designSystem),
  ...validatePhaseRegistry(phaseRegistry, manifestIds),
  ...validateSurfaceContracts(surfaceContract, phaseRegistry, designManifest, manifestIds),
  ...validateAcceptanceCatalog(acceptanceCatalog, surfaceContract),
];

if (failures.length > 0) {
  for (const failure of [...new Set(failures)]) console.error(`FAIL: ${failure}`);
  process.exitCode = 1;
} else {
  const routeCount = surfaceContract.surfaces.filter((surface) => surface.kind === "route").length;
  const systemCount = surfaceContract.surfaces.filter((surface) => surface.kind === "system").length;
  const sharedStates = APPROVED_ACCEPTANCE_POLICY.evidenceCases.sharedStates;
  console.log(
    `Frontend upgrade contracts valid: ${routeCount} routes, ${systemCount} systems, `
    + `${APPROVED_MUTATION_INVENTORY.length} mutations, ${acceptanceCatalog.entries.length} acceptance entries; `
    + `${APPROVED_ACCEPTANCE_POLICY.evidenceCases.routeMatrix.caseCount} route evidence cases, `
    + `${sharedStates.filter((item) => item.expectedStatus === "legacy-baseline").length} shared current, `
    + `${sharedStates.filter((item) => item.expectedStatus === "future-gate").length} shared future, `
    + `${APPROVED_ACCEPTANCE_POLICY.evidenceCases.coreFlows.length} core flows.`,
  );
}
