-- UP

CREATE TYPE speaker_label AS ENUM ('ADULT_CHILD', 'PARENT', 'UNKNOWN');

CREATE TABLE transcripts (
  id                        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id              UUID        NOT NULL UNIQUE REFERENCES interviews(id) ON DELETE CASCADE,
  vault_id                  UUID        REFERENCES vaults(id) ON DELETE SET NULL,
  media_asset_id            UUID        REFERENCES media_assets(id) ON DELETE SET NULL,
  s3_key                    TEXT,
  language                  TEXT        NOT NULL DEFAULT 'en',
  full_text                 TEXT,
  total_duration_seconds    FLOAT,
  word_count                INT,
  average_confidence        FLOAT,
  whisper_model_version     TEXT,
  diarization_model_version TEXT,
  processing_status         TEXT        NOT NULL DEFAULT 'PENDING',
  reviewed_at               TIMESTAMPTZ,
  reviewed_by               UUID        REFERENCES users(id) ON DELETE SET NULL,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transcript_segments (
  id                 UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id      UUID         NOT NULL REFERENCES transcripts(id) ON DELETE CASCADE,
  segment_index      INT          NOT NULL,
  speaker            speaker_label NOT NULL DEFAULT 'UNKNOWN',
  text               TEXT         NOT NULL,
  start_time         FLOAT        NOT NULL,
  end_time           FLOAT        NOT NULL,
  timed_words        JSONB        NOT NULL DEFAULT '[]',
  average_confidence FLOAT,
  requires_review    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE (transcript_id, segment_index)
);

CREATE INDEX transcripts_interview_id_idx ON transcripts (interview_id);
CREATE INDEX transcript_segments_transcript_id_idx ON transcript_segments (transcript_id);

-- DOWN

DROP TABLE IF EXISTS transcript_segments;
DROP TABLE IF EXISTS transcripts;
DROP TYPE IF EXISTS speaker_label;
