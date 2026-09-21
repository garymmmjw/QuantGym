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

### Guardian access and email notifications

The `/guardian` page has a separate code entry and dashboard. An authenticated
student can view their persistent guardian code in account settings, rotate it,
or revoke access. New cloud sessions provision a 192-bit random code; existing
accounts also receive one lazily when opening guardian settings. Treat the code
as a private capability: anyone the student shares it with can view basic
practice history, set goals/reward descriptions, and request reminder emails.

The API exchanges that code for a dedicated bearer token valid for eight hours
by default. Guardian tokens cannot log in as the student or call account, sync,
personal preparation, admin, or other student APIs. The dashboard returns only a
display name, dated practice counts/question labels, and guardian goals. It does
not expose the registered email address, answers, private notes, job applications,
or the full underlying state. All guardian responses use `private, no-store`.

| Endpoint | Authorization | Result |
| --- | --- | --- |
| `GET /api/guardian/access` | Student bearer | Code, enabled state, goals, SMTP availability |
| `POST /api/guardian/access/rotate` | Student bearer | New code; immediately invalidates every old guardian session |
| `POST /api/guardian/access/revoke` | Student bearer | Disables code, invalidates guardian sessions, cancels open goals and queued mail |
| `POST /api/guardian/session` | `{ "code": "QG-…" }` | Guardian token, expiry, student display name |
| `DELETE /api/guardian/session` | Guardian bearer | Invalidates this guardian session |
| `GET /api/guardian/dashboard?date=YYYY-MM-DD&timeZone=Asia/Shanghai` | Guardian bearer | Selected date's question list, counts, goals, delivery state |
| `POST /api/guardian/goals` | Guardian bearer | Creates `{title,targetCount,startDate,endDate,timeZone,reward}` |
| `DELETE /api/guardian/goals/:id` | Guardian bearer | Cancels an unfinished goal belonging to this student |
| `POST /api/guardian/reminders` | Guardian bearer | Queues `{message}` for the student's registered email only |

Goal dates include both endpoints and use the goal's stored IANA time zone, even
if the viewer changes the dashboard's time zone. A goal accepts 1–100,000 recorded
questions over at most 366 days; title/reward limits are 120/1,000 characters.
There can be up to 30 unexpired unfinished goals and 20 newly created goals per
rolling 24 hours. Rewards are descriptions of an agreement with the guardian;
QuantGym records and emails the achievement and does not purchase or distribute
the reward. Completed goals retain the count recorded when they were achieved.

Solved-question counting uses synced, valid timestamped completion records.
Non-LeetCode problems count only after an explicit completion action such as
**我做完了**: a completed catalog state, a completed standalone technical session,
or a completed daily answer. Random draws, viewed questions, drafts, interview
scores/evaluations, and last-practiced timestamps do not imply completion.
Mental Math, sequence and pattern count **one per training session** in totals
and goals when the session contains at least one closed `correct` or `wrong`
question with a valid completion time, including closed questions in an active
session. Wrong arithmetic inputs that only add a mistake to the current
question do not add a completion. Skips, timeouts and unfinished questions do not
count. The guardian list combines these into one summary per trainer session: for
example, 58 completed questions produce one row with `count: 1`,
`completedCount: 58` and `isSummary: true`, without arithmetic expressions or
answers. A session spanning midnight counts once, on the date of its latest
completed question in the viewer's or goal's time zone.
Detailed question records, including an empty list, take priority over duplicate
trial/activity/legacy aggregates. Historical records without detail use their
stored count (often the correct-only lower bound). Legacy tool records explicitly
store finished `correct` and `incorrect` questions, so both contribute to the
session's displayed completed count; configured total and skipped do not imply
completion. Legacy activity aliases recover that count only through an exact
record ID reference; modern trial details and deletion markers take priority.
Manual entries remain labelled `manual`. Daily-session rollups never add another question. Undated, malformed and future records are
ignored. Offline completions appear after the student's next successful sync.

Standalone technical completions use the canonical `practice:<session.id>`
activity or a deduplicated session fallback. LeetCode-linked standalone practice,
manual catalog checkmarks and local review actions do not count as a LeetCode
solve. Daily coding exercises that are not sourced from LeetCode still count when
explicitly completed. Prompts, reference answers, written answers, linked profile
names and URLs stay out of the guardian response. Non-trainer rows include
`problemNumber` only from explicit source metadata: LeetCode `frontendId`, Purple
Book `provenance.originalNumber`, or an explicit catalog number. Older Purple
Book snapshots may recover the number by exact question ID from the cached
private runtime bundle; saved snapshot metadata takes priority. Missing or invalid
numbers stay blank, and unavailable bundles do not prevent loading the dashboard.
Numbers are never guessed from record IDs, titles, slugs or list positions.

LeetCode counts come only from accepted submissions observed by the server's
public sync for the student's **current** connected profile. Each problem counts
once initially and again when an accepted submission is at least three hours
after that problem's last **counted** acceptance. Records are processed oldest
first; intermediate submissions do not move this anchor, and midnight does not
reset the interval. Local time zones determine which date a counted record
belongs to, not whether it counts. The current profile's verified lifetime solved
count fills gaps in older dated history: cumulative total equals dated completions plus
`max(0, lifetime solved problems − distinct problems in known accepted history)`.
Known qualifying repeat completions remain additional counts. This undated
historical portion does not create question rows, active days, today's progress,
goal progress, or achievement emails. The response exposes `datedCount`,
`undatedLeetcodeCount`, and nullable `leetcodeLifetimeSolvedCount` in `summary`.
Failed submissions, imported metadata, problem-pool draws, unverified profile
totals and calendar submission aggregates do not count. Public sync can
be incomplete and a profile link does not verify ownership. The server stores
private `_syncedAcceptedSubmissions` and `_syncedAcceptedConnection` provenance;
`GET /api/leetcode` projects the safe `syncedSubmissions` array for matching frontend
counters. For the same verified connection, older server-observed `_records`
are also recovered when their IDs were never marked as imported; dedicated synced
ledger entries take priority. Invalid import markers, or missing markers alongside
a reported import history, disable that legacy recovery. Sync preserves previously
observed records for the same connection; switching profiles or disconnecting
resets that scope. Snapshots without a matching connection binding contribute only
after their next successful public sync. Imports cannot
set or promote provenance. Successful sync reevaluates guardian goals in the same
transaction, without waiting for a dashboard visit.

The question list is capped at 200 rows per selected day, with
`questionsTruncated` indicating additional rows; counts cover every eligible row.
Completed goals keep their historical awarded count; this counting correction
does not retract previously issued rewards or resend their notifications.

Guardian emails reuse `QUANTGYM_SMTP_*`. The API starts a durable outbox worker
alongside the HTTP server. Goal completion and its unique notification row commit
in one transaction, are checked during practice sync, and are also reconciled
every 15 seconds. If SMTP is unavailable, a completed goal is shown as complete
with notification status `disabled`; no sent claim is made. Configuring SMTP and
restarting the API lets those notifications resume. An unconfigured manual
reminder returns HTTP 503 and queues nothing. A configured reminder returns HTTP
202 with `pending`; `sent` is recorded only after SMTP accepts it. The dashboard
exposes the latest reminder status, request/sent time, and next permitted time.

Code exchange is limited to 20 attempts per IP per 15 minutes in persistent
database buckets. Reminder cooldowns are enforced across all guardian sessions
and processes for the student: one hour between requests and three per rolling
24 hours by default. Reminder messages accept at most 1,000 characters, and no
endpoint accepts a custom recipient or student ID. Expired code sessions and rate
buckets are cleaned up. Pending mail uses database claim leases, retries SMTP
failures up to eight attempts with backoff (30 seconds through one hour), and
survives API restarts. Enqueueing a completed goal is idempotent; SMTP delivery is
at-least-once across a crash after the provider accepted the message but before
the database recorded `sent`. Retries use a stable Message-ID. Already in-flight
mail may finish during revocation; queued mail is cancelled.

Optional guardian settings:

```bash
export QUANTGYM_GUARDIAN_SESSION_HOURS=8 # clamped to 1–24 hours
export QUANTGYM_GUARDIAN_POLL_SECONDS=15
export QUANTGYM_GUARDIAN_REMINDER_COOLDOWN_SECONDS=3600 # minimum 60
export QUANTGYM_GUARDIAN_REMINDER_DAILY_MAX=3 # 1–10
```

SQLite creates the guardian tables on startup; Postgres uses the matching
idempotent schema initialization in `api-server/postgres/schema.sql`. Use
persistent database storage so codes, goals, cooldowns and pending mail survive
deployments. Backups contain sensitive guardian codes and messages; the default
database exporter redacts them. A safe local test uses a disposable database and
a loopback SMTP fixture only:

```bash
python3 scripts/test-guardian-api.py
```

Optional environment variables:

```bash
export PORT=8790
export QUANTGYM_HOST="0.0.0.0"
export QUANTGYM_DB="/var/data/quantgym.sqlite3"
# Leave SQLite as the default. For a managed Postgres cutover, install
# api-server/requirements.txt and set both values below.
# export QUANTGYM_DB_BACKEND="postgres"
# export QUANTGYM_POSTGRES_DATABASE_URL="postgresql://..."
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
# Private deployments use persistent local disk or a private S3/R2 bucket; never a public media base.
# export QUANTGYM_MEDIA_STORAGE="r2"
# export QUANTGYM_MEDIA_S3_ENDPOINT="https://your-r2-account-id.r2.cloudflarestorage.com"
# export QUANTGYM_MEDIA_S3_BUCKET="quantgym-media"
# export QUANTGYM_MEDIA_S3_REGION="auto"
# export QUANTGYM_MEDIA_S3_ACCESS_KEY_ID="replace-with-real-object-storage-access-key"
# export QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY="replace-with-real-object-storage-secret-key"
# export QUANTGYM_MEDIA_S3_PREFIX="media"
# export QUANTGYM_MEDIA_PUBLIC_BASE_URL="" # Required for private account uploads.
export QUANTGYM_PUBLIC_API_BASE_URL="https://api.quantgym.app"
export QUANTGYM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export QUANTGYM_SESSION_DAYS=30
export QUANTGYM_REQUIRE_INVITE_CODE=1
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

### Render private technical question bundle

The five free-practice catalogs are imported into the API database through an
operator's server session, without committing private question text or adding a
public import endpoint. From the deployed checkout, run one source at a time:

```bash
python3 api-server/import_private_practice.py --source quantguide --expected-count 1201 --stdin
```

Send either a JSON array or `{ "problems": [...] }` on standard input; `--file`
accepts a server-local path instead. `--validate-only` checks the package without
opening a database. The allowed source names are `question-bank`, `quantguide`,
`interview-xiaohongshu`, `interview-onepoint3acres`, and `interview-glassdoor`.
Use the independently verified count for the selected edition. Import validates
private visibility, unique IDs, source ownership, and approved review/chapter
metadata, then atomically upserts that source. It emits only counts, a digest,
and a timestamp. Original provenance, taxonomy, review and source metadata remain
in the stored question document.

Omitted old questions are retired from browsing without deleting their rows,
comments, likes, or personal history. Runtime `privatePracticeCatalog` metadata
identifies the curated source, so later repository catalog imports cannot
overwrite it or restore omitted questions. Authenticated `/api/problems` reads
include active private questions; anonymous reads exclude them. Both responses
disable shared caching. This process does not replace the separate Purple Book
Secret File used by the standalone technical-practice endpoint below.

Synthetic checks: `python3 scripts/test-private-practice-catalog-api.py` and
`python3 scripts/test-free-practice-state-api.py`.

Keep restricted question text outside the public repository. Upload a JSON Secret File named `quantgym-purple-book.json` to the Render API service; the loader reads `/etc/secrets/quantgym-purple-book.json` by default. Set `QUANTGYM_TECHNICAL_BUNDLE_PATH` only to select another runtime path or an ignored local test fixture. The bundle contains `version: 1`, `source: "question-bank"`, a `problems` array, a `supplements` object, and a `metadata` object whose `problemCount` matches the array length. The questions and supplements use one cached snapshot until the process restarts.

If no path override is set and the default file is absent, the API continues using the existing repository question bank and any existing local reading-list file. An explicit missing path, a broken symlink, an invalid bundle, or a file larger than 1 MiB makes the private question endpoint unavailable instead of silently falling back. This does not change the endpoint's existing account access requirements.

Do not commit the real bundle, its source captures, or private release backups. Keep them in ignored `artifacts/` or secure storage, and check the staged diff before publishing. Render Secret Files become runtime files when the service deploys; replacing the file and deploying refreshes the cached edition. See [Render Secret Files](https://render.com/docs/configure-environment-variables#secret-files) for the combined upload limit and runtime paths. Run public synthetic coverage with `python3 scripts/test-technical-source.py`; run the full private review with `QUANTGYM_TECHNICAL_BUNDLE_PATH=/absolute/path/to/private-bundle.json python3 scripts/test-purple-book-catalog.py`.

New accounts require an invitation by default (`QUANTGYM_REQUIRE_INVITE_CODE=1`), including new Google accounts. Existing users retain access. The old beta allowlist applies only when this flag is explicitly disabled. Email signups still require verification. See [invitation registration](../docs/invitation-registration.md) for administrator management, migration and testing.

Set `QUANTGYM_ADMIN_EMAILS` to a comma-separated list of admin emails that may read basic admin metrics and audit events. Accounts whose stored plan/subscription tier is `admin` also pass the admin check.

Email verification is required for local-account cloud registration by default. If SMTP is not configured, the API uses local development mode: it prints the 6-digit code in the API terminal and, by default, returns `devCode` in the JSON response. Set `QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0` outside local development. Configure the SMTP variables above to send real email.

Basic in-process rate limiting is enabled for verification-code, register, login, password reset, and Google login endpoints. The limiter keys by client IP and, where available, normalized email. By default, the API ignores `CF-Connecting-IP`, `X-Real-IP`, and `X-Forwarded-For` so clients cannot spoof IPs to bypass auth limits. Set `QUANTGYM_TRUST_PROXY_HEADERS=1` only behind a trusted proxy, and set `QUANTGYM_TRUSTED_PROXY_CIDRS` to the proxy CIDR ranges that may supply forwarded client IP headers. Tune `QUANTGYM_RATE_LIMIT_WINDOW_SECONDS`, `QUANTGYM_AUTH_RATE_LIMIT_MAX`, and endpoint-specific overrides such as `QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX` or `QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX`; set `QUANTGYM_RATE_LIMIT_DISABLED=1` only for controlled local testing.

Set `QUANTGYM_ALERT_WEBHOOK_URL` to send compact JSON alerts for HTTP errors whose status code is at or above `QUANTGYM_ALERT_MIN_STATUS_CODE` (default `500`). In production, `QUANTGYM_ALERT_WEBHOOK_TOKEN` is required and must be a non-placeholder bearer token of at least 24 characters. The API sends that token as `Authorization: Bearer ...` and signs the exact compact JSON request body as `X-QuantGym-Alert-Signature: sha256=<hmac>`, where the HMAC key is the same webhook token. Alert payloads include service, event type, status code, method, path, message, and timestamp, but not request bodies, bearer tokens, credentials, synced state, or uploaded payloads. The production smoke requires the receiver to acknowledge signature verification with `X-QuantGym-Alert-Verified: 1` or JSON `verified: true`, so a generic 2xx response is not enough for signoff.

Validate alerting and auth rate-limit configuration before deploying:

```bash
npm run check:ops-alerts
npm run check:ops-alerts:runtime-smoke
npm run check:ops-alerts:production-fixture
npm run build:ops-alert-edge-packet
npm run check:ops-alerts:production
```

The runtime smoke starts a temporary local webhook and a temporary API database, triggers a 404, two failed auth logins, one login rate-limit response, and three Google-login attempts with spoofed `X-Forwarded-For` values. It verifies the API sends compact alert payloads with valid bearer token and HMAC signature, without request bodies, credentials, bearer tokens, synced state, community payloads, or problem payloads, and that spoofed forwarded IP headers cannot bypass the Google-login rate limit. The production fixture proves the production signoff gate accepts only a hardened HTTPS webhook, webhook token, sane auth limits, explicit trusted proxy CIDRs when proxy headers are enabled, and complete edge-rate-limit evidence, while rejecting placeholder, local/private-network/raw-IP, credential-bearing, query/fragment-bearing, disabled-limiter, wildcard proxy trust, and incomplete edge-signoff cases without printing raw tokens or full dashboard URLs. It also verifies `--smoke` sends the same signature contract, rejects receivers that do not acknowledge signature verification, and does not deliver a webhook when production configuration checks fail. `npm run build:ops-alert-edge-packet` writes an ignored deployment packet under `artifacts/ops-alert-edge/readiness-packet/` with the Render env template, signed webhook contract, Cloudflare `/api/auth/*` edge-rule runbook, smoke payload, and signoff checklist. The production check requires a non-placeholder HTTPS alert webhook, a webhook token, enabled in-process auth rate limits, sane auth rate-limit thresholds, and an edge signoff with `QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1`, `QUANTGYM_EDGE_RATE_LIMIT_PROVIDER`, `QUANTGYM_EDGE_RATE_LIMIT_NOTES`, and a non-placeholder HTTPS `QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL`; webhook and evidence URLs must use DNS hostnames and must not point at localhost, loopback, private-network addresses, raw IP addresses, embedded credentials, query strings, or fragments. Set those signoff variables only after Cloudflare, Render, or the reverse proxy has edge-level rate limits configured. Add `-- --smoke` only after the production config command passes; smoke mode will fail before external delivery if any configuration check fails and will fail after delivery if the receiver does not return the signature-verification acknowledgement.

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

With the default `QUANTGYM_PRIVATE_WORKSPACES=1`, uploads are served only through authenticated owner requests to `GET /api/media/:id`, with private, no-store responses. For a deployment with an attached persistent disk, set `QUANTGYM_MEDIA_STORAGE=local` and `QUANTGYM_MEDIA_ROOT` to a directory inside that disk, such as `/var/data/media`; the default directory inside the application checkout is not persistent on Render. Leave `QUANTGYM_MEDIA_PUBLIC_BASE_URL` empty. This uses the existing disk without creating another storage resource.

For private S3/R2 storage, configure `QUANTGYM_MEDIA_STORAGE=s3` or `r2` and the `QUANTGYM_MEDIA_S3_*` variables, disable all public bucket access (including R2 custom domains and `r2.dev`), and leave `QUANTGYM_MEDIA_PUBLIC_BASE_URL` empty. In private mode the API rejects object-storage uploads with HTTP 503 before sending any bytes if a public media base is still configured. An empty base URL alone does not change the bucket's permissions: verify those separately. Reads proxy signed object-storage requests through the owner check rather than redirecting to a public URL. The older public-CDN production readiness check applies only to an explicitly enabled legacy sharing deployment; use `scripts/test-private-workspaces-api.py` for the private media contract.

Set `QUANTGYM_PUBLIC_API_BASE_URL` to the public API origin when media API URLs should be stable in production. If that origin is not set, upload responses ignore `X-Forwarded-Host`, `X-Forwarded-Proto`, and `X-Forwarded-Ssl` unless the request comes from a trusted proxy configured through `QUANTGYM_TRUST_PROXY_HEADERS` and `QUANTGYM_TRUSTED_PROXY_CIDRS`.

Validate media storage configuration before deploying:

```bash
npm run check:media-storage
npm run check:media-storage:runtime-smoke
npm run check:media-storage:production-fixture
npm run build:media-storage-packet
npm run check:media-storage:production
npm run check:media-storage:production -- --live
```

The local configuration check accepts disk-backed development storage. The runtime smoke starts a temporary API, registers a local account, uploads a tiny image through `/api/media`, verifies the persisted file, downloads it back through `GET /api/media/:id`, checks the database row and audit event, verifies direct-client spoofed forwarded host/proto headers do not control returned media URLs, and verifies unauthenticated, unsupported-type, and oversize failures. The production fixture proves the production gate rejects local storage, HTTP/local/private-network/raw-IP/placeholder endpoints, credential-bearing or query/fragment-bearing endpoint/public-base URLs, missing or raw public URL origins, raw provider object-storage public hosts, placeholder/short credentials, unsafe bucket names or object prefixes, oversized JSON envelopes, and unsafe timeouts; it also runs the live smoke against fake S3/CDN servers and verifies signed PUT, signed GET, public GET with Content-Type preserved, signed DELETE, and cleanup after a simulated CDN failure. `npm run build:media-storage-packet` writes an ignored deployment packet under `artifacts/media-storage/readiness-packet/` with the Render env template, R2/S3 bucket/CDN runbook, object-storage contract, and live-smoke checklist. The production check requires an object-storage backend, complete S3/R2 credentials, HTTPS endpoints, a DNS-safe bucket, a safe object prefix, a non-local public media base URL, and an upload size that still fits within the JSON request body limit after base64 expansion; object-storage and public media URL hosts must use DNS hostnames and must not point at localhost, loopback, private-network addresses, raw IP addresses, embedded credentials, query strings, fragments, or raw provider object-storage public hosts. It reports redacted bucket/credential presence only and does not upload files to the production bucket unless `--live` is explicitly passed. The live mode writes one tiny `readiness-smoke/` object, verifies signed PUT, signed GET, public CDN/base URL GET with Content-Type preserved, and then deletes the object.

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

The repository also includes a Postgres schema mirror at `api-server/postgres/schema.sql` and an optional Postgres runtime path selected with `QUANTGYM_DB_BACKEND=postgres`. SQLite remains the default and uses only the Python standard library. A managed Postgres deployment must install `api-server/requirements.txt` so `psycopg` is available, then set `QUANTGYM_POSTGRES_DATABASE_URL` or `DATABASE_URL`. Run the cutover readiness gate after API schema changes or before planning a public multi-user deployment:

```bash
npm run check:postgres-cutover
npm run check:postgres-cutover:export-smoke
npm run check:api-postgres-runtime-adapter
npm run check:postgres-cutover:deployed-health
npm run build:postgres-cutover-packet
```

The schema gate compares the checked-in Postgres DDL against the current SQLite schema, rejects SQLite-only DDL syntax, checks that JSON and timestamp columns are typed as `jsonb` and `timestamptz`, and validates local SQLite integrity, foreign keys, JSON payloads, and timestamp shapes. The export smoke starts a temporary API database, generates both a default redacted export and an `--include-sensitive` export, verifies password/session/code hashes, JSON payloads including `tags_json`, audit PII, problem text, and media storage paths are redacted by default, confirms the cutover checker rejects redacted or row-limited/truncated exports when `--require-sensitive-export` is set, and verifies the final `--cutover-complete` signoff shape against fixture hashes, row counts, observed runtime backend, and runtime health URL. The deployed health check records the current `https://api.quantgym.app/api/health` database backend and stays partial while production reports SQLite. The final signoff also rejects raw IP or malformed target hosts, unsafe database names, future timestamps, source/export SHA mismatches, target row-count mismatches, inactive app database confirmation, non-Postgres runtime backend evidence, missing backup confirmation, private-network evidence/runtime health URLs, and evidence/runtime health URLs with raw IPs, embedded credentials, query strings, or fragments. A real secured cutover must use a protected full export, not a redacted summary or sampled artifact:

```bash
python3 scripts/export-api-sqlite.py --db "$QUANTGYM_DB" --out /secure/quantgym-sqlite-export.json --include-sensitive
python3 scripts/check-postgres-cutover.py --db "$QUANTGYM_DB" --export /secure/quantgym-sqlite-export.json --require-sensitive-export
python3 scripts/import-api-sqlite-export-to-postgres.py --export /secure/quantgym-sqlite-export.json --out /secure/quantgym-postgres-import.sql --replace --init-schema
```

`npm run build:postgres-cutover-packet` writes an ignored migration-window handoff under `artifacts/postgres-cutover/readiness-packet/` with secure-export steps, guarded import commands, rollback/backup checklist, final signoff env template, and a live cutover checklist. The generated SQL is sensitive and should be stored only in a protected location. After manually reviewing it, you can execute through the same guarded importer with `--execute --init-schema --database-url "$DATABASE_URL"`; use `--execute-driver psycopg` when the runtime has Python `psycopg` but not the `psql` CLI. `--init-schema` initializes an empty managed Postgres target with the checked-in schema before applying the import. Destructive replacement requires both `--replace` and `--confirm-replace`. Do not mark the cutover complete until the API runtime adapter has been deployed and `/api/health` reports the live backend as `postgres`. `npm run check:api-postgres-runtime-adapter` verifies the runtime selection and health shape locally with a fake `psycopg` module, without contacting a real database. `npm run check:postgres-import:psycopg-fixture` verifies the direct Python execution driver without printing database URLs. After the managed Postgres import is complete and the deployed API is pointed at that database, run the final signoff gate with `QUANTGYM_POSTGRES_CUTOVER_STATUS=complete`, a plain managed Postgres DNS target host/database, completion timestamp, HTTPS evidence URL without credentials/query/fragment, source DB SHA-256, export SHA-256, target row count, app-DB-active confirmation, `QUANTGYM_POSTGRES_CUTOVER_RUNTIME_BACKEND=postgres`, `QUANTGYM_POSTGRES_CUTOVER_RUNTIME_HEALTH_URL` pointing at the deployed `/api/health`, and backup confirmation:

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
