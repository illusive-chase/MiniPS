from __future__ import annotations

import os
from typing import TYPE_CHECKING

import cv2
import numpy as np
from fastapi import HTTPException
from PIL import Image

if TYPE_CHECKING:
    from ..session import EditSession

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MODELS_DIR = os.path.join(PROJECT_ROOT, "models")

_upsampler_cache: dict[int, object] = {}


def _get_upsampler(scale: int):
    if scale in _upsampler_cache:
        return _upsampler_cache[scale]

    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

    if scale == 4:
        model_name = "RealESRGAN_x4plus.pth"
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
        netscale = 4
    else:
        model_name = "RealESRGAN_x2plus.pth"
        model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=2)
        netscale = 2

    model_path = os.path.join(MODELS_DIR, model_name)
    if not os.path.isfile(model_path):
        raise HTTPException(
            status_code=503,
            detail=(
                f"Model file not found: {model_path}. "
                f"Please download {model_name} from "
                f"https://github.com/xinntao/Real-ESRGAN/releases and place it in {MODELS_DIR}/"
            ),
        )

    upsampler = RealESRGANer(
        scale=netscale,
        model_path=model_path,
        model=model,
        tile=0,
        tile_pad=10,
        pre_pad=0,
        half=False,
    )

    _upsampler_cache[scale] = upsampler
    return upsampler


def upscale(session: EditSession, scale: int) -> tuple[int, int]:
    session.push_undo()

    rgba = session.image
    rgb = rgba[:, :, :3]
    alpha = rgba[:, :, 3]

    bgr = cv2.cvtColor(rgb, cv2.COLOR_RGB2BGR)

    upsampler = _get_upsampler(scale)
    output_bgr, _ = upsampler.enhance(bgr, outscale=scale)

    output_rgb = cv2.cvtColor(output_bgr, cv2.COLOR_BGR2RGB)

    alpha_pil = Image.fromarray(alpha)
    new_h, new_w = output_rgb.shape[:2]
    alpha_resized = np.array(alpha_pil.resize((new_w, new_h), Image.LANCZOS))

    output_rgba = np.dstack([output_rgb, alpha_resized])
    session.image = output_rgba

    return session.image_size
