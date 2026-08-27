"""Strict public notification response schemas."""

from __future__ import annotations

from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .models import NotificationRecord


class _ResponseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class NotificationResponse(_ResponseModel):
    id: UUID
    kind: str = Field(min_length=1, max_length=48)
    title: str = Field(min_length=1, max_length=200)
    body: str
    read_at: datetime | None = Field(serialization_alias="readAt")
    created_at: datetime = Field(serialization_alias="createdAt")


class NotificationListResponse(_ResponseModel):
    items: list[NotificationResponse]
    unread_count: int = Field(serialization_alias="unreadCount", ge=0)
    next_cursor: str | None = Field(serialization_alias="nextCursor")


def to_notification_response(record: NotificationRecord) -> NotificationResponse:
    return NotificationResponse(
        id=record.id,
        kind=record.kind,
        title=record.title,
        body=record.body,
        read_at=record.read_at,
        created_at=record.created_at,
    )
