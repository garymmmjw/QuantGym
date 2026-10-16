# QuantVault Learn — local preview

This standalone preview reads the saved QuantVault course library and already downloaded questions. It does not use the source site's login session or send learning progress, issue reports, or analytics to QuantVault.

## Run

On macOS, double-click `启动独立展示.command`. It opens an existing local preview if one is already running, or starts the preview bound only to `127.0.0.1:4174`. Keep its terminal window open while using the preview; Control-C stops it. This launcher does not deploy anything.

From this directory:

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 4174 --strictPort
```

Open `http://127.0.0.1:4174/` for Learn, `http://127.0.0.1:4174/?view=training` for the persistent personal training system, or `http://127.0.0.1:4174/?view=training&profile=demo` for an isolated sample profile. Dashboard opens training. The previous independent scoring lab remains at `?view=assessment`.

The complete answer → ability → module progress → one-time XP → readiness workflow and its product rules are documented in [TRAINING-SYSTEM.md](TRAINING-SYSTEM.md). The training system uses stable v2 with an explicit v1 fallback, self-assessed question results, local persistence, JSON export/import and recoverable resets. Personal Learn XP is aggregated into growth level without being re-awarded or converted into ability evidence. [SCORING-AUDIT.md](SCORING-AUDIT.md) distinguishes captured source rules, intentional local policies and unverified behavior, with file and function evidence.

Training preferences expose the source's four target levels and role-specific module order. A separate local calibration editor accepts topic, authored difficulty and a score from 0 to 1. Saving replaces the calibration batch; it never copies ordinary training into calibration or awards question progress/XP. The source-confirmed onboarding equation is used, but the manual editor is a local addition: the original assessment's selection and grading flow was not captured.

The development server's preparation step reads existing captures from `../captures/learn-2026-10-15` and the exported course library at `../data/learn-2026-10-15/library.json`. It makes no requests to QuantVault. Re-run `npm run sync:content` after additional course content has been captured and exported, then reload the preview.

## Preview scope

- Both course tracks and all 99 lessons across 18 topics: 3,000 slides, 805 formula cards, 209 chapter quiz cards, 660 embedded quizzes, and all 9 referenced images.
- Original locally adapted slide renderer, formulas, contents, keyboard navigation, swipes, quizzes, diagrams and interactive widgets.
- Chapter compare-card quizzes with answers, explanations, scoring and retry.
- Learning position, completion, XP and notes saved only in this browser's local storage. A separate immutable award ledger prevents completion toggles and retries from earning the same reward repeatedly.
- Original Practice links for all 39 source-linked lessons, preserving all 551 question references and their order. Questions resolve through internal source IDs to display IDs and the existing local question export; missing questions remain visible. One stale source ID (744) has no current catalogue match and is explicitly labelled instead of guessed. The original playlist is available only through an explicit external link.
- Code exercises preserve the editor, reset, reference solution and source tests. Python runs in an independent browser Worker using a locally served Pyodide runtime. Exact and numeric tolerance judges use the captured source tests and tolerance settings. The UI terminates a worker after 30 seconds if execution hangs.
- Independent scoring lab with all 17 topic ratings, four target roles, the observed readiness formula and 75% Offer Bar, all 11 problem modules containing 554 unique source-selected problems, and simulated correct/incorrect answers. Ratings and completion inputs are explicitly demonstration data, stored separately from real local Learn progress. The untouched scenario starts from the source prior; the example button loads invented values.
- Local question pages preserve prompts, hints, full solutions and companies, and now record self-assessed correct, incorrect, partial and revealed outcomes. The 30-day ability ledger and permanent XP ledger are separate. Both the quick recorder and the question page use the same domain.
- Navigation beyond local training, questions, Learn and the scoring lab is labelled as an external source website link. It is never opened automatically.

The standalone preview's copied content and assets are generated under `public/private/`, which is ignored by Git. Its standalone build includes private course content and is not the QuantGym deployment artifact.

## QuantGym embedded deployment

The main application's build now invokes `scripts/build-learn-embed.mjs` from the repository root and places the reader at `dist/learn-embed/`. It uses root dependencies and the explicit code/style/icon snapshot in `renderer-assets/`; it requires no source account, private captures, private exports, or nested `node_modules`. Publish only the main `dist/` output. The independent preview workflow above remains separate.

After deliberately changing a captured renderer adaptation, run the standalone `npm run sync:content`, then run `node scripts/prepare-learn-renderer.mjs` from the repository root to refresh the reviewed renderer snapshot. The preparation script copies only the 22 allowlisted generic assets. Preserve their source attribution and adaptation comments.

The embedded build excludes course media and every content JSON file. Course illustrations are delivered as inline data images inside the authenticated VIP library response. Python's dependency lock is the only JSON allowed in the embedded static output. The parent supplies course and practice data after checking account membership; progress remains isolated by account in the current browser.

Run `node --test scripts/test-learn-production-build.mjs scripts/test-static-catalog-privacy.mjs` from the repository root to verify the publication boundary and a content-free isolated checkout build. The standalone source-comparison tests below intentionally require the private local captures and are not production build dependencies.

## Adaptation boundaries

`scripts/sync-local-content.mjs` derives local renderers from browser-observed source assets. It removes authentication calls, source analytics, remote issue reporting, source problem requests and the original code worker. The source stylesheet/font dependencies are local: Inter and JetBrains Mono from their official fontsource packages, and KaTeX's matching 0.16.9 font files. There are no hotlinked assets.

The original site's Python runner could not be captured. The replacement uses the official npm Pyodide 314.0.7 package following its [browser-worker documentation](https://pyodide.org/en/stable/usage/webworker.html). It executes Python's standard library and JSON-compatible functions in the browser, without a host shell or Python service. Extra packages are not downloaded automatically. Unsupported languages, judge modes, missing tests and non-JSON return values fail visibly instead of producing a false pass. The exercise's source tests, including captured hidden tests, remain available in this personal local copy.

The HTML content policy restricts resource requests to this preview origin. Markdown is sanitized, including removal of active HTML. The captured lesson data itself is preserved verbatim in the local library.

The source's progress UI is reproduced using a separate local profile; it does not imply that the real QuantVault account has earned those points or completed those lessons.

The verified scoring implementation and mathematical boundaries are documented in [src/scoring/RULES.md](src/scoring/RULES.md). The scenario editor intentionally selects the source v1 calculation with captured fitted difficulty parameters and explicit editable state. Missing fitted values use the original authored-difficulty fallback, and the selected problem's fit/fallback status is shown in the UI. It does not claim to reproduce private account state, first-attempt gates, or the source's current v1/v2 rollout score. Module completion, topic ratings, readiness and learning XP are distinct measures. The Offer Bar is a fixed target at 75%, not an offer probability.

The persistent training system is separate from that scenario editor. It implements the source's 30-day attempt freeze/replacement, three-decimal partial-credit storage before the v2 hint multiplier, evidence thresholds and role/company/topic relevance calculation. Its fixed-v2 choice intentionally bypasses the captured date-based rollout. Showing “未评估” when no topic reaches the evidence threshold, choosing downloaded recommendation candidates, manual scoring, backup rules and counting only training submissions toward a UTC streak are local product policies. The 2026-10-16 [REA recheck](../rea-research/recheck-2026-10-16/recheck-summary.json) analyzed the saved 2026-10-15 source snapshot; it does not verify the current live backend or account scores.

Local level progression uses the observed rule: 100 XP per level until 1,000 total XP, then 250 XP per level. All 99 local lessons can earn their reward once. This intentionally omits the captured source script's outdated 60-lesson award cap. Cancelling completion does not remove the award ledger, and legacy preview completion records are migrated without awarding XP again.

The source automatically settles a lesson on its final content/code slide, and settles a final quiz after the answer. This once-per-lesson behavior is retained. Passing an exercise after settlement therefore cannot add another reward. Local feedback says “Correct!” or “All tests passed!”; the accuracy chip describes practice accuracy, while the completion card is the authoritative XP receipt. This avoids the source's misleading “+5 XP” message after a reward was already settled.

The local mobile toolbar intentionally improves a source layout defect: Previous, Next, Contents and Formulas remain visible as 44-pixel touch targets at small screen widths.

The copied stylesheet's cross-document View Transition opt-in is removed locally because the embedded preview browser rejects it. Links use normal page navigation; course content and interactions are unchanged.

## Verification

```sh
npm run check:local
npm test
npm run build
```

The captured 51 Python reference solutions passed all their source tests in the real browser worker (`qa/python-reference-results.json`). The infinite-loop timeout and fresh-worker recovery both passed (`qa/python-timeout-results.json`). The chapter quiz was also exercised through all 8 cards, with 3/8 producing the observed 38% score and 50 XP reward (`qa/chapter-quiz-check.json`). Browser interaction and desktop/mobile visual checks are documented separately in `design-qa.md`. A successful build alone is not visual verification.
