from __future__ import annotations
from typing import Any
from pydantic import BaseModel, Field


# ── Albums ───────────────────────────────────────────────────────────────────

class AlbumCreate(BaseModel):
    owner_id: str
    title: str
    description: str | None = None
    biography_id: str | None = None


class AlbumUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    cover_photo_id: str | None = None


class AlbumResponse(BaseModel):
    id: str
    owner_id: str
    biography_id: str | None
    title: str
    description: str | None
    cover_photo_id: str | None
    photo_count: int = 0
    created_at: str
    updated_at: str


class AlbumDetailResponse(AlbumResponse):
    photos: list[PhotoResponse] = Field(default_factory=list)


# ── Photos ───────────────────────────────────────────────────────────────────

class PhotoUpdate(BaseModel):
    caption_user: str | None = None
    order_index: int | None = None
    taken_at: str | None = None


class FaceLabelUpdate(BaseModel):
    labeled_name: str


class RekognitionLabel(BaseModel):
    name: str
    confidence: float
    categories: list[str] = Field(default_factory=list)


class FaceMatch(BaseModel):
    face_id: str
    bounding_box: dict[str, float]
    confidence: float
    is_labeled: bool = False
    labeled_name: str | None = None


class PhotoResponse(BaseModel):
    id: str
    album_id: str
    owner_id: str
    media_asset_id: str | None
    caption_ai: str | None
    caption_user: str | None
    taken_at: str | None
    latitude: float | None
    longitude: float | None
    location_label: str | None
    rekognition_labels: list[Any] = Field(default_factory=list)
    faces: list[Any] = Field(default_factory=list)
    thumbnail_s3_key: str | None
    preview_s3_key: str | None
    full_s3_key: str | None
    order_index: int
    created_at: str
    updated_at: str


class HealthResponse(BaseModel):
    status: str = "ok"
    service: str = "photo-album"
    version: str = "0.1.0"
