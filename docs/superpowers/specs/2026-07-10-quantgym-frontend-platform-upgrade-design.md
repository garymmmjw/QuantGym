# QuantGym Frontend Platform Upgrade Design

Status: approved in conversation; pending written-spec review
Date: 2026-07-10

## 1. Purpose

Upgrade QuantGym into a polished, coherent, and maintainable quant-training product while preserving the visual identity already defined by `UI 设计提升.zip`:

- brand purple and lavender surfaces;
- Quanty mascot and reward assets;
- playful but professional feedback;
- Plus Jakarta Sans for UI and Space Grotesk for metrics;
- light and dark themes;
- purposeful desktop and mobile layouts.

This is not another visual-direction exploration. The zip is the visual and interaction authority. The work is a production-grade implementation, architecture reset, and experience completion effort.

This specification supersedes `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-design.md` for future platform work. The earlier document remains historical evidence for the UI-only redesign already performed on the current branch. Its assumptions about preserving the old runtime, 21 routes, DOM contracts, persistence keys, and data model do not apply to this upgrade.

## 2. Locked Decisions

The following decisions were confirmed with the user:

1. Balance visual quality, user experience, architecture, and performance, while prioritizing the core training journey.
2. Preserve the existing brand colors, mascot, and playful personality while increasing polish and restraint.
3. Permit frontend, API, and data-model changes.
4. Existing test data may be discarded; no complex user-data migration is required.
5. Design desktop and small-laptop experiences first, while keeping mobile functionally complete.
6. Deliver in phases rather than through one big-bang implementation.
7. Use `UI 设计提升.zip` as the visual authority, with controlled adjustments for real data, accessibility, performance, and small-screen usability.
8. Use a vertical-slice migration strategy.
9. Use an online-first data model: the server owns official data, while the browser preserves short-lived drafts and caches.

## 3. Product Scope

The target product includes the current 22 routeable modules plus authentication and shared system surfaces.

### Growth

- `overview`
- `plan`
- `skills`
- `league`

### Training

- `interview`
- `problems`
- `tools`, including Mental Math and the market-making quote game
- `poker`
- `experiences`
- `pk`

### Social

- `news`
- `community`
- `messages`
- `network`

### Career

- `resume`
- `jobs`
- `companies`

### Resources

- `library`
- `courses`
- `memory`

### Platform

- `settings`
- `account`
- authentication
- application shell
- global search
- notifications
- Todo entry points
- theme and language preferences

## 4. Goals and Non-Goals

### Goals

- Reproduce the approved Playful Precision design with real data and complete interaction states.
- Make the daily training loop the product's primary organizing principle.
- Replace the React-plus-legacy-bootstrap hybrid with explicit domain boundaries.
- Establish one source of truth for server data and one small, deliberate client-state layer.
- Replace the monolithic Python HTTP handler with a typed, versioned API.
- Make long-running training and AI tasks recoverable.
- Meet explicit performance, accessibility, responsive, security, and test gates.
- Remove old bridges, duplicated CSS, and compatibility code as domains migrate.

### Non-Goals

- Creating a new brand identity or mascot system.
- Replacing the approved zip with a new visual trend.
- Supporting full offline use of the entire application.
- Migrating historical test users or their `state_json` payloads.
- Publishing question-bank or PDF content whose rights status does not allow the target release mode.
- Adding unrelated product areas before the current 22 routes are complete.

## 5. Source-of-Truth Hierarchy

When references disagree, use this order:

1. This approved specification for architecture, quality, data, and release behavior.
2. `UI 设计提升.zip` for visual hierarchy, page composition, interaction tone, responsive intent, and asset use.
3. Current production behavior for business requirements that remain in scope.
4. Existing code only as implementation context, not as a constraint on the new architecture.

Any deliberate deviation from the zip must be documented under one of four reasons:

- real-data density;
- accessibility;
- performance;
- small-screen usability.

## 6. Target Frontend Architecture

Retain React 19, Vite, and React Router. New production code uses TypeScript.

```text
src/
  core/
    bootstrap/
    router/
    providers/
    errors/
  design-system/
    tokens/
    primitives/
    patterns/
    motion/
  domains/
    account/
    career/
    community/
    economy/
    interview/
    league/
    plan/
    poker/
    problems/
    resources/
    skills/
    training/
  pages/
  shared/
    api/
    hooks/
    i18n/
    lib/
    testing/
```

### 6.1 Frontend Technology Baseline

- React 19 and React Router for the application and routing model.
- TypeScript for all new code.
- TanStack Query for server data, cache lifetimes, mutation status, retries, and invalidation.
- Zustand only for non-sensitive UI preferences and short-lived in-progress client state. The authenticated user record comes from the server-backed `/me` query.
- React Hook Form and Zod for forms and runtime validation.
- Generated OpenAPI schema types with a thin typed fetch client.
- CSS custom properties for tokens and CSS Modules for component and page styling.
- Storybook for design-system states and review.
- No Tailwind introduction; the approved design relies on explicit semantic tokens and controlled component styling.

Exact dependency versions belong in the implementation plan and must be verified against the active Node engine before installation.

### 6.2 State Ownership

- TanStack Query owns all server-backed entities and query results.
- Zustand must not copy server records into a second global store.
- React component state owns purely local presentation state.
- IndexedDB owns recoverable drafts and upload queues.
- Non-sensitive presentation preferences may persist locally; authentication credentials and user records may not.
- The server owns XP, coins, ratings, League state, plan completion, and official training outcomes.

### 6.3 Migration Boundary

- A complete route is the smallest migration unit.
- A migrated route must not import `createAppContext`, pageApi, old DOM controllers, or the global window event bus.
- A route must not contain both new state ownership and old controller ownership.
- A temporary legacy-route adapter may load old runtime code only for unmigrated routes in preview environments.
- Migrated routes never load the legacy bootstrap.
- Completing a domain includes deleting its corresponding controller, adapter, bridge, and duplicate CSS.
- The final production cutover cannot retain the legacy adapter.

## 7. Playful Precision 2.0 Design System

Playful Precision 2.0 is a production formalization of the zip, not a new visual style.

### 7.1 Core Tokens

Light theme foundations:

- app background: `#f4f4fb`;
- primary surface: `#ffffff`;
- secondary surface: `#fbfbfd`;
- text: `#1b1a38`;
- secondary text: `#4a4966`;
- muted text: `#6d6c8e`;
- border: `#ecebf7`;
- brand: `#5b5ff5`;
- brand soft: `#eef0ff`.

Dark theme foundations:

- app background: `#111020`;
- primary surface: `#201f39`;
- secondary surface: `#1b1a30`;
- text: `#f1f0fb`;
- secondary text: `#cbc9e8`;
- muted text: `#a6a4cf`;
- border: `#332f57`;
- brand: `#7d7bff`;
- brand ink: `#b9b8ff`.

Production token files must use semantic names such as `surface-primary`, `text-muted`, `action-primary`, and `status-success`; components must not depend on raw palette names.

### 7.2 Typography

- Plus Jakarta Sans is the primary UI family.
- Space Grotesk is used for XP, timers, scores, rankings, levels, and other numeric metrics.
- Chinese system fallbacks remain explicit.
- Metrics use tabular numbers.
- Math rendering loads only on routes and content that require it.

### 7.3 Shape, Surface, and Density

- Radius scale: 11, 14, 16, 20, and 28 pixels.
- Use border, background, spacing, and type hierarchy before shadow.
- Reserve strong shadows for dialogs, command surfaces, notifications, and mascot overlays.
- Preserve the primary button's tactile press behavior while limiting gradients and glow to primary or reward actions.
- Avoid nested cards when section spacing or background bands communicate the same hierarchy.
- Keep dense work surfaces such as Problems and Interview professional and scan-friendly.

### 7.4 Motion

- Micro-interactions: 120–180ms.
- Route and panel transitions: 240–300ms.
- Reward and celebration motion may be longer but cannot block the next action.
- All motion must support `prefers-reduced-motion`.
- Product pages must not use scroll-jacking.

### 7.5 Mascot and Reward Assets

- Reuse the approved brand, mascot, badge, reward, feature-art, and book-cover assets.
- Do not regenerate equivalent assets during this upgrade.
- One primary mascot per initial viewport is the default limit.
- Mascot appearances must communicate welcome, guidance, success, failure, search, emptiness, or a domain-specific training state.
- Reward colors are reserved for XP, streak, success, warning, and economy feedback.

## 8. Information Architecture and Page Templates

### 8.1 Desktop Shell

- Fixed 252px navigation sidebar.
- Sticky top bar with global search, streak, level, notifications, theme, and account.
- Main content constrained near 1180px for ordinary pages.
- Focused sessions may use a wider controlled canvas.
- At 1280×720, each route's title and primary action must be visible without scrolling.

Navigation groups:

```text
Overview
Growth: Plan / Skills / League
Training: Interview / Problems / Tools / Poker / Experiences
Social: News / Community / Messages / Network
Career: Resume / Jobs / Companies
Resources: Library / Courses / Memory
Platform: Settings / Account
```

`pk` remains reachable through training flows even if it is not a primary sidebar item.

### 8.2 Mobile Shell

- At 860px and below, switch to the approved mobile shell rather than shrinking the desktop sidebar.
- Use bottom primary tabs plus a complete navigation drawer.
- Maintain at least 44px touch targets.
- At 640px and below, List–Detail surfaces become single-view navigation with an explicit return path.
- Mobile retains complete product functionality but may reduce simultaneous information density.

### 8.3 Page Templates

1. Dashboard: Overview, Skills, League.
2. List–Detail: Problems, News, Experiences, Companies, Library.
3. Focused Session: Interview, Tools, Poker, PK.
4. Workflow Board: Plan, Jobs, task-oriented career flows.
5. Settings/Form: Account, Settings, Resume editing.

Templates define shared page title, statistics, filtering, loading, empty, error, offline, and permission states. Routes compose templates rather than inventing one-off structure.

## 9. Core Training Experience

The primary product loop is:

```text
Overview -> Plan -> Training Choice -> Session -> Result
-> XP / Skills / Coins -> Plan / League / Streak -> Overview
```

### 9.1 Overview

The initial viewport answers:

1. What should I train today?
2. What is my clearest weakness?
3. What will completing the next task unlock?

Keep the approved hero, mascot, streak, level, and weekly XP, but prevent equivalent cards from competing for attention. The primary CTA starts or resumes today's highest-priority training.

### 9.2 Problems

- Desktop uses the approved List–Detail workspace.
- Search, filters, selected problem, and list position are represented in the URL where appropriate.
- The server handles filtering and cursor pagination; the visible list is virtualized.
- Hint use, solution reveal, notes, favorite status, attempts, and completion are distinct events.
- Completion shows XP, skill effect, plan progress, and a recommended next action.
- Wrong-answer, favorite, Hot 100, and daily-problem views share one progress model.
- Mobile uses list navigation followed by a dedicated detail view.

### 9.3 Interview

The fixed journey is:

```text
Configure -> Device Check -> Session -> Per-question Feedback
-> Final Report -> Add Recommendations to Plan
```

- Configuration includes role, company, topic, difficulty, duration, language, and attachments.
- Voice and text use one answer model and can be switched during a session.
- Answers and attachments autosave as drafts.
- Refresh, navigation, or temporary network failure does not lose the session.
- Reports contain evidence, skill dimensions, recommendations, and next actions rather than only a score.

### 9.4 Shared Training Session Shell

Mental Math, market making, PK, and Poker share:

- pre-session configuration;
- round or question progress;
- timer and pause policy;
- keyboard controls;
- immediate feedback;
- recoverable session state;
- result view;
- XP, rating, coin, and plan updates.

Domain rules remain isolated behind explicit interfaces.

### 9.5 Growth Feedback Layer

- Plans consume recommendations and confirmed training events.
- Skills consume server-confirmed assessment events.
- League consumes the XP ledger.
- Coins and rewards come from immutable server-side ledger entries.
- Simulated competitors and bots must be explicitly disclosed.

## 10. Target API and Backend Architecture

Replace the single monolithic handler with FastAPI domain modules.

```text
api/
  auth/
  users/
  dashboard/
  problems/
  training/
  interviews/
  plans/
  skills/
  economy/
  league/
  community/
  media/
  notifications/
```

### 10.1 Backend Baseline

- FastAPI and Pydantic for HTTP contracts and validation.
- SQLAlchemy 2 for persistence.
- Alembic for migrations and rollback verification.
- PostgreSQL as the only production database.
- R2 for media, attachments, avatars, and PDF assets.
- OpenAPI-generated frontend schema types.
- The existing Node LLM service may remain initially, but it becomes an internal service behind the main API.

The browser talks to one public `/api/v2` origin. It does not call a separate public LLM endpoint.

### 10.2 API Rules

- REST for ordinary queries and mutations.
- Server-Sent Events for one-way AI streaming and long-task progress.
- WebSocket only for genuine bidirectional real-time features such as Poker.
- Cursor pagination for growing collections.
- Idempotency keys for reward-producing and create mutations.
- Version fields for conflict-sensitive updates.
- Request IDs on every response.

Standard error shape:

```json
{
  "code": "TRAINING_SESSION_EXPIRED",
  "message": "本次训练已结束",
  "fieldErrors": {},
  "requestId": "req_xxx",
  "retryable": false
}
```

### 10.3 Core Data Model

Identity:

- User
- Session
- Preference

Content:

- ProblemSource
- Problem
- LibraryResource

Progress:

- ProblemProgress
- Favorite
- Note

Training:

- TrainingSession
- Attempt
- Answer
- TrainingEvent

Interview:

- InterviewSession
- Turn
- Attachment
- Evaluation

Planning and growth:

- Plan
- PlanTask
- Recommendation
- SkillSnapshot
- XpLedger
- CoinLedger
- RatingHistory
- LeagueSeason
- LeagueEntry
- RewardPurchase

Social and system:

- NewsItem
- Experience
- Post
- Comment
- Conversation
- Message
- NetworkContact
- Notification
- MediaObject
- AiJob
- AuditEvent

Career:

- ResumeDocument
- ResumeReview
- CompanyProfile
- JobPosting
- JobApplication

Learning resources:

- Course
- CourseProgress
- MemoryResource

XP, coins, rating, and League scores are derived from immutable ledger entries. The client cannot write final balances directly.

## 11. Online-First and Draft Recovery

The server is the official source of truth. The browser uses IndexedDB only for:

- current answers and notes;
- active interview sessions;
- attachments in progress;
- unsubmitted training results;
- recent short-lived query cache.

Each draft contains a draft ID, server version, and update timestamp. Reconnection submits the draft through an idempotent mutation. A successful server acknowledgement removes the local draft. Logout clears sensitive drafts.

The application does not promise full offline browsing or editing of all product data.

## 12. Authentication and Security

- Use HttpOnly, Secure, SameSite session cookies.
- Do not store bearer tokens in localStorage.
- Protect state-changing requests against CSRF.
- Validate WebSocket origin and session.
- Select allowed AI models on the server; clients cannot choose arbitrary models.
- Add account-level AI quotas and rate limits.
- Validate RSS, media, callback, and external URLs against protocol, private-network, credential, query, and host restrictions appropriate to each endpoint.
- Use signed direct uploads for large media.
- Apply a production Content Security Policy and remove unnecessary global CDN scripts.
- Do not include interview answers, resume text, message bodies, or attachment contents in analytics or error telemetry.

## 13. Error and Recovery Design

Every route and mutation defines:

- loading;
- empty;
- recoverable error;
- non-recoverable error;
- offline draft;
- permission denied;
- stale-version conflict;
- retry behavior.

Long-running AI work is represented by an `AiJob` that survives refresh. The UI exposes queued, running, streaming, completed, failed, cancelled, and retry states. Reward-producing mutations cannot issue a second reward on retry.

Training completion shows the result before celebration begins. Motion must never hide the result or block the next action.

## 14. Delivery Phases

### Phase 0: Baseline and Design Freeze

- Version the zip as the design reference.
- Extract tokens, templates, component states, responsive behavior, and motion rules.
- Map every design interface to route, component, data, and interaction requirements.
- Capture current screenshots, performance, accessibility, and core-flow baselines.
- Create isolated Preview services, PostgreSQL, and R2 environments.
- Build a deletion map from legacy files to target domains.

Exit: every design surface has an explicit implementation and acceptance mapping.

### Phase 1: Kernel, Design System, Shell, and Auth

- TypeScript core, router, providers, and error boundaries.
- Design tokens, primitives, patterns, theme, and motion system.
- Authentication and session management.
- Desktop sidebar, mobile navigation, top bar, search, notification, Toast, and account surfaces.
- FastAPI, PostgreSQL, OpenAPI, and Preview CI foundations.

Exit: the new shell and authentication work without globally starting the legacy bootstrap. Legacy code may load only inside the preview-only adapter for unmigrated routes.

### Phase 2: Daily Training Loop

Routes:

- `overview`
- `plan`
- `problems`

Supporting systems:

- TrainingSession;
- ProblemProgress;
- notes and favorites;
- XP ledger;
- notifications;
- IndexedDB draft recovery.

Exit journey:

```text
Login -> Today's Task -> Recommended Problem -> Attempt / Hint
-> Complete -> XP -> Plan Update -> Overview Update
```

### Phase 3: AI Interview and Training Tools

Routes:

- `interview`
- `tools`

Supporting systems:

- shared Training Session Shell;
- AI Job and SSE progress;
- attachment upload;
- report and recommendation flow;
- Mental Math and market-making engines.

Exit journey:

```text
Configure -> Start -> Autosave / Recover -> Complete
-> Report -> Add Recommendation -> Train Again
```

### Phase 4: Skills, Economy, and Competition

Routes:

- `skills`
- `league`
- `pk`
- `poker`

Supporting systems:

- SkillSnapshot;
- streak rules;
- XP, coin, and rating ledgers;
- rewards shop;
- League seasons;
- real-time recovery.

Exit: all scores and rewards are server-confirmed, bots are disclosed, and real-time sessions recover from disconnects.

### Phase 5: Remaining Product Domains

Routes:

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

These routes reuse the stable templates, components, API conventions, media path, and error model created by earlier phases.

### Phase 6: Hardening and Cutover

- Complete desktop, small-laptop, and mobile verification.
- Remove the legacy bootstrap, adapter, pageApi, DOM controllers, event bus, static entries, and duplicate CSS.
- Reset test data and run controlled content imports.
- Run performance, accessibility, security, backup, rollback, and disaster-recovery checks.
- Promote the new deployment after Preview and controlled beta acceptance.

## 15. Release Strategy

- The existing beta remains stable while new phases deploy to an isolated Preview environment and v2 database.
- Each phase produces a deployable, testable vertical slice.
- Cross-domain preview use may invoke the temporary legacy adapter, but migrated routes use only v2 data and contracts.
- Legacy routes in Preview are explicitly marked as compatibility surfaces; their v1 state is neither merged into v2 nor accepted as evidence for a migrated journey.
- No dual-write synchronization is built between old and new databases.
- Controlled beta promotion begins only after the daily training loop is complete and cross-domain behavior is coherent.
- Final production promotion occurs only after all 22 routes are migrated and the legacy adapter is removed.
- Static frontend releases retain immediate rollback to the previous Cloudflare build.
- Database migrations require a tested Alembic downgrade or a documented forward-fix and backup restoration path.

## 16. Performance Budgets

Real-user targets:

- LCP P75 at or below 2.5 seconds.
- INP P75 at or below 200 milliseconds.
- CLS at or below 0.1.
- Initial JavaScript target at or below 180KB gzip.
- Ordinary route chunk target at or below 100KB gzip.
- No document-level horizontal overflow at supported widths.

Implementation rules:

- Route-level code splitting.
- Lazy-load MathJax, PDF, chart, editor, Interview, and Poker dependencies.
- Server-side filtering and cursor pagination for large lists.
- Virtualize large visible collections.
- Serve mascot art in correctly sized AVIF or WebP variants rather than original multi-megabyte PNG files.
- Subset and preload only critical font weights.
- Configure cache lifetimes per query type.
- Skeletons reserve the final layout to prevent shift.

## 17. Accessibility and Localization

- WCAG 2.2 AA is the minimum target.
- All primary journeys work with keyboard navigation.
- Interactive elements expose visible focus.
- Color is not the only signal for success, failure, difficulty, ranking, or progress.
- Charts and radar visualizations provide text alternatives.
- Field errors are programmatically associated and announced.
- Dialogs, drawers, and the command palette trap and restore focus correctly.
- Touch targets are at least 44px on mobile.
- Reduced-motion preferences affect every animation layer.
- Chinese and English copy use the shared i18n system and are checked for overflow and wrapping.

Verification viewports:

- 1440×900 desktop;
- 1280×720 small laptop;
- 390×844 primary mobile;
- 1024px tablet where a route has a distinct intermediate layout.

## 18. Testing Strategy

### Unit

- domain calculations;
- reward and rating rules;
- data normalization;
- reducers and state transitions;
- URL and formatting utilities.

### Component

- design-system states;
- forms;
- dialogs and drawers;
- training controls;
- accessibility behavior.

### Domain Integration

- API client, TanStack Query, store, draft recovery, and page interaction using MSW.

### End to End

- authentication;
- daily training loop;
- problem attempt and completion;
- Interview autosave and recovery;
- plan recommendation flow;
- economy and League reward flow;
- mobile navigation;
- theme and language;
- real-time reconnect where applicable.

### Visual Regression

- Storybook component states.
- All zip-backed route surfaces at approved viewports.
- Light and dark themes.
- Loading, empty, error, disabled, focus, active, reward, and reduced-motion states.

Tooling:

- Vitest;
- React Testing Library;
- MSW;
- Playwright;
- axe-core;
- Storybook.

## 19. CI and Acceptance Gates

Every merge must pass:

1. TypeScript type checking.
2. ESLint and Stylelint.
3. Unit and component tests.
4. OpenAPI client generation and contract drift checks.
5. Production build.
6. Bundle budgets.
7. Automated accessibility checks.
8. Critical Playwright journeys.
9. Reviewed visual differences.
10. Database migration upgrade and rollback checks when schemas change.

A migrated domain additionally requires:

- no legacy runtime imports;
- no page-level global event bus;
- no copied server entities in Zustand;
- no component-local raw color, shadow, or z-index constants;
- no application-owned console errors or unhandled promises;
- explicit loading, empty, error, offline, and permission states;
- desktop, small-laptop, and mobile evidence;
- deletion of replaced legacy files.

## 20. Observability and Privacy

- Frontend error collection includes release and route metadata.
- Web Vitals capture LCP, INP, CLS, and device class.
- API request IDs correlate frontend errors with server logs.
- AI Job, upload, SSE, and WebSocket success rates and durations are measured separately.
- Product analytics record event types and safe business identifiers only.
- Analytics and telemetry exclude interview answers, resumes, message bodies, note contents, and attachment contents.

## 21. Content and Release Rights

The frontend must load a catalog appropriate to the configured release mode. A successful technical upgrade does not grant redistribution rights.

- Private beta may use only sources approved for that boundary.
- Public and commercial deployments use release-safe catalogs unless every included source has the required approval.
- PDF and library access follow the same rights boundary.
- Rights checks remain release-blocking gates.

## 22. Final Acceptance Criteria

The upgrade is complete only when:

- all 22 routes and authentication use the new architecture;
- all zip-backed interfaces use real data and complete interaction states;
- the daily training, Interview, tools, economy, League, social, career, resource, and account flows pass at approved viewports;
- the browser no longer starts the legacy bootstrap;
- old pageApi, state bridge, DOM controllers, event bus, static entries, and duplicate CSS are removed;
- the browser stores no authentication bearer token;
- server-ledger rewards are idempotent and auditable;
- performance, accessibility, contract, build, test, and visual gates pass;
- backup, rollback, and recovery procedures are verified;
- the deployed content catalog matches its rights boundary.

## 23. Implementation Planning Boundary

This specification defines the destination and phase boundaries. The implementation plan must break each phase into test-first, reviewable tasks with exact files, commands, dependencies, migration steps, and checkpoints. Implementation must not begin until the written specification is reviewed and approved.

## 24. Spec Self-Review

- Placeholder scan: no unresolved TODO, TBD, placeholder, or unnamed dependency decision remains in the design scope.
- Internal consistency: the server is the source of truth; TanStack Query owns server records; Zustand owns only non-sensitive client state; IndexedDB owns recoverable drafts.
- Route coverage: Phases 2 through 5 cover each of the 22 routeable modules exactly once.
- Scope check: the work is intentionally decomposed into independently reviewable vertical slices, with final production promotion deferred until every route is migrated.
- Ambiguity check: the zip controls visual intent; this specification controls architecture and quality; deviations are limited to the four documented reasons.
