/**
 * Tree node CRUD
 *
 * POST   /trees/:treeId/nodes          add a node
 * GET    /trees/:treeId/nodes/:nodeId  get a single node
 * PATCH  /trees/:treeId/nodes/:nodeId  update a node
 * DELETE /trees/:treeId/nodes/:nodeId  remove a node (cascades relationships)
 */
import type { FastifyInstance } from 'fastify';

interface NodeBody {
  firstName: string;
  lastName: string;
  birthName?: string;
  birthDate?: string;
  birthPlace?: string;
  deathDate?: string;
  deathPlace?: string;
  notes?: string;
  photoMediaAssetId?: string;
  familySearchPersonId?: string;
  gedcomId?: string;
  isSubject?: boolean;
}

type PatchNodeBody = Partial<NodeBody>;

export async function nodeRoutes(app: FastifyInstance): Promise<void> {
  // ── Add node ────────────────────────────────────────────────────────────────
  app.post<{ Params: { treeId: string }; Body: NodeBody }>(
    '/trees/:treeId/nodes',
    async (request, reply) => {
      const { treeId } = request.params;
      const {
        firstName, lastName, birthName, birthDate, birthPlace,
        deathDate, deathPlace, notes, photoMediaAssetId,
        familySearchPersonId, gedcomId, isSubject,
      } = request.body;

      if (!firstName || !lastName) {
        return reply.badRequest('firstName and lastName are required');
      }

      // Verify tree exists
      const treeCheck = await app.db.query('SELECT id FROM family_trees WHERE id = $1', [treeId]);
      if (treeCheck.rows.length === 0) return reply.notFound('Tree not found');

      // Only one subject per tree
      if (isSubject) {
        await app.db.query(
          'UPDATE family_tree_nodes SET is_subject = FALSE WHERE tree_id = $1',
          [treeId],
        );
      }

      const result = await app.db.query(
        `INSERT INTO family_tree_nodes
           (tree_id, first_name, last_name, birth_name, birth_date, birth_place,
            death_date, death_place, notes, photo_media_asset_id,
            family_search_person_id, gedcom_id, is_subject)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
         RETURNING *`,
        [
          treeId, firstName, lastName, birthName ?? null,
          birthDate ?? null, birthPlace ?? null,
          deathDate ?? null, deathPlace ?? null,
          notes ?? null, photoMediaAssetId ?? null,
          familySearchPersonId ?? null, gedcomId ?? null,
          isSubject ?? false,
        ],
      );

      return reply.code(201).send(result.rows[0]);
    },
  );

  // ── Get node ────────────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string; nodeId: string } }>(
    '/trees/:treeId/nodes/:nodeId',
    async (request, reply) => {
      const { treeId, nodeId } = request.params;
      const result = await app.db.query(
        'SELECT * FROM family_tree_nodes WHERE id = $1 AND tree_id = $2',
        [nodeId, treeId],
      );
      if (result.rows.length === 0) return reply.notFound('Node not found');
      return result.rows[0];
    },
  );

  // ── Patch node ──────────────────────────────────────────────────────────────
  app.patch<{ Params: { treeId: string; nodeId: string }; Body: PatchNodeBody }>(
    '/trees/:treeId/nodes/:nodeId',
    async (request, reply) => {
      const { treeId, nodeId } = request.params;
      const fields = request.body;

      const colMap: Record<string, string> = {
        firstName: 'first_name', lastName: 'last_name', birthName: 'birth_name',
        birthDate: 'birth_date', birthPlace: 'birth_place',
        deathDate: 'death_date', deathPlace: 'death_place',
        notes: 'notes', photoMediaAssetId: 'photo_media_asset_id',
        familySearchPersonId: 'family_search_person_id',
        gedcomId: 'gedcom_id', isSubject: 'is_subject',
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
      sets.push(`updated_at = NOW()`);
      values.push(nodeId, treeId);

      const result = await app.db.query(
        `UPDATE family_tree_nodes SET ${sets.join(', ')}
         WHERE id = $${i++} AND tree_id = $${i} RETURNING *`,
        values,
      );
      if (result.rowCount === 0) return reply.notFound('Node not found');

      // Invalidate GEDCOM cache when tree is modified
      await app.db.query(
        'UPDATE family_trees SET gedcom_export_s3_key = NULL, updated_at = NOW() WHERE id = $1',
        [treeId],
      );

      return result.rows[0];
    },
  );

  // ── Delete node ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { treeId: string; nodeId: string } }>(
    '/trees/:treeId/nodes/:nodeId',
    async (request, reply) => {
      const { treeId, nodeId } = request.params;
      const result = await app.db.query(
        'DELETE FROM family_tree_nodes WHERE id = $1 AND tree_id = $2',
        [nodeId, treeId],
      );
      if (result.rowCount === 0) return reply.notFound('Node not found');

      await app.db.query(
        'UPDATE family_trees SET gedcom_export_s3_key = NULL, updated_at = NOW() WHERE id = $1',
        [treeId],
      );

      return reply.code(204).send();
    },
  );
}
