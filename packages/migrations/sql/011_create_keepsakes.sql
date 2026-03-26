-- UP

CREATE TYPE keepsake_type AS ENUM (
  'DIGITAL_BIOGRAPHY', 'SOFTCOVER_BOOK', 'HARDCOVER_BOOK',
  'COLLECTORS_EDITION', 'PHOTO_ALBUM_PRINT', 'FAMILY_TREE_PRINT'
);

CREATE TYPE keepsake_status AS ENUM (
  'PENDING', 'GENERATING', 'QA_REVIEW', 'APPROVED',
  'PRINT_SUBMITTED', 'SHIPPED', 'DELIVERED', 'FAILED'
);

CREATE TABLE keepsakes (
  id                UUID           PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id          UUID           NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  biography_id      UUID           REFERENCES biographies(id) ON DELETE SET NULL,
  photo_album_id    UUID           REFERENCES photo_albums(id) ON DELETE SET NULL,
  family_tree_id    UUID           REFERENCES family_trees(id) ON DELETE SET NULL,
  type              keepsake_type  NOT NULL,
  status            keepsake_status NOT NULL DEFAULT 'PENDING',
  title             TEXT           NOT NULL,
  pdf_s3_key        TEXT,
  print_spec        JSONB          NOT NULL DEFAULT '{}',
  printful_order_id TEXT,
  tracking_number   TEXT,
  shipping_address  JSONB,
  price_amount      NUMERIC(10,2),
  price_currency    TEXT           NOT NULL DEFAULT 'USD',
  created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX keepsakes_owner_id_idx ON keepsakes (owner_id);
CREATE INDEX keepsakes_status_idx ON keepsakes (status);

-- DOWN

DROP TABLE IF EXISTS keepsakes;
DROP TYPE IF EXISTS keepsake_status;
DROP TYPE IF EXISTS keepsake_type;
