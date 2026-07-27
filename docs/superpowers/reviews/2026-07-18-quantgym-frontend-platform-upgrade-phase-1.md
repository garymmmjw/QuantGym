# QuantGym Frontend Platform Upgrade Phase 1 Review

Date: 2026-07-27
Accepted: 2026-07-27 — explicit confirmation from Gary
Status: accepted

## Reviewed candidate

- Application commit: `5a3b6f33b7f2a4d15f0a81ca57f81570ca89c6a3`
- Evidence successor commit: `d87b20f8630fdc39f46e1065c5ffee14bf3ca8dd`
- Branch: `codex/frontend-v2-preview`
- Pull request: `garymmmjw/QuantGym#130` (draft)
- Pre-push provider baseline SHA-256:
  `082fb988e269125d2ab152b6ad2572fa02bad9db6101bc977cc24d16a93feaed`
- Redacted provider evidence SHA-256:
  `15e9ad7f9dc6b5d1d8d607b304fa93d9cee2fc0dda83a41cdd1e82ae405f33ea`

The automated aggregate remains intentionally limited to `ready-for-review`; Phase 1 acceptance
was recorded only after Gary's explicit confirmation on 2026-07-27.

## Independent review outcome

Candidate `5dabd8a35f6edcd754cfcfdd8887981c9022aa32` was rejected after its automated
checks passed because independent image review found intermediate loading states, missing brand
assets, inconsistent full-page mobile captures, absent Theme/Language controls, and insufficient
sign-out text contrast. None of that evidence was accepted or mixed into this candidate.

The superseding candidate added surface-specific final-state waits, visible image and font
readiness, exact viewport captures, compatibility suppression restricted to the already excluded
region, real Theme/Language controls, and a semantic danger-text token. Independent code review
then found two acceptance-tool hardening gaps: the image/font decode stage needed a hard timeout,
and the Account Menu test needed to bind the actual sign-out styles to the new tokens. Both were
fixed and re-reviewed before the application commit was frozen. No code-review finding remains.

All 48 final review images were inspected individually at their original dimensions:

- Auth, Desktop Shell, and Mobile Shell: 18/18 passed.
- Global Search, Notifications, and Todo: 18/18 passed.
- Theme/Language and Network Recovery: 12/12 passed.
- Exact dimensions: desktop `1440x900`, laptop `1280x720`, mobile `390x844`.
- Mascot, logo, and avatar assets are loaded, sharp, correctly proportioned, and not clipped.
- Final dialogs, empty states, selected search result, account controls, and application-owned
  offline recovery UI are visible; no skeleton, browser error page, or loading placeholder remains.

Visual-review findings: 0 blocking, 0 non-blocking.

## Automated and live evidence

- Local V2 suite: 402/402 passed; typecheck, script lint, style lint, and build isolation passed.
- Local Phase 1 Node suite: 312/312 passed.
- Local Phase 1 Python suite: 15/15 passed.
- Local and live browser suite: 82/82 passed with no skip, failure, retry, or flake.
- Design-system review: 45/45 Storybook Axe stories passed; serious/critical findings: 0.
- Application-commit CI:
  [run 30208196385](https://github.com/garymmmjw/QuantGym/actions/runs/30208196385) passed.
- Evidence-successor CI:
  [run 30209315617](https://github.com/garymmmjw/QuantGym/actions/runs/30209315617) passed.
- Review-commit CI:
  [run 30209847607](https://github.com/garymmmjw/QuantGym/actions/runs/30209847607) passed.
- Live visual matrix: 48/48; application console errors: 0; unhandled rejections: 0.
- Initial JavaScript: 165,042 bytes gzip against a 184,320-byte budget.
- Largest route chunk: 4,238 bytes gzip against a 102,400-byte budget.
- Auth browser persistence: 0 local-storage entries, 0 session-storage entries,
  0 IndexedDB records, and 0 sensitive entries.
- Final aggregate: 8 system surfaces, 82 target gates, 6 activated future states,
  and every aggregate check true.

## Preview infrastructure and cleanup

- Pages, API, and the private LLM commit/health probe run the exact application commit.
- Automatic deploys remain disabled for all three Preview runtimes.
- Same-origin Pages proxy, direct API health, private LLM attestation, and the minimal public
  configuration passed.
- Preview PostgreSQL is major 18 with the exact Alembic head, nine application tables, one
  metadata table, and the frozen schema contract.
- Runtime and short-lived audit R2 identities were independent and bucket-scoped during live
  acceptance; signed upload/read/delete and production-denial checks passed.
- The synthetic audit user and anonymous challenges were removed. Final application rows: 0.
  Final R2 objects: 0.
- The 22 unmigrated business routes remain inside the isolated Preview-only compatibility adapter;
  the adapter is excluded from migrated visual evidence and does not start the legacy bootstrap
  globally.
- Every locked `370-*` Phase 0 artifact remained byte-identical.
- No Production application deployment occurred. The temporary Production Pages branch-safety
  policy was restored after review CI passed; the current canonical production-control digest is
  `316ac14ca5a7411c180ea88219fa51e44712f99b3a9901b4af07acdee60f1f49`. Reapplying only the three
  acceptance-isolation policy fields in memory reproduces the frozen isolation digest
  `2a627e631ce079c296305655e74fee4681b8ecd867707b35a23b3d2282c86ddc`, confirming no other
  provider-control drift.
- Closeout revoked the short-lived audit R2 token, the uniquely matched accidental all-buckets
  read-only R2 token, and the temporary user operator token. The runtime token remains active,
  scoped only to `quantgym-v2-preview-media`, and bound to the frozen runtime identity.
- Post-cleanup R2 verification returned `200` for a signed Preview list with zero synthetic
  objects and `403` for the same runtime identity against the Production bucket. The revoked
  operator token returned `401` on verification.

Closeout is complete. Temporary local credentials, the database tunnel, helper scripts, and the
dedicated temporary Python environment were removed after the final provider checks.
The final documentation-only handoff commit uses Cloudflare's documented
[`[CF-Pages-Skip]`](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/#skipping-a-build-via-a-commit-message)
prefix so it cannot replace the frozen Preview deployment.

## Decision

Gary explicitly accepted Phase 1 and authorized Phase 2 on 2026-07-27. Phase 1 has no unresolved
finding and is now closed as accepted. Phase 2 may proceed with Overview, Plan, and Problems while
Production remains unchanged and the pull request remains unmerged.
