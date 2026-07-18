from __future__ import annotations

import hmac
from collections.abc import Callable

from pydantic import SecretStr
from starlette.requests import Request
from starlette.types import ASGIApp, Receive, Scope, Send

from ..errors import error_response


EDGE_PROOF_HEADER = b"x-quantgym-edge-token"
HEALTH_PATH = "/api/v2/health"


def _secret_text(value: SecretStr | str) -> str:
    if isinstance(value, SecretStr):
        return value.get_secret_value()
    return value


class EdgeProofMiddleware:
    """Reject unproved V2 traffic before authentication and route dispatch."""

    def __init__(
        self,
        app: ASGIApp,
        token_provider: Callable[[], SecretStr | str],
    ) -> None:
        self.app = app
        self.token_provider = token_provider

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        path = str(scope.get("path", ""))
        method = str(scope.get("method", "")).upper()
        is_v2 = path == "/api/v2" or path.startswith("/api/v2/")
        is_direct_health = method == "GET" and path == HEALTH_PATH
        if not is_v2 or is_direct_health:
            await self.app(scope, receive, send)
            return

        supplied = [
            value
            for name, value in scope.get("headers", [])
            if name.lower() == EDGE_PROOF_HEADER
        ]
        expected = _secret_text(self.token_provider()).encode("utf-8")
        valid = (
            len(supplied) == 1
            and len(supplied[0]) == len(expected)
            and hmac.compare_digest(supplied[0], expected)
        )
        if valid:
            await self.app(scope, receive, send)
            return

        response = error_response(
            Request(scope, receive=receive),
            status_code=403,
            code="EDGE_PROOF_INVALID",
            message="请求来源验证失败",
            retryable=False,
        )
        await response(scope, receive, send)
