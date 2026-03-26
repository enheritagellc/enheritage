"""Builds GPT-4 prompts from transcript and NER entity data."""
from __future__ import annotations

from typing import Any

# Chapter definitions — order matters for narrative flow
CHAPTERS = [
    {
        "key": "early_life",
        "title": "Early Life & Origins",
        "focus": (
            "Describe the subject's childhood, birthplace, family background, cultural heritage, "
            "and formative early experiences. Bring the setting to life."
        ),
    },
    {
        "key": "education",
        "title": "Education & Formative Years",
        "focus": (
            "Cover schools attended, mentors, intellectual passions, and the experiences that "
            "shaped the subject's values and worldview during their younger years."
        ),
    },
    {
        "key": "career",
        "title": "Career & Achievements",
        "focus": (
            "Describe the subject's professional journey, key roles, accomplishments, challenges "
            "overcome, and contributions to their field or community."
        ),
    },
    {
        "key": "family",
        "title": "Family & Relationships",
        "focus": (
            "Explore the subject's relationships — spouse, children, close friends — and how "
            "these bonds shaped who they became."
        ),
    },
    {
        "key": "legacy",
        "title": "Legacy & Reflections",
        "focus": (
            "Reflect on the subject's lasting impact, the values they passed on, and what "
            "they hope future generations will remember about them."
        ),
    },
]

SYSTEM_PROMPT = """You are a gifted biographer helping families preserve their loved ones' life stories.
Your writing is warm, vivid, and respectful — in the tradition of narrative non-fiction.
Write in the third person using the subject's name. Use only details found in the transcript.
Do not fabricate facts. If information for a section is sparse, write gracefully around gaps.
Format your response in Markdown."""


def build_chapter_prompt(
    chapter: dict[str, str],
    subject_name: str,
    transcript_text: str,
    entity_summary: str,
    word_target: int = 300,
) -> list[dict[str, str]]:
    """Return an OpenAI messages list for a single chapter."""
    user_content = f"""Write the "{chapter['title']}" chapter of {subject_name}'s biography.

Focus: {chapter['focus']}

Target length: approximately {word_target} words.

---
TRANSCRIPT EXCERPT:
{transcript_text}

---
KEY PEOPLE, PLACES & DATES MENTIONED:
{entity_summary or "None identified."}

---
Write only this chapter. Start directly with the narrative — no chapter heading needed."""

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_content},
    ]


def build_entity_summary(ner_result: dict[str, Any]) -> str:
    """Convert NER entities into a readable summary string for the prompt."""
    entities = ner_result.get("entities", [])
    if not entities:
        return ""

    by_type: dict[str, list[str]] = {}
    for entity in entities:
        label = entity.get("label", "OTHER")
        text = entity.get("normalized_text") or entity.get("text", "")
        if text:
            by_type.setdefault(label, []).append(text)

    lines = []
    label_names = {
        "PERSON": "People",
        "ORG": "Organizations",
        "GPE": "Places",
        "LOC": "Locations",
        "DATE": "Dates",
        "EVENT": "Events",
        "NORP": "Groups/Nationalities",
        "FAC": "Facilities",
        "WORK_OF_ART": "Works",
        "PRODUCT": "Products",
    }
    for label, items in by_type.items():
        unique_items = list(dict.fromkeys(items))[:10]  # dedupe, cap at 10 per type
        friendly = label_names.get(label, label)
        lines.append(f"{friendly}: {', '.join(unique_items)}")

    return "\n".join(lines)


def truncate_transcript(full_text: str, max_chars: int = 6000) -> str:
    """Keep the transcript within token budget by truncating with a notice."""
    if len(full_text) <= max_chars:
        return full_text
    return full_text[:max_chars] + "\n\n[transcript continues — excerpt shown]"
