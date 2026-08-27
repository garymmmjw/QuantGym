#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  buildFrontendUpgradePhase2ProviderEvidenceFromOperator,
} from "./lib/frontend-upgrade-phase2-provider-evidence.mjs";
import {
  isAuthenticPhase2ProductionOperatorAdapter,
} from "./lib/frontend-upgrade-phase2-operator-adapter.mjs";

export async function runFrontendUpgradePhase2ProviderEvidence({
  expectedCommit,
  operatorAdapter,
  clock,
} = {}) {
  if (!isAuthenticPhase2ProductionOperatorAdapter(operatorAdapter)) {
    throw new Error("the controlled operator action adapter is required");
  }
  return buildFrontendUpgradePhase2ProviderEvidenceFromOperator({
    expectedCommit,
    operatorAdapter,
    clock,
  });
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  // Provider mutation adapters are intentionally not selectable by a CLI path or module name.
  // The controlled operator runner must import runFrontendUpgradePhase2ProviderEvidence and pass
  // its in-memory adapter; this prevents an unreviewed module from receiving operator secrets.
  console.error(
    "FAIL: run through the controlled Phase 2 operator runner; no provider action adapter is accepted from CLI input",
  );
  process.exitCode = 1;
}
