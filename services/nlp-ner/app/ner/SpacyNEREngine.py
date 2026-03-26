"""spaCy-based named entity recognition engine."""
from __future__ import annotations

import logging
import threading
from typing import Any

from app.config import settings
from app.models.responses import EntityType

logger = logging.getLogger(__name__)

# Mapping from spaCy label strings to our internal EntityType enum.
# Labels not found here map to EntityType.OTHER.
_LABEL_MAP: dict[str, EntityType] = {
    "PERSON": EntityType.PERSON,
    "ORG": EntityType.ORG,
    "GPE": EntityType.GPE,
    "DATE": EntityType.DATE,
    "TIME": EntityType.DATE,
    "EVENT": EntityType.EVENT,
    "LOC": EntityType.LOC,
    "NORP": EntityType.NORP,
    "FAC": EntityType.FAC,
    "PRODUCT": EntityType.PRODUCT,
    "WORK_OF_ART": EntityType.WORK_OF_ART,
}


class SpacyNEREngine:
    """Runs spaCy NER with lazy model loading.

    The production model (``en_core_web_trf``) is transformer-based and more
    accurate; the development model (``en_core_web_sm``) is smaller and faster.
    If the configured model is not installed the engine falls back to
    ``en_core_web_sm`` automatically.
    """

    def __init__(self, model_name: str | None = None) -> None:
        self._model_name = model_name or settings.spacy_model
        self._nlp: Any = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _load_model(self) -> None:
        import spacy  # type: ignore[import-untyped]

        model_to_load = self._model_name
        logger.info("Loading spaCy model '%s'…", model_to_load)
        try:
            self._nlp = spacy.load(model_to_load)
        except OSError:
            fallback = "en_core_web_sm"
            logger.warning(
                "Model '%s' not found; falling back to '%s'.",
                model_to_load,
                fallback,
            )
            try:
                self._nlp = spacy.load(fallback)
            except OSError as exc:
                raise RuntimeError(
                    f"Neither '{model_to_load}' nor '{fallback}' is installed. "
                    "Run: python -m spacy download en_core_web_sm"
                ) from exc

        logger.info("spaCy model loaded: %s", self._nlp.meta.get("name", "unknown"))

    def _ensure_model(self) -> None:
        if self._nlp is None:
            with self._lock:
                if self._nlp is None:
                    self._load_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def extract_entities(self, text: str) -> list[dict[str, Any]]:
        """Run NER over *text* and return a list of entity dicts.

        Each dict contains:
        ``{ "text": str, "label": EntityType, "start_char": int,
            "end_char": int, "confidence": float }``

        spaCy's rule-based NER does not expose per-entity confidence scores;
        ``confidence`` is therefore always ``1.0``.

        Args:
            text: Raw input text, typically a full transcript or a segment.

        Returns:
            List of entity dicts sorted by ``start_char``.
        """
        if not text.strip():
            return []

        self._ensure_model()
        doc = self._nlp(text)  # type: ignore[misc]

        entities: list[dict[str, Any]] = []
        for ent in doc.ents:
            label = _LABEL_MAP.get(ent.label_, EntityType.OTHER)
            entities.append(
                {
                    "text": ent.text,
                    "label": label,
                    "start_char": ent.start_char,
                    "end_char": ent.end_char,
                    "confidence": 1.0,
                }
            )

        return entities
