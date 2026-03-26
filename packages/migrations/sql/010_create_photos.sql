-- UP

CREATE TABLE photo_albums (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  biography_id UUID        REFERENCES biographies(id) ON DELETE SET NULL,
  title        TEXT        NOT NULL,
  description  TEXT,
  cover_photo_id UUID,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE photos (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  album_id          UUID        NOT NULL REFERENCES photo_albums(id) ON DELETE CASCADE,
  owner_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  media_asset_id    UUID        NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
  caption_ai        TEXT,
  caption_user      TEXT,
  taken_at          TIMESTAMPTZ,
  latitude          FLOAT,
  longitude         FLOAT,
  location_label    TEXT,
  rekognition_labels JSONB      NOT NULL DEFAULT '[]',
  faces             JSONB       NOT NULL DEFAULT '[]',
  thumbnail_s3_key  TEXT,
  preview_s3_key    TEXT,
  full_s3_key       TEXT,
  order_index       INT         NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE photo_albums ADD CONSTRAINT fk_cover_photo
  FOREIGN KEY (cover_photo_id) REFERENCES photos(id) ON DELETE SET NULL;

CREATE INDEX photo_albums_owner_id_idx ON photo_albums (owner_id);
CREATE INDEX photos_album_id_idx ON photos (album_id);
CREATE INDEX photos_media_asset_id_idx ON photos (media_asset_id);

-- DOWN

ALTER TABLE photo_albums DROP CONSTRAINT IF EXISTS fk_cover_photo;
DROP TABLE IF EXISTS photos;
DROP TABLE IF EXISTS photo_albums;
