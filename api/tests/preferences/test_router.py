from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app.auth.dependencies import require_mutating_session
from api.app.errors import EXCEPTION_HANDLERS
from api.app.preferences.router import get_preferences_service, router
from api.app.preferences.schemas import UpdatePreferencesRequest
from api.app.users.models import PreferencesRecord


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
NOW = datetime(2026, 7, 23, 8, tzinfo=UTC)


class FakeService:
    def __init__(self) -> None:
        self.call: dict[str, Any] | None = None

    def update(self, **values: Any) -> PreferencesRecord:
        self.call = values
        return PreferencesRecord(
            user_id=USER_ID,
            theme=values["payload"].theme or "system",
            language=values["payload"].language or "zh-CN",
            version=4,
            updated_at=NOW,
        )


def _client() -> tuple[TestClient, FakeService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeService()
    application.dependency_overrides[require_mutating_session] = lambda: type(
        "Session",
        (),
        {"user": type("User", (), {"id": USER_ID})()},
    )()
    application.dependency_overrides[get_preferences_service] = lambda: service
    return TestClient(application), service


@pytest.mark.parametrize(
    "payload",
    [
        {"version": 1},
        {"version": 1, "theme": "dark", "language": "en"},
        {"version": 1, "theme": "purple"},
        {"version": 1, "language": "fr"},
    ],
)
def test_update_schema_requires_one_exact_supported_field(
    payload: dict[str, Any]
) -> None:
    with pytest.raises(ValidationError):
        UpdatePreferencesRequest.model_validate(payload)


def test_patch_returns_the_official_versioned_projection() -> None:
    client, service = _client()

    response = client.patch(
        "/api/v2/preferences",
        json={"theme": "dark", "version": 3},
    )

    assert response.status_code == 200
    assert response.json() == {"theme": "dark", "language": "zh-CN", "version": 4}
    assert response.headers["cache-control"] == "no-store"
    assert service.call is not None
    assert service.call["user_id"] == USER_ID
    assert service.call["request_id"] == "req_unavailable"
