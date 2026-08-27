from __future__ import annotations

import re
import tomllib
from pathlib import Path


API_ROOT = Path(__file__).resolve().parents[1]
DIRECT_REQUIREMENTS = {
    "alembic": "1.18.5",
    "argon2-cffi": "25.1.0",
    "asgi-lifespan": "2.1.0",
    "boto3": "1.43.51",
    "botocore": "1.43.51",
    "cryptography": "49.0.0",
    "email-validator": "2.3.0",
    "fastapi": "0.139.2",
    "httpx": "0.28.1",
    "psycopg": "3.3.4",
    "pwdlib": "0.3.0",
    "pydantic": "2.13.4",
    "pydantic-settings": "2.14.2",
    "pyjwt": "2.13.0",
    "pytest": "9.1.1",
    "pytest-asyncio": "1.4.0",
    "s3transfer": "0.19.1",
    "sqlalchemy": "2.0.51",
    "starlette": "1.3.1",
    "testcontainers": "4.14.2",
    "uvicorn": "0.51.0",
}
_REQUIREMENT_PATTERN = re.compile(
    r"^(?P<name>[A-Za-z0-9_.-]+)(?:\[[^\]]+\])?==(?P<version>[^\s;\\]+)"
)


def _normalize_name(value: str) -> str:
    return re.sub(r"[-_.]+", "-", value).lower()


def _read_requirement_versions(path: Path) -> dict[str, str]:
    versions: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        match = _REQUIREMENT_PATTERN.match(raw_line)
        if match is None:
            continue
        versions[_normalize_name(match.group("name"))] = match.group("version")
    return versions


def test_python_and_direct_dependency_contract_is_exact() -> None:
    assert (API_ROOT / ".python-version").read_text(encoding="utf-8") == "3.13.14\n"
    assert _read_requirement_versions(API_ROOT / "requirements.in") == DIRECT_REQUIREMENTS

    pyproject = tomllib.loads((API_ROOT / "pyproject.toml").read_text(encoding="utf-8"))
    assert pyproject["project"]["requires-python"] == ">=3.13,<3.14"
    declared = {
        **_read_inline_versions(pyproject["project"]["dependencies"]),
        **_read_inline_versions(pyproject["project"]["optional-dependencies"]["test"]),
    }
    assert declared == DIRECT_REQUIREMENTS


def _read_inline_versions(requirements: list[str]) -> dict[str, str]:
    versions: dict[str, str] = {}
    for requirement in requirements:
        match = _REQUIREMENT_PATTERN.match(requirement)
        assert match is not None, f"dependency is not exactly pinned: {requirement}"
        versions[_normalize_name(match.group("name"))] = match.group("version")
    return versions


def test_resolved_lock_is_complete_hashed_and_secret_free() -> None:
    lock_text = (API_ROOT / "requirements.lock.txt").read_text(encoding="utf-8")
    lowered = lock_text.lower()
    assert "--generate-hashes" in lock_text
    assert "--index-url" not in lock_text
    assert "--extra-index-url" not in lock_text
    assert "http://" not in lowered
    assert "https://" not in lowered
    assert "-e " not in lock_text

    blocks: list[list[str]] = []
    current: list[str] | None = None
    for line in lock_text.splitlines():
        if _REQUIREMENT_PATTERN.match(line):
            if current is not None:
                blocks.append(current)
            current = [line]
        elif current is not None:
            current.append(line)
    if current is not None:
        blocks.append(current)

    assert len(blocks) >= len(DIRECT_REQUIREMENTS)
    assert all(any("--hash=sha256:" in line for line in block) for block in blocks)
    locked_versions = _read_requirement_versions(API_ROOT / "requirements.lock.txt")
    for name, version in DIRECT_REQUIREMENTS.items():
        assert locked_versions[name] == version
