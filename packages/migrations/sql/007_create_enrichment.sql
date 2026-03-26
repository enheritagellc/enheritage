-- UP

CREATE TABLE enrichment_jobs (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  ner_result_id     UUID        NOT NULL UNIQUE REFERENCES ner_results(id) ON DELETE CASCADE,
  status            TEXT        NOT NULL DEFAULT 'PENDING',
  total_entities    INT         NOT NULL DEFAULT 0,
  enriched_entities INT         NOT NULL DEFAULT 0,
  failed_entities   INT         NOT NULL DEFAULT 0,
  s3_result_key     TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE enrichment_citations (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  enrichment_job_id UUID        NOT NULL REFERENCES enrichment_jobs(id) ON DELETE CASCADE,
  entity_id         UUID        NOT NULL REFERENCES ner_entities(id) ON DELETE CASCADE,
  provider          TEXT        NOT NULL,
  url               TEXT        NOT NULL,
  title             TEXT,
  snippet           TEXT,
  thumbnail_url     TEXT,
  retrieved_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confidence        FLOAT       NOT NULL DEFAULT 1.0,
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  is_primary        BOOLEAN     NOT NULL DEFAULT FALSE,
  maps_embed        TEXT,
  is_excluded       BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX enrichment_jobs_ner_result_id_idx ON enrichment_jobs (ner_result_id);
CREATE INDEX enrichment_citations_job_id_idx ON enrichment_citations (enrichment_job_id);
CREATE INDEX enrichment_citations_entity_id_idx ON enrichment_citations (entity_id);

-- DOWN

DROP TABLE IF EXISTS enrichment_citations;
DROP TABLE IF EXISTS enrichment_jobs;
