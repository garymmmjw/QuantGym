"""Transactional, versioned, idempotent Todo operations."""

from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import text

from ..errors import ApiError
from ..idempotency import IdempotencyKey, request_fingerprint
from .models import PlanTaskRecord
from .schemas import CompleteTodoRequest, CreateTodoRequest, UpdateTodoRequest


def utc_now() -> datetime:
    return datetime.now(UTC)


_TASK_COLUMNS = (
    "id, user_id, title, status, sort_order, version, completed_at, "
    "created_at, updated_at"
)


@dataclass(frozen=True, slots=True)
class _Reservation:
    audit_id: UUID
    acquired: bool
    details: dict[str, Any]


class PlansService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
        id_factory: Callable[[], UUID] = uuid4,
    ) -> None:
        self._engine = engine
        self._clock = clock
        self._id_factory = id_factory

    def list(self, *, user_id: UUID) -> list[PlanTaskRecord]:
        with self._engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                    SELECT {_TASK_COLUMNS}
                    FROM plan_tasks
                    WHERE user_id = :user_id
                    ORDER BY
                        CASE status WHEN 'open' THEN 0 ELSE 1 END,
                        sort_order ASC,
                        created_at ASC,
                        id ASC
                    """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .all()
            )
        return [_record(row) for row in rows]

    def create(
        self,
        *,
        user_id: UUID,
        payload: CreateTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        task_id = self._id_factory()
        event_type = "todo.create"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=None,
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    INSERT INTO plan_tasks
                        (id, user_id, title, status, sort_order, version,
                         completed_at, created_at, updated_at)
                    VALUES
                        (:id, :user_id, :title, 'open', :sort_order, 1,
                         NULL, :created_at, :updated_at)
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "id": task_id,
                        "user_id": user_id,
                        "title": payload.title,
                        "sort_order": payload.sort_order,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                .mappings()
                .one()
            )
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def update(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: UpdateTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        event_type = "todo.update"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    UPDATE plan_tasks
                    SET title = COALESCE(:title, title),
                        sort_order = COALESCE(:sort_order, sort_order),
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND version = :expected_version
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "expected_version": payload.version,
                        "sort_order": payload.sort_order,
                        "task_id": task_id,
                        "title": payload.title,
                        "updated_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                _raise_task_write_failure(connection, user_id, task_id)
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def complete(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: CompleteTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        event_type = "todo.complete"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    UPDATE plan_tasks
                    SET status = 'completed',
                        completed_at = :completed_at,
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND version = :expected_version
                      AND status = 'open'
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "completed_at": now,
                        "expected_version": payload.version,
                        "task_id": task_id,
                        "updated_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                current = _select_task(connection, user_id, task_id)
                if current is None:
                    raise _not_found()
                if (
                    current["status"] == "completed"
                    and current["version"] == payload.version
                ):
                    row = current
                else:
                    raise _conflict()
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def delete(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        version: int,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> None:
        now = self._now()
        event_type = "todo.delete"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload={"version": version},
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return
            deleted = (
                connection.execute(
                    text(
                        """
                    DELETE FROM plan_tasks
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND version = :expected_version
                    RETURNING version
                    """
                    ),
                    {
                        "expected_version": version,
                        "task_id": task_id,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if deleted is None:
                _raise_task_write_failure(connection, user_id, task_id)
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=deleted["version"],
            )

    def _now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Todo clock must be timezone-aware")
        return value


def _reserve(
    connection: Any,
    *,
    user_id: UUID,
    event_type: str,
    key: IdempotencyKey,
    fingerprint: str,
    resource_id: UUID,
    request_id: str,
    now: datetime,
    id_factory: Callable[[], UUID],
) -> _Reservation:
    audit_id = id_factory()
    details = {
        "requestHash": fingerprint,
        "resourceId": str(resource_id),
        "resultVersion": None,
    }
    inserted = (
        connection.execute(
            text(
                """
            INSERT INTO audit_events
                (id, user_id, event_type, idempotency_key_hash,
                 request_id, details, created_at)
            VALUES
                (:id, :user_id, :event_type, :key_hash,
                 :request_id, CAST(:details AS jsonb), :created_at)
            ON CONFLICT (user_id, event_type, idempotency_key_hash)
                WHERE idempotency_key_hash IS NOT NULL
            DO NOTHING
            RETURNING id, details
            """
            ),
            {
                "id": audit_id,
                "user_id": user_id,
                "event_type": event_type,
                "key_hash": key.digest,
                "request_id": request_id,
                "details": json.dumps(details, separators=(",", ":"), sort_keys=True),
                "created_at": now,
            },
        )
        .mappings()
        .first()
    )
    if inserted is not None:
        return _Reservation(audit_id=inserted["id"], acquired=True, details=details)

    existing = (
        connection.execute(
            text(
                """
            SELECT id, details
            FROM audit_events
            WHERE user_id = :user_id
              AND event_type = :event_type
              AND idempotency_key_hash = :key_hash
            """
            ),
            {
                "user_id": user_id,
                "event_type": event_type,
                "key_hash": key.digest,
            },
        )
        .mappings()
        .one()
    )
    existing_details = dict(existing["details"])
    if existing_details.get("requestHash") != fingerprint:
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_KEY_REUSED",
            message="此幂等键已用于不同操作",
            field_errors={"idempotencyKey": ["请为新操作生成新的幂等键"]},
            retryable=False,
        )
    return _Reservation(
        audit_id=existing["id"],
        acquired=False,
        details=existing_details,
    )


def _finish_reservation(
    connection: Any,
    reservation: _Reservation,
    *,
    fingerprint: str,
    resource_id: UUID,
    result_version: int,
) -> None:
    details = {
        "requestHash": fingerprint,
        "resourceId": str(resource_id),
        "resultVersion": result_version,
    }
    connection.execute(
        text(
            """
            UPDATE audit_events
            SET details = CAST(:details AS jsonb)
            WHERE id = :audit_id
            """
        ),
        {
            "audit_id": reservation.audit_id,
            "details": json.dumps(details, separators=(",", ":"), sort_keys=True),
        },
    )


def _replay_task(
    connection: Any,
    user_id: UUID,
    reservation: _Reservation,
) -> PlanTaskRecord:
    try:
        task_id = UUID(str(reservation.details["resourceId"]))
        result_version = reservation.details["resultVersion"]
        if (
            not isinstance(result_version, int)
            or isinstance(result_version, bool)
            or result_version < 1
        ):
            raise ValueError
    except (KeyError, TypeError, ValueError):
        raise _replay_unavailable() from None
    row = _select_task(connection, user_id, task_id)
    if row is None or row["version"] != result_version:
        raise _replay_unavailable()
    return _record(row)


def _select_task(connection: Any, user_id: UUID, task_id: UUID) -> Any:
    return (
        connection.execute(
            text(
                f"""
            SELECT {_TASK_COLUMNS}
            FROM plan_tasks
            WHERE id = :task_id AND user_id = :user_id
            """
            ),
            {"task_id": task_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )


def _raise_task_write_failure(
    connection: Any,
    user_id: UUID,
    task_id: UUID,
) -> None:
    if _select_task(connection, user_id, task_id) is None:
        raise _not_found()
    raise _conflict()


def _record(row: Any) -> PlanTaskRecord:
    return PlanTaskRecord(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        status=row["status"],
        sort_order=row["sort_order"],
        version=row["version"],
        completed_at=row["completed_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _not_found() -> ApiError:
    return ApiError(
        status_code=404,
        code="TODO_NOT_FOUND",
        message="待办任务不存在",
        retryable=False,
    )


def _conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="TODO_CONFLICT",
        message="待办任务已在其他位置更新",
        field_errors={"version": ["版本已过期，请载入最新任务"]},
        retryable=False,
    )


def _replay_unavailable() -> ApiError:
    return ApiError(
        status_code=409,
        code="TODO_REPLAY_UNAVAILABLE",
        message="原操作已确认，但任务的当前状态不可用",
        retryable=False,
    )
