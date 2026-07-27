from __future__ import annotations

import json
from contextlib import suppress
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Barrier, Event, current_thread
from typing import Any, Iterator
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, event, text

from api.app.errors import ApiError
from api.app.dashboard.service import DashboardService
from api.app.idempotency import IdempotencyKey, request_fingerprint
from api.app.notifications.service import NotificationsService
from api.app.plans.schemas import (
    CompletePlanTaskRequest,
    CompleteTodoRequest,
    CreatePlanRequest,
    CreateTodoRequest,
    DiagnosticAnswerRequest,
    RunPlanDiagnosticRequest,
    UpdatePlanTaskRequest,
    UpdateTodoRequest,
)
from api.app.plans.service import PlansService, apply_training_plan_effect
from api.app.preferences.schemas import UpdatePreferencesRequest
from api.app.preferences.service import PreferencesService


REPO_ROOT = Path(__file__).resolve().parents[3]
USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
OTHER_USER_ID = UUID("95ab8099-36c1-4128-a455-9913ccf97cb5")
NOW = datetime(2026, 7, 23, 8, tzinfo=UTC)
FINGERPRINT_SECRET = "task5-test-fingerprint-secret-" * 2
_APPLICATION_TABLES = (
    "problem_sources",
    "media_objects",
    "audit_events",
    "plan_tasks",
    "notifications",
    "auth_challenges",
    "sessions",
    "user_identities",
    "preferences",
    "users",
)


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
            "ephemeral PostgreSQL 18 unavailable: " f"{type(error).__name__}: {error}"
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
def account(postgres_engine: Any) -> Iterator[None]:
    quoted = ", ".join(f'"{table}"' for table in _APPLICATION_TABLES)
    with postgres_engine.begin() as connection:
        connection.execute(text(f"TRUNCATE {quoted} CASCADE"))
        connection.execute(
            text(
                """
                INSERT INTO users
                    (id, email, normalized_email, password_hash, display_name,
                     status, email_verified_at, created_at, updated_at)
                VALUES
                    (:id, 'gary@example.com', 'gary@example.com', NULL, 'Gary',
                     'active', :now, :now, :now)
                """
            ),
            {"id": USER_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO preferences
                    (user_id, theme, language, version, updated_at)
                VALUES (:user_id, 'system', 'zh-CN', 1, :now)
                """
            ),
            {"user_id": USER_ID, "now": NOW},
        )
    yield


def test_preferences_and_notifications_match_the_frozen_schema(
    postgres_engine: Any,
) -> None:
    preferences = PreferencesService(postgres_engine, clock=lambda: NOW)
    changed = preferences.update(
        user_id=USER_ID,
        payload=UpdatePreferencesRequest(theme="dark", version=1),
        request_id="req_preferences",
    )
    assert (changed.theme, changed.language, changed.version) == ("dark", "zh-CN", 2)

    replay = preferences.update(
        user_id=USER_ID,
        payload=UpdatePreferencesRequest(theme="dark", version=1),
        request_id="req_preferences_replay",
    )
    assert replay.version == 2
    with pytest.raises(ApiError) as stale:
        preferences.update(
            user_id=USER_ID,
            payload=UpdatePreferencesRequest(language="en", version=1),
            request_id="req_preferences_stale",
        )
    assert stale.value.code == "PREFERENCE_CONFLICT"

    notification_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO notifications
                    (id, user_id, kind, title, body, read_at, created_at)
                VALUES
                    (:id, :user_id, 'system', '训练提醒', '今天还有一道题',
                     NULL, :created_at)
                """
            ),
            {"id": notification_id, "user_id": USER_ID, "created_at": NOW},
        )
    notifications = NotificationsService(postgres_engine, clock=lambda: NOW)
    page = notifications.list(user_id=USER_ID, cursor=None, limit=20)
    assert [item.id for item in page.items] == [notification_id]
    assert page.unread_count == 1
    assert page.next_cursor is None

    first = notifications.mark_read(
        user_id=USER_ID,
        notification_id=notification_id,
        request_id="req_notification",
    )
    second = notifications.mark_read(
        user_id=USER_ID,
        notification_id=notification_id,
        request_id="req_notification_replay",
    )
    assert first.read_at == second.read_at == NOW
    with postgres_engine.connect() as connection:
        assert (
            connection.execute(
                text(
                    """
                SELECT count(*)
                FROM audit_events
                WHERE user_id = :user_id
                  AND event_type = 'notifications.mark-read'
                """
                ),
                {"user_id": USER_ID},
            ).scalar_one()
            == 1
        )


def test_todo_lifecycle_is_versioned_and_idempotent(postgres_engine: Any) -> None:
    service = PlansService(postgres_engine, clock=lambda: NOW)
    create_key = IdempotencyKey("a" * 64)
    created = service.create(
        user_id=USER_ID,
        payload=CreateTodoRequest(title="复习概率"),
        idempotency_key=create_key,
        request_id="req_create",
    )
    replay = service.create(
        user_id=USER_ID,
        payload=CreateTodoRequest(title="复习概率"),
        idempotency_key=create_key,
        request_id="req_create_replay",
    )
    assert replay.id == created.id
    with pytest.raises(ApiError) as reused:
        service.create(
            user_id=USER_ID,
            payload=CreateTodoRequest(title="不同任务"),
            idempotency_key=create_key,
            request_id="req_create_reused",
        )
    assert reused.value.code == "IDEMPOTENCY_KEY_REUSED"

    update_key = IdempotencyKey("b" * 64)
    update_payload = UpdateTodoRequest(title="复习条件概率", version=1)
    updated = service.update(
        user_id=USER_ID,
        task_id=created.id,
        payload=update_payload,
        idempotency_key=update_key,
        request_id="req_update",
    )
    assert (updated.title, updated.version) == ("复习条件概率", 2)
    with pytest.raises(ApiError) as create_replay_after_change:
        service.create(
            user_id=USER_ID,
            payload=CreateTodoRequest(title="复习概率"),
            idempotency_key=create_key,
            request_id="req_create_replay_after_change",
        )
    assert create_replay_after_change.value.code == "TODO_REPLAY_UNAVAILABLE"
    updated_replay = service.update(
        user_id=USER_ID,
        task_id=created.id,
        payload=update_payload,
        idempotency_key=update_key,
        request_id="req_update_replay",
    )
    assert updated_replay == updated
    with pytest.raises(ApiError) as stale:
        service.update(
            user_id=USER_ID,
            task_id=created.id,
            payload=UpdateTodoRequest(title="过期更新", version=1),
            idempotency_key=IdempotencyKey("c" * 64),
            request_id="req_update_stale",
        )
    assert stale.value.code == "TODO_CONFLICT"

    completed = service.complete(
        user_id=USER_ID,
        task_id=created.id,
        payload=CompleteTodoRequest(version=2),
        idempotency_key=IdempotencyKey("d" * 64),
        request_id="req_complete",
    )
    assert (completed.status, completed.version, completed.completed_at) == (
        "completed",
        3,
        NOW,
    )
    with pytest.raises(ApiError) as superseded_replay:
        service.update(
            user_id=USER_ID,
            task_id=created.id,
            payload=update_payload,
            idempotency_key=update_key,
            request_id="req_update_superseded_replay",
        )
    assert superseded_replay.value.code == "TODO_REPLAY_UNAVAILABLE"
    delete_key = IdempotencyKey("e" * 64)
    service.delete(
        user_id=USER_ID,
        task_id=created.id,
        version=3,
        idempotency_key=delete_key,
        request_id="req_delete",
    )
    service.delete(
        user_id=USER_ID,
        task_id=created.id,
        version=3,
        idempotency_key=delete_key,
        request_id="req_delete_replay",
    )

    with postgres_engine.connect() as connection:
        assert (
            connection.execute(text("SELECT count(*) FROM plan_tasks")).scalar_one()
            == 0
        )
        assert (
            connection.execute(
                text(
                    """
                SELECT count(*)
                FROM audit_events
                WHERE event_type = 'todo.create'
                """
                )
            ).scalar_one()
            == 1
        )


def test_concurrent_todo_retries_create_once_and_stale_writes_lose(
    postgres_engine: Any,
) -> None:
    services = (
        PlansService(postgres_engine, clock=lambda: NOW),
        PlansService(postgres_engine, clock=lambda: NOW),
    )
    create_barrier = Barrier(2)

    def create(index: int) -> Any:
        create_barrier.wait(timeout=10)
        return services[index].create(
            user_id=USER_ID,
            payload=CreateTodoRequest(title="并发任务"),
            idempotency_key=IdempotencyKey("f" * 64),
            request_id=f"req_concurrent_create_{index}",
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        created = list(executor.map(create, (0, 1)))

    assert created[0].id == created[1].id
    task_id = created[0].id
    update_barrier = Barrier(2)

    def update(index: int) -> Any:
        update_barrier.wait(timeout=10)
        try:
            return services[index].update(
                user_id=USER_ID,
                task_id=task_id,
                payload=UpdateTodoRequest(title=f"并发版本 {index}", version=1),
                idempotency_key=IdempotencyKey(str(index + 1) * 64),
                request_id=f"req_concurrent_update_{index}",
            )
        except ApiError as error:
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(update, (0, 1)))

    successes = [item for item in outcomes if not isinstance(item, ApiError)]
    failures = [item for item in outcomes if isinstance(item, ApiError)]
    assert len(successes) == 1
    assert [error.code for error in failures] == ["TODO_CONFLICT"]
    with postgres_engine.connect() as connection:
        assert (
            connection.execute(text("SELECT count(*) FROM plan_tasks")).scalar_one()
            == 1
        )


def test_todos_never_read_or_mutate_official_plan_tasks(postgres_engine: Any) -> None:
    plan_id = uuid4()
    official_task_id = uuid4()
    todo_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO plans
                    (id, user_id, track, role, season, weekly_hours,
                     diagnostic_status, diagnostic_score, diagnostic_scores,
                     status, version, created_at, updated_at)
                VALUES
                    (:id, :user_id, 'internship', 'quantTrading', '2027-summer', 8,
                     'pending', 0, '{}'::jsonb, 'active', 1, :now, :now)
                """
            ),
            {"id": plan_id, "user_id": USER_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO plan_tasks
                    (id, user_id, plan_id, title, status, sort_order, version,
                     completed_at, created_at, updated_at)
                VALUES
                    (:official_id, :user_id, :plan_id, 'Official', 'open', 0, 1,
                     NULL, :now, :now),
                    (:todo_id, :user_id, NULL, 'Todo', 'open', 0, 1,
                     NULL, :now, :now)
                """
            ),
            {
                "official_id": official_task_id,
                "todo_id": todo_id,
                "user_id": USER_ID,
                "plan_id": plan_id,
                "now": NOW,
            },
        )

    service = PlansService(postgres_engine, clock=lambda: NOW)
    assert [item.id for item in service.list(user_id=USER_ID)] == [todo_id]
    with pytest.raises(ApiError) as update_error:
        service.update(
            user_id=USER_ID,
            task_id=official_task_id,
            payload=UpdateTodoRequest(title="Todo overwrite", version=1),
            idempotency_key=IdempotencyKey("7" * 64),
            request_id="req_todo_official_update",
        )
    assert update_error.value.code == "TODO_NOT_FOUND"
    with pytest.raises(ApiError) as complete_error:
        service.complete(
            user_id=USER_ID,
            task_id=official_task_id,
            payload=CompleteTodoRequest(version=1),
            idempotency_key=IdempotencyKey("8" * 64),
            request_id="req_todo_official_complete",
        )
    assert complete_error.value.code == "TODO_NOT_FOUND"
    with pytest.raises(ApiError) as delete_error:
        service.delete(
            user_id=USER_ID,
            task_id=official_task_id,
            version=1,
            idempotency_key=IdempotencyKey("9" * 64),
            request_id="req_todo_official_delete",
        )
    assert delete_error.value.code == "TODO_NOT_FOUND"


def _diagnostic_payload(*, plan_version: int) -> RunPlanDiagnosticRequest:
    choices = {
        "mm-percent": "42.5",
        "prob-coin": "3/8",
        "prob-die": "3.5",
        "stats-pvalue": "null-hypothesis-tail",
        "market-spread": "buy-from-market-maker",
        "option-call": "premium-paid",
        "code-two-sum": "hash-map",
        "research-validation": "walk-forward",
    }
    return RunPlanDiagnosticRequest(
        plan_version=plan_version,
        definition_version="baseline-v1",
        answers=tuple(
            DiagnosticAnswerRequest(question_id=question_id, option_id=option_id)
            for question_id, option_id in choices.items()
        ),
    )


def _insert_diagnostic_catalog(postgres_engine: Any) -> UUID:
    source_id = uuid4()
    older_problem_id = uuid4()
    latest_problem_id = uuid4()
    earlier = NOW - timedelta(days=1)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status, release_scope,
                     created_at, updated_at)
                VALUES
                    (:id, 'task5-diagnostic', 'Task5 diagnostic', 'v1',
                     'internal_preview', 'preview', :now, :now)
                """
            ),
            {"id": source_id, "now": earlier},
        )
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, title_en, prompt_zh,
                     prompt_en, category, difficulty, tags, companies, hot100,
                     version, created_at, updated_at)
                VALUES
                    (:older_id, :source_id, 'task5-older', '较早优化题',
                     'Older optimization', '题目', 'Problem', 'Optimization',
                     'Easy', '[]'::jsonb, '[]'::jsonb, false, 1,
                     :earlier, :earlier),
                    (:latest_id, :source_id, 'task5-latest', '最新优化题',
                     'Latest optimization', '题目', 'Problem', 'Optimization',
                     'Hard', '[]'::jsonb, '[]'::jsonb, false, 1,
                     :now, :now)
                """
            ),
            {
                "older_id": older_problem_id,
                "latest_id": latest_problem_id,
                "source_id": source_id,
                "earlier": earlier,
                "now": NOW,
            },
        )
    return latest_problem_id


def _insert_blocked_latest_catalog(postgres_engine: Any) -> None:
    older_source_id = uuid4()
    blocked_source_id = uuid4()
    earlier = NOW - timedelta(days=2)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status, release_scope,
                     created_at, updated_at)
                VALUES
                    (:older_id, 'task5-versioned', 'Older source', 'v1',
                     'internal_preview', 'preview', :earlier, :earlier),
                    (:blocked_id, 'task5-versioned', 'Blocked newest', 'v2',
                     'blocked', 'preview', :now, :now)
                """
            ),
            {
                "older_id": older_source_id,
                "blocked_id": blocked_source_id,
                "earlier": earlier,
                "now": NOW,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, prompt_zh, category,
                     difficulty, tags, companies, hot100, version,
                     created_at, updated_at)
                VALUES
                    (:older_problem, :older_source, 'older-visible', '旧版本题',
                     '题目', 'Optimization', 'Easy', '[]'::jsonb, '[]'::jsonb,
                     false, 1, :earlier, :earlier),
                    (:blocked_problem, :blocked_source, 'newest-blocked', '阻止题',
                     '题目', 'Optimization', 'Hard', '[]'::jsonb, '[]'::jsonb,
                     false, 1, :now, :now)
                """
            ),
            {
                "older_problem": uuid4(),
                "blocked_problem": uuid4(),
                "older_source": older_source_id,
                "blocked_source": blocked_source_id,
                "earlier": earlier,
                "now": NOW,
            },
        )


def _insert_blocked_successor(
    postgres_engine: Any,
    *,
    slug: str = "task5-diagnostic",
) -> UUID:
    source_id = uuid4()
    later = NOW + timedelta(days=1)
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status, release_scope,
                     created_at, updated_at)
                VALUES
                    (:id, :slug, 'Blocked successor', 'v2', 'blocked', 'preview',
                     :later, :later)
                """
            ),
            {"id": source_id, "slug": slug, "later": later},
        )
    return source_id


def _insert_newer_optimization_problem(
    postgres_engine: Any,
    *,
    existing_problem_id: UUID,
) -> UUID:
    problem_id = uuid4()
    later = NOW + timedelta(days=1)
    with postgres_engine.begin() as connection:
        source_id = connection.execute(
            text("SELECT source_id FROM problems WHERE id = :problem_id"),
            {"problem_id": existing_problem_id},
        ).scalar_one()
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, title_en, prompt_zh,
                     prompt_en, category, difficulty, tags, companies, hot100,
                     version, created_at, updated_at)
                VALUES
                    (:id, :source_id, 'task5-rebound', '新一轮优化题',
                     'Rebound optimization', '题目', 'Problem', 'Optimization',
                     'Medium', '[]'::jsonb, '[]'::jsonb, false, 1,
                     :later, :later)
                """
            ),
            {"id": problem_id, "source_id": source_id, "later": later},
        )
    return problem_id


def test_official_plan_create_diagnostic_cas_and_typed_replay(
    postgres_engine: Any,
) -> None:
    latest_problem_id = _insert_diagnostic_catalog(postgres_engine)
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    create_payload = CreatePlanRequest(
        track="internship",
        role="quantTrading",
        season="2027-summer",
        weekly_hours=8,
    )
    create_key = IdempotencyKey("a1" * 32)
    created = service.create_plan(
        user_id=USER_ID,
        payload=create_payload,
        idempotency_key=create_key,
    )
    with pytest.raises(ApiError) as reused_create:
        service.create_plan(
            user_id=USER_ID,
            payload=CreatePlanRequest(
                track="internship",
                role="quantTrading",
                season="2027-summer",
                weekly_hours=12,
            ),
            idempotency_key=create_key,
        )
    assert reused_create.value.code == "IDEMPOTENCY_KEY_REUSED"
    current = service.get_current(user_id=USER_ID)
    assert current is not None
    assert current.plan.id == created.plan_id
    assert current.plan.version == 1
    assert len(current.tasks) == len(created.task_ids) == 4
    assert all(task.plan_id == created.plan_id for task in current.tasks)

    diagnostic_key = IdempotencyKey("b2" * 32)
    diagnosed = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=diagnostic_key,
    )
    after_diagnostic = service.get_current(user_id=USER_ID)
    assert after_diagnostic is not None
    assert after_diagnostic.plan.version == diagnosed.plan_version == 2
    assert after_diagnostic.plan.diagnostic_status == "completed"
    assert after_diagnostic.plan.diagnostic_score == 100
    assert diagnosed.recommendation_ids
    assert all(
        item.provenance_type == "diagnostic"
        and item.provenance_resource_id == created.plan_id
        for item in after_diagnostic.recommendations
    )
    weakest = after_diagnostic.recommendations[0]
    assert (weakest.kind, weakest.skill_key, weakest.problem_id) == (
        "problem",
        "leetcode",
        latest_problem_id,
    )
    linked_tasks = [
        task for task in after_diagnostic.tasks if task.target_problem_id is not None
    ]
    assert len(linked_tasks) == 1
    assert linked_tasks[0].target_problem_id == latest_problem_id
    assert linked_tasks[0].recommendation_id == weakest.id
    assert linked_tasks[0].version == 2
    overview = DashboardService(postgres_engine, clock=lambda: NOW).get_overview(
        user_id=USER_ID
    )
    assert overview.today_task is not None
    assert overview.today_task.id == linked_tasks[0].id
    assert overview.today_task.action_resource_id == latest_problem_id

    plain_fingerprint = request_fingerprint(
        event_type="plan.run-diagnostic",
        resource_id="current",
        payload=_diagnostic_payload(plan_version=1).model_dump(
            mode="json",
            by_alias=True,
        ),
    )
    with postgres_engine.connect() as connection:
        idempotency_row = connection.execute(
            text(
                """
                SELECT request_hash, response_snapshot
                FROM idempotency_records
                WHERE user_id = :user_id
                  AND operation = 'plan.run-diagnostic'
                """
            ),
            {"user_id": USER_ID},
        ).mappings().one()
    assert idempotency_row["request_hash"].rstrip() != plain_fingerprint
    snapshot_text = json.dumps(idempotency_row["response_snapshot"], sort_keys=True)
    assert "answer" not in snapshot_text.lower()
    assert "walk-forward" not in snapshot_text

    rediagnosed = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=2),
        idempotency_key=IdempotencyKey("c3" * 32),
    )
    after_rediagnostic = service.get_current(user_id=USER_ID)
    assert after_rediagnostic is not None
    assert rediagnosed.plan_version == after_rediagnostic.plan.version == 3
    assert set(rediagnosed.recommendation_ids) == set(diagnosed.recommendation_ids)
    assert len(after_rediagnostic.recommendations) == len(diagnosed.recommendation_ids)
    assert len(after_rediagnostic.tasks) == 4
    rebound = [
        task
        for task in after_rediagnostic.tasks
        if task.target_problem_id == latest_problem_id
    ]
    assert len(rebound) == 1
    assert rebound[0].id == linked_tasks[0].id

    first_task = after_rediagnostic.tasks[0]
    updated = service.update_plan_task(
        user_id=USER_ID,
        task_id=first_task.id,
        payload=UpdatePlanTaskRequest(
            plan_version=3,
            task_version=first_task.version,
            title="Updated official task",
        ),
    )
    assert updated.plan_version == 4
    assert updated.task.version == first_task.version + 1

    second_task = after_rediagnostic.tasks[1]
    completed = service.complete_plan_task(
        user_id=USER_ID,
        task_id=second_task.id,
        payload=CompletePlanTaskRequest(
            plan_version=4,
            task_version=second_task.version,
        ),
    )
    assert completed.plan_version == 5
    assert completed.task.status == "completed"
    progressed = service.get_current(user_id=USER_ID)
    assert progressed is not None
    assert progressed.completed_tasks == 1

    replayed_create = service.create_plan(
        user_id=USER_ID,
        payload=create_payload,
        idempotency_key=create_key,
    )
    replayed_diagnostic = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=diagnostic_key,
    )
    assert replayed_create == created
    assert replayed_diagnostic == diagnosed

    with pytest.raises(ApiError) as stale:
        service.update_plan_task(
            user_id=USER_ID,
            task_id=first_task.id,
            payload=UpdatePlanTaskRequest(
                plan_version=2,
                task_version=updated.task.version,
                title="Stale plan write",
            ),
        )
    assert stale.value.code == "PLAN_CONFLICT"

    with pytest.raises(ApiError) as stale_task:
        service.update_plan_task(
            user_id=USER_ID,
            task_id=first_task.id,
            payload=UpdatePlanTaskRequest(
                plan_version=5,
                task_version=first_task.version,
                title="Stale task write",
            ),
        )
    assert stale_task.value.code == "PLAN_TASK_CONFLICT"

    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO users
                    (id, email, normalized_email, password_hash, display_name,
                     status, email_verified_at, created_at, updated_at)
                VALUES
                    (:id, 'other@example.com', 'other@example.com', NULL, 'Other',
                     'active', :now, :now, :now)
                """
            ),
            {"id": OTHER_USER_ID, "now": NOW},
        )
    assert service.get_current(user_id=OTHER_USER_ID) is None
    with pytest.raises(ApiError) as isolated:
        service.update_plan_task(
            user_id=OTHER_USER_ID,
            task_id=first_task.id,
            payload=UpdatePlanTaskRequest(
                plan_version=5,
                task_version=updated.task.version,
                title="Cross-user write",
            ),
        )
    assert isolated.value.code == "PLAN_NOT_FOUND"


def test_concurrent_official_plan_creation_keeps_one_active_plan(
    postgres_engine: Any,
) -> None:
    services = (
        PlansService(postgres_engine, clock=lambda: NOW),
        PlansService(postgres_engine, clock=lambda: NOW),
    )
    payload = CreatePlanRequest(
        track="fulltime",
        role="quantResearch",
        season="2028-summer",
        weekly_hours=8,
    )
    barrier = Barrier(2)

    def create(index: int) -> Any:
        barrier.wait(timeout=10)
        try:
            return services[index].create_plan(
                user_id=USER_ID,
                payload=payload,
                idempotency_key=IdempotencyKey(str(index + 4) * 64),
            )
        except ApiError as error:
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(create, (0, 1)))

    successes = [item for item in outcomes if not isinstance(item, ApiError)]
    failures = [item for item in outcomes if isinstance(item, ApiError)]
    assert len(successes) == 1
    assert [error.code for error in failures] == ["PLAN_ALREADY_ACTIVE"]
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM plans WHERE status = 'active'")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_records WHERE operation = 'plan.create'")
        ).scalar_one() == 1


def test_diagnostic_replay_survives_archival_and_replacement_plan(
    postgres_engine: Any,
) -> None:
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    create_payload = CreatePlanRequest(
        track="internship",
        role="quantResearch",
        season="2027-summer",
        weekly_hours=5,
    )
    first_plan = service.create_plan(
        user_id=USER_ID,
        payload=create_payload,
        idempotency_key=IdempotencyKey("f6" * 32),
    )
    payload = _diagnostic_payload(plan_version=1)
    durable_key = IdempotencyKey("a7" * 32)
    first_result = service.run_diagnostic(
        user_id=USER_ID,
        payload=payload,
        idempotency_key=durable_key,
    )

    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE plans
                SET status = 'archived', version = version + 1, updated_at = :now
                WHERE id = :plan_id AND user_id = :user_id
                """
            ),
            {"plan_id": first_plan.plan_id, "user_id": USER_ID, "now": NOW},
        )

    assert service.get_current(user_id=USER_ID) is None
    assert service.run_diagnostic(
        user_id=USER_ID,
        payload=payload,
        idempotency_key=durable_key,
    ) == first_result

    replacement = service.create_plan(
        user_id=USER_ID,
        payload=create_payload,
        idempotency_key=IdempotencyKey("b8" * 32),
    )
    assert replacement.plan_id != first_plan.plan_id
    assert service.run_diagnostic(
        user_id=USER_ID,
        payload=payload,
        idempotency_key=durable_key,
    ) == first_result
    untouched = service.get_current(user_id=USER_ID)
    assert untouched is not None
    assert (untouched.plan.id, untouched.plan.version) == (replacement.plan_id, 1)

    fresh_result = service.run_diagnostic(
        user_id=USER_ID,
        payload=payload,
        idempotency_key=IdempotencyKey("c9" * 32),
    )
    assert fresh_result.plan_id == replacement.plan_id
    with postgres_engine.connect() as connection:
        hashes = connection.execute(
            text(
                """
                SELECT request_hash
                FROM idempotency_records
                WHERE user_id = :user_id
                  AND operation = 'plan.run-diagnostic'
                ORDER BY created_at, id
                """
            ),
            {"user_id": USER_ID},
        ).scalars().all()
    assert len(hashes) == 2
    assert len(set(hashes)) == 2


def test_diagnostic_never_falls_back_when_latest_source_version_is_blocked(
    postgres_engine: Any,
) -> None:
    _insert_blocked_latest_catalog(postgres_engine)
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    service.create_plan(
        user_id=USER_ID,
        payload=CreatePlanRequest(
            track="internship",
            role="quantDeveloper",
            season="2027-summer",
            weekly_hours=8,
        ),
        idempotency_key=IdempotencyKey("d4" * 32),
    )
    service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=IdempotencyKey("e5" * 32),
    )

    current = service.get_current(user_id=USER_ID)
    assert current is not None
    assert current.recommendations
    assert all(item.problem_id is None for item in current.recommendations)
    assert all(task.target_problem_id is None for task in current.tasks)


def test_current_snapshot_and_rediagnostic_hide_blocked_successor(
    postgres_engine: Any,
) -> None:
    original_problem_id = _insert_diagnostic_catalog(postgres_engine)
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    service.create_plan(
        user_id=USER_ID,
        payload=CreatePlanRequest(
            track="internship",
            role="quantDeveloper",
            season="2027-summer",
            weekly_hours=8,
        ),
        idempotency_key=IdempotencyKey("da" * 32),
    )
    diagnosed = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=IdempotencyKey("eb" * 32),
    )
    before = service.get_current(user_id=USER_ID)
    assert before is not None
    linked_task = next(
        task for task in before.tasks if task.target_problem_id == original_problem_id
    )
    linked_recommendation = next(
        item for item in before.recommendations if item.id == linked_task.recommendation_id
    )

    task_read = Event()
    release_reader = Event()
    observed_isolation_levels: list[str | None] = []

    def pause_after_task_projection(
        connection: Any,
        _cursor: Any,
        statement: str,
        _parameters: Any,
        _context: Any,
        _executemany: bool,
    ) -> None:
        if not current_thread().name.startswith("current-reader"):
            return
        if "AS target_problem_visible" not in statement:
            return
        observed_isolation_levels.append(
            connection.get_execution_options().get("isolation_level")
        )
        task_read.set()
        assert release_reader.wait(timeout=10)

    event.listen(postgres_engine, "after_cursor_execute", pause_after_task_projection)
    try:
        with ThreadPoolExecutor(
            max_workers=1,
            thread_name_prefix="current-reader",
        ) as executor:
            pending = executor.submit(service.get_current, user_id=USER_ID)
            assert task_read.wait(timeout=10)
            _insert_blocked_successor(postgres_engine)
            release_reader.set()
            snapshot = pending.result(timeout=10)
    finally:
        release_reader.set()
        event.remove(
            postgres_engine,
            "after_cursor_execute",
            pause_after_task_projection,
        )

    assert observed_isolation_levels == ["REPEATABLE READ"]
    assert snapshot is not None
    assert any(
        task.target_problem_id == original_problem_id for task in snapshot.tasks
    )
    assert any(
        item.problem_id == original_problem_id for item in snapshot.recommendations
    )

    after_block = service.get_current(user_id=USER_ID)
    assert after_block is not None
    assert all(task.target_problem_id is None for task in after_block.tasks)
    assert all(item.problem_id is None for item in after_block.recommendations)

    rediagnosed = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=2),
        idempotency_key=IdempotencyKey("fc" * 32),
    )
    assert set(rediagnosed.recommendation_ids) == set(
        diagnosed.recommendation_ids
    )
    current = service.get_current(user_id=USER_ID)
    assert current is not None
    refreshed = next(
        item for item in current.recommendations if item.id == linked_recommendation.id
    )
    assert (refreshed.kind, refreshed.problem_id) == ("skill", None)
    with postgres_engine.connect() as connection:
        persisted = connection.execute(
            text(
                """
                SELECT recommendation_id, target_problem_id, title
                FROM plan_tasks
                WHERE id = :task_id AND user_id = :user_id
                """
            ),
            {"task_id": linked_task.id, "user_id": USER_ID},
        ).mappings().one()
    assert persisted["recommendation_id"] is None
    assert persisted["target_problem_id"] is None
    assert persisted["title"] == "leetcode 针对性训练"


def test_diagnostic_binding_does_not_steal_foreign_recommendation_task(
    postgres_engine: Any,
) -> None:
    problem_id = _insert_diagnostic_catalog(postgres_engine)
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    created = service.create_plan(
        user_id=USER_ID,
        payload=CreatePlanRequest(
            track="internship",
            role="quantDeveloper",
            season="2027-summer",
            weekly_hours=8,
        ),
        idempotency_key=IdempotencyKey("0a" * 32),
    )
    current = service.get_current(user_id=USER_ID)
    assert current is not None
    foreign_task = min(
        (task for task in current.tasks if task.action_target == "problems"),
        key=lambda task: task.sort_order,
    )
    foreign_recommendation_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO recommendations
                    (id, user_id, plan_id, problem_id, kind, skill_key,
                     rationale, provenance_type, provenance_resource_id,
                     dedupe_key, rank, status, version, created_at, updated_at)
                VALUES
                    (:id, :user_id, :plan_id, :problem_id, 'task', 'leetcode',
                     '系统已归属任务', 'system', :plan_id,
                     :dedupe_key, 99, 'active', 1, :now, :now)
                """
            ),
            {
                "id": foreign_recommendation_id,
                "user_id": USER_ID,
                "plan_id": created.plan_id,
                "problem_id": problem_id,
                "dedupe_key": "f" * 64,
                "now": NOW,
            },
        )
        connection.execute(
            text(
                """
                UPDATE plan_tasks
                SET recommendation_id = :recommendation_id,
                    target_problem_id = :problem_id,
                    version = version + 1,
                    updated_at = :now
                WHERE id = :task_id
                  AND user_id = :user_id
                  AND plan_id = :plan_id
                """
            ),
            {
                "recommendation_id": foreign_recommendation_id,
                "problem_id": problem_id,
                "now": NOW,
                "task_id": foreign_task.id,
                "user_id": USER_ID,
                "plan_id": created.plan_id,
            },
        )

    diagnosed = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=IdempotencyKey("1b" * 32),
    )
    after = service.get_current(user_id=USER_ID)
    assert after is not None
    preserved = next(task for task in after.tasks if task.id == foreign_task.id)
    assert preserved.recommendation_id == foreign_recommendation_id
    assert preserved.target_problem_id == problem_id
    diagnostic_bindings = [
        task
        for task in after.tasks
        if task.recommendation_id in set(diagnosed.recommendation_ids)
        and task.target_problem_id == problem_id
    ]
    assert len(diagnostic_bindings) == 1
    assert diagnostic_bindings[0].id != foreign_task.id


def test_active_training_keeps_old_target_when_recommendation_rebinds(
    postgres_engine: Any,
) -> None:
    original_problem_id = _insert_diagnostic_catalog(postgres_engine)
    service = PlansService(
        postgres_engine,
        clock=lambda: NOW,
        fingerprint_secret=FINGERPRINT_SECRET,
    )
    created = service.create_plan(
        user_id=USER_ID,
        payload=CreatePlanRequest(
            track="fulltime",
            role="quantDeveloper",
            season="2028-summer",
            weekly_hours=8,
        ),
        idempotency_key=IdempotencyKey("1d" * 32),
    )
    first_diagnostic = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=1),
        idempotency_key=IdempotencyKey("2e" * 32),
    )
    first_current = service.get_current(user_id=USER_ID)
    assert first_current is not None
    original_task = next(
        task
        for task in first_current.tasks
        if task.target_problem_id == original_problem_id
    )
    recommendation_id = original_task.recommendation_id
    assert recommendation_id is not None
    session_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO training_sessions
                    (id, user_id, problem_id, plan_task_id, status, version,
                     started_at, last_activity_at, created_at, updated_at)
                VALUES
                    (:id, :user_id, :problem_id, :plan_task_id, 'active', 1,
                     :now, :now, :now, :now)
                """
            ),
            {
                "id": session_id,
                "user_id": USER_ID,
                "problem_id": original_problem_id,
                "plan_task_id": original_task.id,
                "now": NOW,
            },
        )

    same_problem = service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=2),
        idempotency_key=IdempotencyKey("3f" * 32),
    )
    assert set(same_problem.recommendation_ids) == set(
        first_diagnostic.recommendation_ids
    )
    unchanged = service.get_current(user_id=USER_ID)
    assert unchanged is not None
    assert len(
        [
            task
            for task in unchanged.tasks
            if task.target_problem_id == original_problem_id
        ]
    ) == 1

    rebound_problem_id = _insert_newer_optimization_problem(
        postgres_engine,
        existing_problem_id=original_problem_id,
    )
    service.run_diagnostic(
        user_id=USER_ID,
        payload=_diagnostic_payload(plan_version=3),
        idempotency_key=IdempotencyKey("40" * 32),
    )
    rebound = service.get_current(user_id=USER_ID)
    assert rebound is not None
    old_task = next(task for task in rebound.tasks if task.id == original_task.id)
    new_task = next(
        task for task in rebound.tasks if task.target_problem_id == rebound_problem_id
    )
    assert old_task.target_problem_id == original_problem_id
    assert old_task.recommendation_id is None
    assert new_task.id != old_task.id
    assert new_task.recommendation_id == recommendation_id
    linked_recommendation = next(
        item for item in rebound.recommendations if item.id == recommendation_id
    )
    assert linked_recommendation.problem_id == rebound_problem_id
    assert len(rebound.tasks) == len(created.task_ids)
    with postgres_engine.connect() as connection:
        session = connection.execute(
            text(
                """
                SELECT status, problem_id, plan_task_id
                FROM training_sessions
                WHERE id = :session_id AND user_id = :user_id
                """
            ),
            {"session_id": session_id, "user_id": USER_ID},
        ).mappings().one()
    assert dict(session) == {
        "status": "active",
        "problem_id": original_problem_id,
        "plan_task_id": original_task.id,
    }


def test_training_backed_task_requires_server_completion_and_helper_is_once(
    postgres_engine: Any,
) -> None:
    problem_source_id = uuid4()
    problem_id = uuid4()
    plan_id = uuid4()
    task_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_sources
                    (id, slug, name, content_version, rights_status, release_scope,
                     created_at, updated_at)
                VALUES
                    (:id, 'task5-source', 'Task5 source', 'v1',
                     'internal_preview', 'preview', :now, :now)
                """
            ),
            {"id": problem_source_id, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO problems
                    (id, source_id, external_key, title_zh, title_en, prompt_zh,
                     prompt_en, category, difficulty, tags, companies, hot100,
                     version, created_at, updated_at)
                VALUES
                    (:id, :source_id, 'task5-problem', 'Task5 题目', 'Task5 problem',
                     '题目', 'Problem', 'probabilityExpectation', 'Medium', '[]'::jsonb,
                     '[]'::jsonb, false, 1, :now, :now)
                """
            ),
            {"id": problem_id, "source_id": problem_source_id, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO plans
                    (id, user_id, track, role, season, weekly_hours,
                     diagnostic_status, diagnostic_score, diagnostic_scores,
                     status, version, created_at, updated_at)
                VALUES
                    (:id, :user_id, 'internship', 'quantTrading', '2027-summer', 8,
                     'pending', 0, '{}'::jsonb, 'active', 1, :now, :now)
                """
            ),
            {"id": plan_id, "user_id": USER_ID, "now": NOW},
        )
        connection.execute(
            text(
                """
                INSERT INTO plan_tasks
                    (id, user_id, plan_id, target_problem_id, title, detail,
                     status, sort_order, version, completed_at, action_target,
                     created_at, updated_at)
                VALUES
                    (:id, :user_id, :plan_id, :problem_id, '训练任务', '完成指定题目',
                     'open', 0, 1, NULL, 'problems', :now, :now)
                """
            ),
            {
                "id": task_id,
                "user_id": USER_ID,
                "plan_id": plan_id,
                "problem_id": problem_id,
                "now": NOW,
            },
        )

    service = PlansService(postgres_engine, clock=lambda: NOW)
    with pytest.raises(ApiError) as public_complete:
        service.complete_plan_task(
            user_id=USER_ID,
            task_id=task_id,
            payload=CompletePlanTaskRequest(plan_version=1, task_version=1),
        )
    assert public_complete.value.code == "PLAN_TASK_REQUIRES_TRAINING"

    with postgres_engine.begin() as connection:
        effect = apply_training_plan_effect(
            connection,
            user_id=USER_ID,
            plan_task_id=task_id,
            problem_id=problem_id,
            completed_at=NOW,
        )
    assert effect is not None
    assert (effect.task_completed, effect.plan_version) == (True, 2)

    with postgres_engine.begin() as connection:
        replay_effect = apply_training_plan_effect(
            connection,
            user_id=USER_ID,
            plan_task_id=task_id,
            problem_id=problem_id,
            completed_at=NOW,
        )
    assert replay_effect is not None
    assert (replay_effect.task_completed, replay_effect.plan_version) == (False, 2)

    with postgres_engine.begin() as connection:
        connection.execute(
            text("UPDATE plans SET status = 'archived' WHERE id = :plan_id"),
            {"plan_id": plan_id},
        )
        connection.execute(
            text(
                """
                UPDATE plan_tasks
                SET status = 'open', completed_at = NULL
                WHERE id = :task_id
                """
            ),
            {"task_id": task_id},
        )
    with postgres_engine.begin() as connection:
        with pytest.raises(ApiError) as archived:
            apply_training_plan_effect(
                connection,
                user_id=USER_ID,
                plan_task_id=task_id,
                problem_id=problem_id,
                completed_at=NOW,
            )
    assert archived.value.code == "PLAN_TASK_NOT_FOUND"
    with postgres_engine.connect() as connection:
        archived_row = connection.execute(
            text("SELECT status, version FROM plan_tasks WHERE id = :task_id"),
            {"task_id": task_id},
        ).one()
    assert archived_row == ("open", 2)
