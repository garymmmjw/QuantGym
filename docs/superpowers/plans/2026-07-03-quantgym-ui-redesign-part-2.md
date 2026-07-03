# QuantGym UI Redesign Part 2 Plan

Date: 2026-07-03
Part: Part 2, Growth Core Pages
Status: approved for implementation after Part 1 accepted

## Goal

Upgrade the Overview, Plan, and Skills pages to the approved Playful Precision direction while preserving all learning-state, plan creation, leaderboard, and radar interactions.

## References

- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-design.md`
- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-review-checklist.md`
- `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-1.md`
- `UI 设计提升.zip`
- Sanitized design pages used only as references:
  - `QuantGym 总览.dc.html`
  - `QuantGym 计划.dc.html`
  - `QuantGym 能力值.dc.html`

## Non-Negotiables

- Preserve `#heroTypewriter`, `#overviewProblemProgress`, `#leaderboardMetricSelect`, `#leaderboardScopeSelect`, `#prepPlanSetupForm`, `#prepPlanDashboard`, `#editPrepPlanBtn`, `#skillsPageTitle`, `#skillRadar`, `#skillRadarTooltip`, and `#skillsGrid`.
- Keep every form control, select, radio group, canvas, and button semantic.
- Keep the existing plan setup and dashboard modes working.
- Keep the skills radar canvas interactive and keyboard reachable.
- Keep leaderboard controls and route smoke interactions working.
- Do not replace functional components with static mockups.
- Do not introduce temporary filesystem references.

## Tasks

### Task 1: Add The Red Growth Gate

Create `scripts/check-ui-redesign-growth.mjs`.

The check must fail before implementation and pass only when:

- `src/styles/playful-precision-growth.css` exists.
- `src/main.jsx` imports `./styles/playful-precision-growth.css` after `./styles/playful-precision-shell.css`.
- Overview, Plan, and Skills source files contain the new Playful Precision growth-page classes.
- The critical ids listed above remain in source.
- Growth CSS contains page-level, overview, plan, skills, mobile, and reduced-motion markers.
- `scripts/capture-ui-redesign-growth-review.mjs` exists and captures overview, plan, and skills viewports.
- No checked source references local temporary paths.

Run `npm run check:ui-redesign-growth` and confirm it fails for the missing implementation pieces.

### Task 2: Update Growth Page JSX

Modify:

- `src/features/overview/OverviewPageContent.jsx`
- `src/features/plan/PlanPageContent.jsx`
- `src/features/skills/SkillsPageContent.jsx`
- `src/main.jsx`
- `package.json`

Requirements:

- Add `qg-growth-page` and page-specific classes while keeping legacy classes and ids.
- Add semantic sub-classes to key regions for precise CSS targeting.
- Update mascot and coach images to Playful Precision generated assets.
- Preserve all existing props, handlers, ids, data attributes, and accessibility labels.
- Register `check:ui-redesign-growth`.

### Task 3: Add Growth CSS Layer

Create `src/styles/playful-precision-growth.css`.

Requirements:

- Implement the overview page as a high-density command-center layout with ticker, hero, progress, rhythm, heatmap, and leaderboard.
- Implement the plan page as a guided route board with setup cards, dashboard metrics, tasks, diagnostic panel, process stages, and source links.
- Implement the skills page as a score/radar cockpit with readable legend, non-overflowing canvas, skill bars, and compact cards.
- Use Playful Precision tokens from Part 0 and respect dark mode from Part 1.
- Include responsive rules for tablet and mobile.
- Include reduced-motion rules.

### Task 4: Browser Screenshot Review

Create `scripts/capture-ui-redesign-growth-review.mjs`.

Capture:

- Overview desktop
- Overview mobile
- Plan setup desktop
- Plan dashboard desktop
- Plan mobile
- Skills desktop
- Skills mobile
- Skills dark

Review:

- no incoherent overlap
- no horizontal overflow
- mascot and coach assets render
- plan setup and dashboard both remain usable
- skills radar stays visible and not blank
- dark mode remains readable

### Task 5: Verify Automated Gates

Run:

```bash
npm run check:ui-redesign-growth
npm run check:ui-redesign-shell
npm run check:ui-redesign-foundation
npm run check:ui-contracts
npm run check:route-integrity
git diff --check
npm run build
```

Expected: all pass. Existing Vite warnings about classic script tags may remain.

### Task 6: Interaction Smoke

Run focused browser smoke checks:

```bash
npm run check:browser-route-smoke -- --only-interaction "overview leaderboard" --summary docs/browser-audit-screenshots/368-ui-redesign-part-2-browser-overview-summary.json
npm run check:browser-route-smoke -- --only-interaction "prep plan setup dashboard and diagnostic flow" --summary docs/browser-audit-screenshots/368-ui-redesign-part-2-browser-plan-summary.json
npm run check:browser-route-smoke -- --only-interaction "skills radar" --summary docs/browser-audit-screenshots/368-ui-redesign-part-2-browser-skills-summary.json
```

Expected: all pass.

### Task 7: Write Part 2 Review Record

Create `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-2.md` with:

- scope reviewed
- changed files
- screenshot paths
- automated evidence
- manual interaction evidence
- findings
- decision

Part 2 can be accepted only if automated gates, browser screenshots, and focused interactions pass.
