/**
 * SQS long-poll worker for the keepsake-render service.
 *
 * Listens for `biography.complete` events, renders a PDF, saves it to S3,
 * persists the keepsake row in PostgreSQL, and emits a `keepsake.complete`
 * notification event.
 */

import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import type { Pool } from 'pg';
import { config } from '../config.js';
import { renderBiographyPdf, type BiographyData } from '../renderer/PdfRenderer.js';

const WAIT_SECONDS = 20;
const MAX_MESSAGES = 2;

function makeSqsClient(): SQSClient {
  return new SQSClient({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
  });
}

function makeS3Client(): S3Client {
  return new S3Client({
    region: config.AWS_REGION,
    ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL, forcePathStyle: true } : {}),
  });
}

async function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string));
  }
  return Buffer.concat(chunks);
}

export class SQSWorker {
  private readonly sqs: SQSClient;
  private readonly s3: S3Client;
  private readonly db: Pool;
  private running = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor(db: Pool) {
    this.sqs = makeSqsClient();
    this.s3 = makeS3Client();
    this.db = db;
  }

  start(): void {
    if (this.running) return;
    if (!config.SQS_RENDER_QUEUE_URL) {
      console.warn('[render-worker] SQS_RENDER_QUEUE_URL not set — worker disabled.');
      return;
    }
    this.running = true;
    console.info('[render-worker] Started.');
    void this._poll();
  }

  stop(): void {
    this.running = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    console.info('[render-worker] Stopped.');
  }

  // ── Polling loop ────────────────────────────────────────────────────────────

  private async _poll(): Promise<void> {
    while (this.running) {
      try {
        const result = await this.sqs.send(
          new ReceiveMessageCommand({
            QueueUrl: config.SQS_RENDER_QUEUE_URL,
            MaxNumberOfMessages: MAX_MESSAGES,
            WaitTimeSeconds: WAIT_SECONDS,
            AttributeNames: ['All'],
            MessageAttributeNames: ['All'],
          }),
        );

        for (const msg of result.Messages ?? []) {
          await this._handleMessage(msg);
        }
      } catch (err) {
        console.error('[render-worker] SQS receive error:', err);
        await new Promise((r) => {
          this.timer = setTimeout(r, 5000);
        });
      }
    }
  }

  private async _handleMessage(msg: { Body?: string; ReceiptHandle?: string; MessageId?: string }): Promise<void> {
    try {
      const body = JSON.parse(msg.Body ?? '{}') as Record<string, unknown>;
      const eventType = body['eventType'] as string | undefined;

      if (eventType === 'biography.complete') {
        await this.processBiographyComplete(body);
      } else {
        console.warn('[render-worker] Unhandled event type:', eventType);
      }

      await this.sqs.send(
        new DeleteMessageCommand({
          QueueUrl: config.SQS_RENDER_QUEUE_URL,
          ReceiptHandle: msg.ReceiptHandle!,
        }),
      );
    } catch (err) {
      console.error('[render-worker] Failed to process message', msg.MessageId, ':', err);
      // Leave in queue for retry / DLQ
    }
  }

  // ── Job processing ───────────────────────────────────────────────────────────

  async processBiographyComplete(event: Record<string, unknown>): Promise<void> {
    const biographyId = event['biographyId'] as string;
    const s3ResultKey = event['s3ResultKey'] as string;
    const subjectName = (event['subjectName'] as string | undefined) ?? 'the subject';

    console.info('[render-worker] Rendering keepsake for biography', biographyId);

    // 1. Fetch biography JSON from S3
    const getCmd = new GetObjectCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: s3ResultKey,
    });
    const s3Obj = await this.s3.send(getCmd);
    const jsonBuf = await streamToBuffer(s3Obj.Body as NodeJS.ReadableStream);
    const biographyData = JSON.parse(jsonBuf.toString('utf-8')) as BiographyData;

    // 2. Render PDF
    const pdfBuffer = await renderBiographyPdf(biographyData);

    // 3. Upload PDF to S3
    const pdfKey = `keepsakes/${biographyId}/biography.pdf`;
    await this.s3.send(
      new PutObjectCommand({
        Bucket: config.S3_BUCKET_RENDERS,
        Key: pdfKey,
        Body: pdfBuffer,
        ContentType: 'application/pdf',
        ContentDisposition: `attachment; filename="biography-${biographyId}.pdf"`,
      }),
    );
    console.info('[render-worker] PDF saved to s3://%s/%s', config.S3_BUCKET_RENDERS, pdfKey);

    // 4. Upsert keepsake record in DB
    const keepsakeId = await this._upsertKeepsake(biographyId, subjectName, pdfKey);

    // 5. Emit keepsake.complete notification event
    await this._publishNotification(keepsakeId, biographyId, subjectName, pdfKey);
  }

  // ── Database ─────────────────────────────────────────────────────────────────

  private async _upsertKeepsake(
    biographyId: string,
    subjectName: string,
    pdfKey: string,
  ): Promise<string> {
    // Look up owner_id from the biography record if it exists; otherwise leave NULL
    const ownerRes = await this.db.query<{ owner_id: string }>(
      `SELECT owner_id FROM biographies WHERE id = $1 LIMIT 1`,
      [biographyId],
    );

    const ownerId = ownerRes.rows[0]?.owner_id ?? null;

    // Check if a keepsake for this biography already exists (idempotency)
    const existing = await this.db.query<{ id: string }>(
      `SELECT id FROM keepsakes WHERE biography_id = $1 AND type = 'DIGITAL_BIOGRAPHY' LIMIT 1`,
      [biographyId],
    );

    if (existing.rows[0]) {
      const keepsakeId = existing.rows[0].id;
      await this.db.query(
        `UPDATE keepsakes
            SET status = 'APPROVED', pdf_s3_key = $2, updated_at = NOW()
          WHERE id = $1`,
        [keepsakeId, pdfKey],
      );
      console.info('[render-worker] Updated keepsake %s.', keepsakeId);
      return keepsakeId;
    }

    const res = await this.db.query<{ id: string }>(
      `INSERT INTO keepsakes
         (owner_id, biography_id, type, status, title, pdf_s3_key, print_spec)
       VALUES ($1, $2, 'DIGITAL_BIOGRAPHY', 'APPROVED', $3, $4, '{}')
       RETURNING id`,
      [ownerId, biographyId, `The Life of ${subjectName}`, pdfKey],
    );

    const keepsakeId = res.rows[0].id;
    console.info('[render-worker] Created keepsake %s.', keepsakeId);
    return keepsakeId;
  }

  // ── Notification ─────────────────────────────────────────────────────────────

  private async _publishNotification(
    keepsakeId: string,
    biographyId: string,
    subjectName: string,
    pdfKey: string,
  ): Promise<void> {
    if (!config.SQS_NOTIFICATION_QUEUE_URL) return;

    const event = {
      eventType: 'keepsake.complete',
      keepsakeId,
      biographyId,
      subjectName,
      pdfS3Key: pdfKey,
      timestamp: new Date().toISOString(),
    };

    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: config.SQS_NOTIFICATION_QUEUE_URL,
        MessageBody: JSON.stringify(event),
      }),
    );
    console.info('[render-worker] Published keepsake.complete for keepsake %s.', keepsakeId);
  }
}
