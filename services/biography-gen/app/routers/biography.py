"""REST endpoints for biography generation."""
from __future__ import annotations

import json
import logging
import uuid
from typing import Any

import boto3  # type: ignore[import-untyped]
from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.config import settings
from app.generation.BiographyGenerator import BiographyGenerator
from app.models.responses import (
    Biography,
    BiographyJobResponse,
    BiographyRequest,
    BiographyStatus,
)

logger = logging.getLogger(__name__)
router = APIRouter()

# In-memory job store (sufficient for single-instance dev; swap for Redis/DB in prod)
_jobs: dict[str, Biography] = {}


def _make_boto_client(service: str) -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client(service, **kwargs)


def _run_generation(biography_id: str, request: BiographyRequest) -> None:
    """Background task: fetch inputs, generate, save to S3, update job state."""
    job = _jobs[biography_id]
    job.status = BiographyStatus.PROCESSING

    try:
        s3 = _make_boto_client("s3")

        # Fetch transcript from S3
        transcript_key = f"transcripts/{request.transcriptId}/result.json"
        try:
            obj = s3.get_object(Bucket=settings.s3_bucket_media, Key=transcript_key)
            transcript_data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))
        except Exception as exc:
            raise RuntimeError(f"Could not fetch transcript {request.transcriptId}: {exc}") from exc

        # Fetch NER result from S3
        ner_key = f"ner/{request.transcriptId}/result.json"
        ner_data: dict[str, Any] = {}
        try:
            obj = s3.get_object(Bucket=settings.s3_bucket_media, Key=ner_key)
            ner_data = json.loads(obj["Body"].read().decode("utf-8"))
        except Exception:
            logger.warning("NER result not found for transcript %s; proceeding without entities.", request.transcriptId)

        # Generate biography
        generator = BiographyGenerator()
        chapters = generator.generate(
            subject_name=request.subjectName,
            transcript=transcript_data,
            ner_result=ner_data,
        )

        full_text = "\n\n".join(f"## {ch.title}\n\n{ch.body}" for ch in chapters)

        # Save to S3
        result_payload = {
            "biographyId": biography_id,
            "transcriptId": request.transcriptId,
            "subjectName": request.subjectName,
            "status": "complete",
            "chapters": [{"title": ch.title, "body": ch.body, "wordCount": ch.word_count} for ch in chapters],
            "fullText": full_text,
        }
        result_key = f"biographies/{biography_id}/result.json"
        s3.put_object(
            Bucket=settings.s3_bucket_media,
            Key=result_key,
            Body=json.dumps(result_payload, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info("Biography %s saved to s3://%s/%s.", biography_id, settings.s3_bucket_media, result_key)

        # Update job state
        job.status = BiographyStatus.COMPLETE
        job.chapters = chapters
        job.full_text = full_text
        job.s3_result_key = result_key

        # Publish biography.complete event to render queue
        if settings.sqs_render_queue_url:
            sqs = _make_boto_client("sqs")
            event = {
                "eventType": "biography.complete",
                "biographyId": biography_id,
                "transcriptId": request.transcriptId,
                "subjectName": request.subjectName,
                "s3ResultKey": result_key,
            }
            sqs.send_message(
                QueueUrl=settings.sqs_render_queue_url,
                MessageBody=json.dumps(event),
            )
            logger.info("Published biography.complete event for biography %s.", biography_id)

    except Exception as exc:  # noqa: BLE001
        logger.error("Biography generation failed for %s: %s", biography_id, exc, exc_info=True)
        job.status = BiographyStatus.FAILED
        job.error = str(exc)


@router.post("/generate", response_model=BiographyJobResponse, status_code=202)
async def generate_biography(
    request: BiographyRequest,
    background_tasks: BackgroundTasks,
) -> BiographyJobResponse:
    biography_id = str(uuid.uuid4())
    job = Biography(
        biography_id=biography_id,
        subject_name=request.subjectName,
        transcript_id=request.transcriptId,
        status=BiographyStatus.QUEUED,
    )
    _jobs[biography_id] = job
    background_tasks.add_task(_run_generation, biography_id, request)
    return BiographyJobResponse(biography_id=biography_id, status=BiographyStatus.QUEUED)


@router.get("/{biography_id}", response_model=Biography)
async def get_biography(biography_id: str) -> Biography:
    job = _jobs.get(biography_id)
    if not job:
        raise HTTPException(status_code=404, detail=f"Biography {biography_id} not found")
    return job
