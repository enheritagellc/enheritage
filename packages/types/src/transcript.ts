import type { UUID, ISO8601, AuditFields, ProcessingStatus } from './common.js';

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export enum Speaker {
  ADULT_CHILD = 'ADULT_CHILD',
  PARENT = 'PARENT',
  UNKNOWN = 'UNKNOWN',
}

// ---------------------------------------------------------------------------
// Word-level timing (from Whisper word_timestamps output)
// ---------------------------------------------------------------------------

export interface TimedWord {
  word: string;
  /** Offset in seconds from the start of the audio */
  startTime: number;
  endTime: number;
  /** Whisper token-level probability, 0–1 */
  confidence: number;
}

// ---------------------------------------------------------------------------
// Segment — a contiguous block of speech from a single speaker
// ---------------------------------------------------------------------------

export interface TranscriptSegment {
  id: UUID;
  segmentIndex: number;
  speaker: Speaker;
  text: string;
  startTime: number;
  endTime: number;
  timedWords: TimedWord[];
  /** Mean confidence across all timedWords in this segment */
  averageConfidence: number;
  /** Flagged for human review when averageConfidence falls below threshold */
  requiresReview: boolean;
}

// ---------------------------------------------------------------------------
// Transcript — top-level record produced by the transcription service
// ---------------------------------------------------------------------------

export interface Transcript extends AuditFields {
  id: UUID;
  interviewId: UUID;
  vaultId: UUID;
  /** S3 key of the canonical JSON transcript file */
  s3Key: string;
  /** BCP-47 language code detected/confirmed by Whisper, e.g. "en" */
  language: string;
  segments: TranscriptSegment[];
  /** Concatenation of all segment texts with speaker labels stripped */
  fullText: string;
  totalDurationSeconds: number;
  wordCount: number;
  /** Weighted mean confidence across all segments */
  averageConfidence: number;
  /** Semver of the Whisper model used, e.g. "large-v3" */
  whisperModelVersion: string;
  /** Semver of the pyannote diarization model, e.g. "3.1.0" */
  diarizationModelVersion: string;
  processingStatus: ProcessingStatus;
  reviewedAt?: ISO8601;
  reviewedBy?: UUID;
}
