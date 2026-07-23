"""Authenticated HTTP boundary for preference mutations."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from ..auth.dependencies import get_database_engine, require_mutating_session
from ..auth.service import SessionContext
from ..errors import request_id_for, standard_error_responses
from ..users.models import PreferencesResponse
from .schemas import UpdatePreferencesRequest
from .service import PreferencesService


router = APIRouter(prefix="/api/v2/preferences", tags=["preferences"])


def get_preferences_service(
    engine: object = Depends(get_database_engine),
) -> PreferencesService:
    return PreferencesService(engine)


@router.patch(
    "",
    operation_id="updatePreferences",
    response_model=PreferencesResponse,
    responses=standard_error_responses(401, 403, 409, 422, 500, 503),
    summary="Update one current-account preference with version checking",
)
def update_preferences(
    payload: UpdatePreferencesRequest,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: PreferencesService = Depends(get_preferences_service),
) -> PreferencesResponse:
    record = service.update(
        user_id=session.user.id,
        payload=payload,
        request_id=request_id_for(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return PreferencesResponse(
        theme=record.theme,
        language=record.language,
        version=record.version,
    )
