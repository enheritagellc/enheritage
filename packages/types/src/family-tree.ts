import type { UUID, ISO8601, AuditFields, DateRange } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum RelationshipType {
  CHILD_OF = 'CHILD_OF',
  PARENT_OF = 'PARENT_OF',
  SPOUSE_OF = 'SPOUSE_OF',
  SIBLING_OF = 'SIBLING_OF',
  PARTNER_OF = 'PARTNER_OF',
  STEP_CHILD_OF = 'STEP_CHILD_OF',
  ADOPTED_BY = 'ADOPTED_BY',
}

export enum RelationshipStatus {
  CONFIRMED = 'CONFIRMED',
  SUGGESTED = 'SUGGESTED',
  DISPUTED = 'DISPUTED',
}

// ---------------------------------------------------------------------------
// TreeNode — a single person in the family tree
// ---------------------------------------------------------------------------

export interface TreeNode extends AuditFields {
  id: UUID;
  treeId: UUID;
  firstName: string;
  lastName: string;
  /** Maiden name or name at birth, if different from lastName */
  birthName?: string;
  birthDate?: ISO8601;
  birthPlace?: string;
  deathDate?: ISO8601;
  deathPlace?: string;
  /** Reference to a MediaAsset (PHOTO type) used as the node portrait */
  photoMediaAssetId?: UUID;
  notes?: string;
  /** Cross-reference to a FamilySearch person record */
  familySearchPersonId?: string;
  /** GEDCOM 5.5.1 INDI xref_id for import/export fidelity */
  gedcomId?: string;
  /** True for the elderly parent who is the subject of the biography */
  isSubject: boolean;
}

// ---------------------------------------------------------------------------
// Relationship — a directed edge between two TreeNodes
// ---------------------------------------------------------------------------

export interface Relationship extends AuditFields {
  id: UUID;
  treeId: UUID;
  fromNodeId: UUID;
  toNodeId: UUID;
  type: RelationshipType;
  status: RelationshipStatus;
  /** Optional date range for the relationship (e.g. marriage dates) */
  dateRange?: DateRange;
  /** The transcript segment that provided evidence for this relationship */
  sourceTranscriptSegmentId?: UUID;
  /** Model or curator confidence score, 0–1 */
  confidence: number;
}

// ---------------------------------------------------------------------------
// FamilyTree
// ---------------------------------------------------------------------------

export interface FamilyTree extends AuditFields {
  id: UUID;
  ownerId: UUID;
  /** UUID of the TreeNode representing the biography subject */
  subjectNodeId: UUID;
  name: string;
  nodes: TreeNode[];
  relationships: Relationship[];
  /** S3 key of the GEDCOM 5.5.1 export file, populated after export */
  gedcomExportS3Key?: string;
}
