#!/usr/bin/env node

import {
  runPhase2PreviewCutover,
} from "./lib/frontend-upgrade-phase2-cutover-orchestrator.mjs";
import {
  createPhase2CutoverDryRunFixture,
  createPhase2CutoverFixtureClock,
  createPhase2CutoverFixtureCredentialRoles,
} from "./lib/frontend-upgrade-phase2-cutover-fixture.mjs";

let expectedCommit = "a".repeat(40);
for (let index = 2; index < process.argv.length; index += 1) {
  const argument = process.argv[index];
  if (argument === "--dry-run") continue;
  if (argument === "--expected-commit") {
    const value = process.argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error("--expected-commit requires a SHA");
    expectedCommit = value;
    index += 1;
    continue;
  }
  throw new Error(`unsupported argument: ${argument}`);
}

try {
  const calls = [];
  const facts = await runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit,
    actions: createPhase2CutoverDryRunFixture({
      expectedCommit,
      onAction: (name) => calls.push(name),
    }),
    credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  });
  console.log(JSON.stringify({
    status: "pass",
    mode: "dry-run",
    externalRequests: 0,
    applicationCommit: expectedCommit,
    orderedSteps: facts.cutoverSequence.map(({ id }) => id),
    actionCount: calls.length,
  }, null, 2));
} catch {
  console.error("FAIL: Phase 2 Preview cutover dry-run did not pass");
  process.exitCode = 1;
}
