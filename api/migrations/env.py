"""Alembic environment for the PostgreSQL-only Phase 1 schema."""

from __future__ import annotations

import os
from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from api.app.db import DatabaseConfigurationError, validate_database_url


config = context.config
target_metadata = None

if config.config_file_name and config.get_section("loggers") is not None:
    fileConfig(config.config_file_name)


def _configured_database_url() -> str:
    environment_values = [
        os.environ[name]
        for name in (
            "QUANTGYM_POSTGRES_DATABASE_URL",
            "QUANTGYM_PREVIEW_POSTGRES_URL",
            "QUANTGYM_V2_DATABASE_URL",
            "DATABASE_URL",
        )
        if os.environ.get(name)
    ]
    if len(set(environment_values)) > 1:
        raise DatabaseConfigurationError("conflicting database URL settings")
    raw_url = (
        environment_values[0]
        if environment_values
        else config.get_main_option("sqlalchemy.url")
    )
    if not raw_url:
        raise DatabaseConfigurationError("database URL is required for migrations")
    return validate_database_url(raw_url)


def _configure_migration_context(connection: object) -> None:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        compare_type=True,
        include_schemas=False,
        transaction_per_migration=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_offline() -> None:
    context.configure(
        url=_configured_database_url(),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        compare_type=True,
        include_schemas=False,
        transaction_per_migration=True,
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    supplied_connection = config.attributes.get("connection")
    if supplied_connection is not None:
        _configure_migration_context(supplied_connection)
        return

    section = config.get_section(config.config_ini_section) or {}
    section["sqlalchemy.url"] = _configured_database_url()
    connectable = engine_from_config(
        section,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    try:
        with connectable.connect() as connection:
            _configure_migration_context(connection)
    finally:
        connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
