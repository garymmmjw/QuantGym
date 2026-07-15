# Frontend v2 Preview environment runbook

This packet describes the temporary Phase 0 isolation probes. Provisioning is an authenticated
operator action performed only after the separate authorization checkpoint. The probes do not
import the product application, legacy schema, private catalog, OpenAI integration, or a database.

## Ownership and lifecycle

Before provisioning, record the operator, budget owner, data-reset owner, destroy owner, resource
expiry/review date, rollback steps, and destroy steps in the sign-off checklist. Phase 0 resources
must have an explicit owner and review date; absence of either blocks provisioning.

## Cloudflare Pages

- Project: `quantgym-v2-preview`.
- Repository: `garymmmjw/QuantGym`.
- Production branch: `codex/frontend-v2-preview`.
- Build command: `npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview`.
- Destination directory: `dist-preview`.
- The build must receive only the variables in `cloudflare-pages-env-template.txt`.
- `CF_PAGES_COMMIT_SHA` must equal `QUANTGYM_PREVIEW_COMMIT`; `CF_PAGES_BRANCH` must equal
  `QUANTGYM_PREVIEW_BRANCH` and the contracted branch.

The minimal three-file probe has no current app bundle, v1 catalog, private question data, jobs
data, root runtime config, Google OAuth config, or browser LLM endpoint. It exposes only
`environment`, `service="web"`, `commit`, `branch`, `buildSource="cloudflare-pages"`, and the exact
Preview API base. The operator forms that base from `QUANTGYM_PREVIEW_API_ORIGIN` plus `/api/v2`
and supplies it as `QUANTGYM_PREVIEW_API_BASE` at deploy time. The browser receives only the Preview API base.

## Render probes

Create two separate services from the same exact repository commit:

| Purpose | Name | Provider type | Visibility | `QUANTGYM_PREVIEW_SERVICE` |
| --- | --- | --- | --- | --- |
| API | `quantgym-v2-preview-api` | `web_service` | public | `api` |
| LLM | `quantgym-v2-preview-llm` | `private_service` | private | `llm` |

Both services use repository `https://github.com/garymmmjw/QuantGym`, branch
`codex/frontend-v2-preview`, native Node runtime `20.20.2`, build command `npm ci`, and start
command `node scripts/serve-frontend-upgrade-preview-probe.mjs`. Place `NODE_VERSION=20.20.2`
directly on each service as provider runtime configuration; Render's read-only service env-var
endpoint excludes linked environment-group values. Put both services in the same Render region so
private networking is available. Task 10 creates a separate Preview environment group; pass its
exact provider ID with `--preview-environment-group-id`. The selector hashes that explicit ID,
requires every approved group to link only Preview services, requires each service's complete
linked-group set to be a subset of the approved IDs, and rejects any production-group overlap.
Service-level-only configuration remains valid when no Preview group is used. Production
environment-group arrays may be empty.

The API sets `QUANTGYM_PREVIEW_LLM_INTERNAL_URL` to the private LLM origin and
`QUANTGYM_PREVIEW_CORS_ORIGIN` to the actual Preview Pages origin. It serves health only at
`/api/v2/health`, calls the LLM only at `/health`, permits only the configured Preview origin, and
does not grant CORS to `https://beta.quantgym.app` or unrelated origins. Both probes read Render's
`PORT`, bind `0.0.0.0`, and require `QUANTGYM_PREVIEW_COMMIT` to match `RENDER_GIT_COMMIT`.
Use the LLM Dashboard Service Address, whose host is
`quantgym-v2-preview-llm-<render-hash>` with its assigned port. Form the internal origin as
`http://<service-address>`; a private service must not use an `onrender.com` public origin.

The API response reports booleans and the verified LLM commit. It never returns the internal LLM
origin. The probes do not import `api-server/server.py`, read `api-server/postgres/schema.sql`, call
OpenAI, or write a database.

## PostgreSQL reservation

Reserve `quantgym-v2-preview-postgres` with a distinct provider resource, database, and role.
Require SSL, define a backup policy, and verify that the `public` schema contains zero legacy
tables. There is no use of `scripts/import-api-sqlite-export-to-postgres.py` or
`api-server/postgres/schema.sql` in Phase 0.

PostgreSQL and R2 are reserved, independently verified resources in Phase 0; the temporary API probe is intentionally not bound to either. Phase 1 performs the first application binding and schema migration.

## Cloudflare R2 reservation

Reserve private bucket `quantgym-v2-preview-media`. Keep `r2.dev` disabled, issue one-bucket
read/write credentials, and install a 7-day cleanup rule for `readiness-smoke/`. When browser
upload testing begins, restrict CORS to the actual Preview Pages origin.

Authenticated privacy evidence comes from the bucket's disabled managed `r2.dev` domain and an
empty custom-domain list. The read-only Cloudflare R2 API does not expose an existing S3
credential scope. After verifying the one-bucket read/write credential in the provider dashboard,
the operator supplies the non-secret confirmation
`--r2-credential-scope single-bucket-read-write`; the selector never creates or rotates a
credential.

R2 identity is the authenticated tuple `(Cloudflare account ID, bucket name, jurisdiction)`,
encoded as the JSON array of those three strings before SHA-256 hashing. Normalize a missing
jurisdiction to `default`. SigV4 signing region is fixed to `auto`; it is not inferred from the
jurisdiction. The endpoint account identifier must hash to the authenticated Cloudflare account
identifier.
Pass the non-secret Preview and production jurisdictions explicitly so the selector sends
`cf-r2-jurisdiction` on the first bucket request as well as every subsequent Preview R2 request.
`endpointAccountIdHash` records the authenticated account expected by the later S3 endpoint
check; Task 10 must extract the account from the actual endpoint and compare it. This selector does
not inspect or claim to authenticate an S3 access key or endpoint.

## Secret boundaries

The browser never receives an OpenAI key, R2 secret, Postgres URL, or internal LLM URL. No OpenAI key is configured anywhere in the Phase 0 probes. Cloudflare and Render service variables must
not contain the operator's provider credentials.

`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `RENDER_API_KEY` are read from the operator
process environment. They remain blank in the operator
template, are never configured on Pages or Render services, and are unset after the check:
The provider tokens are operator-only and must be unset after the check.

```sh
unset CLOUDFLARE_API_TOKEN CLOUDFLARE_ACCOUNT_ID RENDER_API_KEY
```

Also unset the operator-only Postgres and R2 credentials after the live checks. Never paste them
into a command line, tracked file, ticket, console transcript, or provider service variable.

## Authenticated provider evidence

Generate the operator packet before capturing provider evidence. The packet builder replaces its
ignored output directory, so rerunning it after evidence capture removes the redacted evidence and
requires a fresh authenticated capture.

Run the evidence selector with the expected deployed commit and non-secret ownership labels:

```sh
npm run build:frontend-upgrade:provider-evidence -- \
  --expected-commit EXPECTED_COMMIT \
  --operator OPERATOR \
  --budget-owner BUDGET_OWNER \
  --destroy-owner DESTROY_OWNER \
  --r2-credential-scope single-bucket-read-write \
  --r2-jurisdiction default \
  --production-r2-jurisdiction default \
  --preview-environment-group-id PREVIEW_ENV_GROUP_ID
```

The production CLI calls only the Cloudflare and Render HTTPS APIs. It keeps complete successful
responses in memory only, immediately selects the allowlist, hashes raw account, project,
workspace, service, group, Postgres resource, host, database, and role identifiers, then writes
exactly
`artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json`.

The selector follows every Render list page before proving environment-group isolation. It reads
only `NODE_VERSION` and the API's non-secret `QUANTGYM_PREVIEW_LLM_INTERNAL_URL` from service
variables, binds that origin to the authenticated LLM private-service address, and discards every
other value. It parses the Preview Postgres external host from sensitive connection info entirely
in memory and validates the read-only recovery status before recording only hashes. Cloudflare R2
privacy, CORS, and the 7-day lifecycle are selected from their dedicated read-only endpoints.

The allowlist contains capture time, authenticated source, operator, budget owner, destroy owner,
strict Pages deployment attributes, strict Render service and deployment attributes, complete
linked-group hashes, Postgres hashes, and the R2 identity/configuration fields. Preview and
production resource hashes must differ. Empty production environment-group arrays are valid.
The source label explicitly distinguishes Cloudflare/Render API evidence from the operator's R2
credential-scope attestation; the selector does not claim that Cloudflare's API proves that scope.

Raw provider responses, analytics tokens, deployment environment metadata, and credentials must
never reach disk, stdout, or stderr. HTTP failures report only provider name, status code, and a
non-sensitive request ID; response bodies are not read or logged. The packet records only the
redacted evidence file and its SHA-256. Compute and record it with:

```sh
shasum -a 256 artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json
```

Do not save screenshots, HAR files, dashboard exports, raw JSON responses, or copied provider
payloads in the repository.

## Rollback and destruction

Rollback means removing Preview DNS/exposure and disabling the two temporary probe services; it
does not alter production. Destruction removes the Pages project, both Render services, Preview
PostgreSQL resource, Preview R2 credentials and objects, and the bucket after evidence has been
reviewed. Record completion and the responsible destroy owner in the checklist.
