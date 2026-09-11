# LeetCode account connection

QuantGym supports LeetCode China (`leetcode.cn`) public-profile connections. In Account, enter a username or profile URL and select **关联并同步**. The connection belongs to the signed-in QuantGym cloud account and is available across devices. A public username association is not proof of account ownership and is not used for competitive rankings.

The LeetCode module displays the public solved count, difficulty distribution, total submissions, and a review pool assembled from known accepted problems. Random review respects the current filters, avoids an immediate repeat when alternatives exist, and opens the original LeetCode problem in a new tab. Opening a problem does not mark it complete.

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
| `DELETE /api/leetcode` | Remove the linked records |

`user_leetcode` is created idempotently by the existing database initialization, for SQLite and PostgreSQL. Optimistic revisions prevent an in-flight sync from restoring a disconnected or replaced connection. Upstream failures retain the previous snapshot. Network requests use fixed CN endpoints, bounded responses, TLS verification, and no redirects.

## Verification

Run `npm run test:leetcode`, `npm run test:leetcode:api`, and the existing personal-preparation tests. The API suite also supports `python3 scripts/test-leetcode-api.py --postgres` against a disposable local PostgreSQL instance. Local macOS Python may need `SSL_CERT_FILE=/etc/ssl/cert.pem`; never disable TLS verification.

The extension suite covers paginated metadata, identity changes, partial history, safe target origins, and delivery handshakes. The browser checks use the real components with isolated accounts and fixture responses. Public CN data was verified live; the logged-in full-history importer requires the user to update the extension and run it in their browser.
