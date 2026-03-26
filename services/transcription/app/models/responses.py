from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "transcription"
    version: str = "0.1.0"


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None


class TranscriptWord(BaseModel):
    word: str
    start: float
    end: float
    probability: float = 1.0


class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: list[TranscriptWord] = Field(default_factory=list)
    speaker: str | None = None


class TranscriptStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class TranscriptionJobResponse(BaseModel):
    job_id: str
    status: TranscriptStatus
    media_asset_id: str | None = None


class TranscriptResponse(BaseModel):
    transcript_id: str
    media_asset_id: str
    status: TranscriptStatus
    language: str | None = None
    duration_seconds: float | None = None
    segments: list[TranscriptSegment] = Field(default_factory=list)
    full_text: str | None = None
    s3_result_key: str | None = None
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)
