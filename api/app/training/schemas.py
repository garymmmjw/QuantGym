"""Strict public request and response schemas for the daily training loop."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


TrainingSessionStatus = Literal["active", "completed", "abandoned"]


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


class TrainingSessionResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    problem_id: UUID = Field(serialization_alias="problemId")
    plan_task_id: UUID | None = Field(serialization_alias="planTaskId")
    status: TrainingSessionStatus
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    started_at: datetime = Field(serialization_alias="startedAt")
    last_activity_at: datetime = Field(serialization_alias="lastActivityAt")
    attempt_id: UUID | None = Field(serialization_alias="attemptId")
    score: int | None = Field(ge=0, le=100)
    hint_zh: str | None = Field(serialization_alias="hintZh")
    hint_en: str | None = Field(serialization_alias="hintEn")
    solution_zh: str | None = Field(serialization_alias="solutionZh")
    solution_en: str | None = Field(serialization_alias="solutionEn")

    @model_validator(mode="after")
    def require_coherent_attempt(self) -> TrainingSessionResponse:
        if (self.attempt_id is None) != (self.score is None):
            raise ValueError("latest evaluated attempt is inconsistent")
        return self


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


class SkillEffectResponse(_StrictModel):
    skill_key: str = Field(serialization_alias="skillKey", min_length=1)
    previous_best_score: int | None = Field(
        serialization_alias="previousBestScore",
        ge=0,
        le=100,
    )
    current_best_score: int = Field(
        serialization_alias="currentBestScore",
        ge=0,
        le=100,
    )
    delta: int = Field(ge=0, le=100)

    @field_validator("skill_key")
    @classmethod
    def require_nonempty_skill_key(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("skillKey is required")
        return value

    @model_validator(mode="after")
    def require_coherent_best_score_effect(self) -> SkillEffectResponse:
        baseline = self.previous_best_score or 0
        if self.current_best_score < baseline:
            raise ValueError("currentBestScore cannot decrease")
        if self.delta != self.current_best_score - baseline:
            raise ValueError("delta must equal the best-score increase")
        return self


class NextTrainingActionResponse(_StrictModel):
    target: Literal["problems", "overview"]
    problem_id: UUID | None = Field(serialization_alias="problemId")

    @model_validator(mode="after")
    def require_coherent_target(self) -> NextTrainingActionResponse:
        if self.target == "problems" and self.problem_id is None:
            raise ValueError("problemId is required for a problems target")
        if self.target == "overview" and self.problem_id is not None:
            raise ValueError("problemId must be null for an overview target")
        return self


class CompletionResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    xp_delta: int = Field(serialization_alias="xpDelta", ge=0)
    plan_effect: PlanEffectResponse | None = Field(serialization_alias="planEffect")
    skill_effect: SkillEffectResponse = Field(serialization_alias="skillEffect")
    next_action: NextTrainingActionResponse = Field(serialization_alias="nextAction")


class TrainingResultResponse(_StrictModel):
    session_id: UUID = Field(serialization_alias="sessionId")
    problem_id: UUID = Field(serialization_alias="problemId")
    session_version: int = Field(serialization_alias="sessionVersion", ge=1)
    score: int = Field(ge=0, le=100)
    xp_delta: int = Field(serialization_alias="xpDelta", ge=0)
    completed_at: datetime = Field(serialization_alias="completedAt")
    plan_effect: PlanEffectResponse | None = Field(serialization_alias="planEffect")
    skill_effect: SkillEffectResponse = Field(serialization_alias="skillEffect")
    next_action: NextTrainingActionResponse = Field(serialization_alias="nextAction")


def to_start_response(result: Any) -> StartTrainingResponse:
    return StartTrainingResponse(
        session_id=result.session_id,
        problem_id=result.problem_id,
        session_version=result.session_version,
        resumed=result.resumed,
    )


def to_session_response(result: Any) -> TrainingSessionResponse:
    return TrainingSessionResponse(
        session_id=result.session_id,
        problem_id=result.problem_id,
        plan_task_id=result.plan_task_id,
        status=result.status,
        session_version=result.session_version,
        started_at=result.started_at,
        last_activity_at=result.last_activity_at,
        attempt_id=result.attempt_id,
        score=result.score,
        hint_zh=result.hint_zh,
        hint_en=result.hint_en,
        solution_zh=result.solution_zh,
        solution_en=result.solution_en,
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


def _skill_effect(result: Any) -> SkillEffectResponse:
    return SkillEffectResponse(
        skill_key=result.skill_effect.skill_key,
        previous_best_score=result.skill_effect.previous_best_score,
        current_best_score=result.skill_effect.current_best_score,
        delta=result.skill_effect.delta,
    )


def _next_action(result: Any) -> NextTrainingActionResponse:
    return NextTrainingActionResponse(
        target=result.next_action.target,
        problem_id=result.next_action.problem_id,
    )


def to_completion_response(result: Any) -> CompletionResponse:
    return CompletionResponse(
        session_id=result.session_id,
        session_version=result.session_version,
        xp_delta=result.xp_delta,
        plan_effect=_plan_effect(result),
        skill_effect=_skill_effect(result),
        next_action=_next_action(result),
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
        skill_effect=_skill_effect(result),
        next_action=_next_action(result),
    )


__all__ = [
    "AttemptSubmissionResponse",
    "CompleteTrainingRequest",
    "CompletionResponse",
    "HintUseResponse",
    "NextTrainingActionResponse",
    "SkillEffectResponse",
    "SolutionRevealResponse",
    "StartTrainingRequest",
    "StartTrainingResponse",
    "SubmitAttemptRequest",
    "TrainingEventResponse",
    "TrainingResultResponse",
    "TrainingSessionResponse",
    "TrainingSessionStatus",
    "VersionedTrainingRequest",
    "to_session_response",
]
