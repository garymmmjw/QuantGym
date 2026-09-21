#!/usr/bin/env python3
"""Import one reviewed source over an operator's authenticated server session.

Pass --stdin or --file with either a problems array or {"problems": [...]}.
No HTTP import route is installed; stdout contains only non-content metadata.
"""

import argparse
import json
from pathlib import Path
import sys

from private_practice_catalog import MAX_IMPORT_BYTES, SOURCES, import_private_catalog, validate_private_catalog


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", choices=sorted(SOURCES), required=True)
    parser.add_argument("--expected-count", type=int, required=True)
    parser.add_argument("--validate-only", action="store_true", help="Validate and report metadata without opening the database.")
    input_group = parser.add_mutually_exclusive_group(required=True)
    input_group.add_argument("--stdin", action="store_true")
    input_group.add_argument("--file", type=Path)
    args = parser.parse_args()
    try:
        if args.stdin:
            content = sys.stdin.buffer.read(MAX_IMPORT_BYTES + 1)
        else:
            with args.file.open("rb") as handle:
                content = handle.read(MAX_IMPORT_BYTES + 1)
        if len(content) > MAX_IMPORT_BYTES:
            raise ValueError("Private catalog import exceeds 25 MiB.")
        payload = json.loads(content.decode("utf-8"))
        rows, digest = validate_private_catalog(payload, args.source, args.expected_count)
    except (OSError, UnicodeError, ValueError, RecursionError):
        # Do not echo source text, paths, or JSON parser excerpts to deploy logs.
        print("Private catalog validation failed; no database was opened.", file=sys.stderr)
        return 2
    if args.validate_only:
        print(json.dumps({"source": args.source, "problemCount": len(rows), "sha256": digest, "validated": True}))
        return 0
    try:
        import server
        summary = import_private_catalog(server.db, payload, args.source, args.expected_count, server.utc_now())
    except Exception:
        print("Private catalog import failed; its transaction was rolled back.", file=sys.stderr)
        return 1
    print(json.dumps(summary, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
