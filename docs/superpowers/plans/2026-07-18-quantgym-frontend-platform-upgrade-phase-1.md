# QuantGym Frontend Platform Upgrade — Phase 1 Implementation Plan

Status: approved for execution
Date: 2026-07-18
Branch: `codex/frontend-v2-preview`
Operator: Gary
Budget owner: Gary
Data-reset owner: Gary
Destroy owner: Gary
Resource review date: 2026-07-29

## 0. Goal and locked boundary

Phase 1 delivers the V2 kernel, Playful Precision 2.0 design-system foundation, the eight shared
system surfaces (including authentication and the desktop/mobile shell), a typed
FastAPI/PostgreSQL foundation, and an isolated Preview deployment.

The visual authority remains `UI 设计提升.zip`. This phase preserves:

- brand purple `#5b5ff5` and lavender surfaces;
- Plus Jakarta Sans for UI and Space Grotesk for metrics;
- the repaired Quanty mascot system and its responsive WebP variants;
- light and dark themes;
- playful but restrained feedback and tactile primary actions.

Orange remains a reward, streak, warning, and economy accent. It does not replace the locked
purple brand action color.

Phase 1 does not migrate a business route. The 22 business routes remain explicit Preview-only
compatibility surfaces until their later phase. The following eight system surfaces, including
authentication, are the only migrated surfaces in this plan:

1. Auth
2. Desktop Shell
3. Mobile Shell
4. Global Search
5. Notifications and Toast
6. Todo
7. Theme and Language
8. Network Recovery

No production service, production database, production R2 bucket, or beta route is changed by
this phase.

## 1. Phase 0 handoff and evidence freeze

Phase 0 was explicitly accepted and deployed at:

- accepted deployment commit: `7a85c2a43b24013d5a49969eca7b4a5f1d093640`;
- final accepted-evidence commit: `d4d263337728dab0156a9ee2aff4999d5085d77e`;
- branch: `codex/frontend-v2-preview`;
- Pages: `quantgym-v2-preview`;
- API: `quantgym-v2-preview-api`;
- internal LLM: `quantgym-v2-preview-llm`;
- PostgreSQL: `quantgym-v2-preview-postgres`;
- R2: `quantgym-v2-preview-media`.

The accepted Phase 0 live check proved an empty PostgreSQL public schema, private R2, exact
Pages/API/LLM commit alignment, and application bindings deferred to Phase 1. Phase 1 must not
rewrite those facts after the first migration.

Before any V2 database migration or application cutover:

1. Generate `docs/frontend-upgrade/phase-0-evidence-lock.json` from every tracked
   `370-frontend-upgrade-*` artifact plus the accepted Phase 0 review.
2. Record path, bytes, mode, and SHA-256 for each frozen file.
3. Require both the accepted deployment commit and the final accepted-evidence commit to be
   ancestors of every Phase 1 commit.
4. Make every Phase 1 checker verify the lock before and after its work.
5. Reject every Phase 1 output path that begins with `370-`.
6. Never call the Phase 0 live checker from a Phase 1 checker.

The following pre-existing user-owned untracked files remain unstaged and unmodified:

- `docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json`
- `docs/browser-audit-screenshots/371-current-preview-audit.png`
- `docs/browser-audit-screenshots/372-mascot-quality-auth-before.png`
- `docs/browser-audit-screenshots/374-mascot-quality-auth-final.jpg`

## 2. Runtime and dependency lock

All package entries use exact versions without `^`, `~`, tags, or floating ranges. Commit
`package-lock.json` and use `npm ci` in CI and provider builds.

### 2.1 JavaScript and TypeScript baseline

- Node: `20.20.2`
- npm: `10.8.2`
- React: `19.2.7`
- React DOM: `19.2.7`
- React Router DOM: `7.17.0`
- Vite: `8.1.5`
- Vite React plugin: `6.0.3`
- TypeScript: `5.9.3`
- Rolldown: `1.1.5`
- `@types/node`: `20.19.43`
- `@types/react`: `19.2.17`
- `@types/react-dom`: `19.2.3`

TypeScript stays on 5.9.3 because `openapi-typescript` 7.13.0 requires TypeScript 5.x.
Rolldown stays on 1.1.5 because the repository imports `rolldown/parseAst` directly and Vite
8.1.5 expects the 1.1.x line.

### 2.2 Application dependencies

- `@tanstack/react-query`: `5.101.2`
- `zustand`: `5.0.14`
- `react-hook-form`: `7.82.0`
- `zod`: `4.4.3`
- `@hookform/resolvers`: `5.4.0`
- `openapi-typescript`: `7.13.0`
- `undici`: `6.27.0`

TanStack Query owns server data. Zustand owns only non-sensitive presentation preferences and
short-lived UI state. Authenticated user records never enter Zustand or browser persistence.

### 2.3 Frontend tests and quality tooling

- Vitest: `4.1.10`
- jsdom: `29.1.1`
- React Testing Library: `16.3.2`
- Testing Library DOM: `10.4.1`
- Testing Library user-event: `14.6.1`
- Testing Library jest-dom: `6.9.1`
- MSW: `2.15.0`
- Playwright: `1.61.1`
- Playwright Core: `1.61.1`
- `@axe-core/playwright`: `4.12.1`
- ESLint: `10.7.0`
- `@eslint/js`: `10.0.1`
- `typescript-eslint`: `8.64.0`
- React Hooks ESLint plugin: `7.1.1`
- React Refresh ESLint plugin: `0.5.3`
- globals: `17.7.0`
- Stylelint: `17.14.0`
- Stylelint standard config: `40.0.0`

ESLint uses flat ESM configuration. Stylelint 17 also uses ESM configuration.
The repository directly imports both `playwright` and `playwright-core`, so both remain explicit,
exact direct dependencies. Local JavaScript commands put `/opt/homebrew/opt/node@20/bin` first in
`PATH`; CI and providers select the same version through their pinned runtime configuration. The
machine's default Node 18 is not an allowed Phase 1 runtime.

### 2.4 Storybook

- Storybook: `10.5.2`
- `@storybook/react-vite`: `10.5.2`
- `@storybook/addon-docs`: `10.5.2`
- `@storybook/addon-a11y`: `10.5.2`

Do not install Storybook 8-only `addon-essentials`, `addon-interactions`, or `@storybook/test`.
Browser-mode story tests are a second step and then add only:

- `@storybook/addon-vitest`: `10.5.2`
- `@vitest/browser`: `4.1.10`
- `@vitest/browser-playwright`: `4.1.10`

### 2.5 Python baseline

- Python: `3.13.14`
- FastAPI: `0.139.2`
- Starlette: `1.3.1`
- Uvicorn standard: `0.51.0`
- Pydantic: `2.13.4`
- pydantic-settings: `2.14.2`
- SQLAlchemy: `2.0.51`
- Alembic: `1.18.5`
- psycopg binary: `3.3.4`
- pwdlib with Argon2: `0.3.0`
- argon2-cffi: `25.1.0`
- PyJWT crypto: `2.13.0`
- cryptography: `49.0.0`
- email-validator: `2.3.0`
- HTTPX: `0.28.1`
- boto3: `1.43.51`
- botocore: `1.43.51`
- s3transfer: `0.19.1`
- pytest: `9.1.1`
- pytest-asyncio: `1.4.0`
- asgi-lifespan: `2.1.0`
- testcontainers: `4.14.2`

Declare `requires-python = ">=3.13,<3.14"`. Use `requirements.in` for the direct list and a fully resolved, hash-locked
`requirements.lock.txt` for builds. Python 3.13.14 is the Preview and CI baseline; 3.14 may be an
additional compatibility job but is not the sole deployment baseline.

## 3. Authentication topology

The current Pages `pages.dev` origin and Render `onrender.com` origin are cross-site. A browser
session cookie issued directly by Render would be a third-party cookie and can fail in Safari and
privacy-hardened browsers. Phase 1 therefore uses a same-origin edge proxy.

Browser topology:

```text
Browser
  -> https://quantgym-v2-preview.pages.dev/api/v2/*
  -> Cloudflare Pages Function
  -> https://quantgym-v2-preview-api.onrender.com/api/v2/*
  -> internal LLM / PostgreSQL / R2
```

Rules:

- Public web configuration exposes only `apiBase: "/api/v2"`.
- The Render origin, internal LLM origin, PostgreSQL, R2 endpoint, OAuth secrets, and edge shared
  secret never enter the browser bundle or public config.
- The Pages Function adds a rotated `X-QuantGym-Edge-Token` secret. The API requires it for
  proxied application traffic.
- The only direct-origin exception is `GET /api/v2/health`, which returns no user data, sets no
  cookie, allows no browser credentials, and exists for Render/provider health checks. Every other
  API route requires the edge proof before authentication or routing.
- The proxy forwards streaming responses, does not cache authenticated responses, and strips
  untrusted forwarding headers.
- The API validates the exact Preview origin for state-changing requests.

Session cookie:

- name: `__Host-qg_session`;
- `HttpOnly`;
- `Secure`;
- `SameSite=Lax`;
- `Path=/`;
- no `Domain` attribute.

CSRF cookie:

- name: `__Host-qg_csrf`;
- readable by the same-origin client;
- `Secure`;
- `SameSite=Lax`;
- `Path=/`;
- no `Domain` attribute;
- paired with an `X-CSRF-Token` header and a server-side session binding.

Before authentication, `GET /api/v2/auth/csrf` creates a short-lived, one-time pre-auth challenge;
login, registration, password-forgot, and password-reset mutations require its cookie/header pair
in addition to exact Origin validation. Login consumes that challenge and rotates both the session
and CSRF values into a session-bound pair. Logout revokes the server session, clears both cookies,
and clears sensitive IndexedDB drafts. No bearer token, user record, session ID, CSRF value, or
OAuth state is stored in localStorage or sessionStorage.

Google OAuth uses authorization code flow with PKCE S256, state, nonce, one-time verifier, exact
redirect URI, short expiry, and replay rejection. HTTPX performs the code and JWKS requests;
PyJWT verifies the ID token with fixed RS256 plus issuer, audience, expiry, issued-at, nonce, and
subject checks. Production code does not use Google's tokeninfo debug endpoint.

## 4. Phase 1 evidence namespace

Phase 1 uses `380-frontend-upgrade-phase-1-*` only.

Versioned contracts:

- `docs/frontend-upgrade/phase-0-evidence-lock.json`
- `docs/frontend-upgrade/phase-1-preview-contract.json`
- `docs/frontend-upgrade/phase-1-provider-evidence.schema.json`
- `docs/frontend-upgrade/phase-1-acceptance-manifest.json`
- `docs/frontend-upgrade/phase-1-schema-contract.json`

Ignored operator evidence, mode `0600`:

- `artifacts/frontend-upgrade/phase-1-preview/provider-evidence.redacted.json`

Tracked evidence:

- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-preview-live-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-postgres-migration-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-r2-binding-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-auth-security-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-legacy-boundary-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-system-surfaces-summary.json`
- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json`
- 48 exact JPG paths under
  `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-review/`, enumerated by the
  acceptance manifest as eight surfaces × three viewports × two themes; no wildcard is an output
  target.

Each child summary has this exact envelope:

```json
{
  "schemaVersion": 1,
  "check": "frontend-v2-phase1-*",
  "status": "pass",
  "checkedAt": "ISO-8601",
  "commit": "40-character lowercase SHA",
  "evidenceSha256": "SHA-256",
  "hashes": {},
  "checks": {},
  "failureCodes": []
}
```

The aggregate reaches only `ready-for-review`; it cannot mark Phase 1 accepted.

## 5. Approved Phase 1 database schema

The first Alembic revision creates only the Phase 1 application tables:

- `users`
- `user_identities`
- `sessions`
- `auth_challenges`
- `preferences`
- `notifications`
- `plan_tasks`
- `audit_events`
- `media_objects`
- `alembic_version`

It must not create or import:

- `state_json`;
- any table from `api-server/postgres/schema.sql`;
- any SQLite table or copied V1 user record;
- XP, coin, rating, League, Problem, Interview, or business-domain tables before their phase.

The schema contract freezes tables, columns, indexes, foreign keys, checks, and unique
constraints. IDs use UUIDs. Timestamps are timezone-aware. Session, reset, verification, OAuth
state, and OAuth nonce values are stored only as hashes. The short-lived PKCE verifier is the one
exception because the callback must recover its original value: store it encrypted at rest with a
rotatable server key, bind it to the hashed state, and delete it on success, expiry, or replay.
Passwords use Argon2id through pwdlib.

Migration verification runs only against an ephemeral PostgreSQL 18 instance, matching the
redacted integer `postgresMajor` read from the Preview provider:

```text
upgrade head -> fingerprint -> downgrade base -> application tables empty
-> upgrade head -> identical fingerprint
```

The shared Preview database is upgraded forward once and is never downgraded for a test.

## 6. Target repository structure

```text
v2.html
vite.v2.config.ts
vitest.v2.config.ts
tsconfig.v2.json
eslint.config.mjs
stylelint.config.mjs
.storybook/
functions/
  api/v2/
    _middleware.ts
    [[path]].ts
public-v2/
  _redirects
  _headers
  _routes.json
src/
  core/
    bootstrap/main.tsx
    router/router.tsx
    providers/AppProviders.tsx
    providers/QueryProvider.tsx
    errors/AppErrorBoundary.tsx
  design-system/
    tokens/
    primitives/
    patterns/
    motion/
  domains/
    account/auth/
    platform/notifications/
    platform/preferences/
    platform/search/
    platform/todo/
  pages/v2/
  shared/
    api/
    i18n/
    lib/
    storage/
    testing/
  legacy-preview/
api/
  app/
    auth/
    users/
    preferences/
    notifications/
    plans/
    media/
    middleware/
    security/
  migrations/versions/
  tests/
  requirements.in
  requirements.lock.txt
```

All new production frontend code is TypeScript. Component and page styles use CSS Modules and
semantic custom properties. New code does not import `src/main.jsx`, `createAppContext`, pageApi,
the old global event bus, old DOM controllers, or `styles.css`.

## Task 1: Freeze Phase 0 and establish Phase 1 contracts

**Create**

- `scripts/build-frontend-upgrade-phase0-evidence-lock.mjs`
- `scripts/check-frontend-upgrade-phase1-contracts.mjs`
- `scripts/lib/frontend-upgrade-phase1-contracts.mjs`
- `tests/frontend-upgrade-phase1-contracts.test.mjs`
- the five versioned contracts in Section 4

**Modify**

- `.gitignore`
- `package.json`

### Steps

1. Write fixtures that fail for a modified Phase 0 artifact, missing accepted review, wrong
   ancestor, a `370-*` Phase 1 output, contract key drift, duplicate system surface, wrong table,
   secret-shaped field, or non-exact branch/resource identity.
2. Build the Phase 0 lock from tracked Git objects, never from the user-owned untracked files.
3. Encode the exact eight system surfaces, 82 Phase 1 target gates, six activated Phase 0 future
   gates, nine application tables, PostgreSQL major `18`, same-origin API topology, separate
   `legacyCommit`, and Preview-only resource names.
4. Verify every success and failure fixture leaves sentinel `370-*` files byte-identical.
5. Add:

```json
"test:frontend-upgrade:phase1": "node --test tests/frontend-upgrade-phase1*.test.mjs",
"check:frontend-upgrade:phase1:contracts": "node scripts/check-frontend-upgrade-phase1-contracts.mjs"
```

### Verify

```bash
node --test tests/frontend-upgrade-phase1-contracts.test.mjs
npm run check:frontend-upgrade:phase1:contracts
git diff --check
```

### Commit

```text
test: define frontend upgrade phase 1 contracts
```

## Task 2: Add the isolated V2 toolchain, entry, and edge proxy

**Create**

- `v2.html`
- `vite.v2.config.ts`
- `vitest.v2.config.ts`
- `tsconfig.v2.json`
- `eslint.config.mjs`
- `stylelint.config.mjs`
- `src/core/bootstrap/main.tsx`
- `src/core/router/router.tsx`
- `src/core/providers/AppProviders.tsx`
- `src/core/providers/QueryProvider.tsx`
- `src/core/errors/AppErrorBoundary.tsx`
- `src/shared/api/client.ts`
- `src/shared/api/errors.ts`
- `src/shared/api/csrf.ts`
- `scripts/build-frontend-v2.mjs`
- `functions/api/v2/_middleware.ts`
- `functions/api/v2/[[path]].ts`
- `public-v2/_redirects`
- `public-v2/_headers`
- `public-v2/_routes.json`
- `tests/frontend-v2-build-isolation.test.mjs`
- `tests/frontend-v2-edge-proxy.test.mjs`

**Modify**

- `package.json`
- `package-lock.json`
- `tests/frontend-v2-boundaries.test.mjs`

### Steps

1. Add failing tests proving the V2 graph cannot import the legacy bootstrap, old router, old
   stores, root data scripts, raw secrets, or a public Render/LLM/R2/PostgreSQL origin.
2. Install the exact Section 2 packages and add `packageManager: "npm@10.8.2"`. Update the old
   Phase 0 boundary assertion from Rolldown 1.0.3 to the approved 1.1.5 in the same change.
3. Configure Vite with `v2.html` as its only source application entry and `dist-v2` as output.
   `scripts/build-frontend-v2.mjs` performs the deterministic post-build step: it validates the
   single HTML entry, atomically renames `dist-v2/v2.html` to `dist-v2/index.html`, proves the old
   name is absent, and creates the public config, version, integrity manifest, and SPA fallback.
   An explicit `_routes.json` invokes Functions only for `/api/v2` and `/api/v2/*`; tests must prove
   those paths resolve to the Function before `_redirects`, while static assets never invoke it.
   Static `_headers` and Function responses apply the same approved security policy.
4. Configure strict TypeScript, `noUncheckedIndexedAccess`, exact optional properties, and no JS
   source inclusion in the V2 program. Its `include` is the exact V2 directories plus Functions,
   never broad `src/**/*`; initial V2 imports remain relative instead of introducing unverified
   aliases.
5. Implement the same-origin `/api/v2` edge proxy with a fixed upstream allowlist, normalized path
   construction, client edge-token removal and trusted token injection, hop-by-hop header
   stripping, no authenticated caching, streaming support, exact method/body limits, manual
   redirect handling, and fixed failure codes. Only exact Google authorization redirects and safe
   relative application redirects may pass; Render-origin redirects are rejected. Forward only the
   two approved `__Host-` cookies and preserve their required attributes. Preserve multiple
   `Set-Cookie` fields without folding, never buffer request/response streams, reject encoded or
   repeated slash variants, and overwrite rather than trust client forwarding headers.
6. Generate `version.json`, `config.json`, and an asset integrity manifest. Public config contains
   only the allowed V2 fields and `apiBase: "/api/v2"`.
7. Add a Vite resolved-module guard that canonicalizes real paths and permits only the approved V2
   directories plus an explicit asset allowlist. The build fails if any legacy bootstrap, old data
   script, or unapproved repository module enters the final graph; output scanning remains a
   second independent check.
8. Add scripts:

```text
typecheck:v2
lint:v2
lint:styles:v2
test:v2
build:v2
check:frontend-v2-build-isolation
```

### Verify

```bash
npm run typecheck:v2
npm run lint:v2
npm run lint:styles:v2
npm run test:v2
npm run build:v2
npm run check:frontend-v2-build-isolation
```

### Commit

```text
feat: add isolated frontend v2 kernel
```

## Task 3: Build Playful Precision 2.0 foundations

**Create**

- `src/design-system/tokens/foundations.css`
- `src/design-system/tokens/light.css`
- `src/design-system/tokens/dark.css`
- `src/design-system/tokens/typography.css`
- `src/design-system/motion/motion.css`
- `src/design-system/primitives/Button/`
- `src/design-system/primitives/TextField/`
- `src/design-system/primitives/Tabs/`
- `src/design-system/primitives/Alert/`
- `src/design-system/primitives/Dialog/`
- `src/design-system/primitives/Drawer/`
- `src/design-system/primitives/Spinner/`
- `src/design-system/primitives/Skeleton/`
- `src/design-system/patterns/QuantyImage/`
- `src/design-system/patterns/EmptyState/`
- `.storybook/main.ts`
- `.storybook/preview.ts`
- component stories and tests

### Steps

1. Add failing tests for semantic token coverage, raw color/shadow/z-index bans, keyboard focus,
   disabled/loading/error states, reduced motion, and responsive Quanty images.
2. Transcribe the approved design contract into semantic tokens. Do not invent a second palette.
3. Use Plus Jakarta Sans and Space Grotesk with explicit Chinese fallbacks and tabular metrics.
4. Generate the new Quanty asset map from the repaired runtime manifest. New V2 code must not
   import the legacy `QuantyImage` component or direct multi-megabyte PNG masters.
5. Implement light/dark stories for ready, loading, empty, error, disabled, focus, active, and
   reduced-motion states.
6. Add Storybook build and axe checks.

### Verify

```bash
npm run test:v2 -- --run src/design-system
npm run storybook:build:v2
npm run check:design-system:v2
npm run check:quanty-assets
```

### Commit

```text
feat: build playful precision v2 foundations
```

## Task 4: Build the FastAPI kernel, database, OpenAPI, and R2 boundary

**Create**

- `api/pyproject.toml`
- `api/.python-version`
- `api/requirements.in`
- `api/requirements.lock.txt`
- `api/alembic.ini`
- `api/app/main.py`
- `api/app/config.py`
- `api/app/db.py`
- `api/app/errors.py`
- `api/app/health.py`
- `api/app/middleware/request_id.py`
- `api/app/security/edge.py`
- `api/app/media/storage.py`
- `api/migrations/env.py`
- `api/migrations/versions/0001_phase1_foundation.py`
- `api/tests/`
- `api/openapi.json`
- `src/shared/api/generated/schema.d.ts`

### Steps

1. Write failing tests for configuration validation, request IDs, error shape, edge-token
   rejection, the minimal direct health exception, database SSL, one Alembic head, exact schema,
   upgrade/downgrade/upgrade symmetry, R2 SigV4 `auto`, object-key/MIME/size restrictions, cleanup,
   and secret-safe errors.
2. Lock Python 3.13.14 and all Section 2.5 dependencies with hashes.
3. Implement settings that reject production resources, credential-bearing URLs, unsafe CORS,
   missing TLS, missing edge token, and unknown environment keys in Preview.
4. Create the exact Section 5 schema. Do not run the legacy SQL or SQLite import.
5. Implement an R2 client that creates server-owned object keys, scopes uploads to a synthetic or
   authenticated user prefix, limits MIME and bytes, uses SigV4 region `auto`, and never logs
   credentials or signed URLs. Execute blocking boto3 work through a bounded worker thread with
   explicit timeouts and cancellation-safe cleanup; never block the async route event loop.
6. Generate and commit OpenAPI; generate TypeScript types and fail on drift.
7. Make application startup reject an Alembic head mismatch. Do not auto-migrate at startup.

### Verify

```bash
python3.13 -m pytest api/tests
python3.13 -m alembic -c api/alembic.ini heads
npm run check:openapi:v2
npm run typecheck:v2
```

### Commit

```text
feat: add phase 1 fastapi foundation
```

## Task 5: Implement session authentication and account identity

**Create**

- `api/app/auth/models.py`
- `api/app/auth/schemas.py`
- `api/app/auth/router.py`
- `api/app/auth/service.py`
- `api/app/auth/passwords.py`
- `api/app/auth/csrf.py`
- `api/app/auth/google.py`
- `api/app/users/models.py`
- `api/app/users/router.py`
- `api/app/users/service.py`
- auth integration and security tests

### Endpoints

- `GET /api/v2/auth/csrf`
- `POST /api/v2/auth/register`
- `POST /api/v2/auth/login`
- `POST /api/v2/auth/logout`
- `POST /api/v2/auth/password/forgot`
- `POST /api/v2/auth/password/reset`
- `GET /api/v2/auth/google/start`
- `GET /api/v2/auth/google/callback`
- `GET /api/v2/me`

### Steps

1. Write failing tests for Argon2id, generic credential errors, login rate limits, session token
   hashing, rotation, expiry, logout revocation, reset-token single use, hashed Google state/nonce,
   encrypted short-lived PKCE verifier recovery and deletion, callback replay, fixed JWT
   algorithm/issuer/audience, and user enumeration resistance.
2. Require exact Origin plus edge token on state-changing endpoints.
3. Require a one-time server-bound pre-auth CSRF challenge for unsafe unauthenticated account
   mutations and session-bound CSRF for every unsafe authenticated method. Missing, wrong, stale,
   consumed, and cross-origin proofs return fixed `403` error codes.
4. Return the standard error envelope and request ID without exposing account existence or secret
   values.
5. Keep the password-reset sender behind an interface. Tests use a fake sender; Preview records no
   reset token in logs or evidence.
6. Verify localStorage, sessionStorage, IndexedDB, public config, and built assets contain no
   bearer, session, CSRF, OAuth state, or user record.

### Verify

```bash
python3.13 -m pytest api/tests/auth api/tests/users
npm run check:openapi:v2
npm run test:v2
```

### Commit

```text
feat: implement v2 session authentication
```

## Task 6: Implement the approved Auth experience

**Create**

- `src/domains/account/auth/AuthFrame.tsx`
- `src/domains/account/auth/EmailAuthForm.tsx`
- `src/domains/account/auth/GoogleAuthButton.tsx`
- `src/domains/account/auth/AuthRecovery.tsx`
- `src/domains/account/auth/auth.schema.ts`
- `src/domains/account/auth/auth.queries.ts`
- `src/domains/account/auth/auth.mutations.ts`
- `src/domains/account/auth/auth.module.css`
- `src/pages/v2/AuthPage.tsx`
- Auth unit, MSW integration, visual, axe, and E2E tests

### Steps

1. Add failing tests for all four auth mutations and their six recovery states: recoverable,
   non-recoverable, offline draft, permission denied, stale conflict, and retry.
2. Reproduce `QuantGym 登录.dc.html` with the repaired `hero-wave` Quanty asset, one primary
   mascot in the initial viewport, exact brand purple, controlled lavender atmosphere, and no
   old direct PNG.
3. Fix every Phase 0 Auth contrast finding: inactive Register tab, labels, legal note, error text,
   placeholder text, and dark-theme equivalents.
4. Provide programmatic field errors, live announcements, visible focus, keyboard tab behavior,
   password visibility, reduced motion, and 44px mobile targets.
5. Support desktop 1440×900, laptop 1280×720, and mobile 390×844 without horizontal overflow.
6. Keep the submit result visible before any mascot or reward motion.

### Verify

```bash
npm run test:v2 -- --run src/domains/account/auth
npm run test:e2e:v2 -- --grep @e2e:auth-session-and-recovery
npm run test:e2e:v2 -- --grep @visual:auth:light-dark
npm run test:e2e:v2 -- --grep @a11y:auth
```

### Commit

```text
feat: rebuild auth on the v2 kernel
```

## Task 7: Implement desktop/mobile shell and shared recovery

**Create**

- `src/design-system/patterns/AppShell/`
- `src/design-system/patterns/DesktopSidebar/`
- `src/design-system/patterns/TopBar/`
- `src/design-system/patterns/MobileHeader/`
- `src/design-system/patterns/MobileDrawer/`
- `src/design-system/patterns/BottomNavigation/`
- `src/design-system/patterns/AccountMenu/`
- `src/design-system/patterns/ToastRegion/`
- `src/design-system/patterns/NetworkBanner/`
- `src/domains/platform/preferences/`
- `src/shared/i18n/`
- shell and recovery tests

### Steps

1. Add failing tests for desktop keyboard navigation, mobile drawer focus restoration, route
   current state, 252px desktop sidebar, 860px shell switch, 44px touch targets, 1280×720 title
   visibility, theme/language persistence, offline, recoverable error, stale conflict, permission
   retry, and reduced motion.
2. Implement the approved desktop sidebar and sticky top bar without importing the old shell.
3. Implement mobile header, complete drawer, and bottom primary navigation instead of shrinking
   the desktop shell.
4. Store local theme/language only as a non-sensitive optimistic preference; `/me` remains the
   official source and the server mutation reconciles it.
5. Add route-level and application error boundaries with fixed recovery actions and request-ID
   correlation.
6. Make Toast a live region whose motion never blocks the next action.

### Verify

```bash
npm run test:v2 -- --run src/design-system/patterns src/domains/platform/preferences
npm run test:e2e:v2 -- --grep @e2e:desktop-shell-keyboard-navigation
npm run test:e2e:v2 -- --grep @e2e:mobile-shell-navigation
npm run test:e2e:v2 -- --grep @e2e:theme-language-persistence
npm run test:e2e:v2 -- --grep @e2e:offline-and-error-recovery
```

### Commit

```text
feat: add the v2 application shell
```

## Task 8: Implement search, notifications, Todo, and account surfaces

**Create**

- `src/domains/platform/search/`
- `src/domains/platform/notifications/`
- `src/domains/platform/todo/`
- `api/app/preferences/`
- `api/app/notifications/`
- `api/app/plans/`
- related unit, integration, recovery, visual, and E2E tests

### Steps

1. Add failing tests for command-palette focus trapping and restoration, keyboard selection,
   Notification Center open/empty, mark-read recovery, Todo create/edit/complete/delete recovery,
   and account-menu session actions.
2. Build search from a typed provider registry. Phase 1 returns navigation and clearly labelled
   compatibility results; later domains register server-backed providers without rewriting the
   command palette.
3. Implement the exact two Notification Center future states: open and empty. Do not fabricate
   notifications in a live user account.
4. Persist Todo through V2 `plan_tasks` with version fields and idempotency keys. Offline edits
   remain drafts until acknowledged; they never dual-write to V1.
5. Implement server-backed preference updates, notification mark-read, and Todo mutations with the
   six required recovery states for each approved mutation.

### Verify

```bash
python3.13 -m pytest api/tests/preferences api/tests/notifications api/tests/plans
npm run test:v2 -- --run src/domains/platform
npm run test:e2e:v2 -- --grep @e2e:global-search-keyboard
npm run test:e2e:v2 -- --grep @e2e:notifications-live-region
npm run test:e2e:v2 -- --grep @e2e:todo-lifecycle
```

### Commit

```text
feat: complete phase 1 shared systems
```

## Task 9: Isolate unmigrated routes behind the Preview adapter

**Create**

- `src/legacy-preview/LegacyRouteAdapter.tsx`
- `src/legacy-preview/unmigratedRoutes.ts`
- `src/legacy-preview/adapter.module.css`
- `scripts/check-frontend-upgrade-phase1-legacy-boundary.mjs`
- `tests/frontend-upgrade-phase1-legacy-boundary.test.mjs`

**Modify**

- V2 router and Preview build packaging
- `docs/frontend-upgrade/legacy-removal-map.json`

### Steps

1. Add failing import-graph and runtime tests proving all eight Phase 1 systems, including Auth,
   have a legacy boot count of zero and use only `/api/v2`.
2. Deploy the unchanged legacy app to the stable cross-origin Pages preview alias
   `legacy-compat.quantgym-v2-preview.pages.dev` from the locked Phase 0 deployment commit
   `7a85c2a43b24013d5a49969eca7b4a5f1d093640`. Record this separately as `legacyCommit`; it is
   intentionally not the Phase 1 application commit.
3. Render it only in a sandboxed, cross-origin iframe for the exact 22-route unmigrated allowlist.
   Label it as a compatibility surface and exclude it from migrated evidence. The sandbox grants
   no popup, top-navigation, or download capability; any `postMessage` bridge uses an exact origin,
   exact message schema, and explicit capability allowlist.
4. Keep the adapter outside TanStack Query and Zustand. It cannot hydrate, merge, or dual-write
   V1 and V2 state.
5. Production V2 builds reject adapter imports and adapter chunks.
6. Delete the replaced `shell-auth` family only after all boundary and journey checks are green;
   do not delete unrelated route controllers or CSS in Phase 1.

### Verify

```bash
npm run check:frontend-v2-boundaries
npm run check:frontend-upgrade:phase1:legacy
npm run test:e2e:v2 -- --grep @phase1-system
```

### Commit

```text
refactor: isolate legacy routes from the v2 shell
```

## Task 10: Build Phase 1 evidence, CI, and acceptance gates

**Create**

- `scripts/build-frontend-upgrade-phase1-provider-evidence.mjs`
- `scripts/check-frontend-upgrade-phase1-preview-live.mjs`
- `scripts/check-frontend-upgrade-phase1-postgres.py`
- `scripts/check-frontend-upgrade-phase1-r2.mjs`
- `scripts/check-frontend-upgrade-phase1-auth.mjs`
- `scripts/check-frontend-upgrade-phase1-system-surfaces.mjs`
- `scripts/check-frontend-upgrade-phase1.mjs`
- focused Node and Python tests
- `.github/workflows/frontend-v2-preview.yml`

### Required aggregate counts

- Phase 1 system surfaces: `8`
- Phase 1 target gates: `82`
- activated Phase 0 future shared states: `6`
- base viewport/theme cases: `48` (`8 × 3 × 2`)
- serious or critical axe findings: `0`
- application-owned console errors: `0`
- unhandled rejections: `0`
- Preview PostgreSQL major: `18`

### Required live checks

- V2 Pages, API, the isolated internal LLM probe, provider deployments, and runtime health report
  one exact Phase 1 commit. The probe is a private commit/health attestation service in this phase,
  not evidence of business LLM functionality.
- Public config exposes only `/api/v2` and allowed metadata.
- Phase 0 evidence lock remains byte-identical.
- API is bound to the authenticated Preview PostgreSQL and exact Alembic head.
- Provider evidence reports the redacted integer `postgresMajor: 18`; the ephemeral migration
  image is pinned to PostgreSQL 18 and the live server reports the same major.
- Preview schema matches the frozen contract and contains no legacy table or column.
- Ephemeral migration round-trip is deterministic.
- API is bound to the exact private Preview R2 bucket; Pages and LLM hold no R2 secret.
- A synthetic signed upload/read/delete round trip succeeds, anonymous read fails, and cleanup is
  confirmed.
- Auth cookies, CSRF, origin, rotation, logout, OAuth replay, and browser storage checks pass.
- Legacy bootstrap is absent from the V2 graph and the adapter is Preview-only. The isolated
  compatibility alias reports the locked Phase 0 `legacyCommit` and no other commit.
- Initial JS is at most 180KB gzip and ordinary route chunks at most 100KB gzip.

### Evidence safety

Provider evidence is ignored, mode `0600`, read with no-follow semantics, inode-checked, and no
older than seven days. Summaries contain only enums, booleans, counts, ISO times, Git SHA, and
SHA-256 resource identities. They never contain origins, DSNs, database/role names, internal URLs,
R2 endpoints, signed URLs, cookies, headers, CSRF values, OAuth values, session/user identifiers,
response bodies, stderr, or stack traces.

### Verify

```bash
npm run typecheck:v2
npm run lint:v2
npm run lint:styles:v2
npm run test:v2
python3.13 -m pytest api/tests
npm run check:openapi:v2
npm run build:v2
npm run check:frontend-v2-boundaries
npm run test:frontend-upgrade:phase1
npm run check:frontend-upgrade:phase1:contracts
```

### Commit

```text
test: add frontend upgrade phase 1 gates
```

## Task 11: Controlled Preview application cutover

The user has authorized Phase 1 Preview application deployment. This authorization covers the
existing Preview resources only. Stop for new approval if resource scope, plan/cost, production,
or destruction changes.

### Pre-deploy

1. Verify all offline gates and the exact commit.
2. Disable automatic production-branch deploys for both Cloudflare Pages and the two Render
   services before any Phase 1 commit is pushed. Read back and record the disabled provider state;
   keep it disabled through migration and live audit.
3. Capture authenticated provider evidence without persisting provider credentials.
4. Confirm a current Preview PostgreSQL backup/recovery point.
5. Create a distinct runtime R2 credential scoped only to `quantgym-v2-preview-media`; do not reuse
   the short-lived audit credential.
6. Configure Render secrets: database URL, R2 endpoint/access/secret, session secret, CSRF signing
   secret, Google OAuth values, Pages origin, LLM internal origin, and edge shared secret.
7. Configure the same edge shared secret in Cloudflare Pages. No runtime secret enters GitHub,
   public config, Pages assets, or LLM variables.
8. Update the existing Render API service in place to runtime `python`, root directory `api`,
   Python `3.13.14`, build command
   `python -m pip install --require-hashes -r requirements.lock.txt`, start command
   `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`, and health path
   `/api/v2/health`. Read every field back through the provider API before deployment. If Render
   cannot change the existing service in place, stop: creating a replacement service is a new
   resource and requires fresh user authorization.
9. Keep the private LLM service on its existing hardened Node commit/health probe in Phase 1;
   update it to the exact Phase 1 commit but do not represent it as migrated LLM functionality.
10. After Pages automatic deploy is confirmed disabled, update the existing Pages project to the
    exact V2 build command `npm ci && npm run build:v2`, output directory `dist-v2`, and the locked
    production branch. Read the configuration back before the manual deployment; an old
    `dist-preview` build command is a hard stop.

### Migration

1. Run the tested Alembic upgrade once against Preview.
2. Verify the exact head, schema fingerprint, SSL, database/role/provider identity, and absence of
   legacy tables.
3. Do not import V1 or test-user data.
4. Do not run a downgrade against shared Preview.

### Deploy

1. Deploy the private internal LLM commit/health probe at the exact Phase 1 commit.
2. Deploy the FastAPI service at the exact commit with Python 3.13.14.
3. Deploy the V2 Pages application, Functions proxy, and integrity manifest at the exact commit.
4. Verify the already isolated legacy compatibility alias still reports the locked Phase 0
   `legacyCommit`; do not rebuild it from the Phase 1 source tree after legacy deletion.
5. Verify Pages `/version.json`, proxied `/api/v2/health`, API release, and internal LLM commit.
6. Verify the Pages provider now records the V2 build command and `dist-v2` output. Automatic
   deploy remains disabled until Phase 1 is independently accepted; only then may it be restored.

### Live audit

1. Generate fresh redacted provider evidence.
2. Run PostgreSQL, R2, Auth, edge proxy, legacy boundary, system-surface, visual, axe, performance,
   and browser-storage checks.
3. Verify all synthetic data and R2 objects are removed.
4. Write only `380-*` summaries and optimized review images.
5. Re-run the Phase 0 evidence lock after the audit.

### Commit

```text
test: record frontend v2 phase 1 preview evidence
```

## Task 12: Aggregate review and Phase 1 exit

Create:

- `docs/browser-audit-screenshots/380-frontend-upgrade-phase-1-summary.json`
- `docs/superpowers/reviews/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md`

The aggregate status may be only `ready-for-review` or `not-ready`. It cannot self-accept.

Phase 1 exits only when:

- the eight Phase 1 system surfaces use the V2 kernel and never globally start legacy bootstrap;
- the 82 target gates and six activated future states pass;
- Auth works through same-origin cookie sessions with CSRF, rotation, logout, reset, and Google
  replay protection;
- browser persistence contains no bearer token, session, CSRF value, OAuth state, or user record;
- the design system matches the approved zip and serious/critical axe findings are zero;
- desktop, small-laptop, and mobile evidence passes in light and dark themes;
- the Preview API uses FastAPI, exact PostgreSQL schema, Alembic, OpenAPI, a private internal LLM
  commit/health probe, and private R2 bindings;
- the compatibility adapter is isolated, Preview-only, and excluded from migrated evidence;
- the initial and route bundle budgets pass;
- every `370-*` Phase 0 artifact remains byte-identical;
- no production resource was changed.

After independent review and explicit user acceptance, Phase 2 may begin with Overview, Plan, and
Problems. Until then, Preview stays on the accepted Phase 1 commit and production remains unchanged.

## Commit and review discipline

- Keep each task in its own reviewable commit.
- Keep Phase 1 commits local until Pages and Render automatic deploys are confirmed disabled; do
  not push an intermediate commit onto the configured Preview production branch.
- Run focused tests before broad tests.
- Never stage the four user-owned untracked artifacts listed in Section 1.
- Never commit provider evidence, raw provider responses, secrets, HAR files, or dashboard exports.
- Inspect `git diff --cached --name-status` and `git diff --cached --check` before each commit.
- Do not push a commit that would auto-deploy an incomplete migration state.
- Keep Render auto-deploy disabled through the Phase 1 cutover; deploy only exact reviewed commits.
- Re-enable an automated path only after CI and live gates prove that it cannot bypass migrations.
