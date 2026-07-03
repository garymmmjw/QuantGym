# QuantGym UI Redesign Review Checklist

Status: draft pending user review
Date: 2026-07-03

## Purpose

This checklist defines how each UI redesign part is reviewed before the next part starts. It is paired with `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-design.md`.

Each part review must prove three things:

- Visual alignment: touched surfaces match the Playful Precision direction from `UI 设计提升.zip`.
- Product safety: route paths, data contracts, critical ids, persistence, and interactions still work.
- Responsive quality: desktop and mobile layouts have no broken text, cropped controls, or document-level horizontal overflow.

## Review Record Format

Create one review note per completed part using this shape:

```md
# QuantGym UI Redesign Part N Review

Date:
Part:
Reviewer:
Status: in review

## Scope Reviewed

- Routes or surfaces:
- Files changed:
- Zip references used:

## Visual Evidence

- Desktop screenshots:
- Mobile screenshots:
- Dark theme screenshots:
- Notes on mismatches:

## Automated Evidence

- `git diff --check`:
- `npm run build`:
- Focused check commands:
- Browser smoke commands:

## Manual Interaction Evidence

- Navigation:
- Forms and filters:
- Persistence:
- Uploads or external links:
- Error, empty, loading, disabled states:
- Keyboard and focus:

## Findings

- Accepted:
- Needs changes:
- Deferred:

## Decision

Status: accepted or needs changes
Next part allowed: yes or no
```

## Part 0: Assets, Tokens, And UI Foundation

### Visual Alignment

- Brand purple maps to `#5b5ff5` in light mode and a brighter purple in dark mode.
- Plus Jakarta Sans and Space Grotesk are represented in the font stack with stable fallbacks.
- Light theme uses the zip's soft lavender-gray app background and white elevated surfaces.
- Dark theme uses deep indigo surfaces with readable text and visible borders.
- Button, chip, panel, form, stat, skeleton, and empty-state primitives have consistent radius and spacing.
- Mascot and reward image slots reserve stable dimensions before images load.

### Product Safety

- Asset paths are app-served and do not rely on `/tmp`.
- Existing production assets that pages still reference are not removed.
- `index.html` meta, scripts, and app mount remain intact.
- Theme implementation does not break auth session hint or runtime data loading.
- No new dependency is added without being named in the implementation plan.

### Evidence

- `git diff --check`
- `npm run build`
- Asset path inspection in built output when assets are consumed.
- Desktop and mobile screenshot from the first visible surface that uses the foundation.

## Part 1: Shell And Auth

### Visual Alignment

- Auth shell follows the zip login direction with brand mark, mascot, clear form hierarchy, and polished success/error states.
- Authenticated shell follows the zip overview shell direction: sidebar, top command/search area, streak, account, notification, settings, and responsive mobile controls.
- Navigation active states are clear and consistent.
- Mobile navigation uses reachable controls with at least 44px touch targets.
- Shell surfaces maintain one visual language in light and dark themes.

### Product Safety

- Logged-out users see auth and protected routes redirect correctly.
- Logged-in users see `#appShell` and route content.
- Existing global search opens, filters, keyboard navigation works, and route jumps still land on the correct pages.
- Sidebar collapsed state persists where currently supported.
- Streak widget opens, closes, and does not interfere with route clicks.
- Todo dock remains reachable and functional.
- Account and settings jumps still navigate through existing handlers.

### Evidence

- Desktop auth screenshot.
- Desktop logged-in overview shell screenshot.
- Mobile shell screenshot with navigation open.
- `npm run check:route-integrity`
- `npm run check:route-interactions`
- Focused browser smoke if shell handlers changed.

## Part 2: Overview And Growth

Routes: overview, plan, skills.

### Visual Alignment

- Overview hero, mascot, XP, streak, weekly chart, daily tasks, leaderboard, and ticker match the zip's hierarchy and tone.
- Plan board cards, status progression, and task CTAs match the zip plan direction.
- Skills radar, skill cards, weak-area coach, and metric panels match the zip ability direction.
- Growth pages use shared stat, panel, chip, and CTA primitives instead of one-off styling.

### Product Safety

- Overview problem and news navigation still route correctly.
- Leaderboard controls preserve current behavior.
- Plan setup, edit, create, toggle, persistence, and task navigation still work.
- Skills radar hover, legend, tooltip, card filtering, and global search spotlight still work.
- Existing critical ids remain present.

### Evidence

- Desktop and mobile screenshots for overview, plan, and skills.
- Focused browser interactions for overview leaderboard, plan lifecycle, and skills radar/search.
- `npm run check:route-interactions`
- `npm run check:browser-route-smoke` if shared route behavior changed.

## Part 3: Training

Routes: interview, problems, tools, poker, pk.

### Visual Alignment

- Interview setup, console, transcript, action chips, hints, score cards, and attachment states match the zip interview direction.
- Problems header, search, filters, list/detail, solution reveal, empty state, ranking, and mobile detail layout match the zip problems direction.
- Tools mental math and market game use zip-aligned challenge panels, timers, scoring, and feedback.
- Poker keeps a readable table, seat grid, action bar, lobby, matrix, and ledger in desktop and mobile.
- PK match, opponent state, answer form, reveal, and feed match the zip PK direction.

### Product Safety

- Interview onboarding, practice answer, hint, reveal, submit, favorite, exit, resume, attachment, and PDF source flows still work.
- Problems search, filters, pagination, detail, solution reveal, complete, collection, social guard, ranking, and mock interview handoff still work.
- Tools drill start, answer, skip, completion, market quote validation, scoring, and persistence still work.
- Poker demo room, fill, start hand, hero action, preflop matrix, room persistence, and leave navigation still work.
- PK match, submit, reveal, and record persistence still work.

### Evidence

- Desktop screenshots for all five routes.
- Mobile screenshots for interview, problems, tools, poker, and pk.
- Focused browser flows for each route.
- `npm run check:browser-route-smoke` before accepting this part.

## Part 4: Community, Career, Resources, And Account

Routes: news, experiences, community, messages, network, resume, jobs, companies, library, courses, memory, settings, account.

### Visual Alignment

- News, experiences, community, and messages align with the zip social direction while keeping density readable.
- Network, resume, jobs, and companies align with the zip career direction and preserve scan-friendly cards and panels.
- Library, courses, and memory align with the zip resource direction, using real covers and mascot empty states.
- Settings and account align with the zip account direction, with clear segmented controls, forms, upload states, and danger areas.
- Mobile versions become purposeful single-column flows, not squeezed desktop grids.

### Product Safety

- News submission, filter, detail, read state, and persistence still work.
- Experiences create, edit, share, delete, filter, and persistence still work.
- Community post, media fallback, like, comment, direct message, and persistence still work.
- Messages read state, multi-thread unread badges, send, and persistence still work.
- Network add, edit, delete, and persistence still work.
- Resume save, LLM review request, rendering, and reload persistence still work.
- Jobs filter and apply link behavior still work.
- Companies tier filter, practice navigation, and careers links still work.
- Library search, kind filter, practice navigation, cloud reader, and reader guard still work.
- Courses path, source switch, note, and persistence still work.
- Memory resource add, image fallback, source links, and persistence still work.
- Settings config save, cloud sync guard/success, language, backup export/import/reset still work.
- Account profile save, email change, avatar upload/clear, resume upload, admin guard, and persistence still work.

### Evidence

- Desktop screenshots for each route group.
- Mobile screenshots for community, messages, resume, jobs, companies, library, memory, settings, and account.
- Focused browser flows for content creation, media upload fallback, resume review, jobs/company navigation, library reader, settings backup, and account upload.
- `npm run check:route-interactions`
- `npm run check:browser-route-smoke` if route-wide behavior changed.

## Part 5: Full Polish And Release Review

### Visual Alignment

- All routes share one Playful Precision system.
- Light and dark themes are complete and do not invert per section.
- Typography, radius, surface, and asset use are consistent.
- Empty, loading, error, disabled, focus, hover, active, and reward states are styled.
- No visible text is clipped or awkwardly wrapped in buttons, tabs, filters, or cards.
- Mascot use is intentional and not repeated in a way that makes pages feel identical.

### Product Safety

- Existing route set remains 21 official React routes unless the user promoted new routes.
- No critical route ids, data attributes, persistence keys, or page API contracts were silently removed.
- All broad smoke and contract gates pass.
- Browser console is free of QuantGym-owned errors in smoke runs.
- Build output does not contain broken assets or accidental local `/tmp` references.

### Evidence

- `git diff --check`
- `npm run build`
- `npm run check:stage1`
- `npm run check:stage2`
- `npm run check:stage2:strict`
- `npm run check:ui-contracts`
- `npm run check:route-integrity`
- `npm run check:route-interactions`
- `npm run check:browser-route-smoke`
- Representative desktop and mobile screenshot set for all route groups.
- Final gap list with accepted, changed, and deferred items.

## Acceptance Rule

A part is accepted only when its review record has:

- Matching visual evidence for the touched surfaces.
- Passing automated evidence for the touched scope.
- Manual interaction evidence for the workflows touched by the part.
- A clear decision of `accepted`.

If any required evidence is missing, weak, indirect, or failing, the part remains in review and the next part does not start.
