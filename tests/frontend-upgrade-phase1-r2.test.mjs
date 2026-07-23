import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  TEST_ONLY_PHASE1_R2,
  runFrontendUpgradePhase1R2Check,
  runFrontendUpgradePhase1R2Cli,
} from "../scripts/check-frontend-upgrade-phase1-r2.mjs";

const ACCOUNT_ID = "a".repeat(32);
const BUCKET = "quantgym-v2-preview-media";
const COMMIT = "1234567890abcdef1234567890abcdef12345678";
const ACCESS_KEY = "b".repeat(32);
const AUDIT_ACCESS_ID = "c".repeat(32);
const RUNTIME_SECRET_KEY = "phase1-runtime-r2-secret-never-output";
const AUDIT_SECRET_KEY = "phase1-audit-r2-secret-never-output";
const PAYLOAD = Buffer.from("quantgym-phase1-r2-round-trip", "utf8");
const NOW = new Date("2026-07-23T03:00:00.000Z");
const RUNTIME_UUID = "123e4567-e89b-42d3-a456-426614174000";
const AUDIT_UUID = "223e4567-e89b-42d3-a456-426614174000";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const bucketFingerprint = (account = ACCOUNT_ID, jurisdiction = "default") => (
  sha256(JSON.stringify([account, BUCKET, jurisdiction]))
);

const validEvidence = () => ({
  schemaVersion: 1,
  capturedAt: "2026-07-22T03:00:00.000Z",
  expiresAt: "2026-07-24T03:00:00.000Z",
  environment: "preview",
  branch: "codex/frontend-v2-preview",
  applicationCommit: COMMIT,
  postgresMajor: 18,
  resourceFingerprints: {
    r2: bucketFingerprint(),
    productionR2: sha256("production-r2"),
  },
  bindings: {
    r2: { status: "ready", isolated: true },
  },
  r2PolicyAttestations: {
    runtimeIdSha256: sha256(ACCESS_KEY),
    runtimePolicySha256: sha256("runtime-policy"),
    runtimeExpirationStatus: "current",
    auditIdSha256: sha256(AUDIT_ACCESS_ID),
    auditPolicySha256: sha256("audit-policy"),
    auditExpirationStatus: "short-lived",
  },
});

const validEnv = () => ({
  NODE_ENV: "test",
  QUANTGYM_PREVIEW_R2_ENDPOINT: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID: ACCESS_KEY,
  QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY: RUNTIME_SECRET_KEY,
  QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID: AUDIT_ACCESS_ID,
  QUANTGYM_PHASE1_R2_AUDIT_SECRET_ACCESS_KEY: AUDIT_SECRET_KEY,
});

const response = (status, body = null) => {
  if (status === 204 || status === 304) return new Response(null, { status });
  return new Response(body, { status });
};

const fixtureTransport = ({
  anonymousStatus = 403,
  readPayload = PAYLOAD,
  uploadStatus = 200,
  deleteStatus = 204,
  cleanupStatus = 404,
  productionStatus = 403,
  runtimeProductionStatus = productionStatus,
  auditProductionStatus = productionStatus,
  staleKeys = [],
  finalKeys = null,
  expectedAuthorizations = null,
} = {}) => {
  const requests = [];
  const keys = new Set(staleKeys);
  let listCount = 0;
  const listXml = (listedKeys) => (
    `<?xml version="1.0" encoding="UTF-8"?>`
    + `<ListBucketResult><IsTruncated>false</IsTruncated>`
    + listedKeys.map((key) => `<Contents><Key>${key}</Key></Contents>`).join("")
    + `</ListBucketResult>`
  );
  const fetchImpl = async (url, options = {}) => {
    const parsed = new URL(url);
    const method = options.method ?? "GET";
    const authorization = options.headers?.authorization;
    const identity = typeof authorization === "string"
      ? authorization.includes(ACCESS_KEY)
        ? "runtime"
        : authorization.includes(AUDIT_ACCESS_ID)
          ? "audit"
          : "unknown"
      : "anonymous";
    requests.push({
      method,
      signed: typeof authorization === "string",
      identity,
      url: String(url),
      body: options.body ? Buffer.from(options.body) : null,
      headers: options.headers,
    });
    if (
      expectedAuthorizations instanceof Map
      && typeof authorization === "string"
      && authorization !== expectedAuthorizations.get(`${identity}:${method}:${String(url)}`)
    ) {
      return response(403);
    }
    const isList = parsed.searchParams.get("list-type") === "2";
    if (method === "GET" && isList && parsed.pathname === "/quantgym-media") {
      return response(
        identity === "runtime" ? runtimeProductionStatus : auditProductionStatus,
        listXml([]),
      );
    }
    if (method === "GET" && isList) {
      listCount += 1;
      const listed = finalKeys !== null && listCount >= 3 ? finalKeys : [...keys];
      return response(200, listXml(listed));
    }
    const encodedPrefix = "/quantgym-v2-preview-media/";
    const key = parsed.pathname.startsWith(encodedPrefix)
      ? decodeURIComponent(parsed.pathname.slice(encodedPrefix.length))
      : "";
    if (method === "PUT") {
      if (uploadStatus >= 200 && uploadStatus < 300) keys.add(key);
      return response(uploadStatus);
    }
    if (method === "GET" && !authorization) return response(anonymousStatus);
    if (method === "GET") return response(200, readPayload);
    if (method === "DELETE") {
      const status = (
        key.endsWith(`${RUNTIME_UUID}.txt`) || key.endsWith(`${AUDIT_UUID}.txt`)
      ) ? deleteStatus : 204;
      if ((status >= 200 && status < 300) || status === 404) keys.delete(key);
      return response(status);
    }
    if (method === "HEAD") return response(cleanupStatus);
    throw new Error("unexpected request");
  };
  return { fetchImpl, requests };
};

const optionsFor = (transport, overrides = {}) => ({
  env: validEnv(),
  evidence: validEvidence(),
  evidenceSha256: sha256("phase1-provider-evidence"),
  [TEST_ONLY_PHASE1_R2]: {
    fetchImpl: transport.fetchImpl,
    now: NOW,
    randomUUID: (() => {
      const values = [RUNTIME_UUID, AUDIT_UUID];
      let index = 0;
      return () => values[index++] ?? values.at(-1);
    })(),
    randomBytes: () => PAYLOAD,
  },
  ...overrides,
});

test("signed upload/read/delete passes, anonymous read fails, and cleanup is confirmed", async () => {
  const transport = fixtureTransport();
  const summary = await runFrontendUpgradePhase1R2Check(optionsFor(transport));

  assert.equal(summary.status, "pass");
  assert.equal(summary.commit, COMMIT);
  assert.equal(summary.checkedAt, NOW.toISOString());
  assert.equal(summary.hashes.bucketIdentitySha256, bucketFingerprint());
  assert.equal(summary.hashes.runtimeObjectPayloadSha256, sha256(PAYLOAD));
  assert.equal(summary.hashes.auditObjectPayloadSha256, sha256(PAYLOAD));
  assert.deepEqual(summary.counts, {
    runtimeObjectsFoundBefore: 0,
    runtimeStaleObjectsDeleted: 0,
    runtimeObjectsCreated: 1,
    runtimeObjectsRemaining: 0,
    auditObjectsFoundBefore: 0,
    auditStaleObjectsDeleted: 0,
    auditObjectsCreated: 1,
    auditObjectsRemaining: 0,
  });
  assert.ok(Object.values(summary.checks).every(Boolean));
  const lifecycleRequests = [
    ["GET", true],
    ["GET", true],
    ["GET", true],
    ["PUT", true],
    ["GET", false],
    ["GET", true],
    ["DELETE", true],
    ["HEAD", true],
    ["GET", true],
  ];
  assert.deepEqual(
    transport.requests.map(({ method, signed }) => [method, signed]),
    [...lifecycleRequests, ...lifecycleRequests],
  );
  for (const upload of transport.requests.filter(({ method }) => method === "PUT")) {
    assert.equal(upload.body.equals(PAYLOAD), true);
  }
  for (const request of transport.requests.filter(({ signed }) => signed)) {
    assert.match(request.headers.authorization, /\/auto\/s3\/aws4_request/);
    const expectedId = request.identity === "runtime" ? ACCESS_KEY : AUDIT_ACCESS_ID;
    assert.equal(request.headers.authorization.includes(expectedId), true);
    assert.equal(request.headers.authorization.includes(RUNTIME_SECRET_KEY), false);
    assert.equal(request.headers.authorization.includes(AUDIT_SECRET_KEY), false);
  }
  const rendered = JSON.stringify(summary);
  for (const secret of [
    ACCOUNT_ID,
    ACCESS_KEY,
    AUDIT_ACCESS_ID,
    RUNTIME_SECRET_KEY,
    AUDIT_SECRET_KEY,
    RUNTIME_UUID,
    AUDIT_UUID,
  ]) {
    assert.equal(rendered.includes(secret), false);
  }
});

test("the authenticated endpoint tuple must match provider R2 evidence before network", async () => {
  const transport = fixtureTransport();
  const evidence = validEvidence();
  evidence.resourceFingerprints.r2 = bucketFingerprint("b".repeat(32));
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(transport, { evidence })),
    (error) => error.code === "r2_binding_identity_mismatch",
  );
  assert.equal(transport.requests.length, 0);
});

test("provider evidence must be current, isolated, distinct, and digest-bound", async () => {
  const cases = [
    [
      "stale",
      (evidence, env) => { evidence.expiresAt = "2026-07-22T00:00:00.000Z"; },
      "provider_evidence_stale",
    ],
    [
      "not isolated",
      (evidence, env) => { evidence.bindings.r2.isolated = false; },
      "r2_binding_not_isolated",
    ],
    [
      "production collision",
      (evidence, env) => {
        evidence.resourceFingerprints.productionR2 = evidence.resourceFingerprints.r2;
      },
      "resource_identity_reused",
    ],
    [
      "digest mismatch",
      (evidence, env) => {
        env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256 = sha256("different");
      },
      "provider_evidence_digest_mismatch",
    ],
    [
      "runtime and audit policy identity collision",
      (evidence, env) => {
        evidence.r2PolicyAttestations.auditIdSha256 = (
          evidence.r2PolicyAttestations.runtimeIdSha256
        );
      },
      "r2_policy_attestation_invalid",
    ],
  ];
  for (const [label, mutate, code] of cases) {
    const transport = fixtureTransport();
    const evidence = validEvidence();
    const env = validEnv();
    mutate(evidence, env);
    await assert.rejects(
      runFrontendUpgradePhase1R2Check(optionsFor(transport, { evidence, env })),
      (error) => error.code === code,
      label,
    );
    assert.equal(transport.requests.length, 0);
  }
});

test("endpoint, jurisdiction, and credentials are strict and do not make requests", async () => {
  const cases = [
    (env) => { env.QUANTGYM_PREVIEW_R2_ENDPOINT = "http://127.0.0.1:9000"; },
    (env) => { env.QUANTGYM_PREVIEW_R2_JURISDICTION = "unknown"; },
    (env) => { env.QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID = "short"; },
    (env) => { env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY = "short"; },
    (env) => { env.QUANTGYM_PHASE1_R2_AUDIT_SECRET_ACCESS_KEY = "short"; },
    (env) => { env.QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID = "short"; },
    (env) => { env.QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID = ACCESS_KEY; },
  ];
  for (const mutate of cases) {
    const transport = fixtureTransport();
    const env = validEnv();
    mutate(env);
    await assert.rejects(
      runFrontendUpgradePhase1R2Check(optionsFor(transport, { env })),
    );
    assert.equal(transport.requests.length, 0);
  }
});

test("runtime and audit identities are digest-bound before any R2 request", async () => {
  for (const [field, value, code] of [
    ["QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID", "d".repeat(32), "r2_runtime_policy_identity_mismatch"],
    ["QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID", "e".repeat(32), "r2_audit_policy_identity_mismatch"],
  ]) {
    const transport = fixtureTransport();
    const env = validEnv();
    env[field] = value;
    await assert.rejects(
      runFrontendUpgradePhase1R2Check(optionsFor(transport, { env })),
      (error) => error.code === code,
    );
    assert.equal(transport.requests.length, 0);
  }
});

test("a mismatched runtime secret fails before R2 binding can pass", async () => {
  const validTransport = fixtureTransport();
  await runFrontendUpgradePhase1R2Check(optionsFor(validTransport));
  const expectedAuthorizations = new Map(
    validTransport.requests
      .filter(({ signed }) => signed)
      .map(({ identity, method, url, headers }) => [
        `${identity}:${method}:${url}`,
        headers.authorization,
      ]),
  );
  const mismatchedTransport = fixtureTransport({ expectedAuthorizations });
  const env = validEnv();
  env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY = `${RUNTIME_SECRET_KEY}-mismatch`;
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(mismatchedTransport, { env })),
    (error) => error.code === "r2_list_failed",
  );
  assert.deepEqual(
    mismatchedTransport.requests.map(({ identity }) => identity),
    ["runtime", "runtime"],
  );
});

test("production bucket must reject both signed identities with exactly 403", async () => {
  for (const [identity, transport] of [
    ["runtime", fixtureTransport({ runtimeProductionStatus: 200 })],
    ["audit", fixtureTransport({ auditProductionStatus: 200 })],
  ]) {
    await assert.rejects(
      runFrontendUpgradePhase1R2Check(optionsFor(transport)),
      (error) => error.code === "production_r2_access_not_denied",
      identity,
    );
    const productionRequests = transport.requests.filter(({ url }) => (
      new URL(url).pathname === "/quantgym-media"
    ));
    assert.equal(
      productionRequests.some((request) => request.identity === identity),
      true,
    );
  }
});

test("lists and deletes bounded stale synthetic objects under the lifecycle prefix", async () => {
  const stale = "readiness-smoke/phase1/223e4567-e89b-42d3-a456-426614174001.txt";
  const transport = fixtureTransport({ staleKeys: [stale] });
  const summary = await runFrontendUpgradePhase1R2Check(optionsFor(transport));
  assert.deepEqual(summary.counts, {
    runtimeObjectsFoundBefore: 1,
    runtimeStaleObjectsDeleted: 1,
    runtimeObjectsCreated: 1,
    runtimeObjectsRemaining: 0,
    auditObjectsFoundBefore: 0,
    auditStaleObjectsDeleted: 0,
    auditObjectsCreated: 1,
    auditObjectsRemaining: 0,
  });
  const staleDelete = transport.requests.find((entry) => (
    entry.method === "DELETE" && entry.url.includes("223e4567")
  ));
  assert.ok(staleDelete);
});

test("refuses out-of-scope or excessive list results without deleting", async () => {
  for (const staleKeys of [
    ["readiness-smoke/phase1/not-a-safe-object.txt"],
    Array.from({ length: 33 }, (_, index) => (
      `readiness-smoke/phase1/223e4567-e89b-42d3-a456-${String(index).padStart(12, "0")}.txt`
    )),
  ]) {
    const transport = fixtureTransport({ staleKeys });
    await assert.rejects(
      runFrontendUpgradePhase1R2Check(optionsFor(transport)),
      (error) => new Set([
        "r2_cleanup_scope_invalid",
        "r2_cleanup_limit_exceeded",
      ]).has(error.code),
    );
    assert.equal(transport.requests.some(({ method }) => method === "DELETE"), false);
  }
});

test("objectsRemaining comes from the final signed list and fails closed", async () => {
  const leaked = "readiness-smoke/phase1/323e4567-e89b-42d3-a456-426614174002.txt";
  const transport = fixtureTransport({ finalKeys: [leaked] });
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(transport)),
    (error) => error.code === "r2_cleanup_not_confirmed",
  );
});

test("anonymous success fails the gate but still deletes and confirms cleanup", async () => {
  const transport = fixtureTransport({ anonymousStatus: 200 });
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(transport)),
    (error) => error.code === "anonymous_read_not_denied",
  );
  assert.deepEqual(
    transport.requests.map(({ method }) => method),
    ["GET", "GET", "GET", "PUT", "GET", "DELETE", "HEAD", "GET"],
  );
});

test("byte mismatch and upload failure both attempt cleanup without reading error bodies", async () => {
  const mismatch = fixtureTransport({ readPayload: Buffer.from("wrong") });
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(mismatch)),
    (error) => error.code === "r2_bytes_mismatch",
  );
  assert.deepEqual(
    mismatch.requests.map(({ method }) => method),
    ["GET", "GET", "GET", "PUT", "GET", "GET", "DELETE", "HEAD", "GET"],
  );

  const uploadFailure = fixtureTransport({ uploadStatus: 500 });
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(uploadFailure)),
    (error) => error.code === "r2_upload_failed",
  );
  assert.deepEqual(
    uploadFailure.requests.map(({ method }) => method),
    ["GET", "GET", "GET", "PUT", "DELETE", "HEAD", "GET"],
  );
});

test("cleanup requires a signed post-delete absence check", async () => {
  const transport = fixtureTransport({ cleanupStatus: 200 });
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(optionsFor(transport)),
    (error) => error.code === "r2_cleanup_not_confirmed",
  );
  assert.deepEqual(
    transport.requests.map(({ method }) => method),
    ["GET", "GET", "GET", "PUT", "GET", "GET", "DELETE", "HEAD", "GET"],
  );
});

test("test-only transport injection is forbidden outside NODE_ENV=test", async () => {
  const transport = fixtureTransport();
  const options = optionsFor(transport);
  options.env = { ...options.env, NODE_ENV: "production" };
  await assert.rejects(
    runFrontendUpgradePhase1R2Check(options),
    (error) => error.code === "test_injection_forbidden",
  );
  assert.equal(transport.requests.length, 0);
});

test("CLI returns one redacted JSON-shaped result and never echoes arguments", async () => {
  const transport = fixtureTransport();
  const passing = await runFrontendUpgradePhase1R2Cli({
    ...optionsFor(transport),
    argv: [],
  });
  assert.equal(passing.status, 0);
  assert.equal(passing.summary.status, "pass");

  const argument = `--secret=${RUNTIME_SECRET_KEY}`;
  const rejected = await runFrontendUpgradePhase1R2Cli({ argv: [argument] });
  assert.equal(rejected.status, 2);
  assert.deepEqual(rejected.summary.failureCodes, ["unsupported_arguments"]);
  assert.equal(JSON.stringify(rejected).includes(RUNTIME_SECRET_KEY), false);

  const failedTransport = fixtureTransport({ anonymousStatus: 200 });
  const failed = await runFrontendUpgradePhase1R2Cli({
    ...optionsFor(failedTransport),
    argv: [],
  });
  assert.equal(failed.status, 1);
  assert.deepEqual(failed.summary.failureCodes, ["anonymous_read_not_denied"]);
  const rendered = JSON.stringify(failed.summary);
  for (const secret of [
    ACCOUNT_ID,
    ACCESS_KEY,
    AUDIT_ACCESS_ID,
    RUNTIME_SECRET_KEY,
    AUDIT_SECRET_KEY,
    RUNTIME_UUID,
    AUDIT_UUID,
  ]) {
    assert.equal(rendered.includes(secret), false);
  }
});
