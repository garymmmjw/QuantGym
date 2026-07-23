"""Strict public Todo request and response schemas."""

from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .models import PlanTaskRecord


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
