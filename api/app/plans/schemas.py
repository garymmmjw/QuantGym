"""Strict public Todo request and response schemas."""

from __future__ import annotations

from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import (
    CurrentPlanRecord,
    PlanCreationResult,
    PlanDiagnosticResult,
    PlanTaskMutationResult,
    PlanTaskRecord,
)


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


def _clean_title(value: str) -> str:
    value = value.strip()
    if not value:
        raise ValueError("task title is required")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("task title contains unsafe characters")
    return value


class CreateTodoRequest(_StrictModel):
    title: str = Field(min_length=1, max_length=240)
    sort_order: int = Field(
        default=0,
        validation_alias="sortOrder",
        serialization_alias="sortOrder",
        ge=0,
        le=2_147_483_647,
    )

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str) -> str:
        return _clean_title(value)


class UpdateTodoRequest(_StrictModel):
    version: int = Field(ge=1)
    title: str | None = Field(default=None, min_length=1, max_length=240)
    sort_order: int | None = Field(
        default=None,
        validation_alias="sortOrder",
        serialization_alias="sortOrder",
        ge=0,
        le=2_147_483_647,
    )

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None) -> str | None:
        return _clean_title(value) if value is not None else None

    @model_validator(mode="after")
    def require_change(self) -> UpdateTodoRequest:
        if self.title is None and self.sort_order is None:
            raise ValueError("at least one task field must be supplied")
        return self


class CompleteTodoRequest(_StrictModel):
    version: int = Field(ge=1)


class PlanTaskResponse(_StrictModel):
    id: UUID
    title: str
    status: Literal["open", "completed"]
    sort_order: int = Field(serialization_alias="sortOrder", ge=0)
    version: int = Field(ge=1)
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class TodoListResponse(_StrictModel):
    items: list[PlanTaskResponse]


PlanTrack = Literal["internship", "fulltime"]
PlanActionTarget = Literal[
    "problems",
    "tools",
    "resume",
    "jobs",
    "experiences",
    "interview",
    "custom",
]

DIAGNOSTIC_DEFINITION_VERSION = "baseline-v1"
DIAGNOSTIC_QUESTION_IDS = frozenset(
    {
        "mm-percent",
        "prob-coin",
        "prob-die",
        "stats-pvalue",
        "market-spread",
        "option-call",
        "code-two-sum",
        "research-validation",
    }
)


class CreatePlanRequest(_StrictModel):
    track: PlanTrack
    role: str = Field(min_length=1, max_length=48)
    season: str = Field(min_length=1, max_length=48)
    weekly_hours: Literal[5, 8, 12, 16] = Field(
        validation_alias="weeklyHours",
        serialization_alias="weeklyHours",
    )

    @field_validator("role", "season")
    @classmethod
    def clean_plan_dimension(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("plan dimension is required")
        if any(ord(character) < 32 or ord(character) == 127 for character in cleaned):
            raise ValueError("plan dimension contains unsafe characters")
        return cleaned


class DiagnosticAnswerRequest(_StrictModel):
    question_id: str = Field(
        validation_alias="questionId",
        serialization_alias="questionId",
        min_length=1,
        max_length=64,
    )
    option_id: str = Field(
        validation_alias="optionId",
        serialization_alias="optionId",
        min_length=1,
        max_length=120,
        repr=False,
    )


class RunPlanDiagnosticRequest(_StrictModel):
    plan_version: int = Field(
        validation_alias="planVersion",
        serialization_alias="planVersion",
        ge=1,
    )
    definition_version: Literal["baseline-v1"] = Field(
        validation_alias="definitionVersion",
        serialization_alias="definitionVersion",
    )
    answers: tuple[DiagnosticAnswerRequest, ...] = Field(
        min_length=len(DIAGNOSTIC_QUESTION_IDS),
        max_length=len(DIAGNOSTIC_QUESTION_IDS),
        repr=False,
    )

    @model_validator(mode="after")
    def require_complete_definition(self) -> RunPlanDiagnosticRequest:
        question_ids = [answer.question_id for answer in self.answers]
        if len(set(question_ids)) != len(question_ids):
            raise ValueError("diagnostic questions must not be repeated")
        if set(question_ids) != DIAGNOSTIC_QUESTION_IDS:
            raise ValueError("all baseline-v1 diagnostic questions are required")
        return self


class UpdatePlanTaskRequest(_StrictModel):
    plan_version: int = Field(
        validation_alias="planVersion",
        serialization_alias="planVersion",
        ge=1,
    )
    task_version: int = Field(
        validation_alias="taskVersion",
        serialization_alias="taskVersion",
        ge=1,
    )
    title: str | None = Field(default=None, min_length=1, max_length=240)
    detail: str | None = Field(default=None, max_length=2_000)
    scheduled_for: date | None = Field(
        default=None,
        validation_alias="scheduledFor",
        serialization_alias="scheduledFor",
    )
    estimated_minutes: int | None = Field(
        default=None,
        validation_alias="estimatedMinutes",
        serialization_alias="estimatedMinutes",
        ge=1,
        le=1_440,
    )
    sort_order: int | None = Field(
        default=None,
        validation_alias="sortOrder",
        serialization_alias="sortOrder",
        ge=0,
        le=2_147_483_647,
    )

    @field_validator("title")
    @classmethod
    def clean_official_title(cls, value: str | None) -> str | None:
        return _clean_title(value) if value is not None else None

    @field_validator("detail")
    @classmethod
    def clean_detail(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = value.strip()
        if not cleaned:
            return None
        if any(ord(character) < 32 and character not in "\n\t" for character in cleaned):
            raise ValueError("task detail contains unsafe characters")
        return cleaned

    @model_validator(mode="after")
    def require_edit(self) -> UpdatePlanTaskRequest:
        editable = {
            "title",
            "detail",
            "scheduled_for",
            "estimated_minutes",
            "sort_order",
        }
        if not self.model_fields_set.intersection(editable):
            raise ValueError("at least one editable task field must be supplied")
        for field_name in ("title", "sort_order"):
            if field_name in self.model_fields_set and getattr(self, field_name) is None:
                raise ValueError(f"{field_name} cannot be null")
        return self


class CompletePlanTaskRequest(_StrictModel):
    plan_version: int = Field(
        validation_alias="planVersion",
        serialization_alias="planVersion",
        ge=1,
    )
    task_version: int = Field(
        validation_alias="taskVersion",
        serialization_alias="taskVersion",
        ge=1,
    )


class PlanCreationResponse(_StrictModel):
    plan_id: UUID = Field(serialization_alias="planId")
    plan_version: int = Field(serialization_alias="planVersion", ge=1)
    task_ids: tuple[UUID, ...] = Field(serialization_alias="taskIds")


class PlanDiagnosticResponse(_StrictModel):
    plan_id: UUID = Field(serialization_alias="planId")
    plan_version: int = Field(serialization_alias="planVersion", ge=1)
    recommendation_ids: tuple[UUID, ...] = Field(
        serialization_alias="recommendationIds"
    )


class OfficialPlanTaskResponse(_StrictModel):
    id: UUID
    plan_id: UUID = Field(serialization_alias="planId")
    recommendation_id: UUID | None = Field(serialization_alias="recommendationId")
    target_problem_id: UUID | None = Field(serialization_alias="targetProblemId")
    title: str
    detail: str | None
    status: Literal["open", "completed"]
    scheduled_for: date | None = Field(serialization_alias="scheduledFor")
    estimated_minutes: int | None = Field(serialization_alias="estimatedMinutes")
    action_target: PlanActionTarget | None = Field(serialization_alias="actionTarget")
    skill_key: str | None = Field(serialization_alias="skillKey")
    sort_order: int = Field(serialization_alias="sortOrder", ge=0)
    version: int = Field(ge=1)
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class RecommendationResponse(_StrictModel):
    id: UUID
    problem_id: UUID | None = Field(serialization_alias="problemId")
    kind: Literal["problem", "skill", "task"]
    skill_key: str | None = Field(serialization_alias="skillKey")
    rationale: str
    provenance_type: Literal["diagnostic", "training", "system"] = Field(
        serialization_alias="provenanceType"
    )
    provenance_resource_id: UUID | None = Field(
        serialization_alias="provenanceResourceId"
    )
    rank: int = Field(ge=0)
    status: Literal["active", "applied", "dismissed"]
    version: int = Field(ge=1)
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class PlanProgressResponse(_StrictModel):
    total: int = Field(ge=0)
    completed: int = Field(ge=0)


class OfficialPlanResponse(_StrictModel):
    id: UUID
    track: PlanTrack
    role: str
    season: str
    weekly_hours: Literal[5, 8, 12, 16] = Field(serialization_alias="weeklyHours")
    diagnostic_status: Literal["pending", "completed", "skipped"] = Field(
        serialization_alias="diagnosticStatus"
    )
    diagnostic_score: int = Field(serialization_alias="diagnosticScore", ge=0)
    diagnostic_scores: dict[str, int] = Field(serialization_alias="diagnosticScores")
    status: Literal["active", "completed", "archived"]
    version: int = Field(ge=1)
    progress: PlanProgressResponse
    tasks: tuple[OfficialPlanTaskResponse, ...]
    recommendations: tuple[RecommendationResponse, ...]
    created_at: datetime = Field(serialization_alias="createdAt")
    updated_at: datetime = Field(serialization_alias="updatedAt")


class CurrentPlanResponse(_StrictModel):
    plan: OfficialPlanResponse | None


class PlanTaskMutationResponse(_StrictModel):
    plan_version: int = Field(serialization_alias="planVersion", ge=1)
    task: OfficialPlanTaskResponse


def to_plan_task_response(record: PlanTaskRecord) -> PlanTaskResponse:
    return PlanTaskResponse(
        id=record.id,
        title=record.title,
        status=record.status,
        sort_order=record.sort_order,
        version=record.version,
        completed_at=record.completed_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def to_plan_creation_response(result: PlanCreationResult) -> PlanCreationResponse:
    return PlanCreationResponse(
        plan_id=result.plan_id,
        plan_version=result.plan_version,
        task_ids=result.task_ids,
    )


def to_plan_diagnostic_response(result: PlanDiagnosticResult) -> PlanDiagnosticResponse:
    return PlanDiagnosticResponse(
        plan_id=result.plan_id,
        plan_version=result.plan_version,
        recommendation_ids=result.recommendation_ids,
    )


def to_official_task_response(record: PlanTaskRecord) -> OfficialPlanTaskResponse:
    if record.plan_id is None:
        raise ValueError("official plan tasks require plan_id")
    return OfficialPlanTaskResponse(
        id=record.id,
        plan_id=record.plan_id,
        recommendation_id=record.recommendation_id,
        target_problem_id=record.target_problem_id,
        title=record.title,
        detail=record.detail,
        status=record.status,
        scheduled_for=record.scheduled_for,
        estimated_minutes=record.estimated_minutes,
        action_target=record.action_target,
        skill_key=record.skill_key,
        sort_order=record.sort_order,
        version=record.version,
        completed_at=record.completed_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


def to_current_plan_response(record: CurrentPlanRecord | None) -> CurrentPlanResponse:
    if record is None:
        return CurrentPlanResponse(plan=None)
    plan = record.plan
    return CurrentPlanResponse(
        plan=OfficialPlanResponse(
            id=plan.id,
            track=plan.track,
            role=plan.role,
            season=plan.season,
            weekly_hours=plan.weekly_hours,
            diagnostic_status=plan.diagnostic_status,
            diagnostic_score=plan.diagnostic_score,
            diagnostic_scores=dict(plan.diagnostic_scores),
            status=plan.status,
            version=plan.version,
            progress=PlanProgressResponse(
                total=record.total_tasks,
                completed=record.completed_tasks,
            ),
            tasks=tuple(to_official_task_response(task) for task in record.tasks),
            recommendations=tuple(
                RecommendationResponse(
                    id=item.id,
                    problem_id=item.problem_id,
                    kind=item.kind,
                    skill_key=item.skill_key,
                    rationale=item.rationale,
                    provenance_type=item.provenance_type,
                    provenance_resource_id=item.provenance_resource_id,
                    rank=item.rank,
                    status=item.status,
                    version=item.version,
                    created_at=item.created_at,
                    updated_at=item.updated_at,
                )
                for item in record.recommendations
            ),
            created_at=plan.created_at,
            updated_at=plan.updated_at,
        )
    )


def to_plan_task_mutation_response(
    result: PlanTaskMutationResult,
) -> PlanTaskMutationResponse:
    return PlanTaskMutationResponse(
        plan_version=result.plan_version,
        task=to_official_task_response(result.task),
    )
