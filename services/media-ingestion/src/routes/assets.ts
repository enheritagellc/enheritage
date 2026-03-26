import type { FastifyInstance } from 'fastify';
import { S3MultipartUpload } from '../storage/S3MultipartUpload.js';
import { config } from '../config.js';

interface AssetParams {
  id: string;
}

interface AssetQuery {
  bucket?: 'media' | 'processed';
  key?: string;
}

export async function assetRoutes(app: FastifyInstance): Promise<void> {
  const s3 = new S3MultipartUpload();

  app.get<{ Params: AssetParams; Querystring: AssetQuery }>(
    '/assets/:id',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        querystring: {
          type: 'object',
          properties: {
            bucket: { type: 'string', enum: ['media', 'processed'] },
            key: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const { bucket = 'media', key } = request.query;

      const bucketName =
        bucket === 'processed' ? config.S3_BUCKET_PROCESSED : config.S3_BUCKET_MEDIA;

      // If no explicit key is provided, look under the uploads prefix
      const objectKey = key ?? `uploads/${id}`;

      try {
        const url = await s3.getSignedDownloadUrl(bucketName, objectKey);
        return reply.code(200).send({ assetId: id, downloadUrl: url, expiresIn: 3600 });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to generate download URL';
        return reply.code(404).send({ error: message });
      }
    },
  );
}
