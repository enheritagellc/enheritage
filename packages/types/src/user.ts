import type { UUID, ISO8601, AuditFields, SoftDelete } from './common.js';
import type { NotificationChannel } from './notification.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum UserTier {
  FREE = 'FREE',
  STANDARD = 'STANDARD',
  PREMIUM = 'PREMIUM',
  ELITE = 'ELITE',
  ENTERPRISE = 'ENTERPRISE',
}

export enum UserRole {
  OWNER = 'OWNER',
  COLLABORATOR = 'COLLABORATOR',
  VIEWER = 'VIEWER',
  ENTERPRISE_STAFF = 'ENTERPRISE_STAFF',
  ADMIN = 'ADMIN',
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

export interface UserPreferences {
  /** Which channels the user has opted in to receive notifications on */
  notificationChannels: NotificationChannel[];
  /** IANA timezone string, e.g. "America/New_York" */
  timezone: string;
  /** BCP-47 language tag, e.g. "en-US" */
  language: string;
  /** Accessibility: increase base font size throughout the UI */
  largeTextMode: boolean;
  /** Accessibility: enable high-contrast colour scheme */
  highContrastMode: boolean;
}

// ---------------------------------------------------------------------------
// Core user entity
// ---------------------------------------------------------------------------

export interface User extends AuditFields, SoftDelete {
  id: UUID;
  email: string;
  firstName: string;
  lastName: string;
  /** Public-facing name shown on shared content */
  displayName: string;
  /** Auth0 subject claim, e.g. "auth0|abc123" */
  auth0Sub: string;
  tier: UserTier;
  role: UserRole;
  preferences: UserPreferences;
  /** Set when the user belongs to an enterprise account */
  enterpriseAccountId?: UUID;
  /** When true, the UI renders in an elderly-friendly mode (large text, simplified navigation) */
  isElderlyMode: boolean;
}

// ---------------------------------------------------------------------------
// Enterprise
// ---------------------------------------------------------------------------

export interface EnterpriseAccount extends AuditFields {
  id: UUID;
  name: string;
  /** Billing plan identifier, e.g. "enterprise-50" */
  plan: string;
  maxUsers: number;
  contractStartDate: ISO8601;
  contractEndDate: ISO8601;
  /** Email address for billing correspondence */
  billingContact: string;
}
