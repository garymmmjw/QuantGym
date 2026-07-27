"""Import the immutable synthetic Phase 2 Preview problem catalog.

The importer intentionally accepts only the repository-owned Preview fixture
shape.  It never reads the legacy browser catalog and refuses public,
commercial, blocked, or unlabelled source metadata.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal
from uuid import NAMESPACE_URL, UUID, uuid5

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from sqlalchemy import create_engine, text


REPOSITORY_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CATALOG_PATH = (
    REPOSITORY_ROOT / "api" / "catalogs" / "phase2-preview-v1.json"
)
_SLUG_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,119}$")
_EXTERNAL_KEY_PATTERN = re.compile(r"^[a-z0-9][a-z0-9-]{0,159}$")


class CatalogImportError(RuntimeError):
    """Fail-closed catalog validation or immutable-content mismatch."""


class _StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)


def _clean_text(value: str) -> str:
    cleaned = value.strip()
    if not cleaned or "\x00" in cleaned:
        raise ValueError("catalog text is empty or unsafe")
    return cleaned


def _clean_optional_text(value: str | None) -> str | None:
    return None if value is None else _clean_text(value)


class CatalogProblem(_StrictModel):
    external_key: str = Field(
        validation_alias="externalKey",
        min_length=1,
        max_length=160,
    )
    title_zh: str | None = Field(
        default=None,
        validation_alias="titleZh",
        max_length=240,
    )
    title_en: str | None = Field(
        default=None,
        validation_alias="titleEn",
        max_length=240,
    )
    prompt_zh: str | None = Field(
        default=None,
        validation_alias="promptZh",
        max_length=20_000,
    )
    prompt_en: str | None = Field(
        default=None,
        validation_alias="promptEn",
        max_length=20_000,
    )
    hint_zh: str | None = Field(
        default=None,
        validation_alias="hintZh",
        max_length=20_000,
    )
    hint_en: str | None = Field(
        default=None,
        validation_alias="hintEn",
        max_length=20_000,
    )
    solution_zh: str | None = Field(
        default=None,
        validation_alias="solutionZh",
        max_length=40_000,
    )
    solution_en: str | None = Field(
        default=None,
        validation_alias="solutionEn",
        max_length=40_000,
    )
    category: str = Field(min_length=1, max_length=80)
    difficulty: Literal["Easy", "Medium", "Hard"]
    tags: list[str] = Field(default_factory=list, max_length=40)
    companies: list[str] = Field(default_factory=list, max_length=40)
    hot100: bool = False

    @field_validator("external_key")
    @classmethod
    def validate_external_key(cls, value: str) -> str:
        if _EXTERNAL_KEY_PATTERN.fullmatch(value) is None:
            raise ValueError("externalKey is invalid")
        return value

    @field_validator(
        "title_zh",
        "title_en",
        "prompt_zh",
        "prompt_en",
        "hint_zh",
        "hint_en",
        "solution_zh",
        "solution_en",
    )
    @classmethod
    def clean_optional_content(cls, value: str | None) -> str | None:
        return _clean_optional_text(value)

    @field_validator("category")
    @classmethod
    def clean_category(cls, value: str) -> str:
        return _clean_text(value)

    @field_validator("tags", "companies")
    @classmethod
    def validate_string_list(cls, values: list[str]) -> list[str]:
        cleaned = [_clean_text(value) for value in values]
        if any(len(value) > 120 for value in cleaned):
            raise ValueError("catalog list item is too long")
        if len(set(cleaned)) != len(cleaned):
            raise ValueError("catalog list contains duplicates")
        return cleaned

    @model_validator(mode="after")
    def require_bilingual_fallbacks(self) -> CatalogProblem:
        if self.title_zh is None and self.title_en is None:
            raise ValueError("at least one title is required")
        if self.prompt_zh is None and self.prompt_en is None:
            raise ValueError("at least one prompt is required")
        return self


class CatalogSource(_StrictModel):
    slug: str = Field(min_length=1, max_length=120)
    name: str = Field(min_length=1, max_length=200)
    rights_status: Literal["internal_preview"] = Field(
        validation_alias="rightsStatus"
    )
    release_scope: Literal["preview"] = Field(validation_alias="releaseScope")
    problems: list[CatalogProblem] = Field(min_length=1, max_length=100)

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, value: str) -> str:
        if _SLUG_PATTERN.fullmatch(value) is None:
            raise ValueError("source slug is invalid")
        return value

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str) -> str:
        return _clean_text(value)

    @model_validator(mode="after")
    def reject_duplicate_problem_keys(self) -> CatalogSource:
        keys = [problem.external_key for problem in self.problems]
        if len(keys) != len(set(keys)):
            raise ValueError("source contains duplicate external keys")
        return self


class PreviewCatalog(_StrictModel):
    schema_version: Literal[1] = Field(validation_alias="schemaVersion")
    catalog_id: Literal["quantgym-phase2-preview-synthetic"] = Field(
        validation_alias="catalogId"
    )
    content_version: str = Field(
        validation_alias="contentVersion",
        min_length=1,
        max_length=64,
        pattern=r"^[0-9]{4}-[0-9]{2}-[0-9]{2}\.[1-9][0-9]*$",
    )
    synthetic: Literal[True]
    sources: list[CatalogSource] = Field(min_length=1, max_length=20)

    @model_validator(mode="after")
    def reject_duplicate_sources(self) -> PreviewCatalog:
        slugs = [source.slug for source in self.sources]
        if len(slugs) != len(set(slugs)):
            raise ValueError("catalog contains duplicate source slugs")
        return self


@dataclass(frozen=True, slots=True)
class CatalogImportResult:
    catalog_id: str
    content_version: str
    source_count: int
    problem_count: int
    inserted_sources: int
    inserted_problems: int


def load_preview_catalog(path: Path = DEFAULT_CATALOG_PATH) -> PreviewCatalog:
    try:
        raw = path.read_text(encoding="utf-8")
        return PreviewCatalog.model_validate_json(raw)
    except (OSError, ValueError) as error:
        raise CatalogImportError("Preview catalog is invalid") from error


def import_preview_catalog(
    engine: Any,
    *,
    path: Path = DEFAULT_CATALOG_PATH,
    now: datetime | None = None,
) -> CatalogImportResult:
    catalog = load_preview_catalog(path)
    imported_at = now or datetime.now(UTC)
    if imported_at.tzinfo is None or imported_at.utcoffset() is None:
        raise ValueError("catalog import time must be timezone-aware")

    inserted_sources = 0
    inserted_problems = 0
    with engine.begin() as connection:
        for source in catalog.sources:
            source_id = _source_id(catalog, source)
            inserted = connection.execute(
                text(
                    """
                    INSERT INTO problem_sources
                        (id, slug, name, content_version, rights_status,
                         release_scope, created_at, updated_at)
                    VALUES
                        (:id, :slug, :name, :content_version, 'internal_preview',
                         'preview', :created_at, :updated_at)
                    ON CONFLICT (slug, content_version) DO NOTHING
                    RETURNING id
                    """
                ),
                {
                    "id": source_id,
                    "slug": source.slug,
                    "name": source.name,
                    "content_version": catalog.content_version,
                    "created_at": imported_at,
                    "updated_at": imported_at,
                },
            ).first()
            inserted_sources += int(inserted is not None)
            persisted_source = (
                connection.execute(
                    text(
                        """
                        SELECT id, slug, name, content_version, rights_status,
                               release_scope
                        FROM problem_sources
                        WHERE slug = :slug AND content_version = :content_version
                        """
                    ),
                    {
                        "slug": source.slug,
                        "content_version": catalog.content_version,
                    },
                )
                .mappings()
                .one()
            )
            expected_source = {
                "id": source_id,
                "slug": source.slug,
                "name": source.name,
                "content_version": catalog.content_version,
                "rights_status": "internal_preview",
                "release_scope": "preview",
            }
            if dict(persisted_source) != expected_source:
                raise CatalogImportError("Preview source metadata is not immutable")

            for problem in source.problems:
                problem_id = _problem_id(catalog, source, problem)
                values = _problem_values(
                    source_id=source_id,
                    problem_id=problem_id,
                    problem=problem,
                    imported_at=imported_at,
                )
                inserted_problem = connection.execute(
                    text(
                        """
                        INSERT INTO problems
                            (id, source_id, external_key, title_zh, title_en,
                             prompt_zh, prompt_en, hint_zh, hint_en,
                             solution_zh, solution_en, category, difficulty,
                             tags, companies, source_url, hot100, version,
                             created_at, updated_at)
                        VALUES
                            (:id, :source_id, :external_key, :title_zh, :title_en,
                             :prompt_zh, :prompt_en, :hint_zh, :hint_en,
                             :solution_zh, :solution_en, :category, :difficulty,
                             CAST(:tags AS jsonb), CAST(:companies AS jsonb),
                             NULL, :hot100, 1, :created_at, :updated_at)
                        ON CONFLICT (source_id, external_key) DO NOTHING
                        RETURNING id
                        """
                    ),
                    values,
                ).first()
                inserted_problems += int(inserted_problem is not None)
                persisted_problem = (
                    connection.execute(
                        text(
                            """
                            SELECT id, source_id, external_key, title_zh, title_en,
                                   prompt_zh, prompt_en, hint_zh, hint_en,
                                   solution_zh, solution_en, category, difficulty,
                                   tags, companies, source_url, hot100, version
                            FROM problems
                            WHERE source_id = :source_id
                              AND external_key = :external_key
                            """
                        ),
                        {
                            "source_id": source_id,
                            "external_key": problem.external_key,
                        },
                    )
                    .mappings()
                    .one()
                )
                if not _same_problem(persisted_problem, values):
                    raise CatalogImportError("Preview problem content is not immutable")

    return CatalogImportResult(
        catalog_id=catalog.catalog_id,
        content_version=catalog.content_version,
        source_count=len(catalog.sources),
        problem_count=sum(len(source.problems) for source in catalog.sources),
        inserted_sources=inserted_sources,
        inserted_problems=inserted_problems,
    )


def _source_id(catalog: PreviewCatalog, source: CatalogSource) -> UUID:
    return uuid5(
        NAMESPACE_URL,
        f"{catalog.catalog_id}:{catalog.content_version}:source:{source.slug}",
    )


def _problem_id(
    catalog: PreviewCatalog,
    source: CatalogSource,
    problem: CatalogProblem,
) -> UUID:
    return uuid5(
        NAMESPACE_URL,
        (
            f"{catalog.catalog_id}:{catalog.content_version}:"
            f"problem:{source.slug}:{problem.external_key}"
        ),
    )


def _problem_values(
    *,
    source_id: UUID,
    problem_id: UUID,
    problem: CatalogProblem,
    imported_at: datetime,
) -> dict[str, Any]:
    return {
        "id": problem_id,
        "source_id": source_id,
        "external_key": problem.external_key,
        "title_zh": problem.title_zh,
        "title_en": problem.title_en,
        "prompt_zh": problem.prompt_zh,
        "prompt_en": problem.prompt_en,
        "hint_zh": problem.hint_zh,
        "hint_en": problem.hint_en,
        "solution_zh": problem.solution_zh,
        "solution_en": problem.solution_en,
        "category": problem.category,
        "difficulty": problem.difficulty,
        "tags": json.dumps(problem.tags, ensure_ascii=False, separators=(",", ":")),
        "companies": json.dumps(
            problem.companies,
            ensure_ascii=False,
            separators=(",", ":"),
        ),
        "hot100": problem.hot100,
        "created_at": imported_at,
        "updated_at": imported_at,
    }


def _same_problem(row: Any, values: dict[str, Any]) -> bool:
    expected = {
        key: values[key]
        for key in (
            "id",
            "source_id",
            "external_key",
            "title_zh",
            "title_en",
            "prompt_zh",
            "prompt_en",
            "hint_zh",
            "hint_en",
            "solution_zh",
            "solution_en",
            "category",
            "difficulty",
            "hot100",
        )
    }
    expected.update(
        {
            "tags": json.loads(values["tags"]),
            "companies": json.loads(values["companies"]),
            "source_url": None,
            "version": 1,
        }
    )
    return dict(row) == expected


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG_PATH)
    arguments = parser.parse_args()

    sys.path.insert(0, str(REPOSITORY_ROOT))
    from api.app.config import get_settings

    settings = get_settings()
    engine = create_engine(
        settings.database_url.get_secret_value(),
        pool_pre_ping=True,
    )
    try:
        result = import_preview_catalog(engine, path=arguments.catalog)
    finally:
        engine.dispose()
    print(
        json.dumps(
            {
                "catalogId": result.catalog_id,
                "contentVersion": result.content_version,
                "insertedProblems": result.inserted_problems,
                "insertedSources": result.inserted_sources,
                "problemCount": result.problem_count,
                "sourceCount": result.source_count,
            },
            ensure_ascii=False,
            separators=(",", ":"),
            sort_keys=True,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


__all__ = [
    "CatalogImportError",
    "CatalogImportResult",
    "DEFAULT_CATALOG_PATH",
    "PreviewCatalog",
    "import_preview_catalog",
    "load_preview_catalog",
]
