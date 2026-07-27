"""Create the frozen Phase 2 daily-training schema.

Revision ID: 0002_phase2_daily_training
Revises: 0001_phase1_foundation
"""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any, Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision: str = "0002_phase2_daily_training"
down_revision: Union[str, Sequence[str], None] = "0001_phase1_foundation"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Audit provenance only: this immutable revision never reads the external path.
SCHEMA_CONTRACT_RELATIVE_PATH = "docs/frontend-upgrade/phase-2-schema-contract.json"
SCHEMA_CONTRACT_SHA256 = "44fdf46535bfb15dad5dbd4f3d45ec9229561263d504a41557e2cc5ccf148745"
SCHEMA_CONTRACT_JSON = r"""{
  "schemaVersion": 2,
  "phase": 2,
  "owner": "alembic",
  "postgresMajor": 18,
  "metadataTable": "alembic_version",
  "revision": {
    "id": "0002_phase2_daily_training",
    "downRevision": "0001_phase1_foundation",
    "path": "api/migrations/versions/0002_phase2_daily_training.py"
  },
  "phase1Foundation": {
    "contractPath": "docs/frontend-upgrade/phase-1-schema-contract.json",
    "contractSha256": "4379b47a26173ce5ec4699af13d3e9c9c7f5bf99e499e9f0e52355d2b90e1d20",
    "revision": "0001_phase1_foundation",
    "preservation": "exact",
    "immutable": true,
    "tables": [
      "users",
      "user_identities",
      "sessions",
      "auth_challenges",
      "preferences",
      "notifications",
      "plan_tasks",
      "audit_events",
      "media_objects"
    ]
  },
  "applicationTables": [
    "users",
    "user_identities",
    "sessions",
    "auth_challenges",
    "preferences",
    "notifications",
    "plan_tasks",
    "audit_events",
    "media_objects",
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
    "idempotency_records"
  ],
  "newTables": [
    {
      "name": "problem_sources",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "slug",
          "type": "varchar(120)",
          "nullable": false
        },
        {
          "name": "name",
          "type": "varchar(200)",
          "nullable": false
        },
        {
          "name": "content_version",
          "type": "varchar(64)",
          "nullable": false
        },
        {
          "name": "rights_status",
          "type": "varchar(24)",
          "nullable": false
        },
        {
          "name": "release_scope",
          "type": "varchar(24)",
          "nullable": false
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
          "slug",
          "content_version"
        ]
      ],
      "indexes": [
        {
          "name": "ix_problem_sources_release_rights",
          "columns": [
            "release_scope",
            "rights_status"
          ],
          "unique": false
        }
      ],
      "checks": [
        "char_length(slug) > 0",
        "char_length(content_version) > 0",
        "rights_status IN ('approved','internal_preview','blocked')",
        "release_scope IN ('preview','public')",
        "rights_status <> 'blocked' OR release_scope = 'preview'"
      ]
    },
    {
      "name": "problems",
      "columns": [
        {
          "name": "id",
          "type": "uuid",
          "nullable": false,
          "primaryKey": true
        },
        {
          "name": "source_id",
          "type": "uuid",
          "nullable": false,
          "references": "problem_sources.id",
          "onDelete": "restrict"
        },
        {
          "name": "external_key",
          "type": "varchar(160)",
          "nullable": false
        },
        {
          "name": "title_zh",
          "type": "text",
          "nullable": true
        },
        {
          "name": "title_en",
          "type": "text",
          "nullable": true
        },
        {
          "name": "prompt_zh",
          "type": "text",
          "nullable": true
        },
        {
          "name": "prompt_en",
          "type": "text",
          "nullable": true
        },
        {
          "name": "hint_zh",
          "type": "text",
          "nullable": true
        },
        {
          "name": "hint_en",
          "type": "text",
          "nullable": true
        },
        {
          "name": "solution_zh",
          "type": "text",
          "nullable": true
        },
        {
          "name": "solution_en",
          "type": "text",
          "nullable": true
        },
        {
          "name": "category",
          "type": "varchar(80)",
          "nullable": false
        },
        {
          "name": "difficulty",
          "type": "varchar(16)",
          "nullable": false
        },
        {
          "name": "tags",
          "type": "jsonb",
          "nullable": false,
          "default": "[]"
        },
        {
          "name": "companies",
          "type": "jsonb",
          "nullable": false,
          "default": "[]"
        },
        {
          "name": "source_url",
          "type": "varchar(2048)",
          "nullable": true
        },
        {
          "name": "hot100",
          "type": "boolean",
          "nullable": false,
          "default": false
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "source_id",
          "external_key"
        ]
      ],
      "indexes": [
        {
          "name": "ix_problems_source_difficulty",
          "columns": [
            "source_id",
            "difficulty"
          ],
          "unique": false
        },
        {
          "name": "ix_problems_category_difficulty",
          "columns": [
            "category",
            "difficulty"
          ],
          "unique": false
        },
        {
          "name": "ix_problems_hot100",
          "columns": [
            "hot100",
            "id"
          ],
          "unique": false,
          "where": "hot100 = true"
        }
      ],
      "checks": [
        "char_length(external_key) > 0",
        "COALESCE(NULLIF(title_zh,''), NULLIF(title_en,'')) IS NOT NULL",
        "COALESCE(NULLIF(prompt_zh,''), NULLIF(prompt_en,'')) IS NOT NULL",
        "difficulty IN ('Easy','Medium','Hard')",
        "jsonb_typeof(tags) = 'array'",
        "jsonb_typeof(companies) = 'array'",
        "version > 0"
      ]
    },
    {
      "name": "problem_progress",
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
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "unstarted"
        },
        {
          "name": "attempt_count",
          "type": "integer",
          "nullable": false,
          "default": 0
        },
        {
          "name": "hint_count",
          "type": "integer",
          "nullable": false,
          "default": 0
        },
        {
          "name": "solution_revealed_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "best_score",
          "type": "integer",
          "nullable": true
        },
        {
          "name": "last_score",
          "type": "integer",
          "nullable": true
        },
        {
          "name": "last_practiced_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "completed_at",
          "type": "timestamptz",
          "nullable": true
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "user_id",
          "problem_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_problem_progress_user_status_updated",
          "columns": [
            "user_id",
            "status",
            "updated_at"
          ],
          "unique": false
        },
        {
          "name": "ix_problem_progress_user_practiced",
          "columns": [
            "user_id",
            "last_practiced_at"
          ],
          "unique": false
        },
        {
          "name": "ix_problem_progress_problem_completed",
          "columns": [
            "problem_id",
            "completed_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "status IN ('unstarted','in_progress','completed')",
        "attempt_count >= 0",
        "hint_count >= 0",
        "best_score IS NULL OR best_score BETWEEN 0 AND 100",
        "last_score IS NULL OR last_score BETWEEN 0 AND 100",
        "version > 0",
        "((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))"
      ]
    },
    {
      "name": "favorites",
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
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "user_id",
          "problem_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_favorites_user_updated",
          "columns": [
            "user_id",
            "updated_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "version > 0"
      ]
    },
    {
      "name": "notes",
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
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "body",
          "type": "text",
          "nullable": false
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "user_id",
          "problem_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_notes_user_updated",
          "columns": [
            "user_id",
            "updated_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "char_length(body) BETWEEN 1 AND 20000",
        "version > 0"
      ]
    },
    {
      "name": "plans",
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
          "name": "track",
          "type": "varchar(24)",
          "nullable": false
        },
        {
          "name": "role",
          "type": "varchar(48)",
          "nullable": false
        },
        {
          "name": "season",
          "type": "varchar(48)",
          "nullable": false
        },
        {
          "name": "weekly_hours",
          "type": "integer",
          "nullable": false
        },
        {
          "name": "diagnostic_status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "pending"
        },
        {
          "name": "diagnostic_score",
          "type": "integer",
          "nullable": false,
          "default": 0
        },
        {
          "name": "diagnostic_scores",
          "type": "jsonb",
          "nullable": false,
          "default": "{}"
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "active"
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "id",
          "user_id"
        ]
      ],
      "indexes": [
        {
          "name": "uq_plans_user_active",
          "columns": [
            "user_id"
          ],
          "unique": true,
          "where": "status = 'active'"
        },
        {
          "name": "ix_plans_user_updated",
          "columns": [
            "user_id",
            "updated_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "track IN ('internship','fulltime')",
        "char_length(role) > 0",
        "char_length(season) > 0",
        "weekly_hours IN (5,8,12,16)",
        "diagnostic_status IN ('pending','completed','skipped')",
        "diagnostic_score >= 0",
        "jsonb_typeof(diagnostic_scores) = 'object'",
        "status IN ('active','completed','archived')",
        "version > 0"
      ]
    },
    {
      "name": "recommendations",
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
          "name": "plan_id",
          "type": "uuid",
          "nullable": false,
          "references": "plans.id",
          "onDelete": "cascade"
        },
        {
          "name": "problem_id",
          "type": "uuid",
          "nullable": true,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "kind",
          "type": "varchar(24)",
          "nullable": false
        },
        {
          "name": "skill_key",
          "type": "varchar(80)",
          "nullable": true
        },
        {
          "name": "rationale",
          "type": "text",
          "nullable": false
        },
        {
          "name": "provenance_type",
          "type": "varchar(32)",
          "nullable": false
        },
        {
          "name": "provenance_resource_id",
          "type": "uuid",
          "nullable": true
        },
        {
          "name": "dedupe_key",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "rank",
          "type": "integer",
          "nullable": false,
          "default": 0
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "active"
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
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
          "plan_id",
          "dedupe_key"
        ],
        [
          "id",
          "plan_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_recommendations_plan_status_rank",
          "columns": [
            "plan_id",
            "status",
            "rank"
          ],
          "unique": false
        },
        {
          "name": "ix_recommendations_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_recommendations_problem",
          "columns": [
            "problem_id"
          ],
          "unique": false
        }
      ],
      "checks": [
        "kind IN ('problem','skill','task')",
        "char_length(rationale) > 0",
        "provenance_type IN ('diagnostic','training','system')",
        "dedupe_key ~ '^[0-9a-f]{64}$'",
        "rank >= 0",
        "status IN ('active','applied','dismissed')",
        "version > 0"
      ]
    },
    {
      "name": "training_sessions",
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
          "onDelete": "restrict"
        },
        {
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "plan_task_id",
          "type": "uuid",
          "nullable": true,
          "references": "plan_tasks.id",
          "onDelete": "set null"
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "active"
        },
        {
          "name": "version",
          "type": "integer",
          "nullable": false,
          "default": 1
        },
        {
          "name": "started_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "last_activity_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
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
      "unique": [
        [
          "id",
          "user_id"
        ]
      ],
      "indexes": [
        {
          "name": "uq_training_sessions_user_problem_active",
          "columns": [
            "user_id",
            "problem_id"
          ],
          "unique": true,
          "where": "status = 'active'"
        },
        {
          "name": "ix_training_sessions_user_status_activity",
          "columns": [
            "user_id",
            "status",
            "last_activity_at"
          ],
          "unique": false
        },
        {
          "name": "ix_training_sessions_problem_created",
          "columns": [
            "problem_id",
            "created_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "status IN ('active','completed','abandoned')",
        "version > 0",
        "last_activity_at >= started_at",
        "((status = 'completed' AND completed_at IS NOT NULL) OR (status <> 'completed' AND completed_at IS NULL))"
      ]
    },
    {
      "name": "attempts",
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
          "onDelete": "restrict"
        },
        {
          "name": "training_session_id",
          "type": "uuid",
          "nullable": false,
          "references": "training_sessions.id",
          "onDelete": "restrict"
        },
        {
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "sequence",
          "type": "integer",
          "nullable": false
        },
        {
          "name": "status",
          "type": "varchar(24)",
          "nullable": false,
          "default": "submitted"
        },
        {
          "name": "score",
          "type": "integer",
          "nullable": true
        },
        {
          "name": "evaluation",
          "type": "text",
          "nullable": true
        },
        {
          "name": "submitted_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
        },
        {
          "name": "evaluated_at",
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
          "training_session_id",
          "sequence"
        ],
        [
          "id",
          "user_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_attempts_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_attempts_session_submitted",
          "columns": [
            "training_session_id",
            "submitted_at"
          ],
          "unique": false
        },
        {
          "name": "ix_attempts_problem_submitted",
          "columns": [
            "problem_id",
            "submitted_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "sequence > 0",
        "status IN ('submitted','evaluated','rejected')",
        "score IS NULL OR score BETWEEN 0 AND 100",
        "((status = 'evaluated' AND evaluated_at IS NOT NULL) OR status <> 'evaluated')"
      ]
    },
    {
      "name": "answers",
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
          "onDelete": "restrict"
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "nullable": false,
          "references": "attempts.id",
          "onDelete": "restrict"
        },
        {
          "name": "kind",
          "type": "varchar(24)",
          "nullable": false
        },
        {
          "name": "body",
          "type": "text",
          "nullable": false
        },
        {
          "name": "body_sha256",
          "type": "char(64)",
          "nullable": false
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
          "attempt_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_answers_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "kind IN ('text','code','multiple_choice')",
        "char_length(body) BETWEEN 1 AND 50000",
        "body_sha256 ~ '^[0-9a-f]{64}$'"
      ]
    },
    {
      "name": "training_events",
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
          "onDelete": "restrict"
        },
        {
          "name": "training_session_id",
          "type": "uuid",
          "nullable": false,
          "references": "training_sessions.id",
          "onDelete": "restrict"
        },
        {
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "attempt_id",
          "type": "uuid",
          "nullable": true,
          "references": "attempts.id",
          "onDelete": "restrict"
        },
        {
          "name": "event_type",
          "type": "varchar(32)",
          "nullable": false
        },
        {
          "name": "sequence",
          "type": "integer",
          "nullable": false
        },
        {
          "name": "payload",
          "type": "jsonb",
          "nullable": false,
          "default": "{}"
        },
        {
          "name": "occurred_at",
          "type": "timestamptz",
          "nullable": false,
          "default": "now()"
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
          "training_session_id",
          "sequence"
        ]
      ],
      "indexes": [
        {
          "name": "uq_training_events_session_completed",
          "columns": [
            "training_session_id",
            "event_type"
          ],
          "unique": true,
          "where": "event_type = 'completed'"
        },
        {
          "name": "ix_training_events_user_occurred",
          "columns": [
            "user_id",
            "occurred_at"
          ],
          "unique": false
        },
        {
          "name": "ix_training_events_session_sequence",
          "columns": [
            "training_session_id",
            "sequence"
          ],
          "unique": false
        },
        {
          "name": "ix_training_events_problem_occurred",
          "columns": [
            "problem_id",
            "occurred_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "event_type IN ('hint_used','attempt_submitted','solution_revealed','completed')",
        "sequence > 0",
        "jsonb_typeof(payload) = 'object'",
        "created_at >= occurred_at"
      ]
    },
    {
      "name": "xp_ledger",
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
          "onDelete": "restrict"
        },
        {
          "name": "training_event_id",
          "type": "uuid",
          "nullable": false,
          "references": "training_events.id",
          "onDelete": "restrict"
        },
        {
          "name": "training_session_id",
          "type": "uuid",
          "nullable": false,
          "references": "training_sessions.id",
          "onDelete": "restrict"
        },
        {
          "name": "problem_id",
          "type": "uuid",
          "nullable": false,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "skill_key",
          "type": "varchar(80)",
          "nullable": false
        },
        {
          "name": "amount",
          "type": "integer",
          "nullable": false
        },
        {
          "name": "reason",
          "type": "varchar(32)",
          "nullable": false
        },
        {
          "name": "occurred_at",
          "type": "timestamptz",
          "nullable": false
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
          "training_event_id"
        ]
      ],
      "indexes": [
        {
          "name": "ix_xp_ledger_user_occurred",
          "columns": [
            "user_id",
            "occurred_at"
          ],
          "unique": false
        },
        {
          "name": "ix_xp_ledger_user_skill_occurred",
          "columns": [
            "user_id",
            "skill_key",
            "occurred_at"
          ],
          "unique": false
        },
        {
          "name": "ix_xp_ledger_problem_occurred",
          "columns": [
            "problem_id",
            "occurred_at"
          ],
          "unique": false
        }
      ],
      "checks": [
        "char_length(skill_key) > 0",
        "amount > 0",
        "reason = 'problem_completion'",
        "created_at >= occurred_at"
      ]
    },
    {
      "name": "idempotency_records",
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
          "name": "operation",
          "type": "varchar(80)",
          "nullable": false
        },
        {
          "name": "key_hash",
          "type": "char(64)",
          "nullable": false
        },
        {
          "name": "request_hash",
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
          "name": "response_status",
          "type": "integer",
          "nullable": true
        },
        {
          "name": "response_snapshot",
          "type": "jsonb",
          "nullable": true
        },
        {
          "name": "resource_id",
          "type": "uuid",
          "nullable": true
        },
        {
          "name": "expires_at",
          "type": "timestamptz",
          "nullable": false
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
        },
        {
          "name": "completed_at",
          "type": "timestamptz",
          "nullable": true
        }
      ],
      "unique": [
        [
          "user_id",
          "operation",
          "key_hash"
        ]
      ],
      "indexes": [
        {
          "name": "ix_idempotency_records_expires",
          "columns": [
            "expires_at"
          ],
          "unique": false
        },
        {
          "name": "ix_idempotency_records_user_created",
          "columns": [
            "user_id",
            "created_at"
          ],
          "unique": false
        },
        {
          "name": "ix_idempotency_records_resource",
          "columns": [
            "resource_id"
          ],
          "unique": false
        }
      ],
      "checks": [
        "char_length(operation) > 0",
        "key_hash ~ '^[0-9a-f]{64}$'",
        "request_hash ~ '^[0-9a-f]{64}$'",
        "status IN ('pending','completed','failed')",
        "response_status IS NULL OR response_status BETWEEN 200 AND 599",
        "response_snapshot IS NULL OR jsonb_typeof(response_snapshot) = 'object'",
        "expires_at > created_at",
        "((status = 'pending' AND completed_at IS NULL AND response_status IS NULL AND response_snapshot IS NULL) OR (status IN ('completed','failed') AND completed_at IS NOT NULL AND response_status IS NOT NULL AND response_snapshot IS NOT NULL))"
      ]
    }
  ],
  "alteredTables": [
    {
      "name": "plan_tasks",
      "phase1RowsRemainValid": true,
      "optimisticLockColumn": "version",
      "addColumns": [
        {
          "name": "plan_id",
          "type": "uuid",
          "nullable": true,
          "references": "plans.id",
          "onDelete": "cascade"
        },
        {
          "name": "recommendation_id",
          "type": "uuid",
          "nullable": true,
          "references": "recommendations.id",
          "onDelete": "set null"
        },
        {
          "name": "target_problem_id",
          "type": "uuid",
          "nullable": true,
          "references": "problems.id",
          "onDelete": "restrict"
        },
        {
          "name": "detail",
          "type": "text",
          "nullable": true
        },
        {
          "name": "scheduled_for",
          "type": "date",
          "nullable": true
        },
        {
          "name": "estimated_minutes",
          "type": "integer",
          "nullable": true
        },
        {
          "name": "action_target",
          "type": "varchar(32)",
          "nullable": true
        },
        {
          "name": "skill_key",
          "type": "varchar(80)",
          "nullable": true
        }
      ],
      "addIndexes": [
        {
          "name": "ix_plan_tasks_plan_status_order",
          "columns": [
            "plan_id",
            "status",
            "sort_order"
          ],
          "unique": false,
          "where": "plan_id IS NOT NULL"
        },
        {
          "name": "ix_plan_tasks_user_scheduled_status",
          "columns": [
            "user_id",
            "scheduled_for",
            "status"
          ],
          "unique": false,
          "where": "plan_id IS NOT NULL"
        },
        {
          "name": "ix_plan_tasks_target_problem",
          "columns": [
            "target_problem_id"
          ],
          "unique": false,
          "where": "target_problem_id IS NOT NULL"
        }
      ],
      "addChecks": [
        "estimated_minutes IS NULL OR estimated_minutes BETWEEN 1 AND 1440",
        "action_target IS NULL OR action_target IN ('problems','tools','resume','jobs','experiences','interview','custom')",
        "plan_id IS NOT NULL OR (recommendation_id IS NULL AND target_problem_id IS NULL AND detail IS NULL AND scheduled_for IS NULL AND estimated_minutes IS NULL AND action_target IS NULL AND skill_key IS NULL)",
        "recommendation_id IS NULL OR plan_id IS NOT NULL"
      ]
    },
    {
      "name": "notifications",
      "phase1RowsRemainValid": true,
      "addColumns": [
        {
          "name": "action_target",
          "type": "varchar(32)",
          "nullable": true
        },
        {
          "name": "action_resource_id",
          "type": "uuid",
          "nullable": true
        },
        {
          "name": "dedupe_key",
          "type": "char(64)",
          "nullable": true
        }
      ],
      "addIndexes": [
        {
          "name": "uq_notifications_user_dedupe",
          "columns": [
            "user_id",
            "dedupe_key"
          ],
          "unique": true,
          "where": "dedupe_key IS NOT NULL"
        },
        {
          "name": "ix_notifications_action_resource",
          "columns": [
            "action_target",
            "action_resource_id"
          ],
          "unique": false,
          "where": "action_resource_id IS NOT NULL"
        }
      ],
      "addChecks": [
        "action_target IS NULL OR action_target IN ('training_result','problem','plan_task')",
        "((action_target IS NULL AND action_resource_id IS NULL) OR (action_target IS NOT NULL AND action_resource_id IS NOT NULL))",
        "dedupe_key IS NULL OR dedupe_key ~ '^[0-9a-f]{64}$'"
      ],
      "actionTargetPolicy": {
        "arbitraryUrlsAllowed": false,
        "privateResponseContentAllowed": false,
        "validatedTargets": [
          "training_result",
          "problem",
          "plan_task"
        ]
      }
    }
  ],
  "appendOnlyPolicy": {
    "tables": [
      "training_events",
      "xp_ledger"
    ],
    "allowedServiceOperations": [
      "insert",
      "select"
    ],
    "forbiddenServiceOperations": [
      "update",
      "delete"
    ],
    "completionTransactionRequired": true,
    "governedPreviewTeardownDeleteAllowed": true
  },
  "idempotencyPolicy": {
    "table": "idempotency_records",
    "rawKeyStored": false,
    "scopeColumns": [
      "user_id",
      "operation",
      "key_hash"
    ],
    "requestFingerprintColumn": "request_hash",
    "responseSnapshotColumn": "response_snapshot",
    "sameTransactionAsReward": true,
    "replaySurvivesResourceVersionAdvance": true,
    "forbiddenSnapshotKeys": [
      "rawIdempotencyKey",
      "idempotencyKey",
      "csrfProof",
      "csrfToken",
      "cookie",
      "authorization",
      "answer",
      "answerText",
      "note",
      "noteText"
    ]
  },
  "dataClassification": {
    "userContentColumns": [
      "answers.body",
      "notes.body"
    ],
    "publicAcknowledgementSnapshot": "idempotency_records.response_snapshot",
    "snapshotMayContainUserContent": false
  },
  "forbiddenTables": [
    "state_json"
  ],
  "forbiddenNewTableColumns": [
    "state_json",
    "legacy_id",
    "sqlite_rowid",
    "raw_idempotency_key",
    "idempotency_key",
    "csrf_token",
    "csrf_proof",
    "session_token",
    "cookie",
    "authorization"
  ],
  "phase1ForbiddenTableExceptionsIntroducedBy0002": [
    "problems",
    "xp_ledger"
  ],
  "migrationRoundTrip": [
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "fingerprint:0002_phase2_daily_training",
    "downgrade:0002_phase2_daily_training->0001_phase1_foundation",
    "fingerprint:0001_phase1_foundation-exact",
    "upgrade:0001_phase1_foundation->0002_phase2_daily_training",
    "same-fingerprint:0002_phase2_daily_training"
  ],
  "sharedPreviewDowngradeAllowed": false
}
"""
_TYPE_PATTERN = re.compile(r"^(varchar|char)\((\d+)\)$")
_PHASE1_CHECK_COUNTS = {
    "plan_tasks": 3,
    "notifications": 0,
}


def _schema_contract() -> dict[str, Any]:
    rendered = SCHEMA_CONTRACT_JSON.encode("utf-8")
    if hashlib.sha256(rendered).hexdigest() != SCHEMA_CONTRACT_SHA256:
        raise RuntimeError("frozen Phase 2 schema contract is corrupt")
    contract = json.loads(SCHEMA_CONTRACT_JSON)
    if contract.get("schemaVersion") != 2 or contract.get("phase") != 2:
        raise RuntimeError("unsupported Phase 2 schema contract")
    if contract.get("postgresMajor") != 18 or contract.get("metadataTable") != "alembic_version":
        raise RuntimeError("unexpected Phase 2 database target")
    revision_contract = contract.get("revision", {})
    if revision_contract.get("id") != revision or revision_contract.get("downRevision") != down_revision:
        raise RuntimeError("Phase 2 revision identity does not match its contract")
    foundation = contract.get("phase1Foundation", {})
    if (
        foundation.get("revision") != down_revision
        or foundation.get("preservation") != "exact"
        or foundation.get("immutable") is not True
    ):
        raise RuntimeError("Phase 1 foundation preservation contract is invalid")

    new_tables = contract.get("newTables")
    altered_tables = contract.get("alteredTables")
    if not isinstance(new_tables, list) or len(new_tables) != 13:
        raise RuntimeError("Phase 2 schema contract must define exactly thirteen new tables")
    if not isinstance(altered_tables, list) or [table.get("name") for table in altered_tables] != [
        "plan_tasks",
        "notifications",
    ]:
        raise RuntimeError("Phase 2 schema contract must define exactly two additive table changes")
    application_tables = contract.get("applicationTables")
    expected_tables = [*foundation.get("tables", []), *[table["name"] for table in new_tables]]
    if application_tables != expected_tables:
        raise RuntimeError("Phase 2 application table order is invalid")
    if len(application_tables) != 22 or len(set(application_tables)) != len(application_tables):
        raise RuntimeError("Phase 2 application table set is invalid")
    if set(application_tables) & set(contract.get("forbiddenTables", [])):
        raise RuntimeError("Phase 2 schema contract contains a forbidden table")

    forbidden_columns = set(contract.get("forbiddenNewTableColumns", []))
    new_columns = {
        column["name"]
        for table in new_tables
        for column in table.get("columns", [])
    }
    if new_columns & forbidden_columns:
        raise RuntimeError("Phase 2 schema contract contains a forbidden column")
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
        "date": sa.Date,
        "integer": sa.Integer,
        "bigint": sa.BigInteger,
        "boolean": sa.Boolean,
        "jsonb": postgresql.JSONB,
    }
    try:
        return factories[type_name]()
    except KeyError as error:
        raise RuntimeError("unsupported column type in Phase 2 schema contract") from error


def _server_default(column: dict[str, Any]) -> sa.TextClause | None:
    if "default" not in column:
        return None
    default = column["default"]
    if default == "now()":
        return sa.text("now()")
    if column["type"] == "jsonb" and isinstance(default, str):
        return sa.text("'" + default.replace("'", "''") + "'::jsonb")
    if isinstance(default, bool):
        return sa.text("true" if default else "false")
    if isinstance(default, (int, float)):
        return sa.text(str(default))
    if isinstance(default, str):
        return sa.text("'" + default.replace("'", "''") + "'")
    raise RuntimeError("unsupported server default in Phase 2 schema contract")


def _constraint_name(prefix: str, table_name: str, columns: list[str]) -> str:
    return "_".join((prefix, table_name, *columns))


def _column(column: dict[str, Any]) -> sa.Column[Any]:
    return sa.Column(
        column["name"],
        _column_type(column["type"]),
        nullable=column["nullable"],
        primary_key=column.get("primaryKey", False),
        server_default=_server_default(column),
    )


def _table_elements(table: dict[str, Any]) -> list[Any]:
    table_name = table["name"]
    elements: list[Any] = [_column(column) for column in table["columns"]]
    for column in table["columns"]:
        if "references" not in column:
            continue
        elements.append(
            sa.ForeignKeyConstraint(
                [column["name"]],
                [column["references"]],
                name=_constraint_name("fk", table_name, [column["name"]]),
                ondelete=column.get("onDelete", "restrict").upper(),
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
        elements.append(sa.CheckConstraint(expression, name=f"ck_{table_name}_{ordinal}"))
    return elements


def _create_index(table_name: str, index: dict[str, Any]) -> None:
    options: dict[str, Any] = {}
    if where_clause := index.get("where"):
        options["postgresql_where"] = sa.text(where_clause)
    op.create_index(
        index["name"],
        table_name,
        index["columns"],
        unique=index["unique"],
        **options,
    )


def upgrade() -> None:
    contract = _schema_contract()
    new_tables = contract["newTables"]
    altered_tables = contract["alteredTables"]

    for table in new_tables:
        op.create_table(table["name"], *_table_elements(table))
    for table in new_tables:
        for index in table.get("indexes", []):
            _create_index(table["name"], index)

    for table in altered_tables:
        table_name = table["name"]
        for column in table["addColumns"]:
            op.add_column(table_name, _column(column))
        for column in table["addColumns"]:
            if "references" not in column:
                continue
            referent_table, separator, remote_column = column["references"].partition(".")
            if not separator or not referent_table or not remote_column:
                raise RuntimeError("invalid Phase 2 foreign-key reference")
            op.create_foreign_key(
                _constraint_name("fk", table_name, [column["name"]]),
                table_name,
                referent_table,
                [column["name"]],
                [remote_column],
                ondelete=column.get("onDelete", "restrict").upper(),
            )
        check_offset = _PHASE1_CHECK_COUNTS[table_name]
        for ordinal, expression in enumerate(table.get("addChecks", []), start=1):
            op.create_check_constraint(
                f"ck_{table_name}_{check_offset + ordinal}",
                table_name,
                sa.text(expression),
            )
        for index in table.get("addIndexes", []):
            _create_index(table_name, index)


def downgrade() -> None:
    contract = _schema_contract()
    for table in reversed(contract["alteredTables"]):
        table_name = table["name"]
        for index in reversed(table.get("addIndexes", [])):
            op.drop_index(index["name"], table_name=table_name)
        check_offset = _PHASE1_CHECK_COUNTS[table_name]
        for ordinal in reversed(range(1, len(table.get("addChecks", [])) + 1)):
            op.drop_constraint(
                f"ck_{table_name}_{check_offset + ordinal}",
                table_name,
                type_="check",
            )
        for column in reversed(table["addColumns"]):
            if "references" in column:
                op.drop_constraint(
                    _constraint_name("fk", table_name, [column["name"]]),
                    table_name,
                    type_="foreignkey",
                )
        for column in reversed(table["addColumns"]):
            op.drop_column(table_name, column["name"])

    for table in reversed(contract["newTables"]):
        op.drop_table(table["name"])
