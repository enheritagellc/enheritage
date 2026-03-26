"""Entity deduplication and normalisation."""
from __future__ import annotations

import logging
import re
import uuid
from typing import Any

logger = logging.getLogger(__name__)


def _normalize_text(text: str) -> str:
    """Return a canonical form of *text* for deduplication purposes.

    Strips leading/trailing whitespace, collapses internal whitespace, and
    lower-cases the string.  This means "John Smith" and "john smith" collapse
    to the same key.
    """
    return re.sub(r"\s+", " ", text.strip()).lower()


class EntityNormalizer:
    """Deduplicates a raw entity list and assigns stable UUIDs.

    Two entities are considered duplicates when their normalised text AND
    their label are identical.  The first occurrence wins for ``start_char``
    and ``end_char``; all subsequent occurrences are dropped.

    Usage::

        normalizer = EntityNormalizer()
        canonical = normalizer.normalize(raw_entities)
    """

    def normalize(self, raw_entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """Deduplicate *raw_entities* and assign UUIDs.

        Args:
            raw_entities: List of entity dicts as returned by
                :meth:`SpacyNEREngine.extract_entities`.

        Returns:
            Deduplicated list with an additional ``entity_id`` key on each
            item and a ``normalized_text`` key.
        """
        seen: dict[tuple[str, str], str] = {}  # (norm_text, label) → entity_id
        result: list[dict[str, Any]] = []

        for ent in raw_entities:
            raw_text: str = ent["text"]
            label: str = str(ent["label"])
            norm = _normalize_text(raw_text)
            key = (norm, label)

            if key in seen:
                # Duplicate — skip but do not lose it entirely; downstream code
                # can still use the primary occurrence with the same entity_id.
                continue

            entity_id = str(uuid.uuid4())
            seen[key] = entity_id

            result.append(
                {
                    **ent,
                    "entity_id": entity_id,
                    "normalized_text": norm,
                }
            )

        logger.debug(
            "EntityNormalizer: %d raw → %d canonical entities.",
            len(raw_entities),
            len(result),
        )
        return result
