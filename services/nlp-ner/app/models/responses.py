from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "nlp-ner"
    version: str = "0.1.0"


class ErrorResponse(BaseModel):
    error: str
    detail: str | None = None
    request_id: str | None = None


class EntityType(str, Enum):
    PERSON = "PERSON"
    ORG = "ORG"
    GPE = "GPE"
    DATE = "DATE"
    EVENT = "EVENT"
    LOC = "LOC"
    NORP = "NORP"
    FAC = "FAC"
    PRODUCT = "PRODUCT"
    WORK_OF_ART = "WORK_OF_ART"
    OTHER = "OTHER"


class Entity(BaseModel):
    entity_id: str = Field(..., description="UUID for this unique entity")
    text: str = Field(..., description="Surface form of the entity in the source text")
    label: EntityType = Field(..., description="Entity type")
    start_char: int = Field(..., description="Start character offset in source text")
    end_char: int = Field(..., description="End character offset in source text")
    confidence: float = Field(default=1.0, ge=0.0, le=1.0)
    normalized_text: str | None = Field(
        default=None, description="Canonical / deduplicated form"
    )


class NERResult(BaseModel):
    transcript_id: str
    entity_count: int
    entities: list[Entity] = Field(default_factory=list)
    s3_result_key: str | None = None


class ExtractRequest(BaseModel):
    text: str = Field(..., description="Raw text to run NER over")
    transcriptId: str = Field(..., description="Associated transcript identifier")
