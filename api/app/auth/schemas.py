"""Validated public request and response schemas for account authentication."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, SecretStr, field_validator

from ..users.models import MeResponse


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CsrfResponse(_StrictModel):
    csrf_token: str = Field(serialization_alias="csrfToken", min_length=32, max_length=256)


class RegisterRequest(_StrictModel):
    email: EmailStr = Field(max_length=320)
    password: SecretStr = Field(min_length=12, max_length=128)
    display_name: str = Field(
        validation_alias="displayName",
        serialization_alias="displayName",
        min_length=1,
        max_length=120,
    )

    @field_validator("display_name")
    @classmethod
    def reject_unsafe_display_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("display name is required")
        if any(ord(character) < 32 or ord(character) == 127 for character in value):
            raise ValueError("display name contains unsafe characters")
        return value


class LoginRequest(_StrictModel):
    email: EmailStr = Field(max_length=320)
    password: SecretStr = Field(min_length=1, max_length=128)


class ForgotPasswordRequest(_StrictModel):
    email: EmailStr = Field(max_length=320)


class ResetPasswordRequest(_StrictModel):
    token: SecretStr = Field(min_length=32, max_length=512)
    password: SecretStr = Field(min_length=12, max_length=128)

    @field_validator("token")
    @classmethod
    def reject_ambiguous_reset_token(cls, value: SecretStr) -> SecretStr:
        raw = value.get_secret_value()
        if raw != raw.strip():
            raise ValueError("reset token is invalid")
        return value


class AuthResponse(_StrictModel):
    user: MeResponse


class StatusResponse(_StrictModel):
    status: Literal["ok"] = "ok"
