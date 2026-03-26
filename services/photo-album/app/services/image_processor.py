"""Image processing: resize to thumbnail/preview and upload all three to S3."""
from __future__ import annotations

import io
import logging
from typing import Any

import boto3  # type: ignore[import-untyped]
from PIL import Image, ExifTags

from app.config import settings

logger = logging.getLogger(__name__)


def _make_s3() -> Any:
    kwargs: dict[str, Any] = {"region_name": settings.aws_region}
    if settings.aws_endpoint_url:
        kwargs["endpoint_url"] = settings.aws_endpoint_url
    return boto3.client("s3", **kwargs)


def _exif_date(img: Image.Image) -> str | None:
    """Extract DateTimeOriginal from EXIF if present."""
    try:
        exif_data = img._getexif()  # type: ignore[attr-defined]
        if not exif_data:
            return None
        for tag_id, value in exif_data.items():
            tag = ExifTags.TAGS.get(tag_id, "")
            if tag == "DateTimeOriginal" and isinstance(value, str):
                return value
    except Exception:
        pass
    return None


def _fix_orientation(img: Image.Image) -> Image.Image:
    """Auto-rotate based on EXIF orientation tag."""
    try:
        exif_data = img._getexif()  # type: ignore[attr-defined]
        if not exif_data:
            return img
        for tag_id, value in exif_data.items():
            if ExifTags.TAGS.get(tag_id) == "Orientation":
                rotations = {3: 180, 6: 270, 8: 90}
                if value in rotations:
                    return img.rotate(rotations[value], expand=True)
    except Exception:
        pass
    return img


def _make_thumbnail(img: Image.Image, size: int) -> bytes:
    """Center-crop to a square thumbnail and return as JPEG bytes."""
    img = img.copy()
    w, h = img.size
    min_dim = min(w, h)
    left = (w - min_dim) // 2
    top = (h - min_dim) // 2
    img = img.crop((left, top, left + min_dim, top + min_dim))
    img = img.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=85, optimize=True)
    return buf.getvalue()


def _make_preview(img: Image.Image, max_width: int) -> bytes:
    """Resize to max_width preserving aspect ratio, return as JPEG bytes."""
    img = img.copy()
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    buf = io.BytesIO()
    img.convert("RGB").save(buf, format="JPEG", quality=88, optimize=True)
    return buf.getvalue()


def process_and_upload(
    photo_id: str,
    owner_id: str,
    file_bytes: bytes,
    content_type: str,
) -> dict[str, str | None]:
    """
    Process an uploaded image file:
      1. Parse and auto-rotate
      2. Generate thumbnail + preview
      3. Upload all three to S3
    Returns dict with s3 keys and optional exif_date.
    """
    s3 = _make_s3()
    base_prefix = f"photos/{owner_id}/{photo_id}"

    img = Image.open(io.BytesIO(file_bytes))
    img = _fix_orientation(img)
    exif_date = _exif_date(img)

    # Original
    full_key = f"{base_prefix}/original.jpg"
    s3.put_object(
        Bucket=settings.s3_bucket_photos,
        Key=full_key,
        Body=file_bytes,
        ContentType=content_type,
    )

    # Thumbnail
    thumb_bytes = _make_thumbnail(img, settings.thumbnail_size)
    thumb_key = f"{base_prefix}/thumbnail.jpg"
    s3.put_object(
        Bucket=settings.s3_bucket_photos,
        Key=thumb_key,
        Body=thumb_bytes,
        ContentType="image/jpeg",
    )

    # Preview
    preview_bytes = _make_preview(img, settings.preview_width)
    preview_key = f"{base_prefix}/preview.jpg"
    s3.put_object(
        Bucket=settings.s3_bucket_photos,
        Key=preview_key,
        Body=preview_bytes,
        ContentType="image/jpeg",
    )

    logger.info("Uploaded photo %s to S3 (orig=%s)", photo_id, full_key)

    return {
        "full_s3_key": full_key,
        "thumbnail_s3_key": thumb_key,
        "preview_s3_key": preview_key,
        "exif_date": exif_date,
    }
