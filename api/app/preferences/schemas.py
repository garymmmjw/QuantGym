"""Strict public schemas for preference mutations."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class UpdatePreferencesRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int = Field(ge=1)
    theme: Literal["light", "dark", "system"] | None = None
    language: Literal["zh-CN", "en"] | None = None

    @model_validator(mode="after")
    def require_exactly_one_change(self) -> UpdatePreferencesRequest:
        if (self.theme is None) == (self.language is None):
            raise ValueError("exactly one preference field must be supplied")
        return self
