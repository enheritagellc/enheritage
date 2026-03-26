"""Photo upload, retrieval, update, delete, and face-labeling endpoints."""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.db import Db
from app.models.schemas import FaceLabelUpdate, PhotoUpdate
from app.services.captioner import generate_caption
from app.services.image_processor import process_and_upload
from app.services.rekognition import detect_faces, detect_labels

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/albums/{album_id}/photos", tags=["photos"])


def _row_to_photo(row: dict) -> dict:
    for col in ("rekognition_labels", "faces"):
        if isinstance(row.get(col), str):
            row[col] = json.loads(row[col])
    return {
        "id": str(row["id"]),
        "album_id": str(row["album_id"]),
        "owner_id": str(row["owner_id"]),
        "media_asset_id": str(row["media_asset_id"]) if row.get("media_asset_id") else None,
        "caption_ai": row.get("caption_ai"),
        "caption_user": row.get("caption_user"),
        "taken_at": row["taken_at"].isoformat() if row.get("taken_at") and isinstance(row["taken_at"], datetime) else row.get("taken_at"),
        "latitude": row.get("latitude"),
        "longitude": row.get("longitude"),
        "location_label": row.get("location_label"),
        "rekognition_labels": row.get("rekognition_labels") or [],
        "faces": row.get("faces") or [],
        "thumbnail_s3_key": row.get("thumbnail_s3_key"),
        "preview_s3_key": row.get("preview_s3_key"),
        "full_s3_key": row.get("full_s3_key"),
        "order_index": row.get("order_index", 0),
        "created_at": row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else str(row["created_at"]),
        "updated_at": row["updated_at"].isoformat() if isinstance(row["updated_at"], datetime) else str(row["updated_at"]),
    }


def _get_album_owner(conn, album_id: str) -> str:
    with conn.cursor() as cur:
        cur.execute("SELECT owner_id FROM photo_albums WHERE id = %s", (album_id,))
        row = cur.fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Album not found")
        return str(row[0])


# ── Upload photo ──────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def upload_photo(
    album_id: str,
    file: UploadFile = File(...),
    owner_id: str = Form(...),
    vault_id: str = Form(default=""),
) -> dict:
    content_type = file.content_type or "image/jpeg"
    if not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted")

    file_bytes = await file.read()
    if len(file_bytes) > 50 * 1024 * 1024:  # 50 MB guard
        raise HTTPException(status_code=413, detail="Image exceeds 50 MB limit")

    photo_id = str(uuid.uuid4())

    # 1. Resize + upload to S3
    s3_result = process_and_upload(photo_id, owner_id, file_bytes, content_type)

    # 2. AI caption (use preview bytes for speed — regenerated from original in memory)
    caption_ai = generate_caption(file_bytes, content_type)

    # 3. Rekognition labels + faces
    labels = detect_labels(file_bytes)
    faces = detect_faces(file_bytes, vault_id or owner_id)

    # 4. Parse EXIF date
    taken_at = s3_result.get("exif_date")

    with Db() as conn:
        owner_check = _get_album_owner(conn, album_id)
        if owner_check != owner_id:
            raise HTTPException(status_code=403, detail="Album belongs to a different owner")

        with conn.cursor() as cur:
            # Determine display order (next available)
            cur.execute("SELECT COALESCE(MAX(order_index), -1) + 1 FROM photos WHERE album_id = %s", (album_id,))
            order_index = cur.fetchone()[0]

            cur.execute(
                """INSERT INTO photos
                     (id, album_id, owner_id, caption_ai, taken_at,
                      rekognition_labels, faces,
                      thumbnail_s3_key, preview_s3_key, full_s3_key, order_index)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                   RETURNING *""",
                (
                    photo_id, album_id, owner_id, caption_ai, taken_at,
                    json.dumps(labels), json.dumps(faces),
                    s3_result["thumbnail_s3_key"],
                    s3_result["preview_s3_key"],
                    s3_result["full_s3_key"],
                    order_index,
                ),
            )
            cols = [d[0] for d in cur.description]
            row = dict(zip(cols, cur.fetchone()))

            # Set as cover if first photo
            cur.execute(
                "UPDATE photo_albums SET cover_photo_id = COALESCE(cover_photo_id, %s), updated_at = NOW() WHERE id = %s",
                (photo_id, album_id),
            )

    logger.info("Photo %s uploaded to album %s", photo_id, album_id)
    return _row_to_photo(row)


# ── Get photo ─────────────────────────────────────────────────────────────────

@router.get("/{photo_id}")
async def get_photo(album_id: str, photo_id: str) -> dict:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM photos WHERE id = %s AND album_id = %s",
                (photo_id, album_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Photo not found")
            cols = [d[0] for d in cur.description]
    return _row_to_photo(dict(zip(cols, row)))


# ── Update photo ──────────────────────────────────────────────────────────────

@router.patch("/{photo_id}")
async def update_photo(album_id: str, photo_id: str, body: PhotoUpdate) -> dict:
    col_map = {
        "caption_user": "caption_user",
        "order_index": "order_index",
        "taken_at": "taken_at",
    }
    sets, values = [], []
    for key, col in col_map.items():
        val = getattr(body, key)
        if val is not None:
            sets.append(f"{col} = %s")
            values.append(val)

    if not sets:
        raise HTTPException(status_code=400, detail="Nothing to update")

    sets.append("updated_at = NOW()")
    values.extend([photo_id, album_id])

    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE photos SET {', '.join(sets)} WHERE id = %s AND album_id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Photo not found")
            cols = [d[0] for d in cur.description]
    return _row_to_photo(dict(zip(cols, row)))


# ── Delete photo ──────────────────────────────────────────────────────────────

@router.delete("/{photo_id}", status_code=204)
async def delete_photo(album_id: str, photo_id: str) -> None:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM photos WHERE id = %s AND album_id = %s RETURNING id",
                (photo_id, album_id),
            )
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Photo not found")

            # Clear cover if this was the cover photo
            cur.execute(
                "UPDATE photo_albums SET cover_photo_id = NULL WHERE id = %s AND cover_photo_id = %s",
                (album_id, photo_id),
            )


# ── Label a face ──────────────────────────────────────────────────────────────

@router.patch("/{photo_id}/faces/{face_id}")
async def label_face(album_id: str, photo_id: str, face_id: str, body: FaceLabelUpdate) -> dict:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT faces FROM photos WHERE id = %s AND album_id = %s",
                (photo_id, album_id),
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Photo not found")

            raw = row[0]
            faces: list[dict] = json.loads(raw) if isinstance(raw, str) else (raw or [])

            face = next((f for f in faces if f.get("face_id") == face_id), None)
            if not face:
                raise HTTPException(status_code=404, detail="Face not found in this photo")

            face["labeled_name"] = body.labeled_name
            face["is_labeled"] = True

            cur.execute(
                "UPDATE photos SET faces = %s, updated_at = NOW() WHERE id = %s RETURNING *",
                (json.dumps(faces), photo_id),
            )
            cols = [d[0] for d in cur.description]
            updated = dict(zip(cols, cur.fetchone()))

    return _row_to_photo(updated)
