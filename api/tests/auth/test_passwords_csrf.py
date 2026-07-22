from __future__ import annotations

import hashlib
import hmac
import re
from datetime import UTC, datetime, timedelta

import pytest
from pwdlib import PasswordHash
from pwdlib.hashers.argon2 import Argon2Hasher
from pydantic import SecretStr

import api.app.auth.passwords as password_module
from api.app.auth.csrf import (
    CSRF_TOKEN_BYTES,
    CsrfDigest,
    CsrfFailureCode,
    CsrfRequestProof,
    CsrfToken,
    PreAuthCsrfState,
    SessionCsrfState,
    digest_pre_auth_csrf,
    digest_session_csrf,
    generate_csrf_token,
    origin_is_exact,
    validate_pre_auth_csrf,
    validate_session_csrf,
)
from api.app.auth.passwords import (
    ARGON2_HASH_LENGTH,
    ARGON2_MEMORY_COST,
    ARGON2_PARALLELISM,
    ARGON2_SALT_LENGTH,
    ARGON2_TIME_COST,
    GENERIC_CREDENTIAL_ERROR_CODE,
    GENERIC_CREDENTIAL_ERROR_MESSAGE,
    InvalidCredentialsError,
    hash_password,
    password_needs_rehash,
    require_valid_password,
    verify_password,
    verify_password_and_rehash,
)


PASSWORD = "quant-gym correct horse battery staple 🐯"
WRONG_PASSWORD = "quant-gym wrong password"
PREVIEW_ORIGIN = "https://quantgym-v2-preview.pages.dev"
CSRF_SIGNING_SECRET = SecretStr("csrf_signing_" + "s" * 48)
TOKEN_PATTERN = re.compile(r"^[A-Za-z0-9_-]{43}$")


def _proof(token: str, *, origin: str | None = PREVIEW_ORIGIN) -> CsrfRequestProof:
    return CsrfRequestProof.from_values(
        origin=origin,
        cookie_token=token,
        header_token=token,
    )


def test_password_hashes_use_explicit_strong_argon2id_parameters() -> None:
    first = hash_password(SecretStr(PASSWORD))
    second = hash_password(PASSWORD)

    expected_parameters = (
        f"m={ARGON2_MEMORY_COST},t={ARGON2_TIME_COST},p={ARGON2_PARALLELISM}"
    )
    assert first.startswith(f"$argon2id$v=19${expected_parameters}$")
    assert second.startswith(f"$argon2id$v=19${expected_parameters}$")
    assert first != second
    assert ARGON2_MEMORY_COST >= 65_536
    assert ARGON2_TIME_COST >= 3
    assert ARGON2_PARALLELISM >= 1
    assert ARGON2_HASH_LENGTH >= 32
    assert ARGON2_SALT_LENGTH >= 16
    assert verify_password(PASSWORD, first) is True


def test_password_verification_rehashes_only_after_a_valid_legacy_match() -> None:
    legacy_hasher = PasswordHash(
        (
            Argon2Hasher(
                time_cost=1,
                memory_cost=8_192,
                parallelism=1,
                hash_len=16,
                salt_len=8,
            ),
        )
    )
    legacy_hash = legacy_hasher.hash(PASSWORD)

    assert password_needs_rehash(legacy_hash) is True
    valid = verify_password_and_rehash(PASSWORD, legacy_hash)
    invalid = verify_password_and_rehash(WRONG_PASSWORD, legacy_hash)

    assert valid.verified is True
    assert valid.needs_rehash is True
    replacement = valid.replacement_hash_value()
    assert replacement is not None
    assert verify_password(PASSWORD, replacement) is True
    assert password_needs_rehash(replacement) is False
    assert invalid.verified is False
    assert invalid.replacement_hash_value() is None


@pytest.mark.parametrize("stored_hash", [None, "", "not-an-argon2-hash", "$argon2id$bad"])
def test_wrong_missing_and_malformed_credentials_share_one_generic_failure(
    stored_hash: str | None,
) -> None:
    result = verify_password_and_rehash(WRONG_PASSWORD, stored_hash)
    assert result.verified is False
    assert result.needs_rehash is False
    assert result.replacement_hash_value() is None
    assert verify_password(WRONG_PASSWORD, stored_hash) is False

    with pytest.raises(InvalidCredentialsError) as raised:
        require_valid_password(WRONG_PASSWORD, stored_hash)

    error = raised.value
    assert error.code == GENERIC_CREDENTIAL_ERROR_CODE == "INVALID_CREDENTIALS"
    assert str(error) == GENERIC_CREDENTIAL_ERROR_MESSAGE
    assert repr(error) == "InvalidCredentialsError(code='INVALID_CREDENTIALS')"
    assert WRONG_PASSWORD not in repr(error)
    assert (stored_hash or "not-an-argon2-hash") not in repr(error)


def test_password_verification_result_repr_never_contains_hash_or_password() -> None:
    legacy_hash = PasswordHash(
        (Argon2Hasher(time_cost=1, memory_cost=8_192, parallelism=1),)
    ).hash(PASSWORD)
    result = verify_password_and_rehash(PASSWORD, legacy_hash)

    rendered = repr(result)
    assert "verified=True" in rendered
    assert "replacement_hash=[REDACTED]" in rendered
    assert PASSWORD not in rendered
    assert legacy_hash not in rendered
    assert (result.replacement_hash_value() or "replacement") not in rendered


def test_untrusted_argon_parameters_cannot_force_unbounded_verification_work(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    malicious_hash = (
        "$argon2id$v=19$m=1073741824,t=99,p=64$"
        "c2FsdHNhbHQ$aGFzaGhhc2hoYXNoaGFzaA"
    )
    checked_hashes: list[str] = []

    def record_verification(_password: str, encoded_hash: str) -> tuple[bool, None]:
        checked_hashes.append(encoded_hash)
        return False, None

    monkeypatch.setattr(
        password_module._PASSWORD_HASH,
        "verify_and_update",
        record_verification,
    )

    result = verify_password_and_rehash(PASSWORD, malicious_hash)

    assert result.verified is False
    assert checked_hashes
    assert malicious_hash not in checked_hashes
    assert password_needs_rehash(malicious_hash) is True


def test_csrf_tokens_have_256_bits_of_entropy_and_secret_safe_repr() -> None:
    first = generate_csrf_token()
    second = generate_csrf_token()
    first_value = first.get_secret_value()

    assert CSRF_TOKEN_BYTES == 32
    assert TOKEN_PATTERN.fullmatch(first_value)
    assert TOKEN_PATTERN.fullmatch(second.get_secret_value())
    assert first_value != second.get_secret_value()
    assert first_value not in repr(first)
    assert "REDACTED" in repr(first)


def test_csrf_secret_wrappers_cannot_bypass_validation_via_direct_construction() -> None:
    with pytest.raises(ValueError, match="token is invalid"):
        CsrfToken(SecretStr("short"))
    with pytest.raises(ValueError, match="digest is invalid"):
        CsrfDigest(SecretStr("0" * 63))


def test_csrf_storage_uses_domain_separated_hmac_sha256_digests() -> None:
    token = generate_csrf_token()
    pre_auth = digest_pre_auth_csrf(token, CSRF_SIGNING_SECRET)
    session_a = digest_session_csrf(token, "session-a", CSRF_SIGNING_SECRET)
    session_b = digest_session_csrf(token, "session-b", CSRF_SIGNING_SECRET)

    raw_sha256 = hashlib.sha256(token.get_secret_value().encode()).hexdigest()
    values = {
        pre_auth.get_secret_value(),
        session_a.get_secret_value(),
        session_b.get_secret_value(),
    }
    assert len(values) == 3
    assert raw_sha256 not in values
    assert all(re.fullmatch(r"[0-9a-f]{64}", value) for value in values)
    assert pre_auth.get_secret_value() not in repr(pre_auth)
    assert session_a.get_secret_value() not in repr(session_a)


@pytest.mark.parametrize(
    "supplied",
    [
        None,
        "",
        PREVIEW_ORIGIN + "/",
        PREVIEW_ORIGIN.upper(),
        "https://evil.example",
        PREVIEW_ORIGIN + ".evil.example",
        "null",
        PREVIEW_ORIGIN + " https://evil.example",
    ],
)
def test_origin_validation_requires_the_exact_preview_origin(
    supplied: str | None,
) -> None:
    assert origin_is_exact(supplied, PREVIEW_ORIGIN) is False


def test_origin_validation_accepts_only_the_exact_value() -> None:
    assert origin_is_exact(PREVIEW_ORIGIN, PREVIEW_ORIGIN) is True


def test_valid_one_time_pre_auth_proof_and_all_fixed_rejections() -> None:
    now = datetime(2026, 7, 18, 8, 0, tzinfo=UTC)
    token = generate_csrf_token()
    token_value = token.get_secret_value()
    state = PreAuthCsrfState(
        token_digest=digest_pre_auth_csrf(token, CSRF_SIGNING_SECRET),
        expires_at=now + timedelta(minutes=5),
    )

    valid = validate_pre_auth_csrf(
        _proof(token_value),
        state,
        signing_secret=CSRF_SIGNING_SECRET,
        expected_origin=PREVIEW_ORIGIN,
        now=now,
    )
    assert valid.is_valid is True
    assert valid.failure_code is None

    cases = {
        CsrfFailureCode.ORIGIN_INVALID: (
            _proof(token_value, origin="https://evil.example"),
            state,
            now,
        ),
        CsrfFailureCode.PROOF_MISSING: (
            CsrfRequestProof.from_values(
                origin=PREVIEW_ORIGIN,
                cookie_token=token_value,
                header_token=None,
            ),
            state,
            now,
        ),
        CsrfFailureCode.PROOF_INVALID: (
            CsrfRequestProof.from_values(
                origin=PREVIEW_ORIGIN,
                cookie_token=token_value,
                header_token=generate_csrf_token().get_secret_value(),
            ),
            state,
            now,
        ),
        CsrfFailureCode.PROOF_STALE: (
            _proof(token_value),
            state,
            state.expires_at,
        ),
        CsrfFailureCode.PROOF_CONSUMED: (
            _proof(token_value),
            PreAuthCsrfState(
                token_digest=state.token_digest,
                expires_at=state.expires_at,
                consumed_at=now,
            ),
            now,
        ),
    }
    for expected, (proof, challenge, checked_at) in cases.items():
        result = validate_pre_auth_csrf(
            proof,
            challenge,
            signing_secret=CSRF_SIGNING_SECRET,
            expected_origin=PREVIEW_ORIGIN,
            now=checked_at,
        )
        assert result.is_valid is False
        assert result.failure_code is expected
        assert result.error_code == expected.value


def test_session_proof_is_cryptographically_bound_to_one_session() -> None:
    token = generate_csrf_token()
    token_value = token.get_secret_value()
    session_a = SessionCsrfState(
        session_binding="session-a",
        token_digest=digest_session_csrf(token, "session-a", CSRF_SIGNING_SECRET),
    )
    session_b = SessionCsrfState(
        session_binding="session-b",
        token_digest=session_a.token_digest,
    )

    valid = validate_session_csrf(
        _proof(token_value),
        session_a,
        signing_secret=CSRF_SIGNING_SECRET,
        expected_origin=PREVIEW_ORIGIN,
    )
    rebound = validate_session_csrf(
        _proof(token_value),
        session_b,
        signing_secret=CSRF_SIGNING_SECRET,
        expected_origin=PREVIEW_ORIGIN,
    )

    assert valid.is_valid is True
    assert rebound.is_valid is False
    assert rebound.failure_code is CsrfFailureCode.PROOF_INVALID


def test_csrf_comparisons_use_constant_time_digest_comparison(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    token = generate_csrf_token()
    token_value = token.get_secret_value()
    state = SessionCsrfState(
        session_binding="session-a",
        token_digest=digest_session_csrf(token, "session-a", CSRF_SIGNING_SECRET),
    )
    comparisons: list[tuple[bytes | str, bytes | str]] = []
    real_compare_digest = hmac.compare_digest

    def recording_compare_digest(
        left: bytes | str,
        right: bytes | str,
    ) -> bool:
        comparisons.append((left, right))
        return real_compare_digest(left, right)

    monkeypatch.setattr("api.app.auth.csrf.hmac.compare_digest", recording_compare_digest)

    result = validate_session_csrf(
        _proof(token_value),
        state,
        signing_secret=CSRF_SIGNING_SECRET,
        expected_origin=PREVIEW_ORIGIN,
    )

    assert result.is_valid is True
    assert len(comparisons) >= 3
    assert all(len(left) == len(right) for left, right in comparisons)


def test_csrf_proof_state_and_errors_do_not_reveal_secrets_in_repr() -> None:
    token = generate_csrf_token()
    token_value = token.get_secret_value()
    digest = digest_pre_auth_csrf(token, CSRF_SIGNING_SECRET)
    proof = _proof(token_value)
    state = PreAuthCsrfState(
        token_digest=digest,
        expires_at=datetime(2026, 7, 18, 8, 5, tzinfo=UTC),
    )

    rendered = " ".join((repr(proof), repr(state)))
    assert token_value not in rendered
    assert digest.get_secret_value() not in rendered
    assert "REDACTED" in rendered

    with pytest.raises(ValueError) as raised:
        digest_pre_auth_csrf(token, SecretStr("too-short"))
    assert "too-short" not in repr(raised.value)


def test_pre_auth_expiry_rejects_naive_timestamps_without_secret_leakage() -> None:
    token = generate_csrf_token()
    state = PreAuthCsrfState(
        token_digest=digest_pre_auth_csrf(token, CSRF_SIGNING_SECRET),
        expires_at=datetime(2026, 7, 18, 8, 5),
    )

    with pytest.raises(ValueError, match="timezone-aware"):
        validate_pre_auth_csrf(
            _proof(token.get_secret_value()),
            state,
            signing_secret=CSRF_SIGNING_SECRET,
            expected_origin=PREVIEW_ORIGIN,
            now=datetime(2026, 7, 18, 8, 0, tzinfo=UTC),
        )
