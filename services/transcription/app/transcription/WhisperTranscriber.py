"""Whisper-based audio transcription with lazy model loading."""
from __future__ import annotations

import logging
import threading
from typing import Any

logger = logging.getLogger(__name__)


class WhisperTranscriber:
    """Transcribes audio files using OpenAI Whisper.

    The Whisper model is loaded lazily on the first call to :meth:`transcribe`
    so that startup time is not impacted when the model is not yet needed.
    Thread-safe thanks to a lock that prevents duplicate loading.
    """

    def __init__(self, model_size: str = "medium", device: str = "cpu") -> None:
        self._model_size = model_size
        self._device = device
        self._model: Any = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _resolve_device(self) -> str:
        """Return the best available device string.

        If the caller requested 'cuda' but CUDA is not available, fall back
        to 'cpu' rather than crashing at inference time.
        """
        if self._device == "cuda":
            try:
                import torch  # type: ignore[import-untyped]

                if torch.cuda.is_available():
                    return "cuda"
                logger.warning(
                    "CUDA requested but not available; falling back to CPU."
                )
                return "cpu"
            except ImportError:
                logger.warning("torch not importable; defaulting to CPU.")
                return "cpu"
        return self._device

    def _load_model(self) -> None:
        """Load the Whisper model into memory (called once, thread-safe)."""
        import whisper  # type: ignore[import-untyped]

        device = self._resolve_device()
        logger.info(
            "Loading Whisper model '%s' on device '%s'…",
            self._model_size,
            device,
        )
        self._model = whisper.load_model(self._model_size, device=device)
        logger.info("Whisper model loaded successfully.")

    def _ensure_model(self) -> None:
        if self._model is None:
            with self._lock:
                if self._model is None:
                    self._load_model()

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transcribe(self, audio_path: str) -> list[dict[str, Any]]:
        """Transcribe *audio_path* and return a list of segment dicts.

        Each segment dict contains at minimum:
        ``{ "id": int, "start": float, "end": float, "text": str,
            "words": list[dict] }``

        Word-level timestamps are returned when the model supports them
        (requires ``word_timestamps=True`` which is only available for
        non-tiny models).  The ``words`` list may be empty for models that
        do not produce them.

        Args:
            audio_path: Absolute path to the local audio file.

        Returns:
            List of segment dictionaries ready for serialisation.
        """
        self._ensure_model()

        logger.info("Starting transcription for: %s", audio_path)

        # Enable word-level timestamps for all models except tiny, which
        # does not support them reliably.
        word_timestamps = self._model_size not in ("tiny", "tiny.en")

        result: dict[str, Any] = self._model.transcribe(  # type: ignore[union-attr]
            audio_path,
            word_timestamps=word_timestamps,
            verbose=False,
        )

        segments: list[dict[str, Any]] = []
        for seg in result.get("segments", []):
            words: list[dict[str, Any]] = []
            for w in seg.get("words", []) or []:
                words.append(
                    {
                        "word": w.get("word", "").strip(),
                        "start": float(w.get("start", seg["start"])),
                        "end": float(w.get("end", seg["end"])),
                        "probability": float(w.get("probability", 1.0)),
                    }
                )

            segments.append(
                {
                    "id": int(seg["id"]),
                    "start": float(seg["start"]),
                    "end": float(seg["end"]),
                    "text": seg["text"].strip(),
                    "words": words,
                    "speaker": None,  # filled in by diarization if enabled
                }
            )

        logger.info(
            "Transcription complete: %d segments, language='%s'.",
            len(segments),
            result.get("language"),
        )
        return segments
