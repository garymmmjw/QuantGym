"""Private Learn release validation and installation; never opens a user database."""
import hashlib
import json
from pathlib import Path
import shutil
import tarfile
import tempfile

from private_practice_catalog import validate_private_catalog

LEARN_FILES = (
    'library.json', 'practice.json', 'scoring/modules.json',
    'scoring/problems-index.json', 'scoring/item-difficulty.json',
    'scoring/item-difficulty-v2.json',
)
PAYLOAD_FILES = tuple('learn/' + name for name in LEARN_FILES) + ('weng/problems.json',)
MAX_FILE_BYTES = 25 * 1024 * 1024
MAX_BUNDLE_BYTES = 50 * 1024 * 1024


def encode_json(payload):
    return json.dumps(payload, ensure_ascii=False, separators=(',', ':'), allow_nan=False).encode('utf-8')


def digest(content):
    return hashlib.sha256(content).hexdigest()


def validate_learn_documents(documents):
    if set(documents) != set(LEARN_FILES):
        raise ValueError('The Learn resource set is incomplete.')
    library = documents['library.json']
    if not isinstance(library, dict) or not isinstance(library.get('tracks'), list) or not isinstance(library.get('lessons'), list):
        raise ValueError('Invalid Learn library.')
    lessons = library['lessons']
    if not lessons or any(not isinstance(row, dict) or not isinstance(row.get('id'), str) or not row['id'] for row in lessons):
        raise ValueError('Invalid Learn lessons.')
    if len({row['id'] for row in lessons}) != len(lessons):
        raise ValueError('Duplicate Learn lesson identities.')
    for filename, key, kind in [('practice.json', 'lists', list), ('scoring/modules.json', 'modules', list),
                                ('scoring/item-difficulty.json', 'b', dict), ('scoring/item-difficulty-v2.json', 'b', dict)]:
        payload = documents[filename]
        if not isinstance(payload, dict) or not isinstance(payload.get(key), kind):
            raise ValueError('Invalid Learn resource shape.')
    if not isinstance(documents['scoring/problems-index.json'], list):
        raise ValueError('Invalid Learn problem index.')
    return len(lessons)


def manifest_for(files, problem_count, lesson_count, image_count):
    return {'version': 1, 'source': 'quantvault', 'access': 'authenticated-vip',
            'deploymentScope': 'owner-requested-vip-private-beta',
            'rightsStatus': 'source-rights-unchanged',
            'problemCount': problem_count, 'lessonCount': lesson_count, 'inlineImageCount': image_count,
            'files': {name: {'bytes': len(files[name]), 'sha256': digest(files[name])} for name in sorted(files)}}


def read_release(path):
    if Path(path).stat().st_size > MAX_BUNDLE_BYTES:
        raise ValueError('Private release bundle is too large.')
    files = {}
    with tarfile.open(path, 'r:gz') as archive:
        for member in archive:
            if member.name not in (*PAYLOAD_FILES, 'manifest.json') or member.name in files or not member.isfile():
                raise ValueError('Private release contains an unexpected archive entry.')
            if member.size < 1 or member.size > MAX_FILE_BYTES or sum(map(len, files.values())) + member.size > MAX_BUNDLE_BYTES:
                raise ValueError('Private release file is too large.')
            stream = archive.extractfile(member)
            content = stream.read(MAX_FILE_BYTES + 1)
            if len(content) != member.size:
                raise ValueError('Private release file is truncated.')
            files[member.name] = content
    if set(files) != {*PAYLOAD_FILES, 'manifest.json'}:
        raise ValueError('Private release files are incomplete.')
    manifest = json.loads(files.pop('manifest.json'))
    if not isinstance(manifest, dict) or manifest.get('version') != 1 or manifest.get('source') != 'quantvault' or manifest.get('access') != 'authenticated-vip' or manifest.get('deploymentScope') != 'owner-requested-vip-private-beta':
        raise ValueError('Invalid private release manifest.')
    if set(manifest.get('files', {})) != set(PAYLOAD_FILES):
        raise ValueError('Invalid private release manifest file list.')
    for name, content in files.items():
        if manifest['files'][name] != {'bytes': len(content), 'sha256': digest(content)}:
            raise ValueError('Private release integrity check failed.')
    documents = {name: json.loads(files['learn/' + name]) for name in LEARN_FILES}
    lesson_count = validate_learn_documents(documents)
    validate_private_catalog(json.loads(files['weng/problems.json']), 'quantvault', manifest.get('problemCount'))
    if manifest.get('lessonCount') != lesson_count:
        raise ValueError('Private release lesson count mismatch.')
    return files, manifest


def install_release(bundle, destination):
    files, manifest = read_release(bundle)
    release_id = digest(encode_json(manifest))[:20]
    root = Path(destination).expanduser().resolve()
    root.mkdir(parents=True, exist_ok=True, mode=0o700)
    release = root / release_id
    expected = {**files, 'manifest.json': encode_json(manifest)}
    if release.exists():
        if release.is_symlink() or any(not (release / name).is_file() or (release / name).is_symlink() or (release / name).read_bytes() != content for name, content in expected.items()):
            raise ValueError('Existing release does not match the validated bundle.')
    else:
        staging = Path(tempfile.mkdtemp(prefix='.learning-install-', dir=root))
        try:
            for name, content in expected.items():
                target = staging / name
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                target.write_bytes(content)
                target.chmod(0o600)
            staging.rename(release)
        finally:
            if staging.exists():
                shutil.rmtree(staging)
    return {'releaseId': release_id, 'learnRoot': str(release / 'learn'),
            'problemsFile': str(release / 'weng/problems.json'),
            'problemCount': manifest['problemCount'], 'lessonCount': manifest['lessonCount'],
            'inlineImageCount': manifest['inlineImageCount']}
