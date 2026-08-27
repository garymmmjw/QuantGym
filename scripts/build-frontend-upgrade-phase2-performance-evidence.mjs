#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runPhase2PerformanceEvidenceBuilder,
} from "./lib/frontend-upgrade-phase2-performance-evidence.mjs";
import {
  runPhase2EvidenceBuilderWithProvenance,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const buildPhase2PerformanceEvidence = ({
  root = defaultRoot,
  ...options
} = {}) => runPhase2EvidenceBuilderWithProvenance({
  root: path.resolve(root),
  component: "performance",
  runner: ({ root: isolatedRoot }) => runPhase2PerformanceEvidenceBuilder({
    ...options,
    root: isolatedRoot,
  }),
});

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  buildPhase2PerformanceEvidence()
    .then(({ outputPath, summary }) => {
      process.stdout.write(JSON.stringify({
        check: summary.check,
        metrics: summary.metrics,
        outputPath,
        status: summary.status,
      }) + "\n");
    })
    .catch((error) => {
      process.stderr.write(`Phase 2 performance evidence failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
