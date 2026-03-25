from __future__ import annotations

import io
import uuid
from typing import Literal

import numpy as np
from PIL import Image

MAX_STACK_DEPTH = 20


class EditSession:
    def __init__(self, image: np.ndarray) -> None:
        self.image: np.ndarray = image
        self.undo_stack: list[np.ndarray] = []
        self.redo_stack: list[np.ndarray] = []

    def push_undo(self) -> None:
        self.undo_stack.append(self.image.copy())
        self.redo_stack.clear()
        if len(self.undo_stack) > MAX_STACK_DEPTH:
            self.undo_stack.pop(0)

    def undo(self) -> bool:
        if not self.undo_stack:
            return False
        self.redo_stack.append(self.image.copy())
        self.image = self.undo_stack.pop()
        return True

    def redo(self) -> bool:
        if not self.redo_stack:
            return False
        self.undo_stack.append(self.image.copy())
        self.image = self.redo_stack.pop()
        return True

    def get_image_bytes(self, format: Literal["png", "jpeg"] = "png") -> bytes:
        img = Image.fromarray(self.image, mode="RGBA")
        buf = io.BytesIO()
        if format == "jpeg":
            background = Image.new("RGB", img.size, (255, 255, 255))
            background.paste(img, mask=img.split()[3])
            background.save(buf, format="JPEG", quality=95)
        else:
            img.save(buf, format="PNG")
        return buf.getvalue()

    @property
    def image_size(self) -> tuple[int, int]:
        h, w = self.image.shape[:2]
        return (w, h)


class SessionManager:
    def __init__(self) -> None:
        self._sessions: dict[str, EditSession] = {}

    def create(self, image: np.ndarray) -> str:
        sid = uuid.uuid4().hex
        self._sessions[sid] = EditSession(image)
        return sid

    def get(self, sid: str) -> EditSession | None:
        return self._sessions.get(sid)

    def delete(self, sid: str) -> None:
        self._sessions.pop(sid, None)


session_manager = SessionManager()
