from __future__ import annotations

from dataclasses import dataclass

from argon2 import extract_parameters
from argon2.exceptions import InvalidHashError
from argon2.low_level import Type
from pwdlib import PasswordHash
from pwdlib.exceptions import UnknownHashError
from pwdlib.hashers.argon2 import Argon2Hasher
from pydantic import SecretStr


# Keep these parameters explicit. A dependency-default change must never silently
# weaken password storage, and an intentional increase will trigger rehash-on-login.
ARGON2_TIME_COST = 3
ARGON2_MEMORY_COST = 65_536
ARGON2_PARALLELISM = 4
ARGON2_HASH_LENGTH = 32
ARGON2_SALT_LENGTH = 16

MAX_PASSWORD_BYTES = 1_024
MAX_ENCODED_HASH_BYTES = 1_024
MAX_VERIFY_TIME_COST = ARGON2_TIME_COST
MAX_VERIFY_MEMORY_COST = ARGON2_MEMORY_COST
MAX_VERIFY_PARALLELISM = ARGON2_PARALLELISM
MAX_VERIFY_HASH_LENGTH = 64
MAX_VERIFY_SALT_LENGTH = 64

GENERIC_CREDENTIAL_ERROR_CODE = "INVALID_CREDENTIALS"
GENERIC_CREDENTIAL_ERROR_MESSAGE = "邮箱或密码不正确"


_ARGON2_HASHER = Argon2Hasher(
    time_cost=ARGON2_TIME_COST,
    memory_cost=ARGON2_MEMORY_COST,
    parallelism=ARGON2_PARALLELISM,
    hash_len=ARGON2_HASH_LENGTH,
    salt_len=ARGON2_SALT_LENGTH,
)
_PASSWORD_HASH = PasswordHash((_ARGON2_HASHER,))

# Unknown users and damaged hashes are checked against a real Argon2id hash so
# those paths do not become a cheap account-enumeration oracle.
_DUMMY_PASSWORD_HASH = _PASSWORD_HASH.hash(
    "quantgym-internal-credential-timing-sentinel-v1"
)


class PasswordInputError(ValueError):
    """A fixed, secret-safe error for invalid password input bounds."""

    def __init__(self) -> None:
        super().__init__("password input is invalid")

    def __repr__(self) -> str:
        return "PasswordInputError()"


class InvalidCredentialsError(Exception):
    """The sole public credential-verification failure."""

    code = GENERIC_CREDENTIAL_ERROR_CODE

    def __init__(self) -> None:
        super().__init__(GENERIC_CREDENTIAL_ERROR_MESSAGE)

    def __repr__(self) -> str:
        return f"{type(self).__name__}(code={self.code!r})"


@dataclass(frozen=True, slots=True, repr=False)
class PasswordVerification:
    """A verification outcome whose optional replacement hash stays redacted."""

    verified: bool
    _replacement_hash: SecretStr | None = None

    @property
    def needs_rehash(self) -> bool:
        return self.verified and self._replacement_hash is not None

    def replacement_hash_value(self) -> str | None:
        if self._replacement_hash is None:
            return None
        return self._replacement_hash.get_secret_value()

    def __repr__(self) -> str:
        replacement = "[REDACTED]" if self._replacement_hash is not None else "None"
        return (
            f"{type(self).__name__}(verified={self.verified!r}, "
            f"replacement_hash={replacement})"
        )


def _secret_text(value: SecretStr | str) -> str:
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    if isinstance(value, str):
        return value
    raise PasswordInputError()


def _bounded_password(value: SecretStr | str) -> str:
    password = _secret_text(value)
    byte_length = len(password.encode("utf-8"))
    if byte_length == 0 or byte_length > MAX_PASSWORD_BYTES:
        raise PasswordInputError()
    return password


def _verification_password(value: SecretStr | str) -> str | None:
    try:
        return _bounded_password(value)
    except (PasswordInputError, UnicodeError):
        return None


def _supported_hash(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    try:
        if not value or len(value.encode("utf-8")) > MAX_ENCODED_HASH_BYTES:
            return None
    except UnicodeError:
        return None
    if not _ARGON2_HASHER.identify(value):
        return None
    try:
        parameters = extract_parameters(value)
    except (InvalidHashError, TypeError, ValueError):
        return None
    if not (
        parameters.type is Type.ID
        and parameters.version == 19
        and 1 <= parameters.time_cost <= MAX_VERIFY_TIME_COST
        and 8 <= parameters.memory_cost <= MAX_VERIFY_MEMORY_COST
        and 1 <= parameters.parallelism <= MAX_VERIFY_PARALLELISM
        and 16 <= parameters.hash_len <= MAX_VERIFY_HASH_LENGTH
        and 8 <= parameters.salt_len <= MAX_VERIFY_SALT_LENGTH
    ):
        return None
    return value


def hash_password(password: SecretStr | str) -> str:
    """Return a newly salted Argon2id password hash."""

    try:
        bounded = _bounded_password(password)
    except UnicodeError:
        # Do not retain an encoding exception whose repr may include password text.
        raise PasswordInputError() from None
    return _PASSWORD_HASH.hash(bounded)


def password_needs_rehash(encoded_hash: str | None) -> bool:
    """Report whether a stored hash should be replaced after a valid login."""

    supported = _supported_hash(encoded_hash)
    if supported is None:
        return True
    try:
        return _ARGON2_HASHER.check_needs_rehash(supported)
    except (ValueError, TypeError):
        return True


def verify_password_and_rehash(
    password: SecretStr | str,
    encoded_hash: str | None,
) -> PasswordVerification:
    """Verify a password and prepare a stronger hash when policy has advanced.

    Missing, malformed, unsupported, overlong, and mismatching credentials all
    take the same public failure path. Unsupported stored values still execute a
    real Argon2id verification using the timing sentinel.
    """

    bounded = _verification_password(password)
    supplied_hash = _supported_hash(encoded_hash)
    verification_hash = supplied_hash or _DUMMY_PASSWORD_HASH

    # An overlong/invalid candidate is replaced only for the timing operation;
    # it can never be accepted, even if it somehow equals the sentinel password.
    candidate = bounded or "quantgym-invalid-password-timing-sentinel-v1"
    try:
        verified, replacement_hash = _PASSWORD_HASH.verify_and_update(
            candidate,
            verification_hash,
        )
    except (UnknownHashError, ValueError, TypeError):
        # This is defensive: _supported_hash already ensures the selected hash
        # is Argon2. Keep the external result generic if a backend rejects it.
        verified, replacement_hash = False, None

    if bounded is None or supplied_hash is None or not verified:
        return PasswordVerification(verified=False)
    return PasswordVerification(
        verified=True,
        _replacement_hash=(
            SecretStr(replacement_hash) if replacement_hash is not None else None
        ),
    )


def verify_password(password: SecretStr | str, encoded_hash: str | None) -> bool:
    return verify_password_and_rehash(password, encoded_hash).verified


def require_valid_password(
    password: SecretStr | str,
    encoded_hash: str | None,
) -> PasswordVerification:
    result = verify_password_and_rehash(password, encoded_hash)
    if not result.verified:
        raise InvalidCredentialsError()
    return result
