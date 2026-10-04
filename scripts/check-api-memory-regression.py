#!/usr/bin/env python3
"""Measure real API serialization with synthetic data and no external services.

Each case runs in a fresh process. A slow-sink barrier keeps concurrent responses
alive together, like several clients receiving large responses simultaneously.
RSS is platform-dependent; tracemalloc isolates Python allocation during reads
and serialization. This benchmark does not establish a production memory leak.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
import gc
import hashlib
import json
import os
from pathlib import Path
import resource
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import tracemalloc
import types


ROOT = Path(__file__).resolve().parents[1]
MIB = 1024 * 1024


def rss_peak_bytes():
    value = resource.getrusage(resource.RUSAGE_SELF).ru_maxrss
    return int(value if sys.platform == "darwin" else value * 1024)


def fixture_data(case):
    # Independent strings are created by JSON decoding per request. Mixed CJK
    # and non-BMP text exercise the UTF-8 versus Python Unicode representation.
    text = "Synthetic memory fixture 中文 🧪 " * 100
    if case == "personal":
        return {
            "mentalSettings": None, "activeTrial": None, "trials": [],
            "dailySettings": None, "dailySessions": [], "activities": [],
            "removedActivityIds": [], "applicationEvents": [], "reviewEvents": [],
            "practiceSessions": [], "behavioralQuestions": [], "careerTrackerOperations": [],
            "behavioralAnswers": [
                {"id": f"synthetic-answer-{index}", "text": text,
                 "updatedAt": "2026-10-04T00:00:00Z"}
                for index in range(155)
            ],
        }
    raise ValueError(case)


def catalog_row(index):
    return {
        "id": f"synthetic-problem-{index:05d}", "source": "synthetic-memory-fixture",
        "titleEn": f"Synthetic question {index:05d}", "promptEn": "Synthetic question 中文 🧪 " * 120,
        # Padding makes the compact JSON total match the measured production
        # aggregate (24,041,666 bytes) without reading any production content.
        "answer": "Synthetic answer " * 30 + "x" * (217 + (index < 4373)),
        "createdAt": "2026-10-04T00:00:00Z",
        "updatedAt": "2026-10-04T00:00:00Z",
    }


@contextmanager
def temporary_postgres():
    """Start only a fresh cluster under /tmp, never use an existing DSN."""
    bindir = Path(os.environ.get("QUANTGYM_TEST_POSTGRES_BIN", "/opt/homebrew/opt/postgresql@18/bin"))
    initdb = shutil.which("initdb") or str(bindir / "initdb")
    pg_ctl = shutil.which("pg_ctl") or str(bindir / "pg_ctl")
    with tempfile.TemporaryDirectory(prefix="qg-memory-pg-", dir="/tmp") as directory:
        tmp = Path(directory)
        data = tmp / "data"
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            port = listener.getsockname()[1]
        with (tmp / "init.log").open("w") as log:
            subprocess.run([initdb, "-D", str(data), "-U", "fixture_admin", "-A", "trust", "--no-locale", "-E", "UTF8"],
                           check=True, stdout=log, stderr=log)
            subprocess.run([pg_ctl, "-D", str(data), "-l", str(tmp / "postgres.log"), "-w", "-o",
                            f"-h 127.0.0.1 -p {port} -k {tmp}", "start"], check=True, stdout=log, stderr=log)
            try:
                yield f"postgresql://fixture_admin@127.0.0.1:{port}/postgres"
            finally:
                subprocess.run([pg_ctl, "-D", str(data), "-m", "fast", "-w", "stop"],
                               check=True, stdout=log, stderr=log)


class SlowSink:
    def __init__(self, barrier, path):
        self.barrier = barrier
        self.first = True
        self.file = path.open("wb")
        self.size = 0

    def write(self, value):
        if self.first:
            self.first = False
            self.barrier.wait(timeout=60)
        self.size += len(value)
        return self.file.write(value)

    def flush(self):
        self.file.flush()


def run_worker(case, concurrency, server_source, postgres_dsn="", track_allocations=True):
    with tempfile.TemporaryDirectory(prefix="quantgym-memory-") as directory:
        tmp = Path(directory)
        catalog = tmp / "catalog.json"
        catalog.write_text("[]", encoding="utf-8")
        # Never consume DATABASE_URL or the user's existing data, even if the
        # caller has a production environment loaded in their terminal.
        os.environ.update({
            "QUANTGYM_DB_BACKEND": "postgres" if postgres_dsn else "sqlite", "QUANTGYM_DB": str(tmp / "isolated.sqlite3"),
            "QUANTGYM_PROBLEM_CATALOG": str(catalog), "QUANTGYM_JOBS_SOURCE_URL": "disabled",
            "QUANTGYM_POSTGRES_DATABASE_URL": postgres_dsn, "QUANTGYM_DATABASE_URL": "", "DATABASE_URL": "",
            "QUANTGYM_PRIVATE_WORKSPACES": "1", "QUANTGYM_ALERT_WEBHOOK_URL": "",
        })
        sys.path.insert(0, str(ROOT / "api-server"))
        server = types.ModuleType("memory_benchmark_server")
        # A saved baseline source still resolves its schema/support files from
        # this checkout; only code differs, never connection or data settings.
        server.__file__ = str(ROOT / "api-server/server.py")
        exec(compile(server_source.read_text(encoding="utf-8"), str(server_source), "exec"), server.__dict__)
        from personal_prep import validate_personal_prep_request

        if case == "personal":
            fixture = fixture_data(case)
            _, stored = validate_personal_prep_request({"version": 1, "baseRevision": 7, "data": fixture})
            input_bytes = len(stored.encode("utf-8"))
            del fixture
            with server.db.connect() as conn:
                conn.execute("INSERT INTO users (id, provider, email_norm, account_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
                             ("synthetic-owner", "email", "fixture@example.invalid", "{}", "2026-10-04T00:00:00Z", "2026-10-04T00:00:00Z"))
                conn.execute("INSERT INTO user_personal_prep (user_id, data_json, revision, updated_at) VALUES (?, ?, ?, ?)",
                             ("synthetic-owner", stored, 7, "2026-10-04T00:00:00Z"))
            conn.close()
        else:
            input_bytes = 0
            # Generate and insert rows incrementally, so seeding does not put a
            # complete in-memory catalog in the measured process's high-water.
            with server.db.connect() as conn:
                for index in range(4949):
                    saved = server.db.upsert_problems(conn, [catalog_row(index)])[0]
                    compact = json.dumps(saved, ensure_ascii=False, separators=(",", ":"))
                    input_bytes += len(compact.encode("utf-8"))
            conn.close()
            del saved, compact
        gc.collect()
        baseline_rss_peak = rss_peak_bytes()
        barrier = threading.Barrier(concurrency)

        def request(index):
            sink = SlowSink(barrier, tmp / f"response-{index}.json")
            handler = object.__new__(server.QuantGymHandler)
            handler.close_connection = False
            handler.command = "GET"
            handler.path = "/api/personal-prep" if case == "personal" else "/api/problems"
            handler.headers = {}
            handler.request_version = "HTTP/1.1"
            handler.wfile = sink
            handler.send_response = lambda *_args, **_kwargs: None
            handler.send_header = lambda *_args, **_kwargs: None
            handler.end_headers = lambda: None
            try:
                if case == "personal":
                    handler.require_user = lambda: {"id": "synthetic-owner"}
                    handler.get_personal_preparation()
                else:
                    handler.optional_user = lambda: None
                    handler.get_problems()
            finally:
                sink.file.close()
            return sink.size

        if track_allocations:
            tracemalloc.start()
        start = time.perf_counter()
        with ThreadPoolExecutor(max_workers=concurrency) as executor:
            sizes = list(executor.map(request, range(concurrency)))
        duration = time.perf_counter() - start
        if track_allocations:
            _, allocation_peak = tracemalloc.get_traced_memory()
            tracemalloc.stop()
        else:
            allocation_peak = None
        final_rss_peak = rss_peak_bytes()
        # Verify complete JSON and exact logical records after measurement, so
        # verification buffers are not misreported as API memory consumption.
        if case == "personal":
            expected = json.loads(stored)
        else:
            with server.db.connect() as conn:
                rows = conn.execute("SELECT problem_json FROM problems ORDER BY source, id").fetchall()
                expected = {"problems": [server.parse_json(row[0], {}) for row in rows]}
            conn.close()
        digests = set()
        for index in range(concurrency):
            raw = (tmp / f"response-{index}.json").read_bytes()
            data = json.loads(raw)
            actual = data["data"] if case == "personal" else data
            assert actual == expected, "Response changed or truncated fixture data"
            if case == "personal":
                assert data["revision"] == 7 and data["version"] == 1
            digests.add(hashlib.sha256(raw).hexdigest())
        assert len(digests) == 1
        return {
            "case": case, "concurrency": concurrency, "inputBytes": input_bytes,
            "rows": 4949 if case == "catalog" else 155,
            "responseBytes": sizes[0],
            "pythonAllocationPeakMiB": round(allocation_peak / MIB, 3) if allocation_peak is not None else None,
            "rssHighWaterBeforeMiB": round(baseline_rss_peak / MIB, 3),
            "rssHighWaterAfterMiB": round(final_rss_peak / MIB, 3),
            "durationSeconds": round(duration, 3), "dataIntegrity": True,
        }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--worker", choices=("personal", "catalog"))
    parser.add_argument("--concurrency", type=int, default=1)
    parser.add_argument("--summary", type=Path)
    parser.add_argument("--server-source", type=Path, default=ROOT / "api-server/server.py")
    parser.add_argument("--postgres", action="store_true")
    parser.add_argument("--no-tracemalloc", action="store_true", help="measure latency without allocation instrumentation")
    parser.add_argument("--max-catalog-allocation-mib", type=float, help="fail when any catalog case exceeds this measured allocation peak")
    args = parser.parse_args()
    if args.no_tracemalloc and args.max_catalog_allocation_mib is not None:
        parser.error("--max-catalog-allocation-mib requires allocation tracking")
    if args.worker:
        if args.postgres:
            with temporary_postgres() as postgres_dsn:
                result = run_worker(args.worker, args.concurrency, args.server_source, postgres_dsn, not args.no_tracemalloc)
        else:
            result = run_worker(args.worker, args.concurrency, args.server_source, track_allocations=not args.no_tracemalloc)
        print(json.dumps(result))
        return
    results = []
    for case in ("personal", "catalog"):
        for concurrency in (1, 4):
            command = [
                sys.executable, str(Path(__file__).resolve()), "--worker", case,
                "--concurrency", str(concurrency),
                "--server-source", str(args.server_source),
            ]
            if args.postgres:
                command.append("--postgres")
            if args.no_tracemalloc:
                command.append("--no-tracemalloc")
            output = subprocess.check_output(command, text=True)
            results.append(json.loads(output))
    report = {"fixture": "synthetic-only", "python": sys.version.split()[0], "platform": sys.platform,
              "serverSourceSha256": hashlib.sha256(args.server_source.read_bytes()).hexdigest(),
              "allocationTracking": not args.no_tracemalloc,
              "database": "disposable Postgres" if args.postgres else "isolated SQLite",
              "scope": "real catalog and personal-state handlers; no external services or production data",
              "results": results}
    rendered = json.dumps(report, indent=2) + "\n"
    if args.summary:
        args.summary.parent.mkdir(parents=True, exist_ok=True)
        args.summary.write_text(rendered, encoding="utf-8")
    print(rendered, end="")
    if args.max_catalog_allocation_mib is not None:
        assert all(result["pythonAllocationPeakMiB"] <= args.max_catalog_allocation_mib
                   for result in results if result["case"] == "catalog"), "Catalog memory allocation regression"


if __name__ == "__main__":
    main()
