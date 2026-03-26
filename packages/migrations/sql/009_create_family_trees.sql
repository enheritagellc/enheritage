-- UP

CREATE TYPE relationship_type AS ENUM (
  'CHILD_OF', 'PARENT_OF', 'SPOUSE_OF', 'SIBLING_OF',
  'PARTNER_OF', 'STEP_CHILD_OF', 'ADOPTED_BY'
);

CREATE TYPE relationship_status AS ENUM ('CONFIRMED', 'SUGGESTED', 'DISPUTED');

CREATE TABLE family_trees (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id            UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_node_id     UUID,
  name                TEXT        NOT NULL DEFAULT 'Family Tree',
  gedcom_export_s3_key TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE family_tree_nodes (
  id                     UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                UUID        NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  first_name             TEXT,
  last_name              TEXT,
  birth_name             TEXT,
  birth_date             DATE,
  birth_place            TEXT,
  death_date             DATE,
  death_place            TEXT,
  photo_media_asset_id   UUID        REFERENCES media_assets(id) ON DELETE SET NULL,
  notes                  TEXT,
  family_search_person_id TEXT,
  gedcom_id              TEXT,
  is_subject             BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE family_tree_relationships (
  id                        UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  tree_id                   UUID                NOT NULL REFERENCES family_trees(id) ON DELETE CASCADE,
  from_node_id              UUID                NOT NULL REFERENCES family_tree_nodes(id) ON DELETE CASCADE,
  to_node_id                UUID                NOT NULL REFERENCES family_tree_nodes(id) ON DELETE CASCADE,
  type                      relationship_type   NOT NULL,
  status                    relationship_status NOT NULL DEFAULT 'CONFIRMED',
  start_date                DATE,
  end_date                  DATE,
  source_transcript_segment_id UUID             REFERENCES transcript_segments(id) ON DELETE SET NULL,
  confidence                FLOAT               NOT NULL DEFAULT 1.0,
  created_at                TIMESTAMPTZ         NOT NULL DEFAULT NOW()
);

-- Forward reference: set subject_node_id FK after nodes table is created
ALTER TABLE family_trees ADD CONSTRAINT fk_subject_node
  FOREIGN KEY (subject_node_id) REFERENCES family_tree_nodes(id) ON DELETE SET NULL;

CREATE INDEX family_trees_owner_id_idx ON family_trees (owner_id);
CREATE INDEX family_tree_nodes_tree_id_idx ON family_tree_nodes (tree_id);
CREATE INDEX family_tree_relationships_tree_id_idx ON family_tree_relationships (tree_id);
CREATE INDEX family_tree_relationships_from_node_idx ON family_tree_relationships (from_node_id);
CREATE INDEX family_tree_relationships_to_node_idx ON family_tree_relationships (to_node_id);

-- DOWN

ALTER TABLE family_trees DROP CONSTRAINT IF EXISTS fk_subject_node;
DROP TABLE IF EXISTS family_tree_relationships;
DROP TABLE IF EXISTS family_tree_nodes;
DROP TABLE IF EXISTS family_trees;
DROP TYPE IF EXISTS relationship_status;
DROP TYPE IF EXISTS relationship_type;
