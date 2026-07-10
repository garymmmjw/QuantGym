from __future__ import annotations

import contextlib
import hashlib
import importlib.util
import io
import json
import tempfile
import unicodedata
import unittest
from pathlib import Path
from zipfile import ZipFile


SCRIPT_PATH = (
    Path(__file__).resolve().parents[1] / "scripts" / "build-ui-design-source.py"
)


def load_module():
    if not SCRIPT_PATH.is_file():
        raise AssertionError(f"missing implementation: {SCRIPT_PATH}")
    spec = importlib.util.spec_from_file_location("build_ui_design_source", SCRIPT_PATH)
    if spec is None or spec.loader is None:
        raise AssertionError(f"cannot load implementation: {SCRIPT_PATH}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BuildUiDesignSourceTest(unittest.TestCase):
    def test_extracts_only_safe_root_text_deterministically(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            archive_path = root / "design.zip"
            asset_manifest = root / "asset-manifest.json"
            first = root / "first"
            second = root / "second"
            expected_html_name = "QuantGym Café.dc.html"
            archived_html_name = unicodedata.normalize("NFD", expected_html_name)
            asset_manifest.write_text(
                '{"assetCount":1,"assets":[{"dest":"assets/generated/test.webp",'
                '"bytes":1,"sha256":"' + ("0" * 64) + '"}]}\n',
                encoding="utf-8",
            )
            with ZipFile(archive_path, "w") as archive:
                archive.writestr("README.md", "# Reference\r\n")
                archive.writestr(archived_html_name, "<html>overview</html>\r\n")
                archive.writestr("assets/mascot.png", b"png")
                archive.writestr("uploads/ui.zip", b"zip")
                archive.writestr("../escape.dc.html", "escape")
                archive.writestr("/absolute.dc.html", "absolute")

            one = module.build_reference(archive_path, first, asset_manifest)
            two = module.build_reference(archive_path, second, asset_manifest)

            self.assertEqual(one, two)
            self.assertEqual(
                {
                    path.relative_to(first).as_posix(): path.read_bytes()
                    for path in first.rglob("*")
                    if path.is_file()
                },
                {
                    path.relative_to(second).as_posix(): path.read_bytes()
                    for path in second.rglob("*")
                    if path.is_file()
                },
            )
            self.assertEqual(
                (first / "source-manifest.json").read_bytes(),
                (second / "source-manifest.json").read_bytes(),
            )
            self.assertEqual(
                [item["path"] for item in one["textFiles"]],
                [expected_html_name, "README.md"],
            )
            self.assertEqual(one["textFileCount"], 2)
            self.assertEqual(one["archive"], "design.zip")
            self.assertEqual(one["archiveBytes"], archive_path.stat().st_size)
            self.assertEqual(
                one["archiveSha256"], hashlib.sha256(archive_path.read_bytes()).hexdigest()
            )
            self.assertEqual(
                one["assetManifest"],
                "assets/generated/playful-precision/manifest.json",
            )
            self.assertEqual(
                one["assetManifestSha256"],
                hashlib.sha256(asset_manifest.read_bytes()).hexdigest(),
            )
            self.assertEqual(one["productionAssetCount"], 1)
            self.assertEqual(one["excludedPrefixes"], ["assets/", "uploads/"])

            expected_files = {
                expected_html_name: b"<html>overview</html>\n",
                "README.md": b"# Reference\n",
            }
            emitted_files = {
                path.relative_to(first / "source").as_posix(): path.read_bytes()
                for path in (first / "source").iterdir()
            }
            self.assertEqual(emitted_files, expected_files)
            for item in one["textFiles"]:
                emitted = expected_files[item["path"]]
                self.assertEqual(item["bytes"], len(emitted))
                self.assertEqual(item["sha256"], hashlib.sha256(emitted).hexdigest())
            self.assertEqual(json.loads((first / "source-manifest.json").read_text()), one)
            self.assertFalse((first / "source" / "assets").exists())
            self.assertFalse((first / "source" / "uploads").exists())
            self.assertFalse((root / "escape.dc.html").exists())

    def test_cli_rejects_invalid_counts_before_replacing_output(self):
        module = load_module()
        with tempfile.TemporaryDirectory() as raw:
            root = Path(raw)
            archive_path = root / "design.zip"
            asset_manifest = root / "asset-manifest.json"
            out_dir = root / "approved"
            source_dir = out_dir / "source"
            source_dir.mkdir(parents=True)
            existing_source = source_dir / "existing.dc.html"
            existing_manifest = out_dir / "source-manifest.json"
            existing_source.write_bytes(b"approved\n")
            existing_manifest.write_bytes(b"approved manifest\n")
            asset_manifest.write_text(
                '{"assetCount":1,"assets":[{"dest":"assets/generated/test.webp"}]}\n',
                encoding="utf-8",
            )
            with ZipFile(archive_path, "w") as archive:
                archive.writestr("README.md", "# Invalid production input\n")

            stderr = io.StringIO()
            with contextlib.redirect_stderr(stderr):
                exit_code = module.main(
                    [
                        "--archive",
                        str(archive_path),
                        "--out-dir",
                        str(out_dir),
                        "--asset-manifest",
                        str(asset_manifest),
                    ]
                )

            self.assertEqual(exit_code, 1)
            self.assertIn("real build requires 36 production assets", stderr.getvalue())
            self.assertTrue(existing_source.is_file(), "failed build replaced source/")
            self.assertEqual(existing_source.read_bytes(), b"approved\n")
            self.assertEqual(existing_manifest.read_bytes(), b"approved manifest\n")
            self.assertEqual([path.name for path in source_dir.iterdir()], [existing_source.name])


if __name__ == "__main__":
    unittest.main()
