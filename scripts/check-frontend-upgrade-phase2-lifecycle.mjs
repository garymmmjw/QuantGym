#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  classifyPhase2EvidenceLifecycle,
} from "./lib/frontend-upgrade-phase2-evidence-provenance.mjs";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const parseArguments = (argumentsList) => {
  let format = "json";
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
    if (argument === "--format") {
      const value = argumentsList[index + 1];
      if (!value || !["github", "json"].includes(value)) {
        throw new Error("--format requires github or json");
      }
      format = value;
      index += 1;
      continue;
    }
    throw new Error(`unsupported argument: ${argument}`);
  }
  return { format, root };
};

export const renderPhase2Lifecycle = (lifecycle, format = "json") => {
  if (format === "github") {
    return [
      `state=${lifecycle.state}`,
      `application_commit=${lifecycle.applicationCommit}`,
      `evidence_commit=${lifecycle.evidenceCommit ?? ""}`,
      `head_commit=${lifecycle.headCommit}`,
      `review_commit=${lifecycle.reviewCommit ?? ""}`,
      `evidence_output_count=${lifecycle.evidenceOutputCount}`,
    ].join("\n");
  }
  if (format !== "json") throw new Error("Phase 2 lifecycle format is invalid");
  return JSON.stringify(lifecycle, null, 2);
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const { format, root } = parseArguments(process.argv.slice(2));
    const lifecycle = await classifyPhase2EvidenceLifecycle({ root });
    process.stdout.write(`${renderPhase2Lifecycle(lifecycle, format)}\n`);
  } catch (error) {
    process.stderr.write(`FAIL: Phase 2 lifecycle classification failed: ${error.message}\n`);
    process.exitCode = 1;
  }
}
