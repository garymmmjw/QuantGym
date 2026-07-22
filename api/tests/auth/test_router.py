from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from api.app.auth.csrf import CsrfRequestProof, CsrfToken
from api.app.auth.google import (
    GoogleAuthorizationRedirect,
    GoogleIdentity,
    GoogleOAuthChallengeCapacityError,
    GoogleOAuthCallbackError,
    GoogleOAuthStartError,
    GoogleOAuthStartRateLimitedError,
)
from api.app.auth.models import SessionIssue
from api.app.auth.router import router
from api.app.auth.service import PreAuthIssue
from api.app.errors import EXCEPTION_HANDLERS, ApiError
from api.app.users.models import MeResponse, PreferencesResponse


NOW = datetime(2026, 7, 22, 12, tzinfo=UTC)
PRE_AUTH_TOKEN = "p" * 43
SESSION_TOKEN = "s" * 43
SESSION_CSRF = "c" * 43
OLD_SESSION = "o" * 43


def _me() -> MeResponse:
    return MeResponse(
        email="preview.user@example.com",
        display_name="Preview User",
        email_verified=True,
        preferences=PreferencesResponse(theme="system", language="zh-CN", version=1),
    )


@dataclass
class FakeAuthResult:
    session_issue: SessionIssue

    def response(self) -> MeResponse:
        return _me()


class FakeAuthService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.result = FakeAuthResult(
            session_issue=SessionIssue(
                session_token=SecretStr(SESSION_TOKEN),
                csrf_token=SecretStr(SESSION_CSRF),
                expires_at=NOW + timedelta(days=7),
            )
        )
        self.errors: dict[str, Exception] = {}

    def _maybe_raise(self, operation: str) -> None:
        if error := self.errors.get(operation):
            raise error

    def issue_pre_auth_csrf(self, **kwargs: Any) -> PreAuthIssue:
        self.calls.append(("csrf", kwargs))
        self._maybe_raise("csrf")
        return PreAuthIssue(
            csrf_token=CsrfToken.from_value(PRE_AUTH_TOKEN),
            expires_at=NOW + timedelta(minutes=10),
        )

    def register(self, **kwargs: Any) -> FakeAuthResult:
        self.calls.append(("register", kwargs))
        self._maybe_raise("register")
        return self.result

    def login(self, **kwargs: Any) -> FakeAuthResult:
        self.calls.append(("login", kwargs))
        self._maybe_raise("login")
        proof = kwargs["proof"]
        if (
            proof.origin == "invalid"
            or proof.cookie_token is None
            or proof.cookie_token.get_secret_value() == "invalid"
            or proof.header_token is None
            or proof.header_token.get_secret_value() == "invalid"
        ):
            raise ApiError(
                status_code=403,
                code="CSRF_PROOF_INVALID",
                message="请求验证信息无效",
            )
        return self.result

    def logout(self, **kwargs: Any) -> None:
        self.calls.append(("logout", kwargs))

    def forgot_password(self, **kwargs: Any) -> None:
        self.calls.append(("forgot", kwargs))
        self._maybe_raise("forgot")

    def reset_password(self, **kwargs: Any) -> None:
        self.calls.append(("reset", kwargs))
        self._maybe_raise("reset")

    def complete_google_login(
        self,
        identity: GoogleIdentity,
        *,
        existing_session_token: SecretStr | None,
    ) -> FakeAuthResult:
        self.calls.append(
            (
                "google",
                {
                    "identity": identity,
                    "existing_session_token": existing_session_token,
                },
            )
        )
        self._maybe_raise("google")
        return self.result


class FakeGoogleFlow:
    def __init__(self) -> None:
        self.start_error = False
        self.callback_error = False
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.expected_browser_binding: str | None = None
        self.start_exception: GoogleOAuthStartError | None = None

    async def start(
        self,
        *,
        redirect_path: str,
        browser_binding: str,
        client_ip: str,
    ) -> GoogleAuthorizationRedirect:
        self.calls.append(
            (
                "start",
                {
                    "redirect_path": redirect_path,
                    "browser_binding": browser_binding,
                    "client_ip": client_ip,
                },
            )
        )
        if self.start_error:
            raise GoogleOAuthStartError()
        if self.start_exception is not None:
            raise self.start_exception
        self.expected_browser_binding = browser_binding
        return GoogleAuthorizationRedirect(
            location="https://accounts.google.com/o/oauth2/v2/auth?state=provider-state"
        )

    async def complete_callback(
        self,
        *,
        code: str | None,
        state: str | None,
        provider_error: str | None,
        browser_binding: str | None,
    ) -> GoogleIdentity:
        self.calls.append(
            (
                "callback",
                {
                    "code": code,
                    "state": state,
                    "provider_error": provider_error,
                    "browser_binding": browser_binding,
                },
            )
        )
        if self.callback_error:
            raise GoogleOAuthCallbackError()
        if (
            self.expected_browser_binding is not None
            and browser_binding != self.expected_browser_binding
        ):
            raise GoogleOAuthCallbackError()
        return GoogleIdentity(
            subject="google-subject",
            email="preview.user@example.com",
            email_verified=True,
            name="Preview User",
            picture=None,
            redirect_path="/practice",
        )


def _client() -> tuple[TestClient, FakeAuthService, FakeGoogleFlow]:
    app = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    app.include_router(router)
    auth = FakeAuthService()
    google = FakeGoogleFlow()
    app.state.auth_service = auth
    app.state.google_oauth_flow = google
    return TestClient(app, base_url="https://quantgym-v2-preview.pages.dev"), auth, google


def _set_cookie_headers(response: Any) -> list[str]:
    return response.headers.get_list("set-cookie")


def _assert_session_cookie(value: str) -> None:
    assert value.startswith(f"__Host-qg_session={SESSION_TOKEN};")
    assert "HttpOnly" in value
    assert "Max-Age=604800" in value
    assert "Path=/" in value
    assert "SameSite=lax" in value
    assert "Secure" in value
    assert "Domain=" not in value


def _assert_csrf_cookie(value: str, expected_value: str = SESSION_CSRF) -> None:
    assert value.startswith(f"__Host-qg_csrf={expected_value};")
    assert "HttpOnly" not in value
    assert "Path=/" in value
    assert "SameSite=lax" in value
    assert "Secure" in value
    assert "Domain=" not in value


def _proof_headers() -> dict[str, str]:
    return {
        "Origin": "https://quantgym-v2-preview.pages.dev",
        "X-CSRF-Token": PRE_AUTH_TOKEN,
        "Cookie": (
            f"__Host-qg_csrf={PRE_AUTH_TOKEN}; "
            f"__Host-qg_session={OLD_SESSION}"
        ),
    }


def _assert_proof(value: object) -> None:
    assert isinstance(value, CsrfRequestProof)
    assert value.origin == "https://quantgym-v2-preview.pages.dev"
    assert value.cookie_token is not None
    assert value.cookie_token.get_secret_value() == PRE_AUTH_TOKEN
    assert value.header_token is not None
    assert value.header_token.get_secret_value() == PRE_AUTH_TOKEN


def test_csrf_issues_only_a_readable_secure_host_cookie_and_no_store_response() -> None:
    client, auth, _google = _client()

    response = client.get("/api/v2/auth/csrf")

    assert response.status_code == 200
    assert response.json() == {"csrfToken": PRE_AUTH_TOKEN}
    cookies = _set_cookie_headers(response)
    assert len(cookies) == 1
    _assert_csrf_cookie(cookies[0], PRE_AUTH_TOKEN)
    assert "Max-Age=600" in cookies[0]
    assert response.headers["cache-control"] == "no-store"
    assert auth.calls == [
        (
            "csrf",
            {"client_ip": "unknown", "browser_binding": None},
        )
    ]


def test_csrf_issue_uses_trusted_client_dimensions_and_preserves_rate_error() -> None:
    client, auth, _google = _client()
    auth.errors["csrf"] = ApiError(
        status_code=429,
        code="AUTH_CHALLENGE_RATE_LIMITED",
        message="身份验证请求过多，请稍后重试",
        retryable=True,
        headers={"Retry-After": "23"},
    )

    response = client.get(
        "/api/v2/auth/csrf",
        headers={
            "X-Forwarded-For": "2001:0db8::7",
            "Cookie": f"__Host-qg_csrf={PRE_AUTH_TOKEN}",
        },
    )

    assert response.status_code == 429
    assert response.json()["code"] == "AUTH_CHALLENGE_RATE_LIMITED"
    assert response.headers["retry-after"] == "23"
    assert auth.calls == [
        (
            "csrf",
            {
                "client_ip": "2001:db8::7",
                "browser_binding": PRE_AUTH_TOKEN,
            },
        )
    ]


def test_register_maps_body_and_proof_and_rotates_strict_cookies_without_ids() -> None:
    client, auth, _google = _client()

    response = client.post(
        "/api/v2/auth/register",
        headers=_proof_headers(),
        json={
            "email": "preview.user@example.com",
            "password": "correct horse battery staple",
            "displayName": "Preview User",
        },
    )

    assert response.status_code == 201
    assert response.json() == {
        "user": {
            "email": "preview.user@example.com",
            "displayName": "Preview User",
            "emailVerified": True,
            "preferences": {"theme": "system", "language": "zh-CN", "version": 1},
        }
    }
    name, call = auth.calls[-1]
    assert name == "register"
    _assert_proof(call["proof"])
    assert call["existing_session_token"].get_secret_value() == OLD_SESSION
    assert call["password"].get_secret_value() == "correct horse battery staple"
    cookies = _set_cookie_headers(response)
    assert len(cookies) == 2
    _assert_session_cookie(cookies[0])
    _assert_csrf_cookie(cookies[1])
    serialized = response.text
    assert SESSION_TOKEN not in serialized
    assert SESSION_CSRF not in serialized
    assert "user_id" not in serialized


def test_login_uses_only_the_edge_normalized_single_forwarded_ip() -> None:
    client, auth, _google = _client()
    headers = _proof_headers() | {"X-Forwarded-For": "2001:0db8::1"}

    response = client.post(
        "/api/v2/auth/login",
        headers=headers,
        json={"email": "preview.user@example.com", "password": "password"},
    )

    assert response.status_code == 200
    name, call = auth.calls[-1]
    assert name == "login"
    assert call["client_ip"] == "2001:db8::1"
    _assert_proof(call["proof"])


def test_logout_requires_session_and_proof_then_clears_both_cookie_shapes() -> None:
    client, auth, _google = _client()

    response = client.post("/api/v2/auth/logout", headers=_proof_headers())

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    name, call = auth.calls[-1]
    assert name == "logout"
    assert call["session_token"].get_secret_value() == OLD_SESSION
    _assert_proof(call["proof"])
    cookies = _set_cookie_headers(response)
    assert len(cookies) == 2
    assert cookies[0].startswith("__Host-qg_session=\"")
    assert "HttpOnly" in cookies[0] and "Secure" in cookies[0]
    assert cookies[1].startswith("__Host-qg_csrf=\"")
    assert "HttpOnly" not in cookies[1] and "Secure" in cookies[1]
    assert all("Domain=" not in cookie for cookie in cookies)


def test_password_routes_use_one_time_proof_and_never_return_reset_material() -> None:
    client, auth, _google = _client()

    forgot = client.post(
        "/api/v2/auth/password/forgot",
        headers=_proof_headers(),
        json={"email": "missing@example.com"},
    )
    reset = client.post(
        "/api/v2/auth/password/reset",
        headers=_proof_headers(),
        json={"token": "r" * 43, "password": "new secure password"},
    )

    assert forgot.status_code == 202
    assert forgot.json() == {"status": "ok"}
    assert reset.status_code == 200
    assert reset.json() == {"status": "ok"}
    assert auth.calls[-2][0] == "forgot"
    _assert_proof(auth.calls[-2][1]["proof"])
    assert auth.calls[-1][0] == "reset"
    _assert_proof(auth.calls[-1][1]["proof"])
    assert "r" * 43 not in reset.text


def test_consumed_pre_auth_cookie_is_cleared_after_non_csrf_service_failure_only() -> None:
    client, auth, _google = _client()
    auth.errors["login"] = ApiError(
        status_code=401,
        code="INVALID_CREDENTIALS",
        message="邮箱或密码不正确",
    )

    failed_login = client.post(
        "/api/v2/auth/login",
        headers=_proof_headers(),
        json={"email": "preview.user@example.com", "password": "wrong-password"},
    )

    assert failed_login.status_code == 401
    clear_cookie = failed_login.headers["set-cookie"]
    assert clear_cookie.startswith("__Host-qg_csrf=")
    assert "Max-Age=0" in clear_cookie
    assert "Secure" in clear_cookie
    assert "HttpOnly" not in clear_cookie

    auth.errors["login"] = ApiError(
        status_code=403,
        code="CSRF_ORIGIN_INVALID",
        message="请求来源验证失败",
    )
    csrf_failure = client.post(
        "/api/v2/auth/login",
        headers=_proof_headers(),
        json={"email": "preview.user@example.com", "password": "wrong-password"},
    )

    assert csrf_failure.status_code == 403
    assert "set-cookie" not in csrf_failure.headers


def test_google_start_returns_only_provider_redirect_and_maps_fixed_failure() -> None:
    client, _auth, google = _client()

    response = client.get(
        "/api/v2/auth/google/start?redirectPath=%2Fdashboard",
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert response.headers["location"].startswith("https://accounts.google.com/")
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert google.calls[0][0] == "start"
    assert google.calls[0][1]["redirect_path"] == "/dashboard"
    assert google.calls[0][1]["client_ip"] == "unknown"
    generated_binding = google.calls[0][1]["browser_binding"]
    assert len(generated_binding) == 43
    cookies = _set_cookie_headers(response)
    assert len(cookies) == 1
    _assert_csrf_cookie(cookies[0], generated_binding)
    assert "Max-Age=600" in cookies[0]

    google.start_error = True
    failed = client.get("/api/v2/auth/google/start", follow_redirects=False)
    assert failed.status_code == 503
    assert failed.json()["code"] == "GOOGLE_OAUTH_UNAVAILABLE"
    assert failed.json()["retryable"] is True


def test_google_start_returns_stable_rate_and_capacity_errors_with_retry_delay() -> None:
    client, _auth, google = _client()
    google.start_exception = GoogleOAuthStartRateLimitedError(17)

    rate_limited = client.get(
        "/api/v2/auth/google/start", follow_redirects=False
    )

    assert rate_limited.status_code == 429
    assert rate_limited.json()["code"] == "AUTH_CHALLENGE_RATE_LIMITED"
    assert rate_limited.headers["retry-after"] == "17"
    assert rate_limited.headers["referrer-policy"] == "no-referrer"

    google.start_exception = GoogleOAuthChallengeCapacityError()
    capacity_limited = client.get(
        "/api/v2/auth/google/start", follow_redirects=False
    )

    assert capacity_limited.status_code == 503
    assert capacity_limited.json()["code"] == "GOOGLE_OAUTH_CAPACITY_LIMITED"
    assert capacity_limited.headers["retry-after"] == "30"


def test_google_callback_consumes_flow_creates_session_and_never_echoes_secrets() -> None:
    client, auth, google = _client()
    code = "provider-authorization-code"
    state = "provider-state-value"

    response = client.get(
        f"/api/v2/auth/google/callback?code={code}&state={state}",
        headers={"Cookie": f"__Host-qg_session={OLD_SESSION}"},
        follow_redirects=False,
    )

    assert response.status_code == 303
    assert response.headers["location"] == "/practice"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert response.content == b""
    assert code not in str(response.headers)
    assert state not in str(response.headers)
    assert google.calls[-1] == (
        "callback",
        {
            "code": code,
            "state": state,
            "provider_error": None,
            "browser_binding": None,
        },
    )
    name, call = auth.calls[-1]
    assert name == "google"
    assert call["identity"].subject == "google-subject"
    assert call["existing_session_token"].get_secret_value() == OLD_SESSION
    cookies = _set_cookie_headers(response)
    _assert_session_cookie(cookies[0])
    _assert_csrf_cookie(cookies[1])


def test_google_callback_maps_every_provider_failure_to_one_safe_error() -> None:
    client, _auth, google = _client()
    google.callback_error = True

    response = client.get(
        "/api/v2/auth/google/callback?error=access_denied&state=hidden-state",
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.json()["code"] == "GOOGLE_OAUTH_FAILED"
    assert "hidden-state" not in response.text
    assert "access_denied" not in response.text
    assert response.headers["referrer-policy"] == "no-referrer"


def test_google_callback_rejects_ambiguous_duplicate_state_without_using_flow() -> None:
    client, auth, google = _client()

    response = client.get(
        "/api/v2/auth/google/callback?code=code&state=first&state=second",
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.json()["code"] == "GOOGLE_OAUTH_FAILED"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert google.calls == []
    assert auth.calls == []


def test_google_callback_length_limits_are_documented_and_fail_with_one_safe_error() -> None:
    client, auth, google = _client()
    secret_state = "s" * 257

    response = client.get(
        f"/api/v2/auth/google/callback?code=code&state={secret_state}",
        follow_redirects=False,
    )

    assert response.status_code == 400
    assert response.json() == {
        "code": "GOOGLE_OAUTH_FAILED",
        "message": "Google 登录未能完成",
        "fieldErrors": {},
        "requestId": "req_unavailable",
        "retryable": False,
    }
    assert response.headers["referrer-policy"] == "no-referrer"
    assert secret_state not in response.text
    assert google.calls == []
    assert auth.calls == []

    operation = client.app.openapi()["paths"]["/api/v2/auth/google/callback"]["get"]
    parameters = {item["name"]: item for item in operation["parameters"]}
    assert parameters["code"]["schema"]["anyOf"][0]["maxLength"] == 4096
    assert parameters["state"]["schema"]["anyOf"][0]["maxLength"] == 256
    assert parameters["error"]["schema"]["anyOf"][0]["maxLength"] == 256


def test_google_callback_is_bound_to_the_browser_that_started_the_flow() -> None:
    app = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    app.include_router(router)
    auth = FakeAuthService()
    google = FakeGoogleFlow()
    app.state.auth_service = auth
    app.state.google_oauth_flow = google
    origin = "https://quantgym-v2-preview.pages.dev"
    initiating_browser = TestClient(app, base_url=origin)
    other_browser = TestClient(app, base_url=origin)

    started = initiating_browser.get(
        "/api/v2/auth/google/start",
        follow_redirects=False,
    )
    assert started.status_code == 302
    binding = google.expected_browser_binding
    assert binding is not None

    swapped = other_browser.get(
        "/api/v2/auth/google/callback?code=attacker-code&state=provider-state",
        follow_redirects=False,
    )
    assert swapped.status_code == 400
    assert swapped.json()["code"] == "GOOGLE_OAUTH_FAILED"
    assert "set-cookie" not in swapped.headers
    assert auth.calls == []

    completed = initiating_browser.get(
        "/api/v2/auth/google/callback?code=provider-code&state=provider-state",
        follow_redirects=False,
    )
    assert completed.status_code == 303
    assert completed.headers["location"] == "/practice"
    assert auth.calls[-1][0] == "google"
    assert google.calls[-1][1]["browser_binding"] == binding


def test_google_callback_unexpected_account_failure_is_safe_and_suppresses_referrer() -> None:
    client, auth, _google = _client()
    auth.errors["google"] = RuntimeError("database detail that must stay private")

    response = client.get(
        "/api/v2/auth/google/callback?code=secret-code&state=secret-state",
        follow_redirects=False,
    )

    assert response.status_code == 503
    assert response.json()["code"] == "AUTH_SERVICE_UNAVAILABLE"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "secret-code" not in response.text
    assert "secret-state" not in response.text
    assert "database detail" not in response.text


def test_google_start_reuses_valid_csrf_binding_without_overwriting_cookie() -> None:
    client, _auth, google = _client()

    response = client.get(
        "/api/v2/auth/google/start",
        headers={"Cookie": f"__Host-qg_csrf={PRE_AUTH_TOKEN}"},
        follow_redirects=False,
    )

    assert response.status_code == 302
    assert "set-cookie" not in response.headers
    assert google.calls[-1][1]["browser_binding"] == PRE_AUTH_TOKEN


def test_missing_lifespan_dependencies_return_standard_safe_error() -> None:
    app = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    app.include_router(router)
    client = TestClient(app, base_url="https://quantgym-v2-preview.pages.dev")

    response = client.get("/api/v2/auth/csrf")

    assert response.status_code == 503
    assert response.json()["code"] == "AUTH_SERVICE_UNAVAILABLE"
    assert response.json()["fieldErrors"] == {}


def test_duplicate_security_headers_and_cookies_are_never_accepted_as_proof() -> None:
    client, auth, _google = _client()

    response = client.post(
        "/api/v2/auth/login",
        headers=[
            ("Origin", "https://quantgym-v2-preview.pages.dev"),
            ("Origin", "https://attacker.invalid"),
            ("X-CSRF-Token", PRE_AUTH_TOKEN),
            ("X-CSRF-Token", PRE_AUTH_TOKEN),
            ("Cookie", f"__Host-qg_csrf={PRE_AUTH_TOKEN}"),
            ("Cookie", f"__Host-qg_csrf={PRE_AUTH_TOKEN}"),
        ],
        json={"email": "preview.user@example.com", "password": "password"},
    )

    assert response.status_code == 403
    assert response.json()["code"] == "CSRF_PROOF_INVALID"
    assert "set-cookie" not in response.headers
    name, call = auth.calls[-1]
    assert name == "login"
    proof = call["proof"]
    assert proof.origin == "invalid"
    assert proof.header_token.get_secret_value() == "invalid"
    assert proof.cookie_token.get_secret_value() == "invalid"


def test_validation_errors_do_not_echo_password_or_token_values() -> None:
    client, _auth, _google = _client()
    password = "top-secret"
    token = "reset-secret"

    register = client.post(
        "/api/v2/auth/register",
        headers=_proof_headers(),
        json={"email": "not-an-email", "password": password, "displayName": ""},
    )
    reset = client.post(
        "/api/v2/auth/password/reset",
        headers=_proof_headers(),
        json={"token": token, "password": password},
    )

    assert register.status_code == 422
    assert reset.status_code == 422
    assert password not in register.text
    assert password not in reset.text
    assert token not in reset.text
