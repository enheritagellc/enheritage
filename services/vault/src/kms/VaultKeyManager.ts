/**
 * VaultKeyManager — thin wrapper around AWS KMS for per-user vault keys.
 *
 * Each user gets one Customer Managed Key (CMK) under the alias
 * `{prefix}/vault/{userId}`.  Envelope encryption is used when
 * encrypting arbitrary data:
 *   1. GenerateDataKey  → plaintext DEK + encrypted DEK
 *   2. Encrypt payload  with plaintext DEK (AES-256-GCM in userland)
 *   3. Store encrypted DEK alongside the ciphertext
 *   4. Decrypt path: Decrypt the DEK with KMS, then decrypt payload
 */
import {
  KMSClient,
  CreateKeyCommand,
  CreateAliasCommand,
  DescribeKeyCommand,
  GenerateDataKeyCommand,
  DecryptCommand,
  EnableKeyRotationCommand,
  type KeyMetadata,
} from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';
import { config } from '../config.js';

const IV_LENGTH = 12;   // 96-bit IV for AES-256-GCM
const TAG_LENGTH = 16;  // 128-bit auth tag

export interface VaultKeyInfo {
  keyId: string;
  keyArn: string;
  keyAlias: string;
}

export interface EncryptedPayload {
  iv: string;               // hex
  ciphertext: string;       // hex
  authTag: string;          // hex
  encryptedDataKey: string; // base64 — KMS-encrypted DEK
  keyAlias: string;
}

export class VaultKeyManager {
  private readonly kms: KMSClient;

  constructor() {
    this.kms = new KMSClient({
      region: config.AWS_REGION,
      ...(config.AWS_ENDPOINT_URL ? { endpoint: config.AWS_ENDPOINT_URL } : {}),
    });
  }

  keyAliasForUser(userId: string): string {
    return `${config.KMS_KEY_ALIAS_PREFIX}/vault/${userId}`;
  }

  /** Create a new CMK and alias for the given user. */
  async createKeyForUser(userId: string): Promise<VaultKeyInfo> {
    const alias = this.keyAliasForUser(userId);

    const createResult = await this.kms.send(
      new CreateKeyCommand({
        Description: `Enheritage vault key for user ${userId}`,
        KeyUsage: 'ENCRYPT_DECRYPT',
        KeySpec: 'SYMMETRIC_DEFAULT',
        Tags: [
          { TagKey: 'service', TagValue: 'vault' },
          { TagKey: 'userId', TagValue: userId },
        ],
      }),
    );

    const meta = createResult.KeyMetadata as KeyMetadata;
    const keyId = meta.KeyId as string;
    const keyArn = meta.Arn as string;

    await this.kms.send(new CreateAliasCommand({ AliasName: alias, TargetKeyId: keyId }));
    await this.kms.send(new EnableKeyRotationCommand({ KeyId: keyId }));

    return { keyId, keyArn, keyAlias: alias };
  }

  /** Resolve key metadata by alias (checks if key already exists). */
  async describeKey(alias: string): Promise<VaultKeyInfo | null> {
    try {
      const res = await this.kms.send(new DescribeKeyCommand({ KeyId: alias }));
      const meta = res.KeyMetadata as KeyMetadata;
      return {
        keyId: meta.KeyId as string,
        keyArn: meta.Arn as string,
        keyAlias: alias,
      };
    } catch (err: unknown) {
      if ((err as { name?: string }).name === 'NotFoundException') return null;
      throw err;
    }
  }

  /** Encrypt plaintext using envelope encryption under the user's CMK. */
  async encrypt(userId: string, plaintext: string): Promise<EncryptedPayload> {
    const alias = this.keyAliasForUser(userId);

    // Generate a 256-bit data key
    const dkResult = await this.kms.send(
      new GenerateDataKeyCommand({ KeyId: alias, KeySpec: 'AES_256' }),
    );

    const plaintextDEK = Buffer.from(dkResult.Plaintext as Uint8Array);
    const encryptedDEK = Buffer.from(dkResult.CiphertextBlob as Uint8Array).toString('base64');

    // Encrypt payload with AES-256-GCM
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv('aes-256-gcm', plaintextDEK, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    // Zero out the DEK from memory (best effort in JS)
    plaintextDEK.fill(0);

    return {
      iv: iv.toString('hex'),
      ciphertext: encrypted.toString('hex'),
      authTag: authTag.toString('hex'),
      encryptedDataKey: encryptedDEK,
      keyAlias: alias,
    };
  }

  /** Decrypt an EncryptedPayload using envelope decryption. */
  async decrypt(payload: EncryptedPayload): Promise<string> {
    // Unwrap the DEK with KMS
    const decryptResult = await this.kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(payload.encryptedDataKey, 'base64'),
        KeyId: payload.keyAlias,
      }),
    );

    const plaintextDEK = Buffer.from(decryptResult.Plaintext as Uint8Array);

    // Decrypt the ciphertext
    const decipher = createDecipheriv(
      'aes-256-gcm',
      plaintextDEK,
      Buffer.from(payload.iv, 'hex'),
    );
    decipher.setAuthTag(Buffer.from(payload.authTag, 'hex'));
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(payload.ciphertext, 'hex')),
      decipher.final(),
    ]).toString('utf8');

    plaintextDEK.fill(0);
    return decrypted;
  }
}
