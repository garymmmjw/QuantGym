# QuantGym UI Redesign Design

Status: draft pending user review
Date: 2026-07-03

## Goal

Replace and upgrade QuantGym's existing product UI using `UI 设计提升.zip` as the primary visual source, while preserving the current React product routes, data contracts, and user interactions. Each implementation part must end with a design and regression review before the next part starts.

## Design Brief

QuantGym is a quant interview preparation product with a training, growth, community, career, resource, and account surface. The redesign should move the app to the zip's Playful Precision language: brand purple `#5b5ff5`, rounded but controlled product surfaces, Plus Jakarta Sans for UI, Space Grotesk for numbers, Quanty mascot assets, reward and badge assets, light and dark themes, and real mobile adaptations.

The current app is a Vite React application with 21 React-owned routes. The redesign must work inside this stack. It should not migrate frameworks, rewrite data stores, or remove existing automation hooks. The visual layer may be replaced broadly, but route slugs, critical DOM ids, page APIs, persistence keys, and smoke-tested interactions must remain compatible unless a replacement is explicitly covered by tests and review.

## Visual Source

Primary source: `UI 设计提升.zip`.

Sanitized inspection manifest was generated at `/tmp/quantgym-ui-design-sanitized/manifest.tsv` during discovery. The source contains:

- Core system files: `README.md`, `qg-state.js`, `support.js`.
- Shell and system designs: `QuantGym 总览.dc.html`, `QuantGym 登录.dc.html`, `QuantGym UI 升级计划 v2.dc.html`.
- Existing-route designs: plan, skills, interview, problems, tools, poker, PK, experiences, news, community, messages, network, resume, jobs, companies, library, courses, memory, settings, account.
- Extra enhancement designs: league and quote game.
- Asset families: brand mark and logo, mascot poses, avatars, badges, rewards, feature art, book covers, and uploaded image references.

## Scope

In scope for the first complete redesign:

- Existing 21 React routes:
  - overview
  - plan
  - skills
  - interview
  - problems
  - tools
  - poker
  - experiences
  - news
  - community
  - messages
  - network
  - resume
  - jobs
  - companies
  - library
  - courses
  - memory
  - settings
  - account
  - pk
- Auth shell and authenticated app shell.
- Shared visual system, light theme, dark theme, responsive shell, mobile route layouts.
- Existing global search, todo dock, streak, settings, account, and route navigation behaviors.
- Empty, loading, disabled, error, focus, hover, active, and reduced-motion states where the current page exposes those states.

Deferred unless the user explicitly promotes them to this phase:

- League as a new official route.
- Quote game as a new official route.
- A new rewards shop or achievement wall beyond visual hooks already present in existing pages.
- Replacing the current data architecture with the standalone `qg-state.js` state layer from the zip.

## Non-Negotiables

- Preserve all existing route paths.
- Preserve existing critical DOM ids and data attributes required by `check:ui-contracts`, route smoke, and route interaction checks.
- Preserve existing local persistence and cloud boundary behavior.
- Preserve functional form controls, filters, navigation links, uploads, readers, poker actions, PK actions, interview flows, resume review flows, backups, and account operations.
- Avoid adding new runtime dependencies unless the implementation plan names the dependency, verifies `package.json`, and provides a reason.
- Use real assets from the zip or existing `assets/generated` and `assets/library-covers`; do not replace meaningful assets with CSS art or placeholder boxes.
- Support both desktop and mobile. Mobile must avoid document-level horizontal overflow.
- Support light and dark theme tokens from the start. Theme must be global, not section-by-section.
- Honor `prefers-reduced-motion`.

## Architecture

The redesign should be layered so each part is reviewable:

1. Design assets and tokens.
   - Add copied zip assets to a stable app asset path, likely under `assets/generated/playful-precision/` or an equivalent existing public asset convention.
   - Introduce semantic CSS variables for background, surfaces, borders, text, brand, status, shadow, radius, type, and z-index.
   - Split new route styling into focused files if the current monolithic `styles.css` becomes risky to edit directly.

2. Shared UI primitives.
   - Establish classes for app shell, cards, panels, buttons, icon buttons, tabs, chips, form fields, stat pills, page headers, empty states, skeletons, modals, toasts, and mascot image slots.
   - Keep component markup semantic and compatible with existing ids.

3. Shell and routing chrome.
   - Replace `TopbarShell`, `AppShellMain`, and `AuthShell` visuals with zip-aligned layout.
   - Keep route outlet ownership intact.
   - Keep global search, route tabs, sidebar collapsed state, mobile controls, todo dock, account and settings jumps, and streak widget behaviors.

4. Route groups.
   - Apply page-level redesign by product domain. Each group should use the shared primitives rather than duplicate inline styling.
   - Complex pages should keep existing React logic and page APIs, with visual and layout work isolated to JSX structure and CSS classes where possible.

## Design System

### Typography

- UI font: Plus Jakarta Sans where production loading allows. Keep robust fallbacks for Chinese text and system UI.
- Numeric font: Space Grotesk for XP, levels, scores, timers, rankings, and stat counters.
- Existing font links in `index.html` should be updated only after verifying load impact and fallbacks.
- Use tabular numeric rendering for metrics.

### Color

- Brand: `#5b5ff5`.
- Light theme: soft lavender-gray app background, white and near-white surfaces, subtle purple-tinted borders and shadows.
- Dark theme: deep indigo background, elevated dark surfaces, purple-tinted borders, high-contrast text, brand color shifted toward `#7d7bff`.
- Keep accent usage disciplined: brand purple is primary, warm orange/gold is reserved for streaks and rewards, green is reserved for success, red is reserved for errors or danger.

### Shape and Surface

- Outer panels: 18px to 28px radius depending on visual weight.
- Inner controls: 10px to 16px radius.
- Avoid cards inside cards where spacing and section bands can do the job.
- Use tinted shadows sparingly. Prefer border, background, and spacing for hierarchy in dense app areas.

### Motion

- Motion should communicate feedback, state change, route loading, or reward.
- Default interaction motion: 150ms to 260ms transform and opacity transitions.
- Reward and mascot motion can be more playful but must stop or simplify under reduced motion.
- Avoid scroll-jacking in the product app.

### Assets

- Brand mark and logo should use the zip assets unless current production assets are visually equivalent and easier to serve.
- Mascot usage should match page intent:
  - hero and overview: `mascot-hero-v5-clean.png`
  - streak and reward: `mascot-fire-v2.png`, `mascot-trophy-v2.png`, `mascot-levelup.png`
  - empty or failed states: `mascot-oops.png`, `mascot-search.png`, `mascot-sleep.png`
  - interview, poker, math: matching domain mascots.
- Book covers should use real cover assets where available, not generic colored rectangles.

## Implementation Parts And Review Gates

Detailed review criteria and the review note template live in `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-review-checklist.md`. Each part below must use that checklist before the next part begins.

### Part 0: Assets, Tokens, And UI Foundation

Deliverables:

- Stable asset copy from zip into app-served assets.
- A documented route from old tokens to Playful Precision tokens.
- Light and dark theme variables.
- Shared primitive CSS classes for panels, buttons, chips, forms, stat pills, route headers, empty states, skeletons, and mascot slots.

Review:

- Inspect asset paths and file sizes.
- Confirm no broken asset references in built output.
- Confirm light and dark token contrast on representative controls.
- Run `git diff --check`.
- Run `npm run build`.
- Capture at least one desktop and one mobile shell screenshot after the foundation is consumed by a visible part.

### Part 1: Shell And Auth

Deliverables:

- Auth shell visually aligned to `QuantGym 登录.dc.html`.
- Authenticated shell visually aligned to `QuantGym 总览.dc.html` shell: sidebar, top command bar, mobile navigation, account, settings, streak, and notification affordances.
- Existing route navigation and global search still work.

Review:

- Desktop screenshot of logged-out auth page.
- Desktop screenshot of logged-in overview shell.
- Mobile screenshot of logged-in shell with navigation open.
- Verify no document-level horizontal overflow at a narrow mobile viewport.
- Run `npm run check:route-integrity`.
- Run `npm run check:route-interactions`.
- Run focused browser smoke if implementation changes shell controls.

### Part 2: Overview And Growth

Routes:

- overview
- plan
- skills

Deliverables:

- Overview hero, XP, streak, weekly chart, today's tasks, leaderboard, and news ticker align to the zip direction.
- Plan board and task progression align to the zip direction.
- Skills radar, weak-area actions, and metric cards align to the zip direction.

Review:

- Desktop and mobile screenshots for all three routes.
- Confirm plan task navigation still opens target training pages with context.
- Confirm skills weak-area and global search interactions still work.
- Run relevant static and browser checks for overview, plan, and skills interactions.

### Part 3: Training

Routes:

- interview
- problems
- tools
- poker
- pk

Deliverables:

- Interview console, setup, transcript, hints, favorites, attachments, and score states align to zip.
- Problems search, filters, list/detail, ranking, solution, completion, collection, and mobile detail flows align to zip.
- Tools mental math and market game align to zip.
- Poker table, lobby, seats, action bar, matrix, ledger, and mobile layout align to zip.
- PK match, answer, reveal, feed, and record states align to zip.

Review:

- Desktop screenshots for each route.
- Mobile screenshots for interview, problems, tools, poker, and pk.
- Run focused browser flows for interview, problems, tools, poker, and pk.
- Run `npm run check:browser-route-smoke` if this part touches shared route behavior or complex workflows.

### Part 4: Community, Career, Resources, And Account

Routes:

- news
- experiences
- community
- messages
- network
- resume
- jobs
- companies
- library
- courses
- memory
- settings
- account

Deliverables:

- All listed pages visually align with their zip counterparts.
- Forms, filters, uploads, readers, external links, backups, sync guards, language settings, account editing, and persistence remain intact.
- Mobile single-column and message/chat flows are explicitly handled.

Review:

- Desktop screenshots for each route group.
- Mobile screenshots for the densest routes: community, messages, resume, jobs, companies, library, memory, settings, account.
- Run focused browser flows for content creation, media upload fallback, resume review, jobs/company navigation, library reader, settings backup, and account upload.
- Run `npm run check:route-interactions`.

### Part 5: Full Polish And Release Review

Deliverables:

- Consistent theme across all routes.
- Light and dark theme checks.
- Reduced-motion behavior.
- No horizontal overflow on supported mobile routes.
- Loading, empty, and error state pass.
- Visual review notes for every part are captured.

Review:

- Run `git diff --check`.
- Run `npm run build`.
- Run `npm run check:stage1`.
- Run `npm run check:stage2`.
- Run `npm run check:stage2:strict`.
- Run `npm run check:ui-contracts`.
- Run `npm run check:route-integrity`.
- Run `npm run check:route-interactions`.
- Run `npm run check:browser-route-smoke`.
- Save or reference generated review screenshots under the existing browser audit evidence convention when appropriate.

## Testing Strategy

Implementation should be test-first for behavior changes. Pure visual CSS refactors can be verified through build, screenshot review, and existing route smoke gates, but any changed interaction must first have a failing static or browser check when practical.

Minimum verification after each part:

- Static validity: `git diff --check`.
- Build validity: `npm run build`.
- Contract validity for touched routes: relevant existing `check:*` commands.
- Visual evidence: desktop and mobile screenshots for touched surfaces.
- Manual review notes: what was checked, what passed, what remains.

## Risks

- The app currently has a large root `styles.css` and an additional `src/styles/react-route-overrides.css`; uncontrolled edits can create selector conflicts.
- Some shell behavior is still bound by legacy DOM ids and runtime controllers.
- The zip pages use inline DC templates, so they must be translated into maintainable React/CSS patterns rather than pasted wholesale.
- Adding dark mode globally can expose contrast problems in third-party or legacy-colored surfaces.
- Mobile changes are high risk for dense routes such as problems, interview, poker, messages, settings, account, and library.
- Browser smoke is broad and may take time, but it is the best proof that the redesign did not break the product.

## Decisions For User Review

1. The first implementation phase covers the existing 21 official routes. League and quote game remain enhancement designs unless promoted.
2. The standalone zip `qg-state.js` is treated as design and behavior reference, not a replacement for the current app state layer.
3. Each implementation part ends with screenshot review plus relevant automated checks before the next part begins.
4. Visual replacement is broad, but route paths, ids, data attributes, and tested interactions are preserved.

## Spec Self-Review

- Placeholder scan: no unresolved placeholder markers remain.
- Internal consistency: scope, architecture, parts, and review gates all describe the same 21-route first phase.
- Scope check: the plan is large but intentionally divided into independent implementation parts.
- Ambiguity check: league and quote game are explicitly deferred unless the user promotes them.
