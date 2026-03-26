-- UP

CREATE TABLE vaults (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID        NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  kms_key_id            TEXT        NOT NULL,
  kms_key_alias         TEXT        NOT NULL UNIQUE,
  kms_key_arn           TEXT        NOT NULL,
  s3_bucket_name        TEXT        NOT NULL,
  s3_prefix             TEXT        NOT NULL,
  encryption_algorithm  TEXT        NOT NULL DEFAULT 'AES-256',
  key_rotation_enabled  BOOLEAN     NOT NULL DEFAULT TRUE,
  last_key_rotation_at  TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE vault_keys (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id     UUID        NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  kms_key_id   TEXT        NOT NULL,
  key_version  INT         NOT NULL DEFAULT 1,
  status       TEXT        NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'DISABLED', 'PENDING_DELETION')),
  activated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX vault_keys_vault_id_idx ON vault_keys (vault_id);
CREATE INDEX vault_keys_status_idx ON vault_keys (status);

-- DOWN

DROP TABLE IF EXISTS vault_keys;
DROP TABLE IF EXISTS vaults;
