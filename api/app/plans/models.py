"""Internal plan-task records."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PlanTaskRecord:
    id: UUID
    user_id: UUID
    title: str
    status: str
    sort_order: int
    version: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime
