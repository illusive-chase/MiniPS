from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .routes.basic import router as basic_router
from .routes.alpha import router as alpha_router
from .routes.ai import router as ai_router
from .routes.upscale import router as upscale_router

app = FastAPI(title="MiniPS", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(basic_router, prefix="/api")
app.include_router(alpha_router, prefix="/api")
app.include_router(ai_router, prefix="/api")
app.include_router(upscale_router, prefix="/api")

import os as _os

_BACKEND_DIR = _os.path.dirname(_os.path.abspath(__file__))
_FRONTEND_DIST = _os.path.join(_BACKEND_DIR, "..", "frontend", "dist")

try:
    app.mount("/", StaticFiles(directory=_FRONTEND_DIST, html=True), name="static")
except Exception:
    pass

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
