# QuantGym API Server

SQLite-backed API for QuantGym accounts, public and user problem catalogs, per-user problem states, training state, resources, history, network notes, and community posts.

## Start

From the project root:

```bash
python3 api-server/server.py
```

Default API base:

```text
http://127.0.0.1:8790/api
```

The SQLite file is created at:

```text
api-server/data/quantgym.sqlite3
```

## Configuration

Optional environment variables:

```bash
export PORT=8790
export QUANTGYM_HOST="0.0.0.0"
export QUANTGYM_DB="/var/data/quantgym.sqlite3"
export QUANTGYM_PROBLEM_CATALOG="/absolute/path/problem-catalog.json"
export QUANTGYM_JOBS_CATALOG="/absolute/path/jobs-catalog.json"
# Production-like deployments default to the public ATS static feed on beta.quantgym.app.
# Set this only to override the default with another real HTTPS crawler/vendor feed.
# export QUANTGYM_JOBS_SOURCE_URL="https://jobs.vendor.example/quantgym/jobs.json"
# export QUANTGYM_JOBS_SOURCE_TOKEN="<24+ character feed bearer token>"
export QUANTGYM_JOBS_SOURCE_CACHE_SECONDS=300
export QUANTGYM_MEDIA_ROOT="/var/data/media"
export QUANTGYM_MEDIA_MAX_BYTES=5242880
export QUANTGYM_MEDIA_STORAGE="local" # local/disk for development or small private beta only
# Production/public launch media must use real S3/R2-compatible object storage plus a CDN/public base URL.
# export QUANTGYM_MEDIA_STORAGE="r2"
# export QUANTGYM_MEDIA_S3_ENDPOINT="https://your-r2-account-id.r2.cloudflarestorage.com"
# export QUANTGYM_MEDIA_S3_BUCKET="quantgym-media"
# export QUANTGYM_MEDIA_S3_REGION="auto"
# export QUANTGYM_MEDIA_S3_ACCESS_KEY_ID="replace-with-real-object-storage-access-key"
# export QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY="replace-with-real-object-storage-secret-key"
# export QUANTGYM_MEDIA_S3_PREFIX="media"
# export QUANTGYM_MEDIA_PUBLIC_BASE_URL="https://media.quantgym.app"
export QUANTGYM_PUBLIC_API_BASE_URL="https://api.quantgym.app"
export QUANTGYM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export QUANTGYM_SESSION_DAYS=30
export QUANTGYM_BETA_EMAIL_ALLOWLIST="tester1@example.com,tester2@example.com"
export QUANTGYM_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
export QUANTGYM_RATE_LIMIT_WINDOW_SECONDS=60
export QUANTGYM_AUTH_RATE_LIMIT_MAX=30
export QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX=5
export QUANTGYM_TRUST_PROXY_HEADERS=1
export QUANTGYM_TRUSTED_PROXY_CIDRS="173.245.48.0/20,103.21.244.0/22"
export QUANTGYM_ALERT_WEBHOOK_URL="https://alerts.example.com/quantgym-alerts"
# Generate a real value with: openssl rand -base64 32
export QUANTGYM_ALERT_WEBHOOK_TOKEN="<32+ character random bearer token>"
export QUANTGYM_ALERT_MIN_STATUS_CODE=500
# Set these only after Cloudflare, Render, or the reverse proxy has edge-level rate limits configured.
# export QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1
# export QUANTGYM_EDGE_RATE_LIMIT_PROVIDER="cloudflare"
# export QUANTGYM_EDGE_RATE_LIMIT_NOTES="Cloudflare edge rule covers /api/auth/* bursts by IP."
# export QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL="https://dash.cloudflare.com/account/rulesets/rule"
export QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
export QUANTGYM_EMAIL_CODE_TTL_MINUTES=10
export QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS=60
export QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
export QUANTGYM_SMTP_HOST="smtp.resend.com"
export QUANTGYM_SMTP_PORT=587
export QUANTGYM_SMTP_USERNAME="resend"
export QUANTGYM_SMTP_PASSWORD="<Resend API key>"
export QUANTGYM_SMTP_FROM="QuantGym <no-reply@quantgym.app>"
```

For local development, CORS defaults to `*` and `QUANTGYM_HOST` defaults to `127.0.0.1`. For deployment, set `QUANTGYM_ALLOWED_ORIGINS` to the production web origin and set `QUANTGYM_HOST=0.0.0.0` only when the platform or reverse proxy needs a non-loopback listener.

Set `QUANTGYM_BETA_EMAIL_ALLOWLIST` during a closed beta to accept only those exact email addresses for local-account registration/login and Google cloud sessions. Leave it empty for local development.

Set `QUANTGYM_ADMIN_EMAILS` to a comma-separated list of admin emails that may read basic admin metrics and audit events. Accounts whose stored plan/subscription tier is `admin` also pass the admin check.

Email verification is required for local-account cloud registration by default. If SMTP is not configured, the API uses local development mode: it prints the 6-digit code in the API terminal and, by default, returns `devCode` in the JSON response. Set `QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0` outside local development. Configure the SMTP variables above to send real email.

Basic in-process rate limiting is enabled for verification-code, register, login, password reset, and Google login endpoints. The limiter keys by client IP and, where available, normalized email. By default, the API ignores `CF-Connecting-IP`, `X-Real-IP`, and `X-Forwarded-For` so clients cannot spoof IPs to bypass auth limits. Set `QUANTGYM_TRUST_PROXY_HEADERS=1` only behind a trusted proxy, and set `QUANTGYM_TRUSTED_PROXY_CIDRS` to the proxy CIDR ranges that may supply forwarded client IP headers. Tune `QUANTGYM_RATE_LIMIT_WINDOW_SECONDS`, `QUANTGYM_AUTH_RATE_LIMIT_MAX`, and endpoint-specific overrides such as `QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX` or `QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`; set `QUANTGYM_RATE_LIMIT_DISABLED=1` only for controlled local testing.

Set `QUANTGYM_ALERT_WEBHOOK_URL` to send compact JSON alerts for HTTP errors whose status code is at or above `QUANTGYM_ALERT_MIN_STATUS_CODE` (default `500`). In production, `QUANTGYM_ALERT_WEBHOOK_TOKEN` is required and must be a non-placeholder bearer token of at least 24 characters. Alert payloads include service, event type, status code, method, path, message, and timestamp, but not request bodies, bearer tokens, credentials, synced state, or uploaded payloads.

Validate alerting and auth rate-limit configuration before deploying:

```bash
npm run check:ops-alerts
npm run check:ops-alerts:runtime-smoke
npm run check:ops-alerts:production-fixture
npm run build:ops-alert-edge-packet
npm run check:ops-alerts:production
```

The runtime smoke starts a temporary local webhook and a temporary API database, triggers a 404, two failed auth logins, one login rate-limit response, and three Google-login attempts with spoofed `X-Forwarded-For` values. It verifies the API sends compact alert payloads without request bodies, credentials, bearer tokens, synced state, community payloads, or problem payloads, and that spoofed forwarded IP headers cannot bypass the Google-login rate limit. The production fixture proves the production signoff gate accepts only a hardened HTTPS webhook, webhook token, sane auth limits, explicit trusted proxy CIDRs when proxy headers are enabled, and complete edge-rate-limit evidence, while rejecting placeholder, local/private-network, credential-bearing, query/fragment-bearing, disabled-limiter, wildcard proxy trust, and incomplete edge-signoff cases without printing raw tokens or full dashboard URLs. `npm run build:ops-alert-edge-packet` writes an ignored deployment packet under `artifacts/ops-alert-edge/readiness-packet/` with the Render env template, webhook contract, Cloudflare `/api/auth/*` edge-rule runbook, smoke payload, and signoff checklist. The production check requires a non-placeholder HTTPS alert webhook, a webhook token, enabled in-process auth rate limits, sane auth rate-limit thresholds, and an edge signoff with `QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1`, `QUANTGYM_EDGE_RATE_LIMIT_PROVIDER`, `QUANTGYM_EDGE_RATE_LIMIT_NOTES`, and a non-placeholder HTTPS `QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL`; webhook and evidence URLs must not point at localhost, loopback, private-network addresses, embedded credentials, query strings, or fragments. Set those signoff variables only after Cloudflare, Render, or the reverse proxy has edge-level rate limits configured. Add `-- --smoke` to either config command when you want to send one safe test alert to the configured webhook.

Production-like deployments default to the public ATS static feed at `https://beta.quantgym.app/data/jobs/public-ats-feed.json` when `QUANTGYM_JOBS_SOURCE_URL` is unset. Set `QUANTGYM_JOBS_SOURCE_URL` to override that default with another crawler or vendor JSON feed for `/api/jobs`. The feed may return an array, `{ "jobs": [...] }`, `{ "items": [...] }`, `{ "results": [...] }`, or nested `{ "data": { "jobs": [...] } }`; items are normalized to the existing job schema and cached for `QUANTGYM_JOBS_SOURCE_CACHE_SECONDS`. If `QUANTGYM_JOBS_SOURCE_TOKEN` is set, the API sends it as a bearer token. The local catalog remains a fallback if the source is missing or temporarily unavailable.

Validate the local catalog and production feed configuration before deploying:

```bash
npm run check:jobs-source
npm run check:jobs-source:runtime-smoke
npm run check:jobs-source:production-fixture
npm run check:jobs-feed:static
npm run build:jobs-feed:publication-packet
npm run check:jobs-source:production
npm run check:jobs-source:production -- --live
npm run check:jobs-api:deployed-source
```

The runtime smoke starts a temporary feed and API, verifies the API sends the bearer token, merges source and local catalog jobs, prefers source data for duplicate ids, uses the source cache, supports POST type filtering, sanitizes invalid source `postedAt` values, and falls back to the local catalog when the source fails. The production fixture proves the production gate accepts the default public ATS feed, accepts explicit hardened HTTPS feeds, rejects HTTP, localhost/private-network, credential-bearing, query-bearing, placeholder, bad cache/timeout/size, short or placeholder token, missing fulltime, and duplicate-catalog cases, and runs `--live` against a fake feed to reject internship-only, duplicate-id, invalid-URL, defaulted metadata, invalid/future `postedAt`, invalid JSON, oversized payload, and missing-token responses. `npm run build:jobs-feed:publication-packet` writes an ignored handoff packet under `artifacts/jobs-feed/publication-packet/` with a generated public-ATS feed snapshot, SHA-256, source list, stable HTTPS hosting runbook, production env template, and live-signoff checklist. The production check requires a non-placeholder HTTPS source URL, either explicitly configured or defaulted to the public ATS feed, sane cache/timeout/size settings, and a valid local fallback catalog; explicit source URL hosts must not point at localhost, loopback, or private-network addresses, and production source tokens must not be placeholders or short secrets when configured. Add `-- --live` to fetch the configured/default source and validate that it returns both internship and fulltime roles, unique ids, valid HTTP(S) URLs, and real company/title/postedAt fields with valid, non-future dates rather than defaults. `QUANTGYM_JOBS_SOURCE_TOKEN` is optional in the API and intentionally absent for the public ATS feed, but recommended for non-public crawler or vendor feeds; the check reports a warning if it is absent.

By default, media uploads are written under `QUANTGYM_MEDIA_ROOT`, which is acceptable for local development and tightly controlled private beta deployments with persistent disk. Set `QUANTGYM_MEDIA_STORAGE=s3` or `r2` plus the `QUANTGYM_MEDIA_S3_*` variables to store uploads in an S3-compatible bucket such as Cloudflare R2. Without `QUANTGYM_MEDIA_PUBLIC_BASE_URL`, `GET /api/media/:id` proxies the object through the API; with it, upload responses return public media URLs and `GET /api/media/:id` redirects to the public object URL. Public production signoff requires object storage plus a CDN/public base URL, and the `--live` check must write, read, publicly fetch, and delete one tiny readiness object. Set `QUANTGYM_PUBLIC_API_BASE_URL` to the public API origin when API read-through media URLs should be stable in production. If that origin is not set, upload responses ignore `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Ssl` unless the request comes from a trusted proxy configured through `QUANTGYM_TRUST_PROXY_HEADERS` and `QUANTGYM_TRUSTED_PROXY_CIDRS`.

Validate media storage configuration before deploying:

```bash
npm run check:media-storage
npm run check:media-storage:runtime-smoke
npm run check:media-storage:production-fixture
npm run build:media-storage-packet
npm run check:media-storage:production
npm run check:media-storage:production -- --live
```

The local configuration check accepts disk-backed development storage. The runtime smoke starts a temporary API, registers a local account, uploads a tiny image through `/api/media`, verifies the persisted file, downloads it back through `GET /api/media/:id`, checks the database row and audit event, verifies direct-client spoofed forwarded host/proto headers do not control returned media URLs, and verifies unauthenticated, unsupported-type, and oversize failures. The production fixture proves the production gate rejects local storage, HTTP/local/private-network/placeholder endpoints, embedded URL credentials, query-bearing public URLs, missing or raw public URL origins, placeholder/short credentials, unsafe bucket names or object prefixes, oversized JSON envelopes, and unsafe timeouts; it also runs the live smoke against fake S3/CDN servers and verifies signed PUT, signed GET, public GET, signed DELETE, and cleanup after a simulated CDN failure. `npm run build:media-storage-packet` writes an ignored deployment packet under `artifacts/media-storage/readiness-packet/` with the Render env template, R2/S3 bucket/CDN runbook, object-storage contract, and live-smoke checklist. The production check requires an object-storage backend, complete S3/R2 credentials, HTTPS endpoints, a DNS-safe bucket, a safe object prefix, a non-local public media base URL, and an upload size that still fits within the JSON request body limit after base64 expansion; object-storage and public media URL hosts must not point at localhost, loopback, or private-network addresses. It reports redacted bucket/credential presence only and does not upload files to the production bucket unless `--live` is explicitly passed. The live mode writes one tiny `readiness-smoke/` object, verifies signed PUT, signed GET, public CDN/base URL GET, and then deletes the object.

## SQLite Preflight, Export, and Postgres Cutover

Run a read-only SQLite health check before deployments, backups, or a future Postgres cutover:

```bash
python3 scripts/export-api-sqlite.py --db "$QUANTGYM_DB" --summary-only
```

The script runs `PRAGMA integrity_check`, `PRAGMA foreign_key_check`, captures schema, table counts, and writes an ignored JSON artifact under `artifacts/db-export/`. By default, row exports are redacted so local artifacts do not contain password hashes, session hashes, verification code hashes, raw state JSON, audit PII, comments, or media storage paths.

For an actual secured migration or backup export, write to a protected location and opt in to full row contents:

```bash
python3 scripts/export-api-sqlite.py --db "$QUANTGYM_DB" --out /secure/quantgym-sqlite-export.json --include-sensitive
```

The repository also includes a Postgres schema mirror at `api-server/postgres/schema.sql`. Run the cutover readiness gate after API schema changes or before planning a public multi-user deployment:

```bash
npm run check:postgres-cutover
npm run check:postgres-cutover:export-smoke
npm run build:postgres-cutover-packet
```

The schema gate compares the checked-in Postgres DDL against the current SQLite schema, rejects SQLite-only DDL syntax, checks that JSON and timestamp columns are typed as `jsonb` and `timestamptz`, and validates local SQLite integrity, foreign keys, JSON payloads, and timestamp shapes. The export smoke starts a temporary API database, generates both a default redacted export and an `--include-sensitive` export, verifies password/session/code hashes, JSON payloads including `tags_json`, audit PII, problem text, and media storage paths are redacted by default, confirms the cutover checker rejects redacted or row-limited/truncated exports when `--require-sensitive-export` is set, and verifies the final `--cutover-complete` signoff shape against fixture hashes and row counts. The final signoff also rejects malformed target hosts, unsafe database names, private-network evidence URLs, and evidence URLs with embedded credentials, query strings, or fragments. A real secured cutover must use a protected full export, not a redacted summary or sampled artifact:

```bash
python3 scripts/export-api-sqlite.py --db "$QUANTGYM_DB" --out /secure/quantgym-sqlite-export.json --include-sensitive
python3 scripts/check-postgres-cutover.py --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json --require-sensitive-export
python3 scripts/import-api-sqlite-export-to-postgres.py --export /secure/quantgym-sqlite-export.json --out /secure/quantgym-postgres-import.sql --replace
```

`npm run build:postgres-cutover-packet` writes an ignored migration-window handoff under `artifacts/postgres-cutover/readiness-packet/` with secure-export steps, guarded import commands, rollback/backup checklist, final signoff env template, and a live cutover checklist. The generated SQL is sensitive and should be stored only in a protected location. After manually reviewing it, you can execute through the same guarded importer with `--execute --database-url "$DATABASE_URL"`; destructive replacement requires both `--replace` and `--confirm-replace`. After the managed Postgres import is complete and the deployed API is pointed at that database, run the final signoff gate with `QUANTGYM_POSTGRES_CUTOVER_STATUS=complete`, a plain target host/database, completion timestamp, HTTPS evidence URL without credentials/query/fragment, source DB SHA-256, export SHA-256, target row count, app-DB-active confirmation, and backup confirmation:

```bash
npm run check:postgres-cutover:complete -- --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json
```

## Endpoints

- `GET /api/health`
- `POST /api/auth/verification-code`
- `GET /api/auth/account-status`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/reset-password`
- `POST /api/auth/google`
- `GET /api/admin/metrics`
- `GET /api/admin/audit-events?limit=50`
- `POST /api/media`
- `GET /api/media/:id`
- `GET /api/account`
- `PATCH /api/account`
- `GET /api/leaderboard`
- `GET /api/state`
- `PUT /api/state`
- `GET /api/problems`
- `PUT /api/problems`
- `DELETE /api/problems/:id`
- `GET /api/jobs`
- `POST /api/jobs`
- `GET /api/problem-states`
- `PUT /api/problem-states`
- `GET /api/problem-social`
- `GET /api/problem-social/:id`
- `POST /api/problem-social/:id/like`
- `POST /api/problem-social/:id/comments`
- `DELETE /api/problem-social/:id/comments/:commentId`
- `GET /api/community`
- `PUT /api/community`
- `POST /api/sync`
- `GET /api/poker/rooms`
- `POST /api/poker/rooms`
- `GET /api/poker/rooms/:code`
- `POST /api/poker/rooms/:code/join`
- `POST /api/poker/rooms/:code/commands`
- `GET /api/poker/ws/:code` WebSocket, pass `?token=<session token>`

Authenticated endpoints use:

```text
Authorization: Bearer <token>
```

## Notes

- Email/password accounts are hashed server-side with PBKDF2 before storage.
- Public question-bank problems are imported into the `problems` table from `../data/problem-catalog.json` when the API starts.
- Read-only jobs come from `../data/jobs-catalog.json` or `QUANTGYM_JOBS_CATALOG`, optionally merged with `QUANTGYM_JOBS_SOURCE_URL` from a crawler/vendor feed; the endpoint supports `GET /api/jobs?type=internship&max=20` and `POST /api/jobs` for the existing frontend refresh path.
- User-added problems live in the `problems` table with user visibility. Private favorites, practice counters, and latest interview scores live in `user_problem_states`.
- Shared problem likes and comments live in `problem_likes` and `problem_comments`. Social mutations require an authenticated account, and comment deletion is limited to its author.
- Google cloud login requires `QUANTGYM_GOOGLE_CLIENT_ID` and a Google ID token. The API verifies the JWT locally against Google's JWKS, checks the Google issuer, audience, expiry, subject, and verified email, then derives the account id/email from those verified claims instead of trusting frontend account fields.
- Email/password accounts can reset passwords with the same email-code table used by registration. Resetting a password invalidates existing sessions for that user and returns a fresh session.
- Basic admin observability is available through `GET /api/admin/metrics` and `GET /api/admin/audit-events`; both require an authenticated admin account and power the account-page ops overview. Audit events cover verification-code sends, register/login/password-reset/Google-login outcomes, account updates, admin reads, and HTTP 4xx/5xx route errors without storing passwords, tokens, credentials, synced state, community payloads, or uploaded problem payloads. Metrics include 24h auth activity and HTTP error aggregates, and optional webhook delivery can route server-side HTTP errors to an external alert receiver.
- Authenticated media uploads use `POST /api/media` with a base64 `dataUrl`; the API stores the file under `QUANTGYM_MEDIA_ROOT` or an S3/R2-compatible bucket, records metadata in SQLite, and returns a stable URL. Community posts, account avatars, Memory resource images, and interview answer attachments prefer this URL path so large image/file data does not live inside state JSON.
- Poker is authenticated, play-money-only, and server-authoritative for dealing/actions. The beta runs a single shared table by default (`QUANTGYM_POKER_ROOM_CODE`, default `QG-MAIN`); once seats are full, additional logged-in users become spectators when `allowSpectators` is enabled. Room/session snapshots are persisted in SQLite for restart recovery; live WebSocket broadcasts still assume a single API instance unless a shared pub/sub layer is added.
