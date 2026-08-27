"""Internal notification records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True, repr=False)
class NotificationRecord:
    id: UUID
    user_id: UUID
    kind: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime
    action_target: str | None = None
    action_resource_id: UUID | None = None
    dedupe_key: str | None = None

    def __repr__(self) -> str:
        return (
            "NotificationRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, kind={self.kind!r}, "
            f"read_at={self.read_at!r}, created_at={self.created_at!r}, "
            f"action_target={self.action_target!r}, "
            f"action_resource_id={self.action_resource_id!r}, "
            "title='[REDACTED]', body='[REDACTED]', dedupe_key='[REDACTED]')"
        )


__all__ = ["NotificationRecord"]
