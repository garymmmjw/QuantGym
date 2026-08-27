from uuid import UUID

from api.app.idempotency import IdempotencyKey
from api.app.plans.schemas import (
    DiagnosticAnswerRequest,
    RunPlanDiagnosticRequest,
)
from api.app.plans.service import (
    _diagnostic_request_fingerprint,
    _fingerprint_key,
)


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
OTHER_USER_ID = UUID("95ab8099-36c1-4128-a455-9913ccf97cb5")


def _payload() -> RunPlanDiagnosticRequest:
    answers = {
        "mm-percent": "42.5",
        "prob-coin": "3/8",
        "prob-die": "3.5",
        "stats-pvalue": "null-hypothesis-tail",
        "market-spread": "buy-from-market-maker",
        "option-call": "premium-paid",
        "code-two-sum": "hash-map",
        "research-validation": "walk-forward",
    }
    return RunPlanDiagnosticRequest(
        plan_version=1,
        definition_version="baseline-v1",
        answers=tuple(
            DiagnosticAnswerRequest(question_id=question, option_id=answer)
            for question, answer in answers.items()
        ),
    )


def test_diagnostic_fingerprint_is_scoped_by_user_and_idempotency_key() -> None:
    signing_key = _fingerprint_key("unit-test-fingerprint-secret-" * 2)
    payload = _payload()
    first_key = IdempotencyKey("a" * 64)
    second_key = IdempotencyKey("b" * 64)

    first = _diagnostic_request_fingerprint(
        signing_key,
        user_id=USER_ID,
        idempotency_key=first_key,
        payload=payload,
    )
    same_request = _diagnostic_request_fingerprint(
        signing_key,
        user_id=USER_ID,
        idempotency_key=first_key,
        payload=payload,
    )
    different_key = _diagnostic_request_fingerprint(
        signing_key,
        user_id=USER_ID,
        idempotency_key=second_key,
        payload=payload,
    )
    different_user = _diagnostic_request_fingerprint(
        signing_key,
        user_id=OTHER_USER_ID,
        idempotency_key=first_key,
        payload=payload,
    )

    assert first == same_request
    assert len({first, different_key, different_user}) == 3
