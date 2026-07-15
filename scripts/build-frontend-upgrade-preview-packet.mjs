import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const defaultRoot = path.resolve(scriptDir, "..");
const defaultOutput = path.join(
  defaultRoot,
  "artifacts/frontend-upgrade/preview-environment",
);

const hashSchema = { type: "string", pattern: "^[a-f0-9]{64}$" };
const stringSchema = { type: "string", minLength: 1 };

const providerEvidenceSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: "QuantGym frontend v2 Preview provider evidence",
  type: "object",
  additionalProperties: false,
  required: [
    "schemaVersion",
    "authenticatedSource",
    "capturedAt",
    "operator",
    "budgetOwner",
    "destroyOwner",
    "cloudflare",
    "render",
  ],
  properties: {
    schemaVersion: { const: 1 },
    authenticatedSource: {
      const: "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation",
    },
    capturedAt: { type: "string", format: "date-time" },
    operator: stringSchema,
    budgetOwner: stringSchema,
    destroyOwner: stringSchema,
    cloudflare: {
      type: "object",
      additionalProperties: false,
      required: [
        "accountIdHash",
        "pages",
        "productionPagesProjectIdHash",
        "r2",
        "productionR2BucketIdentityHash",
      ],
      properties: {
        accountIdHash: hashSchema,
        pages: {
          type: "object",
          additionalProperties: false,
          required: [
            "projectIdHash",
            "name",
            "productionBranch",
            "buildCommand",
            "destinationDir",
            "latestDeploymentCommit",
            "latestDeploymentStatus",
          ],
          properties: {
            projectIdHash: hashSchema,
            name: { const: "quantgym-v2-preview" },
            productionBranch: { const: "codex/frontend-v2-preview" },
            buildCommand: {
              const: "npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview",
            },
            destinationDir: { const: "dist-preview" },
            latestDeploymentCommit: stringSchema,
            latestDeploymentStatus: { const: "success" },
          },
        },
        productionPagesProjectIdHash: hashSchema,
        r2: {
          type: "object",
          additionalProperties: false,
          required: [
            "bucketIdentityHash",
            "bucketName",
            "jurisdiction",
            "endpointAccountIdHash",
            "private",
            "r2DevEnabled",
            "credentialScope",
            "signingRegion",
            "lifecycleDays",
            "corsOrigin",
          ],
          properties: {
            bucketIdentityHash: hashSchema,
            bucketName: { const: "quantgym-v2-preview-media" },
            jurisdiction: { enum: ["default", "eu", "fedramp"] },
            endpointAccountIdHash: hashSchema,
            private: { const: true },
            r2DevEnabled: { const: false },
            credentialScope: { const: "single-bucket-read-write" },
            signingRegion: { const: "auto" },
            lifecycleDays: { const: 7 },
            corsOrigin: { type: "string", format: "uri" },
          },
        },
        productionR2BucketIdentityHash: hashSchema,
      },
    },
    render: {
      type: "object",
      additionalProperties: false,
      required: [
        "workspaceIdHash",
        "services",
        "productionServiceIdHashes",
        "previewAllowedGroupIdHashes",
        "productionGroupIdHashes",
        "postgres",
        "productionPostgresResourceIdHash",
      ],
      properties: {
        workspaceIdHash: hashSchema,
        services: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          allOf: [
            {
              contains: {
                type: "object",
                required: ["name", "type"],
                properties: {
                  name: { const: "quantgym-v2-preview-api" },
                  type: { const: "web_service" },
                },
              },
              minContains: 1,
              maxContains: 1,
            },
            {
              contains: {
                type: "object",
                required: ["name", "type"],
                properties: {
                  name: { const: "quantgym-v2-preview-llm" },
                  type: { const: "private_service" },
                },
              },
              minContains: 1,
              maxContains: 1,
            },
          ],
          items: {
            type: "object",
            additionalProperties: false,
            required: [
              "serviceIdHash",
              "name",
              "type",
              "repo",
              "branch",
              "buildCommand",
              "startCommand",
              "nodeVersion",
              "linkedGroupIdHashes",
            ],
            properties: {
              serviceIdHash: hashSchema,
              name: { enum: ["quantgym-v2-preview-api", "quantgym-v2-preview-llm"] },
              type: { enum: ["web_service", "private_service"] },
              repo: { const: "https://github.com/garymmmjw/QuantGym" },
              branch: { const: "codex/frontend-v2-preview" },
              buildCommand: { const: "npm ci" },
              startCommand: {
                const: "node scripts/serve-frontend-upgrade-preview-probe.mjs",
              },
              nodeVersion: { const: "20.20.2" },
              linkedGroupIdHashes: {
                type: "array",
                uniqueItems: true,
                items: hashSchema,
              },
            },
          },
        },
        productionServiceIdHashes: {
          type: "array",
          minItems: 2,
          maxItems: 2,
          uniqueItems: true,
          items: hashSchema,
        },
        previewAllowedGroupIdHashes: {
          type: "array",
          uniqueItems: true,
          items: hashSchema,
        },
        productionGroupIdHashes: {
          type: "array",
          uniqueItems: true,
          items: hashSchema,
        },
        postgres: {
          type: "object",
          additionalProperties: false,
          required: ["resourceIdHash", "hostHash", "databaseHash", "roleHash"],
          properties: {
            resourceIdHash: hashSchema,
            hostHash: hashSchema,
            databaseHash: hashSchema,
            roleHash: hashSchema,
          },
        },
        productionPostgresResourceIdHash: hashSchema,
      },
    },
  },
};

const readme = `# QuantGym frontend v2 Preview provider packet

This ignored packet is an operator checklist, not proof that external resources exist. Obtain
explicit provisioning authorization before using provider credentials or creating resources.

## Exact resources

- Cloudflare Pages: quantgym-v2-preview on codex/frontend-v2-preview.
- Render: quantgym-v2-preview-api (web_service) and quantgym-v2-preview-llm (private_service).
- Render PostgreSQL: quantgym-v2-preview-postgres.
- Cloudflare R2: quantgym-v2-preview-media.

PostgreSQL and R2 are reserved, independently verified resources in Phase 0. The temporary API
probe is not bound to them. Phase 1 performs the first application binding and schema migration.

The browser receives only the Preview API base. It never receives an OpenAI key, R2 secret,
Postgres URL, or internal LLM URL; no OpenAI key is configured anywhere in the Phase 0 probes.

## Evidence boundary

Raw provider responses, analytics tokens, deployment environment metadata, and credentials must never be saved or written to disk/stdout/stderr. Record only
artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json and its SHA-256.
Generate this packet before the provider evidence because packet generation replaces the ignored
output directory. The read-only Cloudflare R2 API does not expose an existing S3 credential scope.
After dashboard verification, pass the non-secret confirmation:

    --r2-credential-scope single-bucket-read-write

The evidence source label distinguishes provider API evidence from this operator attestation.

The evidence selector never creates or rotates credentials. After the check run:

    unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID RENDER_API_KEY

Use manual-signoff-checklist.csv to record the operator, budget owner, data-reset owner, resource
expiry/review date, rollback, destroy owner, and destroy steps.
`;

const cloudflarePagesRunbook = `# Cloudflare Pages Preview probe

Create project quantgym-v2-preview from repository garymmmjw/QuantGym. Configure production branch
codex/frontend-v2-preview, build command:

    npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview

Set destination dist-preview. Supply exactly cloudflare-pages-env-template.txt. Form
QUANTGYM_PREVIEW_API_BASE from QUANTGYM_PREVIEW_API_ORIGIN plus /api/v2.

The three-file output has no current app bundle, v1 catalog, private question data, jobs data,
root runtime config, Google OAuth config, or browser LLM endpoint. It contains only index.html,
config.json, and version.json. Verify its deployment commit and success status before capture.
`;

const renderServicesRunbook = `# Render Preview probes

Create public quantgym-v2-preview-api as web_service and private quantgym-v2-preview-llm as
private_service. Both use https://github.com/garymmmjw/QuantGym, codex/frontend-v2-preview,
native Node runtime 20.20.2, the same Render region, build command npm ci, and start command:

    node scripts/serve-frontend-upgrade-preview-probe.mjs

Set QUANTGYM_PREVIEW_SERVICE to api and llm respectively. The API sets
QUANTGYM_PREVIEW_LLM_INTERNAL_URL to the private service and QUANTGYM_PREVIEW_CORS_ORIGIN to the
actual Preview Pages origin. It serves only /api/v2/health and calls LLM /health. Permit that one
origin; reject https://beta.quantgym.app and unrelated origins.

Set NODE_VERSION=20.20.2 directly on each service; the read-only service env-var endpoint excludes
linked-group values. Task 10 creates a separate Preview environment group. Pass its exact provider
ID with --preview-environment-group-id; repeat the flag only for additional explicitly approved
Preview groups. Every approved group must link only Preview services, and each service's complete
linked-group set must be a subset of those IDs and disjoint from production groups. Service-level-
only configuration remains valid; a production group array may be empty. Use the LLM Dashboard
Service Address host quantgym-v2-preview-llm-<render-hash> and its assigned port, forming the
origin as http://<service-address>; private services have no onrender.com public origin. Provider
evidence binds the API's configured QUANTGYM_PREVIEW_LLM_INTERNAL_URL to that authenticated
service address in memory. The probes read PORT, bind 0.0.0.0, and require the deployed commit to
match RENDER_GIT_COMMIT. Service variables contain no provider operator credentials.
`;

const postgresRunbook = `# PostgreSQL Preview reservation

Reserve quantgym-v2-preview-postgres with a provider resource, database, and role distinct from
production. Require SSL, configure a backup policy, and verify zero legacy tables in public.
There is no use of scripts/import-api-sqlite-export-to-postgres.py or
api-server/postgres/schema.sql. The temporary Phase 0 probe has no database binding; Phase 1 owns
the first schema migration and application binding. Provider evidence parses the external host
from connection info only in memory and validates read-only point-in-time recovery status before
recording hashes.
`;

const r2Runbook = `# R2 Preview reservation

Keep quantgym-v2-preview-media private with r2.dev disabled. Issue one-bucket read/write
credentials, install a 7-day cleanup rule for readiness-smoke/, and restrict CORS to the Preview
web origin when browser upload testing begins.

Prove privacy with the disabled managed r2.dev domain and an empty custom-domain list. The
read-only Cloudflare R2 API does not expose an existing S3 credential scope. Verify the credential
in the provider dashboard, then pass --r2-credential-scope single-bucket-read-write as a
non-secret operator confirmation. The selector must not mint or rotate credentials.

Hash the authenticated JSON tuple [Cloudflare account ID, bucket name, jurisdiction]. Normalize a
missing jurisdiction to default. Fix SigV4 signing region to auto. Verify the endpoint account hash
and require the Preview tuple hash to differ from the production bucket tuple hash.
Pass --r2-jurisdiction and --production-r2-jurisdiction explicitly (default, eu, or fedramp) so
the selector sends cf-r2-jurisdiction from the first bucket request onward.
endpointAccountIdHash is the authenticated account expected by Task 10's actual S3 endpoint
check; this selector does not inspect or authenticate an S3 access key or endpoint.
`;

const signoff = `item,owner_or_value,status,evidence_or_steps
operator,,pending,
budget owner,,pending,
data-reset owner,,pending,
destroy owner,,pending,
resource expiry/review date,,pending,
rollback,,pending,
destroy steps,,pending,
Cloudflare Pages identity and deployment,,pending,redacted provider evidence hash
Render service identities and deployments,,pending,redacted provider evidence hash
PostgreSQL isolation,,pending,distinct resource/database/role; SSL; backup; zero legacy tables
R2 isolation,,pending,private; no r2.dev; bucket-scoped credentials; 7-day lifecycle; Preview CORS
`;

const envTemplate = (names) => `${names.map((name) => `${name}=`).join("\n")}\n`;

const packetFiles = (contract) => ({
  "README.md": readme,
  "cloudflare-pages-runbook.md": cloudflarePagesRunbook,
  "render-services-runbook.md": renderServicesRunbook,
  "postgres-runbook.md": postgresRunbook,
  "r2-runbook.md": r2Runbook,
  "cloudflare-pages-env-template.txt": envTemplate(
    contract.environmentVariablesByScope.cloudflarePages,
  ),
  "render-api-env-template.txt": envTemplate(contract.environmentVariablesByScope.renderApi),
  "render-llm-env-template.txt": envTemplate(contract.environmentVariablesByScope.renderLlm),
  "operator-live-check-env-template.txt": envTemplate([
    ...contract.environmentVariablesByScope.operatorSecrets,
    ...contract.environmentVariablesByScope.operatorEvidence,
  ]),
  "provider-evidence-schema.json": `${JSON.stringify(providerEvidenceSchema, null, 2)}\n`,
  "manual-signoff-checklist.csv": signoff,
});

const safeOutput = (value) => {
  const output = path.resolve(value);
  if (output === defaultRoot || output === path.parse(output).root) {
    throw new Error("refusing unsafe packet output directory");
  }
  return output;
};

export async function buildFrontendUpgradePreviewPacket({ outDir = defaultOutput } = {}) {
  const output = safeOutput(outDir);
  const contract = JSON.parse(await readFile(
    path.join(defaultRoot, "docs/frontend-upgrade/preview-environment.json"),
    "utf8",
  ));
  const files = packetFiles(contract);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  await Promise.all(Object.entries(files).map(([name, source]) => (
    writeFile(path.join(output, name), source, "utf8")
  )));
  return { output, files: Object.keys(files).sort() };
}

const parseArgs = (argv) => {
  if (argv.length === 0) return {};
  if (argv.length === 2 && argv[0] === "--out-dir" && argv[1]) return { outDir: argv[1] };
  throw new Error("usage: build-frontend-upgrade-preview-packet.mjs [--out-dir DIRECTORY]");
};

const isMain = process.argv[1]
  && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
  try {
    const result = await buildFrontendUpgradePreviewPacket(parseArgs(process.argv.slice(2)));
    console.log(`Wrote Preview provider packet to ${result.output} (${result.files.length} files)`);
  } catch (error) {
    console.error(`FAIL: ${error.message}`);
    process.exitCode = 1;
  }
}
