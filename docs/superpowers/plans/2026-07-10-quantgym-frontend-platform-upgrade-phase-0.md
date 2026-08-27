# QuantGym Frontend Platform Upgrade — Phase 0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:using-git-worktrees` because the source workspace is dirty, then use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Use `superpowers:test-driven-development` for every code task and `superpowers:verification-before-completion` before any completion claim.

**Goal:** Freeze the approved Playful Precision 2.0 reference, map every product and shared surface to implementation and acceptance contracts, capture reproducible visual/accessibility/performance/core-flow baselines, establish migration guardrails, and prove that the new v2 Preview web, API, internal LLM, PostgreSQL, and R2 resources are isolated from beta/production.

**Architecture:** Phase 0 changes evidence, contracts, validation tooling, and Preview infrastructure only. It does not migrate a product route or introduce the Phase 1 FastAPI application. The 74 MB local design archive remains outside Git; deterministic text extracts and hashes become the reviewable reference. All browser baselines are built from a production-mode static build. Preview PostgreSQL starts empty and is reserved for Phase 1 Alembic migrations; Preview R2 is private and uses bucket-scoped credentials.

**Tech Stack:** Node.js `20.20.2`, npm `10.8.2`, ESM, built-in `node:test`, Python 3 stdlib and `unittest`, Playwright Core `1.61.0`, `@axe-core/playwright` `4.12.1`, installed Google Chrome, current Vite/React app, `psycopg` 3 installed in a temporary virtual environment for the live Preview database check, Render, Cloudflare Pages, and Cloudflare R2.

---

## 0. Non-Negotiable Constraints

- The approved specification is `docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md`.
- `UI 设计提升.zip` controls visual hierarchy, composition, interaction tone, responsive intent, and asset use. Deliberate deviations are allowed only for real-data density, accessibility, performance, or small-screen usability.
- Preserve brand purple `#5b5ff5`, dark-theme brand `#7d7bff`, Quanty mascot assets, Plus Jakarta Sans, Space Grotesk, playful energy, light theme, and dark theme.
- Cover exactly the 22 IDs in `src/modules/manifest.js`, authentication, desktop shell, mobile shell, global search, notifications/toasts, Todo, theme/language, and network/error recovery.
- All new production code is TypeScript, but Phase 0 validation utilities may remain ESM JavaScript where they extend the repository's existing script suite.
- New architecture code must not import `createAppContext`, pageApi, old DOM controllers, `src/state`, `src/stores`, `src/ui`, old `src/modules`, or the `quantgym:*` global event bus.
- Do not commit `UI 设计提升.zip`, `.superpowers/`, `assets 2/`, raw private exports, credentials, database URLs, provider tokens, SQLite databases, or generated PNG baselines.
- Do not stage or alter the user's existing `369-*` screenshot changes. Record the starting worktree state and compare it at the end; do not expect an absolutely clean tree.
- Do not reuse the beta/production database, bucket, service environment group, or public LLM endpoint. Do not import v1 data or enable dual-write in Preview.
- External Render/Cloudflare provisioning is a side effect with possible cost. Task 10 must pause and obtain explicit user authorization before creating or changing external resources.
- Phase 0 may produce `ready-for-review`; it cannot mark itself `accepted`. Acceptance requires independent review and explicit user confirmation.

## 1. Execution Preflight

Run before Task 1:

```bash
cd /Users/miujiawei/Desktop/QuantGym
export QUANTGYM_SOURCE_WORKSPACE="/Users/miujiawei/Desktop/QuantGym"
node --version
npm --version
python3 --version
test -f "UI 设计提升.zip"
test -f assets/generated/playful-precision/manifest.json
git -C "$QUANTGYM_SOURCE_WORKSPACE" status --porcelain=v1 -z > /tmp/quantgym-phase0-start-status.z
git -C "$QUANTGYM_SOURCE_WORKSPACE" diff --binary > /tmp/quantgym-phase0-user-worktree.diff
git -C "$QUANTGYM_SOURCE_WORKSPACE" diff --cached --binary > /tmp/quantgym-phase0-user-index.diff
git -C "$QUANTGYM_SOURCE_WORKSPACE" ls-files --others --exclude-standard -z > /tmp/quantgym-phase0-start-untracked-paths.z
xargs -0 -I{} shasum -a 256 "$QUANTGYM_SOURCE_WORKSPACE/{}" < /tmp/quantgym-phase0-start-untracked-paths.z > /tmp/quantgym-phase0-user-untracked.sha256
```

Expected: Node is `v20.20.2`; the archive and production asset manifest exist. In the required isolated worktree, pass the original archive explicitly:

```bash
export QUANTGYM_DESIGN_ARCHIVE="/Users/miujiawei/Desktop/QuantGym/UI 设计提升.zip"
```

The executor must create the isolated implementation worktree on local branch `codex/frontend-v2-preview` after this source-workspace snapshot and run Tasks 1–11 there. Creating the local branch is part of safe workspace isolation; pushing it remains inside Task 10's explicit external authorization checkpoint.

The plan is intentionally split from Phases 1–6. Do not write or execute Phase 1 until the final Phase 0 review is explicitly accepted.

## 2. Target Phase 0 Files

```text
docs/frontend-upgrade/
  design-system-contract.json
  phase-registry.json
  surface-contracts.json
  acceptance-catalog.json
  legacy-removal-map.json
  baseline-methodology.md
  expected-legacy-ui-contract-findings.json
  preview-environment.json
  preview-environment-runbook.md
docs/ui-reference/playful-precision/
  source-manifest.json
  source/*
scripts/
  build-ui-design-source.py
  build-frontend-upgrade-acceptance-catalog.mjs
  build-frontend-upgrade-preview-web.mjs
  check-frontend-upgrade-contracts.mjs
  check-frontend-v2-boundaries.mjs
  capture-frontend-upgrade-baseline.mjs
  capture-frontend-upgrade-performance.mjs
  capture-legacy-ui-contract-findings.mjs
  check-frontend-upgrade-preview.mjs
  build-frontend-upgrade-preview-packet.mjs
  serve-frontend-upgrade-preview-probe.mjs
  check-frontend-upgrade-preview-live.mjs
  check-frontend-upgrade-preview-postgres.py
  check-frontend-upgrade-preview-r2.mjs
  check-frontend-upgrade-phase0.mjs
  lib/frontend-upgrade-*.mjs
tests/frontend-upgrade-*.test.mjs
tests/test_build_ui_design_source.py
docs/browser-audit-screenshots/370-*.json
docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md
artifacts/frontend-upgrade/*               # ignored
```

---

## Task 1: Version the Approved Design Source Deterministically

**Files**

- Create: `scripts/build-ui-design-source.py`
- Create: `tests/test_build_ui_design_source.py`
- Generate: `docs/ui-reference/playful-precision/source-manifest.json`
- Generate: `docs/ui-reference/playful-precision/source/*`
- Modify: `.gitignore`

**Contract**

- Extract only root-level `*.dc.html`, `README.md`, `qg-state.js`, `support.js`, and `吉祥物生成任务书.md`.
- Normalize Unicode names to NFC and line endings to LF.
- Reject absolute paths, `..`, nested files, binary assets, and nested archives.
- Record archive bytes/SHA-256, asset-manifest SHA-256, and per-file bytes/SHA-256.
- The current archive must yield exactly 30 text files.
- Parse the asset manifest, require `assetCount` to equal the `assets` array length, and record that count alongside its SHA-256. The real CLI build requires 36; Task 11 rechecks all 36 destination files and hashes. Temporary unit fixtures may use a smaller internally consistent manifest.

- [ ] **Step 1: Write the failing unit test**

Create `tests/test_build_ui_design_source.py` with a temporary ZIP containing two allowed root files, a nested PNG, a nested ZIP, a `../escape.dc.html` entry, and CRLF text. Assert that only the two safe files are emitted, output uses LF, hashes match emitted bytes, and a second build is byte-identical.

Core test shape:

```python
class BuildUiDesignSourceTest(unittest.TestCase):
    def test_extracts_only_safe_root_text_deterministically(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            archive_path = root / "design.zip"
            asset_manifest = root / "asset-manifest.json"
            first = root / "first"
            second = root / "second"
            asset_manifest.write_text(
                '{"assetCount":1,"assets":[{"dest":"assets/generated/test.webp","bytes":1,"sha256":"' + ('0' * 64) + '"}]}\n',
                encoding="utf-8",
            )
            with ZipFile(archive_path, "w") as archive:
                archive.writestr("README.md", "# Reference\r\n")
                archive.writestr("QuantGym 总览.dc.html", "<html>overview</html>\r\n")
                archive.writestr("assets/mascot.png", b"png")
                archive.writestr("uploads/ui.zip", b"zip")
                archive.writestr("../escape.dc.html", "escape")
            one = module.build_reference(archive_path, first, asset_manifest)
            two = module.build_reference(archive_path, second, asset_manifest)
            self.assertEqual(one, two)
            self.assertEqual([item["path"] for item in one["textFiles"]], [
                "QuantGym 总览.dc.html", "README.md"
            ])
            self.assertEqual((first / "source" / "README.md").read_bytes(), b"# Reference\n")
            self.assertFalse((first / "source" / "assets").exists())
```

- [ ] **Step 2: Verify the red state**

```bash
python3 -m unittest discover -s tests -p 'test_build_ui_design_source.py' -v
```

Expected: `FAIL` because `scripts/build-ui-design-source.py` does not exist.

- [ ] **Step 3: Implement the extractor**

Use Python stdlib only. Export `sha256_bytes(value: bytes) -> str`, `sha256_file(path: Path) -> str`, `is_design_text(name: str) -> bool`, and `build_reference(archive_path: Path, out_dir: Path, asset_manifest: Path) -> dict` for the unit test.

`build_reference` must delete only its own `source/` child before rebuilding, sort archive entries by normalized name, decode strict UTF-8, write normalized bytes, and emit `source-manifest.json` with this schema:

```json
{
  "version": 1,
  "archive": "UI 设计提升.zip",
  "archiveBytes": 0,
  "archiveSha256": "64 lowercase hex characters",
  "assetManifest": "assets/generated/playful-precision/manifest.json",
  "assetManifestSha256": "64 lowercase hex characters",
  "productionAssetCount": 36,
  "textFileCount": 30,
  "textFiles": [
    { "path": "QuantGym 总览.dc.html", "bytes": 0, "sha256": "64 lowercase hex characters" }
  ],
  "excludedPrefixes": ["assets/", "uploads/"]
}
```

The numbers and hashes above are generated values, never hard-coded.

- [ ] **Step 4: Add local-only ignores and prove them**

Append under `.agents/` in `.gitignore`:

```gitignore
.superpowers/
UI 设计提升.zip
assets 2/
```

Run:

```bash
git check-ignore -v .superpowers/session "UI 设计提升.zip" "assets 2/file.png"
```

Expected: all three probe paths match `.gitignore`.

- [ ] **Step 5: Generate and compare two independent outputs**

```bash
FIRST="$(mktemp -d)"
SECOND="$(mktemp -d)"
python3 scripts/build-ui-design-source.py --archive "${QUANTGYM_DESIGN_ARCHIVE:-UI 设计提升.zip}" --out-dir "$FIRST"
python3 scripts/build-ui-design-source.py --archive "${QUANTGYM_DESIGN_ARCHIVE:-UI 设计提升.zip}" --out-dir "$SECOND"
diff -ru "$FIRST" "$SECOND"
python3 scripts/build-ui-design-source.py --archive "${QUANTGYM_DESIGN_ARCHIVE:-UI 设计提升.zip}"
python3 -m unittest discover -s tests -p 'test_build_ui_design_source.py' -v
```

Expected: `diff` is empty; the real build reports 30 text files.

- [ ] **Step 6: Commit only Task 1 files**

```bash
git add .gitignore scripts/build-ui-design-source.py tests/test_build_ui_design_source.py docs/ui-reference/playful-precision
git diff --cached --check
git commit -m "docs: version Playful Precision source reference"
```

---

## Task 2: Formalize Playful Precision 2.0 as a Machine-Readable Contract

**Files**

- Create: `docs/frontend-upgrade/design-system-contract.json`
- Create: `scripts/lib/frontend-upgrade-contracts.mjs`
- Create: `tests/frontend-upgrade-contracts.test.mjs`

- [ ] **Step 1: Write failing design-contract tests**

The tests must assert exact theme values, type families, radius scale, motion ranges, required states, allowed deviation reasons, and approved viewports:

```js
test("locks the approved Playful Precision foundations", () => {
  const failures = validateDesignSystemContract(validDesignSystem);
  assert.deepEqual(failures, []);
  assert.equal(validDesignSystem.themes.light.actionPrimary, "#5b5ff5");
  assert.equal(validDesignSystem.themes.dark.actionPrimary, "#7d7bff");
  assert.deepEqual(validDesignSystem.shape.radiusPx, [11, 14, 16, 20, 28]);
  assert.deepEqual(validDesignSystem.motion.microMs, [120, 180]);
  assert.deepEqual(validDesignSystem.motion.panelMs, [240, 300]);
});

test("rejects raw-palette semantics and an unapproved deviation reason", () => {
  const invalid = structuredClone(validDesignSystem);
  invalid.semanticTokens.push("purple-500");
  invalid.allowedDeviationReasons.push("personal-preference");
  const failures = validateDesignSystemContract(invalid);
  assert.ok(failures.some((item) => item.includes("semantic token")));
  assert.ok(failures.some((item) => item.includes("deviation reason")));
});
```

Run and expect `ERR_MODULE_NOT_FOUND`:

```bash
node --test tests/frontend-upgrade-contracts.test.mjs
```

- [ ] **Step 2: Create the exact design-system contract**

Create `docs/frontend-upgrade/design-system-contract.json`:

```json
{
  "version": 1,
  "name": "Playful Precision 2.0",
  "spec": "docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md",
  "designSource": "docs/ui-reference/playful-precision/source-manifest.json",
  "productionAssets": "assets/generated/playful-precision/manifest.json",
  "themes": {
    "light": {
      "appBackground": "#f4f4fb",
      "surfacePrimary": "#ffffff",
      "surfaceSecondary": "#fbfbfd",
      "textPrimary": "#1b1a38",
      "textSecondary": "#4a4966",
      "textMuted": "#6d6c8e",
      "borderSubtle": "#ecebf7",
      "actionPrimary": "#5b5ff5",
      "actionPrimarySoft": "#eef0ff"
    },
    "dark": {
      "appBackground": "#111020",
      "surfacePrimary": "#201f39",
      "surfaceSecondary": "#1b1a30",
      "textPrimary": "#f1f0fb",
      "textSecondary": "#cbc9e8",
      "textMuted": "#a6a4cf",
      "borderSubtle": "#332f57",
      "actionPrimary": "#7d7bff",
      "actionPrimaryInk": "#b9b8ff"
    }
  },
  "semanticTokens": [
    "app-background", "surface-primary", "surface-secondary", "text-primary",
    "text-secondary", "text-muted", "border-subtle", "action-primary",
    "action-primary-soft", "status-success", "status-warning", "status-danger",
    "reward-xp", "reward-coin", "focus-ring"
  ],
  "typography": {
    "ui": "Plus Jakarta Sans",
    "metrics": "Space Grotesk",
    "chineseFallbacks": ["PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", "sans-serif"],
    "metricFeatures": ["tabular-nums"]
  },
  "shape": { "radiusPx": [11, 14, 16, 20, 28], "shadowPolicy": "dialogs-command-notifications-mascot-only" },
  "surfacePolicy": {
    "hierarchyOrder": ["border", "background", "spacing", "type", "shadow"],
    "strongShadowRoles": ["dialog", "command-surface", "notification", "mascot-overlay"],
    "gradientGlowRoles": ["primary-action", "reward-action"],
    "primaryButtonTactilePress": true,
    "avoidNestedCardsWhenBandsOrSpacingSuffice": true
  },
  "densityPolicy": {
    "problems": "dense-professional-scan-friendly",
    "interview": "dense-professional-scan-friendly",
    "mobile": "reduce-simultaneous-density-without-removing-functionality"
  },
  "shellLayout": {
    "desktopSidebarPx": 252,
    "ordinaryContentMaxPx": 1180,
    "focusedSessionMayUseWiderControlledCanvas": true,
    "laptopTitleAndPrimaryActionAboveFold": { "width": 1280, "height": 720 }
  },
  "breakpoints": {
    "mobileShellMaxPx": 860,
    "listDetailSingleViewMaxPx": 640,
    "mobileTouchTargetMinPx": 44
  },
  "templateResponsiveRules": {
    "dashboard": "stack-priority-sections-with-primary-action-first",
    "list-detail": "single-view-with-explicit-return-at-or-below-640",
    "focused-session": "preserve-controls-timer-feedback-and-result",
    "workflow-board": "preserve-task-actions-with-horizontal-density-reduction",
    "settings-form": "single-column-mobile-with-associated-errors"
  },
  "motion": {
    "microMs": [120, 180],
    "panelMs": [240, 300],
    "rewardMayExceedPanel": true,
    "rewardBlocksNextAction": false,
    "reducedMotionRequired": true,
    "scrollJackingAllowed": false
  },
  "motionProfiles": {
    "panel-and-micro": ["micro-feedback", "panel-transition"],
    "session-feedback": ["micro-feedback", "panel-transition", "result-before-celebration"],
    "reward-feedback": ["micro-feedback", "result-before-celebration", "non-blocking-reward"]
  },
  "viewports": [
    { "id": "desktop", "width": 1440, "height": 900 },
    { "id": "laptop", "width": 1280, "height": 720 },
    { "id": "mobile", "width": 390, "height": 844 },
    { "id": "tablet", "width": 1024, "height": 768, "conditional": true }
  ],
  "requiredStates": ["loading", "ready", "empty", "error", "disabled", "focus", "active", "reward", "reduced-motion"],
  "routeRecoveryStates": ["loading", "empty", "recoverable-error", "non-recoverable-error", "offline-draft", "permission-denied", "stale-version-conflict", "retry"],
  "aiJobStates": ["queued", "running", "streaming", "completed", "failed", "cancelled", "retry"],
  "pageTemplates": ["dashboard", "list-detail", "focused-session", "workflow-board", "settings-form"],
  "allowedDeviationReasons": ["real-data-density", "accessibility", "performance", "small-screen-usability"],
  "mascot": {
    "maxPrimaryPerInitialViewport": 1,
    "allowedRoles": ["welcome", "guidance", "success", "failure", "search", "empty", "domain-training"],
    "regenerateEquivalentAssets": false
  }
}
```

- [ ] **Step 3: Implement `validateDesignSystemContract`**

Export from `scripts/lib/frontend-upgrade-contracts.mjs`:

```js
export function validateDesignSystemContract(contract = {}) {
  const failures = [];
  const exact = (actual, expected, label) => {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) failures.push(`${label} mismatch`);
  };
  if (contract.version !== 1) failures.push("design contract version must be 1");
  if (contract.themes?.light?.actionPrimary !== "#5b5ff5") failures.push("light actionPrimary mismatch");
  if (contract.themes?.dark?.actionPrimary !== "#7d7bff") failures.push("dark actionPrimary mismatch");
  if (contract.typography?.ui !== "Plus Jakarta Sans") failures.push("UI type family mismatch");
  if (contract.typography?.metrics !== "Space Grotesk") failures.push("metric type family mismatch");
  exact(contract.shape?.radiusPx, [11, 14, 16, 20, 28], "radius scale");
  exact(contract.motion?.microMs, [120, 180], "micro motion range");
  exact(contract.motion?.panelMs, [240, 300], "panel motion range");
  exact((contract.viewports || []).map(({ id, width, height }) => ({ id, width, height })), [
    { id: "desktop", width: 1440, height: 900 },
    { id: "laptop", width: 1280, height: 720 },
    { id: "mobile", width: 390, height: 844 },
    { id: "tablet", width: 1024, height: 768 }
  ], "viewports");
  exact(contract.requiredStates, [
    "loading", "ready", "empty", "error", "disabled", "focus", "active", "reward", "reduced-motion"
  ], "required states");
  exact(contract.routeRecoveryStates, [
    "loading", "empty", "recoverable-error", "non-recoverable-error", "offline-draft",
    "permission-denied", "stale-version-conflict", "retry"
  ], "route recovery states");
  exact(contract.aiJobStates, [
    "queued", "running", "streaming", "completed", "failed", "cancelled", "retry"
  ], "AI job states");
  exact(contract.allowedDeviationReasons, [
    "real-data-density", "accessibility", "performance", "small-screen-usability"
  ], "deviation reasons");
  for (const token of contract.semanticTokens || []) {
    if (/^(?:purple|blue|gray|red|green)-\d+$/i.test(token)) failures.push(`semantic token cannot be raw palette: ${token}`);
  }
  if (contract.motion?.reducedMotionRequired !== true) failures.push("reduced motion is required");
  if (contract.motion?.scrollJackingAllowed !== false) failures.push("scroll jacking must be disabled");
  if (canonicalJsonSha256(contract) !== "aae0b65079c600f6448511af04049d645d3acbd392567e8f00368c3010a1bee7") {
    failures.push("complete approved design-system contract hash mismatch");
  }
  return failures;
}
```

Implement `canonicalJsonSha256` by recursively sorting object keys while preserving array order, serializing compact UTF-8 JSON, and hashing with Node `crypto`. The fixed hash above corresponds to the complete JSON in Step 2, including every theme value, semantic token, fallback font, radius, surface/density policy, shell dimension, breakpoint, template responsive rule, shadow policy, motion flag/profile, viewport conditional, state set, page template, deviation reason, and mascot rule. Add one mutation test for every top-level section so a changed field fails even when its shape remains valid.

Task 3 adds `validatePhaseRegistry` and `validateSurfaceContracts`; Task 4 adds `validateLegacyRemovalMap`, each only after its new tests demonstrate the red state.

- [ ] **Step 4: Verify and commit**

```bash
node --test tests/frontend-upgrade-contracts.test.mjs
git add docs/frontend-upgrade/design-system-contract.json scripts/lib/frontend-upgrade-contracts.mjs tests/frontend-upgrade-contracts.test.mjs
git diff --cached --check
git commit -m "docs: lock Playful Precision design contract"
```

---

## Task 3: Map Every Route and Shared Surface to Components, Data, Interactions, and Acceptance

**Files**

- Create: `docs/frontend-upgrade/phase-registry.json`
- Create: `docs/frontend-upgrade/surface-contracts.json`
- Create: `docs/frontend-upgrade/acceptance-catalog.json`
- Create: `scripts/build-frontend-upgrade-acceptance-catalog.mjs`
- Create: `scripts/lib/frontend-upgrade-approved-surfaces.mjs`
- Create: `scripts/lib/frontend-upgrade-approved-mutations.mjs`
- Create: `scripts/lib/frontend-upgrade-approved-acceptance.mjs`
- Create: `scripts/check-frontend-upgrade-contracts.mjs`
- Modify: `scripts/lib/frontend-upgrade-contracts.mjs`
- Modify: `tests/frontend-upgrade-contracts.test.mjs`
- Modify: `package.json`

### 3.1 Required phase mapping

Create `docs/frontend-upgrade/phase-registry.json` with these exact route groups:

```json
{
  "version": 1,
  "spec": "docs/superpowers/specs/2026-07-10-quantgym-frontend-platform-upgrade-design.md",
  "phases": [
    { "id": 0, "name": "baseline-and-design-freeze", "routes": [] },
    { "id": 1, "name": "kernel-shell-auth", "routes": [] },
    { "id": 2, "name": "daily-training-loop", "routes": ["overview", "plan", "problems"] },
    { "id": 3, "name": "interview-and-tools", "routes": ["interview", "tools"] },
    { "id": 4, "name": "skills-economy-competition", "routes": ["skills", "league", "pk", "poker"] },
    { "id": 5, "name": "remaining-product-domains", "routes": ["experiences", "news", "community", "messages", "network", "resume", "jobs", "companies", "library", "courses", "memory", "settings", "account"] },
    { "id": 6, "name": "hardening-and-cutover", "routes": [] }
  ]
}
```

### 3.2 Required surface records

Create `docs/frontend-upgrade/surface-contracts.json`. Every record uses this schema:

```json
{
  "id": "route:overview",
  "kind": "route",
  "routeId": "overview",
  "phase": 2,
  "template": "dashboard",
  "designFiles": ["QuantGym 总览.dc.html"],
  "components": ["OverviewHero", "DailyPlanCard", "ProgressSummary", "LeaderboardPreview"],
  "entityRefs": ["User", "Plan", "PlanTask", "SkillSnapshot", "XpLedger", "LeagueEntry"],
  "readModels": ["Me", "DailyPlan", "TrainingSummary", "LeagueSummary"],
  "interactions": ["resume-training", "open-daily-task", "open-leaderboard"],
  "mutations": ["training.start-or-resume"],
  "acceptanceChecks": ["visual:overview:light-dark", "a11y:overview", "e2e:overview-resume-training"],
  "stateSetRef": "design-system.requiredStates",
  "recoveryStateSetRef": "design-system.routeRecoveryStates",
  "responsive": { "requiredViewports": ["desktop", "laptop", "mobile"], "tabletDistinct": false },
  "motion": { "profile": "panel-and-micro", "reducedMotion": true, "blocksPrimaryAction": false },
  "recoveryAcceptance": { "source": "approved-mutation-inventory", "stateSetRef": "design-system.routeRecoveryStates" },
  "deviations": []
}
```

Use the following complete inventory; do not omit or merge records:

| ID | Phase/template | Design file(s) | Components | Read models | Interactions | Acceptance journey | Tablet |
|---|---|---|---|---|---|---|---|
| `system:auth` | 1/settings-form | 登录 | AuthFrame, EmailAuthForm, GoogleAuthButton, AuthRecovery | Session, AuthChallenge | sign-in, register, reset-password, google-sign-in | auth-session-and-recovery | no |
| `system:desktop-shell` | 1/dashboard | 总览 | DesktopSidebar, TopBar, AccountMenu | Me, Navigation | navigate, collapse-sidebar, open-account | desktop-shell-keyboard-navigation | no |
| `system:mobile-shell` | 1/dashboard | 总览 | MobileHeader, MobileDrawer, BottomNavigation | Me, Navigation | open-drawer, switch-route, restore-focus | mobile-shell-navigation | no |
| `system:global-search` | 1/list-detail | 总览 | CommandPalette, SearchResults | SearchResult | open, query, keyboard-select | global-search-keyboard | no |
| `system:notifications-toast` | 1/list-detail | 总览 | NotificationCenter, ToastRegion | Notification | open, mark-read, dismiss | notifications-live-region | no |
| `system:todo` | 1/workflow-board | 计划 | TodoDock, TodoEditor | PlanTask | create, edit, complete, delete | todo-lifecycle | no |
| `system:theme-language` | 1/settings-form | 设置 | ThemeSwitch, LanguageSwitch | Preferences | switch-theme, switch-language | theme-language-persistence | no |
| `system:network-recovery` | 1/settings-form | 设置 | NetworkBanner, ErrorBoundary, RetryPanel | RuntimeStatus | retry, recover, sign-in-again | offline-and-error-recovery | no |
| `route:overview` | 2/dashboard | 总览 | OverviewHero, DailyPlanCard, ProgressSummary, LeaderboardPreview | Me, DailyPlan, TrainingSummary, LeagueSummary | resume-training, open-daily-task, open-leaderboard | overview-resume-training | no |
| `route:plan` | 2/workflow-board | 计划 | PlanSetup, Diagnostic, PlanBoard, TaskEditor | Plan, PlanTask, Recommendation | diagnose, create-plan, edit-task, complete-task | plan-recommendation | yes |
| `route:problems` | 2/list-detail | 题目 | ProblemFilters, ProblemList, ProblemDetail, AttemptComposer, HintPanel, NoteEditor | Problem, ProblemProgress, AttemptSummary, CommentSummary | filter, open, use-hint, submit-attempt, reveal-solution, save-note, toggle-favorite, complete | problem-attempt-completion | yes |
| `route:interview` | 3/focused-session | 模拟面试 | InterviewSetup, DeviceCheck, TrainingSessionShell, VoiceTextToggle, Transcript, AttachmentQueue, FeedbackPanel, FinalReport, RecommendationPanel | InterviewSessionView, AiJobView, DraftView, MediaObjectView | configure, device-check, switch-answer-mode, answer, autosave, recover, view-question-feedback, open-final-report, add-recommendations-to-plan | interview-autosave-recovery | yes |
| `route:tools` | 3/focused-session | 速算 + 报价 | ToolSelector, TrainingSessionShell, MentalMathRound, QuoteRound | TrainingSession, Attempt, QuoteRound | select-mode, submit-answer, submit-quote, finish | tools-session-completion | no |
| `route:skills` | 4/dashboard | 能力值 | SkillRadar, SkillTrend, EvidenceList | SkillSnapshot, SkillHistory | inspect-skill, open-evidence | skill-evidence-drilldown | no |
| `route:league` | 4/dashboard | 联赛 | LeagueStandings, LearningMap, RewardShop | LeagueSeason, LeagueEntry, EconomyBalance | earn-xp, open-node, inspect-reward | league-xp-reward | no |
| `route:pk` | 4/focused-session | PK | MatchLobby, TrainingSessionShell, MatchResult | PkMatch, RatingLedger | start, submit, reveal, rematch | pk-rating-result | no |
| `route:poker` | 4/focused-session | Poker | PokerLobby, TrainingSessionShell, PokerTable, ActionBar, HandHistory | PokerRoomView, PokerHandView, RatingSummary | configure, join, act, recover-session, reconnect, view-result, leave | poker-reconnect | yes |
| `route:experiences` | 5/list-detail | 面经 | ExperienceList, ExperienceEditor, SharePanel | Experience | create, edit, share, delete | experience-lifecycle | no |
| `route:news` | 5/list-detail | 新闻 | NewsFilters, NewsList, NewsDetail | NewsItem, NewsFeed | filter, open, refresh, save | news-filter-detail | no |
| `route:community` | 5/list-detail | 论坛 | PostComposer, Feed, CommentThread | Post, Comment, MediaObject | post, like, comment, message-author | community-post-thread | no |
| `route:messages` | 5/list-detail | 聊天 | ThreadList, MessageTimeline, MessageComposer | Thread, Message | open-thread, send, mark-read, reconnect | messages-send-reconnect | yes |
| `route:network` | 5/list-detail | 人脉 | ContactList, ContactEditor, FollowUpPanel | Contact | create, edit, schedule-follow-up, delete | network-contact-lifecycle | no |
| `route:resume` | 5/settings-form | 简历 | ResumeEditor, FileUpload, AiReviewPanel | ResumeProfile, AiJob, MediaObject | save, upload, request-review, retry | resume-review-job | no |
| `route:jobs` | 5/workflow-board | 求职 | JobFilters, JobList, ApplicationBoard | Job, Application | filter, save, move-application, open-source | job-application-board | no |
| `route:companies` | 5/list-detail | 公司 | CompanyFilters, CompanyList, CompanyDetail | Company | filter, open, start-practice | company-practice-handoff | no |
| `route:library` | 5/list-detail | 资料库 | LibraryFilters, ResourceGrid, Reader | LibraryItem, ReaderToken, Progress | search, open-reader, resume-reading, practice | library-reader-progress | yes |
| `route:courses` | 5/dashboard | 课程 | LearningPath, CourseList, LessonProgress | Course, LearningPath, CourseProgress | choose-path, open-course, complete-lesson | course-progress | no |
| `route:memory` | 5/list-detail | 资料笔记 | ResourceList, ResourceEditor, MediaUpload | ResourceNote, MediaObject | create, attach, edit, delete | memory-resource-lifecycle | no |
| `route:settings` | 5/settings-form | 设置 | PreferenceForm, DataControls, RuntimeStatusPanel | Preferences, RuntimeStatus, ExportJob | save, export, import, reset | settings-data-controls | no |
| `route:account` | 5/settings-form | 账户 | ProfileForm, AvatarUpload, SessionList | Me, Session, MediaObject | save-profile, upload-avatar, revoke-session | account-session-security | no |

For each row, use the full filename `QuantGym ` + the value in the Design file(s) column + `.dc.html`; `tools` uses both `QuantGym 速算.dc.html` and `QuantGym 报价.dc.html`. Every record must have three acceptance IDs with prefixes `visual:`, `a11y:`, and `e2e:` (or `contract:` for a non-interactive shared surface). Every record explicitly sets `stateSetRef`, `responsive`, `motion`, and `deviations` as shown in the schema. Routes marked Tablet `yes` add `tablet` to `requiredViewports` and set `tabletDistinct=true`. Interview and Tools use `session-feedback`; Skills, League, PK, and Poker use `reward-feedback` even when their template is focused-session; all other records use `panel-and-micro`. Every motion object requires reduced motion and forbids blocking the primary action. Each deviation record, when present, includes `reason`, `designFile`, `decision`, and `acceptanceCheck`; `reason` must be one of the four values in `allowedDeviationReasons`.

Classify all six non-surface source files at the top of `surface-contracts.json` so every one of the 30 extracted files is accounted for:

```json
"supportingSources": [
  { "file": "QuantGym UI 升级计划.dc.html", "role": "historical-design-plan" },
  { "file": "QuantGym UI 升级计划 v2.dc.html", "role": "approved-design-plan" },
  { "file": "README.md", "role": "archive-guide" },
  { "file": "qg-state.js", "role": "reference-state-fixture" },
  { "file": "support.js", "role": "reference-interaction-fixture" },
  { "file": "吉祥物生成任务书.md", "role": "mascot-art-direction" }
]
```

Use only approved core-model names in `entityRefs`. Apply this exact surface-to-entity map; values in the table's Read models column remain presentation/read-model names and are stored separately in `readModels`:

```js
export const CORE_ENTITY_NAMES = [
  "User", "Session", "Preference",
  "ProblemSource", "Problem", "LibraryResource",
  "ProblemProgress", "Favorite", "Note",
  "TrainingSession", "Attempt", "Answer", "TrainingEvent",
  "InterviewSession", "Turn", "Attachment", "Evaluation",
  "Plan", "PlanTask", "Recommendation", "SkillSnapshot", "XpLedger", "CoinLedger",
  "RatingHistory", "LeagueSeason", "LeagueEntry", "RewardPurchase",
  "NewsItem", "Experience", "Post", "Comment", "Conversation", "Message",
  "NetworkContact", "Notification", "MediaObject", "AiJob", "AuditEvent",
  "ResumeDocument", "ResumeReview", "CompanyProfile", "JobPosting", "JobApplication",
  "Course", "CourseProgress", "MemoryResource"
];
```

```json
{
  "system:auth": ["User", "Session"],
  "system:desktop-shell": ["User", "Notification"],
  "system:mobile-shell": ["User", "Notification"],
  "system:global-search": ["Problem", "NewsItem", "CompanyProfile", "JobPosting", "Course"],
  "system:notifications-toast": ["Notification"],
  "system:todo": ["PlanTask"],
  "system:theme-language": ["Preference"],
  "system:network-recovery": ["Session", "AuditEvent"],
  "route:overview": ["User", "Plan", "PlanTask", "SkillSnapshot", "XpLedger", "LeagueEntry"],
  "route:plan": ["Plan", "PlanTask", "Recommendation"],
  "route:problems": ["ProblemSource", "Problem", "ProblemProgress", "Favorite", "Note", "TrainingSession", "Attempt", "Answer", "TrainingEvent", "Comment"],
  "route:interview": ["InterviewSession", "Turn", "Attachment", "Evaluation", "AiJob", "Plan", "Recommendation"],
  "route:tools": ["TrainingSession", "Attempt", "Answer", "TrainingEvent", "XpLedger", "CoinLedger"],
  "route:skills": ["SkillSnapshot", "TrainingEvent"],
  "route:league": ["LeagueSeason", "LeagueEntry", "XpLedger", "CoinLedger", "RewardPurchase"],
  "route:pk": ["TrainingSession", "Attempt", "RatingHistory", "XpLedger"],
  "route:poker": ["TrainingSession", "TrainingEvent", "RatingHistory", "CoinLedger"],
  "route:experiences": ["Experience"],
  "route:news": ["NewsItem"],
  "route:community": ["Post", "Comment", "Conversation", "MediaObject"],
  "route:messages": ["Conversation", "Message"],
  "route:network": ["NetworkContact"],
  "route:resume": ["ResumeDocument", "ResumeReview", "Attachment", "AiJob"],
  "route:jobs": ["JobPosting", "JobApplication"],
  "route:companies": ["CompanyProfile", "Problem"],
  "route:library": ["LibraryResource", "ProblemProgress"],
  "route:courses": ["Course", "CourseProgress"],
  "route:memory": ["MemoryResource", "MediaObject", "Note"],
  "route:settings": ["Preference", "AuditEvent"],
  "route:account": ["User", "Session", "MediaObject"]
}
```

Every surface sets `recoveryStateSetRef="design-system.routeRecoveryStates"`. Interview and Resume additionally set `aiJobStateSetRef="design-system.aiJobStates"`. Mutations include a `recoveryAcceptance` object mapping `recoverable-error`, `non-recoverable-error`, `offline-draft`, `permission-denied`, `stale-version-conflict`, and `retry` to an acceptance ID. Reward-producing routes also map retry to an idempotency acceptance ID.

`scripts/lib/frontend-upgrade-approved-mutations.mjs` is the canonical mutation inventory. Each entry has `id`, `surfaceId`, `targetPhase`, `rewardProducing`, and `ledgerMutation`. Use these exact IDs:

```text
system:auth = auth.sign-in, auth.register, auth.reset-password, auth.google-sign-in
system:notifications-toast = notifications.mark-read
system:todo = todo.create, todo.update, todo.complete, todo.delete
system:theme-language = preferences.update-theme, preferences.update-language
system:network-recovery = session.retry
route:overview = training.start-or-resume
route:plan = plan.run-diagnostic, plan.create, plan.update-task, plan.complete-task
route:problems = problems.use-hint, problems.submit-attempt, problems.reveal-solution, problems.save-note, problems.toggle-favorite, problems.complete
route:interview = interview.create-session, interview.upload-attachment, interview.autosave, interview.submit-turn, interview.finish, interview.add-recommendations-to-plan
route:tools = tools.submit-answer, tools.submit-quote, tools.finish-session
route:league = league.purchase-reward
route:pk = pk.create-match, pk.submit-attempt, pk.finish-match
route:poker = poker.join, poker.act, poker.finish-hand, poker.leave
route:experiences = experiences.create, experiences.update, experiences.share, experiences.delete
route:news = news.refresh, news.save
route:community = community.create-post, community.like, community.comment, community.message-author
route:messages = messages.send, messages.mark-read
route:network = network.create, network.update, network.schedule-follow-up, network.delete
route:resume = resume.save, resume.upload, resume.request-review, resume.retry-review
route:jobs = jobs.save, jobs.move-application
route:courses = courses.complete-lesson
route:memory = memory.create, memory.attach, memory.update, memory.delete
route:settings = settings.save, settings.export, settings.import, settings.reset
route:account = account.save-profile, account.upload-avatar, account.revoke-session
```

Desktop shell, mobile shell, global search, Skills, Companies, and Library have no write mutation in this phase contract. Mark `rewardProducing=true` for `problems.complete`, `interview.finish`, `tools.finish-session`, `pk.finish-match`, and `poker.finish-hand`. Mark `ledgerMutation=true` for those five plus `league.purchase-reward`; every such mutation receives a generated `retry-idempotency` acceptance ID. Every mutation receives six generated recovery acceptance IDs. Tests deep-compare this full inventory and reject adding, removing, renaming, or changing a flag.

`scripts/lib/frontend-upgrade-approved-acceptance.mjs` freezes status policy rather than letting the generated catalog downgrade checks. All 150 route visual/axe cases, the 26 currently reachable shared-state cases, and all Task 5 core-flow results are `legacy-baseline` Phase 0 evidence. Exactly these six shared-state IDs are `future-gate` with `targetPhase=1`: Notification Center open, Notification Center empty, Network Recovery offline draft, recoverable error, stale conflict, and permission-denied retry. All target-architecture journey, mutation-recovery, and idempotency acceptances remain `future-gate` until their declared target phase. Any catalog change from evidence-backed to future, or any target phase change, fails canonical comparison.

- [ ] **Step 1: Extend tests before implementation**

Add tests that deliberately create a duplicate route, omit League, reference a missing design file, put a route in the wrong phase, remove one system surface, and leave an acceptance array empty. The valid fixture must report:

```js
assert.equal(routeSurfaces.length, 22);
assert.equal(systemSurfaces.length, 8);
assert.equal(new Set(routeSurfaces.map((item) => item.routeId)).size, 22);
assert.deepEqual(validateSurfaceContracts(validSurfaces, validRegistry, designManifest, manifestIds), []);
```

The test fixture contains the canonical inventory from the table and entity map. Mutating any approved component, entity reference, read model, interaction, phase, template, tablet flag, state reference, motion profile, or acceptance journey must fail with a field-specific message.

Run and confirm the new tests fail because the Task 3 exports and cross-file validation do not exist yet:

```bash
node --test tests/frontend-upgrade-contracts.test.mjs
```

- [ ] **Step 2: Implement cross-file validation**

`validateSurfaceContracts` must:

1. compare route IDs as sets against `MODULE_MANIFEST`;
2. reject duplicate route or surface IDs;
3. require the eight system IDs above;
4. require every referenced design filename to exist in `source-manifest.json`;
5. require the set of extracted source filenames to equal the union of referenced design files and supporting sources; supporting sources must be unique and must not also be used as a surface design file;
6. require phase/template/components/entityRefs/readModels/interactions/acceptance values plus explicit state, responsive, motion, and deviation mappings;
7. require exactly one route phase in 2–5 and match `phase-registry.json`;
8. require all three acceptance categories;
9. allow `tabletDistinct=true` only for Plan, Problems, Interview, Poker, Messages, and Library;
10. require `reducedMotion=true` and `blocksPrimaryAction=false` on every surface.
11. reject a deviation without an allowed reason, source design file, documented decision, or acceptance check.
12. deep-compare every surface against `CANONICAL_SURFACE_INVENTORY` in `scripts/lib/frontend-upgrade-approved-surfaces.mjs`, transcribed from this plan's table/entity map; require all eight system surfaces in Phase 1, exactly the six approved tablet routes, and the approved motion profile by route family. Unit tests mutate one field at a time and must not import the JSON under test as their expected value.
13. require `entityRefs` to be members of the specification's core-model catalog and keep presentation-only names in `readModels`.
14. require the approved recovery-state mapping on every surface and the AI-job state mapping on Interview and Resume.
15. deep-compare surface mutation IDs and flags against `APPROVED_MUTATION_INVENTORY`, generate all six recovery acceptance IDs per mutation, and require retry idempotency for every reward/ledger mutation.
16. deep-compare evidence status and target phase against `APPROVED_ACCEPTANCE_POLICY`; a generator cannot downgrade a current baseline or move a future gate.

`scripts/check-frontend-upgrade-contracts.mjs` loads the three JSON contracts, `MODULE_MANIFEST`, and the source manifest; it exits non-zero on any failure and prints counts on success.

`scripts/build-frontend-upgrade-acceptance-catalog.mjs` then builds `acceptance-catalog.json`. Each acceptance entry includes `id`, `surfaceId`, `kind`, `phase0Evidence`, `targetPhase`, `targetCommand`, and `expectedStatus`. Visual and axe entries point to either the route matrix or shared-state matrix in Task 6; Phase 0 e2e entries point to an exact core-flow interaction name; future architecture journeys are marked `expectedStatus="future-gate"` with their required phase, and the generator forms each target command as `` `npm run test:e2e:v2 -- --grep @${entry.id}` ``, never as already passing. Task 3 validates paths and mappings but allows Task 5/6 evidence files to be not-yet-created; Task 11 requires every Phase 0 evidence target to exist and contain the mapped case/interaction. The contracts checker rejects any acceptance ID without one catalog entry or any duplicate/orphan catalog entry.

Add to `package.json`:

```json
"check:frontend-upgrade-contracts": "node scripts/check-frontend-upgrade-contracts.mjs"
```

- [ ] **Step 3: Verify and commit**

```bash
node --test tests/frontend-upgrade-contracts.test.mjs
node scripts/build-frontend-upgrade-acceptance-catalog.mjs
npm run check:frontend-upgrade-contracts
git add package.json docs/frontend-upgrade/phase-registry.json docs/frontend-upgrade/surface-contracts.json docs/frontend-upgrade/acceptance-catalog.json scripts/build-frontend-upgrade-acceptance-catalog.mjs scripts/check-frontend-upgrade-contracts.mjs scripts/lib/frontend-upgrade-approved-surfaces.mjs scripts/lib/frontend-upgrade-approved-mutations.mjs scripts/lib/frontend-upgrade-approved-acceptance.mjs scripts/lib/frontend-upgrade-contracts.mjs tests/frontend-upgrade-contracts.test.mjs
git diff --cached --check
git commit -m "docs: map frontend upgrade surfaces"
```

---

## Task 4: Own Legacy Deletion and Guard the v2 Boundary

**Files**

- Create: `docs/frontend-upgrade/legacy-removal-map.json`
- Create: `scripts/check-frontend-v2-boundaries.mjs`
- Create: `tests/frontend-v2-boundaries.test.mjs`
- Modify: `scripts/lib/frontend-upgrade-contracts.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing boundary and removal-map tests**

Tests must prove:

- typed domain code importing `src/shared/api` is allowed;
- imports resolving into any declared legacy root are rejected, including api, app, components, features, hooks, layouts, lib, modules, old pages, router/routes, state, stores, styles, and ui;
- `quantgym:*`, document-owned selectors/listeners in a domain, and direct `fetch` outside `src/shared/api` are rejected;
- each legacy family has a target domain, replacement path, removal phase, unique priority, matched tracked file, and exit checks;
- an overlap is accepted only when a single highest-priority family owns it;
- a tracked legacy file that matches no family fails.

Run:

```bash
node --test tests/frontend-v2-boundaries.test.mjs
```

Expected: `ERR_MODULE_NOT_FOUND` because the boundary script does not yet exist.

- [ ] **Step 2: Create the removal-map schema and complete families**

`docs/frontend-upgrade/legacy-removal-map.json` must contain:

```json
{
  "version": 1,
  "legacyRoots": [
    "src/api", "src/app", "src/components", "src/features", "src/hooks", "src/layouts", "src/lib",
    "src/modules", "src/pages", "src/router", "src/routes", "src/state", "src/stores", "src/styles", "src/ui",
    "src/App.jsx", "src/catalog-data.js", "src/constants.js", "src/i18n.js", "src/main.js", "src/main.jsx",
    "src/prep-data.js", "src/router.js", "src/skills.js", "index.html", "config.js",
    "data/leetcode-hot-100.js", "data/library-catalog.js", "data/problem-catalog.js", "styles.css"
  ],
  "families": [
    {
      "id": "shell-auth",
      "removeInPhase": 1,
      "priority": 60,
      "globs": ["src/components/shell/**", "src/layouts/**", "src/router/**", "src/routes/**", "src/App.jsx", "src/main.jsx", "src/ui/appShellController.js", "src/ui/authRuntime.js", "src/styles/playful-precision-shell.css", "src/styles/playful-precision-replica-auth.css"],
      "targetDomains": ["core", "account", "design-system"],
      "replacementPaths": ["src/core/router", "src/core/providers", "src/domains/account", "src/design-system/patterns", "src/pages/v2"],
      "exitChecks": ["new shell starts without legacy bootstrap", "auth credentials are not persisted in browser storage"]
    },
    {
      "id": "daily-training",
      "removeInPhase": 2,
      "priority": 50,
      "globs": ["src/features/overview/**", "src/features/plan/**", "src/features/problems/**", "src/modules/overview/**", "src/modules/plan/**", "src/modules/problems/**", "src/pages/OverviewPage.jsx", "src/pages/PlanPage.jsx", "src/pages/ProblemsPage.jsx", "src/app/services/overviewPageApi.js", "src/app/services/planPageApi.js", "src/app/services/problemsPageApi.js"],
      "targetDomains": ["plan", "problems", "training"],
      "replacementPaths": ["src/domains/plan", "src/domains/problems", "src/domains/training", "src/pages/training"],
      "exitChecks": ["daily training e2e passes", "duplicate local and server training state is removed"]
    },
    {
      "id": "interview-tools",
      "removeInPhase": 3,
      "priority": 50,
      "globs": ["src/features/interview/**", "src/features/tools/**", "src/modules/interview/**", "src/modules/tools/**", "src/pages/InterviewPage.jsx", "src/pages/ToolsPage.jsx", "src/app/services/interviewPageApi.js", "src/app/services/toolsPageApi.js"],
      "targetDomains": ["interview", "training"],
      "replacementPaths": ["src/domains/interview", "src/domains/training", "src/pages/training"],
      "exitChecks": ["AI job recovery e2e passes", "legacy interview and tools controllers are absent"]
    },
    {
      "id": "growth-competition",
      "removeInPhase": 4,
      "priority": 50,
      "globs": ["src/features/skills/**", "src/features/league/**", "src/features/pk/**", "src/features/poker/**", "src/modules/skills/**", "src/modules/economy/**", "src/modules/pk/**", "src/modules/poker/**", "src/pages/SkillsPage.jsx", "src/pages/LeaguePage.jsx", "src/pages/PkPage.jsx", "src/pages/PokerPage.jsx"],
      "targetDomains": ["skills", "league", "economy", "poker", "training"],
      "replacementPaths": ["src/domains/skills", "src/domains/league", "src/domains/economy", "src/domains/poker"],
      "exitChecks": ["ledger-backed reward journeys pass", "competition routes use no client-owned balances"]
    },
    {
      "id": "remaining-domains",
      "removeInPhase": 5,
      "priority": 50,
      "globs": ["src/features/account/**", "src/features/community/**", "src/features/companies/**", "src/features/courses/**", "src/features/experiences/**", "src/features/jobs/**", "src/features/library/**", "src/features/memory/**", "src/features/messages/**", "src/features/network/**", "src/features/news/**", "src/features/resume/**", "src/features/settings/**", "src/pages/AccountPage.jsx", "src/pages/CommunityPage.jsx", "src/pages/CompaniesPage.jsx", "src/pages/CoursesPage.jsx", "src/pages/ExperiencesPage.jsx", "src/pages/JobsPage.jsx", "src/pages/LibraryPage.jsx", "src/pages/MemoryPage.jsx", "src/pages/MessagesPage.jsx", "src/pages/NetworkPage.jsx", "src/pages/NewsPage.jsx", "src/pages/ResumePage.jsx", "src/pages/SettingsPage.jsx"],
      "targetDomains": ["account", "career", "community", "resources"],
      "replacementPaths": ["src/domains/account", "src/domains/career", "src/domains/community", "src/domains/resources"],
      "exitChecks": ["all Phase 5 route journeys pass", "old feature controllers for migrated routes are absent"]
    },
    {
      "id": "static-runtime-entry",
      "removeInPhase": 6,
      "priority": 70,
      "globs": ["index.html", "config.js", "data/leetcode-hot-100.js", "data/library-catalog.js", "data/problem-catalog.js"],
      "targetDomains": ["core", "shared", "server-content"],
      "replacementPaths": ["src/core/bootstrap", "src/shared/api", "data/leetcode-hot-100.json", "data/library-catalog.json", "data/problem-catalog.json"],
      "exitChecks": ["index.html loads only the typed v2 bootstrap", "root runtime config is removed or generated from validated public config", "browser loads no catalog through classic global data scripts"]
    },
    {
      "id": "runtime-glue",
      "removeInPhase": 6,
      "priority": 10,
      "globs": ["src/api/**", "src/app/**", "src/components/common/**", "src/features/shared/**", "src/hooks/**", "src/lib/**", "src/modules/**", "src/pages/*Page.jsx", "src/router/**", "src/routes/**", "src/state/**", "src/stores/**", "src/styles/**", "src/ui/**", "src/App.jsx", "src/catalog-data.js", "src/constants.js", "src/i18n.js", "src/main.js", "src/main.jsx", "src/prep-data.js", "src/router.js", "src/skills.js", "styles.css"],
      "targetDomains": ["core", "shared", "design-system"],
      "replacementPaths": ["src/core", "src/shared", "src/design-system", "src/pages/v2"],
      "exitChecks": ["legacy adapter is absent", "old store bridge and event bus are absent", "duplicate CSS is absent"]
    }
  ]
}
```

The validator resolves overlap by highest numeric priority and fails if highest priority ties. It expands globs against `git ls-files`; each family must match at least one current file, and every tracked file under `legacyRoots` must resolve to one owner. A tracked path under any declared `replacementPaths` subtree is target code and is excluded from legacy ownership, which is how future `src/pages/v2/**` files coexist with the current top-level page wrappers. Phase 6 removes those wrappers and promotes the nested v2 page entries into the final `src/pages` layout. Locale dictionaries and data-only catalogs outside the explicitly listed root files are not deletion-map inputs.

Tests require exactly the seven family IDs `shell-auth`, `daily-training`, `interview-tools`, `growth-competition`, `remaining-domains`, `static-runtime-entry`, and `runtime-glue`. The JSON catalog files remain governed content/import inputs; only their legacy browser-global `.js` mirrors are removed.

- [ ] **Step 3: Implement the v2 scanner**

Scan `src/core`, `src/design-system`, `src/domains`, `src/shared`, and `src/pages/v2` for `.js/.jsx/.ts/.tsx`. Export `findBoundaryViolations(root)`, returning a sorted array of `{ file, rule, evidence }` records.

Rules:

```js
const RULES = {
  legacySymbol: /\b(?:createAppContext|usePageApi|AppServicesContext|storeBridge)\b/,
  eventBus: /["']quantgym:[^"']+["']/,
  directFetch: /\b(?:fetch|window\.fetch|globalThis\.fetch)\s*\(/,
  domainDom: /\b(?:document\.|window\.addEventListener\s*\()/
};
```

Parse static imports, dynamic imports, and `require()` specifiers; resolve relative paths and aliases to repository paths; and derive the forbidden legacy import roots from `legacy-removal-map.json` rather than maintaining a second list. Permit only the new `src/pages/v2` subtree when the legacy root is `src/pages`. Allow direct fetch only under `src/shared/api/`; apply `domainDom` only under `src/domains/`. CLI execution must also validate the removal map.

Add:

```json
"check:frontend-v2-boundaries": "node scripts/check-frontend-v2-boundaries.mjs"
```

- [ ] **Step 4: Verify and commit**

```bash
node --test tests/frontend-v2-boundaries.test.mjs
npm run check:frontend-v2-boundaries
git add package.json docs/frontend-upgrade/legacy-removal-map.json scripts/check-frontend-v2-boundaries.mjs scripts/lib/frontend-upgrade-contracts.mjs tests/frontend-v2-boundaries.test.mjs
git diff --cached --check
git commit -m "chore: guard frontend v2 migration boundaries"
```

---

## Task 5: Close League Ownership and Capture the Current Core-Flow Baseline

**Files**

- Create: `scripts/lib/browser-route-targets.mjs`
- Create: `tests/browser-route-targets.test.mjs`
- Create: `tests/build-static-site-isolation.test.mjs`
- Modify: `scripts/check-browser-route-smoke.mjs`
- Modify: `scripts/build-static-site.mjs`
- Modify: `src/modules/ownership.js`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json`

This task changes QA ownership/evidence only; it does not change League product behavior.

- [ ] **Step 1: Extract route selectors without League and write the failing coverage test**

Move the existing 21-entry `routeTargets` map from `check-browser-route-smoke.mjs` to an exported `ROUTE_TARGETS` without adding League yet. Add the manifest-coverage test:

```js
test("browser route targets cover the current manifest exactly", () => {
  assert.deepEqual(Object.keys(ROUTE_TARGETS).sort(), MODULE_MANIFEST.map((item) => item.id).sort());
});
```

Run and expect failure listing `league`:

```bash
node --test tests/browser-route-targets.test.mjs
```

- [ ] **Step 2: Add one League interaction baseline**

Add the League target and `runLeagueStandingsLearningMapAndShopFlow` to the existing browser smoke interactions:

```js
league: ["#leaguePageTitle", "#leagueStandings", "#leagueLearningMap", "#leagueRewardShop"]
```

The interaction must:

1. navigate to `/league` and wait for all four selectors;
2. assert standings rows, learning nodes, and shop items render;
3. click `.qg-lg-live-btn`, verify `/tools`, then navigate back;
4. click one shop action and verify `.qg-fb-toasts .qg-fb-toast` appears without a page error;
5. return a pass record named `league standings, learning map, and reward shop guard`.

Add the matching ownership record to `src/modules/ownership.js`:

```js
{
  id: "league",
  owner: "growth",
  navGroup: "growth",
  page: "src/pages/LeaguePage.jsx",
  featureEntry: "src/features/league/LeaguePageContent.jsx",
  stateDomains: ["userState", "league", "economy"],
  browserSmokeInteractions: ["league standings, learning map, and reward shop guard"]
}
```

Before running any browser build, add a failing `build-static-site-isolation` fixture that creates conflicting `.env` and runtime-config values and expects explicit isolation flags to win. Run it against the current build script and confirm red. Then add `QUANTGYM_WEB_IGNORE_DOTENV=1` before `loadEnvFromProjectRoot()` and `QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG=1` before loading root `config.js`. The flags apply only when explicitly set and do not change normal beta/production builds.

```bash
node --test tests/build-static-site-isolation.test.mjs
```

The green fixture proves temporary `.env` and root Google values are ignored, built Google login is disabled with an empty client ID, and only explicit local test API/LLM endpoints appear in the temporary build.

Also add a stable built-runtime fingerprint to the browser summary. Canonically hash the complete temporary `dist/` output after excluding `version.json` and normalizing only the `buildCommit`, `buildBranch`, and `buildSource` values inside built `config.js` to fixed sentinel strings; include every other `config.js` value, copied data, public file, bundle, CSS file, and generated asset. Record real provenance separately. Do not use the current Git commit or a partial source-file list as the only freshness signal.

- [ ] **Step 3: Run the full flow suite and ownership gate**

```bash
node --test tests/browser-route-targets.test.mjs
node --test tests/build-static-site-isolation.test.mjs
QUANTGYM_WEB_IGNORE_DOTENV=1 QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG=1 QUANTGYM_WEB_API_ENDPOINT=http://127.0.0.1:8790/api QUANTGYM_WEB_LLM_ENDPOINT=http://127.0.0.1:8787/interview QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=false node scripts/check-browser-route-smoke.mjs --summary docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
node scripts/check-module-ownership.mjs --summary docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
```

Expected: 22/22 routes pass, the League interaction passes, all existing interactions pass, no unexpected console/page/first-party response error occurs, and module ownership covers all 22 routes.

- [ ] **Step 4: Commit**

```bash
git add scripts/lib/browser-route-targets.mjs tests/browser-route-targets.test.mjs tests/build-static-site-isolation.test.mjs scripts/build-static-site.mjs scripts/check-browser-route-smoke.mjs src/modules/ownership.js docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
git diff --cached --check
git commit -m "test: baseline all frontend core flows"
```

---

## Task 6: Capture Reproducible Visual, Accessibility, and Performance Baselines

**Files**

- Create: `docs/frontend-upgrade/baseline-methodology.md`
- Create: `scripts/lib/frontend-upgrade-browser-harness.mjs`
- Create: `scripts/lib/frontend-upgrade-baseline.mjs`
- Create: `scripts/capture-frontend-upgrade-baseline.mjs`
- Create: `scripts/capture-frontend-upgrade-performance.mjs`
- Create: `tests/frontend-upgrade-baseline.test.mjs`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json`
- Generate tracked review images: `docs/browser-audit-screenshots/370-frontend-upgrade-review/*.jpg`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-performance-baseline-summary.json`
- Generate ignored: `artifacts/frontend-upgrade/baseline/**/*.png`
- Modify: `package.json`, `package-lock.json`

- [ ] **Step 1: Pin axe and write failing matrix tests**

```bash
npm install --save-dev --save-exact @axe-core/playwright@4.12.1
```

The case matrix is:

- 23 routable surfaces: auth plus 22 routes;
- light and dark themes;
- desktop, laptop, and mobile for every surface;
- tablet for the six `tabletDistinct` routes from Task 3.

Expected total: `(23 × 2 × 3) + (6 × 2) = 150`.

```js
test("builds the complete light-dark viewport matrix", () => {
  const cases = buildCaptureCases(routeFixtures, surfaceContracts);
  assert.equal(cases.length, 150);
  assert.equal(new Set(cases.map((item) => item.id)).size, 150);
  assert.equal(cases.filter((item) => item.theme === "dark").length, 75);
  assert.equal(cases.filter((item) => item.viewport.id === "tablet").length, 12);
});
```

Add a second 32-entry shared-state inventory: four deterministic interaction/state entries for each of the eight shared surfaces. Phase 0 captures only states reachable in the current product and records target-only states as future gates; it does not build missing Phase 1 UI.

```text
auth: registration-error, password-reset, keyboard-focus, reduced-motion
desktop-shell: collapsed-light, expanded-dark, keyboard-focus, reduced-motion
mobile-shell: drawer-open-light, drawer-open-dark, keyboard-focus, reduced-motion
global-search: results-open, keyboard-focus, empty, reduced-motion
notifications-toast: center-open [future], live-toast, empty [future], reduced-motion
todo: dock-open, editor-focus, empty-mobile, reduced-motion-mobile
theme-language: theme-focus, language-focus, mobile-controls, reduced-motion-mobile
network-recovery: offline-draft [future], recoverable-error [future], stale-conflict [future], permission-denied-retry [future]
```

Every state entry specifies theme, viewport, setup interaction or network interception, focus target, expected selector/text/ARIA state, and the acceptance IDs it satisfies. Tests require exactly 32 unique entries and all eight shared surface IDs: 26 `current-capture` entries and 6 `future-gate` entries. A `future-gate` entry has `targetPhase=1`, no screenshot claim, and a concrete target command; the capture CLI must skip it and must never report it as passed.

Run and expect `ERR_MODULE_NOT_FOUND`:

```bash
node --test tests/frontend-upgrade-baseline.test.mjs
```

- [ ] **Step 2: Implement an internal production-build harness**

`frontend-upgrade-browser-harness.mjs` must:

1. create temporary `dist` and port values;
2. run `scripts/build-static-site.mjs` with `QUANTGYM_WEB_DIST` set to the temporary directory, `QUANTGYM_WEB_IGNORE_DOTENV=1`, `QUANTGYM_WEB_IGNORE_RUNTIME_CONFIG=1`, explicit local non-secret API/LLM test endpoints, an explicit empty Google client ID, and Google login disabled;
3. start Vite with the argument array `preview`, `--host`, `127.0.0.1`, `--port`, `String(port)`, `--outDir`, and `distDir`;
4. wait for `/version.json` before returning;
5. locate Google Chrome using the same paths as the existing browser smoke;
6. expose `distRuntimeFingerprint(distDir)`, `sha256File(path)`, and cleanup with the repository's timeout helper. `distRuntimeFingerprint` hashes every built file path and bytes in lexical path order, excludes `version.json`, and canonicalizes only `buildCommit`, `buildBranch`, and `buildSource` in built `config.js`; tests prove a provenance-only change is stable and every non-provenance change alters the hash.

Reuse the Task 5 build-isolation flags. Baseline tests repeat the assertion that `.env` and root-runtime Google values are ignored, then prove the dist fingerprint is order-independent and changes when any built runtime/data/config file changes.

- [ ] **Step 3: Implement strict capture and axe scanning**

For every route and shared-state case:

- seed a local account with `lastAuthenticatedAt` set by `new Date().toISOString()`;
- seed the requested theme before app scripts run;
- navigate with `new URL(case.path, baseUrl).href`, never a `URL` object;
- require HTTP status below 400, exact final pathname, the route's target selectors, correct shell visibility, no Vite overlay, body text length above 80, loaded fonts, and complete visible images;
- fail the capture on page errors, first-party response errors, or console errors outside the existing explicit third-party/local-service allowlist;
- record horizontal overflow, title visibility, primary-action visibility, document height, and axe results;
- run axe tags `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa`;
- take a full-page PNG under ignored `artifacts/` and record its SHA-256 and byte count;
- record dist runtime fingerprint, explicit build-environment flags, Chrome version, build mode, locale, theme, viewport, route selectors, and axe version.

Initial accessibility and layout findings are measurements, not automatically waived. The summary is `captured-with-findings` when navigation/runtime checks pass but quality findings exist; the review packet lists every serious/critical axe violation and every overflow/hidden-primary-action finding. A later phase may only improve or explicitly replace that baseline.

The route summary must contain 150 successful captures. The shared-state summary must contain 26 successful current captures and 6 explicit future gates, with zero navigation/runtime capture failures among the current captures. The script also writes 29 optimized tracked JPEG review images at quality 72: one laptop/light representative for each route, auth, and each currently reachable non-auth shared surface; Network Recovery remains a mapped Phase 1 future gate and has no fabricated screenshot. Full-resolution PNGs remain ignored. The tracked review manifest records each JPEG's source case, dimensions, bytes, and SHA-256 so an independent reviewer can inspect every currently reachable surface from a fresh checkout.

- [ ] **Step 4: Implement the performance and bundle baseline**

Audit auth, overview, problems, interview, league, and messages at laptop and mobile in light theme with a cold browser context per run: 12 runs. Install a `PerformanceObserver` before navigation for LCP and layout shifts; record navigation timing, FCP, LCP, CLS, resource counts, transferred bytes, and a labelled lab interaction-latency sample. Inventory every built JS chunk with raw and gzip bytes, identify initial chunks from built `index.html`, and compare observations with target budgets:

```json
{
  "targets": {
    "lcpMs": 2500,
    "inpFieldP75Ms": 200,
    "cls": 0.1,
    "initialJsGzipBytes": 184320,
    "ordinaryRouteChunkGzipBytes": 102400,
    "horizontalOverflowPx": 0
  },
  "fieldInpBaseline": {
    "status": "unavailable-before-v2-rum",
    "substitute": "lab interaction latency is recorded but is not labelled as field INP"
  }
}
```

The script must not claim lab values are P75 field Web Vitals. `baseline-methodology.md` documents warm/cold cache, local machine limitations, the missing field INP baseline, and how future phases compare the same synthetic measurements.

- [ ] **Step 5: Run and inspect**

```bash
node --test tests/frontend-upgrade-baseline.test.mjs
node scripts/capture-frontend-upgrade-baseline.mjs
node scripts/capture-frontend-upgrade-performance.mjs
```

Expected: 150 route captures, 26 shared-state captures, 6 shared-state future gates, 29 tracked review images, 12 performance runs, no runtime capture failure, full-resolution screenshots ignored, tracked summaries valid JSON, and findings explicitly listed rather than silently discarded.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json docs/frontend-upgrade/baseline-methodology.md scripts/lib/frontend-upgrade-browser-harness.mjs scripts/lib/frontend-upgrade-baseline.mjs scripts/capture-frontend-upgrade-baseline.mjs scripts/capture-frontend-upgrade-performance.mjs tests/frontend-upgrade-baseline.test.mjs docs/browser-audit-screenshots/370-frontend-upgrade-visual-a11y-baseline-summary.json docs/browser-audit-screenshots/370-frontend-upgrade-shared-state-baseline-summary.json docs/browser-audit-screenshots/370-frontend-upgrade-performance-baseline-summary.json docs/browser-audit-screenshots/370-frontend-upgrade-review
git diff --cached --check
git commit -m "test: capture frontend quality baselines"
```

---

## Task 7: Record Legacy UI-Contract Findings Without Hiding New Failures

**Files**

- Create: `docs/frontend-upgrade/expected-legacy-ui-contract-findings.json`
- Create: `scripts/capture-legacy-ui-contract-findings.mjs`
- Create: `tests/frontend-upgrade-legacy-findings.test.mjs`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-legacy-ui-contract-summary.json`
- Modify: `package.json`

The current `check:ui-contracts` reads historical 21-route and deployed-beta evidence. Phase 0 replaces local upgrade baselines but must not rewrite historical/deployed evidence or pretend those records are current.

- [ ] **Step 1: Write parser tests**

The parser accepts only exact pairs of evidence path and League/21-route message. It fails an unexpected file, unexpected message, or an exit code other than 0/1. If the underlying command becomes green while the allowlist still has entries, the wrapper returns `pass` and reports `unusedAllowlistEntries` as a cleanup warning; a stale allowlist never turns a green gate red.

Allowed evidence paths:

```json
[
  "docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png",
  "docs/browser-audit-screenshots/312-chrome-visual-mobile-league.png",
  "docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json",
  "docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json",
  "docs/browser-audit-screenshots/314-parity-baseline-league.png",
  "docs/browser-audit-screenshots/314-parity-current-league.png",
  "docs/browser-audit-screenshots/322-ui-contract-gate-summary.json",
  "docs/browser-audit-screenshots/323-release-readiness-summary.json",
  "docs/browser-audit-screenshots/328-browser-route-smoke-summary.json",
  "docs/browser-audit-screenshots/341-external-launch-blockers-summary.json",
  "docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json"
]
```

Run and expect `ERR_MODULE_NOT_FOUND` for the parser module:

```bash
node --test tests/frontend-upgrade-legacy-findings.test.mjs
```

Allowed message families are limited to expected 22/got 21, expected 96/got 92, missing League artifacts, or historical nested gates that did not cover all routes. Store the exact regexes in `expected-legacy-ui-contract-findings.json`.

Use these exact allowlist entries:

```json
{
  "version": 1,
  "command": "npm run check:ui-contracts",
  "findings": [
    { "path": "docs/browser-audit-screenshots/312-chrome-visual-route-smoke-summary.json", "message": "^(?:desktop|mobile) route smoke count expected 22, got 21$" },
    { "path": "docs/browser-audit-screenshots/314-github-visual-parity-all-routes-summary.json", "message": "^GitHub visual parity (?:routeCount|total|pass count|route array length) expected 22, got 21$" },
    { "path": "docs/browser-audit-screenshots/322-ui-contract-gate-summary.json", "message": "^(?:UI contract route count expected 22, got 21|UI contract image artifact count expected 96, got 92|Stage 2 strict React route count expected 22, got 21)$" },
    { "path": "docs/browser-audit-screenshots/323-release-readiness-summary.json", "message": "^(?:Route interactions nested gate must cover all routes when present|nested browser route smoke must check all routes|nested browser route smoke route pass count must match all routes|nested module ownership must cover every route module|nested module ownership manifest route count must match UI contracts|nested module ownership must use browser smoke that checked every route)$" },
    { "path": "docs/browser-audit-screenshots/328-browser-route-smoke-summary.json", "message": "^browser route smoke (?:must check all routes|route pass count must match all routes)$" },
    { "path": "docs/browser-audit-screenshots/341-external-launch-blockers-summary.json", "message": "^external launch blockers must include the all-route deployed beta smoke$" },
    { "path": "docs/browser-audit-screenshots/351-deployed-beta-smoke-summary.json", "message": "^deployed beta smoke (?:must check all deployed routes|must pass all deployed routes|route result count must match expected routes)$" },
    { "path": "docs/browser-audit-screenshots/311-chrome-visual-desktop-league.png", "message": "^missing screenshot artifact$" },
    { "path": "docs/browser-audit-screenshots/312-chrome-visual-mobile-league.png", "message": "^missing screenshot artifact$" },
    { "path": "docs/browser-audit-screenshots/314-parity-baseline-league.png", "message": "^missing screenshot artifact$" },
    { "path": "docs/browser-audit-screenshots/314-parity-current-league.png", "message": "^missing screenshot artifact$" }
  ]
}
```

- [ ] **Step 2: Implement and run the actual command wrapper**

`capture-legacy-ui-contract-findings.mjs` must spawn `npm run check:ui-contracts`, parse every `✗` line, reject any line not matching the allowlist, and write the raw command exit, normalized findings, allowlist SHA-256, and status `expected-legacy-findings` or `pass`.

Add:

```json
"capture:frontend-upgrade:legacy-ui-findings": "node scripts/capture-legacy-ui-contract-findings.mjs"
```

```bash
node --test tests/frontend-upgrade-legacy-findings.test.mjs
node scripts/capture-legacy-ui-contract-findings.mjs
```

This is the only carried legacy evidence gap. If the underlying command becomes green, the wrapper records `pass`; if any unrelated failure appears, Task 7 fails.

- [ ] **Step 3: Commit**

```bash
git add package.json docs/frontend-upgrade/expected-legacy-ui-contract-findings.json scripts/capture-legacy-ui-contract-findings.mjs tests/frontend-upgrade-legacy-findings.test.mjs docs/browser-audit-screenshots/370-frontend-upgrade-legacy-ui-contract-summary.json
git diff --cached --check
git commit -m "test: classify legacy League evidence gap"
```

---

## Task 8: Define and Validate the Isolated Preview Environment

**Files**

- Create: `docs/frontend-upgrade/preview-environment.json`
- Create: `scripts/lib/frontend-upgrade-preview-contracts.mjs`
- Create: `scripts/check-frontend-upgrade-preview.mjs`
- Create: `tests/frontend-upgrade-preview-contracts.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Write failing isolation tests**

Valid contract assertions:

```js
assert.deepEqual(validatePreviewContract(valid), []);
assert.equal(valid.policies.reuseProductionDatabase, false);
assert.equal(valid.policies.reuseProductionBucket, false);
assert.equal(valid.policies.importLegacyV1, false);
assert.equal(valid.policies.dualWrite, false);
assert.equal(valid.services.llm.visibility, "internal");
```

Negative fixtures must reject beta/production hostnames, `api.quantgym.app`, `llm.quantgym.app`, `media.quantgym.app`, production resource names, credential-bearing URLs, a browser-visible LLM URL, a shared environment group, v1 import, dual-write, a non-private bucket, and names without `v2-preview`.

Run and expect `ERR_MODULE_NOT_FOUND`:

```bash
node --test tests/frontend-upgrade-preview-contracts.test.mjs
```

- [ ] **Step 2: Create the exact contract**

```json
{
  "version": 1,
  "environment": "preview-v2",
  "branch": { "name": "codex/frontend-v2-preview", "mustExistLocally": true, "mustExistOnOrigin": true },
  "resources": {
    "pagesProject": "quantgym-v2-preview",
    "apiService": "quantgym-v2-preview-api",
    "llmService": "quantgym-v2-preview-llm",
    "postgres": "quantgym-v2-preview-postgres",
    "r2Bucket": "quantgym-v2-preview-media"
  },
  "origins": {
    "web": { "valueFrom": "QUANTGYM_PREVIEW_WEB_URL", "requiredResourceToken": "quantgym-v2-preview" },
    "api": { "valueFrom": "QUANTGYM_PREVIEW_API_ORIGIN", "requiredResourceToken": "quantgym-v2-preview-api" },
    "apiBasePath": "/api/v2",
    "apiHealthPath": "/api/v2/health",
    "llmInternalHealthPath": "/health",
    "forbiddenHosts": ["beta.quantgym.app", "api.quantgym.app", "llm.quantgym.app", "media.quantgym.app"]
  },
  "services": {
    "web": { "provider": "cloudflare-pages", "visibility": "public", "artifact": "minimal-static-probe", "publishesProductData": false },
    "api": { "provider": "render", "visibility": "public", "healthPath": "/api/v2/health", "serviceValue": "api" },
    "llm": { "provider": "render", "visibility": "internal", "healthPath": "/health", "serviceValue": "llm", "browserDirectAccess": false }
  },
  "postgres": {
    "provider": "render",
    "sslRequired": true,
    "initialSchema": "empty",
    "phase1SchemaOwner": "alembic",
    "independentDatabase": true,
    "independentRole": true,
    "applicationBinding": "reserved-until-phase-1"
  },
  "r2": {
    "provider": "cloudflare-r2",
    "public": false,
    "r2DevEnabled": false,
    "credentialScope": "single-bucket-read-write",
    "testPrefix": "readiness-smoke/",
    "lifecycleDays": 7,
    "applicationBinding": "reserved-until-phase-1"
  },
  "policies": {
    "reuseProductionDatabase": false,
    "reuseProductionBucket": false,
    "reuseProductionEnvironmentGroup": false,
    "importLegacyV1": false,
    "dualWrite": false,
    "seedPolicy": "empty-or-synthetic",
    "corsPolicy": "preview-web-origin-only"
  },
  "environmentVariablesByScope": {
    "cloudflarePages": ["QUANTGYM_PREVIEW_ENVIRONMENT", "QUANTGYM_PREVIEW_SERVICE", "QUANTGYM_PREVIEW_COMMIT", "QUANTGYM_PREVIEW_BRANCH", "QUANTGYM_PREVIEW_API_BASE"],
    "renderApi": ["QUANTGYM_PREVIEW_ENVIRONMENT", "QUANTGYM_PREVIEW_SERVICE", "QUANTGYM_PREVIEW_COMMIT", "QUANTGYM_PREVIEW_LLM_INTERNAL_URL", "QUANTGYM_PREVIEW_CORS_ORIGIN"],
    "renderLlm": ["QUANTGYM_PREVIEW_ENVIRONMENT", "QUANTGYM_PREVIEW_SERVICE", "QUANTGYM_PREVIEW_COMMIT"],
    "operatorSecrets": ["CLOUDFLARE_API_TOKEN", "CLOUDFLARE_ACCOUNT_ID", "RENDER_API_KEY", "QUANTGYM_PREVIEW_POSTGRES_URL", "QUANTGYM_PREVIEW_R2_ENDPOINT", "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID", "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY"],
    "operatorEvidence": ["QUANTGYM_PREVIEW_WEB_URL", "QUANTGYM_PREVIEW_API_ORIGIN", "QUANTGYM_PREVIEW_EXPECTED_COMMIT", "QUANTGYM_PREVIEW_EXPECTED_BRANCH", "QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH"]
  }
}
```

The JSON records variable names and non-secret routing rules only, never secret values. `QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH` must resolve to `artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json`. Phase 0 proves that the reserved database and bucket exist and are isolated; binding them to the real v2 API is explicitly deferred to Phase 1. Task 8's checker validates the contract structure and policies but does not require the future branch or resources to exist yet; Task 10's live checker enforces `mustExistLocally`, `mustExistOnOrigin`, provider deployment attributes, disjoint Render environment-group sets, and authenticated provider resource evidence rather than trusting display names alone.

- [ ] **Step 3: Implement the checker and commit**

Add:

```json
"check:frontend-upgrade:preview": "node scripts/check-frontend-upgrade-preview.mjs"
```

Run:

```bash
node --test tests/frontend-upgrade-preview-contracts.test.mjs
npm run check:frontend-upgrade:preview
git add package.json docs/frontend-upgrade/preview-environment.json scripts/lib/frontend-upgrade-preview-contracts.mjs scripts/check-frontend-upgrade-preview.mjs tests/frontend-upgrade-preview-contracts.test.mjs
git diff --cached --check
git commit -m "docs: define isolated frontend v2 preview"
```

---

## Task 9: Build the Provider Packet and Temporary Preview Probes

**Files**

- Create: `docs/frontend-upgrade/preview-environment-runbook.md`
- Create: `scripts/build-frontend-upgrade-preview-web.mjs`
- Create: `scripts/build-frontend-upgrade-preview-packet.mjs`
- Create: `scripts/build-frontend-upgrade-provider-evidence.mjs`
- Create: `scripts/serve-frontend-upgrade-preview-probe.mjs`
- Create: `tests/frontend-upgrade-preview-probe.test.mjs`
- Generate ignored: `artifacts/frontend-upgrade/preview-environment/*`
- Modify: `.gitignore`, `package.json`

- [ ] **Step 1: Test the probe and packet before implementation**

Probe tests start API and LLM probes on ephemeral ports and require:

```json
{
  "status": "ok",
  "environment": "preview-v2",
  "service": "api",
  "commit": "non-empty",
  "legacySchemaLoaded": false
}
```

The LLM fixture returns the same envelope with `service="llm"`. The API probe `/api/v2/health` calls the internal LLM `/health` and accepts it only when environment is `preview-v2`, service is `llm`, and commit matches the API commit. The API response returns booleans and the verified LLM commit, never the internal URL. Both probes read Render `PORT`, bind `0.0.0.0`, require `QUANTGYM_PREVIEW_SERVICE=api|llm`, and require the commit to match Render's `RENDER_GIT_COMMIT`. The web builder similarly uses `CF_PAGES_COMMIT_SHA` and `CF_PAGES_BRANCH`. Neither probe imports `api-server/server.py`, uses `api-server/postgres/schema.sql`, calls OpenAI, or writes a database.

The web-builder fixture must produce only `index.html`, `config.json`, and `version.json`. Tests reject any copied `data/`, problem catalog, jobs feed, root `config.js`, Google client ID, LLM URL, bearer token, or credential-shaped text.

Provider-evidence fixtures include extra analytics, environment, token, and secret fields. Tests require the builder to discard them in memory, write only the allowlisted redacted schema, support an empty production group array, reject overlapping Preview/production groups, and reject incorrect Pages/Render branch, repo, build/start command, destination, service type (`web_service` for API and `private_service` for LLM), Node version, deployment commit, or non-success deployment status.

Packet tests require these files:

```text
README.md
cloudflare-pages-runbook.md
render-services-runbook.md
postgres-runbook.md
r2-runbook.md
cloudflare-pages-env-template.txt
render-api-env-template.txt
render-llm-env-template.txt
operator-live-check-env-template.txt
provider-evidence-schema.json
manual-signoff-checklist.csv
```

Run and expect failure because the packet builder, web builder, and probe do not exist:

```bash
node --test tests/frontend-upgrade-preview-probe.test.mjs
```

- [ ] **Step 2: Implement exact provider instructions**

The generated packet and tracked runbook must state:

- Cloudflare Pages uses project `quantgym-v2-preview`, branch `codex/frontend-v2-preview`, build `npm ci && node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview`, and output `dist-preview`. The minimal probe contains no current app bundle, v1 catalog, private question data, jobs data, root runtime config, Google OAuth config, or browser LLM endpoint.
- The web probe exposes only environment, service=`web`, commit, branch, buildSource=`cloudflare-pages`, and the exact API base formed from `QUANTGYM_PREVIEW_API_ORIGIN` plus `/api/v2`, supplied through `QUANTGYM_PREVIEW_API_BASE` at deploy time.
- Render uses separate `quantgym-v2-preview-api` public web service and `quantgym-v2-preview-llm` private service, with no production environment group. Both use Node `20.20.2`, build command `npm ci`, and start command `node scripts/serve-frontend-upgrade-preview-probe.mjs`; their `QUANTGYM_PREVIEW_SERVICE` values are exactly `api` and `llm`.
- The API service sets `QUANTGYM_PREVIEW_LLM_INTERNAL_URL` to the private LLM origin and `QUANTGYM_PREVIEW_CORS_ORIGIN` to the actual Preview Pages origin. It serves health only at `/api/v2/health`, permits that one CORS origin, and rejects `https://beta.quantgym.app` and unrelated origins.
- PostgreSQL resource `quantgym-v2-preview-postgres` has a distinct database and role, SSL, backup policy, zero legacy tables, and no use of `scripts/import-api-sqlite-export-to-postgres.py` or `api-server/postgres/schema.sql`.
- R2 bucket `quantgym-v2-preview-media` remains private, has no `r2.dev`, uses one-bucket read/write credentials, a 7-day cleanup rule for `readiness-smoke/`, and CORS restricted to the Preview web origin when browser upload testing begins.
- PostgreSQL and R2 are reserved, independently verified resources in Phase 0; the temporary API probe is intentionally not bound to either. Phase 1 performs the first application binding and schema migration.
- The browser receives only the Preview API base. It never receives an OpenAI key, R2 secret, Postgres URL, or internal LLM URL; no OpenAI key is configured anywhere in the Phase 0 probes.
- The operator records budget owner, data-reset owner, resource expiry/review date, rollback, and destroy steps.

The four scope-specific env templates contain only variables allowed by `preview-environment.json`; generated artifacts remain ignored. `provider-evidence-schema.json` requires authenticated source, capture time, operator, budget owner, destroy owner, and these allowlisted sections:

```text
cloudflare.accountIdHash
cloudflare.pages.{projectIdHash,name,productionBranch,buildCommand,destinationDir,latestDeploymentCommit,latestDeploymentStatus}
cloudflare.productionPagesProjectIdHash
cloudflare.r2.{bucketIdentityHash,bucketName,jurisdiction,endpointAccountIdHash,private,r2DevEnabled,credentialScope,signingRegion,lifecycleDays,corsOrigin}
cloudflare.productionR2BucketIdentityHash
render.workspaceIdHash
render.services[].{serviceIdHash,name,type,repo,branch,buildCommand,startCommand,nodeVersion,linkedGroupIdHashes[]}
render.productionServiceIdHashes[]
render.previewAllowedGroupIdHashes[]
render.productionGroupIdHashes[]
render.postgres.{resourceIdHash,hostHash,databaseHash,roleHash}
render.productionPostgresResourceIdHash
```

Production environment-group arrays may be empty. Each Preview service's complete linked-group set must be a subset of `previewAllowedGroupIdHashes` and disjoint from `productionGroupIdHashes`; API and LLM may also use service-level variables. R2 identity is the authenticated tuple `(Cloudflare account ID, bucket name, jurisdiction)` because R2 buckets do not rely on a repository-owned opaque ID; normalize a missing jurisdiction to `default`, hash that tuple, and fix SigV4 signing region to `auto`. `build-frontend-upgrade-provider-evidence.mjs` reads `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and `RENDER_API_KEY` only from the operator process environment, calls the Cloudflare and Render HTTPS APIs directly, keeps complete responses in memory, immediately selects only the fields above, hashes raw IDs/host/database/role values, validates names and deployment attributes, and writes exactly `artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json`. The tokens are operator-only: they appear as blank names in `operator-live-check-env-template.txt`, are never configured on Pages/Render services, and are unset after the check. Raw provider responses, analytics tokens, deployment environment metadata, and credentials must never be written to disk or echoed; HTTP failures log only provider name, status code, and non-sensitive request ID, never a response body. The packet records only the redacted file and its SHA-256.

Add `dist-preview/` to `.gitignore`; the minimal Pages output is deployment material, not a tracked artifact.

- [ ] **Step 3: Verify and commit**

Add scripts:

```json
"build:frontend-upgrade:preview-packet": "node scripts/build-frontend-upgrade-preview-packet.mjs",
"build:frontend-upgrade:preview-web": "node scripts/build-frontend-upgrade-preview-web.mjs --out-dir dist-preview",
"build:frontend-upgrade:provider-evidence": "node scripts/build-frontend-upgrade-provider-evidence.mjs",
"serve:frontend-upgrade:preview-probe": "node scripts/serve-frontend-upgrade-preview-probe.mjs"
```

Run:

```bash
node --test tests/frontend-upgrade-preview-probe.test.mjs
npm run build:frontend-upgrade:preview-packet
npm run check:repo-hygiene
git add .gitignore package.json docs/frontend-upgrade/preview-environment-runbook.md scripts/build-frontend-upgrade-preview-web.mjs scripts/build-frontend-upgrade-preview-packet.mjs scripts/build-frontend-upgrade-provider-evidence.mjs scripts/serve-frontend-upgrade-preview-probe.mjs tests/frontend-upgrade-preview-probe.test.mjs
git diff --cached --check
git commit -m "chore: build frontend v2 preview packet"
```

---

## Task 10: Provision and Prove the Live Preview Isolation

**Files**

- Create: `scripts/check-frontend-upgrade-preview-live.mjs`
- Create: `scripts/check-frontend-upgrade-preview-postgres.py`
- Create: `scripts/check-frontend-upgrade-preview-r2.mjs`
- Create: `tests/frontend-upgrade-preview-live.test.mjs`
- Create: `tests/test_frontend_upgrade_preview_postgres.py`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json`
- Modify: `package.json`

- [ ] **Step 1: Implement offline fixtures first**

Tests use local fake HTTPS/HTTP and fake `psycopg`/S3 endpoints. They must prove:

- URLs with credentials, query secrets, beta/production hosts, localhost in live mode, or wrong commit are rejected;
- wrong branch, missing `cloudflare-pages` build source, mismatched provider identity, a Preview linked-group outside the approved Preview set, or any overlap with the production group set is rejected;
- provider evidence missing authenticated source, account/workspace identity, capture time, operator, budget owner, or destroy owner is rejected, as is any evidence object containing credential fields;
- output redacts database host, role, database, bucket, access key, and all secrets;
- Postgres resource fingerprint must differ from trusted production evidence; DSN host hash plus queried database/role hashes must match the authenticated Preview Postgres evidence; the active connection must appear in `pg_stat_ssl`; and public user-table count must be zero;
- R2 PUT/GET/DELETE bytes match and the test object is deleted even after a failed assertion;
- R2 provider evidence must bind the endpoint account hash and bucket name/jurisdiction tuple to the authenticated Cloudflare account, use signing region `auto`, and confirm private access, disabled `r2.dev`, bucket-scoped token, seven-day lifecycle, and exact Preview CORS origin;
- internal LLM health is observed through API health, never directly from the browser/live checker, and fails when environment/service/commit differs;
- CORS preflight accepts only the Preview web origin and rejects beta plus an unrelated origin.

Run and expect module/file-not-found failures before implementing the checkers:

```bash
node --test tests/frontend-upgrade-preview-live.test.mjs
python3 -m unittest discover -s tests -p 'test_frontend_upgrade_preview_postgres.py' -v
```

- [ ] **Step 2: Implement the three live checks**

`check-frontend-upgrade-preview-live.mjs` verifies:

1. Preview web and API origins are HTTPS DNS hosts, contain or are provider-evidenced as the contracted resources, and do not equal known beta/production hosts;
2. web `/version.json` reports expected commit, branch, environment, service=`web`, and buildSource=`cloudflare-pages`;
3. web `/config.json` contains only the exact Preview API origin plus `/api/v2`, contains no product catalog/Google/LLM setting, and contains no credential-shaped value;
4. API `/api/v2/health` reports environment=`preview-v2`, service=`api`, expected commit, `legacySchemaLoaded=false`, and a verified internal LLM envelope with environment=`preview-v2`, service=`llm`, and the same commit;
5. live `OPTIONS /api/v2/health` accepts the Preview web origin and does not grant CORS to `https://beta.quantgym.app` or `https://unrelated.invalid`;
6. authenticated provider evidence verifies Pages production branch/build command/destination/latest deployment commit and status; Render service type/repo/branch/build/start/Node version and full linked-group sets; Postgres resource identity; and the Cloudflare account/bucket identity tuple. It proves Preview resource identities differ from production and that no Preview service links a production group;
7. it invokes the Postgres and R2 checks and embeds only their redacted summaries;
8. evidence includes `checkedAt`, expires after seven days, and uses the minimal web artifact fingerprint;
9. output says `resourceIsolation="pass"` and `applicationBindings="deferred-to-phase1"`; it does not claim the probe API is bound to PostgreSQL/R2.

It reads redacted provider evidence from `QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH`, defaulting to `artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json`, validates the schema and SHA-256, and refuses raw provider response shapes or a path outside the ignored operator-evidence directory.

`check-frontend-upgrade-preview-postgres.py` connects using `QUANTGYM_PREVIEW_POSTGRES_URL`, runs `SELECT 1`, verifies the current backend PID has `ssl=true` in `pg_stat_ssl`, reads `current_database()` and `current_user`, hashes the parsed DSN host plus queried database/role, and requires all three hashes to match the authenticated Preview Postgres evidence. It also verifies the Preview resource fingerprint differs from production and requires the count of non-system base tables in `public` to be exactly zero. It sanitizes connection exceptions before output and prints hashes and booleans, not identifiers, hostnames, usernames, or DSN.

`check-frontend-upgrade-preview-r2.mjs` parses the account identifier from the R2 S3 endpoint, hashes it, and requires it to equal the authenticated Cloudflare account hash. It fixes SigV4 region to `auto`, binds the contract bucket name and jurisdiction to the authenticated identity-tuple hash, writes a random `readiness-smoke/` text object, reads and byte-compares it, deletes it in `finally`, and verifies the Preview tuple differs from production. The live aggregate additionally requires operator/provider confirmations for private access, disabled `r2.dev`, bucket-scoped token, seven-day lifecycle, and exact Preview CORS origin. Output contains hashes and status only.

Add:

```json
"test:frontend-upgrade:preview": "node --test tests/frontend-upgrade-preview-contracts.test.mjs tests/frontend-upgrade-preview-probe.test.mjs tests/frontend-upgrade-preview-live.test.mjs && python3 -m unittest discover -s tests -p 'test_frontend_upgrade_preview_postgres.py' -v",
"check:frontend-upgrade:preview:live": "node scripts/check-frontend-upgrade-preview-live.mjs"
```

- [ ] **Step 3: Commit the offline-safe tooling before external work**

```bash
node --test tests/frontend-upgrade-preview-live.test.mjs
python3 -m unittest discover -s tests -p 'test_frontend_upgrade_preview_postgres.py' -v
git add package.json scripts/check-frontend-upgrade-preview-live.mjs scripts/check-frontend-upgrade-preview-postgres.py scripts/check-frontend-upgrade-preview-r2.mjs tests/frontend-upgrade-preview-live.test.mjs tests/test_frontend_upgrade_preview_postgres.py
git diff --cached --check
git commit -m "test: verify frontend v2 preview isolation"
```

- [ ] **Step 4: Stop for explicit external-provisioning authorization**

Before using Render or Cloudflare credentials, report the exact resources, expected plan/cost choices, and intended branch to the user. Continue only after explicit authorization.

With authorization, an authenticated operator performs the runbook:

1. verify the isolated implementation worktree is clean and on `codex/frontend-v2-preview`, confirm the scoped commits, and push that exact branch to `origin`;
2. create Cloudflare Pages project `quantgym-v2-preview` for the pushed branch and minimal `dist-preview` build;
3. create Render public service `quantgym-v2-preview-api` and private service `quantgym-v2-preview-llm` from the temporary probe, with Node `20.20.2`, `npm ci`, the exact start command, `PORT`, service-specific env, and separate environment group;
4. create Render PostgreSQL `quantgym-v2-preview-postgres` with distinct provider resource, empty public schema, SSL, separate database/role, and no schema import;
5. create private R2 bucket `quantgym-v2-preview-media`, disable public development URL, create bucket-scoped credentials, and configure seven-day cleanup plus Preview-only CORS;
6. export authenticated provider evidence for both Preview and production resources into the ignored operator evidence directory, then record and verify Cloudflare account/project ID, Render workspace/service/Postgres/environment-group IDs, the R2 account/name/jurisdiction identity tuple, operator, timestamp, budget owner, and destroy owner;
7. store real values only in provider secret storage or the operator's non-repository environment;
8. deploy the expected commit/branch and run the live gate.

Branch commands, still inside the authorization checkpoint:

```bash
git status --short
git branch --show-current
git log --oneline --decorate -12
git push -u origin codex/frontend-v2-preview
```

The branch output must be exactly `codex/frontend-v2-preview`. Confirm the expected commit on `origin/codex/frontend-v2-preview` before configuring providers.

Cloudflare CLI may create the private bucket after an authenticated login:

```bash
npx --yes wrangler@4.60.0 whoami
npx --yes wrangler@4.60.0 r2 bucket create quantgym-v2-preview-media
npx --yes wrangler@4.60.0 r2 bucket list
```

Compare the `whoami` account ID with the approved Cloudflare account before creation. Do not run these commands without the authorization checkpoint. Dashboard or provider API evidence is still required for token scope, privacy, `r2.dev`, lifecycle, and CORS because bucket CRUD alone does not prove those settings.

- [ ] **Step 5: Run and commit redacted live evidence**

```bash
python3 -m venv /tmp/quantgym-preview-check-venv
source /tmp/quantgym-preview-check-venv/bin/activate
python3 -m pip install -r api-server/requirements.txt
npm run build:frontend-upgrade:provider-evidence
npm run check:frontend-upgrade:preview
npm run check:frontend-upgrade:preview:live
unset CLOUDFLARE_API_TOKEN RENDER_API_KEY QUANTGYM_PREVIEW_POSTGRES_URL QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY
git add docs/browser-audit-screenshots/370-frontend-upgrade-preview-environment-summary.json
git diff --cached --check
git commit -m "test: record frontend v2 preview isolation"
```

If resources are not authorized or available, Phase 0 status is `blocked: external Preview provisioning required`; it is not accepted and infrastructure is not converted into a known quality gap.

Do not push the live-evidence commit or Task 11 review commit before human review: the remote Preview branch stays pinned to the tested probe commit, avoiding an automatic deployment that would invalidate its own commit evidence. The aggregate gate requires the deployed commit to be an ancestor of local HEAD and requires the probe artifact fingerprint to match. After explicit Phase 0 acceptance, push the reviewed commits, wait for the new deployment, rerun the live gate, and commit the refreshed evidence as the first controlled follow-up.

---

## Task 11: Aggregate Evidence and Produce a Review Packet

**Files**

- Create: `scripts/check-frontend-upgrade-phase0.mjs`
- Create: `tests/frontend-upgrade-phase0.test.mjs`
- Generate: `docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json`
- Create: `docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md`
- Modify: `package.json`

- [ ] **Step 1: Write failing aggregate tests**

Fixture tests must fail on:

- a missing or extra manifest route;
- a referenced design file or SHA mismatch;
- a stale canonical dist runtime fingerprint;
- a route visual/accessibility case count other than 150, a shared-state inventory other than 26 current plus 6 future gates, or a tracked review-image count other than 29;
- a core-flow route count other than 22 or any failed interaction;
- a performance run count other than 12;
- an unexpected legacy UI-contract failure;
- missing, expired, non-pass, or production-reusing Preview evidence;
- a deployed Preview commit that is not an ancestor of local HEAD or whose minimal probe artifact fingerprint differs;
- any nested command failure;
- a review status of `accepted` generated by the script itself.

Run and expect `ERR_MODULE_NOT_FOUND` for the aggregate checker library:

```bash
node --test tests/frontend-upgrade-phase0.test.mjs
```

- [ ] **Step 2: Implement the aggregate gate**

Run these commands and preserve their exit/output:

```text
npm run check:frontend-upgrade-contracts
npm run check:frontend-v2-boundaries
npm run check:frontend-upgrade:preview
npm run check:stage2:strict
npm run check:route-integrity
npm run check:route-interactions
node scripts/check-module-ownership.mjs --summary docs/browser-audit-screenshots/370-frontend-upgrade-core-flow-baseline-summary.json
npm run check:repo-hygiene
```

Then validate all 370 summaries, recompute every design-source and tracked review-image hash, rebuild with the fixed no-dotenv environment and recompute the canonical dist runtime fingerprint, and parse the actual legacy UI-contract wrapper result. The 150 route and 26 reachable shared-state full-resolution artifact hashes are verified during the original capture; six target-only shared states must remain explicit future gates. A fresh checkout verifies their manifests plus the 29 committed review images and may rerun the capture command for pixel-level reproduction. The live Preview summary is mandatory and must be younger than seven days.

Add:

```json
"test:frontend-upgrade:phase0": "node --test tests/frontend-upgrade-contracts.test.mjs tests/frontend-v2-boundaries.test.mjs tests/browser-route-targets.test.mjs tests/build-static-site-isolation.test.mjs tests/frontend-upgrade-baseline.test.mjs tests/frontend-upgrade-legacy-findings.test.mjs tests/frontend-upgrade-preview-contracts.test.mjs tests/frontend-upgrade-preview-probe.test.mjs tests/frontend-upgrade-preview-live.test.mjs tests/frontend-upgrade-phase0.test.mjs && python3 -m unittest discover -s tests -p 'test_*.py' -v",
"check:frontend-upgrade:phase0": "node scripts/check-frontend-upgrade-phase0.mjs"
```

Success status is exactly `ready-for-review`, never `accepted`.

- [ ] **Step 3: Run the full gate**

```bash
npm run test:frontend-upgrade:phase0
npm run check:frontend-upgrade:phase0
```

Expected aggregate:

```json
{
  "status": "ready-for-review",
  "routes": 22,
  "systemSurfaces": 8,
  "designTextFiles": 30,
  "productionAssets": 36,
  "coreFlowRoutes": 22,
  "routeVisualA11yCases": 150,
  "sharedStateCases": 26,
  "sharedStateFutureGates": 6,
  "trackedReviewImages": 29,
  "performanceRuns": 12,
  "previewResourceIsolation": "pass",
  "previewApplicationBindings": "deferred-to-phase1",
  "unexpectedLegacyUiFindings": 0,
  "failures": []
}
```

- [ ] **Step 4: Create a review packet, not an approval**

Create `docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md` with:

```markdown
# QuantGym Frontend Platform Upgrade Phase 0 Review

Date: 2026-07-10
Status: ready-for-review

## Evidence

- Design source and production assets: verified by SHA-256.
- Surface mapping: 22 routes and 8 shared surfaces.
- Core flows: 22 routes; League ownership and journey included.
- Visual/accessibility baseline: 150 route cases, 26 reachable shared-state cases, 6 explicit Phase 1 state gates, and 29 tracked review images across light/dark and approved viewports.
- Performance baseline: 12 representative lab runs plus bundle inventory.
- Preview resource isolation: minimal web probe, API/internal LLM probes, empty PostgreSQL, and private R2 live checks passed with redacted evidence; real API bindings are deferred to Phase 1.

## Findings Requiring Later Improvement

Copy the exact accessibility, overflow, hidden-action, performance-budget, and historical League evidence findings from the generated summaries. Do not replace them with a count-only sentence.

## Review Decision

Independent reviewer and user decision are pending. Phase 1 planning must not begin until this status is changed in a separate reviewed commit after explicit user acceptance.
```

- [ ] **Step 5: Verify worktree scope and commit**

```bash
git diff --check
npm run test:frontend-upgrade:phase0
npm run check:frontend-upgrade:phase0
git -C "$QUANTGYM_SOURCE_WORKSPACE" status --porcelain=v1 -z > /tmp/quantgym-phase0-end-status.z
git -C "$QUANTGYM_SOURCE_WORKSPACE" diff --binary > /tmp/quantgym-phase0-user-worktree-after.diff
git -C "$QUANTGYM_SOURCE_WORKSPACE" diff --cached --binary > /tmp/quantgym-phase0-user-index-after.diff
xargs -0 -I{} shasum -a 256 "$QUANTGYM_SOURCE_WORKSPACE/{}" < /tmp/quantgym-phase0-start-untracked-paths.z > /tmp/quantgym-phase0-user-untracked-after.sha256
cmp /tmp/quantgym-phase0-start-status.z /tmp/quantgym-phase0-end-status.z
cmp /tmp/quantgym-phase0-user-worktree.diff /tmp/quantgym-phase0-user-worktree-after.diff
cmp /tmp/quantgym-phase0-user-index.diff /tmp/quantgym-phase0-user-index-after.diff
cmp /tmp/quantgym-phase0-user-untracked.sha256 /tmp/quantgym-phase0-user-untracked-after.sha256
git add package.json scripts/check-frontend-upgrade-phase0.mjs tests/frontend-upgrade-phase0.test.mjs docs/browser-audit-screenshots/370-frontend-upgrade-phase-0-summary.json docs/superpowers/reviews/2026-07-10-quantgym-frontend-platform-upgrade-phase-0.md
git diff --cached --name-status
git diff --cached --check
git commit -m "chore: prepare frontend upgrade phase 0 review"
```

Inspect `git diff --cached --name-status` before committing; it must not contain a `369-*` file or any pre-existing user-owned path.

---

## Phase 0 Exit Gate

Phase 0 is ready for human review only when:

- all 11 tasks and focused commits exist;
- deterministic design-source verification passes for all 30 files and the 36-asset production manifest;
- every one of the 22 routes and 8 shared surfaces has component, data, interaction, state, responsive, motion, and acceptance mapping;
- the deletion map resolves every tracked legacy family and the v2 boundary scanner is green;
- the core-flow baseline passes all 22 routes, including League;
- all 150 route and 26 reachable shared-state light/dark visual-accessibility captures, six explicit future-state gates, 29 tracked review images, and 12 performance runs are current for the runtime fingerprint;
- historical UI-contract failures contain no item outside the exact League/21-route allowlist;
- live Preview evidence proves isolated minimal web, API, internal LLM, empty PostgreSQL, and private R2 resources without exposing credentials, and explicitly records real API bindings as deferred to Phase 1;
- the aggregate summary says `ready-for-review` with zero failures;
- the user's pre-existing worktree changes are unchanged and unstaged.

After an independent review and explicit user confirmation, update the review status to `accepted` in a separate commit, push the reviewed branch, wait for the resulting probe deployment, rerun the live gate, and refresh the redacted evidence. Only after that controlled follow-up is green may the Phase 1 implementation plan be written.
