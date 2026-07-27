"""Transaction-scoped persistence for replayable idempotent operations.

The helpers in this module deliberately do not begin, commit, or roll back a
transaction.  A caller can therefore reserve an operation, apply its domain
write (including rewards), and persist the exact acknowledgement atomically on
the same SQLAlchemy connection.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection

from .errors import ApiError
from .idempotency import IdempotencyKey


_HASH_PATTERN = re.compile(r"^[0-9a-f]{64}$")
_OPERATION_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{0,79}$")
_MAX_SNAPSHOT_BYTES = 256 * 1024
_RECORD_COLUMNS = """
    id,
    user_id,
    operation,
    key_hash,
    request_hash,
    status,
    response_status,
    response_snapshot,
    resource_id,
    expires_at,
    created_at,
    updated_at,
    completed_at
"""
_SENSITIVE_KEY_PARTS = (
    "answer",
    "authorization",
    "cookie",
    "csrf",
    "idempotencykey",
    "note",
    "rawidempotencykey",
)
_SENSITIVE_STRING_PATTERN = re.compile(
    r"(?:"
    r"authorization\s*:"
    r"|(?:^|\s)bearer\s+[A-Za-z0-9._~+/=-]+"
    r"|(?:set-)?cookie\s*:"
    r"|x-csrf-token\s*:"
    r"|x-idempotency-key\s*:"
    r"|__(?:Host|Secure)-[A-Za-z0-9_-]+="
    r")",
    flags=re.IGNORECASE,
)


@dataclass(frozen=True, slots=True, repr=False)
class IdempotencyRecord:
    """A persisted idempotency state without printable secret-bearing fields."""

    id: UUID
    user_id: UUID
    operation: str
    key_hash: str
    request_hash: str
    status: str
    response_status: int | None
    response_snapshot: dict[str, Any] | None
    resource_id: UUID | None
    expires_at: datetime
    created_at: datetime
    updated_at: datetime
    completed_at: datetime | None
    acquired: bool

    def __repr__(self) -> str:
        return (
            "IdempotencyRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, "
            f"operation={self.operation!r}, status={self.status!r}, "
            f"response_status={self.response_status!r}, "
            f"resource_id={self.resource_id!r}, acquired={self.acquired!r}, "
            "key_hash='[REDACTED]', request_hash='[REDACTED]', "
            "response_snapshot='[REDACTED]')"
        )


def reserve_idempotency_record(
    connection: Connection,
    *,
    user_id: UUID,
    operation: str,
    key: IdempotencyKey,
    request_hash: str,
    now: datetime,
    expires_at: datetime,
    id_factory: Callable[[], UUID] = uuid4,
) -> IdempotencyRecord:
    """Reserve one key or return its durable terminal acknowledgement.

    A visible pending reservation is reported as an explicit retryable
    conflict.  Reusing the same key for different request content always fails
    closed.
    """

    _validate_identity(
        user_id=user_id,
        operation=operation,
        key=key,
        request_hash=request_hash,
    )
    created_at = _as_utc("now", now)
    normalized_expiry = _as_utc("expires_at", expires_at)
    if normalized_expiry <= created_at:
        raise ValueError("expires_at must be later than now")
    record_id = id_factory()
    if not isinstance(record_id, UUID):
        raise ValueError("id_factory must return a UUID")

    row = (
        connection.execute(
            text(
                f"""
                INSERT INTO idempotency_records (
                    id,
                    user_id,
                    operation,
                    key_hash,
                    request_hash,
                    status,
                    expires_at,
                    created_at,
                    updated_at
                )
                VALUES (
                    :id,
                    :user_id,
                    :operation,
                    :key_hash,
                    :request_hash,
                    'pending',
                    :expires_at,
                    :created_at,
                    :created_at
                )
                ON CONFLICT (user_id, operation, key_hash) DO NOTHING
                RETURNING {_RECORD_COLUMNS}
                """
            ),
            {
                "id": record_id,
                "user_id": user_id,
                "operation": operation,
                "key_hash": key.digest,
                "request_hash": request_hash,
                "expires_at": normalized_expiry,
                "created_at": created_at,
            },
        )
        .mappings()
        .first()
    )
    if row is not None:
        return _record_from_row(row, acquired=True)

    return replay_idempotency_record(
        connection,
        user_id=user_id,
        operation=operation,
        key=key,
        request_hash=request_hash,
        now=created_at,
    )


def replay_idempotency_record(
    connection: Connection,
    *,
    user_id: UUID,
    operation: str,
    key: IdempotencyKey,
    request_hash: str,
    now: datetime,
) -> IdempotencyRecord:
    """Load and validate the snapshot associated with an existing key."""

    _validate_identity(
        user_id=user_id,
        operation=operation,
        key=key,
        request_hash=request_hash,
    )
    observed_at = _as_utc("now", now)
    row = (
        connection.execute(
            text(
                f"""
                SELECT {_RECORD_COLUMNS}
                FROM idempotency_records
                WHERE user_id = :user_id
                  AND operation = :operation
                  AND key_hash = :key_hash
                """
            ),
            {
                "user_id": user_id,
                "operation": operation,
                "key_hash": key.digest,
            },
        )
        .mappings()
        .first()
    )
    if row is None:
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_RECORD_UNAVAILABLE",
            message="幂等请求状态尚未可见，请稍后重试",
            retryable=True,
            headers={"Retry-After": "1"},
        )

    try:
        record = _record_from_row(row, acquired=False)
    except (KeyError, TypeError, ValueError):
        raise _invalid_record() from None

    if record.request_hash != request_hash:
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_KEY_REUSED",
            message="该幂等键已用于另一份请求",
            field_errors={"idempotencyKey": ["请为不同请求生成新的幂等键"]},
            retryable=False,
        )
    if record.expires_at <= observed_at:
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_RECORD_EXPIRED",
            message="该幂等请求已过期，请使用新的幂等键",
            field_errors={"idempotencyKey": ["请生成新的幂等键后重试"]},
            retryable=False,
        )
    if record.status == "pending":
        if record.response_status is not None or record.response_snapshot is not None:
            raise _invalid_record()
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_REQUEST_IN_PROGRESS",
            message="相同请求正在处理中，请稍后重试",
            retryable=True,
            headers={"Retry-After": "1"},
        )
    if record.status not in {"completed", "failed"}:
        raise _invalid_record()

    try:
        _validate_terminal_record(record)
    except (ApiError, TypeError, ValueError):
        raise _invalid_record() from None
    return record


def complete_idempotency_record(
    connection: Connection,
    *,
    reservation: IdempotencyRecord,
    response_status: int,
    response_snapshot: Mapping[str, Any],
    resource_id: UUID | None,
    now: datetime,
) -> IdempotencyRecord:
    """Persist the exact acknowledgement inside the caller's transaction."""

    if not isinstance(reservation, IdempotencyRecord):
        raise ValueError("reservation must be an IdempotencyRecord")
    if not reservation.acquired or reservation.status != "pending":
        raise ValueError("complete requires an acquired reservation")
    completed_at = _as_utc("now", now)
    normalized_status = _response_status(response_status)
    normalized_resource_id = _optional_uuid("resource_id", resource_id)
    normalized_snapshot, encoded_snapshot = _safe_snapshot(response_snapshot)
    terminal_status = "completed" if normalized_status < 400 else "failed"

    row = (
        connection.execute(
            text(
                f"""
                UPDATE idempotency_records
                SET status = :status,
                    response_status = :response_status,
                    response_snapshot = CAST(:response_snapshot AS jsonb),
                    resource_id = :resource_id,
                    updated_at = :completed_at,
                    completed_at = :completed_at
                WHERE id = :record_id
                  AND user_id = :user_id
                  AND operation = :operation
                  AND key_hash = :key_hash
                  AND request_hash = :request_hash
                  AND status = 'pending'
                  AND expires_at > :completed_at
                RETURNING {_RECORD_COLUMNS}
                """
            ),
            {
                "record_id": reservation.id,
                "user_id": reservation.user_id,
                "operation": reservation.operation,
                "key_hash": reservation.key_hash,
                "request_hash": reservation.request_hash,
                "status": terminal_status,
                "response_status": normalized_status,
                "response_snapshot": encoded_snapshot,
                "resource_id": normalized_resource_id,
                "completed_at": completed_at,
            },
        )
        .mappings()
        .first()
    )
    if row is not None:
        record = _record_from_row(row, acquired=True)
        try:
            _validate_terminal_record(record)
        except (ApiError, TypeError, ValueError):
            raise _invalid_record() from None
        return record

    replay = replay_idempotency_record(
        connection,
        user_id=reservation.user_id,
        operation=reservation.operation,
        key=IdempotencyKey(reservation.key_hash),
        request_hash=reservation.request_hash,
        now=completed_at,
    )
    if (
        replay.status == terminal_status
        and replay.response_status == normalized_status
        and replay.response_snapshot == normalized_snapshot
        and replay.resource_id == normalized_resource_id
    ):
        return replay
    raise ApiError(
        status_code=409,
        code="IDEMPOTENCY_COMPLETION_MISMATCH",
        message="该幂等请求已完成，但确认结果与当前结果不一致",
        retryable=False,
    )


def _validate_identity(
    *,
    user_id: UUID,
    operation: str,
    key: IdempotencyKey,
    request_hash: str,
) -> None:
    if not isinstance(user_id, UUID):
        raise ValueError("user_id must be a UUID")
    if not isinstance(operation, str) or _OPERATION_PATTERN.fullmatch(operation) is None:
        raise ValueError("operation is invalid")
    if not isinstance(key, IdempotencyKey):
        raise ValueError("key must be a parsed IdempotencyKey")
    if not isinstance(request_hash, str) or _HASH_PATTERN.fullmatch(request_hash) is None:
        raise ValueError("request_hash must be a lowercase SHA-256 digest")


def _record_from_row(
    row: Mapping[str, Any],
    *,
    acquired: bool,
) -> IdempotencyRecord:
    record_id = _uuid("id", row["id"])
    user_id = _uuid("user_id", row["user_id"])
    operation = row["operation"]
    key_hash = row["key_hash"]
    request_hash = row["request_hash"]
    status = row["status"]
    if not isinstance(operation, str) or _OPERATION_PATTERN.fullmatch(operation) is None:
        raise ValueError("persisted operation is invalid")
    if not isinstance(key_hash, str) or _HASH_PATTERN.fullmatch(key_hash) is None:
        raise ValueError("persisted key hash is invalid")
    if not isinstance(request_hash, str) or _HASH_PATTERN.fullmatch(request_hash) is None:
        raise ValueError("persisted request hash is invalid")
    if not isinstance(status, str):
        raise ValueError("persisted status is invalid")

    response_snapshot = row["response_snapshot"]
    if response_snapshot is not None and not isinstance(response_snapshot, Mapping):
        raise ValueError("persisted response snapshot is invalid")
    detached_snapshot = (
        None
        if response_snapshot is None
        else json.loads(
            json.dumps(
                response_snapshot,
                ensure_ascii=False,
                allow_nan=False,
                separators=(",", ":"),
                sort_keys=True,
            )
        )
    )
    return IdempotencyRecord(
        id=record_id,
        user_id=user_id,
        operation=operation,
        key_hash=key_hash,
        request_hash=request_hash,
        status=status,
        response_status=row["response_status"],
        response_snapshot=detached_snapshot,
        resource_id=_optional_uuid("resource_id", row["resource_id"]),
        expires_at=_as_utc("expires_at", row["expires_at"]),
        created_at=_as_utc("created_at", row["created_at"]),
        updated_at=_as_utc("updated_at", row["updated_at"]),
        completed_at=(
            None
            if row["completed_at"] is None
            else _as_utc("completed_at", row["completed_at"])
        ),
        acquired=acquired,
    )


def _validate_terminal_record(record: IdempotencyRecord) -> None:
    response_status = _response_status(record.response_status)
    if record.response_snapshot is None or record.completed_at is None:
        raise ValueError("terminal record has no acknowledgement")
    if record.expires_at <= record.created_at:
        raise ValueError("persisted expiry is invalid")
    if record.completed_at < record.created_at or record.completed_at >= record.expires_at:
        raise ValueError("persisted completion time is invalid")
    if record.updated_at != record.completed_at:
        raise ValueError("persisted update time is invalid")
    if record.status == "completed" and response_status >= 400:
        raise ValueError("completed record has an error response")
    if record.status == "failed" and response_status < 400:
        raise ValueError("failed record has a success response")
    _safe_snapshot(record.response_snapshot)


def _safe_snapshot(snapshot: Mapping[str, Any]) -> tuple[dict[str, Any], str]:
    if not isinstance(snapshot, Mapping):
        raise ApiError(
            status_code=422,
            code="IDEMPOTENCY_SNAPSHOT_INVALID",
            message="幂等确认快照必须是 JSON 对象",
            retryable=False,
        )
    try:
        encoded = json.dumps(
            snapshot,
            ensure_ascii=False,
            allow_nan=False,
            separators=(",", ":"),
            sort_keys=True,
        )
        encoded_bytes = encoded.encode("utf-8")
        normalized = json.loads(encoded)
    except (TypeError, ValueError, OverflowError):
        raise ApiError(
            status_code=422,
            code="IDEMPOTENCY_SNAPSHOT_INVALID",
            message="幂等确认快照不是有效的 JSON 对象",
            retryable=False,
        ) from None
    if not isinstance(normalized, dict):
        raise ApiError(
            status_code=422,
            code="IDEMPOTENCY_SNAPSHOT_INVALID",
            message="幂等确认快照必须是 JSON 对象",
            retryable=False,
        )
    if len(encoded_bytes) > _MAX_SNAPSHOT_BYTES:
        raise ApiError(
            status_code=422,
            code="IDEMPOTENCY_SNAPSHOT_TOO_LARGE",
            message="幂等确认快照超出大小限制",
            retryable=False,
        )
    if _contains_sensitive_content(normalized):
        raise ApiError(
            status_code=422,
            code="IDEMPOTENCY_SNAPSHOT_SENSITIVE",
            message="幂等确认快照包含不可持久化的敏感内容",
            retryable=False,
        )
    return normalized, encoded


def _contains_sensitive_content(value: Any) -> bool:
    if isinstance(value, dict):
        for key, child in value.items():
            if not isinstance(key, str):
                return True
            normalized_key = re.sub(r"[^a-z0-9]", "", key.casefold())
            if any(part in normalized_key for part in _SENSITIVE_KEY_PARTS):
                return True
            if _contains_sensitive_content(child):
                return True
        return False
    if isinstance(value, list):
        return any(_contains_sensitive_content(item) for item in value)
    return isinstance(value, str) and _SENSITIVE_STRING_PATTERN.search(value) is not None


def _response_status(value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or not 200 <= value <= 599:
        raise ValueError("response_status must be an integer from 200 through 599")
    return value


def _as_utc(name: str, value: Any) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None:
        raise ValueError(f"{name} must be timezone-aware")
    try:
        offset = value.utcoffset()
    except (OverflowError, ValueError):
        raise ValueError(f"{name} has an invalid timezone") from None
    if offset is None:
        raise ValueError(f"{name} must be timezone-aware")
    return value.astimezone(UTC)


def _uuid(name: str, value: Any) -> UUID:
    if not isinstance(value, UUID):
        raise ValueError(f"{name} must be a UUID")
    return value


def _optional_uuid(name: str, value: Any) -> UUID | None:
    return None if value is None else _uuid(name, value)


def _invalid_record() -> ApiError:
    return ApiError(
        status_code=503,
        code="IDEMPOTENCY_RECORD_INVALID",
        message="幂等请求状态无法安全恢复，请稍后重试",
        retryable=True,
        headers={"Retry-After": "1"},
    )
