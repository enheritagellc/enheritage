import type { UUID, ISO8601, AuditFields, GeoPoint } from './common.js';

// ---------------------------------------------------------------------------
// Rekognition
// ---------------------------------------------------------------------------

export interface RekognitionLabel {
  /** AWS Rekognition label name, e.g. "Outdoor", "Person", "Wedding" */
  name: string;
  /** Confidence score returned by Rekognition, 0–100 */
  confidence: number;
  /** Parent category hierarchy, e.g. ["People", "Person"] */
  categories: string[];
}

// ---------------------------------------------------------------------------
// Face detection — all face IDs are scoped to the owning vault only
// ---------------------------------------------------------------------------

export interface FaceMatch {
  /**
   * Rekognition FaceId. Scoped per-vault: the same physical face will have
   * different IDs across different vaults to prevent cross-user linkage.
   */
  faceId: string;
  boundingBox: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
  /** Rekognition match confidence, 0–100 */
  confidence: number;
  /** True when a user has provided a name for this face */
  isLabeled: boolean;
  /** User-provided name for this face, e.g. "Grandma Rose" */
  labeledName?: string;
}

// ---------------------------------------------------------------------------
// Photo
// ---------------------------------------------------------------------------

export interface Photo extends AuditFields {
  id: UUID;
  albumId: UUID;
  ownerId: UUID;
  /** Reference to the underlying MediaAsset (type PHOTO) */
  mediaAssetId: UUID;
  /** AI-generated caption produced by the vision model */
  captionAi?: string;
  /** User-edited caption — overrides captionAi in all exports */
  captionUser?: string;
  takenAt?: ISO8601;
  location?: GeoPoint;
  /** Reverse-geocoded place name, e.g. "Chicago, IL, USA" */
  locationLabel?: string;
  rekognitionLabels: RekognitionLabel[];
  faces: FaceMatch[];
  /** S3 key for the 300 × 300 px thumbnail */
  thumbnailS3Key: string;
  /** S3 key for the 1200 px wide preview image */
  previewS3Key: string;
  /** S3 key for the original full-resolution file */
  fullS3Key: string;
  /** Display order within the album */
  order: number;
}

// ---------------------------------------------------------------------------
// PhotoAlbum
// ---------------------------------------------------------------------------

export interface PhotoAlbum extends AuditFields {
  id: UUID;
  ownerId: UUID;
  /** Optional linkage to a Biography — album may exist independently */
  biographyId?: UUID;
  title: string;
  description?: string;
  /** UUID of the Photo used as the album cover thumbnail */
  coverPhotoId?: UUID;
  photos: Photo[];
}
