from __future__ import annotations

import asyncio
import base64
import hashlib
import hmac
import json
import re
import secrets
from collections.abc import Callable, Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any, Protocol
from urllib.parse import unquote, urlencode, urlsplit

import httpx
import jwt
from cryptography.exceptions import InvalidTag
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from pydantic import SecretStr

from ..config import GOOGLE_REDIRECT_URI
from .challenge_limits import PreAuthChallengeRateLimiter


GOOGLE_AUTHORIZATION_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
GOOGLE_JWKS_ENDPOINT = "https://www.googleapis.com/oauth2/v3/certs"
GOOGLE_ISSUER = "https://accounts.google.com"
_CALLBACK_ERROR_MESSAGE = "Google sign-in could not be completed."
_START_ERROR_MESSAGE = "Google sign-in could not be started."
_VERIFIER_ERROR_MESSAGE = "The OAuth verifier could not be recovered."
_CHALLENGE_TTL = timedelta(minutes=10)
_CLOCK_SKEW_SECONDS = 30
_MAX_ID_TOKEN_AGE_SECONDS = 10 * 60
_MAX_ID_TOKEN_LIFETIME_SECONDS = 2 * 60 * 60
_MAX_PROVIDER_RESPONSE_BYTES = 1024 * 1024
_MAX_ID_TOKEN_BYTES = 16 * 1024
_OAUTH_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")
_BOUND_STATE_PATTERN = re.compile(r"^[A-Za-z0-9_-]{86}$")
_VERIFIER_PATTERN = re.compile(r"^[A-Za-z0-9._~-]{43,128}$")
_KEY_ID_PATTERN = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
_SHA256_PATTERN = re.compile(r"^[a-f0-9]{64}$")
_JWT_KID_PATTERN = re.compile(r"^[A-Za-z0-9._-]{1,256}$")
_CIPHER_VERSION = b"\x01"
_AES_GCM_NONCE_BYTES = 12
_STATE_RANDOM_CHARACTERS = 43
_STATE_BINDING_DOMAIN = b"quantgym:v2:google-oauth:browser-binding:v1"


class GoogleOAuthCallbackError(Exception):
    """One fixed, non-sensitive callback failure exposed to the auth service."""

    code = "GOOGLE_OAUTH_FAILED"
    status_code = 400

    def __init__(self) -> None:
        super().__init__(_CALLBACK_ERROR_MESSAGE)


class GoogleOAuthStartError(Exception):
    """One fixed, non-sensitive start failure exposed to the auth service."""

    code = "GOOGLE_OAUTH_UNAVAILABLE"
    status_code = 503
    retry_after: int | None = None

    def __init__(self) -> None:
        super().__init__(_START_ERROR_MESSAGE)


class GoogleOAuthStartRateLimitedError(GoogleOAuthStartError):
    """A stable public outcome when one client exceeds the start window."""

    code = "AUTH_CHALLENGE_RATE_LIMITED"
    status_code = 429

    def __init__(self, retry_after: int) -> None:
        if not isinstance(retry_after, int) or retry_after < 1:
            raise ValueError("OAuth retry delay is invalid")
        self.retry_after = retry_after
        super().__init__()


class GoogleOAuthChallengeCapacityError(GoogleOAuthStartError):
    """The shared database has reached its bounded OAuth challenge capacity."""

    code = "GOOGLE_OAUTH_CAPACITY_LIMITED"
    status_code = 503
    retry_after = 30


class VerifierCipherError(Exception):
    """A deliberately opaque verifier encryption or recovery failure."""

    def __init__(self) -> None:
        super().__init__(_VERIFIER_ERROR_MESSAGE)


@dataclass(frozen=True, slots=True, repr=False)
class EncryptedPkceVerifier:
    ciphertext: bytes
    key_id: str


@dataclass(frozen=True, slots=True)
class PkceVerifierDeletion:
    """Values applied when a callback atomically claims a one-time challenge."""

    consumed_at: datetime
    pkce_verifier_ciphertext: None = field(default=None, init=False)
    pkce_key_id: None = field(default=None, init=False)

    def __post_init__(self) -> None:
        _require_aware_datetime(self.consumed_at)


@dataclass(frozen=True, slots=True, repr=False)
class GoogleOAuthChallengeForPersistence:
    """The complete persistence input; it intentionally has no raw OAuth values."""

    token_hash: str
    state_hash: str
    nonce_hash: str
    pkce_verifier_ciphertext: bytes
    pkce_key_id: str
    redirect_path: str
    expires_at: datetime
    created_at: datetime

    def __post_init__(self) -> None:
        _require_hash(self.token_hash)
        _require_hash(self.state_hash)
        _require_hash(self.nonce_hash)
        if not hmac.compare_digest(self.token_hash, self.state_hash):
            raise ValueError("OAuth challenge hashes are inconsistent")
        _require_ciphertext(self.pkce_verifier_ciphertext)
        _require_key_id(self.pkce_key_id)
        _validate_redirect_path(self.redirect_path)
        created_at = _require_aware_datetime(self.created_at)
        expires_at = _require_aware_datetime(self.expires_at)
        if expires_at <= created_at:
            raise ValueError("OAuth challenge expiry is invalid")


@dataclass(frozen=True, slots=True, repr=False)
class ClaimedGoogleOAuthChallenge:
    """Pre-deletion values returned by an atomic claim-and-delete operation."""

    state_hash: str
    nonce_hash: str
    pkce_verifier_ciphertext: bytes
    pkce_key_id: str
    redirect_path: str
    expires_at: datetime

    def __post_init__(self) -> None:
        _require_hash(self.state_hash)
        _require_hash(self.nonce_hash)
        _require_ciphertext(self.pkce_verifier_ciphertext)
        _require_key_id(self.pkce_key_id)
        _validate_redirect_path(self.redirect_path)
        _require_aware_datetime(self.expires_at)


@dataclass(frozen=True, slots=True, repr=False)
class GoogleAuthorizationRedirect:
    """Browser boundary containing the only returned raw state and nonce values."""

    location: str


@dataclass(frozen=True, slots=True, repr=False)
class GoogleIdentity:
    subject: str
    email: str | None
    email_verified: bool
    name: str | None
    picture: str | None
    redirect_path: str


class GoogleOAuthChallengeStore(Protocol):
    async def create(self, challenge: GoogleOAuthChallengeForPersistence) -> bool:
        """Atomically clean stale rows, enforce capacity, and create one row."""

        ...

    async def claim_and_delete_verifier(
        self,
        *,
        state_hash: str,
        claimed_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> ClaimedGoogleOAuthChallenge | None:
        """Atomically claim once, clear both verifier columns, and return old values.

        A synchronous SQLAlchemy adapter must run the complete transaction in one
        worker thread with a thread-owned connection. It must release all database
        locks before this method returns; provider network calls happen afterwards.
        """

        ...


def hash_oauth_value(value: str) -> str:
    if not isinstance(value, str) or not value:
        raise ValueError("OAuth value is invalid")
    return hashlib.sha256(value.encode("utf-8")).hexdigest()


class RotatingVerifierCipher:
    """AES-GCM key ring for a short-lived PKCE verifier bound to its state hash."""

    def __init__(self, *, active_key_id: str, keys: Mapping[str, bytes]) -> None:
        _require_key_id(active_key_id)
        validated: dict[str, bytes] = {}
        for key_id, key in keys.items():
            _require_key_id(key_id)
            if not isinstance(key, bytes) or len(key) != 32:
                raise ValueError("OAuth verifier keys must be 32 bytes")
            validated[key_id] = bytes(key)
        if active_key_id not in validated:
            raise ValueError("active OAuth verifier key is unavailable")
        self._active_key_id = active_key_id
        self._keys = validated

    @staticmethod
    def pkce_s256(verifier: str) -> str:
        if not isinstance(verifier, str) or not _VERIFIER_PATTERN.fullmatch(verifier):
            raise ValueError("PKCE verifier is invalid")
        digest = hashlib.sha256(verifier.encode("ascii")).digest()
        return base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")

    def encrypt(self, *, verifier: str, state_hash: str) -> EncryptedPkceVerifier:
        try:
            _require_hash(state_hash)
            if not isinstance(verifier, str) or not _VERIFIER_PATTERN.fullmatch(verifier):
                raise ValueError
            nonce = secrets.token_bytes(_AES_GCM_NONCE_BYTES)
            key_id = self._active_key_id
            encrypted = AESGCM(self._keys[key_id]).encrypt(
                nonce,
                verifier.encode("ascii"),
                self._associated_data(state_hash=state_hash, key_id=key_id),
            )
            return EncryptedPkceVerifier(
                ciphertext=_CIPHER_VERSION + nonce + encrypted,
                key_id=key_id,
            )
        except (TypeError, ValueError):
            raise VerifierCipherError() from None

    def decrypt(self, *, ciphertext: bytes, key_id: str, state_hash: str) -> str:
        try:
            _require_hash(state_hash)
            _require_key_id(key_id)
            _require_ciphertext(ciphertext)
            key = self._keys.get(key_id)
            if key is None or ciphertext[:1] != _CIPHER_VERSION:
                raise ValueError
            nonce_end = 1 + _AES_GCM_NONCE_BYTES
            plaintext = AESGCM(key).decrypt(
                ciphertext[1:nonce_end],
                ciphertext[nonce_end:],
                self._associated_data(state_hash=state_hash, key_id=key_id),
            )
            verifier = plaintext.decode("ascii")
            if not _VERIFIER_PATTERN.fullmatch(verifier):
                raise ValueError
            return verifier
        except (InvalidTag, KeyError, TypeError, UnicodeError, ValueError):
            raise VerifierCipherError() from None

    @staticmethod
    def _associated_data(*, state_hash: str, key_id: str) -> bytes:
        return (
            b"quantgym-google-pkce-v1\x00"
            + key_id.encode("ascii")
            + b"\x00"
            + state_hash.encode("ascii")
        )


class GoogleOAuthFlow:
    """Authorization-code flow with one-time PKCE and strict ID-token verification."""

    def __init__(
        self,
        *,
        client_id: str,
        client_secret: str,
        redirect_uri: str,
        challenge_store: GoogleOAuthChallengeStore,
        verifier_cipher: RotatingVerifierCipher,
        http_transport: httpx.AsyncBaseTransport | None,
        clock: Callable[[], datetime],
        start_rate_limiter: PreAuthChallengeRateLimiter,
        request_timeout_seconds: float = 5.0,
    ) -> None:
        if not _is_safe_text(client_id, minimum=6, maximum=512):
            raise ValueError("Google client ID is invalid")
        if not _is_safe_text(client_secret, minimum=16, maximum=512):
            raise ValueError("Google client secret is invalid")
        if redirect_uri != GOOGLE_REDIRECT_URI:
            raise ValueError("Google redirect URI must equal the Preview callback")
        if (
            not isinstance(request_timeout_seconds, (int, float))
            or isinstance(request_timeout_seconds, bool)
            or not 0.1 <= float(request_timeout_seconds) <= 30.0
        ):
            raise ValueError("Google request timeout is invalid")
        self._client_id = client_id
        self._client_secret = client_secret
        self._redirect_uri = redirect_uri
        self._challenge_store = challenge_store
        self._verifier_cipher = verifier_cipher
        self._clock = clock
        if not isinstance(start_rate_limiter, PreAuthChallengeRateLimiter):
            raise TypeError("OAuth start rate limiter is invalid")
        self._start_rate_limiter = start_rate_limiter
        timeout = float(request_timeout_seconds)
        self._http = httpx.AsyncClient(
            transport=http_transport,
            timeout=httpx.Timeout(
                connect=timeout,
                read=timeout,
                write=timeout,
                pool=timeout,
            ),
            limits=httpx.Limits(
                max_connections=10,
                max_keepalive_connections=5,
                keepalive_expiry=5.0,
            ),
            follow_redirects=False,
            trust_env=False,
            headers={
                "Accept": "application/json",
                "User-Agent": "QuantGym-Preview-OAuth/1.0",
            },
        )
        self._closed = False
        self._close_task: asyncio.Task[None] | None = None

    async def __aenter__(self) -> GoogleOAuthFlow:
        return self

    async def __aexit__(self, *_: object) -> None:
        await self.aclose()

    async def aclose(self) -> None:
        if self._close_task is None:
            self._closed = True
            self._close_task = asyncio.create_task(self._http.aclose())
        await asyncio.shield(self._close_task)

    async def start(
        self,
        *,
        redirect_path: str = "/",
        browser_binding: SecretStr | str,
        client_ip: str = "unknown",
    ) -> GoogleAuthorizationRedirect:
        if self._closed:
            raise GoogleOAuthStartError()
        try:
            safe_redirect_path = _validate_redirect_path(redirect_path)
            binding = _browser_binding_text(browser_binding)
            retry_after = self._start_rate_limiter.check_and_record(
                client_ip=client_ip,
                browser_binding=binding,
            )
            if retry_after is not None:
                raise GoogleOAuthStartRateLimitedError(retry_after)
            now = self._now()
            state_random = secrets.token_urlsafe(32)
            state = _browser_bound_state(
                random_value=state_random,
                browser_binding=binding,
            )
            nonce = secrets.token_urlsafe(32)
            verifier = secrets.token_urlsafe(64)
            if (
                not _BOUND_STATE_PATTERN.fullmatch(state)
                or not _OAUTH_TOKEN_PATTERN.fullmatch(nonce)
            ):
                raise ValueError
            if not _VERIFIER_PATTERN.fullmatch(verifier):
                raise ValueError
            state_hash = hash_oauth_value(state)
            nonce_hash = hash_oauth_value(nonce)
            encrypted = self._verifier_cipher.encrypt(
                verifier=verifier,
                state_hash=state_hash,
            )
            challenge = GoogleOAuthChallengeForPersistence(
                token_hash=state_hash,
                state_hash=state_hash,
                nonce_hash=nonce_hash,
                pkce_verifier_ciphertext=encrypted.ciphertext,
                pkce_key_id=encrypted.key_id,
                redirect_path=safe_redirect_path,
                expires_at=now + _CHALLENGE_TTL,
                created_at=now,
            )
            if not await self._challenge_store.create(challenge):
                raise GoogleOAuthChallengeCapacityError()
            location = GOOGLE_AUTHORIZATION_ENDPOINT + "?" + urlencode(
                {
                    "client_id": self._client_id,
                    "redirect_uri": self._redirect_uri,
                    "response_type": "code",
                    "scope": "openid email profile",
                    "state": state,
                    "nonce": nonce,
                    "code_challenge": RotatingVerifierCipher.pkce_s256(verifier),
                    "code_challenge_method": "S256",
                }
            )
            return GoogleAuthorizationRedirect(location=location)
        except GoogleOAuthStartError:
            raise
        except Exception:
            raise GoogleOAuthStartError() from None

    async def complete_callback(
        self,
        *,
        code: str | None,
        state: str | None,
        provider_error: str | None = None,
        browser_binding: SecretStr | str | None,
    ) -> GoogleIdentity:
        if self._closed:
            raise GoogleOAuthCallbackError()
        try:
            if not isinstance(state, str) or not _BOUND_STATE_PATTERN.fullmatch(state):
                raise GoogleOAuthCallbackError()
            binding = _browser_binding_text(browser_binding)
            state_random = state[:_STATE_RANDOM_CHARACTERS]
            expected_state = _browser_bound_state(
                random_value=state_random,
                browser_binding=binding,
            )
            if not hmac.compare_digest(
                state.encode("ascii"),
                expected_state.encode("ascii"),
            ):
                raise GoogleOAuthCallbackError()
            state_hash = hash_oauth_value(state)
            now = self._now()
            deletion = PkceVerifierDeletion(consumed_at=now)
            claimed = await self._challenge_store.claim_and_delete_verifier(
                state_hash=state_hash,
                claimed_at=now,
                verifier_deletion=deletion,
            )
            if claimed is None:
                raise GoogleOAuthCallbackError()
            if not hmac.compare_digest(claimed.state_hash, state_hash):
                raise GoogleOAuthCallbackError()
            if now >= claimed.expires_at.astimezone(UTC):
                raise GoogleOAuthCallbackError()
            if provider_error is not None:
                raise GoogleOAuthCallbackError()
            if not _is_safe_text(code, minimum=1, maximum=4096):
                raise GoogleOAuthCallbackError()
            verifier = self._verifier_cipher.decrypt(
                ciphertext=claimed.pkce_verifier_ciphertext,
                key_id=claimed.pkce_key_id,
                state_hash=state_hash,
            )
            id_token = await self._exchange_code(code=code, verifier=verifier)
            identity = await self._verify_id_token(
                id_token=id_token,
                expected_nonce_hash=claimed.nonce_hash,
                now=now,
                redirect_path=claimed.redirect_path,
            )
            return identity
        except GoogleOAuthCallbackError:
            raise
        except Exception:
            raise GoogleOAuthCallbackError() from None

    async def _exchange_code(self, *, code: str, verifier: str) -> str:
        payload = await self._request_json_object(
            method="POST",
            url=GOOGLE_TOKEN_ENDPOINT,
            data={
                "client_id": self._client_id,
                "client_secret": self._client_secret,
                "code": code,
                "code_verifier": verifier,
                "grant_type": "authorization_code",
                "redirect_uri": self._redirect_uri,
            },
        )
        id_token = payload.get("id_token")
        if (
            not isinstance(id_token, str)
            or not 16 <= len(id_token.encode("utf-8")) <= _MAX_ID_TOKEN_BYTES
            or any(character.isspace() for character in id_token)
            or id_token.count(".") != 2
        ):
            raise GoogleOAuthCallbackError()
        return id_token

    async def _verify_id_token(
        self,
        *,
        id_token: str,
        expected_nonce_hash: str,
        now: datetime,
        redirect_path: str,
    ) -> GoogleIdentity:
        header = jwt.get_unverified_header(id_token)
        if not isinstance(header, dict) or header.get("alg") != "RS256":
            raise GoogleOAuthCallbackError()
        kid = header.get("kid")
        if not isinstance(kid, str) or not _JWT_KID_PATTERN.fullmatch(kid):
            raise GoogleOAuthCallbackError()

        jwks = await self._request_json_object(
            method="GET",
            url=GOOGLE_JWKS_ENDPOINT,
        )
        keys = jwks.get("keys")
        if not isinstance(keys, list) or not 1 <= len(keys) <= 32:
            raise GoogleOAuthCallbackError()
        matching = [key for key in keys if isinstance(key, dict) and key.get("kid") == kid]
        if len(matching) != 1:
            raise GoogleOAuthCallbackError()
        jwk = matching[0]
        if (
            jwk.get("kty") != "RSA"
            or jwk.get("alg") != "RS256"
            or jwk.get("use") != "sig"
            or (
                "key_ops" in jwk
                and (
                    not isinstance(jwk["key_ops"], list)
                    or "verify" not in jwk["key_ops"]
                )
            )
        ):
            raise GoogleOAuthCallbackError()
        signing_key = jwt.PyJWK.from_dict(jwk, algorithm="RS256").key
        claims = jwt.decode(
            id_token,
            key=signing_key,
            algorithms=["RS256"],
            audience=self._client_id,
            issuer=GOOGLE_ISSUER,
            options={
                "require": ["iss", "aud", "exp", "iat", "nonce", "sub"],
                "strict_aud": True,
                "verify_exp": False,
                "verify_iat": False,
            },
        )
        if not isinstance(claims, dict):
            raise GoogleOAuthCallbackError()
        self._validate_times(claims=claims, now=now)

        nonce = claims.get("nonce")
        if not isinstance(nonce, str) or not _is_safe_text(nonce, minimum=1, maximum=512):
            raise GoogleOAuthCallbackError()
        if not hmac.compare_digest(hash_oauth_value(nonce), expected_nonce_hash):
            raise GoogleOAuthCallbackError()
        subject = claims.get("sub")
        if not _is_safe_text(subject, minimum=1, maximum=255):
            raise GoogleOAuthCallbackError()

        email = claims.get("email")
        if email is not None and (
            not _is_safe_text(email, minimum=3, maximum=320) or "@" not in email
        ):
            raise GoogleOAuthCallbackError()
        email_verified = claims.get("email_verified", False)
        if not isinstance(email_verified, bool):
            raise GoogleOAuthCallbackError()
        name = claims.get("name")
        if name is not None and not _is_safe_display_text(
            name,
            minimum=1,
            maximum=256,
        ):
            raise GoogleOAuthCallbackError()
        return GoogleIdentity(
            subject=subject,
            email=email,
            email_verified=email_verified,
            name=name,
            # Provider-hosted profile images are deliberately not surfaced as
            # fetchable application URLs. A future avatar import must use the
            # separately governed server-side media pipeline.
            picture=None,
            redirect_path=redirect_path,
        )

    @staticmethod
    def _validate_times(*, claims: Mapping[str, Any], now: datetime) -> None:
        expiration = claims.get("exp")
        issued_at = claims.get("iat")
        if (
            not isinstance(expiration, int)
            or isinstance(expiration, bool)
            or not isinstance(issued_at, int)
            or isinstance(issued_at, bool)
        ):
            raise GoogleOAuthCallbackError()
        now_timestamp = now.timestamp()
        if expiration <= now_timestamp:
            raise GoogleOAuthCallbackError()
        if issued_at > now_timestamp + _CLOCK_SKEW_SECONDS:
            raise GoogleOAuthCallbackError()
        if issued_at < now_timestamp - _MAX_ID_TOKEN_AGE_SECONDS:
            raise GoogleOAuthCallbackError()
        if expiration <= issued_at:
            raise GoogleOAuthCallbackError()
        if expiration - issued_at > _MAX_ID_TOKEN_LIFETIME_SECONDS:
            raise GoogleOAuthCallbackError()

    def _now(self) -> datetime:
        value = self._clock()
        return _require_aware_datetime(value).astimezone(UTC)

    async def _request_json_object(
        self,
        *,
        method: str,
        url: str,
        data: Mapping[str, str] | None = None,
    ) -> dict[str, Any]:
        async with self._http.stream(method, url, data=data) as response:
            if response.status_code != 200:
                raise GoogleOAuthCallbackError()
            lengths = response.headers.get_list("content-length")
            if len(lengths) > 1:
                raise GoogleOAuthCallbackError()
            if lengths:
                raw_length = lengths[0]
                if not raw_length.isascii() or not raw_length.isdecimal():
                    raise GoogleOAuthCallbackError()
                if int(raw_length) > _MAX_PROVIDER_RESPONSE_BYTES:
                    raise GoogleOAuthCallbackError()
            content_type = response.headers.get("content-type", "")
            if content_type.split(";", 1)[0].strip().lower() != "application/json":
                raise GoogleOAuthCallbackError()

            body = bytearray()
            async for chunk in response.aiter_bytes():
                if len(body) + len(chunk) > _MAX_PROVIDER_RESPONSE_BYTES:
                    raise GoogleOAuthCallbackError()
                body.extend(chunk)
        return _strict_json_object(bytes(body))


def _strict_json_object(content: bytes) -> dict[str, Any]:
    def reject_duplicate_keys(pairs: list[tuple[str, Any]]) -> dict[str, Any]:
        value: dict[str, Any] = {}
        for key, item in pairs:
            if key in value:
                raise ValueError("duplicate JSON key")
            value[key] = item
        return value

    def reject_constant(_value: str) -> None:
        raise ValueError("invalid JSON constant")

    try:
        payload = json.loads(
            content.decode("utf-8"),
            object_pairs_hook=reject_duplicate_keys,
            parse_constant=reject_constant,
        )
    except (UnicodeError, ValueError, json.JSONDecodeError):
        raise GoogleOAuthCallbackError() from None
    if not isinstance(payload, dict):
        raise GoogleOAuthCallbackError()
    return payload


def _browser_binding_text(value: SecretStr | str | None) -> str:
    if isinstance(value, SecretStr):
        text = value.get_secret_value()
    elif isinstance(value, str):
        text = value
    else:
        raise ValueError("OAuth browser binding is invalid")
    if not _OAUTH_TOKEN_PATTERN.fullmatch(text):
        raise ValueError("OAuth browser binding is invalid")
    return text


def _browser_bound_state(*, random_value: str, browser_binding: str) -> str:
    if not _OAUTH_TOKEN_PATTERN.fullmatch(random_value):
        raise ValueError("OAuth state is invalid")
    digest = hmac.new(
        browser_binding.encode("ascii"),
        _STATE_BINDING_DOMAIN + b"\x00" + random_value.encode("ascii"),
        hashlib.sha256,
    ).digest()
    signature = base64.urlsafe_b64encode(digest).rstrip(b"=").decode("ascii")
    state = random_value + signature
    if not _BOUND_STATE_PATTERN.fullmatch(state):
        raise ValueError("OAuth state is invalid")
    return state


def _require_hash(value: str) -> str:
    if not isinstance(value, str) or not _SHA256_PATTERN.fullmatch(value):
        raise ValueError("OAuth hash is invalid")
    return value


def _require_key_id(value: str) -> str:
    if not isinstance(value, str) or not _KEY_ID_PATTERN.fullmatch(value):
        raise ValueError("OAuth verifier key ID is invalid")
    return value


def _require_ciphertext(value: bytes) -> bytes:
    minimum = 1 + _AES_GCM_NONCE_BYTES + 16 + 43
    if not isinstance(value, bytes) or not minimum <= len(value) <= 512:
        raise ValueError("OAuth verifier ciphertext is invalid")
    return value


def _require_aware_datetime(value: datetime) -> datetime:
    if not isinstance(value, datetime) or value.tzinfo is None or value.utcoffset() is None:
        raise ValueError("OAuth timestamp must be timezone-aware")
    return value


def _validate_redirect_path(value: str) -> str:
    if not isinstance(value, str) or not 1 <= len(value) <= 512:
        raise ValueError("OAuth redirect path is invalid")
    if "#" in value or any(character.isspace() for character in value):
        raise ValueError("OAuth redirect path is invalid")
    if any(ord(character) < 32 or ord(character) == 127 for character in value):
        raise ValueError("OAuth redirect path is invalid")
    parsed = urlsplit(value)
    if parsed.scheme or parsed.netloc or parsed.fragment:
        raise ValueError("OAuth redirect path is invalid")
    pathname = parsed.path
    if (
        not pathname.startswith("/")
        or pathname.startswith("//")
        or "\\" in pathname
        or re.search(r"/{2,}", pathname)
        or re.search(r"%(?:2e|2f|5c|25)", pathname, re.IGNORECASE)
        or re.search(r"%(?![0-9a-f]{2})", pathname, re.IGNORECASE)
    ):
        raise ValueError("OAuth redirect path is invalid")
    try:
        decoded = unquote(pathname, errors="strict")
    except (UnicodeError, ValueError):
        raise ValueError("OAuth redirect path is invalid") from None
    if (
        "\\" in decoded
        or re.search(r"/{2,}", decoded)
        or any(ord(character) < 32 or ord(character) == 127 for character in decoded)
        or any(segment in {".", ".."} for segment in decoded.split("/"))
    ):
        raise ValueError("OAuth redirect path is invalid")
    return value


def _is_safe_text(value: object, *, minimum: int, maximum: int) -> bool:
    if not isinstance(value, str) or not minimum <= len(value) <= maximum:
        return False
    return not any(
        character.isspace() or ord(character) < 32 or ord(character) == 127
        for character in value
    )


def _is_safe_display_text(value: object, *, minimum: int, maximum: int) -> bool:
    if not isinstance(value, str) or not minimum <= len(value) <= maximum:
        return False
    if value != value.strip():
        return False
    return not any(ord(character) < 32 or ord(character) == 127 for character in value)
