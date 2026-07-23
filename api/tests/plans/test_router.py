from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app.auth.dependencies import (
    get_authenticated_session,
    require_mutating_session,
)
from api.app.errors import EXCEPTION_HANDLERS
from api.app.idempotency import (
    IdempotencyKey,
    require_idempotency_key,
    request_fingerprint,
)
from api.app.main import create_app
from api.app.plans.models import PlanTaskRecord
from api.app.plans.router import get_plans_service, router
from api.app.plans.schemas import CreateTodoRequest, UpdateTodoRequest


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
TASK_ID = UUID("78c1e61e-e3aa-4aa8-82b9-ee37f10614a7")
NOW = datetime(2026, 7, 23, 8, tzinfo=UTC)
KEY = IdempotencyKey("a" * 64)


def _record(*, status: str = "open", version: int = 1) -> PlanTaskRecord:
    return PlanTaskRecord(
        id=TASK_ID,
        user_id=USER_ID,
        title="复习概率",
        status=status,
        sort_order=0,
        version=version,
        completed_at=NOW if status == "completed" else None,
        created_at=NOW,
        updated_at=NOW,
    )


class FakeService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def list(self, **values: Any) -> list[PlanTaskRecord]:
        self.calls.append(("list", values))
        return [_record()]

    def create(self, **values: Any) -> PlanTaskRecord:
        self.calls.append(("create", values))
        return _record()

    def update(self, **values: Any) -> PlanTaskRecord:
        self.calls.append(("update", values))
        return _record(version=2)

    def complete(self, **values: Any) -> PlanTaskRecord:
        self.calls.append(("complete", values))
        return _record(status="completed", version=2)

    def delete(self, **values: Any) -> None:
        self.calls.append(("delete", values))


def _client() -> tuple[TestClient, FakeService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeService()
    session = type("Session", (), {"user": type("User", (), {"id": USER_ID})()})()
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[require_mutating_session] = lambda: session
    application.dependency_overrides[require_idempotency_key] = lambda: KEY
    application.dependency_overrides[get_plans_service] = lambda: service
    return TestClient(application), service


@pytest.mark.parametrize(
    "payload",
    [
        {"title": "   "},
        {"title": "x" * 241},
        {"title": "valid", "sortOrder": -1},
    ],
)
def test_create_schema_rejects_invalid_tasks(payload: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        CreateTodoRequest.model_validate(payload)


def test_update_schema_requires_a_field_beyond_version() -> None:
    with pytest.raises(ValidationError):
        UpdateTodoRequest.model_validate({"version": 1})


def test_todo_lifecycle_contract_and_aliases() -> None:
    client, service = _client()

    created = client.post("/api/v2/todos", json={"title": "复习概率"})
    updated = client.patch(
        f"/api/v2/todos/{TASK_ID}",
        json={"title": "复习条件概率", "version": 1},
    )
    completed = client.post(
        f"/api/v2/todos/{TASK_ID}/complete",
        json={"version": 1},
    )
    deleted = client.delete(f"/api/v2/todos/{TASK_ID}?version=2")

    assert created.status_code == 201
    assert created.json()["sortOrder"] == 0
    assert updated.status_code == 200
    assert updated.json()["version"] == 2
    assert completed.status_code == 200
    assert completed.json()["completedAt"] == "2026-07-23T08:00:00Z"
    assert deleted.status_code == 204
    assert [name for name, _values in service.calls] == [
        "create",
        "update",
        "complete",
        "delete",
    ]
    assert all(values["user_id"] == USER_ID for _name, values in service.calls)


def test_request_fingerprint_is_canonical_and_operation_scoped() -> None:
    first = request_fingerprint(
        event_type="todo.create",
        resource_id=None,
        payload={"title": "A", "sortOrder": 0},
    )
    reordered = request_fingerprint(
        event_type="todo.create",
        resource_id=None,
        payload={"sortOrder": 0, "title": "A"},
    )
    different = request_fingerprint(
        event_type="todo.update",
        resource_id=str(TASK_ID),
        payload={"sortOrder": 0, "title": "A"},
    )

    assert first == reordered
    assert first != different


def test_task8_openapi_matches_runtime_error_and_session_contracts() -> None:
    schema = create_app().openapi()
    schemes = schema["components"]["securitySchemes"]

    assert schemes["SessionCookie"] == {
        "type": "apiKey",
        "description": "Secure, HttpOnly current-account session cookie.",
        "in": "cookie",
        "name": "__Host-qg_session",
    }
    assert schemes["SessionCsrf"]["in"] == "header"
    assert schemes["SessionCsrf"]["name"] == "X-CSRF-Token"

    read_operation = schema["paths"]["/api/v2/notifications"]["get"]
    assert read_operation["security"] == [{"SessionCookie": []}]

    mutation_operations = (
        schema["paths"]["/api/v2/notifications/{notification_id}/read"]["patch"],
        schema["paths"]["/api/v2/preferences"]["patch"],
        schema["paths"]["/api/v2/todos"]["post"],
        schema["paths"]["/api/v2/todos/{task_id}"]["patch"],
        schema["paths"]["/api/v2/todos/{task_id}"]["delete"],
        schema["paths"]["/api/v2/todos/{task_id}/complete"]["post"],
    )
    expected_security = [{"SessionCookie": [], "SessionCsrf": []}]
    error_reference = {"$ref": "#/components/schemas/ErrorEnvelope"}
    for operation in mutation_operations:
        assert operation["security"] == expected_security
        assert (
            operation["responses"]["422"]["content"]["application/json"]["schema"]
            == error_reference
        )

    assert set(schema["components"]["schemas"]["ErrorEnvelope"]["required"]) == {
        "code",
        "message",
        "fieldErrors",
        "requestId",
        "retryable",
    }
