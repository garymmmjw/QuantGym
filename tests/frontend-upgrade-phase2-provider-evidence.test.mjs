import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  Phase2CutoverFailure,
  finalizePhase2TerminalRevocationIntent,
  runPhase2PreviewCutover,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-orchestrator.mjs";
import {
  createPhase2CutoverDryRunFixture,
  createPhase2CutoverFixtureClock,
  createPhase2CutoverFixtureCredentialRoles,
} from "../scripts/lib/frontend-upgrade-phase2-cutover-fixture.mjs";
import {
  PHASE2_CUTOVER_STEP_IDS,
  PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
  PHASE2_PROVIDER_EVIDENCE_PATH,
  PHASE2_PROVIDER_SCHEMA_PATH,
  TEST_ONLY_PHASE2_PROVIDER_EVIDENCE,
  buildFrontendUpgradePhase2ProviderEvidence,
  checkPhase2ProviderEvidence,
  resumeFrontendUpgradePhase2ProviderEvidenceFinalization,
  validatePhase2CredentialRoles,
  validatePhase2ProviderEvidence,
  validatePhase2ProviderEvidenceSchema,
} from "../scripts/lib/frontend-upgrade-phase2-provider-evidence.mjs";

process.env.NODE_ENV = "test";
const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const COMMIT = "a".repeat(40);
const NOW = new Date("2026-07-27T02:00:00.000Z");
const RAW_SECRET = "fixture-provider-secret-never-persist";
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

const makeCredentialRoles = () => createPhase2CutoverFixtureCredentialRoles();

const makeFacts = ({ actions, clock } = {}) => runPhase2PreviewCutover({
  mode: "dry-run",
  expectedCommit: COMMIT,
  actions: actions ?? createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }),
  credentialRoles: makeCredentialRoles(),
  clock: clock ?? createPhase2CutoverFixtureClock(),
});

const makeEvidence = async () => ({
  schemaVersion: 1,
  phase: 2,
  status: "pass",
  capturedAt: NOW.toISOString(),
  expiresAt: new Date(NOW.getTime() + 7 * 24 * 60 * 60 * 1_000).toISOString(),
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  applicationCommit: COMMIT,
  governance: {
    operator: "Gary",
    budgetOwner: "Gary",
    dataResetOwner: "Gary",
    destroyOwner: "Gary",
    reviewDate: "2026-07-29",
  },
  capture: {
    authenticated: true,
    inputSource: "operator-environment",
    rawResponsesPersisted: false,
    journalTrustBoundary: structuredClone(
      PHASE2_RECOVERY_JOURNAL_TRUST_BOUNDARY,
    ),
  },
  ...await makeFacts(),
});

const createRoot = async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-provider-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  const schemaTarget = path.join(root, PHASE2_PROVIDER_SCHEMA_PATH);
  await mkdir(path.dirname(schemaTarget), { recursive: true });
  await writeFile(
    schemaTarget,
    await readFile(path.join(repositoryRoot, PHASE2_PROVIDER_SCHEMA_PATH)),
  );
  return root;
};

const buildFixture = async (t, collectFacts = async () => makeFacts()) => {
  const root = await createRoot(t);
  const result = await buildFrontendUpgradePhase2ProviderEvidence({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
      root,
      credentialRoles: makeCredentialRoles(),
      now: NOW,
      collectFacts,
    },
  });
  return { root, result };
};

const expectFailure = (evidence, fragment) => {
  const failures = validatePhase2ProviderEvidence(evidence, {
    expectedCommit: COMMIT,
    nowMs: NOW.getTime(),
  });
  assert.ok(
    failures.some((failure) => failure.includes(fragment)),
    `expected ${JSON.stringify(fragment)} in:\n${failures.join("\n")}`,
  );
};

const writeFinalizationJournal = async ({
  journalPath,
  facts,
  status,
  evidenceSha256,
  controlRenderRevoked = true,
}) => {
  await writeFile(journalPath, `${JSON.stringify({
    schemaVersion: 6,
    expectedCommit: COMMIT,
    controlRenderRevoked,
    backup: null,
    finalization: {
      status,
      capturedAt: NOW.toISOString(),
      facts,
      factsSha256: sha256(canonicalJson(facts)),
      evidenceSha256,
    },
  })}\n`, { mode: 0o600 });
  await chmod(journalPath, 0o600);
};

const expectCutoverFailure = async (promise, assertions) => assert.rejects(
  promise,
  (error) => {
    assert.ok(error instanceof Phase2CutoverFailure);
    assert.equal(error.failureReport.status, "failed");
    assert.equal(error.failureReport.productionMutation, false);
    assertions(error.failureReport);
    return true;
  },
);

test("checked-in schema and a complete dry-run evidence document pass", async () => {
  const schema = JSON.parse(await readFile(
    path.join(repositoryRoot, PHASE2_PROVIDER_SCHEMA_PATH),
    "utf8",
  ));
  assert.deepEqual(validatePhase2ProviderEvidenceSchema(schema), []);
  const evidence = await makeEvidence();
  assert.deepEqual(validatePhase2ProviderEvidence(evidence, {
    expectedCommit: COMMIT,
    nowMs: NOW.getTime(),
  }), []);
  assert.equal(
    evidence.postRevokeContinuity.checkedAt,
    evidence.postRevokeContinuity.renderTopologyObservation.observedAt,
  );
  assert.equal(
    evidence.postRevokeContinuity.renderTopologyObservation.timing,
    "before-terminal-control-revocation",
  );
  assert.equal(
    evidence.postRevokeContinuity.renderTopologyObservation
      .reobservedAfterTerminalRevocation,
    false,
  );
  assert.equal(
    evidence.postRevokeContinuity.terminalRevocationCompletedAt,
    evidence.cutoverSequence.at(-1).completedAt,
  );
  assert.equal(
    Date.parse(evidence.postRevokeContinuity.terminalRevocationCompletedAt)
      - Date.parse(evidence.postRevokeContinuity.checkedAt),
    evidence.postRevokeContinuity.continuityToTerminalRevocationMs,
  );
});

test("dry-run enforces candidate gate, full cutover order, and final mutation revoke", async () => {
  const calls = [];
  const facts = await runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions: createPhase2CutoverDryRunFixture({
      expectedCommit: COMMIT,
      onAction: (name) => calls.push(name),
    }),
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  });
  assert.deepEqual(facts.cutoverSequence.map(({ id }) => id), PHASE2_CUTOVER_STEP_IDS);
  assert.deepEqual(calls, [
    "candidateGate",
    "preflight",
    "inspectTopology:before",
    "backup",
    "proveRestore",
    "destroyRestoreTarget",
    "migrate",
    "deployApi",
    "deployPages",
    "seedAcceptanceData",
    "runLiveChecks",
    "cleanup",
    "inspectTopology:after",
    "inspectPullRequest",
    "revokeTemporaryAccess",
    "verifyPostRevokeContinuity",
  ]);
  assert.equal(
    calls.indexOf("revokeTemporaryAccess") > calls.indexOf("inspectPullRequest"),
    true,
  );
  assert.equal(calls.indexOf("preflight") > calls.indexOf("candidateGate"), true);
  assert.equal(
    calls.indexOf("verifyPostRevokeContinuity") > calls.indexOf("revokeTemporaryAccess"),
    true,
  );
});

test("control and mutation descriptors are separated across every action context", async () => {
  const credentialRoles = makeCredentialRoles();
  const contexts = new Map();
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  for (const name of [
    "candidateGate",
    "preflight",
    "inspectTopology",
    "backup",
    "proveRestore",
    "destroyRestoreTarget",
    "migrate",
    "deployApi",
    "deployPages",
    "seedAcceptanceData",
    "runLiveChecks",
    "cleanup",
    "revokeTemporaryAccess",
    "inspectPullRequest",
    "verifyPostRevokeContinuity",
  ]) {
    const original = actions[name];
    actions[name] = async (context) => {
      contexts.set(name, [...(contexts.get(name) ?? []), context]);
      return original(context);
    };
  }
  await runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles,
    clock: createPhase2CutoverFixtureClock(),
  });
  for (const name of [
    "candidateGate",
    "preflight",
    "inspectTopology",
    "inspectPullRequest",
    "verifyPostRevokeContinuity",
  ]) {
    for (const context of contexts.get(name)) {
      assert.deepEqual(context.credentialRole, credentialRoles.control, name);
      assert.equal(JSON.stringify(context).includes(RAW_SECRET), false, name);
    }
  }
  for (const name of [
    "backup",
    "proveRestore",
    "destroyRestoreTarget",
    "migrate",
    "deployApi",
    "deployPages",
    "seedAcceptanceData",
    "runLiveChecks",
    "cleanup",
    "revokeTemporaryAccess",
  ]) {
    for (const context of contexts.get(name)) {
      assert.deepEqual(context.credentialRole, credentialRoles.mutation, name);
      assert.equal(JSON.stringify(context).includes(RAW_SECRET), false, name);
    }
  }
});

test("builder writes only the fixed mode-0600 redacted destination", async (t) => {
  let retainedRoles;
  let retainedContract;
  const { root, result } = await buildFixture(t, async (credentialRoles, contract) => {
    retainedRoles = credentialRoles;
    retainedContract = contract;
    return makeFacts();
  });
  assert.equal(result.output, path.join(await realpath(root), PHASE2_PROVIDER_EVIDENCE_PATH));
  assert.equal((await stat(result.output)).mode & 0o777, 0o600);
  assert.deepEqual(validatePhase2CredentialRoles(retainedRoles), []);
  assert.equal(retainedContract.expectedCommit, COMMIT);
  assert.equal(Object.isFrozen(retainedRoles.control), true);
  assert.equal(Object.isFrozen(retainedRoles.mutation), true);
  const serialized = await readFile(result.output, "utf8");
  assert.equal(serialized.includes(RAW_SECRET), false);
  assert.equal(serialized.includes("databaseUrl"), false);
  assert.equal(result.evidence.applicationCommit, COMMIT);
  assert.deepEqual((await checkPhase2ProviderEvidence({
    root,
    nowMs: NOW.getTime(),
  })).evidence, result.evidence);
});

test("facts staged before evidence write resume locally without provider access", async (t) => {
  const root = await createRoot(t);
  const facts = await makeFacts();
  const journalDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-finalize-"));
  t.after(() => rm(journalDirectory, { force: true, recursive: true }));
  const journalPath = path.join(journalDirectory, "recovery.json");
  await writeFinalizationJournal({
    journalPath,
    facts,
    status: "facts-staged",
    evidenceSha256: null,
  });
  const result = await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: { root, recoveryJournalPath: journalPath },
  });
  assert.equal(result.resumed, true);
  assert.equal(result.evidence.applicationCommit, COMMIT);
  await assert.rejects(stat(journalPath), { code: "ENOENT" });
  assert.equal((await stat(result.output)).mode & 0o777, 0o600);
});

test("terminal intent before Render acknowledgement defers to operator recovery", async (t) => {
  const root = await createRoot(t);
  const facts = await makeFacts();
  const journalDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-finalize-"));
  t.after(() => rm(journalDirectory, { force: true, recursive: true }));
  const journalPath = path.join(journalDirectory, "recovery.json");
  await writeFinalizationJournal({
    journalPath,
    facts,
    status: "terminal-intent",
    evidenceSha256: null,
    controlRenderRevoked: false,
  });
  const result = await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: { root, recoveryJournalPath: journalPath },
  });
  assert.deepEqual(result, { resumed: false });
  assert.equal(JSON.parse(await readFile(journalPath, "utf8")).controlRenderRevoked, false);
  await assert.rejects(stat(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), {
    code: "ENOENT",
  });
});

test("evidence written before journal ack resumes by exact byte comparison", async (t) => {
  const root = await createRoot(t);
  const facts = await makeFacts();
  const journalDirectory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-finalize-"));
  t.after(() => rm(journalDirectory, { force: true, recursive: true }));
  const journalPath = path.join(journalDirectory, "recovery.json");
  await writeFinalizationJournal({
    journalPath,
    facts,
    status: "facts-staged",
    evidenceSha256: null,
  });
  const first = await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: { root, recoveryJournalPath: journalPath },
  });
  await writeFinalizationJournal({
    journalPath,
    facts,
    status: "evidence-written",
    evidenceSha256: first.sha256,
  });
  const second = await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: { root, recoveryJournalPath: journalPath },
  });
  assert.equal(second.resumed, true);
  assert.equal(second.sha256, first.sha256);
  await assert.rejects(stat(journalPath), { code: "ENOENT" });
});

test("execute cutover persists validated facts before returning to the evidence builder", async () => {
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  actions.kind = "operator";
  const verifyPostRevokeContinuity = actions.verifyPostRevokeContinuity;
  const order = [];
  actions.verifyPostRevokeContinuity = async (context) => {
    const receipt = await verifyPostRevokeContinuity(context);
    assert.equal(typeof context.stageTerminalIntent, "function");
    assert.equal(typeof context.completeTerminalIntent, "function");
    order.push("action-return");
    return receipt;
  };
  let staged;
  let terminalIntent;
  let terminalCompletion;
  const facts = await runPhase2PreviewCutover({
    mode: "execute",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    environment: {
      QUANTGYM_PHASE2_CUTOVER_MODE: "execute",
      QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `preview:${COMMIT}`,
      QUANTGYM_PHASE2_OPERATOR_ALLOWED: "true",
    },
    clock: createPhase2CutoverFixtureClock(),
    terminalIntentSink: async (proof) => {
      terminalIntent = structuredClone(proof);
      order.push("terminal-intent");
    },
    terminalCompletionSink: async (proof) => {
      const terminal = finalizePhase2TerminalRevocationIntent({
        intent: terminalIntent.intent,
        postRevokeReceipt: proof.postRevokeReceipt,
        completedAt: proof.completedAt,
        capturedAt: proof.capturedAt,
      });
      terminalCompletion = {
        capturedAt: terminal.capturedAt,
        facts: terminal.facts,
      };
      order.push("terminal-complete");
      return terminalCompletion;
    },
    evidenceFactsSink: async (proof) => {
      assert.equal(proof.expectedCommit, COMMIT);
      assert.deepEqual(proof.facts, terminalCompletion.facts);
      staged = structuredClone(proof);
      order.push("facts-staged");
    },
  });
  assert.ok(terminalIntent);
  assert.ok(terminalCompletion);
  assert.ok(staged);
  assert.equal(terminalIntent.intent.kind, "phase2-terminal-revocation-intent-v1");
  assert.equal(terminalIntent.intent.prefixFacts.postRevokeContinuity, undefined);
  assert.deepEqual(staged.facts, facts);
  assert.deepEqual(order, [
    "terminal-intent",
    "terminal-complete",
    "action-return",
    "facts-staged",
  ]);
});

test("builder and orchestrator reject missing, malformed, or shared credential roles", async (t) => {
  const root = await createRoot(t);
  const shared = makeCredentialRoles();
  shared.mutation.identitySha256 = shared.control.identitySha256;
  for (const credentialRoles of [undefined, { control: {} }, shared]) {
    await assert.rejects(buildFrontendUpgradePhase2ProviderEvidence({
      expectedCommit: COMMIT,
      [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
        root,
        credentialRoles,
        now: NOW,
        collectFacts: makeFacts,
      },
    }), /credential roles failed/u);
  }
  await assert.rejects(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions: createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }),
    credentialRoles: shared,
  }), /identities must be distinct/u);
  await assert.rejects(readFile(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), /ENOENT/u);
});

test("production builder root and output path cannot be redirected", async (t) => {
  const root = await createRoot(t);
  await assert.rejects(buildFrontendUpgradePhase2ProviderEvidence({
    root,
    expectedCommit: COMMIT,
  }), /public provider evidence builder is test-only/u);
  await assert.rejects(readFile(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), /ENOENT/u);
});

test("collector facts cannot override builder-owned pass metadata", async (t) => {
  const root = await createRoot(t);
  await assert.rejects(buildFrontendUpgradePhase2ProviderEvidence({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
      root,
      credentialRoles: makeCredentialRoles(),
      now: NOW,
      collectFacts: async () => ({
        ...await makeFacts(),
        capturedAt: "2099-01-01T00:00:00.000Z",
      }),
    },
  }), /provider facts are invalid/u);
  await assert.rejects(readFile(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), /ENOENT/u);
});

test("a failed rerun invalidates an existing pass evidence file", async (t) => {
  const root = await createRoot(t);
  const build = (collectFacts) => buildFrontendUpgradePhase2ProviderEvidence({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
      root,
      credentialRoles: makeCredentialRoles(),
      now: NOW,
      collectFacts,
    },
  });
  const first = await build(async () => makeFacts());
  assert.equal((await stat(first.output)).isFile(), true);
  await assert.rejects(build(async () => {
    throw new Error(RAW_SECRET);
  }), /provider fact collection failed/u);
  await assert.rejects(readFile(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), /ENOENT/u);
});

test("builder sanitizes provider errors, preserves safe failure reports, and writes no pass evidence", async (t) => {
  const root = await createRoot(t);
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    overrides: {
      runLiveChecks: () => {
        throw new Error(RAW_SECRET);
      },
    },
  });
  await assert.rejects(buildFrontendUpgradePhase2ProviderEvidence({
    expectedCommit: COMMIT,
    [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
      root,
      credentialRoles: makeCredentialRoles(),
      now: NOW,
      collectFacts: (credentialRoles) => runPhase2PreviewCutover({
        mode: "dry-run",
        expectedCommit: COMMIT,
        actions,
        credentialRoles,
        clock: createPhase2CutoverFixtureClock(),
      }),
    },
  }), (error) => {
    assert.equal(error.message, "controlled Phase 2 provider fact collection failed");
    assert.equal(error.message.includes(RAW_SECRET), false);
    assert.equal(error.failureReport.status, "failed");
    assert.equal(error.failureReport.failedStage, "live-checks");
    assert.equal(JSON.stringify(error.failureReport).includes(RAW_SECRET), false);
    return true;
  });
  await assert.rejects(readFile(path.join(root, PHASE2_PROVIDER_EVIDENCE_PATH)), /ENOENT/u);
});

test("checker rejects permissive mode and symbolic-link evidence", async (t) => {
  const fixture = await buildFixture(t);
  await chmod(fixture.result.output, 0o644);
  await assert.rejects(
    checkPhase2ProviderEvidence({ root: fixture.root, nowMs: NOW.getTime() }),
    /mode 0600/u,
  );

  await rm(fixture.result.output);
  await symlink(path.join(fixture.root, PHASE2_PROVIDER_SCHEMA_PATH), fixture.result.output);
  await assert.rejects(
    checkPhase2ProviderEvidence({ root: fixture.root, nowMs: NOW.getTime() }),
    /single-link regular file/u,
  );
});

test("relationship validator fails closed across candidate, commit, isolation, and continuity drift", async () => {
  let fixture = await makeEvidence();
  fixture.candidateGate.remoteHeadCommit = "b".repeat(40);
  expectFailure(fixture, "candidate gate did not prove");

  fixture = await makeEvidence();
  fixture.deployments.api.commit = "b".repeat(40);
  expectFailure(fixture, "api deployment commit mismatch");

  fixture = await makeEvidence();
  fixture.resources.r2.identitySha256 = fixture.resources.productionR2.identitySha256;
  expectFailure(fixture, "Preview and Production resource identities overlap");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.r2ControlSha256 = "f".repeat(64);
  expectFailure(fixture, "Production deployment, PostgreSQL, or R2 control changed");

  fixture = await makeEvidence();
  fixture.credentialBoundary.mutation.identitySha256 = (
    fixture.credentialBoundary.control.identitySha256
  );
  expectFailure(fixture, "credential boundary did not separate");

  fixture = await makeEvidence();
  fixture.productionContinuity.controlIdentitySha256 = "f".repeat(64);
  expectFailure(fixture, "read-only control identity");
});

test("relationship validator rejects persistent admin and local journal trust-boundary drift", async () => {
  let fixture = await makeEvidence();
  fixture.operatorPreflight.terminalTemporaryControl.postgres
    .persistentProviderAdmin.retained = false;
  expectFailure(fixture, "terminal temporary control proof is invalid");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.persistentProviderAdmin.privilege = "read-only";
  expectFailure(fixture, "post-revoke continuity did not preserve");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.persistentProviderAdmin.identitySha256 = "f".repeat(64);
  expectFailure(fixture, "post-revoke continuity did not preserve");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.persistentProviderAdmin
    .providerCredentialInventorySha256 = "f".repeat(64);
  expectFailure(fixture, "post-revoke continuity did not preserve");

  fixture = await makeEvidence();
  fixture.capture.journalTrustBoundary.externalSignaturePresent = true;
  expectFailure(fixture, "provider evidence capture policy mismatch");

  fixture = await makeEvidence();
  fixture.capture.journalTrustBoundary.sameUserTamperingOutOfScope = false;
  expectFailure(fixture, "provider evidence capture policy mismatch");
});

test("relationship validator rejects restore leakage, downgrade, non-rights data, and dirty cleanup", async () => {
  let fixture = await makeEvidence();
  fixture.databaseBackup.restore.targetResourceSha256 = (
    fixture.resources.productionPostgres.identitySha256
  );
  expectFailure(fixture, "restore target must be an isolated disposable resource");

  fixture = await makeEvidence();
  fixture.databaseBackup.restore.destruction.absentAfterDestroy = false;
  expectFailure(fixture, "restore target was not destroyed");

  fixture = await makeEvidence();
  fixture.databaseMigration.direction = "downgrade";
  fixture.databaseMigration.providerDowngradeExecuted = true;
  expectFailure(fixture, "database migration boundary mismatch");

  fixture = await makeEvidence();
  fixture.acceptanceData.rightsLabelled = false;
  expectFailure(fixture, "rights-labelled and synthetic-only");

  fixture = await makeEvidence();
  fixture.cleanup.syntheticCatalogRows = 1;
  expectFailure(fixture, "zero synthetic application, R2, and catalog rows");

  fixture = await makeEvidence();
  fixture.temporaryAccess.mutationCredentialsRevoked = false;
  expectFailure(fixture, "temporary mutation access was not fully revoked");
});

test("relationship validator rejects PR drift, sequence drift, stale evidence, and raw locations", async () => {
  let fixture = await makeEvidence();
  fixture.pullRequest.after.draft = false;
  expectFailure(fixture, "pull request after must remain draft");

  fixture = await makeEvidence();
  [fixture.cutoverSequence[0], fixture.cutoverSequence[1]] = [
    fixture.cutoverSequence[1],
    fixture.cutoverSequence[0],
  ];
  expectFailure(fixture, "backup cutover step order mismatch");

  fixture = await makeEvidence();
  fixture.expiresAt = "2026-07-27T01:59:59.000Z";
  expectFailure(fixture, "provider evidence has expired");

  fixture = await makeEvidence();
  fixture.resources.pages.name = "https://quantgym-v2-preview.pages.dev";
  expectFailure(fixture, "resource name mismatch");
  expectFailure(fixture, "network location");
});

test("relationship validator binds cleanup, control checks, and final revoke in exact order", async () => {
  let fixture = await makeEvidence();
  fixture.productionContinuity.afterCheckedAt = fixture.productionContinuity.beforeCheckedAt;
  expectFailure(fixture, "before final mutation revoke");

  fixture = await makeEvidence();
  fixture.pullRequest.after.checkedAt = fixture.cleanup.completedAt;
  expectFailure(fixture, "pull-request control check did not precede mutation revoke");

  fixture = await makeEvidence();
  fixture.cutoverSequence[8].startedAt = fixture.productionContinuity.afterCheckedAt;
  expectFailure(fixture, "pull-request control check did not precede mutation revoke");
});

test("schema fixes ordered unique IDs and explicit step/total cutover duration ceilings", async () => {
  const schema = JSON.parse(await readFile(
    path.join(repositoryRoot, PHASE2_PROVIDER_SCHEMA_PATH),
    "utf8",
  ));
  const wrongLiveOrder = structuredClone(schema);
  [wrongLiveOrder.properties.liveChecks.prefixItems[0], wrongLiveOrder.properties.liveChecks
    .prefixItems[1]] = [
    wrongLiveOrder.properties.liveChecks.prefixItems[1],
    wrongLiveOrder.properties.liveChecks.prefixItems[0],
  ];
  assert.ok(validatePhase2ProviderEvidenceSchema(wrongLiveOrder).some((failure) => (
    failure.includes("live-check inventory")
  )));

  const wrongCutoverOrder = structuredClone(schema);
  [wrongCutoverOrder.properties.cutoverSequence.prefixItems[0], wrongCutoverOrder.properties
    .cutoverSequence.prefixItems[1]] = [
    wrongCutoverOrder.properties.cutoverSequence.prefixItems[1],
    wrongCutoverOrder.properties.cutoverSequence.prefixItems[0],
  ];
  assert.ok(validatePhase2ProviderEvidenceSchema(wrongCutoverOrder).some((failure) => (
    failure.includes("cutover prefix order")
  )));

  const unbounded = structuredClone(schema);
  delete unbounded.properties.cutoverDurationMs.maximum;
  assert.ok(validatePhase2ProviderEvidenceSchema(unbounded).some((failure) => (
    failure.includes("duration bounds")
  )));
});

test("relationship validator requires complete Preview LLM and Production service topology", async () => {
  let fixture = await makeEvidence();
  fixture.postRevokeContinuity.previewAnchor.llmVisibility = "public";
  expectFailure(fixture, "post-revoke Preview anchor is invalid");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.services.pop();
  expectFailure(fixture, "Production after Production service anchor inventory mismatch");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.services.push({
    ...fixture.productionContinuity.after.services[0],
    name: "untracked-production-service",
  });
  expectFailure(fixture, "Production after Production service anchor inventory mismatch");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.services[1].visibility = "public";
  expectFailure(fixture, "Production after Production quantgym-llm service anchor is invalid");
});

test("Production Pages proof permits only idle skip records and locks successful deployments", async () => {
  let fixture = await makeEvidence();
  fixture.productionContinuity.after.candidateCommitStartedRecordCount = 1;
  fixture.productionContinuity.after.candidateCommitActiveDeploymentCount = 1;
  expectFailure(fixture, "Production after Production control anchor is invalid");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.candidateCommitSkippedRecordCount = 0;
  expectFailure(fixture, "Production after Production control anchor is invalid");

  fixture = await makeEvidence();
  fixture.productionContinuity.after.pagesSuccessfulDeploymentSetSha256 = "f".repeat(64);
  expectFailure(fixture, "Production deployment, PostgreSQL, or R2 control changed");

  fixture = await makeEvidence();
  fixture.candidateGate.applicationCloudflarePagesSkipDirectivePresent = false;
  expectFailure(fixture, "candidate gate did not prove");
});

test("all eight live checks bind the actual visual and bundle to the deployed artifact", async () => {
  let fixture = await makeEvidence();
  fixture.liveChecks = fixture.liveChecks.slice(0, 6);
  expectFailure(fixture, "live check inventory mismatch");

  fixture = await makeEvidence();
  fixture.liveChecks[6].deploymentCommit = "d".repeat(40);
  expectFailure(fixture, "deployed-visual live check is not bound");

  fixture = await makeEvidence();
  fixture.liveChecks[7].artifactManifestSha256 = "f".repeat(64);
  expectFailure(fixture, "deployed bundle live check is not bound");
});

test("cutover duration and post-revoke control continuity cannot be weakened", async () => {
  let fixture = await makeEvidence();
  fixture.cutoverDurationMs = 21_600_001;
  expectFailure(fixture, "cutover sequence exceeded");

  fixture = await makeEvidence();
  fixture.cutoverSequence[0].durationMs = 7_200_001;
  expectFailure(fixture, "backup cutover step timestamp is invalid");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.runtimeIdentitiesUnchanged = false;
  expectFailure(fixture, "post-revoke continuity did not preserve exact topology");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.renderTopologyObservation
    .reobservedAfterTerminalRevocation = true;
  expectFailure(fixture, "Render topology timing must remain");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.sustainableControlRevalidation.previewApiLive = false;
  expectFailure(fixture, "sustainable post-terminal continuity revalidation is invalid");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.continuityToTerminalRevocationMs = 300_001;
  expectFailure(fixture, "terminal revocation is not bounded");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.continuityObservationCompletedAt = new Date(
    Date.parse(fixture.postRevokeContinuity.terminalRevocationCompletedAt) + 1,
  ).toISOString();
  expectFailure(fixture, "terminal revocation is not bounded");

  fixture = await makeEvidence();
  fixture.postRevokeContinuity.sustainableControlRevalidation.completedAt = new Date(
    Date.parse(fixture.postRevokeContinuity.terminalRevocationCompletedAt) + 1,
  ).toISOString();
  const unsignedSustainableRevalidation = structuredClone(
    fixture.postRevokeContinuity.sustainableControlRevalidation,
  );
  delete unsignedSustainableRevalidation.evidenceSha256;
  fixture.postRevokeContinuity.sustainableControlRevalidation.evidenceSha256 = sha256(
    canonicalJson(unsignedSustainableRevalidation),
  );
  expectFailure(fixture, "terminal revocation is not bounded");

  fixture = await makeEvidence();
  fixture.databaseBackup.restore.destruction.restoreLoginDenied = false;
  expectFailure(fixture, "restore target was not destroyed");

  fixture = await makeEvidence();
  fixture.temporaryAccess.postgresIdentities[1].identitySha256 = "f".repeat(64);
  expectFailure(fixture, "final restore-identity revoke proofs do not match");
});

test("candidate gate failure invokes no provider mutation or recovery action", async () => {
  const calls = [];
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides: {
      candidateGate: () => {
        calls.push("candidateGate");
        throw new Error("candidate mismatch");
      },
    },
  });
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "candidate-gate");
    assert.equal(report.candidateGatePassed, false);
    assert.equal(report.providerWriteAttempted, false);
    assert.equal(report.recoveryStatus, "pass");
    assert.deepEqual(report.recoveryActions.map(({ id, status }) => ({ id, status })), [{
      id: "emergency-revoke-mutation-access",
      status: "pass",
    }]);
  });
  assert.deepEqual(calls, ["candidateGate", "emergencyRevoke"]);
});

test("orchestrator stops an overlong provider step instead of emitting unbounded evidence", async () => {
  let milliseconds = Date.parse("2026-07-27T01:00:00.000Z");
  const clock = () => {
    const value = new Date(milliseconds);
    milliseconds += 3 * 60 * 60 * 1_000;
    return value;
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions: createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }),
    credentialRoles: makeCredentialRoles(),
    clock,
  }), (report) => {
    assert.equal(report.failedStage, "backup");
    assert.equal(report.providerWriteAttempted, true);
    assert.equal(report.completedStages.includes("backup"), false);
  });
});

test("terminal revocation duration includes the real action and rejects an overrun", async () => {
  let milliseconds = Date.parse("2026-07-27T01:00:00.000Z");
  let terminalActionCompleted = false;
  const clock = () => {
    const value = new Date(
      milliseconds + (terminalActionCompleted ? 3 * 60 * 60 * 1_000 : 0),
    );
    milliseconds += 1_000;
    return value;
  };
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  const verifyPostRevokeContinuity = actions.verifyPostRevokeContinuity;
  actions.verifyPostRevokeContinuity = async (context) => {
    const result = await verifyPostRevokeContinuity(context);
    terminalActionCompleted = true;
    return result;
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock,
  }), (report) => {
    assert.equal(report.failedStage, "post-revoke-continuity");
    assert.equal(report.completedStages.includes("revoke"), true);
    assert.equal(report.completedStages.includes("post-revoke-continuity"), false);
  });
});

test("terminal continuity observation expires before a delayed completion can pass", async () => {
  let milliseconds = Date.parse("2026-07-27T01:00:00.000Z");
  let terminalActionCompleted = false;
  const clock = () => {
    const value = new Date(
      milliseconds + (terminalActionCompleted ? 6 * 60 * 1_000 : 0),
    );
    milliseconds += 1_000;
    return value;
  };
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  const verifyPostRevokeContinuity = actions.verifyPostRevokeContinuity;
  actions.verifyPostRevokeContinuity = async (context) => {
    const result = await verifyPostRevokeContinuity(context);
    terminalActionCompleted = true;
    return result;
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock,
  }), (report) => {
    assert.equal(report.failedStage, "post-revoke-continuity");
    assert.equal(report.completedStages.includes("revoke"), true);
    assert.equal(report.completedStages.includes("post-revoke-continuity"), false);
  });
});

test("live-check failure performs ordered reverse recovery and final mutation revoke", async () => {
  const calls = [];
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides: {
      runLiveChecks: () => {
        calls.push("runLiveChecks");
        throw new Error("controlled failure");
      },
    },
  });
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "live-checks");
    assert.equal(report.candidateGatePassed, true);
    assert.equal(report.providerWriteAttempted, true);
    assert.equal(report.recoveryStatus, "pass");
    assert.deepEqual(report.recoveryActions.map(({ id, status }) => ({ id, status })), [
      { id: "cleanup", status: "pass" },
      { id: "rollback-pages", status: "pass" },
      { id: "rollback-api", status: "pass" },
      { id: "restore-database", status: "pass" },
      { id: "destroy-restore-target", status: "skipped" },
      { id: "verify-recovery", status: "pass" },
      { id: "revoke-mutation-access", status: "pass" },
      { id: "emergency-revoke-mutation-access", status: "skipped" },
    ]);
  });
  assert.deepEqual(calls.slice(-6), [
    "recoverCleanup",
    "rollbackPages",
    "rollbackApi",
    "restorePreviewDatabase",
    "verifyRecovery",
    "revokeTemporaryAccess",
  ]);
});

test("post-cutover control-check failure rolls back before mutation access is revoked", async () => {
  const calls = [];
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
  });
  const inspectTopology = actions.inspectTopology;
  actions.inspectTopology = (context) => {
    if (context.point === "after") {
      calls.push("inspectTopology:after");
      throw new Error("control check failed");
    }
    return inspectTopology(context);
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "topology-after");
    assert.equal(report.recoveryStatus, "pass");
  });
  assert.equal(calls.filter((name) => name === "revokeTemporaryAccess").length, 1);
  assert.deepEqual(calls.slice(-6), [
    "recoverCleanup",
    "rollbackPages",
    "rollbackApi",
    "restorePreviewDatabase",
    "verifyRecovery",
    "revokeTemporaryAccess",
  ]);
});

test("a confirmed clean revoke failure performs full reverse recovery", async () => {
  const calls = [];
  let revokeCalls = 0;
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
  });
  const revokeTemporaryAccess = actions.revokeTemporaryAccess;
  actions.revokeTemporaryAccess = (context) => {
    revokeCalls += 1;
    if (revokeCalls === 1) {
      calls.push("revokeTemporaryAccess");
      const error = new Error("revocation did not start");
      error.mutationRevocationOutcome = "none";
      throw error;
    }
    return revokeTemporaryAccess(context);
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "revoke");
    assert.equal(report.recoveryStatus, "pass");
    assert.equal(report.recoveryActions.find(({ id }) => id === "cleanup").status, "pass");
    assert.equal(
      report.recoveryActions.find(({ id }) => id === "rollback-pages").status,
      "pass",
    );
  });
  assert.equal(revokeCalls, 2);
  assert.deepEqual(calls.slice(-6), [
    "recoverCleanup",
    "rollbackPages",
    "rollbackApi",
    "restorePreviewDatabase",
    "verifyRecovery",
    "revokeTemporaryAccess",
  ]);
});

test("a partial final revoke never attempts rollback with revoked mutation credentials", async () => {
  const calls = [];
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides: {
      revokeTemporaryAccess: () => {
        calls.push("revokeTemporaryAccess");
        const error = new Error("partially revoked");
        error.mutationRevocationOutcome = "partial";
        throw error;
      },
    },
  });
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "revoke");
    assert.equal(report.recoveryStatus, "incomplete");
    for (const id of [
      "cleanup",
      "rollback-pages",
      "rollback-api",
      "restore-database",
      "destroy-restore-target",
    ]) assert.equal(report.recoveryActions.find((entry) => entry.id === id).status, "skipped");
    assert.deepEqual(report.recoveryActions.map(({ id, status }) => ({ id, status })), [
      { id: "cleanup", status: "skipped" },
      { id: "rollback-pages", status: "skipped" },
      { id: "rollback-api", status: "skipped" },
      { id: "restore-database", status: "skipped" },
      { id: "destroy-restore-target", status: "skipped" },
      { id: "verify-recovery", status: "pass" },
      { id: "revoke-mutation-access", status: "failed" },
      { id: "emergency-revoke-mutation-access", status: "pass" },
    ]);
  });
  assert.deepEqual(calls.slice(-3), [
    "revokeTemporaryAccess",
    "verifyRecovery",
    "emergencyRevoke",
  ]);
  assert.equal(calls.includes("rollbackPages"), false);
  assert.equal(calls.includes("rollbackApi"), false);
  assert.equal(calls.includes("restorePreviewDatabase"), false);
});

test("post-revoke local failure uses control verification and never reopens mutation recovery", async () => {
  const calls = [];
  const fixtureClock = createPhase2CutoverFixtureClock();
  let revokeReturned = false;
  let postRevokeTicks = 0;
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
  });
  const revokeTemporaryAccess = actions.revokeTemporaryAccess;
  actions.revokeTemporaryAccess = async (context) => {
    const receipt = await revokeTemporaryAccess(context);
    revokeReturned = true;
    return receipt;
  };
  const clock = () => {
    if (!revokeReturned || postRevokeTicks === 0) {
      postRevokeTicks += revokeReturned ? 1 : 0;
      return fixtureClock();
    }
    return new Date(Number.NaN);
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock,
  }), (report) => {
    assert.equal(report.failedStage, "post-revoke-continuity");
    assert.equal(report.recoveryStatus, "pass");
    assert.equal(
      report.recoveryActions.find(({ id }) => id === "revoke-mutation-access").status,
      "pass",
    );
    assert.equal(
      report.recoveryActions.find(({ id }) => id === "emergency-revoke-mutation-access").status,
      "skipped",
    );
  });
  assert.deepEqual(calls.slice(-2), ["revokeTemporaryAccess", "verifyRecovery"]);
  assert.equal(calls.includes("rollbackPages"), false);
  assert.equal(calls.includes("rollbackApi"), false);
  assert.equal(calls.includes("restorePreviewDatabase"), false);
});

test("restore-proof failure destroys a possible target before verification and revoke", async () => {
  const calls = [];
  let destroyContext;
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides: {
      proveRestore: () => {
        calls.push("proveRestore");
        throw new Error("restore proof interrupted");
      },
    },
  });
  const destroyRestoreTarget = actions.destroyRestoreTarget;
  actions.destroyRestoreTarget = (context) => {
    destroyContext = context;
    return destroyRestoreTarget(context);
  };
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.failedStage, "restore-proof");
    assert.equal(report.recoveryStatus, "pass");
    assert.equal(
      report.recoveryActions.find(({ id }) => id === "destroy-restore-target").status,
      "pass",
    );
  });
  assert.deepEqual(calls.slice(-3), [
    "destroyRestoreTarget",
    "verifyRecovery",
    "revokeTemporaryAccess",
  ]);
  assert.equal(destroyContext.recovery, true);
  assert.equal(destroyContext.restore, undefined);
});

test("recovery failures stay explicit while later recovery and emergency revoke continue", async () => {
  const calls = [];
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides: {
      runLiveChecks: () => {
        calls.push("runLiveChecks");
        throw new Error("controlled failure");
      },
      recoverCleanup: () => {
        calls.push("recoverCleanup");
        throw new Error("cleanup recovery failed");
      },
      rollbackPages: () => {
        calls.push("rollbackPages");
        throw new Error("Pages rollback failed");
      },
      revokeTemporaryAccess: () => {
        calls.push("revokeTemporaryAccess");
        throw new Error("revoke failed");
      },
    },
  });
  await expectCutoverFailure(runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions,
    credentialRoles: makeCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (report) => {
    assert.equal(report.recoveryStatus, "incomplete");
    assert.deepEqual(report.recoveryActions.map(({ id, status }) => ({ id, status })), [
      { id: "cleanup", status: "failed" },
      { id: "rollback-pages", status: "failed" },
      { id: "rollback-api", status: "pass" },
      { id: "restore-database", status: "pass" },
      { id: "destroy-restore-target", status: "skipped" },
      { id: "verify-recovery", status: "pass" },
      { id: "revoke-mutation-access", status: "failed" },
      { id: "emergency-revoke-mutation-access", status: "pass" },
    ]);
  });
  assert.deepEqual(calls.slice(-7), [
    "recoverCleanup",
    "rollbackPages",
    "rollbackApi",
    "restorePreviewDatabase",
    "verifyRecovery",
    "revokeTemporaryAccess",
    "emergencyRevoke",
  ]);
});

test("execute mode requires an operator adapter and exact environment confirmation", async () => {
  const fixture = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  fixture.kind = "operator";
  await assert.rejects(runPhase2PreviewCutover({
    mode: "execute",
    expectedCommit: COMMIT,
    actions: fixture,
    credentialRoles: makeCredentialRoles(),
    environment: {},
  }), /execute mode is not enabled/u);
  await assert.rejects(runPhase2PreviewCutover({
    mode: "execute",
    expectedCommit: COMMIT,
    actions: fixture,
    credentialRoles: makeCredentialRoles(),
    environment: {
      QUANTGYM_PHASE2_CUTOVER_MODE: "execute",
      QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `preview:${"b".repeat(40)}`,
    },
  }), /confirmation does not match/u);
});
