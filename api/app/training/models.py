"""Typed persistence records for the Phase 2 training domain."""

from __future__ import annotations

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from types import MappingProxyType
from typing import Any
from uuid import UUID


def _freeze_json(value: Any) -> Any:
    if isinstance(value, Mapping):
        return MappingProxyType({key: _freeze_json(item) for key, item in value.items()})
    if isinstance(value, (list, tuple)):
        return tuple(_freeze_json(item) for item in value)
    return value


@dataclass(frozen=True, slots=True)
class TrainingSessionRecord:
    id: UUID
    user_id: UUID
    problem_id: UUID
    plan_task_id: UUID | None
    status: str
    version: int
    started_at: datetime
    last_activity_at: datetime
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class AttemptRecord:
    id: UUID
    user_id: UUID
    training_session_id: UUID
    problem_id: UUID
    sequence: int
    status: str
    score: int | None
    evaluation: str | None
    submitted_at: datetime
    evaluated_at: datetime | None
    created_at: datetime

    def __repr__(self) -> str:
        return (
            "AttemptRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, "
            f"training_session_id={self.training_session_id!r}, problem_id={self.problem_id!r}, "
            f"sequence={self.sequence!r}, status={self.status!r}, score={self.score!r}, "
            f"submitted_at={self.submitted_at!r}, evaluated_at={self.evaluated_at!r}, "
            f"created_at={self.created_at!r}, evaluation='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True, repr=False)
class AnswerRecord:
    id: UUID
    user_id: UUID
    attempt_id: UUID
    kind: str
    body: str
    body_sha256: str
    created_at: datetime

    def __repr__(self) -> str:
        return (
            "AnswerRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, attempt_id={self.attempt_id!r}, "
            f"kind={self.kind!r}, created_at={self.created_at!r}, "
            "body='[REDACTED]', body_sha256='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True, repr=False)
class TrainingEventRecord:
    id: UUID
    user_id: UUID
    training_session_id: UUID
    problem_id: UUID
    attempt_id: UUID | None
    event_type: str
    sequence: int
    payload: Mapping[str, Any]
    occurred_at: datetime
    created_at: datetime

    def __post_init__(self) -> None:
        if not isinstance(self.payload, Mapping):
            raise TypeError("payload must be a mapping")
        object.__setattr__(self, "payload", _freeze_json(self.payload))

    def __repr__(self) -> str:
        return (
            "TrainingEventRecord("
            f"id={self.id!r}, user_id={self.user_id!r}, "
            f"training_session_id={self.training_session_id!r}, problem_id={self.problem_id!r}, "
            f"attempt_id={self.attempt_id!r}, event_type={self.event_type!r}, "
            f"sequence={self.sequence!r}, occurred_at={self.occurred_at!r}, "
            f"created_at={self.created_at!r}, payload='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True)
class XpLedgerRecord:
    id: UUID
    user_id: UUID
    training_event_id: UUID
    training_session_id: UUID
    problem_id: UUID
    skill_key: str
    amount: int
    reason: str
    occurred_at: datetime
    created_at: datetime


__all__ = [
    "AnswerRecord",
    "AttemptRecord",
    "TrainingEventRecord",
    "TrainingSessionRecord",
    "XpLedgerRecord",
]
