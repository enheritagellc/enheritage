import type { UUID, ISO8601, AuditFields } from './common.js';

// ---------------------------------------------------------------------------
// Vault — the per-user encryption boundary stored in AWS KMS + S3
// ---------------------------------------------------------------------------

export interface Vault extends AuditFields {
  id: UUID;
  /** Owning user */
  userId: UUID;
  /** AWS KMS key ID (UUID format) */
  kmsKeyId: string;
  /** Human-readable KMS alias, e.g. "alias/enheritage/user-abc123" */
  kmsKeyAlias: string;
  /** Full KMS key ARN */
  kmsKeyArn: string;
  /** Dedicated S3 bucket name for this vault's encrypted assets */
  s3BucketName: string;
  /** Logical prefix under the bucket, e.g. "vaults/user-abc123/" */
  s3Prefix: string;
  encryptionAlgorithm: 'AES-256';
  keyRotationEnabled: boolean;
  lastKeyRotationAt?: ISO8601;
}

// ---------------------------------------------------------------------------
// VaultKey — tracks individual KMS key versions for rotation auditing
// ---------------------------------------------------------------------------

export interface VaultKey extends AuditFields {
  id: UUID;
  vaultId: UUID;
  kmsKeyId: string;
  /** KMS key material version number */
  keyVersion: number;
  status: 'ACTIVE' | 'DISABLED' | 'PENDING_DELETION';
  activatedAt: ISO8601;
}

// ---------------------------------------------------------------------------
// EncryptionMetadata — stored alongside every encrypted object
// ---------------------------------------------------------------------------

export interface EncryptionMetadata {
  /** Symmetric algorithm used to encrypt the data key, e.g. "AES_256" */
  algorithm: string;
  /** KMS key ID that was used to generate the data key */
  keyId: string;
  /** KMS alias at time of encryption */
  keyAlias: string;
  encryptedAt: ISO8601;
  /**
   * AWS KMS encryption context key-value pairs used during GenerateDataKey.
   * Must be provided again on Decrypt calls.
   */
  dataKeyEncryptedContext: Record<string, string>;
}
