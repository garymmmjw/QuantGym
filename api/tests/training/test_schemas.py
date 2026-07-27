from __future__ import annotations

from datetime import UTC, datetime
from uuid import UUID

import pytest
from pydantic import ValidationError

from api.app.idempotency_records import (
    NextTrainingActionAcknowledgement,
    SkillEffectAcknowledgement,
)
from api.app.training.schemas import (
    CompleteTrainingRequest,
    NextTrainingActionResponse,
    SkillEffectResponse,
    StartTrainingRequest,
    SubmitAttemptRequest,
    TrainingSessionResponse,
    VersionedTrainingRequest,
    to_completion_response,
)
from api.app.training.service import CompletionResult


PROBLEM_ID = UUID("0c1d974a-ec41-42d9-a28c-85fbca86f17d")
ATTEMPT_ID = UUID("8317fcd0-9366-43c7-99fb-f79755d94715")


def test_training_requests_are_strict_and_use_public_aliases() -> None:
    start = StartTrainingRequest.model_validate({"problemId": str(PROBLEM_ID)})
    attempt = SubmitAttemptRequest.model_validate(
        {"version": 2, "kind": "code", "answer": "print(42)"}
    )
    completion = CompleteTrainingRequest.model_validate(
        {"version": 3, "attemptId": str(ATTEMPT_ID)}
    )

    assert start.problem_id == PROBLEM_ID
    assert attempt.answer == "print(42)"
    assert completion.attempt_id == ATTEMPT_ID
    assert completion.model_dump(mode="json", by_alias=True) == {
        "attemptId": str(ATTEMPT_ID),
        "version": 3,
    }
    assert "print(42)" not in repr(attempt)


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (StartTrainingRequest, {"problemId": str(PROBLEM_ID), "extra": True}),
        (VersionedTrainingRequest, {"version": 0}),
        (SubmitAttemptRequest, {"version": 1, "kind": "text", "answer": "  "}),
        (
            SubmitAttemptRequest,
            {"version": 1, "kind": "binary", "answer": "yes"},
        ),
    ],
)
def test_training_requests_reject_unknown_or_unsafe_input(
    model: object,
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        model.model_validate(payload)  # type: ignore[attr-defined]


def test_public_validation_error_envelope_never_reflects_answer_body() -> None:
    from api.tests.training.test_router import _client

    private_answer = "never-reflect-this-private-answer"
    client, _service = _client()

    response = client.post(
        "/api/v2/training/sessions/2ce77fd1-04bb-4fa4-93b6-9d43bd19d989/attempts",
        json={"version": 1, "kind": "binary", "answer": private_answer},
    )

    assert response.status_code == 422
    assert private_answer not in response.text


def test_completion_keeps_an_unchanged_official_plan_effect() -> None:
    response = to_completion_response(
        CompletionResult(
            session_id=UUID("2ce77fd1-04bb-4fa4-93b6-9d43bd19d989"),
            session_version=5,
            xp_delta=20,
            task_completed=False,
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
    )

    payload = response.model_dump(mode="json", by_alias=True)
    assert payload["planEffect"] == {
        "planVersion": 2,
        "taskCompleted": False,
    }
    assert payload["skillEffect"] == {
        "currentBestScore": 100,
        "delta": 20,
        "previousBestScore": 80,
        "skillKey": "arrays",
    }
    assert payload["nextAction"] == {
        "problemId": None,
        "target": "overview",
    }


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (
            SkillEffectResponse,
            {
                "currentBestScore": 70,
                "delta": 20,
                "previousBestScore": 60,
                "skillKey": "arrays",
            },
        ),
        (
            NextTrainingActionResponse,
            {"problemId": None, "target": "problems"},
        ),
        (
            NextTrainingActionResponse,
            {"problemId": str(PROBLEM_ID), "target": "overview"},
        ),
    ],
)
def test_completion_effects_reject_incoherent_public_contracts(
    model: object,
    payload: dict[str, object],
) -> None:
    with pytest.raises(ValidationError):
        model.model_validate(payload)  # type: ignore[attr-defined]


def test_session_snapshot_requires_one_coherent_safe_attempt_projection() -> None:
    payload = {
        "attempt_id": str(ATTEMPT_ID),
        "hint_en": None,
        "hint_zh": None,
        "last_activity_at": datetime(2026, 7, 27, 8, tzinfo=UTC),
        "plan_task_id": None,
        "problem_id": str(PROBLEM_ID),
        "score": 100,
        "session_id": "2ce77fd1-04bb-4fa4-93b6-9d43bd19d989",
        "session_version": 3,
        "solution_en": None,
        "solution_zh": None,
        "started_at": datetime(2026, 7, 27, 7, tzinfo=UTC),
        "status": "active",
    }
    response = TrainingSessionResponse.model_validate(payload)
    assert response.attempt_id == ATTEMPT_ID

    with pytest.raises(ValidationError):
        TrainingSessionResponse.model_validate({**payload, "score": None})
    with pytest.raises(ValidationError):
        TrainingSessionResponse.model_validate(
            {**payload, "answer": "must-never-be-public"}
        )
