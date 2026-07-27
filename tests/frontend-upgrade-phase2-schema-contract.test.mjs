import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const phase1Path = path.join(root, "docs/frontend-upgrade/phase-1-schema-contract.json");
const phase2Path = path.join(root, "docs/frontend-upgrade/phase-2-schema-contract.json");
const phase1Raw = await readFile(phase1Path, "utf8");
const phase2Raw = await readFile(phase2Path, "utf8");
const phase1 = JSON.parse(phase1Raw);
const phase2 = JSON.parse(phase2Raw);

const PHASE1_TABLES = [
  "users",
  "user_identities",
  "sessions",
  "auth_challenges",
  "preferences",
  "notifications",
  "plan_tasks",
  "audit_events",
  "media_objects",
];

const PHASE2_TABLES = [
  "problem_sources",
  "problems",
  "problem_progress",
  "favorites",
  "notes",
  "plans",
  "recommendations",
  "training_sessions",
  "attempts",
  "answers",
  "training_events",
  "xp_ledger",
  "idempotency_records",
];

const tableByName = new Map(phase2.newTables.map((table) => [table.name, table]));
const alterationByName = new Map(phase2.alteredTables.map((table) => [table.name, table]));

const columnNames = (table) => table.columns.map((column) => column.name);
const uniqueIncludes = (table, expected) => table.unique.some(
  (columns) => JSON.stringify(columns) === JSON.stringify(expected),
);
const indexByName = (table, name) => table.indexes.find((index) => index.name === name);

test("locks PostgreSQL 18, the immutable Phase 1 foundation, and the exact 0002 inventory", () => {
  assert.equal(phase2.schemaVersion, 2);
  assert.equal(phase2.phase, 2);
  assert.equal(phase2.owner, "alembic");
  assert.equal(phase2.postgresMajor, 18);
  assert.equal(phase2.metadataTable, "alembic_version");
  assert.deepEqual(phase2.revision, {
    id: "0002_phase2_daily_training",
    downRevision: "0001_phase1_foundation",
    path: "api/migrations/versions/0002_phase2_daily_training.py",
  });

  assert.deepEqual(phase1.applicationTables.map(({ name }) => name), PHASE1_TABLES);
  assert.deepEqual(phase2.phase1Foundation.tables, PHASE1_TABLES);
  assert.equal(phase2.phase1Foundation.immutable, true);
  assert.equal(phase2.phase1Foundation.preservation, "exact");
  assert.equal(phase2.phase1Foundation.revision, "0001_phase1_foundation");
  assert.equal(
    createHash("sha256").update(phase1Raw).digest("hex"),
    phase2.phase1Foundation.contractSha256,
  );

  assert.deepEqual(phase2.newTables.map(({ name }) => name), PHASE2_TABLES);
  assert.deepEqual(phase2.applicationTables, [...PHASE1_TABLES, ...PHASE2_TABLES]);
  assert.equal(new Set(phase2.applicationTables).size, 22);
  assert.ok(!phase2.applicationTables.includes(phase2.metadataTable));
});

test("every new table has a coherent UUID/FK/index/check definition", () => {
  const knownColumns = new Map(
    phase1.applicationTables.map((table) => [table.name, new Set(columnNames(table))]),
  );
  for (const table of phase2.newTables) {
    knownColumns.set(table.name, new Set(columnNames(table)));
  }
  for (const alteration of phase2.alteredTables) {
    const existing = knownColumns.get(alteration.name);
    assert.ok(existing, `altered table ${alteration.name} must exist in Phase 1`);
    for (const column of alteration.addColumns) existing.add(column.name);
  }

  const indexNames = new Set();
  for (const table of phase2.newTables) {
    const names = columnNames(table);
    assert.equal(new Set(names).size, names.length, `${table.name} has duplicate columns`);
    assert.deepEqual(
      table.columns.filter(({ primaryKey }) => primaryKey).map(({ name, type }) => ({ name, type })),
      [{ name: "id", type: "uuid" }],
      `${table.name} must have one UUID id primary key`,
    );

    for (const unique of table.unique) {
      assert.ok(unique.length > 0, `${table.name} has an empty unique constraint`);
      for (const column of unique) assert.ok(names.includes(column), `${table.name}.${column} missing`);
    }
    for (const index of table.indexes) {
      assert.ok(!indexNames.has(index.name), `duplicate index ${index.name}`);
      indexNames.add(index.name);
      assert.equal(typeof index.unique, "boolean");
      for (const column of index.columns) {
        assert.ok(names.includes(column), `${index.name} references missing ${table.name}.${column}`);
      }
    }
    for (const check of table.checks) assert.ok(check.length > 0, `${table.name} has an empty check`);

    for (const column of table.columns) {
      if (column.name.endsWith("_at")) {
        assert.equal(column.type, "timestamptz", `${table.name}.${column.name} must be UTC-aware`);
      }
      if (column.references !== undefined) {
        const [targetTable, targetColumn] = column.references.split(".");
        assert.ok(knownColumns.get(targetTable)?.has(targetColumn), column.references);
        assert.ok(["cascade", "restrict", "set null"].includes(column.onDelete));
      }
    }
  }
});

test("locks user ownership, optimistic versions, and one active official resource", () => {
  const userOwned = [
    "problem_progress",
    "favorites",
    "notes",
    "plans",
    "recommendations",
    "training_sessions",
    "attempts",
    "answers",
    "training_events",
    "xp_ledger",
    "idempotency_records",
  ];
  for (const name of userOwned) {
    const userId = tableByName.get(name).columns.find((column) => column.name === "user_id");
    assert.deepEqual(
      { type: userId?.type, nullable: userId?.nullable, references: userId?.references },
      { type: "uuid", nullable: false, references: "users.id" },
      `${name} must be user scoped`,
    );
  }

  for (const name of ["problem_progress", "favorites", "notes"]) {
    assert.ok(uniqueIncludes(tableByName.get(name), ["user_id", "problem_id"]));
  }
  for (const name of ["problem_progress", "favorites", "notes", "plans", "recommendations", "training_sessions"]) {
    assert.ok(columnNames(tableByName.get(name)).includes("version"), `${name} needs a version`);
  }

  assert.deepEqual(indexByName(tableByName.get("plans"), "uq_plans_user_active"), {
    name: "uq_plans_user_active",
    columns: ["user_id"],
    unique: true,
    where: "status = 'active'",
  });
  assert.deepEqual(
    indexByName(tableByName.get("training_sessions"), "uq_training_sessions_user_problem_active"),
    {
      name: "uq_training_sessions_user_problem_active",
      columns: ["user_id", "problem_id"],
      unique: true,
      where: "status = 'active'",
    },
  );
});

test("extends Phase 1 plan tasks and notifications without invalidating existing rows", () => {
  assert.deepEqual([...alterationByName.keys()], ["plan_tasks", "notifications"]);

  const planTasks = alterationByName.get("plan_tasks");
  assert.equal(planTasks.phase1RowsRemainValid, true);
  assert.equal(planTasks.optimisticLockColumn, "version");
  assert.deepEqual(planTasks.addColumns.map(({ name }) => name), [
    "plan_id",
    "recommendation_id",
    "target_problem_id",
    "detail",
    "scheduled_for",
    "estimated_minutes",
    "action_target",
    "skill_key",
  ]);
  assert.ok(planTasks.addColumns.every(({ nullable }) => nullable === true));
  assert.deepEqual(planTasks.addIndexes.map(({ name }) => name), [
    "ix_plan_tasks_plan_status_order",
    "ix_plan_tasks_user_scheduled_status",
    "ix_plan_tasks_target_problem",
  ]);

  const notifications = alterationByName.get("notifications");
  assert.equal(notifications.phase1RowsRemainValid, true);
  assert.deepEqual(notifications.addColumns.map(({ name }) => name), [
    "action_target",
    "action_resource_id",
    "dedupe_key",
  ]);
  assert.ok(notifications.addColumns.every(({ nullable }) => nullable === true));
  assert.deepEqual(notifications.actionTargetPolicy, {
    arbitraryUrlsAllowed: false,
    privateResponseContentAllowed: false,
    validatedTargets: ["training_result", "problem", "plan_task"],
  });
  assert.deepEqual(notifications.addIndexes.find(({ unique }) => unique), {
    name: "uq_notifications_user_dedupe",
    columns: ["user_id", "dedupe_key"],
    unique: true,
    where: "dedupe_key IS NOT NULL",
  });
});

test("locks append-only event and XP history with one completion reward", () => {
  assert.deepEqual(phase2.appendOnlyPolicy, {
    tables: ["training_events", "xp_ledger"],
    allowedServiceOperations: ["insert", "select"],
    forbiddenServiceOperations: ["update", "delete"],
    completionTransactionRequired: true,
    governedPreviewTeardownDeleteAllowed: true,
  });

  const events = tableByName.get("training_events");
  assert.ok(uniqueIncludes(events, ["training_session_id", "sequence"]));
  assert.deepEqual(indexByName(events, "uq_training_events_session_completed"), {
    name: "uq_training_events_session_completed",
    columns: ["training_session_id", "event_type"],
    unique: true,
    where: "event_type = 'completed'",
  });

  const ledger = tableByName.get("xp_ledger");
  assert.ok(uniqueIncludes(ledger, ["training_event_id"]));
  assert.ok(ledger.checks.includes("amount > 0"));
  assert.ok(ledger.checks.includes("reason = 'problem_completion'"));
});

test("uses persistent, content-safe response-snapshot idempotency", () => {
  const records = tableByName.get("idempotency_records");
  assert.deepEqual(columnNames(records), [
    "id",
    "user_id",
    "operation",
    "key_hash",
    "request_hash",
    "status",
    "response_status",
    "response_snapshot",
    "resource_id",
    "expires_at",
    "created_at",
    "updated_at",
    "completed_at",
  ]);
  assert.ok(uniqueIncludes(records, ["user_id", "operation", "key_hash"]));
  assert.deepEqual(phase2.idempotencyPolicy.scopeColumns, ["user_id", "operation", "key_hash"]);
  assert.equal(phase2.idempotencyPolicy.rawKeyStored, false);
  assert.equal(phase2.idempotencyPolicy.sameTransactionAsReward, true);
  assert.equal(phase2.idempotencyPolicy.replaySurvivesResourceVersionAdvance, true);
  assert.equal(phase2.idempotencyPolicy.requestFingerprintColumn, "request_hash");
  assert.equal(phase2.idempotencyPolicy.responseSnapshotColumn, "response_snapshot");
  assert.deepEqual(new Set(phase2.idempotencyPolicy.forbiddenSnapshotKeys), new Set([
    "rawIdempotencyKey",
    "idempotencyKey",
    "csrfProof",
    "csrfToken",
    "cookie",
    "authorization",
    "answer",
    "answerText",
    "note",
    "noteText",
  ]));
  assert.deepEqual(phase2.dataClassification.userContentColumns, ["answers.body", "notes.body"]);
  assert.equal(phase2.dataClassification.snapshotMayContainUserContent, false);
});

test("forbids state blobs, legacy fields, raw proofs, and secret-shaped contract values", () => {
  const allAddedColumns = [
    ...phase2.newTables.flatMap(({ columns }) => columns),
    ...phase2.alteredTables.flatMap(({ addColumns }) => addColumns),
  ].map(({ name }) => name);
  for (const forbidden of phase2.forbiddenNewTableColumns) {
    assert.ok(!allAddedColumns.includes(forbidden), `forbidden column ${forbidden}`);
  }
  assert.deepEqual(phase2.forbiddenTables, ["state_json"]);
  assert.deepEqual(phase2.phase1ForbiddenTableExceptionsIntroducedBy0002, [
    "problems",
    "xp_ledger",
  ]);
  assert.doesNotMatch(phase2Raw, /postgres(?:ql)?(?:\+psycopg)?:\/\//iu);
  assert.doesNotMatch(phase2Raw, /r2\.cloudflarestorage\.com/iu);
  assert.doesNotMatch(phase2Raw, /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/u);
  assert.doesNotMatch(phase2Raw, /(?:access|secret)[_-]?key\s*[=:]\s*["'][^"']+/iu);
});

test("locks the reversible 0001 to 0002 migration and denies shared Preview downgrade", () => {
  assert.deepEqual(phase2.migrationRoundTrip, [
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "fingerprint:0002_phase2_daily_training",
    "downgrade:0002_phase2_daily_training->0001_phase1_foundation",
    "fingerprint:0001_phase1_foundation-exact",
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "same-fingerprint:0002_phase2_daily_training",
  ]);
  assert.equal(phase2.sharedPreviewDowngradeAllowed, false);
});
