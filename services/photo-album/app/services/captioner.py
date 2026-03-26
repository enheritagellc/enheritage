"""GPT-4o vision captioning for uploaded photos."""
from __future__ import annotations

import base64
import logging

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are helping preserve a family's memories. "
    "Write a warm, concise caption (1–2 sentences) describing what you see in this photo. "
    "Focus on people, setting, and any notable details. "
    "Do not mention image quality or technical details."
)


@retry(stop=stop_after_attempt(3), wait=wait_exponential(min=1, max=8), reraise=True)
def generate_caption(image_bytes: bytes, content_type: str = "image/jpeg") -> str | None:
    """Return an AI-generated caption, or None if captioning is unavailable."""
    if not settings.openai_api_key:
        return None

    try:
        client = OpenAI(api_key=settings.openai_api_key)
        b64 = base64.standard_b64encode(image_bytes).decode("utf-8")
        data_url = f"data:{content_type};base64,{b64}"

        response = client.chat.completions.create(
            model=settings.openai_vision_model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": data_url, "detail": "low"}},
                        {"type": "text", "text": "Please caption this photo."},
                    ],
                },
            ],
            max_tokens=120,
            temperature=0.5,
        )
        caption = response.choices[0].message.content or ""
        return caption.strip() or None
    except Exception as exc:
        logger.warning("Caption generation failed: %s", exc)
        return None
