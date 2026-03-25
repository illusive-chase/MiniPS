from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..session import EditSession


def crop(session: EditSession, x: int, y: int, w: int, h: int) -> tuple[int, int]:
    session.push_undo()
    img = session.image
    session.image = img[y : y + h, x : x + w].copy()
    return session.image_size
