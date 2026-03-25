from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..session import session_manager
from ..processing.upscale import upscale

router = APIRouter()


class UpscaleRequest(BaseModel):
    sid: str
    scale: int


@router.post("/upscale")
async def upscale_endpoint(req: UpscaleRequest):
    if req.scale not in (2, 4):
        raise HTTPException(status_code=400, detail="Scale must be 2 or 4")
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = upscale(session, req.scale)
    return {"width": w, "height": h}
