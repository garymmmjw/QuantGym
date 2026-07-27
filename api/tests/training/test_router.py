from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.app.auth.dependencies import (
    get_authenticated_session,
    require_mutating_session,
)
from api.app.errors import EXCEPTION_HANDLERS
from api.app.idempotency import IdempotencyKey, require_idempotency_key
from api.app.training.router import get_training_service, router
from api.app.training.service import (
    AttemptSubmissionResult,
    CompletionResult,
    HintUseResult,
    SolutionRevealResult,
    StartTrainingResult,
    TrainingResult,
)


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
PROBLEM_ID = UUID("0c1d974a-ec41-42d9-a28c-85fbca86f17d")
SESSION_ID = UUID("2ce77fd1-04bb-4fa4-93b6-9d43bd19d989")
ATTEMPT_ID = UUID("8317fcd0-9366-43c7-99fb-f79755d94715")
EVENT_ID = UUID("3b8dffaf-f6fc-4a7d-888b-03eae5eff05e")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)
KEY = IdempotencyKey("a" * 64)


class FakeTrainingService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def start_or_resume(self, **values: Any) -> StartTrainingResult:
        self.calls.append(("start", values))
        return StartTrainingResult(SESSION_ID, PROBLEM_ID, 1, False)

    def use_hint(self, **values: Any) -> HintUseResult:
        self.calls.append(("hint", values))
        return HintUseResult(SESSION_ID, 2, EVENT_ID, 1, "先排序", "Sort first")

    def submit_attempt(self, **values: Any) -> AttemptSubmissionResult:
        self.calls.append(("attempt", values))
        return AttemptSubmissionResult(SESSION_ID, 3, ATTEMPT_ID, EVENT_ID, 2, 100)

    def reveal_solution(self, **values: Any) -> SolutionRevealResult:
        self.calls.append(("solution", values))
        return SolutionRevealResult(
            SESSION_ID,
            4,
            EVENT_ID,
            3,
            "中文解析",
            "English solution",
        )

    def complete(self, **values: Any) -> CompletionResult:
        self.calls.append(("complete", values))
        return CompletionResult(
            session_id=SESSION_ID,
            session_version=5,
            xp_delta=20,
            task_completed=True,
            plan_version=2,
        )

    def get_result(self, **values: Any) -> TrainingResult:
        self.calls.append(("result", values))
        return TrainingResult(
            session_id=SESSION_ID,
            problem_id=PROBLEM_ID,
            session_version=5,
            score=100,
            xp_delta=20,
            completed_at=NOW,
            task_completed=True,
            plan_version=2,
        )


def _client() -> tuple[TestClient, FakeTrainingService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeTrainingService()
    session = type("Session", (), {"user": type("User", (), {"id": USER_ID})()})()
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[require_mutating_session] = lambda: session
    application.dependency_overrides[require_idempotency_key] = lambda: KEY
    application.dependency_overrides[get_training_service] = lambda: service
    return TestClient(application), service


def test_training_router_exposes_the_complete_daily_loop() -> None:
    client, service = _client()

    started = client.post(
        "/api/v2/training/sessions",
        json={"problemId": str(PROBLEM_ID)},
    )
    hinted = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/hint",
        json={"version": 1},
    )
    attempted = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/attempts",
        json={"version": 2, "kind": "code", "answer": "print(42)"},
    )
    revealed = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/solution",
        json={"version": 3},
    )
    completed = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/complete",
        json={"version": 4, "attemptId": str(ATTEMPT_ID)},
    )
    result = client.get(f"/api/v2/training/sessions/{SESSION_ID}/result")

    assert [response.status_code for response in (started, hinted, attempted, revealed, completed, result)] == [
        201,
        200,
        201,
        200,
        200,
        200,
    ]
    assert started.json() == {
        "problemId": str(PROBLEM_ID),
        "resumed": False,
        "sessionId": str(SESSION_ID),
        "sessionVersion": 1,
    }
    assert attempted.json()["score"] == 100
    assert "answer" not in attempted.json()
    assert hinted.json()["hintZh"] == "先排序"
    assert revealed.json()["solutionZh"] == "中文解析"
    assert completed.json()["planEffect"] == {
        "planVersion": 2,
        "taskCompleted": True,
    }
    assert result.json()["completedAt"] == "2026-07-27T08:00:00Z"
    assert [name for name, _values in service.calls] == [
        "start",
        "hint",
        "attempt",
        "solution",
        "complete",
        "result",
    ]
    assert all(values["user_id"] == USER_ID for _name, values in service.calls)
    assert service.calls[0][1]["idempotency_key"] is KEY
    assert service.calls[4][1]["idempotency_key"] is KEY


def test_training_read_and_mutations_are_no_store() -> None:
    client, _service = _client()

    mutation = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/hint",
        json={"version": 1},
    )
    read = client.get(f"/api/v2/training/sessions/{SESSION_ID}/result")

    assert mutation.headers["cache-control"] == "no-store"
    assert read.headers["cache-control"] == "no-store"
