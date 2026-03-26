/**
 * Keepsake REST endpoints.
 *
 * POST   /keepsakes                   — create (manual trigger, e.g. print order)
 * GET    /keepsakes?owner_id=         — list by owner
 * GET    /keepsakes/:id               — get single
 * PATCH  /keepsakes/:id               — update (shipping address, status, etc.)
 * DELETE /keepsakes/:id               — soft-cancel
 * POST   /keepsakes/:id/render        — manually (re)trigger PDF rendering
 */

import type { FastifyInstance } from 'fastify';
import { config } from '../config.js';
import { SQSWorker } from '../worker/SQSWorker.js';
import {
  S3Client,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const VALID_TYPES = [
  'DIGITAL_BIOGRAPHY',
  'SOFTCOVER_BOOK',
  'HARDCOVER_BOOK',
  'COLLECTORS_EDITION',
  'PHOTO_ALBUM_PRINT',
  'FAMILY_TREE_PRINT',
] as const;

const VALID_STATUSES = [
  'PENDING',
  'GENERATING',
  'QA_REVIEW',
  'APPROVED',
  'PRINT_SUBMITTED',
  'SHIPPED',
  'DELIVERED',
  'FAILED',
] as const;

function makeS3(): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL
      ? { endpoint: config.AWS_ENDPOINT_URL, forcePathStyle: true }
      : {}),
  });
}

export function keepsakeRoutes(worker: SQSWorker) {
  return async function (app: FastifyInstance): Promise<void> {
    const s3 = makeS3();

    // ── Create ─────────────────────────────────────────────────────────────────

    app.post<{
      Body: {
        owner_id: string;
        biography_id?: string;
        photo_album_id?: string;
        family_tree_id?: string;
        type: string;
        title: string;
        shipping_address?: Record<string, unknown>;
        print_spec?: Record<string, unknown>;
        price_amount?: number;
        price_currency?: string;
      };
    }>('/keepsakes', async (req, reply) => {
      const {
        owner_id,
        biography_id,
        photo_album_id,
        family_tree_id,
        type,
        title,
        shipping_address,
        print_spec,
        price_amount,
        price_currency,
      } = req.body;

      if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
        return reply.badRequest(`Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
      }

      const res = await app.db.query<{ id: string }>(
        `INSERT INTO keepsakes
           (owner_id, biography_id, photo_album_id, family_tree_id, type, status,
            title, print_spec, shipping_address, price_amount, price_currency)
         VALUES ($1,$2,$3,$4,$5,'PENDING',$6,$7,$8,$9,$10)
         RETURNING id`,
        [
          owner_id,
          biography_id ?? null,
          photo_album_id ?? null,
          family_tree_id ?? null,
          type,
          title,
          JSON.stringify(print_spec ?? {}),
          shipping_address ? JSON.stringify(shipping_address) : null,
          price_amount ?? null,
          price_currency ?? 'USD',
        ],
      );

      const keepsakeId = res.rows[0].id;

      // If it has a biography_id, kick off rendering immediately
      if (biography_id) {
        // Fetch the biography S3 key
        const bioRow = await app.db.query<{ s3_result_key: string; owner_id: string }>(
          `SELECT
             'biographies/' || id || '/result.json' AS s3_result_key,
             owner_id
           FROM biographies WHERE id = $1`,
          [biography_id],
        );
        if (bioRow.rows[0]) {
          await app.db.query(
            `UPDATE keepsakes SET status = 'GENERATING' WHERE id = $1`,
            [keepsakeId],
          );
          // Fire-and-forget render
          worker
            .processBiographyComplete({
              biographyId: biography_id,
              s3ResultKey: bioRow.rows[0].s3_result_key,
            })
            .catch((err: unknown) => app.log.error('[keepsakes] render error: %s', err));
        }
      }

      const row = await _getKeepsake(app, keepsakeId);
      return reply.code(201).send(row);
    });

    // ── List ───────────────────────────────────────────────────────────────────

    app.get<{ Querystring: { owner_id?: string; status?: string } }>(
      '/keepsakes',
      async (req) => {
        const { owner_id, status } = req.query;
        const conditions: string[] = [];
        const params: unknown[] = [];

        if (owner_id) {
          params.push(owner_id);
          conditions.push(`owner_id = $${params.length}`);
        }
        if (status) {
          params.push(status);
          conditions.push(`status = $${params.length}`);
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await app.db.query(
          `SELECT * FROM keepsakes ${where} ORDER BY created_at DESC`,
          params,
        );
        return result.rows.map(formatRow);
      },
    );

    // ── Get ────────────────────────────────────────────────────────────────────

    app.get<{ Params: { id: string } }>('/keepsakes/:id', async (req, reply) => {
      const row = await _getKeepsake(app, req.params.id);
      if (!row) return reply.notFound('Keepsake not found');
      return row;
    });

    // ── Update ─────────────────────────────────────────────────────────────────

    app.patch<{
      Params: { id: string };
      Body: {
        status?: string;
        shipping_address?: Record<string, unknown>;
        print_spec?: Record<string, unknown>;
        printful_order_id?: string;
        tracking_number?: string;
        price_amount?: number;
        price_currency?: string;
      };
    }>('/keepsakes/:id', async (req, reply) => {
      const { id } = req.params;
      const {
        status,
        shipping_address,
        print_spec,
        printful_order_id,
        tracking_number,
        price_amount,
        price_currency,
      } = req.body;

      if (status && !VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
        return reply.badRequest(`Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`);
      }

      const sets: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [];

      if (status) { params.push(status); sets.push(`status = $${params.length}`); }
      if (shipping_address !== undefined) { params.push(JSON.stringify(shipping_address)); sets.push(`shipping_address = $${params.length}`); }
      if (print_spec !== undefined) { params.push(JSON.stringify(print_spec)); sets.push(`print_spec = $${params.length}`); }
      if (printful_order_id !== undefined) { params.push(printful_order_id); sets.push(`printful_order_id = $${params.length}`); }
      if (tracking_number !== undefined) { params.push(tracking_number); sets.push(`tracking_number = $${params.length}`); }
      if (price_amount !== undefined) { params.push(price_amount); sets.push(`price_amount = $${params.length}`); }
      if (price_currency !== undefined) { params.push(price_currency); sets.push(`price_currency = $${params.length}`); }

      params.push(id);
      const res = await app.db.query(
        `UPDATE keepsakes SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING id`,
        params,
      );
      if (!res.rows[0]) return reply.notFound('Keepsake not found');
      return _getKeepsake(app, id);
    });

    // ── Delete ─────────────────────────────────────────────────────────────────

    app.delete<{ Params: { id: string } }>('/keepsakes/:id', async (req, reply) => {
      const res = await app.db.query(
        `DELETE FROM keepsakes WHERE id = $1 RETURNING id`,
        [req.params.id],
      );
      if (!res.rows[0]) return reply.notFound('Keepsake not found');
      return reply.code(204).send();
    });

    // ── Re-render ──────────────────────────────────────────────────────────────

    app.post<{ Params: { id: string } }>('/keepsakes/:id/render', async (req, reply) => {
      const row = await _getKeepsake(app, req.params.id);
      if (!row) return reply.notFound('Keepsake not found');
      if (!row.biography_id) return reply.badRequest('Keepsake has no biography_id — cannot render');

      await app.db.query(
        `UPDATE keepsakes SET status = 'GENERATING', updated_at = NOW() WHERE id = $1`,
        [req.params.id],
      );

      const bioRow = await app.db.query<{ id: string }>(
        `SELECT id FROM biographies WHERE id = $1`,
        [row.biography_id],
      );
      if (!bioRow.rows[0]) return reply.notFound('Biography not found');

      worker
        .processBiographyComplete({
          biographyId: row.biography_id,
          s3ResultKey: `biographies/${row.biography_id}/result.json`,
        })
        .catch((err: unknown) => app.log.error('[keepsakes] re-render error: %s', err));

      return reply.code(202).send({ keepsakeId: req.params.id, status: 'GENERATING' });
    });

    // ── PDF download URL ───────────────────────────────────────────────────────

    app.get<{ Params: { id: string } }>('/keepsakes/:id/download', async (req, reply) => {
      const row = await _getKeepsake(app, req.params.id);
      if (!row) return reply.notFound('Keepsake not found');
      if (!row.pdf_s3_key) return reply.conflict('PDF not yet generated');

      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: config.S3_BUCKET_RENDERS,
          Key: row.pdf_s3_key as string,
        }),
        { expiresIn: 3600 },
      );

      return { url, expiresIn: 3600 };
    });
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function _getKeepsake(app: FastifyInstance, id: string) {
  const res = await app.db.query(`SELECT * FROM keepsakes WHERE id = $1`, [id]);
  return res.rows[0] ? formatRow(res.rows[0]) : null;
}

function formatRow(row: Record<string, unknown>): Record<string, unknown> {
  return {
    id: String(row['id']),
    owner_id: row['owner_id'] ? String(row['owner_id']) : null,
    biography_id: row['biography_id'] ? String(row['biography_id']) : null,
    photo_album_id: row['photo_album_id'] ? String(row['photo_album_id']) : null,
    family_tree_id: row['family_tree_id'] ? String(row['family_tree_id']) : null,
    type: row['type'],
    status: row['status'],
    title: row['title'],
    pdf_s3_key: row['pdf_s3_key'] ?? null,
    print_spec: row['print_spec'] ?? {},
    printful_order_id: row['printful_order_id'] ?? null,
    tracking_number: row['tracking_number'] ?? null,
    shipping_address: row['shipping_address'] ?? null,
    price_amount: row['price_amount'] ? Number(row['price_amount']) : null,
    price_currency: row['price_currency'] ?? 'USD',
    created_at: row['created_at'],
    updated_at: row['updated_at'],
  };
}
