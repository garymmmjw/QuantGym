"""Export the deterministic, secret-free Phase 1 OpenAPI document."""

from __future__ import annotations

import argparse
import json
import os
import sys
import tempfile
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
REPOSITORY_ROOT = API_ROOT.parent
OUTPUT_PATH = API_ROOT / "openapi.json"


def _render_document() -> str:
    sys.path.insert(0, str(REPOSITORY_ROOT))
    from api.app.main import create_app

    document = create_app().openapi()
    paths = document.get("paths")
    if not isinstance(paths, dict) or not paths:
        raise RuntimeError("OpenAPI must describe at least one API route")
    if any(not str(path).startswith("/api/v2/") for path in paths):
        raise RuntimeError("OpenAPI contains a route outside /api/v2")

    rendered = json.dumps(
        document,
        ensure_ascii=False,
        indent=2,
        sort_keys=True,
    ) + "\n"
    lowered = rendered.lower()
    forbidden_fragments = (
        "postgresql://",
        "postgresql+psycopg://",
        "r2.cloudflarestorage.com",
        "onrender.com",
        "x-amz-signature",
    )
    if any(fragment in lowered for fragment in forbidden_fragments):
        raise RuntimeError("OpenAPI contains a private runtime value")
    return rendered


def _write_atomically(rendered: str) -> None:
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(
        dir=OUTPUT_PATH.parent,
        prefix=".openapi.",
        suffix=".json.tmp",
        text=True,
    )
    temporary_path = Path(temporary_name)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            handle.write(rendered)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary_path, OUTPUT_PATH)
    finally:
        temporary_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--check", action="store_true")
    arguments = parser.parse_args()
    rendered = _render_document()

    if arguments.check:
        try:
            committed = OUTPUT_PATH.read_text(encoding="utf-8")
        except FileNotFoundError:
            print("OpenAPI drift: api/openapi.json is missing", file=sys.stderr)
            return 1
        if committed != rendered:
            print("OpenAPI drift: regenerate the committed contract", file=sys.stderr)
            return 1
        print("OpenAPI server contract is current.")
        return 0

    _write_atomically(rendered)
    print("Generated api/openapi.json.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
