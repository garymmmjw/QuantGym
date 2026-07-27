from __future__ import annotations

import json
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import pytest

from api.app.errors import ApiError
from api.app.idempotency import IdempotencyKey
from api.app.idempotency_records import (
    complete_idempotency_record,
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


class _Rows:
    def __init__(self, row: dict[str, Any] | None) -> None:
        self._row = row

    def mappings(self) -> _Rows:
        return self

    def first(self) -> dict[str, Any] | None:
        return None if self._row is None else dict(self._row)


class FakeConnection:
    """Small connection double that exercises the SQL state machine without owning a transaction."""

    def __init__(self) -> None:
        self.rows: dict[tuple[UUID, str, str], dict[str, Any]] = {}
        self.execute_calls: list[tuple[str, dict[str, Any]]] = []
        self.commit_calls = 0
        self.rollback_calls = 0

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
    reservation = reserve(connection)
    acknowledgement = {
        "sessionId": str(RESOURCE_ID),
        "sessionVersion": 2,
        "xpDelta": 10,
        "planEffect": {"taskCompleted": True, "planVersion": 4},
    }

    completed = complete_idempotency_record(
        connection,
        reservation=reservation,
        response_status=200,
        response_snapshot=acknowledgement,
        resource_id=RESOURCE_ID,
        now=NOW + timedelta(seconds=1),
    )
    # This represents unrelated later domain writes. Replay must not inspect them.
    advanced_domain_version = 99
    replay = reserve(connection, now=NOW + timedelta(minutes=5))

    assert advanced_domain_version == 99
    assert completed.acquired is True
    assert replay.acquired is False
    assert replay.status == "completed"
    assert replay.response_status == 200
    assert replay.response_snapshot == acknowledgement
    assert replay.resource_id == RESOURCE_ID
    assert connection.commit_calls == connection.rollback_calls == 0


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
    ],
)
def test_completion_rejects_sensitive_response_snapshot_content(
    snapshot: dict[str, Any],
) -> None:
    connection = FakeConnection()
    reservation = reserve(connection)

    with pytest.raises(ApiError) as sensitive:
        complete_idempotency_record(
            connection,
            reservation=reservation,
            response_status=200,
            response_snapshot=snapshot,
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=1),
        )

    assert sensitive.value.status_code == 422
    assert sensitive.value.code == "IDEMPOTENCY_SNAPSHOT_SENSITIVE"
    assert connection.rows[(USER_ID, "problems.complete", KEY.digest)]["status"] == "pending"


def test_replay_validates_persisted_snapshots_fail_closed() -> None:
    connection = FakeConnection()
    reservation = reserve(connection)
    key = (USER_ID, "problems.complete", KEY.digest)
    connection.rows[key].update(
        status="completed",
        response_status=200,
        response_snapshot={"answer": "must not escape"},
        resource_id=RESOURCE_ID,
        completed_at=NOW + timedelta(seconds=1),
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


def test_double_complete_only_replays_an_identical_acknowledgement() -> None:
    connection = FakeConnection()
    reservation = reserve(connection)
    acknowledgement = {"sessionId": str(RESOURCE_ID), "xpDelta": 10}
    complete_idempotency_record(
        connection,
        reservation=reservation,
        response_status=200,
        response_snapshot=acknowledgement,
        resource_id=RESOURCE_ID,
        now=NOW + timedelta(seconds=1),
    )

    replay = complete_idempotency_record(
        connection,
        reservation=reservation,
        response_status=200,
        response_snapshot=acknowledgement,
        resource_id=RESOURCE_ID,
        now=NOW + timedelta(seconds=2),
    )
    assert replay.acquired is False
    assert replay.response_snapshot == acknowledgement

    with pytest.raises(ApiError) as mismatch:
        complete_idempotency_record(
            connection,
            reservation=reservation,
            response_status=200,
            response_snapshot={"sessionId": str(RESOURCE_ID), "xpDelta": 20},
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=3),
        )
    assert mismatch.value.code == "IDEMPOTENCY_COMPLETION_MISMATCH"
    assert mismatch.value.retryable is False


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
    reservation = reserve(connection, expires_at=NOW + timedelta(seconds=1))

    with pytest.raises(ApiError) as expired:
        complete_idempotency_record(
            connection,
            reservation=reservation,
            response_status=200,
            response_snapshot={"xpDelta": 10},
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=2),
        )

    assert expired.value.code == "IDEMPOTENCY_RECORD_EXPIRED"
    assert expired.value.retryable is False


def test_complete_rejects_a_forged_non_acquired_reservation() -> None:
    connection = FakeConnection()
    reservation = replace(reserve(connection), acquired=False)

    with pytest.raises(ValueError, match="acquired reservation"):
        complete_idempotency_record(
            connection,
            reservation=reservation,
            response_status=200,
            response_snapshot={"xpDelta": 10},
            resource_id=RESOURCE_ID,
            now=NOW + timedelta(seconds=1),
        )
    assert connection.commit_calls == connection.rollback_calls == 0
