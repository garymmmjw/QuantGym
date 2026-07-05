# QuantGym UI Redesign Part 1 Plan

Date: 2026-07-03
Part: Part 1, Shell And Auth
Status: approved for implementation after Part 0 accepted

## Goal

Replace the authenticated app chrome and unauthenticated login shell with the approved Playful Precision direction while preserving route, auth, search, sidebar, and Google Sign-In contracts.

## References

- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-design.md`
- `docs/superpowers/specs/2026-07-03-quantgym-ui-redesign-review-checklist.md`
- `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-0.md`
- `UI 设计提升.zip`
- Sanitized design pages used only as references:
  - `QuantGym 登录.dc.html`
  - `QuantGym 总览.dc.html`

## Non-Negotiables

- Preserve `#authShell`, `#appShell`, `#moduleNav`, `#sidebarToggleBtn`, `#globalSearchInput`, `#globalSearchResults`, `#commandChatBtn`, `#loginForm`, `#registerForm`, `#resetPasswordForm`, and `#googleButton`.
- Preserve every existing `data-module-tab` value.
- Keep mobile horizontal overflow at or below the existing smoke-test threshold.
- Keep `#commandChatBtn` and account shortcut hidden on narrow mobile while settings and search remain visible.
- Keep login, register, reset password, and Google Sign-In DOM contracts intact.
- Do not rewrite any route page content in Part 1.

## Tasks

### Task 1: Add The Red Shell Gate

Create `scripts/check-ui-redesign-shell.mjs`.

The check must fail before implementation and pass only when:

- `src/styles/playful-precision-shell.css` exists.
- `src/main.jsx` imports `./styles/playful-precision-shell.css` after `./styles/react-route-overrides.css`.
- `src/components/shell/AppShellMain.jsx` contains `qg-app-shell`, `qg-shell-rail`, `qg-command-bar`, `qg-route-container`, and `themeToggleBtn`.
- `src/components/shell/AuthShell.jsx` contains `qg-auth-screen`, `qg-auth-brand`, `qg-auth-card`, and references Playful Precision brand and mascot assets.
- The shell CSS contains selectors for authenticated shell, auth shell, mobile shell, collapsed sidebar, and reduced motion.
- The shell CSS does not reference local temporary paths.

Run `npm run check:ui-redesign-shell` and confirm it fails for missing shell CSS, import, classes, and theme toggle.

### Task 2: Update Shell And Auth JSX

Modify:

- `src/components/shell/AppShellMain.jsx`
- `src/components/shell/AuthShell.jsx`
- `src/main.jsx`
- `package.json`

Requirements:

- Add Playful Precision shell classes without removing existing ids, legacy classes, or data attributes.
- Add `themeToggleBtn` that toggles `data-qg-theme="dark"` on `document.documentElement`, persists to `localStorage`, and exposes `aria-pressed`.
- Use Playful Precision asset URLs under `/assets/generated/playful-precision/`.
- Keep native button/input/form semantics.
- Add the shell CSS import after `react-route-overrides.css`.
- Register `check:ui-redesign-shell`.

### Task 3: Add Shell CSS Layer

Create `src/styles/playful-precision-shell.css`.

Requirements:

- Implement the authenticated shell as a left rail plus sticky command bar on desktop.
- Implement compact, non-overflowing navigation on mobile.
- Style the login split screen to match the approved design reference.
- Keep the Google Sign-In host visible and native-sized.
- Hide old authenticated `TopbarShell` visually while keeping the React tree stable.
- Use Playful Precision tokens from Part 0.
- Include reduced motion rules.

### Task 4: Verify Automated Gates

Run:

```bash
npm run check:ui-redesign-shell
npm run check:ui-redesign-foundation
npm run check:ui-contracts
npm run check:route-integrity
git diff --check
npm run build
```

Expected: all pass. Existing Vite warnings about classic script tags may remain.

### Task 5: Browser And Visual Review

Start a local dev server and capture:

- Login desktop
- Login mobile
- Authenticated overview desktop
- Authenticated overview mobile
- Authenticated overview dark theme

Review:

- no incoherent overlap
- no horizontal overflow
- shell controls visible as required
- sidebar collapse still works
- command search remains focusable
- login forms remain reachable

### Task 6: Write Part 1 Review Record

Create `docs/superpowers/reviews/2026-07-03-quantgym-ui-redesign-part-1.md` with:

- scope reviewed
- changed files
- screenshot paths
- automated evidence
- manual interaction evidence
- findings
- decision

Part 1 can be accepted only if automated gates and visual review pass.
