from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..session import EditSession


def _parse_hex_color(color_hex: str) -> tuple[int, int, int]:
    c = color_hex.lstrip("#")
    if len(c) == 3:
        c = c[0] * 2 + c[1] * 2 + c[2] * 2
    r = int(c[0:2], 16)
    g = int(c[2:4], 16)
    b = int(c[4:6], 16)
    return (r, g, b)


def alpha_repaint(session: EditSession, color_hex: str) -> tuple[int, int]:
    session.push_undo()
    r, g, b = _parse_hex_color(color_hex)
    img = session.image
    transparent = img[:, :, 3] == 0
    img[transparent, 0] = r
    img[transparent, 1] = g
    img[transparent, 2] = b
    img[transparent, 3] = 255
    session.image = img
    return session.image_size
