"""Strict public request and response schemas for the daily training loop."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class StartTrainingRequest(_StrictModel):
    problem_id: UUID = Field(
        validation_alias="problemId",
        serialization_alias="problemId",
    )
    plan_task_id: UUID | None = Field(
        default=None,
        validation_alias="planTaskId",
        serialization_alias="planTaskId",
    )


class VersionedTrainingRequest(_StrictModel):
    version: int = Field(ge=1)


class SubmitAttemptRequest(VersionedTrainingRequest):
    kind: Literal["text", "code", "multiple_choice"]
    answer: str = Field(min_length=1, max_length=50_000, repr=False)

    @field_validator("answer")
    @classmethod
    def validate_private_answer(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("answer is required")
        if "\x00" in value:
            raise ValueError("answer contains an invalid character")
        return value


class CompleteTrainingRequest(VersionedTrainingRequest):
    attempt_id: UUID = Field(
        validation_alias="attemptId",
        serialization_alias="attemptId",
    )


class StartTrainingResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    problem_id: UUID = Field(serialization_alias="problemId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    resumed: bool


class TrainingEventResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    event_id: UUID = Field(serialization_alias="eventId")
    event_sequence: int = Field(serialization_alias="eventSequence", ge=1)


class HintUseResponse(TrainingEventResponse):
    hint_zh: str | None = Field(serialization_alias="hintZh")
    hint_en: str | None = Field(serialization_alias="hintEn")


class AttemptSubmissionResponse(TrainingEventResponse):
    attempt_id: UUID = Field(serialization_alias="attemptId")
    score: int = Field(ge=0, le=100)


class SolutionRevealResponse(TrainingEventResponse):
    solution_zh: str | None = Field(serialization_alias="solutionZh")
    solution_en: str | None = Field(serialization_alias="solutionEn")


class PlanEffectResponse(_StrictModel):
    task_completed: bool = Field(serialization_alias="taskCompleted")
    plan_version: int = Field(serialization_alias="planVersion", ge=1)


class CompletionResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    xp_delta: int = Field(serialization_alias="xpDelta", ge=0)
    plan_effect: PlanEffectResponse | None = Field(serialization_alias="planEffect")


class TrainingResultResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    problem_id: UUID = Field(serialization_alias="problemId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    score: int = Field(ge=0, le=100)
    xp_delta: int = Field(serialization_alias="xpDelta", ge=0)
    completed_at: datetime = Field(serialization_alias="completedAt")
    plan_effect: PlanEffectResponse | None = Field(serialization_alias="planEffect")


def to_start_response(result: Any) -> StartTrainingResponse:
    return StartTrainingResponse(
        session_id=result.session_id,
        problem_id=result.problem_id,
        session_version=result.session_version,
        resumed=result.resumed,
    )


def to_hint_response(result: Any) -> HintUseResponse:
    return HintUseResponse(
        session_id=result.session_id,
        session_version=result.session_version,
        event_id=result.event_id,
        event_sequence=result.event_sequence,
        hint_zh=result.hint_zh,
        hint_en=result.hint_en,
    )


def to_attempt_response(result: Any) -> AttemptSubmissionResponse:
    return AttemptSubmissionResponse(
        session_id=result.session_id,
        session_version=result.session_version,
        event_id=result.event_id,
        event_sequence=result.event_sequence,
        attempt_id=result.attempt_id,
        score=result.score,
    )


def to_solution_response(result: Any) -> SolutionRevealResponse:
    return SolutionRevealResponse(
        session_id=result.session_id,
        session_version=result.session_version,
        event_id=result.event_id,
        event_sequence=result.event_sequence,
        solution_zh=result.solution_zh,
        solution_en=result.solution_en,
    )


def _plan_effect(result: Any) -> PlanEffectResponse | None:
    if result.plan_version is None:
        return None
    return PlanEffectResponse(
        task_completed=result.task_completed,
        plan_version=result.plan_version,
    )


def to_completion_response(result: Any) -> CompletionResponse:
    return CompletionResponse(
        session_id=result.session_id,
        session_version=result.session_version,
        xp_delta=result.xp_delta,
        plan_effect=_plan_effect(result),
    )


def to_result_response(result: Any) -> TrainingResultResponse:
    return TrainingResultResponse(
        session_id=result.session_id,
        problem_id=result.problem_id,
        session_version=result.session_version,
        score=result.score,
        xp_delta=result.xp_delta,
        completed_at=result.completed_at,
        plan_effect=_plan_effect(result),
    )


__all__ = [
    "AttemptSubmissionResponse",
    "CompleteTrainingRequest",
    "CompletionResponse",
    "HintUseResponse",
    "SolutionRevealResponse",
    "StartTrainingRequest",
    "StartTrainingResponse",
    "SubmitAttemptRequest",
    "TrainingEventResponse",
    "TrainingResultResponse",
    "VersionedTrainingRequest",
]
