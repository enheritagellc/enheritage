"""AWS Rekognition integration for label detection and face analysis.

In development (LocalStack), Rekognition is not available in the community
edition, so this module returns empty results gracefully when disabled.
Set REKOGNITION_ENABLED=true with real AWS credentials for production.
"""
from __future__ import annotations

import logging
import uuid
from typing import Any

import boto3  # type: ignore[import-untyped]

from app.config import settings

logger = logging.getLogger(__name__)


def _make_client() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    # Do NOT use LocalStack endpoint for Rekognition — only real AWS supported
    return boto3.client("rekognition", **kwargs)


def detect_labels(image_bytes: bytes) -> list[dict[str, Any]]:
    """Detect scene/object labels. Returns empty list if disabled."""
    if not settings.rekognition_enabled:
        return []
    try:
        client = _make_client()
        response = client.detect_labels(
            Image={"Bytes": image_bytes},
            MaxLabels=20,
            MinConfidence=70.0,
        )
        return [
            {
                "name": label["Name"],
                "confidence": round(label["Confidence"], 2),
                "categories": [p["Name"] for p in label.get("Parents", [])],
            }
            for label in response.get("Labels", [])
        ]
    except Exception as exc:
        logger.warning("Rekognition label detection failed: %s", exc)
        return []


def detect_faces(image_bytes: bytes, vault_id: str) -> list[dict[str, Any]]:
    """
    Detect faces and return bounding boxes with vault-scoped synthetic IDs.

    Real Rekognition face search requires an indexed face collection.
    For now we detect faces and assign per-vault UUIDs that are stable
    within a session but not cross-session (full face indexing is a v2 feature).
    """
    if not settings.rekognition_enabled:
        return []
    try:
        client = _make_client()
        response = client.detect_faces(
            Image={"Bytes": image_bytes},
            Attributes=["DEFAULT"],
        )
        faces = []
        for face in response.get("FaceDetails", []):
            box = face.get("BoundingBox", {})
            faces.append({
                "face_id": str(uuid.uuid5(uuid.UUID(int=0), f"{vault_id}:{box}")),
                "bounding_box": {
                    "left": round(box.get("Left", 0), 4),
                    "top": round(box.get("Top", 0), 4),
                    "width": round(box.get("Width", 0), 4),
                    "height": round(box.get("Height", 0), 4),
                },
                "confidence": round(face.get("Confidence", 0), 2),
                "is_labeled": False,
                "labeled_name": None,
            })
        return faces
    except Exception as exc:
        logger.warning("Rekognition face detection failed: %s", exc)
        return []
