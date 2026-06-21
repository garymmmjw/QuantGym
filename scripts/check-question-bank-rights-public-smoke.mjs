#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const summaryPath = getArgValue("--summary") || "docs/browser-audit-screenshots/335-question-bank-rights-public-smoke-summary.json";
const startedAt = Date.now();
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "quantgym-question-rights-"));
const failures = [];
const warnings = [];

try {
  const validApproval = makeApprovedPublicCommercial();
  const validPublic = runFixture("public", validApproval);
  expect(validPublic.status === 0, "Valid public approval fixture must pass public mode.");
  const validCommercial = runFixture("commercial", validApproval);
  expect(validCommercial.status === 0, "Valid commercial approval fixture must pass commercial mode.");

  const publicOnlyApproval = makeApprovedPublicCommercial({
    redistributionScope: ["public-web", "redistribution", "compiled-catalog", "derived-adaptation"]
  });
  const publicOnlyPublic = runFixture("public", publicOnlyApproval);
  expect(publicOnlyPublic.status === 0, "Public-only approval fixture must pass public mode.");
  const publicOnlyCommercial = runFixture("commercial", publicOnlyApproval);
  expect(publicOnlyCommercial.status !== 0, "Public-only approval fixture must fail commercial mode.");
  expect(failuresText(publicOnlyCommercial).includes("commercial-use"), "Commercial rejection must mention missing commercial-use scope.");

  const placeholderEvidence = runFixture("public", makeApprovedPublicCommercial({
    evidenceUrl: "https://example.com/permission"
  }));
  expect(placeholderEvidence.status !== 0, "Placeholder evidence URL fixture must fail public mode.");
  expect(/evidenceUrl/i.test(failuresText(placeholderEvidence)), "Placeholder evidence rejection must mention evidenceUrl.");

  const privateEvidence = runFixture("public", makeApprovedPublicCommercial({
    evidenceUrl: "https://192.168.45.9/permission"
  }));
  expect(privateEvidence.status !== 0, "Private-network evidence URL fixture must fail public mode.");
  expect(/private-network/i.test(failuresText(privateEvidence)), "Private-network evidence rejection must mention private-network.");

  const rawIpEvidence = runFixture("public", makeApprovedPublicCommercial({
    evidenceUrl: "https://8.8.8.8/evidence/approved-source-permission"
  }));
  expect(rawIpEvidence.status !== 0, "Raw-IP evidence URL fixture must fail public mode.");
  expect(/not an IP address/i.test(failuresText(rawIpEvidence)), "Raw-IP evidence rejection must mention IP address.");

  const embeddedCredentialEvidence = runFixture("public", makeApprovedPublicCommercial({
    evidenceUrl: "https://reviewer:secret@rights.quantgym.app/evidence/approved-source-permission"
  }));
  expect(embeddedCredentialEvidence.status !== 0, "Embedded-credential evidence URL fixture must fail public mode.");
  expect(/embedded credentials/i.test(failuresText(embeddedCredentialEvidence)), "Embedded-credential evidence rejection must mention embedded credentials.");

  const queryEvidence = runFixture("public", makeApprovedPublicCommercial({
    evidenceUrl: "https://rights.quantgym.app/evidence/approved-source-permission?token=leaky"
  }));
  expect(queryEvidence.status !== 0, "Query-bearing evidence URL fixture must fail public mode.");
  expect(/query strings or fragments/i.test(failuresText(queryEvidence)), "Query-bearing evidence rejection must mention query strings or fragments.");

  const staleApproval = runFixture("public", makeApprovedPublicCommercial({
    reviewedAt: "2020-01-01"
  }));
  expect(staleApproval.status !== 0, "Stale approval fixture must fail public mode.");
  expect(/older than/i.test(failuresText(staleApproval)), "Stale approval rejection must mention age.");

  const missingGrantor = runFixture("public", makeApprovedPublicCommercial({
    permissionGrantor: ""
  }));
  expect(missingGrantor.status !== 0, "Direct-permission approval without grantor must fail public mode.");
  expect(/permissionGrantor/i.test(failuresText(missingGrantor)), "Missing grantor rejection must mention permissionGrantor.");

  const internalGrantor = runFixture("public", makeApprovedPublicCommercial({
    permissionGrantor: "QuantGym Team"
  }));
  expect(internalGrantor.status !== 0, "Direct-permission approval from an internal QuantGym grantor must fail public mode.");
  expect(/external rights holder/i.test(failuresText(internalGrantor)), "Internal grantor rejection must mention external rights holder.");

  const unsupportedScope = runFixture("public", makeApprovedPublicCommercial({
    redistributionScope: ["public-web", "redistribution", "compiled-catalog", "derived-adaptation", "print-resale"]
  }));
  expect(unsupportedScope.status !== 0, "Unsupported scope fixture must fail public mode.");
  expect(/unsupported scope/i.test(failuresText(unsupportedScope)), "Unsupported scope rejection must mention unsupported scope.");

  const summary = {
    status: failures.length ? "fail" : "pass",
    durationMs: Date.now() - startedAt,
    checks: {
      validPublicPass: validPublic.status === 0,
      validCommercialPass: validCommercial.status === 0,
      publicOnlyPassesPublic: publicOnlyPublic.status === 0,
      publicOnlyRejectedCommercial: publicOnlyCommercial.status !== 0,
      publicOnlyCommercialMentionsScope: failuresText(publicOnlyCommercial).includes("commercial-use"),
      placeholderEvidenceRejected: placeholderEvidence.status !== 0,
      privateEvidenceRejected: privateEvidence.status !== 0,
      privateEvidenceMentionsPrivateNetwork: /private-network/i.test(failuresText(privateEvidence)),
      rawIpEvidenceRejected: rawIpEvidence.status !== 0,
      evidenceUrlEmbeddedCredentialsRejected: embeddedCredentialEvidence.status !== 0,
      evidenceUrlQueryRejected: queryEvidence.status !== 0,
      staleApprovalRejected: staleApproval.status !== 0,
      missingGrantorRejected: missingGrantor.status !== 0,
      internalGrantorRejected: internalGrantor.status !== 0,
      internalGrantorMentionsExternalRightsHolder: /external rights holder/i.test(failuresText(internalGrantor)),
      unsupportedScopeRejected: unsupportedScope.status !== 0
    },
    validApproval: summarizeRun(validCommercial),
    publicOnlyCommercialFailure: summarizeRun(publicOnlyCommercial),
    placeholderEvidenceFailure: summarizeRun(placeholderEvidence),
    privateEvidenceFailure: summarizeRun(privateEvidence),
    rawIpEvidenceFailure: summarizeRun(rawIpEvidence),
    embeddedCredentialEvidenceFailure: summarizeRun(embeddedCredentialEvidence),
    queryEvidenceFailure: summarizeRun(queryEvidence),
    staleApprovalFailure: summarizeRun(staleApproval),
    missingGrantorFailure: summarizeRun(missingGrantor),
    internalGrantorFailure: summarizeRun(internalGrantor),
    unsupportedScopeFailure: summarizeRun(unsupportedScope),
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  if (failures.length) process.exitCode = 1;
} catch (error) {
  fail(error?.stack || error?.message || String(error));
  const summary = {
    status: "fail",
    durationMs: Date.now() - startedAt,
    failures,
    warnings
  };
  writeSummary(summary);
  process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
  process.exitCode = 1;
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

function runFixture(mode, publicCommercial) {
  const fixtureRoot = path.join(tempRoot, `${mode}-${Date.now()}-${Math.random().toString(16).slice(2)}`);
  writeFixture(fixtureRoot, publicCommercial);
  const run = spawnSync(process.execPath, ["scripts/check-question-bank-rights.mjs", "--root", fixtureRoot, "--mode", mode], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 1024 * 1024 * 10
  });
  return {
    mode,
    status: run.status,
    stdout: run.stdout || "",
    stderr: run.stderr || "",
    data: parseLastJson(run.stdout || "")
  };
}

function writeFixture(fixtureRoot, publicCommercial) {
  const questionRoot = path.join(fixtureRoot, "data", "question-banks");
  const sourceDir = path.join(questionRoot, "approved-source");
  fs.mkdirSync(sourceDir, { recursive: true });
  const problems = [
    {
      id: "approved-source-problem-1",
      source: "approved-source",
      visibility: "public",
      titleEn: "Approved fixture probability question",
      titleZh: "Approved fixture probability question",
      category: "probabilityExpectation",
      difficulty: "Medium",
      tags: ["fixture", "rights"],
      promptEn: "Compute the expected value of a fair die roll.",
      promptZh: "Compute the expected value of a fair die roll.",
      answer: "3.5",
      explanation: "Average the six equally likely outcomes."
    },
    {
      id: "approved-source-problem-2",
      source: "approved-source",
      visibility: "public",
      titleEn: "Approved fixture option question",
      titleZh: "Approved fixture option question",
      category: "option",
      difficulty: "Medium",
      tags: ["fixture", "option"],
      promptEn: "Explain the sign of call delta.",
      promptZh: "Explain the sign of call delta.",
      answer: "Positive.",
      explanation: "A call option generally gains value as the underlying rises."
    }
  ];
  writeJson(path.join(sourceDir, "problems.json"), { problems });
  writeJson(path.join(sourceDir, "metadata.json"), {
    slug: "approved-source",
    name: "Approved Fixture Source",
    sourceUrl: "https://rights.quantgym.app/fixture-source",
    problemCount: problems.length
  });
  writeJson(path.join(questionRoot, "catalog-manifest.json"), {
    version: 1,
    sources: [
      {
        slug: "approved-source",
        name: "Approved Fixture Source",
        type: "fixture",
        sourceUrl: "https://rights.quantgym.app/fixture-source",
        problemFile: "approved-source/problems.json",
        problemCount: problems.length
      }
    ]
  });
  writeJson(path.join(questionRoot, "source-rights-manifest.json"), {
    version: 1,
    sources: [
      {
        slug: "approved-source",
        expectedActive: true,
        expectedProblemCount: problems.length,
        allowedCatalogVisibility: ["public"],
        privateBeta: {
          status: "allowed",
          basis: "Fixture source is allowed for the rights-check smoke.",
          reviewedBy: "rights-smoke",
          reviewedAt: today()
        },
        publicCommercial
      }
    ]
  });
  writeJson(path.join(fixtureRoot, "data", "problem-catalog.json"), { problems });
}

function makeApprovedPublicCommercial(overrides = {}) {
  return {
    status: "approved",
    basis: "Fixture direct permission explicitly covers QuantGym public and commercial redistribution.",
    reviewedBy: "rights-smoke",
    reviewedAt: today(),
    evidenceUrl: "https://rights.quantgym.app/evidence/approved-source-permission",
    approvalType: "direct-permission",
    permissionGrantor: "Fixture Rights Owner",
    redistributionScope: ["public-web", "redistribution", "compiled-catalog", "derived-adaptation", "commercial-use"],
    evidenceSummary: "Fixture permission states QuantGym may redistribute the normalized question package publicly and commercially inside the compiled catalog.",
    ...overrides
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function summarizeRun(run) {
  return {
    mode: run.mode,
    status: run.status === 0 ? "pass" : "fail",
    reportedStatus: run.data?.status || "",
    activeSources: run.data?.activeSources,
    rightsStatus: run.data?.rightsStatus || {},
    failures: Array.isArray(run.data?.failures) ? run.data.failures.slice(0, 6) : []
  };
}

function failuresText(run) {
  return JSON.stringify(run.data?.failures || []) + run.stderr + run.stdout;
}

function parseLastJson(text) {
  const trimmed = String(text || "").trim();
  for (let index = trimmed.lastIndexOf("{"); index >= 0; index = trimmed.lastIndexOf("{", index - 1)) {
    try {
      return JSON.parse(trimmed.slice(index));
    } catch {
      // Keep searching; nested JSON can precede the final object.
    }
  }
  return {};
}

function writeJson(file, payload) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(payload, null, 2)}\n`);
}

function writeSummary(summary) {
  if (!summaryPath) return;
  const absoluteSummaryPath = path.resolve(root, summaryPath);
  fs.mkdirSync(path.dirname(absoluteSummaryPath), { recursive: true });
  fs.writeFileSync(absoluteSummaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function fail(message) {
  failures.push(message);
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}
