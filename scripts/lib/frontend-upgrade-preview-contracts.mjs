export const PREVIEW_PROVIDER_EVIDENCE_PATH = (
  "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
);

const APPROVED_PREVIEW_CONTRACT = {
  version: 1,
  environment: "preview-v2",
  branch: {
    name: "codex/frontend-v2-preview",
    mustExistLocally: true,
    mustExistOnOrigin: true,
  },
  resources: {
    pagesProject: "quantgym-v2-preview",
    apiService: "quantgym-v2-preview-api",
    llmService: "quantgym-v2-preview-llm",
    postgres: "quantgym-v2-preview-postgres",
    r2Bucket: "quantgym-v2-preview-media",
  },
  origins: {
    web: {
      valueFrom: "QUANTGYM_PREVIEW_WEB_URL",
      requiredResourceToken: "quantgym-v2-preview",
    },
    api: {
      valueFrom: "QUANTGYM_PREVIEW_API_ORIGIN",
      requiredResourceToken: "quantgym-v2-preview-api",
    },
    apiBasePath: "/api/v2",
    apiHealthPath: "/api/v2/health",
    llmInternalHealthPath: "/health",
    forbiddenHosts: [
      "beta.quantgym.app",
      "api.quantgym.app",
      "llm.quantgym.app",
      "media.quantgym.app",
    ],
  },
  services: {
    web: {
      provider: "cloudflare-pages",
      visibility: "public",
      artifact: "minimal-static-probe",
      publishesProductData: false,
    },
    api: {
      provider: "render",
      visibility: "public",
      healthPath: "/api/v2/health",
      serviceValue: "api",
    },
    llm: {
      provider: "render",
      visibility: "internal",
      healthPath: "/health",
      serviceValue: "llm",
      browserDirectAccess: false,
    },
  },
  postgres: {
    provider: "render",
    sslRequired: true,
    initialSchema: "empty",
    phase1SchemaOwner: "alembic",
    independentDatabase: true,
    independentRole: true,
    applicationBinding: "reserved-until-phase-1",
  },
  r2: {
    provider: "cloudflare-r2",
    public: false,
    r2DevEnabled: false,
    credentialScope: "single-bucket-read-write",
    testPrefix: "readiness-smoke/",
    lifecycleDays: 7,
    applicationBinding: "reserved-until-phase-1",
  },
  policies: {
    reuseProductionDatabase: false,
    reuseProductionBucket: false,
    reuseProductionEnvironmentGroup: false,
    importLegacyV1: false,
    dualWrite: false,
    seedPolicy: "empty-or-synthetic",
    corsPolicy: "preview-web-origin-only",
  },
  environmentVariablesByScope: {
    cloudflarePages: [
      "QUANTGYM_PREVIEW_ENVIRONMENT",
      "QUANTGYM_PREVIEW_SERVICE",
      "QUANTGYM_PREVIEW_COMMIT",
      "QUANTGYM_PREVIEW_BRANCH",
      "QUANTGYM_PREVIEW_API_BASE",
    ],
    renderApi: [
      "QUANTGYM_PREVIEW_ENVIRONMENT",
      "QUANTGYM_PREVIEW_SERVICE",
      "QUANTGYM_PREVIEW_COMMIT",
      "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
      "QUANTGYM_PREVIEW_CORS_ORIGIN",
    ],
    renderLlm: [
      "QUANTGYM_PREVIEW_ENVIRONMENT",
      "QUANTGYM_PREVIEW_SERVICE",
      "QUANTGYM_PREVIEW_COMMIT",
    ],
    operatorSecrets: [
      "CLOUDFLARE_API_TOKEN",
      "CLOUDFLARE_ACCOUNT_ID",
      "RENDER_API_KEY",
      "QUANTGYM_PREVIEW_POSTGRES_URL",
      "QUANTGYM_PREVIEW_R2_ENDPOINT",
      "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID",
      "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY",
    ],
    operatorEvidence: [
      "QUANTGYM_PREVIEW_WEB_URL",
      "QUANTGYM_PREVIEW_API_ORIGIN",
      "QUANTGYM_PREVIEW_EXPECTED_COMMIT",
      "QUANTGYM_PREVIEW_EXPECTED_BRANCH",
      "QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH",
    ],
  },
};

const RESOURCE_KEYS = Object.keys(APPROVED_PREVIEW_CONTRACT.resources);
const PRODUCTION_RESOURCE_NAMES = new Set([
  "quantgym",
  "quantgym-api",
  "quantgym-llm",
  "quantgym-postgres",
  "quantgym-media-production",
]);
const FORBIDDEN_HOSTS = APPROVED_PREVIEW_CONTRACT.origins.forbiddenHosts;
const SENSITIVE_QUERY_NAME = /(?:^|[-_.])(auth|credential|key|password|secret|signature|token)(?:$|[-_.])/i;

const isPlainObject = (value) => (
  value !== null
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype
);

const describeExpected = (value) => {
  if (typeof value === "string") return JSON.stringify(value);
  return String(value);
};

const compareApprovedShape = (actual, expected, path, failures) => {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) {
      failures.push(`${path} must be an array`);
      return;
    }
    if (actual.length !== expected.length) {
      failures.push(`${path} length must be ${expected.length}`);
    }
    const comparedLength = Math.min(actual.length, expected.length);
    for (let index = 0; index < comparedLength; index += 1) {
      compareApprovedShape(actual[index], expected[index], `${path}[${index}]`, failures);
    }
    return;
  }

  if (isPlainObject(expected)) {
    if (!isPlainObject(actual)) {
      failures.push(`${path} must be an object`);
      return;
    }
    for (const key of Object.keys(expected)) {
      if (!Object.hasOwn(actual, key)) {
        failures.push(`${path}.${key} is required`);
        continue;
      }
      compareApprovedShape(actual[key], expected[key], `${path}.${key}`, failures);
    }
    for (const key of Object.keys(actual)) {
      if (!Object.hasOwn(expected, key)) failures.push(`${path}.${key} is not approved`);
    }
    return;
  }

  if (!Object.is(actual, expected)) {
    failures.push(`${path} must equal ${describeExpected(expected)}`);
  }
};

const collectStringEntries = (value, path = "contract", entries = []) => {
  if (typeof value === "string") {
    entries.push({ path, value });
    return entries;
  }
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      collectStringEntries(item, `${path}[${index}]`, entries);
    }
    return entries;
  }
  if (!isPlainObject(value)) return entries;
  for (const [key, item] of Object.entries(value)) {
    collectStringEntries(item, `${path}.${key}`, entries);
  }
  return entries;
};

const parseUrlCandidate = (value) => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const protocolRelative = trimmed.startsWith("//");
  if (!protocolRelative && !/^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)) return null;
  try {
    return new URL(protocolRelative ? `https:${trimmed}` : trimmed);
  } catch {
    return null;
  }
};

const normalizeHostname = (hostname) => hostname.toLowerCase().replace(/\.+$/, "");
const bareHostnameFrom = (value) => (
  /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}\.?$/i.test(value)
    ? value
    : null
);
const forbiddenHostnameFor = (hostname) => {
  const normalized = normalizeHostname(hostname);
  return FORBIDDEN_HOSTS.find((forbidden) => (
    normalized === forbidden || normalized.endsWith(`.${forbidden}`)
  ));
};

const validateUrlIsolation = (contract, failures) => {
  for (const { path, value } of collectStringEntries(contract)) {
    const parsed = parseUrlCandidate(value);
    if (parsed && (parsed.username || parsed.password || [...parsed.searchParams.keys()].some((key) => (
      SENSITIVE_QUERY_NAME.test(key)
    )))) {
      failures.push(`${path} URL must not contain credentials`);
    }

    if (!path.startsWith("contract.origins.forbiddenHosts[")) {
      const hostname = parsed?.hostname || bareHostnameFrom(value);
      const forbidden = hostname ? forbiddenHostnameFor(hostname) : null;
      if (forbidden) failures.push(`${path} must not reference forbidden host ${forbidden}`);
    }

    if (parsed && /^contract\.services\.llm\..*url$/i.test(path)) {
      failures.push(`${path} must not define a browser-visible LLM URL`);
    }
  }
};

const validateResourceIsolation = (contract, failures) => {
  const resources = isPlainObject(contract?.resources) ? contract.resources : {};
  for (const key of RESOURCE_KEYS) {
    const name = resources[key];
    if (typeof name !== "string") continue;
    if (PRODUCTION_RESOURCE_NAMES.has(name.toLowerCase()) || /(?:^|[-_.])prod(?:uction)?(?:$|[-_.])/i.test(name)) {
      failures.push(`resources.${key} must not use a production resource name`);
    }
    if (!name.toLowerCase().includes("v2-preview")) {
      failures.push(`resources.${key} must contain v2-preview`);
    }
  }
};

const validatePolicyIsolation = (contract, failures) => {
  const policies = isPlainObject(contract?.policies) ? contract.policies : {};
  if (policies.reuseProductionDatabase !== false) {
    failures.push("policies.reuseProductionDatabase must prevent production database reuse");
  }
  if (policies.reuseProductionBucket !== false) {
    failures.push("policies.reuseProductionBucket must prevent production bucket reuse");
  }
  if (policies.reuseProductionEnvironmentGroup !== false) {
    failures.push("policies.reuseProductionEnvironmentGroup must prevent a shared production environment group");
  }
  if (policies.importLegacyV1 !== false) {
    failures.push("policies.importLegacyV1 must prevent a v1 import");
  }
  if (policies.dualWrite !== false) {
    failures.push("policies.dualWrite must prevent dual-write");
  }
  if (contract?.r2?.public !== false) failures.push("r2.public must keep the Preview bucket private");
  if (contract?.r2?.r2DevEnabled !== false) failures.push("r2.r2DevEnabled must remain false");
  if (contract?.services?.llm?.visibility !== "internal") {
    failures.push("services.llm.visibility must be internal");
  }
  if (contract?.services?.llm?.browserDirectAccess !== false) {
    failures.push("services.llm.browserDirectAccess must be false");
  }
  const browserVariables = Array.isArray(contract?.environmentVariablesByScope?.cloudflarePages)
    ? contract.environmentVariablesByScope.cloudflarePages
    : [];
  if (browserVariables.some((name) => typeof name === "string" && /(?:^|_)LLM(?:_|$)/i.test(name))) {
    failures.push("environmentVariablesByScope.cloudflarePages must not expose a browser-visible LLM URL");
  }
};

export function validatePreviewContract(contract) {
  const failures = [];
  if (!isPlainObject(contract)) {
    return ["preview contract must be an object"];
  }

  compareApprovedShape(contract, APPROVED_PREVIEW_CONTRACT, "contract", failures);
  validateResourceIsolation(contract, failures);
  validateUrlIsolation(contract, failures);
  validatePolicyIsolation(contract, failures);
  return [...new Set(failures)];
}
