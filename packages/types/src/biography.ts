import type { UUID, ISO8601, AuditFields } from './common.js';
import type { CitationObject } from './enrichment.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum BiographyStatus {
  DRAFT = 'DRAFT',
  OUTLINE_PENDING_REVIEW = 'OUTLINE_PENDING_REVIEW',
  DRAFTING = 'DRAFTING',
  REVIEW_PENDING = 'REVIEW_PENDING',
  APPROVED = 'APPROVED',
  PUBLISHED = 'PUBLISHED',
}

export enum GenerationPass {
  OUTLINE = 'OUTLINE',
  CHAPTER_DRAFT = 'CHAPTER_DRAFT',
  CONSISTENCY_REVIEW = 'CONSISTENCY_REVIEW',
  STYLE_POLISH = 'STYLE_POLISH',
}

// ---------------------------------------------------------------------------
// Chapter
// ---------------------------------------------------------------------------

export interface BiographyChapter {
  id: UUID;
  biographyId: UUID;
  /** 1-based display order */
  order: number;
  title: string;
  /** Chapter body rendered as Markdown */
  content: string;
  wordCount: number;
  /** LLM model identifier used to produce this chapter, e.g. "gpt-4o-2024-08-06" */
  generationModel: string;
  generationPass: GenerationPass;
  /** Inline citations embedded within this chapter */
  citations: CitationObject[];
  isApproved: boolean;
  approvedAt?: ISO8601;
  approvedBy?: UUID;
}

// ---------------------------------------------------------------------------
// Biography
// ---------------------------------------------------------------------------

export interface Biography extends AuditFields {
  id: UUID;
  ownerId: UUID;
  interviewId: UUID;
  transcriptId: UUID;
  enrichmentJobId: UUID;
  title: string;
  subtitle?: string;
  chapters: BiographyChapter[];
  status: BiographyStatus;
  totalWordCount: number;
  /** Estimated reading time calculated as totalWordCount / 238 (avg wpm) */
  readingTimeMinutes: number;
  /** Primary LLM used for generation, e.g. "gpt-4o-2024-08-06" */
  generationModelPrimary: string;
  /** Fallback LLM if primary is unavailable */
  generationModelFallback?: string;
  outlineApprovedAt?: ISO8601;
  publishedAt?: ISO8601;
  /** S3 key of the rendered HTML export */
  s3HtmlKey?: string;
  /** S3 key of the rendered PDF export */
  s3PdfKey?: string;
}
