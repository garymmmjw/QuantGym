import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import {
  chmod,
  link,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  unlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  TEST_ONLY_PHASE1_PROVIDER_EVIDENCE,
  buildFrontendUpgradePhase1ProviderEvidence,
  captureFrontendUpgradePhase1PrePushBaseline,
  phase1PrePushBaselinePathForCommit,
  phase1PriorPrePushBaselinePathForCommit,
  phase1ProviderEvidenceArchivePathForCommit,
} from "../scripts/build-frontend-upgrade-phase1-provider-evidence.mjs";
import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
  PHASE1_PROVIDER_EVIDENCE_PATH,
  validatePhase1ProviderEvidenceRelationships,
} from "../scripts/lib/frontend-upgrade-phase1-contracts.mjs";

const BRANCH = "codex/frontend-v2-preview";
const COMMIT = "1".repeat(40);
const PRODUCTION_PAGES_CONTROL_ANCHOR_COMMIT = (
  "240016962fb5868c9a20f860b003ec3368ddfd63"
);
const CF_ACCOUNT_ID = "a".repeat(32);
const CF_TOKEN = "cloudflare-test-token-never-persist";
const RENDER_TOKEN = "render-test-token-never-persist";
const EDGE_SECRET = "edge-shared-secret-never-persist";
const DATABASE_PASSWORD = "database-password-never-persist";
const R2_ACCESS_KEY = "b".repeat(32);
const R2_SECRET_KEY = "r2-secret-key-never-persist";
const R2_AUDIT_ID = "c".repeat(32);
const WEB_ORIGIN = "https://quantgym-v2-preview.pages.dev";
const REPOSITORY = "https://github.com/garymmmjw/QuantGym";
const PAGES_BUILD = "npm ci && npm run build:v2";
const API_BUILD = "python -m pip install --require-hashes -r requirements.lock.txt";
const API_START = "python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT";
const LLM_START = "node scripts/serve-frontend-upgrade-preview-probe.mjs";
const NOW = new Date("2026-07-23T08:00:00.000Z");
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.env.NODE_ENV = "test";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clone = (value) => structuredClone(value);

const PHASE0_PROVIDER = {
  cloudflare: {
    pages: { projectIdHash: sha256("pages-preview-raw-id") },
    r2: {
      bucketIdentityHash: sha256(JSON.stringify([
        CF_ACCOUNT_ID,
        "quantgym-v2-preview-media",
        "default",
      ])),
    },
  },
  render: {
    services: [
      {
        name: "quantgym-v2-preview-api",
        serviceIdHash: sha256("render-preview-api-raw-id"),
      },
      {
        name: "quantgym-v2-preview-llm",
        serviceIdHash: sha256("render-preview-llm-raw-id"),
      },
    ],
    postgres: { resourceIdHash: sha256("render-preview-postgres-raw-id") },
    previewAllowedGroupIdHashes: [sha256("render-preview-group-raw-id")],
  },
};
const PHASE0_PROVIDER_BYTES = Buffer.from(
  `${JSON.stringify(PHASE0_PROVIDER, null, 2)}\n`,
);
const PHASE0_SUMMARY_BYTES = Buffer.from(`${JSON.stringify({
  providerEvidenceSha256: sha256(PHASE0_PROVIDER_BYTES),
}, null, 2)}\n`);

const providerFixture = () => ({
  cloudflare: {
    previewPagesBeforeCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    previewPages: {
      success: true,
      result: {
        id: "pages-preview-raw-id",
        name: "quantgym-v2-preview",
        source: {
          type: "github",
          config: {
            owner: "garymmmjw",
            repo_name: "QuantGym",
            production_branch: BRANCH,
            production_deployments_enabled: false,
            preview_deployment_setting: "none",
            deployments_enabled: true,
          },
        },
        build_config: {
          build_command: PAGES_BUILD,
          destination_dir: "dist-v2",
        },
        latest_deployment: {
          id: "pages-application-deployment-raw-id",
          deployment_trigger: {
            metadata: { branch: BRANCH, commit_hash: COMMIT },
          },
          latest_stage: { status: "success" },
          environment: { SECRET_VALUE: "discard-this-pages-deployment-secret" },
        },
        deployment_configs: {
          production: {
            env_vars: {
              QUANTGYM_EDGE_SHARED_SECRET: {
                type: "secret_text",
                value: EDGE_SECRET,
              },
            },
            r2_buckets: {},
          },
        },
      },
    },
    productionPages: {
      success: true,
      result: {
        id: "pages-production-raw-id",
        name: "quantgym-beta",
        source: {
          type: "github",
          config: {
            owner: "garymmmjw",
            repo_name: "QuantGym",
            production_branch: "main",
            production_deployments_enabled: true,
            deployments_enabled: true,
          },
        },
        build_config: {
          build_command: "npm ci && npm run build",
          destination_dir: "dist",
        },
        latest_deployment: {
          id: "pages-production-deployment-raw-id",
          deployment_trigger: {
            metadata: { branch: "main", commit_hash: "2".repeat(40) },
          },
          latest_stage: { status: "success" },
        },
      },
    },
    previewR2: {
      success: true,
      result: {
        name: "quantgym-v2-preview-media",
        jurisdiction: null,
        secretAccessKey: "discard-this-provider-r2-secret",
      },
    },
    productionR2: {
      success: true,
      result: {
        name: "quantgym-media",
        jurisdiction: "default",
      },
    },
    deployments: {
      success: true,
      result_info: { total_pages: 1 },
      result: [
        {
          id: "legacy-pages-deployment-raw-id",
          deployment_trigger: {
            metadata: {
              branch: "legacy-compat",
              commit_hash: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
            },
          },
          latest_stage: { status: "success" },
          aliases: ["https://legacy-compat.quantgym-v2-preview.pages.dev"],
          url: "https://legacy-deployment-hash.quantgym-v2-preview.pages.dev",
          environment: { PRIVATE_KEY: "discard-this-legacy-secret" },
        },
        {
          id: "unrelated-pages-deployment-raw-id",
          deployment_trigger: {
            metadata: { branch: "feature/unrelated", commit_hash: "3".repeat(40) },
          },
          latest_stage: { status: "success" },
          aliases: [],
        },
      ],
    },
    lifecycle: {
      success: true,
      result: {
        rules: [{
          enabled: true,
          conditions: { prefix: "readiness-smoke/" },
          deleteObjectsTransition: {
            condition: { type: "Age", maxAge: 7 * 24 * 60 * 60 },
          },
          privateMetadata: "discard-this-lifecycle-secret",
        }],
      },
    },
    cors: {
      success: true,
      result: {
        rules: [{
          allowed: {
            origins: [WEB_ORIGIN],
            methods: ["GET", "PUT", "HEAD"],
          },
        }],
      },
    },
    managedDomain: {
      success: true,
      result: {
        enabled: false,
        domain: "discard-this-r2-dev-domain",
      },
    },
    customDomains: {
      success: true,
      result: { domains: [] },
    },
    productionLifecycle: {
      success: true,
      result: {
        rules: [{
          enabled: true,
          conditions: { prefix: "production/" },
          deleteObjectsTransition: {
            condition: { type: "Age", maxAge: 30 * 24 * 60 * 60 },
          },
        }],
      },
    },
    productionCors: {
      success: true,
      result: { rules: [] },
    },
    productionManagedDomain: {
      success: true,
      result: { enabled: false },
    },
    productionCustomDomains: {
      success: true,
      result: { domains: [{ domain: "media.quantgym.example" }] },
    },
    auditVerify: {
      success: true,
      result: {
        id: R2_AUDIT_ID,
        status: "active",
        issued_on: "2026-07-23T07:00:00.000Z",
        not_before: "2026-07-23T07:00:00.000Z",
        expires_on: "2026-07-24T08:00:00.000Z",
      },
    },
    runtimeToken: {
      success: true,
      result: {
        id: R2_ACCESS_KEY,
        status: "active",
        policies: [{
          id: "runtime-r2-policy-id",
          effect: "allow",
          resources: {
            [`com.cloudflare.edge.r2.bucket.${CF_ACCOUNT_ID}_default_quantgym-v2-preview-media`]: "*",
          },
          permission_groups: [
            { id: "r2-read", name: "Workers R2 Storage Bucket Item Read" },
            { id: "r2-write", name: "Workers R2 Storage Bucket Item Write" },
          ],
        }],
      },
    },
    auditToken: {
      success: true,
      result: {
        id: R2_AUDIT_ID,
        status: "active",
        issued_on: "2026-07-23T07:00:00.000Z",
        not_before: "2026-07-23T07:00:00.000Z",
        expires_on: "2026-07-24T08:00:00.000Z",
        policies: [{
          id: "audit-policy-id",
          effect: "allow",
          resources: {
            [`com.cloudflare.edge.r2.bucket.${CF_ACCOUNT_ID}_default_quantgym-v2-preview-media`]: "*",
          },
          permission_groups: [
            { id: "audit-r2-read", name: "Workers R2 Storage Bucket Item Read" },
            { id: "audit-r2-write", name: "Workers R2 Storage Bucket Item Write" },
          ],
        }],
      },
    },
  },
  render: {
    services: [
      {
        service: {
          id: "render-preview-api-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-v2-preview-api",
          type: "web_service",
          repo: REPOSITORY,
          branch: BRANCH,
          rootDir: "api",
          autoDeploy: "no",
          serviceDetails: {
            runtime: "python",
            region: "oregon",
            url: "https://quantgym-v2-preview-api.onrender.com",
            healthCheckPath: "/api/v2/health",
            envSpecificDetails: {
              buildCommand: API_BUILD,
              startCommand: API_START,
            },
          },
          envVars: [{ key: "RAW_SECRET", value: "discard-this-service-secret" }],
        },
      },
      {
        service: {
          id: "render-preview-llm-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-v2-preview-llm",
          type: "private_service",
          repo: REPOSITORY,
          branch: BRANCH,
          rootDir: "",
          autoDeploy: "no",
          serviceDetails: {
            runtime: "node",
            region: "oregon",
            url: "quantgym-v2-preview-llm:10000",
            envSpecificDetails: {
              buildCommand: "npm ci",
              startCommand: LLM_START,
            },
          },
        },
      },
      {
        service: {
          id: "render-production-api-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-api",
          type: "web_service",
          repo: REPOSITORY,
          branch: "main",
          rootDir: "api-server",
          autoDeploy: "yes",
          serviceDetails: {
            runtime: "node",
            region: "oregon",
            healthCheckPath: "/api/health",
            envSpecificDetails: {
              buildCommand: "npm ci",
              startCommand: "node api-server/server.js",
            },
          },
        },
      },
      {
        service: {
          id: "render-production-llm-raw-id",
          ownerId: "render-workspace-raw-id",
          name: "quantgym-llm",
          type: "private_service",
          repo: REPOSITORY,
          branch: "main",
          rootDir: "",
          autoDeploy: "yes",
          serviceDetails: {
            runtime: "node",
            region: "oregon",
            envSpecificDetails: {
              buildCommand: "npm ci",
              startCommand: "node llm-service/server.js",
            },
          },
        },
      },
    ],
    environmentGroups: [
      {
        id: "render-preview-group-raw-id",
        name: "quantgym-v2-preview",
        ownerId: "render-workspace-raw-id",
        serviceLinks: [
          {
            id: "render-preview-api-raw-id",
            name: "quantgym-v2-preview-api",
          },
          {
            id: "render-preview-llm-raw-id",
            name: "quantgym-v2-preview-llm",
          },
        ],
        envVars: [{ key: "RAW_GROUP_SECRET", value: "discard-this-group-secret" }],
      },
      {
        id: "render-production-group-raw-id",
        name: "quantgym-production",
        ownerId: "render-workspace-raw-id",
        serviceLinks: [
          { id: "render-production-api-raw-id", name: "quantgym-api" },
          { id: "render-production-llm-raw-id", name: "quantgym-llm" },
        ],
      },
    ],
    postgres: [
      {
        postgres: {
          id: "render-preview-postgres-raw-id",
          owner: {
            id: "render-workspace-raw-id",
            email: "discard-this-workspace-email@example.com",
          },
          name: "quantgym-v2-preview-postgres",
          plan: "basic_256mb",
          status: "available",
          version: "18",
          databaseName: "quantgym_v2_preview",
          databaseUser: "quantgym_v2_preview_role",
          password: "discard-this-postgres-secret",
        },
      },
      {
        postgres: {
          id: "render-production-postgres-raw-id",
          owner: { id: "render-workspace-raw-id" },
          name: "quantgym-postgres",
          plan: "pro",
          status: "available",
          version: "17",
          databaseName: "quantgym_production",
          databaseUser: "quantgym_production_role",
        },
      },
    ],
    serviceEnv: {
      "render-preview-api-raw-id": [
        { envVar: { key: "PYTHON_VERSION", value: "3.13.14" } },
        { envVar: { key: "QUANTGYM_ENVIRONMENT", value: "preview" } },
        {
          envVar: {
            key: "QUANTGYM_POSTGRES_DATABASE_URL",
            value: (
              `postgresql://quantgym_v2_preview_role:${DATABASE_PASSWORD}`
              + "@preview-postgres.internal:5432/quantgym_v2_preview?sslmode=require"
            ),
          },
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
            value: "http://quantgym-v2-preview-llm:10000",
          },
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_R2_ENDPOINT",
            value: `https://${CF_ACCOUNT_ID}.r2.cloudflarestorage.com`,
          },
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID",
            value: R2_ACCESS_KEY,
          },
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY",
            value: R2_SECRET_KEY,
          },
        },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_R2_BUCKET",
            value: "quantgym-v2-preview-media",
          },
        },
        { envVar: { key: "QUANTGYM_EDGE_SHARED_SECRET", value: EDGE_SECRET } },
        { envVar: { key: "PRIVATE_API_SECRET", value: "discard-this-api-secret" } },
      ],
      "render-preview-llm-raw-id": [
        { envVar: { key: "NODE_VERSION", value: "20.20.2" } },
        {
          envVar: {
            key: "QUANTGYM_PREVIEW_ENVIRONMENT",
            value: "preview-v2",
          },
        },
        { envVar: { key: "QUANTGYM_PREVIEW_SERVICE", value: "llm" } },
        { envVar: { key: "QUANTGYM_PREVIEW_COMMIT", value: COMMIT } },
      ],
    },
    serviceSecretFiles: {
      "render-preview-llm-raw-id": [],
    },
    groupEnv: {
      "render-preview-group-raw-id": {
        id: "render-preview-group-raw-id",
        name: "quantgym-v2-preview",
        ownerId: "render-workspace-raw-id",
        serviceLinks: [
          { id: "render-preview-api-raw-id", name: "quantgym-v2-preview-api" },
          { id: "render-preview-llm-raw-id", name: "quantgym-v2-preview-llm" },
        ],
        envVars: [],
        secretFiles: [],
      },
    },
    deploys: {
      "render-preview-api-raw-id": [
        {
          deploy: {
            id: "api-deploy-raw-id",
            status: "live",
            commit: { id: COMMIT },
            environment: { SECRET: "discard-this-deploy-secret" },
          },
        },
      ],
      "render-preview-llm-raw-id": [
        {
          deploy: {
            id: "llm-deploy-raw-id",
            status: "live",
            commit: { id: COMMIT },
          },
        },
      ],
      "render-production-api-raw-id": [
        {
          deploy: {
            id: "production-api-deploy-raw-id",
            status: "live",
            commit: { id: "4".repeat(40) },
          },
        },
      ],
      "render-production-llm-raw-id": [
        {
          deploy: {
            id: "production-llm-deploy-raw-id",
            status: "live",
            commit: { id: "5".repeat(40) },
          },
        },
      ],
    },
    deploysBefore: {
      "render-preview-api-raw-id": [
        {
          deploy: {
            id: "pre-push-api-deploy-raw-id",
            status: "live",
            commit: { id: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
          },
        },
      ],
      "render-preview-llm-raw-id": [
        {
          deploy: {
            id: "pre-push-llm-deploy-raw-id",
            status: "live",
            commit: { id: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT },
          },
        },
      ],
    },
    connectionInfo: {
      internalConnectionString: (
        `postgresql://quantgym_v2_preview_role:${DATABASE_PASSWORD}`
        + "@preview-postgres.internal:5432/quantgym_v2_preview"
      ),
      externalConnectionString: (
        `postgresql://quantgym_v2_preview_role:${DATABASE_PASSWORD}`
        + "@preview-postgres.render.com/quantgym_v2_preview"
      ),
      password: DATABASE_PASSWORD,
    },
    recovery: {
      recoveryStatus: "AVAILABLE",
      privateBackupIdentity: "discard-this-backup-id",
    },
  },
});

const productionPagesControlAnchor = () => ({
  id: "pages-phase1-control-anchor-raw-id",
  environment: "preview",
  is_skipped: true,
  deployment_trigger: {
    type: "github:push",
    metadata: {
      branch: BRANCH,
      commit_hash: PRODUCTION_PAGES_CONTROL_ANCHOR_COMMIT,
    },
  },
  latest_stage: { name: "queued", status: "idle" },
});

const excludedProductionPagesPreviewQueue = () => ({
  id: "pages-excluded-preview-queue-raw-id",
  environment: "preview",
  is_skipped: true,
  deployment_trigger: {
    type: "github:push",
    metadata: { branch: BRANCH, commit_hash: COMMIT },
  },
  latest_stage: { name: "queued", status: "idle" },
});

const productionDeploymentPage = (result, resultInfo = {}) => ({
  success: true,
  result,
  result_info: {
    page: 1,
    per_page: 25,
    count: result.length,
    total_count: result.length,
    total_pages: 1,
    ...resultInfo,
  },
});

const providerFixtureWithProductionPagesAnchor = () => {
  const fixture = providerFixture();
  const canonicalDeployment = clone(
    fixture.cloudflare.productionPages.result.latest_deployment,
  );
  const controlAnchor = productionPagesControlAnchor();
  fixture.cloudflare.productionPages.result.canonical_deployment = canonicalDeployment;
  fixture.cloudflare.productionPages.result.latest_deployment = controlAnchor;
  fixture.cloudflare.productionPagesAfter = clone(fixture.cloudflare.productionPages);
  fixture.cloudflare.productionPagesAfter.result.latest_deployment = (
    excludedProductionPagesPreviewQueue()
  );
  fixture.cloudflare.productionDeployments = productionDeploymentPage([
    fixture.cloudflare.productionPagesAfter.result.latest_deployment,
    controlAnchor,
  ]);
  return { fixture, canonicalDeployment, controlAnchor };
};

const providerFixtureAfterBaseline = () => {
  const fixture = providerFixture();
  fixture.cloudflare.previewPagesBeforeCommit = COMMIT;
  delete fixture.render.deploysBefore;
  return fixture;
};

const response = (
  body,
  { status = 200, requestId = "safe-fixture-request-id" } = {},
) => new Response(JSON.stringify(body), {
  status,
  headers: {
    "content-type": "application/json",
    "cf-ray": requestId,
    "x-request-id": requestId,
  },
});

const fixtureFetch = (fixture, requests = []) => {
  const counts = new Map();
  return async (input, init = {}) => {
    const url = new URL(input);
    const count = (counts.get(url.pathname + url.search) ?? 0) + 1;
    counts.set(url.pathname + url.search, count);
    requests.push({
      url: url.href,
      method: init.method,
      authorization: new Headers(init.headers).get("authorization"),
      jurisdiction: new Headers(init.headers).get("cf-r2-jurisdiction"),
    });
    assert.equal(url.protocol, "https:");

    const cfPrefix = `/client/v4/accounts/${CF_ACCOUNT_ID}`;
    const cfPath = url.pathname.slice(cfPrefix.length);
    if (url.hostname === "api.cloudflare.com") {
      if (cfPath === "/pages/projects/quantgym-v2-preview" && !url.search) {
        const body = count === 1
          ? clone(fixture.cloudflare.previewPages)
          : fixture.cloudflare.previewPagesAfter ?? fixture.cloudflare.previewPages;
        if (count === 1) {
          body.result.latest_deployment.deployment_trigger.metadata.commit_hash = (
            fixture.cloudflare.previewPagesBeforeCommit
          );
        }
        return response(body);
      }
      if (cfPath === "/pages/projects/quantgym-beta" && !url.search) {
        const body = count === 1
          ? fixture.cloudflare.productionPages
          : fixture.cloudflare.productionPagesAfter ?? fixture.cloudflare.productionPages;
        return response(body);
      }
      if (
        cfPath === "/pages/projects/quantgym-beta/deployments"
        && url.searchParams.get("per_page") === "25"
      ) {
        const page = Number(url.searchParams.get("page"));
        const body = Array.isArray(fixture.cloudflare.productionDeploymentPages)
          ? fixture.cloudflare.productionDeploymentPages[page - 1]
          : page === 1
            ? fixture.cloudflare.productionDeployments
            : undefined;
        if (body !== undefined) return response(body);
      }
      if (
        cfPath === "/pages/projects/quantgym-v2-preview/deployments"
        && url.searchParams.get("page") === "1"
        && url.searchParams.get("per_page") === "25"
      ) return response(fixture.cloudflare.deployments);
      if (cfPath === "/r2/buckets/quantgym-v2-preview-media") {
        return response(fixture.cloudflare.previewR2);
      }
      if (cfPath === "/r2/buckets/quantgym-media") {
        const body = count === 1
          ? fixture.cloudflare.productionR2
          : fixture.cloudflare.productionR2After ?? fixture.cloudflare.productionR2;
        return response(body);
      }
      if (cfPath === "/r2/buckets/quantgym-v2-preview-media/lifecycle") {
        return response(fixture.cloudflare.lifecycle);
      }
      if (cfPath === "/r2/buckets/quantgym-v2-preview-media/cors") {
        return response(fixture.cloudflare.cors);
      }
      if (cfPath === "/r2/buckets/quantgym-v2-preview-media/domains/managed") {
        return response(fixture.cloudflare.managedDomain);
      }
      if (cfPath === "/r2/buckets/quantgym-v2-preview-media/domains/custom") {
        return response(fixture.cloudflare.customDomains);
      }
      if (cfPath === "/r2/buckets/quantgym-media/lifecycle") {
        const body = count === 1
          ? fixture.cloudflare.productionLifecycle
          : fixture.cloudflare.productionLifecycleAfter
            ?? fixture.cloudflare.productionLifecycle;
        return response(body);
      }
      if (cfPath === "/r2/buckets/quantgym-media/cors") {
        const body = count === 1
          ? fixture.cloudflare.productionCors
          : fixture.cloudflare.productionCorsAfter ?? fixture.cloudflare.productionCors;
        return response(body);
      }
      if (cfPath === "/r2/buckets/quantgym-media/domains/managed") {
        const body = count === 1
          ? fixture.cloudflare.productionManagedDomain
          : fixture.cloudflare.productionManagedDomainAfter
            ?? fixture.cloudflare.productionManagedDomain;
        return response(body);
      }
      if (cfPath === "/r2/buckets/quantgym-media/domains/custom") {
        const body = count === 1
          ? fixture.cloudflare.productionCustomDomains
          : fixture.cloudflare.productionCustomDomainsAfter
            ?? fixture.cloudflare.productionCustomDomains;
        return response(body);
      }
      if (cfPath === "/tokens/verify") {
        return response(fixture.cloudflare.auditVerify);
      }
      if (cfPath === `/tokens/${R2_ACCESS_KEY}`) {
        return response(fixture.cloudflare.runtimeToken);
      }
      if (cfPath === `/tokens/${R2_AUDIT_ID}`) {
        return response(fixture.cloudflare.auditToken);
      }
    }

    if (url.hostname === "api.render.com") {
      if (url.pathname === "/v1/services" && url.search === "?limit=100") {
        const body = count === 1
          ? fixture.render.services
          : fixture.render.servicesAfter ?? fixture.render.services;
        return response(body);
      }
      if (url.pathname === "/v1/env-groups" && url.search === "?limit=100") {
        const body = count === 1
          ? fixture.render.environmentGroups
          : fixture.render.environmentGroupsAfter ?? fixture.render.environmentGroups;
        return response(body);
      }
      if (url.pathname === "/v1/postgres" && url.search === "?limit=100") {
        const body = count === 1
          ? fixture.render.postgres
          : fixture.render.postgresAfter ?? fixture.render.postgres;
        return response(body);
      }
      const serviceEnv = /^\/v1\/services\/([^/]+)\/env-vars$/u.exec(url.pathname);
      if (serviceEnv && url.search === "?limit=100") {
        const serviceId = decodeURIComponent(serviceEnv[1]);
        const body = count === 1
          ? fixture.render.serviceEnv[serviceId] ?? []
          : fixture.render.serviceEnvAfter?.[serviceId]
            ?? fixture.render.serviceEnv[serviceId]
            ?? [];
        return response(body);
      }
      const serviceSecretFiles = /^\/v1\/services\/([^/]+)\/secret-files$/u.exec(url.pathname);
      if (serviceSecretFiles && url.search === "?limit=100") {
        const serviceId = decodeURIComponent(serviceSecretFiles[1]);
        const body = count === 1
          ? fixture.render.serviceSecretFiles[serviceId] ?? []
          : fixture.render.serviceSecretFilesAfter?.[serviceId]
            ?? fixture.render.serviceSecretFiles[serviceId]
            ?? [];
        return response(body);
      }
      const groupEnv = /^\/v1\/env-groups\/([^/]+)$/u.exec(url.pathname);
      if (groupEnv && !url.search) {
        const groupId = decodeURIComponent(groupEnv[1]);
        const body = count === 1
          ? fixture.render.groupEnv[groupId] ?? {}
          : fixture.render.groupEnvAfter?.[groupId]
            ?? fixture.render.groupEnv[groupId]
            ?? {};
        return response(body);
      }
      const deploy = /^\/v1\/services\/([^/]+)\/deploys$/u.exec(url.pathname);
      if (deploy && url.search === "?limit=1") {
        const serviceId = decodeURIComponent(deploy[1]);
        const body = count === 1
          ? fixture.render.deploysBefore?.[serviceId]
            ?? fixture.render.deploys[serviceId]
            ?? []
          : fixture.render.deploysAfter?.[serviceId]
            ?? fixture.render.deploys[serviceId]
            ?? [];
        return response(body);
      }
      const connection = /^\/v1\/postgres\/([^/]+)\/connection-info$/u.exec(url.pathname);
      if (connection) return response(fixture.render.connectionInfo);
      const recovery = /^\/v1\/postgres\/([^/]+)\/recovery$/u.exec(url.pathname);
      if (recovery) return response(fixture.render.recovery);
    }
    throw new Error(`unexpected provider fixture request: ${url.href}`);
  };
};

const fixtureFetchWithStatus = (
  fixture,
  pathSuffix,
  status,
  observedResponses = [],
) => {
  const fallback = fixtureFetch(fixture);
  return async (input, init) => {
    if (new URL(input).pathname.endsWith(pathSuffix)) {
      const providerError = response(
        { success: false, errors: [{ message: "sensitive provider error body" }] },
        { status },
      );
      observedResponses.push(providerError);
      return providerError;
    }
    return fallback(input, init);
  };
};

const fixtureFetchWith404 = (fixture, pathSuffix, observedResponses = []) => (
  fixtureFetchWithStatus(fixture, pathSuffix, 404, observedResponses)
);

const providerEnvironment = () => ({
  NODE_ENV: "test",
  CLOUDFLARE_API_TOKEN: CF_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID,
  RENDER_API_KEY: RENDER_TOKEN,
  QUANTGYM_PREVIEW_WEB_URL: WEB_ORIGIN,
  QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID: R2_AUDIT_ID,
});

const buildOptions = (root, fixture, extra = {}) => ({
  env: providerEnvironment(),
  expectedCommit: COMMIT,
  operator: "Gary",
  budgetOwner: "Gary",
  dataResetOwner: "Gary",
  destroyOwner: "Gary",
  reviewDate: "2026-07-29",
  r2CredentialScope: "single-bucket-read-write",
  r2Jurisdiction: "default",
  productionR2Jurisdiction: "default",
  previewEnvironmentGroupIds: ["render-preview-group-raw-id"],
  [TEST_ONLY_PHASE1_PROVIDER_EVIDENCE]: {
    root,
    now: NOW,
    fetchImpl: fixtureFetch(fixture),
    autoCaptureBaseline: true,
    phase0PreviewSummarySha256: sha256(PHASE0_SUMMARY_BYTES),
    ...extra,
  },
});

const withRoot = async (run) => {
  const temporaryRoot = await mkdtemp(path.join(tmpdir(), "quantgym-phase1-provider-"));
  const root = await realpath(temporaryRoot);
  try {
    const providerPath = path.join(
      root,
      "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json",
    );
    const summaryPath = path.join(
      root,
      "docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json",
    );
    await mkdir(path.dirname(providerPath), { recursive: true });
    await mkdir(path.dirname(summaryPath), { recursive: true });
    await writeFile(providerPath, PHASE0_PROVIDER_BYTES, { mode: 0o600 });
    await chmod(providerPath, 0o600);
    await writeFile(summaryPath, PHASE0_SUMMARY_BYTES, { mode: 0o644 });
    await chmod(summaryPath, 0o644);
    return await run(root);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
};

test("baseline paths are derived only from exact lowercase commit SHAs", () => {
  assert.equal(
    phase1PrePushBaselinePathForCommit(COMMIT),
    `artifacts/frontend-upgrade/phase-1-preview/pre-push-provider-baseline.${COMMIT}.redacted.json`,
  );
  assert.equal(
    phase1ProviderEvidenceArchivePathForCommit(COMMIT),
    `artifacts/frontend-upgrade/phase-1-preview/provider-evidence.${COMMIT}.redacted.json`,
  );
  assert.equal(
    phase1PriorPrePushBaselinePathForCommit(
      "240016962fb5868c9a20f860b003ec3368ddfd63",
    ),
    "artifacts/frontend-upgrade/phase-1-preview/pre-push-provider-baseline.redacted.json",
  );
  assert.equal(
    phase1PriorPrePushBaselinePathForCommit(COMMIT),
    phase1PrePushBaselinePathForCommit(COMMIT),
  );
  for (const candidate of ["../escape", "A".repeat(40), "1".repeat(39)]) {
    for (const derive of [
      phase1PrePushBaselinePathForCommit,
      phase1PriorPrePushBaselinePathForCommit,
      phase1ProviderEvidenceArchivePathForCommit,
    ]) {
      assert.throws(
        () => derive(candidate),
        /40-character lowercase Git SHA/u,
      );
    }
  }
});

test("builds a current schema-only provider record from authenticated allowlisted fields", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const requests = [];
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetch(fixture, requests);
    options.outputPath = path.join(root, "attacker-controlled.json");
    const result = await buildFrontendUpgradePhase1ProviderEvidence(options);

    assert.equal(
      result.output,
      path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH),
    );
    await assert.rejects(lstat(options.outputPath), { code: "ENOENT" });
    const metadata = await lstat(result.output);
    assert.equal(metadata.isFile(), true);
    assert.equal(metadata.mode & 0o777, 0o600);
    assert.equal(metadata.nlink, 1);

    const serialized = await readFile(result.output, "utf8");
    assert.equal(result.sha256, sha256(serialized));
    assert.deepEqual(JSON.parse(serialized), result.evidence);
    assert.deepEqual(
      Object.keys(result.evidence).sort(),
      [
        "applicationCommit",
        "bindings",
        "branch",
        "capturedAt",
        "controls",
        "deployments",
        "environment",
        "expiresAt",
        "governance",
        "legacyCommit",
        "phase0ProviderEvidenceSha256",
        "postgresMajor",
        "prePushBaselineSha256",
        "productionControlAfter",
        "productionControlBefore",
        "r2PolicyAttestations",
        "resourceFingerprints",
        "schemaVersion",
      ].sort(),
    );
    assert.equal(
      Date.parse(result.evidence.expiresAt) - Date.parse(result.evidence.capturedAt),
      7 * 24 * 60 * 60 * 1000,
    );
    assert.equal(result.evidence.postgresMajor, 18);
    assert.equal(
      result.evidence.productionControlBefore,
      result.evidence.productionControlAfter,
    );
    assert.deepEqual(
      validatePhase1ProviderEvidenceRelationships(result.evidence, NOW.getTime()),
      [],
    );
    assert.equal(
      result.evidence.resourceFingerprints.postgres,
      sha256("render-preview-postgres-raw-id"),
    );
    assert.equal(
      result.evidence.resourceFingerprints.postgresRole,
      sha256("quantgym_v2_preview_role"),
    );
    assert.equal(
      result.evidence.resourceFingerprints.r2,
      sha256(JSON.stringify([
        CF_ACCOUNT_ID,
        "quantgym-v2-preview-media",
        "default",
      ])),
    );
    assert.equal(
      result.evidence.deployments.legacy.aliasSha256,
      APPROVED_LEGACY_PAGES_ALIAS_SHA256,
    );
    assert.equal(
      result.evidence.r2PolicyAttestations.runtimeIdSha256,
      sha256(R2_ACCESS_KEY),
    );
    assert.equal(
      result.evidence.r2PolicyAttestations.auditIdSha256,
      sha256(R2_AUDIT_ID),
    );
    assert.notEqual(
      result.evidence.r2PolicyAttestations.runtimeIdSha256,
      result.evidence.r2PolicyAttestations.auditIdSha256,
    );

    for (const forbidden of [
      CF_TOKEN,
      CF_ACCOUNT_ID,
      RENDER_TOKEN,
      EDGE_SECRET,
      DATABASE_PASSWORD,
      R2_ACCESS_KEY,
      R2_SECRET_KEY,
      "pages-preview-raw-id",
      "render-preview-api-raw-id",
      "render-preview-group-raw-id",
      "quantgym_v2_preview",
      "quantgym_v2_preview_role",
      "discard-this",
      WEB_ORIGIN,
      REPOSITORY,
    ]) {
      assert.equal(serialized.includes(forbidden), false, forbidden);
    }
    assert.ok(requests.length >= 20);
    for (const request of requests) {
      assert.equal(request.method, "GET");
      assert.match(request.authorization, /^Bearer /u);
      if (request.url.includes("/r2/buckets/")) {
        assert.equal(request.jurisdiction, "default");
      }
    }
    for (const requiredPath of [
      "/r2/buckets/quantgym-media/lifecycle",
      "/r2/buckets/quantgym-media/cors",
      "/r2/buckets/quantgym-media/domains/managed",
      "/r2/buckets/quantgym-media/domains/custom",
      "/v1/services/render-production-api-raw-id/env-vars",
      "/v1/services/render-production-api-raw-id/secret-files",
      "/v1/services/render-production-api-raw-id/deploys",
      "/v1/services/render-production-llm-raw-id/env-vars",
      "/v1/services/render-production-llm-raw-id/secret-files",
      "/v1/services/render-production-llm-raw-id/deploys",
      "/v1/env-groups/render-production-group-raw-id",
      `/tokens/${R2_ACCESS_KEY}`,
      `/tokens/${R2_AUDIT_ID}`,
    ]) {
      assert.ok(requests.some(({ url }) => new URL(url).pathname.endsWith(requiredPath)));
    }
  });
});

test("test-only transport and root injection requires NODE_ENV=test", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const options = buildOptions(root, fixture);
    options.env.NODE_ENV = "production";
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /test-only provider injection requires NODE_ENV=test/u,
    );

    const processEnvironment = process.env.NODE_ENV;
    options.env.NODE_ENV = "test";
    process.env.NODE_ENV = "production";
    try {
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(options),
        /test-only provider injection requires NODE_ENV=test/u,
      );
    } finally {
      process.env.NODE_ENV = processEnvironment;
    }
  });
});

test("both provider test-only entrypoints require an explicit canonical temporary root", async () => {
  await withRoot(async (root) => {
    for (const run of [
      buildFrontendUpgradePhase1ProviderEvidence,
      captureFrontendUpgradePhase1PrePushBaseline,
    ]) {
      const missingRoot = buildOptions(root, providerFixture());
      delete missingRoot[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].root;
      await assert.rejects(
        run(missingRoot),
        /requires an explicit isolated root/u,
      );

      const realWorkspace = buildOptions(root, providerFixture());
      realWorkspace[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].root = PROJECT_ROOT;
      await assert.rejects(
        run(realWorkspace),
        /requires an isolated root|requires a canonical temporary root/u,
      );
    }
  });
});

test("provider test-only roots reject a temporary symlink back to the real workspace", async () => {
  await withRoot(async (root) => {
    const alias = path.join(root, "workspace-alias");
    await symlink(PROJECT_ROOT, alias, "dir");
    for (const run of [
      buildFrontendUpgradePhase1ProviderEvidence,
      captureFrontendUpgradePhase1PrePushBaseline,
    ]) {
      const options = buildOptions(root, providerFixture());
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].root = alias;
      await assert.rejects(
        run(options),
        /root must not be a symlink/u,
      );
    }
  });
});

test("captures an independent 0600 pre-push baseline before the future commit is deployed", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    fixture.cloudflare.previewPagesAfter = clone(providerFixture().cloudflare.previewPages);
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const baseline = await captureFrontendUpgradePhase1PrePushBaseline(options);
    assert.equal(
      baseline.output,
      path.join(root, phase1PrePushBaselinePathForCommit(COMMIT)),
    );
    assert.equal((await lstat(baseline.output)).mode & 0o777, 0o600);
    assert.equal(
      baseline.baseline.previewAutomaticDeploysDisabled.pages,
      true,
    );
    assert.equal(
      baseline.baseline.expectedCommitAbsentFromPreviewDeployments,
      true,
    );
    options.prePushBaselineSha256 = baseline.sha256;
    const final = await buildFrontendUpgradePhase1ProviderEvidence(options);
    assert.equal(final.evidence.prePushBaselineSha256, baseline.sha256);
    assert.equal(
      final.evidence.productionControlBefore,
      final.evidence.productionControlAfter,
    );
  });
});

test("Production R2 CORS 404 is an explicit unread default included in the control hash", async () => {
  let missingCorsControlHash;
  const observedResponses = [];
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetchWith404(
      fixture,
      "/r2/buckets/quantgym-media/cors",
      observedResponses,
    );
    const result = await buildFrontendUpgradePhase1ProviderEvidence(options);
    missingCorsControlHash = result.evidence.productionControlBefore;
    assert.equal(
      result.evidence.productionControlAfter,
      missingCorsControlHash,
    );
    assert.equal(observedResponses.length, 2);
    assert.ok(observedResponses.every((entry) => entry.bodyUsed === false));
  });

  await withRoot(async (root) => {
    const configured = await captureFrontendUpgradePhase1PrePushBaseline(
      buildOptions(root, providerFixture()),
    );
    assert.notEqual(
      configured.baseline.productionControlSha256,
      missingCorsControlHash,
    );
  });
});

test("Production R2 CORS absence and presence transitions are both rejected as drift", async () => {
  for (const missingCall of [1, 2]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      const fallback = fixtureFetch(fixture);
      let corsCalls = 0;
      const options = buildOptions(root, fixture);
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = async (input, init) => {
        const url = new URL(input);
        if (url.pathname.endsWith("/r2/buckets/quantgym-media/cors")) {
          corsCalls += 1;
          if (corsCalls === missingCall) {
            return response({ success: false }, { status: 404 });
          }
        }
        return fallback(input, init);
      };
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(options),
        /production provider controls changed since the pre-push baseline/u,
      );
      assert.equal(corsCalls, 2);
    });
  }
});

test("an excluded queued Pages Preview record does not masquerade as a Production deploy", async () => {
  await withRoot(async (root) => {
    const { fixture } = providerFixtureWithProductionPagesAnchor();
    const requests = [];
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetch(fixture, requests);

    const result = await buildFrontendUpgradePhase1ProviderEvidence(
      options,
    );
    assert.equal(
      result.evidence.productionControlBefore,
      result.evidence.productionControlAfter,
    );
    assert.equal(
      requests.filter(({ url }) => (
        new URL(url).pathname.endsWith("/pages/projects/quantgym-beta/deployments")
      )).length,
      2,
    );
  });
});

test("a real canonical Pages Production deployment change remains fail-closed", async () => {
  await withRoot(async (root) => {
    const { fixture } = providerFixtureWithProductionPagesAnchor();
    fixture.cloudflare.productionPagesAfter.result.canonical_deployment
      .deployment_trigger.metadata.commit_hash = "8".repeat(40);

    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      /production provider controls changed since the pre-push baseline/u,
    );
  });
});

test("a non-deployment Pages Production configuration change remains fail-closed", async () => {
  await withRoot(async (root) => {
    const { fixture } = providerFixtureWithProductionPagesAnchor();
    fixture.cloudflare.productionPagesAfter.result.build_config.destination_dir = (
      "unexpected-production-output"
    );

    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      /production provider controls changed since the pre-push baseline/u,
    );
  });
});

test("the frozen Pages control anchor must exist uniquely in deployment history", async () => {
  for (const [label, history] of [
    ["missing", [excludedProductionPagesPreviewQueue()]],
    [
      "duplicate",
      [productionPagesControlAnchor(), productionPagesControlAnchor()],
    ],
  ]) {
    await withRoot(async (root) => {
      const { fixture } = providerFixtureWithProductionPagesAnchor();
      fixture.cloudflare.productionDeployments = productionDeploymentPage(history);
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
        /frozen production Pages control anchor must exist uniquely/u,
        label,
      );
    });
  }
});

test("a latest frozen Pages control anchor must match its raw history record", async () => {
  await withRoot(async (root) => {
    const { fixture, controlAnchor } = providerFixtureWithProductionPagesAnchor();
    const mismatchedHistoryAnchor = clone(controlAnchor);
    mismatchedHistoryAnchor.url = "https://mismatched-history-anchor.pages.dev";
    fixture.cloudflare.productionDeployments = productionDeploymentPage([
      mismatchedHistoryAnchor,
    ]);

    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      /frozen production Pages control anchor must match the latest deployment observation/u,
    );
  });
});

test("the frozen Pages control anchor is found uniquely across complete pagination", async () => {
  await withRoot(async (root) => {
    const { fixture, controlAnchor } = providerFixtureWithProductionPagesAnchor();
    const firstPageEntries = [
      excludedProductionPagesPreviewQueue(),
      ...Array.from({ length: 24 }, (_, index) => ({
        id: `unrelated-production-pages-deployment-${index}`,
        environment: "production",
        is_skipped: false,
        deployment_trigger: {
          type: "github:push",
          metadata: {
            branch: "main",
            commit_hash: (index + 2).toString(16).padStart(40, "0"),
          },
        },
        latest_stage: { name: "deploy", status: "success" },
      })),
    ];
    fixture.cloudflare.productionDeploymentPages = [
      productionDeploymentPage(firstPageEntries, {
        page: 1,
        total_count: 26,
        total_pages: 2,
      }),
      productionDeploymentPage([controlAnchor], {
        page: 2,
        total_count: 26,
        total_pages: 2,
      }),
    ];
    const requests = [];
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetch(fixture, requests);

    const result = await buildFrontendUpgradePhase1ProviderEvidence(options);
    assert.equal(
      result.evidence.productionControlBefore,
      result.evidence.productionControlAfter,
    );
    assert.equal(
      requests.filter(({ url }) => (
        new URL(url).pathname.endsWith("/pages/projects/quantgym-beta/deployments")
        && new URL(url).searchParams.get("page") === "2"
      )).length,
      2,
    );
  });
});

test("malformed Pages deployment pagination metadata fails closed", async () => {
  const malformedCases = [
    ["missing total_pages", (anchor) => {
      const payload = productionDeploymentPage([anchor]);
      delete payload.result_info.total_pages;
      return [payload];
    }],
    ["wrong page", (anchor) => [
      productionDeploymentPage([anchor], { page: 2 }),
    ]],
    ["wrong per_page", (anchor) => [
      productionDeploymentPage([anchor], { per_page: 50 }),
    ]],
    ["count mismatch", (anchor) => [
      productionDeploymentPage([anchor], { count: 0 }),
    ]],
    ["cumulative count mismatch", (anchor) => [
      productionDeploymentPage([anchor], { total_count: 2 }),
    ]],
    ["inconsistent totals", (anchor) => {
      const firstPageEntries = Array.from({ length: 25 }, (_, index) => ({
        id: `pagination-control-${index}`,
      }));
      return [
        productionDeploymentPage(firstPageEntries, {
          page: 1,
          total_count: 26,
          total_pages: 2,
        }),
        productionDeploymentPage([anchor], {
          page: 2,
          total_count: 27,
          total_pages: 2,
        }),
      ];
    }],
    ["oversized page", (anchor) => [
      productionDeploymentPage([
        anchor,
        ...Array.from({ length: 25 }, (_, index) => ({
          id: `oversized-pagination-control-${index}`,
        })),
      ], { total_count: 26, total_pages: 2 }),
    ]],
  ];

  for (const [label, makePages] of malformedCases) {
    await withRoot(async (root) => {
      const { fixture, controlAnchor } = providerFixtureWithProductionPagesAnchor();
      fixture.cloudflare.productionDeploymentPages = makePages(controlAnchor);
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
        /production Pages deployments pagination is invalid/u,
        label,
      );
    });
  }
});

test("Production R2 CORS 404 fails if the immediate bucket recheck fails", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const fallback = fixtureFetch(fixture);
    const observedResponses = [];
    let bucketReads = 0;
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = async (input, init) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/r2/buckets/quantgym-media/cors")) {
        const notFound = response({ success: false }, { status: 404 });
        observedResponses.push(notFound);
        return notFound;
      }
      if (url.pathname.endsWith("/r2/buckets/quantgym-media")) {
        bucketReads += 1;
        if (bucketReads === 2) {
          const notFound = response({ success: false }, { status: 404 });
          observedResponses.push(notFound);
          return notFound;
        }
      }
      return fallback(input, init);
    };
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /Cloudflare request failed \(status 404,/u,
    );
    assert.equal(bucketReads, 2);
    assert.equal(observedResponses.length, 2);
    assert.ok(observedResponses.every((entry) => entry.bodyUsed === false));
  });
});

test("Production R2 CORS 404 requires the rechecked bucket identity and jurisdiction", async () => {
  for (const [mutate, diagnostic] of [
    [
      (bucket) => {
        bucket.result.name = "replacement-production-bucket";
      },
      /production R2 bucket recheck name/u,
    ],
    [
      (bucket) => {
        bucket.result.jurisdiction = "eu";
      },
      /production R2 bucket recheck jurisdiction/u,
    ],
  ]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      fixture.cloudflare.productionR2After = clone(fixture.cloudflare.productionR2);
      mutate(fixture.cloudflare.productionR2After);
      const options = buildOptions(root, fixture);
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetchWith404(
        fixture,
        "/r2/buckets/quantgym-media/cors",
      );
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(options),
        diagnostic,
      );
    });
  }
});

test("Production R2 CORS errors other than 404 remain fail-closed", async () => {
  for (const status of [403, 500]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      const observedResponses = [];
      const options = buildOptions(root, fixture);
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetchWithStatus(
        fixture,
        "/r2/buckets/quantgym-media/cors",
        status,
        observedResponses,
      );
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(options),
        new RegExp(`Cloudflare request failed \\(status ${status},`, "u"),
      );
      assert.equal(observedResponses.length, 1);
      assert.equal(observedResponses[0].bodyUsed, false);
    });
  }
});

test("Preview R2 CORS 404 remains fail-closed", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const observedResponses = [];
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetchWith404(
      fixture,
      "/r2/buckets/quantgym-v2-preview-media/cors",
      observedResponses,
    );
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /Cloudflare request failed \(status 404,/u,
    );
    assert.equal(observedResponses.length, 1);
    assert.equal(observedResponses[0].bodyUsed, false);
  });
});

test("404 from any other Production provider endpoint remains fail-closed", async () => {
  for (const pathSuffix of [
    "/pages/projects/quantgym-beta",
    "/r2/buckets/quantgym-media",
    "/r2/buckets/quantgym-media/lifecycle",
    "/r2/buckets/quantgym-media/domains/managed",
    "/r2/buckets/quantgym-media/domains/custom",
  ]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      const observedResponses = [];
      const options = buildOptions(root, fixture);
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetchWith404(
        fixture,
        pathSuffix,
        observedResponses,
      );
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(options),
        /Cloudflare request failed \(status 404,/u,
      );
      assert.equal(observedResponses.length, 1, pathSuffix);
      assert.equal(observedResponses[0].bodyUsed, false, pathSuffix);
    });
  }
});

test("pre-push baseline rejects an expected commit already deployed to any Preview runtime", async () => {
  for (const mutate of [
    (fixture) => {
      fixture.cloudflare.previewPagesBeforeCommit = COMMIT;
    },
    (fixture) => {
      fixture.render.deploysBefore["render-preview-api-raw-id"][0]
        .deploy.commit.id = COMMIT;
    },
    (fixture) => {
      fixture.render.deploysBefore["render-preview-llm-raw-id"][0]
        .deploy.commit.id = COMMIT;
    },
  ]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      mutate(fixture);
      const options = buildOptions(root, fixture);
      options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
      await assert.rejects(
        captureFrontendUpgradePhase1PrePushBaseline(options),
        /must be captured before the expected commit is deployed/u,
      );
    });
  }
});

test("final evidence refuses to run without the independently captured baseline", async () => {
  await withRoot(async (root) => {
    const options = buildOptions(root, providerFixture());
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /pre-push provider baseline/u,
    );
  });
});

test("the pre-push baseline is create-once and final evidence requires its original digest", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const baseline = await captureFrontendUpgradePhase1PrePushBaseline(options);
    await assert.rejects(
      captureFrontendUpgradePhase1PrePushBaseline(options),
      /already exists and is immutable/u,
    );
    const replacement = {
      ...baseline.baseline,
      productionControlSha256: sha256("replacement-control"),
    };
    await writeFile(
      baseline.output,
      `${JSON.stringify(replacement, null, 2)}\n`,
      { mode: 0o600 },
    );
    options.prePushBaselineSha256 = baseline.sha256;
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /expected pre-push baseline digest/u,
    );
  });
});

test("different candidate commits keep independent immutable baselines", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const firstOptions = buildOptions(root, fixture);
    firstOptions[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const first = await captureFrontendUpgradePhase1PrePushBaseline(firstOptions);
    const firstBefore = await lstat(first.output);
    const firstBytes = await readFile(first.output);

    const secondCommit = "2".repeat(40);
    const secondOptions = buildOptions(root, fixture);
    secondOptions.expectedCommit = secondCommit;
    secondOptions[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const second = await captureFrontendUpgradePhase1PrePushBaseline(secondOptions);

    assert.equal(
      second.output,
      path.join(root, phase1PrePushBaselinePathForCommit(secondCommit)),
    );
    assert.notEqual(second.output, first.output);
    assert.equal(second.baseline.expectedApplicationCommit, secondCommit);
    const firstAfter = await lstat(first.output);
    assert.equal(firstAfter.ino, firstBefore.ino);
    assert.deepEqual(await readFile(first.output), firstBytes);
    await assert.rejects(
      captureFrontendUpgradePhase1PrePushBaseline(secondOptions),
      /already exists and is immutable/u,
    );
  });
});

test("a superseding baseline archives prior evidence and preserves production continuity", async () => {
  await withRoot(async (root) => {
    const firstFixture = providerFixture();
    const firstOptions = buildOptions(root, firstFixture);
    const first = await buildFrontendUpgradePhase1ProviderEvidence(firstOptions);
    const firstBytes = await readFile(first.output);

    const secondCommit = "2".repeat(40);
    const captureFixture = providerFixture();
    const secondOptions = buildOptions(root, captureFixture);
    secondOptions.expectedCommit = secondCommit;
    secondOptions.priorProviderEvidenceSha256 = first.sha256;
    secondOptions[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const secondBaseline = await captureFrontendUpgradePhase1PrePushBaseline(secondOptions);

    assert.equal(secondBaseline.baseline.schemaVersion, 2);
    assert.equal(secondBaseline.baseline.priorApplicationCommit, COMMIT);
    assert.equal(secondBaseline.baseline.priorProviderEvidenceSha256, first.sha256);
    const archivePath = path.join(
      root,
      phase1ProviderEvidenceArchivePathForCommit(COMMIT),
    );
    assert.equal((await lstat(archivePath)).mode & 0o777, 0o600);
    assert.deepEqual(await readFile(archivePath), firstBytes);

    const finalFixture = JSON.parse(
      JSON.stringify(providerFixture()).replaceAll(COMMIT, secondCommit),
    );
    finalFixture.cloudflare.previewPagesBeforeCommit = secondCommit;
    delete finalFixture.render.deploysBefore;
    const finalOptions = buildOptions(root, finalFixture);
    finalOptions.expectedCommit = secondCommit;
    finalOptions.prePushBaselineSha256 = secondBaseline.sha256;
    finalOptions[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;
    const final = await buildFrontendUpgradePhase1ProviderEvidence(finalOptions);

    assert.equal(final.evidence.applicationCommit, secondCommit);
    assert.equal(final.evidence.prePushBaselineSha256, secondBaseline.sha256);
    assert.deepEqual(await readFile(archivePath), firstBytes);
  });
});

test("a superseding baseline rejects production drift between candidate attempts", async () => {
  await withRoot(async (root) => {
    const first = await buildFrontendUpgradePhase1ProviderEvidence(
      buildOptions(root, providerFixture()),
    );
    const secondCommit = "2".repeat(40);
    const driftedFixture = providerFixture();
    driftedFixture.cloudflare.productionPages.result.latest_deployment
      .deployment_trigger.metadata.commit_hash = "9".repeat(40);
    const secondOptions = buildOptions(root, driftedFixture);
    secondOptions.expectedCommit = secondCommit;
    secondOptions.priorProviderEvidenceSha256 = first.sha256;
    secondOptions[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].autoCaptureBaseline = false;

    await assert.rejects(
      captureFrontendUpgradePhase1PrePushBaseline(secondOptions),
      /production provider controls changed between candidate attempts/u,
    );
    await assert.rejects(
      lstat(path.join(root, phase1PrePushBaselinePathForCommit(secondCommit))),
      { code: "ENOENT" },
    );
  });
});

test("Phase 0 provider bytes must match the locked summary before provider network access", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const requests = [];
    const options = buildOptions(root, fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = fixtureFetch(
      fixture,
      requests,
    );
    await writeFile(
      path.join(
        root,
        "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json",
      ),
      `${JSON.stringify({ replaced: true })}\n`,
      { mode: 0o600 },
    );
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /locked Phase 0 provider evidence digest mismatch/u,
    );
    assert.equal(requests.length, 0);
  });
});

test("same-name replacement of a locked Preview resource is rejected", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    fixture.render.services[0].service.id = "recreated-preview-api-raw-id";
    fixture.render.environmentGroups[0].serviceLinks[0].id = (
      "recreated-preview-api-raw-id"
    );
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      /Preview api identity differs from locked Phase 0 evidence/u,
    );
  });
});

test("Production lifecycle or service environment drift from the pre-push baseline is rejected", async () => {
  for (const mutate of [
    (fixture) => {
      fixture.cloudflare.productionLifecycleAfter = clone(
        fixture.cloudflare.productionLifecycle,
      );
      fixture.cloudflare.productionLifecycleAfter.result.rules[0]
        .deleteObjectsTransition.condition.maxAge += 1;
    },
    (fixture) => {
      fixture.render.serviceEnv["render-production-api-raw-id"] = [
        { envVar: { key: "PRODUCTION_CONTROL", value: "before" } },
      ];
      fixture.render.serviceEnvAfter = {
        "render-production-api-raw-id": [
          { envVar: { key: "PRODUCTION_CONTROL", value: "after" } },
        ],
      };
    },
  ]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      mutate(fixture);
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
        /production provider controls changed since the pre-push baseline/u,
      );
    });
  }
});

test("Production current live deploy drift alone is rejected", async () => {
  for (const mutateDeploy of [
    (deploy) => {
      deploy.id = "production-api-manual-redeploy-raw-id";
    },
    (deploy) => {
      deploy.id = "production-api-rollback-deploy-raw-id";
      deploy.commit.id = "6".repeat(40);
    },
  ]) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      fixture.render.deploysAfter = clone(fixture.render.deploys);
      mutateDeploy(
        fixture.render.deploysAfter["render-production-api-raw-id"][0].deploy,
      );
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
        /production provider controls changed since the pre-push baseline/u,
      );
    });
  }
});

test("runtime R2 policy and independent short-lived audit access are fail-closed", async () => {
  const cases = [
    (fixture) => {
      fixture.cloudflare.runtimeToken.result.policies[0].resources = {
        [`com.cloudflare.edge.r2.bucket.${CF_ACCOUNT_ID}_default_quantgym-media`]: "*",
      };
    },
    (fixture) => {
      fixture.cloudflare.runtimeToken.result.policies[0].permission_groups = [{
        id: "admin",
        name: "Workers R2 Storage Write",
      }];
    },
    (fixture) => {
      fixture.cloudflare.auditToken.result.id = R2_ACCESS_KEY;
    },
    (fixture) => {
      fixture.cloudflare.auditVerify.result.expires_on = "2026-08-30T00:00:00.000Z";
      fixture.cloudflare.auditToken.result.expires_on = "2026-08-30T00:00:00.000Z";
    },
    (fixture) => {
      fixture.cloudflare.auditToken.result.policies[0].permission_groups = [{
        id: "account-token-write",
        name: "Account API Tokens Write",
      }];
    },
  ];
  for (const mutate of cases) {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      mutate(fixture);
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      );
      await assert.rejects(
        lstat(path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH)),
        { code: "ENOENT" },
      );
    });
  }
});

test("the only provider evidence destination is the ignored Phase 1 path", async () => {
  const ignoreLines = (await readFile(path.join(PROJECT_ROOT, ".gitignore"), "utf8"))
    .split(/\r?\n/u);
  assert.ok(ignoreLines.includes(PHASE1_PROVIDER_EVIDENCE_PATH));
});

test("rejects a Pages branch alias instead of the canonical Preview origin", async () => {
  await withRoot(async (root) => {
    const options = buildOptions(root, providerFixture());
    options.env.QUANTGYM_PREVIEW_WEB_URL = (
      "https://feature.quantgym-v2-preview.pages.dev"
    );
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /must be the Preview Pages HTTPS origin/u,
    );
  });
});

test("accepts a masked Cloudflare secret_text edge binding", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    fixture.cloudflare.previewPages.result.deployment_configs.production
      .env_vars.QUANTGYM_EDGE_SHARED_SECRET.value = "";
    const result = await buildFrontendUpgradePhase1ProviderEvidence(
      buildOptions(root, fixture),
    );
    assert.equal(result.evidence.controls.pagesV2BuildConfigured, true);
  });
});

const invalidCases = [
  [
    "Pages automatic deployments enabled",
    (fixture) => {
      fixture.cloudflare.previewPages.result.source.config.production_deployments_enabled = true;
    },
    /Pages production-branch automatic deployments must be disabled/u,
  ],
  [
    "Pages preview automatic deployments enabled",
    (fixture) => {
      fixture.cloudflare.previewPages.result.source.config.preview_deployment_setting = "all";
    },
    /Pages preview-branch automatic deployments must be disabled/u,
  ],
  [
    "old Pages build",
    (fixture) => {
      fixture.cloudflare.previewPages.result.build_config.build_command = (
        "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs"
      );
    },
    /Pages build command/u,
  ],
  [
    "a non-secret Pages edge binding",
    (fixture) => {
      fixture.cloudflare.previewPages.result.deployment_configs.production
        .env_vars.QUANTGYM_EDGE_SHARED_SECRET.type = "plain_text";
    },
    /Pages edge shared secret must be configured as secret_text/u,
  ],
  [
    "a Pages R2 binding",
    (fixture) => {
      fixture.cloudflare.previewPages.result.deployment_configs.production.r2_buckets = {
        MEDIA: { name: "quantgym-v2-preview-media" },
      };
    },
    /Pages must not hold an R2 binding/u,
  ],
  [
    "a provider credential in Pages variables",
    (fixture) => {
      fixture.cloudflare.previewPages.result.deployment_configs.production.env_vars
        .CLOUDFLARE_API_TOKEN = {
          type: "secret_text",
          value: "must-never-reach-pages",
        };
    },
    /Pages contains an unapproved environment variable/u,
  ],
  [
    "API automatic deployments enabled",
    (fixture) => {
      fixture.render.services[0].service.autoDeploy = "yes";
    },
    /API automatic deployments must be disabled/u,
  ],
  [
    "an operator provider credential on API",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-api-raw-id"].push({
        envVar: { key: "RENDER_API_KEY", value: "must-never-reach-api-runtime" },
      });
    },
    /API must not hold an operator provider credential/u,
  ],
  [
    "an inherited operator provider identity on API",
    (fixture) => {
      fixture.render.groupEnv["render-preview-group-raw-id"].envVars.push({
        key: "CLOUDFLARE_ACCOUNT_ID",
        value: CF_ACCOUNT_ID,
      });
      fixture.render.groupEnv["render-preview-group-raw-id"].serviceLinks = [
        { id: "render-preview-api-raw-id", name: "quantgym-v2-preview-api" },
      ];
      fixture.render.environmentGroups[0].serviceLinks = [
        { id: "render-preview-api-raw-id", name: "quantgym-v2-preview-api" },
      ];
    },
    /API must not hold an operator provider credential/u,
  ],
  [
    "API runtime drift",
    (fixture) => {
      fixture.render.services[0].service.serviceDetails.runtime = "node";
    },
    /API runtime/u,
  ],
  [
    "missing Preview Render regions",
    (fixture) => {
      fixture.render.services[0].service.serviceDetails.region = undefined;
      fixture.render.services[1].service.serviceDetails.region = undefined;
    },
    /Preview API Render region is required/u,
  ],
  [
    "API health path drift",
    (fixture) => {
      fixture.render.services[0].service.serviceDetails.healthCheckPath = "/health";
    },
    /API health-check path/u,
  ],
  [
    "Python version drift",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-api-raw-id"][0].envVar.value = "3.14.0";
    },
    /API Python version/u,
  ],
  [
    "LLM automatic deployments enabled",
    (fixture) => {
      fixture.render.services[1].service.autoDeploy = "yes";
    },
    /LLM automatic deployments must be disabled/u,
  ],
  [
    "LLM probe commit drift",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-llm-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_PREVIEW_COMMIT");
      entry.envVar.value = "4".repeat(40);
    },
    /LLM probe commit/u,
  ],
  [
    "PostgreSQL major drift",
    (fixture) => {
      fixture.render.postgres[0].postgres.version = "17";
    },
    /Preview PostgreSQL major/u,
  ],
  [
    "a PostgreSQL query host override",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_POSTGRES_DATABASE_URL");
      entry.envVar.value += "&host=quantgym-production.internal";
    },
    /must not contain PostgreSQL connection overrides/u,
  ],
  [
    "a PostgreSQL binding without required TLS",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_POSTGRES_DATABASE_URL");
      entry.envVar.value = entry.envVar.value.replace("?sslmode=require", "");
    },
    /must require PostgreSQL TLS/u,
  ],
  [
    "an unavailable PostgreSQL recovery point",
    (fixture) => {
      fixture.render.recovery.recoveryStatus = "BACKUP_NOT_READY";
    },
    /Preview PostgreSQL recovery point must be available/u,
  ],
  [
    "R2 binding drift",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_PREVIEW_R2_BUCKET");
      entry.envVar.value = "quantgym-media";
    },
    /Preview API R2 bucket/u,
  ],
  [
    "an invalid R2 access key",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID");
      entry.envVar.value = "short";
    },
    /Preview API R2 access key is invalid/u,
  ],
  [
    "an invalid R2 secret key",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY");
      entry.envVar.value = "short";
    },
    /Preview API R2 secret key is invalid/u,
  ],
  [
    "an invalid API edge secret",
    (fixture) => {
      const entry = fixture.render.serviceEnv["render-preview-api-raw-id"]
        .find((item) => item.envVar.key === "QUANTGYM_EDGE_SHARED_SECRET");
      entry.envVar.value = "short";
      fixture.cloudflare.previewPages.result.deployment_configs.production
        .env_vars.QUANTGYM_EDGE_SHARED_SECRET.value = "";
    },
    /API edge shared secret is invalid/u,
  ],
  [
    "legacy commit drift",
    (fixture) => {
      fixture.cloudflare.deployments.result[0]
        .deployment_trigger.metadata.commit_hash = COMMIT;
    },
    /legacy compatibility deployment/u,
  ],
  [
    "an R2 credential on LLM",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-llm-raw-id"].push({
        envVar: {
          key: "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY",
          value: "must-never-reach-llm",
        },
      });
    },
    /LLM must not hold an R2 credential/u,
  ],
  [
    "an OpenAI runtime secret on the Phase 1 LLM probe",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-llm-raw-id"].push({
        envVar: { key: "OPENAI_API_KEY", value: "must-never-reach-phase1-llm" },
      });
    },
    /LLM contains an unapproved environment variable/u,
  ],
  [
    "a provider credential on the Phase 1 LLM probe",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-llm-raw-id"].push({
        envVar: { key: "RENDER_API_KEY", value: "must-never-reach-phase1-llm" },
      });
    },
    /LLM contains an unapproved environment variable/u,
  ],
  [
    "an inherited session secret on the Phase 1 LLM probe",
    (fixture) => {
      fixture.render.groupEnv["render-preview-group-raw-id"].envVars.push({
        key: "QUANTGYM_SESSION_SECRET",
        value: "must-never-reach-phase1-llm",
      });
    },
    /LLM contains an unapproved environment variable/u,
  ],
  [
    "an AWS object-storage credential on LLM",
    (fixture) => {
      fixture.render.serviceEnv["render-preview-llm-raw-id"].push({
        envVar: {
          key: "AWS_SECRET_ACCESS_KEY",
          value: "must-never-reach-llm",
        },
      });
    },
    /LLM must not hold an object-storage credential/u,
  ],
  [
    "an inherited PostgreSQL credential on LLM",
    (fixture) => {
      fixture.render.groupEnv["render-preview-group-raw-id"].envVars.push({
        key: "QUANTGYM_POSTGRES_DATABASE_URL",
        value: "postgresql://must-not-reach-llm.invalid/preview",
      });
    },
    /LLM must not hold a PostgreSQL credential/u,
  ],
  [
    "a secret file inherited by LLM",
    (fixture) => {
      fixture.render.groupEnv["render-preview-group-raw-id"].secretFiles.push({
        name: "runtime-secrets.env",
        content: "R2_SECRET=must-never-reach-llm",
      });
    },
    /LLM environment group must not contain secret files/u,
  ],
  [
    "a direct LLM secret file",
    (fixture) => {
      fixture.render.serviceSecretFiles["render-preview-llm-raw-id"].push({
        secretFile: {
          name: "runtime-secrets.env",
          content: "R2_SECRET=must-never-reach-llm",
        },
      });
    },
    /LLM service must not contain secret files/u,
  ],
  [
    "duplicate environment-group IDs",
    (fixture) => {
      const duplicate = clone(fixture.render.environmentGroups[1]);
      duplicate.id = "render-preview-group-raw-id";
      fixture.render.environmentGroups.push(duplicate);
    },
    /Render environment group IDs must be unique/u,
  ],
];

for (const [label, mutate, diagnostic] of invalidCases) {
  test(`rejects ${label} without writing evidence`, async () => {
    await withRoot(async (root) => {
      const fixture = providerFixture();
      mutate(fixture);
      await assert.rejects(
        buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
        diagnostic,
      );
      await assert.rejects(
        lstat(path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH)),
        { code: "ENOENT" },
      );
    });
  });
}

test("takes independent production snapshots and rejects control drift", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    fixture.render.servicesAfter = clone(fixture.render.services);
    fixture.render.servicesAfter[2].service.autoDeploy = "no";
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, fixture)),
      /production provider controls changed since the pre-push baseline/u,
    );
  });
});

test("provider failures do not read or echo a sensitive response body or request id", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const secretBody = "provider-response-secret-never-echo";
    const options = buildOptions(root, fixture);
    const fallback = fixtureFetch(fixture);
    options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE].fetchImpl = async (input, init) => {
      const url = new URL(input);
      if (url.pathname.endsWith("/pages/projects/quantgym-v2-preview")) {
        return response(
          { success: false, secret: secretBody },
          {
            status: 500,
            requestId: `credential-${CF_TOKEN}`,
          },
        );
      }
      return fallback(input, init);
    };
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      (error) => {
        assert.match(error.message, /status 500, request id unavailable/u);
        assert.equal(error.message.includes(secretBody), false);
        assert.equal(error.message.includes(CF_TOKEN), false);
        return true;
      },
    );
  });
});

test("a failed refresh leaves the previous evidence bytes and mode unchanged", async () => {
  await withRoot(async (root) => {
    const firstFixture = providerFixture();
    const first = await buildFrontendUpgradePhase1ProviderEvidence(
      buildOptions(root, firstFixture),
    );
    const before = await readFile(first.output);
    const invalid = providerFixtureAfterBaseline();
    invalid.render.services[0].service.autoDeploy = "yes";
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(buildOptions(root, invalid)),
      /API automatic deployments/u,
    );
    assert.deepEqual(await readFile(first.output), before);
    assert.equal((await lstat(first.output)).mode & 0o777, 0o600);
  });
});

test("atomically replaces a regular prior record and always restores mode 0600", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const first = await buildFrontendUpgradePhase1ProviderEvidence(
      buildOptions(root, fixture),
    );
    const firstInode = (await lstat(first.output)).ino;
    await chmod(first.output, 0o644);
    const second = await buildFrontendUpgradePhase1ProviderEvidence(
      buildOptions(root, providerFixtureAfterBaseline()),
    );
    const metadata = await lstat(second.output);
    assert.notEqual(metadata.ino, firstInode);
    assert.equal(metadata.mode & 0o777, 0o600);
  });
});

test("refuses an existing output symlink without touching its target", async () => {
  await withRoot(async (root) => {
    const output = path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH);
    const outside = path.join(root, "outside-sentinel.txt");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(outside, "sentinel\n", { mode: 0o600 });
    await symlink(outside, output);
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(
        buildOptions(root, providerFixture()),
      ),
      /existing provider evidence path is unsafe/u,
    );
    assert.equal(await readFile(outside, "utf8"), "sentinel\n");
    assert.equal((await lstat(output)).isSymbolicLink(), true);
  });
});

test("refuses a hard-linked existing output without touching the other link", async () => {
  await withRoot(async (root) => {
    const output = path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH);
    const outside = path.join(root, "outside-hardlink.txt");
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(outside, "sentinel\n", { mode: 0o600 });
    await link(outside, output);
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(
        buildOptions(root, providerFixture()),
      ),
      /single-link regular file/u,
    );
    assert.equal(await readFile(outside, "utf8"), "sentinel\n");
    assert.equal(await readFile(output, "utf8"), "sentinel\n");
  });
});

test("refuses a symlink in the fixed output directory chain", async () => {
  await withRoot(async (root) => {
    const outside = path.join(root, "outside-directory");
    await mkdir(outside);
    await rm(path.join(root, "artifacts"), { recursive: true, force: true });
    await symlink(outside, path.join(root, "artifacts"));
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(
        buildOptions(root, providerFixture()),
      ),
      /output directory is unsafe|unsafe ancestor directory/u,
    );
    assert.deepEqual(await import("node:fs/promises").then(({ readdir }) => readdir(outside)), []);
  });
});

test("refuses a symlink supplied as the test-only repository root", async () => {
  await withRoot(async (root) => {
    const target = path.join(root, "real-root");
    const alias = path.join(root, "root-alias");
    await mkdir(target);
    await symlink(target, alias);
    const options = buildOptions(alias, providerFixture());
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /root must not be a symlink/u,
    );
    assert.deepEqual(
      await import("node:fs/promises").then(({ readdir }) => readdir(target)),
      [],
    );
  });
});

test("detects an output path created during the atomic-write window", async () => {
  await withRoot(async (root) => {
    const options = buildOptions(root, providerFixture(), {
      beforeRename: async ({ outputPath }) => {
        await writeFile(outputPath, "concurrent replacement\n", { mode: 0o600 });
      },
    });
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /output changed before atomic rename/u,
    );
    assert.equal(
      await readFile(path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH), "utf8"),
      "concurrent replacement\n",
    );
  });
});

test("inode checks reject replacement of the temporary file before rename", async () => {
  await withRoot(async (root) => {
    const fixture = providerFixture();
    const options = buildOptions(root, fixture, {
      beforeRename: async ({ temporaryPath }) => {
        await unlink(temporaryPath);
        await writeFile(temporaryPath, "attacker replacement\n", { mode: 0o600 });
      },
    });
    await assert.rejects(
      buildFrontendUpgradePhase1ProviderEvidence(options),
      /changed|inode/u,
    );
    await assert.rejects(
      lstat(path.join(root, PHASE1_PROVIDER_EVIDENCE_PATH)),
      { code: "ENOENT" },
    );
  });
});
