"""HTTP boundary for the Phase 1 cookie-session authentication API."""

from __future__ import annotations

import ipaddress
from datetime import UTC, datetime, timedelta
from typing import cast

from fastapi import APIRouter, Depends, Query, Request, Response, status
from fastapi.responses import RedirectResponse
from pydantic import SecretStr
from starlette.concurrency import run_in_threadpool

from ..errors import ApiError
from ..users.models import MeResponse
from .csrf import CsrfToken, generate_csrf_token
from .dependencies import (
    csrf_proof_from_request as _csrf_proof,
    get_auth_service,
    session_cookie_from_request,
)
from .google import (
    GoogleOAuthCallbackError,
    GoogleOAuthFlow,
    GoogleOAuthStartError,
)
from .models import SessionIssue
from .schemas import (
    AuthResponse,
    CsrfResponse,
    ForgotPasswordRequest,
    LoginRequest,
    RegisterRequest,
    ResetPasswordRequest,
    StatusResponse,
)
from .service import (
    CSRF_COOKIE_NAME,
    SESSION_COOKIE_NAME,
    AuthResult,
    AuthService,
)


router = APIRouter(prefix="/api/v2/auth", tags=["authentication"])

_FORWARDED_FOR_HEADER_NAME = b"x-forwarded-for"
_INVALID_PROOF_VALUE = "invalid"
_MAX_SECRET_BOUNDARY_LENGTH = 512
_NO_STORE = "no-store"
_PRE_AUTH_COOKIE_MAX_AGE_SECONDS = 600
_SESSION_COOKIE_MAX_AGE_SECONDS = 604_800


def get_google_oauth_flow(request: Request) -> GoogleOAuthFlow:
    """Resolve the lifespan-owned HTTP client and one-time OAuth flow."""

    flow = getattr(request.app.state, "google_oauth_flow", None)
    if flow is None:
        raise _google_start_error()
    return cast(GoogleOAuthFlow, flow)


@router.get(
    "/csrf",
    operation_id="issueAuthCsrf",
    response_model=CsrfResponse,
    summary="Issue a one-time pre-authentication CSRF challenge",
)
def issue_csrf(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> CsrfResponse:
    issue = auth_service.issue_pre_auth_csrf(
        client_ip=_trusted_client_ip(request),
        browser_binding=_google_browser_binding_for_callback(request),
    )
    _set_csrf_cookie(
        response,
        value=issue.csrf_token.get_secret_value(),
        expires=issue.expires_at,
        max_age=_PRE_AUTH_COOKIE_MAX_AGE_SECONDS,
    )
    _mark_private(response)
    return CsrfResponse(csrf_token=issue.csrf_token.get_secret_value())


@router.post(
    "/register",
    operation_id="registerAccount",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a local account and rotate into a session",
)
def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        result = auth_service.register(
            email=str(payload.email),
            password=payload.password,
            display_name=payload.display_name,
            proof=_csrf_proof(request),
            existing_session_token=session_cookie_from_request(request),
        )
    except ApiError as error:
        _clear_consumed_pre_auth_cookie_on_error(error)
        raise
    _set_authenticated_cookies(response, result.session_issue)
    _mark_private(response)
    return _auth_response(result)


@router.post(
    "/login",
    operation_id="loginAccount",
    response_model=AuthResponse,
    summary="Authenticate a local account and rotate the session",
)
def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> AuthResponse:
    try:
        result = auth_service.login(
            email=str(payload.email),
            password=payload.password,
            proof=_csrf_proof(request),
            client_ip=_trusted_client_ip(request),
            existing_session_token=session_cookie_from_request(request),
        )
    except ApiError as error:
        _clear_consumed_pre_auth_cookie_on_error(error)
        raise
    _set_authenticated_cookies(response, result.session_issue)
    _mark_private(response)
    return _auth_response(result)


@router.post(
    "/logout",
    operation_id="logoutAccount",
    response_model=StatusResponse,
    summary="Revoke the current session",
)
def logout(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> StatusResponse:
    auth_service.logout(
        session_token=session_cookie_from_request(request),
        proof=_csrf_proof(request),
    )
    _clear_auth_cookies(response)
    _mark_private(response)
    return StatusResponse()


@router.post(
    "/password/forgot",
    operation_id="requestPasswordReset",
    response_model=StatusResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Request an enumeration-resistant password reset",
)
def forgot_password(
    payload: ForgotPasswordRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> StatusResponse:
    try:
        auth_service.forgot_password(
            email=str(payload.email),
            proof=_csrf_proof(request),
        )
    except ApiError as error:
        _clear_consumed_pre_auth_cookie_on_error(error)
        raise
    _clear_pre_auth_csrf_cookie(response)
    _mark_private(response)
    return StatusResponse()


@router.post(
    "/password/reset",
    operation_id="resetPassword",
    response_model=StatusResponse,
    summary="Consume a one-time reset challenge and replace the password",
)
def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> StatusResponse:
    try:
        auth_service.reset_password(
            token=payload.token,
            new_password=payload.password,
            proof=_csrf_proof(request),
        )
    except ApiError as error:
        _clear_consumed_pre_auth_cookie_on_error(error)
        raise
    _clear_auth_cookies(response)
    _mark_private(response)
    return StatusResponse()


@router.get(
    "/google/start",
    operation_id="startGoogleAuthentication",
    response_class=RedirectResponse,
    status_code=status.HTTP_302_FOUND,
    summary="Start Google authorization-code authentication",
)
async def start_google_authentication(
    request: Request,
    redirect_path: str = Query(
        default="/",
        alias="redirectPath",
        min_length=1,
        max_length=512,
    ),
    google_oauth_flow: GoogleOAuthFlow = Depends(get_google_oauth_flow),
) -> RedirectResponse:
    browser_binding, generated_binding = _google_browser_binding_for_start(request)
    try:
        authorization = await google_oauth_flow.start(
            redirect_path=redirect_path,
            browser_binding=browser_binding,
            client_ip=_trusted_client_ip(request),
        )
    except GoogleOAuthStartError as error:
        raise _google_start_error(error) from None
    response = RedirectResponse(
        url=authorization.location,
        status_code=status.HTTP_302_FOUND,
    )
    if generated_binding:
        _set_csrf_cookie(
            response,
            value=browser_binding,
            expires=datetime.now(UTC) + timedelta(
                seconds=_PRE_AUTH_COOKIE_MAX_AGE_SECONDS
            ),
            max_age=_PRE_AUTH_COOKIE_MAX_AGE_SECONDS,
        )
    _mark_oauth_redirect(response)
    return response


@router.get(
    "/google/callback",
    operation_id="completeGoogleAuthentication",
    response_class=RedirectResponse,
    status_code=status.HTTP_303_SEE_OTHER,
    summary="Complete Google authentication and rotate the session",
)
async def complete_google_authentication(
    request: Request,
    code: str | None = Query(default=None, max_length=4096),
    state: str | None = Query(default=None, max_length=256),
    provider_error: str | None = Query(default=None, alias="error", max_length=256),
    auth_service: AuthService = Depends(get_auth_service),
    google_oauth_flow: GoogleOAuthFlow = Depends(get_google_oauth_flow),
) -> RedirectResponse:
    if any(
        len(request.query_params.getlist(parameter)) > 1
        for parameter in ("code", "state", "error")
    ):
        raise _google_callback_error()
    try:
        identity = await google_oauth_flow.complete_callback(
            code=code,
            state=state,
            provider_error=provider_error,
            browser_binding=_google_browser_binding_for_callback(request),
        )
    except GoogleOAuthCallbackError:
        raise _google_callback_error() from None

    try:
        result = await run_in_threadpool(
            auth_service.complete_google_login,
            identity,
            existing_session_token=session_cookie_from_request(request),
        )
    except ApiError as error:
        error.headers.setdefault("Referrer-Policy", "no-referrer")
        raise
    except Exception:
        raise ApiError(
            status_code=503,
            code="AUTH_SERVICE_UNAVAILABLE",
            message="认证服务暂时不可用",
            retryable=True,
            headers={"Referrer-Policy": "no-referrer"},
        ) from None
    response = RedirectResponse(
        url=identity.redirect_path,
        status_code=status.HTTP_303_SEE_OTHER,
    )
    _set_authenticated_cookies(response, result.session_issue)
    _mark_oauth_redirect(response)
    return response


def _auth_response(result: AuthResult) -> AuthResponse:
    user = result.response()
    if not isinstance(user, MeResponse):
        # This is a server wiring failure, never a client-controlled detail.
        raise ApiError(
            status_code=503,
            code="AUTH_SERVICE_UNAVAILABLE",
            message="认证服务暂时不可用",
            retryable=True,
        )
    return AuthResponse(user=user)


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


def _google_browser_binding_for_start(request: Request) -> tuple[str, bool]:
    value = _single_cookie(request, CSRF_COOKIE_NAME)
    if value is not None:
        try:
            return CsrfToken.from_value(value).get_secret_value(), False
        except (UnicodeError, ValueError):
            pass
    return generate_csrf_token().get_secret_value(), True


def _google_browser_binding_for_callback(request: Request) -> str | None:
    value = _single_cookie(request, CSRF_COOKIE_NAME)
    if value is None:
        return None
    try:
        return CsrfToken.from_value(value).get_secret_value()
    except (UnicodeError, ValueError):
        return None


def _trusted_client_ip(request: Request) -> str:
    forwarded = _single_header(request, _FORWARDED_FOR_HEADER_NAME)
    if forwarded is not None:
        try:
            return str(ipaddress.ip_address(forwarded))
        except ValueError:
            return "unknown"
    if request.client is None:
        return "unknown"
    try:
        return str(ipaddress.ip_address(request.client.host))
    except ValueError:
        return "unknown"


def _set_authenticated_cookies(response: Response, issue: SessionIssue) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=issue.session_token.get_secret_value(),
        expires=issue.expires_at,
        max_age=_SESSION_COOKIE_MAX_AGE_SECONDS,
        httponly=True,
        secure=True,
        samesite="lax",
        path="/",
    )
    _set_csrf_cookie(
        response,
        value=issue.csrf_token.get_secret_value(),
        expires=issue.expires_at,
        max_age=_SESSION_COOKIE_MAX_AGE_SECONDS,
    )


def _set_csrf_cookie(
    response: Response,
    *,
    value: str,
    expires: datetime,
    max_age: int,
) -> None:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=value,
        expires=expires,
        max_age=max_age,
        httponly=False,
        secure=True,
        samesite="lax",
        path="/",
    )


def _clear_pre_auth_csrf_cookie(response: Response) -> None:
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        secure=True,
        httponly=False,
        samesite="lax",
    )


def _clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        secure=True,
        httponly=True,
        samesite="lax",
    )
    _clear_pre_auth_csrf_cookie(response)


def _clear_consumed_pre_auth_cookie_on_error(error: ApiError) -> None:
    """Discard a challenge only when the service passed CSRF and consumed it."""

    if error.code.startswith("CSRF_"):
        return
    response = Response()
    _clear_pre_auth_csrf_cookie(response)
    cookie_header = response.headers.get("set-cookie")
    if cookie_header is not None:
        error.headers.setdefault("Set-Cookie", cookie_header)


def _mark_private(response: Response) -> None:
    response.headers["Cache-Control"] = _NO_STORE
    response.headers["Pragma"] = "no-cache"


def _mark_oauth_redirect(response: Response) -> None:
    _mark_private(response)
    # The callback URL contains a one-time authorization code and state. Never
    # let a following navigation reuse that URL as its Referer value.
    response.headers["Referrer-Policy"] = "no-referrer"


def _google_start_error(error: GoogleOAuthStartError | None = None) -> ApiError:
    code = error.code if error is not None else "GOOGLE_OAUTH_UNAVAILABLE"
    status_code = error.status_code if error is not None else 503
    messages = {
        "AUTH_CHALLENGE_RATE_LIMITED": "身份验证请求过多，请稍后重试",
        "GOOGLE_OAUTH_CAPACITY_LIMITED": "Google 登录服务暂时繁忙，请稍后重试",
        "GOOGLE_OAUTH_UNAVAILABLE": "Google 登录暂时不可用",
    }
    headers = {"Referrer-Policy": "no-referrer"}
    if error is not None and error.retry_after is not None:
        headers["Retry-After"] = str(error.retry_after)
    return ApiError(
        status_code=status_code,
        code=code,
        message=messages.get(code, "Google 登录暂时不可用"),
        retryable=True,
        headers=headers,
    )


def _google_callback_error() -> ApiError:
    return ApiError(
        status_code=400,
        code="GOOGLE_OAUTH_FAILED",
        message="Google 登录未能完成",
        retryable=False,
        headers={"Referrer-Policy": "no-referrer"},
    )
