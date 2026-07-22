"""Prevent OAuth authorization codes from reaching server access logs."""

from __future__ import annotations

from starlette.types import ASGIApp, Message, Receive, Scope, Send


GOOGLE_CALLBACK_PATH = "/api/v2/auth/google/callback"


class CallbackAccessLogRedactionMiddleware:
    """Clear the callback query immediately before the server emits its access log.

    Uvicorn formats the access-log target when it receives ``http.response.start``.
    The application still sees the original query throughout routing and callback
    validation, while the outer server only sees the callback path at log time.
    """

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http" or scope.get("path") != GOOGLE_CALLBACK_PATH:
            await self.app(scope, receive, send)
            return

        def redact_callback_query() -> None:
            scope["query_string"] = b""
            scope["raw_path"] = GOOGLE_CALLBACK_PATH.encode("ascii")

        async def send_without_callback_query(message: Message) -> None:
            if message["type"] == "http.response.start":
                redact_callback_query()
            await send(message)

        try:
            await self.app(scope, receive, send_without_callback_query)
        except BaseException:
            # Starlette's ServerErrorMiddleware wraps user middleware.  If the
            # application raises before starting a response, redact before that
            # outer layer generates and logs its fallback 500 response.
            redact_callback_query()
            raise
