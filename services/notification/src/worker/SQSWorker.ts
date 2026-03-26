/**
 * SQS long-poll worker for the notification service.
 *
 * Consumes events from the notification queue, renders the appropriate
 * template, dispatches via SES (email) or SNS (SMS), and persists a
 * record to the `notifications` table.
 *
 * Event shape expected on the queue:
 * {
 *   eventType: string,       // e.g. "keepsake.complete"
 *   userId?: string,         // used to look up the user's email/phone
 *   email?: string,          // override — used directly if provided
 *   phone?: string,          // override for SMS
 *   channel?: 'EMAIL'|'SMS'  // defaults to EMAIL
 *   ...payload               // event-specific fields passed to template
 * }
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
} from '@aws-sdk/client-sqs';
import type { Pool } from 'pg';
import { config } from '../config.js';
import { sendEmail } from '../channels/EmailChannel.js';
import { sendSms } from '../channels/SmsChannel.js';
import { renderTemplate } from '../channels/templates.js';

const WAIT_SECONDS = 20;
const MAX_MESSAGES = 5;

export class SQSWorker {
  private readonly sqs: SQSClient;
  private readonly db: Pool;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: Pool) {
    this.sqs = new SQSClient({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
    });
    this.db = db;
  }

  start(): void {
    if (this.running) return;
    if (!config.SQS_NOTIFICATION_QUEUE_URL) {
      console.warn('[notify-worker] SQS_NOTIFICATION_QUEUE_URL not set — worker disabled.');
      return;
    }
    this.running = true;
    console.info('[notify-worker] Started.');
    void this._poll();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.info('[notify-worker] Stopped.');
  }

  // ── Polling loop ─────────────────────────────────────────────────────────────

  private async _poll(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: config.SQS_NOTIFICATION_QUEUE_URL,
            MaxNumberOfMessages: MAX_MESSAGES,
            WaitTimeSeconds: WAIT_SECONDS,
          }),
        );

        for (const msg of result.Messages ?? []) {
          await this._handleMessage(msg);
        }
      } catch (err) {
        console.error('[notify-worker] SQS receive error:', err);
        await new Promise((r) => {
          this.timer = setTimeout(r, 5000);
        });
      }
    }
  }

  private async _handleMessage(msg: {
    Body?: string;
    ReceiptHandle?: string;
    MessageId?: string;
  }): Promise<void> {
    try {
      const event = JSON.parse(msg.Body ?? '{}') as Record<string, unknown>;
      await this.processEvent(event);

      await this.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: config.SQS_NOTIFICATION_QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle!,
        }),
      );
    } catch (err) {
      console.error('[notify-worker] Failed to process message', msg.MessageId, err);
      // Leave in queue for DLQ / retry
    }
  }

  // ── Event processing ─────────────────────────────────────────────────────────

  async processEvent(event: Record<string, unknown>): Promise<void> {
    const eventType = String(event['eventType'] ?? '');
    const channel = (String(event['channel'] ?? 'EMAIL').toUpperCase()) as 'EMAIL' | 'SMS';

    // Resolve recipient
    let email: string | null = (event['email'] as string | undefined) ?? null;
    let phone: string | null = (event['phone'] as string | undefined) ?? null;
    const userId = (event['userId'] as string | undefined) ?? null;

    if (userId && (!email || !phone)) {
      const row = await this.db
        .query<{ email: string; phone: string | null }>(
          `SELECT email, phone FROM users WHERE id = $1`,
          [userId],
        )
        .then((r) => r.rows[0] ?? null);

      if (row) {
        email ??= row.email;
        phone ??= row.phone ?? null;
      }
    }

    // Render template
    const tmpl = renderTemplate(eventType, event);
    if (!tmpl) {
      console.warn('[notify-worker] No template for event type "%s" — skipping.', eventType);
      return;
    }

    // Dispatch
    let externalMessageId: string | null = null;
    let status: 'SENT' | 'FAILED' = 'SENT';
    let errorMessage: string | null = null;

    try {
      if (channel === 'SMS' && phone) {
        const result = await sendSms({ phoneNumber: phone, message: tmpl.bodyText });
        externalMessageId = result.messageId;
      } else if (email) {
        const result = await sendEmail({
          to: email,
          subject: tmpl.subject,
          bodyHtml: tmpl.bodyHtml,
          bodyText: tmpl.bodyText,
        });
        externalMessageId = result.messageId;
      } else {
        console.warn('[notify-worker] No recipient for event "%s" — skipping.', eventType);
        return;
      }
    } catch (err) {
      status = 'FAILED';
      errorMessage = err instanceof Error ? err.message : String(err);
      console.error('[notify-worker] Dispatch failed for event "%s": %s', eventType, errorMessage);
    }

    // Persist notification record (best-effort — don't throw if no userId)
    if (userId) {
      await this._persistNotification({
        userId,
        channel,
        type: eventType,
        status,
        subject: tmpl.subject,
        body: channel === 'SMS' ? tmpl.bodyText : tmpl.bodyHtml,
        externalMessageId,
        errorMessage,
      });
    }
  }

  // ── DB persistence ────────────────────────────────────────────────────────────

  private async _persistNotification(opts: {
    userId: string;
    channel: string;
    type: string;
    status: string;
    subject: string;
    body: string;
    externalMessageId: string | null;
    errorMessage: string | null;
  }): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO notifications
           (user_id, channel, type, status, subject, body, sent_at, external_message_id, error_message)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, $8)`,
        [
          opts.userId,
          opts.channel,
          opts.type,
          opts.status,
          opts.subject,
          opts.body,
          opts.externalMessageId,
          opts.errorMessage,
        ],
      );
    } catch (err) {
      console.error('[notify-worker] Failed to persist notification record:', err);
    }
  }
}
