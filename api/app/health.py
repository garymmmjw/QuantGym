from __future__ import annotations

from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel, ConfigDict


router = APIRouter(tags=["health"])


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid", frozen=True)

    status: Literal["ok"] = "ok"


@router.get(
    "/api/v2/health",
    operation_id="getHealth",
    response_model=HealthResponse,
    summary="Check API process health",
)
async def get_health() -> HealthResponse:
    """Provider-safe liveness response with no resource or configuration details."""
    return HealthResponse()
