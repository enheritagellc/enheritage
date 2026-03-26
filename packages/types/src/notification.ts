import type { UUID, ISO8601, AuditFields } from './common.js';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export enum NotificationChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  PUSH = 'PUSH',
}

export enum NotificationType {
  TRANSCRIPT_READY = 'TRANSCRIPT_READY',
  BIOGRAPHY_READY = 'BIOGRAPHY_READY',
  KEEPSAKE_SHIPPED = 'KEEPSAKE_SHIPPED',
  SESSION_REMINDER = 'SESSION_REMINDER',
  SUBSCRIPTION_RENEWAL = 'SUBSCRIPTION_RENEWAL',
  INACTIVITY_NUDGE = 'INACTIVITY_NUDGE',
  ENTERPRISE_ALERT = 'ENTERPRISE_ALERT',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  BOUNCED = 'BOUNCED',
}

// ---------------------------------------------------------------------------
// Notification
// ---------------------------------------------------------------------------

export interface Notification extends AuditFields {
  id: UUID;
  userId: UUID;
  channel: NotificationChannel;
  type: NotificationType;
  status: NotificationStatus;
  /** Email subject line — only applicable for EMAIL channel */
  subject?: string;
  /** Rendered message body (plain-text for SMS, HTML for EMAIL, JSON for PUSH) */
  body: string;
  sentAt?: ISO8601;
  deliveredAt?: ISO8601;
  errorMessage?: string;
  /**
   * Upstream provider message ID for delivery tracking:
   * - EMAIL: AWS SES MessageId
   * - SMS: Twilio SID
   * - PUSH: FCM/APNS message ID
   */
  externalMessageId?: string;
}
