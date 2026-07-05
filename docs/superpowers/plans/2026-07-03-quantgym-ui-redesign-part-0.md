# QuantGym UI Redesign Part 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish the Playful Precision asset, token, primitive CSS, and review foundation for the approved QuantGym UI redesign.

**Architecture:** Part 0 adds a repo-owned asset sync script, a dedicated foundation check, and a new React-imported CSS foundation file. It does not redesign route layouts yet; it prepares stable app-served assets, theme variables, and reusable primitive classes for later parts.

**Tech Stack:** Vite, React 19, vanilla CSS, Node.js check scripts, Python stdlib `zipfile` for asset extraction.

---

## Scope Check

This plan intentionally covers only Part 0 from the approved spec. The full redesign spans shell, auth, and 21 React routes, so later parts need separate implementation plans after Part 0 review is accepted.

## File Structure

- Create: `scripts/check-ui-redesign-foundation.mjs`
  - Validates Part 0 requirements: asset manifest, expected asset files, CSS tokens, CSS import, font link, and absence of `/tmp` references.
- Create: `scripts/sync-ui-redesign-assets.py`
  - Extracts selected assets from `UI 设计提升.zip` into `assets/generated/playful-precision/` and writes `assets/generated/playful-precision/manifest.json`.
- Create: `src/styles/playful-precision-tokens.css`
  - Defines light and dark Playful Precision tokens plus shared primitive classes.
- Modify: `package.json`
  - Adds `check:ui-redesign-foundation`.
- Modify: `src/main.jsx`
  - Imports `src/styles/playful-precision-tokens.css` before route overrides.
- Modify: `index.html`
  - Loads Plus Jakarta Sans and Space Grotesk.
- Create after verification: `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-0.md`
  - Records the actual Part 0 review evidence.

## Tasks

### Task 1: Add The Foundation Gate

**Files:**
- Create: `scripts/check-ui-redesign-foundation.mjs`
- Modify: `package.json`

- [ ] **Step 1: Add the failing foundation check**

Create `scripts/check-ui-redesign-foundation.mjs`:

```js
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const assetRoot = path.join(root, "assets", "generated", "playful-precision");
const manifestPath = path.join(assetRoot, "manifest.json");
const tokenPath = path.join(root, "src", "styles", "playful-precision-tokens.css");
const mainPath = path.join(root, "src", "main.jsx");
const indexPath = path.join(root, "index.html");

const requiredAssets = [
  "avatar-focused-v2.png",
  "avatar-happy-v2.png",
  "avatar-wink-v2.png",
  "avatar-wow-v2.png",
  "badge-gold.webp",
  "badge-level-1.webp",
  "badge-streak-7.webp",
  "badge-top-rank.webp",
  "brand-q-mark.webp",
  "brand-quantgym-logo.webp",
  "feature-learn.webp",
  "feature-practice.webp",
  "feature-quest.webp",
  "mascot-calculator-v2.png",
  "mascot-fire-v2.png",
  "mascot-hero-v5-clean.png",
  "mascot-interview.png",
  "mascot-laptop-v2.png",
  "mascot-levelup.png",
  "mascot-oops.png",
  "mascot-poker.png",
  "mascot-search.png",
  "mascot-sleep.png",
  "mascot-teacher-v2.png",
  "mascot-trophy-v2.png",
  "reward-crown.webp",
  "reward-dumbbell.webp",
  "reward-fire.webp",
  "reward-gem-small.webp",
  "reward-growth.webp",
  "reward-lightning.webp",
  "reward-medal-gold.webp",
  "reward-stopwatch.webp",
  "reward-target.webp",
  "reward-trophy.webp",
  "reward-xp.webp"
];

const requiredTokens = [
  "--qg-bg-base",
  "--qg-bg-grad",
  "--qg-surface",
  "--qg-surface-2",
  "--qg-border",
  "--qg-text",
  "--qg-muted",
  "--qg-brand",
  "--qg-brand-ink",
  "--qg-radius-panel",
  "--qg-shadow-card",
  "--qg-font-ui",
  "--qg-font-number"
];

const requiredClasses = [
  ".qg-panel",
  ".qg-button-primary",
  ".qg-button-secondary",
  ".qg-chip",
  ".qg-stat-card",
  ".qg-page-kicker",
  ".qg-empty-state",
  ".qg-skeleton"
];

const failures = [];

function rel(filePath) {
  return path.relative(root, filePath);
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

function readText(filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    failures.push(`missing file: ${rel(filePath)}`);
    return "";
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    failures.push(`invalid json: ${rel(filePath)} (${error.message})`);
    return null;
  }
}

expect(fs.existsSync(assetRoot), "missing Playful Precision asset directory");
const manifest = readJson(manifestPath);
if (manifest) {
  expect(manifest.sourceZip === "UI 设计提升.zip", "manifest sourceZip must be UI 设计提升.zip");
  expect(Array.isArray(manifest.assets), "manifest assets must be an array");
  expect((manifest.assets || []).length >= requiredAssets.length, "manifest must include required assets");
}

for (const asset of requiredAssets) {
  const target = path.join(assetRoot, asset);
  expect(fs.existsSync(target), `missing Playful Precision asset: ${asset}`);
  if (fs.existsSync(target)) {
    const size = fs.statSync(target).size;
    expect(size > 512, `asset is unexpectedly small: ${asset}`);
  }
}

const css = readText(tokenPath);
for (const token of requiredTokens) {
  expect(css.includes(token), `missing CSS token: ${token}`);
}
for (const className of requiredClasses) {
  expect(css.includes(className), `missing foundation class: ${className}`);
}
expect(css.includes('[data-qg-theme="dark"]'), "missing dark theme selector");
expect(css.includes("@media (prefers-reduced-motion: reduce)"), "missing reduced-motion styles");
const temporaryPathMarker = ["/", "tmp", "/"].join("");
expect(!css.includes(temporaryPathMarker), "CSS must not reference temporary paths");

const main = readText(mainPath);
expect(
  main.includes('import "./styles/playful-precision-tokens.css";'),
  "src/main.jsx must import playful-precision-tokens.css"
);

const index = readText(indexPath);
expect(index.includes("Plus+Jakarta+Sans"), "index.html must load Plus Jakarta Sans");
expect(index.includes("Space+Grotesk"), "index.html must load Space Grotesk");

if (failures.length) {
  console.error("ui redesign foundation check failed");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(JSON.stringify({
  status: "pass",
  assetCount: requiredAssets.length,
  tokenCount: requiredTokens.length,
  classCount: requiredClasses.length
}, null, 2));
```

Add this script to `package.json` under `scripts` after `check:ui-contracts`:

```json
"check:ui-redesign-foundation": "node scripts/check-ui-redesign-foundation.mjs"
```

- [ ] **Step 2: Run the check and verify it fails for the right reason**

Run:

```bash
npm run check:ui-redesign-foundation
```

Expected: FAIL. The failure must mention missing files such as `assets/generated/playful-precision/manifest.json` and `src/styles/playful-precision-tokens.css`. If it passes, the check is not proving Part 0.

### Task 2: Add The Asset Sync Script And Generate Assets

**Files:**
- Create: `scripts/sync-ui-redesign-assets.py`
- Create: files under `assets/generated/playful-precision/`

- [ ] **Step 1: Add the asset sync script**

Create `scripts/sync-ui-redesign-assets.py`:

```python
#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "UI 设计提升.zip"
DEST_DIR = ROOT / "assets" / "generated" / "playful-precision"

ASSETS = {
    "assets/avatar-focused-v2.png": "avatar-focused-v2.png",
    "assets/avatar-happy-v2.png": "avatar-happy-v2.png",
    "assets/avatar-wink-v2.png": "avatar-wink-v2.png",
    "assets/avatar-wow-v2.png": "avatar-wow-v2.png",
    "assets/badge-gold.webp": "badge-gold.webp",
    "assets/badge-level-1.webp": "badge-level-1.webp",
    "assets/badge-streak-7.webp": "badge-streak-7.webp",
    "assets/badge-top-rank.webp": "badge-top-rank.webp",
    "assets/brand-q-mark.webp": "brand-q-mark.webp",
    "assets/brand-quantgym-logo.webp": "brand-quantgym-logo.webp",
    "assets/feature-learn.webp": "feature-learn.webp",
    "assets/feature-practice.webp": "feature-practice.webp",
    "assets/feature-quest.webp": "feature-quest.webp",
    "assets/mascot-calculator-v2.png": "mascot-calculator-v2.png",
    "assets/mascot-fire-v2.png": "mascot-fire-v2.png",
    "assets/mascot-hero-v5-clean.png": "mascot-hero-v5-clean.png",
    "assets/mascot-interview.png": "mascot-interview.png",
    "assets/mascot-laptop-v2.png": "mascot-laptop-v2.png",
    "assets/mascot-levelup.png": "mascot-levelup.png",
    "assets/mascot-oops.png": "mascot-oops.png",
    "assets/mascot-poker.png": "mascot-poker.png",
    "assets/mascot-search.png": "mascot-search.png",
    "assets/mascot-sleep.png": "mascot-sleep.png",
    "assets/mascot-teacher-v2.png": "mascot-teacher-v2.png",
    "assets/mascot-trophy-v2.png": "mascot-trophy-v2.png",
    "assets/reward-crown.webp": "reward-crown.webp",
    "assets/reward-dumbbell.webp": "reward-dumbbell.webp",
    "assets/reward-fire.webp": "reward-fire.webp",
    "assets/reward-gem-small.webp": "reward-gem-small.webp",
    "assets/reward-growth.webp": "reward-growth.webp",
    "assets/reward-lightning.webp": "reward-lightning.webp",
    "assets/reward-medal-gold.webp": "reward-medal-gold.webp",
    "assets/reward-stopwatch.webp": "reward-stopwatch.webp",
    "assets/reward-target.webp": "reward-target.webp",
    "assets/reward-trophy.webp": "reward-trophy.webp",
    "assets/reward-xp.webp": "reward-xp.webp",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    if not ZIP_PATH.exists():
        print(f"missing source zip: {ZIP_PATH}", file=sys.stderr)
        return 1

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    manifest_assets = []
    with ZipFile(ZIP_PATH) as archive:
        names = set(archive.namelist())
        missing = sorted(src for src in ASSETS if src not in names)
        if missing:
            print("source zip is missing expected assets:", file=sys.stderr)
            for src in missing:
                print(f"- {src}", file=sys.stderr)
            return 1

        for src, dest_name in sorted(ASSETS.items(), key=lambda item: item[1]):
            data = archive.read(src)
            dest = DEST_DIR / dest_name
            dest.write_bytes(data)
            manifest_assets.append({
                "source": src,
                "dest": f"assets/generated/playful-precision/{dest_name}",
                "bytes": len(data),
                "sha256": sha256_bytes(data),
            })

    manifest = {
        "sourceZip": "UI 设计提升.zip",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "assetCount": len(manifest_assets),
        "assets": manifest_assets,
    }
    (DEST_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "status": "ok",
        "dest": "assets/generated/playful-precision",
        "assetCount": len(manifest_assets),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
```

- [ ] **Step 2: Run the asset sync script**

Run:

```bash
python3 scripts/sync-ui-redesign-assets.py
```

Expected: PASS with JSON containing `"status": "ok"` and `"assetCount": 36`.

- [ ] **Step 3: Confirm generated assets are not empty**

Run:

```bash
find assets/generated/playful-precision -maxdepth 1 -type f | sort | wc -l
```

Expected: `37` files, meaning 36 assets plus `manifest.json`.

### Task 3: Add Playful Precision Tokens And Primitives

**Files:**
- Create: `src/styles/playful-precision-tokens.css`
- Modify: `src/main.jsx`
- Modify: `index.html`

- [ ] **Step 1: Add the foundation CSS**

Create `src/styles/playful-precision-tokens.css`:

```css
:root {
  color-scheme: light;
  --qg-bg-base: #f4f4fb;
  --qg-bg-grad: radial-gradient(1100px 560px at 12% -10%, #ecebff 0%, transparent 55%), radial-gradient(900px 520px at 102% -4%, #e9f0ff 0%, transparent 52%), linear-gradient(180deg, #f6f6fc 0%, #f3f3fa 60%, #f1f1f8 100%);
  --qg-surface: #ffffff;
  --qg-surface-2: #fbfbfd;
  --qg-surface-3: #faf9ff;
  --qg-border: #ecebf7;
  --qg-border-2: #e8e7f4;
  --qg-text: #1b1a38;
  --qg-text-2: #4a4966;
  --qg-muted: #6d6c8e;
  --qg-muted-2: #9998b6;
  --qg-track: #eeedfa;
  --qg-brand: #5b5ff5;
  --qg-brand-ink: #5b5ff5;
  --qg-brand-soft: #eef0ff;
  --qg-brand-soft-2: #f6f0ff;
  --qg-success: #16a06a;
  --qg-warning: #ff9f2e;
  --qg-danger: #d0524b;
  --qg-radius-control: 14px;
  --qg-radius-panel: 22px;
  --qg-radius-hero: 28px;
  --qg-shadow-card: 0 1px 2px rgba(27, 26, 56, 0.05), 0 14px 30px -22px rgba(74, 67, 214, 0.35);
  --qg-shadow-pop: 0 14px 30px -12px rgba(27, 26, 56, 0.35);
  --qg-font-ui: "Plus Jakarta Sans", "PingFang SC", "HarmonyOS Sans SC", "Microsoft YaHei", "Noto Sans SC", system-ui, sans-serif;
  --qg-font-number: "Space Grotesk", "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --qg-asset-brand-mark: url("/assets/generated/playful-precision/brand-q-mark.webp");
}

:root[data-qg-theme="dark"],
[data-qg-theme="dark"] {
  color-scheme: dark;
  --qg-bg-base: #111020;
  --qg-bg-grad: radial-gradient(1100px 560px at 12% -10%, #241f45 0%, transparent 55%), radial-gradient(900px 520px at 102% -4%, #1a2247 0%, transparent 52%), linear-gradient(180deg, #121120 0%, #131221 60%, #151327 100%);
  --qg-surface: #201f39;
  --qg-surface-2: #1b1a30;
  --qg-surface-3: #242243;
  --qg-border: #332f57;
  --qg-border-2: #3a3763;
  --qg-text: #f1f0fb;
  --qg-text-2: #cbc9e8;
  --qg-muted: #a6a4cf;
  --qg-muted-2: #8785ae;
  --qg-track: #2c2a4e;
  --qg-brand: #7d7bff;
  --qg-brand-ink: #b9b8ff;
  --qg-brand-soft: #2a2856;
  --qg-brand-soft-2: #2c2650;
  --qg-shadow-card: 0 1px 2px rgba(0, 0, 0, 0.35), 0 14px 30px -22px rgba(0, 0, 0, 0.6);
  --qg-shadow-pop: 0 16px 34px -14px rgba(0, 0, 0, 0.65);
}

.qg-theme-root {
  background: var(--qg-bg-grad);
  color: var(--qg-text);
  font-family: var(--qg-font-ui);
  font-variant-numeric: tabular-nums;
}

.qg-panel {
  border: 1px solid var(--qg-border);
  border-radius: var(--qg-radius-panel);
  background: var(--qg-surface);
  box-shadow: var(--qg-shadow-card);
}

.qg-panel-soft {
  border: 1px solid var(--qg-border);
  border-radius: var(--qg-radius-panel);
  background: var(--qg-surface-2);
}

.qg-button-primary,
.qg-button-secondary,
.qg-icon-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  min-height: 44px;
  border-radius: var(--qg-radius-control);
  font-family: var(--qg-font-ui);
  font-weight: 800;
  line-height: 1;
  transition: transform 160ms ease, box-shadow 160ms ease, border-color 160ms ease, background 160ms ease, color 160ms ease;
}

.qg-button-primary {
  border: 0;
  background: linear-gradient(180deg, #6d70f8, var(--qg-brand));
  color: #ffffff;
  box-shadow: 0 4px 0 #3f39c9, 0 14px 24px -10px rgba(91, 95, 245, 0.65);
}

.qg-button-secondary {
  border: 1.5px solid var(--qg-border-2);
  background: var(--qg-surface);
  color: var(--qg-brand-ink);
  box-shadow: 0 3px 0 var(--qg-border);
}

.qg-button-primary:active,
.qg-button-secondary:active,
.qg-icon-button:active {
  transform: translateY(2px);
}

.qg-icon-button {
  width: 44px;
  padding: 0;
  border: 1px solid var(--qg-border-2);
  background: var(--qg-surface);
  color: var(--qg-muted);
}

.qg-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 32px;
  padding: 6px 12px;
  border: 1px solid var(--qg-border);
  border-radius: 999px;
  background: color-mix(in srgb, var(--qg-surface) 78%, transparent);
  color: var(--qg-muted);
  font-size: 12px;
  font-weight: 800;
}

.qg-stat-card {
  display: grid;
  gap: 6px;
  padding: 16px;
  border: 1px solid var(--qg-border);
  border-radius: 18px;
  background: var(--qg-surface);
  box-shadow: var(--qg-shadow-card);
}

.qg-stat-card strong,
.qg-number {
  font-family: var(--qg-font-number);
  font-weight: 700;
  letter-spacing: 0;
}

.qg-page-kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 5px 11px;
  border-radius: 999px;
  background: var(--qg-brand-soft);
  color: var(--qg-brand-ink);
  font-size: 11.5px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.qg-empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: clamp(28px, 6vw, 56px);
  text-align: center;
  color: var(--qg-muted);
}

.qg-empty-state img {
  width: clamp(88px, 18vw, 132px);
  height: auto;
  object-fit: contain;
  filter: drop-shadow(0 14px 20px rgba(74, 67, 214, 0.2));
}

.qg-skeleton {
  position: relative;
  overflow: hidden;
  border-radius: var(--qg-radius-control);
  background: var(--qg-track);
}

.qg-skeleton::after {
  content: "";
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--qg-surface) 76%, transparent), transparent);
  animation: qg-skeleton-sweep 1.35s ease-in-out infinite;
}

@keyframes qg-skeleton-sweep {
  to {
    transform: translateX(100%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .qg-button-primary,
  .qg-button-secondary,
  .qg-icon-button,
  .qg-skeleton::after {
    animation: none !important;
    transition-duration: 1ms !important;
  }
}
```

- [ ] **Step 2: Import the foundation CSS**

Update the top of `src/main.jsx` to:

```js
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/playful-precision-tokens.css";
import "./styles/react-route-overrides.css";
```

- [ ] **Step 3: Update font loading in `index.html`**

Replace the two current Google Font stylesheet links with:

```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap">
```

Keep the existing `preconnect` links, scripts, meta tags, and root stylesheet link unchanged.

### Task 4: Verify The Foundation Gate Turns Green

**Files:**
- Read: `scripts/check-ui-redesign-foundation.mjs`
- Read: `assets/generated/playful-precision/manifest.json`
- Read: `src/styles/playful-precision-tokens.css`

- [ ] **Step 1: Run the foundation check**

Run:

```bash
npm run check:ui-redesign-foundation
```

Expected: PASS with JSON containing `"status": "pass"`, `"assetCount": 36`, `"tokenCount": 13`, and `"classCount": 8`.

- [ ] **Step 2: Run general static whitespace validation**

Run:

```bash
git diff --check
```

Expected: exit 0 with no output.

- [ ] **Step 3: Run the production build**

Run:

```bash
npm run build
```

Expected: exit 0. Existing build warnings about classic script tags or chunk size may remain if they already exist; new missing asset or CSS import errors are not acceptable.

### Task 5: Create The Part 0 Review Record

**Files:**
- Create: `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-0.md`

- [ ] **Step 1: Create the reviews directory**

Run:

```bash
mkdir -p docs/superpowers/reviews
```

- [ ] **Step 2: Write the review record using actual command output**

Create `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-0.md` with this structure, replacing each evidence line with the exact result observed during this implementation run:

```md
# QuantGym UI Redesign Part 0 Review

Date: 2026-07-03
Part: Part 0, Assets, Tokens, And UI Foundation
Reviewer: Codex
Status: in review

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

- `npm run check:ui-redesign-foundation`: record the exit code and summary JSON
- `git diff --check`: record the exit code
- `npm run build`: record the exit code and any warnings

## Manual Interaction Evidence

- Navigation: not changed in Part 0
- Forms and filters: not changed in Part 0
- Persistence: not changed in Part 0
- Uploads or external links: not changed in Part 0
- Error, empty, loading, disabled states: primitive classes created for later route work
- Keyboard and focus: button and icon button primitives preserve focusability through native elements

## Findings

- Accepted: record accepted foundation items
- Needs changes: record any failed or weak evidence
- Deferred: visual route screenshots move to Part 1 when shell consumes the foundation

## Decision

Status: accepted or needs changes
Next part allowed: yes or no
```

- [ ] **Step 3: Decide Part 0 review state**

If every automated command passed, set:

```md
Status: accepted
Next part allowed: yes
```

If any command failed or evidence is missing, set:

```md
Status: needs changes
Next part allowed: no
```

### Task 6: Final Part 0 Self-Review

**Files:**
- Read: all files changed in this plan

- [ ] **Step 1: Verify plan coverage**

Check that Part 0 deliverables from the design spec are covered:

```text
stable asset copy from zip: covered by scripts/sync-ui-redesign-assets.py
old-to-new token route: covered by src/styles/playful-precision-tokens.css and review record
light and dark theme variables: covered by src/styles/playful-precision-tokens.css
shared primitive classes: covered by src/styles/playful-precision-tokens.css
```

- [ ] **Step 2: Verify no local temporary paths ship**

Run:

```bash
rg -n "/tmp/|quantgym-ui-design-sanitized" assets/generated/playful-precision src/styles/playful-precision-tokens.css scripts/sync-ui-redesign-assets.py scripts/check-ui-redesign-foundation.mjs || true
```

Expected: no matches.

- [ ] **Step 3: Commit Part 0 only after review is accepted**

Do not commit user-provided untracked files such as `UI 设计提升.zip` or `assets 2/` unless the user explicitly asks.

When Part 0 review is accepted, stage only Part 0 files:

```bash
git add package.json index.html src/main.jsx src/styles/playful-precision-tokens.css scripts/check-ui-redesign-foundation.mjs scripts/sync-ui-redesign-assets.py assets/generated/playful-precision docs/superpowers/specs docs/superpowers/plans/2026-07-03-quantgym-ui-redesign-part-0.md docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-0.md
```

Commit message:

```bash
git commit -m "chore: add Playful Precision UI foundation"
```

## Self-Review

Spec coverage:

- Part 0 asset extraction is covered by Task 2.
- Part 0 tokens and primitives are covered by Task 3.
- Part 0 review gate is covered by Tasks 4 and 5.
- Part 0 no-temporary-path and no-user-file staging constraints are covered by Task 6.

Placeholder scan:

- This plan avoids unresolved placeholder markers and names exact files, commands, and expected outputs.

Type consistency:

- The foundation check expects `manifest.json` with `sourceZip` and `assets`, which is exactly what `scripts/sync-ui-redesign-assets.py` writes.
- The CSS import expected by the foundation check matches the import added to `src/main.jsx`.
