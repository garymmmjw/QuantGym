"""Transactional compare-and-swap preference updates."""

from __future__ import annotations

import json
from datetime import UTC, datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import text

from ..errors import ApiError
from ..users.models import PreferencesRecord
from .schemas import UpdatePreferencesRequest


def utc_now() -> datetime:
    return datetime.now(UTC)


class PreferencesService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._engine = engine
        self._clock = clock

    def update(
        self,
        *,
        user_id: UUID,
        payload: UpdatePreferencesRequest,
        request_id: str,
    ) -> PreferencesRecord:
        now = self._now()
        field = "theme" if payload.theme is not None else "language"
        desired = payload.theme if payload.theme is not None else payload.language
        event_type = f"preferences.update-{field}"

        with self._engine.begin() as connection:
            current = (
                connection.execute(
                    text(
                        """
                    SELECT user_id, theme, language, version, updated_at
                    FROM preferences
                    WHERE user_id = :user_id
                    FOR UPDATE
                    """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .first()
            )
            if current is None:
                raise ApiError(
                    status_code=503,
                    code="PREFERENCES_UNAVAILABLE",
                    message="偏好设置暂时不可用",
                    retryable=True,
                )

            if current[field] == desired:
                return _record(current)
            if current["version"] != payload.version:
                raise _conflict()

            row = (
                connection.execute(
                    text(
                        f"""
                    UPDATE preferences
                    SET {field} = :desired,
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE user_id = :user_id AND version = :expected_version
                    RETURNING user_id, theme, language, version, updated_at
                    """
                    ),
                    {
                        "desired": desired,
                        "expected_version": payload.version,
                        "updated_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                raise _conflict()
            connection.execute(
                text(
                    """
                    INSERT INTO audit_events
                        (id, user_id, event_type, idempotency_key_hash,
                         request_id, details, created_at)
                    VALUES
                        (:id, :user_id, :event_type, NULL, :request_id,
                         CAST(:details AS jsonb), :created_at)
                    """
                ),
                {
                    "id": uuid4(),
                    "user_id": user_id,
                    "event_type": event_type,
                    "request_id": request_id,
                    "details": json.dumps(
                        {"resultVersion": row["version"]},
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
            raise ValueError("preference clock must be timezone-aware")
        return value


def _record(row: Any) -> PreferencesRecord:
    return PreferencesRecord(
        user_id=row["user_id"],
        theme=row["theme"],
        language=row["language"],
        version=row["version"],
        updated_at=row["updated_at"],
    )


def _conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="PREFERENCE_CONFLICT",
        message="设置已在其他设备更新",
        field_errors={"version": ["版本已过期，请载入最新设置"]},
        retryable=False,
    )
