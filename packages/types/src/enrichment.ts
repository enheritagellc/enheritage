import type { UUID, ISO8601, AuditFields, ProcessingStatus } from './common.js';
import type { EntityType } from './nlp.js';

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export enum EnrichmentProvider {
  GOOGLE_MAPS = 'GOOGLE_MAPS',
  WIKIPEDIA = 'WIKIPEDIA',
  NEWS_API = 'NEWS_API',
  FIND_A_GRAVE = 'FIND_A_GRAVE',
  LEGACY_COM = 'LEGACY_COM',
  INTERNET_ARCHIVE = 'INTERNET_ARCHIVE',
  FAMILY_SEARCH = 'FAMILY_SEARCH',
  CLEARBIT = 'CLEARBIT',
}

// ---------------------------------------------------------------------------
// EnrichmentLink — a single external resource discovered for an entity
// ---------------------------------------------------------------------------

export interface EnrichmentLink {
  id: UUID;
  entityId: UUID;
  provider: EnrichmentProvider;
  url: string;
  title: string;
  /** Short excerpt from the target page, max 200 chars */
  snippet: string;
  thumbnailUrl?: string;
  retrievedAt: ISO8601;
  /** Provider-specific relevance score normalised to 0–1 */
  confidence: number;
  /** True when a curator or the user has manually confirmed this link */
  isVerified: boolean;
}

// ---------------------------------------------------------------------------
// CitationObject — the resolved, user-facing citation card for an entity
// ---------------------------------------------------------------------------

export interface CitationObject {
  id: UUID;
  entityId: UUID;
  entityType: EntityType;
  /** Human-readable label shown in the biography inline citation */
  displayLabel: string;
  /** The single best link surfaced as the primary citation */
  primaryLink?: EnrichmentLink;
  /** Supporting links displayed in an expandable "more sources" section */
  additionalLinks: EnrichmentLink[];
  /** Google Maps embed URL — only populated for GPE entities */
  mapsEmbed?: string;
  /** When true the user has requested this citation be hidden from exports */
  isExcluded: boolean;
}

// ---------------------------------------------------------------------------
// EnrichmentJob — orchestrates enrichment across all entities in a NERResult
// ---------------------------------------------------------------------------

export interface EnrichmentJob extends AuditFields {
  id: UUID;
  nerId: UUID;
  status: ProcessingStatus;
  citations: CitationObject[];
  totalEntities: number;
  enrichedEntities: number;
  failedEntities: number;
}
