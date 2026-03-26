import type { UUID, ISO8601, AuditFields } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum InterviewStatus {
  SCHEDULED = 'SCHEDULED',
  WAITING = 'WAITING',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum InterviewFormat {
  VIDEO = 'VIDEO',
  AUDIO_ONLY = 'AUDIO_ONLY',
  ASYNC_UPLOAD = 'ASYNC_UPLOAD',
}

// ---------------------------------------------------------------------------
// Question
// ---------------------------------------------------------------------------

export interface InterviewQuestion {
  id: UUID;
  /** Display/presentation order within the question set */
  order: number;
  /** Thematic grouping, e.g. "childhood", "career", "family" */
  category: string;
  text: string;
  /** AI-suggested or curator-provided follow-up prompts */
  followUpPrompts: string[];
  isRequired: boolean;
}

// ---------------------------------------------------------------------------
// Interview session
// ---------------------------------------------------------------------------

export interface Interview extends AuditFields {
  id: UUID;
  /** UUID of the adult child who set up the interview */
  ownerId: UUID;
  /**
   * Opaque token sent to the elderly parent for one-click join.
   * Not a UUID — generated as a cryptographically-random URL-safe string.
   */
  parentParticipantToken: string;
  /** UUID of the adult-child user account */
  adultChildUserId: UUID;
  title: string;
  description: string;
  status: InterviewStatus;
  format: InterviewFormat;
  scheduledAt?: ISO8601;
  startedAt: ISO8601;
  endedAt?: ISO8601;
  /** Wall-clock duration of the recording in seconds */
  durationSeconds?: number;
  /** S3 key of the raw recording, set after session ends */
  recordingS3Key?: string;
  questionSet: InterviewQuestion[];
  notes: string;
}

// ---------------------------------------------------------------------------
// WebRTC session state (ephemeral, stored in Redis, typed here for contracts)
// ---------------------------------------------------------------------------

export interface WebRTCSessionState {
  sessionId: string;
  sdpOffer?: string;
  sdpAnswer?: string;
  iceCandidates: RTCIceCandidateInit[];
  participantCount: number;
  isRecording: boolean;
}
