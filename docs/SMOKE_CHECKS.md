# Manual Smoke Checks (Guide §6.2)

## 2026-06-07 — Strict route/browser audit

Automated gate:

```bash
npm run build
npm run check:stage1
npm run check:stage2
npm run check:stage2:full
npm run check:stage2:strict
```

Results: build OK; stage1 OK with expected React-owned module warnings;
stage2 bridge/full/strict OK. Build still reports the expected classic-script
and main chunk size warnings.

Latest static gate rerun: 2026-06-08. `git diff --check`,
`npm run check:stage1`, `npm run check:stage2`,
`npm run check:stage2:full`, `npm run check:stage2:strict`, and
`npm run build` passed after the Poker online fallback fix, Library real cloud reader iframe
verification, Resume endpoint smoke, Settings Google Client ID save/clear smoke,
external-link in-app Browser boundary inventory, independent Google Chrome
external-link popup sign-off, all-route desktop/mobile visual smoke, screenshot
evidence update, all-route GitHub baseline parity evidence, and documentation
update. Build still reports the expected classic-script, chunk-size, and
empty-endpoint warnings.

Latest external config audit: 2026-06-08. Current `config.js` has empty
`cloudApiEndpoint`, `llmEndpoint`, and `googleClientId`, with
`googleLoginEnabled=false`; no local services listen on `127.0.0.1:8787` or
`127.0.0.1:8790`; the shell environment does not expose `OPENAI_API_KEY`,
`QUANTGYM_GOOGLE_CLIENT_ID`, or `LLM_AUTH_API_BASE`. Production LLM/PDF endpoint
and real Google-provider account sign-off therefore require real deployment
configuration/credentials.

Latest external-boundary UI smoke: 2026-06-08. With empty runtime config and no
local `8787`/`8790` services, real Chrome verified logged-out Login, authenticated
Settings, and Resume local fallback remain stable with no pageerror, no overlay,
and no document-level horizontal overflow. Evidence:
`315-external-boundary-login-no-google.png`,
`316-external-boundary-settings-empty-config.png`,
`317-external-boundary-resume-local-fallback.png`, and
`317-external-boundary-empty-config-summary.json`.

Latest configured local-service smoke: 2026-06-08. After adding local endpoints,
OpenAI key, Google Client ID, and a short-lived Google ID token,
`npm run verify:production-boundaries` reports 5 pass / 0 skip / 0 fail: cloud
health, Google provider config, real Google provider login, LLM resume review,
and LLM PDF question generation all pass. Resume UI also posted to the real
local LLM proxy and rendered review items. Evidence:
`318-resume-real-llm-proxy-review.png`,
`318-resume-real-llm-proxy-review-summary.json`, and
`319-production-boundaries-local-services-summary.json`.
Follow-up in-app Browser check after the final config update rendered the
Google Sign-In iframe with the configured Client ID and did not reproduce the
previous origin warning. Evidence:
`320-iab-google-config-summary.json`.

Static build config follow-up: `scripts/build-static-site.mjs` now reads root
`.env` and `config.js` as public-runtime fallbacks before writing
`dist/config.js`. Local `npm run build` writes the configured `8790/8787`
endpoints and Google Client ID without embedding `OPENAI_API_KEY`; `--strict`
still rejects non-HTTPS local endpoints for beta/production deploys.

UI contract follow-up: `npm run check:ui-contracts` now locks the React route
surface against the most important migrated DOM contracts. It checks all 21
manifest routes, shared app/auth/todo shell ids, key browser-audit JSON
artifacts, and 92 non-empty screenshot artifacts. The JSON evidence check is
content-level: route smoke must stay 21/21 pass for desktop and mobile, browser
route smoke must cover all routes and key interactions, deployed LLM/PDF
endpoint evidence must pass with a cloud session token, Chrome extension popup
runtime capture/copy/open/fallback behavior must pass, GitHub baseline parity
must stay 21/21 pass with zero actionable issues, browser evidence manifest must
report zero missing/invalid artifacts, migration completion must stay
10 pass / 0 pending / 0 fail, production boundary evidence must stay
5 pass / 0 skip / 0 fail, local readiness must stay final-pass or an explicit
production-token-only partial, static build config must not embed the OpenAI
key, and the Google token helper browser smoke must stay renderable. This is not
a replacement for screenshot review, but it catches accidental removal of
route-critical ids such as `problemSearch`, `leaderboardMetricSelect`,
`resumeReview`, `settingsGoogleClientIdInput`, and `todoDockButton`.

Route interaction contract follow-up: `npm run check:route-interactions`
statically verifies key user-interaction wiring across all 21 routes. It covers
forms, buttons, selects, file inputs, safe external links, route jumps,
state-saving handlers, and critical model/API delegation paths. It is not a
replacement for real browser clicks, but it prevents route screens from keeping
their DOM ids while losing the handlers that make them usable.

Ops alert runtime follow-up: `npm run check:ops-alerts:runtime-smoke` starts a
temporary local webhook and API database, triggers a 404 through the actual API
server, then triggers two failed auth logins, one auth rate-limit response, and
three Google-login attempts with spoofed `X-Forwarded-For` values. It now
verifies that the first four webhook payloads arrive with the expected bearer
token, status sequence `404,401,401,429`, ISO timestamps, and no request bodies,
credentials, auth tokens, synced state, community payloads, or problem payloads;
it also verifies spoofed forwarded-IP headers cannot bypass the Google-login
rate limit and that the resulting Google 429 alert is delivered.
The API sanitizes `/api/auth/*` webhook messages before sending them to the
external alert receiver, so auth failure details do not leak into alert systems.
The production config gate now also requires a non-placeholder HTTPS alert
webhook, a 24+ character webhook bearer token, an explicit edge rate-limit
provider, a rule note, and a non-placeholder HTTPS evidence URL before
`QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1` can count as a production signoff.
`npm run check:ops-alerts:production-fixture` runs an isolated production
fixture that proves the gate accepts the hardened shape, rejects placeholder,
localhost, private-network, raw-IP, HTTP, credential-bearing URLs, query/fragment-bearing URLs,
disabled-limiter, excessive-limiter, wildcard proxy trust, and incomplete edge
signoff inputs, keeps raw tokens/full dashboard URLs out of output, and blocks
webhook-smoke delivery whenever production configuration checks fail.

Production-boundary diagnostic follow-up: the verification script now reports
the exact missing item for skipped checks, and the final real-token run is
green. With the current local config and short-lived Google ID token,
`npm run verify:production-boundaries` reports 5 pass / 0 skip / 0 fail,
including cloud health, Google provider config, Google provider login, LLM
resume review, and LLM PDF question generation.

LLM proxy robustness follow-up: Resume review now tolerates model output that is
close to JSON but malformed, extracts actionable review items, and still
returns the frontend contract `{ items }`. This fixed an intermittent
release-readiness failure in the OpenAI-backed `resume_review` smoke.

Release-readiness follow-up: `npm run check:release-readiness` is the strict
final gate and requires production-boundary checks to have no skips. For local
handoff, `npm run check:release-readiness:local` runs the same gate chain with
partial production boundaries allowed and writes
`323-release-readiness-summary.json`. The gate chain now includes media storage
runtime upload/download and production-fixture coverage, Chrome store readiness,
Chrome store publication fixture, popup runtime coverage, jobs source
ingest/cache/fallback and production-fixture coverage, ops alert runtime and
production-fixture coverage, question-bank rights manifest coverage, current
question-bank release blockers, external launch blocker tracking, and Postgres
cutover schema/export/signoff-shape readiness through
`npm run check:postgres-cutover` and `npm run check:postgres-cutover:export-smoke`;
a strict final run still requires a fresh Google provider token when that
boundary is checked. When `check:ui-contracts` is invoked from inside this gate,
it runs after the route/runtime evidence refresh and skips only the content
validation for the prior `323-release-readiness-summary.json` to avoid a stale
self-reference; standalone `npm run check:ui-contracts` still validates the
refreshed release summary, including the nested external launch blocker gate.
Each release-readiness child gate has a default timeout of 180000 ms. For
diagnosing stuck Render/LLM/API deploy checks, override it with
`node scripts/check-release-readiness.mjs --allow-partial-production --gate-timeout-ms <ms> --summary /tmp/quantgym-release-readiness.json`
or `QUANTGYM_RELEASE_GATE_TIMEOUT_MS=<ms>`; timed-out gates are reported in the
JSON summary with `timedOut: true` instead of hanging indefinitely.

Browser evidence manifest follow-up: `npm run check:browser-evidence` scans
`docs/ui-function-regression-audit-2026-06-07.md` and this smoke checklist for
browser-audit screenshot/JSON references. It currently verifies 276 evidence
references: 229 image files and 47 JSON files, with 0 missing, 0 undersized
images, and 0 invalid JSON files. Evidence:
`326-browser-evidence-manifest-summary.json`.

Migration completion audit follow-up: `npm run check:migration-completion`
summarizes final migration sign-off state into
`327-migration-completion-audit-summary.json`. Current status is `pass`:
10 / 10 requirements pass, 0 pending, and 0 fail. Real Google provider account
login is signed off with a short-lived ID token and audience check.

Readiness accounting note: local release readiness now parses the migration
completion audit JSON as well as production-boundary JSON. That means the local
handoff gate now reports final pass when both Migration completion audit and
Production boundaries are fully signed off.

Google token handoff helper: `npm run google:token-helper` creates
`artifacts/google-id-token-helper.html`, served at
`http://127.0.0.1:5179/artifacts/google-id-token-helper.html` while the Vite dev
server is running. The default helper uses the local `config.js` Google Client
ID and is intended for local `verify:production-boundaries` and
`check:release-readiness:local` runs. For deployed service verification, use
`npm run google:token-helper:deployed` instead; it reads
`https://beta.quantgym.app/config.js` and generates a token for the deployed
Google Client ID, which is the audience required by
`npm run verify:production-boundaries:deployed:paste-token`. The generated
helper is ignored by Git and does not write the short-lived Google ID token to
disk. After signing in, copy the token and run
the matching paste-token verifier immediately: use
`npm run verify:production-boundaries:paste-token` for local checks, or
`npm run verify:production-boundaries:deployed:paste-token` for deployed
checks.
For a no-echo interactive handoff, run
`npm run verify:production-boundaries:paste-token`,
`npm run verify:production-boundaries:deployed:paste-token`, or
`npm run check:release-readiness:local:paste-token` and paste the token at the
prompt; the wrapper rejects expired or nearly expired tokens before it launches
the verifier, passes fresh tokens only to the child process environment, and
does not write tokens to disk.
The production-boundary verifier now decodes the token locally and fails fast
for malformed, expired, wrong-issuer, or wrong-audience tokens before it calls
the provider login endpoint.
Real Chrome smoke confirms the helper page renders, including the Google sign-in
button, token textarea, copy button, and `Ready.` status. Evidence:
`324-google-token-helper-summary.json`,
`325-google-token-helper-browser.png`, and
`325-google-token-helper-browser-summary.json`.

Google provider signoff requires a fresh real Google ID token/session whenever
the production-boundary evidence is refreshed. Keep `http://127.0.0.1:5179` and
the production web origin in the OAuth Client's Authorized JavaScript origins;
if the browser warning `The given origin is not allowed for the given client
ID.` returns, re-check that Google Cloud Console setting before debugging app
code.

Production credential sign-off command:

```bash
QUANTGYM_CLOUD_API_ENDPOINT="https://<api-host>/api" \
QUANTGYM_GOOGLE_ID_TOKEN="<real-google-id-token>" \
QUANTGYM_LLM_ENDPOINT="https://<llm-host>/interview" \
QUANTGYM_LLM_BEARER_TOKEN="<optional-quantgym-session-token>" \
npm run verify:production-boundaries
```

## 2026-06-07 — Module/API and browser/CDP deep smoke

The in-app browser automation channel is unstable for screenshots/DOM snapshots
in the latest run, so deep UI checks use the recorded in-app Browser screenshots
where available and independent real Chrome/CDP screenshots/clicks where the
in-app channel times out.

Module-level smoke was run directly against current source modules and passed:

- Settings `saveSettingsFromValues`: verified language, country/region,
  LLM endpoint/model, Cloud API endpoint, Google client id, leaderboard
  location, current-user refresh, and React store sync.
- Problems page API: verified list/pagination view model, completed/saved
  toggles, detail open, answer reveal, pagination delegation, and ranking mode.
- Interview page API: verified start, hint, reveal answer, submit answer,
  favorite, exit, and resume delegation.
- Poker page API: verified table view model, add bot, start hand, player
  action, and table settings delegation.

Browser/CDP deep flows now recorded in
`docs/ui-function-regression-audit-2026-06-07.md` and
`docs/browser-audit-screenshots/`:

- Problems filters/detail/saved/completed/pagination and LeetCode Hot 100.
- Overview leaderboard metric/country/region controls, region row filtering,
  country-region normalization, and reload persistence.
- News seed/filter/detail/back/manual form submit/detail/reload persistence.
- Interview live exit/resume, practice hint/reveal/submit/favorite,
  attachment/voice/export, and PDF source generation with a mock endpoint.
- Poker manual seat/settings plus Tools-to-Poker table/start/action flow.
- Settings save/language/country/sync, Chrome/CDP export/import, reset, and
  logout.
- Account save/avatar upload and clear/resume upload/email change/logout.
- Memory `.tex` upload, small-image dataURL, large-image fallback, reload
  persistence, and latest-history undo.
- Experiences create, edit, stage filter, share-to-community, `sharedPostId`
  writeback, shared badge/counter sync, delete unshared record, and reload
  persistence.
- Messages seeded thread fallback, unread badge refresh, thread click
  mark-read, message send, reload persistence, and Community direct-message
  entry creating/selecting a thread.
- Community media preview/remove, image post publish, remote like/comment, own
  post delete, and reload persistence.
- Poker online-room fallback: invalid cloud endpoint/token triggers URL join and
  `New` private-table failures, React UI falls back to Local, `pokerRoom`
  normalizes to `QG-MAIN`, Fill demo/Start/action remain usable, and reload is
  stable.
- Library real cloud reader iframe: local `api-server` plus a disposable cloud
  account returns reader-token 200 and PDF 206/200, renders the green-book PDF
  in `#libraryReaderFrame`, sets `libraryReaderOpenNew`, closes cleanly, and
  reloads stably.
- Resume live endpoint review: Settings saves the LLM endpoint, Resume posts to
  a temporary compatible `/interview` endpoint, returned review items render in
  `#resumeReview`, and no overlay/overflow/errors are observed.
- Settings Google Client ID config: test Client ID saves and survives reload;
  real keyboard select-all/delete clears it, save persists blank, and reload is
  clean.
- External link boundary inventory/sign-off: News/Jobs/Courses anchors and
  Companies careers button carry safe external URLs; in-app Browser clicks keep
  the local route stable and overlay-free. Independent Google Chrome
  verification confirms News, Jobs, Companies, and Courses all open `_blank`
  popups to the expected external hosts while the original local route remains
  unchanged and significant console logs stay at 0.
- All-route visual smoke: independent Google Chrome rendered all 21 manifest
  routes on desktop `1440x900` and mobile `390x844`; every route-specific key
  selector was visible, pages were non-empty, Vite overlay was absent,
  document-level horizontal overflow was absent, and significant console logs
  stayed at 0. Evidence: `311-chrome-visual-desktop-contact-sheet.jpg`,
  `312-chrome-visual-mobile-contact-sheet.jpg`, and
  `312-chrome-visual-route-smoke-summary.json`.
- All-route GitHub baseline parity: temporary `origin/main` server at
  `http://127.0.0.1:5180/` and current React server at `http://127.0.0.1:5179/`
  were captured with independent Google Chrome for all 21 manifest routes.
  Active-route scoped key selectors are present/visible, no current route has
  overlay, document-level horizontal overflow, pageerror, or real content
  sparsity versus a substantial baseline. Evidence:
  `314-github-parity-baseline-current-contact-sheet.jpg` and
  `314-github-visual-parity-all-routes-summary.json`.
- Production endpoint caveat: Local LLM resume review and PDF generation now
  pass against the real local LLM proxy. Deployed production endpoint sign-off
  still requires running the same `npm run verify:production-boundaries` command
  against production URLs/tokens.

## Matrix

- [x] Root path stays `/` with no `#overview`.
- [x] Direct path refresh works for `/problems`, `/interview`, `/library`, and the remaining manifest paths.
- [x] Old hash compatibility: `/#jobs` redirects to `/jobs` and clears the hash.
- [x] Shell click navigation lands on path URLs, verified with top settings button -> `/settings`.
- [x] Logged-in `/login` redirects to `/`; AppShell is visible and AuthShell is hidden.
- [x] Poker route renders through React and no longer writes `#poker`; default room query may remain as `/poker?pokerRoom=QG-MAIN`.
- [x] Browser route batches rendered all 21 manifest routes with no console errors and no Vite error overlay.
- [x] Regression fixes verified for `/interview` (`getLlmConfig` split-slice ref), `/library` (`getTotalProblems` safe predicate), and `/poker` canonical URL.
- [x] Mobile viewport/top-nav smoke at 390px: `/problems` renders with AppShell visible, AuthShell hidden, no document-level horizontal overflow; authenticated mobile nav is a horizontal top nav and intentionally hides `sidebarToggleBtn`.
- [x] Logged-out logout/login/register flow: logout from `/account` reaches AuthShell, login/register tabs switch, local registration works when cloud verification is unavailable, and React auth guards update after async auth mutations.
- [x] Deep Problems flow: filters, detail, saved/completed, pagination.
- [x] Deep Overview leaderboard flow: metric, country, region, row filtering,
  region option normalization, reload persistence.
- [x] Deep News flow: seed list, filters, detail/back, manual form submit,
  detail link, reload persistence.
- [x] Deep Interview flow: start, hint, answer, favorite, exit/resume.
- [x] Deep Poker actions: sit/add bot/start hand/action buttons/settings.
- [x] Deep Poker online fallback: failed cloud join/create falls back to Local,
  normalizes URL, keeps local table controls usable, and reloads without overlay.
- [x] Settings save and language persistence across reload.
- [x] Settings reset/logout flow: disposable account reset clears current user
  training state, preserves peer state, Memory resource is gone, logout returns
  to `/login`.
- [x] Account profile flow: save, avatar upload/clear, resume upload, email
  password guard/change, reload persistence, logout.
- [x] Deep Memory flow: text resource save, `.tex` file read, small image
  dataURL, large image filename fallback, reload persistence, latest-entry undo.
- [x] Deep Experiences flow: create, edit, stage filter, share to Community,
  shared writeback, delete unshared record, reload persistence.
- [x] Deep Messages flow: seeded threads, unread badge, mark-read, send,
  reload persistence, Community private-message entry.
- [x] Deep Community flow: media preview/remove, publish image post, like,
  comment, delete own post, reload persistence.
- [x] Deep Library cloud reader: authenticated reader-token, PDF iframe
  render, open-new href, close/reset, reload stability.
- [x] Deep Resume endpoint: settings endpoint save, live POST, review render,
  reload-safe UI.
- [x] Settings Google Client ID save/clear persistence.
- [x] External links: News, Jobs, Companies, and Courses open expected
  `_blank` external tabs in Google Chrome and leave the local page stable.
- [x] All-route visual smoke: 21/21 desktop and 21/21 mobile route screenshots
  pass key selector, no-overlay, no-horizontal-overflow, and significant-log
  checks.
- [x] All-route GitHub baseline parity: 21/21 route-level baseline/current
  screenshot pairs pass active-route scoped actionable checks.
- [x] Final local gates: `git diff --check`, Stage 1, Stage 2 bridge, Stage 2
  full, Stage 2 strict, and production build pass with expected warnings only.
- [x] Empty-config external-boundary UI smoke: Login, Settings, and Resume
  fallback remain stable without production endpoints.
- [x] Local LLM/PDF endpoint sign-off with real OpenAI-backed local proxy.
- [x] Static build runtime config carries local public endpoints/client id into
  `dist/config.js` while strict production mode rejects non-HTTPS endpoints.
- [x] UI contract gate: `npm run check:ui-contracts` passes for 21 React routes,
  shell ids, 25 key JSON evidence artifacts, and 92 non-empty screenshot
  artifacts.
- [x] Route interaction contract gate: `npm run check:route-interactions`
  covers all 21 React routes and their key form/button/select/file/link
  interactions.
- [x] Browser route smoke: `npm run check:browser-route-smoke` builds a
  temporary static site, drives local Google Chrome, checks all 21 authenticated
  routes for runtime health, verifies logged-out protected-route redirect plus
  local email registration, logout, password-step, and relogin behavior, and
  clicks key Overview, Skills radar/global-search spotlight, Global search
  module/problem/job/company/course/news navigation, Problems, Tools, Poker demo table start/action/persisted room state, PK match/submit/reveal/record persistence,
  Plan create/edit/task persistence/navigation, Interview
  onboarding/practice answer/favorite/exit/resume, Todo, Community post
  persistence, Messages thread persistence, Experiences
  create/edit/share/delete persistence, News manual
  submit/filter/detail/read/reload persistence, Memory resource persistence,
  Network contact persistence, Resume text persistence, Jobs filter/apply-link
  behavior, Companies tier/practice/careers-link behavior, Library
  search/kind/practice/reader-guard behavior, cross-module Library to Problems
  to Todo to Resume to Settings persistence, Courses path/source/note
  persistence, Account profile persistence, and Settings runtime config
  persistence flows. Known third-party Bilibili `reporter-pb` network-reporting
  errors and exact Chrome `compute-pressure` permissions-policy noise are
  recorded as ignored external console noise instead of failing the app route
  smoke.
- [x] Module ownership gate: `npm run check:module-ownership` verifies all 21
  route modules have an owner group, matching nav group, page file, feature
  entry, state-domain list, and a mapped browser-route-smoke interaction before
  local release-readiness can pass.
- [x] Media storage runtime smoke: `npm run check:media-storage:runtime-smoke`
  starts a temporary API, registers a local account, uploads and downloads a
  tiny image through `/api/media`, verifies local file/database/audit
  persistence, checks unauthenticated, unsupported-type, and oversize failures,
  verifies MIME-derived object extensions when a filename extension disagrees
  with the payload type, verifies direct-client spoofed `X-Forwarded-Host` and
  `X-Forwarded-Proto` headers cannot control returned media URLs, and exercises
  the S3/R2-compatible code path against a temporary fake object store. The
  object-storage branch verifies signed PUT, API read-through signed GET, `s3:`
  database storage paths, and public CDN URL redirect behavior.
- [x] Media storage production fixture: `npm run check:media-storage:production-fixture`
  proves the production gate accepts only object storage with HTTPS endpoint,
  redacted credentials, CDN/public URL, sane upload envelope, and safe timeout;
  it rejects local/HTTP/localhost/private-network/raw-IP/placeholder/raw-endpoint
  cases, credential-bearing or query/fragment-bearing endpoint/public-base URLs,
  raw provider object-storage public hosts, placeholder or short credentials,
  unsafe bucket names, and unsafe object prefixes, then runs the live smoke
  against fake S3/CDN servers, including Content-Type preservation and cleanup
  after a simulated public CDN failure.
- [x] Media storage live-production handoff: `npm run check:media-storage:production -- --live`
  is required for final real bucket/CDN signoff. It is opt-in, writes one tiny
  `readiness-smoke/` object through signed S3/R2 PUT, verifies signed GET,
  verifies the public media base URL returns the same bytes with Content-Type
  preserved, and deletes the
  object. The default production check remains shape-only and does not write to
  production storage; local/disk media intentionally stays a private-beta-only
  path and fails the production gate.
- [x] Ops alert runtime smoke: `npm run check:ops-alerts:runtime-smoke`
  triggers a local API HTTP error, two auth failures, and one auth rate-limit
  response, then verifies all four webhook payloads are delivered and sanitized.
- [x] Ops alert production fixture: `npm run check:ops-alerts:production-fixture`
  proves the production signoff gate passes only with HTTPS webhook, token,
  sane auth limits, and complete edge-rate-limit evidence, while rejecting
  placeholder/local/private/raw-IP/credential-bearing/query-bearing/incomplete inputs without
  exposing raw secrets. It also rejects generic edge notes that do not name the
  protected auth surface, client IP/identity characteristic, and enforcement
  action, and verifies invalid production smoke attempts do not deliver webhooks.
- [x] Jobs source runtime smoke: `npm run check:jobs-source:runtime-smoke`
  starts a temporary jobs feed and API, verifies bearer-token source fetch,
  source/local catalog merge, duplicate-id source precedence, cache behavior,
  unsafe source URL sanitization, unknown source type defaulting, invalid
  source `postedAt` sanitization, POST type filtering, and local catalog
  fallback when the feed returns HTTP errors, invalid JSON, or an oversized
  payload.
- [x] Jobs front-end fallback sorting: `npm run check:route-interactions`
  locks Jobs sorting to a finite timestamp helper, and
  `npm run check:browser-route-smoke` verifies the `crawler-ready` fallback
  labels render while Jobs filtering and apply links continue to pass.
- [x] Jobs source production fixture: `npm run check:jobs-source:production-fixture`
  proves the production gate rejects missing/HTTP/localhost/private-network/raw-IP,
  credential-bearing, query-bearing, or placeholder source URLs, bad
  cache/timeout/size settings, placeholder or short source tokens, incomplete
  fallback catalogs, and duplicate catalog ids; it also runs `--live` against
  fake feeds and rejects internship-only, duplicate-id, invalid-URL,
  defaulted-metadata, invalid/future `postedAt`, invalid JSON, oversized, and
  missing-token responses.
- [x] Jobs source live-production handoff: `npm run check:jobs-source:production -- --live`
  is required for final real feed signoff. It fetches the configured
  HTTPS crawler/vendor feed and now requires both internship and fulltime roles,
  unique ids, HTTP(S) job URLs, and real company/title/postedAt fields with
  valid, non-future dates rather than default placeholders.
- [x] Question-bank rights gate: `npm run check:question-bank-rights`
  verifies every catalog source has a rights manifest entry, source and compiled
  counts match, disabled sources are absent from the compiled catalog, private
  beta status allows each active source, public/commercial status remains
  explicit, and any future approved public/commercial source has a valid recent
  review date, non-placeholder HTTPS evidence URL with a DNS hostname and without embedded credentials,
  query strings, fragments, or raw IP hosts, approval type, evidence summary, and redistribution scopes. `npm run check:question-bank-rights:public-smoke`
  verifies the schema with positive and negative fixtures, including missing
  `commercial-use`, placeholder evidence, stale reviews, missing direct-permission
  grantors, unsupported scopes, private-network/raw-IP evidence, and credential/query-bearing evidence URLs. The stricter
  `npm run check:question-bank-rights:public` and
  `npm run check:question-bank-rights:commercial` remain expected to fail until
  all active sources are approved or removed/replaced for public/commercial
  distribution.
- [x] Question-bank rights release blockers:
  `npm run check:question-bank-rights:release-blockers` verifies that the
  current private-beta catalog still passes, while real public and commercial
  release gates fail for all 15 active sources with
  `publicCommercial.status="needs-review"` and zero active approvals. Evidence:
  `340-question-bank-rights-release-blockers-summary.json`.
- [x] Postgres cutover export smoke:
  `npm run check:postgres-cutover:export-smoke` starts a temporary API
  database, generates redacted and include-sensitive SQLite exports, verifies
  default export redaction for auth/session/code hashes, JSON payloads, problem
  text, audit PII, and media storage paths, and verifies only the
  include-sensitive export passes `--require-sensitive-export`. The cutover
  check also builds an offline Postgres import plan from the include-sensitive
  export, validating row columns against `schema.sql`, JSON/timestamp values,
  dependency-safe COPY table order, and rejection of row-limited/truncated
  include-sensitive exports as migration input. The same smoke now exercises the
  final `--cutover-complete` signoff shape, binding source DB/export SHA-256
  prefixes, target row count, app-DB-active confirmation, backup confirmation,
  and a sanitized HTTPS evidence host, and rejects pending status, localhost,
  private-network, or raw-IP target hosts, malformed target hosts, database DSNs or
  unsafe database names, future timestamps, placeholder/private-network
  evidence URLs, raw-IP evidence URLs, evidence URLs with embedded credentials
  or query strings, SHA mismatches, row-count mismatches, inactive app database
  confirmation, and missing backup confirmation.
- [x] Chrome Collector store readiness: `npm run check:chrome-store-readiness`
  validates Manifest V3 metadata, minimal permissions, store listing text,
  privacy disclosures, store screenshots/promotional images, and the generated
  upload zip. The popup runtime smoke also verifies insecure remote Board URLs
  fall back to `https://beta.quantgym.app/` while loopback HTTP remains allowed
  for local development. The package script now emits a zip SHA-256 and per-file
  SHA-256 digests, and the readiness check verifies each zip entry matches the
  source bytes before the package is submitted.
- [x] Chrome Collector publication handoff:
  `npm run check:chrome-store-publication` verifies the upload ZIP, listing,
  privacy policy, screenshots, reviewer notes, and SHA-256 evidence for manual
  Chrome Web Store submission. `npm run check:chrome-store-publication:fixture`
  verifies the published-signoff contract with a controlled fixture, including
  item id, listing URL, published status, submitted version, upload SHA-256, and
  negative cases for malformed or placeholder evidence, placeholder-looking item
  ids, non-detail or child-path listing URLs, non-store or wrong-item evidence
  URLs, private-network evidence URLs, raw-IP listing/evidence URLs, and
  credential/query-bearing listing or evidence URLs. Evidence:
  `339-chrome-store-publication-fixture-summary.json`. Final external
  publication still requires
  `npm run check:chrome-store-publication:published` with the item id, public
  listing/evidence URLs for the same Chrome Web Store item id, `published`
  status, submitted version, and matching upload ZIP SHA-256 from the
  developer-account submission.
- [x] Browser evidence manifest: `npm run check:browser-evidence` validates all
  numbered browser-audit screenshot/JSON references in the audit and smoke docs.
- [x] Migration completion audit: `npm run check:migration-completion` reports
  10 passed requirements, 0 pending requirements, and 0 failed requirements.
- [x] Local release-readiness gate: `npm run check:release-readiness:local`
  passes final readiness when a fresh Google provider token is present, and
  otherwise may report the documented production-token-only partial.
- [x] External launch blockers summary: `npm run check:external-launch-blockers`
  writes `341-external-launch-blockers-summary.json`, keeps public launch
  marked `blocked` while the six remaining external signoffs remain, and supports
  `-- --require-clear` for final public-launch clearing. The same check is also
  included inside `npm run check:release-readiness:local` without overwriting
  the standalone `341` summary.
- [x] Google ID token helper handoff: `npm run google:token-helper` creates an
  ignored local helper page for obtaining the short-lived token needed by the
  final provider login boundary; `npm run google:token-helper:deployed` points
  the helper at the deployed Google Client ID and the deployed paste-token
  verifier.
- [x] Google ID token helper browser smoke: real Chrome renders the helper page
  and Google sign-in button at the local 127.0.0.1 origin.
- [x] Production LLM/PDF endpoint sign-off against deployed service URL:
  `https://llm.quantgym.app/interview` passes resume review and PDF question
  generation when called with a live QuantGym cloud session token. Use
  `npm run verify:production-boundaries:deployed` to inspect the deployed
  `beta.quantgym.app/config.js` endpoints without touching the local
  `config.js` fallback; use
  `npm run verify:production-boundaries:deployed:paste-token` to paste a fresh
  Google ID token hidden, reuse the returned QuantGym cloud session for deployed
  LLM checks, and refresh
  `333-production-boundaries-deployed-services-summary.json` only after the
  deployed LLM checks pass.
- [ ] Apex/WWW domain SSL or redirect sign-off: fix or intentionally redirect
  `quantgym.app` and `www.quantgym.app` so they no longer return Cloudflare 525
  SSL handshake errors; keep `beta.quantgym.app` as the current beta entrypoint
  until this separate domain/SSL follow-up is complete. Deferred by the
  2026-06-17 handoff decision and reaffirmed by the 2026-06-18 user decision
  to leave this item in the unresolved backlog for now. Refresh live evidence
  with `npm run check:apex-www-domain`; the generated `355` summary includes
  the current blocked hosts, probable cause, owner action, remediation
  checklist, and acceptance criteria. After the Cloudflare/origin SSL or
  redirect fix, clear the item with
  `npm run check:apex-www-domain -- --require-clear`.
- [ ] Real Google provider account sign-off with a real Google ID token/session;
  keep the local and production web origins authorized in the OAuth Client.

Record remaining manual results in PR / handoff notes before release sign-off.
