"""Strict, secret-safe idempotency-key parsing and request fingerprints."""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from typing import Annotated, Any

from fastapi import Header, Request

from .errors import ApiError


IDEMPOTENCY_HEADER_NAME = b"x-idempotency-key"
_KEY_PATTERN = re.compile(r"^[A-Za-z0-9._~-]{16,128}$")


@dataclass(frozen=True, slots=True, repr=False)
class IdempotencyKey:
    digest: str

    def __post_init__(self) -> None:
        if re.fullmatch(r"[0-9a-f]{64}", self.digest) is None:
            raise ValueError("idempotency digest is invalid")

    def __repr__(self) -> str:
        return "IdempotencyKey(digest='[REDACTED]')"


def require_idempotency_key(
    request: Request,
    _declared_key: Annotated[
        str,
        Header(
            alias="X-Idempotency-Key",
            min_length=16,
            max_length=128,
            pattern=r"^[A-Za-z0-9._~-]+$",
        ),
    ],
) -> IdempotencyKey:
    values = [
        value
        for name, value in request.scope.get("headers", ())
        if name.lower() == IDEMPOTENCY_HEADER_NAME
    ]
    if len(values) != 1:
        raise _invalid_key()
    try:
        raw = values[0].decode("ascii")
    except UnicodeError:
        raise _invalid_key() from None
    if _KEY_PATTERN.fullmatch(raw) is None:
        raise _invalid_key()
    return IdempotencyKey(hashlib.sha256(raw.encode("ascii")).hexdigest())


def request_fingerprint(
    *,
    event_type: str,
    resource_id: str | None,
    payload: Any,
) -> str:
    canonical = json.dumps(
        {
            "eventType": event_type,
            "payload": payload,
            "resourceId": resource_id,
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _invalid_key() -> ApiError:
    return ApiError(
        status_code=400,
        code="IDEMPOTENCY_KEY_INVALID",
        message="缺少或无法识别幂等键",
        field_errors={"idempotencyKey": ["请为本次操作生成新的幂等键"]},
        retryable=False,
    )
