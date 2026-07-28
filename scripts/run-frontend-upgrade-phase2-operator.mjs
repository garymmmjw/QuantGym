#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  runFrontendUpgradePhase2ProviderEvidence,
} from "./build-frontend-upgrade-phase2-provider-evidence.mjs";
import {
  TEST_ONLY_PHASE2_PROVIDER_EVIDENCE,
  invalidateFrontendUpgradePhase2ProviderEvidence,
  resumeFrontendUpgradePhase2ProviderEvidenceFinalization,
} from "./lib/frontend-upgrade-phase2-provider-evidence.mjs";
import {
  Phase2OperatorError,
  createPhase2OperatorAdapter,
} from "./lib/frontend-upgrade-phase2-operator-adapter.mjs";

const SHA_PATTERN = /^[0-9a-f]{40}$/u;
const MAX_CREDENTIAL_BYTES = 64 * 1024;
const ALLOWED_ARGUMENTS = Object.freeze(new Set(["--execute", "--recover"]));

export const TEST_ONLY_PHASE2_OPERATOR_RUNNER = Symbol(
  "frontend-upgrade-phase2-operator-runner-test-only",
);

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const fail = (code, phase) => {
  throw new Phase2OperatorError(code, phase);
};

const readCredentialInput = async (input = process.stdin) => {
  if (input?.isTTY === true) fail("CREDENTIAL_STDIN_REQUIRED", "credential-load");
  const chunks = [];
  let length = 0;
  try {
    for await (const chunk of input) {
      const bytes = Buffer.from(chunk);
      length += bytes.length;
      if (length > MAX_CREDENTIAL_BYTES) {
        for (const entry of chunks) entry.fill(0);
        bytes.fill(0);
        fail("CREDENTIAL_PAYLOAD_TOO_LARGE", "credential-load");
      }
      chunks.push(bytes);
    }
  } catch (error) {
    if (error instanceof Phase2OperatorError) throw error;
    fail("CREDENTIAL_STDIN_FAILED", "credential-load");
  }
  if (length === 0) fail("CREDENTIAL_STDIN_REQUIRED", "credential-load");
  const source = Buffer.concat(chunks, length);
  for (const entry of chunks) entry.fill(0);
  try {
    const value = JSON.parse(source.toString("utf8"));
    if (!isPlainObject(value)) fail("CREDENTIAL_PAYLOAD_INVALID", "credential-load");
    return value;
  } catch (error) {
    if (error instanceof Phase2OperatorError) throw error;
    fail("CREDENTIAL_PAYLOAD_INVALID", "credential-load");
  } finally {
    source.fill(0);
  }
};

const requireExecutionBoundary = (environment, expectedCommit, mode) => {
  if (!SHA_PATTERN.test(expectedCommit ?? "")) {
    fail("EXPECTED_COMMIT_INVALID", "execution-boundary");
  }
  if (!new Set(["execute", "recover"]).has(mode)) {
    fail("OPERATOR_MODE_INVALID", "execution-boundary");
  }
  if (environment.QUANTGYM_PHASE2_CUTOVER_MODE !== mode) {
    fail(mode === "recover" ? "RECOVERY_MODE_REQUIRED" : "EXECUTE_MODE_REQUIRED", "execution-boundary");
  }
  if (
    environment.CI === "true"
    || environment.CI === "1"
    || environment.QUANTGYM_PHASE2_OPERATOR_ALLOWED !== "true"
  ) fail("LOCAL_OPERATOR_AUTHORIZATION_REQUIRED", "execution-boundary");
  if (
    environment.QUANTGYM_PHASE2_CUTOVER_CONFIRMATION
    !== (mode === "recover" ? `recover-preview:${expectedCommit}` : `preview:${expectedCommit}`)
  ) fail("EXECUTE_CONFIRMATION_MISMATCH", "execution-boundary");
};

const operatorConfigFrom = (environment) => ({
  apiOrigin: environment.QUANTGYM_PREVIEW_API_ORIGIN,
  cloudflareAccountId: environment.QUANTGYM_PHASE2_CLOUDFLARE_ACCOUNT_ID,
  evidenceHeadCommit: environment.QUANTGYM_PHASE2_EVIDENCE_HEAD_COMMIT,
  httpsProxyUrl: environment.QUANTGYM_PHASE2_HTTPS_PROXY,
  postgresBinDir: environment.QUANTGYM_PHASE2_POSTGRES_BIN_DIR,
  pythonPath: environment.QUANTGYM_PYTHON_313,
  restoreDestroyConfirmation: (
    environment.QUANTGYM_PHASE2_RESTORE_DESTROY_CONFIRMATION
  ),
  webOrigin: environment.QUANTGYM_PREVIEW_WEB_URL,
  wranglerPath: environment.QUANTGYM_PHASE2_WRANGLER_PATH,
});

const requireTestOnly = (testOnly) => {
  if (process.env.NODE_ENV !== "test" || !isPlainObject(testOnly)) {
    fail("TEST_INJECTION_FORBIDDEN", "runner-create");
  }
  if (
    typeof testOnly.adapterFactory !== "function"
    || typeof testOnly.providerRunner !== "function"
    || !isPlainObject(testOnly.credentialPayload)
    || !isPlainObject(testOnly.operatorConfig)
    || typeof testOnly.providerEvidenceRoot !== "string"
  ) fail("TEST_INJECTION_INVALID", "runner-create");
  return testOnly;
};

export async function runFrontendUpgradePhase2Operator(options = {}) {
  const testOnly = options[TEST_ONLY_PHASE2_OPERATOR_RUNNER];
  const environment = testOnly?.environment ?? process.env;
  const expectedCommit = (
    testOnly?.expectedCommit
    ?? environment.QUANTGYM_PHASE2_EXPECTED_COMMIT
  );
  const mode = options.mode ?? "execute";
  requireExecutionBoundary(environment, expectedCommit, mode);
  const injected = testOnly === undefined ? undefined : requireTestOnly(testOnly);
  if (mode === "recover" && injected === undefined) {
    const resumed = await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
      expectedCommit,
    });
    if (resumed.resumed) return resumed;
  }
  if (mode === "recover" && typeof injected?.finalizationResumer === "function") {
    const resumed = await injected.finalizationResumer({ expectedCommit });
    if (resumed?.resumed === true) return resumed;
  }
  if (mode === "execute") {
    await invalidateFrontendUpgradePhase2ProviderEvidence({
      ...(injected ? {
        [TEST_ONLY_PHASE2_PROVIDER_EVIDENCE]: {
          root: injected.providerEvidenceRoot,
        },
      } : {}),
    });
  }

  let adapter;
  try {
    if (injected !== undefined) {
      adapter = await injected.adapterFactory({
        root: injected.root,
        credentialPayload: injected.credentialPayload,
        operatorConfig: injected.operatorConfig,
        capabilities: injected.capabilities,
        fetchImpl: injected.fetchImpl,
        commandRunner: injected.commandRunner,
        clock: injected.clock,
        recoveryMode: mode === "recover",
      });
    } else {
      if (
        options.adapterFactory !== undefined
        || options.capabilities !== undefined
        || options.providerRunner !== undefined
        || options.root !== undefined
      ) fail("PRODUCTION_INJECTION_FORBIDDEN", "runner-create");
      const credentialPayload = options.credentialPayload
        ?? await readCredentialInput(options.input);
      adapter = await createPhase2OperatorAdapter({
        credentialPayload,
        operatorConfig: operatorConfigFrom(environment),
        recoveryMode: mode === "recover",
      });
    }
    if (
      !isPlainObject(adapter)
      || !isPlainObject(adapter.actions)
      || adapter.actions.kind !== "operator"
      || !isPlainObject(adapter.credentialRoles)
      || typeof adapter.dispose !== "function"
    ) fail("OPERATOR_ADAPTER_INVALID", "runner-create");
    if (mode === "recover") {
      if (typeof adapter.recover !== "function") {
        fail("OPERATOR_RECOVERY_UNAVAILABLE", "runner-create");
      }
      const recovered = await adapter.recover({
        expectedCommit,
        confirmation: `recover-preview:${expectedCommit}`,
      });
      if (recovered?.providerEvidencePending === true) {
        const resumed = typeof injected?.finalizationResumer === "function"
          ? await injected.finalizationResumer({ expectedCommit })
          : await resumeFrontendUpgradePhase2ProviderEvidenceFinalization({
            expectedCommit,
          });
        if (resumed?.resumed !== true) {
          fail("EVIDENCE_FINALIZATION_RECOVERY_FAILED", "operator-recovery");
        }
        return resumed;
      }
      return recovered;
    }
    const providerRunner = testOnly?.providerRunner
      ?? runFrontendUpgradePhase2ProviderEvidence;
    return await providerRunner({
      expectedCommit,
      operatorAdapter: adapter,
      clock: testOnly?.clock,
    });
  } finally {
    await adapter?.dispose?.();
  }
}

export const formatPhase2OperatorFailure = (error) => {
  if (error instanceof Phase2OperatorError) {
    return `${error.code} (${error.phase})`;
  }
  const report = error?.failureReport;
  const recoveryStatuses = new Set(["pass", "incomplete", "not-required"]);
  const actionStatuses = new Set(["pass", "failed", "skipped"]);
  if (
    isPlainObject(report)
    && /^[a-z0-9][a-z0-9-]{1,63}$/u.test(report.failedStage ?? "")
    && recoveryStatuses.has(report.recoveryStatus)
    && Array.isArray(report.recoveryActions)
    && report.recoveryActions.every((entry) => (
      isPlainObject(entry)
      && /^[a-z0-9][a-z0-9-]{1,63}$/u.test(entry.id ?? "")
      && actionStatuses.has(entry.status)
    ))
  ) {
    const actions = report.recoveryActions.length === 0
      ? "none"
      : report.recoveryActions
        .map(({ id, status }) => `${id}:${status}`)
        .join(",");
    return (
      `CUTOVER_FAILED (stage=${report.failedStage}, `
      + `recovery=${report.recoveryStatus}, actions=${actions})`
    );
  }
  return "OPERATOR_RUN_FAILED (operator-run)";
};

const executeMain = async () => {
  const [argument] = process.argv.slice(2);
  if (process.argv.length - 2 !== 1 || !ALLOWED_ARGUMENTS.has(argument)) {
    console.error(
      "FAIL: the controlled runner accepts only --execute or --recover; adapter/module paths are forbidden",
    );
    process.exitCode = 1;
    return;
  }
  try {
    const mode = argument === "--recover" ? "recover" : "execute";
    const result = await runFrontendUpgradePhase2Operator({ mode });
    console.log(mode === "recover"
      ? `PASS: Phase 2 Preview recovery completed for ${result.expectedCommit}`
      : `PASS: Phase 2 Preview provider evidence captured for ${result.evidence.applicationCommit}`);
  } catch (error) {
    console.error(`FAIL: ${formatPhase2OperatorFailure(error)}`);
    process.exitCode = 1;
  }
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) await executeMain();
