from __future__ import annotations

from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from fastapi import FastAPI
from fastapi.testclient import TestClient

from api.app.auth.dependencies import get_authenticated_session
from api.app.dashboard.models import (
    DashboardOverviewRecord,
    DashboardPlanProgressRecord,
    DashboardProfileRecord,
    DashboardTaskRecord,
    DashboardWeaknessRecord,
    DashboardXpRecord,
)
from api.app.dashboard.router import get_dashboard_service, router
from api.app.errors import EXCEPTION_HANDLERS


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
PLAN_ID = UUID("1568a65e-da34-46f7-93d4-ab84f587dd04")
TASK_ID = UUID("78c1e61e-e3aa-4aa8-82b9-ee37f10614a7")
PROBLEM_ID = UUID("0c1d974a-ec41-42d9-a28c-85fbca86f17d")
XP_ID = UUID("77f3f77a-e413-430e-9bee-459a4563d84b")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)


class FakeDashboardService:
    def __init__(self) -> None:
        self.calls: list[dict[str, Any]] = []

    def get_overview(self, **values: Any) -> DashboardOverviewRecord:
        self.calls.append(values)
        return DashboardOverviewRecord(
            profile=DashboardProfileRecord(USER_ID, "Gary", 2, 1, 20),
            today_task=DashboardTaskRecord(
                TASK_ID,
                "完成一道数组题",
                "open",
                "强化当前最明显短板",
                20,
                "problems",
                PROBLEM_ID,
                1,
            ),
            weakness=DashboardWeaknessRecord("arrays", "数组", 42, PROBLEM_ID),
            plan_progress=DashboardPlanProgressRecord(PLAN_ID, 1, 3, 2),
            recent_xp=(DashboardXpRecord(XP_ID, "arrays", 20, "problem_completion", NOW),),
            unread_notification_count=1,
            resource_versions={"plan": 2, "xpLedger": 1, "notifications": 1},
        )


def test_dashboard_router_returns_one_server_composed_overview() -> None:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeDashboardService()
    session = type("Session", (), {"user": type("User", (), {"id": USER_ID})()})()
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[get_dashboard_service] = lambda: service

    response = TestClient(application).get("/api/v2/dashboard/overview")

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["profile"] == {
        "displayName": "Gary",
        "level": 2,
        "streakDays": 1,
        "weeklyXp": 20,
    }
    assert response.json()["todayTask"]["actionResourceId"] == str(PROBLEM_ID)
    assert response.json()["planProgress"]["completedTasks"] == 1
    assert response.json()["unreadNotificationCount"] == 1
    assert response.json()["resourceVersions"] == {
        "notifications": 1,
        "plan": 2,
        "xpLedger": 1,
    }
    assert service.calls == [{"user_id": USER_ID}]
