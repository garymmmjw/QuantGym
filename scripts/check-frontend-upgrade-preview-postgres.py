#!/usr/bin/env python3
"""Verify the reserved frontend v2 Preview PostgreSQL resource safely."""

from __future__ import annotations

import hashlib
import ipaddress
import json
import os
import re
import stat as stat_module
import sys
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence
from urllib.parse import parse_qsl, unquote, urlsplit


PROJECT_ROOT = Path(__file__).resolve().parents[1]
EVIDENCE_RELATIVE_PATH = Path(
    "artifacts/frontend-upgrade/preview-environment/provider-evidence.redacted.json"
)
DEFAULT_EVIDENCE_PATH = PROJECT_ROOT / EVIDENCE_RELATIVE_PATH
AUTHENTICATED_SOURCE = (
    "cloudflare-and-render-https-apis-plus-operator-r2-scope-attestation"
)
CHECK_NAME = "frontend-v2-preview-postgres"
SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
DNS_LABEL_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$")
MAX_EVIDENCE_BYTES = 256 * 1024

ConnectFunction = Callable[..., Any]


class CheckFailure(Exception):
    """An expected, already-redacted validation failure."""

    def __init__(self, code: str) -> None:
        super().__init__()
        self.code = code


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_text(value: str) -> str:
    return sha256_bytes(value.encode("utf-8"))


def failure_summary(code: str) -> dict[str, Any]:
    return {
        "schemaVersion": 1,
        "check": CHECK_NAME,
        "status": "fail",
        "failureCodes": [code],
    }


def is_sha256(value: Any) -> bool:
    return isinstance(value, str) and SHA256_PATTERN.fullmatch(value) is not None


def select_evidence(evidence: Any) -> dict[str, str]:
    if not isinstance(evidence, dict):
        raise CheckFailure("provider_evidence_invalid")
    if type(evidence.get("schemaVersion")) is not int or evidence["schemaVersion"] != 1:
        raise CheckFailure("provider_evidence_invalid")
    if evidence.get("authenticatedSource") != AUTHENTICATED_SOURCE:
        raise CheckFailure("provider_evidence_invalid")

    render = evidence.get("render")
    postgres = render.get("postgres") if isinstance(render, dict) else None
    if not isinstance(postgres, dict):
        raise CheckFailure("provider_evidence_invalid")

    selected = {
        "resourceIdHash": postgres.get("resourceIdHash"),
        "hostHash": postgres.get("hostHash"),
        "databaseHash": postgres.get("databaseHash"),
        "roleHash": postgres.get("roleHash"),
        "productionResourceIdHash": render.get("productionPostgresResourceIdHash"),
    }
    if not all(is_sha256(value) for value in selected.values()):
        raise CheckFailure("provider_evidence_invalid")
    return selected  # type: ignore[return-value]


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


def parse_dsn_host(value: Any) -> str:
    if not isinstance(value, str) or not value or re.search(r"[\x00-\x1f\x7f]", value):
        raise CheckFailure("dsn_invalid")
    try:
        parsed = urlsplit(value)
        port = parsed.port
        query = parse_qsl(parsed.query, keep_blank_values=True, strict_parsing=True)
    except (TypeError, ValueError):
        raise CheckFailure("dsn_invalid") from None

    if parsed.scheme.lower() not in {"postgres", "postgresql"}:
        raise CheckFailure("dsn_invalid")
    if parsed.fragment or parsed.hostname is None or port is not None and not 1 <= port <= 65535:
        raise CheckFailure("dsn_invalid")
    if parsed.username is None or parsed.password is None:
        raise CheckFailure("dsn_invalid")

    host = parsed.hostname.lower()
    if not is_dns_hostname(host) or is_local_or_ip_host(host):
        raise CheckFailure("dsn_invalid")

    database_path = unquote(parsed.path)
    if (
        not database_path.startswith("/")
        or len(database_path) <= 1
        or "/" in database_path[1:]
        or "\\" in database_path
        or re.search(r"[\x00-\x1f\x7f]", database_path)
    ):
        raise CheckFailure("dsn_invalid")

    if len(query) > 1:
        raise CheckFailure("dsn_invalid")
    if query and (query[0][0].lower() != "sslmode" or query[0][1].lower() != "require"):
        raise CheckFailure("dsn_invalid")
    return host


def is_singleton_row(row: Any) -> bool:
    return isinstance(row, (tuple, list)) and len(row) == 1


def load_provider_evidence(environ: Mapping[str, str]) -> tuple[dict[str, Any], bytes]:
    raw_path = environ.get("QUANTGYM_PREVIEW_PROVIDER_EVIDENCE_PATH", "").strip()
    candidate = Path(raw_path).expanduser() if raw_path else DEFAULT_EVIDENCE_PATH
    if not candidate.is_absolute():
        candidate = PROJECT_ROOT / candidate

    descriptor: int | None = None
    try:
        project_real = PROJECT_ROOT.resolve(strict=True)
        expected_lexical = DEFAULT_EVIDENCE_PATH.absolute()
        candidate_lexical = candidate.absolute()
        expected_parent_real = DEFAULT_EVIDENCE_PATH.parent.resolve(strict=True)
        required_parent_real = project_real / EVIDENCE_RELATIVE_PATH.parent
        if (
            candidate_lexical != expected_lexical
            or expected_parent_real != required_parent_real
        ):
            raise CheckFailure("provider_evidence_invalid")

        flags = os.O_RDONLY | getattr(os, "O_NOFOLLOW", 0)
        descriptor = os.open(candidate_lexical, flags)
        before = os.fstat(descriptor)
        if (
            not stat_module.S_ISREG(before.st_mode)
            or before.st_size <= 0
            or before.st_size > MAX_EVIDENCE_BYTES
            or before.st_mode & 0o077
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


def run_check(
    *,
    environ: Mapping[str, str],
    connect_fn: ConnectFunction,
    evidence: Any,
    evidence_bytes: bytes,
) -> tuple[int, dict[str, Any]]:
    try:
        selected = select_evidence(evidence)
    except CheckFailure as failure:
        return 1, failure_summary(failure.code)

    evidence_sha256 = sha256_bytes(evidence_bytes)
    expected_evidence_sha256 = environ.get(
        "QUANTGYM_PREVIEW_EXPECTED_PROVIDER_EVIDENCE_SHA256",
        "",
    )
    if expected_evidence_sha256 and (
        not is_sha256(expected_evidence_sha256)
        or expected_evidence_sha256 != evidence_sha256
    ):
        return 1, failure_summary("provider_evidence_digest_mismatch")

    if selected["resourceIdHash"] == selected["productionResourceIdHash"]:
        return 1, failure_summary("resource_identity_reused")

    try:
        dsn = environ.get("QUANTGYM_PREVIEW_POSTGRES_URL", "")
        host = parse_dsn_host(dsn)
    except CheckFailure as failure:
        return 1, failure_summary(failure.code)

    host_hash = sha256_text(host)
    if host_hash != selected["hostHash"]:
        return 1, failure_summary("host_identity_mismatch")

    try:
        with connect_fn(
            dsn,
            autocommit=True,
            connect_timeout=15,
            sslmode="require",
        ) as connection:
            with connection.cursor() as cursor:
                cursor.execute("SELECT 1")
                select_one = cursor.fetchone()
                if not (
                    is_singleton_row(select_one)
                    and type(select_one[0]) is int
                    and select_one[0] == 1
                ):
                    raise CheckFailure("select_one_failed")

                cursor.execute("SELECT pg_backend_pid()")
                backend_pid_row = cursor.fetchone()
                if not (
                    is_singleton_row(backend_pid_row)
                    and type(backend_pid_row[0]) is int
                    and backend_pid_row[0] > 0
                ):
                    raise CheckFailure("backend_pid_invalid")
                backend_pid = backend_pid_row[0]

                cursor.execute(
                    "SELECT ssl FROM pg_catalog.pg_stat_ssl WHERE pid = %s",
                    (backend_pid,),
                )
                ssl_row = cursor.fetchone()
                if not is_singleton_row(ssl_row) or ssl_row[0] is not True:
                    raise CheckFailure("ssl_not_active")

                cursor.execute("SELECT current_database(), current_user")
                identity = cursor.fetchone()
                if not (
                    isinstance(identity, (tuple, list))
                    and len(identity) == 2
                    and isinstance(identity[0], str)
                    and bool(identity[0])
                    and isinstance(identity[1], str)
                    and bool(identity[1])
                ):
                    raise CheckFailure("runtime_identity_invalid")
                database_hash = sha256_text(identity[0])
                role_hash = sha256_text(identity[1])
                if database_hash != selected["databaseHash"]:
                    raise CheckFailure("database_identity_mismatch")
                if role_hash != selected["roleHash"]:
                    raise CheckFailure("role_identity_mismatch")

                cursor.execute(
                    """
                    SELECT count(*)
                    FROM pg_catalog.pg_class AS c
                    JOIN pg_catalog.pg_namespace AS n
                      ON n.oid = c.relnamespace
                    WHERE n.nspname = 'public'
                      AND c.relkind IN ('r', 'p')
                    """
                )
                table_count_row = cursor.fetchone()
                if not (
                    is_singleton_row(table_count_row)
                    and type(table_count_row[0]) is int
                    and table_count_row[0] == 0
                ):
                    raise CheckFailure("public_schema_not_empty")
                public_base_table_count = table_count_row[0]
    except CheckFailure as failure:
        return 1, failure_summary(failure.code)
    except Exception:
        return 1, failure_summary("connection_or_query_failed")

    summary = {
        "schemaVersion": 1,
        "check": CHECK_NAME,
        "status": "pass",
        "evidenceSha256": evidence_sha256,
        "hashes": {
            "resourceIdHash": selected["resourceIdHash"],
            "hostHash": host_hash,
            "databaseHash": database_hash,
            "roleHash": role_hash,
        },
        "checks": {
            "selectOne": True,
            "sslForCurrentBackend": True,
            "hostMatchesProviderEvidence": True,
            "databaseMatchesProviderEvidence": True,
            "roleMatchesProviderEvidence": True,
            "resourceDistinctFromProduction": True,
            "publicSchemaEmpty": True,
        },
        "publicBaseTableCount": public_base_table_count,
        "failureCodes": [],
    }
    return 0, summary


def main(
    argv: Sequence[str] | None = None,
    *,
    environ: Mapping[str, str] | None = None,
    connect_fn: ConnectFunction | None = None,
    evidence: Any = None,
    evidence_bytes: bytes | None = None,
) -> int:
    arguments = list(sys.argv[1:] if argv is None else argv)
    if arguments:
        print(json.dumps(failure_summary("unsupported_arguments"), sort_keys=True))
        return 2

    environment = os.environ if environ is None else environ
    if evidence is None:
        try:
            evidence, evidence_bytes = load_provider_evidence(environment)
        except CheckFailure as failure:
            print(json.dumps(failure_summary(failure.code), sort_keys=True))
            return 1
    elif evidence_bytes is None:
        try:
            evidence_bytes = json.dumps(
                evidence,
                ensure_ascii=False,
                separators=(",", ":"),
                sort_keys=True,
            ).encode("utf-8")
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

    try:
        status, summary = run_check(
            environ=environment,
            connect_fn=connect_fn,
            evidence=evidence,
            evidence_bytes=evidence_bytes,
        )
    except Exception:
        status, summary = 1, failure_summary("internal_check_failed")
    print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
    return status


if __name__ == "__main__":
    raise SystemExit(main())
