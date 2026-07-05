# QuantGym UI Redesign Part 4 Review

Date: 2026-07-03
Part: Part 4, Supporting Routes
Reviewer: Codex
Status: accepted

## Scope Reviewed

- Routes or surfaces:
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
- Files changed:
  - `package.json`
  - `src/main.jsx`
  - `src/features/experiences/ExperiencesPageContent.jsx`
  - `src/features/news/NewsPageContent.jsx`
  - `src/features/community/CommunityPageContent.jsx`
  - `src/features/messages/MessagesPageContent.jsx`
  - `src/features/network/NetworkPageContent.jsx`
  - `src/features/resume/ResumePageContent.jsx`
  - `src/features/jobs/JobsPageContent.jsx`
  - `src/features/companies/CompaniesPageContent.jsx`
  - `src/features/library/LibraryPageContent.jsx`
  - `src/features/courses/CoursesPageContent.jsx`
  - `src/features/memory/MemoryPageContent.jsx`
  - `src/features/settings/SettingsPageContent.jsx`
  - `src/features/account/AccountPageContent.jsx`
  - `src/styles/playful-precision-support.css`
  - `scripts/check-ui-redesign-support.mjs`
  - `scripts/capture-ui-redesign-support-review.mjs`
  - `docs/superpowers/plans/2026-07-03-quantgym-ui-redesign-part-4.md`
- Zip references used:
  - Experiences and social/community routes were aligned with the same Playful Precision shell and mascot treatment from the provided UI upgrade references.
  - News, Library, Courses, Settings, and Account reused the reference system's soft dashboard cards, compact controls, and purple brand accents.

## Visual Evidence

- Desktop screenshots:
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-experiences-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-news-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-community-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-messages-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-network-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-resume-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-jobs-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-companies-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-library-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-courses-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-memory-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-settings-desktop.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-account-desktop.png`
- Mobile screenshots:
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-experiences-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-news-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-community-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-messages-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-network-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-resume-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-jobs-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-companies-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-library-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-courses-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-memory-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-settings-mobile.png`
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-account-mobile.png`
- Summary artifact:
  - `docs/browser-audit-screenshots/370-ui-redesign-part-4-support-summary.json`: status `pass`, checks `26`, screenshots `26`, max horizontal overflow `0`.
- Notes on mismatches:
  - Initial mobile News smoke exposed horizontally scrolling filter controls that hid required options. Fixed by allowing the News segmented filters to wrap on mobile.
  - Final screenshot audit found the Courses mobile learning path empty state squeezed into a narrow second column. Fixed by forcing the learning path panel to one column and full-width empty state behavior on mobile.
  - Messages default empty state renders repeated copy in two real regions by design. It was accepted because it has no overflow and keeps thread/composer structure stable.
  - Library desktop keeps the book shelf as an internal horizontal rail. It was accepted because document-level overflow remains zero and the rail is a deliberate browse pattern.

## Automated Evidence

- Red check `npm run check:ui-redesign-support`: exit 1 before implementation. Failure included missing support CSS, missing support import, missing qg page classes, missing capture script, and missing CSS/capture markers.
- Green check `npm run check:ui-redesign-support`: exit 0 with `{"status":"pass","pages":13,"cssMarkers":17,"captureViews":26}`.
- `npm run check:ui-redesign-training`: exit 0 with `{"status":"pass","pages":5,"cssMarkers":10,"captureViews":10}`.
- `npm run check:ui-redesign-growth`: exit 0 with `{"status":"pass","pages":3,"cssMarkers":13,"captureViews":8}`.
- `npm run check:ui-redesign-shell`: exit 0 with `{"status":"pass","shellClasses":5,"authClasses":3,"cssMarkers":8}`.
- `npm run check:ui-redesign-foundation`: exit 0 with `{"status":"pass","assetCount":36,"tokenCount":13,"classCount":8}`.
- `npm run check:ui-contracts`: exit 0 with `{"status":"pass","routes":21,"shellContracts":3,"evidenceArtifacts":47,"imageArtifacts":92}`.
- `npm run check:route-integrity`: exit 0 with `{"status":"pass","routes":21,"reactRoutes":21,"bridgeRoutes":0,"publicFallbackPages":21,"failures":[],"warnings":[]}`.
- `git diff --check`: exit 0.
- `npm run build`: exit 0. Existing Vite warnings about classic script tags remained.
- `node scripts/capture-ui-redesign-support-review.mjs http://127.0.0.1:5174`: exit 0 with 26 screenshots and summary status `pass`.

## Manual Interaction Evidence

- Navigation and route health:
  - Every smoke run checked 21 routes and passed 21 routes with no document-level horizontal overflow.
- Interactions:
  - `npm run check:browser-route-smoke -- --only-interaction "experiences create" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-experiences-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "news manual" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-news-manual-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "mobile news" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-mobile-news-summary.json`: exit 0 after the filter-wrap fix. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "community post" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-community-post-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 3, interactions passed 3.
  - `npm run check:browser-route-smoke -- --only-interaction "mobile community" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-mobile-community-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "messages thread" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-messages-thread-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 2, interactions passed 2.
  - `npm run check:browser-route-smoke -- --only-interaction "memory resource" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-memory-resource-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "network contact" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-network-contact-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "resume text" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-resume-text-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "jobs filter" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-jobs-filter-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "companies tier" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-companies-tier-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "library search" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-library-search-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "courses path" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-courses-path-summary.json`: exit 0 after the mobile learning path fix. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
  - `npm run check:browser-route-smoke -- --only-interaction "account profile" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-account-profile-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 2, interactions passed 2.
  - `npm run check:browser-route-smoke -- --only-interaction "settings language" --summary docs/browser-audit-screenshots/370-ui-redesign-part-4-browser-settings-language-summary.json`: exit 0. Routes checked 21, routes passed 21, interactions checked 1, interactions passed 1.
- Forms and filters:
  - Experiences create/edit, News manual entry and refresh, Community posting, Messages thread reply, Network add contact, Resume text save, Jobs filter, Companies tier filter, Library search, Courses source/path/note, Account profile, and Settings language flows remained functional.
- Persistence:
  - Courses source, note, path, and done state persisted after reload in smoke.
  - Account, settings, messages, resources, community, and resume flows persisted through their targeted smoke checks.
- Uploads or external links:
  - Account avatar and resume upload controls remain visible and reachable on mobile.
  - Library and Courses external/open-original affordances remain visible.
- Error, empty, loading, disabled states:
  - Empty states across Messages, Network, Memory, Jobs/Companies search, and Courses were checked visually.
  - Courses mobile empty state was corrected after review.
- Keyboard and focus:
  - Forms, selects, segmented filters, textarea inputs, and icon buttons stayed reachable by browser automation.

## Findings

- Accepted:
  - All remaining supporting routes now consume the Playful Precision support layer and share the upgraded shell, cards, typography, controls, and mascot accents.
  - Route ids and interaction contracts remain intact across all 21 routes.
  - Desktop and mobile screenshot evidence pass with no document-level horizontal overflow.
  - The implementation keeps business logic in place and scopes the redesign to page classes, CSS, and review tooling.
- Needs changes:
  - None for Part 4.
- Deferred:
  - A final cross-route integration sweep can validate all four redesign layers together before marking the full UI upgrade complete.

## Decision

Status: accepted
Next part allowed: yes
