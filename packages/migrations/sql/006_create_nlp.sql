-- UP

CREATE TABLE ner_results (
  id                       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id            UUID        NOT NULL UNIQUE REFERENCES transcripts(id) ON DELETE CASCADE,
  entity_count             INT         NOT NULL DEFAULT 0,
  s3_result_key            TEXT,
  processing_model_version TEXT,
  processing_status        TEXT        NOT NULL DEFAULT 'PENDING',
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE ner_entities (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ner_result_id       UUID        NOT NULL REFERENCES ner_results(id) ON DELETE CASCADE,
  entity_type         TEXT        NOT NULL,
  raw_text            TEXT        NOT NULL,
  normalized_label    TEXT,
  start_char_index    INT         NOT NULL,
  end_char_index      INT         NOT NULL,
  confidence          FLOAT       NOT NULL DEFAULT 1.0,
  segment_id          UUID        REFERENCES transcript_segments(id) ON DELETE SET NULL,
  canonical_entity_id UUID,
  is_ambiguous        BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ner_results_transcript_id_idx ON ner_results (transcript_id);
CREATE INDEX ner_entities_ner_result_id_idx ON ner_entities (ner_result_id);
CREATE INDEX ner_entities_type_idx ON ner_entities (entity_type);

-- DOWN

DROP TABLE IF EXISTS ner_entities;
DROP TABLE IF EXISTS ner_results;
