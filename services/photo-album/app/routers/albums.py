"""Album CRUD endpoints."""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Query

from app.db import Db
from app.models.schemas import AlbumCreate, AlbumUpdate, AlbumDetailResponse, AlbumResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/albums", tags=["albums"])


def _row_to_album(row: dict) -> dict:
    return {
        "id": str(row["id"]),
        "owner_id": str(row["owner_id"]),
        "biography_id": str(row["biography_id"]) if row.get("biography_id") else None,
        "title": row["title"],
        "description": row.get("description"),
        "cover_photo_id": str(row["cover_photo_id"]) if row.get("cover_photo_id") else None,
        "photo_count": row.get("photo_count", 0),
        "created_at": row["created_at"].isoformat() if isinstance(row["created_at"], datetime) else str(row["created_at"]),
        "updated_at": row["updated_at"].isoformat() if isinstance(row["updated_at"], datetime) else str(row["updated_at"]),
    }


def _row_to_photo(row: dict) -> dict:
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


# ── Create album ──────────────────────────────────────────────────────────────

@router.post("", status_code=201, response_model=AlbumResponse)
async def create_album(body: AlbumCreate) -> dict:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """INSERT INTO photo_albums (owner_id, title, description, biography_id)
                   VALUES (%s, %s, %s, %s) RETURNING *""",
                (body.owner_id, body.title, body.description, body.biography_id),
            )
            row = dict(zip([d[0] for d in cur.description], cur.fetchone()))
    return {**_row_to_album(row), "photo_count": 0}


# ── List albums for owner ─────────────────────────────────────────────────────

@router.get("", response_model=list[AlbumResponse])
async def list_albums(owner_id: str = Query(...)) -> list[dict]:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """SELECT a.*, COUNT(p.id)::int AS photo_count
                   FROM photo_albums a
                   LEFT JOIN photos p ON p.album_id = a.id
                   WHERE a.owner_id = %s
                   GROUP BY a.id
                   ORDER BY a.created_at DESC""",
                (owner_id,),
            )
            cols = [d[0] for d in cur.description]
            rows = [dict(zip(cols, r)) for r in cur.fetchall()]
    return [_row_to_album(r) for r in rows]


# ── Get album with photos ─────────────────────────────────────────────────────

@router.get("/{album_id}", response_model=AlbumDetailResponse)
async def get_album(album_id: str) -> dict:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT * FROM photo_albums WHERE id = %s", (album_id,))
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Album not found")
            cols = [d[0] for d in cur.description]
            album = dict(zip(cols, row))

            cur.execute(
                "SELECT * FROM photos WHERE album_id = %s ORDER BY order_index, created_at",
                (album_id,),
            )
            photo_cols = [d[0] for d in cur.description]
            photos = [dict(zip(photo_cols, r)) for r in cur.fetchall()]

    # Parse JSON columns
    for p in photos:
        for col in ("rekognition_labels", "faces"):
            if isinstance(p.get(col), str):
                p[col] = json.loads(p[col])

    return {
        **_row_to_album(album),
        "photo_count": len(photos),
        "photos": [_row_to_photo(p) for p in photos],
    }


# ── Update album ──────────────────────────────────────────────────────────────

@router.patch("/{album_id}", response_model=AlbumResponse)
async def update_album(album_id: str, body: AlbumUpdate) -> dict:
    updates: dict[str, object] = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")

    col_map = {"title": "title", "description": "description", "cover_photo_id": "cover_photo_id"}
    sets, values = [], []
    for key, col in col_map.items():
        if key in updates:
            sets.append(f"{col} = %s")
            values.append(updates[key])

    sets.append("updated_at = NOW()")
    values.append(album_id)

    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"UPDATE photo_albums SET {', '.join(sets)} WHERE id = %s RETURNING *",
                values,
            )
            row = cur.fetchone()
            if not row:
                raise HTTPException(status_code=404, detail="Album not found")
            cols = [d[0] for d in cur.description]
            album = dict(zip(cols, row))

    return {**_row_to_album(album), "photo_count": 0}


# ── Delete album ──────────────────────────────────────────────────────────────

@router.delete("/{album_id}", status_code=204)
async def delete_album(album_id: str) -> None:
    with Db() as conn:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM photo_albums WHERE id = %s RETURNING id", (album_id,))
            if not cur.fetchone():
                raise HTTPException(status_code=404, detail="Album not found")
