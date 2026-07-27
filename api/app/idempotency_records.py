"""Typed, transaction-scoped persistence for idempotent domain operations.

``execute_idempotent_operation`` is the write boundary: it reserves a key,
invokes the reward/domain callback with that exact SQLAlchemy connection, and
persists a typed public acknowledgement before the caller-owned transaction
can commit.  This module never begins, commits, or rolls back that transaction.
"""

from __future__ import annotations

import json
import re
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from typing import Any, ClassVar
from uuid import UUID, uuid4

from sqlalchemy import text
from sqlalchemy.engine import Connection

from .errors import ApiError
from .idempotency import IdempotencyKey


_HASH_PATTERN = re.compile(r"^[0-9a-f]{64}$")
_OPERATION_PATTERN = re.compile(r"^[a-z][a-z0-9._-]{0,79}$")
_MAX_SNAPSHOT_BYTES = 256 * 1024
_SUPPORTED_FAILURE_CODES = frozenset(
    {
        "PERMISSION_DENIED",
        "RATE_LIMITED",
        "RESOURCE_NOT_FOUND",
        "SERVICE_UNAVAILABLE",
        "VALIDATION_ERROR",
        "VERSION_CONFLICT",
    }
)
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


class IdempotencyAcknowledgement:
    """Marker for snapshots whose complete public shape is code-controlled."""

    operation: ClassVar[str | None] = None

    def to_snapshot(self) -> dict[str, Any]:
        raise NotImplementedError


@dataclass(frozen=True, slots=True)
class PlanEffectAcknowledgement(IdempotencyAcknowledgement):
    """Non-content plan effect safe to persist in a completion acknowledgement."""

    task_completed: bool
    plan_version: int

    def __post_init__(self) -> None:
        _strict_bool("task_completed", self.task_completed)
        _positive_int("plan_version", self.plan_version)

    def to_snapshot(self) -> dict[str, Any]:
        return {
            "planVersion": self.plan_version,
            "taskCompleted": self.task_completed,
        }


@dataclass(frozen=True, slots=True)
class ProblemCompletionAcknowledgement(IdempotencyAcknowledgement):
    """The only successful public snapshot for ``problems.complete``."""

    operation: ClassVar[str] = "problems.complete"

    session_id: UUID
    session_version: int
    xp_delta: int
    plan_effect: PlanEffectAcknowledgement | None = None

    def __post_init__(self) -> None:
        _uuid("session_id", self.session_id)
        _positive_int("session_version", self.session_version)
        _nonnegative_int("xp_delta", self.xp_delta)
        if self.plan_effect is not None and not isinstance(
            self.plan_effect, PlanEffectAcknowledgement
        ):
            raise ValueError("plan_effect must be a PlanEffectAcknowledgement")

    def to_snapshot(self) -> dict[str, Any]:
        snapshot: dict[str, Any] = {
            "sessionId": str(self.session_id),
            "sessionVersion": self.session_version,
            "xpDelta": self.xp_delta,
        }
        if self.plan_effect is not None:
            snapshot["planEffect"] = self.plan_effect.to_snapshot()
        return snapshot


@dataclass(frozen=True, slots=True)
class TrainingSessionAcknowledgement(IdempotencyAcknowledgement):
    """The public identity/version result for starting or resuming training."""

    operation: ClassVar[str] = "training.start-or-resume"

    session_id: UUID
    problem_id: UUID
    session_version: int
    resumed: bool

    def __post_init__(self) -> None:
        _uuid("session_id", self.session_id)
        _uuid("problem_id", self.problem_id)
        _positive_int("session_version", self.session_version)
        _strict_bool("resumed", self.resumed)

    def to_snapshot(self) -> dict[str, Any]:
        return {
            "problemId": str(self.problem_id),
            "resumed": self.resumed,
            "sessionId": str(self.session_id),
            "sessionVersion": self.session_version,
        }


@dataclass(frozen=True, slots=True)
class PlanDiagnosticAcknowledgement(IdempotencyAcknowledgement):
    """Content-free identities produced by the diagnostic transaction."""

    operation: ClassVar[str] = "plan.run-diagnostic"

    plan_id: UUID
    plan_version: int
    recommendation_ids: tuple[UUID, ...]

    def __post_init__(self) -> None:
        _uuid("plan_id", self.plan_id)
        _positive_int("plan_version", self.plan_version)
        _uuid_tuple("recommendation_ids", self.recommendation_ids)

    def to_snapshot(self) -> dict[str, Any]:
        return {
            "planId": str(self.plan_id),
            "planVersion": self.plan_version,
            "recommendationIds": [str(value) for value in self.recommendation_ids],
        }


@dataclass(frozen=True, slots=True)
class PlanCreationAcknowledgement(IdempotencyAcknowledgement):
    """Content-free identities produced by plan creation."""

    operation: ClassVar[str] = "plan.create"

    plan_id: UUID
    plan_version: int
    task_ids: tuple[UUID, ...]

    def __post_init__(self) -> None:
        _uuid("plan_id", self.plan_id)
        _positive_int("plan_version", self.plan_version)
        _uuid_tuple("task_ids", self.task_ids)

    def to_snapshot(self) -> dict[str, Any]:
        return {
            "planId": str(self.plan_id),
            "planVersion": self.plan_version,
            "taskIds": [str(value) for value in self.task_ids],
        }


@dataclass(frozen=True, slots=True)
class FailureAcknowledgement(IdempotencyAcknowledgement):
    """Small allowlisted failure acknowledgement with no reflected content."""

    error_code: str
    retryable: bool

    def __post_init__(self) -> None:
        if self.error_code not in _SUPPORTED_FAILURE_CODES:
            raise ValueError("error_code is not an allowlisted public failure code")
        _strict_bool("retryable", self.retryable)

    def to_snapshot(self) -> dict[str, Any]:
        return {"errorCode": self.error_code, "retryable": self.retryable}


_SUCCESS_ACKNOWLEDGEMENTS: dict[str, type[IdempotencyAcknowledgement]] = {
    ProblemCompletionAcknowledgement.operation: ProblemCompletionAcknowledgement,
    TrainingSessionAcknowledgement.operation: TrainingSessionAcknowledgement,
    PlanDiagnosticAcknowledgement.operation: PlanDiagnosticAcknowledgement,
    PlanCreationAcknowledgement.operation: PlanCreationAcknowledgement,
}


@dataclass(frozen=True, slots=True)
class IdempotencyCompletion:
    """Typed result returned by the in-transaction reward/domain callback."""

    response_status: int
    acknowledgement: IdempotencyAcknowledgement
    resource_id: UUID | None

    def __post_init__(self) -> None:
        _response_status(self.response_status)
        _optional_uuid("resource_id", self.resource_id)


@dataclass(frozen=True, slots=True)
class _TransactionIdentity:
    connection: Any
    root_transaction: Any


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
    _transaction_identity: _TransactionIdentity | None = field(
        default=None,
        compare=False,
        repr=False,
    )
    _completion_permit: object | None = field(
        default=None,
        compare=False,
        repr=False,
    )

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


def execute_idempotent_operation(
    connection: Connection,
    *,
    user_id: UUID,
    operation: str,
    key: IdempotencyKey,
    request_hash: str,
    now: datetime,
    expires_at: datetime,
    reward_callback: Callable[[Connection], IdempotencyCompletion],
    completion_clock: Callable[[], datetime],
    id_factory: Callable[[], UUID] = uuid4,
) -> IdempotencyRecord:
    """Run reserve -> domain/reward callback -> complete in one transaction.

    The callback receives the exact connection that owns the reservation.  A
    replay returns before invoking it.  The active root transaction is checked
    both at reservation and completion, so a connection swap or a commit/new
    transaction between the two phases fails before the terminal UPDATE.
    """

    if not callable(reward_callback):
        raise ValueError("reward_callback must be callable")
    if not callable(completion_clock):
        raise ValueError("completion_clock must be callable")
    reservation = reserve_idempotency_record(
        connection,
        user_id=user_id,
        operation=operation,
        key=key,
        request_hash=request_hash,
        now=now,
        expires_at=expires_at,
        id_factory=id_factory,
    )
    if not reservation.acquired:
        return reservation

    completion = reward_callback(connection)
    if not isinstance(completion, IdempotencyCompletion):
        raise ValueError("reward_callback must return IdempotencyCompletion")
    permit = object()
    permitted_reservation = replace(
        reservation,
        _completion_permit=permit,
    )
    return complete_idempotency_record(
        connection,
        reservation=permitted_reservation,
        response_status=completion.response_status,
        acknowledgement=completion.acknowledgement,
        resource_id=completion.resource_id,
        now=completion_clock(),
        _completion_permit=permit,
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

    transaction_identity = _capture_transaction(connection)
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
        return _record_from_row(
            row,
            acquired=True,
            transaction_identity=transaction_identity,
        )

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

    _capture_transaction(connection)
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
    acknowledgement: IdempotencyAcknowledgement,
    resource_id: UUID | None,
    now: datetime,
    _completion_permit: object | None = None,
) -> IdempotencyRecord:
    """Persist the acknowledgement after the orchestrated reward callback.

    Direct completion is intentionally rejected.  Callers use
    :func:`execute_idempotent_operation`, which supplies the private permit only
    after its callback has run on the reservation connection.
    """

    if not isinstance(reservation, IdempotencyRecord):
        raise ValueError("reservation must be an IdempotencyRecord")
    if not reservation.acquired or reservation.status != "pending":
        raise ValueError("complete requires an acquired reservation")
    _assert_same_transaction(connection, reservation)
    if (
        _completion_permit is None
        or reservation._completion_permit is None
        or _completion_permit is not reservation._completion_permit
    ):
        raise ValueError(
            "completion must be called by execute_idempotent_operation "
            "after its reward callback"
        )
    completed_at = _as_utc("now", now)
    if completed_at < reservation.created_at:
        raise ValueError("completed_at must not precede created_at")
    normalized_status = _response_status(response_status)
    normalized_resource_id = _optional_uuid("resource_id", resource_id)
    normalized_snapshot, encoded_snapshot = _acknowledgement_snapshot(
        operation=reservation.operation,
        response_status=normalized_status,
        acknowledgement=acknowledgement,
    )
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
                  AND :completed_at >= created_at
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
        record = _record_from_row(
            row,
            acquired=True,
            transaction_identity=reservation._transaction_identity,
        )
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
    if operation not in _SUCCESS_ACKNOWLEDGEMENTS:
        raise ValueError("unsupported idempotency operation")
    if not isinstance(key, IdempotencyKey):
        raise ValueError("key must be a parsed IdempotencyKey")
    if not isinstance(request_hash, str) or _HASH_PATTERN.fullmatch(request_hash) is None:
        raise ValueError("request_hash must be a lowercase SHA-256 digest")


def _record_from_row(
    row: Mapping[str, Any],
    *,
    acquired: bool,
    transaction_identity: _TransactionIdentity | None = None,
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
        _transaction_identity=transaction_identity,
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
    _safe_snapshot(
        operation=record.operation,
        response_status=response_status,
        snapshot=record.response_snapshot,
    )


def _acknowledgement_snapshot(
    *,
    operation: str,
    response_status: int,
    acknowledgement: IdempotencyAcknowledgement,
) -> tuple[dict[str, Any], str]:
    expected_type = (
        _SUCCESS_ACKNOWLEDGEMENTS[operation]
        if response_status < 400
        else FailureAcknowledgement
    )
    if type(acknowledgement) is not expected_type:
        raise _invalid_acknowledgement()
    return _safe_snapshot(
        operation=operation,
        response_status=response_status,
        snapshot=acknowledgement.to_snapshot(),
    )


def _safe_snapshot(
    *,
    operation: str,
    response_status: int,
    snapshot: Mapping[str, Any],
) -> tuple[dict[str, Any], str]:
    if not isinstance(snapshot, Mapping):
        raise _invalid_acknowledgement()
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
        raise _invalid_acknowledgement() from None
    if not isinstance(normalized, dict):
        raise _invalid_acknowledgement()
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
    try:
        _validate_snapshot_shape(
            operation=operation,
            response_status=response_status,
            snapshot=normalized,
        )
    except (KeyError, TypeError, ValueError):
        raise _invalid_acknowledgement() from None
    return normalized, encoded


def _validate_snapshot_shape(
    *,
    operation: str,
    response_status: int,
    snapshot: Mapping[str, Any],
) -> None:
    if response_status >= 400:
        _exact_keys(snapshot, required={"errorCode", "retryable"})
        if snapshot["errorCode"] not in _SUPPORTED_FAILURE_CODES:
            raise ValueError("failure code is not allowlisted")
        _strict_bool("retryable", snapshot["retryable"])
        return

    if operation == ProblemCompletionAcknowledgement.operation:
        _exact_keys(
            snapshot,
            required={"sessionId", "sessionVersion", "xpDelta"},
            optional={"planEffect"},
        )
        _snapshot_uuid("sessionId", snapshot["sessionId"])
        _positive_int("sessionVersion", snapshot["sessionVersion"])
        _nonnegative_int("xpDelta", snapshot["xpDelta"])
        plan_effect = snapshot.get("planEffect")
        if plan_effect is not None:
            if not isinstance(plan_effect, Mapping):
                raise ValueError("planEffect must be an object")
            _exact_keys(
                plan_effect,
                required={"planVersion", "taskCompleted"},
            )
            _positive_int("planVersion", plan_effect["planVersion"])
            _strict_bool("taskCompleted", plan_effect["taskCompleted"])
        return

    if operation == TrainingSessionAcknowledgement.operation:
        _exact_keys(
            snapshot,
            required={"problemId", "resumed", "sessionId", "sessionVersion"},
        )
        _snapshot_uuid("problemId", snapshot["problemId"])
        _snapshot_uuid("sessionId", snapshot["sessionId"])
        _strict_bool("resumed", snapshot["resumed"])
        _positive_int("sessionVersion", snapshot["sessionVersion"])
        return

    if operation == PlanDiagnosticAcknowledgement.operation:
        _exact_keys(
            snapshot,
            required={"planId", "planVersion", "recommendationIds"},
        )
        _snapshot_uuid("planId", snapshot["planId"])
        _positive_int("planVersion", snapshot["planVersion"])
        _snapshot_uuid_list("recommendationIds", snapshot["recommendationIds"])
        return

    if operation == PlanCreationAcknowledgement.operation:
        _exact_keys(
            snapshot,
            required={"planId", "planVersion", "taskIds"},
        )
        _snapshot_uuid("planId", snapshot["planId"])
        _positive_int("planVersion", snapshot["planVersion"])
        _snapshot_uuid_list("taskIds", snapshot["taskIds"])
        return

    raise ValueError("operation has no acknowledgement schema")


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


def _capture_transaction(connection: Any) -> _TransactionIdentity:
    get_transaction = getattr(connection, "get_transaction", None)
    if not callable(get_transaction):
        raise ValueError("an active SQLAlchemy Connection transaction is required")
    root_transaction = get_transaction()
    if root_transaction is None or not bool(
        getattr(root_transaction, "is_active", False)
    ):
        raise ValueError("an active SQLAlchemy Connection transaction is required")
    return _TransactionIdentity(
        connection=connection,
        root_transaction=root_transaction,
    )


def _assert_same_transaction(
    connection: Any,
    reservation: IdempotencyRecord,
) -> None:
    expected = reservation._transaction_identity
    try:
        current = _capture_transaction(connection)
    except ValueError:
        raise ValueError(
            "completion requires the same active SQLAlchemy transaction as reservation"
        ) from None
    if (
        expected is None
        or current.connection is not expected.connection
        or current.root_transaction is not expected.root_transaction
    ):
        raise ValueError(
            "completion requires the same active SQLAlchemy transaction as reservation"
        )


def _exact_keys(
    value: Mapping[str, Any],
    *,
    required: set[str],
    optional: set[str] | None = None,
) -> None:
    allowed = required | (optional or set())
    actual = set(value)
    if not required <= actual or not actual <= allowed:
        raise ValueError("acknowledgement fields do not match the operation schema")


def _strict_bool(name: str, value: Any) -> bool:
    if type(value) is not bool:
        raise ValueError(f"{name} must be a boolean")
    return value


def _positive_int(name: str, value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 1:
        raise ValueError(f"{name} must be a positive integer")
    return value


def _nonnegative_int(name: str, value: Any) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{name} must be a non-negative integer")
    return value


def _uuid_tuple(name: str, value: Any) -> tuple[UUID, ...]:
    if not isinstance(value, tuple):
        raise ValueError(f"{name} must be a tuple of UUIDs")
    for item in value:
        _uuid(name, item)
    return value


def _snapshot_uuid(name: str, value: Any) -> UUID:
    if not isinstance(value, str):
        raise ValueError(f"{name} must be a canonical UUID string")
    try:
        parsed = UUID(value)
    except (AttributeError, TypeError, ValueError):
        raise ValueError(f"{name} must be a canonical UUID string") from None
    if str(parsed) != value:
        raise ValueError(f"{name} must be a canonical UUID string")
    return parsed


def _snapshot_uuid_list(name: str, value: Any) -> None:
    if not isinstance(value, list):
        raise ValueError(f"{name} must be a list of UUIDs")
    for item in value:
        _snapshot_uuid(name, item)


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


def _invalid_acknowledgement() -> ApiError:
    return ApiError(
        status_code=422,
        code="IDEMPOTENCY_ACKNOWLEDGEMENT_INVALID",
        message="该操作的幂等确认不符合公开字段约束",
        retryable=False,
    )
