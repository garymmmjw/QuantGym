from __future__ import annotations

import ipaddress
import json
import os
import re
from functools import lru_cache
from typing import Annotated, Any, Literal
from urllib.parse import parse_qsl, unquote, urlsplit

from pydantic import (
    AliasChoices,
    Field,
    SecretStr,
    field_validator,
    model_validator,
)
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"
_R2_HOST_PATTERN = re.compile(r"^[a-f0-9]{32}\.r2\.cloudflarestorage\.com$")
_ALLOWED_V2_ENVIRONMENT_KEYS = {
    "QUANTGYM_V2_ENVIRONMENT",
    "QUANTGYM_V2_DATABASE_URL",
    "QUANTGYM_V2_ALLOWED_ORIGINS",
    "QUANTGYM_V2_EDGE_SHARED_SECRET",
    "QUANTGYM_V2_PAGES_PROJECT",
    "QUANTGYM_V2_API_SERVICE",
    "QUANTGYM_V2_LLM_SERVICE",
    "QUANTGYM_V2_POSTGRES_RESOURCE",
    "QUANTGYM_V2_R2_ENDPOINT",
    "QUANTGYM_V2_R2_ACCESS_KEY_ID",
    "QUANTGYM_V2_R2_SECRET_ACCESS_KEY",
    "QUANTGYM_V2_R2_BUCKET",
    "QUANTGYM_V2_R2_MAX_BYTES",
    "QUANTGYM_V2_R2_TIMEOUT_SECONDS",
    "QUANTGYM_V2_R2_WORKERS",
    "QUANTGYM_V2_CORS_ALLOW_CREDENTIALS",
    "QUANTGYM_V2_PRODUCTION_RESOURCES_ALLOWED",
    "QUANTGYM_V2_PREVIEW_SYNTHETIC_DATA_ONLY",
}


def _secret_text(value: SecretStr) -> str:
    return value.get_secret_value()


def _validate_secret(
    value: SecretStr,
    *,
    minimum: int,
    maximum: int = 512,
) -> SecretStr:
    raw = _secret_text(value)
    if not minimum <= len(raw) <= maximum:
        raise ValueError("secret has an invalid length")
    if any(character.isspace() or ord(character) < 32 or ord(character) == 127 for character in raw):
        raise ValueError("secret contains unsafe characters")
    return value


def _is_safe_url_credential(value: str | None) -> bool:
    if value is None:
        return False
    if re.search(r"%(?![0-9A-Fa-f]{2})", value):
        return False
    try:
        decoded = unquote(value, errors="strict")
    except UnicodeError:
        return False
    return bool(decoded) and len(decoded) <= 512 and not any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in decoded
    )


def _validate_database_url(value: SecretStr) -> SecretStr:
    raw = _secret_text(value)
    try:
        parsed = urlsplit(raw)
        port = parsed.port
    except ValueError as error:
        raise ValueError("database URL is invalid") from error

    if parsed.scheme not in {"postgresql", "postgresql+psycopg"}:
        raise ValueError("database URL must use PostgreSQL")
    if not parsed.hostname or parsed.fragment or port not in {None, 5432}:
        raise ValueError("database URL target is invalid")
    if not _is_safe_url_credential(parsed.username) or not _is_safe_url_credential(
        parsed.password
    ):
        raise ValueError("database URL credentials are required")

    host = parsed.hostname.lower().rstrip(".")
    if host == "localhost" or host.endswith(".localhost"):
        raise ValueError("database URL target is invalid")
    try:
        ipaddress.ip_address(host)
    except ValueError:
        pass
    else:
        raise ValueError("database URL target is invalid")

    decoded_path = unquote(parsed.path)
    if (
        not decoded_path.startswith("/")
        or decoded_path.count("/") != 1
        or len(decoded_path) == 1
        or any(
            character.isspace() or ord(character) < 32 or ord(character) == 127
            for character in decoded_path[1:]
        )
    ):
        raise ValueError("database URL database name is invalid")
    database_name = decoded_path[1:].lower()
    target_tokens = {
        token
        for token in re.split(r"[^a-z0-9]+", f"{host} {database_name}")
        if token
    }
    if (
        "quantgym" not in database_name
        or "preview" not in database_name
        or target_tokens.intersection({"prod", "production"})
    ):
        raise ValueError("database URL must target the isolated Preview database")

    try:
        query_items = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
    except ValueError as error:
        raise ValueError("database URL query is invalid") from error
    query: dict[str, list[str]] = {}
    for key, item in query_items:
        query.setdefault(key.lower(), []).append(item)
    if set(query) != {"sslmode"}:
        raise ValueError("database URL contains an unsafe connection override")
    if query.get("sslmode") not in [["require"], ["verify-ca"], ["verify-full"]]:
        raise ValueError("database URL must require TLS")
    return value


def _parse_origins(value: Any) -> Any:
    if not isinstance(value, str):
        return value
    text = value.strip()
    if text.startswith("["):
        try:
            decoded = json.loads(text)
        except json.JSONDecodeError as error:
            raise ValueError("allowed origins are invalid") from error
        return decoded
    return tuple(part.strip() for part in text.split(",") if part.strip())


class Settings(BaseSettings):
    """Fail-closed configuration for the isolated Phase 1 Preview API."""

    model_config = SettingsConfigDict(
        case_sensitive=True,
        env_file=None,
        extra="forbid",
        hide_input_in_errors=True,
        populate_by_name=True,
        validate_default=True,
    )

    environment: Literal["preview"] = Field(
        default="preview",
        validation_alias=AliasChoices(
            "environment",
            "QUANTGYM_ENVIRONMENT",
            "QUANTGYM_V2_ENVIRONMENT",
        ),
    )
    database_url: SecretStr = Field(
        validation_alias=AliasChoices(
            "database_url",
            "QUANTGYM_POSTGRES_DATABASE_URL",
            "QUANTGYM_PREVIEW_POSTGRES_URL",
            "QUANTGYM_V2_DATABASE_URL",
            "DATABASE_URL",
        )
    )
    allowed_origins: Annotated[tuple[str, ...], NoDecode] = Field(
        default=(PREVIEW_ORIGIN,),
        validation_alias=AliasChoices(
            "allowed_origins",
            "QUANTGYM_ALLOWED_ORIGINS",
            "QUANTGYM_PREVIEW_WEB_URL",
            "QUANTGYM_V2_ALLOWED_ORIGINS",
        ),
    )
    cors_allow_credentials: Literal[False] = Field(
        default=False,
        validation_alias=AliasChoices(
            "cors_allow_credentials",
            "QUANTGYM_V2_CORS_ALLOW_CREDENTIALS",
        ),
    )
    edge_shared_secret: SecretStr = Field(
        validation_alias=AliasChoices(
            "edge_shared_secret",
            "QUANTGYM_EDGE_SHARED_SECRET",
            "QUANTGYM_V2_EDGE_SHARED_SECRET",
        )
    )

    pages_project: Literal["quantgym-v2-preview"] = Field(
        default="quantgym-v2-preview",
        validation_alias=AliasChoices(
            "pages_project",
            "QUANTGYM_V2_PAGES_PROJECT",
        ),
    )
    api_service: Literal["quantgym-v2-preview-api"] = Field(
        default="quantgym-v2-preview-api",
        validation_alias=AliasChoices("api_service", "QUANTGYM_V2_API_SERVICE"),
    )
    llm_service: Literal["quantgym-v2-preview-llm"] = Field(
        default="quantgym-v2-preview-llm",
        validation_alias=AliasChoices("llm_service", "QUANTGYM_V2_LLM_SERVICE"),
    )
    postgres_resource: Literal["quantgym-v2-preview-postgres"] = Field(
        default="quantgym-v2-preview-postgres",
        validation_alias=AliasChoices(
            "postgres_resource",
            "QUANTGYM_V2_POSTGRES_RESOURCE",
        ),
    )
    production_resources_allowed: Literal[False] = Field(
        default=False,
        validation_alias=AliasChoices(
            "production_resources_allowed",
            "QUANTGYM_V2_PRODUCTION_RESOURCES_ALLOWED",
        ),
    )
    preview_synthetic_data_only: Literal[True] = Field(
        default=True,
        validation_alias=AliasChoices(
            "preview_synthetic_data_only",
            "QUANTGYM_V2_PREVIEW_SYNTHETIC_DATA_ONLY",
        ),
    )

    r2_endpoint: str = Field(
        repr=False,
        validation_alias=AliasChoices(
            "r2_endpoint",
            "QUANTGYM_PREVIEW_R2_ENDPOINT",
            "QUANTGYM_MEDIA_S3_ENDPOINT",
            "QUANTGYM_V2_R2_ENDPOINT",
        )
    )
    r2_access_key_id: SecretStr = Field(
        validation_alias=AliasChoices(
            "r2_access_key_id",
            "QUANTGYM_PREVIEW_R2_ACCESS_KEY_ID",
            "QUANTGYM_MEDIA_S3_ACCESS_KEY_ID",
            "QUANTGYM_V2_R2_ACCESS_KEY_ID",
        )
    )
    r2_secret_access_key: SecretStr = Field(
        validation_alias=AliasChoices(
            "r2_secret_access_key",
            "QUANTGYM_PREVIEW_R2_SECRET_ACCESS_KEY",
            "QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY",
            "QUANTGYM_V2_R2_SECRET_ACCESS_KEY",
        )
    )
    r2_bucket: Literal["quantgym-v2-preview-media"] = Field(
        default="quantgym-v2-preview-media",
        validation_alias=AliasChoices(
            "r2_bucket",
            "QUANTGYM_PREVIEW_R2_BUCKET",
            "QUANTGYM_MEDIA_S3_BUCKET",
            "QUANTGYM_V2_R2_BUCKET",
        ),
    )
    r2_max_bytes: int = Field(
        default=5 * 1024 * 1024,
        ge=1,
        le=10 * 1024 * 1024,
        validation_alias=AliasChoices(
            "r2_max_bytes",
            "QUANTGYM_MEDIA_MAX_BYTES",
            "QUANTGYM_V2_R2_MAX_BYTES",
        ),
    )
    r2_timeout_seconds: float = Field(
        default=5.0,
        gt=0,
        le=60,
        validation_alias=AliasChoices(
            "r2_timeout_seconds",
            "QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS",
            "QUANTGYM_V2_R2_TIMEOUT_SECONDS",
        ),
    )
    r2_workers: int = Field(
        default=4,
        ge=1,
        le=32,
        validation_alias=AliasChoices("r2_workers", "QUANTGYM_V2_R2_WORKERS"),
    )

    @model_validator(mode="before")
    @classmethod
    def reject_unknown_v2_environment_keys(cls, data: Any) -> Any:
        unknown = sorted(
            name
            for name in os.environ
            if name.startswith("QUANTGYM_V2_")
            and name not in _ALLOWED_V2_ENVIRONMENT_KEYS
        )
        if unknown:
            raise ValueError(f"unknown Preview environment keys: {', '.join(unknown)}")
        return data

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def parse_allowed_origins(cls, value: Any) -> Any:
        return _parse_origins(value)

    @field_validator("allowed_origins")
    @classmethod
    def require_exact_preview_origin(cls, value: tuple[str, ...]) -> tuple[str, ...]:
        if value != (PREVIEW_ORIGIN,):
            raise ValueError("only the exact Preview origin is allowed")
        return value

    @field_validator("database_url")
    @classmethod
    def require_tls_postgres(cls, value: SecretStr) -> SecretStr:
        return _validate_database_url(value)

    @field_validator("edge_shared_secret")
    @classmethod
    def validate_edge_secret(cls, value: SecretStr) -> SecretStr:
        return _validate_secret(value, minimum=32)

    @field_validator("r2_access_key_id")
    @classmethod
    def validate_r2_access_key(cls, value: SecretStr) -> SecretStr:
        return _validate_secret(value, minimum=16)

    @field_validator("r2_secret_access_key")
    @classmethod
    def validate_r2_secret_key(cls, value: SecretStr) -> SecretStr:
        return _validate_secret(value, minimum=24)

    @field_validator("r2_endpoint")
    @classmethod
    def validate_r2_endpoint(cls, value: str) -> str:
        try:
            parsed = urlsplit(value)
            port = parsed.port
        except ValueError as error:
            raise ValueError("R2 endpoint is invalid") from error
        if (
            parsed.scheme != "https"
            or parsed.username is not None
            or parsed.password is not None
            or port is not None
            or parsed.path not in {"", "/"}
            or parsed.query
            or parsed.fragment
            or not parsed.hostname
            or not _R2_HOST_PATTERN.fullmatch(parsed.hostname.lower())
        ):
            raise ValueError("R2 endpoint must be an uncredentialed Cloudflare account origin")
        return f"https://{parsed.hostname.lower()}"


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
