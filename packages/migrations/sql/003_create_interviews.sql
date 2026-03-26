-- UP

CREATE TYPE interview_status AS ENUM ('SCHEDULED', 'WAITING', 'ACTIVE', 'PAUSED', 'COMPLETED', 'FAILED');
CREATE TYPE interview_format AS ENUM ('VIDEO', 'AUDIO_ONLY', 'ASYNC_UPLOAD');

CREATE TABLE interviews (
  id                       UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id                 UUID             NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title                    TEXT             NOT NULL,
  description              TEXT,
  format                   interview_format NOT NULL DEFAULT 'VIDEO',
  status                   interview_status NOT NULL DEFAULT 'SCHEDULED',
  parent_participant_token TEXT             NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'base64url'),
  scheduled_at             TIMESTAMPTZ,
  started_at               TIMESTAMPTZ,
  ended_at                 TIMESTAMPTZ,
  duration_seconds         INT,
  recording_s3_key         TEXT,
  notes                    TEXT,
  created_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  deleted_at               TIMESTAMPTZ
);

CREATE TABLE interview_questions (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID        NOT NULL REFERENCES interviews(id) ON DELETE CASCADE,
  order_index  INT         NOT NULL DEFAULT 0,
  question     TEXT        NOT NULL,
  asked_at     TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX interviews_owner_id_idx ON interviews (owner_id);
CREATE INDEX interviews_status_idx ON interviews (status);
CREATE INDEX interviews_scheduled_at_idx ON interviews (scheduled_at);
CREATE INDEX interview_questions_interview_id_idx ON interview_questions (interview_id);

-- DOWN

DROP TABLE IF EXISTS interview_questions;
DROP TABLE IF EXISTS interviews;
DROP TYPE IF EXISTS interview_format;
DROP TYPE IF EXISTS interview_status;
