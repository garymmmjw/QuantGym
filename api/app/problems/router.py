"""Authenticated HTTP boundary for Phase 2 problem reads and personal state."""

from __future__ import annotations

from typing import Annotated, Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Request, Response

from ..auth.dependencies import (
    get_authenticated_session,
    get_database_engine,
    require_mutating_session,
)
from ..auth.service import SessionContext
from ..errors import request_id_for, standard_error_responses
from .schemas import (
    FavoriteStateResponse,
    NoteResponse,
    ProblemListResponse,
    ProblemDetailResponse,
    SaveNoteRequest,
    SetFavoriteRequest,
    to_detail_response,
    to_favorite_response,
    to_note_response,
    to_source_response,
    to_summary_response,
)
from .service import ProblemsService


router = APIRouter(prefix="/api/v2/problems", tags=["problems"])


def get_problem_service(
    engine: object = Depends(get_database_engine),
) -> ProblemsService:
    return ProblemsService(engine)


def _no_store(response: Response) -> None:
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"


@router.get(
    "",
    operation_id="listProblems",
    response_model=ProblemListResponse,
    responses=standard_error_responses(400, 401, 422, 500, 503),
    summary="List the current-account Preview problem catalog",
)
def list_problems(
    response: Response,
    q: Annotated[str | None, Query(min_length=1, max_length=120)] = None,
    source: Annotated[
        str | None,
        Query(min_length=1, max_length=120, pattern=r"^[a-z0-9][a-z0-9-]*$"),
    ] = None,
    difficulty: Annotated[
        Literal["Easy", "Medium", "Hard"] | None,
        Query(),
    ] = None,
    status: Annotated[
        Literal["unstarted", "in_progress", "completed"] | None,
        Query(),
    ] = None,
    favorite: Annotated[bool | None, Query()] = None,
    hot100: Annotated[bool | None, Query()] = None,
    daily: Annotated[bool, Query()] = False,
    cursor: Annotated[str | None, Query(min_length=1, max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    session: SessionContext = Depends(get_authenticated_session),
    service: ProblemsService = Depends(get_problem_service),
) -> ProblemListResponse:
    page = service.list(
        user_id=session.user.id,
        query=q,
        source=source,
        difficulty=difficulty,
        status=status,
        favorite=favorite,
        hot100=hot100,
        daily=daily,
        cursor=cursor,
        limit=limit,
    )
    _no_store(response)
    return ProblemListResponse(
        items=[to_summary_response(item) for item in page.items],
        next_cursor=page.next_cursor,
        available_sources=[
            to_source_response(item) for item in page.available_sources
        ],
    )


@router.get(
    "/{problem_id}",
    operation_id="getProblem",
    response_model=ProblemDetailResponse,
    responses=standard_error_responses(401, 404, 422, 500, 503),
    summary="Get one safe current-account problem detail projection",
)
def get_problem(
    problem_id: UUID,
    response: Response,
    session: SessionContext = Depends(get_authenticated_session),
    service: ProblemsService = Depends(get_problem_service),
) -> ProblemDetailResponse:
    view = service.get_detail(user_id=session.user.id, problem_id=problem_id)
    _no_store(response)
    return to_detail_response(view)


@router.put(
    "/{problem_id}/note",
    operation_id="saveProblemNote",
    response_model=NoteResponse,
    responses=standard_error_responses(401, 403, 404, 409, 422, 500, 503),
    summary="Save the current account's versioned private problem note",
)
def save_problem_note(
    problem_id: UUID,
    payload: SaveNoteRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: ProblemsService = Depends(get_problem_service),
) -> NoteResponse:
    record = service.save_note(
        user_id=session.user.id,
        problem_id=problem_id,
        payload=payload,
        request_id=request_id_for(request),
    )
    _no_store(response)
    converted = to_note_response(record)
    if converted is None:  # pragma: no cover - service contract invariant
        raise RuntimeError("saved note projection is unavailable")
    return converted


@router.put(
    "/{problem_id}/favorite",
    operation_id="setProblemFavorite",
    response_model=FavoriteStateResponse,
    responses=standard_error_responses(401, 403, 404, 409, 422, 500, 503),
    summary="Set the current account's desired favorite state",
)
def set_problem_favorite(
    problem_id: UUID,
    payload: SetFavoriteRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: ProblemsService = Depends(get_problem_service),
) -> FavoriteStateResponse:
    record = service.set_favorite(
        user_id=session.user.id,
        problem_id=problem_id,
        payload=payload,
        request_id=request_id_for(request),
    )
    _no_store(response)
    return to_favorite_response(record)


__all__ = ["get_problem_service", "router"]
