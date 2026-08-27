from __future__ import annotations

from collections.abc import Mapping
from dataclasses import fields
from datetime import UTC, date, datetime
from typing import get_origin, get_type_hints
from uuid import UUID

import pytest

from api.app.dashboard.models import (
    DashboardOverviewRecord,
    DashboardPlanProgressRecord,
    DashboardProfileRecord,
    DashboardTaskRecord,
    DashboardWeaknessRecord,
    DashboardXpRecord,
)
from api.app.notifications.models import NotificationRecord
from api.app.plans.models import PlanRecord, PlanTaskRecord, RecommendationRecord
from api.app.problems.models import (
    FavoriteRecord,
    NoteRecord,
    ProblemProgressRecord,
    ProblemRecord,
    ProblemSourceRecord,
)
from api.app.training.models import (
    AnswerRecord,
    AttemptRecord,
    TrainingEventRecord,
    TrainingSessionRecord,
    XpLedgerRecord,
)


NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)
USER_ID = UUID("10000000-0000-4000-8000-000000000001")
SOURCE_ID = UUID("20000000-0000-4000-8000-000000000001")
PROBLEM_ID = UUID("30000000-0000-4000-8000-000000000001")
PLAN_ID = UUID("40000000-0000-4000-8000-000000000001")
TASK_ID = UUID("50000000-0000-4000-8000-000000000001")
SESSION_ID = UUID("60000000-0000-4000-8000-000000000001")
ATTEMPT_ID = UUID("70000000-0000-4000-8000-000000000001")


def _field_names(record_type: type[object]) -> list[str]:
    return [item.name for item in fields(record_type)]


@pytest.mark.parametrize(
    ("record_type", "expected"),
    [
        (
            ProblemSourceRecord,
            [
                "id",
                "slug",
                "name",
                "content_version",
                "rights_status",
                "release_scope",
                "created_at",
                "updated_at",
            ],
        ),
        (
            ProblemRecord,
            [
                "id",
                "source_id",
                "external_key",
                "title_zh",
                "title_en",
                "prompt_zh",
                "prompt_en",
                "hint_zh",
                "hint_en",
                "solution_zh",
                "solution_en",
                "category",
                "difficulty",
                "tags",
                "companies",
                "source_url",
                "hot100",
                "version",
                "created_at",
                "updated_at",
            ],
        ),
        (
            ProblemProgressRecord,
            [
                "id",
                "user_id",
                "problem_id",
                "status",
                "attempt_count",
                "hint_count",
                "solution_revealed_at",
                "best_score",
                "last_score",
                "last_practiced_at",
                "completed_at",
                "version",
                "created_at",
                "updated_at",
            ],
        ),
        (
            FavoriteRecord,
            ["id", "user_id", "problem_id", "version", "created_at", "updated_at"],
        ),
        (
            NoteRecord,
            ["id", "user_id", "problem_id", "body", "version", "created_at", "updated_at"],
        ),
        (
            PlanRecord,
            [
                "id",
                "user_id",
                "track",
                "role",
                "season",
                "weekly_hours",
                "diagnostic_status",
                "diagnostic_score",
                "diagnostic_scores",
                "status",
                "version",
                "created_at",
                "updated_at",
            ],
        ),
        (
            RecommendationRecord,
            [
                "id",
                "user_id",
                "plan_id",
                "problem_id",
                "kind",
                "skill_key",
                "rationale",
                "provenance_type",
                "provenance_resource_id",
                "dedupe_key",
                "rank",
                "status",
                "version",
                "created_at",
                "updated_at",
            ],
        ),
        (
            TrainingSessionRecord,
            [
                "id",
                "user_id",
                "problem_id",
                "plan_task_id",
                "status",
                "version",
                "started_at",
                "last_activity_at",
                "completed_at",
                "created_at",
                "updated_at",
            ],
        ),
        (
            AttemptRecord,
            [
                "id",
                "user_id",
                "training_session_id",
                "problem_id",
                "sequence",
                "status",
                "score",
                "evaluation",
                "submitted_at",
                "evaluated_at",
                "created_at",
            ],
        ),
        (
            AnswerRecord,
            ["id", "user_id", "attempt_id", "kind", "body", "body_sha256", "created_at"],
        ),
        (
            TrainingEventRecord,
            [
                "id",
                "user_id",
                "training_session_id",
                "problem_id",
                "attempt_id",
                "event_type",
                "sequence",
                "payload",
                "occurred_at",
                "created_at",
            ],
        ),
        (
            XpLedgerRecord,
            [
                "id",
                "user_id",
                "training_event_id",
                "training_session_id",
                "problem_id",
                "skill_key",
                "amount",
                "reason",
                "occurred_at",
                "created_at",
            ],
        ),
    ],
)
def test_phase2_persistence_records_cover_the_schema_contract(
    record_type: type[object], expected: list[str]
) -> None:
    assert _field_names(record_type) == expected


def test_phase1_plan_and_notification_constructors_remain_compatible() -> None:
    task = PlanTaskRecord(
        id=TASK_ID,
        user_id=USER_ID,
        title="Phase 1 task",
        status="open",
        sort_order=0,
        version=1,
        completed_at=None,
        created_at=NOW,
        updated_at=NOW,
    )
    notification = NotificationRecord(
        id=TASK_ID,
        user_id=USER_ID,
        kind="system",
        title="Phase 1 notification",
        body="Phase 1 body",
        read_at=None,
        created_at=NOW,
    )

    assert (
        task.plan_id,
        task.recommendation_id,
        task.target_problem_id,
        task.detail,
        task.scheduled_for,
        task.estimated_minutes,
        task.action_target,
        task.skill_key,
    ) == (None,) * 8
    assert (
        notification.action_target,
        notification.action_resource_id,
        notification.dedupe_key,
    ) == (None, None, None)


def test_json_collections_are_defensively_copied_and_read_only() -> None:
    assert get_origin(get_type_hints(PlanRecord)["diagnostic_scores"]) is Mapping
    assert get_origin(get_type_hints(TrainingEventRecord)["payload"]) is Mapping
    assert get_origin(get_type_hints(DashboardOverviewRecord)["resource_versions"]) is Mapping

    tags = ["probability"]
    companies = ["Example Capital"]
    problem = ProblemRecord(
        id=PROBLEM_ID,
        source_id=SOURCE_ID,
        external_key="problem-1",
        title_zh="概率题",
        title_en=None,
        prompt_zh="题目",
        prompt_en=None,
        hint_zh=None,
        hint_en=None,
        solution_zh=None,
        solution_en=None,
        category="probability",
        difficulty="Medium",
        tags=tags,
        companies=companies,
        source_url=None,
        hot100=False,
        version=1,
        created_at=NOW,
        updated_at=NOW,
    )
    scores = {"probability": 80}
    plan = PlanRecord(
        id=PLAN_ID,
        user_id=USER_ID,
        track="internship",
        role="quant-research",
        season="2027-summer",
        weekly_hours=8,
        diagnostic_status="completed",
        diagnostic_score=80,
        diagnostic_scores=scores,
        status="active",
        version=1,
        created_at=NOW,
        updated_at=NOW,
    )
    payload = {"result": {"score": 90}, "skills": ["probability"]}
    event = TrainingEventRecord(
        id=TASK_ID,
        user_id=USER_ID,
        training_session_id=SESSION_ID,
        problem_id=PROBLEM_ID,
        attempt_id=ATTEMPT_ID,
        event_type="attempt_submitted",
        sequence=1,
        payload=payload,
        occurred_at=NOW,
        created_at=NOW,
    )

    tags.append("mutated")
    companies.clear()
    scores["probability"] = 0
    payload["result"]["score"] = 0
    payload["skills"].append("mutated")

    assert problem.tags == ("probability",)
    assert problem.companies == ("Example Capital",)
    assert plan.diagnostic_scores == {"probability": 80}
    assert event.payload["result"] == {"score": 90}
    assert event.payload["skills"] == ("probability",)
    with pytest.raises(TypeError):
        plan.diagnostic_scores["probability"] = 1  # type: ignore[index]
    with pytest.raises(TypeError):
        event.payload["result"]["score"] = 1  # type: ignore[index]


def test_user_authored_content_is_fail_closed_in_repr() -> None:
    note_secret = "private-note-content"
    answer_secret = "private-answer-content"
    evaluation_secret = "private-evaluation-content"
    event_secret = "private-event-payload"
    task_secret = "private-task-content"
    notification_secret = "private-notification-content"

    records = [
        NoteRecord(TASK_ID, USER_ID, PROBLEM_ID, note_secret, 1, NOW, NOW),
        AnswerRecord(
            TASK_ID,
            USER_ID,
            ATTEMPT_ID,
            "text",
            answer_secret,
            "a" * 64,
            NOW,
        ),
        AttemptRecord(
            ATTEMPT_ID,
            USER_ID,
            SESSION_ID,
            PROBLEM_ID,
            1,
            "evaluated",
            90,
            evaluation_secret,
            NOW,
            NOW,
            NOW,
        ),
        TrainingEventRecord(
            TASK_ID,
            USER_ID,
            SESSION_ID,
            PROBLEM_ID,
            ATTEMPT_ID,
            "attempt_submitted",
            1,
            {"answer": event_secret},
            NOW,
            NOW,
        ),
        PlanTaskRecord(
            TASK_ID,
            USER_ID,
            task_secret,
            "open",
            0,
            1,
            None,
            NOW,
            NOW,
            plan_id=PLAN_ID,
            detail=task_secret,
            scheduled_for=date(2026, 7, 28),
        ),
        NotificationRecord(
            TASK_ID,
            USER_ID,
            "training",
            notification_secret,
            notification_secret,
            None,
            NOW,
        ),
    ]

    rendered = "\n".join(repr(record) for record in records)
    for secret in (
        note_secret,
        answer_secret,
        evaluation_secret,
        event_secret,
        task_secret,
        notification_secret,
    ):
        assert secret not in rendered
    assert rendered.count("[REDACTED]") >= len(records)


def test_dashboard_overview_uses_typed_summaries_and_read_only_versions() -> None:
    versions = {"plan": 3, "problemProgress": 5, "notifications": 2}
    overview = DashboardOverviewRecord(
        profile=DashboardProfileRecord(
            user_id=USER_ID,
            display_name="Gary",
            level=4,
            streak_days=7,
            weekly_xp=420,
        ),
        today_task=DashboardTaskRecord(
            id=TASK_ID,
            title="Complete probability practice",
            status="open",
            unlock_reason="Diagnostic weakness",
            reward_xp=50,
            action_target="problems",
            action_resource_id=PROBLEM_ID,
            version=3,
        ),
        weakness=DashboardWeaknessRecord(
            skill_key="probability",
            label="Probability",
            score=42,
            recommended_problem_id=PROBLEM_ID,
        ),
        plan_progress=DashboardPlanProgressRecord(
            plan_id=PLAN_ID,
            completed_tasks=2,
            total_tasks=5,
            version=3,
        ),
        recent_xp=(
            DashboardXpRecord(
                id=TASK_ID,
                skill_key="probability",
                amount=50,
                reason="problem_completion",
                occurred_at=NOW,
            ),
        ),
        unread_notification_count=2,
        resource_versions=versions,
    )

    versions["plan"] = 99
    assert overview.resource_versions["plan"] == 3
    with pytest.raises(TypeError):
        overview.resource_versions["plan"] = 4  # type: ignore[index]
    assert overview.recent_xp[0].amount == 50
