"""User-scoped, rights-filtered Phase 2 problem services."""

from __future__ import annotations

import base64
import hashlib
import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any, Callable
from uuid import UUID, uuid4

from sqlalchemy import text

from ..errors import ApiError
from .models import (
    FavoriteRecord,
    NoteRecord,
    ProblemProgressRecord,
    ProblemRecord,
    ProblemSourceRecord,
)
from .schemas import SaveNoteRequest, SetFavoriteRequest


def utc_now() -> datetime:
    return datetime.now(UTC)


_CURSOR_HASH_PATTERN = re.compile(r"^[0-9a-f]{64}$")
_ALLOWED_SOURCE_CTE = """
    WITH ranked_sources AS (
        SELECT ps.*,
               row_number() OVER (
                   PARTITION BY ps.slug
                   ORDER BY ps.created_at DESC, ps.id DESC
               ) AS source_rank
        FROM problem_sources AS ps
    ),
    allowed_sources AS (
        SELECT *
        FROM ranked_sources
        WHERE source_rank = 1
          AND release_scope = 'preview'
          AND rights_status IN ('approved', 'internal_preview')
    )
"""
_SAFE_VIEW_COLUMNS = """
    p.id AS problem_id,
    p.source_id AS problem_source_id,
    p.external_key AS problem_external_key,
    p.title_zh AS problem_title_zh,
    p.title_en AS problem_title_en,
    p.category AS problem_category,
    p.difficulty AS problem_difficulty,
    p.tags AS problem_tags,
    p.companies AS problem_companies,
    p.hot100 AS problem_hot100,
    p.version AS problem_version,
    p.created_at AS problem_created_at,
    p.updated_at AS problem_updated_at,
    ps.id AS source_record_id,
    ps.slug AS source_slug,
    ps.name AS source_name,
    ps.content_version AS source_content_version,
    ps.rights_status AS source_rights_status,
    ps.release_scope AS source_release_scope,
    ps.created_at AS source_created_at,
    ps.updated_at AS source_updated_at,
    pp.id AS progress_id,
    pp.user_id AS progress_user_id,
    pp.problem_id AS progress_problem_id,
    pp.status AS progress_status,
    pp.attempt_count AS progress_attempt_count,
    pp.hint_count AS progress_hint_count,
    pp.solution_revealed_at AS progress_solution_revealed_at,
    pp.best_score AS progress_best_score,
    pp.last_score AS progress_last_score,
    pp.last_practiced_at AS progress_last_practiced_at,
    pp.completed_at AS progress_completed_at,
    pp.version AS progress_version,
    pp.created_at AS progress_created_at,
    pp.updated_at AS progress_updated_at,
    f.id AS favorite_id,
    f.user_id AS favorite_user_id,
    f.problem_id AS favorite_problem_id,
    f.version AS favorite_version,
    f.created_at AS favorite_created_at,
    f.updated_at AS favorite_updated_at,
    n.version AS note_version
"""
_USER_VIEW_JOINS = """
    JOIN allowed_sources AS ps ON ps.id = p.source_id
    LEFT JOIN problem_progress AS pp
      ON pp.problem_id = p.id AND pp.user_id = :user_id
    LEFT JOIN favorites AS f
      ON f.problem_id = p.id AND f.user_id = :user_id
    LEFT JOIN notes AS n
      ON n.problem_id = p.id AND n.user_id = :user_id
"""
_NOTE_COLUMNS = "id, user_id, problem_id, body, version, created_at, updated_at"
_FAVORITE_COLUMNS = "id, user_id, problem_id, version, created_at, updated_at"


@dataclass(frozen=True, slots=True)
class ProblemView:
    problem: ProblemRecord
    source: ProblemSourceRecord
    progress: ProblemProgressRecord | None
    favorite: FavoriteRecord | None
    note_version: int | None
    note: NoteRecord | None = None


@dataclass(frozen=True, slots=True)
class ProblemPage:
    items: list[ProblemView]
    next_cursor: str | None
    available_sources: list[ProblemSourceRecord]


@dataclass(frozen=True, slots=True)
class _Cursor:
    filter_hash: str
    problem_id: UUID


class ProblemsService:
    def __init__(
        self,
        engine: Any,
        *,
        clock: Callable[[], datetime] = utc_now,
        id_factory: Callable[[], UUID] = uuid4,
    ) -> None:
        self._engine = engine
        self._clock = clock
        self._id_factory = id_factory

    def list(
        self,
        *,
        user_id: UUID,
        query: str | None,
        source: str | None,
        difficulty: str | None,
        status: str | None,
        favorite: bool | None,
        hot100: bool | None,
        daily: bool,
        cursor: str | None,
        limit: int,
    ) -> ProblemPage:
        today = self._now().date()
        normalized_query = _optional_trim(query)
        normalized_source = _optional_trim(source)
        filters = {
            "daily": daily,
            "date": today.isoformat() if daily else None,
            "difficulty": difficulty,
            "favorite": favorite,
            "hot100": hot100,
            "query": normalized_query,
            "source": normalized_source,
            "status": status,
        }
        filter_hash = _filter_hash(filters)
        decoded_cursor = (
            None if cursor is None else _decode_cursor(cursor, filter_hash=filter_hash)
        )
        conditions: list[str] = []
        parameters: dict[str, Any] = {
            "limit": limit + 1,
            "today": today,
            "user_id": user_id,
        }
        if normalized_query is not None:
            conditions.append(
                """
                (
                    COALESCE(p.title_zh, '') ILIKE :search
                    OR COALESCE(p.title_en, '') ILIKE :search
                    OR COALESCE(p.prompt_zh, '') ILIKE :search
                    OR COALESCE(p.prompt_en, '') ILIKE :search
                    OR p.category ILIKE :search
                    OR ps.name ILIKE :search
                    OR p.tags::text ILIKE :search
                    OR p.companies::text ILIKE :search
                )
                """
            )
            parameters["search"] = f"%{normalized_query}%"
        if normalized_source is not None:
            conditions.append("ps.slug = :source")
            parameters["source"] = normalized_source
        if difficulty is not None:
            conditions.append("p.difficulty = :difficulty")
            parameters["difficulty"] = difficulty
        if status is not None:
            conditions.append("COALESCE(pp.status, 'unstarted') = :status")
            parameters["status"] = status
        if favorite is not None:
            conditions.append("(f.id IS NOT NULL) = :favorite")
            parameters["favorite"] = favorite
        if hot100 is not None:
            conditions.append("p.hot100 = :hot100")
            parameters["hot100"] = hot100
        if daily:
            conditions.append(
                """
                (
                    EXISTS (
                        SELECT 1
                        FROM plan_tasks AS pt
                        JOIN plans AS task_plan
                          ON task_plan.id = pt.plan_id
                         AND task_plan.user_id = :user_id
                         AND task_plan.status = 'active'
                        WHERE pt.user_id = :user_id
                          AND pt.target_problem_id = p.id
                          AND pt.status = 'open'
                          AND pt.scheduled_for = :today
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM recommendations AS r
                        JOIN plans AS daily_plan
                          ON daily_plan.id = r.plan_id
                         AND daily_plan.user_id = :user_id
                         AND daily_plan.status = 'active'
                        WHERE r.user_id = :user_id
                          AND r.problem_id = p.id
                          AND r.status = 'active'
                    )
                )
                """
            )
        if decoded_cursor is not None:
            conditions.append("p.id > :cursor_problem_id")
            parameters["cursor_problem_id"] = decoded_cursor.problem_id
        where = "" if not conditions else "WHERE " + " AND ".join(conditions)

        with self._engine.connect() as connection:
            rows = (
                connection.execute(
                    text(
                        f"""
                        {_ALLOWED_SOURCE_CTE}
                        SELECT {_SAFE_VIEW_COLUMNS}
                        FROM problems AS p
                        {_USER_VIEW_JOINS}
                        {where}
                        ORDER BY p.id ASC
                        LIMIT :limit
                        """
                    ),
                    parameters,
                )
                .mappings()
                .all()
            )
            source_rows = (
                connection.execute(
                    text(
                        f"""
                        {_ALLOWED_SOURCE_CTE}
                        SELECT id, slug, name, content_version, rights_status,
                               release_scope, created_at, updated_at
                        FROM allowed_sources
                        ORDER BY name ASC, slug ASC
                        """
                    )
                )
                .mappings()
                .all()
            )

        visible = rows[:limit]
        next_cursor = (
            _encode_cursor(filter_hash, visible[-1]["problem_id"])
            if len(rows) > limit and visible
            else None
        )
        return ProblemPage(
            items=[_view_from_row(row, include_prompt=False) for row in visible],
            next_cursor=next_cursor,
            available_sources=[_source_from_unaliased_row(row) for row in source_rows],
        )

    def get_detail(self, *, user_id: UUID, problem_id: UUID) -> ProblemView:
        with self._engine.connect() as connection:
            row = (
                connection.execute(
                    text(
                        f"""
                        {_ALLOWED_SOURCE_CTE}
                        SELECT {_SAFE_VIEW_COLUMNS},
                               p.prompt_zh AS problem_prompt_zh,
                               p.prompt_en AS problem_prompt_en,
                               n.id AS note_id,
                               n.user_id AS note_user_id,
                               n.problem_id AS note_problem_id,
                               n.body AS note_body,
                               n.created_at AS note_created_at,
                               n.updated_at AS note_updated_at
                        FROM problems AS p
                        {_USER_VIEW_JOINS}
                        WHERE p.id = :problem_id
                        """
                    ),
                    {"problem_id": problem_id, "user_id": user_id},
                )
                .mappings()
                .first()
            )
        if row is None:
            raise _not_found()
        return _view_from_row(row, include_prompt=True, include_note=True)

    def save_note(
        self,
        *,
        user_id: UUID,
        problem_id: UUID,
        payload: SaveNoteRequest,
        request_id: str,
    ) -> NoteRecord:
        now = self._now()
        with self._engine.begin() as connection:
            _require_visible_problem(connection, problem_id)
            current = _select_note(connection, user_id, problem_id, for_update=True)
            if current is not None and current["body"] == payload.body:
                return _note_from_row(current)
            if current is None:
                if payload.expected_version is not None:
                    raise _note_conflict()
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO notes
                                (id, user_id, problem_id, body, version,
                                 created_at, updated_at)
                            VALUES
                                (:id, :user_id, :problem_id, :body, 1,
                                 :created_at, :updated_at)
                            ON CONFLICT (user_id, problem_id) DO NOTHING
                            RETURNING {_NOTE_COLUMNS}
                            """
                        ),
                        {
                            "body": payload.body,
                            "created_at": now,
                            "id": self._id_factory(),
                            "problem_id": problem_id,
                            "updated_at": now,
                            "user_id": user_id,
                        },
                    )
                    .mappings()
                    .first()
                )
                if row is None:
                    concurrent = _select_note(
                        connection,
                        user_id,
                        problem_id,
                        for_update=True,
                    )
                    if concurrent is not None and concurrent["body"] == payload.body:
                        return _note_from_row(concurrent)
                    raise _note_conflict()
            else:
                if current["version"] != payload.expected_version:
                    raise _note_conflict()
                row = (
                    connection.execute(
                        text(
                            f"""
                            UPDATE notes
                            SET body = :body,
                                version = version + 1,
                                updated_at = :updated_at
                            WHERE id = :note_id
                              AND user_id = :user_id
                              AND problem_id = :problem_id
                              AND version = :expected_version
                            RETURNING {_NOTE_COLUMNS}
                            """
                        ),
                        {
                            "body": payload.body,
                            "expected_version": payload.expected_version,
                            "note_id": current["id"],
                            "problem_id": problem_id,
                            "updated_at": now,
                            "user_id": user_id,
                        },
                    )
                    .mappings()
                    .first()
                )
                if row is None:
                    concurrent = _select_note(
                        connection,
                        user_id,
                        problem_id,
                        for_update=True,
                    )
                    if concurrent is not None and concurrent["body"] == payload.body:
                        return _note_from_row(concurrent)
                    raise _note_conflict()
            _append_audit(
                connection,
                audit_id=self._id_factory(),
                user_id=user_id,
                event_type="problems.note-saved",
                request_id=request_id,
                details={
                    "problemId": str(problem_id),
                    "resultVersion": row["version"],
                },
                now=now,
            )
        return _note_from_row(row)

    def set_favorite(
        self,
        *,
        user_id: UUID,
        problem_id: UUID,
        payload: SetFavoriteRequest,
        request_id: str,
    ) -> FavoriteRecord | None:
        now = self._now()
        with self._engine.begin() as connection:
            _require_visible_problem(connection, problem_id)
            current = _select_favorite(connection, user_id, problem_id, for_update=True)
            if payload.favorite and current is not None:
                return _favorite_from_row(current)
            if not payload.favorite and current is None:
                return None

            if current is None:
                if (
                    payload.expected_state_id is not None
                    or payload.expected_version is not None
                ):
                    raise _favorite_conflict()
                row = (
                    connection.execute(
                        text(
                            f"""
                            INSERT INTO favorites
                                (id, user_id, problem_id, version,
                                 created_at, updated_at)
                            VALUES
                                (:id, :user_id, :problem_id, 1,
                                 :created_at, :updated_at)
                            ON CONFLICT (user_id, problem_id) DO NOTHING
                            RETURNING {_FAVORITE_COLUMNS}
                            """
                        ),
                        {
                            "created_at": now,
                            "id": self._id_factory(),
                            "problem_id": problem_id,
                            "updated_at": now,
                            "user_id": user_id,
                        },
                    )
                    .mappings()
                    .first()
                )
                if row is None:
                    concurrent = _select_favorite(
                        connection,
                        user_id,
                        problem_id,
                        for_update=True,
                    )
                    if concurrent is not None:
                        return _favorite_from_row(concurrent)
                    raise _favorite_conflict()
                result: FavoriteRecord | None = _favorite_from_row(row)
                audit_version = row["version"]
                audit_state_id: str | None = str(row["id"])
            else:
                if (
                    current["id"] != payload.expected_state_id
                    or current["version"] != payload.expected_version
                ):
                    raise _favorite_conflict()
                deleted = (
                    connection.execute(
                        text(
                            """
                            DELETE FROM favorites
                            WHERE id = :state_id
                              AND user_id = :user_id
                              AND problem_id = :problem_id
                              AND version = :expected_version
                            RETURNING id, version
                            """
                        ),
                        {
                            "expected_version": payload.expected_version,
                            "problem_id": problem_id,
                            "state_id": payload.expected_state_id,
                            "user_id": user_id,
                        },
                    )
                    .mappings()
                    .first()
                )
                if deleted is None:
                    concurrent = _select_favorite(
                        connection,
                        user_id,
                        problem_id,
                        for_update=True,
                    )
                    if concurrent is None:
                        return None
                    raise _favorite_conflict()
                result = None
                audit_version = deleted["version"]
                audit_state_id = str(deleted["id"])

            _append_audit(
                connection,
                audit_id=self._id_factory(),
                user_id=user_id,
                event_type="problems.favorite-changed",
                request_id=request_id,
                details={
                    "favorite": payload.favorite,
                    "problemId": str(problem_id),
                    "resultVersion": audit_version,
                    "stateId": audit_state_id,
                },
                now=now,
            )
        return result

    def _now(self) -> datetime:
        value = self._clock()
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("problem service clock must be timezone-aware")
        return value


def _optional_trim(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip()
    return normalized or None


def _filter_hash(filters: dict[str, Any]) -> str:
    canonical = json.dumps(
        filters,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def _encode_cursor(filter_hash: str, problem_id: UUID) -> str:
    payload = json.dumps(
        {"filter": filter_hash, "id": str(problem_id), "v": 1},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    return base64.urlsafe_b64encode(payload).decode("ascii").rstrip("=")


def _decode_cursor(value: str, *, filter_hash: str) -> _Cursor:
    try:
        if not value or len(value) > 512 or not value.isascii():
            raise ValueError
        padding = "=" * (-len(value) % 4)
        decoded = base64.b64decode(
            f"{value}{padding}",
            altchars=b"-_",
            validate=True,
        )
        payload = json.loads(decoded.decode("utf-8"))
        if not isinstance(payload, dict) or set(payload) != {"filter", "id", "v"}:
            raise ValueError
        if payload["v"] != 1 or isinstance(payload["v"], bool):
            raise ValueError
        persisted_filter = payload["filter"]
        if (
            not isinstance(persisted_filter, str)
            or _CURSOR_HASH_PATTERN.fullmatch(persisted_filter) is None
            or persisted_filter != filter_hash
        ):
            raise ValueError
        if not isinstance(payload["id"], str):
            raise ValueError
        problem_id = UUID(payload["id"])
        if str(problem_id) != payload["id"]:
            raise ValueError
    except (UnicodeError, ValueError, json.JSONDecodeError):
        raise ApiError(
            status_code=400,
            code="PROBLEM_CURSOR_INVALID",
            message="题目分页位置无效，请重新载入列表",
            field_errors={"cursor": ["分页位置与当前筛选条件不匹配"]},
            retryable=False,
        ) from None
    return _Cursor(filter_hash=persisted_filter, problem_id=problem_id)


def _view_from_row(
    row: Any,
    *,
    include_prompt: bool,
    include_note: bool = False,
) -> ProblemView:
    source = ProblemSourceRecord(
        id=row["source_record_id"],
        slug=row["source_slug"],
        name=row["source_name"],
        content_version=row["source_content_version"],
        rights_status=row["source_rights_status"],
        release_scope=row["source_release_scope"],
        created_at=row["source_created_at"],
        updated_at=row["source_updated_at"],
    )
    problem = ProblemRecord(
        id=row["problem_id"],
        source_id=row["problem_source_id"],
        external_key=row["problem_external_key"],
        title_zh=row["problem_title_zh"],
        title_en=row["problem_title_en"],
        prompt_zh=row["problem_prompt_zh"] if include_prompt else None,
        prompt_en=row["problem_prompt_en"] if include_prompt else None,
        hint_zh=None,
        hint_en=None,
        solution_zh=None,
        solution_en=None,
        category=row["problem_category"],
        difficulty=row["problem_difficulty"],
        tags=tuple(row["problem_tags"]),
        companies=tuple(row["problem_companies"]),
        source_url=None,
        hot100=row["problem_hot100"],
        version=row["problem_version"],
        created_at=row["problem_created_at"],
        updated_at=row["problem_updated_at"],
    )
    progress = (
        None
        if row["progress_id"] is None
        else ProblemProgressRecord(
            id=row["progress_id"],
            user_id=row["progress_user_id"],
            problem_id=row["progress_problem_id"],
            status=row["progress_status"],
            attempt_count=row["progress_attempt_count"],
            hint_count=row["progress_hint_count"],
            solution_revealed_at=row["progress_solution_revealed_at"],
            best_score=row["progress_best_score"],
            last_score=row["progress_last_score"],
            last_practiced_at=row["progress_last_practiced_at"],
            completed_at=row["progress_completed_at"],
            version=row["progress_version"],
            created_at=row["progress_created_at"],
            updated_at=row["progress_updated_at"],
        )
    )
    favorite = (
        None
        if row["favorite_id"] is None
        else FavoriteRecord(
            id=row["favorite_id"],
            user_id=row["favorite_user_id"],
            problem_id=row["favorite_problem_id"],
            version=row["favorite_version"],
            created_at=row["favorite_created_at"],
            updated_at=row["favorite_updated_at"],
        )
    )
    note = (
        _note_from_aliased_row(row)
        if include_note and row["note_id"] is not None
        else None
    )
    return ProblemView(
        problem=problem,
        source=source,
        progress=progress,
        favorite=favorite,
        note_version=row["note_version"],
        note=note,
    )


def _source_from_unaliased_row(row: Any) -> ProblemSourceRecord:
    return ProblemSourceRecord(
        id=row["id"],
        slug=row["slug"],
        name=row["name"],
        content_version=row["content_version"],
        rights_status=row["rights_status"],
        release_scope=row["release_scope"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _note_from_row(row: Any) -> NoteRecord:
    return NoteRecord(
        id=row["id"],
        user_id=row["user_id"],
        problem_id=row["problem_id"],
        body=row["body"],
        version=row["version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _note_from_aliased_row(row: Any) -> NoteRecord:
    return NoteRecord(
        id=row["note_id"],
        user_id=row["note_user_id"],
        problem_id=row["note_problem_id"],
        body=row["note_body"],
        version=row["note_version"],
        created_at=row["note_created_at"],
        updated_at=row["note_updated_at"],
    )


def _favorite_from_row(row: Any) -> FavoriteRecord:
    return FavoriteRecord(
        id=row["id"],
        user_id=row["user_id"],
        problem_id=row["problem_id"],
        version=row["version"],
        created_at=row["created_at"],
        updated_at=row["updated_at"],
    )


def _require_visible_problem(connection: Any, problem_id: UUID) -> None:
    visible = connection.execute(
        text(
            f"""
            {_ALLOWED_SOURCE_CTE}
            SELECT 1
            FROM problems AS p
            JOIN allowed_sources AS ps ON ps.id = p.source_id
            WHERE p.id = :problem_id
            """
        ),
        {"problem_id": problem_id},
    ).first()
    if visible is None:
        raise _not_found()


def _select_note(
    connection: Any,
    user_id: UUID,
    problem_id: UUID,
    *,
    for_update: bool,
) -> Any:
    lock = "FOR UPDATE" if for_update else ""
    return (
        connection.execute(
            text(
                f"""
                SELECT {_NOTE_COLUMNS}
                FROM notes
                WHERE user_id = :user_id AND problem_id = :problem_id
                {lock}
                """
            ),
            {"problem_id": problem_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )


def _select_favorite(
    connection: Any,
    user_id: UUID,
    problem_id: UUID,
    *,
    for_update: bool,
) -> Any:
    lock = "FOR UPDATE" if for_update else ""
    return (
        connection.execute(
            text(
                f"""
                SELECT {_FAVORITE_COLUMNS}
                FROM favorites
                WHERE user_id = :user_id AND problem_id = :problem_id
                {lock}
                """
            ),
            {"problem_id": problem_id, "user_id": user_id},
        )
        .mappings()
        .first()
    )


def _append_audit(
    connection: Any,
    *,
    audit_id: UUID,
    user_id: UUID,
    event_type: str,
    request_id: str,
    details: dict[str, Any],
    now: datetime,
) -> None:
    connection.execute(
        text(
            """
            INSERT INTO audit_events
                (id, user_id, event_type, idempotency_key_hash,
                 request_id, details, created_at)
            VALUES
                (:id, :user_id, :event_type, NULL,
                 :request_id, CAST(:details AS jsonb), :created_at)
            """
        ),
        {
            "created_at": now,
            "details": json.dumps(details, separators=(",", ":"), sort_keys=True),
            "event_type": event_type,
            "id": audit_id,
            "request_id": request_id,
            "user_id": user_id,
        },
    )


def _not_found() -> ApiError:
    return ApiError(
        status_code=404,
        code="PROBLEM_NOT_FOUND",
        message="题目不存在或当前环境不可用",
        retryable=False,
    )


def _note_conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="NOTE_VERSION_CONFLICT",
        message="笔记已在其他位置更新",
        field_errors={"expectedVersion": ["版本已过期，请载入最新笔记"]},
        retryable=False,
    )


def _favorite_conflict() -> ApiError:
    return ApiError(
        status_code=409,
        code="FAVORITE_VERSION_CONFLICT",
        message="收藏状态已在其他位置更新",
        field_errors={"expectedVersion": ["状态已过期，请载入最新收藏状态"]},
        retryable=False,
    )


__all__ = [
    "ProblemPage",
    "ProblemView",
    "ProblemsService",
    "_decode_cursor",
    "_encode_cursor",
]
