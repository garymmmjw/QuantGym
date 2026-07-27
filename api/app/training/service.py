"""Transactional daily-training service and single-reward completion boundary."""

from __future__ import annotations

import hashlib
import hmac
import json
from collections.abc import Callable, Mapping
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID, uuid4

from sqlalchemy import text
from pydantic import SecretStr

from ..errors import ApiError
from ..idempotency import IdempotencyKey, request_fingerprint
from ..idempotency_records import (
    IdempotencyCompletion,
    PlanEffectAcknowledgement,
    ProblemCompletionAcknowledgement,
    TrainingAttemptAcknowledgement,
    TrainingHintAcknowledgement,
    TrainingSessionAcknowledgement,
    TrainingSolutionAcknowledgement,
    execute_idempotent_operation,
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


@dataclass(frozen=True, slots=True)
class StartTrainingResult:
    session_id: UUID
    problem_id: UUID
    session_version: int
    resumed: bool


@dataclass(frozen=True, slots=True)
class TrainingEventResult:
    session_id: UUID
    session_version: int
    event_id: UUID
    event_sequence: int


@dataclass(frozen=True, slots=True, repr=False)
class HintUseResult:
    session_id: UUID
    session_version: int
    event_id: UUID
    event_sequence: int
    hint_zh: str | None
    hint_en: str | None

    def __repr__(self) -> str:
        return (
            "HintUseResult("
            f"session_id={self.session_id!r}, session_version={self.session_version!r}, "
            f"event_id={self.event_id!r}, event_sequence={self.event_sequence!r}, "
            "hint_zh='[REDACTED]', hint_en='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True)
class AttemptSubmissionResult:
    session_id: UUID
    session_version: int
    attempt_id: UUID
    event_id: UUID
    event_sequence: int
    score: int


@dataclass(frozen=True, slots=True, repr=False)
class SolutionRevealResult:
    session_id: UUID
    session_version: int
    event_id: UUID
    event_sequence: int
    solution_zh: str | None
    solution_en: str | None

    def __repr__(self) -> str:
        return (
            "SolutionRevealResult("
            f"session_id={self.session_id!r}, session_version={self.session_version!r}, "
            f"event_id={self.event_id!r}, event_sequence={self.event_sequence!r}, "
            "solution_zh='[REDACTED]', solution_en='[REDACTED]')"
        )


@dataclass(frozen=True, slots=True)
class CompletionResult:
    session_id: UUID
    session_version: int
    xp_delta: int
    task_completed: bool
    plan_version: int | None


@dataclass(frozen=True, slots=True)
class TrainingResult:
    session_id: UUID
    problem_id: UUID
    session_version: int
    score: int
    xp_delta: int
    completed_at: datetime
    task_completed: bool
    plan_version: int | None


class TrainingService:
    """Own all official training mutations; never reflect answer content."""

    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
        id_factory: Callable[[], UUID] = uuid4,
        completion_hook: Callable[[str, Any], None] | None = None,
        fingerprint_secret: SecretStr | str | None = None,
    ) -> None:
        self._engine = engine
        self._clock = clock
        self._id_factory = id_factory
        self._completion_hook = completion_hook
        self._attempt_fingerprint_key = _attempt_fingerprint_key(fingerprint_secret)

    def start_or_resume(
        self,
        *,
        user_id: UUID,
        problem_id: UUID,
        plan_task_id: UUID | None,
        idempotency_key: IdempotencyKey,
    ) -> StartTrainingResult:
        now = self._now()
        request_hash = request_fingerprint(
            event_type="training.start-or-resume",
            resource_id=str(problem_id),
            payload={
                "planTaskId": None if plan_task_id is None else str(plan_task_id),
            },
        )
        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation="training.start-or-resume",
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + timedelta(hours=24),
                reward_callback=lambda active_connection: self._start_or_resume(
                    active_connection,
                    user_id=user_id,
                    problem_id=problem_id,
                    plan_task_id=plan_task_id,
                    now=now,
                ),
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
        snapshot = _snapshot(record.response_snapshot)
        return StartTrainingResult(
            session_id=_snapshot_uuid(snapshot, "sessionId"),
            problem_id=_snapshot_uuid(snapshot, "problemId"),
            session_version=_snapshot_int(snapshot, "sessionVersion"),
            resumed=_snapshot_bool(snapshot, "resumed"),
        )

    def use_hint(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        idempotency_key: IdempotencyKey,
    ) -> HintUseResult:
        now = self._now()
        request_hash = request_fingerprint(
            event_type=TrainingHintAcknowledgement.operation,
            resource_id=str(session_id),
            payload={"version": expected_version},
        )
        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation=TrainingHintAcknowledgement.operation,
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + timedelta(hours=24),
                reward_callback=lambda active_connection: self._use_hint(
                    active_connection,
                    user_id=user_id,
                    session_id=session_id,
                    expected_version=expected_version,
                    now=now,
                ),
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
            event = _training_event_from_snapshot(record.response_snapshot)
            content = self._read_authorized_content(
                connection,
                user_id=user_id,
                session_id=session_id,
            )
        return HintUseResult(
            session_id=event.session_id,
            session_version=event.session_version,
            event_id=event.event_id,
            event_sequence=event.event_sequence,
            hint_zh=content["hint_zh"],
            hint_en=content["hint_en"],
        )

    def submit_attempt(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        answer_kind: str,
        answer: str,
        idempotency_key: IdempotencyKey,
    ) -> AttemptSubmissionResult:
        now = self._now()
        private_answer = _private_answer(answer)
        if answer_kind not in {"text", "code", "multiple_choice"}:
            raise ValueError("answer_kind is invalid")
        answer_sha256 = hashlib.sha256(private_answer.encode("utf-8")).hexdigest()
        request_hash = _attempt_request_fingerprint(
            self._attempt_fingerprint_key,
            user_id=user_id,
            idempotency_key=idempotency_key,
            session_id=session_id,
            expected_version=expected_version,
            answer_kind=answer_kind,
            private_answer=private_answer,
        )
        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation=TrainingAttemptAcknowledgement.operation,
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + timedelta(hours=24),
                reward_callback=lambda active_connection: self._submit_attempt(
                    active_connection,
                    user_id=user_id,
                    session_id=session_id,
                    expected_version=expected_version,
                    answer_kind=answer_kind,
                    private_answer=private_answer,
                    answer_sha256=answer_sha256,
                    now=now,
                ),
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
        return _attempt_from_snapshot(record.response_snapshot)

    def reveal_solution(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        idempotency_key: IdempotencyKey,
    ) -> SolutionRevealResult:
        now = self._now()
        request_hash = request_fingerprint(
            event_type=TrainingSolutionAcknowledgement.operation,
            resource_id=str(session_id),
            payload={"version": expected_version},
        )
        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation=TrainingSolutionAcknowledgement.operation,
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + timedelta(hours=24),
                reward_callback=lambda active_connection: self._reveal_solution(
                    active_connection,
                    user_id=user_id,
                    session_id=session_id,
                    expected_version=expected_version,
                    now=now,
                ),
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
            event = _training_event_from_snapshot(record.response_snapshot)
            content = self._read_authorized_content(
                connection,
                user_id=user_id,
                session_id=session_id,
            )
        return SolutionRevealResult(
            session_id=event.session_id,
            session_version=event.session_version,
            event_id=event.event_id,
            event_sequence=event.event_sequence,
            solution_zh=content["solution_zh"],
            solution_en=content["solution_en"],
        )

    def complete(
        self,
        *,
        user_id: UUID,
        session_id: UUID,
        attempt_id: UUID,
        expected_version: int,
        idempotency_key: IdempotencyKey,
    ) -> CompletionResult:
        now = self._now()
        request_hash = request_fingerprint(
            event_type="problems.complete",
            resource_id=str(session_id),
            payload={
                "attemptId": str(attempt_id),
                "version": expected_version,
            },
        )
        with self._engine.begin() as connection:
            record = execute_idempotent_operation(
                connection,
                user_id=user_id,
                operation="problems.complete",
                key=idempotency_key,
                request_hash=request_hash,
                now=now,
                expires_at=now + timedelta(hours=24),
                reward_callback=lambda active_connection: self._complete(
                    active_connection,
                    user_id=user_id,
                    session_id=session_id,
                    attempt_id=attempt_id,
                    expected_version=expected_version,
                    now=now,
                ),
                completion_clock=lambda: now,
                id_factory=self._id_factory,
            )
        return _completion_from_snapshot(record.response_snapshot)

    def get_result(self, *, user_id: UUID, session_id: UUID) -> TrainingResult:
        with self._engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        """
                        SELECT
                            session.id AS session_id,
                            session.problem_id,
                            session.version AS session_version,
                            session.completed_at,
                            attempt.score,
                            ledger.amount AS xp_delta,
                            CASE
                                WHEN session.plan_task_id IS NOT NULL
                                 AND task.status = 'completed'
                                THEN true ELSE false
                            END AS task_completed,
                            plan.version AS plan_version
                        FROM training_sessions AS session
                        JOIN training_events AS event
                          ON event.training_session_id = session.id
                         AND event.event_type = 'completed'
                         AND event.user_id = :user_id
                         AND event.problem_id = session.problem_id
                        JOIN attempts AS attempt
                          ON attempt.id = event.attempt_id
                         AND attempt.user_id = :user_id
                         AND attempt.training_session_id = session.id
                         AND attempt.problem_id = session.problem_id
                        JOIN xp_ledger AS ledger
                          ON ledger.training_event_id = event.id
                         AND ledger.user_id = :user_id
                         AND ledger.training_session_id = session.id
                         AND ledger.problem_id = session.problem_id
                        LEFT JOIN plan_tasks AS task
                          ON task.id = session.plan_task_id
                         AND task.user_id = :user_id
                        LEFT JOIN plans AS plan
                          ON plan.id = task.plan_id
                         AND plan.user_id = :user_id
                        WHERE session.id = :session_id
                          AND session.user_id = :user_id
                          AND session.status = 'completed'
                        """
                    ),
                    {"session_id": session_id, "user_id": user_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            raise ApiError(
                status_code=404,
                code="TRAINING_RESULT_NOT_FOUND",
                message="训练结果不存在",
                retryable=False,
            )
        return TrainingResult(
            session_id=row["session_id"],
            problem_id=row["problem_id"],
            session_version=int(row["session_version"]),
            score=int(row["score"]),
            xp_delta=int(row["xp_delta"]),
            completed_at=row["completed_at"],
            task_completed=bool(row["task_completed"]),
            plan_version=(
                None if row["plan_version"] is None else int(row["plan_version"])
            ),
        )

    def _start_or_resume(
        self,
        connection: Any,
        *,
        user_id: UUID,
        problem_id: UUID,
        plan_task_id: UUID | None,
        now: datetime,
    ) -> IdempotencyCompletion:
        problem_exists = connection.execute(
            text(
                f"""
                {_ALLOWED_SOURCE_CTE}
                SELECT problem.id
                FROM problems AS problem
                JOIN allowed_sources AS source ON source.id = problem.source_id
                WHERE problem.id = :problem_id
                """
            ),
            {"problem_id": problem_id},
        ).first()
        if problem_exists is None:
            raise ApiError(
                status_code=404,
                code="PROBLEM_NOT_FOUND",
                message="题目不存在",
                retryable=False,
            )
        if plan_task_id is not None:
            task_reference = (
                connection.execute(
                    text(
                        """
                        SELECT task.plan_id
                        FROM plan_tasks AS task
                        WHERE task.id = :task_id
                          AND task.user_id = :user_id
                          AND task.plan_id IS NOT NULL
                        """
                    ),
                    {"task_id": plan_task_id, "user_id": user_id},
                )
                .mappings()
                .first()
            )
            if task_reference is None:
                raise ApiError(
                    status_code=404,
                    code="PLAN_TASK_NOT_FOUND",
                    message="训练任务不存在",
                    retryable=False,
                )
            plan_id = task_reference["plan_id"]
            plan = connection.execute(
                text(
                    """
                    SELECT id
                    FROM plans
                    WHERE id = :plan_id
                      AND user_id = :user_id
                      AND status = 'active'
                    FOR SHARE
                    """
                ),
                {"plan_id": plan_id, "user_id": user_id},
            ).first()
            if plan is None:
                raise ApiError(
                    status_code=404,
                    code="PLAN_TASK_NOT_FOUND",
                    message="训练任务不存在",
                    retryable=False,
                )
            task = (
                connection.execute(
                    text(
                        """
                        SELECT task.target_problem_id, task.status
                        FROM plan_tasks AS task
                        WHERE task.id = :task_id
                          AND task.user_id = :user_id
                          AND task.plan_id = :plan_id
                        FOR SHARE
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
                raise ApiError(
                    status_code=404,
                    code="PLAN_TASK_NOT_FOUND",
                    message="训练任务不存在",
                    retryable=False,
                )
            if task["target_problem_id"] != problem_id or task["status"] != "open":
                raise ApiError(
                    status_code=409,
                    code="PLAN_TASK_TRAINING_CONFLICT",
                    message="训练任务与当前题目状态不匹配",
                    retryable=False,
                )

        session_id = self._new_id()
        inserted = (
            connection.execute(
                text(
                    """
                    INSERT INTO training_sessions
                        (id, user_id, problem_id, plan_task_id, status, version,
                         started_at, last_activity_at, created_at, updated_at)
                    VALUES
                        (:id, :user_id, :problem_id, :plan_task_id, 'active', 1,
                         :now, :now, :now, :now)
                    ON CONFLICT (user_id, problem_id) WHERE status = 'active'
                    DO NOTHING
                    RETURNING id, problem_id, version
                    """
                ),
                {
                    "id": session_id,
                    "user_id": user_id,
                    "problem_id": problem_id,
                    "plan_task_id": plan_task_id,
                    "now": now,
                },
            )
            .mappings()
            .first()
        )
        resumed = inserted is None
        if inserted is None:
            inserted = (
                connection.execute(
                    text(
                        """
                        SELECT id, problem_id, plan_task_id, version
                        FROM training_sessions
                        WHERE user_id = :user_id
                          AND problem_id = :problem_id
                          AND status = 'active'
                        """
                    ),
                    {"user_id": user_id, "problem_id": problem_id},
                )
                .mappings()
                .one()
            )
            if inserted["plan_task_id"] != plan_task_id:
                raise ApiError(
                    status_code=409,
                    code="TRAINING_SESSION_PLAN_CONFLICT",
                    message="已有训练会话绑定了不同的计划任务",
                    retryable=False,
                )
        else:
            self._upsert_progress(
                connection,
                session={
                    "user_id": user_id,
                    "problem_id": problem_id,
                },
                now=now,
            )
        acknowledgement = TrainingSessionAcknowledgement(
            session_id=inserted["id"],
            problem_id=inserted["problem_id"],
            session_version=int(inserted["version"]),
            resumed=resumed,
        )
        return IdempotencyCompletion(
            response_status=201,
            acknowledgement=acknowledgement,
            resource_id=inserted["id"],
        )

    def _complete(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        attempt_id: UUID,
        expected_version: int,
        now: datetime,
    ) -> IdempotencyCompletion:
        plan_reference = (
            connection.execute(
                text(
                    """
                    SELECT session.plan_task_id, task.plan_id
                    FROM training_sessions AS session
                    LEFT JOIN plan_tasks AS task
                      ON task.id = session.plan_task_id
                     AND task.user_id = :user_id
                    WHERE session.id = :session_id
                      AND session.user_id = :user_id
                    """
                ),
                {"session_id": session_id, "user_id": user_id},
            )
            .mappings()
            .first()
        )
        locked_plan_id: UUID | None = None
        if plan_reference is not None and plan_reference["plan_task_id"] is not None:
            referenced_plan_id = plan_reference["plan_id"]
            if referenced_plan_id is not None:
                locked_plan = connection.execute(
                    text(
                        """
                        SELECT id
                        FROM plans
                        WHERE id = :plan_id
                          AND user_id = :user_id
                          AND status = 'active'
                        FOR UPDATE
                        """
                    ),
                    {"plan_id": referenced_plan_id, "user_id": user_id},
                ).first()
                if locked_plan is not None:
                    locked_plan_id = referenced_plan_id
        session = self._lock_session(
            connection,
            user_id=user_id,
            session_id=session_id,
            expected_version=expected_version,
        )
        if session["plan_task_id"] is not None:
            if (
                plan_reference is None
                or plan_reference["plan_task_id"] != session["plan_task_id"]
            ):
                raise ApiError(
                    status_code=409,
                    code="TRAINING_SESSION_PLAN_CONFLICT",
                    message="训练会话的计划任务已发生变化",
                    retryable=False,
                )
            if locked_plan_id is None:
                raise ApiError(
                    status_code=404,
                    code="PLAN_TASK_NOT_FOUND",
                    message="训练任务不存在",
                    retryable=False,
                )
            locked_task = (
                connection.execute(
                    text(
                        """
                        SELECT target_problem_id
                        FROM plan_tasks
                        WHERE id = :task_id
                          AND user_id = :user_id
                          AND plan_id = :plan_id
                        FOR UPDATE
                        """
                    ),
                    {
                        "task_id": session["plan_task_id"],
                        "user_id": user_id,
                        "plan_id": locked_plan_id,
                    },
                )
                .mappings()
                .first()
            )
            if locked_task is None:
                raise ApiError(
                    status_code=404,
                    code="PLAN_TASK_NOT_FOUND",
                    message="训练任务不存在",
                    retryable=False,
                )
            if locked_task["target_problem_id"] != session["problem_id"]:
                raise ApiError(
                    status_code=409,
                    code="PLAN_TASK_TRAINING_MISMATCH",
                    message="训练记录与计划任务不匹配",
                    retryable=False,
                )
        self._hook("after_session_lock", connection)
        attempt = (
            connection.execute(
                text(
                    """
                    SELECT
                        attempt.id,
                        attempt.sequence,
                        attempt.score,
                        answer.body,
                        answer.body_sha256
                    FROM attempts AS attempt
                    JOIN answers AS answer ON answer.attempt_id = attempt.id
                    WHERE attempt.id = :attempt_id
                      AND attempt.user_id = :user_id
                      AND attempt.training_session_id = :session_id
                      AND attempt.problem_id = :problem_id
                      AND attempt.status = 'evaluated'
                    FOR UPDATE OF attempt
                    """
                ),
                {
                    "attempt_id": attempt_id,
                    "user_id": user_id,
                    "session_id": session_id,
                    "problem_id": session["problem_id"],
                },
            )
            .mappings()
            .first()
        )
        if attempt is None:
            raise ApiError(
                status_code=409,
                code="TRAINING_ATTEMPT_INVALID",
                message="请选择当前训练中已评估的作答",
                retryable=False,
            )
        body = attempt["body"]
        digest = hashlib.sha256(body.encode("utf-8")).hexdigest()
        if not body.strip() or digest != attempt["body_sha256"]:
            raise ApiError(
                status_code=409,
                code="TRAINING_ANSWER_INVALID",
                message="已保存的作答无法通过完整性校验",
                retryable=False,
            )
        session_version = int(
            connection.execute(
                text(
                    """
                    UPDATE training_sessions
                    SET status = 'completed',
                        version = version + 1,
                        completed_at = :now,
                        last_activity_at = :now,
                        updated_at = :now
                    WHERE id = :session_id
                      AND user_id = :user_id
                      AND status = 'active'
                      AND version = :expected_version
                    RETURNING version
                    """
                ),
                {
                    "session_id": session_id,
                    "user_id": user_id,
                    "expected_version": expected_version,
                    "now": now,
                },
            ).scalar_one()
        )
        xp_delta = {"Easy": 10, "Medium": 20, "Hard": 30}[session["difficulty"]]
        event_id, _event_sequence = self._append_event(
            connection,
            session=session,
            event_type="completed",
            attempt_id=attempt_id,
            payload={
                "attemptSequence": int(attempt["sequence"]),
                "score": int(attempt["score"]),
                "xpDelta": xp_delta,
            },
            now=now,
        )
        self._upsert_progress(
            connection,
            session=session,
            now=now,
            completed=True,
            score=int(attempt["score"]),
        )
        ledger_id = self._new_id()
        connection.execute(
            text(
                """
                INSERT INTO xp_ledger
                    (id, user_id, training_event_id, training_session_id,
                     problem_id, skill_key, amount, reason, occurred_at,
                     created_at)
                VALUES
                    (:id, :user_id, :event_id, :session_id, :problem_id,
                     :skill_key, :amount, 'problem_completion', :now, :now)
                """
            ),
            {
                "id": ledger_id,
                "user_id": user_id,
                "event_id": event_id,
                "session_id": session_id,
                "problem_id": session["problem_id"],
                "skill_key": session["category"],
                "amount": xp_delta,
                "now": now,
            },
        )
        self._hook("after_xp", connection)
        plan_effect = _apply_training_plan_effect(
            connection,
            user_id=user_id,
            plan_task_id=session["plan_task_id"],
            problem_id=session["problem_id"],
            completed_at=now,
        )
        self._insert_completion_notification(
            connection,
            user_id=user_id,
            session_id=session_id,
            xp_delta=xp_delta,
            now=now,
        )
        acknowledgement = ProblemCompletionAcknowledgement(
            session_id=session_id,
            session_version=session_version,
            xp_delta=xp_delta,
            plan_effect=plan_effect,
        )
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=acknowledgement,
            resource_id=session_id,
        )

    def _use_hint(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        now: datetime,
    ) -> IdempotencyCompletion:
        session = self._lock_session(
            connection,
            user_id=user_id,
            session_id=session_id,
            expected_version=expected_version,
        )
        event_id, event_sequence = self._append_event(
            connection,
            session=session,
            event_type="hint_used",
            attempt_id=None,
            payload={},
            now=now,
        )
        session_version = self._advance_session(connection, session=session, now=now)
        self._upsert_progress(
            connection,
            session=session,
            now=now,
            hint_delta=1,
        )
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=TrainingHintAcknowledgement(
                session_id=session_id,
                session_version=session_version,
                event_id=event_id,
                event_sequence=event_sequence,
            ),
            resource_id=session_id,
        )

    def _submit_attempt(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        answer_kind: str,
        private_answer: str,
        answer_sha256: str,
        now: datetime,
    ) -> IdempotencyCompletion:
        session = self._lock_session(
            connection,
            user_id=user_id,
            session_id=session_id,
            expected_version=expected_version,
        )
        attempt_sequence = int(
            connection.execute(
                text(
                    """
                    SELECT COALESCE(max(sequence), 0) + 1
                    FROM attempts
                    WHERE training_session_id = :session_id
                    """
                ),
                {"session_id": session_id},
            ).scalar_one()
        )
        attempt_id = self._new_id()
        answer_id = self._new_id()
        score = 100
        connection.execute(
            text(
                """
                INSERT INTO attempts
                    (id, user_id, training_session_id, problem_id, sequence,
                     status, score, evaluation, submitted_at, evaluated_at,
                     created_at)
                VALUES
                    (:id, :user_id, :session_id, :problem_id, :sequence,
                     'evaluated', :score, 'recorded', :now, :now, :now)
                """
            ),
            {
                "id": attempt_id,
                "user_id": user_id,
                "session_id": session_id,
                "problem_id": session["problem_id"],
                "sequence": attempt_sequence,
                "score": score,
                "now": now,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO answers
                    (id, user_id, attempt_id, kind, body, body_sha256, created_at)
                VALUES
                    (:id, :user_id, :attempt_id, :kind, :body,
                     :body_sha256, :created_at)
                """
            ),
            {
                "id": answer_id,
                "user_id": user_id,
                "attempt_id": attempt_id,
                "kind": answer_kind,
                "body": private_answer,
                "body_sha256": answer_sha256,
                "created_at": now,
            },
        )
        event_id, event_sequence = self._append_event(
            connection,
            session=session,
            event_type="attempt_submitted",
            attempt_id=attempt_id,
            payload={
                "attemptId": str(attempt_id),
                "attemptSequence": attempt_sequence,
                "score": score,
            },
            now=now,
        )
        session_version = self._advance_session(connection, session=session, now=now)
        self._upsert_progress(
            connection,
            session=session,
            now=now,
            attempt_delta=1,
            score=score,
        )
        return IdempotencyCompletion(
            response_status=201,
            acknowledgement=TrainingAttemptAcknowledgement(
                session_id=session_id,
                session_version=session_version,
                attempt_id=attempt_id,
                event_id=event_id,
                event_sequence=event_sequence,
                score=score,
            ),
            resource_id=attempt_id,
        )

    def _reveal_solution(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
        now: datetime,
    ) -> IdempotencyCompletion:
        session = self._lock_session(
            connection,
            user_id=user_id,
            session_id=session_id,
            expected_version=expected_version,
        )
        event_id, event_sequence = self._append_event(
            connection,
            session=session,
            event_type="solution_revealed",
            attempt_id=None,
            payload={},
            now=now,
        )
        session_version = self._advance_session(connection, session=session, now=now)
        self._upsert_progress(
            connection,
            session=session,
            now=now,
            solution_revealed=True,
        )
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=TrainingSolutionAcknowledgement(
                session_id=session_id,
                session_version=session_version,
                event_id=event_id,
                event_sequence=event_sequence,
            ),
            resource_id=session_id,
        )

    def _read_authorized_content(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
    ) -> Mapping[str, Any]:
        row = (
            connection.execute(
                text(
                    f"""
                    {_ALLOWED_SOURCE_CTE}
                    SELECT
                        problem.hint_zh,
                        problem.hint_en,
                        problem.solution_zh,
                        problem.solution_en
                    FROM training_sessions AS session
                    JOIN problems AS problem ON problem.id = session.problem_id
                    JOIN allowed_sources AS source ON source.id = problem.source_id
                    WHERE session.id = :session_id
                      AND session.user_id = :user_id
                    """
                ),
                {"session_id": session_id, "user_id": user_id},
            )
            .mappings()
            .first()
        )
        if row is None:
            raise ApiError(
                status_code=404,
                code="TRAINING_SESSION_NOT_FOUND",
                message="训练会话不存在",
                retryable=False,
            )
        return row

    def _lock_session(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        expected_version: int,
    ) -> Mapping[str, Any]:
        row = (
            connection.execute(
                text(
                    f"""
                    {_ALLOWED_SOURCE_CTE}
                    SELECT
                        session.id,
                        session.user_id,
                        session.problem_id,
                        session.plan_task_id,
                        session.status,
                        session.version,
                        problem.category,
                        problem.difficulty,
                        problem.hint_zh,
                        problem.hint_en,
                        problem.solution_zh,
                        problem.solution_en
                    FROM training_sessions AS session
                    JOIN problems AS problem ON problem.id = session.problem_id
                    JOIN allowed_sources AS source ON source.id = problem.source_id
                    WHERE session.id = :session_id
                      AND session.user_id = :user_id
                    FOR UPDATE OF session
                    """
                ),
                {"session_id": session_id, "user_id": user_id},
            )
            .mappings()
            .first()
        )
        if row is None:
            raise ApiError(
                status_code=404,
                code="TRAINING_SESSION_NOT_FOUND",
                message="训练会话不存在",
                retryable=False,
            )
        if row["status"] != "active":
            raise ApiError(
                status_code=409,
                code="TRAINING_SESSION_NOT_ACTIVE",
                message="训练会话已不再可修改",
                retryable=False,
            )
        if int(row["version"]) != expected_version:
            raise ApiError(
                status_code=409,
                code="TRAINING_SESSION_VERSION_CONFLICT",
                message="训练会话已更新，请刷新后重试",
                field_errors={"version": ["版本已过期"]},
                retryable=False,
            )
        return row

    def _append_event(
        self,
        connection: Any,
        *,
        session: Mapping[str, Any],
        event_type: str,
        attempt_id: UUID | None,
        payload: Mapping[str, Any],
        now: datetime,
    ) -> tuple[UUID, int]:
        sequence = int(
            connection.execute(
                text(
                    """
                    SELECT COALESCE(max(sequence), 0) + 1
                    FROM training_events
                    WHERE training_session_id = :session_id
                    """
                ),
                {"session_id": session["id"]},
            ).scalar_one()
        )
        event_id = self._new_id()
        connection.execute(
            text(
                """
                INSERT INTO training_events
                    (id, user_id, training_session_id, problem_id, attempt_id,
                     event_type, sequence, payload, occurred_at, created_at)
                VALUES
                    (:id, :user_id, :session_id, :problem_id, :attempt_id,
                     :event_type, :sequence, CAST(:payload AS jsonb), :now, :now)
                """
            ),
            {
                "id": event_id,
                "user_id": session["user_id"],
                "session_id": session["id"],
                "problem_id": session["problem_id"],
                "attempt_id": attempt_id,
                "event_type": event_type,
                "sequence": sequence,
                "payload": json.dumps(payload, separators=(",", ":"), sort_keys=True),
                "now": now,
            },
        )
        return event_id, sequence

    def _advance_session(
        self,
        connection: Any,
        *,
        session: Mapping[str, Any],
        now: datetime,
    ) -> int:
        return int(
            connection.execute(
                text(
                    """
                    UPDATE training_sessions
                    SET version = version + 1,
                        last_activity_at = :now,
                        updated_at = :now
                    WHERE id = :session_id
                      AND user_id = :user_id
                      AND status = 'active'
                      AND version = :version
                    RETURNING version
                    """
                ),
                {
                    "session_id": session["id"],
                    "user_id": session["user_id"],
                    "version": session["version"],
                    "now": now,
                },
            ).scalar_one()
        )

    def _upsert_progress(
        self,
        connection: Any,
        *,
        session: Mapping[str, Any],
        now: datetime,
        attempt_delta: int = 0,
        hint_delta: int = 0,
        solution_revealed: bool = False,
        completed: bool = False,
        score: int | None = None,
    ) -> None:
        connection.execute(
            text(
                """
                INSERT INTO problem_progress
                    (id, user_id, problem_id, status, attempt_count, hint_count,
                     solution_revealed_at, best_score, last_score,
                     last_practiced_at, completed_at, version,
                     created_at, updated_at)
                VALUES
                    (:id, :user_id, :problem_id, :status, :attempt_delta,
                     :hint_delta, :solution_revealed_at, :score, :score,
                     :now, :completed_at, 1, :now, :now)
                ON CONFLICT (user_id, problem_id) DO UPDATE
                SET status = CASE
                        WHEN EXCLUDED.status = 'completed' THEN 'completed'
                        WHEN problem_progress.status = 'unstarted' THEN 'in_progress'
                        ELSE problem_progress.status
                    END,
                    attempt_count = problem_progress.attempt_count + :attempt_delta,
                    hint_count = problem_progress.hint_count + :hint_delta,
                    solution_revealed_at = CASE
                        WHEN :solution_revealed_at IS NOT NULL
                        THEN :solution_revealed_at
                        ELSE problem_progress.solution_revealed_at
                    END,
                    best_score = CASE
                        WHEN :score IS NULL THEN problem_progress.best_score
                        WHEN problem_progress.best_score IS NULL THEN :score
                        ELSE GREATEST(problem_progress.best_score, :score)
                    END,
                    last_score = COALESCE(:score, problem_progress.last_score),
                    last_practiced_at = :now,
                    completed_at = CASE
                        WHEN :completed_at IS NOT NULL THEN :completed_at
                        ELSE problem_progress.completed_at
                    END,
                    version = problem_progress.version + 1,
                    updated_at = :now
                """
            ),
            {
                "id": self._new_id(),
                "user_id": session["user_id"],
                "problem_id": session["problem_id"],
                "status": "completed" if completed else "in_progress",
                "attempt_delta": attempt_delta,
                "hint_delta": hint_delta,
                "solution_revealed_at": now if solution_revealed else None,
                "score": score,
                "completed_at": now if completed else None,
                "now": now,
            },
        )

    def _insert_completion_notification(
        self,
        connection: Any,
        *,
        user_id: UUID,
        session_id: UUID,
        xp_delta: int,
        now: datetime,
    ) -> None:
        dedupe_key = hashlib.sha256(
            f"training-result:{user_id}:{session_id}".encode("ascii")
        ).hexdigest()
        connection.execute(
            text(
                """
                INSERT INTO notifications
                    (id, user_id, kind, title, body, read_at, created_at,
                     action_target, action_resource_id, dedupe_key)
                VALUES
                    (:id, :user_id, 'training_completed', '训练完成',
                     :body, NULL, :created_at, 'training_result',
                     :session_id, :dedupe_key)
                ON CONFLICT (user_id, dedupe_key) WHERE dedupe_key IS NOT NULL
                DO NOTHING
                """
            ),
            {
                "id": self._new_id(),
                "user_id": user_id,
                "body": f"官方训练结果已确认，获得 {xp_delta} XP。",
                "created_at": now,
                "session_id": session_id,
                "dedupe_key": dedupe_key,
            },
        )

    def _hook(self, stage: str, connection: Any) -> None:
        if self._completion_hook is not None:
            self._completion_hook(stage, connection)

    def _new_id(self) -> UUID:
        value = self._id_factory()
        if not isinstance(value, UUID):
            raise ValueError("id_factory must return UUID values")
        return value

    def _now(self) -> datetime:
        value = self._clock()
        if not isinstance(value, datetime) or value.tzinfo is None:
            raise ValueError("training clock must be timezone-aware")
        if value.utcoffset() is None:
            raise ValueError("training clock must be timezone-aware")
        return value.astimezone(UTC)


def _apply_training_plan_effect(
    connection: Any,
    *,
    user_id: UUID,
    plan_task_id: UUID | None,
    problem_id: UUID,
    completed_at: datetime,
) -> PlanEffectAcknowledgement | None:
    if plan_task_id is None:
        return None
    from ..plans.service import apply_training_plan_effect

    return apply_training_plan_effect(
        connection,
        user_id=user_id,
        plan_task_id=plan_task_id,
        problem_id=problem_id,
        completed_at=completed_at,
    )


def _attempt_fingerprint_key(value: SecretStr | str | None) -> bytes | None:
    if value is None:
        return None
    raw = value.get_secret_value() if isinstance(value, SecretStr) else value
    if not isinstance(raw, str) or len(raw) < 32:
        raise ValueError("training fingerprint secret is invalid")
    return hashlib.sha256(
        b"quantgym:training-attempt:fingerprint-key:v1\x00" + raw.encode("utf-8")
    ).digest()


def _attempt_request_fingerprint(
    key: bytes | None,
    *,
    user_id: UUID,
    idempotency_key: IdempotencyKey,
    session_id: UUID,
    expected_version: int,
    answer_kind: str,
    private_answer: str,
) -> str:
    if key is None:
        raise RuntimeError("training attempt fingerprint secret is unavailable")
    canonical = json.dumps(
        {
            "domain": "quantgym:training.submit-attempt:v1",
            "idempotencyKeyDigest": idempotency_key.digest,
            "payload": {
                "answer": private_answer,
                "kind": answer_kind,
                "version": expected_version,
            },
            "resourceId": str(session_id),
            "userId": str(user_id),
        },
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return hmac.new(key, canonical, hashlib.sha256).hexdigest()


def _private_answer(value: Any) -> str:
    if not isinstance(value, str) or not value.strip() or len(value) > 50_000:
        raise ValueError("answer is invalid")
    if "\x00" in value:
        raise ValueError("answer is invalid")
    return value


def _snapshot(value: Any) -> Mapping[str, Any]:
    if not isinstance(value, Mapping):
        raise RuntimeError("persisted idempotency acknowledgement is unavailable")
    return value


def _snapshot_uuid(snapshot: Mapping[str, Any], key: str) -> UUID:
    value = snapshot.get(key)
    if not isinstance(value, str):
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    try:
        parsed = UUID(value)
    except (AttributeError, TypeError, ValueError):
        raise RuntimeError("persisted idempotency acknowledgement is invalid") from None
    if str(parsed) != value:
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    return parsed


def _snapshot_int(snapshot: Mapping[str, Any], key: str) -> int:
    value = snapshot.get(key)
    if isinstance(value, bool) or not isinstance(value, int):
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    return value


def _snapshot_bool(snapshot: Mapping[str, Any], key: str) -> bool:
    value = snapshot.get(key)
    if type(value) is not bool:
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    return value


def _snapshot_score(snapshot: Mapping[str, Any], key: str) -> int:
    value = _snapshot_int(snapshot, key)
    if not 0 <= value <= 100:
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    return value


def _exact_snapshot_keys(snapshot: Mapping[str, Any], expected: set[str]) -> None:
    if set(snapshot) != expected:
        raise RuntimeError("persisted idempotency acknowledgement is invalid")


def _training_event_from_snapshot(value: Any) -> TrainingEventResult:
    snapshot = _snapshot(value)
    _exact_snapshot_keys(
        snapshot,
        {
            "eventId",
            "eventSequence",
            "sessionId",
            "sessionVersion",
        },
    )
    return TrainingEventResult(
        session_id=_snapshot_uuid(snapshot, "sessionId"),
        session_version=_snapshot_int(snapshot, "sessionVersion"),
        event_id=_snapshot_uuid(snapshot, "eventId"),
        event_sequence=_snapshot_int(snapshot, "eventSequence"),
    )


def _attempt_from_snapshot(value: Any) -> AttemptSubmissionResult:
    snapshot = _snapshot(value)
    _exact_snapshot_keys(
        snapshot,
        {
            "attemptId",
            "eventId",
            "eventSequence",
            "score",
            "sessionId",
            "sessionVersion",
        },
    )
    return AttemptSubmissionResult(
        session_id=_snapshot_uuid(snapshot, "sessionId"),
        session_version=_snapshot_int(snapshot, "sessionVersion"),
        attempt_id=_snapshot_uuid(snapshot, "attemptId"),
        event_id=_snapshot_uuid(snapshot, "eventId"),
        event_sequence=_snapshot_int(snapshot, "eventSequence"),
        score=_snapshot_score(snapshot, "score"),
    )


def _completion_from_snapshot(value: Any) -> CompletionResult:
    snapshot = _snapshot(value)
    plan_effect = snapshot.get("planEffect")
    if plan_effect is not None and not isinstance(plan_effect, Mapping):
        raise RuntimeError("persisted idempotency acknowledgement is invalid")
    return CompletionResult(
        session_id=_snapshot_uuid(snapshot, "sessionId"),
        session_version=_snapshot_int(snapshot, "sessionVersion"),
        xp_delta=_snapshot_int(snapshot, "xpDelta"),
        task_completed=(
            False if plan_effect is None else _snapshot_bool(plan_effect, "taskCompleted")
        ),
        plan_version=(
            None if plan_effect is None else _snapshot_int(plan_effect, "planVersion")
        ),
    )


__all__ = [
    "AttemptSubmissionResult",
    "CompletionResult",
    "HintUseResult",
    "SolutionRevealResult",
    "StartTrainingResult",
    "TrainingEventResult",
    "TrainingResult",
    "TrainingService",
]
