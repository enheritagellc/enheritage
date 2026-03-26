/**
 * Family tree CRUD
 *
 * POST   /trees                  create tree + subject node
 * GET    /trees/:treeId          get full tree (nodes + relationships)
 * GET    /trees?ownerId=         list trees for an owner
 * PATCH  /trees/:treeId          update tree name / subjectNodeId
 * DELETE /trees/:treeId          delete tree
 * GET    /trees/:treeId/export   download GEDCOM 5.5.1 file
 */
import type { FastifyInstance } from 'fastify';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { config } from '../config.js';
import { exportToGedcom } from '../gedcom/GedcomExporter.js';

function makeS3(): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL
      ? { endpoint: config.AWS_ENDPOINT_URL, forcePathStyle: true }
      : {}),
  });
}

interface CreateTreeBody {
  ownerId: string;
  name?: string;
  subjectFirstName: string;
  subjectLastName: string;
  subjectBirthDate?: string;
  subjectBirthPlace?: string;
}

interface PatchTreeBody {
  name?: string;
  subjectNodeId?: string;
}

export async function treeRoutes(app: FastifyInstance): Promise<void> {
  const s3 = makeS3();

  // ── Create tree ─────────────────────────────────────────────────────────────
  app.post<{ Body: CreateTreeBody }>('/trees', async (request, reply) => {
    const { ownerId, name, subjectFirstName, subjectLastName, subjectBirthDate, subjectBirthPlace } =
      request.body;

    if (!ownerId || !subjectFirstName || !subjectLastName) {
      return reply.badRequest('ownerId, subjectFirstName and subjectLastName are required');
    }

    const client = await app.db.connect();
    try {
      await client.query('BEGIN');

      // Create the tree (subjectNodeId set after node is inserted)
      const treeResult = await client.query<{ id: string }>(
        `INSERT INTO family_trees (owner_id, name)
         VALUES ($1, $2) RETURNING id`,
        [ownerId, name ?? `${subjectFirstName} ${subjectLastName}'s Family Tree`],
      );
      const treeId = treeResult.rows[0].id;

      // Create the subject node
      const nodeResult = await client.query<{ id: string }>(
        `INSERT INTO family_tree_nodes
           (tree_id, first_name, last_name, birth_date, birth_place, is_subject)
         VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id`,
        [treeId, subjectFirstName, subjectLastName, subjectBirthDate ?? null, subjectBirthPlace ?? null],
      );
      const subjectNodeId = nodeResult.rows[0].id;

      // Back-fill subjectNodeId
      await client.query('UPDATE family_trees SET subject_node_id = $1 WHERE id = $2', [
        subjectNodeId,
        treeId,
      ]);

      await client.query('COMMIT');

      const tree = await _fetchTree(app.db, treeId);
      return reply.code(201).send(tree);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  });

  // ── List trees for owner ────────────────────────────────────────────────────
  app.get<{ Querystring: { ownerId?: string } }>('/trees', async (request, reply) => {
    const { ownerId } = request.query;
    if (!ownerId) return reply.badRequest('ownerId query param is required');

    const result = await app.db.query(
      `SELECT id, owner_id, name, subject_node_id, created_at, updated_at
       FROM family_trees WHERE owner_id = $1 ORDER BY created_at DESC`,
      [ownerId],
    );
    return { trees: result.rows };
  });

  // ── Get full tree ───────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string } }>('/trees/:treeId', async (request, reply) => {
    const tree = await _fetchTree(app.db, request.params.treeId);
    if (!tree) return reply.notFound('Tree not found');
    return tree;
  });

  // ── Patch tree ──────────────────────────────────────────────────────────────
  app.patch<{ Params: { treeId: string }; Body: PatchTreeBody }>(
    '/trees/:treeId',
    async (request, reply) => {
      const { treeId } = request.params;
      const { name, subjectNodeId } = request.body;

      const sets: string[] = [];
      const values: unknown[] = [];
      let i = 1;
      if (name !== undefined)          { sets.push(`name = $${i++}`);            values.push(name); }
      if (subjectNodeId !== undefined) { sets.push(`subject_node_id = $${i++}`); values.push(subjectNodeId); }

      if (sets.length === 0) return reply.badRequest('Nothing to update');

      sets.push(`updated_at = NOW()`);
      values.push(treeId);

      const result = await app.db.query(
        `UPDATE family_trees SET ${sets.join(', ')} WHERE id = $${i} RETURNING id`,
        values,
      );
      if (result.rowCount === 0) return reply.notFound('Tree not found');

      return _fetchTree(app.db, treeId);
    },
  );

  // ── Delete tree ─────────────────────────────────────────────────────────────
  app.delete<{ Params: { treeId: string } }>('/trees/:treeId', async (request, reply) => {
    const result = await app.db.query('DELETE FROM family_trees WHERE id = $1', [
      request.params.treeId,
    ]);
    if (result.rowCount === 0) return reply.notFound('Tree not found');
    return reply.code(204).send();
  });

  // ── Export GEDCOM ───────────────────────────────────────────────────────────
  app.get<{ Params: { treeId: string } }>('/trees/:treeId/export', async (request, reply) => {
    const { treeId } = request.params;
    const tree = await _fetchTree(app.db, treeId);
    if (!tree) return reply.notFound('Tree not found');

    // Check if we have a cached export on S3
    const s3Key = `family-trees/${treeId}/export.ged`;
    try {
      const obj = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET_MEDIA, Key: s3Key }));
      const body = await obj.Body?.transformToString('utf-8');
      if (body) {
        return reply
          .header('Content-Type', 'text/x-gedcom; charset=utf-8')
          .header('Content-Disposition', `attachment; filename="${tree.name.replace(/[^a-z0-9]/gi, '_')}.ged"`)
          .send(body);
      }
    } catch {
      // Cache miss — generate fresh
    }

    const gedcom = exportToGedcom({
      id: tree.id,
      name: tree.name,
      nodes: tree.nodes,
      relationships: tree.relationships,
    });

    // Cache on S3
    await s3.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET_MEDIA,
        Key: s3Key,
        Body: gedcom,
        ContentType: 'text/x-gedcom; charset=utf-8',
      }),
    );

    // Update DB with export key
    await app.db.query('UPDATE family_trees SET gedcom_export_s3_key = $1 WHERE id = $2', [
      s3Key,
      treeId,
    ]);

    return reply
      .header('Content-Type', 'text/x-gedcom; charset=utf-8')
      .header('Content-Disposition', `attachment; filename="${tree.name.replace(/[^a-z0-9]/gi, '_')}.ged"`)
      .send(gedcom);
  });
}

// ── Shared query helper ──────────────────────────────────────────────────────

async function _fetchTree(db: import('pg').Pool, treeId: string) {
  const [treeResult, nodesResult, relsResult] = await Promise.all([
    db.query('SELECT * FROM family_trees WHERE id = $1', [treeId]),
    db.query('SELECT * FROM family_tree_nodes WHERE tree_id = $1 ORDER BY created_at', [treeId]),
    db.query('SELECT * FROM family_tree_relationships WHERE tree_id = $1', [treeId]),
  ]);

  if (treeResult.rows.length === 0) return null;

  return {
    ...treeResult.rows[0],
    nodes: nodesResult.rows,
    relationships: relsResult.rows,
  };
}
