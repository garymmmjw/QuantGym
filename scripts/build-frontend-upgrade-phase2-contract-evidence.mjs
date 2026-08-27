#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  runPhase2ContractEvidencePipeline,
  writePhase2ContractSummary,
} from "./lib/frontend-upgrade-phase2-contract-evidence.mjs";
import {
  runPhase2EvidenceBuilderWithProvenance,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export async function buildPhase2ContractEvidence({
  root = defaultRoot,
  environment = process.env,
} = {}) {
  root = path.resolve(root);
  const pythonExecutable = environment.QUANTGYM_PYTHON_313;
  return runPhase2EvidenceBuilderWithProvenance({
    root,
    component: "contract",
    runner: async ({ root: isolatedRoot }) => {
      const { summary } = await runPhase2ContractEvidencePipeline({
        root: isolatedRoot,
        pythonExecutable,
      });
      const isolatedOutput = await writePhase2ContractSummary({
        root: isolatedRoot,
        summary,
      });
      return {
        output: path.join(root, path.relative(isolatedRoot, isolatedOutput)),
        summary,
      };
    },
  });
}

const parseArguments = (argumentsList) => {
  let root = defaultRoot;
  for (let index = 0; index < argumentsList.length; index += 1) {
    const argument = argumentsList[index];
    if (argument === "--root") {
      const value = argumentsList[index + 1];
      if (!value || value.startsWith("-")) throw new Error("--root requires a path");
      root = path.resolve(value);
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${argument}`);
  }
  return { root };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  Promise.resolve()
    .then(() => parseArguments(process.argv.slice(2)))
    .then((options) => buildPhase2ContractEvidence(options))
    .then(({ output, summary }) => {
      process.stdout.write(JSON.stringify({
        check: summary.check,
        commandCount: summary.metrics.commandCount,
        output,
        status: summary.status,
      }) + "\n");
    })
    .catch((error) => {
      process.stderr.write(`Phase 2 contract evidence failed: ${error.message}\n`);
      process.exitCode = 1;
    });
}
