/**
 * SQS long-poll worker for the enrichment service.
 *
 * Processing flow:
 * 1. Receive `ner.complete` event from enrichment queue.
 * 2. Fetch NER result JSON from S3.
 * 3. Enrich entities via Wikipedia + Google Maps.
 * 4. Save enrichment result JSON to S3.
 * 5. Publish `enrichment.complete` event to biography queue.
 * 6. Delete the processed SQS message.
 */
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommand,
  type Message,
} from '@aws-sdk/client-sqs';
import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
} from '@aws-sdk/client-s3';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { EntityEnricher, type RawEntity } from '../enrichment/EntityEnricher.js';

type AnyRecord = Record<string, unknown>;

function makeSQS(): SQSClient {
  return new SQSClient({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
  });
}

function makeS3(): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL, forcePathStyle: true } : {}),
  });
}

async function s3GetJson(s3: S3Client, key: string): Promise<AnyRecord> {
  const res = await s3.send(new GetObjectCommand({ Bucket: config.S3_BUCKET_MEDIA, Key: key }));
  const body = await res.Body?.transformToString('utf-8');
  return JSON.parse(body ?? '{}') as AnyRecord;
}

async function s3PutJson(s3: S3Client, key: string, data: unknown): Promise<void> {
  await s3.send(
    new PutObjectCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      Body: JSON.stringify(data, null, 2),
      ContentType: 'application/json',
    }),
  );
}

export class SQSWorker {
  private readonly sqs = makeSQS();
  private readonly s3 = makeS3();
  private running = false;
  private pollTimer: NodeJS.Timeout | null = null;
  private readonly enricher: EntityEnricher;

  constructor(redis: Redis) {
    this.enricher = new EntityEnricher(redis);
  }

  start(): void {
    if (this.running) return;
    if (!config.SQS_ENRICHMENT_QUEUE_URL) {
      console.warn('SQS_ENRICHMENT_QUEUE_URL not set — enrichment worker will not start');
      return;
    }
    this.running = true;
    console.info('Enrichment SQSWorker started', { queue: config.SQS_ENRICHMENT_QUEUE_URL });
    void this.poll();
  }

  stop(): void {
    this.running = false;
    if (this.pollTimer) clearTimeout(this.pollTimer);
  }

  private async poll(): Promise<void> {
    if (!this.running) return;

    try {
      const res = await this.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: config.SQS_ENRICHMENT_QUEUE_URL,
          MaxNumberOfMessages: 3,
          WaitTimeSeconds: 20,
          AttributeNames: ['All'],
        }),
      );

      for (const message of res.Messages ?? []) {
        await this.handleMessage(message);
      }
    } catch (err) {
      console.error('SQS receive error', err);
      await new Promise((r) => setTimeout(r, 5_000));
    }

    if (this.running) {
      this.pollTimer = setTimeout(() => void this.poll(), 0);
    }
  }

  private async handleMessage(message: Message): Promise<void> {
    const receiptHandle = message.ReceiptHandle!;
    try {
      const body = JSON.parse(message.Body ?? '{}') as AnyRecord;
      const eventType = body.eventType as string | undefined;

      if (eventType === 'ner.complete') {
        await this.processEnrichmentJob(body);
      } else {
        console.warn('Unhandled event type', { eventType });
      }

      await this.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: config.SQS_ENRICHMENT_QUEUE_URL,
          ReceiptHandle: receiptHandle,
        }),
      );
    } catch (err) {
      console.error('Failed to process enrichment message — leaving in queue', {
        messageId: message.MessageId,
        error: String(err),
      });
    }
  }

  async processEnrichmentJob(event: AnyRecord): Promise<void> {
    const transcriptId = event.transcriptId as string;
    const nerS3Key = event.s3ResultKey as string;
    const subjectName = (event.subjectName as string | undefined) ?? '';
    const enrichmentJobId = uuidv4();

    console.info('Processing enrichment job', { enrichmentJobId, transcriptId });

    // 1. Fetch NER result from S3
    const nerResult = await s3GetJson(this.s3, nerS3Key);
    const entities = (nerResult.entities ?? []) as RawEntity[];

    // 2. Enrich entities
    const result = await this.enricher.enrich(enrichmentJobId, transcriptId, entities);

    // 3. Save enrichment result to S3
    const resultKey = `enrichment/${transcriptId}/result.json`;
    const payload = {
      enrichmentJobId,
      transcriptId,
      subjectName,
      status: 'complete',
      totalEntities: result.totalEntities,
      enrichedEntities: result.enrichedEntities,
      failedEntities: result.failedEntities,
      citations: result.citations,
    };
    await s3PutJson(this.s3, resultKey, payload);
    console.info('Enrichment result saved', { enrichmentJobId, key: resultKey });

    // 4. Publish enrichment.complete to biography queue
    if (config.SQS_BIOGRAPHY_QUEUE_URL) {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: config.SQS_BIOGRAPHY_QUEUE_URL,
          MessageBody: JSON.stringify({
            eventType: 'enrichment.complete',
            enrichmentJobId,
            transcriptId,
            subjectName,
            s3ResultKey: resultKey,
          }),
        }),
      );
      console.info('Published enrichment.complete', { enrichmentJobId, transcriptId });
    }
  }
}
