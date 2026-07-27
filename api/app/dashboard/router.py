"""Authenticated HTTP boundary for the server-composed Overview."""

from __future__ import annotations

from fastapi import APIRouter, Depends, Response

from ..auth.dependencies import get_authenticated_session, get_database_engine
from ..auth.service import SessionContext
from ..errors import standard_error_responses
from .schemas import DashboardOverviewResponse, to_dashboard_response
from .service import DashboardService


router = APIRouter(prefix="/api/v2/dashboard", tags=["dashboard"])


def get_dashboard_service(
    engine: object = Depends(get_database_engine),
) -> DashboardService:
    return DashboardService(engine)


@router.get(
    "/overview",
    operation_id="getDashboardOverview",
    response_model=DashboardOverviewResponse,
    responses=standard_error_responses(401, 404, 422, 500, 503),
    summary="Read one server-composed current-account Overview",
)
def get_dashboard_overview(
    response: Response,
    session: SessionContext = Depends(get_authenticated_session),
    service: DashboardService = Depends(get_dashboard_service),
) -> DashboardOverviewResponse:
    overview = service.get_overview(user_id=session.user.id)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return to_dashboard_response(overview)


__all__ = ["get_dashboard_service", "router"]
