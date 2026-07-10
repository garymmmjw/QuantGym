import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildAcceptanceCatalog,
  validateAcceptanceCatalog,
  validateSurfaceContracts,
} from "./lib/frontend-upgrade-contracts.mjs";
import { MODULE_MANIFEST } from "../src/modules/manifest.js";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));

export async function buildFrontendUpgradeAcceptanceCatalog(root = defaultRoot) {
  const [surfaceContract, phaseRegistry, designManifest] = await Promise.all([
    readJson(path.join(root, "docs/frontend-upgrade/surface-contracts.json")),
    readJson(path.join(root, "docs/frontend-upgrade/phase-registry.json")),
    readJson(path.join(root, "docs/ui-reference/playful-precision/source-manifest.json")),
  ]);
  const manifestIds = MODULE_MANIFEST.map((item) => item.id);
  const surfaceFailures = validateSurfaceContracts(
    surfaceContract,
    phaseRegistry,
    designManifest,
    manifestIds,
  );
  if (surfaceFailures.length > 0) {
    throw new Error(`Cannot build acceptance catalog:\n${surfaceFailures.map((item) => `- ${item}`).join("\n")}`);
  }

  const catalog = buildAcceptanceCatalog(surfaceContract);
  const catalogFailures = validateAcceptanceCatalog(catalog, surfaceContract);
  if (catalogFailures.length > 0) {
    throw new Error(`Generated acceptance catalog is invalid:\n${catalogFailures.map((item) => `- ${item}`).join("\n")}`);
  }
  const output = path.join(root, "docs/frontend-upgrade/acceptance-catalog.json");
  await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  return { catalog, output };
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const { catalog, output } = await buildFrontendUpgradeAcceptanceCatalog();
    const legacyCount = catalog.entries.filter((entry) => entry.expectedStatus === "legacy-baseline").length;
    const futureCount = catalog.entries.filter((entry) => entry.expectedStatus === "future-gate").length;
    console.log(`Wrote ${path.relative(defaultRoot, output)} with ${catalog.entries.length} entries (${legacyCount} legacy-baseline, ${futureCount} future-gate).`);
  } catch (error) {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}
