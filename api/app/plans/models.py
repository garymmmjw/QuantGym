"""Internal plan-task records."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date, datetime
from types import MappingProxyType
from uuid import UUID


@dataclass(frozen=True, slots=True)
class PlanRecord:
    id: UUID
    user_id: UUID
    track: str
    role: str
    season: str
    weekly_hours: int
    diagnostic_status: str
    diagnostic_score: int
    diagnostic_scores: Mapping[str, int]
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    def __post_init__(self) -> None:
        if not isinstance(self.diagnostic_scores, Mapping):
            raise TypeError("diagnostic_scores must be a mapping")
        object.__setattr__(
            self,
            "diagnostic_scores",
            MappingProxyType(dict(self.diagnostic_scores)),
        )


@dataclass(frozen=True, slots=True, repr=False)
class RecommendationRecord:
    id: UUID
    user_id: UUID
    plan_id: UUID
    problem_id: UUID | None
    kind: str
    skill_key: str | None
    rationale: str
    provenance_type: str
    provenance_resource_id: UUID | None
    dedupe_key: str
    rank: int
    status: str
    version: int
    created_at: datetime
    updated_at: datetime

    def __repr__(self) -> str:
        return (
            "RecommendationRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, plan_id={self.plan_id!r}, "
            f"problem_id={self.problem_id!r}, kind={self.kind!r}, skill_key={self.skill_key!r}, "
            f"provenance_type={self.provenance_type!r}, "
            f"provenance_resource_id={self.provenance_resource_id!r}, rank={self.rank!r}, "
            f"status={self.status!r}, version={self.version!r}, created_at={self.created_at!r}, "
            f"updated_at={self.updated_at!r}, rationale='[REDACTED]', dedupe_key='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True, repr=False)
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
    plan_id: UUID | None = None
    recommendation_id: UUID | None = None
    target_problem_id: UUID | None = None
    detail: str | None = None
    scheduled_for: date | None = None
    estimated_minutes: int | None = None
    action_target: str | None = None
    skill_key: str | None = None

    def __repr__(self) -> str:
        return (
            "PlanTaskRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, status={self.status!r}, "
            f"sort_order={self.sort_order!r}, version={self.version!r}, "
            f"completed_at={self.completed_at!r}, created_at={self.created_at!r}, "
            f"updated_at={self.updated_at!r}, plan_id={self.plan_id!r}, "
            f"recommendation_id={self.recommendation_id!r}, "
            f"target_problem_id={self.target_problem_id!r}, scheduled_for={self.scheduled_for!r}, "
            f"estimated_minutes={self.estimated_minutes!r}, action_target={self.action_target!r}, "
            f"skill_key={self.skill_key!r}, title='[REDACTED]', detail='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True)
class CurrentPlanRecord:
    plan: PlanRecord
    tasks: tuple[PlanTaskRecord, ...]
    recommendations: tuple[RecommendationRecord, ...]

    @property
    def total_tasks(self) -> int:
        return len(self.tasks)

    @property
    def completed_tasks(self) -> int:
        return sum(task.status == "completed" for task in self.tasks)


@dataclass(frozen=True, slots=True)
class PlanCreationResult:
    plan_id: UUID
    plan_version: int
    task_ids: tuple[UUID, ...]


@dataclass(frozen=True, slots=True)
class PlanDiagnosticResult:
    plan_id: UUID
    plan_version: int
    recommendation_ids: tuple[UUID, ...]


@dataclass(frozen=True, slots=True)
class PlanTaskMutationResult:
    plan_version: int
    task: PlanTaskRecord


__all__ = [
    "CurrentPlanRecord",
    "PlanCreationResult",
    "PlanDiagnosticResult",
    "PlanRecord",
    "PlanTaskMutationResult",
    "PlanTaskRecord",
    "RecommendationRecord",
]
