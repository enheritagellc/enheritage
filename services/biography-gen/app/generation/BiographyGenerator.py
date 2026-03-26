"""Multi-pass GPT-4 biography generation."""
from __future__ import annotations

import logging
from typing import Any

from openai import OpenAI
from tenacity import retry, stop_after_attempt, wait_exponential

from app.config import settings
from app.generation.PromptBuilder import (
    CHAPTERS,
    build_chapter_prompt,
    build_entity_summary,
    truncate_transcript,
)
from app.models.responses import BiographyChapter

logger = logging.getLogger(__name__)


class BiographyGenerator:
    """Generates a multi-chapter biography using GPT-4.

    Each chapter is generated in a separate API call (multi-pass) so the model
    can focus deeply on each life phase without hitting context limits.
    """

    def __init__(self) -> None:
        self._client = OpenAI(api_key=settings.openai_api_key)

    def generate(
        self,
        subject_name: str,
        transcript: dict[str, Any],
        ner_result: dict[str, Any],
    ) -> list[BiographyChapter]:
        """Generate all chapters and return them in order."""
        full_text = transcript.get("fullText", "")
        if not full_text:
            # Reconstruct from segments if fullText is missing
            segments = transcript.get("segments", [])
            full_text = " ".join(seg.get("text", "") for seg in segments)

        transcript_excerpt = truncate_transcript(full_text)
        entity_summary = build_entity_summary(ner_result)

        chapters: list[BiographyChapter] = []
        for chapter_def in CHAPTERS:
            logger.info(
                "Generating chapter '%s' for subject '%s'.", chapter_def["title"], subject_name
            )
            body = self._generate_chapter(
                chapter=chapter_def,
                subject_name=subject_name,
                transcript_text=transcript_excerpt,
                entity_summary=entity_summary,
            )
            word_count = len(body.split())
            chapters.append(
                BiographyChapter(
                    title=chapter_def["title"],
                    body=body,
                    word_count=word_count,
                )
            )
            logger.info("Chapter '%s' complete (%d words).", chapter_def["title"], word_count)

        return chapters

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=2, max=10),
        reraise=True,
    )
    def _generate_chapter(
        self,
        chapter: dict[str, str],
        subject_name: str,
        transcript_text: str,
        entity_summary: str,
    ) -> str:
        messages = build_chapter_prompt(
            chapter=chapter,
            subject_name=subject_name,
            transcript_text=transcript_text,
            entity_summary=entity_summary,
        )
        response = self._client.chat.completions.create(
            model=settings.openai_model,
            messages=messages,  # type: ignore[arg-type]
            max_tokens=settings.openai_max_tokens,
            temperature=0.7,
        )
        content = response.choices[0].message.content or ""
        return content.strip()
