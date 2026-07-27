from __future__ import annotations

import hashlib
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
from api.app.idempotency_records import (
    NextTrainingActionAcknowledgement,
    SkillEffectAcknowledgement,
)
from api.app.training.router import get_training_service, router
from api.app.training.service import (
    AttemptSubmissionResult,
    CompletionResult,
    HintUseResult,
    SolutionRevealResult,
    StartTrainingResult,
    TrainingResult,
    TrainingSessionSnapshot,
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

    def get_session(self, **values: Any) -> TrainingSessionSnapshot:
        self.calls.append(("session", values))
        return TrainingSessionSnapshot(
            session_id=SESSION_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=None,
            status="active",
            session_version=4,
            started_at=NOW,
            last_activity_at=NOW,
            attempt_id=ATTEMPT_ID,
            score=100,
            hint_zh="先排序",
            hint_en="Sort first",
            solution_zh=None,
            solution_en=None,
        )

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
            skill_effect=SkillEffectAcknowledgement(
                skill_key="arrays",
                previous_best_score=80,
                current_best_score=100,
                delta=20,
            ),
            next_action=NextTrainingActionAcknowledgement(
                target="overview",
                problem_id=None,
            ),
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
            skill_effect=SkillEffectAcknowledgement(
                skill_key="arrays",
                previous_best_score=80,
                current_best_score=100,
                delta=20,
            ),
            next_action=NextTrainingActionAcknowledgement(
                target="overview",
                problem_id=None,
            ),
        )


def _client(
    *,
    override_idempotency: bool = True,
) -> tuple[TestClient, FakeTrainingService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeTrainingService()
    session = type("Session", (), {"user": type("User", (), {"id": USER_ID})()})()
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[require_mutating_session] = lambda: session
    if override_idempotency:
        application.dependency_overrides[require_idempotency_key] = lambda: KEY
    application.dependency_overrides[get_training_service] = lambda: service
    return TestClient(application), service


def test_training_router_exposes_the_complete_daily_loop() -> None:
    client, service = _client()

    started = client.post(
        "/api/v2/training/sessions",
        json={"problemId": str(PROBLEM_ID)},
    )
    session_snapshot = client.get(
        f"/api/v2/training/sessions/{SESSION_ID}"
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

    assert [response.status_code for response in (
        started,
        session_snapshot,
        hinted,
        attempted,
        revealed,
        completed,
        result,
    )] == [
        201,
        200,
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
    assert session_snapshot.json() == {
        "attemptId": str(ATTEMPT_ID),
        "hintEn": "Sort first",
        "hintZh": "先排序",
        "lastActivityAt": "2026-07-27T08:00:00Z",
        "planTaskId": None,
        "problemId": str(PROBLEM_ID),
        "score": 100,
        "sessionId": str(SESSION_ID),
        "sessionVersion": 4,
        "solutionEn": None,
        "solutionZh": None,
        "startedAt": "2026-07-27T08:00:00Z",
        "status": "active",
    }
    assert "answer" not in str(session_snapshot.json()).casefold()
    assert attempted.json()["score"] == 100
    assert "answer" not in attempted.json()
    assert hinted.json()["hintZh"] == "先排序"
    assert revealed.json()["solutionZh"] == "中文解析"
    assert completed.json()["planEffect"] == {
        "planVersion": 2,
        "taskCompleted": True,
    }
    assert completed.json()["skillEffect"] == {
        "currentBestScore": 100,
        "delta": 20,
        "previousBestScore": 80,
        "skillKey": "arrays",
    }
    assert completed.json()["nextAction"] == {
        "problemId": None,
        "target": "overview",
    }
    assert result.json()["completedAt"] == "2026-07-27T08:00:00Z"
    assert result.json()["skillEffect"] == completed.json()["skillEffect"]
    assert result.json()["nextAction"] == completed.json()["nextAction"]
    assert [name for name, _values in service.calls] == [
        "start",
        "session",
        "hint",
        "attempt",
        "solution",
        "complete",
        "result",
    ]
    assert all(values["user_id"] == USER_ID for _name, values in service.calls)
    for name, values in service.calls:
        if name not in {"session", "result"}:
            assert values["idempotency_key"] is KEY


def test_training_read_and_mutations_are_no_store() -> None:
    client, _service = _client()

    mutation = client.post(
        f"/api/v2/training/sessions/{SESSION_ID}/hint",
        json={"version": 1},
    )
    session_snapshot = client.get(
        f"/api/v2/training/sessions/{SESSION_ID}"
    )
    read = client.get(f"/api/v2/training/sessions/{SESSION_ID}/result")

    assert mutation.headers["cache-control"] == "no-store"
    assert session_snapshot.headers["cache-control"] == "no-store"
    assert read.headers["cache-control"] == "no-store"


def test_training_mutations_require_one_valid_idempotency_header() -> None:
    client, service = _client(override_idempotency=False)
    mutations = (
        (
            f"/api/v2/training/sessions/{SESSION_ID}/hint",
            {"version": 1},
        ),
        (
            f"/api/v2/training/sessions/{SESSION_ID}/attempts",
            {"version": 2, "kind": "code", "answer": "print(42)"},
        ),
        (
            f"/api/v2/training/sessions/{SESSION_ID}/solution",
            {"version": 3},
        ),
    )

    for path, payload in mutations:
        missing = client.post(path, json=payload)
        assert missing.status_code == 422
        assert missing.json()["code"] == "VALIDATION_ERROR"

    invalid = client.post(
        mutations[0][0],
        json=mutations[0][1],
        headers={"X-Idempotency-Key": "too-short"},
    )
    assert invalid.status_code == 422
    assert invalid.json()["code"] == "VALIDATION_ERROR"

    duplicate = client.post(
        mutations[0][0],
        json=mutations[0][1],
        headers=[
            ("X-Idempotency-Key", "hint-request-key-0001"),
            ("X-Idempotency-Key", "hint-request-key-0002"),
        ],
    )
    assert duplicate.status_code == 400
    assert duplicate.json()["code"] == "IDEMPOTENCY_KEY_INVALID"
    assert service.calls == []

    raw_key = "valid-hint-request-key-0001"
    valid = client.post(
        mutations[0][0],
        json=mutations[0][1],
        headers={"X-Idempotency-Key": raw_key},
    )
    assert valid.status_code == 200
    parsed_key = service.calls[0][1]["idempotency_key"]
    assert parsed_key.digest == hashlib.sha256(raw_key.encode("ascii")).hexdigest()
    assert raw_key not in repr(parsed_key)


def test_training_idempotent_mutations_document_bad_key_responses() -> None:
    client, _service = _client()

    responses = client.app.openapi()["paths"]
    for path in (
        "/api/v2/training/sessions/{session_id}/hint",
        "/api/v2/training/sessions/{session_id}/attempts",
        "/api/v2/training/sessions/{session_id}/solution",
    ):
        assert "400" in responses[path]["post"]["responses"]
