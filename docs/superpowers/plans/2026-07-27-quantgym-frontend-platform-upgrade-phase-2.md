# QuantGym Frontend Platform Upgrade — Phase 2 Implementation Plan

Status: approved for execution
Date: 2026-07-27
Branch: `codex/frontend-v2-preview`
Operator: Gary
Budget owner: Gary
Data-reset owner: Gary
Destroy owner: Gary
Resource review date: 2026-07-29

## 0. Goal and locked boundary

Gary explicitly accepted Phase 1 and authorized Phase 2 on 2026-07-27. Phase 2 delivers the
daily-training vertical slice through three fully migrated V2 routes:

1. `overview` at `/`;
2. `plan` at `/plan`;
3. `problems` at `/problems`.

The exit journey is fixed:

```text
Login -> Today's Task -> Recommended Problem -> Attempt / Hint
-> Complete -> XP -> Plan Update -> Overview Update
```

The visual authority remains the tracked Playful Precision source extracted from the accepted
`UI 设计提升.zip`:

- `docs/ui-reference/playful-precision/source/QuantGym 总览.dc.html`
- `docs/ui-reference/playful-precision/source/QuantGym 计划.dc.html`
- `docs/ui-reference/playful-precision/source/QuantGym 题目.dc.html`

The implementation preserves the existing purple brand color, Quanty mascot, and playful tone,
while using the Phase 1 semantic tokens, typography, responsive shell, recovery patterns, and
restrained motion. It upgrades the three routes incrementally inside the existing React/Vite/
FastAPI/PostgreSQL stack; it does not introduce a new frontend framework or rewrite unrelated
routes.

Phase 2 is Preview-only. It does not merge the pull request, deploy to Production, mutate the
Production database or R2 bucket, or promote controlled beta. The remaining 19 business routes
stay in the isolated compatibility adapter.

## 1. Accepted Phase 1 handoff and evidence freeze

The accepted Phase 1 chain is:

- application commit: `5a3b6f33b7f2a4d15f0a81ca57f81570ca89c6a3`;
- evidence successor: `d87b20f8630fdc39f46e1065c5ffee14bf3ca8dd`;
- final handoff head before acceptance: `4faba0653e28e4ca28edd8521a053d00d0d88e57`;
- review: `docs/superpowers/reviews/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md`;
- Preview URL: `https://quantgym-v2-preview.pages.dev/`;
- pull request: `garymmmjw/QuantGym#130` (draft, unmerged).

Before the first Phase 2 application change:

1. Commit the explicit Phase 1 acceptance record and this plan with `[CF-Pages-Skip]`.
2. Generate a Phase 1 evidence lock from tracked Git objects, including every tracked `380-*`
   artifact, the Phase 1 acceptance manifest, contracts, and accepted review.
3. Record each path, bytes, mode, and SHA-256; never read evidence from the working tree when a
   tracked Git object is available.
4. Require the accepted Phase 1 chain and acceptance-record commit to be ancestors of every
   Phase 2 candidate.
5. Reject Phase 2 evidence paths beginning with `370-` or `380-`; Phase 2 owns `390-*` only.
6. Verify the lock before and after every aggregate run and Preview cutover.

These user-owned, untracked files remain unstaged, unmodified, and outside every evidence lock:

- `docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json`
- `docs/browser-audit-screenshots/371-current-preview-audit.png`
- `docs/browser-audit-screenshots/372-mascot-quality-auth-before.png`
- `docs/browser-audit-screenshots/374-mascot-quality-auth-final.jpg`

## 2. Runtime, dependency, and state ownership lock

Keep every exact Phase 1 runtime and dependency version. Add only:

- `@tanstack/react-virtual`: `3.14.8`, verified compatible with React 19 on 2026-07-27.

State ownership is fixed:

- TanStack Query owns every server-backed entity and read model.
- React component state owns local selection, disclosure, and presentation state.
- Zustand must not copy plans, problems, sessions, progress, XP, or notifications.
- IndexedDB stores only recoverable drafts and short-lived retry metadata.
- PostgreSQL is the official source of truth.
- The server exclusively owns XP, official completion, plan completion, and training outcomes.

Each draft contains `draftId`, `ownerScope`, `kind`, `resourceId`, `serverVersion`, `payload`,
`idempotencyKey`, and `updatedAt`. A successful server acknowledgement deletes the draft.
Logout and account change clear sensitive drafts before the next account can render.

## 3. Phase 2 product and API contract

### 3.1 Overview read model

`GET /api/v2/dashboard/overview` returns one server-composed view containing:

- current profile summary, level, streak, and weekly XP;
- today's highest-priority plan task and its unlock/reward explanation;
- clearest weakness and recommended problem;
- current plan progress;
- recent XP ledger summary;
- notification count and stable resource versions.

The primary mutation `training.start-or-resume` starts a new problem session or returns the one
already active for the same user and problem. Creating a session is idempotent.

### 3.2 Plan contract

Add current-plan, diagnostic, create-plan, update-task, and complete-task endpoints. Plan and task
writes carry an expected version. Diagnostic and create mutations are idempotent. Completing a
task that is backed by training is normally caused by a confirmed training event, not an
untrusted client balance or completion flag.

The existing `/api/v2/todos` surface remains a Phase 1 shell utility. Phase 2 plan data is a
separate domain and does not reinterpret Todo rows as official training progress.

### 3.3 Problems and training contract

Add server-filtered, cursor-paginated problem queries and a stable problem detail read model.
Search, source, difficulty, status, favorite, Hot 100, daily view, selected problem, and cursor
are represented in the URL where appropriate. The browser never imports a classic global
catalog script.

Distinct server events exist for:

- hint use;
- attempt submission;
- solution reveal;
- note save;
- favorite change;
- completion.

The completion transaction must atomically:

1. validate session ownership, state, answer/attempt, and expected version;
2. mark the training session completed once;
3. append an immutable training event;
4. upsert problem progress;
5. append exactly one immutable XP ledger entry;
6. update the linked plan task and plan progress;
7. create a notification;
8. return the result, XP delta, plan effect, weakness/skill effect, and next action.

Repeating the same completion idempotency key returns the same acknowledged result and never
creates a second reward. Reusing it for a different payload fails closed.

Reward-producing and create mutations use a persistent `idempotency_records` boundary with an
operation, owner, key hash, request fingerprint, state, acknowledged response snapshot, resource
identity, timestamps, and expiry. Its successful response snapshot is committed in the same
transaction as the reward. It does not depend on the resource remaining at the original version,
and it never stores the raw idempotency key, CSRF proof, cookie, answer, or note contents.

### 3.4 Phase 2 PostgreSQL migration

Create Alembic revision `0002_phase2_daily_training` with a tested downgrade. The exact schema
contract covers:

- `problem_sources`
- `problems`
- `problem_progress`
- `favorites`
- `notes`
- `plans`
- `recommendations`
- `training_sessions`
- `attempts`
- `answers`
- `training_events`
- `xp_ledger`
- `idempotency_records`

Extend `plan_tasks` only through explicit foreign keys/versioned fields needed to attach official
plan tasks to a plan and training target. Preserve Phase 1 audit, user, session, preference,
notification, Todo, and media tables. Use UUID primary keys, UTC timestamps, user-scoped unique
constraints, check constraints, foreign keys, and indexes for every query path. Ledger/event rows
are append-only through the service boundary. Extend notifications additively with a structured,
validated action target and dedupe key so completion notifications can open the acknowledged
result without placing arbitrary URLs or private response content in the row.

The migration gate proves `upgrade 0001 -> head`, `downgrade head -> 0001`, and a second upgrade
produce the same normalized schema. Provider migration runs only after backup/restore evidence
and before deploying the Phase 2 API commit.

### 3.5 Content rights boundary

Problem content is imported server-side from a versioned, rights-labelled catalog. Preview-only
acceptance fixtures are explicitly marked internal and cannot be selected by public/commercial
release modes. The browser receives only the configured release-safe catalog; the technical
migration does not waive question-bank rights checks.

## 4. Route composition and responsive behavior

### 4.1 Overview

Use the dashboard template and compose `OverviewHero`, `DailyPlanCard`, `ProgressSummary`, and a
compact future-aware growth summary. The first 1280×720 viewport must answer:

1. what to train today;
2. the clearest weakness;
3. what the next task unlocks.

Keep one dominant CTA: start or resume today's recommended training. The hero, Quanty, streak,
level, and weekly XP remain, but equivalent cards may not compete for primary attention.

### 4.2 Plan

Use the workflow-board template and compose `PlanSetup`, `Diagnostic`, `PlanBoard`, and
`TaskEditor`. Show recommendation provenance, versioned saves, server-confirmed completion, and
real empty/loading/recovery states. At the distinct 1024px tablet layout, preserve complete
editing functionality without horizontal document overflow.

### 4.3 Problems

Use the approved dense, professional List–Detail workspace. Desktop and laptop show virtualized
list plus detail; 1024px uses the distinct intermediate layout; 390px uses list navigation then a
dedicated detail route/view with an explicit return path. Detail composes `AttemptComposer`,
`HintPanel`, `NoteEditor`, favorite control, progress, result, and next recommendation.

Completion shows the result before celebration begins. Motion never hides the result, blocks the
next action, or ignores reduced-motion preference.

## 5. Acceptance inventory and evidence namespace

The authoritative Phase 0 catalog already defines 76 IDs for these routes:

- Overview: 9 (`3` route gates + `6` mutation recovery gates).
- Plan: 27 (`3` route gates + `24` mutation recovery gates).
- Problems: 40 (`3` route gates + `36` mutation recovery gates + `1` retry-idempotency gate).

Phase 2 activates every one of them without rewriting the immutable Phase 0 catalog. The Phase 2
acceptance manifest maps each ID to a new V2 test/evidence target and fails on a missing,
duplicate, extra, skipped, or still-legacy result.

Use only the `390-frontend-upgrade-phase-2-*` namespace for committed summaries and review
images. Required viewports are desktop `1440×900`, laptop `1280×720`, mobile `390×844`, plus
tablet `1024×768` for Plan and Problems. Required themes are light and dark. Required route
states include loading, empty, recoverable error, non-recoverable error, offline draft,
permission denied, stale conflict, retry, focus, active selection, completion/reward, and reduced
motion.

Acceptance requires:

- serious/critical axe findings: `0`;
- application console errors: `0`;
- unhandled rejections: `0`;
- document horizontal overflow: `0`;
- initial JavaScript: at most `180KB` gzip;
- ordinary route chunk: at most `100KB` gzip;
- LCP P75 target: at most `2.5s`;
- INP P75 target: at most `200ms`;
- CLS target: at most `0.1`;
- keyboard-complete primary journeys and minimum 44px mobile targets;
- Chinese and English overflow/wrapping checks;
- exact OpenAPI, migration, backup, rollback, and rights-boundary checks.

## Task 1: Record acceptance and establish Phase 2 contracts

**Create**

- `docs/frontend-upgrade/phase-1-evidence-lock.json`
- `docs/frontend-upgrade/phase-2-acceptance-manifest.json`
- `docs/frontend-upgrade/phase-2-schema-contract.json`
- `docs/frontend-upgrade/phase-2-preview-contract.json`
- `scripts/build-frontend-upgrade-phase1-evidence-lock.mjs`
- `scripts/lib/frontend-upgrade-phase2-contracts.mjs`
- `scripts/check-frontend-upgrade-phase2-contracts.mjs`
- `tests/frontend-upgrade-phase2-contracts.test.mjs`

**Modify**

- `docs/superpowers/reviews/2026-07-18-quantgym-frontend-platform-upgrade-phase-1.md`
- `package.json`

### Steps

1. First commit only the acceptance record and this plan with `[CF-Pages-Skip]`.
2. Write failing fixtures for modified Phase 1 evidence, wrong ancestor, forbidden namespace,
   wrong route list, missing acceptance ID, wrong table/constraint, secret-shaped contract field,
   or Production resource identity.
3. Generate the Phase 1 lock from tracked objects and encode the exact 3 routes, 76 IDs, schema,
   Preview identities, and Production-denial invariants.
4. Add Phase 2 test/check package scripts.

### Verify

```bash
node --test tests/frontend-upgrade-phase2-contracts.test.mjs
npm run check:frontend-upgrade:phase2:contracts
git diff --check
```

### Commit

```text
test: define frontend upgrade phase 2 contracts
```

## Task 2: Add the Phase 2 schema and domain persistence

**Create**

- `api/migrations/versions/0002_phase2_daily_training.py`
- `api/app/problems/models.py`
- `api/app/training/models.py`
- `api/app/dashboard/models.py`
- focused unit and PostgreSQL integration tests

**Modify**

- `api/app/plans/models.py`
- `api/tests/test_migrations.py`
- `api/openapi.json`
- `docs/frontend-upgrade/phase-2-schema-contract.json`

### Steps

1. Start with migration-contract and downgrade tests.
2. Implement the exact tables, constraints, indexes, and plan-task extensions in Section 3.4.
3. Prove clean install, upgrade from Phase 1, downgrade, re-upgrade, cascade boundaries, and
   append-only ledger/event behavior.
4. Keep the Preview database unchanged until the complete API candidate and rollback proof pass.

### Verify

```bash
python3.13 -m pytest api/tests/test_migrations.py api/tests/problems api/tests/training api/tests/dashboard
npm run check:frontend-upgrade:phase2:contracts
```

### Commit

```text
feat: add phase 2 training persistence
```

## Task 3: Implement problem catalog, progress, notes, and favorites API

**Create**

- `api/app/problems/router.py`
- `api/app/problems/schemas.py`
- `api/app/problems/service.py`
- `api/tests/problems/test_router.py`
- `api/tests/problems/test_postgres_integration.py`
- a versioned server-side Preview catalog fixture and importer

**Modify**

- `api/app/main.py`
- `api/openapi.json`
- rights-boundary checker inputs

### Steps

1. Write router and PostgreSQL tests for server filtering, stable cursor pagination, detail,
   ownership isolation, note version conflicts, favorites, Hot 100/daily views, and safe content.
2. Implement strict Pydantic schemas and SQLAlchemy 2 services.
3. Require CSRF, expected versions, and idempotency where the contract declares them.
4. Generate OpenAPI and prove the browser does not import a legacy global catalog.

### Verify

```bash
python3.13 -m pytest api/tests/problems
npm run check:openapi:v2
npm run check:question-bank-rights:release-blockers
```

### Commit

```text
feat: add v2 problem catalog and progress api
```

## Task 4: Implement training completion, XP ledger, and overview API

**Create**

- `api/app/training/router.py`
- `api/app/training/schemas.py`
- `api/app/training/service.py`
- `api/app/dashboard/router.py`
- `api/app/dashboard/schemas.py`
- `api/app/dashboard/service.py`
- `api/tests/training/*`
- `api/tests/dashboard/*`

**Modify**

- `api/app/main.py`
- `api/app/notifications/service.py`
- `api/openapi.json`

### Steps

1. Write failing transaction, replay, ownership, version, and concurrency tests.
2. Implement start/resume, hint, attempt, solution reveal, completion, and result reads.
3. Make completion atomically write the official progress, event, XP, plan, and notification
   effects listed in Section 3.3.
4. Prove persistent response-snapshot replay returns one reward even after the resource advances,
   conflicting key reuse fails, and partial writes roll back.
5. Compose Overview only from server-confirmed read models.

### Verify

```bash
python3.13 -m pytest api/tests/training api/tests/dashboard api/tests/notifications
npm run check:openapi:v2
```

### Commit

```text
feat: add idempotent daily training completion
```

## Task 5: Complete the official Plan API

**Create**

- new plan schema/service tests for diagnostic, create, task update, and training-backed complete

**Modify**

- `api/app/plans/models.py`
- `api/app/plans/schemas.py`
- `api/app/plans/router.py`
- `api/app/plans/service.py`
- `api/openapi.json`

### Steps

1. Preserve the Phase 1 Todo contract while adding a separate official plan boundary.
2. Test recommendation provenance, idempotent create/diagnostic, version conflicts, user
   isolation, ordering, and server-confirmed completion.
3. Implement current plan, diagnostic, create, update task, and complete task endpoints.
4. Verify a confirmed training completion updates the same Plan read model returned here.

### Verify

```bash
python3.13 -m pytest api/tests/plans api/tests/training api/tests/dashboard
npm run check:openapi:v2
```

### Commit

```text
feat: complete the v2 training plan api
```

## Task 6: Add typed clients and IndexedDB draft recovery

**Create**

- `src/shared/storage/drafts.ts`
- `src/shared/storage/drafts.test.ts`
- `src/shared/storage/draftOwnerBoundary.ts`
- `src/domains/problems/*` query, mutation, schema, and recovery modules
- `src/domains/plan/*` query, mutation, schema, and recovery modules
- `src/domains/training/*` query, mutation, schema, and recovery modules
- `src/domains/dashboard/*` query and schema modules

**Modify**

- `src/shared/api/generated.ts`
- auth logout/account-change cleanup integration

### Steps

1. Generate OpenAPI types and write MSW-backed client tests first.
2. Implement typed query keys, abortable queries, idempotent mutations, version handling, and
   cache invalidation across Overview, Plan, Problems, Notifications, and XP summaries.
3. Implement native IndexedDB draft storage with schema versioning, owner scoping, no auth
   material, logout clearing, reconnect replay, acknowledgement deletion, and corrupt-record
   quarantine.
4. Prove retries reuse one idempotency key for one user intent and new intent gets a new key.

### Verify

```bash
npm run generate:openapi:v2
npm run typecheck:v2
npm run test:v2 -- --run src/shared/storage src/domains/dashboard src/domains/plan src/domains/problems src/domains/training
```

### Commit

```text
feat: add typed phase 2 clients and draft recovery
```

## Task 7: Build reusable route templates and training feedback patterns

**Create**

- dashboard, workflow-board, list-detail, result, metric, filter, pagination, and draft-status
  patterns under `src/design-system/patterns`
- corresponding CSS Modules, Storybook stories, component and axe tests

### Steps

1. Derive composition and spacing from the three tracked design sources and Phase 1 tokens.
2. Cover loading, empty, error, offline, permission, conflict, disabled, focus, completion,
   reward, and reduced-motion states.
3. Keep all raw color, shadow, radius, z-index, and motion values in semantic tokens.
4. Verify touch targets, keyboard order, focus restoration, text alternatives, and no nested-card
   excess.

### Verify

```bash
npm run test:v2 -- --run src/design-system
npm run check:design-system:v2
npm run lint:styles:v2
```

### Commit

```text
feat: add daily training interface patterns
```

## Task 8: Migrate Overview

**Create**

- `src/pages/training/OverviewPage.tsx`
- `src/pages/training/OverviewPage.module.css`
- focused component, integration, and route tests

**Modify**

- `src/core/router/router.tsx`
- `src/legacy-preview/unmigratedRoutes.ts`

### Steps

1. Write loading, empty, query error, recommendation, and start/resume tests.
2. Implement the approved hero hierarchy, Quanty, today's task, weakness, unlock, streak, level,
   weekly XP, and single primary CTA from the server read model.
3. Route start/resume to the selected Problems detail/session and implement all six declared
   recovery gates.
4. Remove Overview from the compatibility allowlist only after the native route tests pass.

### Verify

```bash
npm run test:v2 -- --run OverviewPage
npm run typecheck:v2
npm run check:frontend-v2-boundaries
```

### Commit

```text
feat: migrate overview to the v2 daily loop
```

## Task 9: Migrate Plan

**Create**

- `src/pages/training/PlanPage.tsx`
- `src/pages/training/PlanPage.module.css`
- focused component, integration, route, and tablet tests

**Modify**

- `src/core/router/router.tsx`
- `src/legacy-preview/unmigratedRoutes.ts`

### Steps

1. Test setup, diagnostic, recommendation, create, editing, completion, and every recovery state.
2. Implement the workflow board with server-backed plan/task versions and no copied Zustand
   records.
3. Keep official completion server-led and reconcile stale versions explicitly.
4. Remove Plan from the compatibility allowlist only after the native route tests pass.

### Verify

```bash
npm run test:v2 -- --run PlanPage
npm run typecheck:v2
npm run check:frontend-v2-boundaries
```

### Commit

```text
feat: migrate plan to the v2 daily loop
```

## Task 10: Migrate Problems

**Create**

- `src/pages/training/ProblemsPage.tsx`
- `src/pages/training/ProblemsPage.module.css`
- problem workspace/list/detail/attempt/hint/note/result components and tests

**Modify**

- `src/core/router/router.tsx`
- `src/legacy-preview/unmigratedRoutes.ts`
- `package.json`
- `package-lock.json`

### Steps

1. Install exact `@tanstack/react-virtual@3.14.8` and write URL/state/virtualization tests.
2. Implement desktop List–Detail, tablet intermediate layout, and mobile list-to-detail
   navigation without losing filters, list position, selection, or drafts.
3. Implement hint, attempt, solution, note, favorite, completion, result, XP/plan effect, and next
   recommendation through typed server mutations.
4. Cover all 37 Problems recovery/idempotency gates and show result before reward motion.
5. Remove Problems from the compatibility allowlist only after native route tests pass.

### Verify

```bash
npm run test:v2 -- --run ProblemsPage
npm run typecheck:v2
npm run lint:v2
npm run lint:styles:v2
npm run check:frontend-v2-boundaries
```

### Commit

```text
feat: migrate problems to the v2 daily loop
```

## Task 11: Delete replaced legacy daily-training code

**Delete**

- every Phase 2 path matched by the `daily-training` family in
  `docs/frontend-upgrade/legacy-removal-map.json`

**Modify**

- legacy imports, module registries, old tests, static build inputs, and duplicate daily-training
  CSS that reference those paths
- `src/legacy-preview/unmigratedRoutes.test.ts`

### Steps

1. Start with a failing allowlist/graph test for any migrated route, pageApi, DOM controller,
   event bus, createAppContext, duplicate CSS, or legacy global catalog dependency.
2. Delete the replaced Overview, Plan, and Problems features/modules/pages/services.
3. Keep unrelated legacy routes working inside the isolated adapter.
4. Prove the three migrated route chunks contain no legacy graph edge or global bootstrap.

### Verify

```bash
npm run check:frontend-v2-boundaries
npm run check:module-ownership
npm run check:route-integrity
npm run build:v2
```

### Commit

```text
refactor: remove migrated daily training legacy code
```

## Task 12: Build Phase 2 gates and local acceptance evidence

**Create**

- Phase 2 contract, API, migration, draft, legacy, surface, visual, accessibility, performance,
  and aggregate checkers/tests
- Phase 2 Playwright journeys and visual snapshots
- `docs/browser-audit-screenshots/390-frontend-upgrade-phase-2-*.json`
- reviewed `390-*` route images at every required viewport/theme

### Steps

1. Make the aggregate consume only independently generated evidence and report only
   `ready-for-review` or `not-ready`.
2. Activate all 76 catalog IDs; reject skips, retries, flakes, legacy evidence, stale evidence,
   missing visual states, or inconsistent commit identities.
3. Run the complete login-to-completion-to-overview journey with one reward and plan update.
4. Inspect every final screenshot at original dimensions; do not accept skeletons, iframe
   loading, missing brand assets, accidental clipping, or browser error pages.
5. Run the complete Phase 1 suite again and prove every frozen Phase 1 artifact is unchanged.

### Verify

```bash
npm run typecheck:v2
npm run lint:v2
npm run lint:styles:v2
npm run test:v2
python3.13 -m pytest api/tests
npm run check:openapi:v2
npm run build:v2
npm run check:design-system:v2
npm run check:frontend-v2-boundaries
npm run test:e2e:v2
npm run test:frontend-upgrade:phase1
npm run test:frontend-upgrade:phase2
npm run check:frontend-upgrade:phase2
```

### Commit

```text
test: add frontend upgrade phase 2 acceptance gates
```

## Task 13: Controlled Preview cutover and Phase 2 review

**Create**

- redacted provider evidence for exact reviewed commits
- `docs/superpowers/reviews/2026-07-27-quantgym-frontend-platform-upgrade-phase-2.md`

### Steps

1. Freeze the application candidate after independent code and visual review.
2. Confirm Production remains unchanged and automatic Preview deploys cannot bypass migration.
3. Capture backup/restore evidence, migrate the isolated Preview PostgreSQL database to exact
   Phase 2 head, then deploy the exact API and Pages candidate commits.
4. Seed only rights-labelled Preview acceptance content and a synthetic audit user.
5. Run live API, migration, complete daily-loop, storage, accessibility, visual, bundle, and
   Production-denial checks.
6. Remove the synthetic user, sessions, plans, progress, ledger entries, notifications, drafts,
   and acceptance content; prove final application rows and synthetic R2 objects are zero.
7. Revoke temporary audit/operator credentials, retain only the minimum locked runtime identity,
   and remove local tunnels/helpers.
8. Keep the pull request draft and unmerged. The aggregate cannot self-accept Phase 2.

Phase 2 exits only after independent review and Gary's explicit acceptance. Phase 3 remains
unauthorized until that acceptance.

## Commit and review discipline

- Keep each task in a reviewable commit and run focused tests before broad tests.
- Do not stage or modify the four user-owned untracked artifacts in Section 1.
- Never commit secrets, raw provider responses, HAR files, signed URLs, database exports, or
  unredacted provider evidence.
- Inspect `git diff --cached --name-status` and `git diff --cached --check` before every commit.
- Use `[CF-Pages-Skip]` for documentation-only commits that must not replace the frozen Preview.
- Do not push an intermediate application commit onto an auto-deploying Preview path.
- No Production mutation, merge, or promotion is authorized by this plan.
- A task is complete only when its named tests and cross-phase regression checks pass.
