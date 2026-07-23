"""Authenticated HTTP boundary for the Phase 1 Todo dock."""

from __future__ import annotations

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response, status

from ..auth.dependencies import (
    get_authenticated_session,
    get_database_engine,
    require_mutating_session,
)
from ..auth.service import SessionContext
from ..errors import request_id_for, standard_error_responses
from ..idempotency import IdempotencyKey, require_idempotency_key
from .schemas import (
    CompleteTodoRequest,
    CreateTodoRequest,
    PlanTaskResponse,
    TodoListResponse,
    UpdateTodoRequest,
    to_plan_task_response,
)
from .service import PlansService


router = APIRouter(prefix="/api/v2/todos", tags=["todos"])


def get_plans_service(engine: object = Depends(get_database_engine)) -> PlansService:
    return PlansService(engine)


@router.get(
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


@router.post(
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


@router.patch(
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


@router.post(
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


@router.delete(
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
