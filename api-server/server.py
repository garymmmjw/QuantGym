#!/usr/bin/env python3
"""QuantGym cloud-sync API backed by SQLite.

This server intentionally uses only Python's standard library so the project can
run locally without dependency installation, while still using a real database.
"""

from __future__ import annotations

import hashlib
import hmac
import base64
import ipaddress
import json
import math
import os
import re
import secrets
import smtplib
import sqlite3
import sys
import time
import struct
import threading
from email.message import EmailMessage
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, quote, unquote, urlparse
from urllib.request import Request, urlopen

from poker_engine import (
    PokerError,
    add_player as poker_add_player,
    add_spectator as poker_add_spectator,
    apply_command as poker_apply_command,
    create_room_state as poker_create_room_state,
    mark_disconnected as poker_mark_disconnected,
    normalize_room_code as poker_normalize_room_code,
    redact_state as poker_redact_state,
    room_summary as poker_room_summary,
)


def env_bool(name: str, default: bool = False) -> bool:
    raw = os.environ.get(name)
    if raw is None:
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on"}


def parse_ip_networks(value: str) -> list[ipaddress._BaseNetwork]:
    networks = []
    for raw_item in str(value or "").split(","):
        item = raw_item.strip()
        if not item:
            continue
        try:
            networks.append(ipaddress.ip_network(item, strict=False))
        except ValueError as error:
            raise ValueError(f"Invalid QUANTGYM_TRUSTED_PROXY_CIDRS entry: {item}") from error
    return networks


def parse_origin_base_url(name: str, value: str) -> str:
    cleaned = str(value or "").strip().rstrip("/")
    if not cleaned:
        return ""
    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{name} must be an http(s) origin")
    if parsed.params or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        raise ValueError(f"{name} must not include a path, query, or fragment")
    return cleaned


BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = Path(os.environ.get("QUANTGYM_DB", DATA_DIR / "quantgym.sqlite3"))
PROBLEM_CATALOG_PATH = Path(
    os.environ.get("QUANTGYM_PROBLEM_CATALOG", PROJECT_ROOT / "data" / "problem-catalog.json")
)
JOBS_CATALOG_PATH = Path(os.environ.get("QUANTGYM_JOBS_CATALOG", PROJECT_ROOT / "data" / "jobs-catalog.json"))
DEFAULT_PUBLIC_ATS_JOBS_SOURCE_URL = "https://beta.quantgym.app/data/jobs/public-ats-feed.json"


def is_truthy_env(value: str) -> bool:
    return str(value or "").strip().lower() in {"1", "true", "yes", "on", "confirmed"}


def is_disabled_env(value: str) -> bool:
    return str(value or "").strip().lower() in {"0", "false", "off", "disabled", "none", "no"}


def is_production_like_jobs_deployment() -> bool:
    public_api_base = os.environ.get("QUANTGYM_PUBLIC_API_BASE_URL", "").strip().lower()
    allowed_origins = os.environ.get("QUANTGYM_ALLOWED_ORIGINS", "").strip().lower()
    return (
        is_truthy_env(os.environ.get("QUANTGYM_JOBS_USE_DEFAULT_SOURCE", ""))
        or is_truthy_env(os.environ.get("RENDER", ""))
        or "https://api.quantgym.app" in public_api_base
        or "https://beta.quantgym.app" in allowed_origins
    )


def resolve_jobs_source_url() -> str:
    raw = os.environ.get("QUANTGYM_JOBS_SOURCE_URL")
    if raw is not None:
        value = raw.strip()
        if is_disabled_env(value):
            return ""
        if value:
            return value
    return DEFAULT_PUBLIC_ATS_JOBS_SOURCE_URL if is_production_like_jobs_deployment() else ""


JOBS_SOURCE_URL = resolve_jobs_source_url()
JOBS_SOURCE_TOKEN = os.environ.get("QUANTGYM_JOBS_SOURCE_TOKEN", "").strip()
JOBS_SOURCE_CACHE_SECONDS = int(os.environ.get("QUANTGYM_JOBS_SOURCE_CACHE_SECONDS", "300"))
JOBS_SOURCE_TIMEOUT_SECONDS = float(os.environ.get("QUANTGYM_JOBS_SOURCE_TIMEOUT_SECONDS", "5"))
JOBS_SOURCE_MAX_BYTES = int(os.environ.get("QUANTGYM_JOBS_SOURCE_MAX_BYTES", str(1024 * 1024)))
LIBRARY_ASSETS_PATH = Path(os.environ.get("QUANTGYM_LIBRARY_ASSETS", BASE_DIR / "library-assets.json"))
LIBRARY_PDF_ROOT = Path(os.environ.get("QUANTGYM_LIBRARY_PDF_ROOT", PROJECT_ROOT)).expanduser()
MEDIA_ROOT = Path(os.environ.get("QUANTGYM_MEDIA_ROOT", DATA_DIR / "media")).expanduser()
MEDIA_MAX_BYTES = int(os.environ.get("QUANTGYM_MEDIA_MAX_BYTES", str(5 * 1024 * 1024)))
MEDIA_STORAGE = os.environ.get("QUANTGYM_MEDIA_STORAGE", "local").strip().lower() or "local"
MEDIA_PUBLIC_BASE_URL = os.environ.get("QUANTGYM_MEDIA_PUBLIC_BASE_URL", "").strip().rstrip("/")
MEDIA_S3_ENDPOINT = os.environ.get("QUANTGYM_MEDIA_S3_ENDPOINT", "").strip().rstrip("/")
MEDIA_S3_BUCKET = os.environ.get("QUANTGYM_MEDIA_S3_BUCKET", "").strip()
MEDIA_S3_REGION = os.environ.get("QUANTGYM_MEDIA_S3_REGION", "us-east-1").strip() or "us-east-1"
MEDIA_S3_ACCESS_KEY_ID = os.environ.get("QUANTGYM_MEDIA_S3_ACCESS_KEY_ID", "").strip()
MEDIA_S3_SECRET_ACCESS_KEY = os.environ.get("QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY", "")
MEDIA_S3_PREFIX = os.environ.get("QUANTGYM_MEDIA_S3_PREFIX", "media").strip().strip("/")
MEDIA_S3_TIMEOUT_SECONDS = float(os.environ.get("QUANTGYM_MEDIA_S3_TIMEOUT_SECONDS", "10"))
PUBLIC_API_BASE_URL = parse_origin_base_url(
    "QUANTGYM_PUBLIC_API_BASE_URL",
    os.environ.get("QUANTGYM_PUBLIC_API_BASE_URL", ""),
)
LIBRARY_TOKEN_SECRET = os.environ.get(
    "QUANTGYM_LIBRARY_TOKEN_SECRET",
    os.environ.get("QUANTGYM_APP_SECRET", "quantgym-local-library-dev-secret"),
)
LIBRARY_READER_TOKEN_TTL_SECONDS = int(os.environ.get("QUANTGYM_LIBRARY_TOKEN_TTL_SECONDS", "600"))
PORT = int(os.environ.get("PORT", "8790"))
HOST = os.environ.get("QUANTGYM_HOST", os.environ.get("HOST", "127.0.0.1"))
PBKDF2_ROUNDS = int(os.environ.get("QUANTGYM_PBKDF2_ROUNDS", "120000"))
SESSION_DAYS = int(os.environ.get("QUANTGYM_SESSION_DAYS", "30"))
MAX_BODY_BYTES = int(os.environ.get("QUANTGYM_MAX_BODY_BYTES", str(25 * 1024 * 1024)))
GOOGLE_CLIENT_ID = os.environ.get("QUANTGYM_GOOGLE_CLIENT_ID", "").strip()
GOOGLE_JWKS_URL = os.environ.get("QUANTGYM_GOOGLE_JWKS_URL", "https://www.googleapis.com/oauth2/v3/certs").strip()
GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS = int(os.environ.get("QUANTGYM_GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS", "300"))
RATE_LIMIT_DISABLED = env_bool("QUANTGYM_RATE_LIMIT_DISABLED", False)
RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("QUANTGYM_RATE_LIMIT_WINDOW_SECONDS", "60"))
AUTH_RATE_LIMIT_MAX = int(os.environ.get("QUANTGYM_AUTH_RATE_LIMIT_MAX", "30"))
AUTH_VERIFICATION_RATE_LIMIT_MAX = int(os.environ.get("QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX", "5"))
AUTH_REGISTER_RATE_LIMIT_MAX = int(os.environ.get("QUANTGYM_AUTH_REGISTER_RATE_LIMIT_MAX", str(AUTH_RATE_LIMIT_MAX)))
AUTH_LOGIN_RATE_LIMIT_MAX = int(os.environ.get("QUANTGYM_AUTH_LOGIN_RATE_LIMIT_MAX", str(AUTH_RATE_LIMIT_MAX)))
AUTH_GOOGLE_RATE_LIMIT_MAX = int(os.environ.get("QUANTGYM_AUTH_GOOGLE_RATE_LIMIT_MAX", str(AUTH_RATE_LIMIT_MAX)))
AUTH_PASSWORD_RESET_RATE_LIMIT_MAX = int(
    os.environ.get("QUANTGYM_AUTH_PASSWORD_RESET_RATE_LIMIT_MAX", str(AUTH_VERIFICATION_RATE_LIMIT_MAX))
)
EMAIL_VERIFICATION_PURPOSES = {"register", "password_reset"}
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
ALERT_WEBHOOK_URL = os.environ.get("QUANTGYM_ALERT_WEBHOOK_URL", "").strip()
ALERT_WEBHOOK_TOKEN = os.environ.get("QUANTGYM_ALERT_WEBHOOK_TOKEN", "").strip()
ALERT_MIN_STATUS_CODE = int(os.environ.get("QUANTGYM_ALERT_MIN_STATUS_CODE", "500"))
ALERT_WEBHOOK_TIMEOUT_SECONDS = float(os.environ.get("QUANTGYM_ALERT_WEBHOOK_TIMEOUT_SECONDS", "3"))
TRUST_PROXY_HEADERS = env_bool("QUANTGYM_TRUST_PROXY_HEADERS", False)
TRUSTED_PROXY_CIDRS = parse_ip_networks(os.environ.get("QUANTGYM_TRUSTED_PROXY_CIDRS", ""))
BETA_EMAIL_ALLOWLIST = {
    item.strip().lower()
    for item in os.environ.get("QUANTGYM_BETA_EMAIL_ALLOWLIST", "").split(",")
    if item.strip()
}
ADMIN_EMAILS = {
    item.strip().lower()
    for item in os.environ.get("QUANTGYM_ADMIN_EMAILS", "").split(",")
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

SUBSCRIPTION_TIER_ORDER = {
    "registered": 0,
    "basic": 1,
    "plus": 2,
    "pro": 3,
    "admin": 99,
}
POKER_WS_GUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"
POKER_WS_MAX_MESSAGE_BYTES = int(os.environ.get("QUANTGYM_POKER_WS_MAX_MESSAGE_BYTES", str(512 * 1024)))
POKER_SINGLE_TABLE_CODE = poker_normalize_room_code(os.environ.get("QUANTGYM_POKER_ROOM_CODE", "QG-MAIN")) or "QG-MAIN"
MEDIA_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/quicktime": ".mov",
    "application/pdf": ".pdf",
}

_LIBRARY_ASSET_CACHE = {
    "mtime": None,
    "assets": {},
}
_JOBS_CATALOG_CACHE = {
    "mtime": None,
    "jobs": [],
}
_JOBS_SOURCE_CACHE = {
    "fetched_at": 0.0,
    "jobs": [],
    "status": "disabled",
    "error": "",
}
_GOOGLE_JWKS_CACHE = {
    "expires_at": 0.0,
    "keys": {},
}
_GOOGLE_JWKS_LOCK = threading.Lock()


class HttpError(Exception):
    def __init__(self, status: int, message: str):
        super().__init__(message)
        self.status = status
        self.message = message


class RateLimiter:
    def __init__(self, max_buckets: int = 10000):
        self.max_buckets = max_buckets
        self._hits: dict[tuple[str, str], list[float]] = {}
        self._lock = threading.Lock()

    def check(self, scope: str, key: str, max_requests: int, window_seconds: int) -> None:
        if RATE_LIMIT_DISABLED or max_requests <= 0 or window_seconds <= 0:
            return
        now = time.monotonic()
        cutoff = now - window_seconds
        bucket_key = (scope, key or "anonymous")
        with self._lock:
            hits = [item for item in self._hits.get(bucket_key, []) if item > cutoff]
            if len(hits) >= max_requests:
                retry_after = max(1, math.ceil(window_seconds - (now - hits[0])))
                self._hits[bucket_key] = hits
                raise HttpError(429, f"Too many requests. Try again in {retry_after} seconds.")
            hits.append(now)
            self._hits[bucket_key] = hits
            if len(self._hits) > self.max_buckets:
                self._prune_locked(cutoff)

    def _prune_locked(self, cutoff: float) -> None:
        for bucket_key, hits in list(self._hits.items()):
            fresh = [item for item in hits if item > cutoff]
            if fresh:
                self._hits[bucket_key] = fresh
            else:
                self._hits.pop(bucket_key, None)


rate_limiter = RateLimiter()


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")


def parse_utc(value: str | None) -> datetime:
    try:
        return datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
    except ValueError:
        return datetime.fromtimestamp(0, timezone.utc)


def is_valid_timestamp(value: str | None) -> bool:
    try:
        datetime.fromisoformat(str(value or "").replace("Z", "+00:00"))
        return True
    except ValueError:
        return False


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


def sanitize_alert_message(status: int, path: str, message: str) -> str:
    if path.startswith("/api/auth/"):
        if status == 429:
            return "Too many requests."
        return "Authentication request failed."
    return str(message or "")[:180]


def normalize_ip_literal(value: str) -> str:
    try:
        return str(ipaddress.ip_address(str(value or "").strip()))
    except ValueError:
        return ""


def peer_is_trusted_proxy(peer_ip: str) -> bool:
    if not TRUST_PROXY_HEADERS:
        return False
    normalized = normalize_ip_literal(peer_ip)
    if not normalized:
        return False
    address = ipaddress.ip_address(normalized)
    if TRUSTED_PROXY_CIDRS:
        return any(address in network for network in TRUSTED_PROXY_CIDRS)
    return address.is_loopback


def forwarded_client_ip(headers) -> str:
    for header in ("CF-Connecting-IP", "X-Real-IP", "X-Forwarded-For"):
        value = headers.get(header, "")
        if not value:
            continue
        for candidate in str(value).split(","):
            normalized = normalize_ip_literal(candidate)
            if normalized:
                return normalized
    return ""


def first_header_value(headers, name: str) -> str:
    return str(headers.get(name, "") or "").split(",", 1)[0].strip()


def clean_host_header(value: str) -> str:
    candidate = str(value or "").strip()
    if not candidate or len(candidate) > 255:
        return ""
    if re.search(r"[\s/@?#\\]", candidate):
        return ""
    return candidate


def forwarded_request_proto(headers) -> str:
    proto = first_header_value(headers, "X-Forwarded-Proto").lower()
    if proto in {"http", "https"}:
        return proto
    if first_header_value(headers, "X-Forwarded-Ssl").lower() == "on":
        return "https"
    return ""


def send_alert_webhook(payload: dict) -> bool:
    if not ALERT_WEBHOOK_URL:
        return False
    body = compact_json(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "QuantGymAPI/0.1",
    }
    if ALERT_WEBHOOK_TOKEN:
        headers["Authorization"] = f"Bearer {ALERT_WEBHOOK_TOKEN}"
        signature = hmac.new(ALERT_WEBHOOK_TOKEN.encode("utf-8"), body, hashlib.sha256).hexdigest()
        headers["X-QuantGym-Alert-Signature"] = f"sha256={signature}"
    request = Request(ALERT_WEBHOOK_URL, data=body, headers=headers, method="POST")
    try:
        with urlopen(request, timeout=ALERT_WEBHOOK_TIMEOUT_SECONDS) as response:
            return 200 <= int(response.status) < 300
    except (HTTPError, URLError, OSError) as error:
        print(f"[alert-webhook] delivery failed: {error}", file=sys.stderr)
        return False


def sanitize_audit_metadata(metadata: dict | None) -> dict:
    if not isinstance(metadata, dict):
        return {}
    blocked = {"password", "token", "credential", "authorization", "state", "community", "problems"}
    cleaned = {}
    for key, value in metadata.items():
        name = str(key)
        if name.lower() in blocked:
            continue
        if isinstance(value, bool) or value is None:
            cleaned[name] = value
        elif isinstance(value, (int, float)):
            cleaned[name] = value
        elif isinstance(value, (list, tuple)):
            cleaned[name] = [str(item)[:160] for item in value[:20]]
        elif isinstance(value, dict):
            cleaned[name] = {
                str(child_key)[:80]: str(child_value)[:160]
                for child_key, child_value in list(value.items())[:20]
                if str(child_key).lower() not in blocked
            }
        else:
            cleaned[name] = str(value)[:240]
    return cleaned


def parse_json(raw: str, fallback):
    if not raw:
        return fallback
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return fallback


def b64url_encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def b64url_decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode((value + padding).encode("ascii"))


def load_library_assets() -> dict[str, dict]:
    try:
        mtime = LIBRARY_ASSETS_PATH.stat().st_mtime
    except FileNotFoundError:
        return {}
    if _LIBRARY_ASSET_CACHE["mtime"] == mtime:
        return _LIBRARY_ASSET_CACHE["assets"]
    payload = parse_json(LIBRARY_ASSETS_PATH.read_text(encoding="utf-8"), {"assets": []})
    assets = {}
    for item in payload.get("assets", []):
        if not isinstance(item, dict) or not str(item.get("id") or "").strip():
            continue
        assets[str(item["id"])] = item
    _LIBRARY_ASSET_CACHE["mtime"] = mtime
    _LIBRARY_ASSET_CACHE["assets"] = assets
    return assets


def get_library_asset(asset_id: str) -> dict:
    asset = load_library_assets().get(str(asset_id or ""))
    if not asset:
        raise HttpError(404, "Library asset not found")
    if str(asset.get("id") or "") == "question-bank":
        raise HttpError(404, "Library asset not found")
    return asset


def safe_job_url(value: str | None) -> str:
    text = str(value or "").strip()[:600]
    try:
        parsed = urlparse(text)
    except ValueError:
        return "#"
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return "#"
    return text


def safe_job_posted_at(value: str | None) -> str:
    text = str(value or "").strip()[:80]
    if not text:
        return "crawler-ready"
    try:
        parsed = datetime.fromisoformat(text.replace("Z", "+00:00"))
    except ValueError:
        return "crawler-ready"
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    else:
        parsed = parsed.astimezone(timezone.utc)
    if parsed > datetime.now(timezone.utc) + timedelta(days=1):
        return "crawler-ready"
    return text


def normalize_job_item(raw: dict | None) -> dict:
    item = raw if isinstance(raw, dict) else {}
    job_id = str(item.get("id") or "").strip()
    company = str(item.get("company") or "Quant Firm").strip()[:120] or "Quant Firm"
    title = str(item.get("title") or "Quant Role").strip()[:180] or "Quant Role"
    if not job_id:
        digest = hashlib.sha1(f"{company}:{title}".encode("utf-8")).hexdigest()[:12]
        job_id = f"job-{digest}"
    job_type = str(item.get("type") or "internship").strip().lower()
    if job_type not in {"internship", "fulltime"}:
        job_type = "internship"
    tags = item.get("tags")
    if isinstance(tags, str):
        tags = [part.strip() for part in re.split(r"[,，#/|]", tags) if part.strip()]
    elif isinstance(tags, list):
        tags = [str(part).strip() for part in tags if str(part).strip()]
    else:
        tags = []
    return {
        "id": job_id[:160],
        "company": company,
        "title": title,
        "type": job_type,
        "location": str(item.get("location") or "Global").strip()[:180] or "Global",
        "url": safe_job_url(item.get("url")),
        "postedAt": safe_job_posted_at(item.get("postedAt") or item.get("createdAt")),
        "tags": tags[:12],
    }


def extract_jobs_payload(payload) -> list:
    if isinstance(payload, list):
        return payload
    if not isinstance(payload, dict):
        return []
    for key in ("jobs", "items", "results", "data"):
        value = payload.get(key)
        if isinstance(value, list):
            return value
        if isinstance(value, dict):
            nested = extract_jobs_payload(value)
            if nested:
                return nested
    return []


def load_local_jobs_catalog() -> list[dict]:
    try:
        mtime = JOBS_CATALOG_PATH.stat().st_mtime
    except FileNotFoundError:
        return []
    if _JOBS_CATALOG_CACHE["mtime"] == mtime:
        return _JOBS_CATALOG_CACHE["jobs"]
    payload = parse_json(JOBS_CATALOG_PATH.read_text(encoding="utf-8"), {"jobs": []})
    raw_jobs = payload.get("jobs") if isinstance(payload, dict) else payload
    jobs = [normalize_job_item(item) for item in raw_jobs if isinstance(item, dict)] if isinstance(raw_jobs, list) else []
    _JOBS_CATALOG_CACHE["mtime"] = mtime
    _JOBS_CATALOG_CACHE["jobs"] = jobs
    return jobs


def load_jobs_source() -> list[dict]:
    if not JOBS_SOURCE_URL:
        _JOBS_SOURCE_CACHE.update({"status": "disabled", "error": ""})
        return []
    now = time.time()
    if now - float(_JOBS_SOURCE_CACHE.get("fetched_at") or 0) < JOBS_SOURCE_CACHE_SECONDS:
        return list(_JOBS_SOURCE_CACHE.get("jobs") or [])
    headers = {"Accept": "application/json", "User-Agent": "QuantGymAPI/0.1"}
    if JOBS_SOURCE_TOKEN:
        headers["Authorization"] = f"Bearer {JOBS_SOURCE_TOKEN}"
    request = Request(JOBS_SOURCE_URL, headers=headers, method="GET")
    try:
        with urlopen(request, timeout=JOBS_SOURCE_TIMEOUT_SECONDS) as response:
            raw = response.read(JOBS_SOURCE_MAX_BYTES + 1)
        if len(raw) > JOBS_SOURCE_MAX_BYTES:
            raise ValueError("jobs source payload is too large")
        payload = json.loads(raw.decode("utf-8"))
        jobs = [normalize_job_item(item) for item in extract_jobs_payload(payload) if isinstance(item, dict)]
        _JOBS_SOURCE_CACHE.update({
            "fetched_at": now,
            "jobs": jobs,
            "status": "ok",
            "error": "",
        })
        return jobs
    except (HTTPError, URLError, OSError, ValueError, UnicodeDecodeError) as error:
        print(f"[jobs-source] refresh failed: {error}", file=sys.stderr)
        _JOBS_SOURCE_CACHE.update({
            "fetched_at": now,
            "jobs": [],
            "status": "error",
            "error": error.__class__.__name__,
        })
        return []


def merge_jobs_catalog(source_jobs: list[dict], local_jobs: list[dict]) -> list[dict]:
    merged = {}
    order = []
    for job in list(source_jobs or []) + list(local_jobs or []):
        job_id = str(job.get("id") or "")
        if not job_id:
            continue
        if job_id not in merged:
            order.append(job_id)
            merged[job_id] = job
        else:
            merged[job_id] = {**job, **merged[job_id]}
    return [merged[job_id] for job_id in order]


def load_jobs_catalog() -> list[dict]:
    local_jobs = load_local_jobs_catalog()
    source_jobs = load_jobs_source()
    if source_jobs:
        return merge_jobs_catalog(source_jobs, local_jobs)
    return local_jobs


def decode_media_data_url(data_url: str) -> tuple[str, bytes]:
    match = re.fullmatch(r"data:([^;,]+);base64,(.+)", str(data_url or ""), flags=re.DOTALL)
    if not match:
        raise HttpError(400, "Media dataUrl must be a base64 data URL")
    content_type = match.group(1).strip().lower()
    if content_type not in MEDIA_CONTENT_TYPES:
        raise HttpError(415, "Unsupported media type")
    try:
        payload = base64.b64decode(match.group(2), validate=True)
    except ValueError:
        raise HttpError(400, "Invalid media data")
    if not payload:
        raise HttpError(400, "Media file is empty")
    if len(payload) > MEDIA_MAX_BYTES:
        raise HttpError(413, "Media file is too large")
    return content_type, payload


def media_extension(content_type: str, filename: str = "") -> str:
    return MEDIA_CONTENT_TYPES.get(content_type, ".bin")


def media_file_path(storage_path: str) -> Path:
    root = MEDIA_ROOT.resolve()
    path = (MEDIA_ROOT / str(storage_path or "")).resolve()
    if not path_is_relative_to(path, root):
        raise HttpError(403, "Media path is not allowed")
    return path


def media_uses_object_storage() -> bool:
    return MEDIA_STORAGE in {"s3", "r2", "object", "object-storage"}


def media_storage_label(storage_path: str = "") -> str:
    return "s3-media" if str(storage_path or "").startswith("s3:") else "api-media"


def require_media_s3_config() -> None:
    if not (MEDIA_S3_ENDPOINT and MEDIA_S3_BUCKET and MEDIA_S3_ACCESS_KEY_ID and MEDIA_S3_SECRET_ACCESS_KEY):
        raise HttpError(503, "Media object storage is not configured")


def media_s3_key(storage_path: str) -> str:
    raw = str(storage_path or "")
    if raw.startswith("s3:"):
        return raw.removeprefix("s3:").lstrip("/")
    safe_name = Path(raw).name
    return "/".join(part for part in [MEDIA_S3_PREFIX, safe_name] if part)


def media_s3_storage_path(storage_path: str) -> str:
    return f"s3:{media_s3_key(storage_path)}"


def media_s3_url(key: str) -> str:
    require_media_s3_config()
    return f"{MEDIA_S3_ENDPOINT}/{quote(MEDIA_S3_BUCKET, safe='')}/{quote(key, safe='/')}"


def media_public_url(storage_path: str) -> str:
    if not MEDIA_PUBLIC_BASE_URL or not str(storage_path or "").startswith("s3:"):
        return ""
    return f"{MEDIA_PUBLIC_BASE_URL}/{quote(media_s3_key(storage_path), safe='/')}"


def aws_sigv4_headers(method: str, url: str, payload: bytes, content_type: str = "") -> dict:
    require_media_s3_config()
    now = datetime.now(timezone.utc)
    amz_date = now.strftime("%Y%m%dT%H%M%SZ")
    date_stamp = now.strftime("%Y%m%d")
    parsed = urlparse(url)
    payload_hash = hashlib.sha256(payload or b"").hexdigest()
    canonical_headers = (
        f"host:{parsed.netloc}\n"
        f"x-amz-content-sha256:{payload_hash}\n"
        f"x-amz-date:{amz_date}\n"
    )
    signed_headers = "host;x-amz-content-sha256;x-amz-date"
    canonical_request = "\n".join([
        method.upper(),
        parsed.path or "/",
        parsed.query or "",
        canonical_headers,
        signed_headers,
        payload_hash,
    ])
    credential_scope = f"{date_stamp}/{MEDIA_S3_REGION}/s3/aws4_request"
    string_to_sign = "\n".join([
        "AWS4-HMAC-SHA256",
        amz_date,
        credential_scope,
        hashlib.sha256(canonical_request.encode("utf-8")).hexdigest(),
    ])
    signing_key = hmac.new(
        hmac.new(
            hmac.new(
                hmac.new(f"AWS4{MEDIA_S3_SECRET_ACCESS_KEY}".encode("utf-8"), date_stamp.encode("utf-8"), hashlib.sha256).digest(),
                MEDIA_S3_REGION.encode("utf-8"),
                hashlib.sha256,
            ).digest(),
            b"s3",
            hashlib.sha256,
        ).digest(),
        b"aws4_request",
        hashlib.sha256,
    ).digest()
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    headers = {
        "Authorization": (
            "AWS4-HMAC-SHA256 "
            f"Credential={MEDIA_S3_ACCESS_KEY_ID}/{credential_scope}, "
            f"SignedHeaders={signed_headers}, Signature={signature}"
        ),
        "Host": parsed.netloc,
        "X-Amz-Content-Sha256": payload_hash,
        "X-Amz-Date": amz_date,
    }
    if content_type:
        headers["Content-Type"] = content_type
    return headers


def put_s3_media_object(storage_path: str, content_type: str, payload: bytes) -> str:
    key = media_s3_key(storage_path)
    url = media_s3_url(key)
    request = Request(
        url,
        data=payload,
        headers=aws_sigv4_headers("PUT", url, payload, content_type),
        method="PUT",
    )
    try:
        with urlopen(request, timeout=MEDIA_S3_TIMEOUT_SECONDS):
            return media_s3_storage_path(storage_path)
    except (HTTPError, URLError, OSError) as error:
        print(f"[media-s3] upload failed: {error}", file=sys.stderr)
        raise HttpError(502, "Could not store media object")


def read_s3_media_object(storage_path: str) -> bytes:
    key = media_s3_key(storage_path)
    url = media_s3_url(key)
    request = Request(url, headers=aws_sigv4_headers("GET", url, b""), method="GET")
    try:
        with urlopen(request, timeout=MEDIA_S3_TIMEOUT_SECONDS) as response:
            return response.read()
    except HTTPError as error:
        if error.code == 404:
            raise HttpError(404, "Media object not found")
        print(f"[media-s3] read failed: {error}", file=sys.stderr)
        raise HttpError(502, "Could not read media object")
    except (URLError, OSError) as error:
        print(f"[media-s3] read failed: {error}", file=sys.stderr)
        raise HttpError(502, "Could not read media object")


def store_media_payload(storage_path: str, content_type: str, payload: bytes) -> str:
    if media_uses_object_storage():
        return put_s3_media_object(storage_path, content_type, payload)
    if MEDIA_STORAGE not in {"", "local", "disk"}:
        raise HttpError(503, "Unsupported media storage backend")
    file_path = media_file_path(storage_path)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    file_path.write_bytes(payload)
    return storage_path


def resolve_library_asset_path(asset: dict) -> Path:
    raw_path = Path(str(asset.get("path") or ""))
    storage_path = str(asset.get("storagePath") or "").strip()
    asset_id = str(asset.get("id") or "").strip()
    candidates: list[Path] = []
    if storage_path:
        candidates.append(LIBRARY_PDF_ROOT / storage_path)
    if asset_id:
        candidates.append(LIBRARY_PDF_ROOT / f"{asset_id}.pdf")
    if raw_path:
        candidates.append(raw_path if raw_path.is_absolute() else PROJECT_ROOT / raw_path)
        if not raw_path.is_absolute() and LIBRARY_PDF_ROOT.resolve() != PROJECT_ROOT.resolve():
            candidates.append(LIBRARY_PDF_ROOT / raw_path)

    allowed_roots = [PROJECT_ROOT.resolve(), LIBRARY_PDF_ROOT.resolve()]
    saw_disallowed = False
    for candidate in candidates:
        resolved = candidate.resolve()
        if not any(path_is_relative_to(resolved, root) for root in allowed_roots):
            saw_disallowed = True
            continue
        if not resolved.exists() or not resolved.is_file():
            continue
        if resolved.suffix.lower() != ".pdf":
            raise HttpError(403, "Only PDF library assets can be streamed")
        return resolved
    if saw_disallowed and not candidates:
        raise HttpError(403, "Library asset path is not allowed")
    raise HttpError(404, "Library PDF file not found")


def path_is_relative_to(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
        return True
    except ValueError:
        return False


def make_library_reader_token(asset_id: str, user_id: str) -> tuple[str, str]:
    expires_at = int(time.time()) + max(60, LIBRARY_READER_TOKEN_TTL_SECONDS)
    payload = {
        "assetId": str(asset_id),
        "userId": str(user_id),
        "exp": expires_at,
    }
    payload_part = b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signature = hmac.new(
        LIBRARY_TOKEN_SECRET.encode("utf-8"),
        payload_part.encode("ascii"),
        hashlib.sha256,
    ).digest()
    return f"{payload_part}.{b64url_encode(signature)}", datetime.fromtimestamp(expires_at, timezone.utc).isoformat().replace("+00:00", "Z")


def verify_library_reader_token(token: str) -> dict:
    try:
        payload_part, signature_part = str(token or "").split(".", 1)
        expected = hmac.new(
            LIBRARY_TOKEN_SECRET.encode("utf-8"),
            payload_part.encode("ascii"),
            hashlib.sha256,
        ).digest()
        actual = b64url_decode(signature_part)
        if not hmac.compare_digest(expected, actual):
            raise ValueError("bad signature")
        payload = json.loads(b64url_decode(payload_part).decode("utf-8"))
    except Exception:
        raise HttpError(401, "Invalid library reader token")
    if int(payload.get("exp") or 0) < int(time.time()):
        raise HttpError(401, "Library reader token expired")
    return payload


def account_subscription_tier(user: dict) -> str:
    account = parse_json(user.get("account_json") if isinstance(user, dict) else "", {})
    tier = str(account.get("subscriptionTier") or account.get("plan") or "registered")
    return tier if tier in SUBSCRIPTION_TIER_ORDER else "registered"


def ensure_library_access(user: dict, asset: dict) -> None:
    min_tier = str(asset.get("minTier") or "registered")
    user_tier = account_subscription_tier(user)
    if SUBSCRIPTION_TIER_ORDER.get(user_tier, 0) < SUBSCRIPTION_TIER_ORDER.get(min_tier, 0):
        raise HttpError(403, "Your subscription does not include this PDF")


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


def parse_jwt_parts(token: str) -> tuple[dict, dict, str, bytes]:
    try:
        header_part, payload_part, signature_part = str(token or "").split(".")
        header = json.loads(b64url_decode(header_part).decode("utf-8"))
        payload = json.loads(b64url_decode(payload_part).decode("utf-8"))
        signature = b64url_decode(signature_part)
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError, base64.binascii.Error):
        raise HttpError(401, "Invalid Google ID token")
    return header, payload, f"{header_part}.{payload_part}", signature


def parse_cache_control_max_age(value: str | None) -> int | None:
    match = re.search(r"(?:^|,\s*)max-age=(\d+)", str(value or ""), flags=re.IGNORECASE)
    return int(match.group(1)) if match else None


def load_google_jwks(force_refresh: bool = False) -> dict:
    now = time.time()
    with _GOOGLE_JWKS_LOCK:
        if not force_refresh and _GOOGLE_JWKS_CACHE["keys"] and _GOOGLE_JWKS_CACHE["expires_at"] > now:
            return _GOOGLE_JWKS_CACHE["keys"]
        try:
            with urlopen(GOOGLE_JWKS_URL, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
                max_age = parse_cache_control_max_age(response.headers.get("Cache-Control"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError, OSError):
            raise HttpError(503, "Google JWKS verification keys are unavailable")

        keys = {}
        for key in payload.get("keys", []):
            if not isinstance(key, dict):
                continue
            kid = str(key.get("kid") or "")
            if key.get("kty") == "RSA" and kid and key.get("n") and key.get("e"):
                keys[kid] = key
        if not keys:
            raise HttpError(503, "Google JWKS verification keys are unavailable")

        _GOOGLE_JWKS_CACHE["keys"] = keys
        _GOOGLE_JWKS_CACHE["expires_at"] = now + max(60, int(max_age or 3600))
        return keys


def verify_rs256_signature(signing_input: str, signature: bytes, key: dict) -> bool:
    try:
        modulus = int.from_bytes(b64url_decode(str(key["n"])), "big")
        exponent = int.from_bytes(b64url_decode(str(key["e"])), "big")
    except (KeyError, ValueError, base64.binascii.Error):
        return False
    key_size = (modulus.bit_length() + 7) // 8
    if key_size <= 0 or len(signature) != key_size:
        return False

    digest_info = bytes.fromhex("3031300d060960864801650304020105000420") + hashlib.sha256(
        signing_input.encode("ascii")
    ).digest()
    padding_length = key_size - len(digest_info) - 3
    if padding_length < 8:
        return False

    signature_value = int.from_bytes(signature, "big")
    encoded = pow(signature_value, exponent, modulus).to_bytes(key_size, "big")
    expected = b"\x00\x01" + (b"\xff" * padding_length) + b"\x00" + digest_info
    return hmac.compare_digest(encoded, expected)


def validate_google_claims(claims: dict) -> dict:
    issuer = str(claims.get("iss") or "")
    if issuer not in {"accounts.google.com", "https://accounts.google.com"}:
        raise HttpError(401, "Google ID token issuer mismatch")

    audience = claims.get("aud")
    audience_matches = audience == GOOGLE_CLIENT_ID
    if isinstance(audience, list):
        audience_matches = GOOGLE_CLIENT_ID in audience
        if len(audience) > 1 and str(claims.get("azp") or "") != GOOGLE_CLIENT_ID:
            audience_matches = False
    if not audience_matches:
        raise HttpError(401, "Google ID token audience mismatch")

    now_seconds = int(time.time())
    try:
        expires_at = int(claims.get("exp") or 0)
        not_before = int(claims.get("nbf") or 0)
        issued_at = int(claims.get("iat") or 0)
    except (TypeError, ValueError):
        raise HttpError(401, "Google ID token time claims are invalid")
    if expires_at <= 0 or expires_at < now_seconds - GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS:
        raise HttpError(401, "Google ID token is expired")
    if not_before and not_before > now_seconds + GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS:
        raise HttpError(401, "Google ID token is not valid yet")
    if issued_at and issued_at > now_seconds + GOOGLE_ID_TOKEN_CLOCK_SKEW_SECONDS:
        raise HttpError(401, "Google ID token issue time is invalid")

    email = normalize_email(claims.get("email"))
    if not str(claims.get("sub") or "").strip() or not email or not is_true(claims.get("email_verified")):
        raise HttpError(401, "Google account email is not verified")
    ensure_valid_email(email)
    return {**claims, "email": email}


def verify_google_id_token(credential: str) -> dict:
    if not GOOGLE_CLIENT_ID:
        raise HttpError(503, "Google login is not configured on the API")
    if not credential:
        raise HttpError(400, "Google ID token is required")

    header, claims, signing_input, signature = parse_jwt_parts(credential)
    if header.get("alg") != "RS256" or not str(header.get("kid") or ""):
        raise HttpError(401, "Invalid Google ID token")

    kid = str(header["kid"])
    keys = load_google_jwks()
    key = keys.get(kid)
    if not key:
        key = load_google_jwks(force_refresh=True).get(kid)
    if not key or not verify_rs256_signature(signing_input, signature, key):
        raise HttpError(401, "Invalid Google ID token signature")

    return validate_google_claims(claims)


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
    cleaned = {
        **raw,
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
    for key in ("answerEn", "answerZh", "explanationEn", "explanationZh", "hint"):
        if key in raw:
            cleaned[key] = str(raw.get(key) or "").strip()
    return cleaned


def sanitize_problem_state(state: dict | None) -> dict:
    raw = state or {}
    problem_id = str(raw.get("problemId") or raw.get("problem_id") or "").strip()
    if not problem_id:
        raise HttpError(400, "problemId is required")
    next_state = {**raw, "problemId": problem_id}
    next_state["updatedAt"] = str(next_state.get("updatedAt") or utc_now())
    return next_state


def sanitize_leaderboard_skills(skills) -> dict:
    if not isinstance(skills, dict):
        return {}
    cleaned = {}
    for key, value in skills.items():
        try:
            number = max(0, float(value))
        except (TypeError, ValueError):
            continue
        if not math.isfinite(number):
            continue
        cleaned[str(key)] = int(number) if number.is_integer() else number
    return cleaned


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

                CREATE TABLE IF NOT EXISTS media_objects (
                  id TEXT PRIMARY KEY,
                  owner_user_id TEXT NOT NULL,
                  filename TEXT NOT NULL,
                  content_type TEXT NOT NULL,
                  byte_size INTEGER NOT NULL,
                  storage_path TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_media_objects_owner_created
                ON media_objects (owner_user_id, created_at);

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

                CREATE TABLE IF NOT EXISTS audit_events (
                  id TEXT PRIMARY KEY,
                  event_type TEXT NOT NULL,
                  actor_user_id TEXT,
                  email_norm TEXT,
                  ip TEXT,
                  user_agent TEXT,
                  status TEXT NOT NULL,
                  metadata_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  FOREIGN KEY (actor_user_id) REFERENCES users(id) ON DELETE SET NULL
                );

                CREATE INDEX IF NOT EXISTS idx_audit_events_created
                ON audit_events (created_at DESC);

                CREATE INDEX IF NOT EXISTS idx_audit_events_type_created
                ON audit_events (event_type, created_at DESC);

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

                CREATE TABLE IF NOT EXISTS poker_rooms (
                  code TEXT PRIMARY KEY,
                  host_user_id TEXT NOT NULL,
                  room_json TEXT NOT NULL,
                  created_at TEXT NOT NULL,
                  updated_at TEXT NOT NULL,
                  archived_at TEXT
                );

                CREATE INDEX IF NOT EXISTS idx_poker_rooms_host_updated
                ON poker_rooms (host_user_id, updated_at);

                CREATE INDEX IF NOT EXISTS idx_poker_rooms_active_updated
                ON poker_rooms (archived_at, updated_at);
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

    def insert_audit_event(
        self,
        conn: sqlite3.Connection,
        event_type: str,
        *,
        actor_user_id: str | None = None,
        email: str | None = None,
        ip: str = "",
        user_agent: str = "",
        status: str = "success",
        metadata: dict | None = None,
    ) -> dict:
        event = {
            "id": secrets.token_urlsafe(14),
            "eventType": str(event_type or "unknown"),
            "actorUserId": str(actor_user_id or ""),
            "email": normalize_email(email),
            "ip": str(ip or "")[:128],
            "userAgent": str(user_agent or "")[:240],
            "status": str(status or "success"),
            "metadata": sanitize_audit_metadata(metadata),
            "createdAt": utc_now(),
        }
        conn.execute(
            """
            INSERT INTO audit_events
              (id, event_type, actor_user_id, email_norm, ip, user_agent, status, metadata_json, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                event["id"],
                event["eventType"],
                event["actorUserId"] or None,
                event["email"],
                event["ip"],
                event["userAgent"],
                event["status"],
                compact_json(event["metadata"]),
                event["createdAt"],
            ),
        )
        return event

    def record_audit_event(self, *args, **kwargs) -> dict | None:
        with self.connect() as conn:
            return self.insert_audit_event(conn, *args, **kwargs)

    def get_admin_metrics(self, conn: sqlite3.Connection) -> dict:
        now = utc_now()
        since_24h = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat(timespec="seconds").replace("+00:00", "Z")
        user_rows = conn.execute(
            "SELECT provider, COUNT(*) AS count FROM users GROUP BY provider"
        ).fetchall()
        problem_rows = conn.execute(
            "SELECT visibility, COUNT(*) AS count FROM problems GROUP BY visibility"
        ).fetchall()
        audit_rows = conn.execute(
            "SELECT status, COUNT(*) AS count FROM audit_events GROUP BY status"
        ).fetchall()
        auth_rows = conn.execute(
            """
            SELECT event_type, status, COUNT(*) AS count
            FROM audit_events
            WHERE event_type LIKE 'auth.%' AND created_at >= ?
            GROUP BY event_type, status
            """,
            (since_24h,),
        ).fetchall()
        http_error_rows = conn.execute(
            """
            SELECT event_type, status, COUNT(*) AS count
            FROM audit_events
            WHERE event_type LIKE 'http.error.%' AND created_at >= ?
            GROUP BY event_type, status
            """,
            (since_24h,),
        ).fetchall()
        http_error_items = []
        for row in http_error_rows:
            try:
                status_code = int(str(row["event_type"] or "").rsplit(".", 1)[-1])
            except ValueError:
                status_code = 0
            http_error_items.append({
                "statusCode": status_code,
                "status": row["status"],
                "count": int(row["count"]),
            })
        http_error_total = sum(item["count"] for item in http_error_items)
        scalar = lambda query, params=(): int(conn.execute(query, params).fetchone()[0] or 0)
        return {
            "generatedAt": now,
            "users": {
                "total": scalar("SELECT COUNT(*) FROM users"),
                "byProvider": {row["provider"] or "unknown": int(row["count"]) for row in user_rows},
            },
            "sessions": {
                "active": scalar("SELECT COUNT(*) FROM sessions WHERE expires_at > ?", (now,)),
                "expired": scalar("SELECT COUNT(*) FROM sessions WHERE expires_at <= ?", (now,)),
            },
            "problems": {
                "byVisibility": {row["visibility"] or "unknown": int(row["count"]) for row in problem_rows},
                "likes": scalar("SELECT COUNT(*) FROM problem_likes"),
                "comments": scalar("SELECT COUNT(*) FROM problem_comments"),
            },
            "community": {
                "posts": len(self.get_community(conn).get("posts", [])),
            },
            "poker": {
                "rooms": scalar("SELECT COUNT(*) FROM poker_rooms WHERE archived_at IS NULL"),
            },
            "emailVerification": {
                "activeCodes": scalar(
                    "SELECT COUNT(*) FROM email_verification_codes WHERE consumed_at IS NULL AND expires_at > ?",
                    (now,),
                ),
            },
            "audit": {
                "events": scalar("SELECT COUNT(*) FROM audit_events"),
                "byStatus": {row["status"] or "unknown": int(row["count"]) for row in audit_rows},
                "authEvents24h": [
                    {
                        "eventType": row["event_type"],
                        "status": row["status"],
                        "count": int(row["count"]),
                    }
                    for row in auth_rows
                ],
                "httpErrors24h": {
                    "total": http_error_total,
                    "clientErrors": sum(item["count"] for item in http_error_items if 400 <= item["statusCode"] < 500),
                    "serverErrors": sum(item["count"] for item in http_error_items if item["statusCode"] >= 500),
                    "byStatusCode": {
                        str(item["statusCode"]): item["count"]
                        for item in http_error_items
                        if item["statusCode"]
                    },
                    "items": sorted(http_error_items, key=lambda item: item["statusCode"]),
                },
            },
        }

    def get_audit_events(self, conn: sqlite3.Connection, limit: int = 50) -> list[dict]:
        safe_limit = max(1, min(200, int(limit or 50)))
        rows = conn.execute(
            """
            SELECT id, event_type, actor_user_id, email_norm, ip, user_agent, status, metadata_json, created_at
            FROM audit_events
            ORDER BY created_at DESC
            LIMIT ?
            """,
            (safe_limit,),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "eventType": row["event_type"],
                "actorUserId": row["actor_user_id"] or "",
                "email": row["email_norm"] or "",
                "ip": row["ip"] or "",
                "userAgent": row["user_agent"] or "",
                "status": row["status"],
                "metadata": parse_json(row["metadata_json"], {}),
                "createdAt": row["created_at"],
            }
            for row in rows
        ]

    def save_media_object(
        self,
        conn: sqlite3.Connection,
        *,
        media_id: str,
        owner_user_id: str,
        filename: str,
        content_type: str,
        byte_size: int,
        storage_path: str,
    ) -> dict:
        created_at = utc_now()
        conn.execute(
            """
            INSERT INTO media_objects
              (id, owner_user_id, filename, content_type, byte_size, storage_path, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (media_id, owner_user_id, filename, content_type, int(byte_size), storage_path, created_at),
        )
        return {
            "id": media_id,
            "ownerUserId": owner_user_id,
            "filename": filename,
            "contentType": content_type,
            "byteSize": int(byte_size),
            "storagePath": storage_path,
            "createdAt": created_at,
        }

    def get_media_object(self, conn: sqlite3.Connection, media_id: str) -> dict | None:
        row = conn.execute(
            """
            SELECT id, owner_user_id, filename, content_type, byte_size, storage_path, created_at
            FROM media_objects
            WHERE id = ?
            """,
            (media_id,),
        ).fetchone()
        if not row:
            return None
        return {
            "id": row["id"],
            "ownerUserId": row["owner_user_id"],
            "filename": row["filename"],
            "contentType": row["content_type"],
            "byteSize": int(row["byte_size"] or 0),
            "storagePath": row["storage_path"],
            "createdAt": row["created_at"],
        }

    def get_state(self, conn: sqlite3.Connection, user_id: str) -> dict:
        row = conn.execute("SELECT state_json FROM user_states WHERE user_id = ?", (user_id,)).fetchone()
        return parse_json(row["state_json"], {}) if row else {}

    def get_leaderboard(self, conn: sqlite3.Connection) -> list[dict]:
        rows = conn.execute(
            """
            SELECT
              u.id AS user_id,
              u.account_json,
              u.created_at AS user_created_at,
              u.updated_at AS user_updated_at,
              s.state_json,
              s.updated_at AS state_updated_at
            FROM users u
            LEFT JOIN user_states s ON s.user_id = u.id
            ORDER BY COALESCE(s.updated_at, u.updated_at) DESC
            LIMIT 500
            """
        ).fetchall()
        leaderboard = []
        for row in rows:
            account = sanitize_account(parse_json(row["account_json"], {}), row["user_id"])
            state = parse_json(row["state_json"], {})
            leaderboard.append(
                {
                    "id": row["user_id"],
                    "name": account.get("name") or "Quant",
                    "country": account.get("country") or "china",
                    "region": account.get("region") or "",
                    "picture": account.get("picture") or "",
                    "skills": sanitize_leaderboard_skills(state.get("skills") if isinstance(state, dict) else {}),
                    "updatedAt": row["state_updated_at"] or row["user_updated_at"] or row["user_created_at"],
                }
            )
        return leaderboard

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
            previous_created_at = previous["created_at"] if previous else ""
            created_at = previous_created_at if is_valid_timestamp(previous_created_at) else problem["createdAt"]
            if not is_valid_timestamp(created_at):
                created_at = utc_now()
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

    def save_poker_room(self, room: dict) -> None:
        if not isinstance(room, dict):
            return
        code = str(room.get("code") or room.get("state", {}).get("roomCode") or "").strip()
        if not code:
            return
        now = utc_now()
        created_at = str(room.get("createdAt") or now)
        updated_at = str(room.get("updatedAt") or room.get("state", {}).get("updatedAt") or now)
        host_user_id = str(room.get("hostUserId") or room.get("state", {}).get("hostUserId") or "")
        with self.connect() as conn:
            conn.execute(
                """
                INSERT INTO poker_rooms (code, host_user_id, room_json, created_at, updated_at, archived_at)
                VALUES (?, ?, ?, ?, ?, NULL)
                ON CONFLICT(code) DO UPDATE SET
                  host_user_id = excluded.host_user_id,
                  room_json = excluded.room_json,
                  updated_at = excluded.updated_at,
                  archived_at = NULL
                """,
                (code, host_user_id, compact_json(room), created_at, updated_at),
            )

    def load_poker_room(self, code: str) -> dict | None:
        room_code = str(code or "").strip()
        if not room_code:
            return None
        with self.connect() as conn:
            row = conn.execute(
                """
                SELECT room_json
                FROM poker_rooms
                WHERE code = ? AND archived_at IS NULL
                """,
                (room_code,),
            ).fetchone()
            return parse_json(row["room_json"], None) if row else None

    def load_poker_rooms(self, limit: int = 300) -> list[dict]:
        with self.connect() as conn:
            rows = conn.execute(
                """
                SELECT room_json
                FROM poker_rooms
                WHERE archived_at IS NULL
                ORDER BY updated_at DESC
                LIMIT ?
                """,
                (max(1, int(limit)),),
            ).fetchall()
            return [room for room in (parse_json(row["room_json"], None) for row in rows) if isinstance(room, dict)]


db = Database(DB_PATH)
IMPORTED_CATALOG_COUNT = db.import_problem_catalog(PROBLEM_CATALOG_PATH)


def user_display_name(user: dict) -> str:
    account = parse_json(user.get("account_json") if isinstance(user, dict) else "", {})
    return str(account.get("name") or account.get("email") or user.get("email_norm") or "Player").strip()[:40] or "Player"


class PokerWsClient:
    def __init__(self, handler: "QuantGymHandler", user: dict, room_code: str):
        self.handler = handler
        self.user = user
        self.user_id = user["id"]
        self.room_code = room_code
        self.lock = threading.Lock()
        self.alive = True

    def send_json(self, payload: dict) -> bool:
        if not self.alive:
            return False
        try:
            raw = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
            frame = build_ws_frame(0x1, raw)
            with self.lock:
                self.handler.wfile.write(frame)
                self.handler.wfile.flush()
            return True
        except (BrokenPipeError, ConnectionResetError, OSError):
            self.alive = False
            return False

    def send_pong(self, payload: bytes = b"") -> bool:
        try:
            with self.lock:
                self.handler.wfile.write(build_ws_frame(0xA, payload))
                self.handler.wfile.flush()
            return True
        except (BrokenPipeError, ConnectionResetError, OSError):
            self.alive = False
            return False


class PokerRoomHub:
    def __init__(self):
        self.lock = threading.RLock()
        self.rooms: dict[str, dict] = {}
        self.clients: dict[str, set[PokerWsClient]] = {}
        self.load_persisted_rooms()

    def room_code(self, room_code: str | None = None) -> str:
        return POKER_SINGLE_TABLE_CODE

    def list_rooms_for_user(self, user: dict) -> list[dict]:
        with self.lock:
            self.load_persisted_rooms()
            rows = []
            for room in self.rooms.values():
                if room.get("code") != self.room_code():
                    continue
                rows.append({**poker_room_summary(room["state"]), "revision": room.get("revision", 0)})
            rows.sort(key=lambda item: item.get("updatedAt") or "", reverse=True)
            return rows

    def create_room(self, user: dict, data: dict | None = None) -> dict:
        payload = data if isinstance(data, dict) else {}
        with self.lock:
            room_code = self.room_code()
            existing = self.rooms.get(room_code) or self.hydrate_room(db.load_poker_room(room_code))
            if existing:
                self.rooms[room_code] = existing
                return self.join_room(room_code, user, payload)
            state = poker_create_room_state(
                user["id"],
                str(payload.get("playerName") or user_display_name(user)),
                room_code=room_code,
                settings=payload.get("settings") if isinstance(payload.get("settings"), dict) else None,
            )
            room = {
                "code": room_code,
                "hostUserId": user["id"],
                "createdAt": utc_now(),
                "updatedAt": utc_now(),
                "revision": 1,
                "state": state,
                "participants": {
                    user["id"]: {
                        "userId": user["id"],
                        "name": user_display_name(user),
                        "joinedAt": utc_now(),
                        "lastSeenAt": utc_now(),
                    }
                },
            }
            self.rooms[room_code] = room
            self.persist_room(room)
            return self.room_payload(room_code, user["id"])

    def ensure_room(self, room_code: str) -> dict:
        code = self.room_code(room_code)
        room = self.rooms.get(code)
        if not room:
            room = self.hydrate_room(db.load_poker_room(code))
            if room:
                self.rooms[code] = room
        if not room:
            raise HttpError(404, "Poker room not found")
        return room

    def get_room(self, room_code: str, user: dict) -> dict:
        with self.lock:
            room = self.ensure_room(room_code)
            self.touch_participant(room, user)
            changed = self.ensure_viewer(room, user)
            self.mark_player_connected(room, user["id"], True)
            if changed:
                self.bump(room)
            else:
                self.persist_room(room)
            return self.room_payload(room["code"], user["id"])

    def join_room(self, room_code: str, user: dict, data: dict | None = None) -> dict:
        payload = data if isinstance(data, dict) else {}
        changed = False
        with self.lock:
            try:
                room = self.ensure_room(room_code)
            except HttpError as error:
                if error.status != 404 or self.room_code(room_code) != self.room_code():
                    raise
                return self.create_room(user, payload)
            before_players = len(room["state"].get("players", []))
            self.touch_participant(room, user, str(payload.get("playerName") or user_display_name(user)))
            try:
                poker_add_player(
                    room["state"],
                    user["id"],
                    str(payload.get("playerName") or user_display_name(user)),
                    seat=payload.get("seat") if isinstance(payload.get("seat"), int) else None,
                )
                changed = True
            except PokerError as error:
                if error.status != 409:
                    raise HttpError(error.status, error.message)
                changed = self.add_spectator(room, user, str(payload.get("playerName") or user_display_name(user)), announce=True)
            if changed or before_players != len(room["state"].get("players", [])):
                self.bump(room)
            else:
                self.persist_room(room)
            payload = self.room_payload(room["code"], user["id"])
        if changed:
            self.broadcast(room_code)
        return payload

    def apply(self, room_code: str, user: dict, command: str, payload: dict | None = None) -> dict:
        with self.lock:
            room = self.ensure_room(room_code)
            self.touch_participant(room, user)
            try:
                poker_apply_command(room["state"], user["id"], command, payload or {})
            except PokerError as error:
                raise HttpError(error.status, error.message)
            self.bump(room)
            result = self.room_payload(room["code"], user["id"])
        self.broadcast(room_code)
        return result

    def add_client(self, client: PokerWsClient) -> dict:
        with self.lock:
            room = self.ensure_room(client.room_code)
            client.room_code = room["code"]
            self.touch_participant(room, client.user)
            self.ensure_viewer(room, client.user)
            self.mark_player_connected(room, client.user_id, True)
            self.clients.setdefault(room["code"], set()).add(client)
            self.bump(room)
            return self.room_payload(room["code"], client.user_id)

    def remove_client(self, client: PokerWsClient) -> None:
        client.alive = False
        with self.lock:
            room_clients = self.clients.get(client.room_code)
            if room_clients and client in room_clients:
                room_clients.remove(client)
            room = self.rooms.get(client.room_code)
            if room:
                poker_mark_disconnected(room["state"], client.user_id)
                self.bump(room)

    def broadcast(self, room_code: str) -> None:
        code = self.room_code(room_code)
        with self.lock:
            room = self.rooms.get(code)
            clients = list(self.clients.get(code, set()))
        stale = []
        for client in clients:
            try:
                payload = {"type": "room", "room": self.room_payload(code, client.user_id)}
            except HttpError:
                continue
            if not client.send_json(payload):
                stale.append(client)
        for client in stale:
            self.remove_client(client)

    def touch_participant(self, room: dict, user: dict, name: str | None = None) -> None:
        room.setdefault("participants", {})[user["id"]] = {
            **room.setdefault("participants", {}).get(user["id"], {}),
            "userId": user["id"],
            "name": str(name or user_display_name(user)),
            "lastSeenAt": utc_now(),
            "joinedAt": room.setdefault("participants", {}).get(user["id"], {}).get("joinedAt") or utc_now(),
        }

    def ensure_viewer(self, room: dict, user: dict) -> bool:
        if any(player.get("userId") == user["id"] for player in room.get("state", {}).get("players", [])):
            return False
        return self.add_spectator(room, user, user_display_name(user), announce=False)

    def add_spectator(self, room: dict, user: dict, name: str, announce: bool = False) -> bool:
        before = compact_json(room.get("state", {}).get("spectators", []))
        try:
            poker_add_spectator(room["state"], user["id"], name, announce=announce)
        except PokerError as error:
            raise HttpError(error.status, error.message)
        after = compact_json(room.get("state", {}).get("spectators", []))
        room.setdefault("participants", {}).setdefault(user["id"], {
            "userId": user["id"],
            "name": name,
            "joinedAt": utc_now(),
        })
        room["participants"][user["id"]]["role"] = "spectator"
        room["participants"][user["id"]]["lastSeenAt"] = utc_now()
        return before != after

    def bump(self, room: dict) -> None:
        room["revision"] = int(room.get("revision") or 0) + 1
        room["updatedAt"] = utc_now()
        room["state"]["updatedAt"] = room["updatedAt"]
        self.persist_room(room)

    def room_payload(self, room_code: str, user_id: str) -> dict:
        room = self.ensure_room(room_code)
        is_seated = any(player.get("userId") == user_id for player in room.get("state", {}).get("players", []))
        if not is_seated and room.get("state", {}).get("settings", {}).get("allowSpectators") is False:
            raise HttpError(403, "Spectators are not allowed at this table")
        return {
            "code": room["code"],
            "revision": room.get("revision", 0),
            "createdAt": room.get("createdAt"),
            "updatedAt": room.get("updatedAt"),
            "summary": poker_room_summary(room["state"]),
            "participant": room.get("participants", {}).get(user_id, {"userId": user_id}),
            "state": poker_redact_state(room["state"], user_id),
        }

    def persist_room(self, room: dict) -> None:
        db.save_poker_room(self.hydrate_room(room))

    def load_persisted_rooms(self) -> None:
        for room in db.load_poker_rooms():
            hydrated = self.hydrate_room(room)
            if not hydrated:
                continue
            code = hydrated["code"]
            if code != self.room_code():
                continue
            if code not in self.rooms:
                self.rooms[code] = hydrated

    def hydrate_room(self, room: dict | None) -> dict | None:
        if not isinstance(room, dict):
            return None
        state = room.get("state") if isinstance(room.get("state"), dict) else {}
        code = self.room_code(room.get("code") or state.get("roomCode") or "")
        if not code:
            return None
        now = utc_now()
        state["roomCode"] = code
        state["online"] = True
        state.setdefault("players", [])
        state.setdefault("participants", [])
        state.setdefault("chat", [])
        state.setdefault("handHistory", [])
        state.setdefault("ledger", [])
        state.setdefault("log", [])
        state.setdefault("spectators", [])
        state.setdefault("settings", {})
        hydrated = {
            "code": code,
            "hostUserId": str(room.get("hostUserId") or state.get("hostUserId") or ""),
            "createdAt": str(room.get("createdAt") or state.get("createdAt") or now),
            "updatedAt": str(room.get("updatedAt") or state.get("updatedAt") or now),
            "revision": int(room.get("revision") or 1),
            "state": state,
            "participants": room.get("participants") if isinstance(room.get("participants"), dict) else {},
        }
        hydrated["state"]["hostUserId"] = hydrated["hostUserId"]
        if not hydrated["participants"]:
            for player in hydrated["state"].get("players", []):
                user_id = str(player.get("userId") or "")
                if user_id:
                    hydrated["participants"][user_id] = {
                        "userId": user_id,
                        "name": str(player.get("name") or "Player"),
                        "joinedAt": hydrated["createdAt"],
                        "lastSeenAt": hydrated["updatedAt"],
                    }
        return hydrated

    def mark_player_connected(self, room: dict, user_id: str, connected: bool) -> None:
        for player in room.get("state", {}).get("players", []):
            if player.get("userId") == user_id:
                player["connected"] = connected
        for spectator in room.get("state", {}).get("spectators", []):
            if spectator.get("userId") == user_id:
                spectator["connected"] = connected


poker_hub = PokerRoomHub()


def build_ws_frame(opcode: int, payload: bytes = b"") -> bytes:
    length = len(payload)
    first = 0x80 | (opcode & 0x0F)
    if length < 126:
        header = bytes([first, length])
    elif length < 65536:
        header = bytes([first, 126]) + struct.pack("!H", length)
    else:
        header = bytes([first, 127]) + struct.pack("!Q", length)
    return header + payload


def read_ws_frame(stream) -> tuple[int, bytes] | None:
    header = stream.read(2)
    if len(header) < 2:
        return None
    first, second = header[0], header[1]
    opcode = first & 0x0F
    masked = bool(second & 0x80)
    length = second & 0x7F
    if length == 126:
        raw = stream.read(2)
        if len(raw) < 2:
            return None
        length = struct.unpack("!H", raw)[0]
    elif length == 127:
        raw = stream.read(8)
        if len(raw) < 8:
            return None
        length = struct.unpack("!Q", raw)[0]
    if length > POKER_WS_MAX_MESSAGE_BYTES:
        raise HttpError(1009, "Poker WebSocket message is too large")
    mask = stream.read(4) if masked else b""
    payload = stream.read(length) if length else b""
    if len(payload) < length:
        return None
    if masked:
        payload = bytes(byte ^ mask[index % 4] for index, byte in enumerate(payload))
    return opcode, payload


class QuantGymHandler(BaseHTTPRequestHandler):
    server_version = "QuantGymAPI/0.1"
    protocol_version = "HTTP/1.1"

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - - [%s] %s\n" % (self.client_address[0], self.log_date_time_string(), fmt % args))

    def end_headers(self):
        origin = self.headers.get("Origin")
        if ALLOWED_ORIGINS == ["*"]:
            self.send_header("Access-Control-Allow-Origin", "*")
        elif origin and origin in ALLOWED_ORIGINS:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, Range")
        self.send_header("Access-Control-Expose-Headers", "Accept-Ranges, Content-Range, Content-Length")
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
            if path == "/api/auth/account-status" and self.command == "GET":
                return self.get_account_status()
            if path == "/api/auth/register" and self.command == "POST":
                return self.register()
            if path == "/api/auth/login" and self.command == "POST":
                return self.login()
            if path == "/api/auth/reset-password" and self.command == "POST":
                return self.reset_password()
            if path == "/api/auth/google" and self.command == "POST":
                return self.google_login()
            if path == "/api/account" and self.command == "GET":
                return self.get_account()
            if path == "/api/account" and self.command == "PATCH":
                return self.patch_account()
            if path == "/api/admin/metrics" and self.command == "GET":
                return self.get_admin_metrics()
            if path == "/api/admin/audit-events" and self.command == "GET":
                return self.get_admin_audit_events()
            if path == "/api/media" and self.command == "POST":
                return self.post_media()
            media_match = re.fullmatch(r"/api/media/([^/]+)", path)
            if media_match and self.command == "GET":
                return self.get_media(unquote(media_match.group(1)))
            if path == "/api/leaderboard" and self.command == "GET":
                return self.get_leaderboard()
            if path == "/api/state" and self.command == "GET":
                return self.get_state()
            if path == "/api/state" and self.command == "PUT":
                return self.put_state()
            if path == "/api/problems" and self.command == "GET":
                return self.get_problems()
            if path == "/api/problems" and self.command == "PUT":
                return self.put_problems()
            if path == "/api/jobs" and self.command in {"GET", "POST"}:
                return self.get_jobs()
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
            if path == "/api/poker/rooms" and self.command == "GET":
                return self.list_poker_rooms()
            if path == "/api/poker/rooms" and self.command == "POST":
                return self.create_poker_room()
            poker_room_match = re.fullmatch(r"/api/poker/rooms/([^/]+)", path)
            if poker_room_match and self.command == "GET":
                return self.get_poker_room(unquote(poker_room_match.group(1)))
            poker_join_match = re.fullmatch(r"/api/poker/rooms/([^/]+)/join", path)
            if poker_join_match and self.command == "POST":
                return self.join_poker_room(unquote(poker_join_match.group(1)))
            poker_command_match = re.fullmatch(r"/api/poker/rooms/([^/]+)/commands", path)
            if poker_command_match and self.command == "POST":
                return self.send_poker_command(unquote(poker_command_match.group(1)))
            poker_ws_match = re.fullmatch(r"/api/poker/ws/([^/]+)", path)
            if poker_ws_match and self.command == "GET":
                return self.handle_poker_ws(unquote(poker_ws_match.group(1)))
            library_token_match = re.fullmatch(r"/api/library/reader-token/([^/]+)", path)
            if library_token_match and self.command == "POST":
                return self.issue_library_reader_token(unquote(library_token_match.group(1)))
            library_pdf_match = re.fullmatch(r"/api/library/pdfs/([^/]+)", path)
            if library_pdf_match and self.command == "GET":
                return self.serve_library_pdf(unquote(library_pdf_match.group(1)))
            self.record_http_error(404, "Not found")
            return self.send_json(404, {"error": "Not found"})
        except HttpError as error:
            self.record_http_error(error.status, error.message)
            return self.send_json(error.status, {"error": error.message})
        except Exception as error:  # pragma: no cover - defensive server boundary
            self.log_message("Unhandled error: %s", error)
            self.record_http_error(500, "Internal server error", error=error)
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

    def client_rate_key(self) -> str:
        peer_ip = self.client_address[0]
        if peer_is_trusted_proxy(peer_ip):
            forwarded_ip = forwarded_client_ip(self.headers)
            if forwarded_ip:
                return forwarded_ip
        return normalize_ip_literal(peer_ip) or peer_ip

    def enforce_rate_limit(self, scope: str, max_requests: int, identity: str | None = None) -> None:
        rate_limiter.check(f"{scope}:ip", self.client_rate_key(), max_requests, RATE_LIMIT_WINDOW_SECONDS)
        if identity:
            rate_limiter.check(f"{scope}:identity", identity, max_requests, RATE_LIMIT_WINDOW_SECONDS)

    def audit_event(
        self,
        event_type: str,
        *,
        user: dict | None = None,
        email: str | None = None,
        status: str = "success",
        metadata: dict | None = None,
        conn: sqlite3.Connection | None = None,
    ) -> None:
        actor_id = user.get("id") if isinstance(user, dict) else None
        email_value = email or (user.get("email_norm") if isinstance(user, dict) else "")
        try:
            if conn is not None:
                db.insert_audit_event(
                    conn,
                    event_type,
                    actor_user_id=actor_id,
                    email=email_value,
                    ip=self.client_rate_key(),
                    user_agent=self.headers.get("User-Agent", ""),
                    status=status,
                    metadata=metadata,
                )
            else:
                db.record_audit_event(
                    event_type,
                    actor_user_id=actor_id,
                    email=email_value,
                    ip=self.client_rate_key(),
                    user_agent=self.headers.get("User-Agent", ""),
                    status=status,
                    metadata=metadata,
                )
        except Exception as error:  # pragma: no cover - audit must not break auth paths
            self.log_message("Audit log failed: %s", error)

    def record_http_error(self, status_code: int, message: str = "", *, error: Exception | None = None) -> None:
        try:
            status = int(status_code)
        except (TypeError, ValueError):
            status = 500
        if status < 400:
            return
        path = urlparse(self.path).path or "/"
        metadata = {
            "method": self.command,
            "path": path[:240],
            "statusCode": status,
            "message": str(message or "")[:180],
        }
        if error is not None:
            metadata["errorClass"] = error.__class__.__name__
        self.audit_event(
            f"http.error.{status}",
            status="error" if status >= 500 else "fail",
            metadata=metadata,
        )
        if ALERT_WEBHOOK_URL and status >= ALERT_MIN_STATUS_CODE:
            alert_message = sanitize_alert_message(status, metadata["path"], metadata["message"])
            payload = {
                "service": "quantgym-api",
                "eventType": f"http.error.{status}",
                "status": "error" if status >= 500 else "fail",
                "statusCode": status,
                "method": metadata["method"],
                "path": metadata["path"],
                "message": alert_message,
                "occurredAt": utc_now(),
            }
            if "errorClass" in metadata:
                payload["errorClass"] = metadata["errorClass"]
            threading.Thread(target=send_alert_webhook, args=(payload,), daemon=True).start()

    def send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        if status >= 400:
            self.close_connection = True
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        if self.close_connection:
            self.send_header("Connection", "close")
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

    def require_admin_user(self) -> dict:
        user = self.require_user()
        email = normalize_email(user.get("email_norm"))
        if email in ADMIN_EMAILS or account_subscription_tier(user) == "admin":
            return user
        raise HttpError(403, "Admin access is required")

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

    def get_admin_metrics(self):
        user = self.require_admin_user()
        with db.connect() as conn:
            metrics = db.get_admin_metrics(conn)
            self.audit_event("admin.metrics.view", user=user, metadata={"endpoint": "/api/admin/metrics"}, conn=conn)
            self.send_json(200, {"metrics": metrics})

    def get_admin_audit_events(self):
        user = self.require_admin_user()
        query = parse_qs(urlparse(self.path).query)
        try:
            limit = int((query.get("limit") or ["50"])[0])
        except ValueError:
            raise HttpError(400, "Invalid audit event limit")
        with db.connect() as conn:
            events = db.get_audit_events(conn, limit)
            self.audit_event(
                "admin.audit_events.view",
                user=user,
                metadata={"endpoint": "/api/admin/audit-events", "limit": max(1, min(200, limit))},
                conn=conn,
            )
            self.send_json(200, {"events": events})

    def absolute_api_url(self, path: str) -> str:
        if PUBLIC_API_BASE_URL:
            return f"{PUBLIC_API_BASE_URL}{path}"
        trusted_proxy = peer_is_trusted_proxy(self.client_address[0])
        proto = forwarded_request_proto(self.headers) if trusted_proxy else ""
        host = clean_host_header(first_header_value(self.headers, "X-Forwarded-Host")) if trusted_proxy else ""
        if not host:
            configured_host = HOST if HOST not in {"", "0.0.0.0", "::"} else "127.0.0.1"
            host = clean_host_header(f"{configured_host}:{PORT}") or f"127.0.0.1:{PORT}"
        if not proto:
            proto = "http"
        return f"{proto}://{host}{path}"

    def post_media(self):
        user = self.require_user()
        data = self.read_json()
        content_type, payload = decode_media_data_url(str(data.get("dataUrl") or ""))
        original_name = str(data.get("name") or "upload").strip()[:180] or "upload"
        media_id = secrets.token_urlsafe(18)
        extension = media_extension(content_type, original_name)
        storage_path = f"{media_id}{extension}"
        stored_path = store_media_payload(storage_path, content_type, payload)
        with db.connect() as conn:
            media = db.save_media_object(
                conn,
                media_id=media_id,
                owner_user_id=user["id"],
                filename=original_name,
                content_type=content_type,
                byte_size=len(payload),
                storage_path=stored_path,
            )
            self.audit_event(
                "media.upload",
                user=user,
                metadata={
                    "mediaId": media_id,
                    "contentType": content_type,
                    "byteSize": len(payload),
                    "context": str(data.get("context") or "")[:80],
                    "storage": media_storage_label(stored_path),
                },
                conn=conn,
            )
        path = f"/api/media/{quote(media_id)}"
        media_url = media_public_url(media["storagePath"]) or self.absolute_api_url(path)
        media_type = (
            "video" if content_type.startswith("video/")
            else "image" if content_type.startswith("image/")
            else "file"
        )
        self.send_json(201, {
            "media": {
                "id": media["id"],
                "url": media_url,
                "path": path,
                "dataUrl": media_url,
                "type": media_type,
                "name": media["filename"],
                "contentType": media["contentType"],
                "byteSize": media["byteSize"],
                "createdAt": media["createdAt"],
                "storage": media_storage_label(media["storagePath"]),
            }
        })

    def get_media(self, media_id: str):
        if not media_id:
            raise HttpError(400, "Media id is required")
        with db.connect() as conn:
            media = db.get_media_object(conn, media_id)
        if not media:
            raise HttpError(404, "Media not found")
        public_url = media_public_url(media["storagePath"])
        if public_url:
            self.send_response(302)
            self.send_header("Location", public_url)
            self.send_header("Cache-Control", "public, max-age=86400")
            self.send_header("Content-Length", "0")
            self.end_headers()
            return
        if str(media["storagePath"] or "").startswith("s3:"):
            body = read_s3_media_object(media["storagePath"])
        else:
            file_path = media_file_path(media["storagePath"])
            if not file_path.exists() or not file_path.is_file():
                raise HttpError(404, "Media file not found")
            body = file_path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", media["contentType"])
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "public, max-age=86400")
        self.send_header("Content-Disposition", f"inline; filename*=UTF-8''{quote(media['filename'])}")
        self.end_headers()
        self.wfile.write(body)

    def issue_library_reader_token(self, asset_id: str):
        user = self.require_user()
        asset = get_library_asset(asset_id)
        ensure_library_access(user, asset)
        token, expires_at = make_library_reader_token(asset["id"], user["id"])
        path = f"/api/library/pdfs/{quote(asset['id'])}?token={quote(token)}"
        self.send_json(200, {
            "assetId": asset["id"],
            "url": self.absolute_api_url(path),
            "path": path,
            "expiresAt": expires_at,
            "minTier": asset.get("minTier") or "registered",
        })

    def serve_library_pdf(self, asset_id: str):
        query = parse_qs(urlparse(self.path).query)
        token = query.get("token", [""])[0]
        payload = verify_library_reader_token(token)
        if str(payload.get("assetId") or "") != str(asset_id):
            raise HttpError(403, "Library reader token does not match this asset")
        asset = get_library_asset(asset_id)
        file_path = resolve_library_asset_path(asset)
        file_size = file_path.stat().st_size
        start = 0
        end = file_size - 1
        status = 200

        range_header = self.headers.get("Range", "").strip()
        if range_header:
            match = re.fullmatch(r"bytes=(\d*)-(\d*)", range_header)
            if not match:
                raise HttpError(416, "Invalid range")
            start_raw, end_raw = match.groups()
            if start_raw == "" and end_raw == "":
                raise HttpError(416, "Invalid range")
            if start_raw == "":
                suffix = int(end_raw)
                if suffix <= 0:
                    raise HttpError(416, "Invalid range")
                start = max(0, file_size - suffix)
            else:
                start = int(start_raw)
            if end_raw:
                end = min(file_size - 1, int(end_raw))
            if start > end or start >= file_size:
                self.send_response(416)
                self.send_header("Content-Range", f"bytes */{file_size}")
                self.end_headers()
                return
            status = 206

        length = end - start + 1
        filename = file_path.name
        self.send_response(status)
        self.send_header("Content-Type", asset.get("contentType") or "application/pdf")
        self.send_header("Content-Length", str(length))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Cache-Control", "private, max-age=300")
        self.send_header("Content-Disposition", f"inline; filename*=UTF-8''{quote(filename)}")
        if status == 206:
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
        self.end_headers()

        with file_path.open("rb") as file:
            file.seek(start)
            remaining = length
            while remaining > 0:
                chunk = file.read(min(1024 * 1024, remaining))
                if not chunk:
                    break
                self.wfile.write(chunk)
                remaining -= len(chunk)

    def send_verification_code(self):
        data = self.read_json()
        email = normalize_email(data.get("email"))
        purpose = str(data.get("purpose") or "register").strip().lower()
        if purpose not in EMAIL_VERIFICATION_PURPOSES:
            raise HttpError(400, "Unsupported verification purpose")
        ensure_valid_email(email)
        ensure_email_allowed(email)
        self.enforce_rate_limit("auth:verification-code", AUTH_VERIFICATION_RATE_LIMIT_MAX, email)

        with db.connect() as conn:
            existing = conn.execute("SELECT id, provider FROM users WHERE email_norm = ?", (email,)).fetchone()
            if purpose == "register" and existing:
                raise HttpError(409, "Email already exists")
            if purpose == "password_reset":
                if not existing:
                    raise HttpError(404, "No local account exists for this email")
                if existing["provider"] != "local":
                    raise HttpError(400, "Only local email accounts can reset password")

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
            self.audit_event(
                "auth.verification_code.sent",
                email=email,
                metadata={"purpose": purpose, "delivery": delivery},
                conn=conn,
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

    def get_account_status(self):
        query = parse_qs(urlparse(self.path).query)
        email = normalize_email((query.get("email") or [""])[0])
        if not email:
            raise HttpError(400, "Email is required")
        ensure_valid_email(email)
        ensure_email_allowed(email)
        with db.connect() as conn:
            user = conn.execute(
                "SELECT provider FROM users WHERE email_norm = ?",
                (email,),
            ).fetchone()
        self.send_json(200, {
            "email": email,
            "exists": bool(user),
            "provider": user["provider"] if user else "",
        })

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
            conn.commit()
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
        self.enforce_rate_limit("auth:register", AUTH_REGISTER_RATE_LIMIT_MAX, email)

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
            self.audit_event("auth.register", user=dict(user), status="success", metadata={"provider": "local"}, conn=conn)
            self.send_json(201, self.auth_response(conn, dict(user), token))

    def login(self):
        data = self.read_json()
        email = normalize_email(data.get("email"))
        password = str(data.get("password") or "")
        if not email or not password:
            raise HttpError(400, "Email and password are required")
        ensure_valid_email(email)
        ensure_email_allowed(email)
        self.enforce_rate_limit("auth:login", AUTH_LOGIN_RATE_LIMIT_MAX, email)
        with db.connect() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE provider = 'local' AND email_norm = ?",
                (email,),
            ).fetchone()
            if not user:
                self.audit_event("auth.login", email=email, status="fail", metadata={"reason": "not_found"})
                raise HttpError(401, "Invalid email or password")
            user_dict = dict(user)
            if not verify_password(email, password, user_dict["password_salt"], user_dict["password_hash"]):
                self.audit_event("auth.login", user=user_dict, status="fail", metadata={"reason": "bad_password"})
                raise HttpError(401, "Invalid email or password")
            token = db.create_session(conn, user_dict["id"])
            self.audit_event("auth.login", user=user_dict, status="success", metadata={"provider": "local"}, conn=conn)
            self.send_json(200, self.auth_response(conn, user_dict, token))

    def reset_password(self):
        data = self.read_json()
        email = normalize_email(data.get("email"))
        password = str(data.get("password") or "")
        verification_code = str(data.get("verificationCode") or "")
        if not email or not password:
            raise HttpError(400, "Email and password are required")
        ensure_valid_email(email)
        ensure_email_allowed(email)
        if len(password) < 6:
            raise HttpError(400, "Password must be at least 6 characters")
        self.enforce_rate_limit("auth:password-reset", AUTH_PASSWORD_RESET_RATE_LIMIT_MAX, email)

        salt_hex, password_hash = make_password_hash(email, password)
        now = utc_now()
        with db.connect() as conn:
            user = conn.execute(
                "SELECT * FROM users WHERE provider = 'local' AND email_norm = ?",
                (email,),
            ).fetchone()
            if not user:
                self.audit_event("auth.password_reset", email=email, status="fail", metadata={"reason": "not_found"})
                raise HttpError(404, "No local account exists for this email")
            self.consume_verification_code(conn, email, "password_reset", verification_code)
            user_dict = dict(user)
            account = sanitize_account(parse_json(user_dict["account_json"], {}), user_dict["id"])
            account["email"] = email
            account["provider"] = "local"
            account["updatedAt"] = now
            conn.execute(
                """
                UPDATE users
                SET password_salt = ?, password_hash = ?, account_json = ?, updated_at = ?
                WHERE id = ?
                """,
                (salt_hex, password_hash, compact_json(account), now, user_dict["id"]),
            )
            conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_dict["id"],))
            token = db.create_session(conn, user_dict["id"])
            refreshed = conn.execute("SELECT * FROM users WHERE id = ?", (user_dict["id"],)).fetchone()
            self.audit_event("auth.password_reset", user=dict(refreshed), status="success", conn=conn)
            self.send_json(200, self.auth_response(conn, dict(refreshed), token))

    def google_login(self):
        data = self.read_json()
        self.enforce_rate_limit("auth:google", AUTH_GOOGLE_RATE_LIMIT_MAX)
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
                existing = conn.execute(
                    "SELECT * FROM users WHERE email_norm = ? AND id != ?",
                    (account["email"], account["id"]),
                ).fetchone()
            if not existing:
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
                existing_id = existing["id"]
                same_google_account = existing_id == account["id"]
                if same_google_account:
                    next_account = {**previous, **account, "createdAt": previous.get("createdAt") or account["createdAt"]}
                    next_provider = account["provider"]
                else:
                    next_account = {
                        **previous,
                        "id": previous.get("id") or existing_id,
                        "provider": previous.get("provider") or existing["provider"],
                        "email": account["email"],
                        "name": previous.get("name") or account.get("name"),
                        "picture": previous.get("picture") or account.get("picture") or "",
                        "country": previous.get("country") or account.get("country"),
                        "region": previous.get("region") or account.get("region"),
                        "createdAt": previous.get("createdAt") or existing["created_at"] or account["createdAt"],
                        "updatedAt": now,
                        "googleId": account["id"],
                        "googleLinkedAt": previous.get("googleLinkedAt") or now,
                        "googlePicture": account.get("picture") or previous.get("googlePicture") or "",
                    }
                    next_provider = existing["provider"]
                email_owner = conn.execute(
                    "SELECT id FROM users WHERE email_norm = ? AND id != ?",
                    (next_account["email"], existing_id),
                ).fetchone()
                if email_owner:
                    raise HttpError(409, "Email already exists")
                conn.execute(
                    """
                    UPDATE users
                    SET provider = ?, email_norm = ?, account_json = ?, updated_at = ?
                    WHERE id = ?
                    """,
                    (next_provider, next_account["email"], compact_json(next_account), now, existing_id),
                )
                account["id"] = existing_id
            if isinstance(data.get("community"), dict):
                db.save_community(conn, data.get("community"), merge=True)
            token = db.create_session(conn, account["id"])
            user = conn.execute("SELECT * FROM users WHERE id = ?", (account["id"],)).fetchone()
            self.audit_event(
                "auth.google_login",
                user=dict(user),
                status="success",
                metadata={"linkedExistingAccount": bool(existing)},
                conn=conn,
            )
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
            self.audit_event("account.update", user=user, metadata={"emailChanged": email != normalize_email(user.get("email_norm"))}, conn=conn)
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

    def get_leaderboard(self):
        with db.connect() as conn:
            self.send_json(200, {"leaderboard": db.get_leaderboard(conn), "updatedAt": utc_now()})

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

    def get_jobs(self):
        query = parse_qs(urlparse(self.path).query)
        data = self.read_json() if self.command == "POST" else {}
        raw_max = data.get("max") if isinstance(data, dict) and data.get("max") is not None else (query.get("max") or ["100"])[0]
        try:
            limit = max(1, min(200, int(raw_max)))
        except (TypeError, ValueError):
            raise HttpError(400, "Invalid jobs limit")
        job_type = str(
            data.get("type") if isinstance(data, dict) and data.get("type") is not None else (query.get("type") or [""])[0]
        ).strip().lower()
        jobs = load_jobs_catalog()
        if job_type in {"internship", "fulltime"}:
            jobs = [job for job in jobs if job["type"] == job_type]
        selected = jobs[:limit]
        source_status = str(_JOBS_SOURCE_CACHE.get("status") or "disabled")
        source_label = "catalog"
        if JOBS_SOURCE_URL:
            source_label = "catalog+source" if source_status == "ok" else "catalog-fallback"
        self.send_json(200, {
            "jobs": selected,
            "items": selected,
            "source": source_label,
            "sourceStatus": source_status,
            "updatedAt": utc_now(),
        })

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

    def list_poker_rooms(self):
        user = self.require_user()
        self.send_json(200, {"rooms": poker_hub.list_rooms_for_user(user), "updatedAt": utc_now()})

    def create_poker_room(self):
        user = self.require_user()
        data = self.read_json()
        room = poker_hub.create_room(user, data)
        self.send_json(201, {"room": room})

    def get_poker_room(self, room_code: str):
        user = self.require_user()
        room = poker_hub.get_room(room_code, user)
        self.send_json(200, {"room": room})

    def join_poker_room(self, room_code: str):
        user = self.require_user()
        data = self.read_json()
        room = poker_hub.join_room(room_code, user, data)
        self.send_json(200, {"room": room})

    def send_poker_command(self, room_code: str):
        user = self.require_user()
        data = self.read_json()
        room = poker_hub.apply(
            room_code,
            user,
            str(data.get("command") or data.get("type") or ""),
            data.get("payload") if isinstance(data.get("payload"), dict) else {},
        )
        self.send_json(200, {"room": room})

    def websocket_user(self) -> dict:
        query = parse_qs(urlparse(self.path).query)
        token = query.get("token", [""])[0]
        if not token:
            header = self.headers.get("Authorization", "")
            if header.startswith("Bearer "):
                token = header.removeprefix("Bearer ").strip()
        if not token:
            raise HttpError(401, "Missing bearer token")
        user = db.get_user_by_session(token.strip())
        if not user:
            raise HttpError(401, "Invalid or expired token")
        ensure_email_allowed(user.get("email_norm"))
        return user

    def handle_poker_ws(self, room_code: str):
        if self.headers.get("Upgrade", "").lower() != "websocket":
            raise HttpError(400, "Expected WebSocket upgrade")
        user = self.websocket_user()
        key = self.headers.get("Sec-WebSocket-Key", "").strip()
        if not key:
            raise HttpError(400, "Missing Sec-WebSocket-Key")
        accept = base64.b64encode(hashlib.sha1((key + POKER_WS_GUID).encode("ascii")).digest()).decode("ascii")
        code = poker_normalize_room_code(room_code)
        client = PokerWsClient(self, user, code)

        self.send_response(101, "Switching Protocols")
        self.send_header("Upgrade", "websocket")
        self.send_header("Connection", "Upgrade")
        self.send_header("Sec-WebSocket-Accept", accept)
        self.end_headers()
        self.close_connection = True

        try:
            try:
                initial_room = poker_hub.add_client(client)
            except HttpError as error:
                client.send_json({"type": "error", "error": error.message, "status": error.status})
                return
            client.send_json({"type": "room", "room": initial_room})
            poker_hub.broadcast(code)
            while client.alive:
                try:
                    frame = read_ws_frame(self.rfile)
                except HttpError as error:
                    client.send_json({"type": "error", "error": error.message, "status": error.status})
                    break
                if frame is None:
                    break
                opcode, payload = frame
                if opcode == 0x8:
                    break
                if opcode == 0x9:
                    client.send_pong(payload)
                    continue
                if opcode != 0x1:
                    continue
                try:
                    message = json.loads(payload.decode("utf-8") or "{}")
                except (UnicodeDecodeError, json.JSONDecodeError):
                    client.send_json({"type": "error", "error": "Invalid WebSocket JSON"})
                    continue
                if not isinstance(message, dict):
                    client.send_json({"type": "error", "error": "WebSocket message must be an object"})
                    continue
                if message.get("type") == "ping":
                    client.send_json({"type": "pong", "at": utc_now()})
                    continue
                if message.get("type") != "command":
                    client.send_json({"type": "error", "error": "Unsupported WebSocket message"})
                    continue
                try:
                    room = poker_hub.apply(
                        code,
                        user,
                        str(message.get("command") or ""),
                        message.get("payload") if isinstance(message.get("payload"), dict) else {},
                    )
                    client.send_json({"type": "ack", "room": room})
                except HttpError as error:
                    client.send_json({"type": "error", "error": error.message, "status": error.status})
        finally:
            poker_hub.remove_client(client)
            poker_hub.broadcast(code)

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
