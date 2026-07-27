"""Strict public schema for the server-composed Overview response."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

from .models import DashboardOverviewRecord


class _ResponseModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class DashboardProfileResponse(_ResponseModel):
    display_name: str = Field(serialization_alias="displayName")
    level: int = Field(ge=1)
    streak_days: int = Field(serialization_alias="streakDays", ge=0)
    weekly_xp: int = Field(serialization_alias="weeklyXp", ge=0)


class DashboardTaskResponse(_ResponseModel):
    id: UUID
    title: str
    status: Literal["open", "completed"]
    unlock_reason: str = Field(serialization_alias="unlockReason")
    reward_xp: int = Field(serialization_alias="rewardXp", ge=0)
    action_target: str | None = Field(serialization_alias="actionTarget")
    action_resource_id: UUID | None = Field(serialization_alias="actionResourceId")
    version: int = Field(ge=1)


class DashboardWeaknessResponse(_ResponseModel):
    skill_key: str = Field(serialization_alias="skillKey")
    label: str
    score: int = Field(ge=0)
    recommended_problem_id: UUID | None = Field(
        serialization_alias="recommendedProblemId"
    )


class DashboardPlanProgressResponse(_ResponseModel):
    plan_id: UUID = Field(serialization_alias="planId")
    completed_tasks: int = Field(serialization_alias="completedTasks", ge=0)
    total_tasks: int = Field(serialization_alias="totalTasks", ge=0)
    version: int = Field(ge=1)


class DashboardXpResponse(_ResponseModel):
    id: UUID
    skill_key: str = Field(serialization_alias="skillKey")
    amount: int = Field(gt=0)
    reason: Literal["problem_completion"]
    occurred_at: datetime = Field(serialization_alias="occurredAt")


class DashboardOverviewResponse(_ResponseModel):
    profile: DashboardProfileResponse
    today_task: DashboardTaskResponse | None = Field(serialization_alias="todayTask")
    weakness: DashboardWeaknessResponse | None
    plan_progress: DashboardPlanProgressResponse | None = Field(
        serialization_alias="planProgress"
    )
    recent_xp: list[DashboardXpResponse] = Field(serialization_alias="recentXp")
    unread_notification_count: int = Field(
        serialization_alias="unreadNotificationCount",
        ge=0,
    )
    resource_versions: dict[str, int] = Field(serialization_alias="resourceVersions")


def to_dashboard_response(record: DashboardOverviewRecord) -> DashboardOverviewResponse:
    return DashboardOverviewResponse(
        profile=DashboardProfileResponse(
            display_name=record.profile.display_name,
            level=record.profile.level,
            streak_days=record.profile.streak_days,
            weekly_xp=record.profile.weekly_xp,
        ),
        today_task=(
            None
            if record.today_task is None
            else DashboardTaskResponse(
                id=record.today_task.id,
                title=record.today_task.title,
                status=record.today_task.status,
                unlock_reason=record.today_task.unlock_reason,
                reward_xp=record.today_task.reward_xp,
                action_target=record.today_task.action_target,
                action_resource_id=record.today_task.action_resource_id,
                version=record.today_task.version,
            )
        ),
        weakness=(
            None
            if record.weakness is None
            else DashboardWeaknessResponse(
                skill_key=record.weakness.skill_key,
                label=record.weakness.label,
                score=record.weakness.score,
                recommended_problem_id=record.weakness.recommended_problem_id,
            )
        ),
        plan_progress=(
            None
            if record.plan_progress is None
            else DashboardPlanProgressResponse(
                plan_id=record.plan_progress.plan_id,
                completed_tasks=record.plan_progress.completed_tasks,
                total_tasks=record.plan_progress.total_tasks,
                version=record.plan_progress.version,
            )
        ),
        recent_xp=[
            DashboardXpResponse(
                id=item.id,
                skill_key=item.skill_key,
                amount=item.amount,
                reason=item.reason,
                occurred_at=item.occurred_at,
            )
            for item in record.recent_xp
        ],
        unread_notification_count=record.unread_notification_count,
        resource_versions=dict(record.resource_versions),
    )


__all__ = ["DashboardOverviewResponse", "to_dashboard_response"]
