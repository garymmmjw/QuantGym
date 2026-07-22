"""Typed database and public read models for the current account."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


@dataclass(frozen=True, slots=True, repr=False)
class UserRecord:
    id: UUID
    email: str
    normalized_email: str
    password_hash: str | None
    display_name: str
    status: str
    email_verified_at: datetime | None
    created_at: datetime
    updated_at: datetime


@dataclass(frozen=True, slots=True, repr=False)
class PreferencesRecord:
    user_id: UUID
    theme: str
    language: str
    version: int
    updated_at: datetime


class PreferencesResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    theme: str
    language: str
    version: int = Field(ge=1)


class MeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    email: EmailStr
    display_name: str = Field(serialization_alias="displayName")
    email_verified: bool = Field(serialization_alias="emailVerified")
    preferences: PreferencesResponse


def to_me_response(user: UserRecord, preferences: PreferencesRecord) -> MeResponse:
    return MeResponse(
        email=user.email,
        display_name=user.display_name,
        email_verified=user.email_verified_at is not None,
        preferences=PreferencesResponse(
            theme=preferences.theme,
            language=preferences.language,
            version=preferences.version,
        ),
    )
