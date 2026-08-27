from __future__ import annotations

import json
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Barrier
from typing import Any, Iterator
from uuid import UUID, uuid4

import pytest
from sqlalchemy import create_engine, text

from api.app.errors import ApiError
from api.app.problems.schemas import SaveNoteRequest, SetFavoriteRequest
from api.app.problems.service import ProblemsService
from api.scripts.import_problem_catalog import (
    CatalogImportError,
    import_preview_catalog,
)


REPO_ROOT = Path(__file__).resolve().parents[3]
CATALOG_PATH = REPO_ROOT / "api" / "catalogs" / "phase2-preview-v1.json"
USER_A = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
USER_B = UUID("d8f998ec-64c5-474f-88cf-1db3f51b9247")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)
_APPLICATION_TABLES = (
    "answers",
    "attempts",
    "audit_events",
    "auth_challenges",
    "favorites",
    "idempotency_records",
    "media_objects",
    "notes",
    "notifications",
    "plan_tasks",
    "preferences",
    "problem_progress",
    "recommendations",
    "sessions",
    "training_events",
    "training_sessions",
    "user_identities",
    "xp_ledger",
    "plans",
    "problems",
    "problem_sources",
    "users",
)


def _postgres_dependencies_available() -> bool:
    try:
        import alembic  # noqa: F401
        import psycopg  # noqa: F401
        import testcontainers.postgres  # noqa: F401
    except ImportError:
        return False
    return True


@pytest.fixture(scope="module")
def postgres_engine() -> Iterator[Any]:
    if not _postgres_dependencies_available():
        pytest.skip("locked PostgreSQL integration dependencies are unavailable")

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
            server_major = int(
                connection.exec_driver_sql("SHOW server_version_num").scalar_one()
            ) // 10_000
            assert server_major == 18
        yield engine
    finally:
        engine.dispose()
        with suppress(Exception):
            container.stop()


@pytest.fixture(autouse=True)
def preview_accounts(postgres_engine: Any) -> Iterator[None]:
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
                    (:user_a, 'a@example.com', 'a@example.com', NULL, 'A',
                     'active', :now, :now, :now),
                    (:user_b, 'b@example.com', 'b@example.com', NULL, 'B',
                     'active', :now, :now, :now)
                """
            ),
            {"now": NOW, "user_a": USER_A, "user_b": USER_B},
        )
    result = import_preview_catalog(postgres_engine, path=CATALOG_PATH, now=NOW)
    assert (result.inserted_sources, result.inserted_problems) == (2, 6)
    yield


def _service(engine: Any) -> ProblemsService:
    return ProblemsService(engine, clock=lambda: NOW)


def _list(
    service: ProblemsService,
    *,
    user_id: UUID = USER_A,
    query: str | None = None,
    source: str | None = None,
    difficulty: str | None = None,
    status: str | None = None,
    favorite: bool | None = None,
    hot100: bool | None = None,
    daily: bool = False,
    cursor: str | None = None,
    limit: int = 20,
) -> Any:
    return service.list(
        user_id=user_id,
        query=query,
        source=source,
        difficulty=difficulty,
        status=status,
        favorite=favorite,
        hot100=hot100,
        daily=daily,
        cursor=cursor,
        limit=limit,
    )


def _problem_id(engine: Any, external_key: str) -> UUID:
    with engine.connect() as connection:
        return connection.execute(
            text(
                """
                SELECT p.id
                FROM problems AS p
                JOIN problem_sources AS ps ON ps.id = p.source_id
                WHERE p.external_key = :external_key
                ORDER BY ps.created_at DESC, ps.id DESC
                LIMIT 1
                """
            ),
            {"external_key": external_key},
        ).scalar_one()


def _write_version_fixture(tmp_path: Path, content_version: str) -> Path:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    payload["contentVersion"] = content_version
    path = tmp_path / f"catalog-{content_version}.json"
    path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")
    return path


def test_import_is_immutable_and_only_latest_source_version_is_visible(
    postgres_engine: Any,
    tmp_path: Path,
) -> None:
    with postgres_engine.connect() as connection:
        original_timestamps = connection.execute(
            text(
                """
                SELECT slug, created_at, updated_at
                FROM problem_sources
                ORDER BY slug
                """
            )
        ).all()

    replay = import_preview_catalog(
        postgres_engine,
        path=CATALOG_PATH,
        now=NOW + timedelta(hours=1),
    )
    assert (replay.inserted_sources, replay.inserted_problems) == (0, 0)
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT slug, created_at, updated_at
                FROM problem_sources
                ORDER BY slug
                """
            )
        ).all() == original_timestamps

    v2_path = _write_version_fixture(tmp_path, "2026-07-27.2")
    v2 = import_preview_catalog(
        postgres_engine,
        path=v2_path,
        now=NOW + timedelta(days=1),
    )
    assert (v2.inserted_sources, v2.inserted_problems) == (2, 6)
    with postgres_engine.connect() as connection:
        v2_created_at = connection.execute(
            text(
                """
                SELECT slug, created_at
                FROM problem_sources
                WHERE content_version = '2026-07-27.2'
                ORDER BY slug
                """
            )
        ).all()
    v2_replay = import_preview_catalog(
        postgres_engine,
        path=v2_path,
        now=NOW + timedelta(days=2),
    )
    assert (v2_replay.inserted_sources, v2_replay.inserted_problems) == (0, 0)
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT slug, created_at
                FROM problem_sources
                WHERE content_version = '2026-07-27.2'
                ORDER BY slug
                """
            )
        ).all() == v2_created_at
        assert connection.execute(text("SELECT count(*) FROM problems")).scalar_one() == 12

    service = _service(postgres_engine)
    page = _list(service)
    assert len(page.items) == 6
    assert {item.source.content_version for item in page.items} == {"2026-07-27.2"}
    assert {item.content_version for item in page.available_sources} == {
        "2026-07-27.2"
    }

    seen: list[UUID] = []
    cursor: str | None = None
    while True:
        page = _list(service, cursor=cursor, limit=2)
        seen.extend(item.problem.id for item in page.items)
        cursor = page.next_cursor
        if cursor is None:
            break
    assert len(seen) == len(set(seen)) == 6

    first_page = _list(service, limit=2)
    assert first_page.next_cursor is not None
    with pytest.raises(ApiError) as changed_filter:
        _list(service, cursor=first_page.next_cursor, hot100=True, limit=2)
    assert changed_filter.value.code == "PROBLEM_CURSOR_INVALID"

    assert _list(service, query="HIDDEN_HINT_ONLY_5832").items == []
    assert _list(service, query="ORACLE_SOLUTION_ONLY_9471").items == []
    visible_search = _list(service, query="贝叶斯")
    assert len(visible_search.items) == 1
    safe = visible_search.items[0].problem
    assert (safe.prompt_zh, safe.hint_zh, safe.solution_zh, safe.source_url) == (
        None,
        None,
        None,
        None,
    )
    detail = service.get_detail(user_id=USER_A, problem_id=safe.id)
    assert detail.problem.prompt_zh
    assert (detail.problem.hint_zh, detail.problem.solution_zh) == (None, None)


def test_rights_and_release_scope_fail_closed_without_old_version_fallback(
    postgres_engine: Any,
    tmp_path: Path,
) -> None:
    import_preview_catalog(
        postgres_engine,
        path=_write_version_fixture(tmp_path, "2026-07-27.2"),
        now=NOW + timedelta(days=1),
    )
    probability_id = _problem_id(postgres_engine, "coin-bayes-001")
    market_id = _problem_id(postgres_engine, "forward-price-001")
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                UPDATE problem_sources
                SET rights_status = 'blocked'
                WHERE slug = 'phase2-preview-probability'
                  AND content_version = '2026-07-27.2'
                """
            )
        )
        connection.execute(
            text(
                """
                UPDATE problem_sources
                SET rights_status = 'approved', release_scope = 'public'
                WHERE slug = 'phase2-preview-markets'
                  AND content_version = '2026-07-27.2'
                """
            )
        )
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM problem_sources
                WHERE content_version = '2026-07-27.1'
                  AND rights_status = 'internal_preview'
                  AND release_scope = 'preview'
                """
            )
        ).scalar_one() == 2

    service = _service(postgres_engine)
    assert _list(service).items == []
    assert _list(service).available_sources == []
    for problem_id in (probability_id, market_id):
        with pytest.raises(ApiError) as unavailable:
            service.get_detail(user_id=USER_A, problem_id=problem_id)
        assert unavailable.value.code == "PROBLEM_NOT_FOUND"
        with pytest.raises(ApiError) as write_unavailable:
            service.save_note(
                user_id=USER_A,
                problem_id=problem_id,
                payload=SaveNoteRequest(body="must not persist"),
                request_id="req_rights",
            )
        assert write_unavailable.value.code == "PROBLEM_NOT_FOUND"


def test_filters_daily_and_personal_state_are_isolated_by_user(
    postgres_engine: Any,
) -> None:
    problem_id = _problem_id(postgres_engine, "coin-bayes-001")
    plan_id = uuid4()
    with postgres_engine.begin() as connection:
        connection.execute(
            text(
                """
                INSERT INTO problem_progress
                    (id, user_id, problem_id, status, attempt_count, hint_count,
                     solution_revealed_at, best_score, last_score,
                     last_practiced_at, completed_at, version, created_at, updated_at)
                VALUES
                    (:progress_a, :user_a, :problem_id, 'in_progress', 2, 0,
                     NULL, 70, 60, :now, NULL, 3, :now, :now),
                    (:progress_b, :user_b, :problem_id, 'completed', 4, 1,
                     :now, 95, 95, :now, :now, 5, :now, :now)
                """
            ),
            {
                "now": NOW,
                "problem_id": problem_id,
                "progress_a": uuid4(),
                "progress_b": uuid4(),
                "user_a": USER_A,
                "user_b": USER_B,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO favorites
                    (id, user_id, problem_id, version, created_at, updated_at)
                VALUES (:id, :user_id, :problem_id, 1, :now, :now)
                """
            ),
            {"id": uuid4(), "now": NOW, "problem_id": problem_id, "user_id": USER_A},
        )
        connection.execute(
            text(
                """
                INSERT INTO notes
                    (id, user_id, problem_id, body, version, created_at, updated_at)
                VALUES
                    (:note_a, :user_a, :problem_id, 'A_ONLY_NOTE', 1, :now, :now),
                    (:note_b, :user_b, :problem_id, 'B_ONLY_NOTE', 1, :now, :now)
                """
            ),
            {
                "note_a": uuid4(),
                "note_b": uuid4(),
                "now": NOW,
                "problem_id": problem_id,
                "user_a": USER_A,
                "user_b": USER_B,
            },
        )
        connection.execute(
            text(
                """
                INSERT INTO plans
                    (id, user_id, track, role, season, weekly_hours,
                     diagnostic_status, diagnostic_score, diagnostic_scores,
                     status, version, created_at, updated_at)
                VALUES
                    (:id, :user_id, 'internship', 'Quant', '2027', 8,
                     'pending', 0, '{}'::jsonb, 'active', 1, :now, :now)
                """
            ),
            {"id": plan_id, "now": NOW, "user_id": USER_A},
        )
        connection.execute(
            text(
                """
                INSERT INTO plan_tasks
                    (id, user_id, title, status, sort_order, version,
                     completed_at, created_at, updated_at, plan_id,
                     target_problem_id, scheduled_for, action_target)
                VALUES
                    (:id, :user_id, '今日贝叶斯', 'open', 0, 1,
                     NULL, :now, :now, :plan_id, :problem_id, :today, 'problems')
                """
            ),
            {
                "id": uuid4(),
                "now": NOW,
                "plan_id": plan_id,
                "problem_id": problem_id,
                "today": NOW.date(),
                "user_id": USER_A,
            },
        )

    service = _service(postgres_engine)
    combined = _list(
        service,
        user_id=USER_A,
        query="贝叶斯",
        source="phase2-preview-probability",
        difficulty="Easy",
        status="in_progress",
        favorite=True,
        hot100=True,
        daily=True,
    )
    assert [item.problem.id for item in combined.items] == [problem_id]
    assert combined.items[0].progress is not None
    assert combined.items[0].progress.user_id == USER_A
    assert combined.items[0].note_version == 1

    assert _list(service, user_id=USER_B, daily=True).items == []
    assert _list(service, user_id=USER_B, favorite=True).items == []
    assert [item.problem.id for item in _list(
        service,
        user_id=USER_B,
        status="completed",
    ).items] == [problem_id]
    assert service.get_detail(user_id=USER_A, problem_id=problem_id).note.body == "A_ONLY_NOTE"
    assert service.get_detail(user_id=USER_B, problem_id=problem_id).note.body == "B_ONLY_NOTE"
    with postgres_engine.begin() as connection:
        connection.execute(
            text("UPDATE plans SET status = 'archived' WHERE id = :plan_id"),
            {"plan_id": plan_id},
        )
    assert _list(service, user_id=USER_A, daily=True).items == []


def test_note_cas_is_concurrency_safe_and_audit_never_contains_note_body(
    postgres_engine: Any,
) -> None:
    problem_id = _problem_id(postgres_engine, "coin-bayes-001")
    services = (_service(postgres_engine), _service(postgres_engine))
    created = services[0].save_note(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SaveNoteRequest(body="PRIVATE_BODY_CREATE"),
        request_id="req_note_create",
    )
    replay = services[0].save_note(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SaveNoteRequest(body="PRIVATE_BODY_CREATE"),
        request_id="req_note_replay",
    )
    assert replay == created
    updated = services[0].save_note(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SaveNoteRequest(body="PRIVATE_BODY_UPDATE", expectedVersion=1),
        request_id="req_note_update",
    )
    assert updated.version == 2
    with pytest.raises(ApiError) as stale:
        services[0].save_note(
            user_id=USER_A,
            problem_id=problem_id,
            payload=SaveNoteRequest(body="PRIVATE_BODY_STALE", expectedVersion=1),
            request_id="req_note_stale",
        )
    assert stale.value.code == "NOTE_VERSION_CONFLICT"

    barrier = Barrier(2)

    def race(index: int) -> Any:
        barrier.wait(timeout=10)
        try:
            return services[index].save_note(
                user_id=USER_A,
                problem_id=problem_id,
                payload=SaveNoteRequest(
                    body=f"PRIVATE_BODY_RACE_{index}",
                    expectedVersion=2,
                ),
                request_id=f"req_note_race_{index}",
            )
        except ApiError as error:
            return error

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(race, (0, 1)))
    assert len([item for item in outcomes if not isinstance(item, ApiError)]) == 1
    assert [item.code for item in outcomes if isinstance(item, ApiError)] == [
        "NOTE_VERSION_CONFLICT"
    ]

    services[0].save_note(
        user_id=USER_B,
        problem_id=problem_id,
        payload=SaveNoteRequest(body="B_PRIVATE_BODY"),
        request_id="req_note_b",
    )
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM audit_events
                WHERE user_id = :user_id
                  AND event_type = 'problems.note-saved'
                """
            ),
            {"user_id": USER_A},
        ).scalar_one() == 3
        serialized_details = " ".join(
            connection.execute(
                text(
                    """
                    SELECT details::text
                    FROM audit_events
                    WHERE event_type = 'problems.note-saved'
                    """
                )
            ).scalars()
        )
    assert "PRIVATE_BODY" not in serialized_details
    assert "B_PRIVATE_BODY" not in serialized_details


def test_favorite_desired_state_is_idempotent_and_rejects_aba_delete(
    postgres_engine: Any,
) -> None:
    problem_id = _problem_id(postgres_engine, "coin-bayes-001")
    service = _service(postgres_engine)
    assert service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(favorite=False),
        request_id="req_favorite_false",
    ) is None

    first = service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(favorite=True),
        request_id="req_favorite_create_1",
    )
    assert first is not None
    assert service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(favorite=True),
        request_id="req_favorite_replay_1",
    ) == first
    assert service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(
            favorite=False,
            expectedStateId=first.id,
            expectedVersion=first.version,
        ),
        request_id="req_favorite_delete_1",
    ) is None
    assert service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(
            favorite=False,
            expectedStateId=first.id,
            expectedVersion=first.version,
        ),
        request_id="req_favorite_delete_replay",
    ) is None

    second = service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(favorite=True),
        request_id="req_favorite_create_2",
    )
    assert second is not None and second.id != first.id
    with pytest.raises(ApiError) as aba:
        service.set_favorite(
            user_id=USER_A,
            problem_id=problem_id,
            payload=SetFavoriteRequest(
                favorite=False,
                expectedStateId=first.id,
                expectedVersion=first.version,
            ),
            request_id="req_favorite_aba",
        )
    assert aba.value.code == "FAVORITE_VERSION_CONFLICT"
    assert _list(service, favorite=True).items[0].favorite.id == second.id

    other_user = service.set_favorite(
        user_id=USER_B,
        problem_id=problem_id,
        payload=SetFavoriteRequest(favorite=True),
        request_id="req_favorite_b",
    )
    assert other_user is not None and other_user.id != second.id
    service.set_favorite(
        user_id=USER_A,
        problem_id=problem_id,
        payload=SetFavoriteRequest(
            favorite=False,
            expectedStateId=second.id,
            expectedVersion=second.version,
        ),
        request_id="req_favorite_delete_2",
    )
    assert _list(service, user_id=USER_A, favorite=True).items == []
    assert [item.problem.id for item in _list(
        service,
        user_id=USER_B,
        favorite=True,
    ).items] == [problem_id]
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM audit_events
                WHERE user_id = :user_id
                  AND event_type = 'problems.favorite-changed'
                """
            ),
            {"user_id": USER_A},
        ).scalar_one() == 4


def test_concurrent_favorite_true_creates_one_state_and_one_audit(
    postgres_engine: Any,
) -> None:
    problem_id = _problem_id(postgres_engine, "coin-bayes-001")
    services = (_service(postgres_engine), _service(postgres_engine))
    barrier = Barrier(2)

    def create(index: int) -> Any:
        barrier.wait(timeout=10)
        return services[index].set_favorite(
            user_id=USER_A,
            problem_id=problem_id,
            payload=SetFavoriteRequest(favorite=True),
            request_id=f"req_favorite_race_{index}",
        )

    with ThreadPoolExecutor(max_workers=2) as executor:
        outcomes = list(executor.map(create, (0, 1)))

    assert outcomes[0] is not None
    assert outcomes[1] is not None
    assert outcomes[0].id == outcomes[1].id
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM favorites
                WHERE user_id = :user_id AND problem_id = :problem_id
                """
            ),
            {"problem_id": problem_id, "user_id": USER_A},
        ).scalar_one() == 1
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM audit_events
                WHERE user_id = :user_id
                  AND event_type = 'problems.favorite-changed'
                """
            ),
            {"user_id": USER_A},
        ).scalar_one() == 1


def test_importer_rejects_non_preview_rights_before_database_write(
    postgres_engine: Any,
    tmp_path: Path,
) -> None:
    payload = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    payload["contentVersion"] = "2026-07-27.9"
    payload["sources"][0]["releaseScope"] = "public"
    path = tmp_path / "public-catalog.json"
    path.write_text(json.dumps(payload), encoding="utf-8")
    with pytest.raises(CatalogImportError):
        import_preview_catalog(postgres_engine, path=path, now=NOW)
    with postgres_engine.connect() as connection:
        assert connection.execute(
            text(
                """
                SELECT count(*)
                FROM problem_sources
                WHERE content_version = '2026-07-27.9'
                """
            )
        ).scalar_one() == 0
