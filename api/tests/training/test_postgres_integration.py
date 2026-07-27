from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from threading import Barrier, Event
from typing import Any, Iterator
from uuid import UUID

import pytest
from sqlalchemy import create_engine, event, text

from api.app.dashboard.service import DashboardService
from api.app.errors import ApiError
from api.app.idempotency import IdempotencyKey
from api.app.notifications.service import NotificationsService
from api.app.training.service import TrainingService


REPO_ROOT = Path(__file__).resolve().parents[3]
USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
OTHER_USER_ID = UUID("b5955125-926f-427d-8100-1e9e92d8d5bb")
SOURCE_ID = UUID("7a3caec4-32ea-4ea2-9a98-15d97a5de1da")
NEWEST_BLOCKED_SOURCE_ID = UUID("e0bf284f-8f96-448e-a626-03563a0a5a6a")
PROBLEM_ID = UUID("0c1d974a-ec41-42d9-a28c-85fbca86f17d")
REBOUND_PROBLEM_ID = UUID("2b52aa59-1e62-4f1e-8326-02728bb8f9ec")
PLAN_ID = UUID("1568a65e-da34-46f7-93d4-ab84f587dd04")
TASK_ID = UUID("78c1e61e-e3aa-4aa8-82b9-ee37f10614a7")
RECOMMENDATION_ID = UUID("69e17025-b670-48d5-b896-49e218d77856")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)
START_KEY = IdempotencyKey("a" * 64)
COMPLETE_KEY = IdempotencyKey("b" * 64)
PRIVATE_ANSWER = "private-answer-7f3c99"


@pytest.fixture(scope="module")
def postgres_engine() -> Iterator[Any]:
    from alembic import command
    from alembic.config import Config
    from testcontainers.postgres import PostgresContainer

    container = PostgresContainer("postgres:18", driver="psycopg")
    try:
        container.start()
    except Exception as error:
        pytest.skip(
            "ephemeral PostgreSQL 18 unavailable: "
            f"{type(error).__name__}: {error}"
        )
    engine = create_engine(container.get_connection_url(), pool_pre_ping=True)
    try:
        with engine.connect() as connection:
            config = Config(str(REPO_ROOT / "api" / "alembic.ini"))
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        yield engine
    finally:
        engine.dispose()
        with suppress(Exception):
            container.stop()


@pytest.fixture(autouse=True)
def phase2_rows(postgres_engine: Any) -> Iterator[Any]:
    with postgres_engine.begin() as connection:
        connection.execute(text("TRUNCATE problem_sources, users CASCADE"))
        connection.execute(
            text(
                """
                INSERT INTO users
                    (id, email, normalized_email, password_hash, display_name,
                     status, email_verified_at, created_at, updated_at)
                VALUES
                    (:user_id, 'gary@example.com', 'gary@example.com', NULL,
                     'Gary', 'active', :now, :now, :now),
                    (:other_user_id, 'other@example.com', 'other@example.com', NULL,
                     'Other', 'active', :now, :now, :now)
                """
            ),
            {"user_id": USER_ID, "other_user_id": OTHER_USER_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status,
                     release_scope, created_at, updated_at)
                VALUES
                    (:id, 'owned-fixture', 'Owned fixture', '2026.07',
                     'internal_preview', 'preview', :now, :now)
                """
            ),
            {"id": SOURCE_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, title_en,
                     prompt_zh, prompt_en, hint_zh, hint_en,
                     solution_zh, solution_en, category, difficulty,
                     tags, companies, hot100, version, created_at, updated_at)
                VALUES
                    (:id, :source_id, 'array-001', '数组训练', 'Array training',
                     '完成数组题', 'Complete the array problem', '先排序', 'Sort first',
                     '使用双指针', 'Use two pointers', 'arrays', 'Medium',
                     CAST('["arrays"]' AS jsonb), CAST('[]' AS jsonb),
                     true, 1, :now, :now)
                """
            ),
            {"id": PROBLEM_ID, "source_id": SOURCE_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO plans
                    (id, user_id, track, role, season, weekly_hours,
                     diagnostic_status, diagnostic_score, diagnostic_scores,
                     status, version, created_at, updated_at)
                    VALUES
                        (:id, :user_id, 'fulltime', 'quant', '2027', 8,
                     'completed', 42, CAST(:diagnostic_scores AS jsonb),
                     'active', 1, :now, :now)
                """
            ),
            {
                "id": PLAN_ID,
                "user_id": USER_ID,
                "diagnostic_scores": json.dumps({"arrays": 42}),
                "now": NOW,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO recommendations
                    (id, user_id, plan_id, problem_id, kind, skill_key,
                     rationale, provenance_type, provenance_resource_id,
                     dedupe_key, rank, status, version, created_at, updated_at)
                VALUES
                    (:id, :user_id, :plan_id, :problem_id, 'problem', 'arrays',
                     '强化数组边界处理', 'diagnostic', :plan_id,
                     :dedupe_key, 0, 'active', 1, :now, :now)
                """
            ),
            {
                "id": RECOMMENDATION_ID,
                "user_id": USER_ID,
                "plan_id": PLAN_ID,
                "problem_id": PROBLEM_ID,
                "dedupe_key": "d" * 64,
                "now": NOW,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO plan_tasks
                    (id, user_id, title, status, sort_order, version,
                     completed_at, created_at, updated_at, plan_id,
                     recommendation_id, target_problem_id, detail,
                     scheduled_for, estimated_minutes, action_target, skill_key)
                VALUES
                    (:id, :user_id, '完成一道数组题', 'open', 0, 1,
                     NULL, :now, :now, :plan_id, :recommendation_id,
                     :problem_id, '强化当前最明显短板', :scheduled_for,
                     30, 'problems', 'arrays')
                """
            ),
            {
                "id": TASK_ID,
                "user_id": USER_ID,
                "plan_id": PLAN_ID,
                "recommendation_id": RECOMMENDATION_ID,
                "problem_id": PROBLEM_ID,
                "scheduled_for": date(2026, 7, 27),
                "now": NOW,
            },
        )
    yield postgres_engine


def _service(engine: Any, **overrides: Any) -> TrainingService:
    return TrainingService(engine, clock=lambda: NOW, **overrides)


def _start_and_attempt(service: TrainingService) -> tuple[Any, Any]:
    started = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=TASK_ID,
        idempotency_key=START_KEY,
    )
    attempt = service.submit_attempt(
        user_id=USER_ID,
        session_id=started.session_id,
        expected_version=started.session_version,
        answer_kind="code",
        answer=PRIVATE_ANSWER,
    )
    return started, attempt


def test_complete_daily_loop_replays_snapshot_and_never_leaks_answer(
    phase2_rows: Any,
) -> None:
    service = _service(phase2_rows)
    started = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=TASK_ID,
        idempotency_key=START_KEY,
    )
    replayed_start = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=TASK_ID,
        idempotency_key=START_KEY,
    )
    hint = service.use_hint(
        user_id=USER_ID,
        session_id=started.session_id,
        expected_version=1,
    )
    attempt = service.submit_attempt(
        user_id=USER_ID,
        session_id=started.session_id,
        expected_version=hint.session_version,
        answer_kind="code",
        answer=PRIVATE_ANSWER,
    )
    solution = service.reveal_solution(
        user_id=USER_ID,
        session_id=started.session_id,
        expected_version=attempt.session_version,
    )
    completed = service.complete(
        user_id=USER_ID,
        session_id=started.session_id,
        attempt_id=attempt.attempt_id,
        expected_version=solution.session_version,
        idempotency_key=COMPLETE_KEY,
    )

    assert replayed_start == started
    assert hint.hint_zh == "先排序"
    assert completed.session_version == 5
    assert completed.xp_delta == 20
    assert completed.task_completed is True
    assert completed.plan_version == 2

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE plans SET version = 9, updated_at = :now WHERE id = :id"),
            {"id": PLAN_ID, "now": NOW},
        )
    replay = service.complete(
        user_id=USER_ID,
        session_id=started.session_id,
        attempt_id=attempt.attempt_id,
        expected_version=solution.session_version,
        idempotency_key=COMPLETE_KEY,
    )
    assert replay == completed

    with pytest.raises(ApiError) as reused:
        service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=completed.session_version,
            idempotency_key=COMPLETE_KEY,
        )
    assert reused.value.code == "IDEMPOTENCY_KEY_REUSED"

    with pytest.raises(ApiError) as inactive:
        service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=completed.session_version,
            idempotency_key=IdempotencyKey("e" * 64),
        )
    assert inactive.value.code == "TRAINING_SESSION_NOT_ACTIVE"

    result = service.get_result(user_id=USER_ID, session_id=started.session_id)
    assert result.score == 100
    assert result.xp_delta == 20
    assert result.task_completed is True

    overview = DashboardService(phase2_rows, clock=lambda: NOW).get_overview(
        user_id=USER_ID
    )
    assert overview.profile.weekly_xp == 20
    assert overview.profile.level == 1
    assert overview.plan_progress is not None
    assert overview.plan_progress.completed_tasks == 1
    assert overview.weakness is not None
    assert overview.weakness.skill_key == "arrays"
    assert overview.unread_notification_count == 1

    with phase2_rows.connect() as connection:
        counts = connection.execute(
            text(
                """
                SELECT
                    (SELECT count(*) FROM training_sessions) AS sessions,
                    (SELECT count(*) FROM training_events WHERE event_type = 'completed') AS completions,
                    (SELECT count(*) FROM xp_ledger) AS rewards,
                    (SELECT count(*) FROM notifications) AS notifications
                """
            )
        ).mappings().one()
        serialized = connection.execute(
            text(
                """
                SELECT concat_ws(' ',
                    COALESCE((SELECT string_agg(payload::text, ' ') FROM training_events), ''),
                    COALESCE((SELECT string_agg(response_snapshot::text, ' ') FROM idempotency_records), ''),
                    COALESCE((SELECT string_agg(title || ' ' || body, ' ') FROM notifications), '')
                )
                """
            )
        ).scalar_one()
        notification = connection.execute(
            text(
                """
                SELECT action_target, action_resource_id, dedupe_key
                FROM notifications
                """
            )
        ).mappings().one()

    assert dict(counts) == {
        "sessions": 1,
        "completions": 1,
        "rewards": 1,
        "notifications": 1,
    }
    assert PRIVATE_ANSWER not in serialized
    assert "先排序" not in serialized
    assert "使用双指针" not in serialized
    assert notification["action_target"] == "training_result"
    assert notification["action_resource_id"] == started.session_id
    assert len(notification["dedupe_key"]) == 64


def test_completion_validates_ownership_version_and_persisted_answer(
    phase2_rows: Any,
) -> None:
    service = _service(phase2_rows)
    started, attempt = _start_and_attempt(service)

    with pytest.raises(ApiError) as ownership:
        service.get_result(user_id=OTHER_USER_ID, session_id=started.session_id)
    assert ownership.value.code == "TRAINING_RESULT_NOT_FOUND"

    with pytest.raises(ApiError) as stale:
        service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=99,
            idempotency_key=COMPLETE_KEY,
        )
    assert stale.value.code == "TRAINING_SESSION_VERSION_CONFLICT"

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE answers SET body_sha256 = :digest WHERE attempt_id = :id"),
            {"digest": "f" * 64, "id": attempt.attempt_id},
        )
    with pytest.raises(ApiError) as corrupt:
        service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=attempt.session_version,
            idempotency_key=COMPLETE_KEY,
        )
    assert corrupt.value.code == "TRAINING_ANSWER_INVALID"
    with phase2_rows.connect() as connection:
        assert connection.execute(
            text(
                "SELECT count(*) FROM idempotency_records "
                "WHERE operation = 'problems.complete'"
            )
        ).scalar_one() == 0


def test_training_start_rejects_legacy_tasks_and_archived_plans(
    phase2_rows: Any,
) -> None:
    legacy_task_id = UUID("975f0ca1-3121-4c4c-b91f-707e4c29160d")
    service = _service(phase2_rows)
    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO plan_tasks
                    (id, user_id, title, status, sort_order, version,
                     created_at, updated_at)
                VALUES
                    (:id, :user_id, '旧版待办', 'open', 1, 1, :now, :now)
                """
            ),
            {"id": legacy_task_id, "user_id": USER_ID, "now": NOW},
        )

    with pytest.raises(ApiError) as legacy:
        service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=legacy_task_id,
            idempotency_key=IdempotencyKey("1" * 64),
        )
    assert legacy.value.status_code == 404
    assert legacy.value.code == "PLAN_TASK_NOT_FOUND"

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE plans SET status = 'archived' WHERE id = :plan_id"),
            {"plan_id": PLAN_ID},
        )
    with pytest.raises(ApiError) as archived:
        service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=TASK_ID,
            idempotency_key=IdempotencyKey("2" * 64),
        )
    assert archived.value.status_code == 404
    assert archived.value.code == "PLAN_TASK_NOT_FOUND"

    with phase2_rows.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM training_sessions")
        ).scalar_one() == 0


@pytest.mark.parametrize(
    ("initial_plan_task_id", "conflicting_plan_task_id"),
    [(None, TASK_ID), (TASK_ID, None)],
)
def test_training_resume_never_silently_rebinds_plan_task(
    phase2_rows: Any,
    initial_plan_task_id: UUID | None,
    conflicting_plan_task_id: UUID | None,
) -> None:
    service = _service(phase2_rows)
    initial_key = IdempotencyKey("3" * 64)
    started = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=initial_plan_task_id,
        idempotency_key=initial_key,
    )
    replay = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=initial_plan_task_id,
        idempotency_key=initial_key,
    )
    resumed = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=initial_plan_task_id,
        idempotency_key=IdempotencyKey("4" * 64),
    )

    assert replay == started
    assert resumed.session_id == started.session_id
    assert resumed.resumed is True

    with pytest.raises(ApiError) as conflict:
        service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=conflicting_plan_task_id,
            idempotency_key=IdempotencyKey("5" * 64),
        )
    assert conflict.value.status_code == 409
    assert conflict.value.code == "TRAINING_SESSION_PLAN_CONFLICT"

    with phase2_rows.connect() as connection:
        persisted = connection.execute(
            text(
                """
                SELECT plan_task_id
                FROM training_sessions
                WHERE id = :session_id
                """
            ),
            {"session_id": started.session_id},
        ).scalar_one()
        session_count = connection.execute(
            text("SELECT count(*) FROM training_sessions")
        ).scalar_one()
    assert persisted == initial_plan_task_id
    assert session_count == 1


def test_training_start_waits_for_plan_then_revalidates_rebound_task(
    phase2_rows: Any,
) -> None:
    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, title_en,
                     prompt_zh, prompt_en, hint_zh, hint_en,
                     solution_zh, solution_en, category, difficulty,
                     tags, companies, hot100, version, created_at, updated_at)
                VALUES
                    (:id, :source_id, 'array-002', '重绑后的数组训练',
                     'Rebound array training', '完成另一道数组题',
                     'Complete another array problem', NULL, NULL, NULL, NULL,
                     'arrays', 'Easy', CAST('["arrays"]' AS jsonb),
                     CAST('[]' AS jsonb), false, 1, :now, :now)
                """
            ),
            {"id": REBOUND_PROBLEM_ID, "source_id": SOURCE_ID, "now": NOW},
        )

    rebound_applied = Event()
    release_rebind = Event()
    validation_read = Event()

    def hold_diagnostic_rebind() -> None:
        with phase2_rows.begin() as connection:
            connection.execute(
                text(
                    """
                    SELECT id
                    FROM plans
                    WHERE id = :plan_id AND user_id = :user_id
                    FOR UPDATE
                    """
                ),
                {"plan_id": PLAN_ID, "user_id": USER_ID},
            ).one()
            connection.execute(
                text(
                    """
                    UPDATE plan_tasks
                    SET target_problem_id = :problem_id,
                        version = version + 1,
                        updated_at = :now
                    WHERE id = :task_id
                      AND user_id = :user_id
                      AND plan_id = :plan_id
                    """
                ),
                {
                    "problem_id": REBOUND_PROBLEM_ID,
                    "now": NOW,
                    "task_id": TASK_ID,
                    "user_id": USER_ID,
                    "plan_id": PLAN_ID,
                },
            )
            rebound_applied.set()
            assert release_rebind.wait(timeout=10)

    def observe_task_reference(
        _connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        if "FROM plan_tasks AS task" in statement and "task.plan_id" in statement:
            validation_read.set()

    event.listen(phase2_rows, "after_cursor_execute", observe_task_reference)
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            rebind_future = executor.submit(hold_diagnostic_rebind)
            assert rebound_applied.wait(timeout=10)
            start_future = executor.submit(
                _service(phase2_rows).start_or_resume,
                user_id=USER_ID,
                problem_id=PROBLEM_ID,
                plan_task_id=TASK_ID,
                idempotency_key=IdempotencyKey("6" * 64),
            )
            assert validation_read.wait(timeout=10)
            time.sleep(0.2)
            waited_for_plan_lock = start_future.done() is False
            release_rebind.set()
            rebind_future.result(timeout=10)
            try:
                start_future.result(timeout=10)
            except ApiError as error:
                start_error = error
            else:
                start_error = None
    finally:
        release_rebind.set()
        event.remove(phase2_rows, "after_cursor_execute", observe_task_reference)

    assert waited_for_plan_lock is True
    assert start_error is not None
    assert start_error.status_code == 409
    assert start_error.code == "PLAN_TASK_TRAINING_CONFLICT"
    with phase2_rows.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM training_sessions")
        ).scalar_one() == 0


def test_result_never_joins_cross_user_task_or_plan_metadata(
    phase2_rows: Any,
) -> None:
    service = _service(phase2_rows)
    started, attempt = _start_and_attempt(service)
    service.complete(
        user_id=USER_ID,
        session_id=started.session_id,
        attempt_id=attempt.attempt_id,
        expected_version=attempt.session_version,
        idempotency_key=COMPLETE_KEY,
    )

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE plan_tasks SET user_id = :other WHERE id = :task_id"),
            {"other": OTHER_USER_ID, "task_id": TASK_ID},
        )
    task_mismatch = service.get_result(
        user_id=USER_ID,
        session_id=started.session_id,
    )
    assert task_mismatch.task_completed is False
    assert task_mismatch.plan_version is None

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE plan_tasks SET user_id = :user_id WHERE id = :task_id"),
            {"user_id": USER_ID, "task_id": TASK_ID},
        )
        connection.execute(
            text("UPDATE plans SET user_id = :other WHERE id = :plan_id"),
            {"other": OTHER_USER_ID, "plan_id": PLAN_ID},
        )
    plan_mismatch = service.get_result(
        user_id=USER_ID,
        session_id=started.session_id,
    )
    assert plan_mismatch.task_completed is True
    assert plan_mismatch.plan_version is None


@pytest.mark.parametrize("table", ["training_events", "attempts", "xp_ledger"])
def test_result_fails_closed_for_cross_user_official_rows(
    phase2_rows: Any,
    table: str,
) -> None:
    service = _service(phase2_rows)
    started, attempt = _start_and_attempt(service)
    service.complete(
        user_id=USER_ID,
        session_id=started.session_id,
        attempt_id=attempt.attempt_id,
        expected_version=attempt.session_version,
        idempotency_key=COMPLETE_KEY,
    )

    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                f"UPDATE {table} SET user_id = :other "
                "WHERE training_session_id = :session_id"
            ),
            {"other": OTHER_USER_ID, "session_id": started.session_id},
        )

    with pytest.raises(ApiError) as hidden:
        service.get_result(user_id=USER_ID, session_id=started.session_id)
    assert hidden.value.status_code == 404
    assert hidden.value.code == "TRAINING_RESULT_NOT_FOUND"


def test_cross_user_training_mutations_and_result_uniformly_return_404(
    phase2_rows: Any,
) -> None:
    service = _service(phase2_rows)
    started, attempt = _start_and_attempt(service)

    calls = (
        lambda: service.use_hint(
            user_id=OTHER_USER_ID,
            session_id=started.session_id,
            expected_version=attempt.session_version,
        ),
        lambda: service.submit_attempt(
            user_id=OTHER_USER_ID,
            session_id=started.session_id,
            expected_version=attempt.session_version,
            answer_kind="text",
            answer="other-private-answer",
        ),
        lambda: service.reveal_solution(
            user_id=OTHER_USER_ID,
            session_id=started.session_id,
            expected_version=attempt.session_version,
        ),
        lambda: service.complete(
            user_id=OTHER_USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=attempt.session_version,
            idempotency_key=COMPLETE_KEY,
        ),
        lambda: service.get_result(
            user_id=OTHER_USER_ID,
            session_id=started.session_id,
        ),
    )
    expected_codes = [
        "TRAINING_SESSION_NOT_FOUND",
        "TRAINING_SESSION_NOT_FOUND",
        "TRAINING_SESSION_NOT_FOUND",
        "TRAINING_SESSION_NOT_FOUND",
        "TRAINING_RESULT_NOT_FOUND",
    ]
    for call, expected_code in zip(calls, expected_codes, strict=True):
        with pytest.raises(ApiError) as hidden:
            call()
        assert hidden.value.status_code == 404
        assert hidden.value.code == expected_code


def test_preview_rights_fail_closed_for_start_and_authorized_content(
    phase2_rows: Any,
) -> None:
    service = _service(phase2_rows)
    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                "UPDATE problem_sources SET rights_status = 'blocked' WHERE id = :id"
            ),
            {"id": SOURCE_ID},
        )
    with pytest.raises(ApiError) as blocked:
        service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=TASK_ID,
            idempotency_key=IdempotencyKey("c" * 64),
        )
    assert blocked.value.code == "PROBLEM_NOT_FOUND"

    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE problem_sources
                SET rights_status = 'approved', release_scope = 'public'
                WHERE id = :id
                """
            ),
            {"id": SOURCE_ID},
        )
    with pytest.raises(ApiError) as non_preview:
        service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=TASK_ID,
            idempotency_key=IdempotencyKey("d" * 64),
        )
    assert non_preview.value.code == "PROBLEM_NOT_FOUND"

    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE problem_sources
                SET rights_status = 'approved', release_scope = 'preview'
                WHERE id = :id
                """
            ),
            {"id": SOURCE_ID},
        )
    started = service.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=TASK_ID,
        idempotency_key=START_KEY,
    )
    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                "UPDATE problem_sources SET rights_status = 'blocked' WHERE id = :id"
            ),
            {"id": SOURCE_ID},
        )
    for operation in (
        lambda: service.use_hint(
            user_id=USER_ID,
            session_id=started.session_id,
            expected_version=1,
        ),
        lambda: service.reveal_solution(
            user_id=USER_ID,
            session_id=started.session_id,
            expected_version=1,
        ),
    ):
        with pytest.raises(ApiError) as revoked:
            operation()
        assert revoked.value.status_code == 404
        assert revoked.value.code == "TRAINING_SESSION_NOT_FOUND"


def test_latest_source_rights_block_old_safe_training_and_dashboard_fallback(
    phase2_rows: Any,
) -> None:
    training = _service(phase2_rows)
    dashboard = DashboardService(phase2_rows, clock=lambda: NOW)
    started = training.start_or_resume(
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        plan_task_id=TASK_ID,
        idempotency_key=START_KEY,
    )
    before_revoke = dashboard.get_overview(user_id=USER_ID)
    assert before_revoke.today_task is not None
    assert before_revoke.weakness is not None
    assert before_revoke.weakness.recommended_problem_id == PROBLEM_ID

    newest_at = NOW + timedelta(days=1)
    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status,
                     release_scope, created_at, updated_at)
                VALUES
                    (:id, 'owned-fixture', 'Blocked latest fixture', '2026.08',
                     'blocked', 'preview', :now, :now)
                """
            ),
            {"id": NEWEST_BLOCKED_SOURCE_ID, "now": newest_at},
        )

    with pytest.raises(ApiError) as direct_start:
        training.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=TASK_ID,
            idempotency_key=IdempotencyKey("7" * 64),
        )
    assert direct_start.value.status_code == 404
    assert direct_start.value.code == "PROBLEM_NOT_FOUND"

    with pytest.raises(ApiError) as active_session:
        training.use_hint(
            user_id=USER_ID,
            session_id=started.session_id,
            expected_version=started.session_version,
        )
    assert active_session.value.status_code == 404
    assert active_session.value.code == "TRAINING_SESSION_NOT_FOUND"

    after_revoke = dashboard.get_overview(user_id=USER_ID)
    assert after_revoke.today_task is None
    assert after_revoke.weakness is not None
    assert after_revoke.weakness.recommended_problem_id is None
    with phase2_rows.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM training_events")
        ).scalar_one() == 0


def test_dashboard_hides_today_task_when_problem_preview_rights_are_revoked(
    phase2_rows: Any,
) -> None:
    dashboard = DashboardService(phase2_rows, clock=lambda: NOW)
    assert dashboard.get_overview(user_id=USER_ID).today_task is not None

    with phase2_rows.begin() as connection:
        connection.execute(
            text(
                "UPDATE problem_sources SET rights_status = 'blocked' WHERE id = :id"
            ),
            {"id": SOURCE_ID},
        )

    revoked = dashboard.get_overview(user_id=USER_ID)
    assert revoked.today_task is None
    assert revoked.weakness is not None
    assert revoked.weakness.recommended_problem_id is None


def test_dashboard_versions_streak_and_utc_week_window_use_server_state(
    phase2_rows: Any,
) -> None:
    training = _service(phase2_rows)
    started, attempt = _start_and_attempt(training)
    training.complete(
        user_id=USER_ID,
        session_id=started.session_id,
        attempt_id=attempt.attempt_id,
        expected_version=attempt.session_version,
        idempotency_key=COMPLETE_KEY,
    )
    dashboard = DashboardService(phase2_rows, clock=lambda: NOW)

    before_read = dashboard.get_overview(user_id=USER_ID)
    assert before_read.unread_notification_count == 1
    assert before_read.resource_versions["notifications"] == 1
    with phase2_rows.connect() as connection:
        notification_id = connection.execute(
            text("SELECT id FROM notifications WHERE user_id = :user_id"),
            {"user_id": USER_ID},
        ).scalar_one()
    NotificationsService(phase2_rows, clock=lambda: NOW).mark_read(
        user_id=USER_ID,
        notification_id=notification_id,
        request_id="dashboard-version-test",
    )
    after_read = dashboard.get_overview(user_id=USER_ID)
    assert after_read.unread_notification_count == 0
    assert after_read.resource_versions["notifications"] == 2

    yesterday = NOW - timedelta(days=1)
    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE xp_ledger SET occurred_at = :occurred_at"),
            {"occurred_at": yesterday},
        )
    assert dashboard.get_overview(user_id=USER_ID).profile.streak_days == 1

    utc_window_start = datetime(2026, 7, 21, tzinfo=UTC)
    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE xp_ledger SET occurred_at = :occurred_at"),
            {"occurred_at": utc_window_start},
        )
    assert dashboard.get_overview(user_id=USER_ID).profile.weekly_xp == 20

    with phase2_rows.begin() as connection:
        connection.execute(
            text("UPDATE xp_ledger SET occurred_at = :occurred_at"),
            {"occurred_at": utc_window_start - timedelta(microseconds=1)},
        )
    assert dashboard.get_overview(user_id=USER_ID).profile.weekly_xp == 0


def test_dashboard_reads_one_repeatable_read_transaction_snapshot(
    phase2_rows: Any,
) -> None:
    observed_isolation_levels: list[str | None] = []

    def observe_begin(connection: Any) -> None:
        observed_isolation_levels.append(
            connection.get_execution_options().get("isolation_level")
        )

    event.listen(phase2_rows, "begin", observe_begin)
    try:
        DashboardService(phase2_rows, clock=lambda: NOW).get_overview(user_id=USER_ID)
    finally:
        event.remove(phase2_rows, "begin", observe_begin)

    assert observed_isolation_levels == ["REPEATABLE READ"]


def test_completion_partial_failure_rolls_back_every_official_effect(
    phase2_rows: Any,
) -> None:
    def fail_after_xp(stage: str, _connection: Any) -> None:
        if stage == "after_xp":
            raise RuntimeError("injected notification-boundary failure")

    service = _service(phase2_rows, completion_hook=fail_after_xp)
    started, attempt = _start_and_attempt(service)

    with pytest.raises(RuntimeError, match="injected"):
        service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=attempt.session_version,
            idempotency_key=COMPLETE_KEY,
        )

    with phase2_rows.connect() as connection:
        state = connection.execute(
            text(
                """
                SELECT
                    (SELECT status FROM training_sessions WHERE id = :session_id) AS session_status,
                    (SELECT status FROM plan_tasks WHERE id = :task_id) AS task_status,
                    (SELECT count(*) FROM training_events WHERE event_type = 'completed') AS completions,
                    (SELECT count(*) FROM xp_ledger) AS rewards,
                    (SELECT count(*) FROM notifications) AS notifications,
                    (SELECT count(*) FROM idempotency_records
                     WHERE operation = 'problems.complete') AS completion_keys
                """
            ),
            {"session_id": started.session_id, "task_id": TASK_ID},
        ).mappings().one()
    assert dict(state) == {
        "session_status": "active",
        "task_status": "open",
        "completions": 0,
        "rewards": 0,
        "notifications": 0,
        "completion_keys": 0,
    }


def test_concurrent_completion_issues_exactly_one_reward(
    phase2_rows: Any,
) -> None:
    locked = Event()
    release = Event()
    hook_calls = 0

    def block_winner(stage: str, _connection: Any) -> None:
        nonlocal hook_calls
        if stage == "after_session_lock":
            hook_calls += 1
            locked.set()
            assert release.wait(timeout=10)

    service = _service(phase2_rows, completion_hook=block_winner)
    started, attempt = _start_and_attempt(service)

    def complete() -> Any:
        return service.complete(
            user_id=USER_ID,
            session_id=started.session_id,
            attempt_id=attempt.attempt_id,
            expected_version=attempt.session_version,
            idempotency_key=COMPLETE_KEY,
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        winner_future = executor.submit(complete)
        assert locked.wait(timeout=10)
        replay_future = executor.submit(complete)
        time.sleep(0.2)
        assert replay_future.done() is False
        release.set()
        winner = winner_future.result(timeout=10)
        replay = replay_future.result(timeout=10)

    assert replay == winner
    assert hook_calls == 1
    with phase2_rows.connect() as connection:
        assert connection.execute(text("SELECT count(*) FROM xp_ledger")).scalar_one() == 1
        assert connection.execute(
            text("SELECT count(*) FROM training_events WHERE event_type = 'completed'")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT count(*) FROM notifications")
        ).scalar_one() == 1


@pytest.mark.parametrize("iteration", range(3))
def test_linked_resume_and_completion_share_plan_then_session_lock_order(
    phase2_rows: Any,
    iteration: int,
) -> None:
    after_xp = Event()
    release_completion = Event()
    start_plan_query = Event()
    start_insert_query = Event()
    race = Barrier(2)

    def pause_completion(stage: str, _connection: Any) -> None:
        if stage == "after_xp":
            after_xp.set()
            race.wait(timeout=10)
            assert release_completion.wait(timeout=10)

    completion_service = _service(
        phase2_rows,
        completion_hook=pause_completion,
    )
    start_service = _service(phase2_rows)
    started, attempt = _start_and_attempt(completion_service)

    def observe_lock_order(
        _connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        if "FROM plans" in statement and "FOR SHARE" in statement:
            start_plan_query.set()
        if "INSERT INTO training_sessions" in statement:
            start_insert_query.set()

    def resume() -> Any:
        assert after_xp.wait(timeout=10)
        race.wait(timeout=10)
        return start_service.start_or_resume(
            user_id=USER_ID,
            problem_id=PROBLEM_ID,
            plan_task_id=TASK_ID,
            idempotency_key=IdempotencyKey(str(iteration + 7) * 64),
        )

    event.listen(phase2_rows, "before_cursor_execute", observe_lock_order)
    try:
        with ThreadPoolExecutor(max_workers=2) as executor:
            completion_future = executor.submit(
                completion_service.complete,
                user_id=USER_ID,
                session_id=started.session_id,
                attempt_id=attempt.attempt_id,
                expected_version=attempt.session_version,
                idempotency_key=COMPLETE_KEY,
            )
            resume_future = executor.submit(resume)
            assert after_xp.wait(timeout=10)
            assert start_plan_query.wait(timeout=10)
            time.sleep(0.2)
            reached_session_insert_while_completion_paused = (
                start_insert_query.is_set()
            )
            release_completion.set()
            completed = completion_future.result(timeout=15)
            try:
                resume_future.result(timeout=15)
            except ApiError as error:
                resume_error = error
            else:
                resume_error = None
    finally:
        release_completion.set()
        event.remove(phase2_rows, "before_cursor_execute", observe_lock_order)

    assert reached_session_insert_while_completion_paused is False
    assert completed.xp_delta == 20
    assert resume_error is not None
    assert resume_error.status_code == 409
    assert resume_error.code == "PLAN_TASK_TRAINING_CONFLICT"
    with phase2_rows.connect() as connection:
        effects = connection.execute(
            text(
                """
                SELECT
                    (SELECT count(*) FROM training_sessions) AS sessions,
                    (SELECT count(*) FROM training_events
                     WHERE event_type = 'completed') AS completions,
                    (SELECT count(*) FROM xp_ledger) AS rewards
                """
            )
        ).mappings().one()
    assert dict(effects) == {"sessions": 1, "completions": 1, "rewards": 1}
