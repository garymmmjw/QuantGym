"""Authenticated HTTP boundary for the Phase 1 Todo dock."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status
from pydantic import SecretStr

from ..auth.dependencies import (
    get_authenticated_session,
    get_database_engine,
    require_mutating_session,
)
from ..auth.service import SessionContext
from ..config import get_settings
from ..errors import request_id_for, standard_error_responses
from ..idempotency import IdempotencyKey, require_idempotency_key
from .schemas import (
    CompletePlanTaskRequest,
    CompleteTodoRequest,
    CreatePlanRequest,
    CreateTodoRequest,
    CurrentPlanResponse,
    PlanCreationResponse,
    PlanDiagnosticResponse,
    PlanTaskMutationResponse,
    PlanTaskResponse,
    RunPlanDiagnosticRequest,
    TodoListResponse,
    UpdatePlanTaskRequest,
    UpdateTodoRequest,
    to_current_plan_response,
    to_plan_creation_response,
    to_plan_diagnostic_response,
    to_plan_task_mutation_response,
    to_plan_task_response,
)
from .service import PlansService


router = APIRouter()
todo_router = APIRouter(prefix="/api/v2/todos", tags=["todos"])
official_router = APIRouter(prefix="/api/v2/plans", tags=["plans"])


def get_plan_fingerprint_secret(request: Request) -> SecretStr:
    settings = getattr(request.app.state, "settings", None)
    if settings is None:
        settings = get_settings()
    return settings.session_secret


def get_plans_service(
    engine: object = Depends(get_database_engine),
    fingerprint_secret: SecretStr = Depends(get_plan_fingerprint_secret),
) -> PlansService:
    return PlansService(engine, fingerprint_secret=fingerprint_secret)


@todo_router.get(
    "",
    operation_id="listTodos",
    response_model=TodoListResponse,
    responses=standard_error_responses(401, 500, 503),
    summary="List current-account Todo tasks",
)
def list_todos(
    response: Response,
    session: SessionContext = Depends(get_authenticated_session),
    service: PlansService = Depends(get_plans_service),
) -> TodoListResponse:
    records = service.list(user_id=session.user.id)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return TodoListResponse(items=[to_plan_task_response(record) for record in records])


@todo_router.post(
    "",
    operation_id="createTodo",
    response_model=PlanTaskResponse,
    responses=standard_error_responses(400, 401, 403, 409, 422, 500, 503),
    status_code=status.HTTP_201_CREATED,
    summary="Create one idempotent Todo task",
)
def create_todo(
    payload: CreateTodoRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> PlanTaskResponse:
    record = service.create(
        user_id=session.user.id,
        payload=payload,
        idempotency_key=key,
        request_id=request_id_for(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return to_plan_task_response(record)


@todo_router.patch(
    "/{task_id}",
    operation_id="updateTodo",
    response_model=PlanTaskResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Update one versioned Todo task",
)
def update_todo(
    task_id: UUID,
    payload: UpdateTodoRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> PlanTaskResponse:
    record = service.update(
        user_id=session.user.id,
        task_id=task_id,
        payload=payload,
        idempotency_key=key,
        request_id=request_id_for(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return to_plan_task_response(record)


@todo_router.post(
    "/{task_id}/complete",
    operation_id="completeTodo",
    response_model=PlanTaskResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Complete one versioned Todo task",
)
def complete_todo(
    task_id: UUID,
    payload: CompleteTodoRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> PlanTaskResponse:
    record = service.complete(
        user_id=session.user.id,
        task_id=task_id,
        payload=payload,
        idempotency_key=key,
        request_id=request_id_for(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return to_plan_task_response(record)


@todo_router.delete(
    "/{task_id}",
    operation_id="deleteTodo",
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete one versioned Todo task",
)
def delete_todo(
    task_id: UUID,
    version: Annotated[int, Query(ge=1)],
    request: Request,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> Response:
    service.delete(
        user_id=session.user.id,
        task_id=task_id,
        version=version,
        idempotency_key=key,
        request_id=request_id_for(request),
    )
    return Response(
        status_code=status.HTTP_204_NO_CONTENT,
        headers={"Cache-Control": "no-store", "Pragma": "no-cache"},
    )


@official_router.get(
    "/current",
    operation_id="getCurrentPlan",
    response_model=CurrentPlanResponse,
    responses=standard_error_responses(401, 500, 503),
    summary="Get the current account's official plan",
)
def get_current_plan(
    response: Response,
    session: SessionContext = Depends(get_authenticated_session),
    service: PlansService = Depends(get_plans_service),
) -> CurrentPlanResponse:
    record = service.get_current(user_id=session.user.id)
    _no_store(response)
    return to_current_plan_response(record)


@official_router.post(
    "",
    operation_id="createPlan",
    response_model=PlanCreationResponse,
    responses=standard_error_responses(400, 401, 403, 409, 422, 500, 503),
    status_code=status.HTTP_201_CREATED,
    summary="Create one idempotent official plan",
)
def create_plan(
    payload: CreatePlanRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> PlanCreationResponse:
    result = service.create_plan(
        user_id=session.user.id,
        payload=payload,
        idempotency_key=key,
    )
    _no_store(response)
    return to_plan_creation_response(result)


@official_router.post(
    "/current/diagnostic",
    operation_id="runPlanDiagnostic",
    response_model=PlanDiagnosticResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Run an idempotent diagnostic on the current official plan",
)
def run_plan_diagnostic(
    payload: RunPlanDiagnosticRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    key: IdempotencyKey = Depends(require_idempotency_key),
    service: PlansService = Depends(get_plans_service),
) -> PlanDiagnosticResponse:
    result = service.run_diagnostic(
        user_id=session.user.id,
        payload=payload,
        idempotency_key=key,
    )
    _no_store(response)
    return to_plan_diagnostic_response(result)


@official_router.patch(
    "/current/tasks/{task_id}",
    operation_id="updatePlanTask",
    response_model=PlanTaskMutationResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Update one versioned official plan task",
)
def update_plan_task(
    task_id: UUID,
    payload: UpdatePlanTaskRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: PlansService = Depends(get_plans_service),
) -> PlanTaskMutationResponse:
    result = service.update_plan_task(
        user_id=session.user.id,
        task_id=task_id,
        payload=payload,
    )
    _no_store(response)
    return to_plan_task_mutation_response(result)


@official_router.post(
    "/current/tasks/{task_id}/complete",
    operation_id="completePlanTask",
    response_model=PlanTaskMutationResponse,
    responses=standard_error_responses(400, 401, 403, 404, 409, 422, 500, 503),
    summary="Complete one non-training official plan task",
)
def complete_plan_task(
    task_id: UUID,
    payload: CompletePlanTaskRequest,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: PlansService = Depends(get_plans_service),
) -> PlanTaskMutationResponse:
    result = service.complete_plan_task(
        user_id=session.user.id,
        task_id=task_id,
        payload=payload,
    )
    _no_store(response)
    return to_plan_task_mutation_response(result)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


router.include_router(todo_router)
router.include_router(official_router)
