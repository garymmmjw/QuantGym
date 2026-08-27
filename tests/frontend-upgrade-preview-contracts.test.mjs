import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  PREVIEW_PROVIDER_EVIDENCE_PATH,
  validatePreviewContract,
} from "../scripts/lib/frontend-upgrade-preview-contracts.mjs";

const projectRoot = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const checkerPath = path.join(projectRoot, "scripts/check-frontend-upgrade-preview.mjs");

const expectedContract = {
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

const checkedInContract = JSON.parse(
  await readFile(
    new URL("../docs/frontend-upgrade/preview-environment.json", import.meta.url),
    "utf8",
  ),
);
const packageJson = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
const cloneContract = () => structuredClone(expectedContract);
const reverseObjectKeys = (value) => {
  if (Array.isArray(value)) return value.map(reverseObjectKeys);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .reverse()
      .map(([key, nestedValue]) => [key, reverseObjectKeys(nestedValue)]),
  );
};
const assertFailureIncludes = (contract, expected) => {
  const failures = validatePreviewContract(contract);
  assert.ok(
    failures.some((failure) => failure.includes(expected)),
    `expected a failure containing ${JSON.stringify(expected)}; got ${failures.join(", ")}`,
  );
};
const assertValidationFailureWithoutThrow = (contract, expected) => {
  let failures;
  assert.doesNotThrow(() => {
    failures = validatePreviewContract(contract);
  });
  assert.ok(
    failures.includes(expected),
    `expected exact failure ${JSON.stringify(expected)}; got ${failures.join(", ")}`,
  );
};

test("the checked-in Preview contract matches the approved isolation contract exactly", () => {
  assert.deepEqual(checkedInContract, expectedContract);
  assert.deepEqual(validatePreviewContract(checkedInContract), []);
  assert.equal(checkedInContract.policies.reuseProductionDatabase, false);
  assert.equal(checkedInContract.policies.reuseProductionBucket, false);
  assert.equal(checkedInContract.policies.importLegacyV1, false);
  assert.equal(checkedInContract.policies.dualWrite, false);
  assert.equal(checkedInContract.services.llm.visibility, "internal");
  assert.equal(
    PREVIEW_PROVIDER_EVIDENCE_PATH,
    "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json",
  );
});

test("validation is insensitive to object key insertion order", () => {
  assert.deepEqual(validatePreviewContract(reverseObjectKeys(expectedContract)), []);
});

test("reports a missing required field independently of isolation-policy checks", () => {
  const invalid = cloneContract();
  delete invalid.environment;

  assertValidationFailureWithoutThrow(invalid, "contract.environment is required");
});

test("reports a wrong ordinary scalar independently of isolation-policy checks", () => {
  const invalid = cloneContract();
  invalid.services.web.provider = "alternate-pages-provider";

  assertValidationFailureWithoutThrow(
    invalid,
    'contract.services.web.provider must equal "cloudflare-pages"',
  );
});

test("reports an unapproved top-level key with its exact path", () => {
  const invalidTopLevel = cloneContract();
  invalidTopLevel.providerMetadata = {};
  assertValidationFailureWithoutThrow(
    invalidTopLevel,
    "contract.providerMetadata is not approved",
  );
});

test("reports an unapproved nested key with its exact path", () => {
  const invalidNested = cloneContract();
  invalidNested.services.api.deployTarget = "preview";
  assertValidationFailureWithoutThrow(
    invalidNested,
    "contract.services.api.deployTarget is not approved",
  );
});

for (const [label, mutate, diagnostic] of [
  [
    "branch object",
    (contract) => { contract.branch = null; },
    "contract.branch must be an object",
  ],
  [
    "nested service object",
    (contract) => { contract.services.web = []; },
    "contract.services.web must be an object",
  ],
  [
    "nested environment-variable array",
    (contract) => { contract.environmentVariablesByScope.operatorEvidence = {}; },
    "contract.environmentVariablesByScope.operatorEvidence must be an array",
  ],
]) {
  test(`reports a malformed ${label} without throwing`, () => {
    const invalid = cloneContract();
    mutate(invalid);

    assertValidationFailureWithoutThrow(invalid, diagnostic);
  });
}

for (const host of expectedContract.origins.forbiddenHosts) {
  test(`rejects the forbidden beta or production hostname ${host}`, () => {
    const invalid = cloneContract();
    invalid.origins.api.valueFrom = `https://${host}/api/v2`;

    assertFailureIncludes(invalid, host);
  });
}

test("normalizes case and a trailing dot and rejects forbidden-host subdomains", () => {
  const invalid = cloneContract();
  invalid.origins.api.valueFrom = "https://edge.BETA.QUANTGYM.APP./api/v2";

  assertFailureIncludes(invalid, "beta.quantgym.app");

  const bareHostname = cloneContract();
  bareHostname.origins.api.valueFrom = "BETA.QUANTGYM.APP.";
  assertFailureIncludes(bareHostname, "forbidden host beta.quantgym.app");
});

test("does not match a forbidden hostname as an unrelated hostname substring", () => {
  const invalid = cloneContract();
  invalid.origins.api.valueFrom = "https://api.quantgym.app.example.invalid/api/v2";

  const failures = validatePreviewContract(invalid);
  assert.ok(!failures.some((failure) => failure.includes("forbidden host")), failures.join(", "));
});

for (const [resource, productionNames] of Object.entries({
  pagesProject: ["quantgym", "quantgym-beta"],
  apiService: ["quantgym-api"],
  llmService: ["quantgym-llm"],
  postgres: ["quantgym-postgres"],
  r2Bucket: ["quantgym-media-production", "quantgym-media"],
})) {
  for (const productionName of productionNames) {
    test(`rejects the production resource name ${productionName} for ${resource}`, () => {
      const invalid = cloneContract();
      invalid.resources[resource] = productionName;

      assertFailureIncludes(invalid, "production resource name");
    });
  }
}

for (const resource of Object.keys(expectedContract.resources)) {
  test(`requires v2-preview in the ${resource} resource name`, () => {
    const invalid = cloneContract();
    invalid.resources[resource] = `quantgym-preview-${resource.toLowerCase()}`;

    assertFailureIncludes(invalid, `resources.${resource} must contain v2-preview`);
  });
}

test("rejects credential-bearing URLs", () => {
  const invalid = cloneContract();
  invalid.origins.web.valueFrom = "https://operator@quantgym-v2-preview.example.invalid";

  assertFailureIncludes(invalid, "credentials");

  const queryCredential = cloneContract();
  queryCredential.origins.web.valueFrom = (
    "https://quantgym-v2-preview.example.invalid?token=redacted"
  );
  assertFailureIncludes(queryCredential, "credentials");
});

for (const [label, value] of [
  ["whitespace-prefixed HTTP URL", "  https://operator@quantgym-v2-preview.example.invalid"],
  ["protocol-relative URL", "//operator@quantgym-v2-preview.example.invalid"],
  ["Postgres URL", "postgres://operator@quantgym-v2-preview-postgres.example.invalid/database"],
]) {
  test(`rejects credentials in a ${label}`, () => {
    const invalid = cloneContract();
    invalid.origins.web.valueFrom = value;

    assertFailureIncludes(invalid, "credentials");
  });
}

test("rejects a browser-visible LLM URL and browser-direct LLM access", () => {
  const invalidUrl = cloneContract();
  invalidUrl.services.llm.browserUrl = "https://quantgym-v2-preview-llm.example.invalid";
  assertFailureIncludes(invalidUrl, "browser-visible LLM URL");

  const invalidVisibility = cloneContract();
  invalidVisibility.services.llm.visibility = "public";
  assertFailureIncludes(invalidVisibility, "services.llm.visibility");

  const invalidAccess = cloneContract();
  invalidAccess.services.llm.browserDirectAccess = true;
  assertFailureIncludes(invalidAccess, "services.llm.browserDirectAccess");

  const invalidBrowserScope = cloneContract();
  invalidBrowserScope.environmentVariablesByScope.cloudflarePages.push(
    "QUANTGYM_PREVIEW_LLM_INTERNAL_URL",
  );
  assertFailureIncludes(invalidBrowserScope, "browser-visible LLM URL");
});

test("rejects a shared production environment group", () => {
  const invalid = cloneContract();
  invalid.policies.reuseProductionEnvironmentGroup = true;

  assertFailureIncludes(invalid, "environment group");
});

test("rejects a v1 import", () => {
  const invalid = cloneContract();
  invalid.policies.importLegacyV1 = true;

  assertFailureIncludes(invalid, "v1 import");
});

test("rejects dual-write", () => {
  const invalid = cloneContract();
  invalid.policies.dualWrite = true;

  assertFailureIncludes(invalid, "dual-write");
});

test("rejects a public Preview bucket", () => {
  const invalid = cloneContract();
  invalid.r2.public = true;

  assertFailureIncludes(invalid, "private");
});

test("returns structural failures instead of throwing for malformed input", () => {
  assert.doesNotThrow(() => validatePreviewContract(null));
  assert.ok(validatePreviewContract(null).some((failure) => failure.includes("contract")));
});

test("the package exposes only the requested local Preview contract checker", () => {
  assert.equal(
    packageJson.scripts["check:frontend-upgrade:preview"],
    "node scripts/check-frontend-upgrade-preview.mjs",
  );
});

test("the checker validates a contract fixture without requiring branch or provider resources", async () => {
  const fixtureRoot = await mkdtemp(path.join(tmpdir(), "quantgym-preview-contract-"));
  try {
    const contractPath = path.join(fixtureRoot, "docs/frontend-upgrade/preview-environment.json");
    await mkdir(path.dirname(contractPath), { recursive: true });
    await writeFile(contractPath, `${JSON.stringify(expectedContract, null, 2)}\n`, "utf8");

    const result = spawnSync(process.execPath, [checkerPath, "--root", fixtureRoot], {
      cwd: projectRoot,
      encoding: "utf8",
    });

    assert.equal(result.status, 0, `checker output:\n${result.stdout}\n${result.stderr}`);
    assert.match(result.stdout, /Preview environment contract valid/);
  } finally {
    await rm(fixtureRoot, { recursive: true, force: true });
  }
});

test("the checker reports a missing --root value without a raw stack trace", () => {
  const result = spawnSync(process.execPath, [checkerPath, "--root"], {
    cwd: projectRoot,
    encoding: "utf8",
  });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr, "FAIL: --root requires a directory path\n");
});
