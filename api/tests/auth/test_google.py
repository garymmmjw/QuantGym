from __future__ import annotations

import asyncio
import inspect
import json
from collections.abc import AsyncIterator
from dataclasses import asdict
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, urlsplit

import httpx
import jwt
import pytest
from cryptography.hazmat.primitives.asymmetric import rsa
from jwt.algorithms import RSAAlgorithm
from pydantic import SecretStr

from api.app.auth.challenge_limits import PreAuthChallengeRateLimiter
from api.app.auth.google import (
    GOOGLE_AUTHORIZATION_ENDPOINT,
    GOOGLE_ISSUER,
    GOOGLE_JWKS_ENDPOINT,
    GOOGLE_REDIRECT_URI,
    GOOGLE_TOKEN_ENDPOINT,
    ClaimedGoogleOAuthChallenge,
    GoogleOAuthChallengeCapacityError,
    GoogleOAuthCallbackError,
    GoogleOAuthChallengeForPersistence,
    GoogleOAuthFlow,
    GoogleOAuthStartError,
    GoogleOAuthStartRateLimitedError,
    PkceVerifierDeletion,
    RotatingVerifierCipher,
    VerifierCipherError,
    hash_oauth_value,
)


NOW = datetime.now(UTC).replace(microsecond=0)
CLIENT_ID = "123456789-quantgym-preview.apps.googleusercontent.com"
CLIENT_SECRET = "google-client-secret-for-tests"
LIMIT_SECRET = "google-start-limit-secret-for-tests-00000000000000000000"
ACTIVE_KEY = bytes(range(32))
OLD_KEY = bytes(reversed(range(32)))
BROWSER_BINDING = "A" * 43
OTHER_BROWSER_BINDING = "B" * 43


class MutableClock:
    def __init__(self, value: datetime = NOW) -> None:
        self.value = value

    def __call__(self) -> datetime:
        return self.value


class MemoryChallengeStore:
    def __init__(self) -> None:
        self.records: dict[str, GoogleOAuthChallengeForPersistence] = {}
        self.created: list[GoogleOAuthChallengeForPersistence] = []
        self.claims: list[tuple[str, datetime, PkceVerifierDeletion]] = []
        self.accept_creates = True

    async def create(self, challenge: GoogleOAuthChallengeForPersistence) -> bool:
        self.records = {
            state_hash: record
            for state_hash, record in self.records.items()
            if record.expires_at > challenge.created_at
        }
        if not self.accept_creates:
            return False
        self.created.append(challenge)
        self.records[challenge.state_hash] = challenge
        return True

    async def claim_and_delete_verifier(
        self,
        *,
        state_hash: str,
        claimed_at: datetime,
        verifier_deletion: PkceVerifierDeletion,
    ) -> ClaimedGoogleOAuthChallenge | None:
        self.claims.append((state_hash, claimed_at, verifier_deletion))
        record = self.records.pop(state_hash, None)
        if record is None:
            return None
        return ClaimedGoogleOAuthChallenge(
            state_hash=record.state_hash,
            nonce_hash=record.nonce_hash,
            pkce_verifier_ciphertext=record.pkce_verifier_ciphertext,
            pkce_key_id=record.pkce_key_id,
            redirect_path=record.redirect_path,
            expires_at=record.expires_at,
        )


class GoogleProvider:
    def __init__(self, private_key: rsa.RSAPrivateKey) -> None:
        self.private_key = private_key
        self.nonce = ""
        self.claim_overrides: dict[str, Any] = {}
        self.algorithm = "RS256"
        self.kid = "preview-google-key"
        self.token_status = 200
        self.jwks_status = 200
        self.token_body_override: Any | None = None
        self.jwks_body_override: Any | None = None
        self.requests: list[httpx.Request] = []

    def _claims(self) -> dict[str, Any]:
        claims: dict[str, Any] = {
            "iss": GOOGLE_ISSUER,
            "aud": CLIENT_ID,
            "exp": int((NOW + timedelta(minutes=5)).timestamp()),
            "iat": int((NOW - timedelta(seconds=5)).timestamp()),
            "nonce": self.nonce,
            "sub": "google-subject-123",
            "email": "preview.user@example.com",
            "email_verified": True,
            "name": "Preview User",
            "picture": "https://images.example.test/avatar.png",
        }
        claims.update(self.claim_overrides)
        return claims

    def _id_token(self) -> str:
        if self.algorithm == "RS256":
            return jwt.encode(
                self._claims(),
                self.private_key,
                algorithm="RS256",
                headers={"kid": self.kid},
            )
        return jwt.encode(
            self._claims(),
            "not-an-rsa-key-but-at-least-thirty-two-bytes",
            algorithm=self.algorithm,
            headers={"kid": self.kid},
        )

    def _jwks(self) -> dict[str, Any]:
        key = json.loads(RSAAlgorithm.to_jwk(self.private_key.public_key()))
        key.update({"kid": self.kid, "alg": "RS256", "use": "sig"})
        return {"keys": [key]}

    def __call__(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        if str(request.url) == GOOGLE_TOKEN_ENDPOINT:
            body = (
                self.token_body_override
                if self.token_body_override is not None
                else {"id_token": self._id_token(), "access_token": "must-not-escape"}
            )
            return httpx.Response(self.token_status, json=body, request=request)
        if str(request.url) == GOOGLE_JWKS_ENDPOINT:
            body = (
                self.jwks_body_override
                if self.jwks_body_override is not None
                else self._jwks()
            )
            return httpx.Response(self.jwks_status, json=body, request=request)
        return httpx.Response(
            599,
            text="unexpected provider endpoint",
            request=request,
        )


class BlockingCloseTransport(httpx.AsyncBaseTransport):
    def __init__(self) -> None:
        self.close_started = asyncio.Event()
        self.release_close = asyncio.Event()
        self.close_calls = 0
        self.closed = False

    async def handle_async_request(self, request: httpx.Request) -> httpx.Response:
        return httpx.Response(599, request=request)

    async def aclose(self) -> None:
        self.close_calls += 1
        self.close_started.set()
        await self.release_close.wait()
        self.closed = True


class TrackingStream(httpx.AsyncByteStream):
    def __init__(self, chunks: list[bytes]) -> None:
        self.chunks = chunks
        self.chunks_yielded = 0

    async def __aiter__(self) -> AsyncIterator[bytes]:
        for chunk in self.chunks:
            self.chunks_yielded += 1
            yield chunk


@pytest.fixture(scope="module")
def private_key() -> rsa.RSAPrivateKey:
    return rsa.generate_private_key(public_exponent=65537, key_size=2048)


def make_cipher(*, active_key_id: str = "2026-07") -> RotatingVerifierCipher:
    return RotatingVerifierCipher(
        active_key_id=active_key_id,
        keys={"2026-06": OLD_KEY, "2026-07": ACTIVE_KEY},
    )


def make_flow(
    *,
    store: MemoryChallengeStore,
    provider: GoogleProvider,
    clock: MutableClock,
    cipher: RotatingVerifierCipher | None = None,
    redirect_uri: str = GOOGLE_REDIRECT_URI,
    start_rate_limiter: PreAuthChallengeRateLimiter | None = None,
) -> GoogleOAuthFlow:
    return GoogleOAuthFlow(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=redirect_uri,
        challenge_store=store,
        verifier_cipher=cipher or make_cipher(),
        http_transport=httpx.MockTransport(provider),
        clock=clock,
        start_rate_limiter=start_rate_limiter
        or PreAuthChallengeRateLimiter(
            signing_secret=LIMIT_SECRET, monotonic=lambda: 0
        ),
    )


def redirect_values(location: str) -> dict[str, str]:
    parsed = urlsplit(location)
    assert f"{parsed.scheme}://{parsed.netloc}{parsed.path}" == GOOGLE_AUTHORIZATION_ENDPOINT
    return {key: values[0] for key, values in parse_qs(parsed.query).items()}


@pytest.mark.asyncio
async def test_start_builds_authorization_code_pkce_s256_and_persists_no_raw_values(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    clock = MutableClock()
    cipher = make_cipher()
    flow = make_flow(store=store, provider=provider, clock=clock, cipher=cipher)

    redirect = await flow.start(
        redirect_path="/dashboard",
        browser_binding=SecretStr(BROWSER_BINDING),
    )
    query = redirect_values(redirect.location)

    assert query["client_id"] == CLIENT_ID
    assert query["redirect_uri"] == GOOGLE_REDIRECT_URI
    assert query["response_type"] == "code"
    assert query["scope"] == "openid email profile"
    assert query["code_challenge_method"] == "S256"
    assert query["state"]
    assert len(query["state"]) == 86
    assert set(query["state"]) <= set(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
    )
    assert query["nonce"]
    assert len(store.created) == 1

    persisted = store.created[0]
    verifier = cipher.decrypt(
        ciphertext=persisted.pkce_verifier_ciphertext,
        key_id=persisted.pkce_key_id,
        state_hash=persisted.state_hash,
    )
    assert 43 <= len(verifier) <= 128
    assert query["code_challenge"] == RotatingVerifierCipher.pkce_s256(verifier)
    assert persisted.token_hash == hash_oauth_value(query["state"])
    assert persisted.state_hash == hash_oauth_value(query["state"])
    assert persisted.nonce_hash == hash_oauth_value(query["nonce"])
    assert persisted.pkce_key_id == "2026-07"
    assert persisted.redirect_path == "/dashboard"
    assert persisted.created_at == NOW
    assert persisted.expires_at == NOW + timedelta(minutes=10)
    persisted_text = repr(persisted) + repr(asdict(persisted))
    for raw_value in (
        query["state"],
        query["nonce"],
        verifier,
        CLIENT_SECRET,
        BROWSER_BINDING,
    ):
        assert raw_value not in persisted_text
    assert not hasattr(persisted, "state")
    assert not hasattr(persisted, "nonce")
    assert not hasattr(persisted, "pkce_verifier")
    assert not hasattr(persisted, "browser_binding")
    assert "state=" not in repr(redirect)
    assert "nonce=" not in repr(redirect)

    await flow.aclose()


@pytest.mark.asyncio
async def test_start_allows_multiple_independent_challenges_for_one_browser(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())

    first = redirect_values(
        (await flow.start(browser_binding=BROWSER_BINDING)).location
    )["state"]
    second = redirect_values(
        (await flow.start(browser_binding=SecretStr(BROWSER_BINDING))).location
    )["state"]

    assert first != second
    assert len(first) == len(second) == 86
    assert len(store.records) == 2
    assert {hash_oauth_value(first), hash_oauth_value(second)} == set(store.records)
    await flow.aclose()


@pytest.mark.asyncio
async def test_start_rate_limit_is_checked_before_persisting_more_challenges(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    limiter = PreAuthChallengeRateLimiter(
        signing_secret=LIMIT_SECRET,
        browser_max_starts=1,
        ip_max_starts=2,
        window_seconds=60,
        monotonic=lambda: 0,
    )
    flow = make_flow(
        store=store,
        provider=GoogleProvider(private_key),
        clock=MutableClock(),
        start_rate_limiter=limiter,
    )
    await flow.start(browser_binding=BROWSER_BINDING, client_ip="203.0.113.9")

    with pytest.raises(GoogleOAuthStartRateLimitedError) as limited:
        await flow.start(browser_binding=BROWSER_BINDING, client_ip="203.0.113.10")

    assert limited.value.code == "AUTH_CHALLENGE_RATE_LIMITED"
    assert limited.value.status_code == 429
    assert limited.value.retry_after == 60
    assert len(store.created) == 1
    await flow.aclose()


@pytest.mark.asyncio
async def test_start_maps_atomic_store_capacity_rejection_to_stable_error(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    store.accept_creates = False
    flow = make_flow(
        store=store,
        provider=GoogleProvider(private_key),
        clock=MutableClock(),
    )

    with pytest.raises(GoogleOAuthChallengeCapacityError) as limited:
        await flow.start(browser_binding=BROWSER_BINDING, client_ip="203.0.113.9")

    assert limited.value.code == "GOOGLE_OAUTH_CAPACITY_LIMITED"
    assert limited.value.status_code == 503
    assert limited.value.retry_after == 30
    assert store.created == []
    await flow.aclose()


@pytest.mark.asyncio
async def test_browser_binding_is_required_and_malformed_values_are_fixed_safe_errors(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())

    with pytest.raises(TypeError, match="browser_binding"):
        await flow.start()  # type: ignore[call-arg]

    for malformed in (None, "", "short", "!" * 43, "A" * 42, "A" * 44):
        with pytest.raises(GoogleOAuthStartError) as invalid:
            await flow.start(browser_binding=malformed)  # type: ignore[arg-type]
        assert str(invalid.value) == "Google sign-in could not be started."

    assert store.created == []
    await flow.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "redirect_path",
    [
        "https://attacker.invalid/",
        "//attacker.invalid/path",
        "/dashboard#fragment",
        "/dashboard\\admin",
        "/dashboard//admin",
        "/dashboard/./admin",
        "/dashboard/../admin",
        "/dashboard/%2e/admin",
        "/dashboard/%2Fadmin",
        "/dashboard/%5cadmin",
        "/dashboard/%252fadmin",
        "/dashboard/%zzadmin",
    ],
)
async def test_start_rejects_non_normalized_redirect_paths(
    private_key: rsa.RSAPrivateKey,
    redirect_path: str,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())

    with pytest.raises(GoogleOAuthStartError) as invalid:
        await flow.start(
            redirect_path=redirect_path,
            browser_binding=BROWSER_BINDING,
        )

    assert invalid.value.code == "GOOGLE_OAUTH_UNAVAILABLE"
    assert str(invalid.value) == "Google sign-in could not be started."
    assert store.created == []
    await flow.aclose()


@pytest.mark.asyncio
async def test_start_atomically_replaces_expired_verifier_ciphertext(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    clock = MutableClock()
    flow = make_flow(store=store, provider=provider, clock=clock)
    first = await flow.start(browser_binding=BROWSER_BINDING)
    first_state_hash = hash_oauth_value(redirect_values(first.location)["state"])
    assert first_state_hash in store.records

    clock.value = NOW + timedelta(minutes=10, microseconds=1)
    await flow.start(browser_binding=BROWSER_BINDING)

    assert first_state_hash not in store.records
    assert len(store.records) == 1
    assert store.created[-1].created_at == clock.value
    await flow.aclose()


def test_rotating_cipher_recovers_old_key_binds_state_and_models_atomic_deletion() -> None:
    old_cipher = make_cipher(active_key_id="2026-06")
    state_hash = hash_oauth_value("state-one")
    encrypted = old_cipher.encrypt(
        verifier="A" * 43,
        state_hash=state_hash,
    )
    rotated_cipher = make_cipher(active_key_id="2026-07")

    assert encrypted.key_id == "2026-06"
    assert rotated_cipher.decrypt(
        ciphertext=encrypted.ciphertext,
        key_id=encrypted.key_id,
        state_hash=state_hash,
    ) == "A" * 43
    with pytest.raises(VerifierCipherError) as mismatch:
        rotated_cipher.decrypt(
            ciphertext=encrypted.ciphertext,
            key_id=encrypted.key_id,
            state_hash=hash_oauth_value("different-state"),
        )
    assert str(mismatch.value) == "The OAuth verifier could not be recovered."
    assert encrypted.ciphertext.hex() not in repr(mismatch.value)

    deletion = PkceVerifierDeletion(consumed_at=NOW)
    assert deletion.pkce_verifier_ciphertext is None
    assert deletion.pkce_key_id is None
    assert deletion.consumed_at == NOW


@pytest.mark.asyncio
async def test_callback_exchanges_exact_redirect_with_httpx_verifies_identity_and_rejects_replay(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    clock = MutableClock()
    cipher = make_cipher()
    flow = make_flow(store=store, provider=provider, clock=clock, cipher=cipher)
    start = await flow.start(
        redirect_path="/practice",
        browser_binding=BROWSER_BINDING,
    )
    query = redirect_values(start.location)
    provider.nonce = query["nonce"]
    persisted = store.created[0]
    expected_verifier = cipher.decrypt(
        ciphertext=persisted.pkce_verifier_ciphertext,
        key_id=persisted.pkce_key_id,
        state_hash=persisted.state_hash,
    )

    identity = await flow.complete_callback(
        code="one-time-authorization-code",
        state=query["state"],
        browser_binding=BROWSER_BINDING,
    )

    assert identity.subject == "google-subject-123"
    assert identity.email == "preview.user@example.com"
    assert identity.email_verified is True
    assert identity.name == "Preview User"
    assert identity.picture is None
    assert identity.redirect_path == "/practice"
    assert [str(request.url) for request in provider.requests] == [
        GOOGLE_TOKEN_ENDPOINT,
        GOOGLE_JWKS_ENDPOINT,
    ]
    token_request = provider.requests[0]
    assert token_request.method == "POST"
    assert token_request.headers["content-type"].startswith(
        "application/x-www-form-urlencoded"
    )
    form = {
        key: values[0]
        for key, values in parse_qs(token_request.content.decode()).items()
    }
    assert form == {
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": "one-time-authorization-code",
        "code_verifier": expected_verifier,
        "grant_type": "authorization_code",
        "redirect_uri": GOOGLE_REDIRECT_URI,
    }
    assert store.claims[0][0] == hash_oauth_value(query["state"])
    assert store.claims[0][2] == PkceVerifierDeletion(consumed_at=NOW)

    with pytest.raises(GoogleOAuthCallbackError) as replay:
        await flow.complete_callback(
            code="one-time-authorization-code",
            state=query["state"],
            browser_binding=BROWSER_BINDING,
        )
    assert replay.value.code == "GOOGLE_OAUTH_FAILED"
    assert replay.value.status_code == 400
    assert str(replay.value) == "Google sign-in could not be completed."
    assert len(provider.requests) == 2
    await flow.aclose()


@pytest.mark.asyncio
async def test_callback_binding_mismatch_cannot_claim_and_initiating_browser_can_finish(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())
    start = await flow.start(browser_binding=BROWSER_BINDING)
    values = redirect_values(start.location)
    state_hash = hash_oauth_value(values["state"])
    provider.nonce = values["nonce"]

    with pytest.raises(GoogleOAuthCallbackError) as swapped:
        await flow.complete_callback(
            code="attacker-code",
            state=values["state"],
            browser_binding=OTHER_BROWSER_BINDING,
        )

    assert str(swapped.value) == "Google sign-in could not be completed."
    assert store.claims == []
    assert state_hash in store.records
    assert provider.requests == []

    identity = await flow.complete_callback(
        code="initiating-browser-code",
        state=values["state"],
        browser_binding=SecretStr(BROWSER_BINDING),
    )

    assert identity.subject == "google-subject-123"
    assert len(store.claims) == 1
    assert state_hash not in store.records
    assert [str(request.url) for request in provider.requests] == [
        GOOGLE_TOKEN_ENDPOINT,
        GOOGLE_JWKS_ENDPOINT,
    ]
    await flow.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "malformed_binding",
    [None, "", "short", "!" * 43, "A" * 42, "A" * 44],
)
async def test_callback_rejects_malformed_browser_binding_before_claim(
    private_key: rsa.RSAPrivateKey,
    malformed_binding: object,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())
    start = await flow.start(browser_binding=BROWSER_BINDING)
    state = redirect_values(start.location)["state"]
    state_hash = hash_oauth_value(state)

    with pytest.raises(GoogleOAuthCallbackError) as invalid:
        await flow.complete_callback(
            code="must-not-be-used",
            state=state,
            browser_binding=malformed_binding,  # type: ignore[arg-type]
        )

    assert str(invalid.value) == "Google sign-in could not be completed."
    assert store.claims == []
    assert state_hash in store.records
    assert provider.requests == []
    await flow.aclose()


@pytest.mark.asyncio
async def test_expired_callback_atomically_deletes_verifier_without_provider_request(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    clock = MutableClock()
    flow = make_flow(store=store, provider=provider, clock=clock)
    start = await flow.start(browser_binding=BROWSER_BINDING)
    state = redirect_values(start.location)["state"]
    clock.value = NOW + timedelta(minutes=10, microseconds=1)

    with pytest.raises(GoogleOAuthCallbackError) as expired:
        await flow.complete_callback(
            code="code",
            state=state,
            browser_binding=BROWSER_BINDING,
        )

    assert str(expired.value) == "Google sign-in could not be completed."
    assert provider.requests == []
    assert store.records == {}
    assert store.claims[-1][2].pkce_verifier_ciphertext is None
    assert store.claims[-1][2].pkce_key_id is None
    await flow.aclose()


@pytest.mark.asyncio
async def test_provider_error_consumes_valid_state_and_returns_one_fixed_safe_error(
    private_key: rsa.RSAPrivateKey,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())
    start = await flow.start(browser_binding=BROWSER_BINDING)
    state = redirect_values(start.location)["state"]

    with pytest.raises(GoogleOAuthCallbackError) as denied:
        await flow.complete_callback(
            code=None,
            state=state,
            provider_error="access_denied-with-sensitive-detail",
            browser_binding=BROWSER_BINDING,
        )

    assert denied.value.code == "GOOGLE_OAUTH_FAILED"
    assert str(denied.value) == "Google sign-in could not be completed."
    assert "access_denied" not in str(denied.value)
    assert state not in repr(denied.value)
    assert store.records == {}
    assert provider.requests == []
    await flow.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    ("code", "state"),
    [
        (None, None),
        ("", ""),
        ("code", "short"),
        ("code\nsecret", "short"),
        ("A" * 4097, "short"),
    ],
)
async def test_malformed_callback_boundaries_use_fixed_error_and_never_reach_storage_or_http(
    private_key: rsa.RSAPrivateKey,
    code: str | None,
    state: str | None,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    flow = make_flow(store=store, provider=provider, clock=MutableClock())

    with pytest.raises(GoogleOAuthCallbackError) as invalid:
        await flow.complete_callback(
            code=code,
            state=state,
            browser_binding=BROWSER_BINDING,
        )

    assert invalid.value.code == "GOOGLE_OAUTH_FAILED"
    assert str(invalid.value) == "Google sign-in could not be completed."
    assert store.claims == []
    assert provider.requests == []
    await flow.aclose()


async def callback_with_claim_overrides(
    *,
    private_key: rsa.RSAPrivateKey,
    overrides: dict[str, Any],
    algorithm: str = "RS256",
) -> tuple[GoogleOAuthCallbackError, GoogleProvider]:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    provider.claim_overrides = overrides
    provider.algorithm = algorithm
    flow = make_flow(store=store, provider=provider, clock=MutableClock())
    start = await flow.start(browser_binding=BROWSER_BINDING)
    values = redirect_values(start.location)
    provider.nonce = values["nonce"]
    try:
        with pytest.raises(GoogleOAuthCallbackError) as caught:
            await flow.complete_callback(
                code="sensitive-code",
                state=values["state"],
                browser_binding=BROWSER_BINDING,
            )
        return caught.value, provider
    finally:
        await flow.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "overrides",
    [
        {"iss": "https://evil.example.test"},
        {"aud": "different-client.apps.googleusercontent.com"},
        {"exp": int((NOW - timedelta(seconds=1)).timestamp())},
        {"exp": "not-a-timestamp"},
        {"iat": int((NOW + timedelta(minutes=2)).timestamp())},
        {"iat": "not-a-timestamp"},
        {"nonce": "wrong-nonce"},
        {"nonce": None},
        {"sub": ""},
        {"sub": "contains whitespace"},
        {"sub": None},
    ],
)
async def test_id_token_rejects_wrong_fixed_claims_with_one_safe_error(
    private_key: rsa.RSAPrivateKey,
    overrides: dict[str, Any],
) -> None:
    error, provider = await callback_with_claim_overrides(
        private_key=private_key,
        overrides=overrides,
    )
    assert error.code == "GOOGLE_OAUTH_FAILED"
    assert str(error) == "Google sign-in could not be completed."
    assert "sensitive-code" not in repr(error)
    assert len(provider.requests) in {1, 2}


@pytest.mark.asyncio
async def test_id_token_allows_only_rs256_even_when_jwk_kid_exists(
    private_key: rsa.RSAPrivateKey,
) -> None:
    error, provider = await callback_with_claim_overrides(
        private_key=private_key,
        overrides={},
        algorithm="HS256",
    )
    assert error.code == "GOOGLE_OAUTH_FAILED"
    assert str(error) == "Google sign-in could not be completed."
    assert len(provider.requests) == 1


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "failure_kind",
    ["token_status", "token_json", "jwks_status", "jwks_json"],
)
async def test_provider_failures_never_leak_response_secrets(
    private_key: rsa.RSAPrivateKey,
    failure_kind: str,
) -> None:
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    if failure_kind == "token_status":
        provider.token_status = 400
        provider.token_body_override = {"error_description": "provider-secret-detail"}
    elif failure_kind == "token_json":
        provider.token_body_override = {"id_token": "provider-secret-detail"}
    elif failure_kind == "jwks_status":
        provider.jwks_status = 503
        provider.jwks_body_override = {"private": "provider-secret-detail"}
    else:
        provider.jwks_body_override = {"keys": "provider-secret-detail"}
    flow = make_flow(store=store, provider=provider, clock=MutableClock())
    start = await flow.start(browser_binding=BROWSER_BINDING)
    values = redirect_values(start.location)
    provider.nonce = values["nonce"]

    with pytest.raises(GoogleOAuthCallbackError) as failed:
        await flow.complete_callback(
            code="authorization-code-secret",
            state=values["state"],
            browser_binding=BROWSER_BINDING,
        )

    rendered = str(failed.value) + repr(failed.value)
    assert rendered == (
        "Google sign-in could not be completed."
        "GoogleOAuthCallbackError('Google sign-in could not be completed.')"
    )
    for secret in (
        "provider-secret-detail",
        "authorization-code-secret",
        values["state"],
        values["nonce"],
        CLIENT_SECRET,
    ):
        assert secret not in rendered
    assert store.records == {}
    await flow.aclose()


@pytest.mark.asyncio
@pytest.mark.parametrize("declared_length", [True, False])
async def test_provider_response_is_bounded_before_json_parsing(
    declared_length: bool,
) -> None:
    store = MemoryChallengeStore()
    stream = TrackingStream(
        [
            b'{"id_token":"' + b"x" * 700_000,
            b"y" * 700_000,
            b"provider-secret-tail-that-must-never-be-read",
        ]
    )

    def oversized_provider(request: httpx.Request) -> httpx.Response:
        headers = {"Content-Type": "application/json"}
        if declared_length:
            headers["Content-Length"] = str(1_400_100)
        return httpx.Response(200, headers=headers, stream=stream, request=request)

    flow = GoogleOAuthFlow(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=GOOGLE_REDIRECT_URI,
        challenge_store=store,
        verifier_cipher=make_cipher(),
        http_transport=httpx.MockTransport(oversized_provider),
        clock=MutableClock(),
        start_rate_limiter=PreAuthChallengeRateLimiter(
            signing_secret=LIMIT_SECRET,
            monotonic=lambda: 0,
        ),
    )
    start = await flow.start(browser_binding=BROWSER_BINDING)
    values = redirect_values(start.location)

    with pytest.raises(GoogleOAuthCallbackError) as failed:
        await flow.complete_callback(
            code="bounded-code",
            state=values["state"],
            browser_binding=BROWSER_BINDING,
        )

    assert str(failed.value) == "Google sign-in could not be completed."
    assert stream.chunks_yielded == (0 if declared_length else 2)
    assert store.records == {}
    await flow.aclose()


def test_redirect_uri_is_the_one_preview_callback_and_other_values_are_rejected(
    private_key: rsa.RSAPrivateKey,
) -> None:
    assert GOOGLE_REDIRECT_URI == (
        "https://quantgym-v2-preview.pages.dev/api/v2/auth/google/callback"
    )
    store = MemoryChallengeStore()
    provider = GoogleProvider(private_key)
    with pytest.raises(ValueError, match="redirect URI"):
        make_flow(
            store=store,
            provider=provider,
            clock=MutableClock(),
            redirect_uri=(
                "https://quantgym-v2-preview-api.onrender.com"
                "/api/v2/auth/google/callback"
            ),
        )


@pytest.mark.asyncio
async def test_close_is_reusable_and_finishes_after_caller_cancellation() -> None:
    transport = BlockingCloseTransport()
    store = MemoryChallengeStore()
    flow = GoogleOAuthFlow(
        client_id=CLIENT_ID,
        client_secret=CLIENT_SECRET,
        redirect_uri=GOOGLE_REDIRECT_URI,
        challenge_store=store,
        verifier_cipher=make_cipher(),
        http_transport=transport,
        clock=MutableClock(),
        start_rate_limiter=PreAuthChallengeRateLimiter(
            signing_secret=LIMIT_SECRET,
            monotonic=lambda: 0,
        ),
    )

    first_close = asyncio.create_task(flow.aclose())
    await transport.close_started.wait()
    first_close.cancel()
    with pytest.raises(asyncio.CancelledError):
        await first_close
    assert transport.closed is False

    transport.release_close.set()
    await flow.aclose()

    assert transport.closed is True
    assert transport.close_calls == 1


def test_production_module_has_no_google_tokeninfo_debug_path() -> None:
    from api.app.auth import google

    assert "token" + "info" not in inspect.getsource(google).lower()
