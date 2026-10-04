"""Build length-delimited JSON responses without retaining the complete body.

Small responses stay in memory; larger responses spill into an anonymous
temporary file. The caller owns the returned file and must close it, including
when sending headers or copying the body to a client fails.
"""

from __future__ import annotations

import json
import tempfile
from typing import BinaryIO, Callable


JSON_SPOOL_MAX_SIZE = 1024 * 1024
JSON_WRITE_CHUNK_SIZE = 64 * 1024


def _field_key(encoder: json.JSONEncoder, key):
    """Apply the same object-key conversion as the standard JSON encoder."""
    if isinstance(key, str):
        return key
    if key is True:
        return "true"
    if key is False:
        return "false"
    if key is None:
        return "null"
    if isinstance(key, int):
        return int.__repr__(key)
    if isinstance(key, float):
        return encoder.encode(key)
    raise TypeError(
        f"keys must be str, int, float, bool or None, not {type(key).__name__}"
    )


def _array_envelope_fragments(encoder: json.JSONEncoder, payload: dict, array_field: str):
    """Encode one array from an iterable without creating a list of its items."""
    yield "{"
    first_field = True
    for key, value in payload.items():
        if not first_field:
            yield encoder.item_separator
        first_field = False
        yield from encoder.iterencode(_field_key(encoder, key))
        yield encoder.key_separator
        if key != array_field:
            yield from encoder.iterencode(value)
            continue
        yield "["
        first_item = True
        for item in value:
            if not first_item:
                yield encoder.item_separator
            first_item = False
            yield from encoder.iterencode(item)
        yield "]"
    yield "}"


def spool_json_response(
    payload,
    *,
    default: Callable | None = None,
    array_field: str | None = None,
    spool_max_size: int = JSON_SPOOL_MAX_SIZE,
    chunk_size: int = JSON_WRITE_CHUNK_SIZE,
) -> tuple[BinaryIO, int]:
    """Return ``(file_at_offset_zero, UTF8_content_length)`` for an HTTP body.

    Encoding matches ``json.dumps(payload, ensure_ascii=False, default=default)``.
    For a streamed top-level array, pass its iterable as the value of
    ``payload[array_field]``. Other fields retain their insertion order. The
    iterable is consumed once, and only the current item's encoding is retained.

    Bytes are buffered into bounded writes instead of writing every iterencode
    fragment. A large string fragment is encoded to UTF-8 in smaller slices, so
    its entire UTF-8 copy is never allocated. The standard encoder can still
    allocate one escaped string fragment as large as an individual string.

    The temporary file closes on any encoding or iteration exception, before
    the caller has sent headers. Rolled-over files use TemporaryFile semantics,
    with no named response-content file left behind after closing.
    """
    if type(spool_max_size) is not int or spool_max_size <= 0:
        raise ValueError("spool_max_size must be a positive integer")
    if type(chunk_size) is not int or chunk_size < 4:
        raise ValueError("chunk_size must be an integer of at least four bytes")
    if array_field is not None:
        if not isinstance(array_field, str) or not isinstance(payload, dict):
            raise TypeError("array_field requires a dictionary and a string field name")
        if array_field not in payload:
            raise KeyError(array_field)
        if isinstance(payload[array_field], (str, bytes, bytearray, dict)):
            raise TypeError("the streamed array field must contain an array iterable")

    encoder = json.JSONEncoder(ensure_ascii=False, default=default)
    fragments = (
        encoder.iterencode(payload)
        if array_field is None
        else _array_envelope_fragments(encoder, payload, array_field)
    )
    body = tempfile.SpooledTemporaryFile(max_size=spool_max_size, mode="w+b")
    try:
        pending = bytearray()
        # A Unicode scalar requires at most four UTF-8 bytes. This also keeps
        # transient encoded slices bounded when strings contain non-BMP text.
        text_chunk_size = chunk_size // 4
        for fragment in fragments:
            for offset in range(0, len(fragment), text_chunk_size):
                encoded = fragment[offset:offset + text_chunk_size].encode("utf-8")
                if len(pending) + len(encoded) > chunk_size:
                    body.write(pending)
                    pending.clear()
                pending.extend(encoded)
                if len(pending) == chunk_size:
                    body.write(pending)
                    pending.clear()
        if pending:
            body.write(pending)
        length = body.tell()
        body.seek(0)
        return body, length
    except BaseException:
        body.close()
        raise
