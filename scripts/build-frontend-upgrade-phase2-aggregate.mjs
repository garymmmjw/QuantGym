#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  PHASE2_AGGREGATE_SUMMARY_RELATIVE,
  calculateFrontendUpgradePhase2Aggregate,
} from "./check-frontend-upgrade-phase2.mjs";
import {
  writeFileAtomicallyWithinTrustedRoot,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";
import {
  runPhase2EvidenceInPlaceWithProvenance,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildFrontendUpgradePhase2Aggregate({
  root = defaultRoot,
  nowMs = Date.now(),
} = {}) {
  root = path.resolve(root);
  return runPhase2EvidenceInPlaceWithProvenance({
    root,
    runner: async ({ applicationCommit }) => {
      const result = await calculateFrontendUpgradePhase2Aggregate({
        root,
        nowMs,
        expectedApplicationCommit: applicationCommit,
      });
      if (result.summary.status !== "ready-for-review") {
        throw new Error(
          `Phase 2 aggregate is not ready: ${result.summary.failureCodes.join(",")}`,
        );
      }
      await writeFileAtomicallyWithinTrustedRoot({
        root,
        relativePath: PHASE2_AGGREGATE_SUMMARY_RELATIVE,
        data: `${JSON.stringify(result.summary, null, 2)}\n`,
        mode: 0o644,
      });
      return result;
    },
  });
}

const parseArguments = (argumentsList) => {
  let root = defaultRoot;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--root requires a directory");
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${argument}`);
  }
  return { root };
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await buildFrontendUpgradePhase2Aggregate(
      parseArguments(process.argv.slice(2)),
    );
    console.log(JSON.stringify(result.summary, null, 2));
  } catch (error) {
    console.error(`FAIL: Phase 2 aggregate build failed: ${error.message}`);
    process.exitCode = 1;
  }
}
