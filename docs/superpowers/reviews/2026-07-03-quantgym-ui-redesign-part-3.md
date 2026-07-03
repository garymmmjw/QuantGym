# QuantGym UI Redesign Part 3 Review

Date: 2026-07-03
Part: Part 3, Training And Practice Routes
Reviewer: Codex
Status: accepted

## Scope Reviewed

- Routes or surfaces:
  - Mock Interview
  - Problems
  - Mental Math and market game tools
  - Poker
  - PK
- Files changed:
  - `package.json`
  - `src/main.jsx`
  - `src/features/interview/InterviewPageContent.jsx`
  - `src/features/problems/ProblemsPageContent.jsx`
  - `src/features/tools/ToolsPageContent.jsx`
  - `src/features/poker/PokerPageContent.jsx`
  - `src/features/poker/PokerActionBar.jsx`
  - `src/features/pk/PkPageContent.jsx`
  - `src/styles/playful-precision-training.css`
  - `scripts/check-ui-redesign-training.mjs`
  - `scripts/capture-ui-redesign-training-review.mjs`
  - `docs/superpowers/plans/2026-07-03-quantgym-ui-redesign-part-3.md`
- Zip references used:
  - `QuantGym 模拟面试.dc.html`
  - `QuantGym 题目.dc.html`
  - `QuantGym 速算.dc.html`
  - `QuantGym Poker.dc.html`
  - `QuantGym PK.dc.html`

## Visual Evidence

- Desktop screenshots:
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-interview-desktop.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-problems-desktop.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-tools-desktop.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-poker-desktop.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-pk-desktop.png`
- Mobile screenshots:
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-interview-mobile.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-problems-mobile.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-tools-mobile.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-poker-mobile.png`
  - `docs/browser-audit-screenshots/369-ui-redesign-part-3-pk-mobile.png`
- Notes on mismatches:
  - Initial Problems mobile capture did not load the header mascot because an older mobile rule hid the image. Fixed with a stronger Playful Precision mobile image rule.
  - Initial Poker desktop capture placed the table too low because the table panel spanned two grid rows. Fixed by constraining the table panel to row 3 and locking its viewport-friendly height.
  - Initial Interview desktop setup panel was too narrow. Fixed by widening the setup column and stacking the setup controls.
  - PK feed empty state was visually too blank. Fixed with a low-opacity trophy mascot watermark.

## Automated Evidence

- Red check `npm run check:ui-redesign-training`: exit 1 before implementation. Failure included missing training CSS, missing capture script, missing training import, missing qg page classes, missing Playful Precision asset references, and missing CSS/capture markers.
- Green check `npm run check:ui-redesign-training`: exit 0 with `{"status":"pass","pages":5,"cssMarkers":10,"captureViews":10}`.
- `npm run check:ui-redesign-growth`: exit 0 with `{"status":"pass","pages":3,"cssMarkers":13,"captureViews":8}`.
- `npm run check:ui-redesign-shell`: exit 0 with `{"status":"pass","shellClasses":5,"authClasses":3,"cssMarkers":8}`.
- `npm run check:ui-redesign-foundation`: exit 0 with `{"status":"pass","assetCount":36,"tokenCount":13,"classCount":8}`.
- `npm run check:ui-contracts`: exit 0 with `{"status":"pass","routes":21,"shellContracts":3,"evidenceArtifacts":47,"imageArtifacts":92}`.
- `npm run check:route-integrity`: exit 0 with `{"status":"pass","routes":21,"reactRoutes":21,"bridgeRoutes":0,"publicFallbackPages":21,"failures":[],"warnings":[]}`.
- `git diff --check`: exit 0.
- `npm run build`: exit 0. Existing Vite warnings about classic script tags remained.
- `node scripts/capture-ui-redesign-training-review.mjs http://127.0.0.1:5174`: exit 0 with 10 screenshots and summary status `pass`.

## Manual Interaction Evidence

- Navigation and route health:
  - Every smoke run checked 21 routes and passed 21 routes with no document-level horizontal overflow.
- Interactions:
  - `npm run check:browser-route-smoke -- --only-interaction "interview onboarding" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-interview-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "problems search" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-problems-search-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "problems pagination" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-problems-pagination-summary.json`: exit 0 on rerun. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "mobile problems" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-mobile-problems-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "tools drill" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-tools-drill-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "tools market" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-tools-market-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "poker demo" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-poker-demo-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "poker preflop" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-poker-preflop-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "pk match" --summary docs/browser-audit-screenshots/369-ui-redesign-part-3-browser-pk-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
- Forms and filters:
  - Interview setup, answer flow, favorite save, exit, and resume remained functional.
  - Problems search, detail reveal, save toggle, pagination, collection filter, and interview handoff remained functional.
  - Mental math drill and market making quote interactions remained functional.
  - Poker demo controls, preflop position selection, and matrix cell selection remained functional.
  - PK match, answer submission, reveal, and feed behavior remained functional.
- Persistence:
  - Interview favorites and durable resume persisted during smoke.
  - Problem save state and filters were verified through browser interactions.
- Uploads or external links:
  - Interview PDF upload controls remained present but were not part of Part 3 smoke.
- Error, empty, loading, disabled states:
  - Problems empty/collection states retained layout.
  - Poker disabled lobby/action buttons stayed visible and readable.
  - PK empty feed now has non-blocking visual treatment.
- Keyboard and focus:
  - Search, form inputs, segmented controls, selects, and icon controls stayed reachable by browser automation.
- Flake note:
  - The first `problems pagination` run passed its route scan and target interaction but failed the reusable unauthenticated auth preflight due to a one-off preview `page.goto("/settings")` timeout. A rerun passed and overwrote the summary with green evidence.

## Findings

- Accepted:
  - Training routes now consume the Playful Precision training layer and generated mascot assets.
  - Critical ids and route contracts remain intact, including `#pokerActionBar`.
  - Desktop and mobile screenshot evidence pass with no document-level horizontal overflow.
  - The implementation keeps route logic in place and scopes the redesign primarily to new CSS plus stable page classes.
- Needs changes:
  - None for Part 3.
- Deferred:
  - Remaining lower-priority routes continue in later parts.
  - Broader dark-theme screenshots for every training route are deferred to the final cross-route sweep.

## Decision

Status: accepted
Next part allowed: yes
