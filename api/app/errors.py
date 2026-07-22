from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

from fastapi import Request
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.responses import JSONResponse


FieldErrors = dict[str, list[str]]


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


def error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    field_errors: Mapping[str, Sequence[str] | str] | None = None,
    retryable: bool = False,
    headers: Mapping[str, str] | None = None,
) -> JSONResponse:
    request_id = request_id_for(request)
    response_headers = {
        **dict(headers or {}),
        "Cache-Control": "no-store",
        "X-Request-ID": request_id,
    }
    if request.url.path == "/api/v2/auth/google/callback":
        # Callback query strings can contain a one-time authorization code and
        # state.  Apply this at the common error boundary so validation,
        # routing, and unexpected failures cannot leak the callback URL as a
        # Referer even when the endpoint body is never entered.
        response_headers["Referrer-Policy"] = "no-referrer"
    return JSONResponse(
        status_code=status_code,
        headers=response_headers,
        content={
            "code": code,
            "message": message,
            "fieldErrors": _normalize_field_errors(field_errors),
            "requestId": request_id,
            "retryable": retryable,
        },
    )


async def api_error_handler(request: Request, error: ApiError) -> JSONResponse:
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
) -> JSONResponse:
    if request.url.path == "/api/v2/auth/google/callback":
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
) -> JSONResponse:
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


async def unhandled_error_handler(request: Request, _error: Exception) -> JSONResponse:
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
