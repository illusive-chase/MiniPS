"""Image editing via Gemini API through OpenAI-compatible endpoint."""

from __future__ import annotations

import base64
import io
import logging
import os
import re
from typing import TYPE_CHECKING

import numpy as np
from fastapi import HTTPException
from PIL import Image

if TYPE_CHECKING:
    from ..session import EditSession

logger = logging.getLogger(__name__)

DEFAULT_MODEL = "gemini-3-pro-image-preview"
DEFAULT_BASE_URL = "https://yunwu.ai"
GEMINI_TIMEOUT_SECONDS = int(os.environ.get("GEMINI_TIMEOUT", "120"))
MAX_RETRIES = int(os.environ.get("GEMINI_MAX_RETRIES", "3"))


def _get_client():
    """Create an OpenAI client pointing at the Gemini-compatible endpoint."""
    from openai import OpenAI

    api_key = os.environ.get("GEMINI_API_KEY", "")
    base_url = os.environ.get("GEMINI_BASE_URL", DEFAULT_BASE_URL).rstrip('/') + '/v1'

    return OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=GEMINI_TIMEOUT_SECONDS,
    )


def _parse_image(content: str) -> Image.Image:
    """
    Extract image from API response.

    The response comes as a markdown image: ![image](data:image/jpeg;base64,...)
    Falls back to trying raw base64 decoding.
    """
    # Try markdown image format: ![...](data:image/...;base64,...)
    match = re.search(
        r"!\[.*?\]\(data:image/\w+;base64,([A-Za-z0-9+/=\s]+)\)", content
    )
    if match:
        b64_data = match.group(1).replace("\n", "").replace(" ", "")
        return Image.open(io.BytesIO(base64.b64decode(b64_data)))

    # Fallback: try data URI without markdown wrapper
    match = re.search(r"data:image/\w+;base64,([A-Za-z0-9+/=\s]+)", content)
    if match:
        b64_data = match.group(1).replace("\n", "").replace(" ", "")
        return Image.open(io.BytesIO(base64.b64decode(b64_data)))

    # Fallback: try raw base64
    try:
        return Image.open(io.BytesIO(base64.b64decode(content.strip())))
    except Exception:
        pass

    raise ValueError(
        f"Could not extract image from API response "
        f"(length={len(content)}, preview={content[:200]})"
    )


def gemini_edit(session: EditSession, prompt: str) -> tuple[int, int]:
    """Edit the session image using the Gemini API via OpenAI-compatible endpoint."""
    session.push_undo()

    model_name = os.environ.get("GEMINI_MODEL", DEFAULT_MODEL)
    client = _get_client()

    # Encode session image as base64 PNG data URI
    img_pil = Image.fromarray(session.image, mode="RGBA")
    buf = io.BytesIO()
    img_pil.save(buf, format="PNG")
    img_b64 = base64.b64encode(buf.getvalue()).decode()

    full_prompt = (
        f"Edit this image according to the following instruction: {prompt}. "
        f"Return the edited image."
    )

    last_error: Exception | None = None
    for attempt in range(MAX_RETRIES):
        try:
            logger.info(
                "Calling Gemini model=%s attempt=%d/%d timeout=%ds",
                model_name,
                attempt + 1,
                MAX_RETRIES,
                GEMINI_TIMEOUT_SECONDS,
            )
            response = client.chat.completions.create(
                model=model_name,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{img_b64}",
                                },
                            },
                            {"type": "text", "text": full_prompt},
                        ],
                    }
                ],
                max_tokens=4096,
            )

            # Some proxies return a raw string instead of a ChatCompletion object
            if isinstance(response, str):
                content = response
            else:
                content = response.choices[0].message.content
            if not content:
                raise ValueError("Gemini returned empty response content")

            result_img = _parse_image(content).convert("RGBA")
            session.image = np.array(result_img)
            return session.image_size

        except Exception as exc:
            last_error = exc
            if attempt < MAX_RETRIES - 1:
                logger.warning(
                    "Attempt %d/%d failed: %s, retrying...",
                    attempt + 1,
                    MAX_RETRIES,
                    exc,
                )

    # All retries exhausted — roll back undo and raise
    session.undo()
    logger.error("Gemini API failed after %d attempts: %s", MAX_RETRIES, last_error)

    # Distinguish timeout from other errors
    error_str = str(last_error).lower()
    if "timeout" in error_str or "timed out" in error_str:
        raise HTTPException(
            status_code=504,
            detail=f"Gemini API timed out after {GEMINI_TIMEOUT_SECONDS}s",
        )

    raise HTTPException(
        status_code=502,
        detail=f"Gemini API failed after {MAX_RETRIES} attempts: {last_error}",
    )
