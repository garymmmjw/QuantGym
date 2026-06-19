-- QuantGym Postgres cutover schema.
-- This mirrors the current SQLite API schema while using jsonb and timestamptz
-- for values that should be typed before a public multi-user launch.

BEGIN;

CREATE TABLE users (
  id text PRIMARY KEY,
  provider text NOT NULL,
  email_norm text UNIQUE,
  password_salt text,
  password_hash text,
  account_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE user_states (
  user_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  state_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE community (
  id integer PRIMARY KEY CHECK (id = 1),
  community_json jsonb NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE media_objects (
  id text PRIMARY KEY,
  owner_user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  filename text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL,
  storage_path text NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX idx_media_objects_owner_created
ON media_objects (owner_user_id, created_at);

CREATE TABLE sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL
);

CREATE TABLE email_verification_codes (
  id text PRIMARY KEY,
  email_norm text NOT NULL,
  purpose text NOT NULL,
  code_salt text NOT NULL,
  code_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL,
  sent_at timestamptz NOT NULL,
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  UNIQUE(email_norm, purpose)
);

CREATE INDEX idx_email_verification_expires
ON email_verification_codes (expires_at);

CREATE TABLE audit_events (
  id text PRIMARY KEY,
  event_type text NOT NULL,
  actor_user_id text REFERENCES users(id) ON DELETE SET NULL,
  email_norm text,
  ip text,
  user_agent text,
  status text NOT NULL,
  metadata_json jsonb NOT NULL,
  created_at timestamptz NOT NULL
);

CREATE INDEX idx_audit_events_created
ON audit_events (created_at DESC);

CREATE INDEX idx_audit_events_type_created
ON audit_events (event_type, created_at DESC);

CREATE TABLE problems (
  id text PRIMARY KEY,
  visibility text NOT NULL CHECK (visibility IN ('public', 'user')),
  owner_user_id text REFERENCES users(id) ON DELETE CASCADE,
  title_en text NOT NULL,
  title_zh text NOT NULL,
  category text NOT NULL,
  difficulty text NOT NULL,
  tags_json jsonb NOT NULL,
  source text NOT NULL,
  source_url text NOT NULL,
  prompt_en text NOT NULL,
  prompt_zh text NOT NULL,
  answer text NOT NULL,
  explanation text NOT NULL,
  problem_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX idx_problems_visibility_category
ON problems (visibility, category);

CREATE INDEX idx_problems_owner
ON problems (owner_user_id);

CREATE TABLE user_problem_states (
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_id text NOT NULL,
  state_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (user_id, problem_id)
);

CREATE TABLE problem_likes (
  problem_id text NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL,
  PRIMARY KEY (problem_id, user_id)
);

CREATE INDEX idx_problem_likes_problem
ON problem_likes (problem_id);

CREATE TABLE problem_comments (
  id text PRIMARY KEY,
  problem_id text NOT NULL REFERENCES problems(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text text NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX idx_problem_comments_problem_created
ON problem_comments (problem_id, created_at);

CREATE TABLE poker_rooms (
  code text PRIMARY KEY,
  host_user_id text NOT NULL,
  room_json jsonb NOT NULL,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  archived_at timestamptz
);

CREATE INDEX idx_poker_rooms_host_updated
ON poker_rooms (host_user_id, updated_at);

CREATE INDEX idx_poker_rooms_active_updated
ON poker_rooms (archived_at, updated_at);

COMMIT;
