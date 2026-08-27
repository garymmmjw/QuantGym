"""Authenticated HTTP boundary for current-account notifications."""

from __future__ import annotations

from typing import Annotated
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
    NotificationListResponse,
    NotificationResponse,
    to_notification_response,
)
from .service import NotificationsService


router = APIRouter(prefix="/api/v2/notifications", tags=["notifications"])


def get_notifications_service(
    engine: object = Depends(get_database_engine),
) -> NotificationsService:
    return NotificationsService(engine)


@router.get(
    "",
    operation_id="listNotifications",
    response_model=NotificationListResponse,
    responses=standard_error_responses(400, 401, 422, 500, 503),
    summary="List current-account notifications",
)
def list_notifications(
    response: Response,
    cursor: Annotated[str | None, Query(max_length=512)] = None,
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    session: SessionContext = Depends(get_authenticated_session),
    service: NotificationsService = Depends(get_notifications_service),
) -> NotificationListResponse:
    page = service.list(user_id=session.user.id, cursor=cursor, limit=limit)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return NotificationListResponse(
        items=[to_notification_response(item) for item in page.items],
        unread_count=page.unread_count,
        next_cursor=page.next_cursor,
    )


@router.patch(
    "/{notification_id}/read",
    operation_id="markNotificationRead",
    response_model=NotificationResponse,
    responses=standard_error_responses(401, 403, 404, 422, 500, 503),
    summary="Mark one current-account notification as read",
)
def mark_notification_read(
    notification_id: UUID,
    request: Request,
    response: Response,
    session: SessionContext = Depends(require_mutating_session),
    service: NotificationsService = Depends(get_notifications_service),
) -> NotificationResponse:
    record = service.mark_read(
        user_id=session.user.id,
        notification_id=notification_id,
        request_id=request_id_for(request),
    )
    response.headers["Cache-Control"] = "no-store"
    response.headers["Pragma"] = "no-cache"
    return to_notification_response(record)
