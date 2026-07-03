# QuantGym UI Redesign Part 0 Review

Date: 2026-07-03
Part: Part 0, Assets, Tokens, And UI Foundation
Reviewer: Codex
Status: accepted

## Scope Reviewed

- Routes or surfaces: global foundation only
- Files changed:
  - `package.json`
  - `index.html`
  - `src/main.jsx`
  - `src/styles/playful-precision-tokens.css`
  - `scripts/check-ui-redesign-foundation.mjs`
  - `scripts/sync-ui-redesign-assets.py`
  - `assets/generated/playful-precision/`
  - `docs/superpowers/specs/`
  - `docs/superpowers/plans/2026-07-03-quantgym-ui-redesign-part-0.md`
- Zip references used:
  - `UI 设计提升.zip`
  - `README.md`
  - Playful Precision asset set

## Visual Evidence

- Desktop screenshots: not captured in Part 0 because route layout is not replaced yet
- Mobile screenshots: not captured in Part 0 because route layout is not replaced yet
- Dark theme screenshots: not captured in Part 0 because theme controls are introduced in Part 1
- Notes on mismatches: Part 0 prepares assets and tokens only

## Automated Evidence

- Baseline `npm run build` before Part 0 edits: exit 0. Existing Vite warnings remained limited to classic script tags for `config.js`, `data/library-catalog.js?v=1`, and `data/leetcode-hot-100.js?v=2`.
- Red check `npm run check:ui-redesign-foundation`: exit 1 before implementation. Failure included missing `assets/generated/playful-precision/manifest.json`, missing `src/styles/playful-precision-tokens.css`, missing Playful Precision assets, missing CSS tokens, missing import, and missing Plus Jakarta Sans.
- Asset sync `python3 scripts/sync-ui-redesign-assets.py`: exit 0 with `{"status": "ok", "dest": "assets/generated/playful-precision", "assetCount": 36}`.
- Asset count `find assets/generated/playful-precision -maxdepth 1 -type f | sort | wc -l`: `37`, meaning 36 assets plus `manifest.json`.
- Empty asset check `find assets/generated/playful-precision -maxdepth 1 -type f -size -513c -print`: exit 0 with no output.
- Green check `npm run check:ui-redesign-foundation`: exit 0 with `{"status":"pass","assetCount":36,"tokenCount":13,"classCount":8}`.
- `git diff --check`: exit 0 with no output.
- Tail whitespace scan for changed Part 0 files: exit 0 with no output.
- Temporary local path scan for generated assets, token CSS, and scripts: exit 0 with no output after removing the script literal that caused a self-check false positive.
- Final `npm run build`: exit 0. Existing Vite warnings remained limited to classic script tags for `config.js`, `data/library-catalog.js?v=1`, and `data/leetcode-hot-100.js?v=2`.
- `npm run check:ui-contracts`: exit 0 with `{"status":"pass","routes":21,"shellContracts":3,"evidenceArtifacts":47,"imageArtifacts":92}`.
- `npm run check:route-integrity`: exit 0 with `{"status":"pass","routes":21,"reactRoutes":21,"bridgeRoutes":0,"publicFallbackPages":21,"failures":[],"warnings":[]}`.

## Manual Interaction Evidence

- Navigation: not changed in Part 0
- Forms and filters: not changed in Part 0
- Persistence: not changed in Part 0
- Uploads or external links: not changed in Part 0
- Error, empty, loading, disabled states: primitive classes created for later route work
- Keyboard and focus: button and icon button primitives preserve focusability through native elements

## Findings

- Accepted: Playful Precision source assets are copied into a stable app asset directory with source paths, byte counts, and sha256 values recorded in `manifest.json`.
- Accepted: The app now has global Playful Precision tokens for light and dark themes, typography, brand color, surfaces, shadows, controls, status colors, and a stable brand mark asset URL.
- Accepted: Foundation primitives exist for panels, buttons, chips, stat cards, page kickers, empty states, and loading skeletons.
- Accepted: `src/main.jsx` imports the token CSS before route overrides, preserving the current override layer while allowing later page rewrites to consume the new foundation.
- Accepted: `index.html` loads Plus Jakarta Sans and Space Grotesk as required by the approved design direction.
- Needs changes: none for Part 0.
- Deferred: visual route screenshots move to Part 1 when the app shell consumes the foundation.

## Decision

Status: accepted
Next part allowed: yes
