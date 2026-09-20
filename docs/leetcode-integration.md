# LeetCode account connection

QuantGym supports LeetCode China (`leetcode.cn`) public-profile connections. In Account, enter a username or profile URL and select **关联并同步**. The connection belongs to the signed-in QuantGym cloud account and is available across devices. A public username association is not proof of account ownership and is not used for competitive rankings.

The compact LeetCode module displays the public solved count, difficulty distribution, total submissions, and a list assembled from known accepted problems. A native difficulty select and title/number search filter that list; each complete row is a link to the original LeetCode problem in a new tab. Opening a problem does not mark it complete or add it to the backpack.

**复习一下** opens a dialog and automatically draws one card from the entire known solved pool, excluding problems already pending in the review backpack. List difficulty and search filters do not restrict this draw. The revealed card is saved automatically; **已放入复习背包** appears only after the server confirms the save. **收好卡片** closes the dialog. There is no permanent draw workspace or per-row draw action.

## Completion times and the review backpack

The list and revealed card show **上次完成**, using the latest valid, nonfuture `lastAcceptedAt`, accepted-submission timestamp, or completed Coding OA session for the current account and exact LeetCode connection. Recall ratings are excluded from this display. Unknown dates stay unknown, and an invalid or future record cannot hide a valid older completion. Times are displayed in the user's local time zone; the list computes history in one batch for the whole pool.

Saved backpack cards survive reloads and are available across devices on the same QuantGym account and LeetCode connection. Their displayed completion time is the server's AC baseline at the draw, or unknown if no dated AC is available. Drawing the same pending problem again does not duplicate it or reset that baseline. A failed save offers a retry of the same event, rather than claiming the card is saved.

A card leaves the backpack only when the server observes an AC for the same problem whose timestamp is strictly later than its baseline (if known), at or after the server-recorded draw time, and no later than the current server time. This rule does not require the three-hour interval used by calendar completion counts. Older history imports, metadata-only timestamps, failed submissions, recall ratings, and Coding OA sessions do not remove a card. A genuinely later imported AC can remove it without becoming trusted public-sync evidence. GET projects the current pending cards; sync, import, and subsequent saves persist completion markers so later history compaction cannot revive a completed draw. A new draw after completion starts a new pending card.

## Weighted random practice

LeetCode random practice and the standalone **Coding OA** module share `drawReviewProblem(problems, previousSlug, random, { now, submissions, practiceSessions, connection })`. The first three arguments remain compatible with existing callers; the fourth supplies an injectable clock and the current account's accepted submissions, saved personal practice sessions, and active LeetCode connection. The function returns the original problem object or `null`. It respects the supplied pool and excludes an explicitly supplied previous problem whenever alternatives exist. The current LeetCode dialog supplies the full solved pool minus pending backpack cards; its automatic draw does not use the list filters. Legacy due-first helpers remain available in the model but are not exposed by the new LeetCode UI.

For each candidate, the latest practice time is the newest known `lastAcceptedAt`, accepted-submission timestamp, saved `review.lastReviewedAt`, or the latest completed Coding OA session timestamp. Frequency uses unique accepted submission IDs for that problem (with a minimum of one, since it is in the solved pool) plus saved `review.reviewCount` and completed Coding OA session IDs for the current linked profile. Coding OA drafts and draws are excluded. Sessions must match both `question.username` and `question.linkedAt`; disconnected/replaced profiles and other accounts do not affect the weights. This is a count of known accepted records, explicit review feedback, and completed Coding OA attempts, not an all-time count of distinct practice sessions or failed attempts. Public history can be incomplete, and a practice session followed by both an AC and recall feedback contributes both signals.

The weight is `(1 + log(1 + elapsedDays)) / sqrt(knownAcceptedCount + reviewCount + codingOACount)`. Holding frequency constant, increasing the time since practice strictly increases the weight; holding time constant, increasing frequency strictly decreases it. The logarithm and square root keep either factor from overwhelming the other. Each candidate retains a positive chance. Selection uses cumulative weights, with deterministic random/clock injection available for tests.

Missing timestamps remain unknown and use the median known elapsed time of the current pool for weighting; if every date is unknown, recency weights are equal. Future timestamps have zero elapsed days in this existing weighting model, even though the completion-time display excludes them. Duplicate submissions, invalid dates, and non-AC rows do not inflate history. Drawing writes only a backpack event, not completion dates, practice counts, or a review schedule. Opening a problem makes no such write. Previously saved recall feedback still contributes to the weighting formula; removing its UI did not remove that data or change the algorithm. Backpack entries restrict eligibility and are not added to practice-frequency counts.

## Legacy spaced-review compatibility

The new LeetCode UI does not display due dates, suggested review intervals, due/upcoming/first-review filters, recall ratings, or a due-first action. Existing SM-2 state, model helpers, and `POST /api/leetcode/review` remain intact for compatibility. Drawing a card neither deletes this history nor records new recall feedback.

The retained scheduling API follows the [original SuperMemo SM-2 algorithm](https://super-memory.org/archive/english/ol/sm2.htm). Its four ratings map to quality scores 1, 3, 4, and 5. Successful reviews use intervals of 1 day, 6 days, then the previous interval multiplied by the previous ease factor and rounded up. Failure restarts the interval at one day; ease has a floor of 1.3 and intervals are bounded at 36,500 days. A known last AC seeds an initial suggestion, while undated problems remain uninitialized in the legacy state.

Saved feedback survives refresh, later AC submissions, and imports. Only an explicit rating command changes its schedule; ratings never increase solved counts, AC submissions, or completed calendar activity. The API timestamps reviews in UTC and uses elapsed 24-hour intervals. Existing version checks and event receipts prevent conflicting or duplicate feedback writes.

Legacy review state and the backpack belong to the current QuantGym account and linked LeetCode profile. Disconnecting or replacing that profile removes them together with its snapshot; refreshing or reconnecting the same active connection preserves them. Relinking after a disconnect creates a new connection lifetime. Existing training records in other QuantGym modules are separate.

## Daily records and history coverage

- Calendar completion counts come only from dated accepted submissions. The same problem counts again when its AC is at least three hours after the previous counted AC. Midnight and Stage boundaries do not restart that interval; an earlier, uncounted AC does not move the anchor.
- LeetCode's source calendar reports submission totals. Its Unix keys encode UTC-midnight date labels; QuantGym preserves those source labels instead of treating them as individual submission instants or converting them to local solved counts.
- The public recent feed is limited. A partial pool is labeled with the number of known problems, and a day without accepted details is shown as unknown rather than a fabricated zero.
- The shared client checks the saved server snapshot each minute while a relevant view is visible, and on focus, reconnect, page restore, or return to a visible tab. Checks within 30 seconds reuse the current result. When the last upstream sync is at least five minutes old, it also refreshes LeetCode; the server caches successful syncs for at least 60 seconds. No background scheduler collects history while the app is closed.
- Stage **新完成** counts distinct first solves; **总完成** includes qualifying three-hour repeats. A complete imported history certifies dated first solves only through its capture time. For later work, a private solved-set checkpoint advances only when the known AC problem set at the start of a public-profile request matches the official solved count. A newly seen problem is bounded between the preceding checkpoint and its earliest known AC. It counts as a confirmed new problem in a Stage only when that entire interval lies inside the Stage's left-open, right-closed local-date range. Missing problems, late older ACs, and intervals crossing Stage boundaries remain partial; checkpoints never claim complete submission history or increase Guardian's trusted coverage.

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
| `POST /api/leetcode/backpack` | Save one drawn problem to the private review backpack |
| `POST /api/leetcode/review` | Legacy explicit recall rating and next-review calculation; not used by the new UI |
| `DELETE /api/leetcode` | Remove the linked records |

`user_leetcode` is created idempotently by the existing database initialization, for SQLite and PostgreSQL. Optimistic revisions prevent an in-flight sync from restoring a disconnected or replaced connection. Upstream failures retain the previous snapshot. Network requests use fixed CN endpoints, bounded responses, TLS verification, and no redirects.

Backpack commands contain exactly `username`, `linkedAt`, `problemSlug`, and a canonical UUID `eventId`. The authenticated session chooses the QuantGym owner; request data cannot select another owner or supply `drawnAt` or `baselineCompletedAt`. The server verifies the current connection lifetime and that the problem belongs to its completed collection, then computes the draw time and latest dated AC baseline. Responses expose `reviewBackpack: [{ problemSlug, drawnAt, baselineCompletedAt }]`, with a nullable baseline. Private `_reviewBackpack` and `_reviewBackpackEvents` retain entries, receipts, and completion markers inside the existing JSON snapshot.

An identical backpack event is a no-write replay, including after its card is completed; reusing the event for a different action conflicts. A different event for an already pending problem preserves the original entry. Concurrent revision conflicts reapply the command against the latest saved snapshot with bounded retries and the same connection checks, preserving other draws and synchronized records. Limits are 4 KiB per command, 60 requests per minute per user, and 20,000 retained backpack events within the 16 MiB snapshot bound. `addReviewCard(payload)` returns `{ data, error }` and the UI retries with the original event ID. Older servers may omit the read field, which defaults to an empty array; a save is acknowledged only by the backpack endpoint returning the field and matching connection.

Review commands contain only `username`, `linkedAt`, `problemSlug`, `rating`, a UUID `eventId`, and the problem's `expectedVersion`. User ownership comes from the authenticated session. Connection identity and per-problem versions reject stale writes; replaying an identical event is idempotent, including concurrent delivery. Clients cannot supply review timestamps, due dates, or intervals. Private `_reviewStates` and `_reviewEvents` remain inside the existing JSON snapshot, while responses project `problems[].review` plus `reviewPolicy`. GET never writes review state. Commands are limited to 4 KiB, 60 requests per minute per user, and 20,000 retained review events within the existing snapshot size bound.

## Verification

Run `npm run test:leetcode`, `npm run test:leetcode:api`, and the existing personal-preparation tests. The API command includes the dedicated backpack suite covering persistence, binding isolation, retries, concurrent saves, completion boundaries, and history compaction. Both `python3 scripts/test-leetcode-api.py --postgres` and `python3 scripts/test-leetcode-backpack-api.py --postgres` support disposable local PostgreSQL instances with the required driver installed. Local macOS Python may need `SSL_CERT_FILE=/etc/ssl/cert.pem`; never disable TLS verification.

The extension suite covers paginated metadata, identity changes, partial history, safe target origins, and delivery handshakes. The browser checks use the real components with isolated accounts and fixture responses. Public CN data was verified live; the logged-in full-history importer requires the user to update the extension and run it in their browser.
