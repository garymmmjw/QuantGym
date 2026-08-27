import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  PHASE2_APPLICATION_TABLE_COUNT,
  PHASE2_EVIDENCE_NAMESPACE,
  PHASE2_NEW_TABLES,
  PHASE2_RECOVERY_STATES,
  checkPhase2ContractSet,
  findSecretShapedContractKeys,
  loadPhase2ContractSet,
  validatePhase2ContractSet,
} from "../scripts/lib/frontend-upgrade-phase2-contracts.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkedIn = await loadPhase2ContractSet({ root });
const failuresAfter = (mutate) => {
  const fixture = structuredClone(checkedIn);
  mutate(fixture);
  return validatePhase2ContractSet(fixture);
};
const assertFailure = (failures, expected) => {
  assert.ok(
    failures.some((failure) => failure.includes(expected)),
    "expected failure containing " + JSON.stringify(expected) + ":\n" + failures.join("\n"),
  );
};

test("the checked-in aggregate contract set and Phase 1 evidence lock verify", async () => {
  assert.deepEqual(validatePhase2ContractSet(checkedIn), []);
  assert.deepEqual(await checkPhase2ContractSet({ root }), []);
  assert.equal(checkedIn.acceptanceManifest.targetGateCount, 76);
  assert.equal(checkedIn.acceptanceManifest.finalVisualCaseCount, 22);
  assert.equal(checkedIn.previewContract.routeOwnership.nativeRouteCount, 3);
  assert.equal(checkedIn.previewContract.routeOwnership.compatibilityRouteCount, 19);
  assert.equal(checkedIn.schemaContract.applicationTables.length, PHASE2_APPLICATION_TABLE_COUNT);
  assert.equal(checkedIn.phase1EvidenceLock.entryCount, 62);
});

test("the aggregate rejects missing, duplicate, extra, and legacy acceptance results", () => {
  let failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.gates.pop();
    fixture.acceptanceManifest.targetGateCount -= 1;
  });
  assertFailure(failures, "exactly 76 unique catalog IDs");

  failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.gates[1] = structuredClone(
      fixture.acceptanceManifest.gates[0],
    );
  });
  assertFailure(failures, "exactly 76 unique catalog IDs");

  failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.gates.push({
      ...structuredClone(fixture.acceptanceManifest.gates[0]),
      id: "e2e:phase2-unapproved-extra",
      resultSelector: 'results[id="e2e:phase2-unapproved-extra"]',
    });
    fixture.acceptanceManifest.targetGateCount += 1;
  });
  assertFailure(failures, "exactly 76 unique catalog IDs");

  failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.activationPolicy.legacyResultAllowed = true;
    fixture.acceptanceManifest.activationPolicy.allowedResultStatuses.push("legacy-baseline");
  });
  assertFailure(failures, "result activation policy mismatch");
  assertFailure(failures, "must reject legacyResultAllowed");
});

test("the aggregate binds the manifest exactly to catalog, surfaces, registry, and 390 evidence", () => {
  let failures = failuresAfter((fixture) => {
    const selected = fixture.acceptanceCatalog.entries.find(
      (entry) => entry.id === "mutation:problems.complete:retry",
    );
    selected.targetPhase = 3;
  });
  assertFailure(failures, "gate mapping mismatch");

  failures = failuresAfter((fixture) => {
    fixture.surfaceContracts.surfaces.find(
      (surface) => surface.id === "route:plan",
    ).mutations.pop();
  });
  assertFailure(failures, "mutation inventory mismatch");
  assertFailure(failures, "route contract mismatch");

  failures = failuresAfter((fixture) => {
    fixture.phaseRegistry.phases.find((phase) => phase.id === 2).routes.reverse();
  });
  assertFailure(failures, "exactly 3 registry routes");

  failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.evidenceOutputs[0] = (
      "docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json"
    );
  });
  assertFailure(failures, "outside 390 namespace");

  failures = failuresAfter((fixture) => {
    fixture.acceptanceManifest.finalVisualCases.pop();
    fixture.acceptanceManifest.finalVisualCaseCount = 21;
  });
  assertFailure(failures, "exactly 22 final visual cases");

  assert.deepEqual(checkedIn.acceptanceManifest.recoveryStates, PHASE2_RECOVERY_STATES);
  assert.equal(
    checkedIn.acceptanceManifest.evidenceNamespace.prefix,
    PHASE2_EVIDENCE_NAMESPACE,
  );
});

test("the aggregate locks the accepted Preview chain, resources, and 3 plus 19 route split", () => {
  let failures = failuresAfter((fixture) => {
    fixture.previewContract.commits.phase2AcceptanceAncestor = "0".repeat(40);
  });
  assertFailure(failures, "phase2AcceptanceAncestor mismatch");
  assertFailure(failures, "does not match Phase 1 evidence lock");

  failures = failuresAfter((fixture) => {
    fixture.previewContract.resources.pagesProject = "production-pages";
  });
  assertFailure(failures, "resources must match accepted Phase 1");

  failures = failuresAfter((fixture) => {
    fixture.previewContract.routeOwnership.compatibilityRoutes.pop();
    fixture.previewContract.routeOwnership.compatibilityRouteCount = 18;
  });
  assertFailure(failures, "3 native plus 19 compatibility");

  failures = failuresAfter((fixture) => {
    fixture.previewContract.isolation.dualWriteAllowed = true;
    fixture.previewContract.isolation.productionMutationAllowed = true;
  });
  assertFailure(failures, "must forbid dualWriteAllowed");
  assertFailure(failures, "must forbid productionMutationAllowed");

  failures = failuresAfter((fixture) => {
    fixture.previewContract.evidence.providerEvidenceMode = "0644";
    fixture.previewContract.evidence.providerEvidenceMaximumLifetimeDays = 8;
    fixture.previewContract.evidence.aggregateStatusCeiling = "accepted";
  });
  assertFailure(failures, "provider evidence policy mismatch");
});

test("the aggregate enforces 0002 rollback and the exact 9 plus 13 equals 22 schema", () => {
  assert.equal(checkedIn.phase1SchemaContract.applicationTables.length, 9);
  assert.deepEqual(
    checkedIn.schemaContract.newTables.map((table) => table.name),
    PHASE2_NEW_TABLES,
  );
  assert.equal(checkedIn.schemaContract.newTables.length, 13);
  assert.equal(checkedIn.schemaContract.applicationTables.length, 22);

  let failures = failuresAfter((fixture) => {
    fixture.schemaContract.newTables = fixture.schemaContract.newTables.filter(
      (table) => table.name !== "idempotency_records",
    );
    fixture.schemaContract.applicationTables = (
      fixture.schemaContract.applicationTables.filter(
        (table) => table !== "idempotency_records",
      )
    );
  });
  assertFailure(failures, "exactly 13 new application tables");
  assertFailure(failures, "exactly 22 application tables");

  failures = failuresAfter((fixture) => {
    fixture.schemaContract.revision.id = "0003_wrong";
    fixture.schemaContract.revision.downRevision = null;
  });
  assertFailure(failures, "exact 0002 with 0001 rollback");

  failures = failuresAfter((fixture) => {
    fixture.schemaContract.migrationRoundTrip.splice(2, 1);
  });
  assertFailure(failures, "upgrade/downgrade round-trip mismatch");

  failures = failuresAfter((fixture) => {
    fixture.schemaContract.phase1Foundation.contractSha256 = "0".repeat(64);
  });
  assertFailure(failures, "Phase 1 foundation relationship mismatch");

  failures = failuresAfter((fixture) => {
    fixture.schemaContract.appendOnlyPolicy.forbiddenServiceOperations = ["delete"];
    fixture.schemaContract.idempotencyPolicy.sameTransactionAsReward = false;
  });
  assertFailure(failures, "append-only ledger/event policy mismatch");
  assertFailure(failures, "completion idempotency policy mismatch");
});

test("the aggregate rejects a malformed evidence lock and secret-shaped contract fields", () => {
  let failures = failuresAfter((fixture) => {
    fixture.phase1EvidenceLock.entries[0].sha256 = "not-a-sha256";
  });
  assertFailure(failures, "Phase 1 evidence lock:");

  failures = failuresAfter((fixture) => {
    fixture.previewContract.resources.apiToken = "redacted";
    fixture.schemaContract.newTables[0].databaseUrl = "redacted";
  });
  assertFailure(failures, "secret-shaped contract field previewContract.resources.apiToken");
  assertFailure(
    failures,
    "secret-shaped contract field schemaContract.newTables[0].databaseUrl",
  );

  assert.deepEqual(findSecretShapedContractKeys({
    safeSha256: "0".repeat(64),
    providerEvidenceMode: "0600",
  }), []);
  assert.deepEqual(
    findSecretShapedContractKeys({ clientSecret: "redacted" }),
    ["secret-shaped contract field contract.clientSecret"],
  );
});
