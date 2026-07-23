"""User-scoped notification pagination and idempotent mark-read."""

from __future__ import annotations

import base64
import json
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import text

from ..errors import ApiError
from .models import NotificationRecord


def utc_now() -> datetime:
    return datetime.now(UTC)


@dataclass(frozen=True, slots=True)
class NotificationPage:
    items: list[NotificationRecord]
    unread_count: int
    next_cursor: str | None


@dataclass(frozen=True, slots=True)
class _Cursor:
    created_at: datetime
    id: UUID


class NotificationsService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._engine = engine
        self._clock = clock

    def list(
        self,
        *,
        user_id: UUID,
        cursor: str | None,
        limit: int,
    ) -> NotificationPage:
        decoded = _decode_cursor(cursor) if cursor is not None else None
        parameters: dict[str, Any] = {
            "user_id": user_id,
            "limit": limit + 1,
        }
        cursor_clause = ""
        if decoded is not None:
            cursor_clause = "AND (created_at, id) < (:cursor_created_at, :cursor_id)"
            parameters.update(
                {
                    "cursor_created_at": decoded.created_at,
                    "cursor_id": decoded.id,
                }
            )

        with self._engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                    SELECT id, user_id, kind, title, body, read_at, created_at
                    FROM notifications
                    WHERE user_id = :user_id
                    {cursor_clause}
                    ORDER BY created_at DESC, id DESC
                    LIMIT :limit
                    """
                    ),
                    parameters,
                )
                .mappings()
                .all()
            )
            unread_count = connection.execute(
                text(
                    """
                    SELECT count(*)
                    FROM notifications
                    WHERE user_id = :user_id AND read_at IS NULL
                    """
                ),
                {"user_id": user_id},
            ).scalar_one()

        visible = rows[:limit]
        next_cursor = (
            _encode_cursor(visible[-1]["created_at"], visible[-1]["id"])
            if len(rows) > limit and visible
            else None
        )
        return NotificationPage(
            items=[_record(row) for row in visible],
            unread_count=int(unread_count),
            next_cursor=next_cursor,
        )

    def mark_read(
        self,
        *,
        user_id: UUID,
        notification_id: UUID,
        request_id: str,
    ) -> NotificationRecord:
        now = self._now()
        with self._engine.begin() as connection:
            row = (
                connection.execute(
                    text(
                        """
                    UPDATE notifications
                    SET read_at = :read_at
                    WHERE id = :notification_id
                      AND user_id = :user_id
                      AND read_at IS NULL
                    RETURNING id, user_id, kind, title, body, read_at, created_at
                    """
                    ),
                    {
                        "notification_id": notification_id,
                        "read_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                row = (
                    connection.execute(
                        text(
                            """
                        SELECT id, user_id, kind, title, body, read_at, created_at
                        FROM notifications
                        WHERE id = :notification_id AND user_id = :user_id
                        """
                        ),
                        {
                            "notification_id": notification_id,
                            "user_id": user_id,
                        },
                    )
                    .mappings()
                    .first()
                )
                if row is None:
                    raise ApiError(
                        status_code=404,
                        code="NOTIFICATION_NOT_FOUND",
                        message="通知不存在",
                        retryable=False,
                    )
            else:
                connection.execute(
                    text(
                        """
                        INSERT INTO audit_events
                            (id, user_id, event_type, idempotency_key_hash,
                             request_id, details, created_at)
                        VALUES
                            (:id, :user_id, 'notifications.mark-read', NULL,
                             :request_id, CAST(:details AS jsonb), :created_at)
                        """
                    ),
                    {
                        "id": uuid4(),
                        "user_id": user_id,
                        "request_id": request_id,
                        "details": json.dumps(
                            {"notificationId": str(notification_id)},
                            separators=(",", ":"),
                            sort_keys=True,
                        ),
                        "created_at": now,
                    },
                )
        return _record(row)

    def _now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("notification clock must be timezone-aware")
        return value


def _record(row: Any) -> NotificationRecord:
    return NotificationRecord(
        id=row["id"],
        user_id=row["user_id"],
        kind=row["kind"],
        title=row["title"],
        body=row["body"],
        read_at=row["read_at"],
        created_at=row["created_at"],
    )


def _encode_cursor(created_at: datetime, notification_id: UUID) -> str:
    payload = json.dumps(
        {"createdAt": created_at.isoformat(), "id": str(notification_id)},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _decode_cursor(value: str) -> _Cursor:
    try:
        if not 1 <= len(value) <= 512 or any(
            character.isspace() for character in value
        ):
            raise ValueError
        padded = value + "=" * (-len(value) % 4)
        decoded = base64.b64decode(
            padded.encode("ascii"),
            altchars=b"-_",
            validate=True,
        )
        payload = json.loads(decoded)
        if not isinstance(payload, dict) or set(payload) != {"createdAt", "id"}:
            raise ValueError
        created_at_value = payload["createdAt"]
        notification_id_value = payload["id"]
        if not isinstance(created_at_value, str) or not isinstance(
            notification_id_value,
            str,
        ):
            raise ValueError
        created_at = datetime.fromisoformat(created_at_value)
        if created_at.tzinfo is None or created_at.utcoffset() is None:
            raise ValueError
        return _Cursor(created_at=created_at, id=UUID(notification_id_value))
    except (
        AttributeError,
        TypeError,
        ValueError,
        UnicodeError,
        json.JSONDecodeError,
    ):
        raise ApiError(
            status_code=400,
            code="NOTIFICATION_CURSOR_INVALID",
            message="通知游标无效",
            retryable=False,
        ) from None
