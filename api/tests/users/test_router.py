from __future__ import annotations

from typing import Any

from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import SecretStr

from api.app.errors import EXCEPTION_HANDLERS, ApiError
from api.app.users.models import MeResponse, PreferencesResponse
from api.app.users.router import router


SESSION_TOKEN = "s" * 43


class FakeAuthService:
    def __init__(self) -> None:
        self.received: SecretStr | str | None = None

    def me(self, session_token: SecretStr | str | None) -> MeResponse:
        self.received = session_token
        if (
            session_token is None
            or (
                isinstance(session_token, SecretStr)
                and session_token.get_secret_value() == "invalid"
            )
        ):
            raise ApiError(
                status_code=401,
                code="AUTH_REQUIRED",
                message="请先登录",
            )
        return MeResponse(
            email="preview.user@example.com",
            display_name="Preview User",
            email_verified=False,
            preferences=PreferencesResponse(
                theme="system",
                language="zh-CN",
                version=1,
            ),
        )


def _client() -> tuple[TestClient, FakeAuthService]:
    app = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    app.include_router(router)
    auth = FakeAuthService()
    app.state.auth_service = auth
    return TestClient(app, base_url="https://quantgym-v2-preview.pages.dev"), auth


def test_me_reads_only_session_cookie_and_returns_public_projection() -> None:
    client, auth = _client()

    response = client.get(
        "/api/v2/me",
        headers={
            "Cookie": (
                f"unrelated=ignored; __Host-qg_session={SESSION_TOKEN}; "
                f"__Host-qg_csrf={'c' * 43}"
            )
        },
    )

    assert response.status_code == 200
    assert response.json() == {
        "email": "preview.user@example.com",
        "displayName": "Preview User",
        "emailVerified": False,
        "preferences": {"theme": "system", "language": "zh-CN", "version": 1},
    }
    assert isinstance(auth.received, SecretStr)
    assert auth.received.get_secret_value() == SESSION_TOKEN
    assert response.headers["cache-control"] == "no-store"
    assert SESSION_TOKEN not in response.text


def test_me_rejects_duplicate_session_cookie_at_the_service_boundary() -> None:
    client, auth = _client()

    response = client.get(
        "/api/v2/me",
        headers=[
            ("Cookie", f"__Host-qg_session={SESSION_TOKEN}"),
            ("Cookie", f"__Host-qg_session={'t' * 43}"),
        ],
    )

    assert response.status_code == 401
    assert response.json()["code"] == "AUTH_REQUIRED"
    assert "set-cookie" not in response.headers
    assert isinstance(auth.received, SecretStr)
    assert auth.received.get_secret_value() == "invalid"
