# QuantGym Hidden Controls Restoration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore the six hidden Problems and Companies journeys inside the current Playful Precision UI, then finish the fully passing 69-interaction Phase 0 core-flow baseline.

**Architecture:** Restore only the entry layer. Problems receives a compact discovery band plus one detail action dock; Companies re-exposes its existing tier filter in the current header. Existing hooks, services, state, routes, persistence, data, and handoff controllers remain authoritative. The active Task 5 smoke/build work stays unstaged during product Tasks 1-3 and is owned by Task 4.

**Tech Stack:** React 19 JSX, scoped native CSS, Playful Precision semantic tokens, Node.js 20.20.2, built-in `node:test`, Playwright Core 1.61.0, installed Google Chrome.

## Global Constraints

- Approved design: `docs/superpowers/specs/2026-07-11-quantgym-hidden-controls-restoration-design.md`.
- Preserve brand purple `#5b5ff5`, dark brand `#7d7bff`, current light/dark themes, Plus Jakarta Sans, Space Grotesk, and existing routes.
- Use only existing Playful Precision semantic tokens and the existing radius hierarchy.
- Restore entry points only; do not change APIs, state shape, storage keys, controllers, route IDs, assets, or data models.
- Do not add a drawer, modal, mascot, hero, new design system, or another primary accent.
- Do not expose duplicate Complete, Save, Mock Interview, or tier-filter controls.
- Mobile controls must be at least 44 px tall and must not create page-level horizontal overflow.
- Reduced motion, focus-visible, keyboard operation, light/dark contrast, and current interaction names are mandatory.
- Existing Task 5 work in `scripts/build-static-site.mjs`, `scripts/check-browser-route-smoke.mjs`, `src/modules/ownership.js`, `scripts/lib/browser-route-targets.mjs`, `tests/browser-route-targets.test.mjs`, `tests/build-static-site-isolation.test.mjs`, and the `370` summary belongs to Task 4. Tasks 1-3 must not stage or discard it.
- Do not stage `.superpowers/`, generated full-resolution screenshots, the source ZIP, `assets 2/`, or any user-owned source-workspace files.

---

## File Structure

```text
tests/frontend-restored-controls.test.mjs
  Independent static contract for restored visibility, semantics, and duplicate-action prevention.

src/features/companies/CompaniesPageContent.jsx
  Existing tier-filter markup and semantics.

src/styles/playful-precision-replica-support-b.css
  Companies desktop/mobile tier-filter presentation.

src/features/problems/ProblemsPageContent.jsx
  Existing collection, view-mode, ranking, list/detail composition.

src/features/problems/ProblemChromePanels.jsx
  Collection and Hot 100 control semantics.

src/features/problems/ProblemDetail.jsx
  Detail utility row and single action dock.

src/styles/playful-precision-replica-training.css
  Problems discovery band, utility row, action dock, responsive and reduced-motion rules.

scripts/check-browser-route-smoke.mjs
  Current-UI selectors and all 69 core-flow interactions. Already contains unstaged Task 5 rebaseline work.

docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
  Passing Task 5 evidence generated only after the complete canonical run.
```

---

### Task 1: Restore Companies Tier Filtering

**Files:**

- Create: `tests/frontend-restored-controls.test.mjs`
- Modify: `src/features/companies/CompaniesPageContent.jsx:189-203`
- Modify: `src/styles/playful-precision-replica-support-b.css:516-583,1016-1052`

**Interfaces:**

- Consumes: `model.tierFilter: "all" | "s" | "a" | "b"` and `model.setTierFilter(tier)` from the existing Companies model.
- Produces: visible `#companyTierFilter` with four `[data-company-tier]` buttons, `role="group"`, button `aria-pressed`, 44 px mobile targets, and unchanged tier persistence.

- [ ] **Step 1: Write the failing Companies restoration contract**

Create `tests/frontend-restored-controls.test.mjs`:

```js
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");

function ruleBodies(css, selector) {
  return [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, selectorList]) => selectorList.includes(selector))
    .map(([, , declarations]) => declarations);
}

function lastRuleBody(css, selector) {
  const bodies = ruleBodies(css, selector);
  assert.ok(bodies.length > 0, `missing CSS selector: ${selector}`);
  return bodies.at(-1);
}

test("restores Companies tier filtering with button-group semantics", () => {
  const source = read("src/features/companies/CompaniesPageContent.jsx");
  const css = read("src/styles/playful-precision-replica-support-b.css");
  assert.match(source, /id="companyTierFilter" className="segmented" role="group"/);
  assert.match(source, /data-company-tier=\{tier\}/);
  assert.match(source, /aria-pressed=\{model\.tierFilter === tier\}/);
  assert.doesNotMatch(source, /aria-selected=\{model\.tierFilter === tier\}/);
  const filterRule = lastRuleBody(css, ".qg-companies-page #companyTierFilter");
  assert.doesNotMatch(filterRule, /display\s*:\s*none/);
  assert.match(filterRule, /display\s*:\s*grid/);
  assert.match(css, /#companyTierFilter \.segment[\s\S]*?min-height\s*:\s*44px/);
  assert.match(css, /#companyTierFilter \.segment:focus-visible/);
  assert.match(css, /@media \(max-width: 560px\)[\s\S]*?#companyTierFilter[\s\S]*?repeat\(4, minmax\(0, 1fr\)\)/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
node --test tests/frontend-restored-controls.test.mjs
```

Expected: FAIL because the container is still `role="tablist"`, buttons still expose `aria-selected`, and the scoped CSS rule uses `display: none !important`.

- [ ] **Step 3: Correct Companies semantics**

Change the filter markup in `CompaniesPageContent.jsx` to:

```jsx
<div
  id="companyTierFilter"
  className="segmented"
  role="group"
  aria-label={model.t("companyTierFilterAria")}
>
  {TIERS.map((tier) => (
    <button
      key={tier}
      className={`segment${model.tierFilter === tier ? " active" : ""}`}
      type="button"
      data-company-tier={tier}
      aria-pressed={model.tierFilter === tier}
      onClick={() => model.setTierFilter(tier)}
    >
      {tier === "all" ? model.t("allCompanies") : `Tier ${tier.toUpperCase()}`}
    </button>
  ))}
</div>
```

- [ ] **Step 4: Replace the hiding rule with scoped tier-filter styling**

Replace the `display: none !important` block with:

```css
body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter {
  display: grid;
  grid-template-columns: repeat(4, minmax(max-content, 1fr));
  gap: 6px;
  align-self: flex-end;
  padding: 5px;
  border: 1px solid var(--qg-border);
  border-radius: 14px;
  background: var(--qg-surface-2);
}

body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter .segment {
  min-height: 44px;
  padding: 8px 13px;
  border: 0;
  border-radius: 11px;
  background: transparent;
  color: var(--qg-muted);
  font: inherit;
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter .segment.active {
  background: var(--qg-brand-soft);
  color: var(--qg-brand-ink);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--qg-brand) 24%, transparent);
}

body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter .segment:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--qg-brand) 62%, transparent);
  outline-offset: 2px;
}
```

Inside the existing `@media (max-width: 560px)` block add:

```css
body.is-authenticated .app-route-root .qg-companies-page .companies-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: stretch;
}

body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter {
  width: 100%;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

body.is-authenticated .app-route-root .qg-companies-page #companyTierFilter .segment {
  min-width: 0;
  padding-inline: 6px;
}
```

Add `#companyTierFilter .segment` to the existing reduced-motion selector list.

- [ ] **Step 5: Run focused checks and confirm GREEN**

Run:

```bash
node --test tests/frontend-restored-controls.test.mjs
npm run check:route-interactions
npm run check:ui-redesign-support
git diff --check -- src/features/companies/CompaniesPageContent.jsx src/styles/playful-precision-replica-support-b.css tests/frontend-restored-controls.test.mjs
```

Expected: static restoration test passes; route interactions report 22 routes with no failure; support redesign check passes.

- [ ] **Step 6: Commit only Companies restoration files**

```bash
git add tests/frontend-restored-controls.test.mjs src/features/companies/CompaniesPageContent.jsx src/styles/playful-precision-replica-support-b.css
git diff --cached --check
git commit -m "fix: restore company tier filtering"
```

Do not stage any active Task 5 smoke/build/evidence file in this commit.

---

### Task 2: Restore Problems Discovery and Hot 100

**Files:**

- Modify: `tests/frontend-restored-controls.test.mjs`
- Modify: `src/features/problems/ProblemsPageContent.jsx:200-284`
- Modify: `src/features/problems/ProblemChromePanels.jsx:21-98`
- Modify: `src/styles/playful-precision-replica-training.css:1367-1377,2303-2355`

**Interfaces:**

- Consumes: existing `model.handleCollectionClick`, `model.applyFilter`, `model.toggleLeetcodeHotDone`, `view.filters.viewMode`, ranking data, and collection data.
- Produces: visible discovery band, pressed/expanded collection semantics, visible ranking mode, inline Hot 100, and unchanged collection/ranking/persistence behavior.

- [ ] **Step 1: Extend the static contract before implementation**

Append to `tests/frontend-restored-controls.test.mjs`:

```js
test("restores Problems discovery, ranking, and Hot 100 semantics", () => {
  const page = read("src/features/problems/ProblemsPageContent.jsx");
  const chrome = read("src/features/problems/ProblemChromePanels.jsx");
  const css = read("src/styles/playful-precision-replica-training.css");
  assert.doesNotMatch(page, /aria-labelledby="problemCollectionsTitle"\s+hidden/);
  assert.doesNotMatch(page, /className="problem-browser-toolbar"\s+hidden/);
  assert.match(page, /className="problem-browser-toolbar"[\s\S]*?role="group"/);
  assert.match(page, /data-problem-view="ranking"[\s\S]*?aria-pressed=/);
  assert.match(chrome, /data-problem-collection=\{entry\.id\}[\s\S]*?aria-pressed=\{active\}/);
  assert.match(chrome, /aria-expanded=\{entry\.mode === "leetcode" \? Boolean\(leetcodeExpanded\) : undefined\}/);
  assert.match(chrome, /aria-controls=\{entry\.mode === "leetcode" \? "leetcodeHotList" : undefined\}/);
  assert.match(chrome, /data-leetcode-hot-toggle=\{item\.id\}[\s\S]*?aria-pressed=\{isDone\}/);
  assert.doesNotMatch(lastRuleBody(css, ".qg-problems-page .problem-collections-panel"), /display\s*:\s*none/);
  assert.doesNotMatch(lastRuleBody(css, ".qg-problems-page .problem-browser-toolbar"), /display\s*:\s*none/);
  assert.match(css, /\.qg-problems-page \.problem-collection-grid[\s\S]*?scroll-snap-type\s*:\s*x/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\.leetcode-hot-list[\s\S]*?grid-template-columns\s*:\s*1fr/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
node --test tests/frontend-restored-controls.test.mjs
```

Expected: the Companies test passes and the Problems test fails on native `hidden`, CSS hiding, and missing ARIA state.

- [ ] **Step 3: Restore visible Problems markup and state semantics**

In `ProblemsPageContent.jsx`:

- remove native `hidden` from the collection section;
- remove native `hidden` from `.problem-browser-toolbar`;
- change the view-mode container to `role="group"`;
- add `aria-pressed={viewMode === "all" | "saved" | "ranking"}` to the three mode buttons;
- keep every existing ID, data attribute, click handler, and ranking/list conditional unchanged.

The view-mode group becomes:

```jsx
<div
  className="problem-view-tabs"
  role="group"
  aria-label="题目浏览方式"
  onClick={(event) => {
    const button = event.target.closest("[data-problem-view]");
    if (button) model.applyFilter({ type: "viewMode", value: button.dataset.problemView });
  }}
>
  <button
    className={`segment${viewMode === "all" ? " active" : ""}`}
    type="button"
    data-problem-view="all"
    aria-pressed={viewMode === "all"}
  >全部题目</button>
  <button
    className={`segment${viewMode === "saved" ? " active" : ""}`}
    type="button"
    data-problem-view="saved"
    aria-pressed={viewMode === "saved"}
  >我的收藏</button>
  <button
    className={`segment${viewMode === "ranking" ? " active" : ""}`}
    type="button"
    data-problem-view="ranking"
    aria-pressed={viewMode === "ranking"}
  >热门排行</button>
</div>
```

In `ProblemChromePanels.jsx`, extend each collection button:

```jsx
aria-pressed={active}
aria-expanded={entry.mode === "leetcode" ? Boolean(leetcodeExpanded) : undefined}
aria-controls={entry.mode === "leetcode" ? "leetcodeHotList" : undefined}
```

Extend each Hot 100 completion button with:

```jsx
aria-pressed={isDone}
```

- [ ] **Step 4: Replace the blanket hiding rule and add the discovery-band presentation**

Keep only the genuinely retired side surfaces hidden:

```css
body.is-authenticated .app-route-root .qg-problems-page .problem-side-rail,
body.is-authenticated .app-route-root .qg-problems-page .problem-theme-heading {
  display: none !important;
}
```

Add scoped styles after the filter-card rules:

```css
body.is-authenticated .app-route-root .qg-problems-page .problem-collections-panel {
  display: grid;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--qg-border);
  border-radius: 20px;
  background: var(--qg-surface);
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collections-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 16px;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collections-heading .rank-label {
  display: none;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collections-heading h3 {
  margin: 0;
  font-size: 14px;
  color: var(--qg-text);
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collections-heading p {
  margin: 0;
  color: var(--qg-muted);
  font-size: 12px;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collection-grid {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(210px, 1fr);
  gap: 10px;
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scroll-snap-type: x proximity;
  scrollbar-width: thin;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collection-card {
  min-height: 92px;
  scroll-snap-align: start;
}

body.is-authenticated .app-route-root .qg-problems-page .leetcode-hot-list:not(.hidden) {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-browser-toolbar {
  display: flex;
  grid-column: 1 / -1;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--qg-border);
  border-radius: 14px;
  background: var(--qg-surface-2);
}

body.is-authenticated .app-route-root .qg-problems-page .problem-view-tabs {
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-view-tabs .segment {
  min-height: 44px;
  white-space: nowrap;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-view-tabs .segment:focus-visible,
body.is-authenticated .app-route-root .qg-problems-page .problem-collection-card:focus-visible,
body.is-authenticated .app-route-root .qg-problems-page .leetcode-hot-done:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--qg-brand) 62%, transparent);
  outline-offset: 2px;
}
```

Inside `@media (max-width: 640px)` add:

```css
body.is-authenticated .app-route-root .qg-problems-page .problem-collections-heading {
  align-items: start;
  flex-direction: column;
  gap: 4px;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-collection-grid {
  grid-auto-columns: minmax(82%, 1fr);
}

body.is-authenticated .app-route-root .qg-problems-page .leetcode-hot-list:not(.hidden) {
  grid-template-columns: 1fr;
}

body.is-authenticated .app-route-root .qg-problems-page .problem-browser-toolbar {
  align-items: stretch;
  flex-direction: column;
}
```

Include the restored interactive controls in the file's existing reduced-motion block with transition duration reduced to 1 ms.

- [ ] **Step 5: Run focused checks and confirm GREEN**

Run:

```bash
node --test tests/frontend-restored-controls.test.mjs
npm run check:route-interactions
npm run check:ui-redesign-training
git diff --check -- src/features/problems/ProblemsPageContent.jsx src/features/problems/ProblemChromePanels.jsx src/styles/playful-precision-replica-training.css tests/frontend-restored-controls.test.mjs
```

Expected: both restoration tests pass; training redesign and route interaction checks pass.

- [ ] **Step 6: Commit the Problems discovery change only**

```bash
git add tests/frontend-restored-controls.test.mjs src/features/problems/ProblemsPageContent.jsx src/features/problems/ProblemChromePanels.jsx src/styles/playful-precision-replica-training.css
git diff --cached --check
git commit -m "fix: restore problem discovery controls"
```

Do not stage the active Task 5 smoke/build/evidence files.

---

### Task 3: Restore the Problems Detail Action Dock

**Files:**

- Modify: `tests/frontend-restored-controls.test.mjs`
- Modify: `src/features/problems/ProblemDetail.jsx:121-181,239-265`
- Modify: `src/styles/playful-precision-replica-training.css:2058-2068,2223-2280,2331-2355`

**Interfaces:**

- Consumes: existing `onBack`, `onOpenProblem`, `onToggleCompleted`, `onToggleSaved`, and `onSelectInterview` callbacks.
- Produces: one compact navigation utility row and exactly one visible action dock with Complete, Save, and Mock Interview.

- [ ] **Step 1: Add a duplicate-prevention and mobile-action contract**

Append to `tests/frontend-restored-controls.test.mjs`:

```js
test("exposes one Problems utility row and one complete action dock", () => {
  const source = read("src/features/problems/ProblemDetail.jsx");
  const css = read("src/styles/playful-precision-replica-training.css");
  assert.equal((source.match(/data-problem-action="mock-interview"/g) || []).length, 1);
  assert.equal((source.match(/className="problem-detail-actions qg-detail-cta-row"/g) || []).length, 1);
  assert.match(source, /className="problem-detail-top qg-detail-utility-row"/);
  assert.match(source, /className=\{`secondary-button problem-detail-complete/);
  assert.match(source, /className=\{`secondary-button problem-detail-save/);
  const utilityRule = lastRuleBody(css, ".qg-problems-page .problem-detail .problem-detail-top");
  assert.doesNotMatch(utilityRule, /display\s*:\s*none/);
  assert.match(css, /@media \(max-width: 640px\)[\s\S]*?\[data-problem-action="mock-interview"\][\s\S]*?flex-basis\s*:\s*100%/);
  assert.match(css, /\[data-problem-action="mock-interview"\][\s\S]*?min-height\s*:\s*44px/);
});
```

- [ ] **Step 2: Run the test and confirm RED**

Run:

```bash
node --test tests/frontend-restored-controls.test.mjs
```

Expected: the first two tests pass and the action-dock test fails because the old toolbar is hidden and the current CTA row has no Mock Interview control.

- [ ] **Step 3: Split the hidden toolbar into a utility row and one action dock**

In `ProblemDetail.jsx`:

1. Keep Back, Previous, position, and Next inside:

```jsx
<div className="problem-detail-top qg-detail-utility-row">
  <button className="secondary-button" type="button" onClick={onBack}>
    <i data-lucide="arrow-left" />
    {t("backToProblems")}
  </button>
  <div className="problem-detail-navigation">
    <button
      className="secondary-button compact problem-detail-nav-button"
      type="button"
      disabled={!detail.navigation.previousId}
      aria-label={isEnglish ? "Previous" : "上一题"}
      onClick={() => detail.navigation.previousId && onOpenProblem(detail.navigation.previousId)}
    >
      <i data-lucide="chevron-left" />
      {isEnglish ? "Previous" : "上一题"}
    </button>
    <span className="problem-detail-position">
      {detail.navigation.index >= 0 && detail.navigation.total
        ? `${detail.navigation.index + 1} / ${detail.navigation.total}`
        : ""}
    </span>
    <button
      className="secondary-button compact problem-detail-nav-button"
      type="button"
      disabled={!detail.navigation.nextId}
      aria-label={isEnglish ? "Next" : "下一题"}
      onClick={() => detail.navigation.nextId && onOpenProblem(detail.navigation.nextId)}
    >
      <i data-lucide="chevron-right" />
      {isEnglish ? "Next" : "下一题"}
    </button>
  </div>
</div>
```

2. Remove the old `.problem-detail-actions` block from the utility row.

3. Replace the current `.qg-detail-cta-row` with:

```jsx
<div className="problem-detail-actions qg-detail-cta-row">
  <button
    type="button"
    className={`secondary-button problem-detail-complete${detail.completed ? " active" : ""}`}
    onClick={() => onToggleCompleted(detail.id)}
  >
    <i data-lucide={detail.completed ? "check-circle-2" : "circle"} />
    {completeLabel}
  </button>
  <button
    type="button"
    className={`secondary-button problem-detail-save${detail.favorite ? " active" : ""}`}
    onClick={() => onToggleSaved(detail.id)}
  >
    <i data-lucide={detail.favorite ? "bookmark-check" : "bookmark"} />
    {detail.favorite ? t("savedForReview") : t("saveForReview")}
  </button>
  <button
    type="button"
    className="primary-button"
    data-problem-action="mock-interview"
    onClick={() => onSelectInterview(detail.id)}
  >
    <i data-lucide="messages-square" />
    {t("useForMock")}
  </button>
</div>
```

This removes the duplicate current completion/bookmark controls rather than exposing both implementations.

- [ ] **Step 4: Style the utility row and action dock**

Replace the detail-toolbar hiding rule with:

```css
body.is-authenticated .app-route-root .qg-problems-page .problem-detail .problem-detail-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--qg-border);
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-utility-row .secondary-button,
body.is-authenticated .app-route-root .qg-problems-page .qg-detail-utility-row .problem-detail-nav-button {
  min-height: 44px;
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1.2fr);
  gap: 8px;
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row > button {
  min-height: 44px;
  white-space: nowrap;
}

body.is-authenticated .app-route-root .qg-problems-page [data-problem-action="mock-interview"] {
  min-height: 44px;
  background: var(--qg-brand);
  color: #ffffff;
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-utility-row button:focus-visible,
body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row button:focus-visible {
  outline: 3px solid color-mix(in srgb, var(--qg-brand) 62%, transparent);
  outline-offset: 2px;
}
```

Inside `@media (max-width: 640px)` add:

```css
body.is-authenticated .app-route-root .qg-problems-page .qg-detail-utility-row {
  align-items: stretch;
  flex-direction: column;
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row {
  display: flex;
  flex-wrap: wrap;
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row > button {
  flex: 1 1 calc(50% - 4px);
}

body.is-authenticated .app-route-root .qg-problems-page .qg-detail-cta-row [data-problem-action="mock-interview"] {
  flex-basis: 100%;
}
```

Add the new buttons to the existing reduced-motion rule.

- [ ] **Step 5: Run focused checks and confirm GREEN**

Run:

```bash
node --test tests/frontend-restored-controls.test.mjs
npm run check:route-interactions
npm run check:ui-redesign-training
git diff --check -- src/features/problems/ProblemDetail.jsx src/styles/playful-precision-replica-training.css tests/frontend-restored-controls.test.mjs
```

Expected: all three restoration contract tests pass; no duplicate action test fails; existing route checks remain green.

- [ ] **Step 6: Commit the action dock only**

```bash
git add tests/frontend-restored-controls.test.mjs src/features/problems/ProblemDetail.jsx src/styles/playful-precision-replica-training.css
git diff --cached --check
git commit -m "fix: restore problem interview handoff"
```

Do not stage the active Task 5 smoke/build/evidence files.

---

### Task 4: Integrate the Restored Journeys and Complete Task 5

**Files:**

- Modify: `scripts/check-browser-route-smoke.mjs`
- Modify: `scripts/build-static-site.mjs`
- Modify: `src/modules/ownership.js`
- Create: `scripts/lib/browser-route-targets.mjs`
- Create: `tests/browser-route-targets.test.mjs`
- Create: `tests/build-static-site-isolation.test.mjs`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json`
- Test: `tests/frontend-restored-controls.test.mjs`

**Interfaces:**

- Consumes: the restored selectors, existing 69 exact interaction names, explicit build-isolation flags, full-dist fingerprint helper, and Task 3 core-flow evidence mapping.
- Produces: a passing 22-route/69-interaction `370` summary with zero unexpected console, page, or first-party response errors and a stable canonical dist fingerprint.

- [ ] **Step 1: Capture the six focused RED interactions before changing their smoke steps**

Run each exact interaction with the Phase 0 isolated build environment:

```bash
export PATH="/opt/homebrew/opt/node@20/bin:$PATH"
export QUANTGYM_WEB_IGNORE_DOTENV=1
export QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG=1
export QUANTGYM_WEB_API_ENDPOINT=http://127.0.0.1:8790/api
export QUANTGYM_WEB_LLM_ENDPOINT=http://127.0.0.1:8787/interview
export QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=false
node scripts/check-browser-route-smoke.mjs --only-interaction "problems pagination, collection filter, and mock interview handoff" --summary /tmp/qg-restore-problems-collection-red.json
node scripts/check-browser-route-smoke.mjs --only-interaction "mobile problems detail actions and mock handoff avoid overflow" --summary /tmp/qg-restore-problems-mobile-red.json
node scripts/check-browser-route-smoke.mjs --only-interaction "problems ranking view opens ranked detail and preserves ranking navigation" --summary /tmp/qg-restore-problems-ranking-red.json
node scripts/check-browser-route-smoke.mjs --only-interaction "problems LeetCode Hot 100 tracking persistence" --summary /tmp/qg-restore-problems-hot100-red.json
node scripts/check-browser-route-smoke.mjs --only-interaction "companies tier filter, practice navigation, and careers link behavior" --summary /tmp/qg-restore-companies-red.json
node scripts/check-browser-route-smoke.mjs --only-interaction "mobile career jobs and companies controls avoid overflow" --summary /tmp/qg-restore-companies-mobile-red.json
```

Expected before smoke adaptation: restored controls have nonzero layout, but legacy Companies selectors and any legacy mock-action selector still fail. Preserve each exact failure in the Task 5 report.

- [ ] **Step 2: Update only stale selectors while preserving intent**

Use stable restored/current selectors:

```js
const restoredSelectors = {
  collections: "#problemCollectionGrid [data-problem-collection]",
  mockInterview: '#problemDetail [data-problem-action="mock-interview"]',
  ranking: '[data-problem-view="ranking"]',
  rankingRows: "#problemRankingList [data-problem-ranking-row]",
  hot100: '[data-problem-collection="leetcode-hot"]',
  hot100List: "#leetcodeHotList",
  hot100Toggle: "[data-leetcode-hot-toggle]",
  companyRows: "#companyOverviewList .company-list-row[data-company-card]",
  companyDetail: "[data-company-detail]",
  companyPractice: "[data-company-detail] [data-company-practice]",
  companyCareers: "[data-company-detail] [data-company-careers]"
};
```

Required Companies flow changes:

- wait for current `.company-list-row[data-company-card]`, not removed `.company-overview-card`;
- apply S, A, and All through the restored tier buttons and keep exact filtered-card assertions;
- select the intended company row, then locate practice/careers inside its current `[data-company-detail]` panel;
- keep route, external-link, and mobile-overflow assertions.

Required Problems flow changes:

- use the new data-action selector for Mock Interview;
- retain exact collection/filter, ranking score/order/detail/return, Hot 100 persistence, route handoff, setup state, and mobile-overflow assertions;
- do not convert any restored check to visibility-only.

- [ ] **Step 3: Run the six focused interactions and confirm GREEN**

Run the six commands from Step 1 again with `-green` summary paths.

Expected for each: `routes.passed=22`, selected interaction `status="pass"`, and zero console, page, or first-party response errors.

- [ ] **Step 4: Run the static and repository checks**

```bash
node --test tests/frontend-restored-controls.test.mjs
node --test tests/browser-route-targets.test.mjs
node --test tests/build-static-site-isolation.test.mjs
npm run check:frontend-upgrade-contracts
npm run check:frontend-v2-boundaries
npm run check:route-integrity
npm run check:route-interactions
npm run check:ui-redesign-training
npm run check:ui-redesign-support
npm run check:repo-hygiene
npm run build
```

Expected: all commands exit 0. Existing Vite classic-script notices may remain documented, but there must be no new warning from restored controls.

- [ ] **Step 5: Run the complete canonical core-flow baseline once**

```bash
QUANTGYM_WEB_IGNORE_DOTENV=1 \
QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG=1 \
QUANTGYM_WEB_API_ENDPOINT=http://127.0.0.1:8790/api \
QUANTGYM_WEB_LLM_ENDPOINT=http://127.0.0.1:8787/interview \
QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=false \
node scripts/check-browser-route-smoke.mjs \
  --summary docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
```

Expected:

- status `pass`;
- routes `22/22`;
- interactions `69/69`, including League and all six restored journeys;
- zero unexpected console errors;
- zero page errors;
- zero first-party response errors;
- one stable canonical full-dist fingerprint with provenance stored separately.

- [ ] **Step 6: Run module ownership against the passing summary**

```bash
node scripts/check-module-ownership.mjs \
  --summary docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
```

Expected: all 22 routes are owned and every declared browser interaction is represented and passing.

- [ ] **Step 7: Perform visual pre-flight on the restored controls**

Inspect Problems and Companies at 1440x900, 1280x720, and 390x844 in light and dark themes. Record in the Task 5 report:

- controls visible with nonzero layout;
- page horizontal overflow at most 4 px;
- 44 px mobile touch targets;
- no wrapped desktop CTA;
- no duplicate action intent;
- focus ring visible and unclipped;
- active state not conveyed by color alone;
- reduced-motion disables entry movement;
- no new nested-card or extra-shadow layer.

- [ ] **Step 8: Commit the complete Task 5 QA/evidence change**

```bash
git add \
  scripts/build-static-site.mjs \
  scripts/check-browser-route-smoke.mjs \
  src/modules/ownership.js \
  scripts/lib/browser-route-targets.mjs \
  tests/browser-route-targets.test.mjs \
  tests/build-static-site-isolation.test.mjs \
  docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
git diff --cached --check
git commit -m "test: baseline all frontend core flows"
```

Do not stage any unrelated source-workspace screenshot or local design-archive file.

---

## Completion Review

After Task 4:

1. Generate one review package from the commit before Task 1 through the final Task 4 commit.
2. Review product scope, accessibility, responsive behavior, light/dark parity, state preservation, and all 69 evidence records.
3. Fix every Critical or Important finding with regression-first TDD and re-review.
4. Continue to Phase 0 Task 6 only after this restoration and Task 5 both receive an Approved verdict.
