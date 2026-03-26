"""SQS long-poll worker for the transcription service."""
from __future__ import annotations

import json
import logging
import os
import threading
import time
import uuid
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from app.config import settings
from app.transcription.S3MediaFetcher import S3MediaFetcher
from app.transcription.WhisperTranscriber import WhisperTranscriber

logger = logging.getLogger(__name__)


def _make_sqs_client() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("sqs", **kwargs)


class SQSWorker:
    """Polls the transcription SQS queue and processes jobs in a background thread.

    Processing flow for each message:
    1. Parse the ``DomainEvent`` JSON envelope.
    2. Download the audio file from S3.
    3. Transcribe with :class:`WhisperTranscriber`.
    4. Save the result JSON back to S3.
    5. Publish a ``transcription.complete`` event to the NER queue.
    6. Delete the processed SQS message.

    If any step raises an exception the message is **not** deleted so that it
    returns to the queue after the visibility timeout expires.
    """

    _WAIT_SECONDS = 20  # SQS long-poll maximum
    _MAX_MESSAGES = 5

    def __init__(self) -> None:
        self._sqs = _make_sqs_client()
        self._transcriber = WhisperTranscriber(
            model_size=settings.whisper_model_size,
            device=settings.whisper_device,
        )
        self._fetcher = S3MediaFetcher(
            bucket=settings.s3_bucket_media,
            aws_region=settings.aws_region,
            endpoint_url=settings.aws_endpoint_url,
        )
        self._running = False
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        """Start the background polling thread."""
        if self._running:
            return
        if not settings.sqs_transcription_queue_url:
            logger.warning(
                "SQS_TRANSCRIPTION_QUEUE_URL not configured; worker will not start."
            )
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._poll_loop, name="sqs-transcription-worker", daemon=True
        )
        self._thread.start()
        logger.info("SQSWorker started (queue=%s).", settings.sqs_transcription_queue_url)

    def stop(self) -> None:
        """Signal the polling thread to stop and wait for it to finish."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=30)
        logger.info("SQSWorker stopped.")

    # ------------------------------------------------------------------
    # Polling loop
    # ------------------------------------------------------------------

    def _poll_loop(self) -> None:
        while self._running:
            try:
                response = self._sqs.receive_message(
                    QueueUrl=settings.sqs_transcription_queue_url,
                    MaxNumberOfMessages=self._MAX_MESSAGES,
                    WaitTimeSeconds=self._WAIT_SECONDS,
                    AttributeNames=["All"],
                    MessageAttributeNames=["All"],
                )
            except (BotoCoreError, ClientError) as exc:
                logger.error("SQS receive_message failed: %s", exc)
                time.sleep(5)
                continue

            messages = response.get("Messages", [])
            for message in messages:
                self._handle_message(message)

    def _handle_message(self, message: dict[str, Any]) -> None:
        receipt_handle: str = message["ReceiptHandle"]
        try:
            body = json.loads(message["Body"])
            self.process_transcription_job(body)
            # Delete only on success
            self._sqs.delete_message(
                QueueUrl=settings.sqs_transcription_queue_url,
                ReceiptHandle=receipt_handle,
            )
            logger.info("Message processed and deleted: %s", message.get("MessageId"))
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to process message %s: %s — leaving in queue.",
                message.get("MessageId"),
                exc,
                exc_info=True,
            )
            # Do NOT delete; message will reappear after visibility timeout.

    # ------------------------------------------------------------------
    # Job processing
    # ------------------------------------------------------------------

    def process_transcription_job(self, payload: dict[str, Any]) -> None:
        """Execute a single transcription job described by *payload*.

        Expected payload keys:
        - ``mediaAssetId`` (str)
        - ``audioS3Key`` (str)
        - ``language`` (str, optional)

        Raises any exception so the caller can decide whether to delete
        the SQS message.
        """
        media_asset_id: str = payload["mediaAssetId"]
        audio_s3_key: str = payload["audioS3Key"]
        language: str = payload.get("language", "en")
        job_id: str = payload.get("jobId", str(uuid.uuid4()))

        logger.info(
            "Processing transcription job %s: mediaAsset=%s key=%s",
            job_id,
            media_asset_id,
            audio_s3_key,
        )

        local_path: str | None = None
        try:
            # Step 1: Fetch audio from S3
            local_path = self._fetcher.fetch(audio_s3_key)

            # Step 2: Transcribe
            segments = self._transcriber.transcribe(local_path)

            # Step 3: Build result document
            full_text = " ".join(seg["text"] for seg in segments)
            duration = segments[-1]["end"] if segments else 0.0
            result = {
                "transcriptId": job_id,
                "mediaAssetId": media_asset_id,
                "language": language,
                "durationSeconds": duration,
                "fullText": full_text,
                "segments": segments,
                "status": "complete",
            }
            result_json = json.dumps(result, ensure_ascii=False, indent=2)

            # Step 4: Save result to S3
            result_s3_key = f"transcripts/{job_id}/result.json"
            self._fetcher.upload_json(result_s3_key, result_json)

            # Step 5: Publish transcription.complete event to NER queue
            if settings.sqs_ner_queue_url:
                event = {
                    "eventType": "transcription.complete",
                    "transcriptId": job_id,
                    "mediaAssetId": media_asset_id,
                    "s3ResultKey": result_s3_key,
                    "language": language,
                }
                self._sqs.send_message(
                    QueueUrl=settings.sqs_ner_queue_url,
                    MessageBody=json.dumps(event),
                )
                logger.info("Published transcription.complete event for job %s.", job_id)

        finally:
            # Always clean up the local temp file
            if local_path and os.path.exists(local_path):
                try:
                    os.unlink(local_path)
                except OSError as exc:
                    logger.warning("Could not delete temp file %s: %s", local_path, exc)
