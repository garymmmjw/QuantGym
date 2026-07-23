from __future__ import annotations

from contextlib import suppress
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from threading import Barrier
from typing import Any, Iterator
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, text

from api.app.errors import ApiError
from api.app.idempotency import IdempotencyKey
from api.app.notifications.service import NotificationsService
from api.app.plans.schemas import (
    CompleteTodoRequest,
    CreateTodoRequest,
    UpdateTodoRequest,
)
from api.app.plans.service import PlansService
from api.app.preferences.schemas import UpdatePreferencesRequest
from api.app.preferences.service import PreferencesService


REPO_ROOT = Path(__file__).resolve().parents[3]
USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
NOW = datetime(2026, 7, 23, 8, tzinfo=UTC)
_APPLICATION_TABLES = (
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
