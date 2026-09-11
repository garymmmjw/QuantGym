# LeetCode account connection

QuantGym supports LeetCode China (`leetcode.cn`) public-profile connections. In Account, enter a username or profile URL and select **关联并同步**. The connection belongs to the signed-in QuantGym cloud account and is available across devices. A public username association is not proof of account ownership and is not used for competitive rankings.

The LeetCode module displays the public solved count, difficulty distribution, total submissions, and a review pool assembled from known accepted problems. Random review respects the current filters, avoids an immediate repeat when alternatives exist, and opens the original LeetCode problem in a new tab. Opening a problem does not mark it complete.

## Per-problem spaced review

The review workspace prioritizes due problems and shows a suggested next review date and local time for every dated problem. Difficulty, text search, and due/upcoming/first-review filters remain available, as does random practice. The schedule is a recommendation, not an exact prediction of when a person will forget a solution.

Scheduling follows the [original SuperMemo SM-2 algorithm](https://super-memory.org/archive/english/ol/sm2.htm). The four recall ratings map to quality scores 1, 3, 4, and 5: **忘记了 / 费力想起 / 记得 / 很熟悉**. Successful reviews use intervals of 1 day, 6 days, then the previous interval multiplied by the previous ease factor and rounded up. Failure restarts the interval at one day; ease adapts to feedback with a floor of 1.3. Intervals are bounded at 36,500 days. Ratings describe recall, rather than the problem's Easy/Medium/Hard difficulty.

- A known last accepted submission seeds one successful exposure and a first suggestion one day later. This is an initial assumption, not a fabricated historical self-assessment.
- Imported problems without submission timestamps remain **待首次复习**. Their first explicit successful recall starts a one-day interval.
- Once a user records feedback, that saved schedule survives refresh, subsequent AC submissions, and history imports. An AC result alone does not establish unaided recall and does not overwrite the user's feedback.
- Only explicitly recording feedback changes a schedule. Opening a LeetCode tab, drawing a question, and filtering the list do not. Self-assessments never increase LeetCode solved counts, accepted submissions, or completed calendar activity.
- The API timestamps reviews in UTC and computes the saved date. The UI displays local date/time and approximate interval previews. Intervals are elapsed 24-hour days, including across daylight-saving transitions.
- A failed save keeps the old schedule and offers a retry of the same event. Conflicting changes from another session require a refresh rather than silently applying another review.

Review state belongs to the current QuantGym account and linked LeetCode profile. Disconnecting or replacing that profile removes its review state together with the corresponding LeetCode snapshot; reconnecting the same active profile preserves it. Existing training records in other QuantGym modules are separate.

## Daily records and history coverage

- Calendar problem counts come only from dated accepted submissions. The same problem counts once per device-local day; practicing it on another day counts again.
- LeetCode's source calendar reports submission totals. Its Unix keys encode UTC-midnight date labels; QuantGym preserves those source labels instead of treating them as individual submission instants or converting them to local solved counts.
- The public recent feed is limited. A partial pool is labeled with the number of known problems, and a day without accepted details is shown as unknown rather than a fabricated zero.
- Public snapshots refresh when these views are opened or focused if stale, and at five-minute intervals while visible. The server caches successful syncs for at least 60 seconds. No background scheduler collects history while the app is closed.

## Importing earlier completed problems

Install or update QuantGym Collector from the download in the LeetCode module. On a signed-in LeetCode China tab, click **同步力扣记录**. The extension reads the solved-problem list and accepted submission metadata using the existing session inside that tab. It checks the logged-in username before and after reading history.

QuantGym displays a preview and saves only after **导入到当前关联账号** is clicked. The username must match the connection. A JSON download is available if browser delivery fails. Passwords, session cookies, tokens, and submitted code are neither read by the extension nor sent to QuantGym. Imported history is private user-provided metadata, not an ownership or completeness attestation.

Limits are 20,000 combined problem/submission rows and 5 MiB per import. Interrupted or limited reads are marked partial. Additional imports merge by submission ID and problem slug. Public all-time statistics are not overwritten by imported counts. Disconnect removes the associated records from QuantGym; changing to another profile replaces the previous profile's records.

## API and storage

All endpoints require the existing QuantGym Bearer session and return `private, no-store`:

| Endpoint | Purpose |
| --- | --- |
| `GET /api/leetcode` | Read the private cached snapshot |
| `POST /api/leetcode/connect` | Validate and connect a CN username or profile URL |
| `POST /api/leetcode/sync` | Refresh the current connection |
| `POST /api/leetcode/import` | Merge matching-account metadata |
| `POST /api/leetcode/review` | Record one explicit recall rating and calculate the next review |
| `DELETE /api/leetcode` | Remove the linked records |

`user_leetcode` is created idempotently by the existing database initialization, for SQLite and PostgreSQL. Optimistic revisions prevent an in-flight sync from restoring a disconnected or replaced connection. Upstream failures retain the previous snapshot. Network requests use fixed CN endpoints, bounded responses, TLS verification, and no redirects.

Review commands contain only `username`, `linkedAt`, `problemSlug`, `rating`, a UUID `eventId`, and the problem's `expectedVersion`. User ownership comes from the authenticated session. Connection identity and per-problem versions reject stale writes; replaying an identical event is idempotent, including concurrent delivery. Clients cannot supply review timestamps, due dates, or intervals. Private `_reviewStates` and `_reviewEvents` remain inside the existing JSON snapshot, while responses project `problems[].review` plus `reviewPolicy`. GET never writes review state. Commands are limited to 4 KiB, 60 requests per minute per user, and 20,000 retained review events within the existing snapshot size bound.

## Verification

Run `npm run test:leetcode`, `npm run test:leetcode:api`, and the existing personal-preparation tests. The API suite also supports `python3 scripts/test-leetcode-api.py --postgres` against a disposable local PostgreSQL instance. Local macOS Python may need `SSL_CERT_FILE=/etc/ssl/cert.pem`; never disable TLS verification.

The extension suite covers paginated metadata, identity changes, partial history, safe target origins, and delivery handshakes. The browser checks use the real components with isolated accounts and fixture responses. Public CN data was verified live; the logged-in full-history importer requires the user to update the extension and run it in their browser.
