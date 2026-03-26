/**
 * REST trigger for enrichment — useful for testing and manual re-runs.
 *
 * POST /enrich   — kick off enrichment for a given NER result S3 key
 * GET  /enrich/:jobId — get status of a running/completed enrichment job (in-memory)
 */
import { v4 as uuidv4 } from 'uuid';
import type { FastifyInstance } from 'fastify';
import { SQSWorker } from '../worker/SQSWorker.js';

interface EnrichBody {
  transcriptId: string;
  s3ResultKey: string;
  subjectName?: string;
}

interface JobRecord {
  status: 'running' | 'complete' | 'failed';
  enrichmentJobId: string;
  transcriptId: string;
  error?: string;
}

export function enrichmentRoutes(worker: SQSWorker) {
  return async function register(app: FastifyInstance): Promise<void> {
    const jobs = new Map<string, JobRecord>();

    app.post<{ Body: EnrichBody }>('/enrich', async (request, reply) => {
      const { transcriptId, s3ResultKey, subjectName } = request.body;
      if (!transcriptId || !s3ResultKey) {
        return reply.badRequest('transcriptId and s3ResultKey are required');
      }

      const enrichmentJobId = uuidv4();
      const record: JobRecord = { status: 'running', enrichmentJobId, transcriptId };
      jobs.set(enrichmentJobId, record);

      // Run in background
      setImmediate(async () => {
        try {
          await worker.processEnrichmentJob({ transcriptId, s3ResultKey, subjectName });
          record.status = 'complete';
        } catch (err) {
          record.status = 'failed';
          record.error = String(err);
        }
      });

      return reply.code(202).send({ enrichmentJobId, status: 'running' });
    });

    app.get<{ Params: { jobId: string } }>('/enrich/:jobId', async (request, reply) => {
      const job = jobs.get(request.params.jobId);
      if (!job) return reply.notFound('Job not found');
      return job;
    });
  };
}
