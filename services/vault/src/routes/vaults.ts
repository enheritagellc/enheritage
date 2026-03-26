/**
 * Vault routes
 *
 * POST   /vaults                    — provision a new vault for a user
 * GET    /vaults/:userId            — get vault metadata for a user
 * POST   /vaults/:userId/encrypt    — encrypt arbitrary JSON data
 * POST   /vaults/:userId/decrypt    — decrypt previously encrypted payload
 * POST   /vaults/:userId/rotate     — rotate the user's KMS key
 * GET    /vaults/:userId/keys       — list vault key versions
 */
import type { FastifyInstance } from 'fastify';
import { VaultKeyManager } from '../kms/VaultKeyManager.js';
import { config } from '../config.js';

const km = new VaultKeyManager();

interface UserParams {
  userId: string;
}

interface ProvisionBody {
  userId: string;
}

interface EncryptBody {
  data: unknown;
}

interface DecryptBody {
  iv: string;
  ciphertext: string;
  authTag: string;
  encryptedDataKey: string;
  keyAlias: string;
}

export async function vaultRoutes(app: FastifyInstance): Promise<void> {
  // ── Provision a vault ───────────────────────────────────────────────────────
  app.post<{ Body: ProvisionBody }>('/vaults', async (request, reply) => {
    const { userId } = request.body;
    if (!userId) return reply.badRequest('userId is required');

    // Check if vault already exists
    const existing = await app.db.query('SELECT id FROM vaults WHERE user_id = $1', [userId]);
    if (existing.rows.length > 0) {
      return reply.conflict('Vault already exists for this user');
    }

    // Check if KMS key already exists (idempotency guard)
    const alias = km.keyAliasForUser(userId);
    let keyInfo = await km.describeKey(alias);
    if (!keyInfo) {
      keyInfo = await km.createKeyForUser(userId);
    }

    const result = await app.db.query(
      `INSERT INTO vaults
         (user_id, kms_key_id, kms_key_alias, kms_key_arn, s3_bucket_name, s3_prefix)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, keyInfo.keyId, keyInfo.keyAlias, keyInfo.keyArn, config.S3_BUCKET_VAULT, `vaults/${userId}/`],
    );

    // Record the initial key version
    await app.db.query(
      `INSERT INTO vault_keys (vault_id, kms_key_id, key_version, status)
       VALUES ($1, $2, 1, 'ACTIVE')`,
      [result.rows[0].id, keyInfo.keyId],
    );

    return reply.code(201).send(result.rows[0]);
  });

  // ── Get vault ───────────────────────────────────────────────────────────────
  app.get<{ Params: UserParams }>('/vaults/:userId', async (request, reply) => {
    const { userId } = request.params;
    const result = await app.db.query('SELECT * FROM vaults WHERE user_id = $1', [userId]);
    if (result.rows.length === 0) return reply.notFound('Vault not found');
    return result.rows[0];
  });

  // ── Encrypt data ────────────────────────────────────────────────────────────
  app.post<{ Params: UserParams; Body: EncryptBody }>('/vaults/:userId/encrypt', async (request, reply) => {
    const { userId } = request.params;
    const { data } = request.body;
    if (data === undefined) return reply.badRequest('data is required');

    // Verify vault exists
    const vault = await app.db.query('SELECT id FROM vaults WHERE user_id = $1', [userId]);
    if (vault.rows.length === 0) return reply.notFound('Vault not found — provision one first');

    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = await km.encrypt(userId, plaintext);

    return { encrypted };
  });

  // ── Decrypt data ────────────────────────────────────────────────────────────
  app.post<{ Params: UserParams; Body: DecryptBody }>('/vaults/:userId/decrypt', async (request, reply) => {
    const { userId } = request.params;
    const payload = request.body;

    if (!payload.iv || !payload.ciphertext || !payload.encryptedDataKey) {
      return reply.badRequest('iv, ciphertext, and encryptedDataKey are required');
    }

    const vault = await app.db.query('SELECT id FROM vaults WHERE user_id = $1', [userId]);
    if (vault.rows.length === 0) return reply.notFound('Vault not found');

    const plaintext = await km.decrypt(payload);

    // Attempt to parse as JSON; return raw string if not JSON
    try {
      return { data: JSON.parse(plaintext) };
    } catch {
      return { data: plaintext };
    }
  });

  // ── Rotate key ──────────────────────────────────────────────────────────────
  app.post<{ Params: UserParams }>('/vaults/:userId/rotate', async (request, reply) => {
    const { userId } = request.params;

    const vaultResult = await app.db.query('SELECT * FROM vaults WHERE user_id = $1', [userId]);
    if (vaultResult.rows.length === 0) return reply.notFound('Vault not found');

    const vault = vaultResult.rows[0];

    // KMS automatic rotation is already enabled on the key; this endpoint
    // records the event and can trigger an on-demand rotation in future.
    // For now we update the timestamp and log a new key version.
    const keyVersionResult = await app.db.query(
      'SELECT MAX(key_version) AS max_ver FROM vault_keys WHERE vault_id = $1',
      [vault.id],
    );
    const nextVersion = (keyVersionResult.rows[0].max_ver ?? 0) + 1;

    await app.db.query(
      `INSERT INTO vault_keys (vault_id, kms_key_id, key_version, status)
       VALUES ($1, $2, $3, 'ACTIVE')`,
      [vault.id, vault.kms_key_id, nextVersion],
    );

    await app.db.query(
      'UPDATE vaults SET last_key_rotation_at = NOW(), updated_at = NOW() WHERE id = $1',
      [vault.id],
    );

    return { message: 'Key rotation recorded', keyVersion: nextVersion };
  });

  // ── List key versions ───────────────────────────────────────────────────────
  app.get<{ Params: UserParams }>('/vaults/:userId/keys', async (request, reply) => {
    const { userId } = request.params;

    const vaultResult = await app.db.query('SELECT id FROM vaults WHERE user_id = $1', [userId]);
    if (vaultResult.rows.length === 0) return reply.notFound('Vault not found');

    const keysResult = await app.db.query(
      'SELECT * FROM vault_keys WHERE vault_id = $1 ORDER BY key_version',
      [vaultResult.rows[0].id],
    );

    return { keys: keysResult.rows };
  });
}
