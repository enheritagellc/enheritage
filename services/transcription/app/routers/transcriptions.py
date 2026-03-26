"""Transcription HTTP endpoints."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, Field

from app.config import settings
from app.models.responses import (
    ErrorResponse,
    TranscriptResponse,
    TranscriptStatus,
    TranscriptionJobResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/transcriptions", tags=["transcriptions"])


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------


class TranscriptionRequest(BaseModel):
    mediaAssetId: str = Field(..., description="Unique ID of the source media asset")
    audioS3Key: str = Field(..., description="S3 key of the audio file to transcribe")
    language: str = Field(default="en", description="BCP-47 language code")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _sqs_client() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("sqs", **kwargs)


def _s3_client() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@router.post(
    "",
    response_model=TranscriptionJobResponse,
    status_code=status.HTTP_202_ACCEPTED,
    responses={503: {"model": ErrorResponse}},
)
async def enqueue_transcription(body: TranscriptionRequest) -> TranscriptionJobResponse:
    """Enqueue an audio file for asynchronous transcription.

    Returns a ``jobId`` that can be used to poll :meth:`get_transcript`.
    """
    if not settings.sqs_transcription_queue_url:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="SQS transcription queue not configured.",
        )

    job_id = str(uuid.uuid4())
    event: dict[str, Any] = {
        "eventType": "transcription.requested",
        "jobId": job_id,
        "mediaAssetId": body.mediaAssetId,
        "audioS3Key": body.audioS3Key,
        "language": body.language,
    }

    try:
        sqs = _sqs_client()
        sqs.send_message(
            QueueUrl=settings.sqs_transcription_queue_url,
            MessageBody=json.dumps(event),
            MessageAttributes={
                "eventType": {
                    "StringValue": "transcription.requested",
                    "DataType": "String",
                }
            },
        )
    except (BotoCoreError, ClientError) as exc:
        logger.error("Failed to enqueue transcription job: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to enqueue job: {exc}",
        ) from exc

    logger.info("Transcription job enqueued: jobId=%s mediaAsset=%s", job_id, body.mediaAssetId)
    return TranscriptionJobResponse(
        job_id=job_id,
        status=TranscriptStatus.QUEUED,
        media_asset_id=body.mediaAssetId,
    )


@router.get(
    "/{transcript_id}",
    response_model=TranscriptResponse,
    responses={404: {"model": ErrorResponse}},
)
async def get_transcript(transcript_id: str) -> TranscriptResponse:
    """Return the status and content of a transcription job.

    Looks up the result JSON in S3.  Returns 404 if the job is not yet
    complete or does not exist.
    """
    result_s3_key = f"transcripts/{transcript_id}/result.json"
    s3 = _s3_client()

    try:
        obj = s3.get_object(Bucket=settings.s3_bucket_media, Key=result_s3_key)
        data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))
    except ClientError as exc:
        error_code = exc.response.get("Error", {}).get("Code", "")  # type: ignore[attr-defined]
        if error_code in ("NoSuchKey", "404"):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transcript '{transcript_id}' not found.",
            ) from exc
        logger.error("S3 error fetching transcript %s: %s", transcript_id, exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Storage error: {exc}",
        ) from exc

    return TranscriptResponse(
        transcript_id=data.get("transcriptId", transcript_id),
        media_asset_id=data.get("mediaAssetId", ""),
        status=TranscriptStatus(data.get("status", "complete")),
        language=data.get("language"),
        duration_seconds=data.get("durationSeconds"),
        segments=data.get("segments", []),
        full_text=data.get("fullText"),
        s3_result_key=result_s3_key,
    )
