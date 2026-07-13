import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validatePreviewContract } from "./lib/frontend-upgrade-preview-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootFlagIndex = process.argv.indexOf("--root");
if (rootFlagIndex >= 0 && !process.argv[rootFlagIndex + 1]) {
  throw new Error("--root requires a directory path");
}
const root = rootFlagIndex >= 0
  ? path.resolve(process.argv[rootFlagIndex + 1])
  : defaultRoot;

try {
  const source = await readFile(
    path.join(root, "docs/frontend-upgrade/preview-environment.json"),
    "utf8",
  );
  const contract = JSON.parse(source);
  const failures = validatePreviewContract(contract);

  if (failures.length > 0) {
    for (const failure of failures) console.error(`FAIL: ${failure}`);
    process.exitCode = 1;
  } else {
    console.log(
      "Preview environment contract valid: 5 isolated v2-preview resources; "
      + "live branch and provider checks deferred.",
    );
  }
} catch (error) {
  console.error(`FAIL: unable to validate Preview environment contract: ${error.message}`);
  process.exitCode = 1;
}
