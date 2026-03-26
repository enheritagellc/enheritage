// ---------------------------------------------------------------------------
// Primitive aliases
// ---------------------------------------------------------------------------

/** A UUID v4 string, e.g. "550e8400-e29b-41d4-a716-446655440000" */
export type UUID = string;

/** An ISO-8601 date-time string, e.g. "2024-01-15T10:30:00.000Z" */
export type ISO8601 = string;

/** ISO 4217 currency code, e.g. 'USD' */
export type Currency = string;

// ---------------------------------------------------------------------------
// Audit & soft-delete
// ---------------------------------------------------------------------------

export interface AuditFields {
  createdAt: ISO8601;
  updatedAt: ISO8601;
  createdBy: UUID;
  updatedBy: UUID;
}

export interface SoftDelete {
  deletedAt?: ISO8601;
  deletedBy?: UUID;
}

// ---------------------------------------------------------------------------
// Pagination & API responses
// ---------------------------------------------------------------------------

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

export interface MonetaryAmount {
  amount: number;
  currency: Currency;
}

// ---------------------------------------------------------------------------
// Location
// ---------------------------------------------------------------------------

export interface Address {
  street1: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}

export interface GeoPoint {
  lat: number;
  lng: number;
}

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

export interface DateRange {
  start: ISO8601;
  end: ISO8601;
}

// ---------------------------------------------------------------------------
// Processing status (shared across media, transcription, enrichment, etc.)
// ---------------------------------------------------------------------------

export enum ProcessingStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}
