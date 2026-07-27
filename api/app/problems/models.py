"""Typed persistence records for the Phase 2 problem domain."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID


@dataclass(frozen=True, slots=True)
class ProblemSourceRecord:
    id: UUID
    slug: str
    name: str
    content_version: str
    rights_status: str
    release_scope: str
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class ProblemRecord:
    id: UUID
    source_id: UUID
    external_key: str
    title_zh: str | None
    title_en: str | None
    prompt_zh: str | None
    prompt_en: str | None
    hint_zh: str | None
    hint_en: str | None
    solution_zh: str | None
    solution_en: str | None
    category: str
    difficulty: str
    tags: tuple[str, ...]
    companies: tuple[str, ...]
    source_url: str | None
    hot100: bool
    version: int
    created_at: datetime
    updated_at: datetime

    def __post_init__(self) -> None:
        object.__setattr__(self, "tags", tuple(self.tags))
        object.__setattr__(self, "companies", tuple(self.companies))


@dataclass(frozen=True, slots=True)
class ProblemProgressRecord:
    id: UUID
    user_id: UUID
    problem_id: UUID
    status: str
    attempt_count: int
    hint_count: int
    solution_revealed_at: datetime | None
    best_score: int | None
    last_score: int | None
    last_practiced_at: datetime | None
    completed_at: datetime | None
    version: int
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True)
class FavoriteRecord:
    id: UUID
    user_id: UUID
    problem_id: UUID
    version: int
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class NoteRecord:
    id: UUID
    user_id: UUID
    problem_id: UUID
    body: str
    version: int
    created_at: datetime
    updated_at: datetime

    def __repr__(self) -> str:
        return (
            "NoteRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, problem_id={self.problem_id!r}, "
            f"version={self.version!r}, created_at={self.created_at!r}, "
            f"updated_at={self.updated_at!r}, body='[REDACTED]')"
        )


__all__ = [
    "FavoriteRecord",
    "NoteRecord",
    "ProblemProgressRecord",
    "ProblemRecord",
    "ProblemSourceRecord",
]
