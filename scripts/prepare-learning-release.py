#!/usr/bin/env python3
"""Package authenticated Learn/Weng content under ignored artifacts only.

Includes a hash manifest, six private Learn JSON resources, and the reviewed
Weng operator import. Course images are embedded only in private lesson data.
"""
import argparse
import base64
import io
import json
import re
from pathlib import Path
import sys
import tarfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'api-server'))
from learning_release import LEARN_FILES, MAX_FILE_BYTES, encode_json, digest, manifest_for, read_release, validate_learn_documents
from private_practice_catalog import validate_private_catalog


def inline_lesson_images(library, content_root):
    mapping = {}
    root = content_root.resolve()
    media = library.get('media', [])
    if not isinstance(media, list):
        raise ValueError('Invalid Learn image manifest.')
    for item in media:
        relative = item.get('relative_path', '')
        exported = item.get('export_path', '')
        if not relative.startswith('lectures/') or exported != 'media/' + relative:
            raise ValueError('Invalid Learn image path.')
        image_path = (root / exported).resolve(strict=True)
        if not image_path.is_relative_to(root / 'media') or not image_path.is_file():
            raise ValueError('Learn image escaped its source directory.')
        content = image_path.read_bytes()
        mime = 'image/png' if content.startswith(b'\x89PNG\r\n\x1a\n') else 'image/jpeg' if content.startswith(b'\xff\xd8\xff') else None
        if mime is None or len(content) != item.get('bytes') or digest(content) != item.get('sha256'):
            raise ValueError('Learn image integrity check failed.')
        encoded = 'data:' + mime + ';base64,' + base64.b64encode(content).decode('ascii')
        for alias in (item.get('source_url'), 'private/' + exported, '/private/' + exported, exported, relative):
            if alias:
                mapping[alias] = encoded
    # Restrict rewriting to lesson content. Provenance paths and hashes remain
    # unchanged and the original private source corpus is never modified.
    aliases = sorted(mapping, key=len, reverse=True)
    pattern = re.compile('|'.join(re.escape(alias) for alias in aliases)) if aliases else None
    def rewrite(value):
        if isinstance(value, str):
            return pattern.sub(lambda match: mapping[match.group()], value) if pattern else value
        if isinstance(value, list):
            return [rewrite(item) for item in value]
        if isinstance(value, dict):
            return {key: rewrite(item) for key, item in value.items()}
        return value
    library['lessons'] = [{**lesson, 'data': rewrite(lesson.get('data'))} for lesson in library['lessons']]
    return len(media)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--learn-root', type=Path, default=ROOT / 'QuantVault/learn-preview/public/private')
    parser.add_argument('--problems', type=Path, default=ROOT / 'data/question-banks/quantvault/problems.json')
    parser.add_argument('--expected-count', type=int, default=860)
    parser.add_argument('--output', type=Path, default=ROOT / 'artifacts/learning-release/learning-release.tar.gz')
    args = parser.parse_args()
    try:
        output = args.output.resolve()
        if not output.is_relative_to(ROOT / 'artifacts') or output.suffixes[-2:] != ['.tar', '.gz']:
            raise ValueError('Private release output must be an artifacts/*.tar.gz file.')
        documents = {name: json.loads((args.learn_root / name).read_text()) for name in LEARN_FILES}
        lessons = validate_learn_documents(documents)
        problems = json.loads(args.problems.read_text())
        rows, _ = validate_private_catalog(problems, 'quantvault', args.expected_count)
        images = inline_lesson_images(documents['library.json'], args.learn_root)
        files = {'learn/' + name: encode_json(payload) for name, payload in documents.items()}
        files['weng/problems.json'] = encode_json({'problems': rows})
        if any(len(content) > MAX_FILE_BYTES for content in files.values()):
            raise ValueError('Private release resource is too large.')
        manifest = manifest_for(files, len(rows), lessons, images)
        files['manifest.json'] = encode_json(manifest)
        output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
        temporary = output.with_suffix('.tmp')
        try:
            with tarfile.open(temporary, 'w:gz') as archive:
                for name, content in files.items():
                    info = tarfile.TarInfo(name)
                    info.size = len(content)
                    info.mode = 0o600
                    archive.addfile(info, io.BytesIO(content))
            temporary.chmod(0o600)
            read_release(temporary)
            temporary.replace(output)
        finally:
            temporary.unlink(missing_ok=True)
        print(json.dumps({'bundle': str(output), 'bytes': output.stat().st_size, 'sha256': digest(output.read_bytes()),
                          'problemCount': len(rows), 'lessonCount': lessons, 'inlineImageCount': images}))
        return 0
    except Exception:
        print('Private learning release preparation failed; no source data or database was modified.', file=sys.stderr)
        return 1


if __name__ == '__main__':
    raise SystemExit(main())
