from __future__ import annotations

import io

import numpy as np
from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from fastapi.responses import StreamingResponse
from PIL import Image
from pydantic import BaseModel

from ..session import session_manager
from ..processing.crop import crop
from ..processing.resize import resize

router = APIRouter()


class SessionRequest(BaseModel):
    sid: str


class CropRequest(BaseModel):
    sid: str
    x: int
    y: int
    w: int
    h: int


class ResizeRequest(BaseModel):
    sid: str
    width: int
    height: int


@router.post("/open")
async def open_image(file: UploadFile = File(...)):
    data = await file.read()
    img = Image.open(io.BytesIO(data)).convert("RGBA")
    arr = np.array(img)
    sid = session_manager.create(arr)
    w, h = arr.shape[1], arr.shape[0]
    return {"session_id": sid, "width": w, "height": h}


@router.get("/image/{sid}")
async def get_image(sid: str):
    session = session_manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    png_bytes = session.get_image_bytes("png")
    return StreamingResponse(io.BytesIO(png_bytes), media_type="image/png")


@router.post("/crop")
async def crop_image(req: CropRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = crop(session, req.x, req.y, req.w, req.h)
    return {"width": w, "height": h}


@router.post("/resize")
async def resize_image(req: ResizeRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    if req.width <= 0 or req.height <= 0:
        raise HTTPException(status_code=400, detail="Width and height must be positive")
    w, h = resize(session, req.width, req.height)
    return {"width": w, "height": h}


@router.post("/undo")
async def undo_action(req: SessionRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    success = session.undo()
    if not success:
        raise HTTPException(status_code=400, detail="Nothing to undo")
    w, h = session.image_size
    return {"success": True, "width": w, "height": h}


@router.post("/redo")
async def redo_action(req: SessionRequest):
    session = session_manager.get(req.sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    success = session.redo()
    if not success:
        raise HTTPException(status_code=400, detail="Nothing to redo")
    w, h = session.image_size
    return {"success": True, "width": w, "height": h}


@router.get("/session-info/{sid}")
async def session_info(sid: str):
    session = session_manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    w, h = session.image_size
    return {
        "width": w,
        "height": h,
        "can_undo": len(session.undo_stack) > 0,
        "can_redo": len(session.redo_stack) > 0,
    }


@router.get("/export/{sid}")
async def export_image(sid: str, format: str = Query(default="png")):
    session = session_manager.get(sid)
    if session is None:
        raise HTTPException(status_code=404, detail="Session not found")
    fmt = format.lower()
    if fmt not in ("png", "jpeg", "jpg"):
        raise HTTPException(status_code=400, detail="Unsupported format. Use 'png' or 'jpeg'.")
    if fmt == "jpg":
        fmt = "jpeg"
    image_bytes = session.get_image_bytes(fmt)
    media_type = "image/png" if fmt == "png" else "image/jpeg"
    ext = "png" if fmt == "png" else "jpg"
    return StreamingResponse(
        io.BytesIO(image_bytes),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename=export.{ext}"},
    )
