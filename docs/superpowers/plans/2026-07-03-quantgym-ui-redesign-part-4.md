# QuantGym UI Redesign Part 4 Plan

Date: 2026-07-03
Part: Part 4, Supporting Routes
Status: accepted

## Goal

Upgrade the remaining React-owned routes to the Playful Precision design system while preserving existing interaction contracts and preparing evidence for review.

## Scope

- Experiences
- News
- Community
- Messages
- Network
- Resume
- Jobs
- Companies
- Library
- Courses
- Memory
- Settings
- Account

## Design Direction

- Use the same Playful Precision tokens, rounded-but-controlled panels, strong mascot-driven accents, and dense dashboard ergonomics established in Parts 0-3.
- Treat these pages as utility and support workflows, so the first screen should be the usable page, not a landing composition.
- Keep forms compact and scannable, with stable grid dimensions and no viewport-scaled typography.
- Use existing generated assets as subtle page watermarks or panel art where helpful.

## Implementation Steps

1. Add a `playful-precision-support.css` stylesheet after the training stylesheet.
2. Add page-level classes:
   - `qg-support-page`
   - `qg-experiences-page`
   - `qg-news-page`
   - `qg-community-page`
   - `qg-messages-page`
   - `qg-network-page`
   - `qg-resume-page`
   - `qg-jobs-page`
   - `qg-companies-page`
   - `qg-library-page`
   - `qg-courses-page`
   - `qg-memory-page`
   - `qg-settings-page`
   - `qg-account-page`
3. Preserve all existing ids used by route and interaction smoke tests.
4. Add static guard `scripts/check-ui-redesign-support.mjs`.
5. Add screenshot capture guard `scripts/capture-ui-redesign-support-review.mjs`.
6. Capture desktop and mobile review evidence for every supporting route.
7. Run static checks, build, support capture, and focused browser smoke interactions.
8. Write a Part 4 review record before committing.

## Review Gates

- `npm run check:ui-redesign-support`
- Existing UI redesign checks for foundation, shell, growth, and training
- `npm run check:ui-contracts`
- `npm run check:route-integrity`
- `git diff --check`
- `npm run build`
- `node scripts/capture-ui-redesign-support-review.mjs http://127.0.0.1:5174`
- Focused browser smoke:
  - `experiences create`
  - `news manual`
  - `mobile news`
  - `community post`
  - `mobile community`
  - `messages thread`
  - `memory resource`
  - `network contact`
  - `resume text`
  - `jobs filter`
  - `companies tier`
  - `library search`
  - `courses path`
  - `account profile`
  - `settings language`

## Risks

- This part touches many routes, so CSS must stay route-scoped and avoid altering completed growth/training pages.
- Some pages have empty states by default; screenshot review must check real layout health, not only content count.
- Library and account have overlays/upload controls; CSS must keep controls reachable on mobile.
