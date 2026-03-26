"""NER extraction endpoints."""
from __future__ import annotations

import json
import logging
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]
from fastapi import APIRouter, HTTPException, status

from app.config import settings
from app.models.responses import Entity, EntityType, ErrorResponse, ExtractRequest, NERResult
from app.ner.EntityNormalizer import EntityNormalizer
from app.ner.SpacyNEREngine import SpacyNEREngine

logger = logging.getLogger(__name__)
router = APIRouter(tags=["entities"])

# Module-level singletons — loaded once at import time (lazy within the class).
_engine = SpacyNEREngine()
_normalizer = EntityNormalizer()


def _s3_client() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)


@router.post(
    "/extract",
    response_model=NERResult,
    responses={422: {"model": ErrorResponse}},
)
async def extract_entities(body: ExtractRequest) -> NERResult:
    """Run NER synchronously on the provided text.

    Returns the full :class:`NERResult` immediately — no queue involved.
    Suitable for small texts (< ~10 000 tokens).  For full transcripts use
    the async pipeline (SQS).
    """
    raw = _engine.extract_entities(body.text)
    canonical = _normalizer.normalize(raw)

    entities = [
        Entity(
            entity_id=e["entity_id"],
            text=e["text"],
            label=EntityType(str(e["label"])),
            start_char=e["start_char"],
            end_char=e["end_char"],
            confidence=e.get("confidence", 1.0),
            normalized_text=e.get("normalized_text"),
        )
        for e in canonical
    ]

    return NERResult(
        transcript_id=body.transcriptId,
        entity_count=len(entities),
        entities=entities,
    )


@router.get(
    "/entities/{transcript_id}",
    response_model=NERResult,
    responses={404: {"model": ErrorResponse}},
)
async def get_ner_result(transcript_id: str) -> NERResult:
    """Return the NER result stored in S3 for *transcript_id*."""
    s3_key = f"ner/{transcript_id}/result.json"
    s3 = _s3_client()

    try:
        obj = s3.get_object(Bucket=settings.s3_bucket_media, Key=s3_key)
        data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))
    except ClientError as exc:
        code = exc.response.get("Error", {}).get("Code", "")  # type: ignore[attr-defined]
        if code in ("NoSuchKey", "404"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"NER result for transcript '{transcript_id}' not found.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc

    entities = [
        Entity(
            entity_id=e["entity_id"],
            text=e["text"],
            label=EntityType(e["label"]),
            start_char=e["start_char"],
            end_char=e["end_char"],
            confidence=e.get("confidence", 1.0),
            normalized_text=e.get("normalized_text"),
        )
        for e in data.get("entities", [])
    ]

    return NERResult(
        transcript_id=transcript_id,
        entity_count=data.get("entityCount", len(entities)),
        entities=entities,
        s3_result_key=s3_key,
    )
