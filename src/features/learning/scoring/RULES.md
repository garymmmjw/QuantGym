# Integrated scoring provenance

The four pure modules in this directory are byte-identical ports of the audited
standalone training system from `QuantVault/learn-preview/src/scoring/` (REA/source
review dated 2026-10-16). The existing model tests and
`scripts/test-learning-integration.mjs` check their equivalence.

Verified source rules: fitted v1/v2 difficulty and guessing parameters; v2 hint
credit; 17 topics with secondary-topic evidence; role/company/focus relevance;
3-evidence readiness eligibility and 4-evidence display warning; 30-day first
attempt ledger; one-time difficulty XP; lesson XP; role-ordered module progress;
fixed 75% offer bar. Lessons and XP do not alter ability or readiness.

Local product policy: fixed v2 with explicit v1 fallback, human grading of open
answers, full non-revealed completion, account-scoped browser storage, no legacy
standalone data migration, no-evidence display, locally available recommendations,
manual initial assessment entry, and removing the obsolete 60-lesson reward cap.

The integration stores source **internal** IDs in the ability ledger and checks
their pairing with public display IDs, which index the difficulty tables. It does
not infer one ID from the other. The ordinary QuantGym 24-hour practice count and
the 30-day ability ledger remain separate. A single explicit submit drives both;
opening a solution never awards points or automatically submits an attempt.

The browser store is a personal training record, not a server-verified exam.
Server anti-abuse rules and real-world offer prediction accuracy are unknown.
