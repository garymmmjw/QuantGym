from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.app.config import Settings
from api.app.errors import ApiError
from api.app.main import create_app


EDGE_SECRET = "edge_" + "e" * 48
PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"
REQUEST_ID_PATTERN = re.compile(r"^req_[0-9a-f]{32}$")


class FakeEngine:
    def __init__(self) -> None:
        self.disposed = False

    def dispose(self) -> None:
        self.disposed = True


def valid_settings() -> Settings:
    return Settings.model_validate(
        {
            "environment": "preview",
            "database_url": (
                "postgresql+psycopg://preview:secret@preview-postgres.internal/"
                "quantgym_v2_preview?sslmode=require"
            ),
            "allowed_origins": (PREVIEW_ORIGIN,),
            "edge_shared_secret": EDGE_SECRET,
            "r2_endpoint": f"https://{'a' * 32}.r2.cloudflarestorage.com",
            "r2_access_key_id": "r2_access_" + "a" * 24,
            "r2_secret_access_key": "r2_secret_" + "s" * 40,
        }
    )


@pytest.fixture
def app() -> FastAPI:
    application = create_app(
        valid_settings(),
        engine_factory=lambda _database_url: FakeEngine(),
        head_checker=lambda _engine: None,
    )

    @application.get("/api/v2/test/domain-error", include_in_schema=False)
    async def domain_error() -> None:
        raise ApiError(
            status_code=409,
            code="TEST_CONFLICT",
            message="测试冲突",
            field_errors={"version": ["版本已过期"]},
            retryable=False,
        )

    @application.get("/api/v2/test/protected-headers", include_in_schema=False)
    async def protected_headers() -> None:
        raise ApiError(
            status_code=429,
            code="RATE_LIMITED",
            message="请求过于频繁",
            retryable=True,
            headers={
                "Cache-Control": "public, max-age=3600",
                "X-Request-ID": "attacker-controlled",
                "Retry-After": "1",
            },
        )

    @application.get("/api/v2/test/unhandled-error", include_in_schema=False)
    async def unhandled_error() -> None:
        raise RuntimeError("database-password-that-must-stay-redacted")

    return application


@pytest.fixture
def client(app: FastAPI) -> Iterator[TestClient]:
    with TestClient(app, raise_server_exceptions=False) as test_client:
        yield test_client


def edge_headers(**extra: str) -> dict[str, str]:
    return {"X-QuantGym-Edge-Token": EDGE_SECRET, **extra}


def assert_error_envelope(response: Any, expected_code: str) -> dict[str, Any]:
    body = response.json()
    assert set(body) == {
        "code",
        "message",
        "fieldErrors",
        "requestId",
        "retryable",
    }
    assert body["code"] == expected_code
    assert body["requestId"] == response.headers["X-Request-ID"]
    assert REQUEST_ID_PATTERN.fullmatch(body["requestId"])
    assert isinstance(body["message"], str) and body["message"]
    assert isinstance(body["fieldErrors"], dict)
    assert isinstance(body["retryable"], bool)
    return body


def test_get_health_is_the_only_direct_origin_exception(client: TestClient) -> None:
    response = client.get(
        "/api/v2/health",
        headers={"Origin": PREVIEW_ORIGIN, "X-Request-ID": "attacker-controlled"},
    )

    assert response.status_code == 200
    assert response.json() == {"status": "ok"}
    assert REQUEST_ID_PATTERN.fullmatch(response.headers["X-Request-ID"])
    assert response.headers["X-Request-ID"] != "attacker-controlled"
    assert "set-cookie" not in response.headers
    assert response.headers["access-control-allow-origin"] == PREVIEW_ORIGIN
    assert "access-control-allow-credentials" not in response.headers
    assert response.headers["cache-control"] == "no-store"


@pytest.mark.parametrize(
    ("method", "path"),
    [
        ("GET", "/api/v2"),
        ("GET", "/api/v2/unknown"),
        ("HEAD", "/api/v2/health"),
        ("POST", "/api/v2/health"),
        ("OPTIONS", "/api/v2/health"),
    ],
)
def test_every_other_v2_request_requires_edge_proof_before_routing(
    client: TestClient,
    method: str,
    path: str,
) -> None:
    response = client.request(method, path)

    assert response.status_code == 403
    if method == "HEAD":
        assert response.content == b""
        assert REQUEST_ID_PATTERN.fullmatch(response.headers["X-Request-ID"])
    else:
        assert_error_envelope(response, "EDGE_PROOF_INVALID")


def test_wrong_or_duplicate_edge_proof_is_rejected(client: TestClient) -> None:
    wrong = client.get(
        "/api/v2/unknown",
        headers={"X-QuantGym-Edge-Token": "x" * len(EDGE_SECRET)},
    )
    assert wrong.status_code == 403
    assert_error_envelope(wrong, "EDGE_PROOF_INVALID")

    duplicate = client.get(
        "/api/v2/unknown",
        headers=[
            ("X-QuantGym-Edge-Token", EDGE_SECRET),
            ("X-QuantGym-Edge-Token", EDGE_SECRET),
        ],
    )
    assert duplicate.status_code == 403
    assert_error_envelope(duplicate, "EDGE_PROOF_INVALID")


def test_valid_edge_proof_reaches_routing_and_keeps_standard_404(client: TestClient) -> None:
    response = client.get("/api/v2/unknown", headers=edge_headers())

    assert response.status_code == 404
    body = assert_error_envelope(response, "NOT_FOUND")
    assert body["retryable"] is False


def test_domain_errors_keep_fields_and_request_id(client: TestClient) -> None:
    response = client.get("/api/v2/test/domain-error", headers=edge_headers())

    assert response.status_code == 409
    body = assert_error_envelope(response, "TEST_CONFLICT")
    assert body["message"] == "测试冲突"
    assert body["fieldErrors"] == {"version": ["版本已过期"]}
    assert body["retryable"] is False


def test_unhandled_errors_are_generic_retryable_and_secret_safe(client: TestClient) -> None:
    response = client.get("/api/v2/test/unhandled-error", headers=edge_headers())

    assert response.status_code == 500
    body = assert_error_envelope(response, "INTERNAL_SERVER_ERROR")
    assert body["retryable"] is True
    assert "database-password" not in response.text


def test_error_callers_cannot_override_request_id_or_no_store(client: TestClient) -> None:
    response = client.get("/api/v2/test/protected-headers", headers=edge_headers())

    assert response.status_code == 429
    body = assert_error_envelope(response, "RATE_LIMITED")
    assert body["requestId"] != "attacker-controlled"
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["retry-after"] == "1"


def test_request_id_is_present_on_non_api_responses(client: TestClient) -> None:
    response = client.get("/not-an-api-route")

    assert response.status_code == 404
    assert_error_envelope(response, "NOT_FOUND")


def test_cors_never_reflects_unapproved_origins_or_allows_credentials(
    client: TestClient,
) -> None:
    response = client.get(
        "/api/v2/health",
        headers={"Origin": "https://attacker.invalid"},
    )

    assert response.status_code == 200
    assert "access-control-allow-origin" not in response.headers
    assert "access-control-allow-credentials" not in response.headers


@pytest.mark.parametrize(
    ("origin", "requested_method", "requested_headers", "allows_origin"),
    [
        (PREVIEW_ORIGIN, "TRACE", "content-type", True),
        (PREVIEW_ORIGIN, "POST", "authorization", True),
        ("https://attacker.invalid", "POST", "content-type", False),
    ],
)
def test_cors_preflight_failures_use_the_standard_error_envelope(
    client: TestClient,
    origin: str,
    requested_method: str,
    requested_headers: str,
    allows_origin: bool,
) -> None:
    response = client.options(
        "/api/v2/health",
        headers=edge_headers(
            Origin=origin,
            **{
                "Access-Control-Request-Method": requested_method,
                "Access-Control-Request-Headers": requested_headers,
            },
        ),
    )

    assert response.status_code == 400
    assert response.headers["content-type"].startswith("application/json")
    assert_error_envelope(response, "CORS_PREFLIGHT_REJECTED")
    assert (response.headers.get("access-control-allow-origin") == PREVIEW_ORIGIN) is allows_origin
    assert "access-control-allow-credentials" not in response.headers


def test_lifespan_checks_the_database_head_and_disposes_the_engine() -> None:
    events: list[object] = []
    engine = FakeEngine()
    settings = valid_settings()

    def engine_factory(database_url: object) -> FakeEngine:
        events.append(("create", database_url))
        return engine

    def head_checker(candidate: object) -> None:
        events.append(("check", candidate))

    application = create_app(
        settings,
        engine_factory=engine_factory,
        head_checker=head_checker,
    )

    with TestClient(application) as test_client:
        assert test_client.get("/api/v2/health").status_code == 200
        assert application.state.database_engine is engine
        assert engine.disposed is False

    assert events == [
        ("create", settings.database_url),
        ("check", engine),
    ]
    assert engine.disposed is True
    assert application.state.database_engine is None


def test_lifespan_blocks_a_schema_mismatch_and_still_disposes() -> None:
    engine = FakeEngine()
    application = create_app(
        valid_settings(),
        engine_factory=lambda _database_url: engine,
        head_checker=lambda _engine: (_ for _ in ()).throw(
            RuntimeError("database schema is not at the required Alembic head")
        ),
    )

    with pytest.raises(RuntimeError, match="database schema is not at the required Alembic head"):
        with TestClient(application):
            pytest.fail("a mismatched database must prevent application startup")

    assert engine.disposed is True
    assert application.state.database_engine is None


def test_openapi_generation_does_not_touch_the_database() -> None:
    calls: list[str] = []
    application = create_app(
        valid_settings(),
        engine_factory=lambda _database_url: calls.append("create"),
        head_checker=lambda _engine: calls.append("check"),
    )

    schema = application.openapi()

    assert schema["info"]["title"] == "QuantGym API"
    assert calls == []
