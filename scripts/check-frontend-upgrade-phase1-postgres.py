#!/usr/bin/env python3
"""Verify the Phase 1 Preview PostgreSQL binding and frozen schema safely.

The destructive upgrade/downgrade/upgrade proof runs only in an ephemeral
PostgreSQL 18 container.  The shared Preview database is otherwise read-only,
except for an explicitly confirmed cleanup that can remove only the fixed
Phase 1 synthetic-audit identity namespace after the live auth probe.
"""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import re
import stat as stat_module
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence
from urllib.parse import parse_qsl, unquote, urlsplit, urlunsplit


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_RELATIVE_PATH = Path(
    "artifacts/frontend-upgrade/phase-1-preview/provider-evidence.redacted.json"
)
DEFAULT_EVIDENCE_PATH = PROJECT_ROOT / EVIDENCE_RELATIVE_PATH
SCHEMA_CONTRACT_PATH = (
    PROJECT_ROOT / "docs/frontend-upgrade/phase-1-schema-contract.json"
)
ALEMBIC_INI_PATH = PROJECT_ROOT / "api/alembic.ini"
EPHEMERAL_POSTGRES_IMAGE = "postgres:18"
EXPECTED_POSTGRES_MAJOR = 18
EXPECTED_PYTHON_VERSION = (3, 13, 14)
EXPECTED_ALEMBIC_HEAD = "0001_phase1_foundation"
EXPECTED_SCHEMA_CONTRACT_SHA256 = (
    "4379b47a26173ce5ec4699af13d3e9c9c7f5bf99e499e9f0e52355d2b90e1d20"
)
EXPECTED_BRANCH = "codex/frontend-v2-preview"
CHECK_NAME = "frontend-v2-phase1-postgres"
CLEANUP_CONFIRMATION_ENV = "QUANTGYM_PHASE1_CLEANUP_SYNTHETIC_AUDIT_DATA"
CLEANUP_CONFIRMATION_VALUE = "confirmed"
MAX_SYNTHETIC_AUDIT_USERS = 32
MAX_ANONYMOUS_CHALLENGE_TARGETS = 2
MAX_CLEANUP_INPUT_BYTES = 4 * 1024
ANONYMOUS_CHALLENGE_KINDS = frozenset({"pre_auth_csrf", "google_oauth"})
SYNTHETIC_AUDIT_EMAIL_PATTERN = re.compile(
    r"^phase1-audit-[a-z0-9._-]+@example[.]com$"
)
MAX_EVIDENCE_BYTES = 256 * 1024
MAX_EVIDENCE_AGE_SECONDS = 7 * 24 * 60 * 60
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
SHA_PATTERN = re.compile(r"^[a-f0-9]{40}$")
DNS_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")

ConnectFunction = Callable[..., Any]
MigrationProbeFunction = Callable[[], Mapping[str, Any]]
AnonymousChallengeTarget = tuple[str, str, bool]


class CheckFailure(Exception):
    """An expected, already-redacted validation failure."""

    def __init__(self, code: str) -> None:
        super().__init__()
        self.code = code


class ExplicitTransactionConnection:
    """Commit only a fully successful check; otherwise roll back and close."""

    def __init__(self, connection: Any) -> None:
        self.connection = connection

    def __enter__(self) -> Any:
        return self.connection

    def __exit__(
        self,
        exception_type: Any,
        _exception: Any,
        _traceback: Any,
    ) -> bool:
        try:
            if exception_type is None:
                try:
                    self.connection.commit()
                except Exception:
                    self.connection.rollback()
                    raise
            else:
                self.connection.rollback()
        finally:
            self.connection.close()
        return False


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def canonical_bytes(value: Any) -> bytes:
    return json.dumps(
        value,
        ensure_ascii=False,
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")


def fingerprint(value: Any) -> str:
    return sha256_bytes(canonical_bytes(value))


def failure_summary(code: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "check": CHECK_NAME,
        "status": "fail",
        "failureCodes": [code],
    }


def require_locked_python_runtime() -> tuple[int, int, int]:
    version = tuple(sys.version_info[:3])
    if version != EXPECTED_PYTHON_VERSION:
        raise CheckFailure("python_runtime_mismatch")
    return version


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and SHA256_PATTERN.fullmatch(value) is not None


def is_sha(value: Any) -> bool:
    return isinstance(value, str) and SHA_PATTERN.fullmatch(value) is not None


def validate_anonymous_challenge_targets(
    value: Any,
) -> tuple[AnonymousChallengeTarget, ...]:
    if (
        not isinstance(value, list)
        or len(value) > MAX_ANONYMOUS_CHALLENGE_TARGETS
    ):
        raise CheckFailure("synthetic_cleanup_targets_invalid")
    targets: list[AnonymousChallengeTarget] = []
    seen_kinds: set[str] = set()
    for item in value:
        kind = item.get("kind") if isinstance(item, dict) else None
        if (
            not isinstance(item, dict)
            or set(item) != {"kind", "tokenHash", "expectedConsumed"}
            or not isinstance(kind, str)
            or kind not in ANONYMOUS_CHALLENGE_KINDS
            or kind in seen_kinds
            or not is_sha256(item.get("tokenHash"))
            or item.get("expectedConsumed") is not True
        ):
            raise CheckFailure("synthetic_cleanup_targets_invalid")
        seen_kinds.add(kind)
        targets.append((kind, item["tokenHash"], True))
    return tuple(targets)


def parse_cleanup_input(value: bytes) -> tuple[AnonymousChallengeTarget, ...]:
    if not isinstance(value, bytes) or not value or len(value) > MAX_CLEANUP_INPUT_BYTES:
        raise CheckFailure("synthetic_cleanup_targets_invalid")
    try:
        payload = json.loads(value.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        raise CheckFailure("synthetic_cleanup_targets_invalid") from None
    if (
        not isinstance(payload, dict)
        or set(payload) != {"schemaVersion", "anonymousChallengeTargets"}
        or payload.get("schemaVersion") != 1
    ):
        raise CheckFailure("synthetic_cleanup_targets_invalid")
    return validate_anonymous_challenge_targets(
        payload["anonymousChallengeTargets"]
    )


def require_plain_dict(value: Any, code: str = "provider_evidence_invalid") -> dict[str, Any]:
    if not isinstance(value, dict):
        raise CheckFailure(code)
    return value


def parse_iso8601(value: Any) -> datetime:
    if not isinstance(value, str) or not value.endswith("Z"):
        raise CheckFailure("provider_evidence_invalid")
    try:
        parsed = datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        raise CheckFailure("provider_evidence_invalid") from None
    if parsed.tzinfo is None:
        raise CheckFailure("provider_evidence_invalid")
    return parsed.astimezone(timezone.utc)


def select_evidence(evidence: Any, now: datetime) -> dict[str, Any]:
    root = require_plain_dict(evidence)
    if (
        root.get("schemaVersion") != 1
        or root.get("environment") != "preview"
        or root.get("branch") != EXPECTED_BRANCH
        or root.get("postgresMajor") != EXPECTED_POSTGRES_MAJOR
        or not is_sha(root.get("applicationCommit"))
    ):
        raise CheckFailure("provider_evidence_invalid")

    captured_at = parse_iso8601(root.get("capturedAt"))
    expires_at = parse_iso8601(root.get("expiresAt"))
    normalized_now = now.astimezone(timezone.utc)
    lifetime = (expires_at - captured_at).total_seconds()
    if (
        lifetime <= 0
        or lifetime > MAX_EVIDENCE_AGE_SECONDS
        or captured_at > normalized_now
        or expires_at < normalized_now
    ):
        raise CheckFailure("provider_evidence_stale")

    fingerprints = require_plain_dict(root.get("resourceFingerprints"))
    postgres_fingerprint = fingerprints.get("postgres")
    role_fingerprint = fingerprints.get("postgresRole")
    production_fingerprint = fingerprints.get("productionPostgres")
    if not all(
        is_sha256(value)
        for value in (
            postgres_fingerprint,
            role_fingerprint,
            production_fingerprint,
        )
    ):
        raise CheckFailure("provider_evidence_invalid")
    if postgres_fingerprint == production_fingerprint:
        raise CheckFailure("resource_identity_reused")

    bindings = require_plain_dict(root.get("bindings"))
    postgres_binding = require_plain_dict(bindings.get("postgres"))
    if postgres_binding != {"status": "ready", "isolated": True}:
        raise CheckFailure("postgres_binding_not_isolated")

    return {
        "commit": root["applicationCommit"],
        "postgresResourceSha256": postgres_fingerprint,
        "postgresRoleSha256": role_fingerprint,
        "productionPostgresSha256": production_fingerprint,
    }


def is_dns_hostname(host: str) -> bool:
    if not host or len(host) > 253 or host.startswith(".") or host.endswith("."):
        return False
    if ".." in host or any(ord(character) < 33 or ord(character) == 127 for character in host):
        return False
    return all(DNS_LABEL_PATTERN.fullmatch(label) is not None for label in host.split("."))


def is_local_or_ip_host(host: str) -> bool:
    if host == "localhost" or host.endswith(".localhost") or host.endswith(".local"):
        return True
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        return False
    if address.version == 6 and getattr(address, "ipv4_mapped", None):
        address = address.ipv4_mapped
    return (
        address.is_loopback
        or address.is_private
        or address.is_link_local
        or address.is_unspecified
        or address.is_reserved
        or address.is_multicast
    )


def is_safe_url_credential(value: str | None) -> bool:
    if value is None or re.search(r"%(?![0-9A-Fa-f]{2})", value):
        return False
    try:
        decoded = unquote(value, errors="strict")
    except UnicodeError:
        return False
    return bool(decoded) and len(decoded) <= 512 and not any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in decoded
    )


def parse_dsn(value: Any) -> dict[str, str]:
    if not isinstance(value, str) or not value or value != value.strip():
        raise CheckFailure("dsn_invalid")
    if re.search(r"[\x00-\x1f\x7f]", value):
        raise CheckFailure("dsn_invalid")
    try:
        parsed = urlsplit(value)
        port = parsed.port
        query_items = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
    except (TypeError, ValueError):
        raise CheckFailure("dsn_invalid") from None

    if parsed.scheme not in {"postgresql", "postgresql+psycopg"}:
        raise CheckFailure("dsn_invalid")
    if (
        parsed.fragment
        or parsed.hostname is None
        or not is_safe_url_credential(parsed.username)
        or not is_safe_url_credential(parsed.password)
        or port not in {None, 5432}
    ):
        raise CheckFailure("dsn_invalid")

    host = parsed.hostname.lower().rstrip(".")
    if not is_dns_hostname(host) or is_local_or_ip_host(host):
        raise CheckFailure("dsn_invalid")

    database_path = unquote(parsed.path)
    if (
        not database_path.startswith("/")
        or database_path.count("/") != 1
        or len(database_path) <= 1
        or "\\" in database_path
        or re.search(r"[\x00-\x1f\x7f]", database_path)
    ):
        raise CheckFailure("dsn_invalid")
    database = database_path[1:]
    database_tokens = {
        token for token in re.split(r"[^a-z0-9]+", database.lower()) if token
    }
    if (
        "quantgym" not in database.lower()
        or "preview" not in database.lower()
        or database_tokens.intersection({"prod", "production"})
    ):
        raise CheckFailure("dsn_invalid")

    query: dict[str, list[str]] = {}
    for key, item in query_items:
        query.setdefault(key.lower(), []).append(item)
    if set(query) != {"sslmode"}:
        raise CheckFailure("dsn_invalid")
    ssl_modes = query["sslmode"]
    if len(ssl_modes) != 1 or ssl_modes[0] not in {"require", "verify-ca", "verify-full"}:
        raise CheckFailure("dsn_invalid")

    connection_url = urlunsplit(parsed._replace(scheme="postgresql"))
    return {
        "connectionUrl": connection_url,
        "host": host,
        "database": database,
        "sslMode": ssl_modes[0],
    }


def load_schema_contract() -> dict[str, Any]:
    try:
        raw = SCHEMA_CONTRACT_PATH.read_bytes()
        contract = json.loads(raw)
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise CheckFailure("schema_contract_invalid") from None
    if (
        sha256_bytes(raw) != EXPECTED_SCHEMA_CONTRACT_SHA256
        or not isinstance(contract, dict)
        or contract.get("schemaVersion") != 1
        or contract.get("postgresMajor") != EXPECTED_POSTGRES_MAJOR
        or contract.get("metadataTable") != "alembic_version"
        or not isinstance(contract.get("applicationTables"), list)
        or len(contract["applicationTables"]) != 9
    ):
        raise CheckFailure("schema_contract_invalid")
    return contract


def normalize_type(value: Any) -> str:
    if not isinstance(value, str):
        raise CheckFailure("schema_snapshot_invalid")
    normalized = " ".join(value.lower().split())
    aliases = (
        ("timestamp with time zone", "timestamptz"),
        ("character varying", "varchar"),
        ("character", "char"),
    )
    for source, replacement in aliases:
        if normalized == source:
            return replacement
        if normalized.startswith(source + "("):
            return replacement + normalized[len(source) :]
    return normalized


def strip_outer_parentheses(value: str) -> str:
    current = value.strip()
    while current.startswith("(") and current.endswith(")"):
        depth = 0
        encloses_all = True
        for index, character in enumerate(current):
            if character == "(":
                depth += 1
            elif character == ")":
                depth -= 1
                if depth == 0 and index != len(current) - 1:
                    encloses_all = False
                    break
            if depth < 0:
                encloses_all = False
                break
        if not encloses_all or depth != 0:
            break
        current = current[1:-1].strip()
    return current


def normalize_default(value: Any) -> Any:
    if value in (None, ""):
        return None
    if not isinstance(value, str):
        raise CheckFailure("schema_snapshot_invalid")
    normalized = strip_outer_parentheses(" ".join(value.strip().split()))
    normalized = re.sub(
        r"::(?:character varying|text|bpchar|jsonb|integer|bigint)(?:\[\])?$",
        "",
        normalized,
        flags=re.IGNORECASE,
    )
    normalized = strip_outer_parentheses(normalized)
    if normalized.lower() in {"now()", "current_timestamp"}:
        return "now()"
    if re.fullmatch(r"-?[0-9]+", normalized):
        return int(normalized)
    if normalized.startswith("'") and normalized.endswith("'"):
        return normalized[1:-1].replace("''", "'")
    return normalized


def normalized_sql(value: Any) -> str:
    if not isinstance(value, str):
        raise CheckFailure("schema_snapshot_invalid")
    return " ".join(value.split())


def fetch_all(cursor: Any) -> list[Any]:
    rows = cursor.fetchall()
    if not isinstance(rows, (tuple, list)):
        raise CheckFailure("schema_snapshot_invalid")
    return list(rows)


def collect_schema_snapshot(cursor: Any) -> dict[str, Any]:
    cursor.execute(
        """
        SELECT c.relname
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
        ORDER BY c.relname
        """
    )
    table_rows = fetch_all(cursor)
    tables = []
    for row in table_rows:
        if not isinstance(row, (tuple, list)) or len(row) != 1 or not isinstance(row[0], str):
            raise CheckFailure("schema_snapshot_invalid")
        tables.append(row[0])

    cursor.execute(
        """
        SELECT
          c.relname,
          a.attname,
          pg_catalog.format_type(a.atttypid, a.atttypmod),
          NOT a.attnotnull,
          COALESCE(pg_catalog.pg_get_expr(d.adbin, d.adrelid), ''),
          EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint AS pk
            WHERE pk.conrelid = c.oid
              AND pk.contype = 'p'
              AND a.attnum = ANY(pk.conkey)
          )
        FROM pg_catalog.pg_class AS c
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        JOIN pg_catalog.pg_attribute AS a ON a.attrelid = c.oid
        LEFT JOIN pg_catalog.pg_attrdef AS d
          ON d.adrelid = c.oid AND d.adnum = a.attnum
        WHERE n.nspname = 'public'
          AND c.relkind IN ('r', 'p')
          AND a.attnum > 0
          AND NOT a.attisdropped
        ORDER BY c.relname, a.attnum
        """
    )
    columns = []
    for row in fetch_all(cursor):
        if (
            not isinstance(row, (tuple, list))
            or len(row) != 6
            or not isinstance(row[0], str)
            or not isinstance(row[1], str)
            or type(row[3]) is not bool
            or type(row[5]) is not bool
        ):
            raise CheckFailure("schema_snapshot_invalid")
        columns.append(
            {
                "table": row[0],
                "name": row[1],
                "type": normalize_type(row[2]),
                "nullable": row[3],
                "default": normalize_default(row[4]),
                "primaryKey": row[5],
            }
        )

    cursor.execute(
        """
        SELECT
          c.relname,
          con.conname,
          con.contype,
          pg_catalog.pg_get_constraintdef(con.oid, false)
        FROM pg_catalog.pg_constraint AS con
        JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND con.contype IN ('p', 'f', 'u', 'c')
        ORDER BY c.relname, con.conname
        """
    )
    constraints = []
    for row in fetch_all(cursor):
        if (
            not isinstance(row, (tuple, list))
            or len(row) != 4
            or not all(isinstance(item, str) for item in row)
            or row[2] not in {"p", "f", "u", "c"}
        ):
            raise CheckFailure("schema_snapshot_invalid")
        constraints.append(
            {
                "table": row[0],
                "name": row[1],
                "kind": row[2],
                "definition": normalized_sql(row[3]),
            }
        )

    cursor.execute(
        """
        SELECT
          table_class.relname,
          index_class.relname,
          pg_catalog.pg_get_indexdef(index_class.oid)
        FROM pg_catalog.pg_index AS idx
        JOIN pg_catalog.pg_class AS table_class ON table_class.oid = idx.indrelid
        JOIN pg_catalog.pg_class AS index_class ON index_class.oid = idx.indexrelid
        JOIN pg_catalog.pg_namespace AS n ON n.oid = table_class.relnamespace
        WHERE n.nspname = 'public'
          AND NOT EXISTS (
            SELECT 1
            FROM pg_catalog.pg_constraint AS con
            WHERE con.conindid = idx.indexrelid
          )
        ORDER BY table_class.relname, index_class.relname
        """
    )
    indexes = []
    for row in fetch_all(cursor):
        if (
            not isinstance(row, (tuple, list))
            or len(row) != 3
            or not all(isinstance(item, str) for item in row)
        ):
            raise CheckFailure("schema_snapshot_invalid")
        indexes.append(
            {
                "table": row[0],
                "name": row[1],
                "definition": normalized_sql(row[2]),
            }
        )

    return {
        "tables": tables,
        "columns": columns,
        "constraints": constraints,
        "indexes": indexes,
    }


def expected_constraint_keys(contract: Mapping[str, Any]) -> list[tuple[str, str, str]]:
    expected: list[tuple[str, str, str]] = []
    for table in contract["applicationTables"]:
        table_name = table["name"]
        primary_columns = [
            column["name"] for column in table["columns"] if column.get("primaryKey") is True
        ]
        if primary_columns:
            expected.append((table_name, f"{table_name}_pkey", "p"))
        for column in table["columns"]:
            if "references" in column:
                expected.append((table_name, f"fk_{table_name}_{column['name']}", "f"))
        for columns in table.get("unique", []):
            expected.append((table_name, "_".join(("uq", table_name, *columns)), "u"))
        for ordinal, _expression in enumerate(table.get("checks", []), start=1):
            expected.append((table_name, f"ck_{table_name}_{ordinal}", "c"))
    return sorted(expected)


def validate_snapshot_against_contract(
    snapshot: Mapping[str, Any],
    contract: Mapping[str, Any],
) -> None:
    expected_tables = sorted(
        [contract["metadataTable"], *[table["name"] for table in contract["applicationTables"]]]
    )
    if snapshot.get("tables") != expected_tables:
        raise CheckFailure("schema_contract_mismatch")

    expected_columns = []
    for table in sorted(contract["applicationTables"], key=lambda item: item["name"]):
        for column in table["columns"]:
            expected_columns.append(
                {
                    "table": table["name"],
                    "name": column["name"],
                    "type": column["type"],
                    "nullable": column["nullable"],
                    "default": column.get("default"),
                    "primaryKey": column.get("primaryKey", False),
                }
            )
    actual_application_columns = [
        column
        for column in snapshot.get("columns", [])
        if column.get("table") != contract["metadataTable"]
    ]
    actual_application_columns.sort(
        key=lambda column: (
            snapshot["tables"].index(column["table"]),
            next(
                index
                for index, candidate in enumerate(
                    next(
                        table["columns"]
                        for table in contract["applicationTables"]
                        if table["name"] == column["table"]
                    )
                )
                if candidate["name"] == column["name"]
            )
            if any(
                candidate["name"] == column["name"]
                for candidate in next(
                    table["columns"]
                    for table in contract["applicationTables"]
                    if table["name"] == column["table"]
                )
            )
            else 10_000,
        )
    )
    expected_columns.sort(
        key=lambda column: (
            snapshot["tables"].index(column["table"]),
            next(
                index
                for index, candidate in enumerate(
                    next(
                        table["columns"]
                        for table in contract["applicationTables"]
                        if table["name"] == column["table"]
                    )
                )
                if candidate["name"] == column["name"]
            ),
        )
    )
    if actual_application_columns != expected_columns:
        raise CheckFailure("schema_contract_mismatch")

    constraint_keys = sorted(
        (item.get("table"), item.get("name"), item.get("kind"))
        for item in snapshot.get("constraints", [])
        if item.get("table") != contract["metadataTable"]
    )
    if constraint_keys != expected_constraint_keys(contract):
        raise CheckFailure("schema_contract_mismatch")

    expected_indexes = sorted(
        (table["name"], index["name"])
        for table in contract["applicationTables"]
        for index in table.get("indexes", [])
    )
    actual_indexes = sorted(
        (item.get("table"), item.get("name"))
        for item in snapshot.get("indexes", [])
        if item.get("table") != contract["metadataTable"]
    )
    if actual_indexes != expected_indexes:
        raise CheckFailure("schema_contract_mismatch")

    forbidden_tables = {"state_json", *contract.get("forbiddenTables", [])}
    forbidden_columns = set(contract.get("forbiddenColumns", []))
    if forbidden_tables.intersection(snapshot.get("tables", [])):
        raise CheckFailure("legacy_schema_detected")
    if forbidden_columns.intersection(
        column.get("name") for column in snapshot.get("columns", [])
    ):
        raise CheckFailure("legacy_schema_detected")


def application_row_count(cursor: Any, contract: Mapping[str, Any]) -> int:
    total = 0
    for table in contract["applicationTables"]:
        table_name = table["name"]
        if not re.fullmatch(r"[a-z][a-z0-9_]*", table_name):
            raise CheckFailure("schema_contract_invalid")
        cursor.execute(f'SELECT count(*) FROM public."{table_name}"')
        row = cursor.fetchone()
        if (
            not isinstance(row, (tuple, list))
            or len(row) != 1
            or type(row[0]) is not int
            or row[0] < 0
        ):
            raise CheckFailure("application_row_count_invalid")
        total += row[0]
    return total


def cleanup_synthetic_audit_data(
    cursor: Any,
    contract: Mapping[str, Any],
    confirmation: str,
    anonymous_challenge_targets: Sequence[AnonymousChallengeTarget],
) -> int:
    """Delete only explicitly namespaced Phase 1 audit identities and their rows."""

    if confirmation != CLEANUP_CONFIRMATION_VALUE:
        raise CheckFailure("synthetic_cleanup_confirmation_invalid")

    cursor.execute(
        """
        SELECT id, normalized_email
        FROM public.users
        WHERE normalized_email ~ %s
        ORDER BY normalized_email
        LIMIT %s
        FOR UPDATE
        """,
        (
            SYNTHETIC_AUDIT_EMAIL_PATTERN.pattern,
            MAX_SYNTHETIC_AUDIT_USERS + 1,
        ),
    )
    candidates = fetch_all(cursor)
    if len(candidates) > MAX_SYNTHETIC_AUDIT_USERS:
        raise CheckFailure("synthetic_cleanup_scope_exceeded")

    identifiers: list[Any] = []
    for candidate in candidates:
        if (
            not isinstance(candidate, (tuple, list))
            or len(candidate) != 2
            or not SYNTHETIC_AUDIT_EMAIL_PATTERN.fullmatch(candidate[1] or "")
        ):
            raise CheckFailure("synthetic_cleanup_scope_invalid")
        identifier = candidate[0]
        if not re.fullmatch(
            r"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-"
            r"[89ab][0-9a-f]{3}-[0-9a-f]{12}",
            str(identifier).lower(),
        ):
            raise CheckFailure("synthetic_cleanup_scope_invalid")
        identifiers.append(identifier)

    child_tables: list[str] = []
    for table in contract["applicationTables"]:
        table_name = table["name"]
        for column in table["columns"]:
            if (
                column.get("name") == "user_id"
                and column.get("references") == "users.id"
            ):
                child_tables.append(table_name)
                break
    if not child_tables or "users" in child_tables:
        raise CheckFailure("schema_contract_invalid")

    if identifiers:
        # Explicit child deletion also covers RESTRICT and SET NULL relationships,
        # so the audit leaves no orphaned rows. Every predicate uses the previously
        # validated UUID set selected from the synthetic email namespace.
        for table_name in sorted(child_tables):
            if not re.fullmatch(r"[a-z][a-z0-9_]*", table_name):
                raise CheckFailure("schema_contract_invalid")
            cursor.execute(
                f'DELETE FROM public."{table_name}" WHERE user_id = ANY(%s)',
                (identifiers,),
            )
        cursor.execute(
            "DELETE FROM public.users WHERE id = ANY(%s)",
            (identifiers,),
        )

    if len(anonymous_challenge_targets) > MAX_ANONYMOUS_CHALLENGE_TARGETS:
        raise CheckFailure("synthetic_cleanup_targets_invalid")
    for kind, token_hash, expected_consumed in anonymous_challenge_targets:
        if (
            kind not in ANONYMOUS_CHALLENGE_KINDS
            or not is_sha256(token_hash)
            or expected_consumed is not True
        ):
            raise CheckFailure("synthetic_cleanup_targets_invalid")
        cursor.execute(
            """
            SELECT id, kind, token_hash, consumed_at
            FROM public.auth_challenges
            WHERE user_id IS NULL
              AND kind = %s
              AND token_hash = %s
            FOR UPDATE
            """,
            (kind, token_hash),
        )
        challenge_rows = fetch_all(cursor)
        if len(challenge_rows) != 1:
            raise CheckFailure("synthetic_cleanup_target_missing")
        challenge = challenge_rows[0]
        if (
            not isinstance(challenge, (tuple, list))
            or len(challenge) != 4
            or challenge[1] != kind
            or challenge[2] != token_hash
            or not re.fullmatch(
                r"[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-"
                r"[89ab][0-9a-f]{3}-[0-9a-f]{12}",
                str(challenge[0]).lower(),
            )
        ):
            raise CheckFailure("synthetic_cleanup_target_invalid")
        if expected_consumed and challenge[3] is None:
            raise CheckFailure("synthetic_cleanup_target_not_consumed")
        cursor.execute(
            """
            DELETE FROM public.auth_challenges
            WHERE id = %s
              AND user_id IS NULL
              AND kind = %s
              AND token_hash = %s
            """,
            (challenge[0], kind, token_hash),
        )
        if getattr(cursor, "rowcount", None) != 1:
            raise CheckFailure("synthetic_cleanup_target_changed")
        cursor.execute(
            """
            SELECT id, kind, token_hash, consumed_at
            FROM public.auth_challenges
            WHERE user_id IS NULL
              AND kind = %s
              AND token_hash = %s
            FOR UPDATE
            """,
            (kind, token_hash),
        )
        if fetch_all(cursor):
            raise CheckFailure("synthetic_data_cleanup_incomplete")

    cursor.execute(
        """
        SELECT id, normalized_email
        FROM public.users
        WHERE normalized_email ~ %s
        ORDER BY normalized_email
        LIMIT %s
        FOR UPDATE
        """,
        (
            SYNTHETIC_AUDIT_EMAIL_PATTERN.pattern,
            MAX_SYNTHETIC_AUDIT_USERS + 1,
        ),
    )
    if fetch_all(cursor):
        raise CheckFailure("synthetic_data_cleanup_incomplete")
    return len(identifiers)


def load_provider_evidence() -> tuple[dict[str, Any], bytes]:
    descriptor: int | None = None
    candidate = DEFAULT_EVIDENCE_PATH.absolute()
    try:
        project_real = PROJECT_ROOT.resolve(strict=True)
        parent_real = DEFAULT_EVIDENCE_PATH.parent.resolve(strict=True)
        required_parent = project_real / EVIDENCE_RELATIVE_PATH.parent
        if parent_real != required_parent:
            raise CheckFailure("provider_evidence_invalid")
        if not hasattr(os, "O_NOFOLLOW"):
            raise CheckFailure("provider_evidence_invalid")
        descriptor = os.open(candidate, os.O_RDONLY | os.O_NOFOLLOW)
        before = os.fstat(descriptor)
        current_uid = os.getuid() if hasattr(os, "getuid") else before.st_uid
        if (
            not stat_module.S_ISREG(before.st_mode)
            or before.st_size <= 0
            or before.st_size > MAX_EVIDENCE_BYTES
            or before.st_mode & 0o777 != 0o600
            or before.st_uid != current_uid
        ):
            raise CheckFailure("provider_evidence_invalid")
        with os.fdopen(descriptor, "rb", closefd=False) as handle:
            evidence_bytes = handle.read(MAX_EVIDENCE_BYTES + 1)
        after = os.fstat(descriptor)
        if (
            len(evidence_bytes) != before.st_size
            or len(evidence_bytes) > MAX_EVIDENCE_BYTES
            or after.st_dev != before.st_dev
            or after.st_ino != before.st_ino
            or after.st_size != before.st_size
            or after.st_mtime_ns != before.st_mtime_ns
        ):
            raise CheckFailure("provider_evidence_invalid")
        evidence = json.loads(evidence_bytes)
    except CheckFailure:
        raise
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise CheckFailure("provider_evidence_invalid") from None
    finally:
        if descriptor is not None:
            try:
                os.close(descriptor)
            except OSError:
                pass
    if not isinstance(evidence, dict):
        raise CheckFailure("provider_evidence_invalid")
    return evidence, evidence_bytes


def run_ephemeral_migration_probe() -> Mapping[str, Any]:
    """Run the destructive symmetry proof only in a disposable PG18 container."""

    require_locked_python_runtime()
    try:
        from alembic import command
        from alembic.config import Config
        from sqlalchemy import create_engine
        from testcontainers.postgres import PostgresContainer
    except ImportError:
        raise CheckFailure("migration_probe_unavailable") from None

    container = None
    engine = None
    try:
        container = PostgresContainer(EPHEMERAL_POSTGRES_IMAGE, driver="psycopg")
        container.start()
        engine = create_engine(container.get_connection_url())
        with engine.connect() as connection:
            major = int(connection.exec_driver_sql("SHOW server_version_num").scalar_one()) // 10_000
            config = Config(str(ALEMBIC_INI_PATH))
            config.attributes["connection"] = connection

            command.upgrade(config, "head")
            driver_connection = connection.connection.driver_connection
            with driver_connection.cursor() as cursor:
                first = collect_schema_snapshot(cursor)

            command.downgrade(config, "base")
            with driver_connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT c.relname
                    FROM pg_catalog.pg_class AS c
                    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
                    ORDER BY c.relname
                    """
                )
                remaining = [
                    row[0]
                    for row in fetch_all(cursor)
                    if row[0] != "alembic_version"
                ]

            command.upgrade(config, "head")
            with driver_connection.cursor() as cursor:
                second = collect_schema_snapshot(cursor)
        contract = load_schema_contract()
        validate_snapshot_against_contract(first, contract)
        return {
            "image": EPHEMERAL_POSTGRES_IMAGE,
            "major": major,
            "firstSchemaSha256": fingerprint(first),
            "secondSchemaSha256": fingerprint(second),
            "applicationTablesEmptyAfterDowngrade": remaining == [],
        }
    except CheckFailure:
        raise
    except Exception:
        raise CheckFailure("migration_probe_failed") from None
    finally:
        if engine is not None:
            try:
                engine.dispose()
            except Exception:
                pass
        if container is not None:
            try:
                container.stop()
            except Exception:
                pass


def validate_migration_probe(probe: Mapping[str, Any]) -> str:
    if (
        not isinstance(probe, Mapping)
        or probe.get("image") != EPHEMERAL_POSTGRES_IMAGE
        or probe.get("major") != EXPECTED_POSTGRES_MAJOR
        or not is_sha256(probe.get("firstSchemaSha256"))
        or probe.get("firstSchemaSha256") != probe.get("secondSchemaSha256")
        or probe.get("applicationTablesEmptyAfterDowngrade") is not True
    ):
        raise CheckFailure("migration_round_trip_failed")
    return probe["firstSchemaSha256"]


def run_check(
    *,
    environ: Mapping[str, str],
    connect_fn: ConnectFunction,
    migration_probe_fn: MigrationProbeFunction,
    evidence: Any,
    evidence_bytes: bytes,
    now: datetime,
    cleanup_targets: Sequence[AnonymousChallengeTarget] | None = None,
) -> tuple[int, dict[str, Any]]:
    try:
        require_locked_python_runtime()
        if now.tzinfo is None:
            raise CheckFailure("check_time_invalid")
        cleanup_confirmation = environ.get(CLEANUP_CONFIRMATION_ENV, "")
        if cleanup_confirmation not in {"", CLEANUP_CONFIRMATION_VALUE}:
            raise CheckFailure("synthetic_cleanup_confirmation_invalid")
        if cleanup_confirmation and cleanup_targets is None:
            raise CheckFailure("synthetic_cleanup_targets_invalid")
        if (
            not cleanup_confirmation
            and cleanup_targets is not None
            and tuple(cleanup_targets) != ()
        ):
            raise CheckFailure("synthetic_cleanup_confirmation_invalid")
        anonymous_challenge_targets = tuple(cleanup_targets or ())
        if (
            len(anonymous_challenge_targets) > MAX_ANONYMOUS_CHALLENGE_TARGETS
            or any(
                not isinstance(target, tuple)
                or len(target) != 3
                or target[0] not in ANONYMOUS_CHALLENGE_KINDS
                or not is_sha256(target[1])
                or target[2] is not True
                for target in anonymous_challenge_targets
            )
            or len({target[0] for target in anonymous_challenge_targets})
            != len(anonymous_challenge_targets)
        ):
            raise CheckFailure("synthetic_cleanup_targets_invalid")
        selected = select_evidence(evidence, now)
        evidence_sha256 = sha256_bytes(evidence_bytes)
        expected_evidence_sha256 = environ.get(
            "QUANTGYM_PHASE1_EXPECTED_PROVIDER_EVIDENCE_SHA256",
            "",
        )
        if expected_evidence_sha256 and (
            not is_sha256(expected_evidence_sha256)
            or expected_evidence_sha256 != evidence_sha256
        ):
            raise CheckFailure("provider_evidence_digest_mismatch")

        parsed_dsn = parse_dsn(environ.get("QUANTGYM_PREVIEW_POSTGRES_URL", ""))
        expected_schema_sha256 = validate_migration_probe(migration_probe_fn())
        contract = load_schema_contract()

        with ExplicitTransactionConnection(connect_fn(
            parsed_dsn["connectionUrl"],
            autocommit=False,
            connect_timeout=15,
            sslmode=parsed_dsn["sslMode"],
        )) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SET TRANSACTION ISOLATION LEVEL SERIALIZABLE")
                cursor.execute("SELECT 1")
                select_one = cursor.fetchone()
                if (
                    not isinstance(select_one, (tuple, list))
                    or len(select_one) != 1
                    or type(select_one[0]) is not int
                    or select_one[0] != 1
                ):
                    raise CheckFailure("select_one_failed")

                cursor.execute("SHOW server_version_num")
                version_row = cursor.fetchone()
                if (
                    not isinstance(version_row, (tuple, list))
                    or len(version_row) != 1
                    or not isinstance(version_row[0], (str, int))
                ):
                    raise CheckFailure("postgres_major_invalid")
                try:
                    live_major = int(version_row[0]) // 10_000
                except (TypeError, ValueError):
                    raise CheckFailure("postgres_major_invalid") from None
                if live_major != EXPECTED_POSTGRES_MAJOR:
                    raise CheckFailure("postgres_major_mismatch")

                cursor.execute("SELECT pg_backend_pid()")
                pid_row = cursor.fetchone()
                if (
                    not isinstance(pid_row, (tuple, list))
                    or len(pid_row) != 1
                    or type(pid_row[0]) is not int
                    or pid_row[0] <= 0
                ):
                    raise CheckFailure("backend_pid_invalid")
                cursor.execute(
                    "SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid = %s",
                    (pid_row[0],),
                )
                ssl_row = cursor.fetchone()
                if (
                    not isinstance(ssl_row, (tuple, list))
                    or len(ssl_row) != 1
                    or ssl_row[0] is not True
                ):
                    raise CheckFailure("ssl_not_active")

                cursor.execute("SELECT current_database(), current_user")
                identity = cursor.fetchone()
                if (
                    not isinstance(identity, (tuple, list))
                    or len(identity) != 2
                    or not all(isinstance(value, str) and value for value in identity)
                ):
                    raise CheckFailure("runtime_identity_invalid")
                if identity[0] != parsed_dsn["database"]:
                    raise CheckFailure("database_identity_mismatch")
                role_sha256 = sha256_text(identity[1])
                if role_sha256 != selected["postgresRoleSha256"]:
                    raise CheckFailure("role_identity_mismatch")

                cursor.execute(
                    "SELECT version_num FROM public.alembic_version ORDER BY version_num"
                )
                head_rows = fetch_all(cursor)
                if head_rows != [(EXPECTED_ALEMBIC_HEAD,)]:
                    raise CheckFailure("alembic_head_mismatch")

                live_snapshot = collect_schema_snapshot(cursor)
                validate_snapshot_against_contract(live_snapshot, contract)
                live_schema_sha256 = fingerprint(live_snapshot)
                if live_schema_sha256 != expected_schema_sha256:
                    raise CheckFailure("schema_fingerprint_mismatch")

                synthetic_users_deleted = 0
                if cleanup_confirmation:
                    synthetic_users_deleted = cleanup_synthetic_audit_data(
                        cursor,
                        contract,
                        cleanup_confirmation,
                        anonymous_challenge_targets,
                    )
                row_count = application_row_count(cursor, contract)
                if row_count != 0:
                    raise CheckFailure("synthetic_data_cleanup_incomplete")

        runtime_identity_sha256 = fingerprint(
            [parsed_dsn["host"], identity[0], identity[1]]
        )
        checked_at = now.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace(
            "+00:00",
            "Z",
        )
        summary = {
            "schemaVersion": 1,
            "check": CHECK_NAME,
            "status": "pass",
            "checkedAt": checked_at,
            "commit": selected["commit"],
            "evidenceSha256": evidence_sha256,
            "hashes": {
                "postgresResourceSha256": selected["postgresResourceSha256"],
                "postgresRoleSha256": role_sha256,
                "runtimeIdentitySha256": runtime_identity_sha256,
                "schemaSha256": live_schema_sha256,
                "migrationRoundTripSha256": expected_schema_sha256,
            },
            "checks": {
                "providerEvidenceCurrent": True,
                "resourceDistinctFromProduction": True,
                "authenticatedPreviewBinding": True,
                "postgresMajor18": True,
                "ephemeralImagePinnedToPostgres18": True,
                "sslForCurrentBackend": True,
                "exactAlembicHead": True,
                "schemaMatchesFrozenContract": True,
                "legacyTablesAndColumnsAbsent": True,
                "migrationRoundTripDeterministic": True,
                "syntheticCleanupExplicitlyAuthorized": bool(cleanup_confirmation),
                "applicationDataCleaned": True,
            },
            "counts": {
                "postgresMajor": live_major,
                "applicationTables": len(contract["applicationTables"]),
                "metadataTables": 1,
                "applicationRows": row_count,
                "syntheticUsersDeleted": synthetic_users_deleted,
            },
            "failureCodes": [],
        }
        return 0, summary
    except CheckFailure as failure:
        return 1, failure_summary(failure.code)
    except Exception:
        return 1, failure_summary("connection_or_query_failed")


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    connect_fn: ConnectFunction | None = None,
    migration_probe_fn: MigrationProbeFunction | None = None,
    evidence: Any = None,
    evidence_bytes: bytes | None = None,
    now: datetime | None = None,
    cleanup_targets: Sequence[AnonymousChallengeTarget] | None = None,
    input_stream: Any = None,
) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if arguments:
        print(json.dumps(failure_summary("unsupported_arguments"), sort_keys=True))
        return 2

    try:
        require_locked_python_runtime()
    except CheckFailure as failure:
        print(json.dumps(failure_summary(failure.code), sort_keys=True))
        return 1

    environment = os.environ if environ is None else environ
    if evidence is None:
        try:
            evidence, evidence_bytes = load_provider_evidence()
        except CheckFailure as failure:
            print(json.dumps(failure_summary(failure.code), sort_keys=True))
            return 1
    elif evidence_bytes is None:
        try:
            evidence_bytes = canonical_bytes(evidence)
        except (TypeError, ValueError):
            print(json.dumps(failure_summary("provider_evidence_invalid"), sort_keys=True))
            return 1
    if not isinstance(evidence_bytes, bytes):
        print(json.dumps(failure_summary("provider_evidence_invalid"), sort_keys=True))
        return 1

    if connect_fn is None:
        try:
            import psycopg  # type: ignore[import-not-found]
        except ImportError:
            print(json.dumps(failure_summary("driver_unavailable"), sort_keys=True))
            return 1
        connect_fn = psycopg.connect
    probe = migration_probe_fn or run_ephemeral_migration_probe
    check_time = now or datetime.now(timezone.utc)
    parsed_cleanup_targets = cleanup_targets
    if (
        environment.get(CLEANUP_CONFIRMATION_ENV, "")
        == CLEANUP_CONFIRMATION_VALUE
        and parsed_cleanup_targets is None
    ):
        stream = input_stream if input_stream is not None else sys.stdin.buffer
        try:
            cleanup_input = stream.read(MAX_CLEANUP_INPUT_BYTES + 1)
            parsed_cleanup_targets = parse_cleanup_input(cleanup_input)
        except CheckFailure as failure:
            print(json.dumps(failure_summary(failure.code), sort_keys=True))
            return 1
        except Exception:
            print(
                json.dumps(
                    failure_summary("synthetic_cleanup_targets_invalid"),
                    sort_keys=True,
                )
            )
            return 1

    status, summary = run_check(
        environ=environment,
        connect_fn=connect_fn,
        migration_probe_fn=probe,
        evidence=evidence,
        evidence_bytes=evidence_bytes,
        now=check_time,
        cleanup_targets=parsed_cleanup_targets,
    )
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return status


if __name__ == "__main__":
    raise SystemExit(main())
