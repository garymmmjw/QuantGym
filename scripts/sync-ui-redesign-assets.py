#!/usr/bin/env python3
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT / "UI 设计提升.zip"
DEST_DIR = ROOT / "assets" / "generated" / "playful-precision"

ASSETS = {
    "assets/avatar-focused-v2.png": "avatar-focused-v2.png",
    "assets/avatar-happy-v2.png": "avatar-happy-v2.png",
    "assets/avatar-wink-v2.png": "avatar-wink-v2.png",
    "assets/avatar-wow-v2.png": "avatar-wow-v2.png",
    "assets/badge-gold.webp": "badge-gold.webp",
    "assets/badge-level-1.webp": "badge-level-1.webp",
    "assets/badge-streak-7.webp": "badge-streak-7.webp",
    "assets/badge-top-rank.webp": "badge-top-rank.webp",
    "assets/brand-q-mark.webp": "brand-q-mark.webp",
    "assets/brand-quantgym-logo.webp": "brand-quantgym-logo.webp",
    "assets/feature-learn.webp": "feature-learn.webp",
    "assets/feature-practice.webp": "feature-practice.webp",
    "assets/feature-quest.webp": "feature-quest.webp",
    "assets/mascot-calculator-v2.png": "mascot-calculator-v2.png",
    "assets/mascot-fire-v2.png": "mascot-fire-v2.png",
    "assets/mascot-hero-v5-clean.png": "mascot-hero-v5-clean.png",
    "assets/mascot-interview.png": "mascot-interview.png",
    "assets/mascot-laptop-v2.png": "mascot-laptop-v2.png",
    "assets/mascot-levelup.png": "mascot-levelup.png",
    "assets/mascot-oops.png": "mascot-oops.png",
    "assets/mascot-poker.png": "mascot-poker.png",
    "assets/mascot-search.png": "mascot-search.png",
    "assets/mascot-sleep.png": "mascot-sleep.png",
    "assets/mascot-teacher-v2.png": "mascot-teacher-v2.png",
    "assets/mascot-trophy-v2.png": "mascot-trophy-v2.png",
    "assets/reward-crown.webp": "reward-crown.webp",
    "assets/reward-dumbbell.webp": "reward-dumbbell.webp",
    "assets/reward-fire.webp": "reward-fire.webp",
    "assets/reward-gem-small.webp": "reward-gem-small.webp",
    "assets/reward-growth.webp": "reward-growth.webp",
    "assets/reward-lightning.webp": "reward-lightning.webp",
    "assets/reward-medal-gold.webp": "reward-medal-gold.webp",
    "assets/reward-stopwatch.webp": "reward-stopwatch.webp",
    "assets/reward-target.webp": "reward-target.webp",
    "assets/reward-trophy.webp": "reward-trophy.webp",
    "assets/reward-xp.webp": "reward-xp.webp",
}


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def main() -> int:
    if not ZIP_PATH.exists():
        print(f"missing source zip: {ZIP_PATH}", file=sys.stderr)
        return 1

    DEST_DIR.mkdir(parents=True, exist_ok=True)
    manifest_assets = []
    with ZipFile(ZIP_PATH) as archive:
        names = set(archive.namelist())
        missing = sorted(src for src in ASSETS if src not in names)
        if missing:
            print("source zip is missing expected assets:", file=sys.stderr)
            for src in missing:
                print(f"- {src}", file=sys.stderr)
            return 1

        for src, dest_name in sorted(ASSETS.items(), key=lambda item: item[1]):
            data = archive.read(src)
            dest = DEST_DIR / dest_name
            dest.write_bytes(data)
            manifest_assets.append({
                "source": src,
                "dest": f"assets/generated/playful-precision/{dest_name}",
                "bytes": len(data),
                "sha256": sha256_bytes(data),
            })

    manifest = {
        "sourceZip": "UI 设计提升.zip",
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "assetCount": len(manifest_assets),
        "assets": manifest_assets,
    }
    (DEST_DIR / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({
        "status": "ok",
        "dest": "assets/generated/playful-precision",
        "assetCount": len(manifest_assets),
    }, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
