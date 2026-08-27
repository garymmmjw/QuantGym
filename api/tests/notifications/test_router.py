from __future__ import annotations

import base64
import json
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.app.auth.dependencies import (
    get_authenticated_session,
    require_mutating_session,
)
from api.app.errors import EXCEPTION_HANDLERS, ApiError
from api.app.notifications.models import NotificationRecord
from api.app.notifications.router import get_notifications_service, router
from api.app.notifications.service import (
    NotificationPage,
    _decode_cursor,
    _encode_cursor,
)


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
NOTIFICATION_ID = UUID("3be334c9-0bd2-410b-bf0b-a0f9312c2629")
NOW = datetime(2026, 7, 23, 8, tzinfo=UTC)


def _record(*, read: bool) -> NotificationRecord:
    return NotificationRecord(
        id=NOTIFICATION_ID,
        user_id=USER_ID,
        kind="system",
        title="训练提醒",
        body="今天还有一道题。",
        read_at=NOW if read else None,
        created_at=NOW,
    )


class FakeService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []
        self.items: list[NotificationRecord] = []

    def list(self, **values: Any) -> NotificationPage:
        self.calls.append(("list", values))
        return NotificationPage(
            items=self.items,
            unread_count=sum(item.read_at is None for item in self.items),
            next_cursor=None,
        )

    def mark_read(self, **values: Any) -> NotificationRecord:
        self.calls.append(("mark", values))
        return _record(read=True)


def _client() -> tuple[TestClient, FakeService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeService()
    session = type("Session", (), {"user": type("User", (), {"id": USER_ID})()})()
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[require_mutating_session] = lambda: session
    application.dependency_overrides[get_notifications_service] = lambda: service
    return TestClient(application), service


def test_notification_center_returns_a_real_empty_state() -> None:
    client, _service = _client()

    response = client.get("/api/v2/notifications")

    assert response.status_code == 200
    assert response.json() == {"items": [], "unreadCount": 0, "nextCursor": None}


def test_mark_read_returns_camel_case_timestamps_and_is_user_scoped() -> None:
    client, service = _client()

    response = client.patch(f"/api/v2/notifications/{NOTIFICATION_ID}/read")

    assert response.status_code == 200
    assert response.json()["id"] == str(NOTIFICATION_ID)
    assert response.json()["readAt"] == "2026-07-23T08:00:00Z"
    assert "userId" not in response.json()
    assert service.calls[-1][1]["user_id"] == USER_ID


def test_notification_cursor_round_trips_exactly() -> None:
    encoded = _encode_cursor(NOW, NOTIFICATION_ID)
    decoded = _decode_cursor(encoded)

    assert decoded.created_at == NOW
    assert decoded.id == NOTIFICATION_ID


@pytest.mark.parametrize(
    "payload",
    [
        {"createdAt": NOW.isoformat(), "id": []},
        {"createdAt": [], "id": str(NOTIFICATION_ID)},
    ],
)
def test_notification_cursor_rejects_non_string_fields(
    payload: dict[str, Any],
) -> None:
    encoded = (
        base64.urlsafe_b64encode(
            json.dumps(payload, separators=(",", ":")).encode("utf-8")
        )
        .decode("ascii")
        .rstrip("=")
    )

    with pytest.raises(ApiError) as raised:
        _decode_cursor(encoded)

    assert raised.value.status_code == 400
    assert raised.value.code == "NOTIFICATION_CURSOR_INVALID"
