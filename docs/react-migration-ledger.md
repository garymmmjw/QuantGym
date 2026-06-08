# React Migration Ledger

Machine-readable: [react-migration-ledger.json](./react-migration-ledger.json)

## Architecture milestones

| Milestone | Status |
|-----------|--------|
| No `new Function` in createAppContext slices | Done |
| Outlet renders inside `appShell` (no `module-partial-root`) | Done |
| `features/` free of `legacyApp.pageApi` | Done |
| Route-level `React.lazy` | Done |
| Manual smoke matrix | See [SMOKE_CHECKS.md](./SMOKE_CHECKS.md) |

## Page status (v2)

- **converted (21)**: overview, plan, skills, interview, problems, tools, poker, experiences, news, community, messages, network, resume, jobs, companies, library, courses, memory, settings, account, pk
- **partial (0)**: none
- **island (0)**: none

Release readiness: route ownership and strict static gates are complete; deep
manual smoke remains open for Problems, Interview, Poker, and Settings/language
persistence.

Retained local helpers: Poker still uses module helpers for room state, actions,
online sync, and the preflop matrix DOM helper, but the route and table/lobby UI
are React-owned.

Current app adapters: `createAppServices`, `AppServicesProvider`,
`bootstrapApp`, `AppEffects`, `HashCompatRedirect`.
