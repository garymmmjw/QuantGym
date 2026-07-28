#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runPhase2ComponentEvidenceBuilder,
} from "./lib/frontend-upgrade-phase2-playwright-evidence.mjs";
import {
  runPhase2EvidenceBuilderWithProvenance,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const buildPhase2RecoveryEvidence = ({
  root = defaultRoot,
  ...options
} = {}) => runPhase2EvidenceBuilderWithProvenance({
  root: path.resolve(root),
  component: "recovery",
  runner: ({ root: isolatedRoot }) => runPhase2ComponentEvidenceBuilder({
    ...options,
    root: isolatedRoot,
    component: "recovery",
  }),
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPhase2RecoveryEvidence()
    .then(({ outputPath, summary }) => {
      process.stdout.write(JSON.stringify({
        check: summary.check,
        outputPath,
        resultCount: summary.counts.resultCount,
        status: summary.status,
      }) + "\n");
    })
    .catch((error) => {
      process.stderr.write(`Phase 2 recovery evidence failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
