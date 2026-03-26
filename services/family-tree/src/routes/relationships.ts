/**
 * Relationship CRUD
 *
 * POST   /trees/:treeId/relationships            add a relationship
 * GET    /trees/:treeId/relationships            list all relationships in tree
 * PATCH  /trees/:treeId/relationships/:relId     update type/status/dates
 * DELETE /trees/:treeId/relationships/:relId     remove relationship
 */
import type { FastifyInstance } from 'fastify';

interface RelBody {
  fromNodeId: string;
  toNodeId: string;
  type: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  sourceTranscriptSegmentId?: string;
  confidence?: number;
}

type PatchRelBody = Partial<Omit<RelBody, 'fromNodeId' | 'toNodeId'>>;

const VALID_TYPES = new Set([
  'CHILD_OF', 'PARENT_OF', 'SPOUSE_OF', 'SIBLING_OF',
  'PARTNER_OF', 'STEP_CHILD_OF', 'ADOPTED_BY',
]);

const VALID_STATUSES = new Set(['CONFIRMED', 'SUGGESTED', 'DISPUTED']);

export async function relationshipRoutes(app: FastifyInstance): Promise<void> {
  // ── Add relationship ────────────────────────────────────────────────────────
  app.post<{ Params: { treeId: string }; Body: RelBody }>(
    '/trees/:treeId/relationships',
    async (request, reply) => {
      const { treeId } = request.params;
      const {
        fromNodeId, toNodeId, type, status = 'CONFIRMED',
        startDate, endDate, sourceTranscriptSegmentId, confidence = 1.0,
      } = request.body;

      if (!fromNodeId || !toNodeId || !type) {
        return reply.badRequest('fromNodeId, toNodeId and type are required');
      }
      if (!VALID_TYPES.has(type)) {
        return reply.badRequest(`type must be one of: ${[...VALID_TYPES].join(', ')}`);
      }
      if (!VALID_STATUSES.has(status)) {
        return reply.badRequest(`status must be one of: ${[...VALID_STATUSES].join(', ')}`);
      }

      // Verify both nodes belong to this tree
      const nodeCheck = await app.db.query(
        'SELECT id FROM family_tree_nodes WHERE id = ANY($1) AND tree_id = $2',
        [[fromNodeId, toNodeId], treeId],
      );
      if (nodeCheck.rows.length < 2) {
        return reply.badRequest('Both nodes must belong to this tree');
      }

      const result = await app.db.query(
        `INSERT INTO family_tree_relationships
           (tree_id, from_node_id, to_node_id, type, status,
            start_date, end_date, source_transcript_segment_id, confidence)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
        [
          treeId, fromNodeId, toNodeId, type, status,
          startDate ?? null, endDate ?? null,
          sourceTranscriptSegmentId ?? null, confidence,
        ],
      );

      await app.db.query(
        'UPDATE family_trees SET gedcom_export_s3_key = NULL, updated_at = NOW() WHERE id = $1',
        [treeId],
      );

      return reply.code(201).send(result.rows[0]);
    },
  );

  // ── List relationships ──────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string } }>(
    '/trees/:treeId/relationships',
    async (request, reply) => {
      const { treeId } = request.params;
      const treeCheck = await app.db.query('SELECT id FROM family_trees WHERE id = $1', [treeId]);
      if (treeCheck.rows.length === 0) return reply.notFound('Tree not found');

      const result = await app.db.query(
        'SELECT * FROM family_tree_relationships WHERE tree_id = $1 ORDER BY created_at',
        [treeId],
      );
      return { relationships: result.rows };
    },
  );

  // ── Patch relationship ──────────────────────────────────────────────────────
  app.patch<{ Params: { treeId: string; relId: string }; Body: PatchRelBody }>(
    '/trees/:treeId/relationships/:relId',
    async (request, reply) => {
      const { treeId, relId } = request.params;
      const fields = request.body;

      const colMap: Record<string, string> = {
        type: 'type', status: 'status',
        startDate: 'start_date', endDate: 'end_date',
        sourceTranscriptSegmentId: 'source_transcript_segment_id',
        confidence: 'confidence',
      };

      const sets: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      for (const [key, col] of Object.entries(colMap)) {
        if (key in fields) {
          sets.push(`${col} = $${i++}`);
          values.push((fields as Record<string, unknown>)[key]);
        }
      }
      if (sets.length === 0) return reply.badRequest('Nothing to update');
      values.push(relId, treeId);

      const result = await app.db.query(
        `UPDATE family_tree_relationships SET ${sets.join(', ')}
         WHERE id = $${i++} AND tree_id = $${i} RETURNING *`,
        values,
      );
      if (result.rowCount === 0) return reply.notFound('Relationship not found');

      await app.db.query(
        'UPDATE family_trees SET gedcom_export_s3_key = NULL, updated_at = NOW() WHERE id = $1',
        [treeId],
      );

      return result.rows[0];
    },
  );

  // ── Delete relationship ─────────────────────────────────────────────────────
  app.delete<{ Params: { treeId: string; relId: string } }>(
    '/trees/:treeId/relationships/:relId',
    async (request, reply) => {
      const { treeId, relId } = request.params;
      const result = await app.db.query(
        'DELETE FROM family_tree_relationships WHERE id = $1 AND tree_id = $2',
        [relId, treeId],
      );
      if (result.rowCount === 0) return reply.notFound('Relationship not found');

      await app.db.query(
        'UPDATE family_trees SET gedcom_export_s3_key = NULL, updated_at = NOW() WHERE id = $1',
        [treeId],
      );

      return reply.code(204).send();
    },
  );
}
