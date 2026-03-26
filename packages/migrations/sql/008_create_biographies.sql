-- UP

CREATE TYPE biography_status AS ENUM (
  'DRAFT', 'OUTLINE_PENDING_REVIEW', 'DRAFTING',
  'REVIEW_PENDING', 'APPROVED', 'PUBLISHED'
);

CREATE TABLE biographies (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  interview_id             UUID             NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  transcript_id            UUID             REFERENCES transcripts(id) ON DELETE SET NULL,
  enrichment_job_id        UUID             REFERENCES enrichment_jobs(id) ON DELETE SET NULL,
  title                    TEXT             NOT NULL DEFAULT 'My Biography',
  subtitle                 TEXT,
  status                   biography_status NOT NULL DEFAULT 'DRAFT',
  total_word_count         INT              NOT NULL DEFAULT 0,
  generation_model_primary TEXT,
  generation_model_fallback TEXT,
  outline_approved_at      TIMESTAMPTZ,
  published_at             TIMESTAMPTZ,
  s3_html_key              TEXT,
  s3_pdf_key               TEXT,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE TABLE biography_chapters (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  biography_id     UUID        NOT NULL REFERENCES biographies(id) ON DELETE CASCADE,
  order_index      INT         NOT NULL DEFAULT 1,
  title            TEXT        NOT NULL,
  content          TEXT        NOT NULL DEFAULT '',
  word_count       INT         NOT NULL DEFAULT 0,
  generation_model TEXT,
  generation_pass  TEXT,
  is_approved      BOOLEAN     NOT NULL DEFAULT FALSE,
  approved_at      TIMESTAMPTZ,
  approved_by      UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (biography_id, order_index)
);

CREATE INDEX biographies_owner_id_idx ON biographies (owner_id);
CREATE INDEX biographies_interview_id_idx ON biographies (interview_id);
CREATE INDEX biographies_status_idx ON biographies (status);
CREATE INDEX biography_chapters_biography_id_idx ON biography_chapters (biography_id);

-- DOWN

DROP TABLE IF EXISTS biography_chapters;
DROP TABLE IF EXISTS biographies;
DROP TYPE IF EXISTS biography_status;
