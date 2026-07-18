"""Create the frozen Phase 1 application schema.

Revision ID: 0001_phase1_foundation
Revises: None
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0001_phase1_foundation"
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Audit provenance only: this immutable revision never reads the external path.
SCHEMA_CONTRACT_RELATIVE_PATH = "docs/frontend-upgrade/phase-1-schema-contract.json"
SCHEMA_CONTRACT_SHA256 = "4379b47a26173ce5ec4699af13d3e9c9c7f5bf99e499e9f0e52355d2b90e1d20"
SCHEMA_CONTRACT_JSON = r"""{
  "schemaVersion": 1,
  "owner": "alembic",
  "postgresMajor": 18,
  "metadataTable": "alembic_version",
  "applicationTables": [
    {
      "name": "users",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "email",
          "type": "varchar(320)",
          "nullable": false
        },
        {
          "name": "normalized_email",
          "type": "varchar(320)",
          "nullable": false
        },
        {
          "name": "password_hash",
          "type": "text",
          "nullable": true
        },
        {
          "name": "display_name",
          "type": "varchar(120)",
          "nullable": false
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "active"
        },
        {
          "name": "email_verified_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [
        [
          "normalized_email"
        ]
      ],
      "indexes": [
        {
          "name": "ix_users_status",
          "columns": [
            "status"
          ],
          "unique": false
        }
      ],
      "checks": [
        "status IN ('active','disabled','pending')"
      ]
    },
    {
      "name": "user_identities",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade"
        },
        {
          "name": "provider",
          "type": "varchar(24)",
          "nullable": false
        },
        {
          "name": "subject",
          "type": "varchar(255)",
          "nullable": false
        },
        {
          "name": "linked_email",
          "type": "varchar(320)",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [
        [
          "provider",
          "subject"
        ]
      ],
      "indexes": [
        {
          "name": "ix_user_identities_user_id",
          "columns": [
            "user_id"
          ],
          "unique": false
        }
      ],
      "checks": [
        "provider IN ('local','google')"
      ]
    },
    {
      "name": "sessions",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade"
        },
        {
          "name": "token_hash",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "csrf_hash",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "expires_at",
          "type": "timestamptz",
          "nullable": false
        },
        {
          "name": "last_seen_at",
          "type": "timestamptz",
          "nullable": false
        },
        {
          "name": "revoked_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [
        [
          "token_hash"
        ]
      ],
      "indexes": [
        {
          "name": "ix_sessions_user_id",
          "columns": [
            "user_id"
          ],
          "unique": false
        },
        {
          "name": "ix_sessions_expires_at",
          "columns": [
            "expires_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "expires_at > created_at"
      ]
    },
    {
      "name": "auth_challenges",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": true,
          "references": "users.id",
          "onDelete": "set null"
        },
        {
          "name": "kind",
          "type": "varchar(32)",
          "nullable": false
        },
        {
          "name": "token_hash",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "state_hash",
          "type": "char(64)",
          "nullable": true
        },
        {
          "name": "nonce_hash",
          "type": "char(64)",
          "nullable": true
        },
        {
          "name": "pkce_verifier_ciphertext",
          "type": "bytea",
          "nullable": true
        },
        {
          "name": "pkce_key_id",
          "type": "varchar(64)",
          "nullable": true
        },
        {
          "name": "redirect_path",
          "type": "varchar(512)",
          "nullable": true
        },
        {
          "name": "expires_at",
          "type": "timestamptz",
          "nullable": false
        },
        {
          "name": "consumed_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [
        [
          "kind",
          "token_hash"
        ]
      ],
      "indexes": [
        {
          "name": "ix_auth_challenges_expires_at",
          "columns": [
            "expires_at"
          ],
          "unique": false
        },
        {
          "name": "ix_auth_challenges_user_id",
          "columns": [
            "user_id"
          ],
          "unique": false
        }
      ],
      "checks": [
        "kind IN ('pre_auth_csrf','password_reset','email_verification','google_oauth')",
        "((kind = 'google_oauth' AND consumed_at IS NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NOT NULL AND pkce_key_id IS NOT NULL) OR (kind = 'google_oauth' AND consumed_at IS NOT NULL AND state_hash IS NOT NULL AND nonce_hash IS NOT NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL) OR (kind <> 'google_oauth' AND state_hash IS NULL AND nonce_hash IS NULL AND pkce_verifier_ciphertext IS NULL AND pkce_key_id IS NULL))"
      ]
    },
    {
      "name": "preferences",
      "columns": [
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade",
          "primaryKey": true
        },
        {
          "name": "theme",
          "type": "varchar(16)",
          "nullable": false,
          "default": "system"
        },
        {
          "name": "language",
          "type": "varchar(16)",
          "nullable": false,
          "default": "zh-CN"
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [],
      "indexes": [],
      "checks": [
        "theme IN ('light','dark','system')",
        "language IN ('zh-CN','en')",
        "version > 0"
      ]
    },
    {
      "name": "notifications",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade"
        },
        {
          "name": "kind",
          "type": "varchar(48)",
          "nullable": false
        },
        {
          "name": "title",
          "type": "varchar(200)",
          "nullable": false
        },
        {
          "name": "body",
          "type": "text",
          "nullable": false
        },
        {
          "name": "read_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [],
      "indexes": [
        {
          "name": "ix_notifications_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_notifications_user_read",
          "columns": [
            "user_id",
            "read_at"
          ],
          "unique": false
        }
      ],
      "checks": []
    },
    {
      "name": "plan_tasks",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade"
        },
        {
          "name": "title",
          "type": "varchar(240)",
          "nullable": false
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "open"
        },
        {
          "name": "sort_order",
          "type": "integer",
          "nullable": false,
          "default": 0
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
        },
        {
          "name": "completed_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [],
      "indexes": [
        {
          "name": "ix_plan_tasks_user_status_order",
          "columns": [
            "user_id",
            "status",
            "sort_order"
          ],
          "unique": false
        }
      ],
      "checks": [
        "status IN ('open','completed')",
        "sort_order >= 0",
        "version > 0"
      ]
    },
    {
      "name": "audit_events",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": true,
          "references": "users.id",
          "onDelete": "restrict"
        },
        {
          "name": "event_type",
          "type": "varchar(80)",
          "nullable": false
        },
        {
          "name": "idempotency_key_hash",
          "type": "char(64)",
          "nullable": true
        },
        {
          "name": "request_id",
          "type": "varchar(64)",
          "nullable": false
        },
        {
          "name": "details",
          "type": "jsonb",
          "nullable": false,
          "default": "{}"
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [],
      "indexes": [
        {
          "name": "ix_audit_events_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_audit_events_request_id",
          "columns": [
            "request_id"
          ],
          "unique": false
        },
        {
          "name": "uq_audit_events_idempotency",
          "columns": [
            "user_id",
            "event_type",
            "idempotency_key_hash"
          ],
          "unique": true,
          "where": "idempotency_key_hash IS NOT NULL"
        }
      ],
      "checks": [
        "idempotency_key_hash IS NULL OR user_id IS NOT NULL"
      ]
    },
    {
      "name": "media_objects",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "user_id",
          "type": "uuid",
          "nullable": false,
          "references": "users.id",
          "onDelete": "cascade"
        },
        {
          "name": "object_key",
          "type": "varchar(512)",
          "nullable": false
        },
        {
          "name": "content_type",
          "type": "varchar(120)",
          "nullable": false
        },
        {
          "name": "byte_size",
          "type": "bigint",
          "nullable": false
        },
        {
          "name": "sha256",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "pending"
        },
        {
          "name": "deleted_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "created_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "updated_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        }
      ],
      "unique": [
        [
          "object_key"
        ]
      ],
      "indexes": [
        {
          "name": "ix_media_objects_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_media_objects_status",
          "columns": [
            "status"
          ],
          "unique": false
        }
      ],
      "checks": [
        "byte_size > 0",
        "status IN ('pending','ready','deleted','failed')"
      ]
    }
  ],
  "pkceVerifierPolicy": {
    "storage": "short-lived-encrypted",
    "plaintextStored": false,
    "destroyOnConsume": true,
    "destroyOnExpiry": true,
    "expiredRowAction": "delete"
  },
  "auditRetentionPolicy": {
    "userDeletion": "restrict",
    "userLifecycle": "soft-disable-with-status",
    "previewDestruction": "governed-full-database-destroy"
  },
  "forbiddenTables": [
    "state_json",
    "xp_ledger",
    "coin_ledger",
    "rating_history",
    "league_entries",
    "problems",
    "interview_sessions"
  ],
  "forbiddenColumns": [
    "state_json",
    "legacy_id",
    "sqlite_rowid"
  ],
  "migrationRoundTrip": [
    "upgrade-head",
    "fingerprint",
    "downgrade-base",
    "empty",
    "upgrade-head",
    "same-fingerprint"
  ],
  "sharedPreviewDowngradeAllowed": false
}
"""
_TYPE_PATTERN = re.compile(r"^(varchar|char)\((\d+)\)$")


def _schema_contract() -> dict[str, Any]:
    rendered = SCHEMA_CONTRACT_JSON.encode("utf-8")
    if hashlib.sha256(rendered).hexdigest() != SCHEMA_CONTRACT_SHA256:
        raise RuntimeError("frozen Phase 1 schema contract is corrupt")
    contract = json.loads(SCHEMA_CONTRACT_JSON)
    if contract.get("schemaVersion") != 1 or contract.get("postgresMajor") != 18:
        raise RuntimeError("unsupported Phase 1 schema contract")
    if contract.get("metadataTable") != "alembic_version":
        raise RuntimeError("unexpected migration metadata table")

    application_tables = contract.get("applicationTables")
    if not isinstance(application_tables, list) or len(application_tables) != 9:
        raise RuntimeError("Phase 1 schema contract must define exactly nine application tables")
    table_names = {table["name"] for table in application_tables}
    forbidden_tables = set(contract.get("forbiddenTables", []))
    if table_names & forbidden_tables:
        raise RuntimeError("Phase 1 schema contract contains a forbidden table")
    column_names = {
        column["name"]
        for table in application_tables
        for column in table.get("columns", [])
    }
    if column_names & set(contract.get("forbiddenColumns", [])):
        raise RuntimeError("Phase 1 schema contract contains a forbidden column")
    return contract


def _column_type(type_name: str) -> sa.types.TypeEngine[Any]:
    bounded_string = _TYPE_PATTERN.fullmatch(type_name)
    if bounded_string:
        family, raw_length = bounded_string.groups()
        length = int(raw_length)
        return sa.String(length) if family == "varchar" else sa.CHAR(length)

    factories: dict[str, Any] = {
        "uuid": lambda: postgresql.UUID(as_uuid=True),
        "text": sa.Text,
        "timestamptz": lambda: sa.DateTime(timezone=True),
        "bytea": postgresql.BYTEA,
        "integer": sa.Integer,
        "bigint": sa.BigInteger,
        "jsonb": postgresql.JSONB,
    }
    try:
        return factories[type_name]()
    except KeyError as error:
        raise RuntimeError("unsupported column type in Phase 1 schema contract") from error


def _server_default(column: dict[str, Any]) -> sa.TextClause | None:
    if "default" not in column:
        return None
    default = column["default"]
    if default == "now()":
        return sa.text("now()")
    if column["type"] == "jsonb" and default == "{}":
        return sa.text("'{}'::jsonb")
    if isinstance(default, bool):
        return sa.text("true" if default else "false")
    if isinstance(default, (int, float)):
        return sa.text(str(default))
    if isinstance(default, str):
        return sa.text("'" + default.replace("'", "''") + "'")
    raise RuntimeError("unsupported server default in Phase 1 schema contract")


def _constraint_name(prefix: str, table_name: str, columns: list[str]) -> str:
    return "_".join((prefix, table_name, *columns))


def _table_elements(table: dict[str, Any]) -> list[Any]:
    table_name = table["name"]
    elements: list[Any] = []
    foreign_keys: list[tuple[str, str, str]] = []
    for column in table["columns"]:
        elements.append(
            sa.Column(
                column["name"],
                _column_type(column["type"]),
                nullable=column["nullable"],
                primary_key=column.get("primaryKey", False),
                server_default=_server_default(column),
            )
        )
        if "references" in column:
            foreign_keys.append(
                (column["name"], column["references"], column.get("onDelete", "restrict"))
            )

    for column_name, reference, on_delete in foreign_keys:
        elements.append(
            sa.ForeignKeyConstraint(
                [column_name],
                [reference],
                name=_constraint_name("fk", table_name, [column_name]),
                ondelete=on_delete.upper(),
            )
        )
    for columns in table.get("unique", []):
        elements.append(
            sa.UniqueConstraint(
                *columns,
                name=_constraint_name("uq", table_name, columns),
            )
        )
    for ordinal, expression in enumerate(table.get("checks", []), start=1):
        elements.append(
            sa.CheckConstraint(expression, name=f"ck_{table_name}_{ordinal}")
        )
    return elements


def upgrade() -> None:
    contract = _schema_contract()
    application_tables = contract["applicationTables"]
    for table in application_tables:
        op.create_table(table["name"], *_table_elements(table))

    for table in application_tables:
        for index in table.get("indexes", []):
            options: dict[str, Any] = {}
            if where_clause := index.get("where"):
                options["postgresql_where"] = sa.text(where_clause)
            op.create_index(
                index["name"],
                table["name"],
                index["columns"],
                unique=index["unique"],
                **options,
            )


def downgrade() -> None:
    application_tables = _schema_contract()["applicationTables"]
    for table in reversed(application_tables):
        op.drop_table(table["name"])
