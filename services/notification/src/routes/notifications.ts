/**
 * Notification REST endpoints.
 *
 * POST /notifications/send        — send a notification directly (internal/admin)
 * GET  /notifications?user_id=    — list notifications for a user
 * GET  /notifications/:id         — get single notification
 */

import type { FastifyInstance } from 'fastify';
import { SQSWorker } from '../worker/SQSWorker.js';
import { supportedEventTypes } from '../channels/templates.js';

export function notificationRoutes(worker: SQSWorker) {
  return async function (app: FastifyInstance): Promise<void> {

    // ── Direct send (internal) ─────────────────────────────────────────────────

    app.post<{
      Body: {
        eventType: string;
        userId?: string;
        email?: string;
        phone?: string;
        channel?: string;
        [key: string]: unknown;
      };
    }>('/notifications/send', async (req, reply) => {
      const { eventType } = req.body;

      if (!supportedEventTypes().includes(eventType)) {
        return reply.badRequest(
          `Unknown eventType "${eventType}". Supported: ${supportedEventTypes().join(', ')}`,
        );
      }

      // Fire and wait — direct send, not via queue
      await worker.processEvent(req.body);
      return reply.code(202).send({ queued: false, eventType });
    });

    // ── List ───────────────────────────────────────────────────────────────────

    app.get<{
      Querystring: {
        user_id?: string;
        channel?: string;
        status?: string;
        limit?: string;
        offset?: string;
      };
    }>('/notifications', async (req) => {
      const { user_id, channel, status, limit = '50', offset = '0' } = req.query;

      const conditions: string[] = [];
      const params: unknown[] = [];

      if (user_id) {
        params.push(user_id);
        conditions.push(`user_id = $${params.length}`);
      }
      if (channel) {
        params.push(channel.toUpperCase());
        conditions.push(`channel = $${params.length}`);
      }
      if (status) {
        params.push(status.toUpperCase());
        conditions.push(`status = $${params.length}`);
      }

      params.push(Number(limit), Number(offset));
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const result = await app.db.query(
        `SELECT * FROM notifications ${where}
         ORDER BY created_at DESC
         LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params,
      );

      return result.rows.map(formatRow);
    });

    // ── Get ────────────────────────────────────────────────────────────────────

    app.get<{ Params: { id: string } }>('/notifications/:id', async (req, reply) => {
      const result = await app.db.query(
        `SELECT * FROM notifications WHERE id = $1`,
        [req.params.id],
      );
      if (!result.rows[0]) return reply.notFound('Notification not found');
      return formatRow(result.rows[0]);
    });
  };
}

function formatRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row['id']),
    user_id: String(row['user_id']),
    channel: row['channel'],
    type: row['type'],
    status: row['status'],
    subject: row['subject'] ?? null,
    body: row['body'],
    sent_at: row['sent_at'] ?? null,
    delivered_at: row['delivered_at'] ?? null,
    error_message: row['error_message'] ?? null,
    external_message_id: row['external_message_id'] ?? null,
    created_at: row['created_at'],
  };
}
