from __future__ import annotations

from typing import TYPE_CHECKING

import numpy as np
from PIL import Image

if TYPE_CHECKING:
    from ..session import EditSession


def resize(session: EditSession, width: int, height: int) -> tuple[int, int]:
    session.push_undo()
    img = Image.fromarray(session.image, mode="RGBA")
    img = img.resize((width, height), Image.LANCZOS)
    session.image = np.array(img)
    return session.image_size
