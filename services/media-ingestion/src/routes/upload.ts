import type { FastifyInstance } from 'fastify';
import { v4 as uuidv4 } from 'uuid';
import { S3MultipartUpload, type CompletedPart } from '../storage/S3MultipartUpload.js';
import { SQSPublisher } from '../queuing/SQSPublisher.js';
import { config } from '../config.js';
import type { DomainEvent, MediaType } from '@enheritage/types';

interface InitiateUploadBody {
  filename: string;
  contentType: string;
  sizeBytes: number;
  mediaType: MediaType;
  ownerId: string;
  vaultId: string;
}

interface CompleteUploadBody {
  parts: CompletedPart[];
  mediaAssetId: string;
  ownerId: string;
  vaultId: string;
  mediaType: MediaType;
}

interface CompleteUploadParams {
  id: string;
}

// Minimum S3 part size is 5 MiB (except last part)
const PART_SIZE_BYTES = 5 * 1024 * 1024;

export async function uploadRoutes(app: FastifyInstance): Promise<void> {
  const s3 = new S3MultipartUpload();
  const sqsPublisher = new SQSPublisher();

  app.post<{ Body: InitiateUploadBody }>(
    '/uploads/initiate',
    {
      schema: {
        body: {
          type: 'object',
          required: ['filename', 'contentType', 'sizeBytes', 'mediaType', 'ownerId', 'vaultId'],
          properties: {
            filename: { type: 'string' },
            contentType: { type: 'string' },
            sizeBytes: { type: 'number', minimum: 1 },
            mediaType: { type: 'string', enum: ['AUDIO', 'VIDEO', 'PHOTO', 'DOCUMENT'] },
            ownerId: { type: 'string' },
            vaultId: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { filename, contentType, sizeBytes, mediaType, ownerId } = request.body;

      const assetId = uuidv4();
      const ext = filename.split('.').pop() ?? 'bin';
      const key = `uploads/${ownerId}/${assetId}.${ext}`;

      const { uploadId } = await s3.initiate(key, contentType);

      const partCount = Math.ceil(sizeBytes / PART_SIZE_BYTES);
      const partUrls = await Promise.all(
        Array.from({ length: partCount }, (_, i) =>
          s3.getPartPresignedUrl(uploadId, key, i + 1),
        ),
      );

      return reply.code(201).send({
        uploadId,
        assetId,
        key,
        partCount,
        presignedPartUrls: partUrls,
        mediaType,
      });
    },
  );

  app.post<{ Params: CompleteUploadParams; Body: CompleteUploadBody }>(
    '/uploads/:id/complete',
    {
      schema: {
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
        body: {
          type: 'object',
          required: ['parts', 'mediaAssetId', 'ownerId', 'vaultId', 'mediaType'],
          properties: {
            parts: {
              type: 'array',
              items: {
                type: 'object',
                required: ['PartNumber', 'ETag'],
                properties: {
                  PartNumber: { type: 'number' },
                  ETag: { type: 'string' },
                },
              },
            },
            mediaAssetId: { type: 'string' },
            ownerId: { type: 'string' },
            vaultId: { type: 'string' },
            mediaType: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const uploadId = request.params.id;
      const { parts, mediaAssetId, ownerId, vaultId, mediaType } = request.body;

      // We need the key — derive it or accept from client; here we accept from body for flexibility
      const ext = 'bin';
      const key = `uploads/${ownerId}/${mediaAssetId}.${ext}`;

      const { location } = await s3.complete(uploadId, key, parts);

      const event: DomainEvent<{
        mediaAssetId: string;
        ownerId: string;
        vaultId: string;
        mediaType: MediaType;
        s3Key: string;
      }> = {
        id: uuidv4(),
        type: 'media.upload.complete',
        occurredAt: new Date().toISOString(),
        aggregateId: mediaAssetId,
        aggregateType: 'MediaAsset',
        correlationId: uuidv4(),
        payload: {
          mediaAssetId,
          ownerId,
          vaultId,
          mediaType,
          s3Key: key,
        },
      };

      const messageId = await sqsPublisher.publish(config.SQS_TRANSCRIPTION_QUEUE_URL, event);

      return reply.code(200).send({
        mediaAssetId,
        s3Location: location,
        sqsMessageId: messageId,
        status: 'COMPLETED',
      });
    },
  );
}
