"""Current-user application service kept separate from the HTTP boundary."""

from __future__ import annotations

from pydantic import SecretStr

from ..auth.service import AuthService
from .models import MeResponse


def get_current_user(
    auth_service: AuthService,
    session_token: SecretStr | str | None,
) -> MeResponse:
    """Resolve the public user projection without exposing persistence records."""

    current_user = auth_service.me(session_token)
    if not isinstance(current_user, MeResponse):
        raise TypeError("authentication service returned an invalid user projection")
    return current_user
