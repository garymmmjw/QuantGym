import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { validatePreviewContract } from "./lib/frontend-upgrade-preview-contracts.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const rootFlagIndex = process.argv.indexOf("--root");
const rootValue = rootFlagIndex >= 0 ? process.argv[rootFlagIndex + 1] : defaultRoot;
const root = rootValue ? path.resolve(rootValue) : null;

if (root === null) {
  console.error("FAIL: --root requires a directory path");
  process.exitCode = 1;
} else {
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
}
