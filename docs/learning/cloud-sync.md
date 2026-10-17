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
