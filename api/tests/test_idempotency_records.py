from __future__ import annotations

import json
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import suppress
from datetime import UTC, datetime, timedelta
from pathlib import Path
from threading import Event
from typing import Any, Iterator
from uuid import UUID, uuid4

import pytest

from api.app.errors import ApiError
from api.app.idempotency import IdempotencyKey
from api.app.idempotency_records import (
    IdempotencyCompletion,
    NextTrainingActionAcknowledgement,
    PlanEffectAcknowledgement,
    ProblemCompletionAcknowledgement,
    SkillEffectAcknowledgement,
    complete_idempotency_record,
    execute_idempotent_operation,
    replay_idempotency_record,
    reserve_idempotency_record,
)


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
RECORD_ID = UUID("2ce77fd1-04bb-4fa4-93b6-9d43bd19d989")
RESOURCE_ID = UUID("d2ec9b99-21f5-4453-b28c-a4806f5ffb64")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)
EXPIRES_AT = NOW + timedelta(hours=24)
KEY = IdempotencyKey("a" * 64)
REQUEST_HASH = "b" * 64
REPO_ROOT = Path(__file__).resolve().parents[2]


class _Transaction:
    def __init__(self) -> None:
        self.is_active = True


class _Rows:
    def __init__(self, row: dict[str, Any] | None) -> None:
        self._row = row

    def mappings(self) -> _Rows:
        return self

    def first(self) -> dict[str, Any] | None:
        return None if self._row is None else dict(self._row)


class FakeConnection:
    """Small connection double that exercises the SQL state machine without owning a transaction."""

    def __init__(
        self,
        *,
        rows: dict[tuple[UUID, str, str], dict[str, Any]] | None = None,
        transaction: _Transaction | None = None,
    ) -> None:
        self.rows = {} if rows is None else rows
        self.execute_calls: list[tuple[str, dict[str, Any]]] = []
        self.commit_calls = 0
        self.rollback_calls = 0
        self.transaction = _Transaction() if transaction is None else transaction

    def execute(self, statement: Any, parameters: dict[str, Any]) -> _Rows:
        sql = " ".join(str(statement).split())
        values = dict(parameters)
        self.execute_calls.append((sql, values))
        key = (values["user_id"], values["operation"], values["key_hash"])

        if sql.startswith("INSERT INTO idempotency_records"):
            if key in self.rows:
                return _Rows(None)
            row = {
                "id": values["id"],
                "user_id": values["user_id"],
                "operation": values["operation"],
                "key_hash": values["key_hash"],
                "request_hash": values["request_hash"],
                "status": "pending",
                "response_status": None,
                "response_snapshot": None,
                "resource_id": None,
                "expires_at": values["expires_at"],
                "created_at": values["created_at"],
                "updated_at": values["created_at"],
                "completed_at": None,
            }
            self.rows[key] = row
            return _Rows(row)

        if sql.startswith("SELECT"):
            return _Rows(self.rows.get(key))

        if sql.startswith("UPDATE idempotency_records"):
            row = self.rows.get(key)
            if (
                row is None
                or row["id"] != values["record_id"]
                or row["request_hash"] != values["request_hash"]
                or row["status"] != "pending"
                or values["completed_at"] < row["created_at"]
                or row["expires_at"] <= values["completed_at"]
            ):
                return _Rows(None)
            row.update(
                status=values["status"],
                response_status=values["response_status"],
                response_snapshot=json.loads(values["response_snapshot"]),
                resource_id=values["resource_id"],
                updated_at=values["completed_at"],
                completed_at=values["completed_at"],
            )
            return _Rows(row)

        raise AssertionError(f"unexpected SQL: {sql}")

    def commit(self) -> None:
        self.commit_calls += 1

    def rollback(self) -> None:
        self.rollback_calls += 1

    def in_transaction(self) -> bool:
        return self.transaction.is_active

    def get_transaction(self) -> _Transaction | None:
        return self.transaction if self.transaction.is_active else None

    def get_nested_transaction(self) -> None:
        return None

    def replace_transaction(self) -> None:
        self.transaction.is_active = False
        self.transaction = _Transaction()


def reserve(connection: FakeConnection, **overrides: Any) -> Any:
    values = {
        "user_id": USER_ID,
        "operation": "problems.complete",
        "key": KEY,
        "request_hash": REQUEST_HASH,
        "now": NOW,
        "expires_at": EXPIRES_AT,
        "id_factory": lambda: RECORD_ID,
    }
    values.update(overrides)
    return reserve_idempotency_record(connection, **values)


def problem_acknowledgement(
    *,
    xp_delta: int = 10,
    with_plan_effect: bool = False,
) -> ProblemCompletionAcknowledgement:
    return ProblemCompletionAcknowledgement(
        session_id=RESOURCE_ID,
        session_version=2,
        xp_delta=xp_delta,
        skill_effect=SkillEffectAcknowledgement(
            skill_key="arrays",
            previous_best_score=80,
            current_best_score=100,
            delta=20,
        ),
        next_action=NextTrainingActionAcknowledgement(
            target="overview",
            problem_id=None,
        ),
        plan_effect=(
            PlanEffectAcknowledgement(task_completed=True, plan_version=4)
            if with_plan_effect
            else None
        ),
    )


def execute(
    connection: FakeConnection,
    *,
    acknowledgement: Any | None = None,
    completed_at: datetime = NOW + timedelta(seconds=1),
    callback: Any | None = None,
    **overrides: Any,
) -> Any:
    values = {
        "user_id": USER_ID,
        "operation": "problems.complete",
        "key": KEY,
        "request_hash": REQUEST_HASH,
        "now": NOW,
        "expires_at": EXPIRES_AT,
        "id_factory": lambda: RECORD_ID,
        "completion_clock": lambda: completed_at,
        "reward_callback": callback
        or (
            lambda _connection: IdempotencyCompletion(
                response_status=200,
                acknowledgement=acknowledgement or problem_acknowledgement(),
                resource_id=RESOURCE_ID,
            )
        ),
    }
    values.update(overrides)
    return execute_idempotent_operation(connection, **values)


def test_new_reservation_is_pending_and_never_commits_the_caller_connection() -> None:
    connection = FakeConnection()

    reservation = reserve(connection)

    assert reservation.acquired is True
    assert reservation.id == RECORD_ID
    assert reservation.status == "pending"
    assert reservation.response_snapshot is None
    assert reservation.expires_at == EXPIRES_AT
    assert connection.commit_calls == connection.rollback_calls == 0
    insert_parameters = connection.execute_calls[0][1]
    assert insert_parameters["key_hash"] == KEY.digest
    assert "raw_key" not in insert_parameters


def test_completed_response_replays_after_the_domain_resource_version_advances() -> None:
    connection = FakeConnection()
    acknowledgement = problem_acknowledgement(with_plan_effect=True)

    completed = execute(connection, acknowledgement=acknowledgement)
    # This represents unrelated later domain writes. Replay must not inspect them.
    advanced_domain_version = 99
    replay = reserve(connection, now=NOW + timedelta(minutes=5))

    assert advanced_domain_version == 99
    assert completed.acquired is True
    assert replay.acquired is False
    assert replay.status == "completed"
    assert replay.response_status == 200
    assert replay.response_snapshot == {
        "nextAction": {"problemId": None, "target": "overview"},
        "planEffect": {"planVersion": 4, "taskCompleted": True},
        "sessionId": str(RESOURCE_ID),
        "sessionVersion": 2,
        "skillEffect": {
            "currentBestScore": 100,
            "delta": 20,
            "previousBestScore": 80,
            "skillKey": "arrays",
        },
        "xpDelta": 10,
    }
    assert replay.resource_id == RESOURCE_ID
    assert connection.commit_calls == connection.rollback_calls == 0
    update_sql = next(sql for sql, _ in connection.execute_calls if sql.startswith("UPDATE"))
    assert ":completed_at >= created_at" in update_sql
    assert "expires_at > :completed_at" in update_sql


def test_same_key_with_a_different_request_hash_fails_closed() -> None:
    connection = FakeConnection()
    reserve(connection)

    with pytest.raises(ApiError) as reused:
        reserve(connection, request_hash="c" * 64)

    assert reused.value.status_code == 409
    assert reused.value.code == "IDEMPOTENCY_KEY_REUSED"
    assert reused.value.retryable is False


def test_a_visible_pending_record_reports_an_explicit_retryable_conflict() -> None:
    connection = FakeConnection()
    reserve(connection)

    with pytest.raises(ApiError) as pending:
        reserve(connection, now=NOW + timedelta(seconds=1))

    assert pending.value.status_code == 409
    assert pending.value.code == "IDEMPOTENCY_REQUEST_IN_PROGRESS"
    assert pending.value.retryable is True
    assert pending.value.headers == {"Retry-After": "1"}


@pytest.mark.parametrize(
    "snapshot",
    [
        {"rawIdempotencyKey": "raw-value"},
        {"nested": {"csrfProof": "proof"}},
        {"cookie": "__Host-qg_session=value"},
        {"authorization": "Bearer secret"},
        {"answerText": "private response"},
        {"result": {"note": "private note"}},
        {"metadata": "Authorization: Bearer secret"},
        {"metadata": "X-CSRF-Token: secret"},
        {"summary": "the user's answer hidden behind an innocuous key"},
    ],
)
def test_completion_only_accepts_the_typed_operation_acknowledgement(
    snapshot: dict[str, Any],
) -> None:
    connection = FakeConnection()

    with pytest.raises(ApiError) as invalid:
        execute(connection, acknowledgement=snapshot)

    assert invalid.value.status_code == 422
    assert invalid.value.code == "IDEMPOTENCY_ACKNOWLEDGEMENT_INVALID"
    assert connection.rows[(USER_ID, "problems.complete", KEY.digest)]["status"] == "pending"


def test_operation_allowlist_rejects_an_unregistered_operation_before_sql() -> None:
    connection = FakeConnection()

    with pytest.raises(ValueError, match="unsupported idempotency operation"):
        reserve(connection, operation="admin.export-user-content")

    assert connection.execute_calls == []


def test_problem_acknowledgement_rejects_non_typed_values() -> None:
    with pytest.raises(ValueError, match="session_version"):
        ProblemCompletionAcknowledgement(
            session_id=RESOURCE_ID,
            session_version=True,  # type: ignore[arg-type]
            xp_delta=10,
            skill_effect=SkillEffectAcknowledgement(
                skill_key="arrays",
                previous_best_score=None,
                current_best_score=100,
                delta=100,
            ),
            next_action=NextTrainingActionAcknowledgement(
                target="overview",
                problem_id=None,
            ),
        )


@pytest.mark.parametrize(
    "persisted_snapshot",
    [
        {"answer": "must not escape"},
        {
            "sessionId": str(RESOURCE_ID),
            "sessionVersion": 2,
            "xpDelta": 10,
            "summary": "user content under an innocuous key",
        },
    ],
)
def test_replay_validates_persisted_snapshots_fail_closed(
    persisted_snapshot: dict[str, Any],
) -> None:
    connection = FakeConnection()
    reservation = reserve(connection)
    key = (USER_ID, "problems.complete", KEY.digest)
    completed_at = NOW + timedelta(seconds=1)
    connection.rows[key].update(
        status="completed",
        response_status=200,
        response_snapshot=persisted_snapshot,
        resource_id=RESOURCE_ID,
        updated_at=completed_at,
        completed_at=completed_at,
    )

    with pytest.raises(ApiError) as invalid:
        replay_idempotency_record(
            connection,
            user_id=USER_ID,
            operation=reservation.operation,
            key=KEY,
            request_hash=REQUEST_HASH,
            now=NOW + timedelta(seconds=2),
        )

    assert invalid.value.code == "IDEMPOTENCY_RECORD_INVALID"
    assert invalid.value.status_code == 503
    assert invalid.value.retryable is True


def test_a_second_execution_replays_without_invoking_the_reward_callback() -> None:
    connection = FakeConnection()
    first_callback_calls = 0
    second_callback_calls = 0

    def first_callback(_connection: Any) -> IdempotencyCompletion:
        nonlocal first_callback_calls
        first_callback_calls += 1
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
        )

    def second_callback(_connection: Any) -> IdempotencyCompletion:
        nonlocal second_callback_calls
        second_callback_calls += 1
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=problem_acknowledgement(xp_delta=20),
            resource_id=RESOURCE_ID,
        )

    first = execute(connection, callback=first_callback)
    replay = execute(
        connection,
        callback=second_callback,
        completed_at=NOW + timedelta(seconds=2),
    )

    assert first.acquired is True
    assert replay.acquired is False
    assert replay.response_snapshot["xpDelta"] == 10
    assert first_callback_calls == 1
    assert second_callback_calls == 0


@pytest.mark.parametrize(
    ("field", "value"),
    [
        ("now", datetime(2026, 7, 27, 8)),
        ("expires_at", datetime(2026, 7, 28, 8)),
        ("expires_at", NOW),
        ("request_hash", "not-a-sha256"),
        ("operation", "Problems Complete"),
    ],
)
def test_reservation_validates_utc_expiry_and_identity_fields(field: str, value: Any) -> None:
    with pytest.raises(ValueError):
        reserve(FakeConnection(), **{field: value})


def test_expired_pending_reservation_cannot_be_completed() -> None:
    connection = FakeConnection()

    with pytest.raises(ApiError) as expired:
        execute(
            connection,
            expires_at=NOW + timedelta(seconds=1),
            completed_at=NOW + timedelta(seconds=2),
        )

    assert expired.value.code == "IDEMPOTENCY_RECORD_EXPIRED"
    assert expired.value.retryable is False


def test_direct_complete_is_rejected_without_the_reward_callback_scope() -> None:
    connection = FakeConnection()
    reservation = reserve(connection)

    with pytest.raises(ValueError, match="execute_idempotent_operation"):
        complete_idempotency_record(
            connection,
            reservation=reservation,
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=1),
        )
    assert connection.commit_calls == connection.rollback_calls == 0


def test_execute_forces_reward_and_completion_onto_the_reservation_connection() -> None:
    connection = FakeConnection()
    observed: list[Any] = []

    def reward_callback(callback_connection: Any) -> IdempotencyCompletion:
        observed.append(callback_connection)
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
        )

    execute(connection, callback=reward_callback)

    assert observed == [connection]
    assert connection.commit_calls == connection.rollback_calls == 0


def test_complete_rejects_a_different_connection_or_transaction() -> None:
    shared_rows: dict[tuple[UUID, str, str], dict[str, Any]] = {}
    first = FakeConnection(rows=shared_rows)
    other = FakeConnection(rows=shared_rows)
    reservation = reserve(first)

    with pytest.raises(ValueError, match="same active SQLAlchemy transaction"):
        complete_idempotency_record(
            other,
            reservation=reservation,
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=1),
        )

    first.replace_transaction()
    with pytest.raises(ValueError, match="same active SQLAlchemy transaction"):
        complete_idempotency_record(
            first,
            reservation=reservation,
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=1),
        )


def test_complete_rejects_a_timestamp_before_the_reservation_without_updating() -> None:
    connection = FakeConnection()
    callback_called = False

    def reward_callback(_connection: Any) -> IdempotencyCompletion:
        nonlocal callback_called
        callback_called = True
        return IdempotencyCompletion(
            response_status=200,
            acknowledgement=problem_acknowledgement(),
            resource_id=RESOURCE_ID,
        )

    with pytest.raises(ValueError, match="completed_at must not precede created_at"):
        execute(
            connection,
            callback=reward_callback,
            completed_at=NOW - timedelta(microseconds=1),
        )

    assert callback_called is True
    assert not any(sql.startswith("UPDATE") for sql, _ in connection.execute_calls)


@pytest.fixture(scope="module")
def postgres_engine() -> Iterator[Any]:
    from alembic import command
    from alembic.config import Config
    from sqlalchemy import create_engine, text
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
        with engine.begin() as connection:
            connection.execute(
                text(
                    """
                    CREATE TABLE idempotency_reward_probe (
                        id uuid PRIMARY KEY,
                        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        amount integer NOT NULL CHECK (amount > 0)
                    )
                    """
                )
            )
        yield engine
    finally:
        engine.dispose()
        with suppress(Exception):
            container.stop()


@pytest.fixture
def postgres_account(postgres_engine: Any) -> Any:
    from sqlalchemy import text

    with postgres_engine.begin() as connection:
        connection.execute(text("TRUNCATE idempotency_reward_probe, users CASCADE"))
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
    return postgres_engine


def _postgres_execute(
    connection: Any,
    *,
    reward_callback: Any,
    request_hash: str = REQUEST_HASH,
    key: IdempotencyKey = KEY,
) -> Any:
    return execute_idempotent_operation(
        connection,
        user_id=USER_ID,
        operation="problems.complete",
        key=key,
        request_hash=request_hash,
        now=NOW,
        expires_at=EXPIRES_AT,
        reward_callback=reward_callback,
        completion_clock=lambda: NOW + timedelta(seconds=1),
    )


def test_postgres18_two_connections_serialize_and_replay_one_reward(
    postgres_account: Any,
) -> None:
    from sqlalchemy import text

    winner_reserved = Event()
    release_winner = Event()
    loser_started = Event()
    callback_names: list[str] = []

    def winner_callback(connection: Any) -> IdempotencyCompletion:
        callback_names.append("winner")
        connection.execute(
            text(
                "INSERT INTO idempotency_reward_probe (id, user_id, amount) "
                "VALUES (:id, :user_id, 10)"
            ),
            {"id": uuid4(), "user_id": USER_ID},
        )
        winner_reserved.set()
        assert release_winner.wait(timeout=10)
        return IdempotencyCompletion(200, problem_acknowledgement(), RESOURCE_ID)

    def loser_callback(_connection: Any) -> IdempotencyCompletion:
        callback_names.append("loser")
        return IdempotencyCompletion(
            200,
            problem_acknowledgement(xp_delta=99),
            RESOURCE_ID,
        )

    def run_winner() -> Any:
        with postgres_account.begin() as connection:
            return _postgres_execute(connection, reward_callback=winner_callback)

    def run_loser() -> Any:
        assert winner_reserved.wait(timeout=10)
        loser_started.set()
        with postgres_account.begin() as connection:
            return _postgres_execute(connection, reward_callback=loser_callback)

    with ThreadPoolExecutor(max_workers=2) as executor:
        winner_future = executor.submit(run_winner)
        assert winner_reserved.wait(timeout=10)
        loser_future = executor.submit(run_loser)
        assert loser_started.wait(timeout=10)
        time.sleep(0.2)
        assert loser_future.done() is False
        release_winner.set()
        winner = winner_future.result(timeout=10)
        replay = loser_future.result(timeout=10)

    assert winner.acquired is True
    assert replay.acquired is False
    assert replay.response_snapshot["xpDelta"] == 10
    assert callback_names == ["winner"]
    with postgres_account.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_reward_probe")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_records")
        ).scalar_one() == 1


def test_postgres18_reward_and_idempotency_reservation_roll_back_atomically(
    postgres_account: Any,
) -> None:
    from sqlalchemy import text

    def failing_reward(connection: Any) -> IdempotencyCompletion:
        connection.execute(
            text(
                "INSERT INTO idempotency_reward_probe (id, user_id, amount) "
                "VALUES (:id, :user_id, 10)"
            ),
            {"id": uuid4(), "user_id": USER_ID},
        )
        raise RuntimeError("reward write failed after reservation")

    with pytest.raises(RuntimeError, match="reward write failed"):
        with postgres_account.begin() as connection:
            _postgres_execute(connection, reward_callback=failing_reward)

    with postgres_account.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_reward_probe")
        ).scalar_one() == 0
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_records")
        ).scalar_one() == 0


def test_postgres18_double_completion_race_fails_closed_for_different_payload(
    postgres_account: Any,
) -> None:
    from sqlalchemy import text

    winner_reserved = Event()
    release_winner = Event()
    losing_callback_calls = 0

    def winner_callback(connection: Any) -> IdempotencyCompletion:
        connection.execute(
            text(
                "INSERT INTO idempotency_reward_probe (id, user_id, amount) "
                "VALUES (:id, :user_id, 10)"
            ),
            {"id": uuid4(), "user_id": USER_ID},
        )
        winner_reserved.set()
        assert release_winner.wait(timeout=10)
        return IdempotencyCompletion(200, problem_acknowledgement(), RESOURCE_ID)

    def losing_callback(_connection: Any) -> IdempotencyCompletion:
        nonlocal losing_callback_calls
        losing_callback_calls += 1
        return IdempotencyCompletion(200, problem_acknowledgement(), RESOURCE_ID)

    def run_winner() -> Any:
        with postgres_account.begin() as connection:
            return _postgres_execute(connection, reward_callback=winner_callback)

    def run_loser() -> ApiError:
        assert winner_reserved.wait(timeout=10)
        try:
            with postgres_account.begin() as connection:
                _postgres_execute(
                    connection,
                    reward_callback=losing_callback,
                    request_hash="c" * 64,
                )
        except ApiError as error:
            return error
        raise AssertionError("different request payload unexpectedly completed")

    with ThreadPoolExecutor(max_workers=2) as executor:
        winner_future = executor.submit(run_winner)
        assert winner_reserved.wait(timeout=10)
        loser_future = executor.submit(run_loser)
        time.sleep(0.2)
        assert loser_future.done() is False
        release_winner.set()
        winner = winner_future.result(timeout=10)
        reused = loser_future.result(timeout=10)

    assert winner.acquired is True
    assert reused.code == "IDEMPOTENCY_KEY_REUSED"
    assert reused.retryable is False
    assert losing_callback_calls == 0
    with postgres_account.connect() as connection:
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_reward_probe")
        ).scalar_one() == 1
        assert connection.execute(
            text("SELECT count(*) FROM idempotency_records")
        ).scalar_one() == 1
