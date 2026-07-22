from __future__ import annotations

from collections.abc import Callable
from contextlib import asynccontextmanager
from typing import Any, AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import SecretStr

from .auth.router import router as auth_router
from .auth.runtime import AuthRuntime, build_auth_runtime
from .config import PREVIEW_ORIGIN, Settings, get_settings
from .db import assert_database_at_alembic_head, create_database_engine
from .errors import EXCEPTION_HANDLERS
from .health import router as health_router
from .middleware.cors_errors import CorsErrorEnvelopeMiddleware
from .middleware.callback_access_log import CallbackAccessLogRedactionMiddleware
from .middleware.request_id import RequestIdMiddleware
from .security.edge import EdgeProofMiddleware
from .users.router import router as users_router


def create_app(
    settings: Settings | None = None,
    *,
    engine_factory: Callable[[object], Any] = create_database_engine,
    head_checker: Callable[[Any], None] = assert_database_at_alembic_head,
    auth_runtime_factory: Callable[[Any, Settings], AuthRuntime] = build_auth_runtime,
) -> FastAPI:
    """Create an API instance without reading secrets at module-import time."""

    @asynccontextmanager
    async def lifespan(application: FastAPI) -> AsyncIterator[None]:
        if application.state.settings is None:
            application.state.settings = get_settings()
        database_engine: Any | None = None
        auth_runtime: AuthRuntime | None = None
        try:
            database_engine = engine_factory(application.state.settings.database_url)
            application.state.database_engine = database_engine
            head_checker(database_engine)
            auth_runtime = auth_runtime_factory(
                database_engine,
                application.state.settings,
            )
            application.state.auth_runtime = auth_runtime
            application.state.auth_service = auth_runtime.service
            application.state.google_oauth_flow = auth_runtime.google_flow
            yield
        finally:
            application.state.auth_service = None
            application.state.google_oauth_flow = None
            application.state.auth_runtime = None
            try:
                if auth_runtime is not None:
                    await auth_runtime.aclose()
            finally:
                if database_engine is not None:
                    database_engine.dispose()
                application.state.database_engine = None

    application = FastAPI(
        title="QuantGym API",
        version="2.0.0-preview.1",
        openapi_url="/api/v2/openapi.json",
        docs_url=None,
        redoc_url=None,
        lifespan=lifespan,
        exception_handlers=EXCEPTION_HANDLERS,
    )
    application.state.settings = settings
    application.state.database_engine = None
    application.state.auth_runtime = None
    application.state.auth_service = None
    application.state.google_oauth_flow = None

    def edge_token() -> SecretStr:
        active_settings = application.state.settings
        if active_settings is None:
            active_settings = get_settings()
            application.state.settings = active_settings
        return active_settings.edge_shared_secret

    application.include_router(health_router)
    application.include_router(auth_router)
    application.include_router(users_router)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.allowed_origins if settings else (PREVIEW_ORIGIN,)),
        allow_credentials=False,
        allow_methods=["GET", "HEAD", "OPTIONS", "POST", "PUT", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-CSRF-Token", "X-Idempotency-Key"],
        expose_headers=["X-Request-ID"],
        max_age=600,
    )
    application.add_middleware(CorsErrorEnvelopeMiddleware)
    application.add_middleware(EdgeProofMiddleware, token_provider=edge_token)
    application.add_middleware(RequestIdMiddleware)
    application.add_middleware(CallbackAccessLogRedactionMiddleware)
    return application


app = create_app()
