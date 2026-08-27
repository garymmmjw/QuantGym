import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  constants as fsConstants,
  mkdtempSync,
  writeFileSync,
} from "node:fs";
import {
  mkdir,
  mkdtemp,
  lstat,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

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
  PHASE2_PROVIDER_EVIDENCE_PATH,
  TEST_ONLY_PHASE2_PROVIDER_EVIDENCE,
  resumeFrontendUpgradePhase2ProviderEvidenceFinalization,
} from "../scripts/lib/frontend-upgrade-phase2-provider-evidence.mjs";
import {
  PHASE2_OPERATOR_ACTION_CREDENTIAL_SCOPES,
  PHASE2_OPERATOR_TEST_SUPPORT,
  Phase2OperatorError,
  createPhase2OperatorAdapter,
} from "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs";
import {
  TEST_ONLY_PHASE2_OPERATOR_RUNNER,
  formatPhase2OperatorFailure,
  runFrontendUpgradePhase2Operator,
} from "../scripts/run-frontend-upgrade-phase2-operator.mjs";

process.env.NODE_ENV = "test";

const COMMIT = "a".repeat(40);
const EVIDENCE_COMMIT = "b".repeat(40);
const CONTROL_SECRET = "control-secret-never-reaches-orchestrator-123456";
const MUTATION_SECRET = "mutation-secret-never-reaches-orchestrator-654321";
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const renderCredentialPath = (label, accessToken, refreshToken) => {
  const directory = mkdtempSync(path.join(tmpdir(), `quantgym-phase2-render-${label}-`));
  const filePath = path.join(directory, "cli.yaml");
  const expiresAt = Math.floor(Date.now() / 1_000) + 7 * 24 * 60 * 60 - 60;
  writeFileSync(filePath, [
    "version: 1",
    "api:",
    `    key: ${accessToken}`,
    `    expires_at: ${expiresAt}`,
    "    host: https://api.render.com/v1/",
    `    refreshtoken: ${refreshToken}`,
    "",
  ].join("\n"), { mode: 0o600 });
  return filePath;
};
const CONTROL_RENDER_FILE = renderCredentialPath(
  "control",
  `${CONTROL_SECRET}-render-access`,
  `${CONTROL_SECRET}-render-refresh`,
);
const MUTATION_RENDER_FILE = renderCredentialPath(
  "mutation",
  `${MUTATION_SECRET}-render-access`,
  `${MUTATION_SECRET}-render-refresh`,
);
const ENVIRONMENT = Object.freeze({
  QUANTGYM_PHASE2_CUTOVER_MODE: "execute",
  QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `preview:${COMMIT}`,
  QUANTGYM_PHASE2_EXPECTED_COMMIT: COMMIT,
  QUANTGYM_PHASE2_OPERATOR_ALLOWED: "true",
});
const OPERATOR_CONFIG = Object.freeze({
  apiOrigin: "https://quantgym-v2-preview-api.onrender.com",
  cloudflareAccountId: "1".repeat(32),
  evidenceHeadCommit: EVIDENCE_COMMIT,
  httpsProxyUrl: "http://127.0.0.1:9090",
  postgresBinDir: "/definitely-missing/quantgym-postgres-18.4/bin",
  pythonPath: process.execPath,
  restoreDestroyConfirmation: (
    "destroy-preview-database:quantgym_v2_phase2_restore_test"
  ),
  webOrigin: "https://quantgym-v2-preview.pages.dev",
  wranglerPath: "/definitely-missing/quantgym-operator-wrangler-4.86.0.js",
});

const createProviderEvidenceRoot = async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-runner-"));
  t.after(() => rm(root, { force: true, recursive: true }));
  return root;
};

const createPythonSitePackagesFixture = async (t, label) => {
  const root = await mkdtemp(path.join(tmpdir(), `quantgym-python-closure-${label}-`));
  t.after(() => rm(root, { force: true, recursive: true }));
  const sitePackagesPath = path.join(root, "site-packages");
  const files = {
    "locked_package/__init__.py": "VALUE = 'locked'\n",
    "locked_package/native.cpython-313-darwin.so": "locked-native-binary\n",
    "locked_package-1.0.dist-info/METADATA": [
      "Metadata-Version: 2.4",
      "Name: locked-package",
      "Version: 1.0",
      "",
    ].join("\n"),
    "locked_package-1.0.dist-info/RECORD": [
      "../../../bin/locked-package,sha256=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa,123",
      "locked_package/__init__.py,sha256=bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb,17",
      "locked_package-1.0.dist-info/RECORD,,",
      "",
    ].join("\n"),
    "locked_package-1.0.dist-info/entry_points.txt": [
      "[console_scripts]",
      "locked-package = locked_package:main",
      "",
    ].join("\n"),
  };
  for (const [relativePath, source] of Object.entries(files)) {
    const filePath = path.join(sitePackagesPath, ...relativePath.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
  }
  const expected = await PHASE2_OPERATOR_TEST_SUPPORT
    .inspectPythonSitePackagesClosure(sitePackagesPath);
  return { expected, sitePackagesPath };
};

const rejectsPythonClosureMismatch = (error) => (
  error instanceof Phase2OperatorError
  && error.code === "PYTHON_CLOSURE_MISMATCH"
  && error.phase === "toolchain-preflight"
);

const credentialPayload = () => {
  return ({
  bootstrap: {
    previewDatabaseAdminUrl: (
      "postgresql://qg_phase2_admin:admin-password@preview-db.example.com/"
      + "quantgym_preview?sslmode=require"
    ),
  },
  control: {
    cloudflareApiToken: `${CONTROL_SECRET}-cloudflare`,
    r2AccessKeyId: "4".repeat(32),
    r2ExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1_000).toISOString(),
    r2SecretAccessKey: `${CONTROL_SECRET}-r2-secret`,
    renderAccessToken: `${CONTROL_SECRET}-render-access`,
    renderCredentialFilePath: CONTROL_RENDER_FILE,
    renderCredentialKind: "render-cli-oauth-v1",
    renderRefreshToken: `${CONTROL_SECRET}-render-refresh`,
  },
  mutation: {
    cloudflareAccountTokenId: "2".repeat(32),
    cloudflareApiToken: `${MUTATION_SECRET}-cloudflare`,
    r2AccessKeyId: "3".repeat(32),
    r2ExpiresAt: new Date(Date.now() + 60 * 60 * 1_000).toISOString(),
    r2ParentTokenId: "3".repeat(32),
    r2SecretAccessKey: `${MUTATION_SECRET}-r2-secret`,
    renderAccessToken: `${MUTATION_SECRET}-render-access`,
    renderCredentialFilePath: MUTATION_RENDER_FILE,
    renderCredentialKind: "render-cli-oauth-v1",
    renderRefreshToken: `${MUTATION_SECRET}-render-refresh`,
  },
  });
};

const readyCapabilities = () => ({
  acceptance: {
    preflight: async () => ({ ready: true, kind: "test-acceptance-v1" }),
    seed: async () => ({ actorSha256: "1".repeat(64) }),
    runAccessibility: async () => ({ passed: true, evidenceSha256: "2".repeat(64) }),
    runDailyLoop: async () => ({ passed: true, evidenceSha256: "3".repeat(64) }),
    runVisual: async () => ({ passed: true, evidenceSha256: "4".repeat(64) }),
    cleanup: async () => ({
      syntheticApplicationRows: 0,
      syntheticCatalogRows: 0,
    }),
    verifyRecovery: async () => ({
      syntheticApplicationRows: 0,
      syntheticCatalogRows: 0,
    }),
  },
  control: {
    preflight: async () => ({
      ready: true,
      kind: "test-control-read-only-v1",
      readOnly: true,
    }),
  },
  revocation: {
    preflight: async () => ({ ready: true, kind: "test-revocation-v1" }),
    revokePostgres: async ({ revoke }) => revoke(),
    revokeRender: async ({ revoke }) => revoke(),
  },
});

const executeFixture = async ({
  operatorAdapter,
  actions,
  credentialRoles,
  clock,
}) => {
  let intent;
  return runPhase2PreviewCutover({
    mode: "execute",
    expectedCommit: COMMIT,
    actions: operatorAdapter?.actions ?? actions,
    credentialRoles: operatorAdapter?.credentialRoles ?? credentialRoles,
    environment: ENVIRONMENT,
    clock,
    terminalIntentSink: async (proof) => {
      intent = structuredClone(proof.intent);
    },
    terminalCompletionSink: async (proof) => {
      const terminal = finalizePhase2TerminalRevocationIntent({
        intent,
        postRevokeReceipt: proof.postRevokeReceipt,
        completedAt: proof.completedAt,
        capturedAt: proof.capturedAt,
      });
      return { capturedAt: terminal.capturedAt, facts: terminal.facts };
    },
  });
};

const fakeReceipt = (label, details) => ({
  status: "pass",
  environment: "preview",
  productionMutation: false,
  evidenceSha256: createHash("sha256").update(label).digest("hex"),
  details,
});

const makeCompleteFakeAdapter = ({
  calls,
  overrides = {},
  preflight,
} = {}) => {
  const actions = createPhase2CutoverDryRunFixture({
    expectedCommit: COMMIT,
    onAction: (name) => calls.push(name),
    overrides,
  });
  if (preflight !== undefined) actions.preflight = preflight;
  actions.kind = "operator";
  const credentialRoles = createPhase2CutoverFixtureCredentialRoles();
  return {
    actions,
    credentialRoles,
    dispose: async () => {
      calls.push("dispose");
    },
  };
};

const journalMetadata = Object.freeze({
  isFile: () => true,
  isSymbolicLink: () => false,
  mode: 0o100600,
  nlink: 1,
});

test("recovery journal resolves the macOS /tmp alias before fsyncing the directory", async () => {
  const events = [];
  const journalPath = "/tmp/quantgym-phase2-durability-test.json";
  const directoryPath = path.dirname(journalPath);
  const resolvedDirectoryPath = "/private/tmp";
  let temporaryPath;
  const fileOperations = {
    open: async (target, flags, mode) => {
      if (target === resolvedDirectoryPath) {
        events.push("directory-open");
        assert.equal(flags & fsConstants.O_DIRECTORY, fsConstants.O_DIRECTORY);
        assert.equal(flags & fsConstants.O_NOFOLLOW, fsConstants.O_NOFOLLOW);
        assert.equal(mode, undefined);
        return {
          close: async () => events.push("directory-close"),
          sync: async () => events.push("directory-sync"),
        };
      }
      temporaryPath = target;
      events.push("temporary-open");
      assert.match(target, /\.tmp$/u);
      assert.equal(flags & fsConstants.O_CREAT, fsConstants.O_CREAT);
      assert.equal(flags & fsConstants.O_EXCL, fsConstants.O_EXCL);
      assert.equal(flags & fsConstants.O_NOFOLLOW, fsConstants.O_NOFOLLOW);
      assert.equal(mode, 0o600);
      return {
        chmod: async (suppliedMode) => {
          assert.equal(suppliedMode, 0o600);
          events.push("temporary-chmod");
        },
        close: async () => events.push("temporary-close"),
        sync: async () => events.push("temporary-sync"),
        writeFile: async (source, options) => {
          assert.equal(source, "{\"status\":\"pending\"}\n");
          assert.deepEqual(options, { encoding: "utf8" });
          events.push("temporary-write");
        },
      };
    },
    rename: async (source, target) => {
      assert.equal(source, temporaryPath);
      assert.equal(target, journalPath);
      events.push("rename");
    },
    lstat: async (target) => {
      assert.equal(target, journalPath);
      events.push("lstat");
      return journalMetadata;
    },
    realpath: async (target) => {
      assert.equal(target, directoryPath);
      events.push("directory-realpath");
      return resolvedDirectoryPath;
    },
    rm: async () => events.push("unexpected-remove"),
  };

  await PHASE2_OPERATOR_TEST_SUPPORT.persistRecoveryJournalFile({
    fileOperations,
    journalPath,
    source: "{\"status\":\"pending\"}\n",
  });

  assert.deepEqual(events, [
    "temporary-open",
    "temporary-write",
    "temporary-chmod",
    "temporary-sync",
    "temporary-close",
    "rename",
    "directory-realpath",
    "directory-open",
    "directory-sync",
    "directory-close",
    "lstat",
  ]);
});

test("recovery journal sync failures reject before any following terminal revoke", async (t) => {
  const journalPath = "/tmp/quantgym-phase2-durability-failure.json";
  const directoryPath = path.dirname(journalPath);
  for (const failurePoint of ["file-sync", "directory-sync"]) {
    await t.test(failurePoint, async () => {
      const events = [];
      let terminalRevokeCalls = 0;
      const fileOperations = {
        open: async (target) => {
          if (target === directoryPath) {
            events.push("directory-open");
            return {
              close: async () => events.push("directory-close"),
              sync: async () => {
                events.push("directory-sync");
                if (failurePoint === "directory-sync") {
                  throw new Error("injected directory fsync failure");
                }
              },
            };
          }
          events.push("temporary-open");
          return {
            chmod: async () => events.push("temporary-chmod"),
            close: async () => events.push("temporary-close"),
            sync: async () => {
              events.push("temporary-sync");
              if (failurePoint === "file-sync") {
                throw new Error("injected file fsync failure");
              }
            },
            writeFile: async () => events.push("temporary-write"),
          };
        },
        rename: async () => events.push("rename"),
        lstat: async () => journalMetadata,
        rm: async () => events.push("temporary-remove"),
      };

      await assert.rejects((async () => {
        await PHASE2_OPERATOR_TEST_SUPPORT.persistRecoveryJournalFile({
          fileOperations,
          journalPath,
          source: "{}\n",
        });
        terminalRevokeCalls += 1;
      })(), (error) => (
        error instanceof Phase2OperatorError
        && error.code === "RECOVERY_JOURNAL_WRITE_FAILED"
        && error.phase === "recovery-journal"
      ));
      assert.equal(terminalRevokeCalls, 0);
      assert.equal(events.includes("rename"), failurePoint === "directory-sync");
      assert.equal(events.includes("directory-sync"), failurePoint === "directory-sync");
      assert.equal(events.includes("temporary-close"), true);
      if (failurePoint === "file-sync") {
        assert.equal(events.includes("temporary-remove"), true);
      }
    });
  }
});

test("recovery journal removal fsyncs the directory and rejects a failed fsync", async (t) => {
  const journalPath = "/tmp/quantgym-phase2-durability-remove.json";
  const directoryPath = path.dirname(journalPath);
  for (const directorySyncFails of [false, true]) {
    await t.test(directorySyncFails ? "sync-failure" : "success", async () => {
      const events = [];
      const fileOperations = {
        rm: async (target, options) => {
          assert.equal(target, journalPath);
          assert.deepEqual(options, { force: true });
          events.push("remove");
        },
        open: async (target) => {
          assert.equal(target, directoryPath);
          events.push("directory-open");
          return {
            close: async () => events.push("directory-close"),
            sync: async () => {
              events.push("directory-sync");
              if (directorySyncFails) throw new Error("injected directory fsync failure");
            },
          };
        },
      };
      const removal = PHASE2_OPERATOR_TEST_SUPPORT.removeRecoveryJournalFile({
        fileOperations,
        journalPath,
      });
      if (directorySyncFails) {
        await assert.rejects(removal, (error) => (
          error instanceof Phase2OperatorError
          && error.code === "RECOVERY_JOURNAL_CLEANUP_FAILED"
          && error.phase === "recovery-journal"
        ));
      } else {
        await removal;
      }
      assert.deepEqual(events, [
        "remove",
        "directory-open",
        "directory-sync",
        "directory-close",
      ]);
    });
  }
});

test("controlled runner invalidates stale evidence before preflight and executes", async (t) => {
  const calls = [];
  const providerEvidenceRoot = await createProviderEvidenceRoot(t);
  const staleEvidencePath = path.join(
    providerEvidenceRoot,
    PHASE2_PROVIDER_EVIDENCE_PATH,
  );
  await mkdir(path.dirname(staleEvidencePath), { recursive: true });
  await writeFile(staleEvidencePath, "{\"status\":\"pass\"}\n", { mode: 0o600 });
  const adapter = makeCompleteFakeAdapter({
    calls,
    preflight: async ({ expectedCommit }) => {
      assert.equal(expectedCommit, COMMIT);
      await assert.rejects(readFile(staleEvidencePath), { code: "ENOENT" });
      calls.push("preflight");
      return createPhase2CutoverDryRunFixture({ expectedCommit }).preflight();
    },
  });
  const facts = await runFrontendUpgradePhase2Operator({
    [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
      adapterFactory: async ({ credentialPayload: supplied }) => {
        assert.equal(supplied.control.cloudflareApiToken, `${CONTROL_SECRET}-cloudflare`);
        assert.equal(supplied.control.previewDatabaseAdminUrl, undefined);
        assert.match(supplied.bootstrap.previewDatabaseAdminUrl, /^postgresql:\/\//u);
        return adapter;
      },
      capabilities: readyCapabilities(),
      clock: createPhase2CutoverFixtureClock(),
      credentialPayload: credentialPayload(),
      environment: ENVIRONMENT,
      expectedCommit: COMMIT,
      operatorConfig: OPERATOR_CONFIG,
      providerEvidenceRoot,
      providerRunner: async (input) => {
        const serialized = JSON.stringify(input);
        assert.equal(serialized.includes(CONTROL_SECRET), false);
        assert.equal(serialized.includes(MUTATION_SECRET), false);
        return executeFixture(input);
      },
    },
  });
  assert.equal(facts.candidateGate.applicationCommit, COMMIT);
  assert.equal(facts.candidateGate.localHeadCommit, "e".repeat(40));
  assert.equal(facts.deployments.api.commit, COMMIT);
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
    "dispose",
  ]);
});

test("controlled runner preserves adapter recovery on failure and always disposes", async (t) => {
  const calls = [];
  const providerEvidenceRoot = await createProviderEvidenceRoot(t);
  const adapter = makeCompleteFakeAdapter({
    calls,
    overrides: {
      runLiveChecks: () => {
        calls.push("runLiveChecks");
        const error = new Phase2OperatorError(
          "LIVE_CHECK_PROBE_FAILED",
          "live-checks",
        );
        error.providerBody = "raw-provider-body-must-not-escape";
        throw error;
      },
    },
    preflight: async () => {
      calls.push("preflight");
      return createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }).preflight();
    },
  });
  await assert.rejects(runFrontendUpgradePhase2Operator({
    [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
      adapterFactory: async () => adapter,
      clock: createPhase2CutoverFixtureClock(),
      credentialPayload: credentialPayload(),
      environment: ENVIRONMENT,
      expectedCommit: COMMIT,
      operatorConfig: OPERATOR_CONFIG,
      providerEvidenceRoot,
      providerRunner: executeFixture,
    },
  }), (error) => {
    assert.ok(error instanceof Phase2CutoverFailure);
    assert.equal(error.message.includes("raw-provider-body"), false);
    assert.equal(JSON.stringify(error.failureReport).includes("raw-provider-body"), false);
    assert.equal(error.failureReport.failedStage, "live-checks");
    assert.deepEqual(error.failureReport.cause, {
      code: "LIVE_CHECK_PROBE_FAILED",
      phase: "live-checks",
    });
    assert.equal(error.failureReport.recoveryStatus, "pass");
    return true;
  });
  assert.deepEqual(calls.slice(-7), [
    "recoverCleanup",
    "rollbackPages",
    "rollbackApi",
    "restorePreviewDatabase",
    "verifyRecovery",
    "revokeTemporaryAccess",
    "dispose",
  ]);
});

test("unbranded action errors cannot self-report a secret-shaped cause", async () => {
  const secretShapedCode = "SK_LIVE_SECRET_ABC123456789";
  for (const proxied of [false, true]) {
    const actions = createPhase2CutoverDryRunFixture({
      expectedCommit: COMMIT,
      overrides: {
        runLiveChecks: () => {
          const error = new Error("raw-provider-secret-must-never-print");
          error.code = secretShapedCode;
          error.phase = "live-checks";
          throw proxied ? new Proxy(error, {}) : error;
        },
      },
    });
    await assert.rejects(runPhase2PreviewCutover({
      mode: "dry-run",
      expectedCommit: COMMIT,
      actions,
      credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
      clock: createPhase2CutoverFixtureClock(),
    }), (error) => {
      assert.ok(error instanceof Phase2CutoverFailure);
      assert.equal(error.failureReport.cause, null, `proxied=${proxied}`);
      assert.equal(
        JSON.stringify(error.failureReport).includes(secretShapedCode),
        false,
      );
      assert.equal(
        JSON.stringify(error.failureReport).includes("raw-provider-secret"),
        false,
      );
      return true;
    });
  }
});

test("recover resumes finalized evidence before loading credentials or creating an adapter", async (t) => {
  const providerEvidenceRoot = await createProviderEvidenceRoot(t);
  const evidencePath = path.join(providerEvidenceRoot, PHASE2_PROVIDER_EVIDENCE_PATH);
  await mkdir(path.dirname(evidencePath), { recursive: true });
  await writeFile(evidencePath, "already-written-evidence", { mode: 0o600 });
  let adapterCreated = false;
  let providerCalled = false;
  const result = await runFrontendUpgradePhase2Operator({
    mode: "recover",
    [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
      adapterFactory: async () => {
        adapterCreated = true;
        throw new Error("adapter must not be created");
      },
      finalizationResumer: async ({ expectedCommit }) => ({
        resumed: expectedCommit === COMMIT,
        sha256: "f".repeat(64),
      }),
      clock: createPhase2CutoverFixtureClock(),
      credentialPayload: credentialPayload(),
      environment: {
        ...ENVIRONMENT,
        QUANTGYM_PHASE2_CUTOVER_MODE: "recover",
        QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `recover-preview:${COMMIT}`,
      },
      expectedCommit: COMMIT,
      operatorConfig: OPERATOR_CONFIG,
      providerEvidenceRoot,
      providerRunner: async () => {
        providerCalled = true;
      },
    },
  });
  assert.equal(result.resumed, true);
  assert.equal(adapterCreated, false);
  assert.equal(providerCalled, false);
  assert.equal(await readFile(evidencePath, "utf8"), "already-written-evidence");
});

test("terminal revocation crash points converge to the same staged evidence without rollback", async (t) => {
  const providerEvidenceRoot = await createProviderEvidenceRoot(t);
  const expectedEvidenceSha256 = "9".repeat(64);
  const outcomes = [];
  for (const crashPoint of [
    "postgres-drop",
    "render-204",
    "journal-ack",
    "action-return",
  ]) {
    const calls = [];
    const adapter = makeCompleteFakeAdapter({ calls });
    adapter.recover = async ({ expectedCommit, confirmation }) => {
      assert.equal(expectedCommit, COMMIT);
      assert.equal(confirmation, `recover-preview:${COMMIT}`);
      calls.push(`recover:${crashPoint}`);
      return {
        recovered: true,
        expectedCommit,
        mutationCredentialsRevoked: true,
        renderControlRevoked: true,
        providerEvidencePending: true,
      };
    };
    let resumeCalls = 0;
    const result = await runFrontendUpgradePhase2Operator({
      mode: "recover",
      [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
        adapterFactory: async () => adapter,
        finalizationResumer: async ({ expectedCommit }) => {
          assert.equal(expectedCommit, COMMIT);
          resumeCalls += 1;
          return resumeCalls === 1
            ? { resumed: false }
            : {
              resumed: true,
              expectedCommit,
              sha256: expectedEvidenceSha256,
            };
        },
        clock: createPhase2CutoverFixtureClock(),
        credentialPayload: credentialPayload(),
        environment: {
          ...ENVIRONMENT,
          QUANTGYM_PHASE2_CUTOVER_MODE: "recover",
          QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `recover-preview:${COMMIT}`,
        },
        expectedCommit: COMMIT,
        operatorConfig: OPERATOR_CONFIG,
        providerEvidenceRoot,
        providerRunner: async () => {
          throw new Error("recovery must not rerun cutover or rollback");
        },
      },
    });
    assert.equal(resumeCalls, 2);
    assert.deepEqual(calls, [`recover:${crashPoint}`, "dispose"]);
    outcomes.push(result);
  }
  assert.ok(outcomes.every((result) => (
    result.resumed === true
    && result.expectedCommit === COMMIT
    && result.sha256 === expectedEvidenceSha256
  )));
});

test("real terminal-intent journal reader reaches recovery before Render acknowledgement", async (t) => {
  const facts = await runPhase2PreviewCutover({
    mode: "dry-run",
    expectedCommit: COMMIT,
    actions: createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT }),
    credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  });
  const capturedAt = new Date(
    Date.parse(facts.cutoverSequence.at(-1).completedAt) + 1_000,
  ).toISOString();
  const factsSha256 = createHash("sha256")
    .update(canonicalJson(facts))
    .digest("hex");

  for (const crashPoint of ["postgres-drop", "render-204-before-journal-ack"]) {
    const providerEvidenceRoot = await createProviderEvidenceRoot(t);
    const journalPath = path.join(providerEvidenceRoot, `${crashPoint}.json`);
    const journal = {
      schemaVersion: 6,
      expectedCommit: COMMIT,
      controlRenderRevoked: false,
      backup: null,
      finalization: {
        status: "terminal-intent",
        capturedAt,
        facts,
        factsSha256,
        evidenceSha256: null,
      },
    };
    await writeFile(journalPath, `${JSON.stringify(journal)}\n`, { mode: 0o600 });
    const calls = [];
    const adapter = makeCompleteFakeAdapter({ calls });
    adapter.recover = async () => {
      const before = JSON.parse(await readFile(journalPath, "utf8"));
      assert.equal(before.finalization.status, "terminal-intent");
      assert.equal(before.controlRenderRevoked, false);
      calls.push(`recover:${crashPoint}`);
      await writeFile(journalPath, `${JSON.stringify({
        ...before,
        controlRenderRevoked: true,
        finalization: { ...before.finalization, status: "facts-staged" },
      })}\n`, { mode: 0o600 });
      return {
        recovered: true,
        expectedCommit: COMMIT,
        mutationCredentialsRevoked: true,
        renderControlRevoked: true,
        providerEvidencePending: true,
      };
    };
    const finalizationResumer = ({ expectedCommit }) => (
      resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
        expectedCommit,
        [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
          root: providerEvidenceRoot,
          recoveryJournalPath: journalPath,
          now: new Date(capturedAt),
        },
      })
    );
    const result = await runFrontendUpgradePhase2Operator({
      mode: "recover",
      [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
        adapterFactory: async () => adapter,
        finalizationResumer,
        clock: createPhase2CutoverFixtureClock(),
        credentialPayload: credentialPayload(),
        environment: {
          ...ENVIRONMENT,
          QUANTGYM_PHASE2_CUTOVER_MODE: "recover",
          QUANTGYM_PHASE2_CUTOVER_CONFIRMATION: `recover-preview:${COMMIT}`,
        },
        expectedCommit: COMMIT,
        operatorConfig: OPERATOR_CONFIG,
        providerEvidenceRoot,
        providerRunner: async () => {
          throw new Error("recovery must not rerun cutover or rollback");
        },
      },
    });
    assert.equal(result.resumed, true);
    assert.deepEqual(calls, [`recover:${crashPoint}`, "dispose"]);
    await assert.rejects(readFile(journalPath), { code: "ENOENT" });
    assert.match(result.sha256, /^[0-9a-f]{64}$/u);
  }
});

test("preflight failure occurs after candidate gate and before mutation actions", async (t) => {
  const calls = [];
  const providerEvidenceRoot = await createProviderEvidenceRoot(t);
  let providerRunnerCalled = false;
  const adapter = makeCompleteFakeAdapter({
    calls,
    preflight: async () => {
      calls.push("preflight");
      throw new Phase2OperatorError(
        "POSTGRES_CLIENT_MISSING",
        "toolchain-preflight",
      );
    },
  });
  await assert.rejects(runFrontendUpgradePhase2Operator({
    [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
      adapterFactory: async () => adapter,
      credentialPayload: credentialPayload(),
      environment: ENVIRONMENT,
      expectedCommit: COMMIT,
      operatorConfig: OPERATOR_CONFIG,
      providerEvidenceRoot,
      providerRunner: async (input) => {
        providerRunnerCalled = true;
        return executeFixture(input);
      },
    },
  }), (error) => {
    assert.ok(error instanceof Phase2CutoverFailure);
    assert.equal(error.failureReport.failedStage, "operator-preflight");
    assert.deepEqual(error.failureReport.cause, {
      code: "POSTGRES_CLIENT_MISSING",
      phase: "toolchain-preflight",
    });
    assert.equal(error.failureReport.candidateGatePassed, true);
    assert.equal(error.failureReport.providerWriteAttempted, false);
    return true;
  });
  assert.equal(providerRunnerCalled, true);
  assert.deepEqual(calls, [
    "candidateGate",
    "preflight",
    "revokeTemporaryAccess",
    "dispose",
  ]);
});

test("restore target remains internally bound when restore fails before a receipt", () => {
  const binding = PHASE2_OPERATOR_TEST_SUPPORT.createRestoreTargetBinding({
    identity: {
      database: "quantgym_v2_phase2_restore_test",
      host: "preview-db.example.com",
      port: "5432",
    },
    confirmation: (
      "destroy-preview-database:quantgym_v2_phase2_restore_test"
    ),
  });
  const target = binding.bindBeforeRestore();
  assert.match(target, /^[0-9a-f]{64}$/u);
  assert.throws(
    () => binding.requireDestroyTarget({ recovery: false }),
    /RESTORE_TARGET_BINDING_INVALID/u,
  );
  assert.equal(
    binding.requireDestroyTarget({ recovery: true }),
    target,
  );
  binding.markDestroyed();
  assert.deepEqual(binding.snapshot(), {
    destroyed: true,
    restoreAttempted: true,
    targetResourceSha256: target,
  });
});

test("orchestrator destroys the pre-bound restore target after an ambiguous restore failure", async () => {
  const binding = PHASE2_OPERATOR_TEST_SUPPORT.createRestoreTargetBinding({
    identity: {
      database: "quantgym_v2_phase2_restore_test",
      host: "preview-db.example.com",
      port: "5432",
    },
    confirmation: (
      "destroy-preview-database:quantgym_v2_phase2_restore_test"
    ),
  });
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  actions.kind = "operator";
  actions.proveRestore = () => {
    binding.bindBeforeRestore();
    throw new Error("provider response was lost after restore started");
  };
  let recoveryContext;
  actions.destroyRestoreTarget = (context) => {
    recoveryContext = context;
    const targetResourceSha256 = binding.requireDestroyTarget(context);
    binding.markDestroyed();
    return fakeReceipt("ambiguous-restore-target-destroy", {
      targetResourceSha256,
      destroyed: true,
      absentAfterDestroy: true,
      restoreIdentitySha256: "d".repeat(64),
      restoreRoleSha256: "e".repeat(64),
      restoreRoleAbsent: true,
      restoreLoginDenied: true,
    });
  };
  await assert.rejects(executeFixture({
    actions,
    credentialRoles: createPhase2CutoverFixtureCredentialRoles(),
    clock: createPhase2CutoverFixtureClock(),
  }), (error) => {
    assert.ok(error instanceof Phase2CutoverFailure);
    const destroy = error.failureReport.recoveryActions.find(
      ({ id }) => id === "destroy-restore-target",
    );
    assert.equal(destroy.status, "pass");
    return true;
  });
  assert.equal(recoveryContext.recovery, true);
  assert.equal(recoveryContext.restore, undefined);
  assert.equal(binding.snapshot().destroyed, true);
});

test("recovery verification routes R2 reads through control credentials only", async () => {
  let controlReads = 0;
  let mutationReads = 0;
  const router = PHASE2_OPERATOR_TEST_SUPPORT.createR2CredentialRouter({
    control: async (callback) => {
      controlReads += 1;
      return callback("control-access", "control-secret", "control-session");
    },
    mutation: async (callback) => {
      mutationReads += 1;
      return callback("mutation-access", "mutation-secret", "mutation-session");
    },
  });
  assert.equal(PHASE2_OPERATOR_ACTION_CREDENTIAL_SCOPES.verifyRecovery.r2, "control");
  const access = await router.use(
    PHASE2_OPERATOR_ACTION_CREDENTIAL_SCOPES.verifyRecovery.r2,
    async (accessKey) => accessKey,
  );
  assert.equal(access, "control-access");
  assert.equal(controlReads, 1);
  assert.equal(mutationReads, 0);
});

test("revocation failures expose only a safe exact progress outcome", () => {
  const cases = [
    {
      state: {
        render: false,
        postgres: false,
        r2: false,
        cloudflare: false,
      },
      expected: "none",
    },
    {
      state: {
        render: true,
        postgres: false,
        r2: false,
        cloudflare: false,
      },
      expected: "partial",
    },
    {
      state: {
        render: true,
        postgres: true,
        r2: true,
        cloudflare: true,
      },
      expected: "complete",
    },
  ];
  for (const { state, expected } of cases) {
    const error = PHASE2_OPERATOR_TEST_SUPPORT.annotateMutationRevocationFailure(
      new Error("raw-revocation-provider-secret"),
      state,
      "credential-revoke",
    );
    assert.ok(error instanceof Phase2OperatorError);
    assert.equal(error.code, "MUTATION_REVOKE_FAILED");
    assert.equal(error.mutationRevocationOutcome, expected);
    assert.equal(error.message.includes("raw-revocation-provider-secret"), false);
  }
});

test("recovery revocation closure preserves dependencies and always reaches Render", async () => {
  const execute = async ({ failPostgres = false, failR2 = false } = {}) => {
    const calls = [];
    const failures = new Set();
    const attempt = async (id, operation) => {
      calls.push(`start:${id}`);
      try {
        const value = await operation();
        calls.push(`pass:${id}`);
        return { ok: true, value };
      } catch {
        failures.add(id);
        calls.push(`fail:${id}`);
        return { ok: false, value: undefined };
      }
    };
    const result = await PHASE2_OPERATOR_TEST_SUPPORT.runRecoveryRevocationClosure({
      attempt,
      revokePostgres: async () => {
        calls.push("postgres");
        if (failPostgres) throw new Error("postgres failed");
      },
      revokeR2: async () => {
        calls.push("r2");
        if (failR2) throw new Error("r2 failed");
      },
      revokeCloudflare: async () => calls.push("cloudflare"),
      revokeRender: async () => calls.push("render"),
      revokeControlRender: async () => calls.push("control-render"),
    });
    return { calls, failures, result };
  };

  const postgresFailure = await execute({ failPostgres: true });
  assert.equal(postgresFailure.result.postgres.ok, false);
  assert.equal(postgresFailure.result.r2.ok, true);
  assert.ok(postgresFailure.calls.indexOf("r2") < postgresFailure.calls.indexOf("cloudflare"));
  assert.ok(
    postgresFailure.calls.indexOf("cloudflare") < postgresFailure.calls.indexOf("render"),
  );
  assert.ok(
    postgresFailure.calls.indexOf("render") < postgresFailure.calls.indexOf("control-render"),
  );

  const r2Failure = await execute({ failR2: true });
  assert.equal(r2Failure.result.r2.ok, false);
  assert.equal(r2Failure.calls.includes("cloudflare"), false);
  assert.equal(r2Failure.calls.includes("render"), true);
  assert.equal(r2Failure.calls.includes("control-render"), true);
  assert.deepEqual([...r2Failure.failures], ["r2-revoke"]);
});

test("SQL-managed PostgreSQL role recovery is idempotent without a temporary password", () => {
  const disposition = PHASE2_OPERATOR_TEST_SUPPORT
    .sqlManagedPostgresRevocationDisposition;
  assert.equal(disposition({
    journalCreated: true,
    loginDenied: false,
    phase: "operator-recovery",
    priorAttempt: false,
    rolePresent: true,
  }), "cleanup-required");
  assert.equal(disposition({
    journalCreated: true,
    loginDenied: true,
    phase: "operator-recovery",
    priorAttempt: true,
    rolePresent: false,
  }), "already-absent");
  assert.equal(disposition({
    journalCreated: false,
    loginDenied: true,
    phase: "operator-recovery",
    priorAttempt: false,
    rolePresent: false,
  }), "already-absent");
  assert.throws(
    () => disposition({
      journalCreated: true,
      loginDenied: true,
      phase: "operator-recovery",
      priorAttempt: false,
      rolePresent: false,
    }),
    (error) => error instanceof Phase2OperatorError
      && error.code === "POSTGRES_REVOKE_SEQUENCE_INVALID",
  );
});

test("recovery converges before provider mutation and when PostgreSQL roles were never created", async () => {
  const pristineJournal = {
    baseline: { previewAnchor: {}, productionAnchor: {} },
    seed: {
      attempted: false,
      problemIds: [],
      sourceIds: [],
      preexistingProblemIds: [],
      preexistingSourceIds: [],
    },
    restoreTarget: { attempted: false, destroyed: false },
    mutationIntents: {
      databaseMigration: false,
      apiDeploy: false,
      pagesDeploy: false,
    },
    mutations: {
      databaseMigrated: false,
      apiDeployed: false,
      pagesDeployed: false,
      cleanupCompleted: false,
      databaseRestored: false,
      apiRolledBack: false,
      pagesRolledBack: false,
    },
  };
  const provesNoProviderMutation = PHASE2_OPERATOR_TEST_SUPPORT
    .recoveryJournalProvesNoProviderMutation;
  assert.equal(provesNoProviderMutation(pristineJournal), true);
  for (const [record, key] of [
    ["mutationIntents", "databaseMigration"],
    ["mutationIntents", "apiDeploy"],
    ["mutationIntents", "pagesDeploy"],
    ["mutations", "databaseMigrated"],
    ["mutations", "apiDeployed"],
    ["mutations", "pagesDeployed"],
    ["mutations", "cleanupCompleted"],
    ["mutations", "databaseRestored"],
    ["mutations", "apiRolledBack"],
    ["mutations", "pagesRolledBack"],
    ["restoreTarget", "attempted"],
    ["restoreTarget", "destroyed"],
  ]) {
    const changed = structuredClone(pristineJournal);
    changed[record][key] = true;
    assert.equal(provesNoProviderMutation(changed), false, `${record}.${key}`);
  }
  for (const key of [
    "problemIds",
    "sourceIds",
    "preexistingProblemIds",
    "preexistingSourceIds",
  ]) {
    const changed = structuredClone(pristineJournal);
    changed.seed[key].push("durable-seed-observation");
    assert.equal(provesNoProviderMutation(changed), false, `seed.${key}`);
  }
  const attemptedSeed = structuredClone(pristineJournal);
  attemptedSeed.seed.attempted = true;
  assert.equal(provesNoProviderMutation(attemptedSeed), false);
  const missingBaseline = structuredClone(pristineJournal);
  missingBaseline.baseline = null;
  assert.equal(provesNoProviderMutation(missingBaseline), false);

  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");

  const recoveryStart = source.indexOf("const recover = async (context = {}) =>");
  const recoveryEnd = source.indexOf("const actions = Object.freeze", recoveryStart);
  const recovery = source.slice(recoveryStart, recoveryEnd);
  const baselineNoMutationBranch = recovery.indexOf(
    "&& recoveryJournalProvesNoProviderMutation(recoveryJournal)",
  );
  const baselineReconcileBranch = recovery.indexOf(
    "} else if (baseline !== null) {",
    baselineNoMutationBranch,
  );
  const baselineNoMutationBody = recovery.slice(
    baselineNoMutationBranch,
    baselineReconcileBranch,
  );
  const noBaselineBranch = recovery.indexOf(
    "} else if (Object.values(recoveryJournal.mutationIntents).some(Boolean)) {",
  );
  const mutationTopologyRead = recovery.indexOf(
    'await readTopology("operator-recovery-no-baseline", { controlOnly: true })',
    noBaselineBranch,
  );
  const noMutationElse = recovery.indexOf(
    "} else {",
    mutationTopologyRead,
  );
  const noMutationBranch = recovery.indexOf(
    'recoveryFailures.delete("postgres-binding");',
    noMutationElse,
  );
  const revocationClosure = recovery.indexOf(
    "const revocationClosure = await runRecoveryRevocationClosure",
    noMutationBranch,
  );
  assert.ok(recoveryStart >= 0);
  assert.ok(baselineNoMutationBranch >= 0);
  assert.ok(baselineReconcileBranch > baselineNoMutationBranch);
  assert.match(
    baselineNoMutationBody,
    /recoveryFailures\.delete\("postgres-binding"\)/u,
  );
  assert.doesNotMatch(
    baselineNoMutationBody,
    /readTopology|updateRecoveryJournal|finalization|revocations/u,
  );
  assert.ok(noBaselineBranch >= 0);
  assert.ok(mutationTopologyRead > noBaselineBranch);
  assert.ok(noMutationElse > mutationTopologyRead);
  assert.ok(noMutationBranch > noMutationElse);
  assert.ok(revocationClosure > noMutationBranch);
  assert.doesNotMatch(
    recovery.slice(noMutationBranch, revocationClosure),
    /readTopology/u,
  );

  const postgresStart = source.indexOf("const revokePostgresCredentials = async");
  const postgresFallback = source.indexOf(
    "recoveryMode\n      && postgresRolesCreated === false",
    postgresStart,
  );
  const fallbackEnd = source.indexOf(
    "await bindPreviewPostgresInventory(phase);",
    postgresFallback,
  );
  const fallback = source.slice(postgresFallback, fallbackEnd);
  assert.ok(postgresStart >= 0);
  assert.ok(postgresFallback > postgresStart);
  assert.ok(fallbackEnd > postgresFallback);
  assert.match(fallback, /recoveryJournal\.postgresAccess\.created === false/u);
  assert.equal(
    fallback.match(/controlPostgresRolesPresent\(/gu)?.length,
    1,
  );
  assert.match(fallback, /observation < 2/u);
  assert.match(fallback, /present\.size === 0/u);
  assert.match(fallback, /stage: "postgres-roles-confirmed-absent"/u);
  assert.match(
    fallback,
    /postgres: \{ control: true, mutation: true, restore: true \}/u,
  );
});

test("durable PostgreSQL terminal ack gates Render and avoids Render inventory on recovery", async () => {
  const {
    recoverTerminalPostgresControl,
    runOrderedTerminalControlRevocations,
  } = PHASE2_OPERATOR_TEST_SUPPORT;
  const events = [];
  let renderInventoryCalls = 0;
  const postgresProof = { kind: "control", revoked: true };
  const result = await runOrderedTerminalControlRevocations({
    revokePostgres: () => recoverTerminalPostgresControl({
      controlAcknowledged: true,
      reverifyAcknowledged: async () => {
        events.push("postgres-admin-reverified");
        return postgresProof;
      },
      runFullRevocation: async () => {
        renderInventoryCalls += 1;
        events.push("render-inventory-read");
        return postgresProof;
      },
    }),
    revokeRender: async () => {
      events.push("render-revocation-converged");
      return { revoked: true };
    },
  });
  assert.equal(result.postgresProof, postgresProof);
  assert.equal(result.renderProof.revoked, true);
  assert.equal(renderInventoryCalls, 0);
  assert.deepEqual(events, [
    "postgres-admin-reverified",
    "render-revocation-converged",
  ]);

  events.length = 0;
  await runOrderedTerminalControlRevocations({
    revokePostgres: () => recoverTerminalPostgresControl({
      controlAcknowledged: false,
      reverifyAcknowledged: async () => {
        events.push("unexpected-admin-only-reverify");
      },
      runFullRevocation: async () => {
        events.push("postgres-full-provider-verification");
        return postgresProof;
      },
    }),
    revokeRender: async () => {
      events.push("render-revocation-started");
      return { revoked: true };
    },
  });
  assert.deepEqual(events, [
    "postgres-full-provider-verification",
    "render-revocation-started",
  ]);

  events.length = 0;
  await assert.rejects(runOrderedTerminalControlRevocations({
    revokePostgres: async () => {
      events.push("postgres-full-verification-failed");
      throw new Error("provider inventory unavailable");
    },
    revokeRender: async () => {
      events.push("render-must-not-start");
    },
  }), /provider inventory unavailable/u);
  assert.deepEqual(events, ["postgres-full-verification-failed"]);
});

test("PostgreSQL terminal journal ack follows full provider and admin verification", async () => {
  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");
  const start = source.indexOf("const revokePostgresCredentials = async");
  const deferredControlDrop = source.indexOf(
    'revokePostgresIdentity("control", phase, { deferJournalAck: true })',
    start,
  );
  const providerInventoryVerification = source.indexOf(
    "providerPostgresFinalInventoryValid(phase)",
    start,
  );
  const adminContinuityVerification = source.indexOf(
    'controlLogin === `${continuityUser}|on`',
    start,
  );
  const durableControlAck = source.indexOf(
    'stage: "postgres-control-revoked"',
    start,
  );
  assert.ok(start >= 0);
  assert.ok(deferredControlDrop > start);
  assert.ok(providerInventoryVerification > deferredControlDrop);
  assert.ok(adminContinuityVerification > providerInventoryVerification);
  assert.ok(durableControlAck > adminContinuityVerification);
});

test("terminal recovery revalidates sustainable channels and rejects every drift class", async () => {
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  const receipt = await actions.verifyPostRevokeContinuity();
  const continuityBasis = structuredClone(receipt.details);
  for (const key of [
    "renderControlRevoked",
    "renderControlAccessDenied",
    "renderControlRefreshDenied",
    "renderControlRevocationEvidenceSha256",
    "postgresControlRevokedAfterContinuity",
    "postgresControlIdentity",
    "terminalTemporaryControlCredentialsRevoked",
    "sustainableControlRevalidation",
  ]) delete continuityBasis[key];
  const observation = {
    pullRequest: structuredClone(continuityBasis.pullRequest),
    apiEvidenceSha256: continuityBasis.previewApi.evidenceSha256,
    databaseRevision: continuityBasis.previewDatabase.revision,
    databaseEvidenceSha256: continuityBasis.previewDatabase.evidenceSha256,
    remainingR2Count: 0,
    r2BucketBound: true,
    r2PolicyReadOnly: true,
    r2WriteDenied: true,
    r2ProductionAccessDenied: true,
    r2EvidenceSha256: continuityBasis.previewR2.evidenceSha256,
    cloudflare: {
      previewPagesDeploymentCommit: continuityBasis.previewAnchor.pagesDeploymentCommit,
      productionPagesDeploymentCommit:
        continuityBasis.productionAnchor.pagesDeploymentCommit,
      previewPagesIdentitySha256: continuityBasis.resources.pages.identitySha256,
      productionPagesIdentitySha256:
        continuityBasis.resources.productionPages.identitySha256,
      previewR2IdentitySha256: continuityBasis.resources.r2.identitySha256,
      productionR2IdentitySha256:
        continuityBasis.resources.productionR2.identitySha256,
      previewPagesAutomaticDeploysDisabled: true,
      previewPagesPreviewDeploymentsDisabled: true,
      productionPagesBranch: "main",
      productionPagesConfigurationSha256:
        continuityBasis.productionAnchor.pagesConfigurationSha256,
      productionPagesSuccessfulDeploymentSetSha256:
        continuityBasis.productionAnchor.pagesSuccessfulDeploymentSetSha256,
      candidateCommitRecordCount:
        continuityBasis.productionAnchor.candidateCommitRecordCount,
      candidateCommitSkippedRecordCount:
        continuityBasis.productionAnchor.candidateCommitSkippedRecordCount,
      candidateCommitStartedRecordCount:
        continuityBasis.productionAnchor.candidateCommitStartedRecordCount,
      candidateCommitAliasedRecordCount:
        continuityBasis.productionAnchor.candidateCommitAliasedRecordCount,
      candidateCommitActiveDeploymentCount:
        continuityBasis.productionAnchor.candidateCommitActiveDeploymentCount,
    },
  };
  const verify = PHASE2_OPERATOR_TEST_SUPPORT
    .verifySustainableTerminalContinuityObservation;
  const proof = verify({
    checkedAt: "2026-07-27T01:59:30.000Z",
    completedAt: "2026-07-27T01:59:31.000Z",
    continuityBasis,
    observation,
  });
  assert.equal(proof.status, "pass");
  assert.equal(proof.renderTopologyReobserved, false);
  assert.equal(proof.postgresBootstrapAdminExcludedFromReadOnlyAssertions, true);

  for (const [label, mutate] of [
    ["github", (value) => { value.pullRequest.headCommit = "f".repeat(40); }],
    ["public-api", (value) => { value.apiEvidenceSha256 = "f".repeat(64); }],
    ["database", (value) => { value.databaseRevision = "0001_phase1_foundation"; }],
    ["r2", (value) => { value.remainingR2Count = 1; }],
    ["cloudflare", (value) => {
      value.cloudflare.previewPagesDeploymentCommit = "f".repeat(40);
    }],
  ]) {
    const drifted = structuredClone(observation);
    mutate(drifted);
    assert.throws(() => verify({
      checkedAt: "2026-07-27T01:59:30.000Z",
      completedAt: "2026-07-27T01:59:31.000Z",
      continuityBasis,
      observation: drifted,
    }), (error) => {
      assert.equal(error instanceof Phase2OperatorError, true, label);
      assert.equal(error.code, "TERMINAL_CONTINUITY_REVALIDATION_FAILED", label);
      return true;
    });
  }

  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");
  const start = source.indexOf("const revalidateSustainableTerminalContinuity = async");
  const end = source.indexOf("const verifyPostRevokeContinuity = async", start);
  const implementation = source.slice(start, end);
  assert.match(implementation, /inspectPullRequest/u);
  assert.match(implementation, /healthCheck/u);
  assert.match(implementation, /identity: credentials\.adminDatabase/u);
  assert.match(implementation, /listR2SyntheticObjects/u);
  assert.match(implementation, /cfRequest/u);
  assert.doesNotMatch(implementation, /renderRequest|readTopology/u);
});

test("timed continuity batches preserve the earliest probe start across a >5m skew", async () => {
  const startedAt = "2026-07-27T01:00:00.000Z";
  const completedAt = "2026-07-27T01:06:01.000Z";
  const clockValues = [startedAt, completedAt];
  let releaseSlowProbe;
  const slowProbe = new Promise((resolve) => {
    releaseSlowProbe = resolve;
  });
  const batchPromise = PHASE2_OPERATOR_TEST_SUPPORT.runTimedObservationBatch({
    now: () => new Date(clockValues.shift()),
    probes: [
      async () => "early-result",
      async () => slowProbe,
    ],
  });
  await Promise.resolve();
  releaseSlowProbe("slow-result");
  const batch = await batchPromise;
  assert.equal(batch.startedAt, startedAt);
  assert.equal(batch.completedAt, completedAt);
  assert.deepEqual(batch.values, ["early-result", "slow-result"]);
  assert.ok(Date.parse(batch.completedAt) - Date.parse(batch.startedAt) > 5 * 60_000);
});

test("SQL-managed PostgreSQL roles preserve the exact provider credential inventory", async () => {
  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");
  assert.equal(source.match(/\/credentials`/gu)?.length, 1);
  assert.match(source, /inventory\.length === 1/u);
  assert.match(source, /inventorySha256 === providerPostgresBaselineSha256/u);
  assert.match(source, /CREATE ROLE \$\{control\} LOGIN PASSWORD/u);
  assert.match(source, /CREATE ROLE \$\{mutation\} LOGIN PASSWORD/u);
  assert.match(source, /CREATE ROLE \$\{restore\} LOGIN PASSWORD/u);
  assert.match(source, /ALTER ROLE \$\{sqlIdentifier\(role, phase\)\} NOLOGIN/u);
  assert.match(source, /REASSIGN OWNED BY \$\{sqlIdentifier\(role, phase\)\}/u);
  assert.match(source, /DROP OWNED BY \$\{sqlIdentifier\(role, phase\)\} RESTRICT/u);
  assert.match(source, /DROP ROLE \$\{sqlIdentifier\(role, phase\)\}/u);
  const restore = source.indexOf('revokePostgresIdentity("restore", phase)');
  const mutation = source.indexOf('revokePostgresIdentity("mutation", phase)');
  const control = source.indexOf(
    'revokePostgresIdentity("control", phase, { deferJournalAck: true })',
  );
  assert.ok(restore >= 0 && restore < mutation && mutation < control);
});

test("terminal recovery rejects PostgreSQL or Render proof mismatch before final facts", async () => {
  const actions = createPhase2CutoverDryRunFixture({ expectedCommit: COMMIT });
  const postRevokeReceipt = await actions.verifyPostRevokeContinuity();
  const postgresControlProof = structuredClone(
    postRevokeReceipt.details.postgresControlIdentity,
  );
  const renderControlProof = {
    revoked: postRevokeReceipt.details.renderControlRevoked,
    accessDenied: postRevokeReceipt.details.renderControlAccessDenied,
    refreshDenied: postRevokeReceipt.details.renderControlRefreshDenied,
    credentialIdentitySha256:
      postRevokeReceipt.details.renderControlCredentialIdentitySha256,
    evidenceSha256:
      postRevokeReceipt.details.renderControlRevocationEvidenceSha256,
  };
  assert.equal(PHASE2_OPERATOR_TEST_SUPPORT.verifyTerminalRevocationProofBinding({
    phase: "operator-recovery",
    postRevokeReceipt,
    postgresControlProof,
    renderControlProof,
  }), true);

  for (const [label, mutate] of [
    ["postgres", (receipt) => {
      receipt.details.postgresControlIdentity.evidenceSha256 = "f".repeat(64);
    }],
    ["render", (receipt) => {
      receipt.details.renderControlRevocationEvidenceSha256 = "f".repeat(64);
    }],
  ]) {
    const tampered = structuredClone(postRevokeReceipt);
    mutate(tampered);
    assert.throws(
      () => PHASE2_OPERATOR_TEST_SUPPORT.verifyTerminalRevocationProofBinding({
        phase: "operator-recovery",
        postRevokeReceipt: tampered,
        postgresControlProof,
        renderControlProof,
      }),
      (error) => error instanceof Phase2OperatorError
        && error.code === "TERMINAL_REVOCATION_PROOF_MISMATCH",
      label,
    );
  }
});

test("tampered backup with a readable TOC cannot reset or restore a database", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-backup-test-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  const backupPath = path.join(directory, "preview-phase1.dump");
  await writeFile(backupPath, "accepted-backup-bytes", { mode: 0o600 });
  let tocReads = 0;
  const inspectArchive = async () => {
    tocReads += 1;
    return {
      archiveEntryCount: 7,
      archiveTocSha256: "7".repeat(64),
    };
  };
  const expected = await PHASE2_OPERATOR_TEST_SUPPORT.validateBackupArchiveSnapshot({
    backupPath,
    inspectArchive,
    phase: "test-backup-capture",
  });
  await writeFile(backupPath, "tampered-backup-bytes", { mode: 0o600 });
  assert.equal((await lstat(backupPath)).size, Number(expected.backupFileIdentity.size));
  tocReads = 0;
  let resetCalls = 0;
  let restoreCalls = 0;
  await assert.rejects(
    PHASE2_OPERATOR_TEST_SUPPORT.runBackupGuardedDatabaseRestore({
      revalidateBackup: () => (
        PHASE2_OPERATOR_TEST_SUPPORT.validateBackupArchiveSnapshot({
          backupPath,
          expected,
          inspectArchive,
          phase: "operator-recovery",
        })
      ),
      resetDatabase: async () => {
        resetCalls += 1;
      },
      restoreArchive: async () => {
        restoreCalls += 1;
      },
    }),
    (error) => error instanceof Phase2OperatorError
      && error.code === "RECOVERY_BACKUP_INVALID",
  );
  assert.equal(tocReads, 1, "the tampered archive remained TOC-readable");
  assert.equal(resetCalls, 0);
  assert.equal(restoreCalls, 0);
});

test("database content snapshots bind sequence is_called and use SHA-256 aggregates", async () => {
  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");
  assert.match(source, /'is_called', state\.is_called/u);
  assert.match(source, /pg_catalog\.sha256\(pg_catalog\.convert_to/u);
  assert.match(source, /'bytesSha256', pg_catalog\.encode/u);
  assert.doesNotMatch(source, /\bmd5\s*\(/iu);

  const sequenceDigest = "1".repeat(64);
  const restoredSequenceDigest = "2".repeat(64);
  const snapshot = {
    schemaVersion: 2,
    tables: [],
    inventorySha256: "3".repeat(64),
    rowCountsSha256: "4".repeat(64),
    dataAggregateSha256: "5".repeat(64),
    snapshotSha256: "6".repeat(64),
    catalogSections: {
      sequences: { rowCount: 1, aggregateSha256: sequenceDigest },
      extensions: { rowCount: 0, aggregateSha256: "7".repeat(64) },
      largeObjects: { rowCount: 0, aggregateSha256: "8".repeat(64) },
      schemas: { rowCount: 1, aggregateSha256: "9".repeat(64) },
      objects: { rowCount: 1, aggregateSha256: "a".repeat(64) },
      database: { rowCount: 1, aggregateSha256: "b".repeat(64) },
    },
  };
  const restored = structuredClone(snapshot);
  restored.catalogSections.sequences.aggregateSha256 = restoredSequenceDigest;
  assert.equal(
    PHASE2_OPERATOR_TEST_SUPPORT.sameDatabaseContentSnapshot(
      snapshot,
      restored,
      { ignoreDatabase: true },
    ),
    false,
  );
});

test("Production R2 denial accepts only a real 403 AccessDenied response", () => {
  assert.equal(
    PHASE2_OPERATOR_TEST_SUPPORT.isR2AccessDenied(
      403,
      "<Error><Code>AccessDenied</Code></Error>",
    ),
    true,
  );
  assert.equal(
    PHASE2_OPERATOR_TEST_SUPPORT.isR2AccessDenied(
      404,
      "<Error><Code>NoSuchKey</Code></Error>",
    ),
    false,
  );
  assert.equal(
    PHASE2_OPERATOR_TEST_SUPPORT.isR2AccessDenied(
      403,
      "<!DOCTYPE x><Error><Code>AccessDenied</Code></Error>",
    ),
    false,
  );
});

test("candidate artifact manifest rejects any byte drift before deployment", async (t) => {
  const directory = await mkdtemp(path.join(tmpdir(), "phase2-artifact-drift-"));
  t.after(() => rm(directory, { force: true, recursive: true }));
  await writeFile(path.join(directory, "index.html"), "accepted bytes\n");
  const snapshot = await PHASE2_OPERATOR_TEST_SUPPORT.snapshotCandidateArtifact({
    directory,
    commit: COMMIT,
  });
  const state = { directory, commit: COMMIT, ...snapshot };
  assert.equal(
    await PHASE2_OPERATOR_TEST_SUPPORT.verifyCandidateArtifactUnchanged(state),
    snapshot.artifactManifestSha256,
  );
  await writeFile(path.join(directory, "index.html"), "drifted bytes\n");
  await assert.rejects(
    PHASE2_OPERATOR_TEST_SUPPORT.verifyCandidateArtifactUnchanged(state),
    (error) => error instanceof Phase2OperatorError
      && error.code === "CANDIDATE_ARTIFACT_DRIFTED",
  );
});

test("candidate dependency install isolates npm global and user configuration", async () => {
  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");
  assert.match(source, /const npmGlobalConfig = path\.join\(npmHome, "global\.npmrc"\)/u);
  assert.match(source, /const npmUserConfig = path\.join\(npmHome, "user\.npmrc"\)/u);
  assert.match(source, /NPM_CONFIG_GLOBALCONFIG: npmGlobalConfig/u);
  assert.match(source, /NPM_CONFIG_USERCONFIG: npmUserConfig/u);
  assert.doesNotMatch(
    source,
    /NPM_CONFIG_(?:GLOBAL|USER)CONFIG:\s*"\/dev\/null"/u,
  );
});

test("failure formatter reads only strict data descriptors and fails closed", () => {
  const error = new Error("raw-provider-secret-must-never-print");
  error.failureReport = {
    failedStage: "topology-after",
    cause: {
      code: "TOPOLOGY_READ_FAILED",
      phase: "topology-read",
    },
    recoveryStatus: "incomplete",
    recoveryActions: [
      { id: "rollback-pages", status: "pass", evidenceSha256: "a".repeat(64) },
      { id: "restore-database", status: "failed", evidenceSha256: null },
      { id: "revoke-mutation-access", status: "pass", evidenceSha256: "b".repeat(64) },
    ],
  };
  const formatted = formatPhase2OperatorFailure(error);
  assert.equal(formatted.includes("raw-provider-secret"), false);
  assert.equal(formatted, (
    "CUTOVER_FAILED (stage=topology-after, "
    + "cause=TOPOLOGY_READ_FAILED:topology-read, recovery=incomplete, "
    + "actions=rollback-pages:pass,restore-database:failed,"
    + "revoke-mutation-access:pass)"
  ));

  const missingCause = structuredClone(error.failureReport);
  delete missingCause.cause;
  assert.equal(
    formatPhase2OperatorFailure(Object.assign(new Error("hidden"), {
      failureReport: missingCause,
    })),
    "OPERATOR_RUN_FAILED (operator-run)",
  );

  let failureReportAccessorRead = false;
  const accessorError = new Error("hidden");
  Object.defineProperty(accessorError, "failureReport", {
    get() {
      failureReportAccessorRead = true;
      return error.failureReport;
    },
  });
  assert.equal(
    formatPhase2OperatorFailure(accessorError),
    "OPERATOR_RUN_FAILED (operator-run)",
  );
  assert.equal(failureReportAccessorRead, false);

  let causeAccessorRead = false;
  const accessorCause = {};
  Object.defineProperties(accessorCause, {
    code: {
      enumerable: true,
      get() {
        causeAccessorRead = true;
        return "TOPOLOGY_READ_FAILED";
      },
    },
    phase: { enumerable: true, value: "topology-read" },
  });
  const accessorCauseError = new Error("hidden");
  accessorCauseError.failureReport = {
    ...error.failureReport,
    cause: accessorCause,
  };
  assert.equal(
    formatPhase2OperatorFailure(accessorCauseError),
    "OPERATOR_RUN_FAILED (operator-run)",
  );
  assert.equal(causeAccessorRead, false);

  const proxiedError = new Proxy(error, {
    getOwnPropertyDescriptor() {
      throw new Error("proxy-secret-must-not-print");
    },
  });
  assert.equal(
    formatPhase2OperatorFailure(proxiedError),
    "OPERATOR_RUN_FAILED (operator-run)",
  );

  const selfReported = new Error("raw-secret");
  selfReported.code = "SK_LIVE_SECRET_ABC123456789";
  selfReported.phase = "topology-read";
  assert.equal(
    formatPhase2OperatorFailure(selfReported),
    "OPERATOR_RUN_FAILED (operator-run)",
  );

  error.failureReport.cause.message = "unsafe raw secret";
  assert.equal(
    formatPhase2OperatorFailure(error),
    "OPERATOR_RUN_FAILED (operator-run)",
  );
  delete error.failureReport.cause.message;
  error.failureReport.recoveryActions[0].id = "unsafe raw secret";
  assert.equal(
    formatPhase2OperatorFailure(error),
    "OPERATOR_RUN_FAILED (operator-run)",
  );
});

test("real adapter cannot run preflight before the candidate gate", async () => {
  let commandCalls = 0;
  let fetchCalls = 0;
  const adapter = await createPhase2OperatorAdapter({
    credentialPayload: credentialPayload(),
    operatorConfig: OPERATOR_CONFIG,
    commandRunner: async () => {
      commandCalls += 1;
      throw new Error("must not run");
    },
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error("must not fetch");
    },
  });
  try {
    assert.equal(adapter.credentialRoles.bootstrap.kind, "persistent-provider-admin");
    assert.equal(adapter.credentialRoles.bootstrap.privilege, "admin");
    assert.equal(adapter.credentialRoles.bootstrap.retained, true);
    assert.equal(
      adapter.credentialRoles.bootstrap.excludedFromReadOnlyControlAssertions,
      true,
    );
    await assert.rejects(adapter.actions.preflight({
      environment: "preview",
      expectedCommit: COMMIT,
      productionMutationAllowed: false,
      providerDowngradeAllowed: false,
      resourceSharingAllowed: false,
      credentialRole: adapter.credentialRoles.control,
    }), (error) => (
      error instanceof Phase2OperatorError
      && error.code === "CANDIDATE_GATE_REQUIRED"
    ));
  } finally {
    await adapter.dispose();
  }
  assert.equal(commandCalls, 0);
  assert.equal(fetchCalls, 0);
});

test("Render credential timing is accepted only from the trusted CLI file", async () => {
  const payload = credentialPayload();
  payload.control.renderIssuedAt = new Date().toISOString();
  await assert.rejects(createPhase2OperatorAdapter({
    root: process.cwd(),
    credentialPayload: payload,
    operatorConfig: OPERATOR_CONFIG,
    capabilities: readyCapabilities(),
    fetchImpl: async () => { throw new Error("network forbidden"); },
    commandRunner: async () => { throw new Error("command forbidden"); },
  }), /CREDENTIAL_PAYLOAD_INVALID/u);
  delete payload.control.renderIssuedAt;
  const adapter = await createPhase2OperatorAdapter({
    root: process.cwd(),
    credentialPayload: payload,
    operatorConfig: OPERATOR_CONFIG,
    capabilities: readyCapabilities(),
    fetchImpl: async () => { throw new Error("network forbidden"); },
    commandRunner: async () => { throw new Error("command forbidden"); },
    recoveryMode: true,
  });
  await adapter.dispose();
});

test("provider compatibility uses versioned Render OAuth paths and Cloudflare total_pages", async () => {
  const source = await readFile(new URL(
    "../scripts/lib/frontend-upgrade-phase2-operator-adapter.mjs",
    import.meta.url,
  ), "utf8");

  const renderStart = source.indexOf("const refreshRenderOauth = async");
  const renderEnd = source.indexOf("const revokeRenderCredential = async", renderStart);
  const renderRevocation = source.slice(renderStart, renderEnd);
  assert.ok(renderStart >= 0);
  assert.ok(renderEnd > renderStart);
  assert.match(
    renderRevocation,
    /https:\/\/api\.render\.com\/v1\/token\/refresh\//u,
  );
  assert.match(
    renderRevocation,
    /https:\/\/api\.render\.com\/v1\/oauth\/revoke/u,
  );
  assert.doesNotMatch(
    renderRevocation,
    /https:\/\/api\.render\.com\/(?:token\/refresh\/|oauth\/revoke)/u,
  );

  const cloudflareStart = source.indexOf(
    "const listCloudflareAccountTokenIds = async",
  );
  const cloudflareEnd = source.indexOf(
    "const verifyCloudflareAccountTokenDestroyed = async",
    cloudflareStart,
  );
  const cloudflareInventory = source.slice(cloudflareStart, cloudflareEnd);
  assert.ok(cloudflareStart >= 0);
  assert.ok(cloudflareEnd > cloudflareStart);
  assert.match(cloudflareInventory, /"total_pages"/u);
  assert.match(
    cloudflareInventory,
    /Object\.keys\(resultInfo\)\.every\(\(key\) => resultInfoKeys\.has\(key\)\)/u,
  );
  assert.match(
    cloudflareInventory,
    /resultInfo\.total_pages === undefined\s+\|\|\s+resultInfo\.total_pages === totalPages/u,
  );
});

test("operator compatibility keeps rights versions and tool closures narrowly bounded", async (t) => {
  const { hashToolClosure, isRightsContentVersion } = PHASE2_OPERATOR_TEST_SUPPORT;
  assert.equal(isRightsContentVersion("2026-07-27.1"), true);
  assert.equal(isRightsContentVersion("2026-07-27.10"), true);
  for (const invalid of [
    "2026-07-27",
    "2026-07-27.0",
    "2026-07-27.01",
    "2026-07-27.",
    "2026-07-27.1.",
    "2026-07-27..1",
    "release-2026-07-27.1",
  ]) assert.equal(isRightsContentVersion(invalid), false, invalid);

  const closureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-phase2-tool-closure-"));
  t.after(() => rm(closureRoot, { force: true, recursive: true }));
  await Promise.all([
    writeFile(path.join(closureRoot, "a.bin"), "abc", { mode: 0o600 }),
    writeFile(path.join(closureRoot, "b.bin"), "def", { mode: 0o600 }),
  ]);
  assert.match(await hashToolClosure(closureRoot, { maxTotalBytes: 6 }), /^[0-9a-f]{64}$/u);
  await assert.rejects(
    hashToolClosure(closureRoot, { maxTotalBytes: 5 }),
    (error) => error instanceof Phase2OperatorError
      && error.code === "TOOL_CLOSURE_INVALID",
  );
});

test("candidate CI identity requires suite IDs and the authoritative workflow PR", () => {
  const {
    evidenceCheckWorkflowRunId,
    isEvidenceWorkflowRunIdentity,
    selectLatestEvidenceCheckSet,
    sharedEvidenceCheckSuiteId,
  } = (
    PHASE2_OPERATOR_TEST_SUPPORT
  );
  const check = {
    name: "Node and browser gates",
    head_sha: EVIDENCE_COMMIT,
    app: { slug: "github-actions" },
    status: "completed",
    conclusion: "success",
    details_url: "https://github.com/garymmmjw/QuantGym/actions/runs/9001/job/101",
    check_suite: { id: 7001 },
  };
  assert.equal(evidenceCheckWorkflowRunId(check, EVIDENCE_COMMIT), "9001");
  for (const id of [undefined, null, "7001", -1, 0, 1.5]) {
    assert.throws(
      () => evidenceCheckWorkflowRunId({
        ...check,
        check_suite: { ...check.check_suite, id },
      }, EVIDENCE_COMMIT),
      (error) => error instanceof Phase2OperatorError
        && error.code === "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
    );
  }
  assert.equal(sharedEvidenceCheckSuiteId([check, { ...check }]), 7001);
  assert.throws(
    () => sharedEvidenceCheckSuiteId([
      check,
      { ...check, check_suite: { ...check.check_suite, id: 7002 } },
    ]),
    (error) => error instanceof Phase2OperatorError
      && error.code === "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
  );
  for (const invalid of [
    { ...check, head_sha: COMMIT },
    { ...check, app: { slug: "third-party" } },
    {
      ...check,
      details_url: "https://github.com/another-owner/QuantGym/actions/runs/9001/job/101",
    },
  ]) {
    assert.throws(
      () => evidenceCheckWorkflowRunId(invalid, EVIDENCE_COMMIT),
      (error) => error instanceof Phase2OperatorError
        && error.code === "EVIDENCE_HEAD_CI_IDENTITY_INVALID",
    );
  }

  const pythonCheck = {
    ...check,
    name: "Python API and migration gates",
    details_url: "https://github.com/garymmmjw/QuantGym/actions/runs/9001/job/102",
  };
  const olderChecks = [check, pythonCheck].map((entry, index) => ({
    ...entry,
    details_url: `https://github.com/garymmmjw/QuantGym/actions/runs/9000/job/${90 + index}`,
    check_suite: { id: 7000 },
  }));
  const selected = selectLatestEvidenceCheckSet({
    total_count: 4,
    check_runs: [...olderChecks, check, pythonCheck],
  }, EVIDENCE_COMMIT, ["Node and browser gates", "Python API and migration gates"]);
  assert.equal(selected.workflowRunId, "9001");
  assert.equal(selected.checkSuiteId, 7001);
  assert.deepEqual(selected.checks.map((entry) => entry.name).sort(), [
    "Node and browser gates",
    "Python API and migration gates",
  ]);
  assert.throws(
    () => selectLatestEvidenceCheckSet({
      total_count: 4,
      check_runs: [...olderChecks, check, { ...pythonCheck, conclusion: "failure" }],
    }, EVIDENCE_COMMIT, ["Node and browser gates", "Python API and migration gates"]),
    (error) => error instanceof Phase2OperatorError
      && error.code === "EVIDENCE_HEAD_CI_NOT_GREEN",
  );
  for (const payload of [
    { total_count: 3, check_runs: [...olderChecks, check, pythonCheck] },
    {
      total_count: 3,
      check_runs: [
        ...olderChecks,
        {
          ...check,
          details_url: "https://github.com/garymmmjw/QuantGym/actions/runs/9002/job/201",
          check_suite: { id: 7002 },
        },
      ],
    },
    {
      total_count: 5,
      check_runs: [...olderChecks, check, pythonCheck, { ...check, name: "Lint" }],
    },
    {
      total_count: 4,
      check_runs: [...olderChecks, check, {
        ...check,
        details_url: "https://github.com/garymmmjw/QuantGym/actions/runs/9001/job/102",
      }],
    },
    { total_count: 101, check_runs: Array.from({ length: 101 }, () => check) },
  ]) {
    assert.throws(
      () => selectLatestEvidenceCheckSet(
        payload,
        EVIDENCE_COMMIT,
        ["Node and browser gates", "Python API and migration gates"],
      ),
      (error) => error instanceof Phase2OperatorError
        && error.code === "EVIDENCE_HEAD_CI_NOT_GREEN",
    );
  }

  const workflowRun = {
    id: 9001,
    path: ".github/workflows/frontend-v2-preview.yml",
    event: "pull_request",
    head_sha: EVIDENCE_COMMIT,
    head_branch: "codex/frontend-v2-preview",
    check_suite_id: 7001,
    run_attempt: 1,
    status: "completed",
    conclusion: "success",
    pull_requests: [{ number: 130 }],
  };
  assert.equal(isEvidenceWorkflowRunIdentity(
    workflowRun,
    EVIDENCE_COMMIT,
    7001,
    "9001",
  ), true);
  assert.equal(isEvidenceWorkflowRunIdentity(
    workflowRun,
    EVIDENCE_COMMIT,
    7002,
    "9001",
  ), false);
  for (const id of [undefined, 0, 9002]) {
    assert.equal(isEvidenceWorkflowRunIdentity(
      { ...workflowRun, id },
      EVIDENCE_COMMIT,
      7001,
      "9001",
    ), false);
  }
  assert.equal(isEvidenceWorkflowRunIdentity({
    ...workflowRun,
    run_attempt: 2,
  }, EVIDENCE_COMMIT, 7001, "9001"), false);
  for (const pullRequests of [undefined, [], [{ number: 129 }]]) {
    assert.equal(isEvidenceWorkflowRunIdentity({
      ...workflowRun,
      pull_requests: pullRequests,
    }, EVIDENCE_COMMIT, 7001, "9001"), false);
  }
});

test("Python site-packages lock rejects executable closure drift", async (t) => {
  const verify = async ({ expected, sitePackagesPath }) => (
    PHASE2_OPERATOR_TEST_SUPPORT.verifyPythonSitePackagesClosure({
      expectedClosureSha256: expected.closureSha256,
      expectedDistributions: expected.distributions,
      sitePackagesPath,
    })
  );

  for (const [label, relativePath, source] of [
    ["same-version-source", "locked_package/__init__.py", "VALUE = 'tampered'\n"],
    [
      "same-version-native",
      "locked_package/native.cpython-313-darwin.so",
      "tampered-native-binary\n",
    ],
    [
      "record",
      "locked_package-1.0.dist-info/RECORD",
      "locked_package/__init__.py,sha256=tampered,17\n",
    ],
    [
      "entry-point",
      "locked_package-1.0.dist-info/entry_points.txt",
      "[console_scripts]\nlocked-package = locked_package:tampered\n",
    ],
    ["sitecustomize", "sitecustomize.py", "raise SystemExit('tampered')\n"],
  ]) {
    const fixture = await createPythonSitePackagesFixture(t, label);
    const filePath = path.join(fixture.sitePackagesPath, ...relativePath.split("/"));
    await mkdir(path.dirname(filePath), { recursive: true });
    await writeFile(filePath, source);
    await assert.rejects(verify(fixture), rejectsPythonClosureMismatch, label);
  }

  const extraDistribution = await createPythonSitePackagesFixture(t, "extra-distribution");
  const extraMetadataPath = path.join(
    extraDistribution.sitePackagesPath,
    "unapproved-9.9.dist-info",
    "METADATA",
  );
  await mkdir(path.dirname(extraMetadataPath), { recursive: true });
  await writeFile(extraMetadataPath, [
    "Metadata-Version: 2.4",
    "Name: unapproved",
    "Version: 9.9",
    "",
  ].join("\n"));
  await writeFile(
    path.join(path.dirname(extraMetadataPath), "RECORD"),
    "unapproved-9.9.dist-info/RECORD,,\n",
  );
  const extraActual = await PHASE2_OPERATOR_TEST_SUPPORT
    .inspectPythonSitePackagesClosure(extraDistribution.sitePackagesPath);
  await assert.rejects(
    PHASE2_OPERATOR_TEST_SUPPORT.verifyPythonSitePackagesClosure({
      expectedClosureSha256: extraActual.closureSha256,
      expectedDistributions: extraDistribution.expected.distributions,
      sitePackagesPath: extraDistribution.sitePackagesPath,
    }),
    rejectsPythonClosureMismatch,
  );

  const derivedBytecode = await createPythonSitePackagesFixture(t, "derived-bytecode");
  const pycachePath = path.join(
    derivedBytecode.sitePackagesPath,
    "locked_package",
    "__pycache__",
  );
  await mkdir(pycachePath, { recursive: true });
  await writeFile(
    path.join(pycachePath, "__init__.cpython-313.pyc"),
    "derived-bytecode-is-not-part-of-the-lock",
  );
  assert.equal(
    (await verify(derivedBytecode)).closureSha256,
    derivedBytecode.expected.closureSha256,
  );
});

test("candidate gate falls back to workflow-run PR association before tool preflight", async (t) => {
  const journalPath = path.join(
    tmpdir(),
    `quantgym-phase2-recovery-${COMMIT}.json`,
  );
  await rm(journalPath, { force: true });
  t.after(() => rm(journalPath, { force: true }));
  let fetchCalls = 0;
  const [manifestBytes, phase1EvidenceLockBytes] = await Promise.all([
    readFile(new URL(
      "../docs/frontend-upgrade/phase-2-acceptance-manifest.json",
      import.meta.url,
    )),
    readFile(new URL(
      "../docs/frontend-upgrade/phase-1-evidence-lock.json",
      import.meta.url,
    )),
  ]);
  const evidenceOutputs = JSON.parse(manifestBytes.toString("utf8")).evidenceOutputs;
  const manifestSha256 = createHash("sha256").update(manifestBytes).digest("hex");
  const phase1EvidenceLockSha256 = createHash("sha256")
    .update(phase1EvidenceLockBytes)
    .digest("hex");
  const componentSummarySources = Object.fromEntries([
    "contract",
    "visual",
    "accessibility",
    "journeys",
    "recovery",
    "performance",
  ].map((name) => [name, JSON.stringify({
    commit: COMMIT,
    manifestSha256,
    phase1EvidenceLockSha256,
  })]));
  const visualReceiptSource = JSON.stringify({
    applicationCommit: COMMIT,
    manifestSha256,
    phase1EvidenceLockSha256,
  });
  const aggregateSummarySource = JSON.stringify({
    commit: COMMIT,
    manifestSha256,
    phase1EvidenceLockSha256,
    hashes: {
      componentSummarySha256: Object.fromEntries(
        Object.entries(componentSummarySources).map(([name, source]) => [
          name,
          createHash("sha256").update(source).digest("hex"),
        ]),
      ),
      visualReviewReceiptSha256: createHash("sha256")
        .update(visualReceiptSource)
        .digest("hex"),
    },
  });
  const commandRunner = async ({ args }) => {
    const command = args.join(" ");
    if (command === "rev-parse HEAD") {
      return { exitCode: 0, stdout: `${EVIDENCE_COMMIT}\n`, stderr: "" };
    }
    if (command === "branch --show-current") {
      return { exitCode: 0, stdout: "codex/frontend-v2-preview\n", stderr: "" };
    }
    if (command === "remote get-url origin") {
      return { exitCode: 0, stdout: "https://github.com/garymmmjw/QuantGym.git\n", stderr: "" };
    }
    if (command === "diff --quiet --" || command === "diff --cached --quiet --") {
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (command === "ls-files --others --exclude-standard -z") {
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (command.startsWith("merge-base --is-ancestor ")) {
      return { exitCode: 0, stdout: "", stderr: "" };
    }
    if (command === `diff --name-status -z ${COMMIT} ${EVIDENCE_COMMIT} --`) {
      return {
        exitCode: 0,
        stdout: evidenceOutputs.map((entry) => `A\0${entry}\0`).join(""),
        stderr: "",
      };
    }
    if (command.startsWith(`ls-tree -r -z ${EVIDENCE_COMMIT} -- `)) {
      return {
        exitCode: 0,
        stdout: evidenceOutputs.map((entry) => (
          `100644 blob ${"c".repeat(40)}\t${entry}\0`
        )).join(""),
        stderr: "",
      };
    }
    if (command.startsWith(`show ${EVIDENCE_COMMIT}:`)) {
      const relativePath = command.slice(`show ${EVIDENCE_COMMIT}:`.length);
      if (relativePath === ".github/workflows/frontend-v2-preview.yml") {
        return {
          exitCode: 0,
          stdout: [
            "on: pull_request",
            "jobs:",
            "  node:",
            "    name: Node and browser gates",
            "  python:",
            "    name: Python API and migration gates",
          ].join("\n"),
          stderr: "",
        };
      }
      if (relativePath === "tests/frontend-upgrade-phase2-ci-contract.test.mjs") {
        return {
          exitCode: 0,
          stdout: "const workflow = 'frontend-v2-preview.yml';\n",
          stderr: "",
        };
      }
      if (relativePath.endsWith("390-frontend-upgrade-phase-2-summary.json")) {
        return { exitCode: 0, stdout: aggregateSummarySource, stderr: "" };
      }
      if (relativePath.endsWith("390-frontend-upgrade-phase-2-visual-review-receipt.json")) {
        return { exitCode: 0, stdout: visualReceiptSource, stderr: "" };
      }
      const component = Object.keys(componentSummarySources).find((name) => (
        relativePath.endsWith(`390-frontend-upgrade-phase-2-${name}-summary.json`)
      ));
      if (component) {
        return { exitCode: 0, stdout: componentSummarySources[component], stderr: "" };
      }
      throw new Error(`unexpected evidence summary: ${relativePath}`);
    }
    if (command.endsWith(" --version")) {
      return { exitCode: 0, stdout: "10.8.2\n", stderr: "" };
    }
    throw new Error(`unexpected command: ${command}`);
  };
  const fetchImpl = async (url) => {
    fetchCalls += 1;
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    let payload;
    if (parsed.hostname === "api.cloudflare.com") {
      assert.equal(
        pathname,
        `/client/v4/accounts/${OPERATOR_CONFIG.cloudflareAccountId}`
          + "/pages/projects/quantgym-beta/deployments",
      );
      assert.equal(parsed.searchParams.get("page"), "1");
      assert.equal(parsed.searchParams.get("per_page"), "25");
      const skipped = (commit, id) => ({
        id,
        environment: "preview",
        aliases: [],
        deployment_trigger: { metadata: { commit_hash: commit, branch: "codex/frontend-v2-preview" } },
        latest_stage: { name: "queued", status: "idle", started_on: null, ended_on: null },
        stages: [{ name: "queued", status: "idle", started_on: null, ended_on: null }],
      });
      payload = {
        success: true,
        result: [skipped(COMMIT, "skip-app"), skipped(EVIDENCE_COMMIT, "skip-evidence")],
        result_info: { total_pages: 1 },
      };
    } else if (pathname.endsWith("/branches/codex%2Ffrontend-v2-preview")) {
      payload = { commit: { sha: EVIDENCE_COMMIT } };
    } else if (pathname.endsWith(`/commits/${COMMIT}`)) {
      payload = { sha: COMMIT, commit: { message: "Application [CF-Pages-Skip]" } };
    } else if (pathname.endsWith(`/commits/${EVIDENCE_COMMIT}`)) {
      payload = { sha: EVIDENCE_COMMIT, commit: { message: "Evidence [CF-Pages-Skip]" } };
    } else if (pathname.endsWith(`/commits/${EVIDENCE_COMMIT}/check-runs`)) {
      payload = {
        total_count: 2,
        check_runs: [
          {
            name: "Node and browser gates",
            head_sha: EVIDENCE_COMMIT,
            app: { slug: "github-actions" },
            status: "completed",
            conclusion: "success",
            details_url: (
              "https://github.com/garymmmjw/QuantGym/actions/runs/9001/job/101"
            ),
            check_suite: { id: 7001 },
          },
          {
            name: "Python API and migration gates",
            head_sha: EVIDENCE_COMMIT,
            app: { slug: "github-actions" },
            status: "completed",
            conclusion: "success",
            details_url: (
              "https://github.com/garymmmjw/QuantGym/actions/runs/9001/job/102"
            ),
            check_suite: { id: 7001 },
          },
        ],
      };
    } else if (pathname.endsWith("/actions/runs/9001")) {
      payload = {
        id: 9001,
        workflow_id: 42,
        check_suite_id: 7001,
        path: ".github/workflows/frontend-v2-preview.yml",
        event: "pull_request",
        head_sha: EVIDENCE_COMMIT,
        head_branch: "codex/frontend-v2-preview",
        run_attempt: 1,
        status: "completed",
        conclusion: "success",
        pull_requests: [{ number: 130 }],
      };
    } else {
      payload = {
        state: "open",
        draft: true,
        merged_at: null,
        head: {
          ref: "codex/frontend-v2-preview",
          sha: EVIDENCE_COMMIT,
          repo: { html_url: "https://github.com/garymmmjw/QuantGym" },
        },
      };
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-ratelimit-remaining": "100",
      },
    });
  };
  const adapter = await createPhase2OperatorAdapter({
    credentialPayload: credentialPayload(),
    operatorConfig: OPERATOR_CONFIG,
    capabilities: readyCapabilities(),
    commandRunner,
    fetchImpl,
  });
  try {
    const context = {
      environment: "preview",
      expectedCommit: COMMIT,
      productionMutationAllowed: false,
      providerDowngradeAllowed: false,
      resourceSharingAllowed: false,
      credentialRole: adapter.credentialRoles.control,
    };
    await adapter.actions.candidateGate(context);
    const journalPath = path.join(
      tmpdir(),
      `quantgym-phase2-recovery-${COMMIT}.json`,
    );
    const [journalSource, journalMetadata] = await Promise.all([
      readFile(journalPath, "utf8"),
      lstat(journalPath),
    ]);
    assert.equal(journalMetadata.mode & 0o777, 0o600);
    assert.equal(journalSource.includes(CONTROL_SECRET), false);
    assert.equal(journalSource.includes(MUTATION_SECRET), false);
    assert.equal(JSON.parse(journalSource).expectedCommit, COMMIT);
    fetchCalls = 0;
    const expectedToolchainFailure = process.versions.node === "20.20.2"
      ? "WRANGLER_BINARY_MISSING"
      : "NODE_VERSION_MISMATCH";
    await assert.rejects(adapter.actions.preflight(context), (error) => (
      error instanceof Phase2OperatorError
      && error.code === expectedToolchainFailure
    ));
  } finally {
    await adapter.dispose();
  }
  assert.equal(fetchCalls, 0);
});

test("operator runner is formally disabled in CI even with local authorization", async () => {
  let adapterFactoryCalled = false;
  await assert.rejects(runFrontendUpgradePhase2Operator({
    [TEST_ONLY_PHASE2_OPERATOR_RUNNER]: {
      adapterFactory: async () => {
        adapterFactoryCalled = true;
      },
      credentialPayload: credentialPayload(),
      environment: { ...ENVIRONMENT, CI: "true" },
      expectedCommit: COMMIT,
      operatorConfig: OPERATOR_CONFIG,
      providerEvidenceRoot: "/tmp/phase2-ci-boundary-must-not-be-used",
      providerRunner: async () => {},
    },
  }), (error) => (
    error instanceof Phase2OperatorError
    && error.code === "LOCAL_OPERATOR_AUTHORIZATION_REQUIRED"
  ));
  assert.equal(adapterFactoryCalled, false);
});

test("operator runner does not add Wrangler to the application dependency lock", async () => {
  const [manifest, lock] = await Promise.all([
    readFile(new URL("../package.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../package-lock.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  assert.equal(manifest.devDependencies.wrangler, undefined);
  assert.equal(manifest.dependencies.wrangler, undefined);
  assert.equal(lock.packages[""].devDependencies.wrangler, undefined);
  assert.equal(lock.packages[""].dependencies.wrangler, undefined);
  assert.equal(lock.packages["node_modules/wrangler"], undefined);
  assert.equal(manifest.dependencies["@tanstack/react-virtual"], "3.14.8");
});
