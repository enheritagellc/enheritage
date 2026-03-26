import type { UUID, ISO8601 } from './common.js';
import type { InterviewFormat } from './interview.js';
import type { MediaType } from './media.js';
import type { KeepsakeType } from './keepsake.js';
import type { NotificationChannel, NotificationType } from './notification.js';

// ---------------------------------------------------------------------------
// Union of all domain event type strings
// ---------------------------------------------------------------------------

export type DomainEventType =
  | 'interview.started'
  | 'interview.ended'
  | 'media.upload.complete'
  | 'transcription.queued'
  | 'transcription.started'
  | 'transcription.complete'
  | 'transcription.failed'
  | 'ner.queued'
  | 'ner.complete'
  | 'enrichment.queued'
  | 'enrichment.complete'
  | 'biography.generation.queued'
  | 'biography.generation.started'
  | 'biography.generation.complete'
  | 'biography.generation.failed'
  | 'keepsake.render.requested'
  | 'keepsake.render.complete'
  | 'notification.send';

// ---------------------------------------------------------------------------
// Generic envelope — all SQS messages are wrapped in this shape
// ---------------------------------------------------------------------------

export interface DomainEvent<T = unknown> {
  id: UUID;
  type: DomainEventType;
  occurredAt: ISO8601;
  /** The primary aggregate this event relates to */
  aggregateId: UUID;
  /** e.g. "Interview", "MediaAsset", "Transcript" */
  aggregateType: string;
  payload: T;
  /** Trace ID for distributed tracing across services */
  correlationId: UUID;
  /** ID of the event or request that directly caused this event */
  causationId?: UUID;
}

// ---------------------------------------------------------------------------
// Typed payload interfaces — one per DomainEventType
// ---------------------------------------------------------------------------

export interface InterviewStartedPayload {
  interviewId: UUID;
  ownerId: UUID;
  format: InterviewFormat;
}

export interface InterviewEndedPayload {
  interviewId: UUID;
  ownerId: UUID;
  recordingS3Key: string;
  durationSeconds: number;
}

export interface MediaUploadCompletePayload {
  mediaAssetId: UUID;
  ownerId: UUID;
  vaultId: UUID;
  mediaType: MediaType;
  s3Key: string;
}

export interface TranscriptionQueuedPayload {
  mediaAssetId: UUID;
  transcriptId: UUID;
  ownerId: UUID;
  vaultId: UUID;
  /** S3 key of the audio file to be transcribed */
  audioS3Key: string;
  durationSeconds: number;
}

export interface TranscriptionCompletePayload {
  transcriptId: UUID;
  ownerId: UUID;
  vaultId: UUID;
  /** S3 key of the produced JSON transcript file */
  transcriptS3Key: string;
  wordCount: number;
}

export interface NERQueuedPayload {
  transcriptId: UUID;
  nerId: UUID;
  ownerId: UUID;
}

export interface NERCompletePayload {
  nerId: UUID;
  transcriptId: UUID;
  ownerId: UUID;
  entityCount: number;
}

export interface EnrichmentQueuedPayload {
  nerId: UUID;
  enrichmentJobId: UUID;
  ownerId: UUID;
  entityIds: UUID[];
}

export interface EnrichmentCompletePayload {
  enrichmentJobId: UUID;
  ownerId: UUID;
  citationCount: number;
}

export interface BiographyGenerationQueuedPayload {
  biographyId: UUID;
  transcriptId: UUID;
  enrichmentJobId: UUID;
  ownerId: UUID;
}

export interface BiographyGenerationCompletePayload {
  biographyId: UUID;
  ownerId: UUID;
  wordCount: number;
  chapterCount: number;
}

export interface KeepsakeRenderRequestedPayload {
  keepsakeId: UUID;
  ownerId: UUID;
  type: KeepsakeType;
}

export interface NotificationSendPayload {
  userId: UUID;
  channel: NotificationChannel;
  type: NotificationType;
  /** Key-value pairs injected into the notification template */
  templateData: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Convenience typed event aliases
// ---------------------------------------------------------------------------

export type InterviewStartedEvent = DomainEvent<InterviewStartedPayload>;
export type InterviewEndedEvent = DomainEvent<InterviewEndedPayload>;
export type MediaUploadCompleteEvent = DomainEvent<MediaUploadCompletePayload>;
export type TranscriptionQueuedEvent = DomainEvent<TranscriptionQueuedPayload>;
export type TranscriptionCompleteEvent = DomainEvent<TranscriptionCompletePayload>;
export type NERQueuedEvent = DomainEvent<NERQueuedPayload>;
export type NERCompleteEvent = DomainEvent<NERCompletePayload>;
export type EnrichmentQueuedEvent = DomainEvent<EnrichmentQueuedPayload>;
export type EnrichmentCompleteEvent = DomainEvent<EnrichmentCompletePayload>;
export type BiographyGenerationQueuedEvent = DomainEvent<BiographyGenerationQueuedPayload>;
export type BiographyGenerationCompleteEvent = DomainEvent<BiographyGenerationCompletePayload>;
export type KeepsakeRenderRequestedEvent = DomainEvent<KeepsakeRenderRequestedPayload>;
export type NotificationSendEvent = DomainEvent<NotificationSendPayload>;
