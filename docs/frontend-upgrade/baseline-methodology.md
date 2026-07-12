# Frontend Upgrade Baseline Methodology

This Phase 0 baseline records the current QuantGym product before Phase 1 UI work. It is a measurement, not a waiver list: accessibility, layout, and performance findings remain visible in the generated summaries and must be improved or explicitly replaced by a later approved baseline.

## Reproducible build and browser

Both capture commands create a temporary production `dist`, ignore repository `.env` and root runtime configuration, and use explicit local non-secret API/LLM endpoints. Google login is disabled and the Google client ID is empty. Vite serves that exact temporary directory, and capture begins only after `/version.json` is available.

The summaries record the normalized full-dist SHA-256 fingerprint, Git provenance, isolation flags, Chrome executable/version, locale, theme, viewport, route selectors, and axe version. The fingerprint includes every built file path and byte except `version.json`; only `buildCommit`, `buildBranch`, and `buildSource` in built `config.js` are canonicalized. A change to any other runtime, data, configuration, CSS, script, or asset byte changes the fingerprint.

## Visual and accessibility matrix

The route matrix contains 150 cases:

- auth plus all 22 routes;
- light and dark themes;
- desktop (1440×900), laptop (1280×720), and mobile (390×844) for every surface;
- tablet (834×1112) for Plan, Problems, Interview, Poker, Messages, and Library.

Every case seeds a deterministic local account before application scripts run, with `lastAuthenticatedAt` created by `new Date().toISOString()`. The requested theme is also seeded before application startup. Navigation uses a string from `new URL(case.path, baseUrl).href` and requires an HTTP status below 400, the exact final pathname, expected route selectors, the correct auth/app shell, no Vite overlay, meaningful body text, loaded fonts, and complete renderable images. Unexpected console errors, page errors, first-party HTTP errors, and first-party request failures are capture failures.

Axe scans use `wcag2a`, `wcag2aa`, `wcag21aa`, and `wcag22aa`. The baseline records all violations and explicitly surfaces serious/critical nodes. Horizontal overflow, hidden titles, and hidden primary actions are quality findings. A successful measurement with findings is labelled `captured-with-findings`; navigation or runtime failures are labelled `fail` and cannot be waived by quality findings.

Full-page PNGs are written under ignored `artifacts/frontend-upgrade/baseline/`. The tracked review packet contains 29 JPEGs at quality 72: auth, 22 routes, and one representative for each currently reachable non-auth shared surface. Its manifest records the source case, dimensions, byte count, and SHA-256.

## Shared states

The shared-state inventory has exactly 32 entries across Auth, Desktop Shell, Mobile Shell, Global Search, Notifications/Toast, Todo, Theme/Language, and Network Recovery. Twenty-six states are current captures. Six are explicit Phase 1 future gates: notification-center open/empty and the four Network Recovery states. Future gates have no screenshot claim, are skipped by the capture CLI, remain labelled `future-gate`, and include their concrete target command; they are never reported as passing Phase 0 states.

## Performance and bundles

Performance capture covers Auth, Overview, Problems, Interview, League, and Messages at laptop and mobile widths in light theme. Each of the 12 runs uses a new cold browser context. A pre-navigation `PerformanceObserver` records Largest Contentful Paint and cumulative layout shift; the script also records navigation timing, First Contentful Paint, resource counts, transferred/decoded bytes, and horizontal overflow.

The interaction sample measures one local UI action through the next two animation frames. It is labelled lab interaction latency. It is not field INP, not a P75 distribution, and is not compared as though it were one. Phase 0 has no field RUM dataset, so the summary states `unavailable-before-v2-rum`; Phase 1 must add real-user instrumentation before claiming field INP.

Every built JavaScript chunk is inventoried with raw and gzip bytes. Initial chunks come from built `index.html`; ordinary route chunks are reported separately. The recorded comparison targets are LCP 2500 ms, field INP P75 200 ms (unavailable in Phase 0), CLS 0.1, initial JavaScript gzip 180 KiB, ordinary route chunk gzip 100 KiB, and zero horizontal overflow.

These local synthetic results depend on the current machine, Chrome version, process scheduling, fonts, and loopback server. Future comparisons must use the same production-build isolation, cold-context policy, viewports, routes, observer code, and labelled lab interaction. They should compare distributions across repeated runs rather than treating one local result as a production SLA.

## Commands

```bash
node --test tests/frontend-upgrade-baseline.test.mjs
node scripts/capture-frontend-upgrade-baseline.mjs
node scripts/capture-frontend-upgrade-performance.mjs
```
