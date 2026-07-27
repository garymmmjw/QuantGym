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
from api.app.plans.models import (
    PlanCreationResult,
    PlanDiagnosticResult,
    PlanTaskMutationResult,
    PlanTaskRecord,
)
from api.app.plans.router import get_plans_service, router
from api.app.plans.schemas import CreateTodoRequest, UpdateTodoRequest
from api.app.plans.schemas import (
    CreatePlanRequest,
    RunPlanDiagnosticRequest,
    UpdatePlanTaskRequest,
)


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
TASK_ID = UUID("78c1e61e-e3aa-4aa8-82b9-ee37f10614a7")
PLAN_ID = UUID("fbc7ad7f-ce03-42f3-bce1-49906eec25c8")
RECOMMENDATION_ID = UUID("817d9981-6510-4821-a728-805ef0aae702")
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


def _official_record(*, status: str = "open", version: int = 1) -> PlanTaskRecord:
    record = _record(status=status, version=version)
    return PlanTaskRecord(
        id=record.id,
        user_id=record.user_id,
        title=record.title,
        status=record.status,
        sort_order=record.sort_order,
        version=record.version,
        completed_at=record.completed_at,
        created_at=record.created_at,
        updated_at=record.updated_at,
        plan_id=PLAN_ID,
        detail="完成计划训练",
        scheduled_for=NOW.date(),
        estimated_minutes=30,
        action_target="custom",
        skill_key="probabilityExpectation",
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

    def get_current(self, **values: Any) -> None:
        self.calls.append(("get_current", values))
        return None

    def create_plan(self, **values: Any) -> PlanCreationResult:
        self.calls.append(("create_plan", values))
        return PlanCreationResult(PLAN_ID, 1, (TASK_ID,))

    def run_diagnostic(self, **values: Any) -> PlanDiagnosticResult:
        self.calls.append(("run_diagnostic", values))
        return PlanDiagnosticResult(PLAN_ID, 2, (RECOMMENDATION_ID,))

    def update_plan_task(self, **values: Any) -> PlanTaskMutationResult:
        self.calls.append(("update_plan_task", values))
        return PlanTaskMutationResult(2, _official_record(version=2))

    def complete_plan_task(self, **values: Any) -> PlanTaskMutationResult:
        self.calls.append(("complete_plan_task", values))
        return PlanTaskMutationResult(
            2,
            _official_record(status="completed", version=2),
        )


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


def test_official_plan_schemas_reject_client_owned_state_and_incomplete_diagnostic() -> None:
    with pytest.raises(ValidationError):
        CreatePlanRequest.model_validate(
            {
                "track": "internship",
                "role": "quantTrading",
                "season": "2027-summer",
                "weeklyHours": 8,
                "status": "completed",
            }
        )
    with pytest.raises(ValidationError):
        RunPlanDiagnosticRequest.model_validate(
            {
                "planVersion": 1,
                "definitionVersion": "baseline-v1",
                "answers": [{"questionId": "mm-percent", "optionId": "42.5"}],
            }
        )
    with pytest.raises(ValidationError):
        UpdatePlanTaskRequest.model_validate(
            {
                "planVersion": 1,
                "taskVersion": 1,
                "targetProblemId": str(TASK_ID),
            }
        )
    with pytest.raises(ValidationError):
        UpdatePlanTaskRequest.model_validate(
            {"planVersion": 1, "taskVersion": 1, "title": None}
        )
    with pytest.raises(ValidationError):
        UpdatePlanTaskRequest.model_validate(
            {"planVersion": 1, "taskVersion": 1, "sortOrder": None}
        )
    future_role = CreatePlanRequest.model_validate(
        {
            "track": "fulltime",
            "role": "  quantSpecialist  ",
            "season": "  2029-cycle  ",
            "weeklyHours": 12,
        }
    )
    assert (future_role.role, future_role.season) == (
        "quantSpecialist",
        "2029-cycle",
    )


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


def test_official_plan_routes_are_separate_from_todos_and_keep_current_null_state() -> None:
    client, service = _client()

    response = client.get("/api/v2/plans/current")

    assert response.status_code == 200
    assert response.json() == {"plan": None}
    assert service.calls == [("get_current", {"user_id": USER_ID})]


def test_official_plan_mutation_routes_use_aliases_session_and_typed_idempotency() -> None:
    client, service = _client()
    answers = [
        {"questionId": "mm-percent", "optionId": "42.5"},
        {"questionId": "prob-coin", "optionId": "3/8"},
        {"questionId": "prob-die", "optionId": "3.5"},
        {"questionId": "stats-pvalue", "optionId": "null-hypothesis-tail"},
        {"questionId": "market-spread", "optionId": "buy-from-market-maker"},
        {"questionId": "option-call", "optionId": "premium-paid"},
        {"questionId": "code-two-sum", "optionId": "hash-map"},
        {"questionId": "research-validation", "optionId": "walk-forward"},
    ]

    created = client.post(
        "/api/v2/plans",
        json={
            "track": "internship",
            "role": "quantTrading",
            "season": "2027-summer",
            "weeklyHours": 8,
        },
    )
    diagnosed = client.post(
        "/api/v2/plans/current/diagnostic",
        json={
            "planVersion": 1,
            "definitionVersion": "baseline-v1",
            "answers": answers,
        },
    )
    updated = client.patch(
        f"/api/v2/plans/current/tasks/{TASK_ID}",
        json={
            "planVersion": 1,
            "taskVersion": 1,
            "estimatedMinutes": 45,
        },
    )
    completed = client.post(
        f"/api/v2/plans/current/tasks/{TASK_ID}/complete",
        json={"planVersion": 1, "taskVersion": 1},
    )

    assert created.status_code == 201
    assert created.json() == {
        "planId": str(PLAN_ID),
        "planVersion": 1,
        "taskIds": [str(TASK_ID)],
    }
    assert diagnosed.status_code == updated.status_code == completed.status_code == 200
    assert diagnosed.json()["recommendationIds"] == [str(RECOMMENDATION_ID)]
    assert updated.json()["task"]["estimatedMinutes"] == 30
    assert completed.json()["task"]["status"] == "completed"

    calls = {name: values for name, values in service.calls}
    assert calls["create_plan"]["user_id"] == USER_ID
    assert calls["create_plan"]["idempotency_key"] is KEY
    assert calls["create_plan"]["payload"].weekly_hours == 8
    assert calls["run_diagnostic"]["user_id"] == USER_ID
    assert calls["run_diagnostic"]["idempotency_key"] is KEY
    assert calls["run_diagnostic"]["payload"].plan_version == 1
    assert calls["update_plan_task"]["payload"].estimated_minutes == 45
    assert calls["complete_plan_task"]["payload"].task_version == 1


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
        schema["paths"]["/api/v2/plans"]["post"],
        schema["paths"]["/api/v2/plans/current/diagnostic"]["post"],
        schema["paths"]["/api/v2/plans/current/tasks/{task_id}"]["patch"],
        schema["paths"]["/api/v2/plans/current/tasks/{task_id}/complete"]["post"],
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
    assert schema["paths"]["/api/v2/todos"]["get"]["operationId"] == "listTodos"
    assert (
        schema["paths"]["/api/v2/todos/{task_id}/complete"]["post"][
            "operationId"
        ]
        == "completeTodo"
    )
    assert schema["paths"]["/api/v2/plans/current"]["get"]["operationId"] == (
        "getCurrentPlan"
    )
    assert schema["paths"]["/api/v2/plans"]["post"]["operationId"] == "createPlan"
    assert (
        schema["paths"]["/api/v2/plans/current/diagnostic"]["post"]["operationId"]
        == "runPlanDiagnostic"
    )
    assert (
        schema["paths"]["/api/v2/plans/current/tasks/{task_id}"]["patch"][
            "operationId"
        ]
        == "updatePlanTask"
    )
    assert (
        schema["paths"]["/api/v2/plans/current/tasks/{task_id}/complete"]["post"][
            "operationId"
        ]
        == "completePlanTask"
    )
