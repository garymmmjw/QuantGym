"""Authenticated current-user HTTP route."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request, Response

from ..auth.router import get_auth_service, session_cookie_from_request
from ..auth.service import AuthService
from .models import MeResponse
from .service import get_current_user


router = APIRouter(tags=["users"])


@router.get(
    "/api/v2/me",
    operation_id="getCurrentUser",
    response_model=MeResponse,
    summary="Read the current authenticated account",
)
def me(
    request: Request,
    response: Response,
    auth_service: AuthService = Depends(get_auth_service),
) -> MeResponse:
    current_user = get_current_user(
        auth_service,
        session_cookie_from_request(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return current_user
