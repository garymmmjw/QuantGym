"""Strict public schemas for the Phase 2 problem domain."""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StrictBool,
    field_validator,
    model_validator,
)


ProblemDifficulty = Literal["Easy", "Medium", "Hard"]
ProblemStatus = Literal["unstarted", "in_progress", "completed"]


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


class ProblemSourceResponse(_StrictModel):
    slug: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    content_version: str = Field(
        serialization_alias="contentVersion",
        min_length=1,
        max_length=64,
    )


class ProblemProgressResponse(_StrictModel):
    status: ProblemStatus
    attempt_count: int = Field(serialization_alias="attemptCount", ge=0)
    hint_count: int = Field(serialization_alias="hintCount", ge=0)
    solution_revealed_at: datetime | None = Field(
        serialization_alias="solutionRevealedAt"
    )
    best_score: int | None = Field(serialization_alias="bestScore", ge=0, le=100)
    last_score: int | None = Field(serialization_alias="lastScore", ge=0, le=100)
    last_practiced_at: datetime | None = Field(
        serialization_alias="lastPracticedAt"
    )
    completed_at: datetime | None = Field(serialization_alias="completedAt")
    version: int | None = Field(default=None, ge=1)


class FavoriteStateResponse(_StrictModel):
    favorite: bool
    state_id: UUID | None = Field(serialization_alias="stateId")
    version: int | None = Field(default=None, ge=1)
    updated_at: datetime | None = Field(serialization_alias="updatedAt")

    @model_validator(mode="after")
    def require_coherent_state(self) -> FavoriteStateResponse:
        present = (
            self.state_id is not None
            and self.version is not None
            and self.updated_at is not None
        )
        absent = (
            self.state_id is None
            and self.version is None
            and self.updated_at is None
        )
        if (self.favorite and not present) or (not self.favorite and not absent):
            raise ValueError("favorite state is inconsistent")
        return self


class NoteResponse(_StrictModel):
    body: str = Field(min_length=1, max_length=20_000)
    version: int = Field(ge=1)
    updated_at: datetime = Field(serialization_alias="updatedAt")


class ProblemSummaryResponse(_StrictModel):
    id: UUID
    title_zh: str | None = Field(serialization_alias="titleZh")
    title_en: str | None = Field(serialization_alias="titleEn")
    category: str = Field(min_length=1, max_length=80)
    difficulty: ProblemDifficulty
    tags: list[str]
    companies: list[str]
    hot100: bool
    version: int = Field(ge=1)
    source: ProblemSourceResponse
    progress: ProblemProgressResponse
    favorite: FavoriteStateResponse
    note_exists: bool = Field(serialization_alias="noteExists")
    note_version: int | None = Field(serialization_alias="noteVersion", ge=1)


class ProblemDetailResponse(ProblemSummaryResponse):
    prompt_zh: str | None = Field(serialization_alias="promptZh")
    prompt_en: str | None = Field(serialization_alias="promptEn")
    note: NoteResponse | None


class ProblemListResponse(_StrictModel):
    items: list[ProblemSummaryResponse]
    next_cursor: str | None = Field(serialization_alias="nextCursor")
    available_sources: list[ProblemSourceResponse] = Field(
        serialization_alias="availableSources"
    )


class SaveNoteRequest(_StrictModel):
    body: str = Field(min_length=1, max_length=20_000)
    expected_version: int | None = Field(
        default=None,
        validation_alias="expectedVersion",
        serialization_alias="expectedVersion",
        ge=1,
    )

    @field_validator("body")
    @classmethod
    def validate_body(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("note body must contain visible content")
        if "\x00" in value:
            raise ValueError("note body contains an unsupported character")
        return value


class SetFavoriteRequest(_StrictModel):
    favorite: StrictBool
    expected_version: int | None = Field(
        default=None,
        validation_alias="expectedVersion",
        serialization_alias="expectedVersion",
        ge=1,
    )
    expected_state_id: UUID | None = Field(
        default=None,
        validation_alias="expectedStateId",
        serialization_alias="expectedStateId",
    )

    @model_validator(mode="after")
    def require_one_complete_generation(self) -> SetFavoriteRequest:
        if (self.expected_version is None) != (self.expected_state_id is None):
            raise ValueError("favorite version and state ID must be supplied together")
        return self


def to_source_response(record: Any) -> ProblemSourceResponse:
    return ProblemSourceResponse(
        slug=record.slug,
        name=record.name,
        content_version=record.content_version,
    )


def to_progress_response(record: Any | None) -> ProblemProgressResponse:
    if record is None:
        return ProblemProgressResponse(
            status="unstarted",
            attempt_count=0,
            hint_count=0,
            solution_revealed_at=None,
            best_score=None,
            last_score=None,
            last_practiced_at=None,
            completed_at=None,
            version=None,
        )
    return ProblemProgressResponse(
        status=record.status,
        attempt_count=record.attempt_count,
        hint_count=record.hint_count,
        solution_revealed_at=record.solution_revealed_at,
        best_score=record.best_score,
        last_score=record.last_score,
        last_practiced_at=record.last_practiced_at,
        completed_at=record.completed_at,
        version=record.version,
    )


def to_favorite_response(record: Any | None) -> FavoriteStateResponse:
    if record is None:
        return FavoriteStateResponse(
            favorite=False,
            state_id=None,
            version=None,
            updated_at=None,
        )
    return FavoriteStateResponse(
        favorite=True,
        state_id=record.id,
        version=record.version,
        updated_at=record.updated_at,
    )


def to_note_response(record: Any | None) -> NoteResponse | None:
    if record is None:
        return None
    return NoteResponse(
        body=record.body,
        version=record.version,
        updated_at=record.updated_at,
    )


def to_summary_response(view: Any) -> ProblemSummaryResponse:
    return ProblemSummaryResponse(
        id=view.problem.id,
        title_zh=view.problem.title_zh,
        title_en=view.problem.title_en,
        category=view.problem.category,
        difficulty=view.problem.difficulty,
        tags=list(view.problem.tags),
        companies=list(view.problem.companies),
        hot100=view.problem.hot100,
        version=view.problem.version,
        source=to_source_response(view.source),
        progress=to_progress_response(view.progress),
        favorite=to_favorite_response(view.favorite),
        note_exists=view.note_version is not None,
        note_version=view.note_version,
    )


def to_detail_response(view: Any) -> ProblemDetailResponse:
    summary = to_summary_response(view)
    return ProblemDetailResponse(
        **summary.model_dump(),
        prompt_zh=view.problem.prompt_zh,
        prompt_en=view.problem.prompt_en,
        note=to_note_response(view.note),
    )


__all__ = [
    "FavoriteStateResponse",
    "NoteResponse",
    "ProblemDetailResponse",
    "ProblemDifficulty",
    "ProblemListResponse",
    "ProblemProgressResponse",
    "ProblemSourceResponse",
    "ProblemStatus",
    "ProblemSummaryResponse",
    "SaveNoteRequest",
    "SetFavoriteRequest",
    "to_detail_response",
    "to_favorite_response",
    "to_note_response",
    "to_source_response",
    "to_summary_response",
]
