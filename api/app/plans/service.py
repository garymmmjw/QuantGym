"""Transactional, versioned, idempotent Todo operations."""

from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import text
from pydantic import SecretStr

from ..errors import ApiError
from ..idempotency import IdempotencyKey, request_fingerprint
from ..idempotency_records import (
    IdempotencyCompletion,
    PlanCreationAcknowledgement,
    PlanDiagnosticAcknowledgement,
    PlanEffectAcknowledgement,
    execute_idempotent_operation,
)
from .models import (
    CurrentPlanRecord,
    PlanCreationResult,
    PlanDiagnosticResult,
    PlanRecord,
    PlanTaskMutationResult,
    PlanTaskRecord,
    RecommendationRecord,
)
from .schemas import (
    CompletePlanTaskRequest,
    CompleteTodoRequest,
    CreatePlanRequest,
    CreateTodoRequest,
    RunPlanDiagnosticRequest,
    UpdatePlanTaskRequest,
    UpdateTodoRequest,
)


def utc_now() -> datetime:
    return datetime.now(UTC)


_TASK_COLUMNS = (
    "id, user_id, title, status, sort_order, version, completed_at, "
    "created_at, updated_at"
)

_PLAN_COLUMNS = (
    "id, user_id, track, role, season, weekly_hours, diagnostic_status, "
    "diagnostic_score, diagnostic_scores, status, version, created_at, updated_at"
)
_OFFICIAL_TASK_COLUMNS = (
    "id, user_id, title, status, sort_order, version, completed_at, created_at, "
    "updated_at, plan_id, recommendation_id, target_problem_id, detail, "
    "scheduled_for, estimated_minutes, action_target, skill_key"
)
_RECOMMENDATION_COLUMNS = (
    "id, user_id, plan_id, problem_id, kind, skill_key, rationale, "
    "provenance_type, provenance_resource_id, dedupe_key, rank, status, version, "
    "created_at, updated_at"
)
_IDEMPOTENCY_TTL = timedelta(hours=24)
_LATEST_PREVIEW_SOURCE_CTE = """
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
          AND rights_status IN ('approved', 'internal_preview')
          AND release_scope = 'preview'
    )
"""

_DIAGNOSTIC_DEFINITION: dict[str, tuple[str, frozenset[str], str]] = {
    "mm-percent": (
        "mentalMath",
        frozenset({"37.5", "40", "42.5", "47.5"}),
        "42.5",
    ),
    "prob-coin": (
        "probabilityExpectation",
        frozenset({"1/8", "1/4", "3/8", "1/2"}),
        "3/8",
    ),
    "prob-die": (
        "probabilityExpectation",
        frozenset({"3", "3.5", "4", "4.5"}),
        "3.5",
    ),
    "stats-pvalue": (
        "statistics",
        frozenset(
            {
                "null-is-true",
                "null-hypothesis-tail",
                "alternative-is-true",
                "model-accuracy",
            }
        ),
        "null-hypothesis-tail",
    ),
    "market-spread": (
        "market",
        frozenset(
            {
                "sell-to-market-maker",
                "buy-from-market-maker",
                "buy-and-sell",
                "no-fill",
            }
        ),
        "buy-from-market-maker",
    ),
    "option-call": (
        "option",
        frozenset({"underlying", "strike", "premium-paid", "volatility"}),
        "premium-paid",
    ),
    "code-two-sum": (
        "leetcode",
        frozenset({"queue", "hash-map", "linked-list", "heap-only"}),
        "hash-map",
    ),
    "research-validation": (
        "machineLearning",
        frozenset({"random-k-fold", "walk-forward", "train-only", "reuse-test"}),
        "walk-forward",
    ),
}
_SKILL_PROBLEM_CATEGORIES: dict[str, tuple[str, ...]] = {
    "mentalMath": ("probability",),
    "probabilityExpectation": ("probability",),
    "statistics": ("statistics",),
    "market": ("derivatives",),
    "option": ("derivatives",),
    "leetcode": ("optimization",),
    "machineLearning": ("statistics", "optimization"),
}

_ROLE_TASKS: dict[str, tuple[tuple[str, str, int, str, str], ...]] = {
    "quantTrading": (
        ("概率与期望基础训练", "完成一组概率或期望题并写下关键条件。", 35, "problems", "probabilityExpectation"),
        ("OA 速度训练", "完成一轮速算并复盘错误。", 25, "tools", "mentalMath"),
        ("市场与期权复盘", "复盘一项做市或期权核心概念。", 35, "problems", "market"),
        ("申请材料扫描", "检查一项岗位要求并更新准备记录。", 20, "jobs", "jobs"),
        ("技术面试口述", "用面试方式讲清一道题的假设和结论。", 30, "interview", "probabilityExpectation"),
    ),
    "quantResearch": (
        ("统计推断基础训练", "完成一组统计推断题并记录假设。", 40, "problems", "statistics"),
        ("研究验证复盘", "复盘一次无泄漏验证流程。", 35, "problems", "machineLearning"),
        ("Python 数据训练", "完成一项数据处理练习。", 35, "problems", "pandasNumpy"),
        ("申请材料扫描", "检查一项岗位要求并更新准备记录。", 20, "jobs", "jobs"),
        ("研究项目口述", "用面试方式讲清研究假设、验证和失败模式。", 30, "interview", "machineLearning"),
    ),
    "quantDeveloper": (
        ("限时 Coding OA", "完成两道算法题并复盘复杂度。", 45, "problems", "leetcode"),
        ("代码边界复盘", "复盘一个实现的边界条件和测试。", 30, "problems", "leetcode"),
        ("市场背景训练", "复盘一个交易系统相关概念。", 30, "problems", "market"),
        ("申请材料扫描", "检查一项岗位要求并更新准备记录。", 20, "jobs", "jobs"),
        ("系统设计口述", "练习清晰说明一次系统设计取舍。", 35, "interview", "leetcode"),
    ),
}
_DEFAULT_ROLE_TASKS: tuple[tuple[str, str, int, str, str], ...] = (
    ("核心能力训练", "完成一组目标岗位相关题目并记录复盘。", 35, "problems", "general"),
    ("限时能力训练", "完成一轮限时练习并复盘错误。", 25, "tools", "general"),
    ("岗位知识复盘", "复盘一个目标岗位的核心知识点。", 30, "problems", "general"),
    ("申请材料扫描", "检查一项岗位要求并更新准备记录。", 20, "jobs", "jobs"),
    ("面试口述训练", "清晰说明一道题的假设、步骤和结论。", 30, "interview", "general"),
)


@dataclass(frozen=True, slots=True)
class _Reservation:
    audit_id: UUID
    acquired: bool
    details: dict[str, Any]


class PlansService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
        id_factory: Callable[[], UUID] = uuid4,
        fingerprint_secret: SecretStr | str | None = None,
    ) -> None:
        self._engine = engine
        self._clock = clock
        self._id_factory = id_factory
        self._diagnostic_fingerprint_key = _fingerprint_key(fingerprint_secret)

    def list(self, *, user_id: UUID) -> list[PlanTaskRecord]:
        with self._engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                    SELECT {_TASK_COLUMNS}
                    FROM plan_tasks
                    WHERE user_id = :user_id
                      AND plan_id IS NULL
                    ORDER BY
                        CASE status WHEN 'open' THEN 0 ELSE 1 END,
                        sort_order ASC,
                        created_at ASC,
                        id ASC
                    """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .all()
            )
        return [_record(row) for row in rows]

    def create(
        self,
        *,
        user_id: UUID,
        payload: CreateTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        task_id = self._id_factory()
        event_type = "todo.create"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=None,
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    INSERT INTO plan_tasks
                        (id, user_id, title, status, sort_order, version,
                         completed_at, created_at, updated_at)
                    VALUES
                        (:id, :user_id, :title, 'open', :sort_order, 1,
                         NULL, :created_at, :updated_at)
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "id": task_id,
                        "user_id": user_id,
                        "title": payload.title,
                        "sort_order": payload.sort_order,
                        "created_at": now,
                        "updated_at": now,
                    },
                )
                .mappings()
                .one()
            )
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def update(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: UpdateTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        event_type = "todo.update"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    UPDATE plan_tasks
                    SET title = COALESCE(:title, title),
                        sort_order = COALESCE(:sort_order, sort_order),
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND plan_id IS NULL
                      AND version = :expected_version
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "expected_version": payload.version,
                        "sort_order": payload.sort_order,
                        "task_id": task_id,
                        "title": payload.title,
                        "updated_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                _raise_task_write_failure(connection, user_id, task_id)
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def complete(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: CompleteTodoRequest,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> PlanTaskRecord:
        now = self._now()
        event_type = "todo.complete"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return _replay_task(connection, user_id, reservation)
            row = (
                connection.execute(
                    text(
                        f"""
                    UPDATE plan_tasks
                    SET status = 'completed',
                        completed_at = :completed_at,
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND plan_id IS NULL
                      AND version = :expected_version
                      AND status = 'open'
                    RETURNING {_TASK_COLUMNS}
                    """
                    ),
                    {
                        "completed_at": now,
                        "expected_version": payload.version,
                        "task_id": task_id,
                        "updated_at": now,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if row is None:
                current = _select_task(connection, user_id, task_id)
                if current is None:
                    raise _not_found()
                if (
                    current["status"] == "completed"
                    and current["version"] == payload.version
                ):
                    row = current
                else:
                    raise _conflict()
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=row["version"],
            )
        return _record(row)

    def delete(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        version: int,
        idempotency_key: IdempotencyKey,
        request_id: str,
    ) -> None:
        now = self._now()
        event_type = "todo.delete"
        fingerprint = request_fingerprint(
            event_type=event_type,
            resource_id=str(task_id),
            payload={"version": version},
        )
        with self._engine.begin() as connection:
            reservation = _reserve(
                connection,
                user_id=user_id,
                event_type=event_type,
                key=idempotency_key,
                fingerprint=fingerprint,
                resource_id=task_id,
                request_id=request_id,
                now=now,
                id_factory=self._id_factory,
            )
            if not reservation.acquired:
                return
            deleted = (
                connection.execute(
                    text(
                        """
                    DELETE FROM plan_tasks
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND plan_id IS NULL
                      AND version = :expected_version
                    RETURNING version
                    """
                    ),
                    {
                        "expected_version": version,
                        "task_id": task_id,
                        "user_id": user_id,
                    },
                )
                .mappings()
                .first()
            )
            if deleted is None:
                _raise_task_write_failure(connection, user_id, task_id)
            _finish_reservation(
                connection,
                reservation,
                fingerprint=fingerprint,
                resource_id=task_id,
                result_version=deleted["version"],
            )

    def get_current(self, *, user_id: UUID) -> CurrentPlanRecord | None:
        with self._engine.connect().execution_options(
            isolation_level="REPEATABLE READ"
        ) as connection:
            plan_row = (
                connection.execute(
                    text(
                        f"""
                        SELECT {_PLAN_COLUMNS}
                        FROM plans
                        WHERE user_id = :user_id
                          AND status = 'active'
                        """
                    ),
                    {"user_id": user_id},
                )
                .mappings()
                .first()
            )
            if plan_row is None:
                return None
            plan_id = plan_row["id"]
            task_rows = (
                connection.execute(
                    text(
                        f"""
                        {_LATEST_PREVIEW_SOURCE_CTE}
                        SELECT {_OFFICIAL_TASK_COLUMNS}
                             , (
                                  target_problem_id IS NULL
                                  OR EXISTS (
                                      SELECT 1
                                      FROM problems AS visible_problem
                                      JOIN allowed_sources AS visible_source
                                        ON visible_source.id = visible_problem.source_id
                                      WHERE visible_problem.id = plan_tasks.target_problem_id
                                  )
                               ) AS target_problem_visible
                        FROM plan_tasks
                        WHERE user_id = :user_id
                          AND plan_id = :plan_id
                        ORDER BY
                            CASE status WHEN 'open' THEN 0 ELSE 1 END,
                            scheduled_for ASC NULLS LAST,
                            sort_order ASC,
                            created_at ASC,
                            id ASC
                        """
                    ),
                    {"user_id": user_id, "plan_id": plan_id},
                )
                .mappings()
                .all()
            )
            recommendation_rows = (
                connection.execute(
                    text(
                        f"""
                        {_LATEST_PREVIEW_SOURCE_CTE}
                        SELECT {_RECOMMENDATION_COLUMNS}
                             , (
                                  problem_id IS NULL
                                  OR EXISTS (
                                      SELECT 1
                                      FROM problems AS visible_problem
                                      JOIN allowed_sources AS visible_source
                                        ON visible_source.id = visible_problem.source_id
                                      WHERE visible_problem.id = recommendations.problem_id
                                  )
                               ) AS problem_visible
                        FROM recommendations
                        WHERE user_id = :user_id
                          AND plan_id = :plan_id
                          AND status = 'active'
                        ORDER BY rank ASC, id ASC
                        """
                    ),
                    {"user_id": user_id, "plan_id": plan_id},
                )
                .mappings()
                .all()
            )
        return CurrentPlanRecord(
            plan=_plan_record(plan_row),
            tasks=tuple(_official_task_record(row) for row in task_rows),
            recommendations=tuple(
                _recommendation_record(row) for row in recommendation_rows
            ),
        )

    def create_plan(
        self,
        *,
        user_id: UUID,
        payload: CreatePlanRequest,
        idempotency_key: IdempotencyKey,
    ) -> PlanCreationResult:
        now = self._now()
        request_hash = request_fingerprint(
            event_type="plan.create",
            resource_id=None,
            payload=payload.model_dump(mode="json", by_alias=True),
        )
        plan_id = self._new_id()
        task_templates = _task_templates(payload.role, payload.weekly_hours)
        task_ids = tuple(self._new_id() for _template in task_templates)

        def create(active_connection: Any) -> IdempotencyCompletion:
            existing = active_connection.execute(
                text(
                    """
                    SELECT id
                    FROM plans
                    WHERE user_id = :user_id
                      AND status = 'active'
                    """
                ),
                {"user_id": user_id},
            ).first()
            if existing is not None:
                raise ApiError(
                    status_code=409,
                    code="PLAN_ALREADY_ACTIVE",
                    message="当前账户已有生效中的计划",
                    retryable=False,
                )
            active_connection.execute(
                text(
                    """
                    INSERT INTO plans
                        (id, user_id, track, role, season, weekly_hours,
                         diagnostic_status, diagnostic_score, diagnostic_scores,
                         status, version, created_at, updated_at)
                    VALUES
                        (:id, :user_id, :track, :role, :season, :weekly_hours,
                         'pending', 0, '{}'::jsonb, 'active', 1, :now, :now)
                    """
                ),
                {
                    "id": plan_id,
                    "user_id": user_id,
                    "track": payload.track,
                    "role": payload.role,
                    "season": payload.season,
                    "weekly_hours": payload.weekly_hours,
                    "now": now,
                },
            )
            for sort_order, (task_id, template) in enumerate(
                zip(task_ids, task_templates, strict=True)
            ):
                title, detail, minutes, action_target, skill_key = template
                active_connection.execute(
                    text(
                        """
                        INSERT INTO plan_tasks
                            (id, user_id, title, status, sort_order, version,
                             completed_at, created_at, updated_at, plan_id,
                             recommendation_id, target_problem_id, detail,
                             scheduled_for, estimated_minutes, action_target,
                             skill_key)
                        VALUES
                            (:id, :user_id, :title, 'open', :sort_order, 1,
                             NULL, :now, :now, :plan_id, NULL, NULL, :detail,
                             :scheduled_for, :estimated_minutes, :action_target,
                             :skill_key)
                        """
                    ),
                    {
                        "id": task_id,
                        "user_id": user_id,
                        "title": title,
                        "sort_order": sort_order,
                        "now": now,
                        "plan_id": plan_id,
                        "detail": detail,
                        "scheduled_for": now.date(),
                        "estimated_minutes": minutes,
                        "action_target": action_target,
                        "skill_key": skill_key,
                    },
                )
            return IdempotencyCompletion(
                response_status=201,
                acknowledgement=PlanCreationAcknowledgement(
                    plan_id=plan_id,
                    plan_version=1,
                    task_ids=task_ids,
                ),
                resource_id=plan_id,
            )

        with self._engine.begin() as connection:
            user_row = connection.execute(
                text(
                    """
                    SELECT id
                    FROM users
                    WHERE id = :user_id
                    FOR UPDATE
                    """
                ),
                {"user_id": user_id},
            ).first()
            if user_row is None:
                raise _official_plan_not_found()
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation="plan.create",
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + _IDEMPOTENCY_TTL,
                reward_callback=create,
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
        return _plan_creation_result(record.response_snapshot)

    def run_diagnostic(
        self,
        *,
        user_id: UUID,
        payload: RunPlanDiagnosticRequest,
        idempotency_key: IdempotencyKey,
    ) -> PlanDiagnosticResult:
        now = self._now()
        request_hash = _diagnostic_request_fingerprint(
            self._diagnostic_fingerprint_key,
            user_id=user_id,
            idempotency_key=idempotency_key,
            payload=payload,
        )

        def diagnose(active_connection: Any) -> IdempotencyCompletion:
            score, scores = _score_diagnostic(payload)
            plan = _lock_current_plan(active_connection, user_id=user_id)
            if plan["version"] != payload.plan_version:
                raise _official_plan_conflict()
            updated_version = active_connection.execute(
                text(
                    """
                    UPDATE plans
                    SET diagnostic_status = 'completed',
                        diagnostic_score = :diagnostic_score,
                        diagnostic_scores = CAST(:diagnostic_scores AS jsonb),
                        version = version + 1,
                        updated_at = :updated_at
                    WHERE id = :plan_id
                      AND user_id = :user_id
                      AND status = 'active'
                      AND version = :expected_version
                    RETURNING version
                    """
                ),
                {
                    "diagnostic_score": score,
                    "diagnostic_scores": json.dumps(
                        scores,
                        separators=(",", ":"),
                        sort_keys=True,
                    ),
                    "updated_at": now,
                    "plan_id": plan["id"],
                    "user_id": user_id,
                    "expected_version": payload.plan_version,
                },
            ).scalar_one_or_none()
            if updated_version is None:
                raise _official_plan_conflict()

            recommendation_ids: list[UUID] = []
            ordered_scores = sorted(scores.items(), key=lambda item: (item[1], item[0]))
            selected_binding: tuple[UUID, str, Any, str] | None = None
            for rank, (skill_key, skill_score) in enumerate(ordered_scores):
                recommendation_id = self._new_id()
                problem = _select_recommended_problem(
                    active_connection,
                    skill_key=skill_key,
                )
                problem_id = None if problem is None else problem["id"]
                recommendation_kind = "skill" if problem is None else "problem"
                rationale = (
                    f"Baseline 显示 {skill_key} 当前得分为 {skill_score}，"
                    "建议优先安排针对性训练。"
                )
                dedupe_key = _recommendation_dedupe_key(
                    plan_id=plan["id"],
                    skill_key=skill_key,
                )
                returned_id = active_connection.execute(
                    text(
                        """
                        INSERT INTO recommendations
                            (id, user_id, plan_id, problem_id, kind, skill_key,
                             rationale, provenance_type, provenance_resource_id,
                             dedupe_key, rank, status, version, created_at, updated_at)
                        VALUES
                            (:id, :user_id, :plan_id, :problem_id, :kind, :skill_key,
                             :rationale, 'diagnostic', :plan_id, :dedupe_key,
                             :rank, 'active', 1, :now, :now)
                        ON CONFLICT (plan_id, dedupe_key)
                        DO UPDATE SET
                            problem_id = EXCLUDED.problem_id,
                            kind = EXCLUDED.kind,
                            skill_key = EXCLUDED.skill_key,
                            rationale = EXCLUDED.rationale,
                            provenance_type = EXCLUDED.provenance_type,
                            provenance_resource_id = EXCLUDED.provenance_resource_id,
                            rank = EXCLUDED.rank,
                            status = 'active',
                            version = recommendations.version + 1,
                            updated_at = EXCLUDED.updated_at
                        WHERE recommendations.user_id = EXCLUDED.user_id
                        RETURNING id
                        """
                    ),
                    {
                        "id": recommendation_id,
                        "user_id": user_id,
                        "plan_id": plan["id"],
                        "problem_id": problem_id,
                        "kind": recommendation_kind,
                        "skill_key": skill_key,
                        "rationale": rationale,
                        "dedupe_key": dedupe_key,
                        "rank": rank,
                        "now": now,
                    },
                ).scalar_one_or_none()
                if returned_id is None:
                    raise RuntimeError("recommendation ownership invariant failed")
                recommendation_ids.append(returned_id)
                if problem is None:
                    _clear_unavailable_recommendation_task(
                        active_connection,
                        user_id=user_id,
                        plan_id=plan["id"],
                        recommendation_id=returned_id,
                        skill_key=skill_key,
                        now=now,
                    )
                if selected_binding is None and problem is not None:
                    selected_binding = (returned_id, skill_key, problem, rationale)
            if selected_binding is not None:
                recommendation_id, skill_key, problem, rationale = selected_binding
                _bind_recommended_problem_task(
                    active_connection,
                    user_id=user_id,
                    plan_id=plan["id"],
                    recommendation_id=recommendation_id,
                    skill_key=skill_key,
                    problem=problem,
                    rationale=rationale,
                    scheduled_for=now.date(),
                    now=now,
                    id_factory=self._new_id,
                )
            acknowledgement = PlanDiagnosticAcknowledgement(
                plan_id=plan["id"],
                plan_version=updated_version,
                recommendation_ids=tuple(recommendation_ids),
            )
            return IdempotencyCompletion(
                response_status=200,
                acknowledgement=acknowledgement,
                resource_id=plan["id"],
            )

        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation="plan.run-diagnostic",
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + _IDEMPOTENCY_TTL,
                reward_callback=diagnose,
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
        return _plan_diagnostic_result(record.response_snapshot)

    def update_plan_task(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: UpdatePlanTaskRequest,
    ) -> PlanTaskMutationResult:
        now = self._now()
        with self._engine.begin() as connection:
            plan = _lock_current_plan(connection, user_id=user_id)
            if plan["version"] != payload.plan_version:
                raise _official_plan_conflict()
            task = _lock_official_task(
                connection,
                user_id=user_id,
                plan_id=plan["id"],
                task_id=task_id,
            )
            if task["version"] != payload.task_version:
                raise _official_task_conflict()
            assignments, parameters = _task_update_assignments(payload)
            parameters.update(
                {
                    "task_id": task_id,
                    "user_id": user_id,
                    "plan_id": plan["id"],
                    "expected_version": payload.task_version,
                    "updated_at": now,
                }
            )
            changed = (
                connection.execute(
                    text(
                        f"""
                        UPDATE plan_tasks
                        SET {', '.join(assignments)},
                            version = version + 1,
                            updated_at = :updated_at
                        WHERE id = :task_id
                          AND user_id = :user_id
                          AND plan_id = :plan_id
                          AND version = :expected_version
                        RETURNING {_OFFICIAL_TASK_COLUMNS}
                        """
                    ),
                    parameters,
                )
                .mappings()
                .first()
            )
            if changed is None:
                raise _official_task_conflict()
            changed = dict(changed)
            changed["target_problem_visible"] = _problem_is_visible(
                connection,
                problem_id=changed["target_problem_id"],
            )
            plan_version = _advance_plan_version(
                connection,
                user_id=user_id,
                plan_id=plan["id"],
                expected_version=payload.plan_version,
                updated_at=now,
            )
        return PlanTaskMutationResult(
            plan_version=plan_version,
            task=_official_task_record(changed),
        )

    def complete_plan_task(
        self,
        *,
        user_id: UUID,
        task_id: UUID,
        payload: CompletePlanTaskRequest,
    ) -> PlanTaskMutationResult:
        now = self._now()
        with self._engine.begin() as connection:
            plan = _lock_current_plan(connection, user_id=user_id)
            if plan["version"] != payload.plan_version:
                raise _official_plan_conflict()
            task = _lock_official_task(
                connection,
                user_id=user_id,
                plan_id=plan["id"],
                task_id=task_id,
            )
            if task["target_problem_id"] is not None:
                raise ApiError(
                    status_code=409,
                    code="PLAN_TASK_REQUIRES_TRAINING",
                    message="该任务必须由已确认的训练完成事件更新",
                    retryable=False,
                )
            if task["version"] != payload.task_version or task["status"] != "open":
                raise _official_task_conflict()
            changed = (
                connection.execute(
                    text(
                        f"""
                        UPDATE plan_tasks
                        SET status = 'completed',
                            completed_at = :completed_at,
                            version = version + 1,
                            updated_at = :completed_at
                        WHERE id = :task_id
                          AND user_id = :user_id
                          AND plan_id = :plan_id
                          AND target_problem_id IS NULL
                          AND status = 'open'
                          AND version = :expected_version
                        RETURNING {_OFFICIAL_TASK_COLUMNS}
                        """
                    ),
                    {
                        "completed_at": now,
                        "task_id": task_id,
                        "user_id": user_id,
                        "plan_id": plan["id"],
                        "expected_version": payload.task_version,
                    },
                )
                .mappings()
                .first()
            )
            if changed is None:
                raise _official_task_conflict()
            plan_version = _advance_plan_version(
                connection,
                user_id=user_id,
                plan_id=plan["id"],
                expected_version=payload.plan_version,
                updated_at=now,
            )
        return PlanTaskMutationResult(
            plan_version=plan_version,
            task=_official_task_record(changed),
        )

    def _now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("Todo clock must be timezone-aware")
        return value.astimezone(UTC)

    def _new_id(self) -> UUID:
        value = self._id_factory()
        if not isinstance(value, UUID):
            raise ValueError("id_factory must return UUID values")
        return value


def _task_templates(
    role: str,
    weekly_hours: int,
) -> tuple[tuple[str, str, int, str, str], ...]:
    templates = _ROLE_TASKS.get(role, _DEFAULT_ROLE_TASKS)
    limit = 3 if weekly_hours <= 5 else 4 if weekly_hours <= 8 else 5
    return templates[:limit]


def _fingerprint_key(value: SecretStr | str | None) -> bytes | None:
    if value is None:
        return None
    raw = value.get_secret_value() if isinstance(value, SecretStr) else value
    if not isinstance(raw, str) or len(raw) < 32:
        raise ValueError("plan fingerprint secret is invalid")
    return hashlib.sha256(
        b"quantgym:plan-diagnostic:fingerprint-key:v1\x00" + raw.encode("utf-8")
    ).digest()


def _diagnostic_request_fingerprint(
    key: bytes | None,
    *,
    user_id: UUID,
    idempotency_key: IdempotencyKey,
    payload: RunPlanDiagnosticRequest,
) -> str:
    if key is None:
        raise RuntimeError("plan diagnostic fingerprint secret is unavailable")
    canonical = json.dumps(
        {
            "domain": "quantgym:plan.run-diagnostic:v1",
            "idempotencyKeyDigest": idempotency_key.digest,
            "payload": payload.model_dump(mode="json", by_alias=True),
            "resourceId": "current",
            "userId": str(user_id),
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hmac.new(key, canonical, hashlib.sha256).hexdigest()


def _score_diagnostic(
    payload: RunPlanDiagnosticRequest,
) -> tuple[int, dict[str, int]]:
    totals: dict[str, int] = {}
    correct: dict[str, int] = {}
    correct_count = 0
    for selected in payload.answers:
        definition = _DIAGNOSTIC_DEFINITION.get(selected.question_id)
        if definition is None:
            raise _diagnostic_invalid()
        skill_key, allowed_options, expected_option = definition
        if selected.option_id not in allowed_options:
            raise _diagnostic_invalid()
        totals[skill_key] = totals.get(skill_key, 0) + 1
        if selected.option_id == expected_option:
            correct_count += 1
            correct[skill_key] = correct.get(skill_key, 0) + 1
    scores = {
        skill_key: round((correct.get(skill_key, 0) / total) * 100)
        for skill_key, total in totals.items()
    }
    overall = round((correct_count / len(_DIAGNOSTIC_DEFINITION)) * 100)
    return overall, scores


def _recommendation_dedupe_key(
    *,
    plan_id: UUID,
    skill_key: str,
) -> str:
    encoded = json.dumps(
        {
            "algorithmVersion": "baseline-v1",
            "kind": "skill",
            "planId": str(plan_id),
            "skillKey": skill_key,
        },
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def _select_recommended_problem(connection: Any, *, skill_key: str) -> Any | None:
    categories = _SKILL_PROBLEM_CATEGORIES.get(skill_key)
    if not categories:
        return None
    return (
        connection.execute(
            text(
                f"""
                {_LATEST_PREVIEW_SOURCE_CTE}
                SELECT
                    problem.id,
                    problem.difficulty,
                    problem.updated_at
                FROM problems AS problem
                JOIN allowed_sources AS source
                  ON source.id = problem.source_id
                WHERE lower(problem.category) = ANY(
                    CAST(:categories AS text[])
                )
                ORDER BY problem.updated_at DESC, problem.id ASC
                LIMIT 1
                """
            ),
            {"categories": list(categories)},
        )
        .mappings()
        .first()
    )


def _problem_is_visible(connection: Any, *, problem_id: UUID | None) -> bool:
    if problem_id is None:
        return True
    return bool(
        connection.execute(
            text(
                f"""
                {_LATEST_PREVIEW_SOURCE_CTE}
                SELECT EXISTS (
                    SELECT 1
                    FROM problems AS problem
                    JOIN allowed_sources AS source
                      ON source.id = problem.source_id
                    WHERE problem.id = :problem_id
                )
                """
            ),
            {"problem_id": problem_id},
        ).scalar_one()
    )


def _clear_unavailable_recommendation_task(
    connection: Any,
    *,
    user_id: UUID,
    plan_id: UUID,
    recommendation_id: UUID,
    skill_key: str,
    now: datetime,
) -> None:
    connection.execute(
        text(
            """
            UPDATE plan_tasks
            SET recommendation_id = NULL,
                target_problem_id = NULL,
                title = :title,
                detail = :detail,
                estimated_minutes = 30,
                action_target = 'problems',
                skill_key = :skill_key,
                version = version + 1,
                updated_at = :now
            WHERE user_id = :user_id
              AND plan_id = :plan_id
              AND status = 'open'
              AND recommendation_id = :recommendation_id
              AND NOT EXISTS (
                  SELECT 1
                  FROM training_sessions AS session
                  WHERE session.plan_task_id = plan_tasks.id
                    AND session.user_id = :user_id
                    AND session.status = 'active'
              )
            """
        ),
        {
            "title": f"{skill_key} 针对性训练",
            "detail": f"完成一组 {skill_key} 针对性练习并记录复盘。",
            "skill_key": skill_key,
            "now": now,
            "user_id": user_id,
            "plan_id": plan_id,
            "recommendation_id": recommendation_id,
        },
    )


def _bind_recommended_problem_task(
    connection: Any,
    *,
    user_id: UUID,
    plan_id: UUID,
    recommendation_id: UUID,
    skill_key: str,
    problem: Any,
    rationale: str,
    scheduled_for: date,
    now: datetime,
    id_factory: Callable[[], UUID],
) -> UUID:
    connection.execute(
        text(
            """
            UPDATE plan_tasks
            SET recommendation_id = NULL,
                version = version + 1,
                updated_at = :now
            WHERE user_id = :user_id
              AND plan_id = :plan_id
              AND status = 'open'
              AND recommendation_id = :recommendation_id
              AND target_problem_id IS DISTINCT FROM :problem_id
              AND EXISTS (
                  SELECT 1
                  FROM training_sessions AS session
                  WHERE session.plan_task_id = plan_tasks.id
                    AND session.user_id = :user_id
                    AND session.status = 'active'
                    AND session.problem_id <> :problem_id
              )
            """
        ),
        {
            "user_id": user_id,
            "plan_id": plan_id,
            "recommendation_id": recommendation_id,
            "problem_id": problem["id"],
            "now": now,
        },
    )
    task = (
        connection.execute(
            text(
                """
                SELECT id, version
                FROM plan_tasks
                WHERE user_id = :user_id
                  AND plan_id = :plan_id
                  AND status = 'open'
                  AND action_target = 'problems'
                  AND (
                      recommendation_id IS NULL
                      OR recommendation_id = :recommendation_id
                  )
                  AND NOT EXISTS (
                      SELECT 1
                      FROM training_sessions AS session
                      WHERE session.plan_task_id = plan_tasks.id
                        AND session.user_id = :user_id
                        AND session.status = 'active'
                        AND session.problem_id <> :problem_id
                  )
                ORDER BY
                    CASE WHEN recommendation_id = :recommendation_id THEN 0 ELSE 1 END,
                    scheduled_for ASC NULLS LAST,
                    sort_order ASC,
                    created_at ASC,
                    id ASC
                LIMIT 1
                FOR UPDATE
                """
            ),
            {
                "user_id": user_id,
                "plan_id": plan_id,
                "recommendation_id": recommendation_id,
                "problem_id": problem["id"],
            },
        )
        .mappings()
        .first()
    )
    estimated_minutes = {
        "Easy": 20,
        "Medium": 30,
        "Hard": 45,
    }.get(problem["difficulty"], 30)
    if task is not None:
        changed = connection.execute(
            text(
                """
                UPDATE plan_tasks
                SET recommendation_id = :recommendation_id,
                    target_problem_id = :problem_id,
                    title = :title,
                    detail = :detail,
                    scheduled_for = :scheduled_for,
                    estimated_minutes = :estimated_minutes,
                    action_target = 'problems',
                    skill_key = :skill_key,
                    version = version + 1,
                    updated_at = :now
                WHERE id = :task_id
                  AND user_id = :user_id
                  AND plan_id = :plan_id
                  AND status = 'open'
                  AND version = :expected_version
                  AND NOT EXISTS (
                      SELECT 1
                      FROM training_sessions AS session
                      WHERE session.plan_task_id = plan_tasks.id
                        AND session.user_id = :user_id
                        AND session.status = 'active'
                        AND session.problem_id <> :problem_id
                  )
                RETURNING id
                """
            ),
            {
                "recommendation_id": recommendation_id,
                "problem_id": problem["id"],
                "title": f"{skill_key} 针对性训练",
                "detail": rationale,
                "scheduled_for": scheduled_for,
                "estimated_minutes": estimated_minutes,
                "skill_key": skill_key,
                "now": now,
                "task_id": task["id"],
                "user_id": user_id,
                "plan_id": plan_id,
                "expected_version": task["version"],
            },
        ).scalar_one_or_none()
        if changed is None:
            raise _official_task_conflict()
        return changed

    task_id = id_factory()
    sort_order = int(
        connection.execute(
            text(
                """
                SELECT COALESCE(max(sort_order), -1) + 1
                FROM plan_tasks
                WHERE user_id = :user_id
                  AND plan_id = :plan_id
                """
            ),
            {"user_id": user_id, "plan_id": plan_id},
        ).scalar_one()
    )
    connection.execute(
        text(
            """
            INSERT INTO plan_tasks
                (id, user_id, title, status, sort_order, version,
                 completed_at, created_at, updated_at, plan_id,
                 recommendation_id, target_problem_id, detail, scheduled_for,
                 estimated_minutes, action_target, skill_key)
            VALUES
                (:id, :user_id, :title, 'open', :sort_order, 1,
                 NULL, :now, :now, :plan_id, :recommendation_id, :problem_id,
                 :detail, :scheduled_for, :estimated_minutes, 'problems',
                 :skill_key)
            """
        ),
        {
            "id": task_id,
            "user_id": user_id,
            "title": f"{skill_key} 针对性训练",
            "sort_order": sort_order,
            "now": now,
            "plan_id": plan_id,
            "recommendation_id": recommendation_id,
            "problem_id": problem["id"],
            "detail": rationale,
            "scheduled_for": scheduled_for,
            "estimated_minutes": estimated_minutes,
            "skill_key": skill_key,
        },
    )
    return task_id


def _lock_current_plan(connection: Any, *, user_id: UUID) -> Any:
    row = (
        connection.execute(
            text(
                f"""
                SELECT {_PLAN_COLUMNS}
                FROM plans
                WHERE user_id = :user_id
                  AND status = 'active'
                FOR UPDATE
                """
            ),
            {"user_id": user_id},
        )
        .mappings()
        .first()
    )
    if row is None:
        raise _official_plan_not_found()
    return row


def _lock_official_task(
    connection: Any,
    *,
    user_id: UUID,
    plan_id: UUID,
    task_id: UUID,
) -> Any:
    row = (
        connection.execute(
            text(
                f"""
                SELECT {_OFFICIAL_TASK_COLUMNS}
                FROM plan_tasks
                WHERE id = :task_id
                  AND user_id = :user_id
                  AND plan_id = :plan_id
                FOR UPDATE
                """
            ),
            {
                "task_id": task_id,
                "user_id": user_id,
                "plan_id": plan_id,
            },
        )
        .mappings()
        .first()
    )
    if row is None:
        raise _official_task_not_found()
    return row


def _task_update_assignments(
    payload: UpdatePlanTaskRequest,
) -> tuple[list[str], dict[str, Any]]:
    allowed = {
        "title": "title",
        "detail": "detail",
        "scheduled_for": "scheduled_for",
        "estimated_minutes": "estimated_minutes",
        "sort_order": "sort_order",
    }
    assignments: list[str] = []
    parameters: dict[str, Any] = {}
    for field_name, column_name in allowed.items():
        if field_name not in payload.model_fields_set:
            continue
        assignments.append(f"{column_name} = :{field_name}")
        parameters[field_name] = getattr(payload, field_name)
    if not assignments:
        raise ValueError("official task update has no editable fields")
    return assignments, parameters


def _advance_plan_version(
    connection: Any,
    *,
    user_id: UUID,
    plan_id: UUID,
    expected_version: int,
    updated_at: datetime,
) -> int:
    version = connection.execute(
        text(
            """
            UPDATE plans
            SET version = version + 1,
                updated_at = :updated_at
            WHERE id = :plan_id
              AND user_id = :user_id
              AND status = 'active'
              AND version = :expected_version
            RETURNING version
            """
        ),
        {
            "updated_at": updated_at,
            "plan_id": plan_id,
            "user_id": user_id,
            "expected_version": expected_version,
        },
    ).scalar_one_or_none()
    if version is None:
        raise _official_plan_conflict()
    return version


def _plan_record(row: Any) -> PlanRecord:
    return PlanRecord(
        id=row["id"],
        user_id=row["user_id"],
        track=row["track"],
        role=row["role"],
        season=row["season"],
        weekly_hours=row["weekly_hours"],
        diagnostic_status=row["diagnostic_status"],
        diagnostic_score=row["diagnostic_score"],
        diagnostic_scores=row["diagnostic_scores"],
        status=row["status"],
        version=row["version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _official_task_record(row: Any) -> PlanTaskRecord:
    stored_problem_id = row["target_problem_id"]
    problem_visible = bool(row.get("target_problem_visible", stored_problem_id is None))
    public_problem_id = stored_problem_id if problem_visible else None
    public_title = row["title"]
    if stored_problem_id is not None and not problem_visible:
        public_title = f"{row['skill_key'] or '计划'} 针对性训练"
    return PlanTaskRecord(
        id=row["id"],
        user_id=row["user_id"],
        title=public_title,
        status=row["status"],
        sort_order=row["sort_order"],
        version=row["version"],
        completed_at=row["completed_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
        plan_id=row["plan_id"],
        recommendation_id=row["recommendation_id"],
        target_problem_id=public_problem_id,
        detail=row["detail"],
        scheduled_for=row["scheduled_for"],
        estimated_minutes=row["estimated_minutes"],
        action_target=row["action_target"],
        skill_key=row["skill_key"],
    )


def _recommendation_record(row: Any) -> RecommendationRecord:
    stored_problem_id = row["problem_id"]
    problem_visible = bool(row.get("problem_visible", stored_problem_id is None))
    return RecommendationRecord(
        id=row["id"],
        user_id=row["user_id"],
        plan_id=row["plan_id"],
        problem_id=stored_problem_id if problem_visible else None,
        kind=row["kind"],
        skill_key=row["skill_key"],
        rationale=row["rationale"],
        provenance_type=row["provenance_type"],
        provenance_resource_id=row["provenance_resource_id"],
        dedupe_key=row["dedupe_key"].rstrip(),
        rank=row["rank"],
        status=row["status"],
        version=row["version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _snapshot(value: Any) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RuntimeError("persisted plan acknowledgement is unavailable")
    return value


def _snapshot_uuid(snapshot: Mapping[str, Any], key: str) -> UUID:
    try:
        value = UUID(str(snapshot[key]))
    except (KeyError, TypeError, ValueError):
        raise RuntimeError("persisted plan acknowledgement is invalid") from None
    if str(value) != snapshot[key]:
        raise RuntimeError("persisted plan acknowledgement is invalid")
    return value


def _snapshot_version(snapshot: Mapping[str, Any], key: str) -> int:
    value = snapshot.get(key)
    if not isinstance(value, int) or isinstance(value, bool) or value < 1:
        raise RuntimeError("persisted plan acknowledgement is invalid")
    return value


def _snapshot_uuid_tuple(snapshot: Mapping[str, Any], key: str) -> tuple[UUID, ...]:
    values = snapshot.get(key)
    if not isinstance(values, list):
        raise RuntimeError("persisted plan acknowledgement is invalid")
    return tuple(_snapshot_uuid({"value": value}, "value") for value in values)


def _plan_creation_result(value: Any) -> PlanCreationResult:
    snapshot = _snapshot(value)
    return PlanCreationResult(
        plan_id=_snapshot_uuid(snapshot, "planId"),
        plan_version=_snapshot_version(snapshot, "planVersion"),
        task_ids=_snapshot_uuid_tuple(snapshot, "taskIds"),
    )


def _plan_diagnostic_result(value: Any) -> PlanDiagnosticResult:
    snapshot = _snapshot(value)
    return PlanDiagnosticResult(
        plan_id=_snapshot_uuid(snapshot, "planId"),
        plan_version=_snapshot_version(snapshot, "planVersion"),
        recommendation_ids=_snapshot_uuid_tuple(snapshot, "recommendationIds"),
    )


def _reserve(
    connection: Any,
    *,
    user_id: UUID,
    event_type: str,
    key: IdempotencyKey,
    fingerprint: str,
    resource_id: UUID,
    request_id: str,
    now: datetime,
    id_factory: Callable[[], UUID],
) -> _Reservation:
    audit_id = id_factory()
    details = {
        "requestHash": fingerprint,
        "resourceId": str(resource_id),
        "resultVersion": None,
    }
    inserted = (
        connection.execute(
            text(
                """
            INSERT INTO audit_events
                (id, user_id, event_type, idempotency_key_hash,
                 request_id, details, created_at)
            VALUES
                (:id, :user_id, :event_type, :key_hash,
                 :request_id, CAST(:details AS jsonb), :created_at)
            ON CONFLICT (user_id, event_type, idempotency_key_hash)
                WHERE idempotency_key_hash IS NOT NULL
            DO NOTHING
            RETURNING id, details
            """
            ),
            {
                "id": audit_id,
                "user_id": user_id,
                "event_type": event_type,
                "key_hash": key.digest,
                "request_id": request_id,
                "details": json.dumps(details, separators=(",", ":"), sort_keys=True),
                "created_at": now,
            },
        )
        .mappings()
        .first()
    )
    if inserted is not None:
        return _Reservation(audit_id=inserted["id"], acquired=True, details=details)

    existing = (
        connection.execute(
            text(
                """
            SELECT id, details
            FROM audit_events
            WHERE user_id = :user_id
              AND event_type = :event_type
              AND idempotency_key_hash = :key_hash
            """
            ),
            {
                "user_id": user_id,
                "event_type": event_type,
                "key_hash": key.digest,
            },
        )
        .mappings()
        .one()
    )
    existing_details = dict(existing["details"])
    if existing_details.get("requestHash") != fingerprint:
        raise ApiError(
            status_code=409,
            code="IDEMPOTENCY_KEY_REUSED",
            message="此幂等键已用于不同操作",
            field_errors={"idempotencyKey": ["请为新操作生成新的幂等键"]},
            retryable=False,
        )
    return _Reservation(
        audit_id=existing["id"],
        acquired=False,
        details=existing_details,
    )


def _finish_reservation(
    connection: Any,
    reservation: _Reservation,
    *,
    fingerprint: str,
    resource_id: UUID,
    result_version: int,
) -> None:
    details = {
        "requestHash": fingerprint,
        "resourceId": str(resource_id),
        "resultVersion": result_version,
    }
    connection.execute(
        text(
            """
            UPDATE audit_events
            SET details = CAST(:details AS jsonb)
            WHERE id = :audit_id
            """
        ),
        {
            "audit_id": reservation.audit_id,
            "details": json.dumps(details, separators=(",", ":"), sort_keys=True),
        },
    )


def _replay_task(
    connection: Any,
    user_id: UUID,
    reservation: _Reservation,
) -> PlanTaskRecord:
    try:
        task_id = UUID(str(reservation.details["resourceId"]))
        result_version = reservation.details["resultVersion"]
        if (
            not isinstance(result_version, int)
            or isinstance(result_version, bool)
            or result_version < 1
        ):
            raise ValueError
    except (KeyError, TypeError, ValueError):
        raise _replay_unavailable() from None
    row = _select_task(connection, user_id, task_id)
    if row is None or row["version"] != result_version:
        raise _replay_unavailable()
    return _record(row)


def _select_task(connection: Any, user_id: UUID, task_id: UUID) -> Any:
    return (
        connection.execute(
            text(
                f"""
            SELECT {_TASK_COLUMNS}
            FROM plan_tasks
            WHERE id = :task_id
              AND user_id = :user_id
              AND plan_id IS NULL
            """
            ),
            {"task_id": task_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )


def _raise_task_write_failure(
    connection: Any,
    user_id: UUID,
    task_id: UUID,
) -> None:
    if _select_task(connection, user_id, task_id) is None:
        raise _not_found()
    raise _conflict()


def _record(row: Any) -> PlanTaskRecord:
    return PlanTaskRecord(
        id=row["id"],
        user_id=row["user_id"],
        title=row["title"],
        status=row["status"],
        sort_order=row["sort_order"],
        version=row["version"],
        completed_at=row["completed_at"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _not_found() -> ApiError:
    return ApiError(
        status_code=404,
        code="TODO_NOT_FOUND",
        message="待办任务不存在",
        retryable=False,
    )


def _conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="TODO_CONFLICT",
        message="待办任务已在其他位置更新",
        field_errors={"version": ["版本已过期，请载入最新任务"]},
        retryable=False,
    )


def _replay_unavailable() -> ApiError:
    return ApiError(
        status_code=409,
        code="TODO_REPLAY_UNAVAILABLE",
        message="原操作已确认，但任务的当前状态不可用",
        retryable=False,
    )


def apply_training_plan_effect(
    connection: Any,
    *,
    user_id: UUID,
    plan_task_id: UUID | None,
    problem_id: UUID,
    completed_at: datetime,
) -> PlanEffectAcknowledgement | None:
    """Apply one server-confirmed training completion on the caller transaction.

    This helper deliberately does not begin or commit.  The training completion
    boundary owns the surrounding event, XP, notification, and idempotency
    transaction.
    """

    if plan_task_id is None:
        return None
    if not isinstance(completed_at, datetime):
        raise ValueError("completed_at must be a datetime")
    if completed_at.tzinfo is None or completed_at.utcoffset() is None:
        raise ValueError("completed_at must be timezone-aware")

    task_reference = (
        connection.execute(
            text(
                """
                SELECT plan_id
                FROM plan_tasks
                WHERE id = :task_id
                  AND user_id = :user_id
                  AND plan_id IS NOT NULL
                """
            ),
            {"task_id": plan_task_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )
    if task_reference is None:
        raise _official_task_not_found()
    plan_id = task_reference["plan_id"]

    plan = (
        connection.execute(
            text(
                """
                SELECT id, version
                FROM plans
                WHERE id = :plan_id
                  AND user_id = :user_id
                  AND status = 'active'
                FOR UPDATE
                """
            ),
            {"plan_id": plan_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )
    if plan is None:
        raise _official_task_not_found()

    task = (
        connection.execute(
            text(
                """
                SELECT id, status, target_problem_id
                FROM plan_tasks
                WHERE id = :task_id
                  AND user_id = :user_id
                  AND plan_id = :plan_id
                FOR UPDATE
                """
            ),
            {
                "task_id": plan_task_id,
                "user_id": user_id,
                "plan_id": plan_id,
            },
        )
        .mappings()
        .first()
    )
    if task is None:
        raise _official_task_not_found()
    if task["target_problem_id"] != problem_id:
        raise ApiError(
            status_code=409,
            code="PLAN_TASK_TRAINING_MISMATCH",
            message="训练记录与计划任务不匹配",
            retryable=False,
        )
    if task["status"] == "completed":
        return PlanEffectAcknowledgement(
            task_completed=False,
            plan_version=plan["version"],
        )
    if task["status"] != "open":
        raise _official_task_conflict()

    changed = connection.execute(
        text(
            """
            UPDATE plan_tasks
            SET status = 'completed',
                completed_at = :completed_at,
                version = version + 1,
                updated_at = :completed_at
            WHERE id = :task_id
              AND user_id = :user_id
              AND plan_id = :plan_id
              AND status = 'open'
            RETURNING id
            """
        ),
        {
            "completed_at": completed_at,
            "task_id": plan_task_id,
            "user_id": user_id,
            "plan_id": plan_id,
        },
    ).first()
    if changed is None:
        raise _official_task_conflict()

    plan_version = connection.execute(
        text(
            """
            UPDATE plans
            SET version = version + 1,
                updated_at = :completed_at
            WHERE id = :plan_id
              AND user_id = :user_id
              AND version = :expected_version
            RETURNING version
            """
        ),
        {
            "completed_at": completed_at,
            "plan_id": plan_id,
            "user_id": user_id,
            "expected_version": plan["version"],
        },
    ).scalar_one_or_none()
    if plan_version is None:
        raise _official_plan_conflict()
    return PlanEffectAcknowledgement(
        task_completed=True,
        plan_version=plan_version,
    )


def _official_task_not_found() -> ApiError:
    return ApiError(
        status_code=404,
        code="PLAN_TASK_NOT_FOUND",
        message="计划任务不存在",
        retryable=False,
    )


def _official_plan_not_found() -> ApiError:
    return ApiError(
        status_code=404,
        code="PLAN_NOT_FOUND",
        message="当前计划不存在",
        retryable=False,
    )


def _official_task_conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="PLAN_TASK_CONFLICT",
        message="计划任务已在其他位置更新",
        field_errors={"taskVersion": ["任务版本已过期，请载入最新计划"]},
        retryable=False,
    )


def _official_plan_conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="PLAN_CONFLICT",
        message="计划已在其他位置更新",
        field_errors={"planVersion": ["计划版本已过期，请载入最新计划"]},
        retryable=False,
    )


def _diagnostic_invalid() -> ApiError:
    return ApiError(
        status_code=422,
        code="PLAN_DIAGNOSTIC_INVALID",
        message="Baseline 测评答案无效",
        field_errors={"answers": ["请重新载入测评题目后提交"]},
        retryable=False,
    )
