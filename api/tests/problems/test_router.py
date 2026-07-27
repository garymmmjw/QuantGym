from __future__ import annotations

from datetime import UTC, datetime
from types import SimpleNamespace
from typing import Any
from uuid import UUID

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError

from api.app.auth.dependencies import (
    get_authenticated_session,
    require_mutating_session,
)
from api.app.errors import EXCEPTION_HANDLERS
from api.app.problems.models import (
    FavoriteRecord,
    NoteRecord,
    ProblemProgressRecord,
    ProblemRecord,
    ProblemSourceRecord,
)
from api.app.problems.router import get_problem_service, router
from api.app.problems.schemas import SaveNoteRequest, SetFavoriteRequest


USER_ID = UUID("ce72fe4c-ad62-4d9d-a65d-350b56e0aef7")
PROBLEM_ID = UUID("43c0884e-1ddd-58a4-b408-c57f7a43b513")
SOURCE_ID = UUID("3a1ecf7f-2098-56bd-be4c-b1f20dbccaad")
FAVORITE_ID = UUID("939891dd-398f-482c-8b3f-556efd08bbee")
NOTE_ID = UUID("41f07d36-0e96-46d9-ac77-490f153477e2")
NOW = datetime(2026, 7, 27, 8, tzinfo=UTC)


def _source() -> ProblemSourceRecord:
    return ProblemSourceRecord(
        id=SOURCE_ID,
        slug="phase2-preview-probability",
        name="Phase 2 Preview · Probability",
        content_version="2026-07-27.1",
        rights_status="internal_preview",
        release_scope="preview",
        created_at=NOW,
        updated_at=NOW,
    )


def _problem() -> ProblemRecord:
    return ProblemRecord(
        id=PROBLEM_ID,
        source_id=SOURCE_ID,
        external_key="private-storage-key",
        title_zh="两枚硬币的贝叶斯更新",
        title_en="Bayesian Update with Two Coins",
        prompt_zh="公开给当前 Preview 用户的题干。",
        prompt_en="Prompt visible to the current Preview user.",
        hint_zh="HIDDEN_HINT_ONLY_5832",
        hint_en="hidden hint",
        solution_zh="ORACLE_SOLUTION_ONLY_9471",
        solution_en="hidden solution",
        category="Probability",
        difficulty="Easy",
        tags=("bayes",),
        companies=("Synthetic Quant Lab",),
        source_url="https://private.invalid/source?signature=secret",
        hot100=True,
        version=1,
        created_at=NOW,
        updated_at=NOW,
    )


def _progress() -> ProblemProgressRecord:
    return ProblemProgressRecord(
        id=UUID("b33f77e6-293b-4e6c-a7db-c792334ecbdd"),
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        status="in_progress",
        attempt_count=2,
        hint_count=0,
        solution_revealed_at=None,
        best_score=70,
        last_score=60,
        last_practiced_at=NOW,
        completed_at=None,
        version=3,
        created_at=NOW,
        updated_at=NOW,
    )


def _favorite() -> FavoriteRecord:
    return FavoriteRecord(
        id=FAVORITE_ID,
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        version=2,
        created_at=NOW,
        updated_at=NOW,
    )


def _note(body: str = "我的私有笔记") -> NoteRecord:
    return NoteRecord(
        id=NOTE_ID,
        user_id=USER_ID,
        problem_id=PROBLEM_ID,
        body=body,
        version=4,
        created_at=NOW,
        updated_at=NOW,
    )


def _view(*, detail: bool) -> SimpleNamespace:
    note = _note() if detail else None
    return SimpleNamespace(
        problem=_problem(),
        source=_source(),
        progress=_progress(),
        favorite=_favorite(),
        note_version=4,
        note=note,
    )


class FakeService:
    def __init__(self) -> None:
        self.calls: list[tuple[str, dict[str, Any]]] = []

    def list(self, **values: Any) -> SimpleNamespace:
        self.calls.append(("list", values))
        return SimpleNamespace(
            items=[_view(detail=False)],
            next_cursor="opaque-next-page",
            available_sources=[_source()],
        )

    def get_detail(self, **values: Any) -> SimpleNamespace:
        self.calls.append(("detail", values))
        return _view(detail=True)

    def save_note(self, **values: Any) -> NoteRecord:
        self.calls.append(("note", values))
        return _note(values["payload"].body)

    def set_favorite(self, **values: Any) -> FavoriteRecord | None:
        self.calls.append(("favorite", values))
        return _favorite() if values["payload"].favorite else None


def _client() -> tuple[TestClient, FakeService]:
    application = FastAPI(exception_handlers=EXCEPTION_HANDLERS)
    application.include_router(router)
    service = FakeService()
    session = SimpleNamespace(user=SimpleNamespace(id=USER_ID))
    application.dependency_overrides[get_authenticated_session] = lambda: session
    application.dependency_overrides[require_mutating_session] = lambda: session
    application.dependency_overrides[get_problem_service] = lambda: service
    return TestClient(application), service


def test_list_forwards_every_server_filter_and_returns_only_safe_summary() -> None:
    client, service = _client()

    response = client.get(
        "/api/v2/problems",
        params={
            "q": "bayes",
            "source": "phase2-preview-probability",
            "difficulty": "Easy",
            "status": "in_progress",
            "favorite": "true",
            "hot100": "true",
            "daily": "true",
            "cursor": "cursor-value",
            "limit": "7",
        },
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.headers["pragma"] == "no-cache"
    payload = response.json()
    assert payload["nextCursor"] == "opaque-next-page"
    assert payload["availableSources"] == [
        {
            "slug": "phase2-preview-probability",
            "name": "Phase 2 Preview · Probability",
            "contentVersion": "2026-07-27.1",
        }
    ]
    item = payload["items"][0]
    assert item["favorite"] == {
        "favorite": True,
        "stateId": str(FAVORITE_ID),
        "version": 2,
        "updatedAt": "2026-07-27T08:00:00Z",
    }
    assert item["noteExists"] is True
    serialized = str(payload)
    for forbidden in (
        "promptZh",
        "HIDDEN_HINT_ONLY_5832",
        "ORACLE_SOLUTION_ONLY_9471",
        "private-storage-key",
        "private.invalid",
        str(USER_ID),
        "internal_preview",
    ):
        assert forbidden not in serialized
    assert service.calls[-1] == (
        "list",
        {
            "user_id": USER_ID,
            "query": "bayes",
            "source": "phase2-preview-probability",
            "difficulty": "Easy",
            "status": "in_progress",
            "favorite": True,
            "hot100": True,
            "daily": True,
            "cursor": "cursor-value",
            "limit": 7,
        },
    )


def test_detail_includes_prompt_and_own_note_but_never_hint_or_solution() -> None:
    client, service = _client()

    response = client.get(f"/api/v2/problems/{PROBLEM_ID}")

    assert response.status_code == 200
    payload = response.json()
    assert payload["promptZh"] == "公开给当前 Preview 用户的题干。"
    assert payload["note"] == {
        "body": "我的私有笔记",
        "version": 4,
        "updatedAt": "2026-07-27T08:00:00Z",
    }
    serialized = str(payload)
    assert "HIDDEN_HINT_ONLY_5832" not in serialized
    assert "ORACLE_SOLUTION_ONLY_9471" not in serialized
    assert "sourceUrl" not in payload
    assert "externalKey" not in payload
    assert service.calls[-1] == (
        "detail",
        {"user_id": USER_ID, "problem_id": PROBLEM_ID},
    )


def test_note_put_uses_expected_version_and_returns_no_store_projection() -> None:
    client, service = _client()

    response = client.put(
        f"/api/v2/problems/{PROBLEM_ID}/note",
        json={"body": "更新后的私有笔记", "expectedVersion": 3},
    )

    assert response.status_code == 200
    assert response.headers["cache-control"] == "no-store"
    assert response.json()["body"] == "更新后的私有笔记"
    call = service.calls[-1]
    assert call[0] == "note"
    assert call[1]["user_id"] == USER_ID
    assert call[1]["problem_id"] == PROBLEM_ID
    assert call[1]["payload"].expected_version == 3
    assert call[1]["request_id"] == "req_unavailable"


@pytest.mark.parametrize(
    ("desired", "expected_state_id", "expected_version", "favorite"),
    [
        (True, None, None, True),
        (False, str(FAVORITE_ID), 2, False),
    ],
)
def test_favorite_put_is_desired_state_not_toggle(
    desired: bool,
    expected_state_id: str | None,
    expected_version: int | None,
    favorite: bool,
) -> None:
    client, service = _client()
    body: dict[str, Any] = {
        "favorite": desired,
        "expectedStateId": expected_state_id,
        "expectedVersion": expected_version,
    }

    response = client.put(
        f"/api/v2/problems/{PROBLEM_ID}/favorite",
        json=body,
    )

    assert response.status_code == 200
    assert response.json()["favorite"] is favorite
    call = service.calls[-1]
    assert call[0] == "favorite"
    assert call[1]["payload"].favorite is desired


@pytest.mark.parametrize(
    "payload",
    [
        {"body": "", "expectedVersion": None},
        {"body": "   ", "expectedVersion": None},
        {"body": "ok", "expectedVersion": 0},
        {"body": "ok", "expectedVersion": None, "unexpected": True},
    ],
)
def test_note_schema_is_strict(payload: dict[str, Any]) -> None:
    with pytest.raises(ValidationError):
        SaveNoteRequest.model_validate(payload)


@pytest.mark.parametrize(
    "payload",
    [
        {"favorite": True, "expectedStateId": str(FAVORITE_ID)},
        {"favorite": False, "expectedVersion": 1},
        {"favorite": "yes"},
        {"favorite": True, "unexpected": True},
    ],
)
def test_favorite_schema_requires_a_complete_generation(
    payload: dict[str, Any],
) -> None:
    with pytest.raises(ValidationError):
        SetFavoriteRequest.model_validate(payload)
