import type { UUID, AuditFields, Address, MonetaryAmount } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum KeepsakeType {
  DIGITAL_BIOGRAPHY = 'DIGITAL_BIOGRAPHY',
  SOFTCOVER_BOOK = 'SOFTCOVER_BOOK',
  HARDCOVER_BOOK = 'HARDCOVER_BOOK',
  COLLECTORS_EDITION = 'COLLECTORS_EDITION',
  PHOTO_ALBUM_PRINT = 'PHOTO_ALBUM_PRINT',
  FAMILY_TREE_PRINT = 'FAMILY_TREE_PRINT',
}

export enum KeepsakeStatus {
  PENDING = 'PENDING',
  GENERATING = 'GENERATING',
  QA_REVIEW = 'QA_REVIEW',
  APPROVED = 'APPROVED',
  PRINT_SUBMITTED = 'PRINT_SUBMITTED',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
}

// ---------------------------------------------------------------------------
// PrintSpec — technical specification forwarded to the print-on-demand vendor
// ---------------------------------------------------------------------------

export interface PrintSpec {
  pageCount: number;
  /** e.g. "80gsm-matte", "100gsm-gloss" */
  paperType: string;
  /** e.g. "perfect-bound", "case-wrap", "saddle-stitch" */
  bindingType: string;
  /** ICC colour profile name, e.g. "FOGRA39", "SWOP2006_Coated5v2" */
  colorProfile: string;
  /** Print resolution in dots-per-inch, typically 300 */
  dpi: number;
  /** Finished trim size, e.g. "8.5x11", "6x9" */
  trimSize: string;
  /** Bleed margin in inches, typically 0.125 */
  bleedMargin: number;
}

// ---------------------------------------------------------------------------
// Keepsake — a physical or digital deliverable ordered by the user
// ---------------------------------------------------------------------------

export interface Keepsake extends AuditFields {
  id: UUID;
  ownerId: UUID;
  /** Linked biography — required for book and digital biography types */
  biographyId?: UUID;
  /** Linked photo album — required for PHOTO_ALBUM_PRINT type */
  photoAlbumId?: UUID;
  /** Linked family tree — required for FAMILY_TREE_PRINT type */
  familyTreeId?: UUID;
  type: KeepsakeType;
  status: KeepsakeStatus;
  title: string;
  /** S3 key of the print-ready PDF produced by the render service */
  pdfS3Key?: string;
  printSpec?: PrintSpec;
  /** Printful order ID returned after successful order submission */
  printfulOrderId?: string;
  trackingNumber?: string;
  shippingAddress?: Address;
  price: MonetaryAmount;
}
