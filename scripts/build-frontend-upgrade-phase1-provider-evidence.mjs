import { createHash, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import {
  lstat,
  mkdir,
  open,
  realpath,
  rename,
  unlink,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
  APPROVED_LEGACY_PAGES_ALIAS_SHA256,
  PHASE1_PROVIDER_EVIDENCE_PATH,
  captureTrustedDirectoryChain,
  validatePhase1ProviderEvidenceRelationships,
} from "./lib/frontend-upgrade-phase1-contracts.mjs";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");
const controlledTestParent = tmpdir();

const PREVIEW_BRANCH = "codex/frontend-v2-preview";
const REPOSITORY = "https://github.com/garymmmjw/QuantGym";
const PREVIEW_PAGES = "quantgym-v2-preview";
const PRODUCTION_PAGES = "quantgym-beta";
const PREVIEW_API = "quantgym-v2-preview-api";
const PREVIEW_LLM = "quantgym-v2-preview-llm";
const PRODUCTION_API = "quantgym-api";
const PRODUCTION_LLM = "quantgym-llm";
const PREVIEW_POSTGRES = "quantgym-v2-preview-postgres";
const PRODUCTION_POSTGRES = "quantgym-postgres";
const PREVIEW_R2 = "quantgym-v2-preview-media";
const PRODUCTION_R2 = "quantgym-media";
const LEGACY_BRANCH = "legacy-compat";
const LEGACY_ALIAS = "legacy-compat.quantgym-v2-preview.pages.dev";

const PAGES_BUILD = "npm ci && npm run build:v2";
const PAGES_DESTINATION = "dist-v2";
const API_BUILD = "python -m pip install --require-hashes -r requirements.lock.txt";
const API_START = "python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT";
const API_HEALTH_PATH = "/api/v2/health";
const LLM_BUILD = "npm ci";
const LLM_START = "node scripts/serve-frontend-upgrade-preview-probe.mjs";
const PYTHON_VERSION = "3.13.14";
const NODE_VERSION = "20.20.2";
const R2_CREDENTIAL_SCOPE = "single-bucket-read-write";
const R2_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
const R2_LIFECYCLE_SECONDS = R2_LIFETIME_MS / 1000;
const PHASE0_PROVIDER_EVIDENCE_PATH = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);
const PHASE0_PREVIEW_SUMMARY_PATH = (
  "docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json"
);
const PHASE0_PREVIEW_SUMMARY_SHA256 = (
  "59216ece973ec0b3b9b1389bdf0ecc565e0729e429671a72125fbc8d22a88260"
);
export const PHASE1_PRE_PUSH_BASELINE_PATH = (
  "artifacts/frontend-upgrade/phase-1-preview/pre-push-provider-baseline.redacted.json"
);
const MAX_PHASE0_EVIDENCE_BYTES = 256 * 1024;
const MAX_BASELINE_BYTES = 256 * 1024;
const R2_BUCKET_ITEM_WRITE = "Workers R2 Storage Bucket Item Write";
const R2_BUCKET_ITEM_READ = "Workers R2 Storage Bucket Item Read";
const AUDIT_TOKEN_MAX_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

const GOVERNANCE = Object.freeze({
  operator: "Gary",
  budgetOwner: "Gary",
  dataResetOwner: "Gary",
  destroyOwner: "Gary",
  reviewDate: "2026-07-29",
});

// This symbol cannot be supplied through the CLI. Tests may replace transport, time, and the
// repository root without making production provider endpoints or the evidence path configurable.
export const TEST_ONLY_PHASE1_PROVIDER_EVIDENCE = Symbol(
  "frontend-upgrade-phase1-provider-evidence-test-only",
);

const requireIsolatedProviderTestRoot = async (testOnly, environment) => {
  if (
    process.env.NODE_ENV !== "test"
    || environment?.NODE_ENV !== "test"
  ) {
    throw new Error("test-only provider injection requires NODE_ENV=test");
  }
  if (
    !testOnly
    || typeof testOnly.root !== "string"
    || testOnly.root.length === 0
  ) {
    throw new Error("test-only provider injection requires an explicit isolated root");
  }
  const candidateRoot = path.resolve(testOnly.root);
  let candidateMetadata;
  let rootRealPath;
  let defaultRealPath;
  let temporaryRealPath;
  try {
    [candidateMetadata, rootRealPath, defaultRealPath, temporaryRealPath] = await Promise.all([
      lstat(candidateRoot),
      realpath(candidateRoot),
      realpath(defaultRoot),
      realpath(controlledTestParent),
    ]);
  } catch {
    throw new Error("test-only provider injection root is invalid");
  }
  if (candidateMetadata.isSymbolicLink()) {
    throw new Error("test-only provider injection root must not be a symlink");
  }
  if (rootRealPath === defaultRealPath) {
    throw new Error("test-only provider injection requires an isolated root");
  }
  const relative = path.relative(temporaryRealPath, rootRealPath);
  if (
    relative === ""
    || relative === ".."
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    throw new Error("test-only provider injection requires a canonical temporary root");
  }
  return rootRealPath;
};

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const requireText = (value, label) => {
  const normalized = clean(value);
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};
const requireEqual = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label} must match the approved Phase 1 value`);
};
const requireSha = (value, label) => {
  const normalized = requireText(value, label);
  if (!/^[0-9a-f]{40}$/.test(normalized)) {
    throw new Error(`${label} must be a 40-character lowercase Git SHA`);
  }
  return normalized;
};
const unwrap = (entry, key) => entry?.[key] ?? entry;
const normalizedRepo = (value) => clean(value).replace(/\.git$/iu, "");
const serviceCommand = (service, key) => (
  service?.serviceDetails?.envSpecificDetails?.[key]
);

const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
};
const canonicalHash = (value) => sha256(JSON.stringify(canonicalize(value)));

const normalizeJurisdiction = (value) => {
  const normalized = clean(value) || "default";
  if (!new Set(["default", "eu", "fedramp"]).has(normalized)) {
    throw new Error("R2 jurisdiction must be default, eu, or fedramp");
  }
  return normalized;
};
const hashR2Identity = (accountId, bucketName, jurisdiction) => (
  sha256(JSON.stringify([accountId, bucketName, normalizeJurisdiction(jurisdiction)]))
);
const endpointSuffixFor = (jurisdiction) => (
  jurisdiction === "default"
    ? "r2.cloudflarestorage.com"
    : `${jurisdiction}.r2.cloudflarestorage.com`
);

const assertDistinct = (left, right, label) => {
  if (left === right) throw new Error(`${label} must differ from production`);
};

const findNamed = (entries, name, label) => {
  const matches = entries.filter((entry) => entry?.name === name);
  if (matches.length === 0) {
    throw new Error(`${label} was not returned by the authenticated provider`);
  }
  if (matches.length !== 1) {
    throw new Error(`${label} must be unique in the authenticated provider response`);
  }
  return matches[0];
};

const requestIdFor = (provider, response, sensitiveValues) => {
  const preferred = provider === "Cloudflare" ? "cf-ray" : "x-request-id";
  const candidate = clean(response.headers.get(preferred))
    || clean(response.headers.get("x-request-id"))
    || clean(response.headers.get("cf-ray"))
    || "unavailable";
  if (
    candidate !== "unavailable"
    && (
      sensitiveValues.some((value) => (
        typeof value === "string"
        && value.length > 0
        && candidate.toLowerCase().includes(value.toLowerCase())
      ))
      || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(candidate)
      || /(?:bearer|credential|password|secret|token)/iu.test(candidate)
    )
  ) return "unavailable";
  return candidate;
};

const requestJson = async ({
  provider,
  url,
  token,
  fetchImpl,
  additionalHeaders = {},
  sensitiveValues,
}) => {
  let response;
  try {
    response = await fetchImpl(url, {
      method: "GET",
      headers: {
        accept: "application/json",
        ...additionalHeaders,
        authorization: `Bearer ${token}`,
      },
      redirect: "error",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(`${provider} request failed (status unavailable, request id unavailable)`);
  }

  const requestId = requestIdFor(provider, response, sensitiveValues);
  if (!response.ok) {
    // Provider error bodies may echo credentials or resource metadata, so never read them.
    throw new Error(
      `${provider} request failed (status ${response.status}, request id ${requestId})`,
    );
  }
  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new Error(
      `${provider} request failed (status ${response.status}, request id ${requestId})`,
    );
  }
  if (provider === "Cloudflare" && payload?.success !== true) {
    throw new Error(
      `${provider} request failed (status ${response.status}, request id ${requestId})`,
    );
  }
  return payload;
};

const validateWebOrigin = (value) => {
  const source = requireText(value, "QUANTGYM_PREVIEW_WEB_URL");
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("QUANTGYM_PREVIEW_WEB_URL must be the Preview Pages HTTPS origin");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
    || url.hostname !== `${PREVIEW_PAGES}.pages.dev`
  ) {
    throw new Error("QUANTGYM_PREVIEW_WEB_URL must be the Preview Pages HTTPS origin");
  }
  return url.origin;
};

const normalizePrivateLlmOrigin = (value, label) => {
  const source = requireText(value, label);
  let url;
  try {
    url = new URL(source.includes("://") ? source : `http://${source}`);
  } catch {
    throw new Error(`${label} must be the Preview private LLM address`);
  }
  if (
    !new Set(["http:", "https:"]).has(url.protocol)
    || url.hostname.toLowerCase() !== PREVIEW_LLM
    || !url.port
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error(`${label} must be the Preview private LLM address`);
  }
  return url.origin;
};

const parseDatabaseIdentity = (value, label, { requireTls = false } = {}) => {
  let url;
  try {
    url = new URL(requireText(value, label));
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection string`);
  }
  if (
    !new Set(["postgres:", "postgresql:"]).has(url.protocol)
    || !url.hostname
    || !url.username
    || !url.password
    || !url.pathname.startsWith("/")
    || url.hash
  ) {
    throw new Error(`${label} must be a valid PostgreSQL connection string`);
  }
  let role;
  let database;
  try {
    role = decodeURIComponent(url.username);
    database = decodeURIComponent(url.pathname.slice(1));
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection string`);
  }
  if (!role || !database || database.includes("/")) {
    throw new Error(`${label} must be a valid PostgreSQL connection string`);
  }
  const queryEntries = [...url.searchParams.entries()];
  if (
    queryEntries.some(([key]) => key !== "sslmode")
    || queryEntries.filter(([key]) => key === "sslmode").length > 1
  ) {
    throw new Error(`${label} must not contain PostgreSQL connection overrides`);
  }
  const sslMode = url.searchParams.get("sslmode");
  if (
    (sslMode !== null && !new Set(["require", "verify-ca", "verify-full"]).has(sslMode))
    || (requireTls && sslMode === null)
  ) {
    throw new Error(`${label} must require PostgreSQL TLS`);
  }
  return {
    hostname: url.hostname.toLowerCase(),
    port: url.port || "5432",
    role,
    database,
  };
};

const parseR2EndpointAccount = (value, jurisdiction) => {
  const suffix = endpointSuffixFor(jurisdiction);
  const escapedSuffix = suffix.replace(/\./gu, "\\.");
  const source = requireText(value, "Preview API R2 endpoint");
  const match = new RegExp(
    `^https://([a-f0-9]{32})\\.${escapedSuffix}/?$`,
    "u",
  ).exec(source);
  let url;
  try {
    url = new URL(source);
  } catch {
    throw new Error("Preview API R2 endpoint must match the authenticated Cloudflare account");
  }
  if (
    !match
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("Preview API R2 endpoint must match the authenticated Cloudflare account");
  }
  return match[1];
};

const selectPagesProject = (payload) => {
  const value = payload?.result ?? {};
  const productionEnv = value.deployment_configs?.production?.env_vars;
  const productionR2Bindings = value.deployment_configs?.production?.r2_buckets;
  const envVars = productionEnv && typeof productionEnv === "object" && !Array.isArray(productionEnv)
    ? Object.entries(productionEnv).map(([key, entry]) => ({
      key,
      value: typeof entry === "object" && entry !== null ? entry.value : entry,
      type: typeof entry === "object" && entry !== null ? entry.type : undefined,
    }))
    : [];
  return {
    id: value.id,
    name: value.name,
    source: {
      type: value.source?.type,
      config: {
        owner: value.source?.config?.owner,
        repoName: value.source?.config?.repo_name,
        productionBranch: value.source?.config?.production_branch,
        productionDeploymentsEnabled: (
          value.source?.config?.production_deployments_enabled
        ),
        previewDeploymentSetting: (
          value.source?.config?.preview_deployment_setting
        ),
        deploymentsEnabled: value.source?.config?.deployments_enabled,
      },
    },
    buildCommand: value.build_config?.build_command,
    destinationDir: value.build_config?.destination_dir,
    latestDeployment: {
      id: value.latest_deployment?.id,
      branch: value.latest_deployment?.deployment_trigger?.metadata?.branch,
      commit: value.latest_deployment?.deployment_trigger?.metadata?.commit_hash,
      status: value.latest_deployment?.latest_stage?.status,
    },
    envVars,
    r2BindingKeys: (
      productionR2Bindings
      && typeof productionR2Bindings === "object"
      && !Array.isArray(productionR2Bindings)
    )
      ? Object.keys(productionR2Bindings)
      : [],
    // This value never leaves process memory. It is included only in the canonical Production
    // control hash so configuration additions cannot evade the baseline comparison.
    controlConfiguration: canonicalize(value),
  };
};

const selectR2Bucket = (payload) => ({
  name: payload?.result?.name,
  jurisdiction: payload?.result?.jurisdiction,
  controlConfiguration: canonicalize(payload?.result ?? null),
});

const selectService = (entry) => {
  const value = unwrap(entry, "service") ?? {};
  return {
    id: value.id,
    ownerId: value.ownerId,
    name: value.name,
    type: value.type,
    repo: value.repo,
    branch: value.branch,
    rootDir: value.rootDir,
    autoDeploy: value.autoDeploy,
    serviceDetails: {
      runtime: value.serviceDetails?.runtime,
      region: value.serviceDetails?.region,
      url: value.serviceDetails?.url,
      healthCheckPath: (
        value.serviceDetails?.healthCheckPath
        ?? value.serviceDetails?.envSpecificDetails?.healthCheckPath
      ),
      envSpecificDetails: {
        buildCommand: value.serviceDetails?.envSpecificDetails?.buildCommand,
        startCommand: value.serviceDetails?.envSpecificDetails?.startCommand,
      },
    },
    controlConfiguration: canonicalize(value),
  };
};

const selectEnvironmentGroup = (entry) => {
  const value = unwrap(entry, "envGroup") ?? {};
  if (!Array.isArray(value.serviceLinks)) {
    throw new Error("Render environment group service links response is invalid");
  }
  return {
    id: requireText(value.id, "Render environment group id"),
    name: requireText(value.name, "Render environment group name"),
    ownerId: requireText(value.ownerId, "Render environment group workspace"),
    serviceIds: value.serviceLinks.map((link) => (
      requireText(link?.id, "Render environment group service id")
    )),
    controlConfiguration: canonicalize(value),
  };
};

const postgresMajorFrom = (value) => {
  const candidate = value.version ?? value.postgresVersion ?? value.majorVersion;
  const match = /^(\d+)(?:\.\d+)*$/u.exec(clean(candidate));
  return match ? Number(match[1]) : Number.NaN;
};

const selectPostgres = (entry) => {
  const value = unwrap(entry, "postgres") ?? {};
  return {
    id: value.id,
    ownerId: value.owner?.id ?? value.ownerId,
    name: value.name,
    plan: value.plan,
    status: value.status,
    databaseName: value.databaseName,
    databaseUser: value.databaseUser,
    postgresMajor: postgresMajorFrom(value),
    controlConfiguration: canonicalize(value),
  };
};

const selectEnvVar = (entry) => {
  const value = unwrap(entry, "envVar");
  if (!value || typeof value.key !== "string") return undefined;
  return { key: value.key, value: value.value };
};

const pagesAliasHostname = (value) => {
  const source = clean(value);
  if (!source) return "";
  let url;
  try {
    url = new URL(source.includes("://") ? source : `https://${source}`);
  } catch {
    return "";
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.port
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) return "";
  return url.hostname.toLowerCase();
};

const selectSecretFile = (entry) => {
  const value = unwrap(entry, "secretFile");
  if (!value || typeof value.name !== "string") return undefined;
  return { name: value.name };
};

const selectEnvironmentGroupDetails = (payload) => {
  const value = unwrap(payload, "envGroup") ?? {};
  if (
    !Array.isArray(value.serviceLinks)
    || !Array.isArray(value.envVars)
    || !Array.isArray(value.secretFiles)
  ) {
    throw new Error("Render environment group detail response is invalid");
  }
  return {
    id: requireText(value.id, "Render environment group detail id"),
    ownerId: requireText(value.ownerId, "Render environment group detail workspace"),
    serviceIds: value.serviceLinks.map((link) => (
      requireText(link?.id, "Render environment group detail service id")
    )),
    envVars: value.envVars.map(selectEnvVar).filter(Boolean),
    secretFileNames: value.secretFiles.map((entry) => (
      requireText(entry?.name, "Render environment group secret file name")
    )),
    controlConfiguration: canonicalize(value),
  };
};

const selectLegacyDeployment = (entry) => ({
  id: entry?.id,
  branch: entry?.deployment_trigger?.metadata?.branch,
  commit: entry?.deployment_trigger?.metadata?.commit_hash,
  status: entry?.latest_stage?.status,
  aliases: Array.isArray(entry?.aliases)
    ? entry.aliases.map(pagesAliasHostname).filter(Boolean)
    : [],
  url: typeof entry?.url === "string" ? entry.url : "",
});

const autoDeployDisabled = (value) => value === "no";

const validatePages = (project, expectedCommit) => {
  requireEqual(project.name, PREVIEW_PAGES, "Pages project name");
  requireEqual(project.source.type, "github", "Pages source type");
  requireEqual(project.source.config.owner, "garymmmjw", "Pages repository owner");
  requireEqual(project.source.config.repoName, "QuantGym", "Pages repository");
  requireEqual(project.source.config.productionBranch, PREVIEW_BRANCH, "Pages production branch");
  if (project.source.config.productionDeploymentsEnabled !== false) {
    throw new Error("Pages production-branch automatic deployments must be disabled");
  }
  if (project.source.config.previewDeploymentSetting !== "none") {
    throw new Error("Pages preview-branch automatic deployments must be disabled");
  }
  requireEqual(project.buildCommand, PAGES_BUILD, "Pages build command");
  requireEqual(project.destinationDir, PAGES_DESTINATION, "Pages output directory");
  requireEqual(project.latestDeployment.branch, PREVIEW_BRANCH, "Pages deployment branch");
  requireEqual(project.latestDeployment.commit, expectedCommit, "Pages deployment commit");
  requireEqual(project.latestDeployment.status, "success", "Pages deployment status");
  requireText(project.id, "Pages project id");
};

const validateServiceRepository = (service, label) => {
  if (normalizedRepo(service.repo) !== REPOSITORY) {
    throw new Error(`${label} repository must be the approved QuantGym repository`);
  }
  requireEqual(service.branch, PREVIEW_BRANCH, `${label} branch`);
};

const validateApiService = (service, pythonVersion) => {
  requireEqual(service.type, "web_service", "API service type");
  requireEqual(service.serviceDetails.runtime, "python", "API runtime");
  validateServiceRepository(service, "API service");
  requireEqual(service.rootDir, "api", "API root directory");
  requireEqual(serviceCommand(service, "buildCommand"), API_BUILD, "API build command");
  requireEqual(serviceCommand(service, "startCommand"), API_START, "API start command");
  requireEqual(
    service.serviceDetails.healthCheckPath,
    API_HEALTH_PATH,
    "API health-check path",
  );
  requireEqual(pythonVersion, PYTHON_VERSION, "API Python version");
  if (!autoDeployDisabled(service.autoDeploy)) {
    throw new Error("API automatic deployments must be disabled");
  }
};

const validateLlmService = (service, nodeVersion, llmEnvironment) => {
  requireEqual(service.type, "private_service", "LLM service type");
  requireEqual(service.serviceDetails.runtime, "node", "LLM runtime");
  validateServiceRepository(service, "LLM service");
  requireEqual(serviceCommand(service, "buildCommand"), LLM_BUILD, "LLM build command");
  requireEqual(serviceCommand(service, "startCommand"), LLM_START, "LLM start command");
  requireEqual(nodeVersion, NODE_VERSION, "LLM Node version");
  requireEqual(llmEnvironment.environment, "preview-v2", "LLM probe environment");
  requireEqual(llmEnvironment.service, "llm", "LLM probe service");
  requireEqual(llmEnvironment.commit, llmEnvironment.expectedCommit, "LLM probe commit");
  if (!autoDeployDisabled(service.autoDeploy)) {
    throw new Error("LLM automatic deployments must be disabled");
  }
};

const envMap = (entries, label) => {
  if (!Array.isArray(entries)) throw new Error(`${label} response is invalid`);
  const map = new Map();
  for (const entry of entries) {
    if (!entry || typeof entry.key !== "string") continue;
    if (map.has(entry.key)) throw new Error(`${label} contains a duplicate environment key`);
    map.set(entry.key, entry.value);
  }
  return map;
};

const effectiveEnvironment = ({ serviceEntries, groupEntries, groupLinked }) => {
  const effective = new Map();
  if (groupLinked) {
    for (const [key, value] of envMap(groupEntries, "Render environment group variables")) {
      effective.set(key, value);
    }
  }
  for (const [key, value] of envMap(serviceEntries, "Render service environment variables")) {
    effective.set(key, value);
  }
  return effective;
};

const requireEnvValue = (environment, key, label = key) => (
  requireText(environment.get(key), label)
);

const PAGES_ALLOWED_ENV_KEYS = new Set([
  "NODE_VERSION",
  "QUANTGYM_EDGE_SHARED_SECRET",
  "QUANTGYM_PREVIEW_ENVIRONMENT",
  "QUANTGYM_PREVIEW_SERVICE",
  "QUANTGYM_PREVIEW_COMMIT",
  "QUANTGYM_PREVIEW_BRANCH",
  "QUANTGYM_PREVIEW_API_BASE",
]);
const LLM_ALLOWED_ENV_KEYS = new Set([
  "NODE_VERSION",
  "QUANTGYM_PREVIEW_ENVIRONMENT",
  "QUANTGYM_PREVIEW_SERVICE",
  "QUANTGYM_PREVIEW_COMMIT",
]);
const OPERATOR_ONLY_PROVIDER_KEYS = new Set([
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "RENDER_API_KEY",
]);
const assertAllowedEnvironmentKeys = (entries, label, allowed) => {
  if (entries.some((entry) => !allowed.has(entry?.key))) {
    throw new Error(`${label} contains an unapproved environment variable`);
  }
};
const assertNoOperatorProviderCredentials = (entries, label) => {
  if (entries.some((entry) => OPERATOR_ONLY_PROVIDER_KEYS.has(entry?.key))) {
    throw new Error(`${label} must not hold an operator provider credential`);
  }
};

const R2_SECRET_KEY = /(?:r2|s3).*(?:access|secret|credential|token|private|key)|(?:access|secret|credential|token|private|key).*(?:r2|s3)/iu;
const POSTGRES_SECRET_KEY = /(?:database|postgres).*(?:url|dsn|password|secret|credential)|(?:url|dsn|password|secret|credential).*(?:database|postgres)/iu;
const assertNoUpstreamSecrets = (entries, label) => {
  if (entries.some((entry) => R2_SECRET_KEY.test(entry?.key ?? ""))) {
    throw new Error(`${label} must not hold an R2 credential`);
  }
  if (entries.some((entry) => POSTGRES_SECRET_KEY.test(entry?.key ?? ""))) {
    throw new Error(`${label} must not hold a PostgreSQL credential`);
  }
  if (entries.some((entry) => (
    /(?:^|_)(?:AWS_)?(?:ACCESS_KEY_ID|SECRET_ACCESS_KEY|SESSION_TOKEN)$/iu.test(
      entry?.key ?? "",
    )
  ))) {
    throw new Error(`${label} must not hold an object-storage credential`);
  }
};

const validateLegacyDeployment = (deployments) => {
  const matches = deployments.filter((deployment) => {
    let urlHostname = "";
    try {
      urlHostname = deployment.url ? new URL(deployment.url).hostname : "";
    } catch {
      urlHostname = "";
    }
    return deployment.branch === LEGACY_BRANCH
      && deployment.commit === ACCEPTED_PHASE0_DEPLOYMENT_COMMIT
      && (
        deployment.aliases.includes(LEGACY_ALIAS)
        || urlHostname === LEGACY_ALIAS
      );
  });
  if (matches.length !== 1) {
    throw new Error("legacy compatibility deployment must be returned uniquely");
  }
  requireEqual(matches[0].status, "success", "legacy compatibility deployment status");
  requireText(matches[0].id, "legacy compatibility deployment id");
  return matches[0];
};

const validateR2Controls = ({
  lifecycle,
  cors,
  managedDomain,
  customDomains,
  webOrigin,
}) => {
  if (managedDomain?.enabled !== false) throw new Error("R2 managed development domain must be disabled");
  if (!Array.isArray(customDomains?.domains) || customDomains.domains.length !== 0) {
    throw new Error("R2 custom domains must be absent");
  }
  const rules = Array.isArray(lifecycle?.rules) ? lifecycle.rules : [];
  const cleanupRule = rules.find((rule) => (
    rule?.enabled === true
    && rule?.conditions?.prefix === "readiness-smoke/"
    && rule?.deleteObjectsTransition?.condition?.type === "Age"
    && rule?.deleteObjectsTransition?.condition?.maxAge === R2_LIFECYCLE_SECONDS
  ));
  if (!cleanupRule) {
    throw new Error("R2 must delete readiness-smoke objects after seven days");
  }
  const corsRules = Array.isArray(cors?.rules) ? cors.rules : [];
  const origins = corsRules.flatMap((rule) => (
    Array.isArray(rule?.allowed?.origins) ? rule.allowed.origins : []
  ));
  if (origins.length !== 1 || origins[0] !== webOrigin) {
    throw new Error("R2 CORS origin must equal the Preview Pages origin");
  }
};

const selectLifecycle = (payload) => ({
  rules: Array.isArray(payload?.result?.rules)
    ? payload.result.rules.map((rule) => ({
      enabled: rule?.enabled,
      conditions: { prefix: rule?.conditions?.prefix },
      deleteObjectsTransition: {
        condition: {
          type: rule?.deleteObjectsTransition?.condition?.type,
          maxAge: rule?.deleteObjectsTransition?.condition?.maxAge,
        },
      },
    }))
    : null,
  controlConfiguration: canonicalize(payload?.result ?? null),
});

const selectCors = (payload) => ({
  rules: Array.isArray(payload?.result?.rules)
    ? payload.result.rules.map((rule) => ({
      allowed: {
        origins: Array.isArray(rule?.allowed?.origins)
          ? rule.allowed.origins.filter((origin) => typeof origin === "string")
          : null,
      },
    }))
    : null,
  controlConfiguration: canonicalize(payload?.result ?? null),
});

const selectManagedDomain = (payload) => ({
  enabled: payload?.result?.enabled,
  controlConfiguration: canonicalize(payload?.result ?? null),
});

const selectCustomDomains = (payload) => ({
  domains: Array.isArray(payload?.result?.domains)
    ? payload.result.domains.map(() => ({ present: true }))
    : null,
  controlConfiguration: canonicalize(payload?.result ?? null),
});

const productionControlState = ({
  pages,
  r2,
  r2Controls,
  services,
  serviceEnvironmentControls,
  serviceSecretFileControls,
  serviceLiveDeployControls,
  environmentGroups,
  environmentGroupDetailControls,
  postgresResources,
  workspaceId,
  cloudflareAccountId,
}) => {
  const productionApi = findNamed(services, PRODUCTION_API, "production API service");
  const productionLlm = findNamed(services, PRODUCTION_LLM, "production LLM service");
  const productionPostgres = findNamed(
    postgresResources,
    PRODUCTION_POSTGRES,
    "production PostgreSQL resource",
  );
  const productionServiceIds = [productionApi.id, productionLlm.id];
  const productionGroups = environmentGroups
    .filter((group) => (
      group.ownerId === workspaceId
      && group.serviceIds.some((id) => productionServiceIds.includes(id))
    ))
    .sort((left, right) => left.id.localeCompare(right.id));
  return {
    pages: {
      id: pages.id,
      name: pages.name,
      controlConfiguration: pages.controlConfiguration,
      latestDeployment: pages.latestDeployment,
    },
    r2: {
      identity: hashR2Identity(
        cloudflareAccountId,
        requireText(r2.name, "production R2 bucket"),
        normalizeJurisdiction(r2.jurisdiction),
      ),
      bucket: r2.controlConfiguration,
      lifecycle: r2Controls?.lifecycle?.controlConfiguration,
      cors: r2Controls?.cors?.controlConfiguration,
      managedDomain: r2Controls?.managedDomain?.controlConfiguration,
      customDomains: r2Controls?.customDomains?.controlConfiguration,
    },
    services: [productionApi, productionLlm]
      .map((service) => ({
        id: service.id,
        controlConfiguration: service.controlConfiguration,
        environment: serviceEnvironmentControls?.get(service.id),
        secretFiles: serviceSecretFileControls?.get(service.id),
        liveDeploy: serviceLiveDeployControls?.get(service.id),
      }))
      .sort((left, right) => left.id.localeCompare(right.id)),
    postgres: productionPostgres.controlConfiguration,
    environmentGroups: productionGroups.map((group) => ({
      id: group.id,
      listConfiguration: group.controlConfiguration,
      detailConfiguration: environmentGroupDetailControls?.get(group.id),
    })),
  };
};

const assertExactKeys = (value, expected, label) => {
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(actual) !== JSON.stringify(wanted)) {
    throw new Error(`${label} does not match the Phase 1 provider evidence schema`);
  }
};

const assertEvidenceSchemaFields = (evidence) => {
  assertExactKeys(evidence, [
    "schemaVersion",
    "capturedAt",
    "expiresAt",
    "environment",
    "branch",
    "applicationCommit",
    "legacyCommit",
    "postgresMajor",
    "governance",
    "phase0ProviderEvidenceSha256",
    "prePushBaselineSha256",
    "productionControlBefore",
    "productionControlAfter",
    "r2PolicyAttestations",
    "resourceFingerprints",
    "deployments",
    "bindings",
    "controls",
  ], "provider evidence");
  assertExactKeys(evidence.governance, Object.keys(GOVERNANCE), "provider evidence governance");
  assertExactKeys(evidence.r2PolicyAttestations, [
    "runtimeIdSha256",
    "runtimePolicySha256",
    "runtimeExpirationStatus",
    "auditIdSha256",
    "auditPolicySha256",
    "auditExpirationStatus",
  ], "R2 policy attestations");
  assertExactKeys(evidence.resourceFingerprints, [
    "pages",
    "api",
    "llm",
    "postgres",
    "postgresRole",
    "r2",
    "previewEnvironmentGroup",
    "legacyPagesDeployment",
    "productionPages",
    "productionServices",
    "productionPostgres",
    "productionR2",
    "productionEnvironmentGroups",
  ], "provider evidence resource fingerprints");
  assertExactKeys(evidence.deployments, ["pages", "api", "llm", "legacy"], "provider deployments");
  for (const name of ["pages", "api", "llm"]) {
    assertExactKeys(evidence.deployments[name], ["provider", "status", "commit"], `${name} deployment`);
  }
  assertExactKeys(
    evidence.deployments.legacy,
    ["provider", "status", "commit", "branch", "aliasSha256"],
    "legacy deployment",
  );
  assertExactKeys(evidence.bindings, ["postgres", "r2"], "provider bindings");
  for (const binding of Object.values(evidence.bindings)) {
    assertExactKeys(binding, ["status", "isolated"], "provider binding");
  }
  assertExactKeys(evidence.controls, [
    "pagesAutomaticDeploysDisabled",
    "apiAutomaticDeploysDisabled",
    "llmAutomaticDeploysDisabled",
    "pagesV2BuildConfigured",
    "apiPythonConfigured",
    "llmProbeConfigured",
    "applicationDeploymentsAligned",
    "resourceIsolationVerified",
    "productionUnchanged",
    "phase0IdentitiesLocked",
    "prePushBaselineVerified",
    "r2PoliciesVerified",
  ], "provider controls");
};

const assertDirectoryChainIdentity = async (snapshot) => {
  for (const entry of snapshot.entries) {
    const current = await lstat(entry.path, { bigint: true });
    if (
      current.isSymbolicLink()
      || !current.isDirectory()
      || current.dev !== entry.metadata.dev
      || current.ino !== entry.metadata.ino
      || current.mode !== entry.metadata.mode
    ) {
      throw new Error(`unsafe ancestor directory changed ${entry.path}`);
    }
  }
  return snapshot;
};

const ensureOutputDirectory = async (
  root,
  relativePath = PHASE1_PROVIDER_EVIDENCE_PATH,
) => {
  const resolvedRoot = path.resolve(root);
  await captureTrustedDirectoryChain(resolvedRoot);
  const relativeDirectory = path.posix.dirname(relativePath);
  let current = resolvedRoot;
  for (const segment of relativeDirectory.split("/")) {
    current = path.join(current, segment);
    try {
      await mkdir(current, { mode: 0o700 });
    } catch (error) {
      if (error.code !== "EEXIST") throw error;
    }
    const metadata = await lstat(current, { bigint: true });
    if (metadata.isSymbolicLink() || !metadata.isDirectory()) {
      throw new Error("provider evidence output directory is unsafe");
    }
  }
  return captureTrustedDirectoryChain(resolvedRoot, relativeDirectory);
};

const assertRegularSingleLink = (metadata, label) => {
  if (!metadata.isFile() || metadata.nlink !== 1n) {
    throw new Error(`${label} must be a single-link regular file`);
  }
};

const assertPathMatchesHandle = async (filePath, handleMetadata, label) => {
  const pathMetadata = await lstat(filePath, { bigint: true });
  assertRegularSingleLink(pathMetadata, label);
  if (
    pathMetadata.dev !== handleMetadata.dev
    || pathMetadata.ino !== handleMetadata.ino
  ) {
    throw new Error(`${label} inode changed`);
  }
  return pathMetadata;
};

const inspectExistingOutput = async (outputPath) => {
  let handle;
  try {
    handle = await open(
      outputPath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
  } catch (error) {
    if (error.code === "ENOENT") return { exists: false };
    throw new Error("existing provider evidence path is unsafe");
  }
  try {
    const metadata = await handle.stat({ bigint: true });
    assertRegularSingleLink(metadata, "existing provider evidence");
    await assertPathMatchesHandle(outputPath, metadata, "existing provider evidence");
    return { exists: true, dev: metadata.dev, ino: metadata.ino };
  } finally {
    await handle.close();
  }
};

const assertExistingOutputUnchanged = async (outputPath, expected) => {
  let current;
  try {
    current = await inspectExistingOutput(outputPath);
  } catch {
    throw new Error("provider evidence output changed before atomic rename");
  }
  if (
    current.exists !== expected.exists
    || (
      expected.exists
      && (current.dev !== expected.dev || current.ino !== expected.ino)
    )
  ) {
    throw new Error("provider evidence output changed before atomic rename");
  }
};

const writeEvidenceAtomically = async ({
  root,
  serialized,
  beforeRename,
  relativePath = PHASE1_PROVIDER_EVIDENCE_PATH,
  label = "provider evidence",
  mustNotExist = false,
}) => {
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error("O_NOFOLLOW is required to write provider evidence");
  }
  let directorySnapshot = await ensureOutputDirectory(root, relativePath);
  const outputPath = path.join(path.resolve(root), relativePath);
  const existingOutput = await inspectExistingOutput(outputPath);
  if (mustNotExist && existingOutput.exists) {
    throw new Error(`${label} already exists and is immutable`);
  }
  const temporaryPath = `${outputPath}.tmp-${process.pid}-${randomUUID()}`;
  let handle;
  let renamed = false;
  let failure;
  try {
    handle = await open(
      temporaryPath,
      fsConstants.O_WRONLY
        | fsConstants.O_CREAT
        | fsConstants.O_EXCL
        | fsConstants.O_NOFOLLOW,
      0o600,
    );
    directorySnapshot = await assertDirectoryChainIdentity(directorySnapshot);
    await handle.chmod(0o600);
    const before = await handle.stat({ bigint: true });
    assertRegularSingleLink(before, `temporary ${label}`);
    await handle.writeFile(serialized, { encoding: "utf8" });
    await handle.sync();
    const after = await handle.stat({ bigint: true });
    assertRegularSingleLink(after, `temporary ${label}`);
    if (
      before.dev !== after.dev
      || before.ino !== after.ino
      || Number(after.mode & 0o777n) !== 0o600
      || after.size !== BigInt(Buffer.byteLength(serialized))
    ) {
      throw new Error("temporary provider evidence changed while writing");
    }
    await assertDirectoryChainIdentity(directorySnapshot);
    if (beforeRename) {
      await beforeRename({ outputPath, temporaryPath });
    }
    await assertDirectoryChainIdentity(directorySnapshot);
    await assertPathMatchesHandle(temporaryPath, after, `temporary ${label}`);
    await assertExistingOutputUnchanged(outputPath, existingOutput);
    // Keep the inode-attested handle open across rename so there is no extra close/yield window
    // between the final path checks and the atomic operation.
    await rename(temporaryPath, outputPath);
    renamed = true;
    directorySnapshot = await assertDirectoryChainIdentity(directorySnapshot);
    const outputMetadata = await lstat(outputPath, { bigint: true });
    assertRegularSingleLink(outputMetadata, label);
    if (
      outputMetadata.dev !== after.dev
      || outputMetadata.ino !== after.ino
      || Number(outputMetadata.mode & 0o777n) !== 0o600
    ) {
      throw new Error("provider evidence inode or mode changed after atomic rename");
    }
    await assertDirectoryChainIdentity(directorySnapshot);
    await handle.close();
    handle = undefined;
  } catch (error) {
    failure = error;
  }
  if (handle) {
    try {
      await handle.close();
    } catch (error) {
      if (!failure) failure = error;
    }
  }
  if (!renamed) {
    try {
      await unlink(temporaryPath);
    } catch (error) {
      if (error.code !== "ENOENT" && !failure) failure = error;
    }
  }
  if (failure) throw failure;
  return outputPath;
};

const securelyReadJson = async ({
  root,
  relativePath,
  label,
  maximumBytes,
  expectedMode,
}) => {
  if (typeof fsConstants.O_NOFOLLOW !== "number") {
    throw new Error(`O_NOFOLLOW is required to read ${label}`);
  }
  const resolvedRoot = path.resolve(root);
  const relativeDirectory = path.posix.dirname(relativePath);
  let directorySnapshot = await captureTrustedDirectoryChain(
    resolvedRoot,
    relativeDirectory,
  );
  const filePath = path.join(resolvedRoot, relativePath);
  const expectedParent = path.join(
    await realpath(resolvedRoot),
    ...relativeDirectory.split("/"),
  );
  if (await realpath(path.dirname(filePath)) !== expectedParent) {
    throw new Error(`${label} parent directory is unsafe`);
  }
  let handle;
  try {
    handle = await open(
      filePath,
      fsConstants.O_RDONLY | fsConstants.O_NOFOLLOW | fsConstants.O_NONBLOCK,
    );
    const before = await handle.stat({ bigint: true });
    assertRegularSingleLink(before, label);
    const currentUid = typeof process.getuid === "function"
      ? BigInt(process.getuid())
      : before.uid;
    if (
      before.size <= 0n
      || before.size > BigInt(maximumBytes)
      || Number(before.mode & 0o777n) !== expectedMode
      || before.uid !== currentUid
    ) {
      throw new Error(`${label} metadata is unsafe`);
    }
    await assertPathMatchesHandle(filePath, before, label);
    const bytes = await handle.readFile();
    const after = await handle.stat({ bigint: true });
    for (const field of ["dev", "ino", "mode", "size", "mtimeNs", "ctimeNs"]) {
      if (before[field] !== after[field]) throw new Error(`${label} changed while reading`);
    }
    if (bytes.length !== Number(before.size) || bytes.length > maximumBytes) {
      throw new Error(`${label} size changed while reading`);
    }
    directorySnapshot = await assertDirectoryChainIdentity(directorySnapshot);
    await assertPathMatchesHandle(filePath, after, label);
    let value;
    try {
      value = JSON.parse(bytes.toString("utf8"));
    } catch {
      throw new Error(`${label} is not valid JSON`);
    }
    return { value, bytes, sha256: sha256(bytes) };
  } finally {
    await handle?.close();
  }
};

const requireHash = (value, label) => {
  const normalized = requireText(value, label);
  if (!/^[0-9a-f]{64}$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase SHA-256`);
  }
  return normalized;
};

const loadLockedPhase0ProviderIdentities = async ({ root, testOnly }) => {
  const summary = await securelyReadJson({
    root,
    relativePath: PHASE0_PREVIEW_SUMMARY_PATH,
    label: "locked Phase 0 Preview summary",
    maximumBytes: MAX_PHASE0_EVIDENCE_BYTES,
    expectedMode: 0o644,
  });
  const expectedSummarySha256 = testOnly?.phase0PreviewSummarySha256
    ?? PHASE0_PREVIEW_SUMMARY_SHA256;
  if (summary.sha256 !== expectedSummarySha256) {
    throw new Error("locked Phase 0 Preview summary digest mismatch");
  }
  const provider = await securelyReadJson({
    root,
    relativePath: PHASE0_PROVIDER_EVIDENCE_PATH,
    label: "locked Phase 0 provider evidence",
    maximumBytes: MAX_PHASE0_EVIDENCE_BYTES,
    expectedMode: 0o600,
  });
  if (
    requireHash(
      summary.value?.providerEvidenceSha256,
      "locked Phase 0 provider evidence digest",
    ) !== provider.sha256
  ) {
    throw new Error("locked Phase 0 provider evidence digest mismatch");
  }
  const cloudflare = provider.value?.cloudflare;
  const render = provider.value?.render;
  const services = Array.isArray(render?.services) ? render.services : [];
  const serviceByName = (name, label) => {
    const matches = services.filter((service) => service?.name === name);
    if (matches.length !== 1) throw new Error(`${label} is not unique in Phase 0 evidence`);
    return matches[0];
  };
  const api = serviceByName(PREVIEW_API, "Preview API identity");
  const llm = serviceByName(PREVIEW_LLM, "Preview LLM identity");
  const groupHashes = Array.isArray(render?.previewAllowedGroupIdHashes)
    ? render.previewAllowedGroupIdHashes
    : [];
  if (groupHashes.length !== 1) {
    throw new Error("Phase 0 evidence must lock exactly one Preview environment group");
  }
  const identities = {
    pages: requireHash(cloudflare?.pages?.projectIdHash, "Phase 0 Pages identity"),
    api: requireHash(api?.serviceIdHash, "Phase 0 API identity"),
    llm: requireHash(llm?.serviceIdHash, "Phase 0 LLM identity"),
    postgres: requireHash(
      render?.postgres?.resourceIdHash,
      "Phase 0 PostgreSQL identity",
    ),
    r2: requireHash(
      cloudflare?.r2?.bucketIdentityHash,
      "Phase 0 R2 identity",
    ),
    previewEnvironmentGroup: requireHash(
      groupHashes[0],
      "Phase 0 Preview environment group identity",
    ),
  };
  return {
    identities,
    phase0ProviderEvidenceSha256: provider.sha256,
    phase0PreviewSummarySha256: summary.sha256,
  };
};

const createProviderReaders = ({
  cloudflareToken,
  cloudflareAccountId,
  renderToken,
  fetchImpl,
  cloudflareSensitiveValues,
  renderSensitiveValues,
}) => {
  const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}`;
  const cfRequest = (suffix, additionalHeaders = {}) => requestJson({
    provider: "Cloudflare",
    url: `${cfBase}${suffix}`,
    token: cloudflareToken,
    fetchImpl,
    additionalHeaders,
    sensitiveValues: cloudflareSensitiveValues,
  });
  const renderRequest = (suffix) => requestJson({
    provider: "Render",
    url: `https://api.render.com${suffix}`,
    token: renderToken,
    fetchImpl,
    sensitiveValues: renderSensitiveValues,
  });
  const renderList = async (suffix, label, selector) => {
    const selected = [];
    const seenCursors = new Set();
    let cursor = "";
    for (let page = 0; page < 100; page += 1) {
      const query = cursor
        ? `limit=100&cursor=${encodeURIComponent(cursor)}`
        : "limit=100";
      const entries = await renderRequest(`${suffix}?${query}`);
      if (!Array.isArray(entries)) throw new Error(`${label} response is invalid`);
      for (const entry of entries) {
        const value = selector(entry);
        if (value !== undefined) selected.push(value);
      }
      if (entries.length < 100) return selected;
      const nextCursor = clean(entries.at(-1)?.cursor);
      if (!nextCursor || seenCursors.has(nextCursor)) {
        throw new Error(`${label} pagination cursor is invalid`);
      }
      seenCursors.add(nextCursor);
      cursor = nextCursor;
    }
    throw new Error(`${label} pagination exceeded the safety limit`);
  };
  return {
    cfRequest,
    renderRequest,
    renderList,
    r2HeadersFor: (jurisdiction) => ({ "cf-r2-jurisdiction": jurisdiction }),
  };
};

const rawEnvControl = (entry) => {
  const value = unwrap(entry, "envVar");
  return value && typeof value === "object" ? canonicalize(value) : undefined;
};

const rawSecretFileControl = (entry) => {
  const value = unwrap(entry, "secretFile");
  return value && typeof value === "object" ? canonicalize(value) : undefined;
};

const stableLiveDeployControl = (entry, label) => {
  const value = unwrap(entry, "deploy");
  const id = requireText(value?.id, `${label} deploy ID`);
  const status = requireText(value?.status, `${label} deploy status`);
  requireEqual(status, "live", `${label} deploy status`);
  const commit = requireSha(
    value?.commit?.id ?? value?.commitId,
    `${label} deploy commit`,
  );
  return { id, status, commit };
};

const readProductionControl = async ({
  readers,
  pages,
  r2,
  services,
  environmentGroups,
  postgresResources,
  workspaceId,
  cloudflareAccountId,
  productionJurisdiction,
}) => {
  const productionApi = findNamed(services, PRODUCTION_API, "production API service");
  const productionLlm = findNamed(services, PRODUCTION_LLM, "production LLM service");
  const productionServiceIds = [productionApi.id, productionLlm.id];
  const productionGroups = environmentGroups.filter((group) => (
    group.ownerId === workspaceId
    && group.serviceIds.some((id) => productionServiceIds.includes(id))
  ));
  const serviceEnvironmentControls = new Map();
  const serviceSecretFileControls = new Map();
  const serviceLiveDeployControls = new Map();
  await Promise.all(productionServiceIds.map(async (serviceId) => {
    const [environment, secretFiles, deploys] = await Promise.all([
      readers.renderList(
        `/v1/services/${encodeURIComponent(serviceId)}/env-vars`,
        "Render production service environment variables",
        rawEnvControl,
      ),
      readers.renderList(
        `/v1/services/${encodeURIComponent(serviceId)}/secret-files`,
        "Render production service secret files",
        rawSecretFileControl,
      ),
      readers.renderRequest(
        `/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=1`,
      ),
    ]);
    if (!Array.isArray(deploys) || deploys.length !== 1) {
      throw new Error("Render production current live deploy response is invalid");
    }
    serviceEnvironmentControls.set(serviceId, environment);
    serviceSecretFileControls.set(serviceId, secretFiles);
    serviceLiveDeployControls.set(
      serviceId,
      stableLiveDeployControl(deploys[0], "Render production service"),
    );
  }));
  const environmentGroupDetailControls = new Map();
  await Promise.all(productionGroups.map(async (group) => {
    const response = await readers.renderRequest(
      `/v1/env-groups/${encodeURIComponent(group.id)}`,
    );
    environmentGroupDetailControls.set(
      group.id,
      canonicalize(unwrap(response, "envGroup") ?? response),
    );
  }));
  const r2Headers = readers.r2HeadersFor(productionJurisdiction);
  const [lifecycle, cors, managedDomain, customDomains] = await Promise.all([
    readers.cfRequest(`/r2/buckets/${PRODUCTION_R2}/lifecycle`, r2Headers)
      .then(selectLifecycle),
    readers.cfRequest(`/r2/buckets/${PRODUCTION_R2}/cors`, r2Headers)
      .then(selectCors),
    readers.cfRequest(`/r2/buckets/${PRODUCTION_R2}/domains/managed`, r2Headers)
      .then(selectManagedDomain),
    readers.cfRequest(`/r2/buckets/${PRODUCTION_R2}/domains/custom`, r2Headers)
      .then(selectCustomDomains),
  ]);
  return productionControlState({
    pages,
    r2,
    r2Controls: { lifecycle, cors, managedDomain, customDomains },
    services,
    serviceEnvironmentControls,
    serviceSecretFileControls,
    serviceLiveDeployControls,
    environmentGroups,
    environmentGroupDetailControls,
    postgresResources,
    workspaceId,
    cloudflareAccountId,
  });
};

const requireCloudflareIdentity = (value, label) => {
  const normalized = requireText(value, label);
  if (!/^[a-f0-9]{32}$/.test(normalized)) {
    throw new Error(`${label} must be a lowercase 32-character identity`);
  }
  return normalized;
};

const tokenValidity = (token, now, label, { requireShortLived = false } = {}) => {
  requireEqual(token?.status, "active", `${label} status`);
  const notBefore = token?.not_before ? Date.parse(token.not_before) : Number.NEGATIVE_INFINITY;
  const expires = token?.expires_on ? Date.parse(token.expires_on) : Number.POSITIVE_INFINITY;
  if (
    Number.isNaN(notBefore)
    || Number.isNaN(expires)
    || notBefore > now.getTime()
    || expires <= now.getTime()
  ) {
    throw new Error(`${label} must be active at evidence capture time`);
  }
  if (requireShortLived && (
    !Number.isFinite(expires)
    || expires - now.getTime() > AUDIT_TOKEN_MAX_LIFETIME_MS
  )) {
    throw new Error(`${label} must expire within seven days`);
  }
  if (requireShortLived) {
    const issued = Date.parse(token?.issued_on);
    if (
      !Number.isFinite(issued)
      || issued > now.getTime()
      || expires - issued <= 0
      || expires - issued > AUDIT_TOKEN_MAX_LIFETIME_MS
    ) {
      throw new Error(`${label} configured lifetime must be at most seven days`);
    }
  }
  return requireShortLived ? "short-lived" : "current";
};

const validateRuntimeR2Policy = ({
  token,
  accessId,
  accountId,
  jurisdiction,
  label = "runtime R2",
}) => {
  requireEqual(
    requireCloudflareIdentity(token?.id, `${label} access identity`),
    accessId,
    `${label} access identity`,
  );
  const policies = Array.isArray(token?.policies) ? token.policies : [];
  if (policies.length === 0) throw new Error(`${label} access policy is absent`);
  const expectedResource = (
    `com.cloudflare.edge.r2.bucket.${accountId}_${jurisdiction}_${PREVIEW_R2}`
  );
  let hasWrite = false;
  for (const policy of policies) {
    if (policy?.effect !== "allow") {
      throw new Error(`${label} access policy must contain only allow rules`);
    }
    const resources = policy?.resources;
    if (
      !resources
      || typeof resources !== "object"
      || Array.isArray(resources)
      || Object.keys(resources).length !== 1
      || resources[expectedResource] !== "*"
    ) {
      throw new Error(`${label} access policy must target only the Preview bucket`);
    }
    const groups = Array.isArray(policy?.permission_groups)
      ? policy.permission_groups
      : [];
    if (groups.length === 0) {
      throw new Error(`${label} access policy permission group is absent`);
    }
    for (const group of groups) {
      const name = requireText(group?.name, `${label} permission group`);
      if (!new Set([R2_BUCKET_ITEM_READ, R2_BUCKET_ITEM_WRITE]).has(name)) {
        throw new Error(`${label} access policy contains an excessive permission`);
      }
      if (name === R2_BUCKET_ITEM_WRITE) hasWrite = true;
    }
  }
  if (!hasWrite) {
    throw new Error(`${label} access policy must include Bucket Item Write`);
  }
  return canonicalHash(policies);
};

const readR2PolicyAttestations = async ({
  cfRequest,
  runtimeAccessId,
  auditAccessId,
  cloudflareAccountId,
  jurisdiction,
  now,
}) => {
  if (auditAccessId === runtimeAccessId) {
    throw new Error("runtime and audit R2 access identities must be independent");
  }
  const [runtimeResponse, auditResponse] = await Promise.all([
    cfRequest(`/tokens/${encodeURIComponent(runtimeAccessId)}`),
    cfRequest(`/tokens/${encodeURIComponent(auditAccessId)}`),
  ]);
  const runtimeToken = runtimeResponse?.result ?? {};
  const auditToken = auditResponse?.result ?? {};
  const runtimeExpirationStatus = tokenValidity(runtimeToken, now, "runtime R2 access");
  const auditExpirationStatus = tokenValidity(
    auditToken,
    now,
    "audit access",
    { requireShortLived: true },
  );
  requireEqual(
    requireCloudflareIdentity(auditToken?.id, "audit access identity"),
    auditAccessId,
    "audit access identity",
  );
  const auditPolicies = Array.isArray(auditToken?.policies) ? auditToken.policies : [];
  if (auditPolicies.length === 0) throw new Error("audit access policy is absent");
  const runtimePolicySha256 = validateRuntimeR2Policy({
    token: runtimeToken,
    accessId: runtimeAccessId,
    accountId: cloudflareAccountId,
    jurisdiction,
  });
  const auditPolicySha256 = validateRuntimeR2Policy({
    token: auditToken,
    accessId: auditAccessId,
    accountId: cloudflareAccountId,
    jurisdiction,
    label: "audit R2",
  });
  return {
    runtimeIdSha256: sha256(runtimeAccessId),
    runtimePolicySha256,
    runtimeExpirationStatus,
    auditIdSha256: sha256(auditAccessId),
    auditPolicySha256,
    auditExpirationStatus,
  };
};

const assertPreviewIdentitiesLocked = (current, locked) => {
  for (const key of Object.keys(locked)) {
    if (current[key] !== locked[key]) {
      throw new Error(`Preview ${key} identity differs from locked Phase 0 evidence`);
    }
  }
};

const validatePrePushBaseline = (value, now, phase0) => {
  assertExactKeys(value, [
    "schemaVersion",
    "kind",
    "capturedAt",
    "environment",
    "branch",
    "expectedApplicationCommit",
    "phase0ProviderEvidenceSha256",
    "phase0PreviewSummarySha256",
    "previewResourceFingerprints",
    "previewAutomaticDeploysDisabled",
    "expectedCommitAbsentFromPreviewDeployments",
    "productionControlSha256",
  ], "pre-push provider baseline");
  requireEqual(value.schemaVersion, 1, "pre-push baseline schema");
  requireEqual(
    value.kind,
    "frontend-upgrade-phase1-pre-push-provider-baseline",
    "pre-push baseline kind",
  );
  requireEqual(value.environment, "preview", "pre-push baseline environment");
  requireEqual(value.branch, PREVIEW_BRANCH, "pre-push baseline branch");
  const expectedApplicationCommit = requireSha(
    value.expectedApplicationCommit,
    "pre-push expected application commit",
  );
  if (expectedApplicationCommit === ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    throw new Error("pre-push expected application commit must differ from legacy");
  }
  const capturedMs = Date.parse(value.capturedAt);
  if (
    !Number.isFinite(capturedMs)
    || capturedMs > now.getTime()
    || now.getTime() - capturedMs > R2_LIFETIME_MS
  ) {
    throw new Error("pre-push provider baseline is stale");
  }
  requireEqual(
    value.phase0ProviderEvidenceSha256,
    phase0.phase0ProviderEvidenceSha256,
    "pre-push Phase 0 provider digest",
  );
  requireEqual(
    value.phase0PreviewSummarySha256,
    phase0.phase0PreviewSummarySha256,
    "pre-push Phase 0 summary digest",
  );
  assertExactKeys(
    value.previewResourceFingerprints,
    Object.keys(phase0.identities),
    "pre-push Preview resource fingerprints",
  );
  assertPreviewIdentitiesLocked(value.previewResourceFingerprints, phase0.identities);
  assertExactKeys(
    value.previewAutomaticDeploysDisabled,
    ["pages", "api", "llm"],
    "pre-push automatic-deploy controls",
  );
  if (!Object.values(value.previewAutomaticDeploysDisabled).every((entry) => entry === true)) {
    throw new Error("pre-push automatic deployments must all be disabled");
  }
  requireEqual(
    value.expectedCommitAbsentFromPreviewDeployments,
    true,
    "pre-push expected commit absence proof",
  );
  requireHash(value.productionControlSha256, "pre-push Production control digest");
  return value;
};

const loadPrePushBaseline = async ({ root, now, phase0 }) => {
  let loaded;
  try {
    loaded = await securelyReadJson({
      root,
      relativePath: PHASE1_PRE_PUSH_BASELINE_PATH,
      label: "pre-push provider baseline",
      maximumBytes: MAX_BASELINE_BYTES,
      expectedMode: 0o600,
    });
  } catch (error) {
    throw new Error(`pre-push provider baseline is missing or unsafe: ${error.message}`);
  }
  return {
    value: validatePrePushBaseline(loaded.value, now, phase0),
    sha256: loaded.sha256,
  };
};

export async function captureFrontendUpgradePhase1PrePushBaseline(options = {}) {
  const testOnly = options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE];
  const env = testOnly ? options.env : process.env;
  const root = testOnly
    ? await requireIsolatedProviderTestRoot(testOnly, env)
    : defaultRoot;
  const cloudflareToken = requireText(env.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN");
  const cloudflareAccountId = requireText(
    env.CLOUDFLARE_ACCOUNT_ID,
    "CLOUDFLARE_ACCOUNT_ID",
  );
  if (!/^[a-f0-9]{32}$/.test(cloudflareAccountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID must be a lowercase 32-character account identity");
  }
  const renderToken = requireText(env.RENDER_API_KEY, "RENDER_API_KEY");
  const expectedApplicationCommit = requireSha(
    options.expectedCommit,
    "expected commit",
  );
  if (expectedApplicationCommit === ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    throw new Error("expected commit must differ from the locked legacy commit");
  }
  const previewJurisdictionExpected = normalizeJurisdiction(requireText(
    options.r2Jurisdiction,
    "Preview R2 jurisdiction",
  ));
  const productionJurisdictionExpected = normalizeJurisdiction(requireText(
    options.productionR2Jurisdiction,
    "production R2 jurisdiction",
  ));
  const approvedGroupIds = (
    options.previewEnvironmentGroupIds
    ?? (options.previewEnvironmentGroupId ? [options.previewEnvironmentGroupId] : [])
  );
  if (!Array.isArray(approvedGroupIds) || approvedGroupIds.length !== 1) {
    throw new Error("Phase 1 requires exactly one approved Preview environment group ID");
  }
  const previewGroupId = requireText(
    approvedGroupIds[0],
    "Preview environment group ID",
  );
  try {
    await lstat(path.join(root, PHASE1_PRE_PUSH_BASELINE_PATH));
    throw new Error("pre-push provider baseline already exists and is immutable");
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("provider baseline time is invalid");
  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("HTTPS fetch is unavailable");
  const phase0 = await loadLockedPhase0ProviderIdentities({ root, testOnly });
  const cloudflareSensitiveValues = [cloudflareToken, cloudflareAccountId];
  const renderSensitiveValues = [renderToken];
  const readers = createProviderReaders({
    cloudflareToken,
    cloudflareAccountId,
    renderToken,
    fetchImpl,
    cloudflareSensitiveValues,
    renderSensitiveValues,
  });
  const [
    previewPages,
    productionPages,
    previewR2,
    productionR2,
    services,
    environmentGroups,
    postgresResources,
  ] = await Promise.all([
    readers.cfRequest(`/pages/projects/${PREVIEW_PAGES}`).then(selectPagesProject),
    readers.cfRequest(`/pages/projects/${PRODUCTION_PAGES}`).then(selectPagesProject),
    readers.cfRequest(
      `/r2/buckets/${PREVIEW_R2}`,
      readers.r2HeadersFor(previewJurisdictionExpected),
    ).then(selectR2Bucket),
    readers.cfRequest(
      `/r2/buckets/${PRODUCTION_R2}`,
      readers.r2HeadersFor(productionJurisdictionExpected),
    ).then(selectR2Bucket),
    readers.renderList("/v1/services", "Render services", selectService),
    readers.renderList(
      "/v1/env-groups",
      "Render environment groups",
      selectEnvironmentGroup,
    ),
    readers.renderList("/v1/postgres", "Render PostgreSQL resources", selectPostgres),
  ]);
  requireEqual(previewPages.name, PREVIEW_PAGES, "Preview Pages project name");
  requireEqual(productionPages.name, PRODUCTION_PAGES, "production Pages project name");
  requireEqual(previewR2.name, PREVIEW_R2, "Preview R2 bucket name");
  requireEqual(productionR2.name, PRODUCTION_R2, "production R2 bucket name");
  const previewJurisdiction = normalizeJurisdiction(previewR2.jurisdiction);
  const productionJurisdiction = normalizeJurisdiction(productionR2.jurisdiction);
  requireEqual(
    previewJurisdiction,
    previewJurisdictionExpected,
    "Preview R2 jurisdiction",
  );
  requireEqual(
    productionJurisdiction,
    productionJurisdictionExpected,
    "production R2 jurisdiction",
  );
  const apiService = findNamed(services, PREVIEW_API, "Preview API service");
  const llmService = findNamed(services, PREVIEW_LLM, "Preview LLM service");
  const productionApi = findNamed(services, PRODUCTION_API, "production API service");
  const productionLlm = findNamed(services, PRODUCTION_LLM, "production LLM service");
  const workspaceId = requireText(apiService.ownerId, "Render workspace ID");
  for (const service of [llmService, productionApi, productionLlm]) {
    requireEqual(service.ownerId, workspaceId, "Render service workspace");
  }
  const previewPostgres = findNamed(
    postgresResources,
    PREVIEW_POSTGRES,
    "Preview PostgreSQL resource",
  );
  if (new Set(environmentGroups.map((group) => group.id)).size !== environmentGroups.length) {
    throw new Error("Render environment group IDs must be unique");
  }
  const previewGroups = environmentGroups.filter((group) => group.id === previewGroupId);
  if (previewGroups.length !== 1 || previewGroups[0].ownerId !== workspaceId) {
    throw new Error("approved Preview environment group must exist uniquely");
  }
  const previewGroup = previewGroups[0];
  const previewServiceIds = [apiService.id, llmService.id];
  if (
    previewGroup.serviceIds.length === 0
    || previewGroup.serviceIds.some((id) => !previewServiceIds.includes(id))
  ) {
    throw new Error("Preview environment group must link only Preview services");
  }
  const currentIdentities = {
    pages: sha256(requireText(previewPages.id, "Preview Pages project ID")),
    api: sha256(requireText(apiService.id, "Preview API service ID")),
    llm: sha256(requireText(llmService.id, "Preview LLM service ID")),
    postgres: sha256(requireText(previewPostgres.id, "Preview PostgreSQL resource ID")),
    r2: hashR2Identity(cloudflareAccountId, previewR2.name, previewJurisdiction),
    previewEnvironmentGroup: sha256(previewGroup.id),
  };
  assertPreviewIdentitiesLocked(currentIdentities, phase0.identities);
  if (previewPages.source.config.productionDeploymentsEnabled !== false) {
    throw new Error("Pages production-branch automatic deployments must be disabled");
  }
  if (previewPages.source.config.previewDeploymentSetting !== "none") {
    throw new Error("Pages preview-branch automatic deployments must be disabled");
  }
  if (!autoDeployDisabled(apiService.autoDeploy)) {
    throw new Error("API automatic deployments must be disabled");
  }
  if (!autoDeployDisabled(llmService.autoDeploy)) {
    throw new Error("LLM automatic deployments must be disabled");
  }
  requireEqual(
    previewPages.latestDeployment.branch,
    PREVIEW_BRANCH,
    "pre-push Pages deployment branch",
  );
  requireEqual(
    previewPages.latestDeployment.status,
    "success",
    "pre-push Pages deployment status",
  );
  const pagesCurrentCommit = requireSha(
    previewPages.latestDeployment.commit,
    "pre-push Pages deployment commit",
  );
  const readPreviewDeploy = async (service, label) => {
    const entries = await readers.renderRequest(
      `/v1/services/${encodeURIComponent(service.id)}/deploys?limit=1`,
    );
    if (!Array.isArray(entries) || entries.length !== 1) {
      throw new Error(`${label} current deployment response is invalid`);
    }
    return stableLiveDeployControl(entries[0], label);
  };
  const [apiCurrentDeploy, llmCurrentDeploy] = await Promise.all([
    readPreviewDeploy(apiService, "pre-push Preview API"),
    readPreviewDeploy(llmService, "pre-push Preview LLM"),
  ]);
  if (
    [pagesCurrentCommit, apiCurrentDeploy.commit, llmCurrentDeploy.commit]
      .includes(expectedApplicationCommit)
  ) {
    throw new Error(
      "pre-push baseline must be captured before the expected commit is deployed",
    );
  }
  const productionControl = await readProductionControl({
    readers,
    pages: productionPages,
    r2: productionR2,
    services,
    environmentGroups,
    postgresResources,
    workspaceId,
    cloudflareAccountId,
    productionJurisdiction,
  });
  const baseline = {
    schemaVersion: 1,
    kind: "frontend-upgrade-phase1-pre-push-provider-baseline",
    capturedAt: now.toISOString(),
    environment: "preview",
    branch: PREVIEW_BRANCH,
    expectedApplicationCommit,
    phase0ProviderEvidenceSha256: phase0.phase0ProviderEvidenceSha256,
    phase0PreviewSummarySha256: phase0.phase0PreviewSummarySha256,
    previewResourceFingerprints: currentIdentities,
    previewAutomaticDeploysDisabled: { pages: true, api: true, llm: true },
    expectedCommitAbsentFromPreviewDeployments: true,
    productionControlSha256: canonicalHash(productionControl),
  };
  validatePrePushBaseline(baseline, now, phase0);
  const serialized = `${JSON.stringify(baseline, null, 2)}\n`;
  for (const raw of [
    cloudflareToken,
    cloudflareAccountId,
    renderToken,
    ...services.map((service) => service.id),
    ...environmentGroups.map((group) => group.id),
    ...postgresResources.map((postgres) => postgres.id),
  ]) {
    if (clean(raw) && serialized.includes(raw)) {
      throw new Error("pre-push baseline serialization contains a raw provider identity or secret");
    }
  }
  const output = await writeEvidenceAtomically({
    root,
    serialized,
    beforeRename: testOnly?.beforeBaselineRename,
    relativePath: PHASE1_PRE_PUSH_BASELINE_PATH,
    label: "pre-push provider baseline",
    mustNotExist: true,
  });
  return { output, sha256: sha256(serialized), baseline };
}

export async function buildFrontendUpgradePhase1ProviderEvidence(options = {}) {
  const testOnly = options[TEST_ONLY_PHASE1_PROVIDER_EVIDENCE];
  const env = testOnly ? options.env : process.env;
  const root = testOnly
    ? await requireIsolatedProviderTestRoot(testOnly, env)
    : defaultRoot;
  const cloudflareToken = requireText(env.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN");
  const cloudflareAccountId = requireText(
    env.CLOUDFLARE_ACCOUNT_ID,
    "CLOUDFLARE_ACCOUNT_ID",
  );
  if (!/^[a-f0-9]{32}$/.test(cloudflareAccountId)) {
    throw new Error("CLOUDFLARE_ACCOUNT_ID must be a lowercase 32-character account identity");
  }
  const renderToken = requireText(env.RENDER_API_KEY, "RENDER_API_KEY");
  const auditR2AccessId = requireCloudflareIdentity(
    env.QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID,
    "QUANTGYM_PHASE1_R2_AUDIT_ACCESS_ID",
  );
  const webOrigin = validateWebOrigin(env.QUANTGYM_PREVIEW_WEB_URL);
  const expectedCommit = requireSha(options.expectedCommit, "expected commit");
  if (expectedCommit === ACCEPTED_PHASE0_DEPLOYMENT_COMMIT) {
    throw new Error("application commit must differ from the locked legacy commit");
  }
  for (const [key, expected] of Object.entries(GOVERNANCE)) {
    requireEqual(options[key], expected, `governance ${key}`);
  }
  requireEqual(
    options.r2CredentialScope,
    R2_CREDENTIAL_SCOPE,
    "R2 credential scope attestation",
  );
  const previewJurisdictionExpected = normalizeJurisdiction(requireText(
    options.r2Jurisdiction,
    "Preview R2 jurisdiction",
  ));
  const productionJurisdictionExpected = normalizeJurisdiction(requireText(
    options.productionR2Jurisdiction,
    "production R2 jurisdiction",
  ));
  const approvedGroupIds = (
    options.previewEnvironmentGroupIds
    ?? (options.previewEnvironmentGroupId ? [options.previewEnvironmentGroupId] : [])
  );
  if (!Array.isArray(approvedGroupIds) || approvedGroupIds.length !== 1) {
    throw new Error("Phase 1 requires exactly one approved Preview environment group ID");
  }
  const previewGroupId = requireText(
    approvedGroupIds[0],
    "Preview environment group ID",
  );

  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  if (!Number.isFinite(now.getTime())) throw new Error("provider evidence time is invalid");
  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("HTTPS fetch is unavailable");
  if (testOnly?.autoCaptureBaseline === true) {
    try {
      await lstat(path.join(root, PHASE1_PRE_PUSH_BASELINE_PATH));
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      const captured = await captureFrontendUpgradePhase1PrePushBaseline(options);
      options.prePushBaselineSha256 = captured.sha256;
    }
  }
  const phase0 = await loadLockedPhase0ProviderIdentities({ root, testOnly });
  const prePushBaseline = await loadPrePushBaseline({ root, now, phase0 });
  if (
    testOnly?.autoCaptureBaseline === true
    && !clean(options.prePushBaselineSha256)
  ) {
    options.prePushBaselineSha256 = prePushBaseline.sha256;
  }
  requireEqual(
    requireHash(
      options.prePushBaselineSha256,
      "expected pre-push baseline digest",
    ),
    prePushBaseline.sha256,
    "expected pre-push baseline digest",
  );
  requireEqual(
    prePushBaseline.value.expectedApplicationCommit,
    expectedCommit,
    "pre-push expected application commit",
  );

  const cloudflareSensitiveValues = [cloudflareToken, cloudflareAccountId];
  const renderSensitiveValues = [renderToken];
  const readers = createProviderReaders({
    cloudflareToken,
    cloudflareAccountId,
    renderToken,
    fetchImpl,
    cloudflareSensitiveValues,
    renderSensitiveValues,
  });
  const {
    cfRequest,
    renderRequest,
    renderList,
    r2HeadersFor,
  } = readers;

  const cloudflareDeployments = async () => {
    const selected = [];
    for (let page = 1; page <= 100; page += 1) {
      const payload = await cfRequest(
        `/pages/projects/${PREVIEW_PAGES}/deployments?page=${page}&per_page=100`,
      );
      if (!Array.isArray(payload?.result)) {
        throw new Error("Cloudflare Pages deployments response is invalid");
      }
      selected.push(...payload.result.map(selectLegacyDeployment));
      const totalPages = Number(payload?.result_info?.total_pages ?? 1);
      if (!Number.isInteger(totalPages) || totalPages < 1 || totalPages > 100) {
        throw new Error("Cloudflare Pages deployments pagination is invalid");
      }
      if (page >= totalPages) return selected;
    }
    throw new Error("Cloudflare Pages deployments pagination exceeded the safety limit");
  };

  const [
    previewPages,
    productionPages,
    previewR2,
    productionR2,
    services,
    environmentGroups,
    postgresResources,
    legacyDeployments,
  ] = await Promise.all([
    cfRequest(`/pages/projects/${PREVIEW_PAGES}`).then(selectPagesProject),
    cfRequest(`/pages/projects/${PRODUCTION_PAGES}`).then(selectPagesProject),
    cfRequest(
      `/r2/buckets/${PREVIEW_R2}`,
      r2HeadersFor(previewJurisdictionExpected),
    ).then(selectR2Bucket),
    cfRequest(
      `/r2/buckets/${PRODUCTION_R2}`,
      r2HeadersFor(productionJurisdictionExpected),
    ).then(selectR2Bucket),
    renderList("/v1/services", "Render services", selectService),
    renderList("/v1/env-groups", "Render environment groups", selectEnvironmentGroup),
    renderList("/v1/postgres", "Render PostgreSQL resources", selectPostgres),
    cloudflareDeployments(),
  ]);

  validatePages(previewPages, expectedCommit);
  requireEqual(productionPages.name, PRODUCTION_PAGES, "production Pages project name");
  requireEqual(previewR2.name, PREVIEW_R2, "Preview R2 bucket name");
  requireEqual(productionR2.name, PRODUCTION_R2, "production R2 bucket name");
  const previewJurisdiction = normalizeJurisdiction(previewR2.jurisdiction);
  const productionJurisdiction = normalizeJurisdiction(productionR2.jurisdiction);
  requireEqual(
    previewJurisdiction,
    previewJurisdictionExpected,
    "Preview R2 jurisdiction",
  );
  requireEqual(
    productionJurisdiction,
    productionJurisdictionExpected,
    "production R2 jurisdiction",
  );

  const apiService = findNamed(services, PREVIEW_API, "Preview API service");
  const llmService = findNamed(services, PREVIEW_LLM, "Preview LLM service");
  const productionApi = findNamed(services, PRODUCTION_API, "production API service");
  const productionLlm = findNamed(services, PRODUCTION_LLM, "production LLM service");
  const workspaceId = requireText(apiService.ownerId, "Render workspace ID");
  for (const service of [llmService, productionApi, productionLlm]) {
    requireEqual(service.ownerId, workspaceId, "Render service workspace");
  }
  const allServiceIds = [apiService, llmService, productionApi, productionLlm]
    .map((service) => requireText(service.id, "Render service ID"));
  if (new Set(allServiceIds).size !== allServiceIds.length) {
    throw new Error("Preview and production Render service identities must be distinct");
  }
  const previewRegion = requireText(
    apiService.serviceDetails.region,
    "Preview API Render region",
  );
  requireEqual(
    requireText(llmService.serviceDetails.region, "Preview LLM Render region"),
    previewRegion,
    "Preview Render service region",
  );

  const previewGroupMatches = environmentGroups.filter((group) => group.id === previewGroupId);
  if (new Set(environmentGroups.map((group) => group.id)).size !== environmentGroups.length) {
    throw new Error("Render environment group IDs must be unique");
  }
  if (previewGroupMatches.length !== 1 || previewGroupMatches[0].ownerId !== workspaceId) {
    throw new Error(
      "approved Preview environment group must exist uniquely in the Render workspace",
    );
  }
  const previewGroup = previewGroupMatches[0];
  const previewServiceIds = [apiService.id, llmService.id];
  if (
    previewGroup.serviceIds.length === 0
    || new Set(previewGroup.serviceIds).size !== previewGroup.serviceIds.length
    || previewGroup.serviceIds.some((id) => !previewServiceIds.includes(id))
  ) {
    throw new Error("Preview environment group must link only Preview services");
  }
  const productionServiceIds = [productionApi.id, productionLlm.id];
  const productionGroups = environmentGroups.filter((group) => (
    group.ownerId === workspaceId
    && group.serviceIds.some((id) => productionServiceIds.includes(id))
  ));
  if (productionGroups.some((group) => group.id === previewGroup.id)) {
    throw new Error("Preview and production environment groups must be disjoint");
  }
  const scopedServiceIds = new Set([...previewServiceIds, ...productionServiceIds]);
  if (environmentGroups.some((group) => (
    group.ownerId !== workspaceId
    && group.serviceIds.some((id) => scopedServiceIds.has(id))
  ))) {
    throw new Error("Render environment group links must stay inside the service workspace");
  }
  for (const serviceId of previewServiceIds) {
    const linkedIds = environmentGroups
      .filter((group) => group.ownerId === workspaceId && group.serviceIds.includes(serviceId))
      .map((group) => group.id);
    if (linkedIds.some((id) => id !== previewGroup.id)) {
      throw new Error("Preview services must not link unapproved environment groups");
    }
  }

  const previewPostgres = findNamed(
    postgresResources,
    PREVIEW_POSTGRES,
    "Preview PostgreSQL resource",
  );
  const productionPostgres = findNamed(
    postgresResources,
    PRODUCTION_POSTGRES,
    "production PostgreSQL resource",
  );
  requireEqual(previewPostgres.ownerId, workspaceId, "Preview PostgreSQL workspace");
  requireEqual(productionPostgres.ownerId, workspaceId, "production PostgreSQL workspace");
  requireEqual(previewPostgres.status, "available", "Preview PostgreSQL status");
  requireEqual(previewPostgres.postgresMajor, 18, "Preview PostgreSQL major");
  assertDistinct(previewPostgres.id, productionPostgres.id, "PostgreSQL resource identity");
  assertDistinct(
    previewPostgres.databaseName,
    productionPostgres.databaseName,
    "PostgreSQL database identity",
  );
  assertDistinct(
    previewPostgres.databaseUser,
    productionPostgres.databaseUser,
    "PostgreSQL role identity",
  );
  assertDistinct(previewPages.id, productionPages.id, "Pages resource identity");

  const previewR2Identity = hashR2Identity(
    cloudflareAccountId,
    previewR2.name,
    previewJurisdiction,
  );
  const productionR2Identity = hashR2Identity(
    cloudflareAccountId,
    productionR2.name,
    productionJurisdiction,
  );
  assertDistinct(previewR2Identity, productionR2Identity, "R2 resource identity");
  assertPreviewIdentitiesLocked({
    pages: sha256(requireText(previewPages.id, "Preview Pages project ID")),
    api: sha256(requireText(apiService.id, "Preview API service ID")),
    llm: sha256(requireText(llmService.id, "Preview LLM service ID")),
    postgres: sha256(requireText(previewPostgres.id, "Preview PostgreSQL resource ID")),
    r2: previewR2Identity,
    previewEnvironmentGroup: sha256(previewGroup.id),
  }, phase0.identities);

  const legacyDeployment = validateLegacyDeployment(legacyDeployments);
  if (sha256(LEGACY_ALIAS) !== APPROVED_LEGACY_PAGES_ALIAS_SHA256) {
    throw new Error("legacy compatibility alias fingerprint is not approved");
  }

  cloudflareSensitiveValues.push(
    previewPages.id,
    productionPages.id,
    legacyDeployment.id,
  );
  renderSensitiveValues.push(
    workspaceId,
    ...services.map((service) => service.id),
    ...environmentGroups.map((group) => group.id),
    ...postgresResources.map((postgres) => postgres.id),
  );

  const readEnvVars = (suffix, label) => (
    renderList(suffix, label, selectEnvVar)
  );
  const readDeploy = async (serviceId, label) => {
    const entries = await renderRequest(
      `/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=1`,
    );
    if (!Array.isArray(entries) || entries.length === 0) {
      throw new Error(`${label} deployment was not returned`);
    }
    const value = unwrap(entries[0], "deploy");
    const selected = {
      status: value?.status,
      commit: value?.commit?.id ?? value?.commitId,
    };
    requireEqual(selected.status, "live", `${label} deployment status`);
    requireEqual(selected.commit, expectedCommit, `${label} deployment commit`);
    return selected;
  };

  const r2Headers = r2HeadersFor(previewJurisdiction);
  const [
    lifecycle,
    cors,
    managedDomain,
    customDomains,
    apiEnvEntries,
    llmEnvEntries,
    llmSecretFiles,
    groupConfiguration,
    _apiDeploy,
    _llmDeploy,
    connectionInfo,
    recovery,
  ] = await Promise.all([
    cfRequest(`/r2/buckets/${PREVIEW_R2}/lifecycle`, r2Headers).then(selectLifecycle),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/cors`, r2Headers).then(selectCors),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/domains/managed`, r2Headers)
      .then(selectManagedDomain),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/domains/custom`, r2Headers)
      .then(selectCustomDomains),
    readEnvVars(
      `/v1/services/${encodeURIComponent(apiService.id)}/env-vars`,
      "Render API environment variables",
    ),
    readEnvVars(
      `/v1/services/${encodeURIComponent(llmService.id)}/env-vars`,
      "Render LLM environment variables",
    ),
    renderList(
      `/v1/services/${encodeURIComponent(llmService.id)}/secret-files`,
      "Render LLM secret files",
      selectSecretFile,
    ),
    renderRequest(`/v1/env-groups/${encodeURIComponent(previewGroup.id)}`).then(
      selectEnvironmentGroupDetails,
    ),
    readDeploy(apiService.id, "API"),
    readDeploy(llmService.id, "LLM"),
    renderRequest(`/v1/postgres/${encodeURIComponent(previewPostgres.id)}/connection-info`),
    renderRequest(`/v1/postgres/${encodeURIComponent(previewPostgres.id)}/recovery`),
  ]);

  validateR2Controls({ lifecycle, cors, managedDomain, customDomains, webOrigin });
  if (recovery?.recoveryStatus !== "AVAILABLE") {
    throw new Error("Preview PostgreSQL recovery point must be available");
  }
  if (
    groupConfiguration.id !== previewGroup.id
    || groupConfiguration.ownerId !== previewGroup.ownerId
    || JSON.stringify([...groupConfiguration.serviceIds].sort())
      !== JSON.stringify([...previewGroup.serviceIds].sort())
  ) {
    throw new Error("Render Preview environment group changed during evidence capture");
  }
  const groupEnvEntries = groupConfiguration.envVars;

  const apiEnvironment = effectiveEnvironment({
    serviceEntries: apiEnvEntries,
    groupEntries: groupEnvEntries,
    groupLinked: previewGroup.serviceIds.includes(apiService.id),
  });
  const llmEnvironment = effectiveEnvironment({
    serviceEntries: llmEnvEntries,
    groupEntries: groupEnvEntries,
    groupLinked: previewGroup.serviceIds.includes(llmService.id),
  });
  const apiSourceEntries = previewGroup.serviceIds.includes(apiService.id)
    ? [...groupEnvEntries, ...apiEnvEntries]
    : apiEnvEntries;
  assertNoOperatorProviderCredentials(apiSourceEntries, "API");
  assertNoUpstreamSecrets(previewPages.envVars, "Pages");
  assertAllowedEnvironmentKeys(previewPages.envVars, "Pages", PAGES_ALLOWED_ENV_KEYS);
  if (previewPages.r2BindingKeys.length > 0) {
    throw new Error("Pages must not hold an R2 binding");
  }
  assertNoUpstreamSecrets(
    previewGroup.serviceIds.includes(llmService.id)
      ? [...groupEnvEntries, ...llmEnvEntries]
      : llmEnvEntries,
    "LLM",
  );
  assertAllowedEnvironmentKeys(
    previewGroup.serviceIds.includes(llmService.id)
      ? [...groupEnvEntries, ...llmEnvEntries]
      : llmEnvEntries,
    "LLM",
    LLM_ALLOWED_ENV_KEYS,
  );
  if (
    previewGroup.serviceIds.includes(llmService.id)
    && groupConfiguration.secretFileNames.length > 0
  ) {
    throw new Error("LLM environment group must not contain secret files");
  }
  if (llmSecretFiles.length > 0) {
    throw new Error("LLM service must not contain secret files");
  }

  const pythonVersion = requireEnvValue(apiEnvironment, "PYTHON_VERSION", "API Python version");
  const nodeVersion = requireEnvValue(llmEnvironment, "NODE_VERSION", "LLM Node version");
  validateApiService(apiService, pythonVersion);
  validateLlmService(llmService, nodeVersion, {
    environment: requireEnvValue(
      llmEnvironment,
      "QUANTGYM_PREVIEW_ENVIRONMENT",
      "LLM probe environment",
    ),
    service: requireEnvValue(
      llmEnvironment,
      "QUANTGYM_PREVIEW_SERVICE",
      "LLM probe service",
    ),
    commit: requireEnvValue(
      llmEnvironment,
      "QUANTGYM_PREVIEW_COMMIT",
      "LLM probe commit",
    ),
    expectedCommit,
  });

  const apiLlmOrigin = normalizePrivateLlmOrigin(
    requireEnvValue(
      apiEnvironment,
      "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
      "API private LLM binding",
    ),
    "API private LLM binding",
  );
  const providerLlmOrigin = normalizePrivateLlmOrigin(
    llmService.serviceDetails.url,
    "Render private LLM address",
  );
  requireEqual(apiLlmOrigin, providerLlmOrigin, "API private LLM binding");

  requireEqual(
    requireEnvValue(apiEnvironment, "QUANTGYM_ENVIRONMENT", "API environment"),
    "preview",
    "API environment",
  );
  const apiDatabase = parseDatabaseIdentity(
    requireEnvValue(
      apiEnvironment,
      "QUANTGYM_POSTGRES_DATABASE_URL",
      "API PostgreSQL binding",
    ),
    "API PostgreSQL binding",
    { requireTls: true },
  );
  const providerDatabase = parseDatabaseIdentity(
    connectionInfo?.internalConnectionString,
    "provider PostgreSQL binding",
  );
  for (const field of ["hostname", "port", "role", "database"]) {
    if (apiDatabase[field] !== providerDatabase[field]) {
      throw new Error("API PostgreSQL binding must match the authenticated Preview resource");
    }
  }
  requireEqual(apiDatabase.role, previewPostgres.databaseUser, "API PostgreSQL role");
  requireEqual(apiDatabase.database, previewPostgres.databaseName, "API PostgreSQL database");

  const apiR2Account = parseR2EndpointAccount(
    requireEnvValue(
      apiEnvironment,
      "QUANTGYM_PREVIEW_R2_ENDPOINT",
      "Preview API R2 endpoint",
    ),
    previewJurisdiction,
  );
  requireEqual(apiR2Account, cloudflareAccountId, "Preview API R2 account");
  requireEqual(
    requireEnvValue(
      apiEnvironment,
      "QUANTGYM_PREVIEW_R2_BUCKET",
      "Preview API R2 bucket",
    ),
    PREVIEW_R2,
    "Preview API R2 bucket",
  );
  const apiR2AccessKey = requireEnvValue(
    apiEnvironment,
    "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID",
    "Preview API R2 access key",
  );
  if (!/^[a-f0-9]{32}$/.test(apiR2AccessKey)) {
    throw new Error("Preview API R2 access key is invalid");
  }
  const apiR2SecretKey = requireEnvValue(
    apiEnvironment,
    "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY",
    "Preview API R2 secret key",
  );
  if (
    apiR2SecretKey.length < 24
    || apiR2SecretKey.length > 1024
    || /[\u0000-\u001f\u007f]/u.test(apiR2SecretKey)
  ) {
    throw new Error("Preview API R2 secret key is invalid");
  }
  cloudflareSensitiveValues.push(apiR2AccessKey, auditR2AccessId);
  const r2PolicyAttestations = await readR2PolicyAttestations({
    cfRequest,
    runtimeAccessId: apiR2AccessKey,
    auditAccessId: auditR2AccessId,
    cloudflareAccountId,
    jurisdiction: previewJurisdiction,
    now,
  });

  const pagesEdgeEntries = previewPages.envVars.filter(
    (entry) => entry.key === "QUANTGYM_EDGE_SHARED_SECRET",
  );
  if (pagesEdgeEntries.length !== 1 || pagesEdgeEntries[0].type !== "secret_text") {
    throw new Error("Pages edge shared secret must be configured as secret_text");
  }
  // Cloudflare masks Pages secret values after creation. Presence and binding type are provider
  // evidence; the live same-origin edge probe proves that the masked value matches the API.
  const pagesEdgeSecret = clean(pagesEdgeEntries[0].value);
  const apiEdgeSecret = requireEnvValue(
    apiEnvironment,
    "QUANTGYM_EDGE_SHARED_SECRET",
    "API edge shared secret",
  );
  if (
    apiEdgeSecret.length < 32
    || apiEdgeSecret.length > 1024
    || /[\u0000-\u001f\u007f]/u.test(apiEdgeSecret)
  ) {
    throw new Error("API edge shared secret is invalid");
  }
  if (pagesEdgeSecret && sha256(pagesEdgeSecret) !== sha256(apiEdgeSecret)) {
    throw new Error("Pages and API edge shared secrets must match");
  }

  const [
    productionPagesAfter,
    productionR2After,
    servicesAfter,
    environmentGroupsAfter,
    postgresAfter,
  ] = await Promise.all([
    cfRequest(`/pages/projects/${PRODUCTION_PAGES}`).then(selectPagesProject),
    cfRequest(
      `/r2/buckets/${PRODUCTION_R2}`,
      r2HeadersFor(productionJurisdiction),
    ).then(selectR2Bucket),
    renderList("/v1/services", "Render services", selectService),
    renderList("/v1/env-groups", "Render environment groups", selectEnvironmentGroup),
    renderList("/v1/postgres", "Render PostgreSQL resources", selectPostgres),
  ]);
  const productionAfterState = await readProductionControl({
    readers,
    pages: productionPagesAfter,
    r2: productionR2After,
    services: servicesAfter,
    environmentGroups: environmentGroupsAfter,
    postgresResources: postgresAfter,
    workspaceId,
    cloudflareAccountId,
    productionJurisdiction,
  });
  const productionControlAfter = canonicalHash(productionAfterState);
  const productionControlBefore = prePushBaseline.value.productionControlSha256;
  if (productionControlBefore !== productionControlAfter) {
    throw new Error("production provider controls changed since the pre-push baseline");
  }

  const expiresAt = new Date(now.getTime() + R2_LIFETIME_MS);
  const evidence = {
    schemaVersion: 1,
    capturedAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
    environment: "preview",
    branch: PREVIEW_BRANCH,
    applicationCommit: expectedCommit,
    legacyCommit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
    postgresMajor: 18,
    governance: { ...GOVERNANCE },
    phase0ProviderEvidenceSha256: phase0.phase0ProviderEvidenceSha256,
    prePushBaselineSha256: prePushBaseline.sha256,
    productionControlBefore,
    productionControlAfter,
    r2PolicyAttestations,
    resourceFingerprints: {
      pages: sha256(requireText(previewPages.id, "Preview Pages project ID")),
      api: sha256(requireText(apiService.id, "Preview API service ID")),
      llm: sha256(requireText(llmService.id, "Preview LLM service ID")),
      postgres: sha256(requireText(previewPostgres.id, "Preview PostgreSQL resource ID")),
      postgresRole: sha256(
        requireText(previewPostgres.databaseUser, "Preview PostgreSQL role"),
      ),
      r2: previewR2Identity,
      previewEnvironmentGroup: sha256(previewGroup.id),
      legacyPagesDeployment: sha256(legacyDeployment.id),
      productionPages: sha256(
        requireText(productionPages.id, "production Pages project ID"),
      ),
      productionServices: productionServiceIds.map(sha256).sort(),
      productionPostgres: sha256(
        requireText(productionPostgres.id, "production PostgreSQL resource ID"),
      ),
      productionR2: productionR2Identity,
      productionEnvironmentGroups: productionGroups.map((group) => sha256(group.id)).sort(),
    },
    deployments: {
      pages: { provider: "cloudflare-pages", status: "ready", commit: expectedCommit },
      api: { provider: "render", status: "ready", commit: expectedCommit },
      llm: { provider: "render", status: "ready", commit: expectedCommit },
      legacy: {
        provider: "cloudflare-pages",
        status: "ready",
        commit: ACCEPTED_PHASE0_DEPLOYMENT_COMMIT,
        branch: LEGACY_BRANCH,
        aliasSha256: APPROVED_LEGACY_PAGES_ALIAS_SHA256,
      },
    },
    bindings: {
      postgres: { status: "ready", isolated: true },
      r2: { status: "ready", isolated: true },
    },
    controls: {
      pagesAutomaticDeploysDisabled: true,
      apiAutomaticDeploysDisabled: true,
      llmAutomaticDeploysDisabled: true,
      pagesV2BuildConfigured: true,
      apiPythonConfigured: true,
      llmProbeConfigured: true,
      applicationDeploymentsAligned: true,
      resourceIsolationVerified: true,
      productionUnchanged: true,
      phase0IdentitiesLocked: true,
      prePushBaselineVerified: true,
      r2PoliciesVerified: true,
    },
  };

  assertEvidenceSchemaFields(evidence);
  const relationshipFailures = validatePhase1ProviderEvidenceRelationships(
    evidence,
    now.getTime(),
  );
  if (relationshipFailures.length > 0) {
    throw new Error(`provider evidence relationship validation failed: ${relationshipFailures[0]}`);
  }

  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  const forbiddenValues = [
    cloudflareToken,
    cloudflareAccountId,
    renderToken,
    pagesEdgeSecret,
    apiEdgeSecret,
    apiR2AccessKey,
    apiR2SecretKey,
    auditR2AccessId,
    ...allServiceIds,
    ...environmentGroups.map((group) => group.id),
    ...postgresResources.flatMap((postgres) => [
      postgres.id,
      postgres.databaseName,
      postgres.databaseUser,
    ]),
  ].filter((value) => typeof value === "string" && value.length > 0);
  if (forbiddenValues.some((value) => serialized.includes(value))) {
    throw new Error("provider evidence serialization contains a raw provider identity or secret");
  }

  const output = await writeEvidenceAtomically({
    root,
    serialized,
    beforeRename: testOnly?.beforeRename,
  });
  return { output, sha256: sha256(serialized), evidence };
}

const parseArgs = (argv) => {
  const values = {};
  const supported = new Map([
    ["--expected-commit", "expectedCommit"],
    ["--pre-push-baseline-sha256", "prePushBaselineSha256"],
    ["--operator", "operator"],
    ["--budget-owner", "budgetOwner"],
    ["--data-reset-owner", "dataResetOwner"],
    ["--destroy-owner", "destroyOwner"],
    ["--review-date", "reviewDate"],
    ["--r2-credential-scope", "r2CredentialScope"],
    ["--r2-jurisdiction", "r2Jurisdiction"],
    ["--production-r2-jurisdiction", "productionR2Jurisdiction"],
    ["--preview-environment-group-id", "previewEnvironmentGroupIds"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    if (flag === "--capture-pre-push-baseline") {
      if (values.capturePrePushBaseline) {
        throw new Error("--capture-pre-push-baseline may be provided only once");
      }
      values.capturePrePushBaseline = true;
      continue;
    }
    const key = supported.get(flag);
    if (!key) throw new Error(`unsupported argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    if (key === "previewEnvironmentGroupIds") {
      values[key] = [...(values[key] ?? []), value];
    } else {
      if (Object.hasOwn(values, key)) {
        throw new Error(`${flag} may be provided only once`);
      }
      values[key] = value;
    }
    index += 1;
  }
  return values;
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const options = parseArgs(process.argv.slice(2));
    const result = options.capturePrePushBaseline
      ? await captureFrontendUpgradePhase1PrePushBaseline(options)
      : await buildFrontendUpgradePhase1ProviderEvidence(options);
    console.log(
      `Wrote ${path.relative(defaultRoot, result.output)} (SHA-256 ${result.sha256})`,
    );
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
