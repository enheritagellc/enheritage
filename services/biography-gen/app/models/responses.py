from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "biography-gen"
    version: str = "0.1.0"


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None


class BiographyStatus(str, Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETE = "complete"
    FAILED = "failed"


class BiographyChapter(BaseModel):
    title: str
    body: str = Field(..., description="Polished chapter text (markdown)")
    word_count: int = 0


class Biography(BaseModel):
    biography_id: str
    subject_name: str
    transcript_id: str
    status: BiographyStatus
    chapters: list[BiographyChapter] = Field(default_factory=list)
    full_text: str | None = None
    s3_result_key: str | None = None
    error: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)


class BiographyJobResponse(BaseModel):
    biography_id: str
    status: BiographyStatus


class BiographyRequest(BaseModel):
    transcriptId: str = Field(..., description="ID of the source transcript")
    enrichmentJobId: str = Field(..., description="ID of the NER enrichment result")
    subjectName: str = Field(..., description="Full name of the biography subject")
