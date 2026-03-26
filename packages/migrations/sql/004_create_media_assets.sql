-- UP

CREATE TYPE media_type AS ENUM ('AUDIO', 'VIDEO', 'PHOTO', 'DOCUMENT');
CREATE TYPE processing_status AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'CANCELLED');

CREATE TABLE media_assets (
  id                UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  vault_id          UUID             REFERENCES vaults(id) ON DELETE SET NULL,
  owner_id          UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_id      UUID             REFERENCES interviews(id) ON DELETE SET NULL,
  s3_key            TEXT             NOT NULL,
  s3_bucket         TEXT             NOT NULL,
  content_type      TEXT             NOT NULL,
  size_bytes        BIGINT,
  duration_seconds  FLOAT,
  width             INT,
  height            INT,
  original_filename TEXT,
  media_type        media_type       NOT NULL,
  processing_status processing_status NOT NULL DEFAULT 'PENDING',
  exif_data         JSONB,
  uploaded_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE TABLE upload_sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id       UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  s3_upload_id   TEXT        NOT NULL,
  s3_key         TEXT        NOT NULL,
  s3_bucket      TEXT        NOT NULL,
  part_count     INT         NOT NULL DEFAULT 0,
  completed_parts JSONB      NOT NULL DEFAULT '[]',
  expires_at     TIMESTAMPTZ NOT NULL,
  media_type     media_type  NOT NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE processing_jobs (
  id              UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  media_asset_id  UUID              NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  job_type        TEXT              NOT NULL,
  status          processing_status NOT NULL DEFAULT 'PENDING',
  queue_message_id TEXT,
  started_at      TIMESTAMPTZ,
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  created_at      TIMESTAMPTZ       NOT NULL DEFAULT NOW()
);

CREATE INDEX media_assets_owner_id_idx ON media_assets (owner_id);
CREATE INDEX media_assets_interview_id_idx ON media_assets (interview_id);
CREATE INDEX media_assets_processing_status_idx ON media_assets (processing_status);
CREATE INDEX processing_jobs_media_asset_id_idx ON processing_jobs (media_asset_id);
CREATE INDEX processing_jobs_status_idx ON processing_jobs (status);

-- DOWN

DROP TABLE IF EXISTS processing_jobs;
DROP TABLE IF EXISTS upload_sessions;
DROP TABLE IF EXISTS media_assets;
DROP TYPE IF EXISTS processing_status;
DROP TYPE IF EXISTS media_type;
