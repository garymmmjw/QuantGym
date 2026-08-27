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
const defaultRoot = path.resolve(scriptDir, "..");
const EVIDENCE_RELATIVE = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);
const PREVIEW_BUCKET = "quantgym-v2-preview-media";
const PREVIEW_WEB_SUFFIX = "quantgym-v2-preview.pages.dev";
const AUTHENTICATED_SOURCE = (
  "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation"
);
const SIGNING_REGION = "auto";
const SIGNING_SERVICE = "s3";
const TEST_PREFIX = "readiness-smoke/";
const MAX_READ_BYTES = 1024 * 1024;
const MAX_EVIDENCE_BYTES = 256 * 1024;
const HASH_PATTERN = /^[a-f0-9]{64}$/;
const ACCOUNT_PATTERN = /^[a-f0-9]{32}$/;

// Production callers cannot select a transport or clock. Offline tests receive those seams only
// while NODE_ENV is explicitly test; the aggregate additionally confines injected runs to /tmp.
export const TEST_ONLY_PREVIEW_R2 = Symbol("frontend-upgrade-preview-r2-test-only");

class SafeCheckError extends Error {
  constructor(message) {
    super(message);
    this.name = "SafeCheckError";
  }
}

const fail = (message) => {
  throw new SafeCheckError(message);
};

const clean = (value) => typeof value === "string" ? value.trim() : "";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value) => createHmac("sha256", key).update(value).digest();

const requireText = (value, label) => {
  const normalized = clean(value);
  if (!normalized) fail(`${label} is required`);
  return normalized;
};

const requireHash = (value, label) => {
  if (typeof value !== "string" || !HASH_PATTERN.test(value)) {
    fail(`${label} must be a SHA-256 hash`);
  }
  return value;
};

const requirePlainObject = (value, label) => {
  if (
    value === null
    || typeof value !== "object"
    || Array.isArray(value)
    || Object.getPrototypeOf(value) !== Object.prototype
  ) {
    fail(`${label} must be an object`);
  }
  return value;
};

const rejectCredentialFields = (value, pathLabel = "provider evidence") => {
  if (Array.isArray(value)) {
    for (const item of value) rejectCredentialFields(item, pathLabel);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    if (/^(?:authorization|accessKey(?:Id)?|secretAccessKey|apiKey|token|password|cookie|privateKey|dsn|connectionString)$/i.test(key)) {
      fail(`${pathLabel} contains a credential field`);
    }
    rejectCredentialFields(child, pathLabel);
  }
};

const sameHash = (left, right) => (
  typeof left === "string"
  && typeof right === "string"
  && left.length === right.length
  && left === right
);

const validateWebOrigin = (value) => {
  let url;
  try {
    url = new URL(requireText(value, "QUANTGYM_PREVIEW_WEB_URL"));
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("QUANTGYM_PREVIEW_WEB_URL must be the Preview Pages HTTPS origin");
  }
  const hostname = url.hostname.toLowerCase();
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
    || (
      hostname !== PREVIEW_WEB_SUFFIX
      && !hostname.endsWith(`.${PREVIEW_WEB_SUFFIX}`)
    )
  ) {
    fail("QUANTGYM_PREVIEW_WEB_URL must be the Preview Pages HTTPS origin");
  }
  return url.origin;
};

const selectAndValidateEvidence = (evidence, evidenceSha256, webOrigin) => {
  const root = requirePlainObject(evidence, "provider evidence");
  if (root.schemaVersion !== 1 || root.authenticatedSource !== AUTHENTICATED_SOURCE) {
    fail("provider evidence source is invalid");
  }
  rejectCredentialFields(root);
  const cloudflare = requirePlainObject(root.cloudflare, "provider evidence Cloudflare section");
  const r2 = requirePlainObject(cloudflare.r2, "provider evidence R2 section");
  const accountIdHash = requireHash(
    cloudflare.accountIdHash,
    "provider evidence Cloudflare account identity",
  );
  const endpointAccountIdHash = requireHash(
    r2.endpointAccountIdHash,
    "provider evidence R2 endpoint account identity",
  );
  const bucketIdentityHash = requireHash(
    r2.bucketIdentityHash,
    "provider evidence R2 bucket identity",
  );
  const productionBucketIdentityHash = requireHash(
    cloudflare.productionR2BucketIdentityHash,
    "provider evidence production R2 bucket identity",
  );

  if (r2.bucketName !== PREVIEW_BUCKET) fail("provider evidence R2 bucket is not Preview");
  if (!new Set(["default", "eu", "fedramp"]).has(r2.jurisdiction)) {
    fail("provider evidence R2 jurisdiction is invalid");
  }
  if (r2.private !== true) fail("provider evidence R2 bucket must be private");
  if (r2.r2DevEnabled !== false) fail("provider evidence R2 development URL must be disabled");
  if (r2.credentialScope !== "single-bucket-read-write") {
    fail("provider evidence R2 credential scope is invalid");
  }
  if (r2.signingRegion !== SIGNING_REGION) {
    fail("provider evidence R2 signing region must be auto");
  }
  if (r2.lifecycleDays !== 7) fail("provider evidence R2 lifecycle must be seven days");
  if (r2.corsOrigin !== webOrigin) {
    fail("provider evidence R2 CORS origin does not match Preview web");
  }
  if (!sameHash(accountIdHash, endpointAccountIdHash)) {
    fail("provider evidence R2 endpoint account does not match Cloudflare account");
  }
  if (sameHash(bucketIdentityHash, productionBucketIdentityHash)) {
    fail("Preview R2 resource identity must differ from production");
  }

  return {
    accountIdHash,
    endpointAccountIdHash,
    bucketIdentityHash,
    productionBucketIdentityHash,
    bucketName: r2.bucketName,
    jurisdiction: r2.jurisdiction,
    evidenceSha256: requireHash(evidenceSha256, "provider evidence fingerprint"),
  };
};

const endpointSuffixFor = (jurisdiction) => (
  jurisdiction === "default"
    ? "r2.cloudflarestorage.com"
    : `${jurisdiction}.r2.cloudflarestorage.com`
);

const validateEndpoint = (value, jurisdiction) => {
  const source = requireText(value, "QUANTGYM_PREVIEW_R2_ENDPOINT");
  const suffix = endpointSuffixFor(jurisdiction);
  const escapedSuffix = suffix.replace(/\./g, "\\.");
  const rawMatch = new RegExp(`^https://([a-f0-9]{32})\\.${escapedSuffix}/?$`).exec(source);
  let url;
  try {
    url = new URL(source);
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("QUANTGYM_PREVIEW_R2_ENDPOINT must be the authenticated R2 HTTPS endpoint");
  }
  if (
    !rawMatch
    || url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
    || !ACCOUNT_PATTERN.test(rawMatch?.[1] ?? "")
  ) {
    fail("QUANTGYM_PREVIEW_R2_ENDPOINT must be the authenticated R2 HTTPS endpoint");
  }
  return { origin: url.origin, accountId: rawMatch[1] };
};

const validateAccessKey = (value) => {
  const accessKey = requireText(value, "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID");
  if (!/^[A-Za-z0-9]{16,128}$/.test(accessKey)) {
    fail("QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID is invalid");
  }
  return accessKey;
};

const validateSecretKey = (value) => {
  const secretKey = requireText(value, "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY");
  if (secretKey.length > 1024 || /[\u0000-\u001f\u007f]/.test(secretKey)) {
    fail("QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY is invalid");
  }
  return secretKey;
};

const amzTimestamp = (now) => now.toISOString().replace(/[:-]|\.\d{3}/g, "");

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

const sigV4Headers = ({ method, url, body, accessKey, secretKey, now, contentType = "" }) => {
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
    parsed.search ? parsed.search.slice(1) : "",
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

const readBoundedBody = async (response) => {
  if (!response.body || typeof response.body.getReader !== "function") {
    const body = Buffer.from(await response.arrayBuffer());
    if (body.length > MAX_READ_BYTES) fail("R2 GET response exceeded the size limit");
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
        fail("R2 GET response exceeded the size limit");
      }
      chunks.push(chunk);
    }
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("R2 GET response could not be read");
  }
  return Buffer.concat(chunks, length);
};

const signedRequest = async ({
  method,
  url,
  body = Buffer.alloc(0),
  contentType = "",
  accessKey,
  secretKey,
  now,
  fetchImpl,
}) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method,
      headers: sigV4Headers({
        method,
        url,
        body,
        accessKey,
        secretKey,
        now,
        contentType,
      }),
      body: method === "GET" || method === "HEAD" ? undefined : body,
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    fail(`R2 ${method} request failed`);
  }
  if (
    !response
    || !Number.isInteger(response.status)
    || response.status < 200
    || response.status >= 300
  ) {
    // Provider error bodies can echo object keys, endpoint details, or credentials. Never read one.
    fail(`R2 ${method} request failed`);
  }
  return response;
};

const loadEvidence = async (env) => {
  const configured = clean(env.QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH) || EVIDENCE_RELATIVE;
  const expectedPath = path.resolve(defaultRoot, EVIDENCE_RELATIVE);
  const evidencePath = path.resolve(defaultRoot, configured);
  if (evidencePath !== expectedPath) fail("provider evidence path is outside the approved directory");

  let handle;
  try {
    const [rootRealPath, directoryRealPath] = await Promise.all([
      realpath(defaultRoot),
      realpath(path.dirname(expectedPath)),
    ]);
    const requiredDirectory = path.join(
      rootRealPath,
      "artifacts/frontend-upgrade/preview-environment",
    );
    if (directoryRealPath !== requiredDirectory) {
      fail("provider evidence path is outside the approved directory");
    }
    handle = await open(evidencePath, fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW);
    const before = await handle.stat();
    if (
      !before.isFile()
      || before.size <= 0
      || before.size > MAX_EVIDENCE_BYTES
      || (before.mode & 0o077) !== 0
    ) fail("provider evidence must be an owner-only regular file");
    if (await realpath(evidencePath) !== path.join(
      requiredDirectory,
      "provider-evidence.redacted.json",
    )) fail("provider evidence path is outside the approved directory");
    const source = await handle.readFile();
    const after = await handle.stat();
    if (
      source.length !== before.size
      || source.length > MAX_EVIDENCE_BYTES
      || after.dev !== before.dev
      || after.ino !== before.ino
      || after.size !== before.size
      || after.mtimeMs !== before.mtimeMs
    ) fail("provider evidence changed while being read");
    let evidence;
    try {
      evidence = JSON.parse(source.toString("utf8"));
    } catch {
      fail("provider evidence is not valid JSON");
    }
    return { evidence, evidenceSha256: sha256(source) };
  } catch (error) {
    if (error instanceof SafeCheckError) throw error;
    fail("provider evidence could not be read");
  } finally {
    await handle?.close();
  }
};

const safeUuid = (value) => {
  const normalized = clean(value).toLowerCase();
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(normalized)) {
    fail("R2 smoke object identifier could not be generated");
  }
  return normalized;
};

export async function runFrontendUpgradePreviewR2Check(options = {}) {
  const env = options.env ?? process.env;
  const testOnly = options[TEST_ONLY_PREVIEW_R2];
  if (testOnly && env.NODE_ENV !== "test") {
    fail("test-only R2 injection requires NODE_ENV=test");
  }

  const loaded = options.evidence
    ? { evidence: options.evidence, evidenceSha256: options.evidenceSha256 }
    : await loadEvidence(env);
  const webOrigin = validateWebOrigin(env.QUANTGYM_PREVIEW_WEB_URL);
  const selected = selectAndValidateEvidence(
    loaded.evidence,
    loaded.evidenceSha256,
    webOrigin,
  );
  const endpoint = validateEndpoint(env.QUANTGYM_PREVIEW_R2_ENDPOINT, selected.jurisdiction);
  const accessKey = validateAccessKey(env.QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID);
  const secretKey = validateSecretKey(env.QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY);

  const actualAccountHash = sha256(endpoint.accountId);
  if (
    !sameHash(actualAccountHash, selected.accountIdHash)
    || !sameHash(actualAccountHash, selected.endpointAccountIdHash)
  ) {
    fail("R2 endpoint account does not match authenticated provider evidence");
  }
  const actualBucketIdentity = sha256(JSON.stringify([
    endpoint.accountId,
    selected.bucketName,
    selected.jurisdiction,
  ]));
  if (!sameHash(actualBucketIdentity, selected.bucketIdentityHash)) {
    fail("R2 bucket identity does not match authenticated provider evidence");
  }
  if (sameHash(actualBucketIdentity, selected.productionBucketIdentityHash)) {
    fail("Preview R2 resource identity must differ from production");
  }

  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") fail("R2 HTTPS transport is unavailable");
  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) fail("R2 check time is invalid");
  const uuid = safeUuid((testOnly?.randomUUID ?? cryptoRandomUUID)());
  const payload = testOnly?.randomBytes
    ? Buffer.from(testOnly.randomBytes())
    : Buffer.from(`quantgym-preview-r2-${cryptoRandomBytes(24).toString("hex")}\n`, "utf8");
  if (payload.length === 0 || payload.length > MAX_READ_BYTES) {
    fail("R2 smoke payload size is invalid");
  }
  const key = `${TEST_PREFIX}${uuid}.txt`;
  const objectUrl = (
    `${endpoint.origin}/${encodeURIComponent(selected.bucketName)}/${encodeObjectKey(key)}`
  );

  let operationError = null;
  let deleteError = null;
  let bytesMatch = false;
  let objectDeleted = false;
  try {
    await signedRequest({
      method: "PUT",
      url: objectUrl,
      body: payload,
      contentType: "text/plain; charset=utf-8",
      accessKey,
      secretKey,
      now,
      fetchImpl,
    });
    const getResponse = await signedRequest({
      method: "GET",
      url: objectUrl,
      accessKey,
      secretKey,
      now,
      fetchImpl,
    });
    const downloaded = await readBoundedBody(getResponse);
    bytesMatch = downloaded.equals(payload);
    if (!bytesMatch) fail("R2 object bytes did not match");
  } catch (error) {
    operationError = error instanceof SafeCheckError
      ? error
      : new SafeCheckError("R2 object round-trip failed");
  } finally {
    try {
      await signedRequest({
        method: "DELETE",
        url: objectUrl,
        accessKey,
        secretKey,
        now,
        fetchImpl,
      });
      objectDeleted = true;
    } catch {
      deleteError = new SafeCheckError("R2 smoke object cleanup failed");
    }
  }

  if (operationError && deleteError) {
    fail("R2 object round-trip and cleanup failed");
  }
  if (operationError) throw operationError;
  if (deleteError) throw deleteError;

  return {
    schemaVersion: 1,
    check: "frontend-v2-preview-r2",
    status: "pass",
    evidenceSha256: selected.evidenceSha256,
    hashes: {
      endpointAccountIdHash: actualAccountHash,
      bucketIdentityHash: actualBucketIdentity,
    },
    checks: {
      endpointAccountMatchesProviderEvidence: true,
      bucketIdentityMatchesProviderEvidence: true,
      resourceDistinctFromProduction: true,
      signingRegionAuto: true,
      bytesMatch,
      objectDeleted,
    },
    failureCodes: [],
  };
}

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  if (process.argv.length !== 2) {
    console.error("FAIL: unsupported arguments");
    process.exitCode = 1;
  } else try {
    const summary = await runFrontendUpgradePreviewR2Check({ env: process.env });
    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    const message = error instanceof SafeCheckError ? error.message : "R2 check failed";
    console.error(`FAIL: ${message}`);
    process.exitCode = 1;
  }
}
