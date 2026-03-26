import type { UUID, AuditFields, ProcessingStatus } from './common.js';

// ---------------------------------------------------------------------------
// Enum — entity types aligned with spaCy / OntoNotes 5 categories
// ---------------------------------------------------------------------------

export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  /** Geo-political entity: countries, cities, states */
  GPE = 'GPE',
  DATE = 'DATE',
  EVENT = 'EVENT',
  FACILITY = 'FACILITY',
  PRODUCT = 'PRODUCT',
}

// ---------------------------------------------------------------------------
// Entity — a single named entity extracted from a transcript segment
// ---------------------------------------------------------------------------

export interface Entity {
  id: UUID;
  type: EntityType;
  /** The exact text span as it appeared in the transcript */
  rawText: string;
  /** Normalized / display label after coreference resolution */
  normalizedLabel: string;
  /** Character offset from start of the parent segment's text */
  startCharIndex: number;
  endCharIndex: number;
  /** Model confidence score, 0–1 */
  confidence: number;
  /** Links back to the TranscriptSegment this entity was extracted from */
  segmentId: UUID;
  /** Set after entity disambiguation / clustering across the transcript */
  canonicalEntityId?: UUID;
  /** True when the entity could refer to more than one real-world referent */
  isAmbiguous: boolean;
}

// ---------------------------------------------------------------------------
// NERResult — the top-level NLP processing result for a transcript
// ---------------------------------------------------------------------------

export interface NERResult extends AuditFields {
  id: UUID;
  transcriptId: UUID;
  entities: Entity[];
  /** Identifier of the NER model used, e.g. "en_core_web_trf-3.7.3" */
  processingModelVersion: string;
  processingStatus: ProcessingStatus;
}
