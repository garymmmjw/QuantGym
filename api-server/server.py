#!/usr/bin/env python3
"""QuantGym cloud-sync API backed by SQLite.

This server intentionally uses only Python's standard library so the project can
run locally without dependency installation, while still using a real database.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import os
import re
import secrets
import smtplib
import sqlite3
import sys
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, unquote, urlparse
from urllib.request import urlopen


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.environ.get("QUANTGYM_DB", DATA_DIR / "quantgym.sqlite3"))
PROBLEM_CATALOG_PATH = Path(
    os.environ.get("QUANTGYM_PROBLEM_CATALOG", BASE_DIR.parent / "data" / "problem-catalog.json")
)
PORT = int(os.environ.get("PORT", "8790"))
HOST = os.environ.get("QUANTGYM_HOST", os.environ.get("HOST", "127.0.0.1"))
PBKDF2_ROUNDS = int(os.environ.get("QUANTGYM_PBKDF2_ROUNDS", "120000"))
SESSION_DAYS = int(os.environ.get("QUANTGYM_SESSION_DAYS", "30"))
MAX_BODY_BYTES = int(os.environ.get("QUANTGYM_MAX_BODY_BYTES", str(25 * 1024 * 1024)))
GOOGLE_CLIENT_ID = os.environ.get("QUANTGYM_GOOGLE_CLIENT_ID", "").strip()
GOOGLE_TOKENINFO_URL = "https://oauth2.googleapis.com/tokeninfo"
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
EMAIL_VERIFICATION_REQUIRED = env_bool("QUANTGYM_REQUIRE_EMAIL_VERIFICATION", True)
EMAIL_CODE_TTL_MINUTES = int(os.environ.get("QUANTGYM_EMAIL_CODE_TTL_MINUTES", "10"))
EMAIL_CODE_COOLDOWN_SECONDS = int(os.environ.get("QUANTGYM_EMAIL_CODE_COOLDOWN_SECONDS", "60"))
EMAIL_CODE_MAX_ATTEMPTS = int(os.environ.get("QUANTGYM_EMAIL_CODE_MAX_ATTEMPTS", "5"))
EMAIL_DEV_CODE_RESPONSE = env_bool("QUANTGYM_EMAIL_DEV_CODE_RESPONSE", True)
SMTP_HOST = os.environ.get("QUANTGYM_SMTP_HOST", "").strip()
SMTP_USERNAME = os.environ.get("QUANTGYM_SMTP_USERNAME", "").strip()
SMTP_PASSWORD = os.environ.get("QUANTGYM_SMTP_PASSWORD", "")
SMTP_SSL = env_bool("QUANTGYM_SMTP_SSL", False)
SMTP_STARTTLS = env_bool("QUANTGYM_SMTP_STARTTLS", True)
SMTP_PORT = int(os.environ.get("QUANTGYM_SMTP_PORT", "465" if SMTP_SSL else "587"))
SMTP_FROM = os.environ.get("QUANTGYM_SMTP_FROM", SMTP_USERNAME or "QuantGym <no-reply@quantgym.local>").strip()
BETA_EMAIL_ALLOWLIST = {
    item.strip().lower()
    for item in os.environ.get("QUANTGYM_BETA_EMAIL_ALLOWLIST", "").split(",")
    if item.strip()
}
ALLOWED_ORIGINS = [
    item.strip()
    for item in os.environ.get("QUANTGYM_ALLOWED_ORIGINS", "*").split(",")
    if item.strip()
]

PUBLIC_ACCOUNT_FIELDS = {
    "id",
    "provider",
    "name",
    "email",
    "country",
    "region",
    "picture",
    "createdAt",
    "updatedAt",
}


class HttpError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_utc(value: str | None) -> datetime:
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return datetime.fromtimestamp(0, timezone.utc)


def normalize_email(email: str | None) -> str:
    return str(email or "").strip().lower()


def ensure_valid_email(email: str) -> None:
    if not EMAIL_PATTERN.match(normalize_email(email)):
        raise HttpError(400, "Valid email is required")


def ensure_email_allowed(email: str) -> None:
    if BETA_EMAIL_ALLOWLIST and normalize_email(email) not in BETA_EMAIL_ALLOWLIST:
        raise HttpError(403, "Email is not on the beta allowlist")


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def make_password_hash(email: str, password: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    value = f"{normalize_email(email)}:{password}".encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", value, salt, PBKDF2_ROUNDS)
    return salt.hex(), digest.hex()


def verify_password(email: str, password: str, salt_hex: str, expected_hex: str) -> bool:
    _, actual_hex = make_password_hash(email, password, salt_hex)
    return hmac.compare_digest(actual_hex, expected_hex)


def make_email_code_hash(email: str, purpose: str, code: str, salt_hex: str | None = None) -> tuple[str, str]:
    salt = bytes.fromhex(salt_hex) if salt_hex else secrets.token_bytes(16)
    value = f"{normalize_email(email)}:{purpose}:{str(code).strip()}".encode("utf-8")
    digest = hashlib.pbkdf2_hmac("sha256", value, salt, PBKDF2_ROUNDS)
    return salt.hex(), digest.hex()


def generate_email_code() -> str:
    return f"{secrets.randbelow(1_000_000):06d}"


def send_email_verification_code(email: str, code: str, purpose: str) -> str:
    subject = "QuantGym 邮箱验证码"
    body = (
        f"你的 QuantGym 验证码是：{code}\n\n"
        f"这个验证码将在 {EMAIL_CODE_TTL_MINUTES} 分钟后过期。"
        "如果不是你本人操作，可以忽略这封邮件。"
    )

    if not SMTP_HOST:
        print(f"[QuantGym email verification] {email} {purpose} code: {code}", flush=True)
        return "dev"

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = SMTP_FROM
    message["To"] = email
    message.set_content(body)

    smtp_cls = smtplib.SMTP_SSL if SMTP_SSL else smtplib.SMTP
    with smtp_cls(SMTP_HOST, SMTP_PORT, timeout=10) as smtp:
        if not SMTP_SSL and SMTP_STARTTLS:
            smtp.starttls()
        if SMTP_USERNAME or SMTP_PASSWORD:
            smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)
    return "smtp"


def compact_json(value) -> str:
    return json.dumps(value or {}, ensure_ascii=False, separators=(",", ":"))


def parse_json(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def sanitize_account(account: dict | None, fallback_id: str | None = None) -> dict:
    raw = account or {}
    now = utc_now()
    public = {key: raw.get(key) for key in PUBLIC_ACCOUNT_FIELDS if raw.get(key) is not None}
    public["id"] = str(public.get("id") or fallback_id or secrets.token_urlsafe(16))
    public["provider"] = str(public.get("provider") or "local")
    public["name"] = str(public.get("name") or public.get("email") or "Quant")
    public["email"] = normalize_email(public.get("email"))
    public["country"] = str(public.get("country") or "china")
    public["region"] = str(public.get("region") or "上海")
    public["picture"] = str(public.get("picture") or "")
    public["createdAt"] = str(public.get("createdAt") or now)
    public["updatedAt"] = str(public.get("updatedAt") or now)
    return public


def is_true(value) -> bool:
    return value is True or str(value or "").lower() == "true"


def verify_google_id_token(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HttpError(503, "Google login is not configured on the API")
    if not credential:
        raise HttpError(400, "Google ID token is required")

    request_url = f"{GOOGLE_TOKENINFO_URL}?{urlencode({'id_token': credential})}"
    try:
        with urlopen(request_url, timeout=5) as response:
            claims = json.loads(response.read().decode("utf-8"))
    except HTTPError:
        raise HttpError(401, "Invalid Google ID token")
    except (URLError, TimeoutError, json.JSONDecodeError):
        raise HttpError(503, "Google token verification is unavailable")

    issuer = str(claims.get("iss") or "")
    email = normalize_email(claims.get("email"))
    if str(claims.get("aud") or "") != GOOGLE_CLIENT_ID:
        raise HttpError(401, "Google ID token audience mismatch")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HttpError(401, "Google ID token issuer mismatch")
    if not str(claims.get("sub") or "").strip() or not email or not is_true(claims.get("email_verified")):
        raise HttpError(401, "Google account email is not verified")
    return {**claims, "email": email}


def verified_google_account(credential: str, requested_account: dict | None) -> dict:
    claims = verify_google_id_token(credential)
    profile = requested_account if isinstance(requested_account, dict) else {}
    return sanitize_account(
        {
            "id": f"google:{claims['sub']}",
            "provider": "google",
            "name": claims.get("name") or claims["email"],
            "email": claims["email"],
            "picture": claims.get("picture") or profile.get("picture") or "",
            "country": profile.get("country"),
            "region": profile.get("region"),
            "createdAt": profile.get("createdAt"),
            "updatedAt": profile.get("updatedAt"),
        }
    )


def merge_items_by_id(*lists):
    merged = {}
    for items in lists:
        if not isinstance(items, list):
            continue
        for item in items:
            if not isinstance(item, dict):
                continue
            item_id = str(item.get("id") or secrets.token_urlsafe(10))
            previous = merged.get(item_id, {})
            merged[item_id] = {**previous, **item, "id": item_id}
    return list(merged.values())


def normalize_tags(value) -> list[str]:
    if isinstance(value, list):
        source = value
    else:
        source = str(value or "").split(",")
    return [str(item).strip() for item in source if str(item).strip()]


def sanitize_problem(problem: dict | None, *, visibility: str = "public", owner_user_id: str | None = None) -> dict:
    raw = problem or {}
    problem_id = str(raw.get("id") or "").strip()
    if not problem_id:
        raise HttpError(400, "Problem id is required")
    title_en = str(raw.get("titleEn") or raw.get("title") or "").strip()
    title_zh = str(raw.get("titleZh") or "").strip()
    prompt_en = str(raw.get("promptEn") or raw.get("prompt") or "").strip()
    prompt_zh = str(raw.get("promptZh") or "").strip()
    if not title_en and not title_zh:
        raise HttpError(400, "Problem title is required")
    if not prompt_en and not prompt_zh:
        raise HttpError(400, "Problem prompt is required")
    next_visibility = "user" if visibility == "user" or owner_user_id else "public"
    return {
        "id": problem_id,
        "titleEn": title_en,
        "titleZh": title_zh,
        "category": str(raw.get("category") or "probabilityExpectation").strip(),
        "difficulty": str(raw.get("difficulty") or "Medium").strip(),
        "tags": normalize_tags(raw.get("tags")),
        "source": str(raw.get("source") or "catalog").strip(),
        "sourceUrl": str(raw.get("sourceUrl") or raw.get("url") or "").strip(),
        "sourceType": str(raw.get("sourceType") or "").strip(),
        "bookSlug": str(raw.get("bookSlug") or "").strip(),
        "bookName": str(raw.get("bookName") or "").strip(),
        "promptEn": prompt_en,
        "promptZh": prompt_zh,
        "answer": str(raw.get("answer") or "").strip(),
        "explanation": str(raw.get("explanation") or raw.get("solution") or "").strip(),
        "visibility": next_visibility,
        "ownerUserId": owner_user_id or "",
        "createdAt": str(raw.get("createdAt") or utc_now()),
        "updatedAt": str(raw.get("updatedAt") or utc_now()),
    }


def sanitize_problem_state(state: dict | None) -> dict:
    raw = state or {}
    problem_id = str(raw.get("problemId") or raw.get("problem_id") or "").strip()
    if not problem_id:
        raise HttpError(400, "problemId is required")
    next_state = {**raw, "problemId": problem_id}
    next_state["updatedAt"] = str(next_state.get("updatedAt") or utc_now())
    return next_state


def merge_community(existing: dict | None, incoming: dict | None) -> dict:
    existing_posts = (existing or {}).get("posts") if isinstance(existing, dict) else []
    incoming_posts = (incoming or {}).get("posts") if isinstance(incoming, dict) else []
    posts_by_id = {}

    for post in merge_items_by_id(existing_posts, incoming_posts):
        old = posts_by_id.get(post["id"], {})
        likes = []
        for value in [*(old.get("likes") or []), *(post.get("likes") or [])]:
            if value not in likes:
                likes.append(value)
        comments = merge_items_by_id(old.get("comments") or [], post.get("comments") or [])
        posts_by_id[post["id"]] = {**old, **post, "likes": likes, "comments": comments}

    posts = list(posts_by_id.values())
    posts.sort(key=lambda item: item.get("createdAt") or "", reverse=True)
    return {"posts": posts}


class Database:
    def __init__(self, path: Path):
        path.parent.mkdir(parents=True, exist_ok=True)
        self.path = path
        self.init_schema()

    def connect(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON")
        return conn

    def init_schema(self) -> None:
        with self.connect() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS users (
                  id TEXT PRIMARY KEY,
                  provider TEXT NOT NULL,
                  email_norm TEXT UNIQUE,
                  password_salt TEXT,
                  password_hash TEXT,
                  account_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS user_states (
                  user_id TEXT PRIMARY KEY,
                  state_json TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS community (
                  id INTEGER PRIMARY KEY CHECK (id = 1),
                  community_json TEXT NOT NULL,
                  updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS sessions (
                  token_hash TEXT PRIMARY KEY,
                  user_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  expires_at TEXT NOT NULL,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS email_verification_codes (
                  id TEXT PRIMARY KEY,
                  email_norm TEXT NOT NULL,
                  purpose TEXT NOT NULL,
                  code_salt TEXT NOT NULL,
                  code_hash TEXT NOT NULL,
                  attempts INTEGER NOT NULL DEFAULT 0,
                  created_at TEXT NOT NULL,
                  sent_at TEXT NOT NULL,
                  expires_at TEXT NOT NULL,
                  consumed_at TEXT,
                  UNIQUE(email_norm, purpose)
                );

                CREATE INDEX IF NOT EXISTS idx_email_verification_expires
                ON email_verification_codes (expires_at);

                CREATE TABLE IF NOT EXISTS problems (
                  id TEXT PRIMARY KEY,
                  visibility TEXT NOT NULL CHECK (visibility IN ('public', 'user')),
                  owner_user_id TEXT,
                  title_en TEXT NOT NULL,
                  title_zh TEXT NOT NULL,
                  category TEXT NOT NULL,
                  difficulty TEXT NOT NULL,
                  tags_json TEXT NOT NULL,
                  source TEXT NOT NULL,
                  source_url TEXT NOT NULL,
                  prompt_en TEXT NOT NULL,
                  prompt_zh TEXT NOT NULL,
                  answer TEXT NOT NULL,
                  explanation TEXT NOT NULL,
                  problem_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_problems_visibility_category
                ON problems (visibility, category);

                CREATE INDEX IF NOT EXISTS idx_problems_owner
                ON problems (owner_user_id);

                CREATE TABLE IF NOT EXISTS user_problem_states (
                  user_id TEXT NOT NULL,
                  problem_id TEXT NOT NULL,
                  state_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  PRIMARY KEY (user_id, problem_id),
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS problem_likes (
                  problem_id TEXT NOT NULL,
                  user_id TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  PRIMARY KEY (problem_id, user_id),
                  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_problem_likes_problem
                ON problem_likes (problem_id);

                CREATE TABLE IF NOT EXISTS problem_comments (
                  id TEXT PRIMARY KEY,
                  problem_id TEXT NOT NULL,
                  user_id TEXT NOT NULL,
                  text TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  FOREIGN KEY (problem_id) REFERENCES problems(id) ON DELETE CASCADE,
                  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_problem_comments_problem_created
                ON problem_comments (problem_id, created_at);
                """
            )

    def create_session(self, conn: sqlite3.Connection, user_id: str) -> str:
        token = secrets.token_urlsafe(32)
        now = utc_now()
        expires_at = (
            datetime.now(timezone.utc) + timedelta(days=SESSION_DAYS)
        ).isoformat(timespec="seconds").replace("+00:00", "Z")
        conn.execute(
            "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)",
            (token_hash(token), user_id, now, expires_at),
        )
        return token

    def get_user_by_session(self, token: str) -> dict | None:
        hashed = token_hash(token)
        now = utc_now()
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT users.*
                FROM sessions
                JOIN users ON users.id = sessions.user_id
                WHERE sessions.token_hash = ? AND sessions.expires_at > ?
                """,
                (hashed, now),
            ).fetchone()
            return dict(row) if row else None

    def get_state(self, conn: sqlite3.Connection, user_id: str) -> dict:
        row = conn.execute("SELECT state_json FROM user_states WHERE user_id = ?", (user_id,)).fetchone()
        return parse_json(row["state_json"], {}) if row else {}

    def save_state(self, conn: sqlite3.Connection, user_id: str, state: dict | None) -> dict:
        next_state = state if isinstance(state, dict) else {}
        next_state["updatedAt"] = utc_now()
        conn.execute(
            """
            INSERT INTO user_states (user_id, state_json, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id) DO UPDATE SET
              state_json = excluded.state_json,
              updated_at = excluded.updated_at
            """,
            (user_id, compact_json(next_state), next_state["updatedAt"]),
        )
        return next_state

    def get_community(self, conn: sqlite3.Connection) -> dict:
        row = conn.execute("SELECT community_json FROM community WHERE id = 1").fetchone()
        return parse_json(row["community_json"], {"posts": []}) if row else {"posts": []}

    def save_community(self, conn: sqlite3.Connection, community: dict | None, merge: bool = True) -> dict:
        existing = self.get_community(conn)
        next_community = merge_community(existing, community) if merge else community
        if not isinstance(next_community, dict):
            next_community = {"posts": []}
        if not isinstance(next_community.get("posts"), list):
            next_community["posts"] = []
        updated_at = utc_now()
        conn.execute(
            """
            INSERT INTO community (id, community_json, updated_at)
            VALUES (1, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
              community_json = excluded.community_json,
              updated_at = excluded.updated_at
            """,
            (compact_json(next_community), updated_at),
        )
        return next_community

    def get_problems(self, conn: sqlite3.Connection, owner_user_id: str | None = None) -> list[dict]:
        if owner_user_id:
            rows = conn.execute(
                """
                SELECT problem_json
                FROM problems
                WHERE visibility = 'public' OR owner_user_id = ?
                ORDER BY source, id
                """,
                (owner_user_id,),
            ).fetchall()
        else:
            rows = conn.execute(
                """
                SELECT problem_json
                FROM problems
                WHERE visibility = 'public'
                ORDER BY source, id
                """
            ).fetchall()
        return [parse_json(row["problem_json"], {}) for row in rows]

    def upsert_problems(
        self,
        conn: sqlite3.Connection,
        problems,
        *,
        visibility: str = "public",
        owner_user_id: str | None = None,
    ) -> list[dict]:
        saved = []
        for raw in problems if isinstance(problems, list) else []:
            if not isinstance(raw, dict):
                continue
            problem = sanitize_problem(raw, visibility=visibility, owner_user_id=owner_user_id)
            previous = conn.execute(
                "SELECT created_at, visibility, owner_user_id FROM problems WHERE id = ?",
                (problem["id"],),
            ).fetchone()
            if previous and owner_user_id and (
                previous["visibility"] != "user" or previous["owner_user_id"] != owner_user_id
            ):
                continue
            if previous and visibility == "public" and previous["visibility"] != "public":
                continue
            created_at = previous["created_at"] if previous else problem["createdAt"]
            updated_at = utc_now()
            problem["createdAt"] = created_at
            problem["updatedAt"] = updated_at
            conn.execute(
                """
                INSERT INTO problems (
                  id, visibility, owner_user_id, title_en, title_zh, category, difficulty,
                  tags_json, source, source_url, prompt_en, prompt_zh, answer, explanation,
                  problem_json, created_at, updated_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON CONFLICT(id) DO UPDATE SET
                  visibility = excluded.visibility,
                  owner_user_id = excluded.owner_user_id,
                  title_en = excluded.title_en,
                  title_zh = excluded.title_zh,
                  category = excluded.category,
                  difficulty = excluded.difficulty,
                  tags_json = excluded.tags_json,
                  source = excluded.source,
                  source_url = excluded.source_url,
                  prompt_en = excluded.prompt_en,
                  prompt_zh = excluded.prompt_zh,
                  answer = excluded.answer,
                  explanation = excluded.explanation,
                  problem_json = excluded.problem_json,
                  updated_at = excluded.updated_at
                """,
                (
                    problem["id"],
                    problem["visibility"],
                    owner_user_id,
                    problem["titleEn"],
                    problem["titleZh"],
                    problem["category"],
                    problem["difficulty"],
                    compact_json(problem["tags"]),
                    problem["source"],
                    problem["sourceUrl"],
                    problem["promptEn"],
                    problem["promptZh"],
                    problem["answer"],
                    problem["explanation"],
                    compact_json(problem),
                    created_at,
                    updated_at,
                ),
            )
            saved.append(problem)
        return saved

    def delete_user_problem(self, conn: sqlite3.Connection, problem_id: str, user_id: str) -> bool:
        result = conn.execute(
            "DELETE FROM problems WHERE id = ? AND visibility = 'user' AND owner_user_id = ?",
            (problem_id, user_id),
        )
        return result.rowcount > 0

    def get_problem_states(self, conn: sqlite3.Connection, user_id: str) -> list[dict]:
        rows = conn.execute(
            "SELECT state_json FROM user_problem_states WHERE user_id = ? ORDER BY updated_at",
            (user_id,),
        ).fetchall()
        return [parse_json(row["state_json"], {}) for row in rows]

    def save_problem_states(self, conn: sqlite3.Connection, user_id: str, states) -> list[dict]:
        for raw in states if isinstance(states, list) else []:
            if not isinstance(raw, dict):
                continue
            state = sanitize_problem_state(raw)
            previous = conn.execute(
                "SELECT created_at FROM user_problem_states WHERE user_id = ? AND problem_id = ?",
                (user_id, state["problemId"]),
            ).fetchone()
            created_at = previous["created_at"] if previous else utc_now()
            updated_at = utc_now()
            state["updatedAt"] = updated_at
            conn.execute(
                """
                INSERT INTO user_problem_states (user_id, problem_id, state_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?)
                ON CONFLICT(user_id, problem_id) DO UPDATE SET
                  state_json = excluded.state_json,
                  updated_at = excluded.updated_at
                """,
                (user_id, state["problemId"], compact_json(state), created_at, updated_at),
            )
        return self.get_problem_states(conn, user_id)

    def ensure_visible_problem(self, conn: sqlite3.Connection, problem_id: str, user_id: str | None = None) -> None:
        if user_id:
            row = conn.execute(
                "SELECT id FROM problems WHERE id = ? AND (visibility = 'public' OR owner_user_id = ?)",
                (problem_id, user_id),
            ).fetchone()
        else:
            row = conn.execute(
                "SELECT id FROM problems WHERE id = ? AND visibility = 'public'",
                (problem_id,),
            ).fetchone()
        if not row:
            raise HttpError(404, "Problem not found")

    def get_problem_social_summaries(self, conn: sqlite3.Connection, user_id: str | None = None) -> list[dict]:
        visibility_sql = "p.visibility = 'public'"
        params: list[str] = []
        if user_id:
            visibility_sql = "(p.visibility = 'public' OR p.owner_user_id = ?)"
            params.append(user_id)
        rows = conn.execute(
            f"""
            SELECT p.id AS problem_id,
              (SELECT COUNT(*) FROM problem_likes l WHERE l.problem_id = p.id) AS like_count,
              (SELECT COUNT(*) FROM problem_comments c WHERE c.problem_id = p.id) AS comment_count,
              CASE WHEN ? != '' AND EXISTS (
                SELECT 1 FROM problem_likes mine WHERE mine.problem_id = p.id AND mine.user_id = ?
              ) THEN 1 ELSE 0 END AS liked
            FROM problems p
            WHERE {visibility_sql}
              AND (
                EXISTS (SELECT 1 FROM problem_likes l WHERE l.problem_id = p.id)
                OR EXISTS (SELECT 1 FROM problem_comments c WHERE c.problem_id = p.id)
              )
            """,
            [user_id or "", user_id or "", *params],
        ).fetchall()
        return [
            {
                "problemId": row["problem_id"],
                "likeCount": int(row["like_count"] or 0),
                "commentCount": int(row["comment_count"] or 0),
                "liked": bool(row["liked"]),
            }
            for row in rows
        ]

    def get_problem_social_detail(
        self, conn: sqlite3.Connection, problem_id: str, user_id: str | None = None
    ) -> dict:
        self.ensure_visible_problem(conn, problem_id, user_id)
        like_count = conn.execute(
            "SELECT COUNT(*) AS count FROM problem_likes WHERE problem_id = ?", (problem_id,)
        ).fetchone()["count"]
        comment_count = conn.execute(
            "SELECT COUNT(*) AS count FROM problem_comments WHERE problem_id = ?", (problem_id,)
        ).fetchone()["count"]
        liked = False
        if user_id:
            liked = bool(
                conn.execute(
                    "SELECT 1 FROM problem_likes WHERE problem_id = ? AND user_id = ?",
                    (problem_id, user_id),
                ).fetchone()
            )
        rows = conn.execute(
            """
            SELECT c.*, u.account_json
            FROM problem_comments c
            JOIN users u ON u.id = c.user_id
            WHERE c.problem_id = ?
            ORDER BY c.created_at DESC
            LIMIT 120
            """,
            (problem_id,),
        ).fetchall()
        comments = []
        for row in rows:
            account = parse_json(row["account_json"], {})
            comments.append(
                {
                    "id": row["id"],
                    "problemId": problem_id,
                    "authorId": row["user_id"],
                    "author": str(account.get("name") or "Quant"),
                    "text": row["text"],
                    "createdAt": row["created_at"],
                    "isOwn": bool(user_id and row["user_id"] == user_id),
                }
            )
        return {
            "problemId": problem_id,
            "likeCount": int(like_count or 0),
            "commentCount": int(comment_count or 0),
            "liked": liked,
            "comments": comments,
        }

    def toggle_problem_like(self, conn: sqlite3.Connection, problem_id: str, user_id: str) -> dict:
        self.ensure_visible_problem(conn, problem_id, user_id)
        existing = conn.execute(
            "SELECT 1 FROM problem_likes WHERE problem_id = ? AND user_id = ?",
            (problem_id, user_id),
        ).fetchone()
        if existing:
            conn.execute(
                "DELETE FROM problem_likes WHERE problem_id = ? AND user_id = ?",
                (problem_id, user_id),
            )
        else:
            conn.execute(
                "INSERT INTO problem_likes (problem_id, user_id, created_at) VALUES (?, ?, ?)",
                (problem_id, user_id, utc_now()),
            )
        return self.get_problem_social_detail(conn, problem_id, user_id)

    def add_problem_comment(self, conn: sqlite3.Connection, problem_id: str, user_id: str, text: str) -> dict:
        self.ensure_visible_problem(conn, problem_id, user_id)
        cleaned = str(text or "").strip()
        if not cleaned:
            raise HttpError(400, "Comment text is required")
        if len(cleaned) > 1200:
            raise HttpError(400, "Comment is too long")
        now = utc_now()
        conn.execute(
            """
            INSERT INTO problem_comments (id, problem_id, user_id, text, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (secrets.token_urlsafe(14), problem_id, user_id, cleaned, now, now),
        )
        return self.get_problem_social_detail(conn, problem_id, user_id)

    def delete_problem_comment(
        self, conn: sqlite3.Connection, problem_id: str, comment_id: str, user_id: str
    ) -> dict:
        self.ensure_visible_problem(conn, problem_id, user_id)
        result = conn.execute(
            "DELETE FROM problem_comments WHERE id = ? AND problem_id = ? AND user_id = ?",
            (comment_id, problem_id, user_id),
        )
        if result.rowcount < 1:
            raise HttpError(404, "Comment not found")
        return self.get_problem_social_detail(conn, problem_id, user_id)

    def import_problem_catalog(self, path: Path) -> int:
        if not path.exists():
            return 0
        payload = parse_json(path.read_text(encoding="utf-8"), [])
        problems = payload.get("problems") if isinstance(payload, dict) else payload
        if not isinstance(problems, list):
            return 0
        catalog_ids = [str(problem.get("id") or "").strip() for problem in problems if isinstance(problem, dict)]
        catalog_ids = [problem_id for problem_id in catalog_ids if problem_id]
        with self.connect() as conn:
            saved = self.upsert_problems(conn, problems, visibility="public")
            if catalog_ids:
                placeholders = ",".join("?" for _ in catalog_ids)
                conn.execute(
                    f"DELETE FROM problems WHERE visibility = 'public' AND id NOT IN ({placeholders})",
                    catalog_ids,
                )
            return len(saved)


db = Database(DB_PATH)
IMPORTED_CATALOG_COUNT = db.import_problem_catalog(PROBLEM_CATALOG_PATH)


class QuantGymHandler(BaseHTTPRequestHandler):
    server_version = "QuantGymAPI/0.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def end_headers(self):
        origin = self.headers.get("Origin")
        if ALLOWED_ORIGINS == ["*"]:
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        self.route()

    def do_POST(self):
        self.route()

    def do_PUT(self):
        self.route()

    def do_PATCH(self):
        self.route()

    def do_DELETE(self):
        self.route()

    def route(self):
        path = urlparse(self.path).path.rstrip("/") or "/"
        try:
            if path in {"/health", "/api/health"} and self.command == "GET":
                return self.send_json(200, {"ok": True})
            if path == "/api/auth/verification-code" and self.command == "POST":
                return self.send_verification_code()
            if path == "/api/auth/register" and self.command == "POST":
                return self.register()
            if path == "/api/auth/login" and self.command == "POST":
                return self.login()
            if path == "/api/auth/google" and self.command == "POST":
                return self.google_login()
            if path == "/api/account" and self.command == "GET":
                return self.get_account()
            if path == "/api/account" and self.command == "PATCH":
                return self.patch_account()
            if path == "/api/state" and self.command == "GET":
                return self.get_state()
            if path == "/api/state" and self.command == "PUT":
                return self.put_state()
            if path == "/api/problems" and self.command == "GET":
                return self.get_problems()
            if path == "/api/problems" and self.command == "PUT":
                return self.put_problems()
            if path.startswith("/api/problems/") and self.command == "DELETE":
                return self.delete_problem(unquote(path.removeprefix("/api/problems/")))
            if path == "/api/problem-states" and self.command == "GET":
                return self.get_problem_states()
            if path == "/api/problem-states" and self.command == "PUT":
                return self.put_problem_states()
            if path == "/api/problem-social" and self.command == "GET":
                return self.get_problem_social_summaries()
            social_like_match = re.fullmatch(r"/api/problem-social/([^/]+)/like", path)
            if social_like_match and self.command == "POST":
                return self.toggle_problem_like(unquote(social_like_match.group(1)))
            social_comments_match = re.fullmatch(r"/api/problem-social/([^/]+)/comments", path)
            if social_comments_match and self.command == "POST":
                return self.post_problem_comment(unquote(social_comments_match.group(1)))
            social_delete_match = re.fullmatch(r"/api/problem-social/([^/]+)/comments/([^/]+)", path)
            if social_delete_match and self.command == "DELETE":
                return self.delete_problem_comment(
                    unquote(social_delete_match.group(1)),
                    unquote(social_delete_match.group(2)),
                )
            social_detail_match = re.fullmatch(r"/api/problem-social/([^/]+)", path)
            if social_detail_match and self.command == "GET":
                return self.get_problem_social_detail(unquote(social_detail_match.group(1)))
            if path == "/api/community" and self.command == "GET":
                return self.get_community()
            if path == "/api/community" and self.command == "PUT":
                return self.put_community()
            if path == "/api/sync" and self.command == "POST":
                return self.sync()
            return self.send_json(404, {"error": "Not found"})
        except HttpError as error:
            return self.send_json(error.status, {"error": error.message})
        except Exception as error:  # pragma: no cover - defensive server boundary
            self.log_message("Unhandled error: %s", error)
            return self.send_json(500, {"error": "Internal server error"})

    def read_json(self) -> dict:
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            raise HttpError(400, "Invalid Content-Length")
        if length > MAX_BODY_BYTES:
            raise HttpError(413, "Request body is too large")
        raw = self.rfile.read(length).decode("utf-8") if length else "{}"
        try:
            data = json.loads(raw or "{}")
        except json.JSONDecodeError:
            raise HttpError(400, "Invalid JSON")
        if not isinstance(data, dict):
            raise HttpError(400, "JSON body must be an object")
        return data

    def send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def require_user(self) -> dict:
        header = self.headers.get("Authorization", "")
        prefix = "Bearer "
        if not header.startswith(prefix):
            raise HttpError(401, "Missing bearer token")
        user = db.get_user_by_session(header[len(prefix) :].strip())
        if not user:
            raise HttpError(401, "Invalid or expired token")
        ensure_email_allowed(user.get("email_norm"))
        return user

    def optional_user(self) -> dict | None:
        header = self.headers.get("Authorization", "")
        prefix = "Bearer "
        if not header.startswith(prefix):
            return None
        user = db.get_user_by_session(header[len(prefix) :].strip())
        if user and BETA_EMAIL_ALLOWLIST and normalize_email(user.get("email_norm")) not in BETA_EMAIL_ALLOWLIST:
            return None
        return user

    def auth_response(self, conn: sqlite3.Connection, user: dict, token: str):
        account = parse_json(user["account_json"], {})
        return {
            "token": token,
            "account": account,
            "state": db.get_state(conn, user["id"]),
            "problemStates": db.get_problem_states(conn, user["id"]),
            "community": db.get_community(conn),
        }

    def send_verification_code(self):
        data = self.read_json()
        email = normalize_email(data.get("email"))
        purpose = str(data.get("purpose") or "register").strip().lower()
        if purpose != "register":
            raise HttpError(400, "Unsupported verification purpose")
        ensure_valid_email(email)
        ensure_email_allowed(email)

        with db.connect() as conn:
            existing = conn.execute("SELECT id FROM users WHERE email_norm = ?", (email,)).fetchone()
            if existing:
                raise HttpError(409, "Email already exists")

            previous = conn.execute(
                """
                SELECT sent_at, consumed_at
                FROM email_verification_codes
                WHERE email_norm = ? AND purpose = ?
                """,
                (email, purpose),
            ).fetchone()
            now_dt = datetime.now(timezone.utc)
            if previous and not previous["consumed_at"]:
                wait_until = parse_utc(previous["sent_at"]) + timedelta(seconds=EMAIL_CODE_COOLDOWN_SECONDS)
                if wait_until > now_dt:
                    wait_seconds = max(1, int((wait_until - now_dt).total_seconds()))
                    raise HttpError(429, f"Please wait {wait_seconds} seconds before requesting another code")

            code = generate_email_code()
            try:
                delivery = send_email_verification_code(email, code, purpose)
            except (OSError, smtplib.SMTPException):
                raise HttpError(502, "Could not send email verification code")
            salt_hex, code_hash = make_email_code_hash(email, purpose, code)
            now = utc_now()
            expires_at = (
                now_dt + timedelta(minutes=EMAIL_CODE_TTL_MINUTES)
            ).isoformat(timespec="seconds").replace("+00:00", "Z")
            conn.execute(
                """
                INSERT INTO email_verification_codes
                  (id, email_norm, purpose, code_salt, code_hash, attempts, created_at, sent_at, expires_at, consumed_at)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?, ?, NULL)
                ON CONFLICT(email_norm, purpose) DO UPDATE SET
                  id = excluded.id,
                  code_salt = excluded.code_salt,
                  code_hash = excluded.code_hash,
                  attempts = 0,
                  created_at = excluded.created_at,
                  sent_at = excluded.sent_at,
                  expires_at = excluded.expires_at,
                  consumed_at = NULL
                """,
                (secrets.token_urlsafe(16), email, purpose, salt_hex, code_hash, now, now, expires_at),
            )

        payload = {
            "ok": True,
            "email": email,
            "purpose": purpose,
            "delivery": delivery,
            "expiresInSeconds": EMAIL_CODE_TTL_MINUTES * 60,
            "cooldownSeconds": EMAIL_CODE_COOLDOWN_SECONDS,
        }
        if delivery == "dev" and EMAIL_DEV_CODE_RESPONSE:
            payload["devCode"] = code
        self.send_json(200, payload)

    def consume_verification_code(self, conn: sqlite3.Connection, email: str, purpose: str, code: str) -> None:
        code_value = str(code or "").strip()
        if not code_value:
            raise HttpError(400, "Email verification code is required")
        row = conn.execute(
            """
            SELECT *
            FROM email_verification_codes
            WHERE email_norm = ? AND purpose = ?
            """,
            (email, purpose),
        ).fetchone()
        if not row or row["consumed_at"] or parse_utc(row["expires_at"]) < datetime.now(timezone.utc):
            raise HttpError(400, "Invalid or expired email verification code")
        if int(row["attempts"] or 0) >= EMAIL_CODE_MAX_ATTEMPTS:
            raise HttpError(429, "Too many email verification attempts")

        _, actual_hash = make_email_code_hash(email, purpose, code_value, row["code_salt"])
        if not hmac.compare_digest(actual_hash, row["code_hash"]):
            conn.execute(
                """
                UPDATE email_verification_codes
                SET attempts = attempts + 1
                WHERE email_norm = ? AND purpose = ?
                """,
                (email, purpose),
            )
            raise HttpError(400, "Invalid or expired email verification code")

        conn.execute(
            """
            UPDATE email_verification_codes
            SET consumed_at = ?
            WHERE email_norm = ? AND purpose = ?
            """,
            (utc_now(), email, purpose),
        )

    def register(self):
        data = self.read_json()
        password = str(data.get("password") or "")
        account = sanitize_account(data.get("account") if isinstance(data.get("account"), dict) else {})
        email = normalize_email(account.get("email"))
        if account["provider"] != "local":
            raise HttpError(400, "Use /api/auth/google for Google accounts")
        if not email:
            raise HttpError(400, "Email is required")
        ensure_valid_email(email)
        if len(password) < 6:
            raise HttpError(400, "Password must be at least 6 characters")
        ensure_email_allowed(email)

        salt_hex, password_hash = make_password_hash(email, password)
        now = utc_now()
        account["email"] = email
        account["updatedAt"] = now
        with db.connect() as conn:
            existing = conn.execute("SELECT id FROM users WHERE email_norm = ?", (email,)).fetchone()
            if existing:
                raise HttpError(409, "Email already exists")
            existing_id = conn.execute("SELECT id FROM users WHERE id = ?", (account["id"],)).fetchone()
            if existing_id:
                raise HttpError(409, "Account id already exists")
            if EMAIL_VERIFICATION_REQUIRED:
                self.consume_verification_code(conn, email, "register", str(data.get("verificationCode") or ""))
            conn.execute(
                """
                INSERT INTO users
                  (id, provider, email_norm, password_salt, password_hash, account_json, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    account["id"],
                    account["provider"],
                    email,
                    salt_hex,
                    password_hash,
                    compact_json(account),
                    now,
                    now,
                ),
            )
            db.save_state(conn, account["id"], data.get("state") if isinstance(data.get("state"), dict) else {})
            db.save_problem_states(conn, account["id"], data.get("problemStates"))
            db.upsert_problems(conn, data.get("problems"), visibility="user", owner_user_id=account["id"])
            if isinstance(data.get("community"), dict):
                db.save_community(conn, data.get("community"), merge=True)
            token = db.create_session(conn, account["id"])
            user = conn.execute("SELECT * FROM users WHERE id = ?", (account["id"],)).fetchone()
            self.send_json(201, self.auth_response(conn, dict(user), token))

    def login(self):
        data = self.read_json()
        email = normalize_email(data.get("email"))
        password = str(data.get("password") or "")
        if not email or not password:
            raise HttpError(400, "Email and password are required")
        ensure_valid_email(email)
        ensure_email_allowed(email)
        with db.connect() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE provider = 'local' AND email_norm = ?",
                (email,),
            ).fetchone()
            if not user:
                raise HttpError(401, "Invalid email or password")
            user_dict = dict(user)
            if not verify_password(email, password, user_dict["password_salt"], user_dict["password_hash"]):
                raise HttpError(401, "Invalid email or password")
            token = db.create_session(conn, user_dict["id"])
            self.send_json(200, self.auth_response(conn, user_dict, token))

    def google_login(self):
        data = self.read_json()
        account = verified_google_account(
            str(data.get("credential") or ""),
            data.get("account") if isinstance(data.get("account"), dict) else {},
        )
        if account["provider"] != "google":
            raise HttpError(400, "Google account provider is required")
        if not account.get("email"):
            raise HttpError(400, "Email is required")
        ensure_email_allowed(account["email"])
        now = utc_now()
        account["updatedAt"] = now
        with db.connect() as conn:
            existing = conn.execute("SELECT * FROM users WHERE id = ?", (account["id"],)).fetchone()
            if not existing:
                email_owner = conn.execute(
                    "SELECT id FROM users WHERE email_norm = ? AND id != ?",
                    (account["email"], account["id"]),
                ).fetchone()
                if email_owner:
                    raise HttpError(409, "Email already exists")
                conn.execute(
                    """
                    INSERT INTO users
                      (id, provider, email_norm, account_json, created_at, updated_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                    """,
                    (
                        account["id"],
                        account["provider"],
                        account["email"],
                        compact_json(account),
                        now,
                        now,
                    ),
                )
                db.save_state(conn, account["id"], data.get("state") if isinstance(data.get("state"), dict) else {})
                db.save_problem_states(conn, account["id"], data.get("problemStates"))
                db.upsert_problems(conn, data.get("problems"), visibility="user", owner_user_id=account["id"])
            else:
                previous = parse_json(existing["account_json"], {})
                next_account = {**previous, **account, "createdAt": previous.get("createdAt") or account["createdAt"]}
                email_owner = conn.execute(
                    "SELECT id FROM users WHERE email_norm = ? AND id != ?",
                    (next_account["email"], account["id"]),
                ).fetchone()
                if email_owner:
                    raise HttpError(409, "Email already exists")
                conn.execute(
                    """
                    UPDATE users
                    SET email_norm = ?, account_json = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (next_account["email"], compact_json(next_account), now, account["id"]),
                )
            if isinstance(data.get("community"), dict):
                db.save_community(conn, data.get("community"), merge=True)
            token = db.create_session(conn, account["id"])
            user = conn.execute("SELECT * FROM users WHERE id = ?", (account["id"],)).fetchone()
            self.send_json(200, self.auth_response(conn, dict(user), token))

    def get_account(self):
        user = self.require_user()
        self.send_json(200, {"account": parse_json(user["account_json"], {})})

    def patch_account(self):
        user = self.require_user()
        data = self.read_json()
        updates = sanitize_account({**parse_json(user["account_json"], {}), **(data.get("updates") or {})}, user["id"])
        updates["id"] = user["id"]
        updates["provider"] = user["provider"]
        updates["updatedAt"] = utc_now()
        email = normalize_email(updates.get("email"))
        if not email:
            raise HttpError(400, "Email is required")
        ensure_email_allowed(email)
        with db.connect() as conn:
            owner = conn.execute("SELECT id FROM users WHERE email_norm = ? AND id != ?", (email, user["id"])).fetchone()
            if owner:
                raise HttpError(409, "Email already exists")
            conn.execute(
                "UPDATE users SET email_norm = ?, account_json = ?, updated_at = ? WHERE id = ?",
                (email, compact_json(updates), updates["updatedAt"], user["id"]),
            )
            self.send_json(200, {"account": updates})

    def get_state(self):
        user = self.require_user()
        with db.connect() as conn:
            self.send_json(200, {"state": db.get_state(conn, user["id"])})

    def put_state(self):
        user = self.require_user()
        data = self.read_json()
        with db.connect() as conn:
            state = db.save_state(conn, user["id"], data.get("state") if isinstance(data.get("state"), dict) else {})
            self.send_json(200, {"state": state})

    def get_problems(self):
        user = self.optional_user()
        with db.connect() as conn:
            self.send_json(200, {"problems": db.get_problems(conn, user["id"] if user else None)})

    def put_problems(self):
        user = self.require_user()
        data = self.read_json()
        problems = data.get("problems")
        if isinstance(data.get("problem"), dict):
            problems = [data["problem"]]
        with db.connect() as conn:
            saved = db.upsert_problems(conn, problems, visibility="user", owner_user_id=user["id"])
            self.send_json(200, {"problems": saved})

    def delete_problem(self, problem_id: str):
        user = self.require_user()
        if not problem_id:
            raise HttpError(400, "Problem id is required")
        with db.connect() as conn:
            deleted = db.delete_user_problem(conn, problem_id, user["id"])
            if not deleted:
                raise HttpError(404, "User problem not found")
            self.send_json(200, {"deleted": problem_id})

    def get_problem_states(self):
        user = self.require_user()
        with db.connect() as conn:
            self.send_json(200, {"problemStates": db.get_problem_states(conn, user["id"])})

    def put_problem_states(self):
        user = self.require_user()
        data = self.read_json()
        states = data.get("problemStates")
        if isinstance(data.get("problemState"), dict):
            states = [data["problemState"]]
        with db.connect() as conn:
            self.send_json(200, {"problemStates": db.save_problem_states(conn, user["id"], states)})

    def get_problem_social_summaries(self):
        user = self.optional_user()
        with db.connect() as conn:
            items = db.get_problem_social_summaries(conn, user["id"] if user else None)
            self.send_json(200, {"problemSocial": items})

    def get_problem_social_detail(self, problem_id: str):
        user = self.optional_user()
        with db.connect() as conn:
            social = db.get_problem_social_detail(conn, problem_id, user["id"] if user else None)
            self.send_json(200, {"social": social})

    def toggle_problem_like(self, problem_id: str):
        user = self.require_user()
        with db.connect() as conn:
            social = db.toggle_problem_like(conn, problem_id, user["id"])
            self.send_json(200, {"social": social})

    def post_problem_comment(self, problem_id: str):
        user = self.require_user()
        data = self.read_json()
        with db.connect() as conn:
            social = db.add_problem_comment(conn, problem_id, user["id"], str(data.get("text") or ""))
            self.send_json(201, {"social": social})

    def delete_problem_comment(self, problem_id: str, comment_id: str):
        user = self.require_user()
        with db.connect() as conn:
            social = db.delete_problem_comment(conn, problem_id, comment_id, user["id"])
            self.send_json(200, {"social": social})

    def get_community(self):
        with db.connect() as conn:
            self.send_json(200, {"community": db.get_community(conn)})

    def put_community(self):
        self.require_user()
        data = self.read_json()
        with db.connect() as conn:
            community = db.save_community(
                conn,
                data.get("community") if isinstance(data.get("community"), dict) else {"posts": []},
                merge=False,
            )
            self.send_json(200, {"community": community})

    def sync(self):
        user = self.require_user()
        data = self.read_json()
        with db.connect() as conn:
            account = parse_json(user["account_json"], {})
            if isinstance(data.get("account"), dict):
                updates = sanitize_account({**account, **data["account"]}, user["id"])
                updates["id"] = user["id"]
                updates["provider"] = user["provider"]
                updates["updatedAt"] = utc_now()
                email_owner = conn.execute(
                    "SELECT id FROM users WHERE email_norm = ? AND id != ?",
                    (normalize_email(updates["email"]), user["id"]),
                ).fetchone()
                if email_owner:
                    raise HttpError(409, "Email already exists")
                ensure_email_allowed(updates["email"])
                conn.execute(
                    "UPDATE users SET email_norm = ?, account_json = ?, updated_at = ? WHERE id = ?",
                    (normalize_email(updates["email"]), compact_json(updates), updates["updatedAt"], user["id"]),
                )
                account = updates
            if isinstance(data.get("state"), dict):
                state = db.save_state(conn, user["id"], data["state"])
            else:
                state = db.get_state(conn, user["id"])
            if isinstance(data.get("problemStates"), list):
                problem_states = db.save_problem_states(conn, user["id"], data["problemStates"])
            else:
                problem_states = db.get_problem_states(conn, user["id"])
            if isinstance(data.get("problems"), list):
                db.upsert_problems(conn, data["problems"], visibility="user", owner_user_id=user["id"])
            if isinstance(data.get("community"), dict):
                community = db.save_community(conn, data["community"], merge=False)
            else:
                community = db.get_community(conn)
            self.send_json(
                200,
                {
                    "account": account,
                    "state": state,
                    "problemStates": problem_states,
                    "community": community,
                    "syncedAt": utc_now(),
                },
            )


def main():
    server = ThreadingHTTPServer((HOST, PORT), QuantGymHandler)
    print(f"QuantGym API listening on http://{HOST}:{PORT}")
    print(f"SQLite database: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
