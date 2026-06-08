# QuantGym Unified Migration - Coding Agent Guide

Last updated: 2026-06-07

Source plan: `QuantGym-unified-migration.md`

Audience: coding agents implementing the remaining migration work.

This document is the execution guide for the current codebase. It does not replace
`QuantGym-unified-migration.md`; it turns that plan into concrete code changes,
completion gates, and the Stage 1 to Stage 2 handoff path.

## 0. Current Baseline

Before starting work, assume this repository has moved past both the original
"large single file only" state and the first React bridge state described in the
original plan.

Current facts to preserve:

- Stage 0 is effectively complete.
- Stage 1 compatibility checks pass, but strict vanilla Stage 1 is no longer
  applicable because React work has started.
- Root `app.js` is gone.
- `src/main.js` is now a tiny compatibility entry.
- `index.html` points to `/src/main.jsx` and exposes a visible
  `<div id="react-root"></div>`.
- React, React DOM, React Router, and the Vite React plugin are installed.
- `src/main.jsx`, `src/App.jsx`, `src/routes/`, `src/layouts/`, `src/pages/`,
  and `src/features/` exist.
- `src/routes/routeConfig.js` currently reports all manifest routes as React
  routes: `legacy routes: 0`, `bridge routes: 0`, `react routes: 21`.
- `src/app/createAppContext.impl.js` and `src/app/moduleControllers.js` have
  been removed.
- `src/modules/registry.js` has been removed.
- Most route module entry files under `src/modules/<id>/index.js` have been
  deleted because their routes are now React-owned. `check:stage1` reports these
  as compatibility warnings, not failures.
- `src/modules/` still contains runtime/controller helpers used by page APIs.
  Route module entry files under `src/modules/<id>/index.js` are intentionally
  absent for all 21 manifest routes on this branch.
- `src/api/client.js`, `src/state/store.js`, `src/lib/`, and `src/ui/` already exist.
- Public React code now uses `AppServicesProvider`, `AppEffects`,
  `createAppServices`, `HashCompatRedirect`, and `usePageApi`.
- Deprecated compatibility aliases such as `createLegacyApp`,
  `LegacyAppContext`, `runLegacyBootstrap`, `ShellBootstrap`, `RouteBridge`,
  and `ModulePage` are no longer present under `src/`.
- `src/app/createAppContext/slices/*` no longer execute generated strings with
  `new Function(...)`; readable implementations now live under
  `src/app/createAppContext/slices/impl/`.
- `src/components/shell/AppShellMain.jsx` renders the React route `<Outlet />`
  directly inside `.app-route-root`. `.module-partial-root` portal mounting has
  been retired.
- `docs/react-migration-ledger.json` documents page status. Current state:
  21 converted React routes. Poker table/lobby/action-bar rendering is React
  owned through `pokerPageApi.getViewModel`; the preflop matrix still uses a
  local DOM helper inside the React page.

The important implication: future agents should not redo Stage 0, redo Stage 1,
or recreate the Stage 2 bridge from scratch. The next work is release-readiness
validation and final cleanup: keep strict gates green, finish the remaining
deep interaction smoke checks, and convert retained local DOM/style helpers only
when they create real maintenance or UX risk.

## 0.0 Current Progress Snapshot For New Agents

Use this as the current migration truth before reading the historical sections
below.

| Area | Current status | Agent instruction |
|---|---:|---|
| Stage 0 cleanup | 100% complete | Do not recreate root `app.js` or old HTML shell ownership. |
| Stage 1 modularization | Compatibility complete | Run `npm run check:stage1` in Stage 2 compatibility mode. Do not chase deleted module index warnings. |
| Stage 2 bridge | Superseded | Bridge routes are `0`; do not add `createBridgePage`, `PartialBridgeContent`, `ReactPageShell`, or `ModulePage`. |
| Stage 2 full React routes | 100% by static gates | All 21 manifest routes are React-owned and lazy-loaded. |
| Browser/manual release smoke | Near complete | Problems, Interview, Poker local/online fallback, Settings including Google Client ID save/clear, Account, Memory, Community, Messages, Experiences, News, Overview leaderboard, Resume endpoint review, external-link new-tab behavior, Library real cloud reader iframe, all-route desktop/mobile visual smoke, and all-route GitHub baseline parity have browser/CDP/Chrome evidence. Finish production LLM/PDF endpoint sign-off and real Google-provider account edge checks with real deployment credentials before release. |
| Final branch handoff | Not complete | Worktree has uncommitted migration changes; commit/push only after smoke status is updated and gates pass. |

Current implementation count:

- React route ownership: 21 / 21 manifest routes.
- Legacy route ownership: 0 / 21.
- Bridge route ownership: 0 / 21.
- Deleted route module entries: 21 / 21, expected in Stage 2 mode.
- Automated gate status: `git diff --check`, `check:stage1`, `check:stage2`,
  `check:stage2:full`, `check:stage2:strict`, and `build` pass on
  2026-06-08. Build keeps only expected classic-script, chunk-size, and
  empty-endpoint warnings.

Current unblocking principle: if a task does not change route ownership,
generated slice execution, auth shell switching, mobile viewport stability, or
high-risk route behavior, keep it out of the release-critical path.

## 0.1 Historical Audit Update After First Guide Implementation

Audit date: 2026-06-07

This section is retained for history. It is superseded by Section 0.2 for the
current migration state.

The first implementation pass introduced the React bridge and the automated
checks. `npm run check:stage1`, `npm run check:stage2`, and `npm run build`
currently pass, but the implementation should not yet be treated as complete.
The checks are too permissive and several architectural goals are still open.

Current pass/fail summary:

- Build: passes.
- Stage 1 script: passes, but misses several real Stage 1 completion criteria.
- Stage 2 script: passes, but currently proves only that React bridge files
  exist. It does not prove page conversion or route correctness.
- Current code state: Stage 2 bridge has started, but Stage 1 hardening is not
  actually finished.

Important findings from the audit:

1. `src/main.js` is small, but the old orchestration was mostly moved into
   `src/app/createAppContext.impl.js`, which is now over 2,000 lines. Moving a
   monolith is not the same as completing Stage 1.

2. `src/app/moduleControllers.js` still receives a very large dependency bag.
   This replaces the previous `featureModules.js` dependency bag rather than
   eliminating the pattern.

3. `src/state/appStore.js`, `src/state/authStore.js`,
   `src/state/userStateStore.js`, `src/state/preferencesStore.js`, and
   `src/state/communityStore.js` exist, but the React bridge currently exposes
   old runtime objects instead of these stores. The stores must be wired into
   `createAppContext` and used by React.

4. `useAuthStore` currently falls back to a non-subscribing object if the auth
   runtime has no store. This means React protected routes may not re-render
   after a vanilla login/logout.

5. `REACT_PAGE_IDS` currently includes every manifest entry. That marks all
   routes as React-owned even though several pages still use
   `createBridgePage`, `PartialBridgeContent`, or `ReactPageShell`. Route
   metadata must distinguish `legacy`, `bridge`, and `react` page modes.

6. `RouteBridge` keeps writing `#module` hashes onto path routes. This is useful
   only for short-term compatibility. Once BrowserRouter owns navigation, the
   canonical URL should be the path route, not `/jobs#jobs`.

7. `index.html` mounts React into `<div id="react-root" hidden
   aria-hidden="true">`. This is acceptable only for a side-effect bridge. It
   does not count as React owning the visible shell. When Stage 2.6 begins, the
   React root must become the visible app root.

8. Temporary recovery files are present:

   - `scripts/recover-createAppContext.mjs`
   - `scripts/recover-tail.js`
   - `scripts/__pycache__/...`

   These should be deleted or explicitly documented before review.

Next required work before another review:

1. Strengthen `check:stage1` and `check:stage2` using the rules in Sections 4
   and 6 below.

2. Split `src/app/createAppContext.impl.js` into real context/service modules.
   The line count for `main.js` alone is no longer enough.

3. Replace the `moduleControllers.js` all-in dependency bag with domain
   contexts.

4. Wire the new stores into `createAppContext` and ensure React subscriptions
   update on login, logout, language changes, and user-state saves.

5. Fix route metadata so bridge pages are not marked as fully React-owned.

6. Decide whether the current React root is only a temporary hidden bridge or
   the start of the visible React shell. Document that decision in route config
   and checks.

## 0.2 Current Audit Update After Strict React Migration Pass

Audit date: 2026-06-07

The latest implementation moved the app past the previous "full-route React but
not maintainable yet" state. Treat the route layer and page behavior as
React-owned. The remaining work is no longer broad migration; it is launch
validation, deep route-interaction QA, settings/language persistence QA, and
optional cleanup of retained local DOM/style helpers. Basic mobile top-nav
viewport smoke has already been recorded.

Commands run during the current audit:

```bash
git fetch origin --prune
git status --short --branch
git rev-list --left-right --count HEAD...@{u}
npm run check:stage1
npm run check:stage2
npm run check:stage2:full
npm run check:stage2:strict
npm run build
```

Current results:

- Git sync: the current branch is even with its upstream (`0 0` ahead/behind)
  after fetch. The worktree is not clean; migration changes are still
  uncommitted locally.
- `npm run check:stage1`: passes with warnings for deleted
  `src/modules/<id>/index.js` files. These routes are React-owned, so the
  warning is expected compatibility noise. Do not recreate these entry files
  just to silence the warning.
- `npm run check:stage2`: passes.
- `npm run check:stage2:full`: passes.
- `npm run check:stage2:strict`: passes.
- Route mode counts: `legacy routes: 0`, `bridge routes: 0`,
  `react routes: 21`.
- `npm run build`: passes.
- Build warning to keep tracking: Vite still warns because the main app chunk is
  larger than 500 KB. The current production build has route chunks and vendor
  chunks, with the main app chunk around 787 KB raw / 244 KB gzip, which is
  inside the current ledger budget of 800 KB raw / 400 KB gzip.
- Browser route smoke run in this audit:
  - `/` stays canonical with no `#overview`.
  - `/problems`, `/interview`, `/library`, and all other manifest paths render
    directly as path routes.
  - `/#jobs` redirects once to `/jobs` and clears the hash.
  - Shell navigation clicks dispatch React Router navigation and land on path
    URLs, for example `/settings`.
  - Logged-in `/login` redirects to `/` after the bootstrap shell readiness
    gate; AppShell is visible and AuthShell is hidden.
  - Logged-out logout/login/register smoke has been exercised: logout from
    `/account` shows AuthShell, login/register tabs switch, local register works
    when cloud email verification is unavailable, and React auth guards update
    without a manual refresh.
  - Account deep profile smoke has been exercised with a temporary local
    account: profile save, avatar file upload, resume file upload, location and
    graduation-term save, reload persistence, avatar clear, password-required
    email-change guard, password-authenticated email change, and logout back to
    AuthShell all pass through real Chrome/CDP.
  - Memory deep file/history smoke has been exercised with a temporary local
    account: `.tex` upload reads into content, small image upload stores a
    dataURL, large image upload falls back to file name/KB, all three resources
    survive reload, and latest-history undo updates both the React UI and
    persisted user state.
  - Messages deep thread/send/unread smoke has been exercised with a temporary
    local account: seeded threads render and fallback-select correctly, the
    shell unread badge refreshes on page entry, clicking a thread marks it
    read, sending persists through reload, and a Community `私信` click creates
    and selects the direct-message thread.
  - Community deep CRUD/media smoke has been exercised with a temporary local
    account: image upload preview, media removal, image post publish, remote
    like, remote comment, own-post delete, and reload persistence all pass.
  - Mobile 390px smoke has been exercised on `/problems`: the shell renders,
    the top module nav is horizontally scrollable, `sidebarToggleBtn` is
    intentionally hidden in the current authenticated top-nav layout, and no
    document-level horizontal overflow was observed.
  - `/poker` may add `?pokerRoom=QG-MAIN`, but no longer adds `#poker`.
  - Tested route batches had no console errors and no Vite error overlay.

What is now correctly completed:

1. The old HTML-owned shell has been removed from `index.html`; the document now
   mounts the app through React.

2. `src/main.jsx` is the active entry and renders `App` through `createRoot`.

3. React Router path routes exist for every manifest route.

4. `REACT_PAGE_IDS` includes all 21 routeable modules and `BRIDGE_PAGE_IDS` is
   empty.

5. `src/app/createAppContext.impl.js`, `src/app/moduleControllers.js`,
   `src/app/buildModuleControllerContexts.js`, and
   `src/features/shared/useModuleControllerPage.js` are absent.

6. React feature/page files exist for all routeable product areas:
   `overview`, `plan`, `skills`, `interview`, `problems`, `tools`, `poker`,
   `experiences`, `news`, `community`, `messages`, `network`, `resume`, `jobs`,
   `companies`, `library`, `courses`, `memory`, `settings`, `account`, and
   `pk`.

7. `scripts/check-stage2.mjs --full --strict` now checks the previous hard
   blockers: generated runtime strings, portal shell compatibility, stale
   `legacyApp.pageApi` usage, retired `ModulePage` imports, unreadable
   `__sliceScope` implementations, compatibility aliases outside adapter files,
   lazy routes, bundle budget, ledger documentation, and `src/legacy/`.

8. The previous generated `new Function(...)` slices have been replaced by
   normal implementation files under `src/app/createAppContext/slices/impl/`.

9. `.module-partial-root` and `createPortal(...)` route mounting have been
   removed. `AppShellMain.jsx` renders `<Outlet />` inside `.app-route-root`.

10. `src/features/` no longer uses `legacyApp.pageApi.*`; page behavior goes
    through `usePageApi` / `useAppServices`.

11. `src/routes/routes.jsx` uses `React.lazy` for all page routes.

12. `docs/react-migration-ledger.json` documents 21 converted pages. Poker is
    route/page React-owned through `PokerTable`, `PokerLobbyPanel`,
    `PokerActionBar`, and `pokerPageApi.getViewModel`. Retained Poker module
    helpers such as the preflop matrix renderer are local helpers, not route
    ownership blockers.

13. BrowserRouter is now the canonical routing mode for `src/main.jsx`.
    Legacy hash routing remains available to `src/main.js`, but browser-mode
    bootstrap disables the legacy hash router and lets `HashCompatRedirect`
    handle old hash links.

14. `AppEffects` waits for the required shell DOM before running
    `bootstrapApp`, which prevents `/login -> /` redirects from bootstrapping
    against the wrong shell.

15. Async auth mutations sync React stores after their promises settle, so
    login/register no longer leave React route guards on stale auth state.

16. Account logout is exposed through `accountPageApi`, `useAccountPageModel`,
    and `AccountPageContent`, so authenticated users can return to AuthShell
    without relying on hidden legacy controls.

17. Account profile persistence has been browser-verified: saving name, email,
    country/region, graduation term, avatar picture, and resume state updates
    local auth/user-state storage and survives reload. Local email change keeps
    the current-password guard and migrates the password hash to the new email.

18. Memory latest-history undo now uses the React page API/user-state patch
    path instead of forwarding to the legacy DOM controller, so `clearTodayBtn`
    refreshes React state and persists the entry removal.

19. React Settings now calls the value-based `saveSettingsFromValues` path
    instead of the legacy DOM-reading `saveSettings` path. Saving settings also
    syncs React domain stores, so language, account location, cloud config, and
    auth config changes are visible to React after save.

20. React Messages now refreshes the shell unread badge on page entry, writes
    community thread changes through the React community store, and no longer
    depends on legacy DOM rendering for Community direct-message entry.

21. React Community post CRUD/media paths have browser evidence for media
    preview/clear, image-backed publishing, likes, comments, own-post deletion,
    and localStorage persistence.

22. React Experiences CRUD/share paths have browser evidence for create, edit,
    stage filter, share-to-community, `sharedPostId` writeback, shared badge and
    counter sync, delete of an unshared record, and reload persistence. The old
    experience share controller now writes through the React user-state runtime.

23. React News manual form submit has browser evidence for real input, submit,
    list insertion, detail view, source link retention, and reload persistence.

24. React Overview leaderboard region scope has browser evidence for metric,
    country, region, region option normalization, row filtering, and reload
    persistence using seeded local leaderboard accounts.

25. React Settings reset/logout has browser evidence using a disposable account:
    reset clears the current account's training records while preserving a peer
    account's state, Memory no longer renders the cleared resource, and logout
    returns to `/login` with `auth.currentUserId` empty.

26. React Poker online-room fallback has browser evidence using a disposable
    local account with a deliberately invalid cloud endpoint/token: URL join and
    `New` private table creation both observe cloud failure, fall back to Local,
    normalize `pokerRoom` back to `QG-MAIN`, keep Fill demo/Start/action usable,
    and reload without a Vite overlay.

27. React Library real cloud reader iframe has browser evidence using local
    `api-server` and a disposable cloud account: `green-book` reader-token
    returns 200, the PDF endpoint returns 206/200 `application/pdf`, the iframe
    renders the PDF cover, `openNew` points at the tokenized PDF URL, close resets
    the iframe to `about:blank`, and reload remains stable.

28. React Resume real endpoint review has in-app Browser evidence using a
    temporary local compatible endpoint: Settings saves
    `http://127.0.0.1:8787/interview`, Resume posts `task=resume_review` with
    model/language/graduation/resume payload, returned review items render in
    `#resumeReview`, and the route has no overlay/overflow/console errors.

29. React Settings Google Client ID local config has in-app Browser evidence:
    a test Client ID saves and survives reload, then a real keyboard
    select-all/delete clears it, save persists the blank value, and reload stays
    clean. This does not cover a real Google provider account token.

30. External links have independent Google Chrome evidence: News, Jobs,
    Companies, and Courses all open `_blank` popups to the expected external
    hosts, the original local route remains unchanged, no Vite overlay or
    horizontal overflow appears, and significant console logs are 0. The
    in-app Browser remains useful for local stability but does not expose
    outbound `_blank` tabs, so use `307-chrome-external-link-click-summary.json`
    as the authoritative external-link sign-off.

31. All 21 manifest routes have independent Google Chrome visual smoke evidence
    on desktop `1440x900` and mobile `390x844`: route-specific key selectors are
    visible, pages are non-empty, Vite overlay is absent, document-level
    horizontal overflow is absent, and significant console logs are 0. Use
    `311-chrome-visual-desktop-contact-sheet.jpg`,
    `312-chrome-visual-mobile-contact-sheet.jpg`, and
    `312-chrome-visual-route-smoke-summary.json` as the latest route-level
    evidence. This proves route stability, not final pixel parity with GitHub.

32. All 21 manifest routes also have GitHub baseline parity evidence. A
    temporary `origin/main@b2107214d0cdfb43170f8cc02cb35c61896b877b` server ran
    at `http://127.0.0.1:5180/`; independent Google Chrome captured
    baseline/current screenshots and active-route scoped DOM metrics for every
    route. `314-github-visual-parity-all-routes-summary.json` reports
    `21/21 pass` with actionable issues 0, and
    `314-github-parity-baseline-current-contact-sheet.jpg` gives the visual
    side-by-side. This covers route-level first-render parity; interaction-state
    pixel parity should still be checked only when changing a specific flow.

33. Empty-config external boundaries are locally stable. Real Chrome verified
    Login with no auth / no Google Client ID, Settings with empty runtime config
    falling back to local LLM/Cloud defaults, and Resume local fallback without a
    running LLM service. Evidence:
    `315-external-boundary-login-no-google.png`,
    `316-external-boundary-settings-empty-config.png`,
    `317-external-boundary-resume-local-fallback.png`, and
    `317-external-boundary-empty-config-summary.json`.

34. Production external-service sign-off is scripted but skipped until real
    credentials exist. Run `npm run verify:production-boundaries` with
    `QUANTGYM_CLOUD_API_ENDPOINT`, `QUANTGYM_GOOGLE_ID_TOKEN`,
    `QUANTGYM_LLM_ENDPOINT`, and optionally `QUANTGYM_LLM_BEARER_TOKEN` to
    verify cloud health, Google provider login, LLM resume review, and LLM PDF
    question generation.

35. Local OpenAI-backed LLM/PDF and Google provider boundaries now pass. After
    fixing `llm-proxy/server.mjs` to support the frontend's
    `task=resume_review` and completing the short-lived Google ID token handoff,
    `npm run verify:production-boundaries` reports 5 pass / 0 skip / 0 fail
    with local `8787` and `8790`: cloud health, Google provider config, real
    Google provider login, LLM resume review, and LLM PDF question generation
    pass. Resume UI also posts to the real local LLM proxy and renders review
    items. Evidence:
    `318-resume-real-llm-proxy-review.png`,
    `318-resume-real-llm-proxy-review-summary.json`, and
    `319-production-boundaries-local-services-summary.json`.

36. Google Sign-In initialization no longer reproduces the previous local
    origin warning after the final config update. In-app Browser evidence shows
    the Google iframe rendering with the configured Client ID and no captured
    `The given origin is not allowed for the given client ID.` warning. This is
    not a full provider-login pass; it only clears the initialization/origin
    blocker. Evidence: `320-iab-google-config-summary.json`.

37. Static build runtime config now follows the configured local runtime.
    `scripts/build-static-site.mjs` reads root `.env` and `config.js` as
    public-runtime fallbacks before writing `dist/config.js`. Verified local
    build output contains the configured `8790/8787` endpoints and Google
    Client ID, does not embed `OPENAI_API_KEY`, and `--strict` still fails on
    local non-HTTPS endpoints so beta/production deploys must provide HTTPS
    web config.

38. UI contract checks are now code-enforced. Run
    `npm run check:ui-contracts` after route, shell, or page UI edits. The
    script verifies all 21 React route files, route-critical migrated DOM ids,
    shared app/auth/todo shell ids, 11 key JSON evidence artifacts, and 92
    non-empty screenshot artifacts. It now validates content-level evidence
    invariants too: route smoke must stay 21/21 pass for desktop and mobile,
    GitHub parity must stay 21/21 pass with zero actionable issues, browser
    evidence manifest integrity must stay clean, migration completion must stay
    10 pass / 0 pending / 0 fail, production boundary evidence must remain
    5 pass / 0 skip / 0 fail, local readiness must stay 10 pass / 0 partial /
    0 fail, static build config must not embed the OpenAI
    key, and the Google token helper browser smoke must stay
    renderable. It exists to catch regressions like missing problem
    search/cards, empty Overview leaderboard selectors, missing Resume review
    controls, broken Settings config ids, a disconnected Todo dock, stale or
    weakened JSON evidence, or deleted screenshot evidence before browser
    screenshots are regenerated.

39. Production-boundary diagnostics are contextual and now final-pass capable.
    With the current local config and a short-lived Google ID token,
    `npm run verify:production-boundaries` passes cloud health, Google provider
    config, Google provider login, LLM resume review, and LLM PDF question
    generation: 5 pass / 0 skip / 0 fail. If the token is absent or expired,
    the same script reports the exact missing item instead of misdiagnosing
    endpoint config.

40. Resume review LLM output is now tolerant of malformed JSON. The
    OpenAI-backed `resume_review` smoke exposed an intermittent failure where
    the model returned JSON-like text with a missing comma/bracket.
    `llm-proxy/server.mjs` now falls back to extracting review items from the
    `items` array text or line-based output and still returns `{ items }`.

41. Release-readiness is now scripted. Use
    `npm run check:release-readiness` for the strict final gate. Use
    `npm run check:release-readiness:local` for handoff while the real Google
    token/session is unavailable. Current local summary is written to
    `323-release-readiness-summary.json`: git diff check, Stage 1, Stage 2
    bridge/full/strict, Browser evidence, Migration completion audit, UI
    contracts, static build, and Production boundaries all pass. Strict
    release readiness has been run with the short-lived Google ID token and
    reports 10 pass / 0 partial / 0 fail.

42. Browser evidence references are now code-enforced. Run
    `npm run check:browser-evidence` after adding, renaming, or deleting
    browser-audit screenshots/JSON. It scans
    `docs/ui-function-regression-audit-2026-06-07.md` and
    `docs/SMOKE_CHECKS.md`, validates numbered
    `docs/browser-audit-screenshots` references, ignores route template
    placeholders and non-browser fixture/export filenames, and writes
    `326-browser-evidence-manifest-summary.json`. Current evidence integrity:
    263 refs, 229 images, 34 JSON files, 0 missing, 0 undersized images, and
    0 invalid JSON.

43. Migration completion is now summarized explicitly. Run
    `npm run check:migration-completion` to write
    `327-migration-completion-audit-summary.json`. It verifies route ownership,
    the React migration ledger, absence of retired bridge symbols under `src/`,
    route smoke, GitHub parity, browser evidence manifest integrity, static
    build config, local cloud/LLM boundaries, and Google token helper evidence.
    Current status is `pass`: 10 requirements pass, 0 requirements are pending,
    and 0 requirements fail. Real Google provider account login is signed off
    with a short-lived ID token whose audience matches the configured Google
    Client ID.

44. Google provider login now has a local token handoff helper. Run
    `npm run google:token-helper`, keep the Vite dev server on
    `http://127.0.0.1:5179`, and open
    `http://127.0.0.1:5179/artifacts/google-id-token-helper.html`. The helper
    uses the configured Google Client ID, renders Google Identity Services on
    the same local origin, and shows the short-lived ID token after sign-in.
    The generated helper lives under ignored `artifacts/` and does not write
    the token to disk. Copy the token and immediately run
    `QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries`.
    The verifier decodes the JWT locally and fails fast for malformed, expired,
    wrong-issuer, or wrong-audience tokens before calling the provider login
    endpoint.
    Evidence: `324-google-token-helper-summary.json`.

45. The token helper also has real browser smoke evidence. Google Chrome
    headless loaded
    `http://127.0.0.1:5179/artifacts/google-id-token-helper.html` at
    `1280x900` and rendered the helper title, Google sign-in button, token
    textarea, copy button, and `Ready.` status. Evidence:
    `325-google-token-helper-browser.png` and
    `325-google-token-helper-browser-summary.json`. This proves helper
    renderability, not account sign-in; final provider login still requires a
    short-lived token from an actual Google sign-in.

Remaining work before final sign-off:

1. Complete any remaining external-service/browser gaps from
   `docs/ui-function-regression-audit-2026-06-07.md`: real Google provider
   account login. The API has Google provider config and the latest in-app
   Browser check renders the Google iframe without the previous origin warning.
   Keep `http://127.0.0.1:5179` and the production web origin in the OAuth
   Client's Authorized JavaScript origins, then use `npm run google:token-helper`
   to obtain a short-lived ID token and run
   `QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries`.
   Problems, Interview, Poker local actions, Poker online fallback, Settings
   export/import/reset/logout, Account local profile flows, Memory file/history
   flows, Community CRUD/media flows, Messages thread/send/unread/private-entry
   flows, Experiences CRUD/share flows, News manual form submit, Overview
   leaderboard region scope, Resume endpoint review, Settings Google Client ID
   save/clear, external-link new-tab behavior, Library real cloud reader iframe,
   all-route desktop/mobile visual smoke, and all-route GitHub baseline parity
   already have browser/CDP/Chrome evidence.

2. Decide whether retained local DOM helpers should be converted now or later.
   Known examples include the Poker preflop matrix helper and rich-text/embed
   helpers that intentionally render sanitized content.

3. Decide whether stale CSS selectors for the retired `.module-partial-root`
   should be deleted now. This is style debt only; the React shell no longer
   renders `.module-partial-root`, and strict route checks pass.

4. Keep bundle tracking in place. The current main chunk is inside the ledger
   budget but still above Vite's 500 KB warning threshold.

5. Keep auditing split-slice dependencies. Any function created in a later
   slice and consumed by an earlier slice must go through `ctx.__sliceRefs` or a
   stable facade; direct closure references can pass build checks but fail only
   in browser smoke.

## 1. Non-Negotiable Agent Rules

Follow these rules for every migration task.

1. Start with repository sync and status:

   ```bash
   git fetch --all --prune
   git status -sb
   git branch -vv --list main codex/fix-responsive-ui-audit
   ```

2. For the current branch, React work has already started and full-route React
   checks pass. Do not go back to a strict vanilla Stage 1 target unless a new
   branch explicitly needs to reconstruct that history.

3. Keep Poker last for any risky refactor. Poker has local fallback, online
   server-authoritative behavior, WebSocket state, and backend coupling.

4. Do not do a full rewrite. Make small vertical slices and keep the app
   buildable after every slice.

5. Do not introduce Redux at Stage 1 or at the beginning of Stage 2. Use the
   existing store direction first, then bridge it into React with Context and
   `useSyncExternalStore`.

6. Do not add a second HTML application entry to solve routing. Stage 1 remains
   a single Vite app. Stage 2 becomes a React SPA entry.

7. After each coding slice, run:

   ```bash
   npm run build
   git status -sb
   ```

8. If a slice touches routing, auth, module lifecycle, state persistence, API
   calls, or React route rendering, run the relevant Stage 1 compatibility and
   Stage 2 smoke checks in Sections 4 and 6.

## 2. Stage 1 Target State

Stage 1 is complete when QuantGym is still vanilla JavaScript, but the app is
modular enough that Stage 2 can mount React around or instead of each page
without reverse-engineering a monolith.

The target Stage 1 shape is:

```text
src/
  main.js                         small entry only
  router.js                       hash router
  router/routes.js                route metadata shared by nav, auth, Stage 2
  app/
    startVanillaApp.js            app bootstrap function
    createAppContext.js           runtime/store/service construction
    bindAppEvents.js              shell-level event wiring
    registerAppModules.js         module registration by domain
    services/                     cross-module services
  state/
    store.js                      pub/sub primitive
    appStore.js                   shell/session state
    authStore.js                  auth/account state
    userStateStore.js             persisted user training state
    preferencesStore.js           language/sidebar/settings state
    persistence.js                storage IO
  api/
    client.js                     request primitive
    authApi.js
    syncApi.js
    newsApi.js
    jobsApi.js
    interviewApi.js
    resumeApi.js
    leaderboardApi.js
    pokerApi.js
  lib/                            pure helpers only
  ui/                             reusable vanilla UI helpers
  modules/
    manifest.js                   module metadata
    registry.js                   lifecycle registry
    <module>/
      index.js                    exports lifecycle
      template.js                 owns module DOM skeleton when needed
      data.js                     static/local data
      runtime.js                  stateful local runtime when needed
      controllerBundle.js         event handlers and orchestration when needed
      provider.js                 data access adapter when needed
```

Hard Stage 1 expectations:

- `src/main.js` is a bootstrap entry, not an orchestration hub.
- Every routeable module has a manifest entry.
- Every manifest entry has a `src/modules/<id>/index.js`.
- Every module lifecycle can be registered without importing from `src/main.js`.
- Module selectors are root-scoped wherever practical.
- `src/main.js` contains no direct `fetch`.
- Frontend network access is centralized under `src/api/`.
- Persistent state updates go through store/action APIs rather than ad hoc
  global mutation.
- Stage 1 does not add React dependencies.
- `npm run build` passes.

Recommended metrics:

- `src/main.js`: target under 500 lines; hard ceiling 700 lines.
- `src/app/featureModules.js`: split or shrink below 300 lines. Prefer deleting
  it after replacement by domain-specific registrars.
- `fetch(` in `src/`: only allowed in `src/api/client.js` or narrowly reviewed
  API transport files.
- Direct `document.getElementById` / global `querySelector` in page modules:
  allowed only during transition, but new or touched modules should scope
  queries to the module root.

## 3. Detailed Plan To Complete Stage 1

### 3.1 Stage 1.0 - Baseline And Guardrails

Goal: create a clean, measurable starting point before touching architecture.

Code changes:

1. Add a Stage 1 check script:

   - Create `scripts/check-stage1.mjs`.
   - Add `"check:stage1": "node scripts/check-stage1.mjs"` to
     `package.json`.
   - The first version may be static checks only. Do not block on browser
     automation yet.

2. The script should check:

   - `app.js` does not exist at repo root.
   - `src/router.js` exists.
   - `src/modules/manifest.js` exists after Stage 1.1.
   - Every module in the manifest has `src/modules/<id>/index.js`.
   - Every `[data-module-view]` in `index.html` has a manifest entry.
   - Every `[data-module-tab]` in `index.html` has a manifest entry or an
     explicit allowed exception.
   - No React dependency exists before Stage 2.
   - `src/main.js` line count is below the current configured threshold.
   - No frontend `fetch(` exists outside the API layer allowlist.
   - No file imports from `src/main.js`.

3. Add a short npm script:

   ```json
   {
     "scripts": {
       "check:stage1": "node scripts/check-stage1.mjs"
     }
   }
   ```

4. Do not make the threshold too strict in the first commit. Start with a
   warning threshold for `src/main.js`, then turn it into a failure when the
   bootstrap extraction is complete.

Verification:

```bash
npm run check:stage1
npm run build
```

Done when:

- The script runs locally.
- It reports actionable failures instead of vague text.
- It is safe to run in CI or by another agent.

### 3.2 Stage 1.1 - Formalize Module Manifest And Lifecycle Contract

Goal: make routes, nav, auth, and future React pages depend on a single module
metadata table instead of scattered strings.

Code changes:

1. Add `src/modules/manifest.js`.

   Suggested shape:

   ```js
   export const MODULE_MANIFEST = [
     {
       id: "overview",
       hash: "#overview",
       path: "/",
       labelKey: "overview",
       navGroup: "overview",
       protected: true,
       stage2Priority: 20
     },
     {
       id: "news",
       hash: "#news",
       path: "/news",
       labelKey: "news",
       navGroup: "social",
       protected: true,
       stage2Priority: 10
     }
   ];
   ```

2. Include every current module:

   - `overview`
   - `plan`
   - `skills`
   - `interview`
   - `problems`
   - `tools`
   - `poker`
   - `experiences`
   - `news`
   - `community`
   - `messages`
   - `network`
   - `resume`
   - `jobs`
   - `companies`
   - `library`
   - `courses`
   - `memory`
   - `settings`
   - `account`
   - `pk` if it remains routeable in `index.html`

3. Add helpers in `src/modules/manifest.js`:

   ```js
   export function getModuleDefinition(id) {}
   export function getModuleIds() {}
   export function getDefaultModuleId() {}
   export function isProtectedModule(id) {}
   export function getStage2Path(id) {}
   ```

4. Update `src/router.js` to use the manifest for default route and available
   route validation. Preserve the existing hash behavior.

5. Update `src/state/authGate.js` to use module metadata instead of assuming
   every route has the same behavior. In Stage 1, most modules can remain
   protected. Keep auth shell behavior unchanged.

6. Extend `src/modules/registry.js`:

   - Add `getRegisteredModuleNames()`.
   - Add lifecycle validation.
   - Warn or throw in development when a registered module is missing both
     `mount` and `render`.
   - Keep the public `registerModule`, `getModuleLifecycle`,
     `runModuleLifecycle`, and `renderModules` API stable unless all callers are
     updated in the same slice.

Verification:

```bash
npm run check:stage1
npm run build
```

Manual route checks:

- Login, open `#overview`, `#news`, `#jobs`, `#problems`, `#interview`.
- Use browser back and forward between modules.
- Refresh on a hash route while logged in.
- Open a protected hash route while logged out, then log in and confirm the
  intended module is restored.

Done when:

- Route strings live in the manifest.
- Stage 2 path strings live in the manifest.
- The app still uses hash routing in Stage 1.
- No module disappears from nav or route resolution.

### 3.3 Stage 1.2 - Shrink `src/main.js` Into A Real Bootstrap Entry

Goal: make `src/main.js` small enough that Stage 2 can replace it with
`src/main.jsx` without dragging app internals through the entry file.

Code changes:

1. Create `src/app/startVanillaApp.js`.

   It should export:

   ```js
   export function startVanillaApp(options = {}) {}
   ```

   This function owns `onDomReady`, calls `runAppBootstrap`, and receives any
   browser globals through options only when needed for tests.

2. Create `src/app/createAppContext.js`.

   Move construction of app-wide state, stores, API clients, runtimes, and
   cross-module services out of `src/main.js` into this file.

   Suggested return shape:

   ```js
   export function createAppContext({ documentRef = document, windowRef = window } = {}) {
     return {
       documentRef,
       windowRef,
       appStore,
       authStore,
       userStateStore,
       services,
       controllers,
       elements
     };
   }
   ```

3. Create `src/app/bindAppEvents.js`.

   Move shell-level event binding out of `src/main.js`.

   Keep module-specific event binding inside module `mount()` functions. Do not
   move module event handlers into this file.

4. Create `src/app/registerAppModules.js`.

   This should call the existing domain registrars:

   - `registerDashboardModules`
   - `registerTrainingModules`
   - `registerContentModules`
   - `registerCommunityModule`
   - `registerSupportModules`
   - `registerUtilityModules`
   - `registerPokerModule`

   It should receive a structured app context, not a 150-property dependency
   bag.

5. Update `src/main.js` to become:

   ```js
   import { startVanillaApp } from "./app/startVanillaApp.js";

   startVanillaApp();
   ```

   A few lines of config import are acceptable during transition, but do not
   leave runtime creation or module registration in `src/main.js`.

6. If extraction cannot be finished in one safe slice, use this intermediate
   order:

   - Move bootstrap call first.
   - Move event binding second.
   - Move context creation third.
   - Move module registration fourth.
   - Delete dead imports from `src/main.js` after each move.

Verification:

```bash
wc -l src/main.js
npm run check:stage1
npm run build
```

Manual checks:

- Fresh app load.
- Auth page render.
- Login render.
- Module switch.
- Language switch.
- Sidebar collapse/expand.
- Global search open/close.

Done when:

- `src/main.js` is under 700 lines, ideally under 500.
- `src/main.js` has no controller construction.
- `src/main.js` has no module-specific render logic.
- `src/main.js` has no direct DOM selectors except the entry call, if any.
- `src/main.js` imports only bootstrap-level modules.

### 3.4 Stage 1.3 - Replace The Giant Dependency Bag

Goal: make module registration understandable and stable before React migration.

Current issue:

- `src/app/featureModules.js` receives a large untyped dependency object.
- This makes ownership unclear and makes Stage 2 mapping harder.

Code changes:

1. Split the current registration dependency object into domain contexts:

   ```text
   src/app/context/
     shellContext.js
     authContext.js
     problemContext.js
     interviewContext.js
     contentContext.js
     communityContext.js
     pokerContext.js
   ```

2. Each context file should export a small factory:

   ```js
   export function createProblemContext(appContext) {
     return {
       problemStore: appContext.stores.problemStore,
       problemApi: appContext.api.problemApi,
       navigation: appContext.services.navigation,
       renderIcons: appContext.services.renderIcons
     };
   }
   ```

3. Update `src/app/registerAppModules.js` to pass only the relevant context to
   each registrar.

4. Update `src/modules/registrars/*.js` so each registrar takes one context
   object, not an arbitrary spread of all app capabilities.

5. Keep old names temporarily if needed, but do not keep both systems for long.
   Each migrated registrar should delete unused dependencies.

6. Avoid circular imports:

   - Modules may import `api`, `state`, `lib`, and `ui`.
   - Modules must not import `src/main.js`.
   - Lower-level `state` and `api` must not import page modules.
   - `ui` helpers must not import page modules.

Verification:

```bash
rg -n "registerAppFeatureModules|create.*Context|from ['\\\"]\\.\\./main|from ['\\\"]\\.\\./\\.\\./main" src
npm run check:stage1
npm run build
```

Done when:

- `src/app/featureModules.js` is deleted or reduced to a thin compatibility
  wrapper.
- Registrars read like domain wiring, not a global dependency dump.
- Adding a new module requires changing manifest, registrar, and module folder,
  not `src/main.js`.

### 3.5 Stage 1.4 - Make Every Module Self-Contained

Goal: each module owns its lifecycle, root DOM, event listeners, data access, and
cleanup. This is the most important prerequisite for the React legacy adapter.

For each module folder, enforce this contract:

```js
export function createExampleModule(context = {}) {
  return {
    mount(root) {},
    render(root) {},
    unmount(root) {}
  };
}
```

Recommended module file layout:

```text
src/modules/<module>/
  index.js              lifecycle only
  template.js           creates or returns the DOM skeleton
  controllerBundle.js   event handlers and orchestration
  data.js               static data and normalizers
  runtime.js            module-local state and timers
  provider.js           module data provider when needed
```

Implementation details:

1. Module roots:

   - `index.html` should eventually keep only shell structure and empty module
     roots.
   - Each module should render its own internal skeleton into its own root.
   - Do not require another module's DOM to exist.

2. Selectors:

   - Prefer `root.querySelector(...)` over `document.querySelector(...)`.
   - Keep global selectors only for true shell elements.
   - When a module still needs global `els`, wrap access behind a module adapter
     and mark it as transitional.

3. Events:

   - Bind module event listeners in `mount`.
   - Remove them in `unmount`.
   - Avoid adding duplicate listeners on repeated `render`.
   - Timers, intervals, observers, and WebSockets must be cleaned up in
     `unmount`.

4. Rendering:

   - `render` must be idempotent.
   - Calling `render` twice should not duplicate DOM or event handlers.
   - `render` should tolerate empty data and offline state.

5. State:

   - Modules should call store actions or services.
   - Modules should not mutate app-wide objects directly.

6. API:

   - Modules call endpoint-specific API wrappers.
   - Modules do not call `fetch` directly.

Migration order:

1. Low-risk leaf modules:

   - `messages`
   - `network`
   - `memory`
   - `companies`
   - `courses`
   - `jobs`
   - `resume`
   - `experiences`
   - `news`
   - `settings`

2. Shell and content modules:

   - `overview`
   - `account`
   - `library`

3. Core training modules:

   - `problems`
   - `interview`
   - `skills`
   - `tools`
   - `plan`

4. Last:

   - `poker`

Module completion checklist:

- `src/modules/<module>/index.js` exports a lifecycle factory.
- The registrar registers the module by manifest id.
- The module can mount, render, unmount, then mount again.
- The module has no import from `src/main.js`.
- The module uses root-scoped selectors for new code.
- The module clears timers/listeners/subscriptions.
- The module uses store actions for shared state.
- The module uses `src/api/*` for network calls.
- `npm run build` passes after the module slice.

### 3.6 Stage 1.5 - Finish The State Layer

Goal: move from mutable global state objects to explicit stores and actions that
can be consumed later by React.

Code changes:

1. Keep `src/state/store.js` as the pub/sub primitive.

2. Add domain stores:

   ```text
   src/state/appStore.js
   src/state/authStore.js
   src/state/userStateStore.js
   src/state/preferencesStore.js
   src/state/communityStore.js
   ```

3. Each store should expose:

   ```js
   export function createUserStateStore(deps = {}) {
     const store = createStore(initialState);
     return {
       getState: store.getState,
       subscribe: store.subscribe,
       actions: {
         toggleProblemCompleted(id) {},
         updateSettings(patch) {},
         recordPracticeResult(result) {}
       }
     };
   }
   ```

4. Put persistence at action boundaries:

   - Load state during app context creation.
   - Save state after actions that change persisted data.
   - Queue cloud sync from actions or sync service, not from random render code.

5. Convert modules gradually:

   - First replace direct mutations in touched modules.
   - Then replace the remaining `appState` and `userState.value` mutation paths.
   - Keep compatibility adapters only until all modules in the domain are moved.

6. Add selectors where repeated derived values exist:

   ```text
   src/state/selectors/
     problemSelectors.js
     overviewSelectors.js
     authSelectors.js
   ```

Verification:

```bash
rg -n "appState\\.|userState\\.value|currentUser" src/main.js src/app src/modules
npm run check:stage1
npm run build
```

Interpretation:

- `currentUser` references are expected in auth/session code.
- New direct mutation in modules is not acceptable.
- Existing direct mutation should trend down with each slice.

Done when:

- Shared state has named actions.
- Persistence does not happen inside render functions.
- React can later subscribe to the same stores without rewriting state logic.

### 3.7 Stage 1.6 - Complete The API Client Boundary

Goal: make all frontend network calls go through reviewable API wrappers.

Code changes:

1. Expand `src/api/client.js`:

   - Keep `requestJson`.
   - Keep `requestText`.
   - Add `requestForm` if upload endpoints need it.
   - Add `createApiClient({ baseUrl, tokenProvider, fetchImpl })` if repeated
     base URL/token logic exists.
   - Keep `ApiError` as the common error type.

2. Add endpoint clients:

   ```text
   src/api/authApi.js
   src/api/syncApi.js
   src/api/newsApi.js
   src/api/jobsApi.js
   src/api/interviewApi.js
   src/api/resumeApi.js
   src/api/leaderboardApi.js
   src/api/pokerApi.js
   ```

3. Move endpoint strings into the endpoint clients.

4. For WebSockets, put URL construction and socket creation in `pokerApi.js`,
   but keep Poker game flow in `src/modules/poker/`.

5. Replace frontend direct network calls:

   ```bash
   rg -n "fetch\\(" src
   ```

   The result should be empty outside `src/api/` after migration.

6. Keep backend code independent:

   - `api-server/server.py`
   - `api-server/poker_engine.py`
   - `llm-proxy/server.mjs`

   Do not pull backend concerns into frontend modules.

Verification:

```bash
rg -n "fetch\\(" src --glob '!src/api/**'
npm run check:stage1
npm run build
```

Manual checks:

- Login/register.
- Cloud sync.
- News refresh.
- Jobs refresh.
- Interview AI calls.
- Resume review.
- Leaderboard refresh.
- Poker online connect/disconnect if touched.

Done when:

- Direct frontend network calls are centralized.
- Error handling is consistent.
- Modules consume API functions, not endpoints.

### 3.8 Stage 1.7 - Harden Routing And Auth Gate

Goal: keep the Stage 0 hash route fix correct while making it ready to map to
React Router later.

Code changes:

1. Move route metadata to `src/router/routes.js` or re-export it from
   `src/modules/manifest.js`. Avoid two competing route tables.

2. Keep `src/router.js` focused on hash mechanics:

   - normalize hash
   - resolve module
   - write route
   - listen to `hashchange` and `popstate`

3. Keep `src/state/authGate.js` focused on decisions:

   - current user present or not
   - requested module protected or not
   - target module
   - whether to switch now

4. Preserve pending route behavior:

   - If a logged-out user opens `#jobs`, do not lose the hash.
   - After login, restore `jobs`.
   - If the hash is unknown, fall back to `overview`.

5. Add backwards-compatible aliases:

   - empty hash -> `overview`
   - `#home` -> `overview`
   - `#dashboard` -> `overview`

6. Do not switch to path routing in Stage 1.

Verification:

Manual route matrix:

| State | Action | Expected |
|---|---|---|
| Logged out | Open `/index.html#jobs` | Auth shell remains visible, hash is not destructive |
| Logged out then login | Login from `#jobs` | App opens Jobs |
| Logged in | Click News then Jobs | Hash changes and module switches |
| Logged in | Browser back | Previous module appears |
| Logged in | Refresh on `#interview` | Interview appears |
| Logged in | Open unknown `#bad-route` | Overview appears |
| Logged in | Logout on any route | Auth shell appears without broken module UI |

Done when:

- All route decisions go through one router and one auth gate.
- Hash route behavior is stable enough to preserve during Stage 2 bridge work.

### 3.9 Stage 1.8 - Clean Shared UI And Pure Libraries

Goal: reduce duplicate DOM and helper code before React begins.

Code changes:

1. Keep `src/lib/` pure:

   - no DOM access
   - no localStorage access
   - no network calls
   - deterministic helpers only

2. Keep `src/ui/` for vanilla UI helpers:

   - icons
   - text setters
   - module shell helpers
   - global search
   - auth tabs
   - reusable empty states

3. Move duplicated helpers from modules into `src/lib/` or `src/ui/` only when
   at least two modules need them.

4. Do not over-abstract one-off module UI. If a helper is only used by one
   module, keep it in that module.

5. For dangerous HTML rendering:

   - Prefer DOM creation APIs.
   - If using `innerHTML`, escape all interpolated user/content strings.
   - Keep rich text rendering in a reviewed renderer, not scattered templates.

Verification:

```bash
rg -n "innerHTML\\s*=|insertAdjacentHTML" src/modules src/ui
npm run build
```

Interpretation:

- This command is an audit inventory, not a Stage 1 hard failure.
- Any touched `innerHTML` path must be checked for escaping.

Done when:

- Common helpers have clear homes.
- New modules do not copy-paste shell helpers.
- React migration can replace UI helpers gradually, not untangle mixed logic.

### 3.10 Stage 1.9 - Optional Lazy Module Loading

Goal: reduce bundle size and make Stage 2 page-level splitting easier.

This is optional for Stage 1 completion, but useful if the main JS chunk remains
too large.

Code changes:

1. Extend the manifest with lazy import functions:

   ```js
   {
     id: "news",
     load: () => import("./news/index.js")
   }
   ```

2. Update registry to support async module registration:

   ```js
   export async function ensureModuleRegistered(id, context) {}
   ```

3. Update `switchModule` flow to wait for the target module before running its
   lifecycle.

4. Start with low-risk modules like `news`, `companies`, or `courses`.

5. Do not lazy-load Poker first.

Verification:

```bash
npm run build
```

Manual checks:

- Direct hash deep link to a lazy module.
- Back/forward between lazy and already-loaded modules.
- Offline fallback for modules with local data.

Done when:

- Lazy modules load on direct hash routes.
- Loading state is visible and non-janky.
- Failed lazy import falls back to a usable error state.

## 4. How To Check Stage 1 Completion

Stage 1 is complete only when all checks below pass.

### 4.1 Git And Dependency Check

```bash
git fetch --all --prune
git status -sb
git rev-list --left-right --count HEAD...@{u}
npm install
```

Expected:

- Working tree clean before final review.
- Current branch has no accidental uncommitted files.
- Ahead/behind is understood.
- Lockfile changes are intentional.

### 4.2 Static Architecture Check

Run:

```bash
npm run check:stage1
```

The script should verify:

- no root `app.js`
- route manifest exists
- every routeable module has an index file
- every `data-module-view` has a manifest entry
- every registered module maps to a known manifest id
- no imports from `src/main.js`
- `src/main.js` below the configured line limit
- no React dependencies
- no frontend `fetch` outside the API layer
- no migration recovery/debug scripts are left in `scripts/`
- `src/app/createAppContext.impl.js` is below the configured line limit, or is
  absent because it has been split into smaller service/context files
- `src/app/moduleControllers.js` is below the configured line limit and does
  not accept an unbounded dependency bag
- new domain stores are instantiated by `createAppContext`
- React bridge files are absent when running strict Stage 1 mode

Recommended strict Stage 1 mode:

```bash
QUANTGYM_STAGE=1 npm run check:stage1
```

In strict Stage 1 mode, `check:stage1` must fail if any of these exist:

- React dependencies in `package.json`
- `src/main.jsx`
- `src/App.jsx`
- `src/routes/`
- `src/layouts/`
- `src/pages/`
- `src/features/`
- `src/legacy/`

Once Stage 2 has started, use the Stage 1 script as a compatibility check only:

```bash
QUANTGYM_STAGE=2 npm run check:stage1
```

In Stage 2 compatibility mode, the script should still validate that the legacy
bridge is clean, but it should not pretend Stage 1 strict purity still applies.
The current branch is in this category.

Additional useful commands:

```bash
wc -l src/main.js src/app/*.js src/app/**/*.js
find src/modules -mindepth 2 -maxdepth 2 -name index.js | sort
rg -n "from ['\\\"].*main\\.js|from ['\\\"]\\.\\./main|from ['\\\"]\\.\\./\\.\\./main" src
rg -n "fetch\\(" src --glob '!src/api/**'
rg -n "react|react-dom|react-router-dom|createRoot|BrowserRouter|HashRouter" package.json src
wc -l src/main.js src/main.jsx src/App.jsx src/app/createAppContext/**/*.js src/app/pageApi.js
rg -n "new Function|const body =|importKeys|ctxKeys" src/app/createAppContext src/app
rg -n "module-partial-root|createPortal\\(|document\\.querySelector" src/components src/features src/routes
rg -n "recover-|__pycache__" scripts
rg -n "createAppStore|createAuthStore|createUserStateStore|createPreferencesStore|createCommunityStore" src/app src/state
```

Expected:

- `src/main.js` is small.
- large orchestration code has not merely moved to another single file.
- No module imports the entry file.
- No frontend network calls bypass the API layer.
- No React code has entered strict Stage 1.
- Store factories are actually used, not just present on disk.
- In Stage 2 compatibility mode, no generated `new Function` runtime slices are
  hidden behind small wrapper files.

### 4.3 Build Check

Run:

```bash
npm run build
```

Expected:

- Build exits with code 0.
- Vite warnings about classic scripts are acceptable if unchanged.
- Chunk-size warnings are acceptable for Stage 1 unless the slice claims to fix
  bundle size.
- New warnings must be explained.

Optional strict build:

```bash
QUANTGYM_WEB_STRICT=1 \
QUANTGYM_WEB_API_ENDPOINT=https://example.com \
QUANTGYM_WEB_LLM_ENDPOINT=https://example.com \
npm run build
```

Use real deployment endpoints when performing a release check.

### 4.4 Manual Browser Smoke Check

Run the app locally:

```bash
npm run dev -- --host 127.0.0.1
```

Smoke matrix:

1. Auth shell:

   - Fresh load shows auth shell.
   - Login/register tabs switch.
   - Language text updates.
   - Google placeholder/config still renders.

2. Session:

   - Local login works.
   - User chip renders.
   - Logout returns to auth shell.
   - Existing user state persists across refresh.

3. Routing:

   - Click several module tabs.
   - Hash updates.
   - Browser back/forward works.
   - Refresh on `#overview`, `#news`, `#jobs`, `#problems`, `#interview`.
   - Logged-out deep link restores after login.

4. Low-risk modules:

   - Overview renders.
   - Companies list renders.
   - Courses render.
   - Settings save.
   - News refresh or fallback.
   - Jobs refresh or fallback.
   - Resume upload/review UI still works if configured.

5. Core modules:

   - Problems list/filter/detail.
   - Problem completion/saved state.
   - Interview setup/start/answer/report.
   - Skills radar and mental math.
   - Library list/search/reader.

6. Poker:

   - Local table loads.
   - Basic action flow works.
   - Online connect/disconnect works if backend is available.
   - Leaving Poker cleans up socket/listeners.

7. Responsive:

   - Desktop width around 1440px.
   - Tablet width around 768px.
   - Mobile width around 390px.
   - Nav, module content, auth shell, and Poker do not overlap.

### 4.5 Stage 1 Definition Of Done

Stage 1 is complete when all are true:

- `npm run check:stage1` passes.
- `npm run build` passes.
- `src/main.js` is a bootstrap entry.
- Route metadata is centralized.
- Modules are registered through manifest-aware registrars.
- Modules own mount/render/unmount and cleanup.
- Shared state is exposed through store/actions.
- Frontend API calls are centralized under `src/api/`.
- Hash routing and auth restoration work.
- No React dependencies exist.
- Poker remains working and has not been rewritten prematurely.
- Manual smoke checks pass on desktop and mobile.

Only after this gate should an agent begin Stage 2.

## 5. Detailed Steps From Stage 1 To Stage 2

Stage 2 should start as a bridge, not as a rewrite. React should first own the
shell and routing while legacy Stage 1 modules remain mountable. Then pages can
be converted one by one.

### 5.1 Stage 2.0 - Create The React Bridge Branch

Goal: isolate React entry work from Stage 1 hardening.

Commands:

```bash
git checkout -b codex/react-stage2-bridge
npm install react react-dom react-router-dom
npm install -D @vitejs/plugin-react
```

Code changes:

1. Update `vite.config.js`:

   ```js
   import react from "@vitejs/plugin-react";

   export default defineConfig({
     plugins: [react()],
     // keep existing config
   });
   ```

2. Do not delete vanilla modules.

3. Do not change route behavior yet except through the planned React router
   bridge.

Verification:

```bash
npm run build
```

Done when:

- React dependencies install cleanly.
- Vite still builds.
- No UI behavior has changed yet.

### 5.2 Stage 2.1 - Make Legacy Bootstrap Importable

Goal: React must be able to initialize the existing stores/services/modules
without `src/main.js` auto-running a second app.

Code changes:

1. Ensure Stage 1 has `src/app/startVanillaApp.js` and
   `src/app/createAppContext.js`.

2. Add `src/legacy/createLegacyApp.js`:

   ```js
   import { createAppContext } from "../app/createAppContext.js";
   import { registerAppModules } from "../app/registerAppModules.js";

   export function createLegacyApp(options = {}) {
     const context = createAppContext(options);
     registerAppModules(context);
     return context;
   }
   ```

3. The legacy app object must expose:

   - stores
   - services
   - router helpers
   - `getModuleLifecycle`
   - `runModuleLifecycle`
   - `renderModules`

4. `src/main.js` remains available for vanilla Stage 1 until the React entry
   replaces it.

Verification:

```bash
npm run build
```

Done when:

- Legacy context can be created without DOM-ready side effects.
- Module registration can happen exactly once.
- React can later call legacy module lifecycles safely.

### 5.3 Stage 2.2 - Add React Entry And App Skeleton

Goal: introduce React without converting any page yet.

Code changes:

1. Add `src/main.jsx`:

   ```jsx
   import { StrictMode } from "react";
   import { createRoot } from "react-dom/client";
   import { App } from "./App.jsx";

   createRoot(document.getElementById("root")).render(
     <StrictMode>
       <App />
     </StrictMode>
   );
   ```

2. Update `index.html`:

   - Keep `config.js` and data scripts before the module bundle.
   - Replace the old app shell body with `<div id="root"></div>` only after
     legacy modules can render their own templates.
   - Change the module entry from `/src/main.js` to `/src/main.jsx`.

3. Add `src/App.jsx`.

4. Add folders:

   ```text
   src/routes/
   src/layouts/
   src/pages/
   src/components/
   src/features/
   src/stores/
   src/legacy/
   ```

5. Keep global CSS initially. Do not redesign the UI in this step.

Verification:

```bash
npm run build
```

Done when:

- React root renders.
- No page conversion has happened yet.
- The build passes.

### 5.4 Stage 2.3 - Bridge Stage 1 Stores Into React

Goal: React pages should consume the Stage 1 stores instead of recreating state.

Code changes:

1. Add `src/stores/useExternalStore.js`:

   ```jsx
   import { useSyncExternalStore } from "react";

   export function useExternalStore(store, selector = (state) => state) {
     return useSyncExternalStore(
       store.subscribe,
       () => selector(store.getState()),
       () => selector(store.getState())
     );
   }
   ```

2. Add `src/stores/LegacyAppContext.jsx`:

   - Create React context for the legacy app object.
   - Provide hooks:
     - `useLegacyApp()`
     - `useAppStore(selector)`
     - `useAuthStore(selector)`
     - `useUserStateStore(selector)`

3. Do not duplicate persistence logic in React.

4. Do not put all app state into `App.jsx`.

5. The stores exposed through these hooks must be real subscribing stores. A
   fallback object with `subscribe: () => () => {}` is acceptable only for tests,
   not for production app state.

6. `createAppContext` must instantiate or expose the same stores used by React:

   - `createAppStore`
   - `createAuthStore`
   - `createUserStateStore`
   - `createPreferencesStore`
   - `createCommunityStore`

7. Vanilla auth/session code must notify the React auth store on login and
   logout. User-state save/load must notify the React user-state store. Language
   changes must notify the preferences store.

Verification:

```bash
npm run build
```

Done when:

- React can read current user/session state.
- React can subscribe to store updates.
- Vanilla modules and React pages share the same source of truth.
- Logging in from a protected route re-renders `ProtectedRoute` without a manual
  refresh.

### 5.5 Stage 2.4 - Add React Router And Protected Routes

Goal: React owns navigation while preserving Stage 1 route metadata.

Code changes:

1. Add `src/routes/routeConfig.js` using the Stage 1 manifest:

   ```js
   import { MODULE_MANIFEST } from "../modules/manifest.js";

   export const REACT_PAGE_IDS = new Set([]);
   export const BRIDGE_PAGE_IDS = new Set(MODULE_MANIFEST.map((module) => module.id));

   export const routeConfig = MODULE_MANIFEST.map((module) => ({
     id: module.id,
     path: module.path,
     protected: module.protected,
     mode: REACT_PAGE_IDS.has(module.id)
       ? "react"
       : BRIDGE_PAGE_IDS.has(module.id)
         ? "bridge"
         : "legacy"
   }));
   ```

   Do not set `REACT_PAGE_IDS` to every manifest id. A route is React-owned only
   after its page no longer imports or depends on `createBridgePage`,
   `PartialBridgeContent`, `ReactPageShell`, or a legacy controller.

2. Add `src/routes/ProtectedRoute.jsx`:

   ```jsx
   import { Navigate, useLocation } from "react-router-dom";
   import { useAuthStore } from "../stores/LegacyAppContext.jsx";

   export function ProtectedRoute({ children }) {
     const currentUser = useAuthStore((state) => state.currentUser);
     const location = useLocation();
     if (!currentUser) {
       return <Navigate to="/login" replace state={{ from: location }} />;
     }
     return children;
   }
   ```

3. Add `src/routes/routes.jsx`.

4. Choose router mode:

   - Final Stage 2 target: path routing with `BrowserRouter`.
   - If static hosting fallback is not ready, use `HashRouter` only as a
     temporary bridge and keep a task to switch to `BrowserRouter`.

5. Add old hash compatibility:

   - On initial React load, if `window.location.hash` is `#jobs`, map it to
     `/jobs` and replace the URL.
   - Preserve aliases like `#home` and `#dashboard`.
   - Do not keep appending `#module` to canonical path routes after the initial
     compatibility redirect unless the route is explicitly marked `bridge`.
   - Disable the vanilla hash router once BrowserRouter is the canonical router,
     or scope it so it cannot fight React Router.

Verification:

```bash
npm run build
```

Manual checks:

- Logged-out protected route redirects to login.
- Login returns to intended route.
- Old hash deep links still work during the transition.

Done when:

- React routing uses the same route metadata as Stage 1.
- ProtectedRoute replaces vanilla auth gate for React-owned pages.
- No route is duplicated in several files.
- Route metadata accurately reports whether each route is `legacy`, `bridge`,
  or `react`.

### 5.6 Stage 2.5 - Create The Legacy Module Host

Goal: every Stage 1 module can run inside a React route before being rewritten.

Code changes:

1. Add `src/legacy/LegacyModuleHost.jsx`:

   ```jsx
   import { useEffect, useRef } from "react";
   import { useLegacyApp } from "../stores/LegacyAppContext.jsx";

   export function LegacyModuleHost({ moduleId }) {
     const rootRef = useRef(null);
     const legacyApp = useLegacyApp();

     useEffect(() => {
       const lifecycle = legacyApp.getModuleLifecycle(moduleId);
       lifecycle?.mount?.(rootRef.current, legacyApp);
       lifecycle?.render?.(rootRef.current, legacyApp);
       return () => {
         lifecycle?.unmount?.(rootRef.current, legacyApp);
       };
     }, [legacyApp, moduleId]);

     return (
       <section
         ref={rootRef}
         className="module-view active"
         data-module-view={moduleId}
       />
     );
   }
   ```

2. This host requires Stage 1 modules to accept a root argument or read their
   root from context. If a module still depends on static `index.html` internals,
   fix that module before hosting it in React.

3. Route all modules to `LegacyModuleHost` initially.

4. Keep shell-level React layout outside the legacy module root.

Verification:

```bash
npm run build
```

Manual checks:

- Overview route renders through legacy host.
- News route renders through legacy host.
- Switching routes calls unmount/mount correctly.
- No duplicate event handlers appear after repeated navigation.

Done when:

- React can navigate between legacy modules.
- Stage 1 modules still behave as before.
- The bridge can be used to rewrite pages incrementally.

### 5.7 Stage 2.6 - Build React Layouts

Goal: React owns shell UI, but page content can still be legacy-hosted.

Code changes:

1. Add `src/layouts/AppLayout.jsx`:

   - topbar
   - sidebar/nav
   - language control
   - user chip
   - settings shortcut
   - `<Outlet />`

2. Add `src/layouts/AuthLayout.jsx`:

   - login/register layout
   - Google auth placeholder
   - auth message area

3. Add common components:

   ```text
   src/components/common/Button.jsx
   src/components/common/IconButton.jsx
   src/components/common/EmptyState.jsx
   src/components/shell/Sidebar.jsx
   src/components/shell/Topbar.jsx
   src/components/shell/UserChip.jsx
   ```

4. Use route manifest for nav items.

5. Do not convert page internals in this step.

Verification:

```bash
npm run build
```

Manual checks:

- Shell matches current behavior.
- Nav active state follows route.
- User chip and language control work.
- Mobile nav remains usable.

Done when:

- React owns shell chrome.
- Legacy module content is routed through `<Outlet />`.
- Shell behavior is not duplicated in vanilla and React.

### 5.8 Stage 2.7 - Convert Pages One By One

Goal: replace legacy modules with React pages incrementally.

Conversion order:

1. First low-risk page:

   - `news` or `companies`
   - Pick `news` if validating API/store integration is important.
   - Pick `companies` if validating static/render-only conversion is safer.

2. Other low-risk pages:

   - `settings`
   - `courses`
   - `jobs`
   - `resume`
   - `experiences`
   - `messages`
   - `network`
   - `memory`

3. Shell/content pages:

   - `overview`
   - `account`
   - `library` shell

4. Core training pages:

   - `problems`
   - `interview`
   - `skills`
   - `tools`
   - `plan`

5. Last:

   - `poker`

Current audit note: every route now has a React page file and every route is
listed in `REACT_PAGE_IDS`. The previous blockers for this section have been
cleared: `src/features/` no longer calls `legacyApp.pageApi.*`, route content no
longer mounts through `.module-partial-root`, and page routes use
`useSyncModuleRoute`. Future work here is limited to page-specific quality
review, manual smoke checks, and retained local helper cleanup when needed.

Per-page conversion steps:

1. Create `src/pages/<Name>Page.jsx`.

2. Move page-specific UI into `src/features/<feature>/`:

   ```text
   src/features/news/
     NewsPageContent.jsx
     NewsList.jsx
     newsHooks.js
     newsViewModel.js
   ```

3. Reuse Stage 1 API wrappers.

4. Reuse Stage 1 stores via React hooks.

5. Replace imperative DOM rendering with JSX.

6. Remove the route's `LegacyModuleHost` mapping only for that page.

7. Keep the old vanilla module until the React page is stable, then delete or
   quarantine it in the same PR if safe.

8. Update `npm run check:stage1` or add `npm run check:stage2` so removed legacy
   modules do not fail old manifest checks.

Per-page done criteria:

- React route renders the page.
- State persists exactly as before.
- API behavior matches legacy behavior.
- Back/forward works.
- Refresh works.
- Mobile layout works.
- No `document.getElementById` or broad `querySelector` in the React page.
- Legacy mapping for that route is removed.

### 5.9 Stage 2.8 - Configure Path Routing Fallback

Goal: make `/jobs`, `/news`, and other path routes refresh correctly in static
deployments.

If using `BrowserRouter`, this is required before release.

Code changes:

1. Update `scripts/build-static-site.mjs` to emit a SPA fallback.

   For GitHub Pages-style hosting:

   - copy built `dist/index.html` to `dist/404.html`

   For Netlify-style hosting:

   - emit `dist/_redirects` containing:

     ```text
     /* /index.html 200
     ```

   For Vercel-style hosting:

   - add `vercel.json` with a rewrite to `/index.html`.

2. Preserve locale entries:

   - `/zh/`
   - `/en/`

3. Add a redirect/compatibility helper for old hash links:

   - `/#jobs` -> `/jobs`
   - `/#interview` -> `/interview`

Verification:

```bash
npm run build
npm run preview
```

Manual checks:

- Open `/jobs` directly.
- Refresh `/jobs`.
- Open `/interview` directly.
- Refresh `/interview`.
- Open old `/#jobs`.
- Verify locale pages still load.

Done when:

- Path routes survive refresh.
- Old hash links still land on the right page.
- Deployment platform has the correct fallback file/config.

### 5.10 Stage 2.9 - Retire Legacy Runtime Gradually

Goal: delete the bridge only after all pages have React replacements.

Do not start final deletion until Poker is converted or intentionally left as a
long-term compatibility island.

Current audit note: route metadata now says no legacy or bridge routes remain,
so the old route-count trigger is no longer sufficient. Retirement must be
tracked by residual dependencies:

- Deprecated adapter aliases such as `createLegacyApp`, `LegacyAppContext`,
  `runLegacyBootstrap`, `ShellBootstrap`, `RouteBridge`, and `ModulePage` are
  absent from `src/`.
- `src/modules/messages/index.js` still exists while other route module entry
  files have been deleted.
- `docs/react-migration-ledger.json` documents all routes as converted and
  separately lists retained local helpers.

Steps:

1. Keep `docs/react-migration-ledger.json` as the source of truth for page
   status and retained helpers. Route metadata alone is no longer enough.

2. When retiring a compatibility alias:

   - update imports to the accurate service name first
   - delete the alias export only after `npm run check:stage2:strict` passes
   - keep hash compatibility behavior under `HashCompatRedirect` unless the
     product explicitly drops old hash URLs

3. When retiring retained Poker helpers:

   - replace remaining local DOM helper rendering, such as the preflop matrix,
     with React components
   - keep room state, online sync, and actions behind `pokerPageApi`
   - update the ledger `retainedHelpers` note after the helper is removed

4. When no compatibility aliases or islands remain:

   - delete `src/legacy/`
   - delete vanilla module registry if unused
   - delete old module templates
   - delete compatibility adapters
   - rename compatibility service files so their names describe current behavior
   - keep API clients, stores, pure libs, and data files

5. Keep Poker deletion/conversion as the final review if it is not accepted as a
   permanent island.

Verification:

```bash
npm run build
rg -n "LegacyModuleHost|legacyApp\\.pageApi|runLegacyBootstrap|ShellBootstrap|RouteBridge|LegacyAppContext|createLegacyApp|ModulePage|module-partial-root" src
rg -n "new Function|const body =|importKeys|ctxKeys" src/app/createAppContext src/app
npm run check:stage2:strict
```

Done when:

- No legacy host remains unless intentionally documented.
- React pages own all routeable modules.
- API and state layers remain shared and clean.
- App context is normal JavaScript modules, not generated string execution.
- Page route content renders through React layout ownership, not shell
  placeholder portals.

## 6. Stage 2 Checks

Add a new script once Stage 2 begins:

```json
{
  "scripts": {
    "check:stage2": "node scripts/check-stage2.mjs"
  }
}
```

Stage 2 has two different checkpoints. Do not collapse them into one pass/fail
label.

Current audit note: the repository now reports `legacy routes: 0`,
`bridge routes: 0`, and `react routes: 21` for bridge, full, and strict checks.
The strict check now covers the architectural debt that previously had to be
audited manually. Final sign-off still requires the manual smoke matrix.

### 6.1 Stage 2 Bridge Check

The bridge check proves that React can host the Stage 1 app while pages are
converted incrementally. It does not prove full React migration.

The Stage 2 bridge script should check:

- React dependencies exist.
- `src/main.jsx` exists.
- `index.html` points to `/src/main.jsx`.
- `src/routes/ProtectedRoute.jsx` exists.
- Route config maps every manifest route.
- BrowserRouter path fallback files are generated if BrowserRouter is used.
- Route config has an explicit route mode for every route:
  - `legacy`
  - `bridge`
  - `react`
- No route is both `bridge` and `react`.
- Bridge pages are counted and reported.
- React-owned pages are counted and reported.
- During an incremental bridge migration, Poker should remain `legacy` or
  `bridge` until other pages are stable. In the current full-route React state,
  Poker may be listed as `react`, but its hook/controller dependencies must
  still be audited separately.
- React subscriptions update on auth and user-state changes.
- Temporary recovery files are absent.

Recommended script output:

```text
Stage 2 bridge check passed.
legacy routes: 7
bridge routes: 10
react routes: 2
```

If all manifest routes are marked React-owned while any page still imports
`createBridgePage`, `PartialBridgeContent`, `ReactPageShell`, or another legacy
host, the bridge check must fail.

### 6.2 Stage 2 Full And Strict React Checks

The full check should be used once route metadata reports no bridge pages. The
strict check is the current release-readiness static gate.

The Stage 2 full script should check:

- No page imports `createBridgePage`.
- No page imports `PartialBridgeContent`.
- No page imports `ReactPageShell`.
- `src/legacy/` is absent, or only contains explicitly documented compatibility
  redirects.
- `routeConfig` contains no `legacy` or `bridge` page modes.
- `src/app/createAppContext.impl.js` is deleted or reduced to non-page
  service creation.
- `src/app/moduleControllers.js` is deleted or no longer owns routeable pages.
- No React page uses broad imperative DOM queries.
- Poker has been migrated last; any retained helpers are documented separately
  from route ownership.
- No `src/app/createAppContext/**` file uses `new Function`, `eval`,
  stringified JavaScript bodies such as `const body = "..."`, or dynamic runner
  argument arrays such as `importKeys` / `ctxKeys`.
- No full React page depends on `legacyApp.pageApi.*`.
- `ModulePage.jsx` and `.module-partial-root` portal mounting are gone, or the
  full check fails with a message explaining that the app is still in shell
  compatibility mode.
- `AppLayout` renders route content directly through React layout/outlet
  ownership rather than relying on hidden or placeholder DOM roots.
- `runLegacyBootstrap`, `ShellBootstrap`, `RouteBridge`, `createLegacyApp`,
  `LegacyAppContext`, and `ModulePage` occur only in documented adapter files.
- Routes use `React.lazy` or another explicit code-splitting boundary.
- The production build has an agreed bundle budget, read from
  `docs/react-migration-ledger.json`.
- `docs/react-migration-ledger.json` documents page status and any retained
  local helpers.
- `docs/SMOKE_CHECKS.md` exists and records manual smoke status.

Recommended scripts:

```json
{
  "scripts": {
    "check:stage2": "node scripts/check-stage2.mjs --bridge",
    "check:stage2:full": "node scripts/check-stage2.mjs --full",
    "check:stage2:strict": "node scripts/check-stage2.mjs --full --strict"
  }
}
```

The default `check:stage2` may remain the bridge check for compatibility, but
reviewers should run `check:stage2:strict` on the current branch. A script that
says "Stage 2 check passed" while bridge pages remain must also print the
remaining bridge count.

Stage 2 manual smoke matrix:

- Login redirect with protected route.
- Direct path refresh.
- Old hash compatibility.
- React-owned page navigation.
- No legacy-hosted route navigation remains on the current branch. Only run a
  legacy-host smoke if a future branch reintroduces bridge routes.
- State persistence across React pages and retained local helpers.
- Cloud/offline behavior.
- Desktop/mobile shell.
- Poker local and online modes.
- At least one full-page refresh on every high-risk route:
  `/problems`, `/interview`, `/poker`, `/jobs`, `/news`, and `/settings`.
- Mobile viewport checks around 390px and tablet checks around 768px.
- One smoke pass after a logged-out protected deep link and one smoke pass after
  logout from an authenticated path.

Current manual smoke status:

- Automated checks are recorded in `docs/SMOKE_CHECKS.md`.
- Route/browser smoke, logged-out auth smoke, and mobile viewport smoke are
  recorded in `docs/SMOKE_CHECKS.md`.
- Deep business interactions are still unchecked and must be completed before
  final release sign-off: Problems filters/detail/saved/completed/pagination,
  Interview start/hint/answer/favorite/exit/resume, Poker sit/add bot/start
  hand/action/settings, and Settings save/language persistence across reload.

Extra Stage 2 bridge smoke checks:

- Start logged out at `/jobs`; confirm the visible auth shell appears.
- Log in from `/jobs`; confirm React protected route re-renders and the visible
  app opens Jobs without manually refreshing.
- Log out from a protected path; confirm the URL and visible shell agree.
- Open `/#jobs`; confirm it converts to `/jobs` once, and does not keep adding
  `#jobs` after normal path navigation unless a documented compatibility mode is
  still enabled.
- Navigate from `/news` to `/companies` to `/settings`; confirm unmount cleanup
  prevents duplicate event handlers.
- If React is mounted into a hidden bridge node, confirm that this is temporary
  and that `AppLayout`/`AuthLayout` are not being counted as visible shell
  migration.

## 7. Review Handoff Checklist

When asking for review after implementing this guide, include:

1. Branch name.
2. Whether work is Stage 1 or Stage 2.
3. Commands run and results:

   ```bash
   npm run check:stage1
   npm run check:stage2
   npm run check:stage2:full
   npm run check:stage2:strict
   npm run build
   ```

4. Files intentionally added/deleted.
5. Remaining known compatibility aliases, islands, or runtime helpers.
6. Manual smoke checks completed, with updates in `docs/SMOKE_CHECKS.md`.
7. Any skipped checks and why.
8. Route mode counts:

   ```text
   legacy routes: N
   bridge routes: N
   react routes: N
   ```

9. Current line counts:

   ```bash
   wc -l src/main.js src/main.jsx src/App.jsx src/app/createAppContext/**/*.js src/app/pageApi.js
   ```

10. Results for the architectural debt scans:

   ```bash
   rg -n "new Function|const body =|importKeys|ctxKeys" src/app/createAppContext src/app
   rg -n "module-partial-root|createPortal\\(|document\\.querySelector" src/components src/features src/routes
   rg -n "legacyApp\\.pageApi|runLegacyBootstrap|ShellBootstrap|RouteBridge|LegacyAppContext|createLegacyApp|ModulePage" src
   ```

11. Confirmation that temporary recovery/debug files were removed or
    intentionally documented.

12. Current migration ledger summary from:

   ```bash
   cat docs/react-migration-ledger.json
   ```

For Stage 1 review, the most important files are:

- `src/main.js`
- `src/app/startVanillaApp.js`
- `src/app/createAppContext.js`
- `src/app/registerAppModules.js`
- `src/modules/manifest.js`
- `src/modules/registry.js`
- `src/router.js`
- `src/state/*Store.js`
- `src/api/*.js`
- `scripts/check-stage1.mjs`
- any remaining large context/controller files that replaced `src/main.js`

For Stage 2 review, the most important files are:

- `index.html`
- `vite.config.js`
- `src/main.jsx`
- `src/App.jsx`
- `src/routes/*`
- `src/layouts/*`
- `src/stores/*`
- `src/hooks/useSyncModuleRoute.js`
- `src/components/shell/*`
- `src/app/createAppContext/**`
- `src/app/createAppServices.js`
- `src/app/bootstrapApp.js`
- `src/app/pageApi.js`
- `src/app/services/*`
- `src/legacy/*` if it exists
- all pages under `src/pages/`
- converted features under `src/features/`
- `scripts/check-stage2.mjs`
- `docs/react-migration-ledger.json`
- `docs/react-migration-ledger.md`
- `docs/SMOKE_CHECKS.md`
- route mode definitions and route-mode counts
- any compatibility adapter or documented island still in use
