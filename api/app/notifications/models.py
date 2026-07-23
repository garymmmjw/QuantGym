"""Internal notification records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class NotificationRecord:
    id: UUID
    user_id: UUID
    kind: str
    title: str
    body: str
    read_at: datetime | None
    created_at: datetime
