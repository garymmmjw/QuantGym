"""Server-composed Overview read model sourced only from confirmed tables."""

from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, date, datetime, timedelta
from typing import Any
from uuid import UUID

from sqlalchemy import text

from ..errors import ApiError
from .models import (
    DashboardOverviewRecord,
    DashboardPlanProgressRecord,
    DashboardProfileRecord,
    DashboardTaskRecord,
    DashboardWeaknessRecord,
    DashboardXpRecord,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


_ALLOWED_SOURCE_CTE = """
    WITH ranked_sources AS (
        SELECT source.*,
               row_number() OVER (
                   PARTITION BY source.slug
                   ORDER BY source.created_at DESC, source.id DESC
               ) AS source_rank
        FROM problem_sources AS source
    ),
    allowed_sources AS (
        SELECT *
        FROM ranked_sources
        WHERE source_rank = 1
          AND release_scope = 'preview'
          AND rights_status IN ('approved', 'internal_preview')
    )
"""


class DashboardService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
    ) -> None:
        self._engine = engine
        self._clock = clock

    def get_overview(self, *, user_id: UUID) -> DashboardOverviewRecord:
        now = self._now()
        today = now.date()
        week_start = datetime(
            today.year,
            today.month,
            today.day,
            tzinfo=UTC,
        ) - timedelta(days=6)
        with self._engine.connect().execution_options(
            isolation_level="REPEATABLE READ"
        ) as connection:
            profile = (
                connection.execute(
                    text(
                        """
                        SELECT
                            users.id AS user_id,
                            users.display_name,
                            count(ledger.id) AS xp_ledger_version,
                            COALESCE(sum(ledger.amount), 0) AS total_xp,
                            COALESCE(sum(ledger.amount) FILTER (
                                WHERE ledger.occurred_at >= :week_start
                            ), 0) AS weekly_xp
                        FROM users
                        LEFT JOIN xp_ledger AS ledger ON ledger.user_id = users.id
                        WHERE users.id = :user_id AND users.status = 'active'
                        GROUP BY users.id, users.display_name
                        """
                    ),
                    {"user_id": user_id, "week_start": week_start},
                )
                .mappings()
                .first()
            )
            if profile is None:
                raise ApiError(
                    status_code=404,
                    code="DASHBOARD_PROFILE_NOT_FOUND",
                    message="用户概览不存在",
                    retryable=False,
                )
            xp_dates = [
                row[0]
                for row in connection.execute(
                    text(
                        """
                        SELECT DISTINCT
                            (occurred_at AT TIME ZONE 'UTC')::date AS xp_date
                        FROM xp_ledger
                        WHERE user_id = :user_id
                          AND (occurred_at AT TIME ZONE 'UTC')::date <= :today
                        ORDER BY xp_date DESC
                        """
                    ),
                    {"user_id": user_id, "today": today},
                ).all()
            ]
            plan = (
                connection.execute(
                    text(
                        """
                        SELECT id, version, diagnostic_scores
                        FROM plans
                        WHERE user_id = :user_id AND status = 'active'
                        """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .first()
            )
            task = None
            weakness = None
            progress = None
            if plan is not None:
                task = (
                    connection.execute(
                        text(
                            f"""
                            {_ALLOWED_SOURCE_CTE}
                            SELECT
                                task.id,
                                task.title,
                                task.status,
                                COALESCE(task.detail, '按计划推进今日训练') AS unlock_reason,
                                CASE problem.difficulty
                                    WHEN 'Easy' THEN 10
                                    WHEN 'Medium' THEN 20
                                    WHEN 'Hard' THEN 30
                                    ELSE 0
                                END AS reward_xp,
                                task.action_target,
                                task.target_problem_id AS action_resource_id,
                                task.version
                            FROM plan_tasks AS task
                            LEFT JOIN problems AS problem
                              ON problem.id = task.target_problem_id
                            LEFT JOIN allowed_sources AS source
                              ON source.id = problem.source_id
                            WHERE task.user_id = :user_id
                              AND task.plan_id = :plan_id
                              AND task.status = 'open'
                              AND (task.scheduled_for IS NULL
                                   OR task.scheduled_for <= :today)
                              AND (
                                  task.target_problem_id IS NULL
                                  OR source.id IS NOT NULL
                              )
                            ORDER BY task.scheduled_for NULLS LAST,
                                     task.sort_order,
                                     task.id
                            LIMIT 1
                            """
                        ),
                        {"user_id": user_id, "plan_id": plan["id"], "today": today},
                    )
                    .mappings()
                    .first()
                )
                weakness = (
                    connection.execute(
                        text(
                            f"""
                            {_ALLOWED_SOURCE_CTE}
                            SELECT
                                recommendation.skill_key,
                                recommendation.rationale AS label,
                                CASE
                                    WHEN source.id IS NOT NULL
                                    THEN recommendation.problem_id
                                    ELSE NULL
                                END AS problem_id
                            FROM recommendations AS recommendation
                            LEFT JOIN problems AS problem
                              ON problem.id = recommendation.problem_id
                            LEFT JOIN allowed_sources AS source
                              ON source.id = problem.source_id
                            WHERE recommendation.user_id = :user_id
                              AND recommendation.plan_id = :plan_id
                              AND recommendation.status = 'active'
                              AND recommendation.skill_key IS NOT NULL
                            ORDER BY recommendation.rank, recommendation.id
                            LIMIT 1
                            """
                        ),
                        {"user_id": user_id, "plan_id": plan["id"]},
                    )
                    .mappings()
                    .first()
                )
                counts = connection.execute(
                    text(
                        """
                        SELECT
                            count(*) FILTER (WHERE status = 'completed') AS completed,
                            count(*) AS total
                        FROM plan_tasks
                        WHERE user_id = :user_id AND plan_id = :plan_id
                        """
                    ),
                    {"user_id": user_id, "plan_id": plan["id"]},
                ).mappings().one()
                progress = DashboardPlanProgressRecord(
                    plan_id=plan["id"],
                    completed_tasks=int(counts["completed"]),
                    total_tasks=int(counts["total"]),
                    version=int(plan["version"]),
                )
            recent_xp_rows = (
                connection.execute(
                    text(
                        """
                        SELECT id, skill_key, amount, reason, occurred_at
                        FROM xp_ledger
                        WHERE user_id = :user_id
                        ORDER BY occurred_at DESC, id DESC
                        LIMIT 5
                        """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .all()
            )
            notification_counts = connection.execute(
                text(
                    """
                    SELECT
                        count(*) AS total,
                        count(*) FILTER (WHERE read_at IS NULL) AS unread,
                        count(*) FILTER (WHERE read_at IS NOT NULL) AS read
                    FROM notifications
                    WHERE user_id = :user_id
                    """
                ),
                {"user_id": user_id},
            ).mappings().one()

        total_xp = int(profile["total_xp"])
        diagnostic_scores = {} if plan is None else dict(plan["diagnostic_scores"])
        return DashboardOverviewRecord(
            profile=DashboardProfileRecord(
                user_id=profile["user_id"],
                display_name=profile["display_name"],
                level=(total_xp // 100) + 1,
                streak_days=_streak_days(xp_dates, today=today),
                weekly_xp=int(profile["weekly_xp"]),
            ),
            today_task=(None if task is None else _task_record(task)),
            weakness=(
                None
                if weakness is None
                else DashboardWeaknessRecord(
                    skill_key=weakness["skill_key"],
                    label=weakness["label"],
                    score=int(diagnostic_scores.get(weakness["skill_key"], 0)),
                    recommended_problem_id=weakness["problem_id"],
                )
            ),
            plan_progress=progress,
            recent_xp=tuple(
                DashboardXpRecord(
                    id=row["id"],
                    skill_key=row["skill_key"],
                    amount=int(row["amount"]),
                    reason=row["reason"],
                    occurred_at=row["occurred_at"],
                )
                for row in recent_xp_rows
            ),
            unread_notification_count=int(notification_counts["unread"]),
            resource_versions={
                "notifications": (
                    int(notification_counts["total"])
                    + int(notification_counts["read"])
                ),
                "plan": 0 if plan is None else int(plan["version"]),
                "xpLedger": int(profile["xp_ledger_version"]),
            },
        )

    def _now(self) -> datetime:
        value = self._clock()
        if not isinstance(value, datetime) or value.tzinfo is None:
            raise ValueError("dashboard clock must be timezone-aware")
        if value.utcoffset() is None:
            raise ValueError("dashboard clock must be timezone-aware")
        return value.astimezone(UTC)


def _task_record(row: Any) -> DashboardTaskRecord:
    return DashboardTaskRecord(
        id=row["id"],
        title=row["title"],
        status=row["status"],
        unlock_reason=row["unlock_reason"],
        reward_xp=int(row["reward_xp"]),
        action_target=row["action_target"],
        action_resource_id=row["action_resource_id"],
        version=int(row["version"]),
    )


def _streak_days(xp_dates: list[date], *, today: date) -> int:
    if not xp_dates:
        return 0
    yesterday = today - timedelta(days=1)
    if xp_dates[0] == today:
        expected = today
    elif xp_dates[0] == yesterday:
        expected = yesterday
    else:
        return 0
    streak = 0
    for value in xp_dates:
        if value != expected:
            break
        streak += 1
        expected -= timedelta(days=1)
    return streak


__all__ = ["DashboardService"]
