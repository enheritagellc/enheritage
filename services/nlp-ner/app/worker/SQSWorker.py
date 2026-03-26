"""SQS long-poll worker for the NER service."""
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
from app.ner.EntityNormalizer import EntityNormalizer
from app.ner.SpacyNEREngine import SpacyNEREngine

logger = logging.getLogger(__name__)


def _make_boto_client(service: str) -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client(service, **kwargs)


class SQSWorker:
    """Polls ``sqs_ner_queue_url`` and runs NER on completed transcripts.

    Processing flow:
    1. Receive message from NER queue.
    2. Fetch the transcript result JSON from S3.
    3. Run NER on the full transcript text.
    4. Normalise (deduplicate) entities.
    5. Save ``NERResult`` JSON to S3.
    6. Publish ``ner.complete`` event to the enrichment queue.
    7. Delete the SQS message.

    On error: message is not deleted and returns to the queue.
    """

    _WAIT_SECONDS = 20
    _MAX_MESSAGES = 5

    def __init__(self) -> None:
        self._sqs = _make_boto_client("sqs")
        self._s3 = _make_boto_client("s3")
        self._ner = SpacyNEREngine()
        self._normalizer = EntityNormalizer()
        self._running = False
        self._thread: threading.Thread | None = None

    # ------------------------------------------------------------------
    # Lifecycle
    # ------------------------------------------------------------------

    def start(self) -> None:
        if self._running:
            return
        if not settings.sqs_ner_queue_url:
            logger.warning("SQS_NER_QUEUE_URL not configured; NER worker will not start.")
            return
        self._running = True
        self._thread = threading.Thread(
            target=self._poll_loop, name="sqs-ner-worker", daemon=True
        )
        self._thread.start()
        logger.info("NER SQSWorker started (queue=%s).", settings.sqs_ner_queue_url)

    def stop(self) -> None:
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=30)
        logger.info("NER SQSWorker stopped.")

    # ------------------------------------------------------------------
    # Polling loop
    # ------------------------------------------------------------------

    def _poll_loop(self) -> None:
        while self._running:
            try:
                response = self._sqs.receive_message(
                    QueueUrl=settings.sqs_ner_queue_url,
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
            if event_type == "transcription.complete":
                self.process_ner_job(body)
            else:
                logger.warning("Unhandled event type '%s'; skipping.", event_type)

            self._sqs.delete_message(
                QueueUrl=settings.sqs_ner_queue_url,
                ReceiptHandle=receipt_handle,
            )
        except Exception as exc:  # noqa: BLE001
            logger.error(
                "Failed to process NER message %s: %s — leaving in queue.",
                message.get("MessageId"),
                exc,
                exc_info=True,
            )

    # ------------------------------------------------------------------
    # Job processing
    # ------------------------------------------------------------------

    def process_ner_job(self, event: dict[str, Any]) -> None:
        """Process a ``transcription.complete`` event.

        Args:
            event: Dict with keys ``transcriptId``, ``s3ResultKey``,
                   ``mediaAssetId``.
        """
        transcript_id: str = event["transcriptId"]
        s3_result_key: str = event["s3ResultKey"]
        media_asset_id: str = event.get("mediaAssetId", "")
        ner_job_id = str(uuid.uuid4())

        logger.info("Processing NER job %s for transcript %s.", ner_job_id, transcript_id)

        # Fetch transcript from S3
        obj = self._s3.get_object(Bucket=settings.s3_bucket_media, Key=s3_result_key)
        transcript_data: dict[str, Any] = json.loads(obj["Body"].read().decode("utf-8"))
        full_text: str = transcript_data.get("fullText", "")

        # Run NER
        raw_entities = self._ner.extract_entities(full_text)
        canonical_entities = self._normalizer.normalize(raw_entities)

        # Build result
        ner_result = {
            "nerJobId": ner_job_id,
            "transcriptId": transcript_id,
            "mediaAssetId": media_asset_id,
            "entityCount": len(canonical_entities),
            "entities": [
                {**e, "label": str(e["label"])} for e in canonical_entities
            ],
            "status": "complete",
        }
        ner_result_json = json.dumps(ner_result, ensure_ascii=False, indent=2)

        # Save to S3
        ner_s3_key = f"ner/{transcript_id}/result.json"
        self._s3.put_object(
            Bucket=settings.s3_bucket_media,
            Key=ner_s3_key,
            Body=ner_result_json.encode("utf-8"),
            ContentType="application/json",
        )
        logger.info("NER result saved to s3://%s/%s.", settings.s3_bucket_media, ner_s3_key)

        # Publish ner.complete event
        if settings.sqs_enrichment_queue_url:
            enrichment_event = {
                "eventType": "ner.complete",
                "nerJobId": ner_job_id,
                "transcriptId": transcript_id,
                "mediaAssetId": media_asset_id,
                "s3ResultKey": ner_s3_key,
            }
            self._sqs.send_message(
                QueueUrl=settings.sqs_enrichment_queue_url,
                MessageBody=json.dumps(enrichment_event),
            )
            logger.info("Published ner.complete event for transcript %s.", transcript_id)
