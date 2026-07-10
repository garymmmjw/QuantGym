#!/usr/bin/env python3
"""Version the approved UI design archive as deterministic text sources."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
import unicodedata
from pathlib import Path, PurePosixPath, PureWindowsPath
from typing import Any, Sequence
from zipfile import BadZipFile, ZipFile


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_ARCHIVE = ROOT / "UI 设计提升.zip"
DEFAULT_OUT_DIR = ROOT / "docs" / "ui-reference" / "playful-precision"
DEFAULT_ASSET_MANIFEST = (
    ROOT / "assets" / "generated" / "playful-precision" / "manifest.json"
)
ASSET_MANIFEST_PATH = "assets/generated/playful-precision/manifest.json"
EXPECTED_PRODUCTION_ASSET_COUNT = 36
EXPECTED_TEXT_FILE_COUNT = 30
EXCLUDED_PREFIXES = ["assets/", "uploads/"]
ALLOWED_TEXT_NAMES = {
    "README.md",
    "qg-state.js",
    "support.js",
    "吉祥物生成任务书.md",
}


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def is_design_text(name: str) -> bool:
    normalized = unicodedata.normalize("NFC", name)
    posix_path = PurePosixPath(normalized)
    windows_path = PureWindowsPath(normalized)
    if not normalized or "\x00" in normalized:
        return False
    if "/" in normalized or "\\" in normalized:
        return False
    if posix_path.is_absolute() or windows_path.is_absolute() or windows_path.drive:
        return False
    if len(posix_path.parts) != 1 or posix_path.parts[0] in {".", ".."}:
        return False
    return normalized in ALLOWED_TEXT_NAMES or normalized.endswith(".dc.html")


def _read_asset_manifest(asset_manifest: Path) -> tuple[bytes, int]:
    manifest_bytes = asset_manifest.read_bytes()
    try:
        parsed = json.loads(manifest_bytes.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ValueError(f"invalid asset manifest {asset_manifest}: {error}") from error

    if not isinstance(parsed, dict):
        raise ValueError(f"asset manifest must be an object: {asset_manifest}")
    assets = parsed.get("assets")
    asset_count = parsed.get("assetCount")
    if not isinstance(assets, list):
        raise ValueError(f"asset manifest assets must be an array: {asset_manifest}")
    if isinstance(asset_count, bool) or not isinstance(asset_count, int):
        raise ValueError(f"asset manifest assetCount must be an integer: {asset_manifest}")
    if asset_count != len(assets):
        raise ValueError(
            "asset manifest assetCount does not match assets length: "
            f"{asset_count} != {len(assets)}"
        )
    return manifest_bytes, asset_count


def _read_design_texts(archive_path: Path) -> list[tuple[str, bytes]]:
    selected: list[tuple[str, bytes]] = []
    seen_names: set[str] = set()
    with ZipFile(archive_path) as archive:
        entries = sorted(
            (
                (unicodedata.normalize("NFC", info.filename), info)
                for info in archive.infolist()
            ),
            key=lambda item: item[0],
        )
        for normalized_name, info in entries:
            if info.is_dir() or not is_design_text(normalized_name):
                continue
            if normalized_name in seen_names:
                raise ValueError(
                    f"archive contains duplicate normalized path: {normalized_name}"
                )
            seen_names.add(normalized_name)
            raw_text = archive.read(info).decode("utf-8", errors="strict")
            normalized_text = raw_text.replace("\r\n", "\n").replace("\r", "\n")
            selected.append((normalized_name, normalized_text.encode("utf-8")))
    return selected


def _replace_source_directory(source_dir: Path) -> None:
    if source_dir.is_symlink() or source_dir.is_file():
        source_dir.unlink()
    elif source_dir.exists():
        shutil.rmtree(source_dir)
    source_dir.mkdir(parents=True)


def build_reference(
    archive_path: Path, out_dir: Path, asset_manifest: Path
) -> dict[str, Any]:
    archive_path = Path(archive_path)
    out_dir = Path(out_dir)
    asset_manifest = Path(asset_manifest)

    asset_manifest_bytes, production_asset_count = _read_asset_manifest(asset_manifest)
    text_sources = _read_design_texts(archive_path)
    archive_bytes = archive_path.stat().st_size
    archive_sha256 = sha256_file(archive_path)

    out_dir.mkdir(parents=True, exist_ok=True)
    source_dir = out_dir / "source"
    _replace_source_directory(source_dir)

    text_files = []
    for name, content in text_sources:
        (source_dir / name).write_bytes(content)
        text_files.append(
            {
                "path": name,
                "bytes": len(content),
                "sha256": sha256_bytes(content),
            }
        )

    manifest = {
        "version": 1,
        "archive": unicodedata.normalize("NFC", archive_path.name),
        "archiveBytes": archive_bytes,
        "archiveSha256": archive_sha256,
        "assetManifest": ASSET_MANIFEST_PATH,
        "assetManifestSha256": sha256_bytes(asset_manifest_bytes),
        "productionAssetCount": production_asset_count,
        "textFileCount": len(text_files),
        "textFiles": text_files,
        "excludedPrefixes": EXCLUDED_PREFIXES,
    }
    (out_dir / "source-manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
        newline="\n",
    )
    return manifest


def _parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Build deterministic text references from the approved UI design archive."
    )
    parser.add_argument(
        "--archive",
        type=Path,
        default=Path(os.environ.get("QUANTGYM_DESIGN_ARCHIVE", DEFAULT_ARCHIVE)),
        help="Path to the approved UI design ZIP archive.",
    )
    parser.add_argument(
        "--out-dir",
        type=Path,
        default=DEFAULT_OUT_DIR,
        help="Destination containing source/ and source-manifest.json.",
    )
    parser.add_argument(
        "--asset-manifest",
        type=Path,
        default=DEFAULT_ASSET_MANIFEST,
        help="Runtime asset manifest whose hash and asset count are recorded.",
    )
    return parser.parse_args(argv)


def main(argv: Sequence[str] | None = None) -> int:
    args = _parse_args(argv)
    try:
        _, production_asset_count = _read_asset_manifest(args.asset_manifest)
        if production_asset_count != EXPECTED_PRODUCTION_ASSET_COUNT:
            print(
                "error: real build requires "
                f"{EXPECTED_PRODUCTION_ASSET_COUNT} production assets; found "
                f"{production_asset_count}",
                file=sys.stderr,
            )
            return 1

        text_file_count = len(_read_design_texts(args.archive))
        if text_file_count != EXPECTED_TEXT_FILE_COUNT:
            print(
                f"error: real build requires {EXPECTED_TEXT_FILE_COUNT} text files; "
                f"found {text_file_count}",
                file=sys.stderr,
            )
            return 1

        manifest = build_reference(args.archive, args.out_dir, args.asset_manifest)
    except (BadZipFile, OSError, UnicodeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1

    print(
        json.dumps(
            {
                "status": "ok",
                "outDir": str(args.out_dir),
                "productionAssetCount": manifest["productionAssetCount"],
                "textFileCount": manifest["textFileCount"],
            },
            ensure_ascii=False,
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
