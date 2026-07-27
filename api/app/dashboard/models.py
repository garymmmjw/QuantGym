"""Typed server-composed records for the Phase 2 overview."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from types import MappingProxyType
from uuid import UUID


def _readonly_int_mapping(values: Mapping[str, int]) -> Mapping[str, int]:
    if not isinstance(values, Mapping):
        raise TypeError("resource_versions must be a mapping")
    return MappingProxyType(dict(values))


@dataclass(frozen=True, slots=True, repr=False)
class DashboardProfileRecord:
    user_id: UUID
    display_name: str
    level: int
    streak_days: int
    weekly_xp: int

    def __repr__(self) -> str:
        return (
            "DashboardProfileRecord("
            f"user_id={self.user_id!r}, level={self.level!r}, "
            f"streak_days={self.streak_days!r}, weekly_xp={self.weekly_xp!r}, "
            "display_name='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True, repr=False)
class DashboardTaskRecord:
    id: UUID
    title: str
    status: str
    unlock_reason: str
    reward_xp: int
    action_target: str | None
    action_resource_id: UUID | None
    version: int

    def __repr__(self) -> str:
        return (
            "DashboardTaskRecord("
            f"id={self.id!r}, status={self.status!r}, reward_xp={self.reward_xp!r}, "
            f"action_target={self.action_target!r}, "
            f"action_resource_id={self.action_resource_id!r}, "
            f"version={self.version!r}, title='[REDACTED]', unlock_reason='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True)
class DashboardWeaknessRecord:
    skill_key: str
    label: str
    score: int
    recommended_problem_id: UUID | None


@dataclass(frozen=True, slots=True)
class DashboardPlanProgressRecord:
    plan_id: UUID
    completed_tasks: int
    total_tasks: int
    version: int


@dataclass(frozen=True, slots=True)
class DashboardXpRecord:
    id: UUID
    skill_key: str
    amount: int
    reason: str
    occurred_at: datetime


@dataclass(frozen=True, slots=True)
class DashboardOverviewRecord:
    profile: DashboardProfileRecord
    today_task: DashboardTaskRecord | None
    weakness: DashboardWeaknessRecord | None
    plan_progress: DashboardPlanProgressRecord | None
    recent_xp: tuple[DashboardXpRecord, ...]
    unread_notification_count: int
    resource_versions: Mapping[str, int]

    def __post_init__(self) -> None:
        object.__setattr__(self, "recent_xp", tuple(self.recent_xp))
        object.__setattr__(
            self,
            "resource_versions",
            _readonly_int_mapping(self.resource_versions),
        )


__all__ = [
    "DashboardOverviewRecord",
    "DashboardPlanProgressRecord",
    "DashboardProfileRecord",
    "DashboardTaskRecord",
    "DashboardWeaknessRecord",
    "DashboardXpRecord",
]
