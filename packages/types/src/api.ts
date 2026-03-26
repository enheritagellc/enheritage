import type { UUID, ISO8601 } from './common.js';
import type { InterviewFormat } from './interview.js';
import type { MediaType } from './media.js';

// ---------------------------------------------------------------------------
// Re-export core API response shapes from common
// ---------------------------------------------------------------------------

export type { ApiResponse, PaginatedResponse, ApiError } from './common.js';

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  /** Semver of the deployed service, e.g. "1.2.3" */
  version: string;
  /** Process uptime in seconds */
  uptime: number;
  timestamp: ISO8601;
}

// ---------------------------------------------------------------------------
// Interview
// ---------------------------------------------------------------------------

export interface CreateInterviewRequest {
  title: string;
  description: string;
  format: InterviewFormat;
  /** ISO-8601 datetime for when the session is scheduled */
  scheduledAt?: ISO8601;
  /** Reference to a pre-built question set template */
  questionSetId?: string;
}

// ---------------------------------------------------------------------------
// Media upload
// ---------------------------------------------------------------------------

export interface StartUploadRequest {
  /** Original filename as provided by the user's browser */
  filename: string;
  /** MIME type, e.g. "video/mp4" */
  contentType: string;
  /** File size in bytes — used to calculate S3 multipart part count */
  sizeBytes: number;
  mediaType: MediaType;
}

// ---------------------------------------------------------------------------
// Biography generation
// ---------------------------------------------------------------------------

export interface GenerateBiographyRequest {
  transcriptId: UUID;
  title: string;
  subtitle?: string;
  /**
   * Segment IDs the user wants to exclude from generation.
   * Useful for omitting sensitive or off-topic portions of the transcript.
   */
  excludedSegmentIds?: UUID[];
}

// ---------------------------------------------------------------------------
// Family tree
// ---------------------------------------------------------------------------

export interface CreateFamilyTreeRequest {
  name: string;
  subjectFirstName: string;
  subjectLastName: string;
  /** ISO-8601 date string, e.g. "1942-03-15" */
  subjectBirthDate?: ISO8601;
}

export interface AddTreeNodeRequest {
  treeId: UUID;
  firstName: string;
  lastName: string;
  birthDate?: ISO8601;
  birthPlace?: string;
}
