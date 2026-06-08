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
content-level: route smoke must stay 21/21 pass for desktop and mobile, GitHub
baseline parity must stay 21/21 pass with zero actionable issues, browser
evidence manifest must report zero missing/invalid artifacts, migration
completion must stay 10 pass / 0 pending / 0 fail, production boundary evidence
must stay 5 pass / 0 skip / 0 fail, local readiness must stay 10 pass / 0
partial / 0 fail, static build config must not embed the
OpenAI key, and the Google token helper browser smoke must stay renderable. This
is not a replacement for screenshot review, but it catches accidental removal of
route-critical ids such as `problemSearch`, `leaderboardMetricSelect`,
`resumeReview`, `settingsGoogleClientIdInput`, and `todoDockButton`.

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
`323-release-readiness-summary.json`. Current strict and local status is `pass`:
10 gates pass, 0 gates are partial, and 0 gates fail.

Browser evidence manifest follow-up: `npm run check:browser-evidence` scans
`docs/ui-function-regression-audit-2026-06-07.md` and this smoke checklist for
browser-audit screenshot/JSON references. It currently verifies 263 evidence
references: 229 image files and 34 JSON files, with 0 missing, 0 undersized
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
server is running. The generated helper is ignored by Git and does not write the
short-lived Google ID token to disk. After signing in, copy the token and run
`QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries`.
The production-boundary verifier now decodes the token locally and fails fast
for malformed, expired, wrong-issuer, or wrong-audience tokens before it calls
the provider login endpoint.
Real Chrome smoke confirms the helper page renders, including the Google sign-in
button, token textarea, copy button, and `Ready.` status. Evidence:
`324-google-token-helper-summary.json`,
`325-google-token-helper-browser.png`, and
`325-google-token-helper-browser-summary.json`.

Current Google OAuth caveat: Google provider login still needs a real Google ID
token/session. Keep `http://127.0.0.1:5179` and the production web origin in the
OAuth Client's Authorized JavaScript origins; if the browser warning
`The given origin is not allowed for the given client ID.` returns, re-check
that Google Cloud Console setting before debugging app code.

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
  shell ids, 11 key JSON evidence artifacts, and 92 non-empty screenshot
  artifacts.
- [x] Browser evidence manifest: `npm run check:browser-evidence` validates all
  numbered browser-audit screenshot/JSON references in the audit and smoke docs.
- [x] Migration completion audit: `npm run check:migration-completion` reports
  10 passed requirements, 0 pending requirements, and 0 failed requirements.
- [x] Local release-readiness gate: `npm run check:release-readiness:local`
  passes with status `pass`: 10 pass / 0 partial / 0 fail.
- [x] Google ID token helper handoff: `npm run google:token-helper` creates an
  ignored local helper page for obtaining the short-lived token needed by the
  final provider login boundary.
- [x] Google ID token helper browser smoke: real Chrome renders the helper page
  and Google sign-in button at the local 127.0.0.1 origin.
- [ ] Production LLM/PDF endpoint sign-off against deployed service URL.
- [ ] Real Google provider account sign-off with a real Google ID token/session;
  keep the local and production web origins authorized in the OAuth Client.

Record remaining manual results in PR / handoff notes before release sign-off.
