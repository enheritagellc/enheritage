"""SQS long-poll worker for the biography-gen service."""
from __future__ import annotations

import json
import logging
import threading
import time
import uuid
from typing import Any

import boto3  # type: ignore[import-untyped]
from botocore.exceptions import BotoCoreError, ClientError  # type: ignore[import-untyped]

from app.config import settings
from app.generation.BiographyGenerator import BiographyGenerator
from app.generation.PromptBuilder import build_entity_summary, truncate_transcript

logger = logging.getLogger(__name__)


def _make_boto_client(service: str) -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client(service, **kwargs)


class SQSWorker:
    """Polls the biography SQS queue and generates biographies in a background thread.

    Processing flow for each message:
    1. Parse ``ner.complete`` or ``enrichment.complete`` event.
    2. Fetch transcript and NER result JSON from S3.
    3. Generate biography chapters via GPT-4.
    4. Save result JSON to S3.
    5. Publish ``biography.complete`` event to the render queue.
    6. Delete the processed SQS message.
    """

    _WAIT_SECONDS = 20
    _MAX_MESSAGES = 2  # biography generation is slow; process few at a time

    def __init__(self) -> None:
        self._sqs = _make_boto_client("sqs")
        self._s3 = _make_boto_client("s3")
        self._generator = BiographyGenerator()
        self._running = False
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        if self._running:
            return
        if not settings.sqs_biography_queue_url:
            logger.warning("SQS_BIOGRAPHY_QUEUE_URL not configured; biography worker will not start.")
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._poll_loop, name="sqs-biography-worker", daemon=True
        )
        self._thread.start()
        logger.info("Biography SQSWorker started (queue=%s).", settings.sqs_biography_queue_url)

    def stop(self) -> None:
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=60)
        logger.info("Biography SQSWorker stopped.")

    # ------------------------------------------------------------------
    # Polling loop
    # ------------------------------------------------------------------

    def _poll_loop(self) -> None:
        while self._running:
            try:
                response = self._sqs.receive_message(
                    QueueUrl=settings.sqs_biography_queue_url,
                    MaxNumberOfMessages=self._MAX_MESSAGES,
                    WaitTimeSeconds=self._WAIT_SECONDS,
                    AttributeNames=["All"],
                    MessageAttributeNames=["All"],
                )
            except (BotoCoreError, ClientError) as exc:
                logger.error("SQS receive_message failed: %s", exc)
                time.sleep(5)
                continue

            for message in response.get("Messages", []):
                self._handle_message(message)

    def _handle_message(self, message: dict[str, Any]) -> None:
        receipt_handle: str = message["ReceiptHandle"]
        try:
            body = json.loads(message["Body"])
            event_type = body.get("eventType", "")
            if event_type in ("ner.complete", "enrichment.complete"):
                self.process_biography_job(body)
            else:
                logger.warning("Unhandled event type '%s'; skipping.", event_type)

            self._sqs.delete_message(
                QueueUrl=settings.sqs_biography_queue_url,
                ReceiptHandle=receipt_handle,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to process biography message %s: %s — leaving in queue.",
                message.get("MessageId"),
                exc,
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Job processing
    # ------------------------------------------------------------------

    def process_biography_job(self, event: dict[str, Any]) -> None:
        """Generate a biography from a ``ner.complete`` or ``enrichment.complete`` event.

        Expected event keys:
        - ``transcriptId`` (str)
        - ``s3ResultKey`` (str) — path to the NER or enrichment result JSON
        - ``subjectName`` (str, optional) — defaults to "the subject"
        - ``mediaAssetId`` (str, optional)
        """
        transcript_id: str = event["transcriptId"]
        ner_s3_key: str = event["s3ResultKey"]
        subject_name: str = event.get("subjectName", "the subject")
        biography_id = str(uuid.uuid4())

        logger.info(
            "Processing biography job %s for transcript %s (subject: %s).",
            biography_id,
            transcript_id,
            subject_name,
        )

        # Fetch transcript
        transcript_key = f"transcripts/{transcript_id}/result.json"
        obj = self._s3.get_object(Bucket=settings.s3_bucket_media, Key=transcript_key)
        transcript_data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))

        # Fetch NER/enrichment result
        obj = self._s3.get_object(Bucket=settings.s3_bucket_media, Key=ner_s3_key)
        ner_data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))

        # Generate
        chapters = self._generator.generate(
            subject_name=subject_name,
            transcript=transcript_data,
            ner_result=ner_data,
        )

        full_text = "\n\n".join(f"## {ch.title}\n\n{ch.body}" for ch in chapters)

        # Save to S3
        result_payload = {
            "biographyId": biography_id,
            "transcriptId": transcript_id,
            "subjectName": subject_name,
            "status": "complete",
            "chapters": [
                {"title": ch.title, "body": ch.body, "wordCount": ch.word_count}
                for ch in chapters
            ],
            "fullText": full_text,
        }
        result_key = f"biographies/{biography_id}/result.json"
        self._s3.put_object(
            Bucket=settings.s3_bucket_media,
            Key=result_key,
            Body=json.dumps(result_payload, ensure_ascii=False, indent=2).encode("utf-8"),
            ContentType="application/json",
        )
        logger.info(
            "Biography %s saved to s3://%s/%s.", biography_id, settings.s3_bucket_media, result_key
        )

        # Publish biography.complete event
        if settings.sqs_render_queue_url:
            render_event = {
                "eventType": "biography.complete",
                "biographyId": biography_id,
                "transcriptId": transcript_id,
                "subjectName": subject_name,
                "s3ResultKey": result_key,
            }
            self._sqs.send_message(
                QueueUrl=settings.sqs_render_queue_url,
                MessageBody=json.dumps(render_event),
            )
            logger.info("Published biography.complete event for biography %s.", biography_id)
