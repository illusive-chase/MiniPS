from __future__ import annotations

import os

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..session import session_manager
from ..processing.gemini_edit import gemini_edit

router = APIRouter()


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
    w, h = gemini_edit(session, req.prompt)
    return {"width": w, "height": h}
