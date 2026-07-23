import {
  createHash,
  createHmac,
  randomBytes as cryptoRandomBytes,
  randomUUID as cryptoRandomUUID,
} from "node:crypto";
import { constants as fsConstants, open, realpath } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..");
const EVIDENCE_RELATIVE = (
  "artifacts/frontend-upgrade/phase-1-preview/provider-evidence.redacted.json"
);
const PREVIEW_BUCKET = "quantgym-v2-preview-media";
const PRODUCTION_BUCKET = "quantgym-media";
const EXPECTED_BRANCH = "codex/frontend-v2-preview";
const SIGNING_REGION = "auto";
const SIGNING_SERVICE = "s3";
const TEST_PREFIX = "readiness-smoke/phase1/";
const SYNTHETIC_KEY_PATTERN = (
  /^readiness-smoke\/phase1\/[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}[.]txt$/
);
const MAX_SYNTHETIC_OBJECTS = 32;
const MAX_READ_BYTES = 1024 * 1024;
const MAX_EVIDENCE_BYTES = 256 * 1024;
const MAX_EVIDENCE_AGE_MS = 7 * 24 * 60 * 60 * 1000;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const SHA_PATTERN = /^[a-f0-9]{40}$/;
const ACCOUNT_PATTERN = /^[a-f0-9]{32}$/;
const CHECK_NAME = "frontend-v2-phase1-r2";

export const TEST_ONLY_PHASE1_R2 = Symbol("frontend-upgrade-phase1-r2-test-only");

class SafeCheckError extends Error {
  constructor(code) {
    super();
    this.name = "SafeCheckError";
    this.code = code;
  }
}

const fail = (code) => {
  throw new SafeCheckError(code);
};

const clean = (value) => typeof value === "string" ? value.trim() : "";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();
const isHash = (value) => typeof value === "string" && HASH_PATTERN.test(value);
const isSha = (value) => typeof value === "string" && SHA_PATTERN.test(value);
const sameHash = (left, right) => (
  isHash(left) && isHash(right) && left.length === right.length && left === right
);
const checkedAt = (now) => now.toISOString();

const failureSummary = (code) => ({
  schemaVersion: 1,
  check: CHECK_NAME,
  status: "fail",
  failureCodes: [code],
});

const requirePlainObject = (value, code = "provider_evidence_invalid") => {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) fail(code);
  return value;
};

const requireHash = (value) => {
  if (!isHash(value)) fail("provider_evidence_invalid");
  return value;
};

const parseEvidenceTime = (value) => {
  if (
    typeof value !== "string"
    || !value.endsWith("Z")
    || !Number.isFinite(Date.parse(value))
  ) fail("provider_evidence_invalid");
  return Date.parse(value);
};

const selectEvidence = (evidence, evidenceSha256, now) => {
  const value = requirePlainObject(evidence);
  if (
    value.schemaVersion !== 1
    || value.environment !== "preview"
    || value.branch !== EXPECTED_BRANCH
    || value.postgresMajor !== 18
    || !isSha(value.applicationCommit)
  ) fail("provider_evidence_invalid");

  const capturedMs = parseEvidenceTime(value.capturedAt);
  const expiresMs = parseEvidenceTime(value.expiresAt);
  const nowMs = now.getTime();
  const lifetime = expiresMs - capturedMs;
  if (
    lifetime <= 0
    || lifetime > MAX_EVIDENCE_AGE_MS
    || capturedMs > nowMs
    || expiresMs < nowMs
  ) fail("provider_evidence_stale");

  const fingerprints = requirePlainObject(value.resourceFingerprints);
  const previewR2Sha256 = requireHash(fingerprints.r2);
  const productionR2Sha256 = requireHash(fingerprints.productionR2);
  if (sameHash(previewR2Sha256, productionR2Sha256)) {
    fail("resource_identity_reused");
  }

  const bindings = requirePlainObject(value.bindings);
  const binding = requirePlainObject(bindings.r2);
  if (binding.status !== "ready" || binding.isolated !== true) {
    fail("r2_binding_not_isolated");
  }
  if (!isHash(evidenceSha256)) fail("provider_evidence_invalid");
  const policies = requirePlainObject(value.r2PolicyAttestations);
  const runtimeIdSha256 = requireHash(policies.runtimeIdSha256);
  const auditIdSha256 = requireHash(policies.auditIdSha256);
  requireHash(policies.runtimePolicySha256);
  requireHash(policies.auditPolicySha256);
  if (
    runtimeIdSha256 === auditIdSha256
    || policies.runtimeExpirationStatus !== "current"
    || policies.auditExpirationStatus !== "short-lived"
  ) fail("r2_policy_attestation_invalid");

  return {
    commit: value.applicationCommit,
    previewR2Sha256,
    productionR2Sha256,
    evidenceSha256,
    runtimeIdSha256,
    auditIdSha256,
  };
};

const normalizeJurisdiction = (value) => {
  const jurisdiction = clean(value) || "default";
  if (!new Set(["default", "eu", "fedramp"]).has(jurisdiction)) {
    fail("r2_jurisdiction_invalid");
  }
  return jurisdiction;
};

const endpointSuffixFor = (jurisdiction) => (
  jurisdiction === "default"
    ? "r2.cloudflarestorage.com"
    : `${jurisdiction}.r2.cloudflarestorage.com`
);

const validateEndpoint = (value, jurisdiction) => {
  const source = clean(value);
  const suffix = endpointSuffixFor(jurisdiction);
  const escapedSuffix = suffix.replaceAll(".", "\\.");
  const match = new RegExp(`^https://([a-f0-9]{32})\\.${escapedSuffix}/?$`).exec(source);
  let url;
  try {
    url = new URL(source);
  } catch {
    fail("r2_endpoint_invalid");
  }
  if (
    !match
    || url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
    || !ACCOUNT_PATTERN.test(match[1])
  ) fail("r2_endpoint_invalid");
  return { origin: url.origin, accountId: match[1] };
};

const validateAccessKey = (value) => {
  const accessKey = clean(value);
  if (!/^[a-f0-9]{32}$/.test(accessKey)) {
    fail("r2_credential_invalid");
  }
  return accessKey;
};

const validateSecretKey = (value) => {
  if (
    typeof value !== "string"
    || value.length < 16
    || value.length > 1024
    || /[\u0000-\u001f\u007f]/.test(value)
  ) fail("r2_credential_invalid");
  return value;
};

const amzTimestamp = (now) => now.toISOString().replace(/[:-]|\.\d{3}/g, "");
const awsEncode = (value) => encodeURIComponent(value).replace(/[!'()*]/gu, (character) => (
  `%${character.charCodeAt(0).toString(16).toUpperCase()}`
));
const canonicalQuery = (url) => [...url.searchParams.entries()]
  .map(([key, value]) => [awsEncode(key), awsEncode(value)])
  .sort(([leftKey, leftValue], [rightKey, rightValue]) => (
    leftKey.localeCompare(rightKey) || leftValue.localeCompare(rightValue)
  ))
  .map(([key, value]) => `${key}=${value}`)
  .join("&");

const signingKey = (secretKey, dateStamp) => (
  hmac(
    hmac(
      hmac(
        hmac(Buffer.from(`AWS4${secretKey}`, "utf8"), dateStamp),
        SIGNING_REGION,
      ),
      SIGNING_SERVICE,
    ),
    "aws4_request",
  )
);

const sigV4Headers = ({
  method,
  url,
  body,
  accessKey,
  secretKey,
  now,
  contentType = "",
}) => {
  const parsed = new URL(url);
  const payload = Buffer.isBuffer(body) ? body : Buffer.from(body ?? "");
  const payloadHash = sha256(payload);
  const timestamp = amzTimestamp(now);
  const dateStamp = timestamp.slice(0, 8);
  const canonicalHeaders = (
    `host:${parsed.host}\n`
    + `x-amz-content-sha256:${payloadHash}\n`
    + `x-amz-date:${timestamp}\n`
  );
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    parsed.pathname || "/",
    canonicalQuery(parsed),
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${SIGNING_REGION}/${SIGNING_SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    timestamp,
    credentialScope,
    sha256(canonicalRequest),
  ].join("\n");
  const signature = hmac(signingKey(secretKey, dateStamp), stringToSign).toString("hex");
  return {
    authorization: (
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, `
      + `SignedHeaders=${signedHeaders}, Signature=${signature}`
    ),
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": timestamp,
    ...(contentType ? { "content-type": contentType } : {}),
  };
};

const encodeObjectKey = (key) => key.split("/").map(encodeURIComponent).join("/");

const request = async ({
  method,
  url,
  body = Buffer.alloc(0),
  contentType = "",
  accessKey,
  secretKey,
  now,
  fetchImpl,
  expectedStatuses,
  code,
}) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: sigV4Headers({
        method,
        url,
        body,
        contentType,
        accessKey,
        secretKey,
        now,
      }),
      body: method === "GET" || method === "HEAD" ? undefined : body,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    fail(code);
  }
  if (
    !response
    || !Number.isInteger(response.status)
    || !expectedStatuses.some((expected) => (
      typeof expected === "number"
        ? response.status === expected
        : response.status >= expected[0] && response.status <= expected[1]
    ))
  ) fail(code);
  return response;
};

const anonymousReadIsDenied = async (url, fetchImpl) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    fail("anonymous_read_check_failed");
  }
  if (
    !response
    || !Number.isInteger(response.status)
    || ![400, 401, 403, 404].includes(response.status)
  ) fail("anonymous_read_not_denied");
  return true;
};

const readBoundedBody = async (response) => {
  if (!response.body || typeof response.body.getReader !== "function") {
    let body;
    try {
      body = Buffer.from(await response.arrayBuffer());
    } catch {
      fail("r2_read_failed");
    }
    if (body.length > MAX_READ_BYTES) fail("r2_read_too_large");
    return body;
  }
  const reader = response.body.getReader();
  const chunks = [];
  let length = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = Buffer.from(value);
      length += chunk.length;
      if (length > MAX_READ_BYTES) {
        await reader.cancel();
        fail("r2_read_too_large");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("r2_read_failed");
  }
  return Buffer.concat(chunks, length);
};

const decodeXmlText = (value) => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&quot;", "\"")
  .replaceAll("&apos;", "'")
  .replaceAll("&amp;", "&");

const parseListObjects = async (response) => {
  const body = await readBoundedBody(response);
  const source = body.toString("utf8");
  if (
    !source.startsWith("<?xml")
    || /<!DOCTYPE|<!ENTITY/iu.test(source)
    || !/<ListBucketResult(?:\s|>)/u.test(source)
  ) fail("r2_list_invalid");
  const truncated = /<IsTruncated>true<\/IsTruncated>/u.test(source);
  if (truncated) fail("r2_cleanup_limit_exceeded");
  const keys = [];
  const pattern = /<Contents>[\s\S]*?<Key>([\s\S]*?)<\/Key>[\s\S]*?<\/Contents>/gu;
  for (const match of source.matchAll(pattern)) {
    keys.push(decodeXmlText(match[1]));
  }
  if (keys.length > MAX_SYNTHETIC_OBJECTS) fail("r2_cleanup_limit_exceeded");
  if (
    new Set(keys).size !== keys.length
    || keys.some((key) => !SYNTHETIC_KEY_PATTERN.test(key))
  ) fail("r2_cleanup_scope_invalid");
  return keys;
};

const listObjects = async ({
  endpoint,
  bucket,
  accessKey,
  secretKey,
  now,
  fetchImpl,
  expectedStatuses = [[200, 299]],
  code = "r2_list_failed",
}) => {
  const listUrl = new URL(
    `${endpoint.origin}/${encodeURIComponent(bucket)}`,
  );
  listUrl.searchParams.set("list-type", "2");
  listUrl.searchParams.set("max-keys", String(MAX_SYNTHETIC_OBJECTS + 1));
  listUrl.searchParams.set("prefix", TEST_PREFIX);
  const response = await request({
    method: "GET",
    url: listUrl.href,
    accessKey,
    secretKey,
    now,
    fetchImpl,
    expectedStatuses,
    code,
  });
  return response;
};

const deleteSyntheticObject = async ({
  endpoint,
  key,
  accessKey,
  secretKey,
  now,
  fetchImpl,
}) => {
  if (!SYNTHETIC_KEY_PATTERN.test(key)) fail("r2_cleanup_scope_invalid");
  const objectUrl = (
    `${endpoint.origin}/${encodeURIComponent(PREVIEW_BUCKET)}/${encodeObjectKey(key)}`
  );
  await request({
    method: "DELETE",
    url: objectUrl,
    accessKey,
    secretKey,
    now,
    fetchImpl,
    expectedStatuses: [[200, 299], 404],
    code: "r2_cleanup_failed",
  });
};

const safeUuid = (value) => {
  const normalized = clean(value).toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(normalized)) {
    fail("r2_object_identifier_invalid");
  }
  return normalized;
};

const loadEvidence = async () => {
  const expectedPath = path.resolve(root, EVIDENCE_RELATIVE);
  let handle;
  try {
    if (typeof fsConstants.O_NOFOLLOW !== "number") {
      fail("provider_evidence_invalid");
    }
    const [rootReal, parentReal] = await Promise.all([
      realpath(root),
      realpath(path.dirname(expectedPath)),
    ]);
    const expectedParent = path.join(
      rootReal,
      "artifacts/frontend-upgrade/phase-1-preview",
    );
    if (parentReal !== expectedParent) fail("provider_evidence_invalid");
    handle = await open(expectedPath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat({ bigint: true });
    const currentUid = typeof process.getuid === "function" ? BigInt(process.getuid()) : before.uid;
    if (
      !before.isFile()
      || before.isSymbolicLink()
      || before.size <= 0n
      || before.size > BigInt(MAX_EVIDENCE_BYTES)
      || (before.mode & 0o777n) !== 0o600n
      || before.uid !== currentUid
    ) fail("provider_evidence_invalid");
    const source = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) fail("provider_evidence_invalid");
    }
    if (source.length !== Number(before.size) || source.length > MAX_EVIDENCE_BYTES) {
      fail("provider_evidence_invalid");
    }
    let evidence;
    try {
      evidence = JSON.parse(source.toString("utf8"));
    } catch {
      fail("provider_evidence_invalid");
    }
    return { evidence, evidenceSha256: sha256(source) };
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("provider_evidence_invalid");
  } finally {
    await handle?.close();
  }
};

const runCredentialLifecycle = async ({
  endpoint,
  accessKey,
  secretKey,
  now,
  fetchImpl,
  objectKey,
  payload,
}) => {
  const objectUrl = (
    `${endpoint.origin}/${encodeURIComponent(PREVIEW_BUCKET)}/${encodeObjectKey(objectKey)}`
  );
  await listObjects({
    endpoint,
    bucket: PRODUCTION_BUCKET,
    accessKey,
    secretKey,
    now,
    fetchImpl,
    expectedStatuses: [403],
    code: "production_r2_access_not_denied",
  });
  const objectsBefore = await parseListObjects(await listObjects({
    endpoint,
    bucket: PREVIEW_BUCKET,
    accessKey,
    secretKey,
    now,
    fetchImpl,
  }));
  for (const key of objectsBefore) {
    await deleteSyntheticObject({
      endpoint,
      key,
      accessKey,
      secretKey,
      now,
      fetchImpl,
    });
  }
  const afterStaleCleanup = await parseListObjects(await listObjects({
    endpoint,
    bucket: PREVIEW_BUCKET,
    accessKey,
    secretKey,
    now,
    fetchImpl,
  }));
  if (afterStaleCleanup.length !== 0) fail("r2_stale_cleanup_not_confirmed");

  let operationFailure = null;
  let cleanupFailure = null;
  let bytesMatch = false;
  let anonymousReadDenied = false;
  let cleanupConfirmed = false;
  try {
    await request({
      method: "PUT",
      url: objectUrl,
      body: payload,
      contentType: "text/plain; charset=utf-8",
      accessKey,
      secretKey,
      now,
      fetchImpl,
      expectedStatuses: [[200, 299]],
      code: "r2_upload_failed",
    });
    anonymousReadDenied = await anonymousReadIsDenied(objectUrl, fetchImpl);
    const getResponse = await request({
      method: "GET",
      url: objectUrl,
      accessKey,
      secretKey,
      now,
      fetchImpl,
      expectedStatuses: [[200, 299]],
      code: "r2_read_failed",
    });
    const downloaded = await readBoundedBody(getResponse);
    bytesMatch = downloaded.equals(payload);
    if (!bytesMatch) fail("r2_bytes_mismatch");
  } catch (error) {
    operationFailure = error instanceof SafeCheckError
      ? error
      : new SafeCheckError("r2_round_trip_failed");
  } finally {
    try {
      await request({
        method: "DELETE",
        url: objectUrl,
        accessKey,
        secretKey,
        now,
        fetchImpl,
        expectedStatuses: operationFailure ? [[200, 299], 404] : [[200, 299]],
        code: "r2_cleanup_failed",
      });
      await request({
        method: "HEAD",
        url: objectUrl,
        accessKey,
        secretKey,
        now,
        fetchImpl,
        expectedStatuses: [404],
        code: "r2_cleanup_not_confirmed",
      });
      cleanupConfirmed = true;
    } catch (error) {
      cleanupFailure = error instanceof SafeCheckError
        ? error
        : new SafeCheckError("r2_cleanup_failed");
    }
  }

  if (operationFailure && cleanupFailure) fail("r2_round_trip_and_cleanup_failed");
  let finalObjects;
  try {
    finalObjects = await parseListObjects(await listObjects({
      endpoint,
      bucket: PREVIEW_BUCKET,
      accessKey,
      secretKey,
      now,
      fetchImpl,
    }));
  } catch (error) {
    if (operationFailure || cleanupFailure) fail("r2_round_trip_and_cleanup_failed");
    throw error;
  }
  if (operationFailure) throw operationFailure;
  if (cleanupFailure) throw cleanupFailure;
  if (finalObjects.length !== 0) fail("r2_cleanup_not_confirmed");

  return {
    payloadSha256: sha256(payload),
    checks: {
      productionSignedAccessDenied: true,
      objectsListedBefore: true,
      staleSyntheticObjectsCleaned: true,
      signedUploadSucceeded: true,
      anonymousReadDenied,
      signedReadSucceeded: true,
      bytesMatch,
      signedDeleteSucceeded: true,
      cleanupConfirmed,
      objectsListedAfter: true,
    },
    counts: {
      objectsFoundBefore: objectsBefore.length,
      staleObjectsDeleted: objectsBefore.length,
      objectsCreated: 1,
      objectsRemaining: finalObjects.length,
    },
  };
};

export async function runFrontendUpgradePhase1R2Check(options = {}) {
  const env = options.env ?? process.env;
  const testOnly = options[TEST_ONLY_PHASE1_R2];
  if (testOnly && env.NODE_ENV !== "test") {
    fail("test_injection_forbidden");
  }

  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) fail("check_time_invalid");
  const loaded = options.evidence
    ? {
      evidence: options.evidence,
      evidenceSha256: options.evidenceSha256,
    }
    : await loadEvidence();
  const selected = selectEvidence(
    loaded.evidence,
    loaded.evidenceSha256,
    now,
  );
  const expectedEvidenceSha256 = clean(
    env.QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256,
  );
  if (
    expectedEvidenceSha256
    && (
      !isHash(expectedEvidenceSha256)
      || !sameHash(expectedEvidenceSha256, selected.evidenceSha256)
    )
  ) fail("provider_evidence_digest_mismatch");

  const jurisdiction = normalizeJurisdiction(
    env.QUANTGYM_PREVIEW_R2_JURISDICTION,
  );
  const endpoint = validateEndpoint(
    env.QUANTGYM_PREVIEW_R2_ENDPOINT,
    jurisdiction,
  );
  const runtimeAccessId = validateAccessKey(
    env.QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID,
  );
  const runtimeSecretKey = validateSecretKey(
    env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY,
  );
  const auditAccessId = validateAccessKey(
    env.QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID,
  );
  const auditSecretKey = validateSecretKey(
    env.QUANTGYM_PHASE1_R2_AUDIT_SECRET_ACCESS_KEY,
  );
  if (runtimeAccessId === auditAccessId) fail("r2_access_identities_not_independent");
  if (!sameHash(sha256(runtimeAccessId), selected.runtimeIdSha256)) {
    fail("r2_runtime_policy_identity_mismatch");
  }
  if (!sameHash(sha256(auditAccessId), selected.auditIdSha256)) {
    fail("r2_audit_policy_identity_mismatch");
  }
  const bucketIdentitySha256 = sha256(JSON.stringify([
    endpoint.accountId,
    PREVIEW_BUCKET,
    jurisdiction,
  ]));
  if (!sameHash(bucketIdentitySha256, selected.previewR2Sha256)) {
    fail("r2_binding_identity_mismatch");
  }
  if (sameHash(bucketIdentitySha256, selected.productionR2Sha256)) {
    fail("resource_identity_reused");
  }

  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") fail("r2_transport_unavailable");
  const randomUUID = testOnly?.randomUUID ?? cryptoRandomUUID;
  const runtimeUuid = safeUuid(randomUUID());
  const auditUuid = safeUuid(randomUUID());
  if (runtimeUuid === auditUuid) fail("r2_object_identifiers_not_independent");
  const runtimePayload = testOnly?.randomBytes
    ? Buffer.from(testOnly.randomBytes())
    : Buffer.from(`quantgym-phase1-r2-${cryptoRandomBytes(24).toString("hex")}\n`);
  const auditPayload = testOnly?.randomBytes
    ? Buffer.from(testOnly.randomBytes())
    : Buffer.from(`quantgym-phase1-r2-${cryptoRandomBytes(24).toString("hex")}\n`);
  if (
    runtimePayload.length <= 0
    || runtimePayload.length > MAX_READ_BYTES
    || auditPayload.length <= 0
    || auditPayload.length > MAX_READ_BYTES
  ) {
    fail("r2_payload_invalid");
  }
  const runtimeResult = await runCredentialLifecycle({
    endpoint,
    accessKey: runtimeAccessId,
    secretKey: runtimeSecretKey,
    now,
    fetchImpl,
    objectKey: `${TEST_PREFIX}${runtimeUuid}.txt`,
    payload: runtimePayload,
  });
  const auditResult = await runCredentialLifecycle({
    endpoint,
    accessKey: auditAccessId,
    secretKey: auditSecretKey,
    now,
    fetchImpl,
    objectKey: `${TEST_PREFIX}${auditUuid}.txt`,
    payload: auditPayload,
  });

  return {
    schemaVersion: 1,
    check: CHECK_NAME,
    status: "pass",
    checkedAt: checkedAt(now),
    commit: selected.commit,
    evidenceSha256: selected.evidenceSha256,
    hashes: {
      bucketIdentitySha256,
      accountIdentitySha256: sha256(endpoint.accountId),
      runtimeObjectPayloadSha256: runtimeResult.payloadSha256,
      auditObjectPayloadSha256: auditResult.payloadSha256,
      runtimeAccessIdSha256: sha256(runtimeAccessId),
      auditAccessIdSha256: sha256(auditAccessId),
    },
    checks: {
      providerEvidenceCurrent: true,
      runtimePolicyIdentityBound: true,
      auditPolicyIdentityBound: true,
      accessIdentitiesIndependent: true,
      isolatedPreviewBinding: true,
      resourceDistinctFromProduction: true,
      signingRegionAuto: true,
      dedicatedLifecyclePrefixUsed: true,
      runtimeProductionSignedAccessDenied: runtimeResult.checks.productionSignedAccessDenied,
      runtimeObjectsListedBefore: runtimeResult.checks.objectsListedBefore,
      runtimeStaleSyntheticObjectsCleaned: (
        runtimeResult.checks.staleSyntheticObjectsCleaned
      ),
      runtimeSignedUploadSucceeded: runtimeResult.checks.signedUploadSucceeded,
      runtimeAnonymousReadDenied: runtimeResult.checks.anonymousReadDenied,
      runtimeSignedReadSucceeded: runtimeResult.checks.signedReadSucceeded,
      runtimeBytesMatch: runtimeResult.checks.bytesMatch,
      runtimeSignedDeleteSucceeded: runtimeResult.checks.signedDeleteSucceeded,
      runtimeCleanupConfirmed: runtimeResult.checks.cleanupConfirmed,
      runtimeObjectsListedAfter: runtimeResult.checks.objectsListedAfter,
      auditProductionSignedAccessDenied: auditResult.checks.productionSignedAccessDenied,
      auditObjectsListedBefore: auditResult.checks.objectsListedBefore,
      auditStaleSyntheticObjectsCleaned: auditResult.checks.staleSyntheticObjectsCleaned,
      auditSignedUploadSucceeded: auditResult.checks.signedUploadSucceeded,
      auditAnonymousReadDenied: auditResult.checks.anonymousReadDenied,
      auditSignedReadSucceeded: auditResult.checks.signedReadSucceeded,
      auditBytesMatch: auditResult.checks.bytesMatch,
      auditSignedDeleteSucceeded: auditResult.checks.signedDeleteSucceeded,
      auditCleanupConfirmed: auditResult.checks.cleanupConfirmed,
      auditObjectsListedAfter: auditResult.checks.objectsListedAfter,
    },
    counts: {
      runtimeObjectsFoundBefore: runtimeResult.counts.objectsFoundBefore,
      runtimeStaleObjectsDeleted: runtimeResult.counts.staleObjectsDeleted,
      runtimeObjectsCreated: runtimeResult.counts.objectsCreated,
      runtimeObjectsRemaining: runtimeResult.counts.objectsRemaining,
      auditObjectsFoundBefore: auditResult.counts.objectsFoundBefore,
      auditStaleObjectsDeleted: auditResult.counts.staleObjectsDeleted,
      auditObjectsCreated: auditResult.counts.objectsCreated,
      auditObjectsRemaining: auditResult.counts.objectsRemaining,
    },
    failureCodes: [],
  };
}

export async function runFrontendUpgradePhase1R2Cli(options = {}) {
  const argv = options.argv ?? process.argv.slice(2);
  if (argv.length !== 0) return { status: 2, summary: failureSummary("unsupported_arguments") };
  try {
    const summary = await runFrontendUpgradePhase1R2Check(options);
    return { status: 0, summary };
  } catch (error) {
    const code = error instanceof SafeCheckError ? error.code : "internal_check_failed";
    return { status: 1, summary: failureSummary(code) };
  }
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  const result = await runFrontendUpgradePhase1R2Cli();
  console.log(JSON.stringify(result.summary));
  process.exitCode = result.status;
}
