-- UP

CREATE TYPE user_tier AS ENUM ('FREE', 'STANDARD', 'PREMIUM', 'ELITE', 'ENTERPRISE');
CREATE TYPE user_role AS ENUM ('OWNER', 'COLLABORATOR', 'VIEWER', 'ENTERPRISE_STAFF', 'ADMIN');

CREATE TABLE enterprise_accounts (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  plan               TEXT        NOT NULL DEFAULT 'STANDARD',
  max_users          INT         NOT NULL DEFAULT 10,
  contract_start_date DATE,
  contract_end_date   DATE,
  billing_contact    TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  email                 TEXT        NOT NULL UNIQUE,
  first_name            TEXT,
  last_name             TEXT,
  display_name          TEXT,
  auth0_sub             TEXT        NOT NULL UNIQUE,
  tier                  user_tier   NOT NULL DEFAULT 'FREE',
  role                  user_role   NOT NULL DEFAULT 'OWNER',
  enterprise_account_id UUID        REFERENCES enterprise_accounts(id) ON DELETE SET NULL,
  is_elderly_mode       BOOLEAN     NOT NULL DEFAULT FALSE,
  timezone              TEXT        NOT NULL DEFAULT 'UTC',
  language              TEXT        NOT NULL DEFAULT 'en',
  notify_email          BOOLEAN     NOT NULL DEFAULT TRUE,
  notify_sms            BOOLEAN     NOT NULL DEFAULT FALSE,
  notify_push           BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ
);

CREATE INDEX users_auth0_sub_idx ON users (auth0_sub);
CREATE INDEX users_email_idx ON users (email);

-- DOWN

DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS enterprise_accounts;
DROP TYPE IF EXISTS user_role;
DROP TYPE IF EXISTS user_tier;
