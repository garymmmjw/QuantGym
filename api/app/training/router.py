"""Authenticated HTTP boundary for daily training sessions and results."""

from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, Request, Response, status
from pydantic import SecretStr

from ..auth.dependencies import (
    get_authenticated_session,
    get_database_engine,
    require_mutating_session,
)
from ..auth.service import SessionContext
from ..config import get_settings
from ..errors import standard_error_responses
from ..idempotency import IdempotencyKey, require_idempotency_key
from .schemas import (
    AttemptSubmissionResponse,
    CompleteTrainingRequest,
    CompletionResponse,
    HintUseResponse,
    SolutionRevealResponse,
    StartTrainingRequest,
    StartTrainingResponse,
    SubmitAttemptRequest,
    TrainingResultResponse,
    VersionedTrainingRequest,
    to_attempt_response,
    to_completion_response,
    to_hint_response,
    to_result_response,
    to_solution_response,
    to_start_response,
)
from .service import TrainingService


router = APIRouter(prefix="/api/v2/training/sessions", tags=["training"])


def get_training_fingerprint_secret(request: Request) -> SecretStr:
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        settings = get_settings()
    return settings.session_secret


def get_training_service(
    engine: object = Depends(get_database_engine),
    fingerprint_secret: SecretStr = Depends(get_training_fingerprint_secret),
) -> TrainingService:
    return TrainingService(engine, fingerprint_secret=fingerprint_secret)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


@router.post(
    "",
    operation_id="startOrResumeTraining",
    response_model=StartTrainingResponse,
    status_code=status.HTTP_201_CREATED,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Start or resume one current-account training session",
)
def start_or_resume_training(
    payload: StartTrainingRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: TrainingService = Depends(get_training_service),
) -> StartTrainingResponse:
    result = service.start_or_resume(
        user_id=session.user.id,
        problem_id=payload.problem_id,
        plan_task_id=payload.plan_task_id,
        idempotency_key=key,
    )
    _no_store(response)
    return to_start_response(result)


@router.post(
    "/{session_id}/hint",
    operation_id="useTrainingHint",
    response_model=HintUseResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Record one authorized hint reveal",
)
def use_training_hint(
    session_id: UUID,
    payload: VersionedTrainingRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: TrainingService = Depends(get_training_service),
) -> HintUseResponse:
    result = service.use_hint(
        user_id=session.user.id,
        session_id=session_id,
        expected_version=payload.version,
        idempotency_key=key,
    )
    _no_store(response)
    return to_hint_response(result)


@router.post(
    "/{session_id}/attempts",
    operation_id="submitTrainingAttempt",
    response_model=AttemptSubmissionResponse,
    status_code=status.HTTP_201_CREATED,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Store and evaluate one private training answer",
)
def submit_training_attempt(
    session_id: UUID,
    payload: SubmitAttemptRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: TrainingService = Depends(get_training_service),
) -> AttemptSubmissionResponse:
    result = service.submit_attempt(
        user_id=session.user.id,
        session_id=session_id,
        expected_version=payload.version,
        answer_kind=payload.kind,
        answer=payload.answer,
        idempotency_key=key,
    )
    _no_store(response)
    return to_attempt_response(result)


@router.post(
    "/{session_id}/solution",
    operation_id="revealTrainingSolution",
    response_model=SolutionRevealResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Record and return one authorized solution reveal",
)
def reveal_training_solution(
    session_id: UUID,
    payload: VersionedTrainingRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: TrainingService = Depends(get_training_service),
) -> SolutionRevealResponse:
    result = service.reveal_solution(
        user_id=session.user.id,
        session_id=session_id,
        expected_version=payload.version,
        idempotency_key=key,
    )
    _no_store(response)
    return to_solution_response(result)


@router.post(
    "/{session_id}/complete",
    operation_id="completeTrainingSession",
    response_model=CompletionResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Atomically complete training and issue official effects",
)
def complete_training_session(
    session_id: UUID,
    payload: CompleteTrainingRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: TrainingService = Depends(get_training_service),
) -> CompletionResponse:
    result = service.complete(
        user_id=session.user.id,
        session_id=session_id,
        attempt_id=payload.attempt_id,
        expected_version=payload.version,
        idempotency_key=key,
    )
    _no_store(response)
    return to_completion_response(result)


@router.get(
    "/{session_id}/result",
    operation_id="getTrainingResult",
    response_model=TrainingResultResponse,
    responses=standard_error_responses(401, 404, 422, 500, 503),
    summary="Read one server-confirmed training result",
)
def get_training_result(
    session_id: UUID,
    response: Response,
    session: SessionContext = Depends(get_authenticated_session),
    service: TrainingService = Depends(get_training_service),
) -> TrainingResultResponse:
    result = service.get_result(user_id=session.user.id, session_id=session_id)
    _no_store(response)
    return to_result_response(result)


__all__ = ["get_training_service", "router"]
