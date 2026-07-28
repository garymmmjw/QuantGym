#!/usr/bin/env node

import { lstat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runPhase2VisualEvidenceBuilder,
  runPhase2VisualEvidenceFinalizer,
  PHASE2_VISUAL_REVIEW_RECEIPT_PATH,
} from "./lib/frontend-upgrade-phase2-visual-evidence.mjs";
import {
  runPhase2EvidenceBuilderWithProvenance,
  runPhase2EvidenceInPlaceWithProvenance,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const receiptExists = async (root) => {
  try {
    const metadata = await lstat(path.join(root, PHASE2_VISUAL_REVIEW_RECEIPT_PATH));
    if (!metadata.isFile() || metadata.isSymbolicLink()) {
      throw new Error("Phase 2 visual review receipt exists but is unsafe");
    }
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") return false;
    throw error;
  }
};

export const buildPhase2VisualEvidence = async ({
  root = defaultRoot,
  ...options
} = {}) => {
  root = path.resolve(root);
  if (await receiptExists(root)) {
    return runPhase2EvidenceInPlaceWithProvenance({
      root,
      runner: () => runPhase2VisualEvidenceFinalizer({
        ...options,
        root,
      }),
    });
  }
  return runPhase2EvidenceBuilderWithProvenance({
    root,
    component: "visual",
    runner: ({ root: isolatedRoot }) => runPhase2VisualEvidenceBuilder({
      ...options,
      root: isolatedRoot,
    }),
  });
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPhase2VisualEvidence()
    .then(({ outputPath, summary }) => {
      process.stdout.write(JSON.stringify({
        check: summary.check,
        outputPath,
        resultCount: summary.counts.resultCount,
        status: summary.status,
        visualCaseCount: summary.visualCases.length,
      }) + "\n");
    })
    .catch((error) => {
      process.stderr.write(`Phase 2 visual evidence failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
