from __future__ import annotations

import io
import os
from typing import TYPE_CHECKING

import numpy as np
from fastapi import HTTPException
from PIL import Image

if TYPE_CHECKING:
    from ..session import EditSession


def gemini_edit(session: EditSession, prompt: str) -> tuple[int, int]:
    import google.generativeai as genai

    session.push_undo()

    api_key = os.environ.get("GEMINI_API_KEY", "")
    genai.configure(api_key=api_key)

    img_pil = Image.fromarray(session.image, mode="RGBA")
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    png_bytes = buf.getvalue()

    model = genai.GenerativeModel("gemini-2.0-flash-exp")

    response = model.generate_content(
        [
            {
                "mime_type": "image/png",
                "data": png_bytes,
            },
            f"Edit this image according to the following instruction: {prompt}. "
            f"Return the edited image.",
        ],
        generation_config=genai.GenerationConfig(
            response_mime_type="image/png",
        ),
    )

    if not response.candidates:
        raise HTTPException(status_code=502, detail="Gemini returned no candidates")

    candidate = response.candidates[0]

    image_part = None
    if candidate.content and candidate.content.parts:
        for part in candidate.content.parts:
            if hasattr(part, "inline_data") and part.inline_data and part.inline_data.mime_type.startswith("image/"):
                image_part = part
                break

    if image_part is None:
        text_parts = []
        if candidate.content and candidate.content.parts:
            for part in candidate.content.parts:
                if hasattr(part, "text") and part.text:
                    text_parts.append(part.text)
        detail = " ".join(text_parts) if text_parts else "Gemini did not return an image"
        raise HTTPException(status_code=502, detail=detail)

    result_img = Image.open(io.BytesIO(image_part.inline_data.data)).convert("RGBA")
    session.image = np.array(result_img)

    return session.image_size
