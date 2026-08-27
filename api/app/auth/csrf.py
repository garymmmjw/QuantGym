from __future__ import annotations

import hashlib
import hmac
import re
import secrets
from dataclasses import dataclass
from datetime import datetime
from enum import StrEnum

from pydantic import SecretStr


CSRF_TOKEN_BYTES = 32
CSRF_SIGNING_SECRET_MIN_BYTES = 32
CSRF_DIGEST_BYTES = hashlib.sha256().digest_size

_TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")
_DIGEST_PATTERN = re.compile(r"^[0-9a-f]{64}$")
_PRE_AUTH_DOMAIN = b"quantgym:v2:csrf:pre-auth:v1"
_SESSION_DOMAIN = b"quantgym:v2:csrf:session:v1"


class CsrfFailureCode(StrEnum):
    ORIGIN_INVALID = "CSRF_ORIGIN_INVALID"
    PROOF_MISSING = "CSRF_PROOF_MISSING"
    PROOF_INVALID = "CSRF_PROOF_INVALID"
    PROOF_STALE = "CSRF_PROOF_STALE"
    PROOF_CONSUMED = "CSRF_PROOF_CONSUMED"


@dataclass(frozen=True, slots=True, repr=False)
class CsrfToken:
    _value: SecretStr

    def __post_init__(self) -> None:
        text = _secret_text(self._value)
        if _TOKEN_PATTERN.fullmatch(text) is None:
            raise ValueError("CSRF token is invalid")
        object.__setattr__(self, "_value", SecretStr(text))

    @classmethod
    def from_value(cls, value: CsrfToken | SecretStr | str) -> CsrfToken:
        if isinstance(value, cls):
            return value
        text = _secret_text(value)
        if _TOKEN_PATTERN.fullmatch(text) is None:
            raise ValueError("CSRF token is invalid")
        return cls(SecretStr(text))

    def get_secret_value(self) -> str:
        return self._value.get_secret_value()

    def __repr__(self) -> str:
        return f"{type(self).__name__}('[REDACTED]')"

    def __str__(self) -> str:
        return "[REDACTED]"


@dataclass(frozen=True, slots=True, repr=False)
class CsrfDigest:
    _value: SecretStr

    def __post_init__(self) -> None:
        text = _secret_text(self._value)
        if _DIGEST_PATTERN.fullmatch(text) is None:
            raise ValueError("CSRF digest is invalid")
        object.__setattr__(self, "_value", SecretStr(text))

    @classmethod
    def from_value(cls, value: CsrfDigest | SecretStr | str) -> CsrfDigest:
        if isinstance(value, cls):
            return value
        text = _secret_text(value)
        if _DIGEST_PATTERN.fullmatch(text) is None:
            raise ValueError("CSRF digest is invalid")
        return cls(SecretStr(text))

    def get_secret_value(self) -> str:
        return self._value.get_secret_value()

    def __repr__(self) -> str:
        return f"{type(self).__name__}('[REDACTED]')"

    def __str__(self) -> str:
        return "[REDACTED]"


@dataclass(frozen=True, slots=True, repr=False)
class CsrfRequestProof:
    origin: str | None
    cookie_token: SecretStr | None
    header_token: SecretStr | None

    @classmethod
    def from_values(
        cls,
        *,
        origin: str | None,
        cookie_token: SecretStr | str | None,
        header_token: SecretStr | str | None,
    ) -> CsrfRequestProof:
        return cls(
            origin=origin,
            cookie_token=_optional_secret(cookie_token),
            header_token=_optional_secret(header_token),
        )

    def __repr__(self) -> str:
        origin = "<present>" if self.origin is not None else "None"
        cookie = "[REDACTED]" if self.cookie_token is not None else "None"
        header = "[REDACTED]" if self.header_token is not None else "None"
        return (
            f"{type(self).__name__}(origin={origin}, cookie_token={cookie}, "
            f"header_token={header})"
        )


@dataclass(frozen=True, slots=True, repr=False)
class PreAuthCsrfState:
    token_digest: CsrfDigest
    expires_at: datetime
    consumed_at: datetime | None = None

    def __post_init__(self) -> None:
        object.__setattr__(self, "token_digest", CsrfDigest.from_value(self.token_digest))

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(token_digest=[REDACTED], "
            f"expires_at={self.expires_at!r}, consumed={self.consumed_at is not None})"
        )


@dataclass(frozen=True, slots=True, repr=False)
class SessionCsrfState:
    session_binding: str
    token_digest: CsrfDigest

    def __post_init__(self) -> None:
        object.__setattr__(self, "token_digest", CsrfDigest.from_value(self.token_digest))

    def __repr__(self) -> str:
        return (
            f"{type(self).__name__}(session_binding=[REDACTED], "
            "token_digest=[REDACTED])"
        )


@dataclass(frozen=True, slots=True)
class CsrfValidation:
    is_valid: bool
    failure_code: CsrfFailureCode | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.is_valid, bool):
            raise ValueError("CSRF validation result is inconsistent")
        if self.failure_code is not None and not isinstance(
            self.failure_code, CsrfFailureCode
        ):
            raise ValueError("CSRF validation result is inconsistent")
        if self.is_valid == (self.failure_code is not None):
            raise ValueError("CSRF validation result is inconsistent")

    @property
    def error_code(self) -> str | None:
        return self.failure_code.value if self.failure_code is not None else None

    def __bool__(self) -> bool:
        return self.is_valid


def _secret_text(value: SecretStr | str) -> str:
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    if isinstance(value, str):
        return value
    raise ValueError("secret value is invalid")


def _optional_secret(value: SecretStr | str | None) -> SecretStr | None:
    if value is None:
        return None
    return SecretStr(_secret_text(value))


def _signing_key(value: SecretStr | str | bytes) -> bytes:
    if isinstance(value, bytes):
        key = value
    else:
        try:
            key = _secret_text(value).encode("utf-8")
        except UnicodeError:
            # Encoding errors can echo the original secret in a traceback.
            raise ValueError("CSRF signing secret is invalid") from None
    if len(key) < CSRF_SIGNING_SECRET_MIN_BYTES:
        raise ValueError("CSRF signing secret is invalid")
    return key


def _binding_bytes(value: str) -> bytes:
    if not isinstance(value, str) or not value or len(value) > 512:
        raise ValueError("CSRF session binding is invalid")
    if any(character.isspace() or ord(character) < 32 for character in value):
        raise ValueError("CSRF session binding is invalid")
    try:
        return value.encode("utf-8")
    except UnicodeError:
        raise ValueError("CSRF session binding is invalid") from None


def _token_bytes(value: CsrfToken | SecretStr | str) -> bytes:
    return CsrfToken.from_value(value).get_secret_value().encode("ascii")


def _hmac_hex(
    token: CsrfToken | SecretStr | str,
    signing_secret: SecretStr | str | bytes,
    *,
    domain: bytes,
    binding: bytes = b"",
) -> CsrfDigest:
    message = b"\x00".join((domain, binding, _token_bytes(token)))
    value = hmac.new(_signing_key(signing_secret), message, hashlib.sha256).hexdigest()
    return CsrfDigest.from_value(value)


def _constant_time_text_equal(left: str, right: str) -> bool:
    # Hashing first keeps compare_digest operands fixed length, including when
    # an attacker deliberately varies a header's length.
    left_digest = hashlib.sha256(left.encode("utf-8", errors="surrogatepass")).digest()
    right_digest = hashlib.sha256(right.encode("utf-8", errors="surrogatepass")).digest()
    return hmac.compare_digest(left_digest, right_digest)


def _digest_matches(actual: CsrfDigest, expected: CsrfDigest) -> bool:
    return hmac.compare_digest(
        actual.get_secret_value().encode("ascii"),
        expected.get_secret_value().encode("ascii"),
    )


def _accepted() -> CsrfValidation:
    return CsrfValidation(is_valid=True)


def _rejected(code: CsrfFailureCode) -> CsrfValidation:
    return CsrfValidation(is_valid=False, failure_code=code)


def _require_aware(value: datetime) -> None:
    if (
        not isinstance(value, datetime)
        or value.tzinfo is None
        or value.utcoffset() is None
    ):
        raise ValueError("CSRF timestamps must be timezone-aware")


def generate_csrf_token() -> CsrfToken:
    """Generate a 256-bit, unpadded base64url token suitable for a cookie."""

    return CsrfToken.from_value(secrets.token_urlsafe(CSRF_TOKEN_BYTES))


def digest_pre_auth_csrf(
    token: CsrfToken | SecretStr | str,
    signing_secret: SecretStr | str | bytes,
) -> CsrfDigest:
    """Create the only value that may be stored for a pre-auth CSRF token."""

    return _hmac_hex(token, signing_secret, domain=_PRE_AUTH_DOMAIN)


def digest_session_csrf(
    token: CsrfToken | SecretStr | str,
    session_binding: str,
    signing_secret: SecretStr | str | bytes,
) -> CsrfDigest:
    """Bind a stored CSRF digest to exactly one server-side session."""

    return _hmac_hex(
        token,
        signing_secret,
        domain=_SESSION_DOMAIN,
        binding=_binding_bytes(session_binding),
    )


def origin_is_exact(supplied_origin: str | None, expected_origin: str) -> bool:
    """Compare origins without case folding, parsing, or trailing-slash repair."""

    if not isinstance(supplied_origin, str) or not isinstance(expected_origin, str):
        return False
    if not supplied_origin or not expected_origin:
        return False
    return _constant_time_text_equal(supplied_origin, expected_origin)


def _proof_tokens(
    proof: CsrfRequestProof,
) -> tuple[CsrfToken, CsrfToken] | CsrfFailureCode:
    if proof.cookie_token is None or proof.header_token is None:
        return CsrfFailureCode.PROOF_MISSING
    try:
        cookie = CsrfToken.from_value(proof.cookie_token)
        header = CsrfToken.from_value(proof.header_token)
    except (UnicodeError, ValueError):
        return CsrfFailureCode.PROOF_INVALID
    if not _constant_time_text_equal(
        cookie.get_secret_value(),
        header.get_secret_value(),
    ):
        return CsrfFailureCode.PROOF_INVALID
    return cookie, header


def validate_pre_auth_csrf(
    proof: CsrfRequestProof,
    state: PreAuthCsrfState,
    *,
    signing_secret: SecretStr | str | bytes,
    expected_origin: str,
    now: datetime,
) -> CsrfValidation:
    """Validate a short-lived, unconsumed pre-auth challenge without mutation."""

    _require_aware(now)
    _require_aware(state.expires_at)
    if state.consumed_at is not None:
        _require_aware(state.consumed_at)

    if not origin_is_exact(proof.origin, expected_origin):
        return _rejected(CsrfFailureCode.ORIGIN_INVALID)
    tokens = _proof_tokens(proof)
    if isinstance(tokens, CsrfFailureCode):
        return _rejected(tokens)
    if state.consumed_at is not None:
        return _rejected(CsrfFailureCode.PROOF_CONSUMED)
    if now >= state.expires_at:
        return _rejected(CsrfFailureCode.PROOF_STALE)

    actual = digest_pre_auth_csrf(tokens[0], signing_secret)
    if not _digest_matches(actual, state.token_digest):
        return _rejected(CsrfFailureCode.PROOF_INVALID)
    return _accepted()


def validate_session_csrf(
    proof: CsrfRequestProof,
    state: SessionCsrfState,
    *,
    signing_secret: SecretStr | str | bytes,
    expected_origin: str,
) -> CsrfValidation:
    """Validate the cookie/header pair against its server-side session binding."""

    if not origin_is_exact(proof.origin, expected_origin):
        return _rejected(CsrfFailureCode.ORIGIN_INVALID)
    tokens = _proof_tokens(proof)
    if isinstance(tokens, CsrfFailureCode):
        return _rejected(tokens)

    actual = digest_session_csrf(
        tokens[0],
        state.session_binding,
        signing_secret,
    )
    if not _digest_matches(actual, state.token_digest):
        return _rejected(CsrfFailureCode.PROOF_INVALID)
    return _accepted()
