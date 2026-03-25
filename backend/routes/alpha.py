from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..session import session_manager
from ..processing.magic_wand import magic_wand
from ..processing.rect_erase import rect_erase
from ..processing.alpha_repaint import alpha_repaint

router = APIRouter()


class MagicWandRequest(BaseModel):
    sid: str
    x: int
    y: int
    tolerance: int


class RectEraseRequest(BaseModel):
    sid: str
    x: int
    y: int
    w: int
    h: int


class AlphaRepaintRequest(BaseModel):
    sid: str
    color: str


@router.post("/magic-wand")
async def magic_wand_endpoint(req: MagicWandRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = magic_wand(session, req.x, req.y, req.tolerance)
    return {"width": w, "height": h}


@router.post("/rect-erase")
async def rect_erase_endpoint(req: RectEraseRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = rect_erase(session, req.x, req.y, req.w, req.h)
    return {"width": w, "height": h}


@router.post("/alpha-repaint")
async def alpha_repaint_endpoint(req: AlphaRepaintRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = alpha_repaint(session, req.color)
    return {"width": w, "height": h}
