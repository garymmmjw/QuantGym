#!/usr/bin/env python3
"""Synthetic private release checks. No source content, network, or user DB."""
import base64
import importlib.util
import io
import json
from pathlib import Path
import sys
import tarfile
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'api-server'))
from learning_release import encode_json, digest, install_release, manifest_for, read_release
spec = importlib.util.spec_from_file_location('prepare', ROOT / 'scripts/prepare-learning-release.py')
prepare = importlib.util.module_from_spec(spec)
spec.loader.exec_module(prepare)


def fixture():
    documents = {
        'library.json': {'tracks': [{'id': 'q'}], 'lessons': [{'id': 'lesson', 'data': {'md': 'Fixture'}}]},
        'practice.json': {'lists': []}, 'scoring/modules.json': {'modules': []},
        'scoring/problems-index.json': [], 'scoring/item-difficulty.json': {'b': {}},
        'scoring/item-difficulty-v2.json': {'b': {}, 'c': {}},
    }
    question = {'id': 'quantvault-1', 'source': 'quantvault', 'visibility': 'private',
                'titleEn': 'Fixture', 'promptEn': 'Question?', 'explanation': 'Answer.',
                'review': {key: {'status': 'approved_source'} for key in ('prompt', 'answer', 'classification')}}
    return {**{'learn/' + name: encode_json(payload) for name, payload in documents.items()},
            'weng/problems.json': encode_json({'problems': [question]})}


class LearningReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.files = fixture()

    def bundle(self, files=None, manifest=None, extra=None):
        files = self.files if files is None else files
        manifest = manifest_for(files, 1, 1, 0) if manifest is None else manifest
        path = self.root / 'bundle.tar.gz'
        with tarfile.open(path, 'w:gz') as archive:
            for name, data in {**files, 'manifest.json': encode_json(manifest)}.items():
                info = tarfile.TarInfo(name)
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
            if extra:
                archive.addfile(extra)
        return path

    def test_install_versions_are_complete_idempotent_private_and_do_not_replace_older_release(self):
        path = self.bundle()
        first = install_release(path, self.root / 'private')
        self.assertEqual(install_release(path, self.root / 'private'), first)
        self.assertEqual(first['problemCount'], 1)
        self.assertEqual((Path(first['learnRoot']) / 'library.json').stat().st_mode & 0o777, 0o600)
        self.files['learn/practice.json'] = encode_json({'lists': [{'id': 'new'}]})
        second = install_release(self.bundle(), self.root / 'private')
        self.assertNotEqual(first['releaseId'], second['releaseId'])
        self.assertEqual(json.loads((Path(first['learnRoot']) / 'practice.json').read_text()), {'lists': []})

    def test_hash_mismatch_rejected_before_install(self):
        manifest = manifest_for(self.files, 1, 1, 0)
        self.files['learn/library.json'] += b' '
        with self.assertRaises(ValueError):
            install_release(self.bundle(manifest=manifest), self.root / 'private')
        self.assertFalse((self.root / 'private').exists())

    def test_archive_paths_symlinks_and_missing_files_rejected(self):
        for name in ('../outside', '/outside', 'learn/unknown.json'):
            extra = tarfile.TarInfo(name)
            with self.assertRaises(ValueError):
                read_release(self.bundle(extra=extra))
        extra = tarfile.TarInfo('learn/library.json')
        extra.type = tarfile.SYMTYPE
        extra.linkname = '/etc/passwd'
        with self.assertRaises(ValueError):
            read_release(self.bundle(extra=extra))
        files = {key: value for key, value in self.files.items() if key != 'learn/practice.json'}
        with self.assertRaises(ValueError):
            read_release(self.bundle(files=files))

    def test_public_questions_and_count_mismatch_are_rejected(self):
        data = json.loads(self.files['weng/problems.json'])
        data['problems'][0]['visibility'] = 'public'
        self.files['weng/problems.json'] = encode_json(data)
        with self.assertRaises(ValueError):
            read_release(self.bundle())
        self.files = fixture()
        manifest = manifest_for(self.files, 2, 1, 0)
        with self.assertRaises(ValueError):
            read_release(self.bundle(manifest=manifest))

    def test_existing_release_tampering_is_not_silently_overwritten(self):
        path = self.bundle()
        result = install_release(path, self.root / 'private')
        file = Path(result['learnRoot']) / 'library.json'
        file.write_text('changed')
        with self.assertRaises(ValueError):
            install_release(path, self.root / 'private')
        self.assertEqual(file.read_text(), 'changed')

    def test_images_inline_only_lesson_data_and_validate_manifest_hashes(self):
        content = b'\x89PNG\r\n\x1a\nfixture'
        image = self.root / 'media/lectures/image.png'
        image.parent.mkdir(parents=True)
        image.write_bytes(content)
        metadata = {'relative_path': 'lectures/image.png', 'export_path': 'media/lectures/image.png',
                    'source_url': 'https://example.invalid/lectures/image.png', 'bytes': len(content), 'sha256': digest(content)}
        library = {'media': [metadata], 'lessons': [{'id': 'lesson', 'data': {'md': '![Example](lectures/image.png)'}, 'source': metadata}]}
        self.assertEqual(prepare.inline_lesson_images(library, self.root), 1)
        self.assertIn('data:image/png;base64,' + base64.b64encode(content).decode(), library['lessons'][0]['data']['md'])
        self.assertEqual(library['lessons'][0]['source'], metadata)
        image.write_bytes(content + b'bad')
        with self.assertRaises(ValueError):
            prepare.inline_lesson_images(library, self.root)


if __name__ == '__main__':
    unittest.main(verbosity=2)
