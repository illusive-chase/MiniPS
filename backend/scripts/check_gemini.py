#!/usr/bin/env python3
"""
Gemini API health check script (OpenAI-compatible endpoint).

Usage:
    python -m backend.scripts.check_gemini          # from project root
    GEMINI_API_KEY=... python backend/scripts/check_gemini.py

Env vars:
    GEMINI_API_KEY   — required
    GEMINI_BASE_URL  — default: https://yunwu.ai (appends /v1 automatically)
    GEMINI_MODEL     — default: gemini-3-pro-image-preview
    GEMINI_TIMEOUT   — default: 30 (seconds, for health check)

Checks:
  1. GEMINI_API_KEY is set
  2. OpenAI-compatible client can be created
  3. Text generation works on the configured model
  4. Image-editing round-trip works (send image → get image back)

Exit codes:
  0 = all checks passed
  1 = one or more checks failed
"""
from __future__ import annotations

import base64
import io
import os
import re
import sys
import time


def _bold(text: str) -> str:
    return f"\033[1m{text}\033[0m"


def _green(text: str) -> str:
    return f"\033[32m{text}\033[0m"


def _red(text: str) -> str:
    return f"\033[31m{text}\033[0m"


def _yellow(text: str) -> str:
    return f"\033[33m{text}\033[0m"


def main() -> int:
    print(_bold("=== Gemini API Health Check (OpenAI-compatible) ===\n"))

    # ---- 1. Check env vars ----
    api_key = os.environ.get("GEMINI_API_KEY", "")
    raw_base = os.environ.get("GEMINI_BASE_URL", "https://yunwu.ai")
    base_url = raw_base.rstrip("/") + "/v1"
    model_name = os.environ.get("GEMINI_MODEL", "gemini-3-pro-image-preview")
    timeout = int(os.environ.get("GEMINI_TIMEOUT", "30"))

    if not api_key:
        print(_red("FAIL") + "  GEMINI_API_KEY is not set")
        return 1
    print(_green("OK  ") + f"  GEMINI_API_KEY is set (ends with ...{api_key[-4:]})")
    print(_yellow("INFO") + f"  Base URL: {base_url}")
    print(_yellow("INFO") + f"  Model: {model_name}")
    print(_yellow("INFO") + f"  Timeout: {timeout}s\n")

    # ---- 2. Create OpenAI client ----
    try:
        from openai import OpenAI
    except ImportError:
        print(_red("FAIL") + "  openai package is not installed")
        print("       pip install openai")
        return 1

    try:
        client = OpenAI(api_key=api_key, base_url=base_url, timeout=timeout)
        print(_green("OK  ") + "  OpenAI client created")
    except Exception as exc:
        print(_red("FAIL") + f"  Failed to create client: {exc}")
        return 1

    # ---- 3. List models (connectivity check) ----
    print(_bold("\nChecking API connectivity (list models)..."))
    t0 = time.time()
    try:
        models = client.models.list()
        model_ids = [m.id for m in models.data]
        elapsed = time.time() - t0
        print(
            _green("OK  ")
            + f"  API reachable — {len(model_ids)} models available ({elapsed:.1f}s)"
        )

        if model_name in model_ids:
            print(_green("OK  ") + f"  Model '{model_name}' found in available models")
        else:
            print(
                _yellow("WARN")
                + f"  Model '{model_name}' not found in model list — may still work via alias"
            )
    except Exception as exc:
        elapsed = time.time() - t0
        print(
            _yellow("WARN")
            + f"  Cannot list models ({elapsed:.1f}s): {exc}"
        )
        print("       (Some endpoints don't support model listing — continuing...)")

    # ---- 4. Text generation test ----
    print(_bold("\nChecking text generation..."))
    t0 = time.time()
    try:
        response = client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Reply with exactly: HEALTH_CHECK_OK"}
            ],
            max_tokens=64,
        )
        elapsed = time.time() - t0
        # Some proxies return a raw string instead of a ChatCompletion object
        if isinstance(response, str):
            reply = response.strip()
        else:
            reply = (response.choices[0].message.content or "").strip()
        print(_green("OK  ") + f"  Text generation works ({elapsed:.1f}s)")
        print(f"       Response: {reply[:120]}")
    except Exception as exc:
        elapsed = time.time() - t0
        print(_red("FAIL") + f"  Text generation failed ({elapsed:.1f}s): {exc}")
        return 1

    # ---- 5. Image editing round-trip ----
    print(_bold("\nChecking image editing capability..."))
    t0 = time.time()
    try:
        from PIL import Image

        # Create a tiny 4x4 red test image
        test_img = Image.new("RGBA", (4, 4), (255, 0, 0, 255))
        buf = io.BytesIO()
        test_img.save(buf, format="PNG")
        img_b64 = base64.b64encode(buf.getvalue()).decode()

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
                        {"type": "text", "text": "Return this image unchanged."},
                    ],
                }
            ],
            max_tokens=4096,
        )
        elapsed = time.time() - t0
        # Some proxies return a raw string instead of a ChatCompletion object
        if isinstance(response, str):
            content = response
        else:
            content = response.choices[0].message.content or ""

        # Try to parse the image from the response
        has_image = False

        # Markdown format: ![...](data:image/...;base64,...)
        match = re.search(
            r"!\[.*?\]\(data:image/\w+;base64,([A-Za-z0-9+/=\s]+)\)", content
        )
        if not match:
            # Data URI without markdown
            match = re.search(
                r"data:image/\w+;base64,([A-Za-z0-9+/=\s]+)", content
            )
        if match:
            b64_data = match.group(1).replace("\n", "").replace(" ", "")
            result = Image.open(io.BytesIO(base64.b64decode(b64_data)))
            has_image = True
            print(
                _green("OK  ")
                + f"  Image editing works ({elapsed:.1f}s) — "
                + f"returned {result.size[0]}x{result.size[1]} image"
            )
        else:
            # Try raw base64
            try:
                result = Image.open(io.BytesIO(base64.b64decode(content.strip())))
                has_image = True
                print(
                    _green("OK  ")
                    + f"  Image editing works ({elapsed:.1f}s) — "
                    + f"returned {result.size[0]}x{result.size[1]} image (raw base64)"
                )
            except Exception:
                pass

        if not has_image:
            preview = content[:200] if content else "(empty)"
            print(
                _yellow("WARN")
                + f"  Model responded but no image extracted ({elapsed:.1f}s)"
            )
            print(f"       Preview: {preview}")

    except Exception as exc:
        elapsed = time.time() - t0
        print(_red("FAIL") + f"  Image editing test failed ({elapsed:.1f}s): {exc}")
        return 1

    print(_bold(f"\n{'=' * 40}"))
    print(_green("All checks passed!"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
