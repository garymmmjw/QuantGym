"""Normalize Starlette CORS preflight failures into the API error contract."""

from __future__ import annotations

from starlette.requests import Request
from starlette.types import ASGIApp, Message, Receive, Scope, Send

from ..errors import error_response


_CORS_RESPONSE_HEADERS = frozenset(
    {
        b"access-control-allow-headers",
        b"access-control-allow-methods",
        b"access-control-allow-origin",
        b"access-control-max-age",
        b"vary",
    }
)


def _is_cors_preflight(scope: Scope) -> bool:
    if scope["type"] != "http" or str(scope.get("method", "")).upper() != "OPTIONS":
        return False
    names = {name.lower() for name, _value in scope.get("headers", [])}
    return b"origin" in names and b"access-control-request-method" in names


class CorsErrorEnvelopeMiddleware:
    """Buffer only preflight responses and replace CORS plaintext failures."""

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if not _is_cors_preflight(scope):
            await self.app(scope, receive, send)
            return

        captured: list[Message] = []

        async def capture(message: Message) -> None:
            captured.append(message)

        await self.app(scope, receive, capture)
        response_start = next(
            (message for message in captured if message["type"] == "http.response.start"),
            None,
        )
        if response_start is None or response_start["status"] != 400:
            for message in captured:
                await send(message)
            return

        cors_headers = {
            name.decode("latin-1"): value.decode("latin-1")
            for name, value in response_start.get("headers", [])
            if name.lower() in _CORS_RESPONSE_HEADERS
        }
        response = error_response(
            Request(scope, receive=receive),
            status_code=400,
            code="CORS_PREFLIGHT_REJECTED",
            message="跨域预检请求不受支持",
            retryable=False,
            headers=cors_headers,
        )
        await response(scope, receive, send)
