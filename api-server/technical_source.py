"""Load an optional runtime-only question bundle without publishing its contents.

Render supplies the default path as a Secret File. Local checks can select a
fixture with QUANTGYM_TECHNICAL_BUNDLE_PATH. An explicitly selected or present
bundle must be valid: configuration errors never silently fall back to old data.
"""

from functools import lru_cache
import json
import os
from pathlib import Path


DEFAULT_BUNDLE_PATH = Path("/etc/secrets/quantgym-purple-book.json")
MAX_BUNDLE_BYTES = 1024 * 1024
MAX_PROBLEMS = 5000


def validate_technical_bundle(payload):
    if not isinstance(payload, dict) or type(payload.get("version")) is not int or payload["version"] != 1:
        raise ValueError("Invalid private question bundle version.")
    if payload.get("source") != "question-bank" or set(payload) != {"version", "source", "problems", "supplements", "metadata"}:
        raise ValueError("Invalid private question bundle fields.")
    rows = payload["problems"]
    if not isinstance(rows, list) or not 1 <= len(rows) <= MAX_PROBLEMS:
        raise ValueError("Invalid private question bundle problems.")
    seen = set()
    for row in rows:
        if not isinstance(row, dict):
            raise ValueError("Invalid private question bundle entry.")
        identity = row.get("id")
        if not isinstance(identity, str) or not identity.strip() or len(identity) > 512 or identity in seen:
            raise ValueError("Invalid private question bundle identity.")
        if row.get("source") != "question-bank" and row.get("bookSlug") != "question-bank":
            raise ValueError("Invalid private question bundle entry source.")
        seen.add(identity)
    if not isinstance(payload["supplements"], dict) or not isinstance(payload["metadata"], dict):
        raise ValueError("Invalid private question bundle supplements or metadata.")
    count = payload["metadata"].get("problemCount")
    if type(count) is not int or count != len(rows):
        raise ValueError("Private question bundle count does not match metadata.")
    return payload


@lru_cache(maxsize=1)
def load_technical_bundle():
    """Return one shared snapshot, or None only when no bundle was configured.

    A single cached document keeps questions and source supplements on the same
    edition. Updating a Render Secret File redeploys the service and clears the
    process cache; no partial hot reload or credential values are logged here.
    """
    override = os.environ.get("QUANTGYM_TECHNICAL_BUNDLE_PATH")
    if override is not None and not override.strip():
        raise ValueError("Private question bundle path is empty.")
    path = Path(override).expanduser() if override is not None else DEFAULT_BUNDLE_PATH
    try:
        with path.open("rb") as handle:
            content = handle.read(MAX_BUNDLE_BYTES + 1)
    except FileNotFoundError:
        if override is None and not path.is_symlink():
            return None
        raise
    if len(content) > MAX_BUNDLE_BYTES:
        raise ValueError("Private question bundle is too large.")
    try:
        payload = json.loads(content.decode("utf-8"))
    except (UnicodeError, json.JSONDecodeError, RecursionError) as error:
        raise ValueError("Private question bundle is not valid UTF-8 JSON.") from error
    return validate_technical_bundle(payload)
