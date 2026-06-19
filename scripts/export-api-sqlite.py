#!/usr/bin/env python3
"""Export and preflight-check the QuantGym API SQLite database.

The default export is redacted so it is safe to keep under ignored artifacts.
Use --include-sensitive only for a secured migration or backup destination.
"""

from __future__ import annotations

import argparse
import base64
import json
import os
import sqlite3
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_DB = PROJECT_ROOT / "api-server" / "data" / "quantgym.sqlite3"
DEFAULT_OUT_DIR = PROJECT_ROOT / "artifacts" / "db-export"

REDACTED_VALUE_COLUMNS = {
    "password_salt",
    "password_hash",
    "token_hash",
    "code_salt",
    "code_hash",
    "storage_path",
}

REDACTED_TEXT_COLUMNS = {
    "text",
    "prompt_en",
    "prompt_zh",
    "answer",
    "explanation",
}

REDACTED_JSON_COLUMNS = {
    "account_json",
    "state_json",
    "community_json",
    "metadata_json",
    "problem_json",
    "room_json",
    "tags_json",
}

PII_COLUMNS = {
    "email_norm",
    "ip",
    "user_agent",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def quote_ident(name: str) -> str:
    return '"' + str(name).replace('"', '""') + '"'


def default_db_path() -> Path:
    return Path(os.environ.get("QUANTGYM_DB") or DEFAULT_DB).expanduser()


def default_out_path() -> Path:
    return DEFAULT_OUT_DIR / f"quantgym-sqlite-export-{timestamp_slug()}.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", default=str(default_db_path()), help="SQLite database path. Defaults to QUANTGYM_DB or api-server/data/quantgym.sqlite3.")
    parser.add_argument("--out", default=str(default_out_path()), help="Output JSON path.")
    parser.add_argument("--summary-only", action="store_true", help="Write checks, schema, and counts without row data.")
    parser.add_argument("--include-sensitive", action="store_true", help="Export unredacted rows for secured migration/backup use.")
    parser.add_argument("--max-rows-per-table", type=int, default=0, help="Limit exported rows per table. 0 means no limit.")
    parser.add_argument("--allow-missing", action="store_true", help="Return a skipped result instead of failing when the DB file is missing.")
    return parser.parse_args()


def connect_readonly(path: Path) -> sqlite3.Connection:
    uri = path.resolve().as_uri() + "?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def fetch_pragma_scalar(conn: sqlite3.Connection, name: str) -> Any:
    row = conn.execute(f"PRAGMA {name}").fetchone()
    return row[0] if row else None


def table_names(conn: sqlite3.Connection) -> list[str]:
    rows = conn.execute(
        """
        SELECT name
        FROM sqlite_master
        WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
        ORDER BY name
        """
    ).fetchall()
    return [str(row["name"]) for row in rows]


def schema_items(conn: sqlite3.Connection, kind: str) -> list[dict[str, Any]]:
    rows = conn.execute(
        """
        SELECT name, tbl_name, sql
        FROM sqlite_master
        WHERE type = ?
          AND name NOT LIKE 'sqlite_%'
        ORDER BY tbl_name, name
        """,
        (kind,),
    ).fetchall()
    return [
        {
            "name": row["name"],
            "table": row["tbl_name"],
            "sql": row["sql"] or "",
        }
        for row in rows
    ]


def row_count(conn: sqlite3.Connection, table: str) -> int:
    return int(conn.execute(f"SELECT COUNT(*) FROM {quote_ident(table)}").fetchone()[0] or 0)


def mask_email(value: Any) -> str:
    text = str(value or "")
    if "@" not in text:
        return "[redacted]"
    name, domain = text.split("@", 1)
    return f"{name[:2]}***@{domain}"


def redacted_summary(value: Any, label: str = "redacted") -> dict[str, Any] | None:
    if value is None:
        return None
    if isinstance(value, bytes):
        size = len(value)
    else:
        size = len(str(value))
    return {"redacted": label, "bytes": size}


def serialize_value(value: Any) -> Any:
    if isinstance(value, bytes):
        return {"base64": base64.b64encode(value).decode("ascii")}
    return value


def redact_value(column: str, value: Any, include_sensitive: bool) -> Any:
    column_norm = column.lower()
    if include_sensitive:
        return serialize_value(value)
    if column_norm in REDACTED_VALUE_COLUMNS:
        return redacted_summary(value, "secret")
    if column_norm in REDACTED_JSON_COLUMNS:
        return redacted_summary(value, "json")
    if column_norm in REDACTED_TEXT_COLUMNS:
        return redacted_summary(value, "text")
    if column_norm == "email_norm":
        return mask_email(value)
    if column_norm in PII_COLUMNS:
        return redacted_summary(value, "pii")
    return serialize_value(value)


def export_rows(
    conn: sqlite3.Connection,
    table: str,
    *,
    include_sensitive: bool,
    max_rows: int,
) -> list[dict[str, Any]]:
    limit_sql = ""
    params: tuple[int, ...] = ()
    if max_rows > 0:
        limit_sql = " LIMIT ?"
        params = (max_rows,)
    rows = conn.execute(f"SELECT * FROM {quote_ident(table)}{limit_sql}", params).fetchall()
    exported = []
    for row in rows:
        exported.append({key: redact_value(key, row[key], include_sensitive) for key in row.keys()})
    return exported


def run_checks(conn: sqlite3.Connection) -> dict[str, Any]:
    integrity_rows = [str(row[0]) for row in conn.execute("PRAGMA integrity_check").fetchall()]
    foreign_rows = conn.execute("PRAGMA foreign_key_check").fetchall()
    foreign_key_issues = [dict(row) for row in foreign_rows]
    pragmas = {
        "pageCount": fetch_pragma_scalar(conn, "page_count"),
        "pageSize": fetch_pragma_scalar(conn, "page_size"),
        "freelistCount": fetch_pragma_scalar(conn, "freelist_count"),
        "journalMode": fetch_pragma_scalar(conn, "journal_mode"),
        "userVersion": fetch_pragma_scalar(conn, "user_version"),
    }
    return {
        "integrity": integrity_rows,
        "integrityOk": integrity_rows == ["ok"],
        "foreignKeyIssues": foreign_key_issues,
        "foreignKeyOk": not foreign_key_issues,
        "pragmas": pragmas,
    }


def build_export(args: argparse.Namespace, db_path: Path) -> dict[str, Any]:
    with connect_readonly(db_path) as conn:
        checks = run_checks(conn)
        names = table_names(conn)
        tables: dict[str, Any] = {}
        schema_tables = schema_items(conn, "table")
        table_counts = {}
        for name in names:
            count = row_count(conn, name)
            table_counts[name] = count
            item: dict[str, Any] = {"rowCount": count}
            if not args.summary_only:
                rows = export_rows(
                    conn,
                    name,
                    include_sensitive=args.include_sensitive,
                    max_rows=max(0, args.max_rows_per_table),
                )
                item["rows"] = rows
                item["exportedRows"] = len(rows)
                item["truncated"] = args.max_rows_per_table > 0 and count > len(rows)
            tables[name] = item

        status = "pass" if checks["integrityOk"] and checks["foreignKeyOk"] else "fail"
        return {
            "status": status,
            "generatedAt": utc_now(),
            "dbPath": str(db_path),
            "dbSizeBytes": db_path.stat().st_size,
            "includeSensitive": bool(args.include_sensitive),
            "summaryOnly": bool(args.summary_only),
            "maxRowsPerTable": max(0, args.max_rows_per_table) or None,
            "checks": checks,
            "schema": {
                "tables": [
                    {
                        **item,
                        "rowCount": table_counts.get(str(item["name"]), 0),
                    }
                    for item in schema_tables
                ],
                "indexes": schema_items(conn, "index"),
            },
            "tables": tables,
        }


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> int:
    args = parse_args()
    db_path = Path(args.db).expanduser()
    out_path = Path(args.out).expanduser()

    if not db_path.exists():
        payload = {
            "status": "skipped" if args.allow_missing else "fail",
            "generatedAt": utc_now(),
            "dbPath": str(db_path),
            "error": "SQLite database file does not exist.",
        }
        write_json(out_path, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 0 if args.allow_missing else 1

    try:
        payload = build_export(args, db_path)
        write_json(out_path, payload)
    except sqlite3.Error as exc:
        payload = {
            "status": "fail",
            "generatedAt": utc_now(),
            "dbPath": str(db_path),
            "error": f"SQLite error: {exc}",
        }
        write_json(out_path, payload)
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return 1

    summary = {
        "status": payload["status"],
        "output": str(out_path),
        "dbPath": payload["dbPath"],
        "dbSizeBytes": payload["dbSizeBytes"],
        "includeSensitive": payload["includeSensitive"],
        "summaryOnly": payload["summaryOnly"],
        "integrityOk": payload["checks"]["integrityOk"],
        "foreignKeyOk": payload["checks"]["foreignKeyOk"],
        "tables": {name: item["rowCount"] for name, item in payload["tables"].items()},
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0 if payload["status"] == "pass" else 1


if __name__ == "__main__":
    sys.exit(main())
