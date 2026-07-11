# QuantGym Hidden Controls Restoration Design

**Date:** 2026-07-11

**Status:** Proposed for user review

## 1. Context

The July Playful Precision redesign preserved the handlers, state, and DOM for several established journeys but intentionally hid their entry points because those controls were absent from the reference mockups. The Phase 0 core-flow baseline now proves that six named browser interactions cannot pass without either restoring those entry points or weakening the acceptance contract.

The approved decision is to restore the functions while preserving the current redesign. This change is a targeted product-UI restoration, not a rollback to the pre-redesign page.

Affected intents:

1. Problems collection filtering and mock-interview handoff.
2. Mobile Problems mock-interview handoff.
3. Problems ranking navigation.
4. LeetCode Hot 100 tracking.
5. Companies tier filtering on desktop.
6. Companies tier filtering on mobile.

## 2. Design Read

This is a preserve-mode product redesign repair for quant-learning users. It keeps the Playful Precision 2.0 brand language, brand purple, light/dark themes, current information architecture, and dense professional scanning behavior.

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 4`
- `VISUAL_DENSITY: 7`

The existing semantic tokens, Plus Jakarta Sans, Space Grotesk, radius scale, and current mascot treatment remain unchanged. No new design system, asset, route, or data model is introduced.

## 3. Approaches Considered

### 3.1 Recommended: discovery band plus action dock

Restore the entry layer in compact locations that already belong to the redesigned page:

- Problems view modes and collections become a lightweight discovery band between the filter card and the list/detail workspace.
- Hot 100 expands inline beneath that band.
- Mock Interview joins the visible detail action dock.
- Companies tier filtering returns as a compact segmented group in the existing page header.

This preserves discoverability and the named journeys without recreating the old card-heavy layout.

### 3.2 Utility drawer

A single More Training button could open a drawer containing ranking, collections, and Hot 100. This keeps the page visually sparse but repeats the original failure: important product functions remain hidden behind another layer and are harder to discover on mobile.

Rejected.

### 3.3 Restore the complete legacy blocks

Removing the CSS hiding rules without recomposition would bring back the former large collection grid, full toolbar, and duplicate detail actions. It is quick but creates cards inside cards, duplicates completion/favorite actions, and regresses the approved visual hierarchy.

Rejected.

## 4. Problems Page Design

### 4.1 Discovery band

The existing functional collection section and view-mode toolbar remain the source of truth. Their presentation changes from hidden legacy blocks to one compact discovery band.

The band contains:

1. A mode group for All Problems, Saved, and Popular Ranking.
2. A horizontally scannable collection row using the existing collection data and handlers.
3. The LeetCode Hot 100 collection with progress in its label.
4. An inline Hot 100 expansion region directly under the collection row.

Desktop behavior:

- The mode group sits with the list heading rather than inside a separate card.
- The collection row shows several compact items without a two-by-three card grid.
- Hot 100 uses a compact two-column list when space allows.

Mobile behavior:

- The mode group and collection row use contained horizontal scrolling with no page-level overflow.
- Each control has a minimum 44 px touch target.
- One collection item plus part of the next remains visible to communicate scrollability.
- Hot 100 becomes a single-column inline accordion.

State behavior remains unchanged:

- A normal collection clears incompatible filters, returns to page one, and activates its source or theme filter.
- Hot 100 toggles its own expansion without changing the current problem filter.
- Hot 100 completion persists through the existing state path.
- Ranking preserves its existing scoring, ordering, and detail navigation.

### 4.2 Detail utility row and action dock

The old detail toolbar is split into two purposeful surfaces:

- A compact utility row contains Back, Previous, position, and Next. It is visible only where the existing detail navigation requires it.
- A single visible action dock contains Complete, Save, and Use for Mock Interview.

The current duplicate completion/save CTA row is replaced by that action dock. The old hidden action group is not also exposed, so each intent has exactly one visible control.

Desktop behavior:

- Complete is secondary, Save is compact, and Mock Interview is the only brand-primary handoff.
- Labels remain on one line.

Mobile behavior:

- Complete and Save occupy the first row.
- Mock Interview occupies a second full-width row with a minimum 44 px height.
- The compact utility row provides an explicit return path from ranking detail.

The existing mock-interview handoff remains unchanged: selected problem, interview category/type/source setup, reset, and navigation to `/interview` continue through the existing handler.

### 4.3 Accessibility semantics

- View modes and tier filters use `role="group"` with button-level `aria-pressed`; they are not incomplete ARIA tabs.
- Collection items expose `aria-pressed`.
- Hot 100 exposes `aria-expanded` and `aria-controls="leetcodeHotList"`.
- Hot 100 completion controls expose their pressed state.
- Visible focus rings meet 3:1 contrast and are not clipped.
- Active states use shape/icon/text in addition to color.
- No duplicate accessible name exists for Mock Interview.

## 5. Companies Page Design

The existing `#companyTierFilter` is restored in the current flat header. No hook, service, or data change is required.

Desktop behavior:

- The filter aligns to the lower edge of the title block.
- All, Tier S, Tier A, and Tier B use the existing surface, border, brand-soft, and brand tokens.
- The current 320 px plus flexible master-detail layout is unchanged.

Mobile behavior:

- The filter moves below the subtitle.
- Four equal-width controls remain visible in one contained row.
- Every control has a minimum 44 px touch target.
- The company list and selected detail retain the current stacked behavior.

Semantic correction:

- The container uses `role="group"`.
- Buttons retain `aria-pressed` and remove the inapplicable `aria-selected` attribute.

Current tier persistence, company selection, practice handoff, safe careers launch, and smooth detail scrolling remain unchanged.

## 6. Visual Rules

- Use only existing Playful Precision semantic tokens.
- Keep the current radius hierarchy: compact controls at 11-14 px and content surfaces at 20-22 px.
- Do not add another mascot, hero, modal, or nested card layer.
- Do not add extra outer shadows. Borders, background, and spacing establish hierarchy.
- Brand purple remains the single interaction accent.
- New motion is limited to existing 120-180 ms micro feedback and must stop under reduced motion.
- Light and dark themes receive equivalent hierarchy and contrast.

## 7. Code Scope

Expected product files:

- `src/features/problems/ProblemsPageContent.jsx`
- `src/features/problems/ProblemDetail.jsx`
- `src/features/problems/ProblemChromePanels.jsx`
- `src/features/companies/CompaniesPageContent.jsx`
- `src/styles/playful-precision-replica-training.css`
- `src/styles/playful-precision-replica-support-b.css`

Expected QA files remain within the active Task 5 scope:

- `scripts/check-browser-route-smoke.mjs`
- a focused static restoration test under `tests/`
- the Task 5 core-flow summary

No API, storage, route, controller, provider, asset, or data-model file should change.

## 8. Error and Recovery Behavior

This restoration adds no new asynchronous operation. Existing empty, navigation, persistence, and external-link behavior remains authoritative.

- An empty collection or ranking continues to use the existing empty state.
- Hot 100 remains inline and does not trap focus.
- A disabled Previous or Next control remains disabled.
- Practice and interview handoffs preserve the existing target route and seed state.

## 9. Test-Driven Implementation

RED evidence already exists in the six named browser interactions. Before product implementation, add a focused static test that independently proves:

- collection and view-mode containers are no longer natively hidden;
- CSS does not hide the restored selectors;
- one visible mock-interview action is present;
- Companies tier controls are not hidden and use group/pressed semantics;
- the required accessibility attributes exist.

Then implement the minimum product changes and reach GREEN in this order:

1. Companies tier desktop/mobile flows.
2. Problems collection and desktop mock handoff.
3. Mobile Problems handoff and overflow.
4. Ranking navigation.
5. Hot 100 persistence.
6. Complete canonical core-flow run.

Required final evidence:

- all six restored interactions pass;
- all 68 named interactions and the separate auth preflight pass (69 total core flows);
- all 22 routes pass;
- no unexpected console, page, or first-party response error;
- route interaction and UI redesign checks pass;
- production build and repository hygiene pass;
- 1440 px, 1280 px, and 390 px visual checks in light and dark mode show no page-level overflow;
- keyboard and reduced-motion checks pass for the restored controls.

## 10. Acceptance Criteria

The restoration is ready for Task 5 review only when:

1. All restored controls are visible and usable in desktop and mobile layouts.
2. No product intent is moved behind a new drawer or modal.
3. No duplicate Complete, Save, Mock Interview, or tier-filter control is exposed.
4. Existing persistence and handoff semantics are unchanged.
5. Focus, touch targets, contrast, dark mode, and reduced motion meet the design contract.
6. The canonical baseline is fully passing: 68/68 named interactions plus the separately serialized unauthenticated auth preflight, for 69/69 total core flows.
7. Task 5 remains QA/evidence plus the explicitly approved entry-layer restoration; no unrelated feature change is included.
