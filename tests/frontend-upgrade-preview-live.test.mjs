import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmod, mkdtemp, mkdir, readFile, rm, stat, symlink, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TEST_ONLY_PREVIEW_LIVE,
  TEST_ONLY_PREVIEW_POSTGRES_RUNNER_SOURCE,
  runFrontendUpgradePreviewLiveCheck,
} from "../scripts/check-frontend-upgrade-preview-live.mjs";
import {
  TEST_ONLY_PREVIEW_R2,
  runFrontendUpgradePreviewR2Check,
} from "../scripts/check-frontend-upgrade-preview-r2.mjs";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EVIDENCE_RELATIVE = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);
const SCHEMA_RELATIVE = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence-schema.json"
);
const SUMMARY_RELATIVE = (
  "docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json"
);
const WEB_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const API_ORIGIN = "https://quantgym-v2-preview-api.onrender.com";
const BRANCH = "codex/frontend-v2-preview";
const COMMIT = "30d8d85161f21fc1346705d148a87ddcf47bfa7e";
const ACCOUNT_ID = "a".repeat(32);
const ACCESS_KEY = "R2ACCESSKEYEXAMPLE";
const SECRET_KEY = "r2-secret-value-that-must-never-appear";
const POSTGRES_SECRET = "postgres-secret-value-that-must-never-appear";
const PREVIEW_BUCKET = "quantgym-v2-preview-media";
const SOURCE = "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);
const r2IdentityHash = (accountId, bucketName, jurisdiction = "default") => (
  sha256(JSON.stringify([accountId, bucketName, jurisdiction]))
);

const hashes = Object.freeze({
  account: sha256(ACCOUNT_ID),
  pages: sha256("preview-pages-id"),
  productionPages: sha256("production-pages-id"),
  api: sha256("preview-api-id"),
  llm: sha256("preview-llm-id"),
  productionApi: sha256("production-api-id"),
  productionLlm: sha256("production-llm-id"),
  previewGroup: sha256("preview-group-id"),
  productionGroup: sha256("production-group-id"),
  workspace: sha256("render-workspace-id"),
  postgresResource: sha256("preview-postgres-resource-id"),
  productionPostgresResource: sha256("production-postgres-resource-id"),
  postgresHost: sha256("preview-postgres.example.render.com"),
  postgresDatabase: sha256("quantgym_v2_preview"),
  postgresRole: sha256("quantgym_v2_preview_role"),
  r2: r2IdentityHash(ACCOUNT_ID, PREVIEW_BUCKET, "default"),
  productionR2: r2IdentityHash(ACCOUNT_ID, "quantgym-media-production", "default"),
});

const validEvidence = () => ({
  schemaVersion: 1,
  authenticatedSource: SOURCE,
  capturedAt: "2026-07-15T02:00:00.000Z",
  operator: "preview-operator",
  budgetOwner: "preview-budget-owner",
  destroyOwner: "preview-destroy-owner",
  cloudflare: {
    accountIdHash: hashes.account,
    pages: {
      projectIdHash: hashes.pages,
      name: "quantgym-v2-preview",
      productionBranch: BRANCH,
      buildCommand: (
        "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview"
      ),
      destinationDir: "dist-preview",
      latestDeploymentCommit: COMMIT,
      latestDeploymentStatus: "success",
    },
    productionPagesProjectIdHash: hashes.productionPages,
    r2: {
      bucketIdentityHash: hashes.r2,
      bucketName: PREVIEW_BUCKET,
      jurisdiction: "default",
      endpointAccountIdHash: hashes.account,
      private: true,
      r2DevEnabled: false,
      credentialScope: "single-bucket-read-write",
      signingRegion: "auto",
      lifecycleDays: 7,
      corsOrigin: WEB_ORIGIN,
    },
    productionR2BucketIdentityHash: hashes.productionR2,
  },
  render: {
    workspaceIdHash: hashes.workspace,
    services: [
      {
        serviceIdHash: hashes.api,
        name: "quantgym-v2-preview-api",
        type: "web_service",
        repo: "https://github.com/garymmmjw/QuantGym",
        branch: BRANCH,
        buildCommand: "npm ci",
        startCommand: "node scripts/serve-frontend-upgrade-preview-probe.mjs",
        nodeVersion: "20.20.2",
        linkedGroupIdHashes: [hashes.previewGroup],
      },
      {
        serviceIdHash: hashes.llm,
        name: "quantgym-v2-preview-llm",
        type: "private_service",
        repo: "https://github.com/garymmmjw/QuantGym",
        branch: BRANCH,
        buildCommand: "npm ci",
        startCommand: "node scripts/serve-frontend-upgrade-preview-probe.mjs",
        nodeVersion: "20.20.2",
        linkedGroupIdHashes: [hashes.previewGroup],
      },
    ],
    productionServiceIdHashes: [hashes.productionApi, hashes.productionLlm].sort(),
    previewAllowedGroupIdHashes: [hashes.previewGroup],
    productionGroupIdHashes: [hashes.productionGroup],
    postgres: {
      resourceIdHash: hashes.postgresResource,
      hostHash: hashes.postgresHost,
      databaseHash: hashes.postgresDatabase,
      roleHash: hashes.postgresRole,
    },
    productionPostgresResourceIdHash: hashes.productionPostgresResource,
  },
});

const validVersion = () => ({
  environment: "preview-v2",
  service: "web",
  commit: COMMIT,
  branch: BRANCH,
  buildSource: "cloudflare-pages",
});

const validConfig = () => ({
  ...validVersion(),
  apiBase: `${API_ORIGIN}/api/v2`,
});

const validApiHealth = () => ({
  status: "ok",
  environment: "preview-v2",
  service: "api",
  commit: COMMIT,
  legacySchemaLoaded: false,
  llmVerified: true,
  llmCommit: COMMIT,
});

const validGitSummary = () => ({
  worktreeClean: true,
  originUrlExact: true,
  currentBranchExact: true,
  localBranchExists: true,
  originBranchContainsCommit: true,
  remoteBranchExact: true,
  deployedCommitAncestorOfHead: true,
  descendantChangesRestricted: true,
  replaceRefsAbsent: true,
  graftsAbsent: true,
  indexFlagsSafe: true,
  runtimeFilesMatchExpectedCommit: true,
});

const validIndex = () => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>QuantGym Preview v2 probe</title>
  </head>
  <body>
    <main>
      <h1>QuantGym Preview v2</h1>
      <p>Minimal environment-isolation probe.</p>
      <pre id="probe" aria-live="polite">Loading…</pre>
    </main>
    <script type="module">
      const [config, version] = await Promise.all([
        fetch("./config.json", { credentials: "omit" }).then((response) => response.json()),
        fetch("./version.json", { credentials: "omit" }).then((response) => response.json()),
      ]);
      document.querySelector("#probe").textContent = JSON.stringify({ config, version }, null, 2);
    </script>
  </body>
</html>
`;

const validPostgresSummary = () => ({
  schemaVersion: 1,
  check: "frontend-v2-preview-postgres",
  status: "pass",
  evidenceSha256: "",
  hashes: {
    resourceIdHash: hashes.postgresResource,
    hostHash: hashes.postgresHost,
    databaseHash: hashes.postgresDatabase,
    roleHash: hashes.postgresRole,
  },
  checks: {
    selectOne: true,
    sslForCurrentBackend: true,
    hostMatchesProviderEvidence: true,
    databaseMatchesProviderEvidence: true,
    roleMatchesProviderEvidence: true,
    resourceDistinctFromProduction: true,
    publicSchemaEmpty: true,
  },
  publicBaseTableCount: 0,
  failureCodes: [],
});

const validR2Summary = () => ({
  schemaVersion: 1,
  check: "frontend-v2-preview-r2",
  status: "pass",
  evidenceSha256: "",
  hashes: {
    endpointAccountIdHash: hashes.account,
    bucketIdentityHash: hashes.r2,
  },
  checks: {
    endpointAccountMatchesProviderEvidence: true,
    bucketIdentityMatchesProviderEvidence: true,
    resourceDistinctFromProduction: true,
    signingRegionAuto: true,
    bytesMatch: true,
    objectDeleted: true,
  },
  failureCodes: [],
});

const validEnv = () => ({
  NODE_ENV: "test",
  QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
  QUANTGYM_PREVIEW_API_ORIGIN: API_ORIGIN,
  QUANTGYM_PREVIEW_EXPECTED_COMMIT: COMMIT,
  QUANTGYM_PREVIEW_EXPECTED_BRANCH: BRANCH,
  QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH: EVIDENCE_RELATIVE,
  QUANTGYM_PREVIEW_POSTGRES_URL: (
    `postgresql://preview_role:${POSTGRES_SECRET}@preview-postgres.example.render.com/preview`
  ),
  QUANTGYM_PREVIEW_R2_ENDPOINT: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID: ACCESS_KEY,
  QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY: SECRET_KEY,
});

const json = (response, value, status = 200, headers = {}, pretty = false) => {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(`${JSON.stringify(value, null, pretty ? 2 : 0)}\n`);
};

const startFixtureServer = async (fixture = {}) => {
  const state = {
    requests: [],
    uploaded: null,
    deleteAttempts: 0,
    deleted: false,
    ...fixture.state,
  };
  const values = {
    version: validVersion(),
    config: validConfig(),
    index: validIndex(),
    health: validApiHealth(),
    validCorsOrigin: WEB_ORIGIN,
    invalidCorsMode: "reject",
    corsAllowHeaders: "content-type",
    corsVary: "Origin",
    r2GetBody: null,
    ...fixture,
  };
  delete values.state;

  const server = createServer(async (request, response) => {
    const chunks = [];
    for await (const chunk of request) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);
    const originalUrl = String(request.headers["x-fixture-original-url"] || "");
    const original = new URL(originalUrl);
    state.requests.push({
      method: request.method,
      originalUrl,
      origin: request.headers.origin || "",
      authorization: request.headers.authorization || "",
      amzContentSha256: request.headers["x-amz-content-sha256"] || "",
      amzDate: request.headers["x-amz-date"] || "",
      body,
    });

    if (original.pathname === "/index.html") {
      response.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      });
      response.end(values.index);
      return;
    }
    if (original.pathname === "/version.json") {
      json(response, values.version, 200, {}, true);
      return;
    }
    if (original.pathname === "/config.json") {
      json(response, values.config, 200, {}, true);
      return;
    }
    if (original.pathname === "/api/v2/health") {
      if (request.method === "OPTIONS") {
        const origin = String(request.headers.origin || "");
        if (origin === values.validCorsOrigin || values.invalidCorsMode === "reflect") {
          response.writeHead(204, {
            "access-control-allow-origin": origin,
            "access-control-allow-methods": "GET, OPTIONS",
            "access-control-allow-headers": values.corsAllowHeaders,
            vary: values.corsVary,
          });
          response.end();
          return;
        }
        if (values.invalidCorsMode === "wildcard") {
          response.writeHead(204, { "access-control-allow-origin": "*" });
          response.end();
          return;
        }
        json(response, { status: "forbidden" }, 403);
        return;
      }
      json(response, values.health, 200, {
        "access-control-allow-origin": values.apiGetCorsOrigin ?? WEB_ORIGIN,
        vary: "Origin",
      });
      return;
    }

    if (original.hostname.endsWith("r2.cloudflarestorage.com")) {
      const expectedObjectPath = /^\/quantgym-v2-preview-media\/readiness-smoke\/[a-f0-9-]{36}\.txt$/;
      const expectedPayloadHash = sha256(request.method === "PUT" ? body : Buffer.alloc(0));
      if (
        !expectedObjectPath.test(original.pathname)
        || !/^AWS4-HMAC-SHA256 Credential=[A-Za-z0-9]+\/\d{8}\/auto\/s3\/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=[a-f0-9]{64}$/.test(
          String(request.headers.authorization || ""),
        )
        || request.headers["x-amz-content-sha256"] !== expectedPayloadHash
      ) {
        json(response, { status: "invalid-signed-request" }, 403);
        return;
      }
      if (request.method === "PUT") {
        state.uploaded = body;
        response.writeHead(values.r2PutStatus ?? 200);
        response.end();
        return;
      }
      if (request.method === "GET") {
        const getBody = values.r2GetBody ?? state.uploaded ?? Buffer.alloc(0);
        response.writeHead(values.r2GetStatus ?? 200, {
          "content-type": "application/octet-stream",
        });
        response.end(getBody);
        return;
      }
      if (request.method === "DELETE") {
        state.deleteAttempts += 1;
        state.deleted = (values.r2DeleteStatus ?? 204) >= 200
          && (values.r2DeleteStatus ?? 204) < 300;
        state.uploaded = null;
        response.writeHead(values.r2DeleteStatus ?? 204);
        response.end();
        return;
      }
    }
    json(response, { status: "not-found" }, 404);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  const localOrigin = `http://127.0.0.1:${address.port}`;
  const fetchImpl = (input, init = {}) => {
    const originalUrl = String(input);
    const original = new URL(originalUrl);
    const headers = new Headers(init.headers);
    headers.set("x-fixture-original-url", originalUrl);
    return fetch(`${localOrigin}${original.pathname}${original.search}`, {
      ...init,
      headers,
    });
  };
  const close = () => new Promise((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
  return { state, fetchImpl, close };
};

const prepareRoot = async (evidence = validEvidence()) => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-preview-live-"));
  await mkdir(path.join(root, path.dirname(EVIDENCE_RELATIVE)), { recursive: true });
  await mkdir(path.join(root, path.dirname(SUMMARY_RELATIVE)), { recursive: true });
  const schemaSource = await readFile(path.join(repositoryRoot, SCHEMA_RELATIVE), "utf8");
  await writeFile(path.join(root, SCHEMA_RELATIVE), schemaSource, "utf8");
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  await writeFile(path.join(root, EVIDENCE_RELATIVE), serialized, { mode: 0o600 });
  return { root, serialized, evidenceSha256: sha256(serialized) };
};

const liveOptions = ({ root, fetchImpl, evidenceSha256, overrides = {} }) => {
  const postgres = validPostgresSummary();
  postgres.evidenceSha256 = evidenceSha256;
  const r2 = validR2Summary();
  r2.evidenceSha256 = evidenceSha256;
  return {
    env: overrides.env ?? validEnv(),
    [TEST_ONLY_PREVIEW_LIVE]: {
      root,
      now: overrides.now ?? new Date("2026-07-15T03:00:00.000Z"),
      completedAt: overrides.completedAt,
      fetchImpl,
      gitCheck: overrides.gitCheck ?? (async () => validGitSummary()),
      runPostgresCheck: overrides.runPostgresCheck ?? (async () => postgres),
      runR2Check: overrides.runR2Check ?? (async () => r2),
    },
  };
};

const runLiveFixture = async ({ evidence = validEvidence(), serverFixture = {}, overrides = {} } = {}) => {
  const prepared = await prepareRoot(evidence);
  const server = await startFixtureServer(serverFixture);
  try {
    const result = await runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: server.fetchImpl,
      overrides,
    }));
    return { result, requests: server.state.requests, prepared };
  } finally {
    await server.close();
    if (!overrides.keepRoot) await rm(prepared.root, { recursive: true, force: true });
  }
};

test("the aggregate proves exact live isolation and writes only a redacted summary", async () => {
  const { result, requests, prepared } = await runLiveFixture({ overrides: { keepRoot: true } });
  try {
    assert.equal(result.summary.status, "pass");
    assert.equal(result.summary.resourceIsolation, "pass");
    assert.equal(result.summary.applicationBindings, "deferred-to-phase1");
    assert.equal(result.summary.checkedAt, "2026-07-15T03:00:00.000Z");
    assert.equal(result.summary.evidenceExpiresAt, "2026-07-22T02:00:00.000Z");
    assert.match(result.summary.providerEvidenceSha256, /^[a-f0-9]{64}$/);
    assert.match(result.summary.minimalWebArtifactSha256, /^[a-f0-9]{64}$/);
    assert.ok(requests.some((request) => request.originalUrl === `${WEB_ORIGIN}/version.json`));
    assert.ok(requests.some((request) => request.originalUrl === `${WEB_ORIGIN}/config.json`));
    assert.ok(requests.some((request) => request.originalUrl === `${WEB_ORIGIN}/index.html`));
    assert.ok(requests.some((request) => request.originalUrl === `${API_ORIGIN}/api/v2/health`));
    assert.equal(requests.some((request) => {
      const requested = new URL(request.originalUrl);
      return requested.hostname.includes("llm") || requested.pathname === "/health";
    }), false);

    const expectedOutput = path.join(prepared.root, SUMMARY_RELATIVE);
    assert.equal(result.output, expectedOutput);
    const diskBytes = await readFile(result.output, "utf8");
    assert.deepEqual(JSON.parse(diskBytes), result.summary);
    assert.equal((await stat(result.output)).mode & 0o777, 0o644);
    const serialized = `${JSON.stringify(result.summary)}\n${diskBytes}`;
    for (const secret of [
      ACCOUNT_ID, ACCESS_KEY, SECRET_KEY, POSTGRES_SECRET, PREVIEW_BUCKET,
      "preview-postgres.example.render.com", "quantgym_v2_preview", "quantgym_v2_preview_role",
      WEB_ORIGIN, API_ORIGIN,
    ]) assert.equal(serialized.includes(secret), false, secret);
    assert.deepEqual(Object.keys(result.summary).sort(), [
      "applicationBindings", "branch", "checkedAt", "checks", "evidenceCapturedAt",
      "evidenceExpiresAt", "git", "hashes", "minimalWebArtifactSha256", "postgres",
      "providerEvidenceSha256", "r2", "resourceIsolation", "schemaVersion", "status",
    ].sort());
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("a failed rerun removes any stale passing live summary", async () => {
  const prepared = await prepareRoot();
  const summaryPath = path.join(prepared.root, SUMMARY_RELATIVE);
  await writeFile(summaryPath, '{"status":"pass","stale":true}\n', "utf8");
  const env = validEnv();
  env.QUANTGYM_PREVIEW_WEB_URL = "https://beta.quantgym.app";
  try {
    await assert.rejects(runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: async () => { throw new Error("unexpected"); },
      overrides: { env },
    })));
    await assert.rejects(readFile(summaryPath), { code: "ENOENT" });
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
});

for (const [label, key, value] of [
  ["web credentials", "QUANTGYM_PREVIEW_WEB_URL", "https://user:secret@quantgym-v2-preview.pages.dev"],
  ["web query", "QUANTGYM_PREVIEW_WEB_URL", `${WEB_ORIGIN}?token=secret`],
  ["web beta host", "QUANTGYM_PREVIEW_WEB_URL", "https://beta.quantgym.app"],
  ["web localhost", "QUANTGYM_PREVIEW_WEB_URL", "https://localhost"],
  ["web port", "QUANTGYM_PREVIEW_WEB_URL", "https://quantgym-v2-preview.pages.dev:8443"],
  ["API credentials", "QUANTGYM_PREVIEW_API_ORIGIN", "https://user:secret@quantgym-v2-preview-api.onrender.com"],
  ["API production host", "QUANTGYM_PREVIEW_API_ORIGIN", "https://api.quantgym.app"],
  ["API lookalike", "QUANTGYM_PREVIEW_API_ORIGIN", "https://quantgym-v2-preview-api.onrender.com.attacker.invalid"],
  ["API localhost", "QUANTGYM_PREVIEW_API_ORIGIN", "http://127.0.0.1:4000"],
]) {
  test(`live mode rejects ${label} before a network request`, async () => {
    const prepared = await prepareRoot();
    let requestCount = 0;
    const env = validEnv();
    env[key] = value;
    try {
      await assert.rejects(
        runFrontendUpgradePreviewLiveCheck(liveOptions({
          ...prepared,
          fetchImpl: async () => { requestCount += 1; throw new Error("unexpected"); },
          overrides: { env },
        })),
      );
      assert.equal(requestCount, 0);
    } finally {
      await rm(prepared.root, { recursive: true, force: true });
    }
  });
}

for (const [label, mutate] of [
  ["wrong web environment", (fixture) => { fixture.version.environment = "production"; }],
  ["wrong web service", (fixture) => { fixture.version.service = "api"; }],
  ["wrong web commit", (fixture) => { fixture.version.commit = "f".repeat(40); }],
  ["wrong branch", (fixture) => { fixture.version.branch = "main"; }],
  ["missing Pages build source", (fixture) => { delete fixture.version.buildSource; }],
  ["credential field in config", (fixture) => { fixture.config.apiToken = "must-not-pass"; }],
  ["browser-visible LLM setting", (fixture) => { fixture.config.llmUrl = "https://llm.invalid"; }],
  ["wrong API base", (fixture) => { fixture.config.apiBase = "https://api.quantgym.app/api/v2"; }],
  ["wrong API environment", (fixture) => { fixture.health.environment = "production"; }],
  ["wrong API service", (fixture) => { fixture.health.service = "llm"; }],
  ["wrong API commit", (fixture) => { fixture.health.commit = "f".repeat(40); }],
  ["legacy schema", (fixture) => { fixture.health.legacySchemaLoaded = true; }],
  ["unverified internal LLM", (fixture) => { fixture.health.llmVerified = false; }],
  ["wrong internal LLM commit", (fixture) => { fixture.health.llmCommit = "f".repeat(40); }],
]) {
  test(`the aggregate rejects ${label}`, async () => {
    const fixture = { version: validVersion(), config: validConfig(), health: validApiHealth() };
    mutate(fixture);
    await assert.rejects(runLiveFixture({ serverFixture: fixture }));
  });
}

test("the aggregate accepts CORS only for Preview and rejects wildcard/reflection", async () => {
  await assert.rejects(runLiveFixture({ serverFixture: { invalidCorsMode: "wildcard" } }));
  await assert.rejects(runLiveFixture({ serverFixture: { invalidCorsMode: "reflect" } }));
  await assert.rejects(runLiveFixture({ serverFixture: { apiGetCorsOrigin: "*" } }));
  await assert.rejects(runLiveFixture({ serverFixture: { corsAllowHeaders: "x-unrelated" } }));
  await assert.rejects(runLiveFixture({ serverFixture: { corsVary: "Accept-Encoding" } }));
});

for (const [label, mutate] of [
  ["missing authenticated source", (evidence) => { delete evidence.authenticatedSource; }],
  ["wrong authenticated source", (evidence) => { evidence.authenticatedSource = "operator-form"; }],
  ["missing account identity", (evidence) => { delete evidence.cloudflare.accountIdHash; }],
  ["missing workspace identity", (evidence) => { delete evidence.render.workspaceIdHash; }],
  ["missing capture time", (evidence) => { delete evidence.capturedAt; }],
  ["missing operator", (evidence) => { delete evidence.operator; }],
  ["missing budget owner", (evidence) => { delete evidence.budgetOwner; }],
  ["missing destroy owner", (evidence) => { delete evidence.destroyOwner; }],
  ["credential field", (evidence) => { evidence.cloudflare.apiToken = "secret"; }],
  ["raw provider response", (evidence) => { evidence.render.services[0].ownerId = "raw-workspace"; }],
  ["Pages production reuse", (evidence) => { evidence.cloudflare.productionPagesProjectIdHash = hashes.pages; }],
  ["R2 production reuse", (evidence) => { evidence.cloudflare.productionR2BucketIdentityHash = hashes.r2; }],
  ["R2 non-Preview bucket", (evidence) => { evidence.cloudflare.r2.bucketName = "quantgym-media-production"; }],
  ["R2 public bucket", (evidence) => { evidence.cloudflare.r2.private = false; }],
  ["R2 development URL enabled", (evidence) => { evidence.cloudflare.r2.r2DevEnabled = true; }],
  ["R2 broad credential scope", (evidence) => { evidence.cloudflare.r2.credentialScope = "account-read-write"; }],
  ["R2 wrong signing region", (evidence) => { evidence.cloudflare.r2.signingRegion = "us-east-1"; }],
  ["R2 wrong lifecycle", (evidence) => { evidence.cloudflare.r2.lifecycleDays = 30; }],
  ["R2 wrong CORS origin", (evidence) => { evidence.cloudflare.r2.corsOrigin = "https://beta.quantgym.app"; }],
  ["Postgres production reuse", (evidence) => { evidence.render.productionPostgresResourceIdHash = hashes.postgresResource; }],
  ["service production reuse", (evidence) => { evidence.render.productionServiceIdHashes[0] = hashes.api; }],
  ["linked group outside allowlist", (evidence) => { evidence.render.services[0].linkedGroupIdHashes = [sha256("other")]; }],
  ["Preview/production group overlap", (evidence) => { evidence.render.productionGroupIdHashes = [hashes.previewGroup]; }],
  ["endpoint/account mismatch", (evidence) => { evidence.cloudflare.r2.endpointAccountIdHash = sha256("other-account"); }],
  ["wrong Pages branch", (evidence) => { evidence.cloudflare.pages.productionBranch = "main"; }],
  ["wrong Pages deployment commit", (evidence) => { evidence.cloudflare.pages.latestDeploymentCommit = "f".repeat(40); }],
  ["wrong Render service pair", (evidence) => { evidence.render.services[1].type = "web_service"; }],
]) {
  test(`provider evidence rejects ${label}`, async () => {
    const evidence = validEvidence();
    mutate(evidence);
    await assert.rejects(runLiveFixture({ evidence }));
  });
}

test("provider evidence must be current and not future-dated", async () => {
  const stale = validEvidence();
  stale.capturedAt = "2026-07-07T02:59:59.000Z";
  await assert.rejects(runLiveFixture({ evidence: stale }));
  const future = validEvidence();
  future.capturedAt = "2026-07-15T03:05:01.000Z";
  await assert.rejects(runLiveFixture({ evidence: future }));
});

test("provider evidence is revalidated when the live run completes", async () => {
  const evidence = validEvidence();
  evidence.capturedAt = "2026-07-08T03:00:00.000Z";
  const prepared = await prepareRoot(evidence);
  const server = await startFixtureServer();
  const summaryPath = path.join(prepared.root, SUMMARY_RELATIVE);
  try {
    await assert.rejects(runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: server.fetchImpl,
      overrides: {
        now: new Date("2026-07-15T02:59:59.999Z"),
        completedAt: new Date("2026-07-15T03:00:00.001Z"),
      },
    })), /expired/);
    await assert.rejects(readFile(summaryPath), { code: "ENOENT" });
  } finally {
    await server.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("provider evidence cannot be replaced after child probes have authenticated it", async () => {
  const prepared = await prepareRoot();
  const server = await startFixtureServer();
  const replacement = validEvidence();
  replacement.operator = "replacement-operator";
  try {
    await assert.rejects(runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: server.fetchImpl,
      overrides: {
        runR2Check: async ({ evidenceSha256 }) => {
          await writeFile(
            path.join(prepared.root, EVIDENCE_RELATIVE),
            `${JSON.stringify(replacement, null, 2)}\n`,
          );
          return { ...validR2Summary(), evidenceSha256 };
        },
      },
    })), /changed during/);
  } finally {
    await server.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("provider evidence permits service-level-only Preview configuration and no production groups", async () => {
  const evidence = validEvidence();
  evidence.render.previewAllowedGroupIdHashes = [];
  evidence.render.productionGroupIdHashes = [];
  for (const service of evidence.render.services) service.linkedGroupIdHashes = [];
  const { result } = await runLiveFixture({ evidence });
  assert.equal(result.summary.resourceIsolation, "pass");
});

test("provider evidence path cannot escape or traverse a symlink", async () => {
  const prepared = await prepareRoot();
  const outside = await mkdtemp(path.join(tmpdir(), "quantgym-preview-evidence-outside-"));
  const outsideFile = path.join(outside, "provider-evidence.redacted.json");
  await writeFile(outsideFile, `${JSON.stringify(validEvidence())}\n`, { mode: 0o600 });
  const approvedPath = path.join(prepared.root, EVIDENCE_RELATIVE);
  await rm(approvedPath, { force: true });
  await symlink(outsideFile, approvedPath);
  let requests = 0;
  try {
    await assert.rejects(runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: async () => { requests += 1; throw new Error("unexpected"); },
    })), /unavailable/);
    assert.equal(requests, 0);
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test("provider evidence must retain operator-only file permissions", async () => {
  const prepared = await prepareRoot();
  await chmod(path.join(prepared.root, EVIDENCE_RELATIVE), 0o644);
  let requests = 0;
  try {
    await assert.rejects(runFrontendUpgradePreviewLiveCheck(liveOptions({
      ...prepared,
      fetchImpl: async () => { requests += 1; throw new Error("unexpected"); },
    })), /permissions/);
    assert.equal(requests, 0);
  } finally {
    await rm(prepared.root, { recursive: true, force: true });
  }
});

for (const [label, overrides] of [
  ["dirty worktree", { worktreeClean: false }],
  ["wrong origin URL", { originUrlExact: false }],
  ["wrong current branch", { currentBranchExact: false }],
  ["missing local branch", { localBranchExists: false }],
  ["missing origin commit", { originBranchContainsCommit: false }],
  ["remote branch mismatch", { remoteBranchExact: false }],
  ["deployed commit not in local history", { deployedCommitAncestorOfHead: false }],
  ["unexpected committed descendant", { descendantChangesRestricted: false }],
  ["replacement refs", { replaceRefsAbsent: false }],
  ["legacy graft metadata", { graftsAbsent: false }],
  ["unsafe index flags", { indexFlagsSafe: false }],
  ["runtime file mismatch", { runtimeFilesMatchExpectedCommit: false }],
]) {
  test(`the live gate rejects ${label}`, async () => {
    await assert.rejects(runLiveFixture({
      overrides: { gitCheck: async () => ({
        ...validGitSummary(),
        ...overrides,
      }) },
    }));
  });
}

test("Git evidence is revalidated after every live probe before the summary is written", async () => {
  let calls = 0;
  await assert.rejects(runLiveFixture({
    overrides: {
      gitCheck: async () => {
        calls += 1;
        return {
          ...validGitSummary(),
          ...(calls === 2 ? { worktreeClean: false } : {}),
        };
      },
    },
  }), /worktreeClean/);
  assert.equal(calls, 2);
});

test("child checks must use the exact same evidence and a strict redacted allowlist", async () => {
  await assert.rejects(runLiveFixture({
    overrides: {
      runPostgresCheck: async ({ evidenceSha256 }) => ({
        ...validPostgresSummary(),
        evidenceSha256,
        database: "raw-preview-db",
      }),
    },
  }));
  await assert.rejects(runLiveFixture({
    overrides: {
      runR2Check: async ({ evidenceSha256 }) => ({
        ...validR2Summary(),
        evidenceSha256,
        bucket: PREVIEW_BUCKET,
      }),
    },
  }));
});

test("test-only aggregate injection is unavailable outside NODE_ENV=test", async () => {
  let networkCalls = 0;
  await assert.rejects(runFrontendUpgradePreviewLiveCheck({
    env: { ...validEnv(), NODE_ENV: "production" },
    [TEST_ONLY_PREVIEW_LIVE]: {
      root: repositoryRoot,
      fetchImpl: async () => { networkCalls += 1; },
    },
  }), /NODE_ENV=test/);
  assert.equal(networkCalls, 0);
});

test("test-only aggregate injection cannot target the real workspace", async () => {
  let networkCalls = 0;
  await assert.rejects(runFrontendUpgradePreviewLiveCheck({
    env: validEnv(),
    [TEST_ONLY_PREVIEW_LIVE]: {
      root: repositoryRoot,
      fetchImpl: async () => { networkCalls += 1; },
      gitCheck: async () => validGitSummary(),
      runPostgresCheck: async () => validPostgresSummary(),
      runR2Check: async () => validR2Summary(),
    },
  }), /temporary root/);
  assert.equal(networkCalls, 0);
});

test("the isolated Python runner clears transport arguments and never executes .pth files", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "quantgym-preview-python-runner-"));
  const sitePackages = path.join(root, "site-packages");
  const script = path.join(root, "argv_probe.py");
  const marker = path.join(root, "pth-executed");
  await mkdir(sitePackages);
  await writeFile(
    path.join(sitePackages, "attack.pth"),
    `import pathlib; pathlib.Path(${JSON.stringify(marker)}).write_text("executed")\n`,
  );
  await writeFile(script, "import json, sys\nprint(json.dumps(sys.argv))\n");
  try {
    const result = spawnSync("python3", [
      "-I",
      "-S",
      "-c",
      TEST_ONLY_PREVIEW_POSTGRES_RUNNER_SOURCE,
      sitePackages,
      script,
    ], {
      encoding: "utf8",
      timeout: 10_000,
      env: {
        PATH: process.env.PATH,
        LANG: "C",
        LC_ALL: "C",
        PYTHONDONTWRITEBYTECODE: "1",
        PYTHONNOUSERSITE: "1",
      },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), [script]);
    await assert.rejects(readFile(marker), { code: "ENOENT" });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("R2 signs region auto, binds the account tuple, round-trips bytes, and deletes", async () => {
  const prepared = await prepareRoot();
  const server = await startFixtureServer();
  try {
    const result = await runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: server.fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("quantgym-preview-r2-round-trip", "utf8"),
      },
    });
    assert.equal(result.status, "pass");
    assert.equal(result.checks.bytesMatch, true);
    assert.equal(result.checks.objectDeleted, true);
    assert.equal(server.state.deleteAttempts, 1);
    assert.equal(server.state.deleted, true);
    assert.deepEqual(server.state.requests.map((request) => request.method), ["PUT", "GET", "DELETE"]);
    const put = server.state.requests[0];
    const get = server.state.requests[1];
    const deleteRequest = server.state.requests[2];
    const objectUrl = (
      `https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${PREVIEW_BUCKET}`
      + "/readiness-smoke/123e4567-e89b-42d3-a456-426614174000.txt"
    );
    assert.equal(
      put.originalUrl,
      objectUrl,
    );
    assert.equal(get.originalUrl, objectUrl);
    assert.equal(deleteRequest.originalUrl, objectUrl);
    assert.deepEqual(put.body, Buffer.from("quantgym-preview-r2-round-trip", "utf8"));
    assert.equal(
      put.authorization,
      "AWS4-HMAC-SHA256 Credential=R2ACCESSKEYEXAMPLE/20260715/auto/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=af116d40b04d43d84d707580f9cb29fdae16ca7c13298eaad35bad55120cd401",
    );
    assert.equal(
      put.amzContentSha256,
      "0f260cfaf72a2d393bca1b6ecb2b0320c589aa9578e881077e107c905c1e43fc",
    );
    assert.equal(
      get.authorization,
      "AWS4-HMAC-SHA256 Credential=R2ACCESSKEYEXAMPLE/20260715/auto/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=990eb5802ad77fa6ec9b497e68f9f5898faff7d2d73b36f656f35554b794f434",
    );
    assert.equal(
      deleteRequest.authorization,
      "AWS4-HMAC-SHA256 Credential=R2ACCESSKEYEXAMPLE/20260715/auto/s3/aws4_request, SignedHeaders=host;x-amz-content-sha256;x-amz-date, Signature=191782fdbaa26cefeb69f8bef87cf3ce2fc69e7e388a8ee9f6aad4e208da8618",
    );
    assert.equal(
      get.amzContentSha256,
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(deleteRequest.amzContentSha256, get.amzContentSha256);
    for (const request of server.state.requests) {
      assert.match(request.authorization, /Credential=R2ACCESSKEYEXAMPLE\/20260715\/auto\/s3\/aws4_request/);
      assert.match(request.amzContentSha256, /^[a-f0-9]{64}$/);
      assert.equal(request.amzDate, "20260715T030000Z");
    }
    const serialized = JSON.stringify(result);
    for (const secret of [ACCOUNT_ID, ACCESS_KEY, SECRET_KEY, PREVIEW_BUCKET]) {
      assert.equal(serialized.includes(secret), false, secret);
    }
  } finally {
    await server.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("R2 deletes the smoke object even when byte comparison fails", async () => {
  const prepared = await prepareRoot();
  const server = await startFixtureServer({ r2GetBody: Buffer.from("wrong-bytes") });
  try {
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: server.fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("expected-bytes"),
      },
    }));
    assert.equal(server.state.deleteAttempts, 1);
    assert.equal(server.state.deleted, true);
  } finally {
    await server.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("R2 cleanup survives a GET failure and an oversized GET body", async () => {
  const prepared = await prepareRoot();
  const getFailure = await startFixtureServer();
  try {
    const fetchImpl = async (input, init = {}) => {
      if (init.method === "GET" && new URL(String(input)).hostname.endsWith("r2.cloudflarestorage.com")) {
        throw new Error("fixture GET failure");
      }
      return getFailure.fetchImpl(input, init);
    };
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("expected-bytes"),
      },
    }));
    assert.equal(getFailure.state.deleteAttempts, 1);
    assert.equal(getFailure.state.deleted, true);
  } finally {
    await getFailure.close();
  }

  const oversized = await startFixtureServer({ r2GetBody: Buffer.alloc(1024 * 1024 + 1) });
  try {
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: oversized.fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("expected-bytes"),
      },
    }), /size limit/);
    assert.equal(oversized.state.deleteAttempts, 1);
    assert.equal(oversized.state.deleted, true);
  } finally {
    await oversized.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

test("R2 attempts cleanup after PUT failure and fails when DELETE fails", async () => {
  const prepared = await prepareRoot();
  const putFailure = await startFixtureServer({ r2PutStatus: 500 });
  try {
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: putFailure.fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("expected-bytes"),
      },
    }));
    assert.equal(putFailure.state.deleteAttempts, 1);
  } finally {
    await putFailure.close();
  }

  const deleteFailure = await startFixtureServer({ r2DeleteStatus: 500 });
  try {
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env: validEnv(),
      evidence: validEvidence(),
      evidenceSha256: prepared.evidenceSha256,
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: deleteFailure.fetchImpl,
        now: new Date("2026-07-15T03:00:00.000Z"),
        randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
        randomBytes: () => Buffer.from("expected-bytes"),
      },
    }));
    assert.equal(deleteFailure.state.deleteAttempts, 1);
    assert.equal(deleteFailure.state.deleted, false);
  } finally {
    await deleteFailure.close();
    await rm(prepared.root, { recursive: true, force: true });
  }
});

for (const [label, mutate] of [
  ["endpoint account mismatch", (env) => { env.QUANTGYM_PREVIEW_R2_ENDPOINT = `https://${"b".repeat(32)}.r2.cloudflarestorage.com`; }],
  ["endpoint credentials", (env) => { env.QUANTGYM_PREVIEW_R2_ENDPOINT = `https://user:secret@${ACCOUNT_ID}.r2.cloudflarestorage.com`; }],
  ["wrong jurisdiction hostname", (env) => { env.QUANTGYM_PREVIEW_R2_ENDPOINT = `https://${ACCOUNT_ID}.eu.r2.cloudflarestorage.com`; }],
  ["localhost endpoint", (env) => { env.QUANTGYM_PREVIEW_R2_ENDPOINT = "http://127.0.0.1:9000"; }],
]) {
  test(`R2 rejects ${label} without making a request`, async () => {
    const env = validEnv();
    mutate(env);
    let requests = 0;
    await assert.rejects(runFrontendUpgradePreviewR2Check({
      env,
      evidence: validEvidence(),
      evidenceSha256: sha256("evidence"),
      [TEST_ONLY_PREVIEW_R2]: {
        fetchImpl: async () => { requests += 1; throw new Error("unexpected"); },
        now: new Date("2026-07-15T03:00:00.000Z"),
      },
    }));
    assert.equal(requests, 0);
  });
}

test("test-only R2 transport injection is unavailable outside NODE_ENV=test", async () => {
  let requests = 0;
  await assert.rejects(runFrontendUpgradePreviewR2Check({
    env: { ...validEnv(), NODE_ENV: "production" },
    evidence: validEvidence(),
    evidenceSha256: sha256("evidence"),
    [TEST_ONLY_PREVIEW_R2]: {
      fetchImpl: async () => { requests += 1; },
    },
  }), /NODE_ENV=test/);
  assert.equal(requests, 0);
});

test("package scripts expose the offline suite and live gate exactly", async () => {
  const packageJson = JSON.parse(await readFile(path.join(repositoryRoot, "package.json"), "utf8"));
  assert.equal(
    packageJson.scripts["test:frontend-upgrade:preview"],
    "node --test tests/frontend-upgrade-preview-contracts.test.mjs tests/frontend-upgrade-preview-probe.test.mjs tests/frontend-upgrade-preview-live.test.mjs && python3 -m unittest discover -s tests -p 'test_frontend_upgrade_preview_postgres.py' -v",
  );
  assert.equal(
    packageJson.scripts["check:frontend-upgrade:preview:live"],
    "node scripts/check-frontend-upgrade-preview-live.mjs",
  );
  const liveSource = await readFile(
    path.join(repositoryRoot, "scripts/check-frontend-upgrade-preview-live.mjs"),
    "utf8",
  );
  assert.match(liveSource, /TRUSTED_GIT_PATH = "\/usr\/bin\/git"/);
  assert.match(
    liveSource,
    /PREVIEW_CHECK_PYTHON_PATH = "\/tmp\/quantgym-preview-check-venv\/bin\/python3"/,
  );
  assert.doesNotMatch(liveSource, /spawnSync\(["'](?:git|python3)["']/);
  assert.match(liveSource, /REMOTE_REPOSITORY = "https:\/\/github\.com\/garymmmjw\/QuantGym\.git"/);
  assert.match(liveSource, /"ls-remote", "--exit-code", REMOTE_REPOSITORY/);
  assert.match(liveSource, /cwd: "\/"/);
  assert.match(liveSource, /"config", "--local", "--get-all", "remote\.origin\.url"/);
  assert.match(liveSource, /"status", "--porcelain=v1", "--untracked-files=all"/);
  assert.match(liveSource, /"diff", "--name-only", expectedCommit, "HEAD"/);
  assert.match(liveSource, /GIT_NO_REPLACE_OBJECTS: "1"/);
  assert.match(liveSource, /"for-each-ref", "--format=%\(refname\)", "refs\/replace"/);
  assert.match(liveSource, /"rev-parse", "--git-path", "info\/grafts"/);
  assert.match(liveSource, /"ls-files", "-v", "-z"/);
  assert.match(liveSource, /"ls-files", "-f", "-z"/);
  assert.match(liveSource, /"hash-object", "--no-filters"/);
  assert.match(liveSource, /spawnSync\(python\.executable, \[\s*"-I",\s*"-S"/);
  assert.match(liveSource, /process\.getuid/);
  assert.match(liveSource, /pyvenv\.cfg/);
  assert.match(liveSource, /include-system-site-packages/);
  assert.match(liveSource, /site-packages/);
  assert.match(liveSource, /MAX_VENV_ENTRIES/);
  assert.match(liveSource, /readdir/);
  assert.match(liveSource, /0o1000/);
  assert.match(liveSource, /0o022/);
});
