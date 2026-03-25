from __future__ import annotations

from typing import TYPE_CHECKING

import cv2
import numpy as np

if TYPE_CHECKING:
    from ..session import EditSession


def magic_wand(session: EditSession, x: int, y: int, tolerance: int) -> tuple[int, int]:
    session.push_undo()
    img = session.image
    h, w = img.shape[:2]

    rgb = img[:, :, :3].copy()

    mask = np.zeros((h + 2, w + 2), dtype=np.uint8)

    cv2.floodFill(
        rgb,
        mask,
        seedPoint=(x, y),
        newVal=(0, 0, 0),
        loDiff=(tolerance, tolerance, tolerance),
        upDiff=(tolerance, tolerance, tolerance),
        flags=cv2.FLOODFILL_MASK_ONLY | (255 << 8),
    )

    selected = mask[1 : h + 1, 1 : w + 1] == 255
    img[selected, 3] = 0
    session.image = img

    return session.image_size
