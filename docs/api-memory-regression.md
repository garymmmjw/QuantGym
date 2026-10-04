# API memory regression, 2026-10-04

The 512 MiB Render instance ran out of memory on October 4. Production's
4,949 catalog rows occupy about 24 MB as JSON. The previous `/api/problems`
implementation fetched every row, decoded all records, then created a complete
Unicode JSON string and its UTF-8 copy. Concurrent responses multiply these
allocations, including while clients are slow to receive them.

The synthetic-only regression uses the real handler and a disposable local
Postgres database with 4,949 generated rows and 24,041,666 stored JSON bytes.
It verifies every returned record and byte count. On macOS, Python 3.10.2:

| Four concurrent catalog handlers | Before | After |
| --- | ---: | ---: |
| Python allocation peak | 500.028 MiB | 12.582 MiB |
| Process RSS high-water | 675.062 MiB | 85.156 MiB |
| Duration without allocation instrumentation | 0.780 s | 1.407 s |

These are isolated handler measurements, deliberately bypassing the new
two-request admission limit to independently demonstrate serialization savings.
They are not production RSS or a claim about production latency. SQLite
fixtures show the same reduction. No production content is used in the fixture.
The measurements demonstrate an OOM-capable allocation path, but do not identify
the exact historical triggering request or rule out other long-running growth.

The fix streams rows through a Postgres server cursor, encodes responses into a
bounded spool and sends fixed-size chunks. Temporary files close on errors and
disconnects. Ordinary work has a concurrency bound and a short admission wait;
health and WebSocket work have separate limits. Personal preparation uses
authenticated revision validators, visible-tab polling and retry backoff.
Existing full-state reconciliation and membership filtering are retained.

Run the allocation guard using Python with the declared Postgres dependencies
and local `initdb`/`pg_ctl`:

```sh
python3 scripts/check-api-memory-regression.py --postgres --max-catalog-allocation-mib 32
```

For before/after comparisons, pass an extracted previous `server.py` through
`--server-source /tmp/quantgym-server-before.py`. Support modules and schema are
resolved from the current checkout; the benchmark always overrides database
environment variables and creates disposable data. Use `--no-tracemalloc` for
timing, not allocation comparisons.

Release validation covers full-response equality, conditional GET owner
isolation, stale-write conflicts, old-client retention, interruption before
Content-Length, lost acknowledgements, edits during a 304 response, multiple
tabs, request saturation, health availability, and a ten-player WebSocket table.
Deploy checks must compare the actual Render build commit and frontend
`version.json`, inspect database health, and observe normal traffic/resource
metrics. Short-term stability is not proof that a multi-day leak is eliminated.

Rollback code only if necessary; never restore an older database over new user
work. Render dashboard rollbacks can disable automatic deploys, so verify that
setting after recovery. No schema migration or user-data rewrite is required.
