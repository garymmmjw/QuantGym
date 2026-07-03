# QuantGym UI Redesign Part 3 Plan

Date: 2026-07-03
Part: Part 3, Training Routes
Status: approved for implementation after Part 2 accepted

## Goal

Upgrade the Interview, Problems, Tools, Poker, and PK routes to the approved Playful Precision direction while preserving training, answer, filter, table, and match interactions.

## References

- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-design.md`
- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-review-checklist.md`
- `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-2.md`
- `UI 设计提升.zip`
- Sanitized design pages used only as references:
  - `QuantGym 模拟面试.dc.html`
  - `QuantGym 题目.dc.html`
  - `QuantGym 速算.dc.html`
  - `QuantGym Poker.dc.html`
  - `QuantGym PK.dc.html`

## Non-Negotiables

- Preserve critical ids:
  - Interview: `#interviewSetup`, `#startInterviewBtn`, `#interviewConsole`, `#interviewForm`, `#interviewAnswer`, `#nextInterviewQuestionBtn`
  - Problems: `#problemSearch`, `#problemList`, `#problemDetail`, `#problemRanking`, `#problemPagination`, `#problemCompletionProgress`
  - Tools: `#startDrillSessionBtn`, `#drillQuestion`, `#drillOptions`, `#drillFeedback`, `#marketBidInput`, `#marketAskInput`, `#submitMarketQuoteBtn`
  - Poker: `#pokerLobbySummary`, `#pokerTable`, `#pokerSeatGrid`, `#pokerActionBar`, `#pokerPreflopMatrix`, `#pokerLeaveTableBtn`
  - PK: `#startPkBtn`, `#pkProblem`, `#pkForm`, `#pkAnswer`, `#pkRevealBtn`, `#pkFeed`
- Preserve existing form controls, buttons, data attributes, and route smoke interactions.
- Do not replace live training components with static mockups.
- Keep mobile layouts free of document-level horizontal overflow.
- Honor dark mode and reduced motion.
- Do not introduce temporary filesystem references.

## Tasks

### Task 1: Add The Red Training Gate

Create `scripts/check-ui-redesign-training.mjs`.

The check must fail before implementation and pass only when:

- `src/styles/playful-precision-training.css` exists.
- `src/main.jsx` imports `./styles/playful-precision-training.css` after `./styles/playful-precision-growth.css`.
- The five route components contain `qg-training-page` and page-specific qg classes.
- The critical ids listed above remain in source.
- Training CSS contains interview, problems, tools, poker, pk, mobile, dark, and reduced-motion markers.
- `scripts/capture-ui-redesign-training-review.mjs` exists and captures all five training routes on desktop and mobile.
- Checked source has no local temporary paths.

Run `npm run check:ui-redesign-training` and confirm it fails for missing implementation pieces.

### Task 2: Update Training Page JSX

Modify:

- `src/features/interview/InterviewPageContent.jsx`
- `src/features/problems/ProblemsPageContent.jsx`
- `src/features/tools/ToolsPageContent.jsx`
- `src/features/poker/PokerPageContent.jsx`
- `src/features/pk/PkPageContent.jsx`
- `src/main.jsx`
- `package.json`

Requirements:

- Add page-level `qg-training-page` and page-specific classes without removing legacy classes or ids.
- Update visible mascot references to Playful Precision generated assets where matching assets exist.
- Keep all handlers, values, refs, ids, and aria attributes intact.
- Register `check:ui-redesign-training`.

### Task 3: Add Training CSS Layer

Create `src/styles/playful-precision-training.css`.

Requirements:

- Interview: setup and console surfaces should feel like the zip's interview room, with clear mode controls, advanced settings, transcript, answer bar, and panel affordances.
- Problems: searchable training browser with strong header, collections, filters, list/detail/ranking, and side rail.
- Tools: mental math drill and market-making card should feel like a timed trading challenge.
- Poker: keep the darker table world, but align typography, table chrome, action bar, matrix, and mobile behavior with Playful Precision.
- PK: clear two-player arena, answer surface, reveal action, and feed.
- Use tokens from Parts 0-2 and support dark theme.
- Include responsive and reduced-motion rules.

### Task 4: Browser Screenshot Review

Create `scripts/capture-ui-redesign-training-review.mjs`.

Capture:

- Interview desktop
- Interview mobile
- Problems desktop
- Problems mobile
- Tools desktop
- Tools mobile
- Poker desktop
- Poker mobile
- PK desktop
- PK mobile

Review:

- no incoherent overlap
- no horizontal overflow
- all critical controls visible
- route-specific mascots and assets render
- poker table and matrix remain visible
- problem browser list/detail/ranking anchors remain present

### Task 5: Verify Automated Gates

Run:

```bash
npm run check:ui-redesign-training
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

Run focused browser smoke checks for:

- interview onboarding/practice/resume
- problems search/detail/reveal/save
- problems pagination/collection/mock handoff
- mobile problems detail actions
- tools drill
- tools market game
- poker demo table
- poker preflop matrix
- pk match/submit/reveal

Expected: all pass.

### Task 7: Write Part 3 Review Record

Create `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-3.md` with:

- scope reviewed
- changed files
- screenshot paths
- automated evidence
- manual interaction evidence
- findings
- decision

Part 3 can be accepted only if automated gates, browser screenshots, and focused interactions pass.
