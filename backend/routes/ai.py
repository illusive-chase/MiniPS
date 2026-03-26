from __future__ import annotations

import asyncio
import logging
import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..session import session_manager
from ..processing.gemini_edit import gemini_edit, GEMINI_TIMEOUT_SECONDS, MAX_RETRIES

router = APIRouter()
logger = logging.getLogger(__name__)

# Extra grace period: per-attempt timeout × retries + overhead
ROUTE_TIMEOUT_SECONDS = GEMINI_TIMEOUT_SECONDS * MAX_RETRIES + 30


class AIEditRequest(BaseModel):
    sid: str
    prompt: str


@router.post("/ai-edit")
async def ai_edit_endpoint(req: AIEditRequest):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="GEMINI_API_KEY not configured")
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if not req.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt must not be empty")

    try:
        w, h = await asyncio.wait_for(
            asyncio.to_thread(gemini_edit, session, req.prompt),
            timeout=ROUTE_TIMEOUT_SECONDS,
        )
    except asyncio.TimeoutError:
        logger.error("AI edit route timed out after %ds", ROUTE_TIMEOUT_SECONDS)
        raise HTTPException(
            status_code=504,
            detail=f"AI edit timed out after {ROUTE_TIMEOUT_SECONDS} seconds",
        )

    return {"width": w, "height": h}
