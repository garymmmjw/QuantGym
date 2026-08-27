"""Reusable authenticated-request dependencies for V2 domain routers."""

from __future__ import annotations

from typing import Any, cast

from fastapi import Depends, Request, Security
from fastapi.security import APIKeyCookie, APIKeyHeader
from pydantic import SecretStr

from ..errors import ApiError
from .csrf import CsrfRequestProof
from .service import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    AuthService,
    SessionContext,
)


_CSRF_HEADER_NAME = b"x-csrf-token"
_ORIGIN_HEADER_NAME = b"origin"
_INVALID_PROOF_VALUE = "invalid"
_MAX_SECRET_BOUNDARY_LENGTH = 512

_DOCUMENTED_SESSION_COOKIE = APIKeyCookie(
    name=SESSION_COOKIE_NAME,
    scheme_name="SessionCookie",
    description="Secure, HttpOnly current-account session cookie.",
    auto_error=False,
)
_DOCUMENTED_SESSION_CSRF = APIKeyHeader(
    name="X-CSRF-Token",
    scheme_name="SessionCsrf",
    description="Readable session-bound CSRF cookie value echoed by the same-origin client.",
    auto_error=False,
)


def get_auth_service(request: Request) -> AuthService:
    """Resolve the lifespan-owned authentication service."""

    service = getattr(request.app.state, "auth_service", None)
    if service is None:
        headers = (
            {"Referrer-Policy": "no-referrer"}
            if request.url.path.endswith("/auth/google/callback")
            else None
        )
        raise ApiError(
            status_code=503,
            code="AUTH_SERVICE_UNAVAILABLE",
            message="认证服务暂时不可用",
            retryable=True,
            headers=headers,
        )
    return cast(AuthService, service)


def get_database_engine(request: Request) -> Any:
    """Resolve the lifespan-owned SQLAlchemy engine without reconnecting."""

    engine = getattr(request.app.state, "database_engine", None)
    if engine is None:
        raise ApiError(
            status_code=503,
            code="DATA_SERVICE_UNAVAILABLE",
            message="数据服务暂时不可用",
            retryable=True,
        )
    return engine


def _single_header(request: Request, expected_name: bytes) -> str | None:
    values = [
        value
        for name, value in request.scope.get("headers", ())
        if name.lower() == expected_name
    ]
    if not values:
        return None
    if len(values) != 1:
        return _INVALID_PROOF_VALUE
    try:
        value = values[0].decode("latin-1")
    except UnicodeError:
        return _INVALID_PROOF_VALUE
    if not value or len(value) > _MAX_SECRET_BOUNDARY_LENGTH:
        return _INVALID_PROOF_VALUE
    return value


def _single_cookie(request: Request, expected_name: str) -> str | None:
    values: list[str] = []
    for name, raw_value in request.scope.get("headers", ()):
        if name.lower() != b"cookie":
            continue
        try:
            cookie_header = raw_value.decode("latin-1")
        except UnicodeError:
            return _INVALID_PROOF_VALUE
        for raw_part in cookie_header.split(";"):
            part = raw_part.strip()
            separator = part.find("=")
            if separator <= 0 or part[:separator].strip() != expected_name:
                continue
            values.append(part[separator + 1 :].strip())
    if not values:
        return None
    if len(values) != 1:
        return _INVALID_PROOF_VALUE
    value = values[0]
    if not value or len(value) > _MAX_SECRET_BOUNDARY_LENGTH:
        return _INVALID_PROOF_VALUE
    return value


def _secret_or_none(value: str | None) -> SecretStr | None:
    return SecretStr(value) if value is not None else None


def session_cookie_from_request(request: Request) -> SecretStr | None:
    return _secret_or_none(_single_cookie(request, SESSION_COOKIE_NAME))


def csrf_proof_from_request(request: Request) -> CsrfRequestProof:
    return CsrfRequestProof.from_values(
        origin=_single_header(request, _ORIGIN_HEADER_NAME),
        cookie_token=_secret_or_none(_single_cookie(request, CSRF_COOKIE_NAME)),
        header_token=_secret_or_none(_single_header(request, _CSRF_HEADER_NAME)),
    )


def get_authenticated_session(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    _documented_session_cookie: str | None = Security(_DOCUMENTED_SESSION_COOKIE),
) -> SessionContext:
    """Require a current cookie session for a read-only endpoint."""

    return auth_service.authenticate_session(session_cookie_from_request(request))


def require_mutating_session(
    request: Request,
    auth_service: AuthService = Depends(get_auth_service),
    _documented_session_cookie: str | None = Security(_DOCUMENTED_SESSION_COOKIE),
    _documented_session_csrf: str | None = Security(_DOCUMENTED_SESSION_CSRF),
) -> SessionContext:
    """Require both a current session and its exact session-bound CSRF proof."""

    return auth_service.require_session_csrf(
        session_token=session_cookie_from_request(request),
        proof=csrf_proof_from_request(request),
    )
