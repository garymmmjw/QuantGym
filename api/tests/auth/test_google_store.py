from __future__ import annotations

import asyncio
import threading
from contextlib import AbstractContextManager
from datetime import UTC, datetime, timedelta
from typing import Any
from uuid import UUID

import pytest
from sqlalchemy.ext.asyncio import AsyncEngine

from api.app.auth.google import (
    GoogleOAuthChallengeForPersistence,
    PkceVerifierDeletion,
)
from api.app.auth.google_store import SqlAlchemyGoogleOAuthChallengeStore


NOW = datetime(2026, 7, 22, 12, 0, tzinfo=UTC)
STATE_HASH = "a" * 64
NONCE_HASH = "b" * 64
CIPHERTEXT = b"encrypted-pkce-verifier" + (b"x" * 64)


class _Result:
    def __init__(self, row: Any | None = None) -> None:
        self._row = row

    def mappings(self) -> _Result:
        return self

    def first(self) -> dict[str, Any] | None:
        return self._row

    def scalar_one(self) -> Any:
        return self._row


class _Transaction(AbstractContextManager["_Connection"]):
    def __init__(self, engine: _FakeEngine) -> None:
        self._engine = engine
        self._connection = _Connection(engine)
        self.transaction_id = engine.next_transaction_id()

    def __enter__(self) -> _Connection:
        self._engine.lock.acquire()
        self._engine.events.append(
            ("enter", self.transaction_id, threading.get_ident())
        )
        self._connection.transaction_id = self.transaction_id
        return self._connection

    def __exit__(self, *args: object) -> None:
        self._engine.events.append(
            ("exit", self.transaction_id, threading.get_ident())
        )
        self._engine.lock.release()


class _Connection:
    def __init__(self, engine: _FakeEngine) -> None:
        self._engine = engine
        self.transaction_id = 0

    def execute(self, statement: object, parameters: dict[str, Any]) -> _Result:
        sql = " ".join(str(statement).split())
        self._engine.events.append(
            ("execute", self.transaction_id, threading.get_ident(), sql, parameters)
        )

        if sql.startswith("SELECT pg_advisory_xact_lock"):
            return _Result()

        if sql.startswith("SELECT count(*)"):
            active_count = sum(
                row["kind"] == parameters["kind"]
                and row["expires_at"] > parameters["created_at"]
                for row in self._engine.rows.values()
            )
            return _Result(active_count)

        if sql.startswith("INSERT INTO auth_challenges"):
            state_hash = parameters["state_hash"]
            self._engine.rows[state_hash] = {
                **parameters,
                "user_id": None,
                "consumed_at": None,
            }
            return _Result()

        if sql.startswith("SELECT id, token_hash"):
            row = self._engine.rows.get(parameters["state_hash"])
            if (
                row is None
                or row["kind"] != parameters["kind"]
                or row["token_hash"] != parameters["state_hash"]
                or row["state_hash"] != parameters["state_hash"]
                or row["consumed_at"] is not None
            ):
                return _Result()
            return _Result(dict(row))

        if sql.startswith("UPDATE auth_challenges") and "WHERE id = :id" in sql:
            row = self._engine.rows.get(parameters["state_hash"])
            if (
                row is None
                or row["id"] != parameters["id"]
                or row["kind"] != parameters["kind"]
                or row["consumed_at"] is not None
            ):
                return _Result()
            row["consumed_at"] = parameters["consumed_at"]
            row["pkce_verifier_ciphertext"] = parameters[
                "pkce_verifier_ciphertext"
            ]
            row["pkce_key_id"] = parameters["pkce_key_id"]
            return _Result({"id": row["id"]})

        if (
            sql.startswith("UPDATE auth_challenges")
            and "SET consumed_at = :created_at" in sql
        ):
            for row in self._engine.rows.values():
                if (
                    row["kind"] == parameters["kind"]
                    and row["consumed_at"] is None
                    and row["expires_at"] <= parameters["created_at"]
                ):
                    row["consumed_at"] = parameters["created_at"]
                    row["pkce_verifier_ciphertext"] = None
                    row["pkce_key_id"] = None
            return _Result()

        if sql.startswith("UPDATE auth_challenges"):
            for row in self._engine.rows.values():
                if (
                    row["kind"] == parameters["kind"]
                    and row["consumed_at"] is None
                    and row["expires_at"] <= parameters["expired_at"]
                ):
                    row["consumed_at"] = parameters["consumed_at"]
                    row["pkce_verifier_ciphertext"] = parameters[
                        "pkce_verifier_ciphertext"
                    ]
                    row["pkce_key_id"] = parameters["pkce_key_id"]
            return _Result()

        if sql.startswith("DELETE FROM auth_challenges") and "id = :id" in sql:
            row = self._engine.rows.get(parameters["state_hash"])
            if (
                row is not None
                and row["id"] == parameters["id"]
                and row["kind"] == parameters["kind"]
                and row["consumed_at"] == parameters["consumed_at"]
                and row["expires_at"] <= parameters["claimed_at"]
                and row["pkce_verifier_ciphertext"] is None
                and row["pkce_key_id"] is None
            ):
                del self._engine.rows[parameters["state_hash"]]
            return _Result()

        if sql.startswith("DELETE FROM auth_challenges"):
            cutoff = parameters.get("expired_at", parameters.get("created_at"))
            expired = [
                state_hash
                for state_hash, row in self._engine.rows.items()
                if row["kind"] == parameters["kind"]
                and row["expires_at"] <= cutoff
                and row["consumed_at"] is not None
                and row["pkce_verifier_ciphertext"] is None
                and row["pkce_key_id"] is None
            ]
            for state_hash in expired:
                del self._engine.rows[state_hash]
            return _Result()

        raise AssertionError(f"unexpected SQL: {sql}")


class _FakeEngine:
    def __init__(self) -> None:
        self.rows: dict[str, dict[str, Any]] = {}
        self.events: list[tuple[Any, ...]] = []
        self.lock = threading.RLock()
        self._transaction_id = 0

    def __repr__(self) -> str:
        return "FakeEngine(postgresql://user:database-secret@example.test/db)"

    def next_transaction_id(self) -> int:
        self._transaction_id += 1
        return self._transaction_id

    def begin(self) -> _Transaction:
        return _Transaction(self)


class _BlockingConnection(_Connection):
    def execute(self, statement: object, parameters: dict[str, Any]) -> _Result:
        self._engine.worker_started.set()
        if not self._engine.release_worker.wait(timeout=5):
            raise TimeoutError("test worker was not released")
        return super().execute(statement, parameters)


class _BlockingTransaction(_Transaction):
    def __init__(self, engine: _BlockingEngine) -> None:
        super().__init__(engine)
        self._connection = _BlockingConnection(engine)


class _BlockingEngine(_FakeEngine):
    def __init__(self) -> None:
        super().__init__()
        self.worker_started = threading.Event()
        self.release_worker = threading.Event()

    def begin(self) -> _BlockingTransaction:
        return _BlockingTransaction(self)


def _challenge(
    *,
    state_hash: str = STATE_HASH,
    created_at: datetime = NOW,
    expires_at: datetime = NOW + timedelta(minutes=10),
) -> GoogleOAuthChallengeForPersistence:
    return GoogleOAuthChallengeForPersistence(
        token_hash=state_hash,
        state_hash=state_hash,
        nonce_hash=NONCE_HASH,
        pkce_verifier_ciphertext=CIPHERTEXT,
        pkce_key_id="preview-2026-07",
        redirect_path="/learn?from=google",
        expires_at=expires_at,
        created_at=created_at,
    )


@pytest.mark.asyncio
async def test_create_uses_one_worker_owned_transaction_and_redacts_engine() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    event_loop_thread = threading.get_ident()

    assert await store.create(_challenge()) is True

    row = engine.rows[STATE_HASH]
    assert isinstance(row["id"], UUID)
    assert row["kind"] == "google_oauth"
    assert row["token_hash"] == row["state_hash"] == STATE_HASH
    assert row["nonce_hash"] == NONCE_HASH
    assert row["pkce_verifier_ciphertext"] == CIPHERTEXT
    assert row["consumed_at"] is None
    assert [event[0] for event in engine.events] == [
        "enter",
        "execute",
        "execute",
        "execute",
        "execute",
        "execute",
        "exit",
    ]
    assert {event[2] for event in engine.events} != {event_loop_thread}
    assert "database-secret" not in repr(store)


@pytest.mark.asyncio
async def test_create_atomically_enforces_capacity_under_concurrency() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine, capacity=1)

    accepted = await asyncio.gather(
        store.create(_challenge(state_hash="c" * 64)),
        store.create(_challenge(state_hash="d" * 64)),
    )

    assert sorted(accepted) == [False, True]
    assert len(engine.rows) == 1
    advisory_transactions = {
        event[1]
        for event in engine.events
        if event[0] == "execute" and "pg_advisory_xact_lock" in event[3]
    }
    assert len(advisory_transactions) == 2


@pytest.mark.asyncio
async def test_create_cleans_expired_rows_before_capacity_count() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine, capacity=1)
    expired_hash = "c" * 64
    current_hash = "d" * 64
    assert await store.create(
        _challenge(
            state_hash=expired_hash,
            created_at=NOW - timedelta(minutes=11),
            expires_at=NOW - timedelta(minutes=1),
        )
    )

    assert await store.create(_challenge(state_hash=current_hash))

    assert set(engine.rows) == {current_hash}


@pytest.mark.asyncio
async def test_unexpired_consumed_rows_still_count_toward_storage_capacity() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine, capacity=1)
    assert await store.create(_challenge())
    claimed_at = NOW + timedelta(minutes=1)
    assert await store.claim_and_delete_verifier(
        state_hash=STATE_HASH,
        claimed_at=claimed_at,
        verifier_deletion=PkceVerifierDeletion(consumed_at=claimed_at),
    ) is not None

    assert await store.create(
        _challenge(state_hash="d" * 64, created_at=claimed_at)
    ) is False
    assert set(engine.rows) == {STATE_HASH}


@pytest.mark.asyncio
async def test_claim_is_atomic_scrubs_secrets_and_rejects_replay() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    await store.create(_challenge())
    engine.events.clear()
    deletion = PkceVerifierDeletion(consumed_at=NOW + timedelta(minutes=1))

    first, second = await asyncio.gather(
        store.claim_and_delete_verifier(
            state_hash=STATE_HASH,
            claimed_at=deletion.consumed_at,
            verifier_deletion=deletion,
        ),
        store.claim_and_delete_verifier(
            state_hash=STATE_HASH,
            claimed_at=deletion.consumed_at,
            verifier_deletion=deletion,
        ),
    )

    assert sum(result is not None for result in (first, second)) == 1
    claimed = first if first is not None else second
    assert claimed is not None
    assert claimed.state_hash == STATE_HASH
    assert claimed.nonce_hash == NONCE_HASH
    assert claimed.pkce_verifier_ciphertext == CIPHERTEXT
    assert claimed.pkce_key_id == "preview-2026-07"
    assert claimed.redirect_path == "/learn?from=google"

    stored = engine.rows[STATE_HASH]
    assert stored["consumed_at"] == deletion.consumed_at
    assert stored["pkce_verifier_ciphertext"] is None
    assert stored["pkce_key_id"] is None
    transaction_ids = {
        event[1]
        for event in engine.events
        if event[0] == "execute" and "FOR UPDATE" in event[3]
    }
    assert len(transaction_ids) == 2
    for transaction_id in transaction_ids:
        transaction_events = [
            event[0] for event in engine.events if event[1] == transaction_id
        ]
        assert transaction_events[0] == "enter"
        assert transaction_events[-1] == "exit"


@pytest.mark.asyncio
async def test_expired_callback_scrubs_then_deletes_row_but_returns_snapshot() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    await store.create(
        _challenge(created_at=NOW - timedelta(minutes=20), expires_at=NOW)
    )
    engine.events.clear()
    claimed_at = NOW + timedelta(seconds=1)

    claimed = await store.claim_and_delete_verifier(
        state_hash=STATE_HASH,
        claimed_at=claimed_at,
        verifier_deletion=PkceVerifierDeletion(consumed_at=claimed_at),
    )

    assert claimed is not None
    assert claimed.expires_at == NOW
    assert STATE_HASH not in engine.rows
    statements = [event[3] for event in engine.events if event[0] == "execute"]
    assert statements[0].endswith("FOR UPDATE")
    assert statements[1].startswith("UPDATE auth_challenges")
    assert statements[2].startswith("DELETE FROM auth_challenges")
    assert len({event[1] for event in engine.events}) == 1


@pytest.mark.asyncio
async def test_expiry_cleanup_only_removes_expired_google_oauth_rows() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    expired_hash = "c" * 64
    valid_hash = "d" * 64
    await store.create(
        _challenge(
            state_hash=expired_hash,
            created_at=NOW - timedelta(minutes=20),
            expires_at=NOW,
        )
    )
    expired_row = dict(engine.rows[expired_hash])
    engine.rows[valid_hash] = {
        **expired_row,
        "id": UUID("00000000-0000-0000-0000-000000000098"),
        "token_hash": valid_hash,
        "state_hash": valid_hash,
        "expires_at": NOW + timedelta(minutes=10),
        "created_at": NOW,
    }
    engine.rows["non-google"] = {
        **expired_row,
        "id": UUID("00000000-0000-0000-0000-000000000099"),
        "kind": "password_reset",
        "token_hash": "e" * 64,
        "state_hash": None,
        "pkce_verifier_ciphertext": None,
        "pkce_key_id": None,
    }
    engine.events.clear()

    await store.delete_expired_verifiers(
        expired_at=NOW,
        verifier_deletion=PkceVerifierDeletion(consumed_at=NOW),
    )

    assert expired_hash not in engine.rows
    assert valid_hash in engine.rows
    assert "non-google" in engine.rows
    statements = [event[3] for event in engine.events if event[0] == "execute"]
    assert len(statements) == 2
    assert all("kind = :kind" in statement for statement in statements)
    assert all("expires_at <= :expired_at" in statement for statement in statements)
    assert len({event[1] for event in engine.events}) == 1


@pytest.mark.asyncio
async def test_invalid_or_inconsistent_claim_inputs_do_not_open_transaction() -> None:
    engine = _FakeEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)

    with pytest.raises(ValueError, match="state hash"):
        await store.claim_and_delete_verifier(
            state_hash="A" * 64,
            claimed_at=NOW,
            verifier_deletion=PkceVerifierDeletion(consumed_at=NOW),
        )
    with pytest.raises(ValueError, match="timezone-aware"):
        await store.delete_expired_verifiers(
            expired_at=NOW.replace(tzinfo=None),
            verifier_deletion=PkceVerifierDeletion(consumed_at=NOW),
        )
    with pytest.raises(ValueError, match="timestamp is inconsistent"):
        await store.claim_and_delete_verifier(
            state_hash=STATE_HASH,
            claimed_at=NOW,
            verifier_deletion=PkceVerifierDeletion(
                consumed_at=NOW + timedelta(seconds=1)
            ),
        )

    assert engine.events == []


@pytest.mark.asyncio
async def test_cancelled_create_waits_for_worker_transaction_to_exit() -> None:
    engine = _BlockingEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    operation = asyncio.create_task(store.create(_challenge()))
    assert await asyncio.to_thread(engine.worker_started.wait, 1)

    operation.cancel()
    await asyncio.sleep(0)

    assert not operation.done()
    assert [event[0] for event in engine.events] == ["enter"]

    engine.release_worker.set()
    with pytest.raises(asyncio.CancelledError):
        await operation

    assert [event[0] for event in engine.events] == [
        "enter",
        "execute",
        "execute",
        "execute",
        "execute",
        "execute",
        "exit",
    ]
    assert STATE_HASH in engine.rows
    assert engine.lock.acquire(blocking=False)
    engine.lock.release()


@pytest.mark.asyncio
async def test_cancelled_claim_waits_for_scrub_and_releases_transaction_lock() -> None:
    engine = _BlockingEngine()
    store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    engine.release_worker.set()
    await store.create(_challenge())
    engine.events.clear()
    engine.worker_started.clear()
    engine.release_worker.clear()
    claimed_at = NOW + timedelta(minutes=1)
    deletion = PkceVerifierDeletion(consumed_at=claimed_at)
    operation = asyncio.create_task(
        store.claim_and_delete_verifier(
            state_hash=STATE_HASH,
            claimed_at=claimed_at,
            verifier_deletion=deletion,
        )
    )
    assert await asyncio.to_thread(engine.worker_started.wait, 1)

    operation.cancel()
    await asyncio.sleep(0)

    assert not operation.done()
    assert [event[0] for event in engine.events] == ["enter"]

    engine.release_worker.set()
    with pytest.raises(asyncio.CancelledError):
        await operation

    stored = engine.rows[STATE_HASH]
    assert stored["consumed_at"] == claimed_at
    assert stored["pkce_verifier_ciphertext"] is None
    assert stored["pkce_key_id"] is None
    assert [event[0] for event in engine.events] == [
        "enter",
        "execute",
        "execute",
        "execute",
        "exit",
    ]
    assert engine.lock.acquire(blocking=False)
    engine.lock.release()
    assert (
        await store.claim_and_delete_verifier(
            state_hash=STATE_HASH,
            claimed_at=claimed_at,
            verifier_deletion=deletion,
        )
        is None
    )


def test_constructor_rejects_async_or_missing_engine_and_repr_is_secret_safe() -> None:
    with pytest.raises(TypeError, match="synchronous SQLAlchemy engine"):
        SqlAlchemyGoogleOAuthChallengeStore(None)

    class MissingBegin:
        pass

    with pytest.raises(TypeError, match="synchronous SQLAlchemy engine"):
        SqlAlchemyGoogleOAuthChallengeStore(MissingBegin())

    async_engine = object.__new__(AsyncEngine)
    with pytest.raises(TypeError, match="synchronous SQLAlchemy engine"):
        SqlAlchemyGoogleOAuthChallengeStore(async_engine)
