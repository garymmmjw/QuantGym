#!/usr/bin/env python3
"""Generate or execute a Postgres import SQL file from a QuantGym SQLite export.

The input must be a full `scripts/export-api-sqlite.py --include-sensitive`
export. By default this script only writes a SQL file and prints a redacted
summary. It calls `psql` only when `--execute` is explicitly set.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SCHEMA = PROJECT_ROOT / "api-server" / "postgres" / "schema.sql"
DEFAULT_OUT_DIR = PROJECT_ROOT / "artifacts" / "db-export"
JSON_COLUMNS = {
    "account_json",
    "state_json",
    "community_json",
    "metadata_json",
    "problem_json",
    "room_json",
    "tags_json",
}
TIMESTAMP_COLUMNS = {
    "created_at",
    "updated_at",
    "sent_at",
    "expires_at",
    "consumed_at",
    "archived_at",
}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def timestamp_slug() -> str:
    return datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%SZ")


def default_out_path() -> Path:
    return DEFAULT_OUT_DIR / f"quantgym-postgres-import-{timestamp_slug()}.sql"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", required=True, help="Full include-sensitive SQLite export JSON.")
    parser.add_argument("--schema", default=str(DEFAULT_SCHEMA), help="Postgres schema.sql path.")
    parser.add_argument("--out", default=str(default_out_path()), help="Output SQL file path.")
    parser.add_argument("--summary", default="", help="Optional JSON summary path.")
    parser.add_argument("--replace", action="store_true", help="Emit TRUNCATE ... CASCADE before inserting rows.")
    parser.add_argument("--confirm-replace", action="store_true", help="Required with --execute --replace.")
    parser.add_argument("--execute", action="store_true", help="Execute generated SQL with psql.")
    parser.add_argument("--init-schema", action="store_true", help="Run the Postgres schema before executing the import.")
    parser.add_argument("--execute-driver", choices=["psql", "psycopg"], default="psql", help="Execution driver for --execute. psycopg avoids requiring the psql CLI.")
    parser.add_argument("--database-url", default=os.environ.get("QUANTGYM_POSTGRES_DATABASE_URL") or os.environ.get("DATABASE_URL") or "", help="Postgres connection URL for --execute.")
    parser.add_argument("--psql-bin", default=os.environ.get("PSQL_BIN", "psql"), help="psql executable path.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    failures: list[str] = []
    warnings: list[str] = []
    export_path = Path(args.export).expanduser()
    schema_path = Path(args.schema).expanduser()
    out_path = Path(args.out).expanduser()

    schema_sql = read_text(schema_path, "Postgres schema", failures)
    pg_schema = parse_postgres_schema(schema_sql)
    payload = read_json(export_path, "SQLite export", failures)
    import_plan = validate_export_payload(payload, pg_schema, failures)
    sql_written = False
    sql_bytes = 0
    execution: dict[str, Any] = {"requested": bool(args.execute), "executed": False}

    if not failures:
        sql = build_import_sql(payload, pg_schema, import_plan["copyOrder"], replace=args.replace)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(sql, encoding="utf-8")
        sql_written = True
        sql_bytes = out_path.stat().st_size
        if args.execute:
            execution = execute_import(args, schema_sql, out_path, failures)

    summary = {
        "status": "fail" if failures else "pass",
        "generatedAt": utc_now(),
        "exportPath": str(export_path),
        "schemaPath": str(schema_path),
        "sqlPath": str(out_path),
        "sqlWritten": sql_written,
        "sqlBytes": sql_bytes,
        "replace": bool(args.replace),
        "containsSensitiveRows": True,
        "importPlan": import_plan,
        "execution": execution,
        "warnings": warnings,
        "failures": failures,
    }
    write_summary(args.summary, summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 1 if failures else 0


def read_text(path: Path, label: str, failures: list[str]) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except OSError as exc:
        failures.append(f"{label} is missing or unreadable: {exc}")
        return ""


def read_json(path: Path, label: str, failures: list[str]) -> dict[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        failures.append(f"{label} is missing or invalid JSON: {exc}")
        return {}
    if not isinstance(payload, dict):
        failures.append(f"{label} must be a JSON object.")
        return {}
    return payload


def parse_postgres_schema(sql: str) -> dict[str, Any]:
    tables: dict[str, dict[str, Any]] = {}
    for match in re.finditer(r"CREATE\s+TABLE\s+([a-zA-Z_][\w]*)\s*\((.*?)\);", sql, flags=re.IGNORECASE | re.DOTALL):
        table = match.group(1)
        body = match.group(2)
        columns = {}
        for item in split_sql_items(body):
            stripped = item.strip()
            if not stripped:
                continue
            first = stripped.split(None, 1)[0].lower()
            if first in {"primary", "foreign", "unique", "check", "constraint"} or first.startswith(("primary(", "foreign(", "unique(", "check(")):
                continue
            parts = stripped.split(None, 2)
            if len(parts) >= 2:
                columns[parts[0].strip('"')] = {
                    "type": parts[1].lower(),
                    "definition": stripped,
                }
        tables[table] = {"columns": columns, "sql": match.group(0)}
    return {"tables": tables}


def split_sql_items(body: str) -> list[str]:
    items = []
    current = []
    depth = 0
    in_quote = False
    quote_char = ""
    for char in body:
        if in_quote:
            current.append(char)
            if char == quote_char:
                in_quote = False
            continue
        if char in {"'", '"'}:
            in_quote = True
            quote_char = char
            current.append(char)
            continue
        if char == "(":
            depth += 1
        elif char == ")":
            depth = max(0, depth - 1)
        if char == "," and depth == 0:
            items.append("".join(current))
            current = []
        else:
            current.append(char)
    if current:
        items.append("".join(current))
    return items


def validate_export_payload(payload: dict[str, Any], pg_schema: dict[str, Any], failures: list[str]) -> dict[str, Any]:
    tables = payload.get("tables") if isinstance(payload.get("tables"), dict) else {}
    pg_tables = pg_schema.get("tables") or {}
    include_sensitive = payload.get("includeSensitive") is True
    summary_only = payload.get("summaryOnly") is True
    max_rows_per_table = payload.get("maxRowsPerTable")
    truncated_tables = find_truncated_tables(tables)
    row_count_mismatches = find_row_count_mismatches(tables)
    export_table_names = set(tables.keys())
    pg_table_names = set(pg_tables.keys())
    column_shape_ok = True
    json_values_checked = 0
    timestamp_values_checked = 0
    row_count = 0
    row_tables = 0

    if payload.get("status") != "pass":
        failures.append(f"SQLite export status must be pass, got {payload.get('status')!r}.")
    if not include_sensitive:
        failures.append("Postgres import requires an --include-sensitive SQLite export.")
    if summary_only:
        failures.append("Postgres import cannot use a --summary-only SQLite export.")
    if max_rows_per_table is not None:
        failures.append("Postgres import requires a full export; rerun without --max-rows-per-table.")
    if truncated_tables:
        failures.append(f"Postgres import export is truncated for tables: {truncated_tables}.")
    if row_count_mismatches:
        failures.append(f"Postgres import row counts do not match exported rows: {row_count_mismatches[:8]}.")
    if export_table_names != pg_table_names:
        failures.append(
            "Postgres import table set mismatch. "
            f"Missing: {sorted(pg_table_names - export_table_names)}; extra: {sorted(export_table_names - pg_table_names)}"
        )

    for table_name in sorted(pg_table_names & export_table_names):
        rows = tables.get(table_name, {}).get("rows")
        if not isinstance(rows, list):
            failures.append(f"Postgres import table {table_name} must contain a rows array.")
            column_shape_ok = False
            continue
        if rows:
            row_tables += 1
        pg_columns = set(pg_tables[table_name]["columns"].keys())
        for index, row in enumerate(rows):
            row_count += 1
            if not isinstance(row, dict):
                failures.append(f"Postgres import {table_name}[{index}] must be an object row.")
                column_shape_ok = False
                continue
            row_columns = set(row.keys())
            if row_columns != pg_columns:
                failures.append(
                    f"Postgres import {table_name}[{index}] column mismatch. "
                    f"Missing: {sorted(pg_columns - row_columns)}; extra: {sorted(row_columns - pg_columns)}"
                )
                column_shape_ok = False
            for column, value in row.items():
                if column in JSON_COLUMNS and value is not None:
                    json_values_checked += 1
                    normalize_json_value(value, f"{table_name}[{index}].{column}", failures)
                if column in TIMESTAMP_COLUMNS and value is not None:
                    timestamp_values_checked += 1
                    if not is_iso_timestamp(value):
                        failures.append(f"Postgres import {table_name}[{index}].{column} is not an ISO timestamp: {str(value)[:80]}")

    copy_order = topological_table_order(pg_schema)
    referenced_tables_first = referenced_tables_precede_dependents(pg_schema, copy_order)
    if not referenced_tables_first:
        failures.append("Postgres import order does not place referenced tables before dependent tables.")

    return {
        "tableCount": len(pg_table_names),
        "rowTables": row_tables,
        "rowCount": row_count,
        "copyOrder": copy_order,
        "jsonValuesChecked": json_values_checked,
        "timestampValuesChecked": timestamp_values_checked,
        "columnShapeOk": column_shape_ok,
        "referencedTablesFirst": referenced_tables_first,
    }


def build_import_sql(payload: dict[str, Any], pg_schema: dict[str, Any], copy_order: list[str], *, replace: bool) -> str:
    tables = payload.get("tables") if isinstance(payload.get("tables"), dict) else {}
    lines = [
        "-- QuantGym Postgres import generated from a secured include-sensitive SQLite export.",
        "-- Treat this file as sensitive: it can contain password/session hashes and user data.",
        f"-- Generated at: {utc_now()}",
        "BEGIN;",
        "SET LOCAL statement_timeout = '10min';",
        "SET LOCAL lock_timeout = '30s';",
    ]
    if replace:
        quoted_tables = ", ".join(quote_ident(table) for table in reversed(copy_order))
        lines.append(f"TRUNCATE {quoted_tables} RESTART IDENTITY CASCADE;")

    for table in copy_order:
        table_info = pg_schema["tables"][table]
        columns = list(table_info["columns"].keys())
        rows = tables.get(table, {}).get("rows") or []
        lines.append("")
        lines.append(f"-- {table}: {len(rows)} rows")
        for row in rows:
            column_sql = ", ".join(quote_ident(column) for column in columns)
            value_sql = ", ".join(sql_literal(row.get(column), table_info["columns"][column]["type"], column) for column in columns)
            lines.append(f"INSERT INTO {quote_ident(table)} ({column_sql}) VALUES ({value_sql});")

    lines.extend(["COMMIT;", ""])
    return "\n".join(lines)


def sql_literal(value: Any, pg_type: str, column: str) -> str:
    if value is None:
        return "NULL"
    if column in JSON_COLUMNS or pg_type == "jsonb":
        return f"{quote_literal(normalize_json_value(value))}::jsonb"
    if column in TIMESTAMP_COLUMNS or pg_type == "timestamptz":
        return f"{quote_literal(str(value))}::timestamptz"
    if pg_type in {"integer", "bigint", "smallint"}:
        return str(int(value))
    if pg_type in {"numeric", "real", "double"}:
        return str(float(value))
    return quote_literal(stringify_export_value(value))


def normalize_json_value(value: Any, label: str = "json value", failures: list[str] | None = None) -> str:
    try:
        parsed = json.loads(value) if isinstance(value, str) else value
        return json.dumps(parsed, ensure_ascii=False, separators=(",", ":"))
    except (TypeError, json.JSONDecodeError) as exc:
        if failures is not None:
            failures.append(f"{label} is not valid JSON: {exc}")
            return "null"
        raise


def stringify_export_value(value: Any) -> str:
    if isinstance(value, dict) and set(value.keys()) == {"base64"}:
        return str(value["base64"])
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False, separators=(",", ":"))
    return str(value)


def quote_ident(name: str) -> str:
    return '"' + str(name).replace('"', '""') + '"'


def quote_literal(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def table_dependencies(pg_schema: dict[str, Any]) -> dict[str, set[str]]:
    dependencies: dict[str, set[str]] = {}
    for table, info in (pg_schema.get("tables") or {}).items():
        sql = normalize_sql(info.get("sql", ""))
        referenced = set()
        for match in re.finditer(r"references\s+([a-zA-Z_][\w]*)\s*\(", sql):
            parent = match.group(1)
            if parent != table:
                referenced.add(parent)
        dependencies[table] = referenced
    return dependencies


def topological_table_order(pg_schema: dict[str, Any]) -> list[str]:
    dependencies = table_dependencies(pg_schema)
    remaining = {table: set(parents) for table, parents in dependencies.items()}
    order: list[str] = []
    while remaining:
        ready = sorted(table for table, parents in remaining.items() if not (parents & set(remaining.keys())))
        if not ready:
            order.extend(sorted(remaining.keys()))
            break
        for table in ready:
            order.append(table)
            remaining.pop(table, None)
    return order


def referenced_tables_precede_dependents(pg_schema: dict[str, Any], order: list[str]) -> bool:
    positions = {table: index for index, table in enumerate(order)}
    for table, parents in table_dependencies(pg_schema).items():
        for parent in parents:
            if positions.get(parent, -1) > positions.get(table, -1):
                return False
    return True


def execute_import(args: argparse.Namespace, schema_sql: str, sql_path: Path, failures: list[str]) -> dict[str, Any]:
    if not args.database_url:
        failures.append("--execute requires --database-url or QUANTGYM_POSTGRES_DATABASE_URL.")
        return {"requested": True, "executed": False, "driver": args.execute_driver, "initSchema": bool(args.init_schema)}
    if args.replace and not args.confirm_replace:
        failures.append("--execute --replace requires --confirm-replace.")
        return {"requested": True, "executed": False, "driver": args.execute_driver, "initSchema": bool(args.init_schema)}
    if args.execute_driver == "psycopg":
        return execute_with_psycopg(args, schema_sql, sql_path, failures)
    return execute_with_psql(args, sql_path, failures)


def execute_with_psql(args: argparse.Namespace, sql_path: Path, failures: list[str]) -> dict[str, Any]:
    command = [args.psql_bin, args.database_url, "-v", "ON_ERROR_STOP=1"]
    if args.init_schema:
        command.extend(["-c", idempotent_schema_sql(Path(args.schema).expanduser().read_text(encoding="utf-8"))])
    command.extend(["-f", str(sql_path)])
    run = subprocess.run(
        command,
        cwd=PROJECT_ROOT,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if run.returncode != 0:
        failures.append(f"psql import failed with exit code {run.returncode}.")
    return {
        "requested": True,
        "driver": "psql",
        "initSchema": bool(args.init_schema),
        "executed": run.returncode == 0,
        "exitCode": run.returncode,
        "databaseUrlSet": True,
        "stdoutTail": tail(run.stdout),
        "stderrTail": tail(run.stderr),
    }


def execute_with_psycopg(args: argparse.Namespace, schema_sql: str, sql_path: Path, failures: list[str]) -> dict[str, Any]:
    try:
        import psycopg  # type: ignore[import-not-found]
    except Exception as exc:
        failures.append(f"psycopg import driver is unavailable: {exc}")
        return {
            "requested": True,
            "driver": "psycopg",
            "initSchema": bool(args.init_schema),
            "executed": False,
            "databaseUrlSet": True,
        }
    try:
        sql = sql_path.read_text(encoding="utf-8")
        with psycopg.connect(args.database_url, autocommit=True) as conn:
            with conn.cursor() as cur:
                if args.init_schema:
                    cur.execute(idempotent_schema_sql(schema_sql))
                cur.execute(sql)
    except Exception as exc:
        failures.append(f"psycopg import failed: {exc}")
        return {
            "requested": True,
            "driver": "psycopg",
            "initSchema": bool(args.init_schema),
            "executed": False,
            "databaseUrlSet": True,
        }
    return {
        "requested": True,
        "driver": "psycopg",
        "initSchema": bool(args.init_schema),
        "executed": True,
        "databaseUrlSet": True,
    }


def idempotent_schema_sql(sql: str) -> str:
    text = re.sub(
        r"\bCREATE\s+TABLE\s+(?!IF\s+NOT\s+EXISTS\b)",
        "CREATE TABLE IF NOT EXISTS ",
        str(sql or ""),
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bCREATE\s+INDEX\s+(?!IF\s+NOT\s+EXISTS\b)",
        "CREATE INDEX IF NOT EXISTS ",
        text,
        flags=re.IGNORECASE,
    )
    return text


def find_truncated_tables(tables: dict[str, Any]) -> list[str]:
    return [table for table, item in sorted(tables.items()) if isinstance(item, dict) and item.get("truncated") is True]


def find_row_count_mismatches(tables: dict[str, Any]) -> list[dict[str, Any]]:
    mismatches = []
    for table_name, item in sorted(tables.items()):
        if not isinstance(item, dict) or "rows" not in item:
            continue
        rows = item.get("rows")
        if not isinstance(rows, list):
            continue
        row_count = item.get("rowCount") if isinstance(item.get("rowCount"), int) else None
        exported_rows = item.get("exportedRows") if isinstance(item.get("exportedRows"), int) else None
        actual_rows = len(rows)
        expected_rows = row_count if row_count is not None else exported_rows
        if exported_rows is not None and exported_rows != actual_rows:
            mismatches.append({"table": table_name, "rowCount": row_count, "exportedRows": exported_rows, "actualRows": actual_rows})
            continue
        if expected_rows is not None and expected_rows != actual_rows:
            mismatches.append({"table": table_name, "rowCount": row_count, "exportedRows": exported_rows, "actualRows": actual_rows})
    return mismatches


def is_iso_timestamp(value: Any) -> bool:
    text = str(value or "").strip()
    if not text:
        return False
    try:
        datetime.fromisoformat(text.replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


def normalize_sql(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace('"', "").lower())


def write_summary(path: str, payload: dict[str, Any]) -> None:
    if not path:
        return
    summary_path = Path(path).expanduser()
    summary_path.parent.mkdir(parents=True, exist_ok=True)
    summary_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def tail(value: str, limit: int = 2000) -> str:
    text = str(value or "").strip()
    return text[-limit:]


if __name__ == "__main__":
    sys.exit(main())
