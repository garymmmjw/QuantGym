# Account learning sync

Learn and readiness use the authenticated `/api/learning/state` endpoint. A single private row per account contains `{learn, training}`, a monotonically increasing revision and an update time. GET and PUT require login; a request cannot choose another owner. The endpoint is private/no-store and does not require an active membership, so membership changes do not erase personal records. Course and question access remain independently VIP-gated.

PUT requires `version: 1` and `baseRevision`; one atomic insert/update wins. A stale writer receives HTTP 409 with the current envelope. Both SQLite and PostgreSQL add `user_learning_states` on startup without changing existing tables or records. The payload limit is 10 MiB. The API validates storage shape and bounds; human self-assessments remain client-calculated, not server-verified examination results.

The browser hydrates the account before enabling course or scoring edits. It imports only that account's existing `quantgym:learning:v1:<user>:learn|training` records, retains their original bytes in a migration backup, and records migration completion scoped to the API destination. Unknown migration outcomes, malformed archives and cloud revision rollback stop sync instead of resetting the account.

Each mutation fetches the latest revision and retries CAS conflicts. Independent lessons, renderer keys, preference fields and target memberships can merge. Permanent course awards and immutable answer event IDs prevent duplicate XP. Joining pre-cloud scoring ledgers replays the existing scoring engine; scoring formulas are unchanged. Conflicting edits to the same renderer field or ambiguous notes/calibration sequences require review rather than guessing. Current course input remains visible until the user explicitly loads cloud progress.

The iframe correlates save acknowledgements, coalesces rapid edits, and waits for saves before its ordinary lesson/practice navigation. QuantGym links flush the reader before leaving. Already queued authenticated writes drain on route unmount; an account or token change stops stale-session requests. Browser refresh/close warns while the reader has unconfirmed edits. This is an online-save system: unsaved in-memory input is not an offline durable queue; wait for the cloud confirmation before leaving or switching devices.

Verification:

- `node --test scripts/test-learning-cloud-sync.mjs scripts/test-learning-cloud-hook.mjs scripts/test-learning-state-transport.mjs`
- `python3 scripts/test-learning-state-api.py` (includes real JS transport/core with two isolated clients against HTTP)
- With psycopg and a disposable local PostgreSQL runtime: `python3 scripts/test-learning-state-api.py --postgres`
- Existing learning integration, source-loader, bridge, concurrency and layout tests; embedded bridge/layout/render/build tests; production strict static build.

No course bodies, private exports, user profiles or credentials belong in the static build or public repository.

## Question practice, bookmarks and private notes

The regular question ledger remains in `user_problem_states`, keyed by authenticated account and question ID. It stores timed practice attempts, hint/answer usage, bookmarks, and `note` text (20,000 UTF-16 units). It uses `/api/problem-states` for reads and `/api/sync` for queued writes. Both endpoints return private, non-cacheable responses. These fields are never added to the public question catalog.

`favoriteUpdatedAt` and `noteUpdatedAt` are independent logical edit clocks. A timer checkpoint cannot change either field's ordering. Explicit clocks outrank old clients without clocks; the latest field edit wins, including `false` and an empty string. Exact timestamp ties converge deterministically (unbookmark wins; text uses UTF-16 ordering). This is a last-edit-wins note, not collaborative text editing. Browser backups retain that device's most recently entered text. The clock advances monotonically against the known field value, but unrelated offline devices with badly skewed system clocks can still disagree about real-world edit order.

Owned `quantgym.problemNote.v2:<owner>:<problem>` browser notes migrate after the first successful cloud read, only if no cloud/local note or note deletion exists. Original keys are retained. Unscoped and other-account notes are never assigned to the current user. Older browser-only practice rows also reconcile after hydration.

Pending upload markers persist per API destination and account; data itself remains in that account's local cache. Login, focus, page visibility and network recovery refresh the cloud copy. Requests retry transient failures; stale account/token/destination responses cannot update the new session. Edits during an upload remain queued, and explicit flush waits for acknowledgment. Active timers checkpoint every ten seconds; leaving a question starts an immediate flush. An abrupt browser termination may still leave pending data on the original device until it next reconnects. The question page distinguishes pending/error from confirmed cloud sync.

Weng scoring saves and the corresponding ordinary practice result now commit in one database transaction. Mapping uses server-owned `quantvault.id` → display question ID metadata, never a guessed numeric prefix. Reading a learning profile also repairs older missing practice rows idempotently. Existing attempt identity/timing is preserved; reading does not award XP. Human self-assessment rules are unchanged.

Additional checks: `scripts/test-problem-account-sync.mjs`, `scripts/test-problem-cloud-sync.mjs`, the free-practice suites, and the SQLite/PostgreSQL HTTP learning-state suite (independent clients, stale writes, deletion, account isolation, internal/display ID mapping, atomic rollback and legacy repair).
