# QuantGym Online UI / Function Audit

Date: 2026-06-08

Target:
- Frontend: https://beta.quantgym.app
- API: https://api.quantgym.app/api
- LLM proxy: https://llm.quantgym.app/interview
- Merged source observed on remote: `origin/main` at `8f43db7` (`Merge pull request #47 from garymmmjw/codex/fix-responsive-ui-audit`)

## Scope

This pass used live production endpoints and real browser screenshots. It intentionally avoided actions that would create production content, send verification email, upload files, publish posts, delete data, or save settings.

The authenticated pass used the allowlisted account supplied by the owner. The token was used only inside the temporary browser session and was not saved in any report artifact.

## Evidence

- Desktop login/root screenshot: `docs/online-audit-screenshots/001-prod-home-root-desktop.png`
- Direct protected route screenshot: `docs/online-audit-screenshots/002-prod-overview-direct-desktop.png`
- Direct problems route screenshot: `docs/online-audit-screenshots/003-prod-problems-direct-desktop.png`
- Invalid login screenshot: `docs/online-audit-screenshots/004-prod-login-invalid-submit-desktop.png`
- Mobile login screenshot: `docs/online-audit-screenshots/005-prod-login-mobile.png`
- Mobile protected route redirect screenshot: `docs/online-audit-screenshots/006-prod-problems-mobile-redirect.png`
- Mobile full-page login screenshot: `docs/online-audit-screenshots/007-prod-login-mobile-fullpage.png`
- Route summary JSON: `docs/online-audit-screenshots/001-003-prod-route-summary.json`
- Invalid login summary JSON: `docs/online-audit-screenshots/004-prod-login-invalid-submit-summary.json`
- Mobile auth summary JSON: `docs/online-audit-screenshots/005-006-prod-mobile-auth-summary.json`
- Full route / asset HTTP summary JSON: `docs/online-audit-screenshots/008-prod-route-asset-http-summary.json`
- Production API boundary summary JSON: `docs/online-audit-screenshots/009-prod-api-boundary-summary.json`
- Browser auth storage summary JSON: `docs/online-audit-screenshots/010-prod-browser-storage-auth-summary.json`
- Authenticated route audit JSON: `docs/online-audit-screenshots/012-prod-authenticated-route-audit-summary.json`
- Corrected authenticated visible-route summary JSON: `docs/online-audit-screenshots/026-prod-auth-visible-route-summary.json`
- Authenticated overview screenshot: `docs/online-audit-screenshots/012-prod-auth-overview-desktop.png`
- Authenticated problems screenshot: `docs/online-audit-screenshots/013-prod-auth-problems-desktop.png`
- Authenticated problems full-page screenshot: `docs/online-audit-screenshots/022-prod-auth-problems-fullpage.png`
- Authenticated problems focused flow JSON: `docs/online-audit-screenshots/023-prod-auth-problems-focused-flow-summary.json`
- Authenticated real typed search JSON: `docs/online-audit-screenshots/025-prod-auth-problems-real-typed-search-summary.json`
- Authenticated problem detail screenshot: `docs/online-audit-screenshots/024-prod-auth-problem-detail-focused.png`
- Authenticated settings screenshot: `docs/online-audit-screenshots/016-prod-auth-settings-desktop.png`
- Authenticated resume screenshot: `docs/online-audit-screenshots/017-prod-auth-resume-desktop.png`
- Authenticated community screenshot: `docs/online-audit-screenshots/018-prod-auth-community-desktop.png`
- Authenticated poker screenshot: `docs/online-audit-screenshots/019-prod-auth-poker-desktop.png`
- Authenticated mobile overview screenshot: `docs/online-audit-screenshots/020-prod-auth-mobile-overview.png`
- Authenticated mobile problems screenshot: `docs/online-audit-screenshots/021-prod-auth-mobile-problems.png`
- Authenticated plan / pk recheck JSON: `docs/online-audit-screenshots/027-prod-auth-low-text-routes-summary.json`

## Passed Checks

- The merged React split build is live. `https://beta.quantgym.app/` loads the current split asset family including `/assets/index-Bhww-nxu.js` and `/assets/index-QEGU0sn-.css`.
- Static JS/CSS chunk availability passes. The audit discovered 37 referenced frontend assets from the live HTML/entry chunk, and all 37 returned HTTP 200.
- Production config is live and points to HTTPS services:
  - `cloudApiEndpoint`: `https://api.quantgym.app/api`
  - `llmEndpoint`: `https://llm.quantgym.app/interview`
  - `googleLoginEnabled`: `true`
- API health passes: `https://api.quantgym.app/api/health` returns 200.
- LLM health passes: `https://llm.quantgym.app/health` returns 200.
- CORS from `https://beta.quantgym.app` works for API auth requests.
- Unauthenticated protected app routes redirect to `/login` in the browser.
- Login page renders on desktop with Google login UI enabled and no captured console errors.
- Mobile login page has no horizontal overflow at 390 x 844.
- Public API reads are reachable:
  - `GET /api/problems` returns problem data.
  - `GET /api/leaderboard` returns leaderboard data.
  - `GET /api/community` returns an empty community payload instead of failing.
- Protected API boundaries correctly reject unauthenticated reads:
  - `GET /api/account` returns 401.
  - `GET /api/state` returns 401.
  - `GET /api/problem-states` returns 401.
  - `GET /api/poker/rooms` returns 401.
- LLM proxy rejects unauthenticated production interview calls with 401, which is the expected cloud-login boundary.
- Current in-app browser session has no visible production auth storage:
  - localStorage keys: none
  - sessionStorage keys: none
  - JS-visible cookies: none
  - likely auth token present: false
- Authenticated API login passes for the supplied allowlisted account.
- Authenticated visible-route check passes for all 21 React routes:
  - `026-prod-auth-visible-route-summary.json` reports `findingCount: 0`.
  - Each route rendered the app shell instead of the login shell.
  - No desktop horizontal overflow was detected across the checked routes.
- Authenticated core page render checks pass:
  - Overview renders news ticker, hero, score/rank cards, and lower dashboard sections.
  - Plan renders the prep-plan questionnaire.
  - Skills renders the readiness score and radar/content sections.
  - Interview renders mode/language/model controls.
  - Settings renders production HTTPS API/LLM endpoints and production Google Client ID.
  - Resume renders the resume input/review panel.
  - Community renders composer/filter state.
  - Poker renders the table/lobby UI.
- Problems page authenticated flow passes:
  - Problem collections are present.
  - Full page contains topic chips, difficulty controls, and visible problem cards.
  - Real typed `probability` search returns probability-related problem cards.
  - `Medium` difficulty selection is active after click.
  - A problem detail opens in-place and shows locked hint/reveal controls.

## Local Resolution Recheck

Latest local recheck, 2026-06-10:
- The Cloudflare Pages SPA fallback issue is resolved in the local build path.
- `scripts/build-static-site.mjs` emits `dist/_redirects` and intentionally does not emit a top-level `dist/404.html`.
- `scripts/check-stage2.mjs` guards that contract so the regression fails the local Stage 2 check if it returns.
- The local production build confirms `dist/_redirects` exists and `dist/404.html` is absent.

## Findings

No active local findings remain from this report.

## Not Yet Verified / Not Mutated

These were intentionally not executed because they mutate production data or send data to LLM:

- Marking problems done / favorite persistence.
- Revealing hints/solutions if those actions should change user progress.
- Resume LLM review request.
- Settings save/export/import/reset/logout actions.
- Community publish/comment/delete.
- Messages send/read-state mutation.
- Memory/network create/edit/delete.
- Poker take-seat/fill-demo/start-hand/reset/export/send-chat.
- Google login end-to-end token exchange in the visible browser session.
