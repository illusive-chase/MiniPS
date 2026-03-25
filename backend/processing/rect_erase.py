from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..session import EditSession


def rect_erase(session: EditSession, x: int, y: int, w: int, h: int) -> tuple[int, int]:
    session.push_undo()
    session.image[y : y + h, x : x + w, 3] = 0
    return session.image_size
