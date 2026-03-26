import {
  S3Client,
  CreateMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Upload } from '@aws-sdk/lib-storage';
import { config } from '../config.js';

export interface CompletedPart {
  PartNumber: number;
  ETag: string;
}

export interface InitiateUploadResult {
  uploadId: string;
  key: string;
  bucket: string;
}

export interface PresignedPartUrl {
  partNumber: number;
  presignedUrl: string;
}

export class S3MultipartUpload {
  private readonly client: S3Client;
  private readonly presignExpiresInSeconds = 3600; // 1 hour

  constructor() {
    this.client = new S3Client({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL
        ? { endpoint: config.AWS_ENDPOINT_URL, forcePathStyle: true }
        : {}),
    });
  }

  async initiate(key: string, contentType: string): Promise<InitiateUploadResult> {
    const command = new CreateMultipartUploadCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      ContentType: contentType,
      ServerSideEncryption: 'aws:kms',
    });

    const result = await this.client.send(command);

    if (!result.UploadId) {
      throw new Error('S3 did not return an UploadId for multipart upload');
    }

    return {
      uploadId: result.UploadId,
      key,
      bucket: config.S3_BUCKET_MEDIA,
    };
  }

  async getPartPresignedUrl(
    uploadId: string,
    key: string,
    partNumber: number,
  ): Promise<PresignedPartUrl> {
    // Use Upload utility for presigning individual parts
    const { UploadPartCommand } = await import('@aws-sdk/client-s3');
    const command = new UploadPartCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      UploadId: uploadId,
      PartNumber: partNumber,
    });

    const presignedUrl = await getSignedUrl(this.client, command, {
      expiresIn: this.presignExpiresInSeconds,
    });

    return { partNumber, presignedUrl };
  }

  async complete(
    uploadId: string,
    key: string,
    parts: CompletedPart[],
  ): Promise<{ location: string; key: string }> {
    const command = new CompleteMultipartUploadCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: {
        Parts: parts.map((p) => ({ PartNumber: p.PartNumber, ETag: p.ETag })),
      },
    });

    const result = await this.client.send(command);

    return {
      location: result.Location ?? `s3://${config.S3_BUCKET_MEDIA}/${key}`,
      key,
    };
  }

  async abort(uploadId: string, key: string): Promise<void> {
    const command = new AbortMultipartUploadCommand({
      Bucket: config.S3_BUCKET_MEDIA,
      Key: key,
      UploadId: uploadId,
    });
    await this.client.send(command);
  }

  async getSignedDownloadUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn });
  }
}
