from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any
from urllib.parse import urlencode

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, ConfigDict, Field
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse, RedirectResponse, Response


FieldErrors = dict[str, list[str]]

_GOOGLE_CALLBACK_PATH = "/api/v2/auth/google/callback"
_GOOGLE_START_PATH = "/api/v2/auth/google/start"
_ERROR_RESPONSE_DESCRIPTIONS = {
    400: "Invalid request",
    401: "Authentication required",
    403: "Request proof or permission denied",
    404: "Resource not found",
    409: "Version or idempotency conflict",
    422: "Request validation failed",
    429: "Request rate limited",
    500: "Internal server error",
    503: "Service unavailable",
}
_GOOGLE_START_UI_CODES = frozenset(
    {
        "AUTH_CHALLENGE_RATE_LIMITED",
        "AUTH_SERVICE_UNAVAILABLE",
        "GOOGLE_OAUTH_CAPACITY_LIMITED",
        "GOOGLE_OAUTH_UNAVAILABLE",
    }
)


class ErrorEnvelope(BaseModel):
    """The one JSON error shape returned by every API error boundary."""

    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    code: str
    message: str
    field_errors: FieldErrors = Field(alias="fieldErrors")
    request_id: str = Field(alias="requestId")
    retryable: bool


def standard_error_responses(*status_codes: int) -> dict[int, dict[str, Any]]:
    """Describe runtime error envelopes without changing endpoint behavior."""

    return {
        status_code: {
            "description": _ERROR_RESPONSE_DESCRIPTIONS.get(
                status_code,
                "Request failed",
            ),
            "model": ErrorEnvelope,
        }
        for status_code in status_codes
    }


def _normalize_field_errors(
    value: Mapping[str, Sequence[str] | str] | None,
) -> FieldErrors:
    if value is None:
        return {}
    normalized: FieldErrors = {}
    for field, messages in value.items():
        if isinstance(messages, str):
            normalized[str(field)] = [messages]
        else:
            normalized[str(field)] = [str(message) for message in messages]
    return normalized


class ApiError(Exception):
    def __init__(
        self,
        *,
        status_code: int,
        code: str,
        message: str,
        field_errors: Mapping[str, Sequence[str] | str] | None = None,
        retryable: bool = False,
        headers: Mapping[str, str] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.field_errors = _normalize_field_errors(field_errors)
        self.retryable = retryable
        self.headers = dict(headers or {})


def request_id_for(request: Request) -> str:
    return str(getattr(request.state, "request_id", "req_unavailable"))


def _google_browser_error_response(
    request: Request,
    *,
    code: str,
    headers: Mapping[str, str] | None,
    status_code: int,
) -> RedirectResponse | None:
    """Return OAuth document navigations to one branded, non-reflective UI path."""

    path = request.url.path
    if path not in {_GOOGLE_START_PATH, _GOOGLE_CALLBACK_PATH}:
        return None
    if "text/html" not in request.headers.get("accept", "").casefold():
        return None

    if path == _GOOGLE_CALLBACK_PATH:
        ui_code = (
            "AUTH_SERVICE_UNAVAILABLE"
            if status_code >= 500 or code == "AUTH_SERVICE_UNAVAILABLE"
            else "GOOGLE_OAUTH_FAILED"
        )
    else:
        ui_code = code if code in _GOOGLE_START_UI_CODES else "GOOGLE_OAUTH_UNAVAILABLE"

    response_headers = {
        "Cache-Control": "no-store",
        "Pragma": "no-cache",
        "Referrer-Policy": "no-referrer",
        "X-Request-ID": request_id_for(request),
    }
    retry_after = dict(headers or {}).get("Retry-After")
    if retry_after is not None and retry_after.isdecimal():
        response_headers["Retry-After"] = retry_after
    return RedirectResponse(
        url=f"/login?{urlencode({'authError': ui_code})}",
        status_code=303,
        headers=response_headers,
    )


def error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    field_errors: Mapping[str, Sequence[str] | str] | None = None,
    retryable: bool = False,
    headers: Mapping[str, str] | None = None,
) -> Response:
    request_id = request_id_for(request)
    oauth_redirect = _google_browser_error_response(
        request,
        code=code,
        headers=headers,
        status_code=status_code,
    )
    if oauth_redirect is not None:
        return oauth_redirect
    response_headers = {
        **dict(headers or {}),
        "Cache-Control": "no-store",
        "X-Request-ID": request_id,
    }
    if request.url.path == _GOOGLE_CALLBACK_PATH:
        # Callback query strings can contain a one-time authorization code and
        # state.  Apply this at the common error boundary so validation,
        # routing, and unexpected failures cannot leak the callback URL as a
        # Referer even when the endpoint body is never entered.
        response_headers["Referrer-Policy"] = "no-referrer"
    return JSONResponse(
        status_code=status_code,
        headers=response_headers,
        content=ErrorEnvelope(
            code=code,
            message=message,
            field_errors=_normalize_field_errors(field_errors),
            request_id=request_id,
            retryable=retryable,
        ).model_dump(mode="json", by_alias=True),
    )


async def api_error_handler(request: Request, error: ApiError) -> Response:
    return error_response(
        request,
        status_code=error.status_code,
        code=error.code,
        message=error.message,
        field_errors=error.field_errors,
        retryable=error.retryable,
        headers=error.headers,
    )


async def validation_error_handler(
    request: Request,
    error: RequestValidationError,
) -> Response:
    if request.url.path == _GOOGLE_CALLBACK_PATH:
        return error_response(
            request,
            status_code=400,
            code="GOOGLE_OAUTH_FAILED",
            message="Google 登录未能完成",
            retryable=False,
        )
    field_errors: FieldErrors = {}
    for item in error.errors():
        location = ".".join(str(part) for part in item.get("loc", ()) if part != "body")
        field = location or "request"
        field_errors.setdefault(field, []).append(str(item.get("msg", "输入无效")))
    return error_response(
        request,
        status_code=422,
        code="VALIDATION_ERROR",
        message="请求参数无效",
        field_errors=field_errors,
        retryable=False,
    )


async def http_error_handler(
    request: Request,
    error: StarletteHTTPException,
) -> Response:
    if error.status_code == 404:
        code, message = "NOT_FOUND", "请求的资源不存在"
    elif error.status_code == 405:
        code, message = "METHOD_NOT_ALLOWED", "请求方法不受支持"
    else:
        code, message = "HTTP_ERROR", "请求无法完成"
    return error_response(
        request,
        status_code=error.status_code,
        code=code,
        message=message,
        retryable=False,
        headers=error.headers,
    )


async def unhandled_error_handler(request: Request, _error: Exception) -> Response:
    return error_response(
        request,
        status_code=500,
        code="INTERNAL_SERVER_ERROR",
        message="服务暂时不可用，请稍后重试",
        retryable=True,
    )


EXCEPTION_HANDLERS: dict[type[Exception] | int, Any] = {
    ApiError: api_error_handler,
    RequestValidationError: validation_error_handler,
    StarletteHTTPException: http_error_handler,
    Exception: unhandled_error_handler,
}
