import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");

const PREVIEW_BRANCH = "codex/frontend-v2-preview";
const REPOSITORY = "https://github.com/garymmmjw/QuantGym";
const PAGES_BUILD = (
  "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview"
);
const RENDER_BUILD = "npm ci";
const RENDER_START = "node scripts/serve-frontend-upgrade-preview-probe.mjs";
const NODE_VERSION = "20.20.2";
const R2_CREDENTIAL_SCOPE = "single-bucket-read-write";
const R2_LIFECYCLE_SECONDS = 7 * 24 * 60 * 60;
const PREVIEW_PAGES = "quantgym-v2-preview";
const PRODUCTION_PAGES = "quantgym-beta";
const PREVIEW_R2 = "quantgym-v2-preview-media";
const PRODUCTION_R2 = "quantgym-media";
const PREVIEW_API = "quantgym-v2-preview-api";
const PREVIEW_LLM = "quantgym-v2-preview-llm";
const PRODUCTION_API = "quantgym-api";
const PRODUCTION_LLM = "quantgym-llm";
const PREVIEW_POSTGRES = "quantgym-v2-preview-postgres";
const PRODUCTION_POSTGRES = "quantgym-postgres";
const OUTPUT_PATH = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);

// This Symbol is intentionally unavailable through the command-line interface. It lets the
// offline test suite replace transport, time, and root without making production endpoints or
// output paths configurable.
export const TEST_ONLY_PROVIDER_EVIDENCE = Symbol("frontend-upgrade-provider-evidence-test-only");

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const clean = (value) => typeof value === "string" ? value.trim() : "";
const requireText = (value, name) => {
  const normalized = clean(value);
  if (!normalized) throw new Error(`${name} is required`);
  return normalized;
};
const requireEqual = (actual, expected, label) => {
  if (actual !== expected) throw new Error(`${label} must equal ${expected}`);
};
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
const unwrap = (entry, key) => entry?.[key] ?? entry;
const findNamed = (entries, key, name, label) => {
  const matches = entries
    .map((entry) => unwrap(entry, key))
    .filter((entry) => entry?.name === name);
  if (matches.length === 0) {
    throw new Error(`${label} ${name} was not returned by the authenticated provider`);
  }
  if (matches.length !== 1) {
    throw new Error(`${label} ${name} must be unique in the authenticated provider response`);
  }
  return matches[0];
};
const assertDistinct = (left, right, label) => {
  if (left === right) throw new Error(`${label} must differ from production`);
};
const hasHostnameSuffix = (hostname, suffix) => (
  hostname === suffix || hostname.endsWith(`.${suffix}`)
);
const isPreviewPagesHostname = (hostname) => (
  hasHostnameSuffix(hostname.toLowerCase(), `${PREVIEW_PAGES}.pages.dev`)
);
const isPreviewLlmHostname = (hostname) => (
  /^quantgym-v2-preview-llm-[a-z0-9]+$/.test(hostname.toLowerCase())
);

const normalizeRenderPrivateOrigin = (value, label) => {
  const source = requireText(value, label);
  let url;
  try {
    url = new URL(source.includes("://") ? source : `http://${source}`);
  } catch {
    throw new Error(`${label} must be the Preview private-service address`);
  }
  if (
    !new Set(["http:", "https:"]).has(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/"
    || !url.port
    || !isPreviewLlmHostname(url.hostname)
  ) {
    throw new Error(`${label} must be the Preview private-service address`);
  }
  return url.origin;
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
        && value
        && candidate.toLowerCase().includes(value.toLowerCase())
      ))
      || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(candidate)
      || /(?:bearer|credential|password|secret|token)/i.test(candidate)
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
  sensitiveValues = [token],
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
    // Deliberately do not read the body: provider error payloads can contain identifiers,
    // deployment environment metadata, or echoed credentials.
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
    throw new Error("QUANTGYM_PREVIEW_WEB_URL must be an HTTPS Preview origin");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.search
    || url.hash
    || url.pathname !== "/"
    || url.port
    || !isPreviewPagesHostname(url.hostname)
    || /(?:^|\.)beta\.quantgym\.app$/i.test(url.hostname)
  ) {
    throw new Error("QUANTGYM_PREVIEW_WEB_URL must use the Preview Pages project");
  }
  return url.origin;
};

const validatePages = (preview, expectedCommit) => {
  requireEqual(preview.name, PREVIEW_PAGES, "Pages project name");
  requireEqual(preview.source?.type, "github", "Pages source type");
  if (
    preview.source?.config?.owner !== "garymmmjw"
    || preview.source?.config?.repo_name !== "QuantGym"
  ) {
    throw new Error("Pages repository must equal garymmmjw/QuantGym");
  }
  requireEqual(
    preview.source?.config?.production_branch,
    PREVIEW_BRANCH,
    "Pages production branch",
  );
  requireEqual(preview.build_config?.build_command, PAGES_BUILD, "Pages build command");
  requireEqual(preview.build_config?.destination_dir, "dist-preview", "Pages destination");
  requireEqual(
    preview.latest_deployment?.deployment_trigger?.metadata?.branch,
    PREVIEW_BRANCH,
    "Pages deployment branch",
  );
  requireEqual(
    preview.latest_deployment?.deployment_trigger?.metadata?.commit_hash,
    expectedCommit,
    "Pages deployment commit",
  );
  requireEqual(
    preview.latest_deployment?.latest_stage?.status,
    "success",
    "Pages deployment status",
  );
};

const validateR2 = ({
  preview,
  lifecycle,
  cors,
  managedDomain,
  customDomains,
  credentialScope,
  webOrigin,
}) => {
  requireEqual(preview.name, PREVIEW_R2, "R2 bucket name");
  requireEqual(
    credentialScope,
    R2_CREDENTIAL_SCOPE,
    "R2 credential scope confirmation",
  );
  if (managedDomain?.enabled !== false) throw new Error("r2.dev must be disabled");
  if (!Array.isArray(customDomains?.domains)) {
    throw new Error("R2 custom domains response is invalid");
  }
  if (customDomains.domains.length !== 0) throw new Error("R2 custom domains must be absent");

  const rules = Array.isArray(lifecycle.rules) ? lifecycle.rules : [];
  const cleanupRule = rules.find((rule) => (
    rule?.enabled === true
    && rule?.conditions?.prefix === "readiness-smoke/"
    && rule?.deleteObjectsTransition?.condition?.type === "Age"
    && rule?.deleteObjectsTransition?.condition?.maxAge === R2_LIFECYCLE_SECONDS
  ));
  if (!cleanupRule) {
    throw new Error("R2 lifecycle must delete readiness-smoke/ after 7 days");
  }

  const corsRules = Array.isArray(cors.rules) ? cors.rules : [];
  const origins = corsRules.flatMap((rule) => (
    Array.isArray(rule?.allowed?.origins) ? rule.allowed.origins : []
  ));
  if (origins.length !== 1 || origins[0] !== webOrigin) {
    throw new Error("R2 CORS origin must equal the Preview web origin");
  }
};

const normalizedRepo = (value) => clean(value).replace(/\.git$/i, "");
const serviceCommand = (service, key) => service?.serviceDetails?.envSpecificDetails?.[key];

const validatePreviewService = (service, expectedType, label, nodeVersion) => {
  requireEqual(service.type, expectedType, `${label} service type`);
  requireEqual(service.serviceDetails?.runtime, "node", `${label} service runtime`);
  if (normalizedRepo(service.repo) !== REPOSITORY) {
    throw new Error("Render repository must equal https://github.com/garymmmjw/QuantGym");
  }
  requireEqual(service.branch, PREVIEW_BRANCH, "Render branch");
  requireEqual(serviceCommand(service, "buildCommand"), RENDER_BUILD, "Render build command");
  requireEqual(serviceCommand(service, "startCommand"), RENDER_START, "Render start command");
  requireEqual(nodeVersion, NODE_VERSION, "Render Node version");
};

const selectServiceVariable = (entries, key, label) => {
  if (!Array.isArray(entries)) throw new Error(`${label} response is invalid`);
  const matches = entries.filter((entry) => entry?.key === key);
  if (matches.length !== 1 || !clean(matches[0]?.value)) {
    throw new Error(`${label} must be configured exactly once`);
  }
  return matches[0].value;
};

const selectNodeVersion = (entries) => {
  const value = selectServiceVariable(entries, "NODE_VERSION", "Render Node version");
  if (value !== NODE_VERSION) {
    throw new Error(`Render Node version must equal ${NODE_VERSION}`);
  }
  return NODE_VERSION;
};

const groupIdsForService = (environmentGroups, serviceId) => (
  environmentGroups
    .filter((group) => group.serviceIds.includes(serviceId))
    .map((group) => group.id)
);

const validateDeploy = (entries, expectedCommit) => {
  const deploy = unwrap(entries?.[0], "deploy");
  if (!deploy) throw new Error("Render deployment was not returned");
  requireEqual(deploy.status, "live", "Render deployment status");
  requireEqual(deploy.commit?.id ?? deploy.commitId, expectedCommit, "Render deployment commit");
};

const outputService = (service, nodeVersion, linkedGroupIds) => ({
  serviceIdHash: sha256(requireText(service.id, "Render service id")),
  name: service.name,
  type: service.type,
  repo: REPOSITORY,
  branch: service.branch,
  buildCommand: serviceCommand(service, "buildCommand"),
  startCommand: serviceCommand(service, "startCommand"),
  nodeVersion,
  linkedGroupIdHashes: linkedGroupIds.map(sha256).sort(),
});

const selectPostgresHost = (connectionInfo, expectedDatabase, expectedRole) => {
  let url;
  let database;
  let role;
  try {
    url = new URL(requireText(
      connectionInfo?.externalConnectionString,
      "Preview Postgres connection info",
    ));
    database = decodeURIComponent(url.pathname.replace(/^\//, ""));
    role = decodeURIComponent(url.username);
  } catch {
    throw new Error("Preview Postgres connection info must contain a valid external URL");
  }
  if (
    !new Set(["postgres:", "postgresql:"]).has(url.protocol)
    || !url.hostname
    || role !== expectedRole
    || database !== expectedDatabase
  ) {
    throw new Error("Preview Postgres connection info must contain a valid external URL");
  }
  return url.hostname.toLowerCase();
};

const validatePostgresRecovery = (recovery) => {
  if (!new Set(["AVAILABLE", "BACKUP_NOT_READY"]).has(recovery?.recoveryStatus)) {
    throw new Error("Preview Postgres must have a recovery backup policy");
  }
};

const selectPagesProject = (payload) => {
  const value = payload?.result ?? {};
  return {
    id: value.id,
    name: value.name,
    source: {
      type: value.source?.type,
      config: {
        owner: value.source?.config?.owner,
        repo_name: value.source?.config?.repo_name,
        production_branch: value.source?.config?.production_branch,
      },
    },
    build_config: {
      build_command: value.build_config?.build_command,
      destination_dir: value.build_config?.destination_dir,
    },
    latest_deployment: {
      deployment_trigger: {
        metadata: {
          branch: value.latest_deployment?.deployment_trigger?.metadata?.branch,
          commit_hash: value.latest_deployment?.deployment_trigger?.metadata?.commit_hash,
        },
      },
      latest_stage: { status: value.latest_deployment?.latest_stage?.status },
    },
  };
};

const selectR2Bucket = (payload) => ({
  name: payload?.result?.name,
  jurisdiction: payload?.result?.jurisdiction,
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
    serviceDetails: {
      runtime: value.serviceDetails?.runtime,
      region: value.serviceDetails?.region,
      url: value.serviceDetails?.url,
      envSpecificDetails: {
        buildCommand: value.serviceDetails?.envSpecificDetails?.buildCommand,
        startCommand: value.serviceDetails?.envSpecificDetails?.startCommand,
      },
    },
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
  };
};

const selectPostgres = (entry) => {
  const value = unwrap(entry, "postgres") ?? {};
  return {
    id: value.id,
    ownerId: value.owner?.id,
    name: value.name,
    plan: value.plan,
    status: value.status,
    databaseName: value.databaseName,
    databaseUser: value.databaseUser,
  };
};

export async function buildFrontendUpgradeProviderEvidence(options = {}) {
  const testOnly = options[TEST_ONLY_PROVIDER_EVIDENCE];
  if (testOnly && options.env?.NODE_ENV !== "test") {
    throw new Error("test-only provider injection requires NODE_ENV=test");
  }
  const env = testOnly ? options.env : process.env;
  const cloudflareToken = requireText(env.CLOUDFLARE_API_TOKEN, "CLOUDFLARE_API_TOKEN");
  const cloudflareAccountId = requireText(
    env.CLOUDFLARE_ACCOUNT_ID,
    "CLOUDFLARE_ACCOUNT_ID",
  );
  const renderToken = requireText(env.RENDER_API_KEY, "RENDER_API_KEY");
  const webOrigin = validateWebOrigin(env.QUANTGYM_PREVIEW_WEB_URL);
  const expectedCommit = requireText(options.expectedCommit, "expected commit");
  const operator = requireText(options.operator, "operator");
  const budgetOwner = requireText(options.budgetOwner, "budget owner");
  const destroyOwner = requireText(options.destroyOwner, "destroy owner");
  const r2CredentialScope = requireText(
    options.r2CredentialScope,
    "R2 credential scope confirmation",
  );
  requireEqual(
    r2CredentialScope,
    R2_CREDENTIAL_SCOPE,
    "R2 credential scope confirmation",
  );
  const expectedPreviewJurisdiction = normalizeJurisdiction(requireText(
    options.r2Jurisdiction,
    "Preview R2 jurisdiction",
  ));
  const expectedProductionJurisdiction = normalizeJurisdiction(requireText(
    options.productionR2Jurisdiction,
    "production R2 jurisdiction",
  ));
  const previewEnvironmentGroupIds = options.previewEnvironmentGroupIds ?? [];
  if (!Array.isArray(previewEnvironmentGroupIds)) {
    throw new Error("Preview environment group IDs must be an array");
  }
  const approvedPreviewGroupIds = previewEnvironmentGroupIds.map((value) => (
    requireText(value, "Preview environment group ID")
  ));
  if (new Set(approvedPreviewGroupIds).size !== approvedPreviewGroupIds.length) {
    throw new Error("Preview environment group IDs must be unique");
  }

  const root = testOnly?.root ? path.resolve(testOnly.root) : defaultRoot;
  const now = testOnly?.now instanceof Date ? testOnly.now : new Date();
  const fetchImpl = testOnly?.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("HTTPS fetch is unavailable");

  const cfBase = `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}`;
  const cloudflareSensitiveValues = [cloudflareToken, cloudflareAccountId];
  const renderSensitiveValues = [renderToken];
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
  const r2HeadersFor = (jurisdiction) => ({ "cf-r2-jurisdiction": jurisdiction });

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

  const [
    previewPages,
    productionPages,
    previewR2,
    productionR2,
    services,
    environmentGroups,
    postgresResources,
  ] = await Promise.all([
    cfRequest(`/pages/projects/${PREVIEW_PAGES}`).then(selectPagesProject),
    cfRequest(`/pages/projects/${PRODUCTION_PAGES}`).then(selectPagesProject),
    cfRequest(
      `/r2/buckets/${PREVIEW_R2}`,
      r2HeadersFor(expectedPreviewJurisdiction),
    ).then(selectR2Bucket),
    cfRequest(
      `/r2/buckets/${PRODUCTION_R2}`,
      r2HeadersFor(expectedProductionJurisdiction),
    ).then(selectR2Bucket),
    renderList("/v1/services", "Render services", selectService),
    renderList("/v1/env-groups", "Render environment groups", selectEnvironmentGroup),
    renderList("/v1/postgres", "Render Postgres", selectPostgres),
  ]);

  validatePages(previewPages, expectedCommit);
  cloudflareSensitiveValues.push(previewPages.id, productionPages.id);
  requireEqual(productionPages.name, PRODUCTION_PAGES, "production Pages project name");
  assertDistinct(previewPages.id, productionPages.id, "Pages identity");
  requireEqual(previewR2.name, PREVIEW_R2, "R2 bucket name");
  requireEqual(productionR2.name, PRODUCTION_R2, "production R2 bucket name");
  const previewJurisdiction = normalizeJurisdiction(previewR2.jurisdiction);
  const productionJurisdiction = normalizeJurisdiction(productionR2.jurisdiction);
  requireEqual(previewJurisdiction, expectedPreviewJurisdiction, "Preview R2 jurisdiction");
  requireEqual(
    productionJurisdiction,
    expectedProductionJurisdiction,
    "production R2 jurisdiction",
  );
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
  assertDistinct(previewR2Identity, productionR2Identity, "R2 identity");

  const apiService = findNamed(services, "service", PREVIEW_API, "Render service");
  const llmService = findNamed(services, "service", PREVIEW_LLM, "Render service");
  const productionApi = findNamed(services, "service", PRODUCTION_API, "Render service");
  const productionLlm = findNamed(services, "service", PRODUCTION_LLM, "Render service");
  const workspaceId = requireText(apiService.ownerId, "Render workspace id");
  renderSensitiveValues.push(
    workspaceId,
    ...services.map((entry) => entry.id),
    ...environmentGroups.map((entry) => entry.id),
    ...postgresResources.map((entry) => entry.id),
  );
  requireEqual(llmService.ownerId, workspaceId, "Render LLM workspace");
  requireEqual(productionApi.ownerId, workspaceId, "Render production API workspace");
  requireEqual(productionLlm.ownerId, workspaceId, "Render production LLM workspace");
  const previewRegion = requireText(
    apiService.serviceDetails?.region,
    "Render API service region",
  );
  requireEqual(
    llmService.serviceDetails?.region,
    previewRegion,
    "Render Preview service region",
  );

  const previewServiceIds = [apiService.id, llmService.id];
  const productionServiceIds = [productionApi.id, productionLlm.id];
  if (apiService.id === llmService.id) {
    throw new Error("Preview API and LLM service identities must differ");
  }
  if (productionApi.id === productionLlm.id) {
    throw new Error("production API and LLM service identities must differ");
  }
  for (const previewId of previewServiceIds) {
    for (const productionId of productionServiceIds) {
      assertDistinct(previewId, productionId, "Render service identity");
    }
  }

  const scopedServiceIds = new Set([...previewServiceIds, ...productionServiceIds]);
  if (environmentGroups.some((group) => (
    group.ownerId !== workspaceId
    && group.serviceIds.some((id) => scopedServiceIds.has(id))
  ))) {
    throw new Error("Render environment group service links must stay inside the service workspace");
  }
  const workspaceEnvironmentGroups = environmentGroups.filter(
    (group) => group.ownerId === workspaceId,
  );
  const previewAllowedGroupIds = new Set(approvedPreviewGroupIds);
  for (const groupId of previewAllowedGroupIds) {
    const matches = environmentGroups.filter((group) => group.id === groupId);
    if (matches.length !== 1 || matches[0].ownerId !== workspaceId) {
      throw new Error(
        "Each approved Preview environment group must exist uniquely in the service workspace",
      );
    }
    const linkedServiceIds = matches[0].serviceIds;
    if (
      linkedServiceIds.length === 0
      || new Set(linkedServiceIds).size !== linkedServiceIds.length
      || linkedServiceIds.some((id) => !previewServiceIds.includes(id))
    ) {
      throw new Error("Approved Preview environment groups must link only Preview services");
    }
  }
  const productionGroupIds = new Set(
    workspaceEnvironmentGroups
      .filter((group) => group.serviceIds.some((id) => productionServiceIds.includes(id)))
      .map((group) => group.id),
  );
  for (const groupId of previewAllowedGroupIds) {
    if (productionGroupIds.has(groupId)) {
      throw new Error("Preview and production environment groups must be disjoint");
    }
  }
  for (const service of [apiService, llmService]) {
    const linkedGroups = groupIdsForService(workspaceEnvironmentGroups, service.id);
    if (linkedGroups.some((groupId) => productionGroupIds.has(groupId))) {
      throw new Error("Preview and production environment groups must be disjoint");
    }
    if (linkedGroups.some((groupId) => !previewAllowedGroupIds.has(groupId))) {
      throw new Error(
        "Each Preview service complete linked-group set must be a subset of approved groups",
      );
    }
  }

  const previewPostgres = findNamed(
    postgresResources,
    "postgres",
    PREVIEW_POSTGRES,
    "Render Postgres resource",
  );
  const productionPostgres = findNamed(
    postgresResources,
    "postgres",
    PRODUCTION_POSTGRES,
    "Render Postgres resource",
  );
  requireEqual(previewPostgres.ownerId, workspaceId, "Render Postgres workspace");
  requireEqual(productionPostgres.ownerId, workspaceId, "Render production Postgres workspace");
  requireEqual(previewPostgres.status, "available", "Preview Postgres status");
  assertDistinct(previewPostgres.id, productionPostgres.id, "Postgres resource identity");
  assertDistinct(
    previewPostgres.databaseName,
    productionPostgres.databaseName,
    "Postgres database",
  );
  assertDistinct(
    previewPostgres.databaseUser,
    productionPostgres.databaseUser,
    "Postgres role",
  );

  const r2Headers = r2HeadersFor(previewJurisdiction);
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
  });
  const readServiceConfiguration = async (serviceId, includeLlmOrigin = false) => {
    const selectedKeys = new Set([
      "NODE_VERSION",
      ...(includeLlmOrigin ? ["QUANTGYM_PREVIEW_LLM_INTERNAL_URL"] : []),
    ]);
    const matches = await renderList(
      `/v1/services/${encodeURIComponent(serviceId)}/env-vars`,
      "Render service environment variables",
      (entry) => {
        const value = unwrap(entry, "envVar");
        return selectedKeys.has(value?.key)
          ? { key: value.key, value: value.value }
          : undefined;
      },
    );
    return {
      nodeVersion: selectNodeVersion(matches),
      llmOrigin: includeLlmOrigin
        ? selectServiceVariable(
          matches,
          "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
          "Render API LLM internal URL",
        )
        : undefined,
    };
  };
  const readAndValidateDeploy = async (serviceId) => {
    const entries = await renderRequest(
      `/v1/services/${encodeURIComponent(serviceId)}/deploys?limit=1`,
    );
    const value = unwrap(entries?.[0], "deploy");
    validateDeploy([{
      deploy: {
        status: value?.status,
        commit: { id: value?.commit?.id ?? value?.commitId },
      },
    }], expectedCommit);
    return true;
  };
  const readPostgresHost = async () => {
    const connectionInfo = await renderRequest(
      `/v1/postgres/${encodeURIComponent(previewPostgres.id)}/connection-info`,
    );
    return selectPostgresHost(
      connectionInfo,
      previewPostgres.databaseName,
      previewPostgres.databaseUser,
    );
  };
  const readAndValidatePostgresRecovery = async () => {
    const recovery = await renderRequest(
      `/v1/postgres/${encodeURIComponent(previewPostgres.id)}/recovery`,
    );
    validatePostgresRecovery({ recoveryStatus: recovery?.recoveryStatus });
    return true;
  };

  const [
    lifecycle,
    cors,
    managedDomain,
    customDomains,
    apiConfiguration,
    llmConfiguration,
    _apiDeploy,
    _llmDeploy,
    postgresHost,
    _postgresRecovery,
  ] = await Promise.all([
    cfRequest(`/r2/buckets/${PREVIEW_R2}/lifecycle`, r2Headers).then(selectLifecycle),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/cors`, r2Headers).then(selectCors),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/domains/managed`, r2Headers).then((payload) => ({
      enabled: payload?.result?.enabled,
    })),
    cfRequest(`/r2/buckets/${PREVIEW_R2}/domains/custom`, r2Headers).then((payload) => ({
      domains: Array.isArray(payload?.result?.domains)
        ? payload.result.domains.map(() => ({ present: true }))
        : null,
    })),
    readServiceConfiguration(apiService.id, true),
    readServiceConfiguration(llmService.id),
    readAndValidateDeploy(apiService.id),
    readAndValidateDeploy(llmService.id),
    readPostgresHost(),
    readAndValidatePostgresRecovery(),
  ]);

  validatePreviewService(apiService, "web_service", "API", apiConfiguration.nodeVersion);
  validatePreviewService(llmService, "private_service", "LLM", llmConfiguration.nodeVersion);
  requireEqual(
    normalizeRenderPrivateOrigin(
      apiConfiguration.llmOrigin,
      "Render API LLM internal URL",
    ),
    normalizeRenderPrivateOrigin(
      llmService.serviceDetails?.url,
      "Render LLM service address",
    ),
    "Render API LLM private-service binding",
  );
  validateR2({
    preview: previewR2,
    lifecycle,
    cors,
    managedDomain,
    customDomains,
    credentialScope: r2CredentialScope,
    webOrigin,
  });

  const apiLinkedGroupIds = groupIdsForService(workspaceEnvironmentGroups, apiService.id);
  const llmLinkedGroupIds = groupIdsForService(workspaceEnvironmentGroups, llmService.id);

  const evidence = {
    schemaVersion: 1,
    authenticatedSource: (
      "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation"
    ),
    capturedAt: now.toISOString(),
    operator,
    budgetOwner,
    destroyOwner,
    cloudflare: {
      accountIdHash: sha256(cloudflareAccountId),
      pages: {
        projectIdHash: sha256(requireText(previewPages.id, "Pages project id")),
        name: previewPages.name,
        productionBranch: previewPages.source.config.production_branch,
        buildCommand: previewPages.build_config.build_command,
        destinationDir: previewPages.build_config.destination_dir,
        latestDeploymentCommit: previewPages.latest_deployment.deployment_trigger.metadata.commit_hash,
        latestDeploymentStatus: previewPages.latest_deployment.latest_stage.status,
      },
      productionPagesProjectIdHash: sha256(
        requireText(productionPages.id, "production Pages project id"),
      ),
      r2: {
        bucketIdentityHash: previewR2Identity,
        bucketName: previewR2.name,
        jurisdiction: previewJurisdiction,
        endpointAccountIdHash: sha256(cloudflareAccountId),
        private: true,
        r2DevEnabled: false,
        credentialScope: r2CredentialScope,
        signingRegion: "auto",
        lifecycleDays: 7,
        corsOrigin: webOrigin,
      },
      productionR2BucketIdentityHash: productionR2Identity,
    },
    render: {
      workspaceIdHash: sha256(workspaceId),
      services: [
        outputService(apiService, apiConfiguration.nodeVersion, apiLinkedGroupIds),
        outputService(llmService, llmConfiguration.nodeVersion, llmLinkedGroupIds),
      ],
      productionServiceIdHashes: productionServiceIds.map(sha256).sort(),
      previewAllowedGroupIdHashes: [...previewAllowedGroupIds].map(sha256).sort(),
      productionGroupIdHashes: [...productionGroupIds].map(sha256).sort(),
      postgres: {
        resourceIdHash: sha256(requireText(previewPostgres.id, "Preview Postgres id")),
        hostHash: sha256(postgresHost),
        databaseHash: sha256(
          requireText(previewPostgres.databaseName, "Preview Postgres database"),
        ),
        roleHash: sha256(requireText(previewPostgres.databaseUser, "Preview Postgres role")),
      },
      productionPostgresResourceIdHash: sha256(
        requireText(productionPostgres.id, "production Postgres id"),
      ),
    },
  };

  const output = path.join(root, OUTPUT_PATH);
  await mkdir(path.dirname(output), { recursive: true });
  const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
  const temporaryOutput = `${output}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporaryOutput, serialized, { encoding: "utf8", mode: 0o600 });
    await chmod(temporaryOutput, 0o600);
    await rename(temporaryOutput, output);
    await chmod(output, 0o600);
  } catch (error) {
    await rm(temporaryOutput, { force: true });
    throw error;
  }
  return { output, sha256: sha256(serialized), evidence };
}

const parseArgs = (argv) => {
  const values = {};
  const supported = new Map([
    ["--expected-commit", "expectedCommit"],
    ["--operator", "operator"],
    ["--budget-owner", "budgetOwner"],
    ["--destroy-owner", "destroyOwner"],
    ["--r2-credential-scope", "r2CredentialScope"],
    ["--r2-jurisdiction", "r2Jurisdiction"],
    ["--production-r2-jurisdiction", "productionR2Jurisdiction"],
    ["--preview-environment-group-id", "previewEnvironmentGroupIds"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const flag = argv[index];
    const key = supported.get(flag);
    if (!key) throw new Error(`unsupported argument: ${flag}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
    if (key === "previewEnvironmentGroupIds") {
      values[key] = [...(values[key] ?? []), value];
    } else {
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
    const result = await buildFrontendUpgradeProviderEvidence({
      env: process.env,
      ...parseArgs(process.argv.slice(2)),
    });
    console.log(`Wrote ${path.relative(defaultRoot, result.output)} (SHA-256 ${result.sha256})`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
