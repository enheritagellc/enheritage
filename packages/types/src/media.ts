import type { UUID, ISO8601, AuditFields, ProcessingStatus } from './common.js';

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export enum MediaType {
  AUDIO = 'AUDIO',
  VIDEO = 'VIDEO',
  PHOTO = 'PHOTO',
  DOCUMENT = 'DOCUMENT',
}

// ---------------------------------------------------------------------------
// MediaAsset — the canonical record for every uploaded file
// ---------------------------------------------------------------------------

export interface MediaAsset extends AuditFields {
  id: UUID;
  vaultId: UUID;
  ownerId: UUID;
  /** Full S3 object key inside the vault bucket */
  s3Key: string;
  s3Bucket: string;
  /** MIME type, e.g. "video/mp4", "audio/wav", "image/jpeg" */
  contentType: string;
  sizeBytes: number;
  /** Duration in seconds — populated for AUDIO and VIDEO assets */
  durationSeconds?: number;
  /** Width in pixels — populated for PHOTO assets */
  width?: number;
  /** Height in pixels — populated for PHOTO assets */
  height?: number;
  originalFilename: string;
  mediaType: MediaType;
  processingStatus: ProcessingStatus;
  /** Raw EXIF metadata extracted during photo processing */
  exifData?: Record<string, unknown>;
  uploadedAt: ISO8601;
}

// ---------------------------------------------------------------------------
// UploadSession — tracks S3 multipart upload lifecycle
// ---------------------------------------------------------------------------

export interface UploadSession {
  id: UUID;
  ownerId: UUID;
  /** AWS S3 multipart upload ID returned by CreateMultipartUpload */
  s3UploadId: string;
  s3Key: string;
  s3Bucket: string;
  /** Total number of parts the client will upload */
  partCount: number;
  /** Part numbers that have been successfully uploaded and confirmed */
  completedParts: number[];
  /** The presigned URL set expires at this timestamp */
  expiresAt: ISO8601;
  mediaType: MediaType;
}

// ---------------------------------------------------------------------------
// ProcessingJob — tracks async media processing tasks (transcoding, etc.)
// ---------------------------------------------------------------------------

export interface ProcessingJob extends AuditFields {
  id: UUID;
  mediaAssetId: UUID;
  /** Discriminator string, e.g. "audio-transcode", "thumbnail-generate" */
  jobType: string;
  status: ProcessingStatus;
  /** SQS message ID for deduplication / dead-letter tracing */
  queueMessageId: string;
  startedAt?: ISO8601;
  completedAt?: ISO8601;
  errorMessage?: string;
}
