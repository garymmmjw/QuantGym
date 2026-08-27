"""Lifecycle-owned authentication services for the isolated Preview API."""

from __future__ import annotations

import base64
import time
from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from typing import Any

import httpx

from ..config import Settings, parse_pkce_encryption_keys
from .challenge_limits import PreAuthChallengeRateLimiter
from .google import GoogleOAuthFlow, RotatingVerifierCipher
from .google_store import SqlAlchemyGoogleOAuthChallengeStore
from .service import (
    AuthService,
    NullPasswordResetSender,
    PasswordResetSender,
    SqlAlchemyAuthRepository,
    utc_now,
)


@dataclass(slots=True, repr=False)
class AuthRuntime:
    """Services that share the API application's database and lifecycle."""

    service: AuthService
    google_flow: GoogleOAuthFlow

    async def aclose(self) -> None:
        await self.google_flow.aclose()


def build_auth_runtime(
    engine: Any,
    settings: Settings,
    *,
    http_transport: httpx.AsyncBaseTransport | None = None,
    clock: Callable[[], datetime] = utc_now,
    monotonic: Callable[[], float] = time.monotonic,
    reset_sender: PasswordResetSender | None = None,
) -> AuthRuntime:
    """Construct the auth graph without reading environment values a second time."""

    encoded_keys = parse_pkce_encryption_keys(settings.pkce_encryption_keys)
    verifier_keys = {
        key_id: base64.urlsafe_b64decode(encoded_key.encode("ascii"))
        for key_id, encoded_key in encoded_keys.items()
    }
    challenge_rate_limiter = PreAuthChallengeRateLimiter(
        signing_secret=settings.session_secret,
        monotonic=monotonic,
    )
    challenge_store = SqlAlchemyGoogleOAuthChallengeStore(engine)
    google_flow = GoogleOAuthFlow(
        client_id=settings.google_client_id,
        client_secret=settings.google_client_secret.get_secret_value(),
        redirect_uri=settings.google_redirect_uri,
        challenge_store=challenge_store,
        verifier_cipher=RotatingVerifierCipher(
            active_key_id=settings.pkce_active_key_id,
            keys=verifier_keys,
        ),
        http_transport=http_transport,
        clock=clock,
        start_rate_limiter=challenge_rate_limiter,
    )
    if reset_sender is None:
        if settings.password_reset_delivery_mode != "disabled":
            raise ValueError("password reset delivery mode is unavailable")
        reset_sender = NullPasswordResetSender()
    service = AuthService(
        repository=SqlAlchemyAuthRepository(engine),
        session_secret=settings.session_secret,
        csrf_signing_secret=settings.csrf_signing_secret,
        preview_origin=settings.allowed_origins[0],
        clock=clock,
        monotonic=monotonic,
        reset_sender=reset_sender,
        pre_auth_rate_limiter=challenge_rate_limiter,
    )
    return AuthRuntime(service=service, google_flow=google_flow)
