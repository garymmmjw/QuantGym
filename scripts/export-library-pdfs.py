#!/usr/bin/env python3
"""Copy configured library PDFs into a private reader storage directory."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ASSETS_PATH = ROOT / "api-server" / "library-assets.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export login-gated library PDFs for the API server.")
    parser.add_argument(
        "--out",
        default="api-server/library-pdfs",
        help="Destination directory for private PDFs. Set QUANTGYM_LIBRARY_PDF_ROOT to this path on the API server.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    out_dir = (ROOT / args.out).resolve() if not Path(args.out).is_absolute() else Path(args.out).resolve()
    payload = json.loads(ASSETS_PATH.read_text(encoding="utf-8"))
    assets = payload.get("assets", [])
    out_dir.mkdir(parents=True, exist_ok=True)
    copied = 0
    missing: list[str] = []

    for asset in assets:
        if not isinstance(asset, dict):
            continue
        source = ROOT / str(asset.get("path") or "")
        storage_path = str(asset.get("storagePath") or f"{asset.get('id')}.pdf").strip()
        target = out_dir / storage_path
        if not source.exists():
            missing.append(str(asset.get("id") or source))
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(source, target)
        copied += 1

    print(f"copied {copied} PDFs to {out_dir}")
    if missing:
        print("missing:", ", ".join(missing))


if __name__ == "__main__":
    main()
