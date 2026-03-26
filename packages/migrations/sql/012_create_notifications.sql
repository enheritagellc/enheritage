-- UP

CREATE TYPE notification_channel AS ENUM ('EMAIL', 'SMS', 'PUSH');
CREATE TYPE notification_status  AS ENUM ('QUEUED', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');

CREATE TABLE notifications (
  id                  UUID                 PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID                 NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel             notification_channel NOT NULL,
  type                TEXT                 NOT NULL,
  status              notification_status  NOT NULL DEFAULT 'QUEUED',
  subject             TEXT,
  body                TEXT                 NOT NULL,
  sent_at             TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  error_message       TEXT,
  external_message_id TEXT,
  created_at          TIMESTAMPTZ          NOT NULL DEFAULT NOW()
);

CREATE INDEX notifications_user_id_idx ON notifications (user_id);
CREATE INDEX notifications_status_idx ON notifications (status);
CREATE INDEX notifications_channel_idx ON notifications (channel);

-- DOWN

DROP TABLE IF EXISTS notifications;
DROP TYPE IF EXISTS notification_status;
DROP TYPE IF EXISTS notification_channel;
