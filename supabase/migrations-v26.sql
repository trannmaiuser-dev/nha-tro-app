-- ============================================================
-- Migration v26: T-048 notification compose + schedule + ack
--
-- Cho phép cả owner và tenant soạn thông báo gửi nhau với:
-- - Recipients chỉ định (1 hoặc nhiều người)
-- - Schedule (gửi ngay hoặc đặt giờ)
-- - Repeat interval (gửi lại mỗi N phút)
-- - Repeat until ack (auto-stop khi recipient confirm)
--
-- Pattern: parent record `compose_notifications` + junction
-- `compose_notification_recipients`. Khi due, dispatch vào
-- `notifications` table (existing) — user thấy ở /notifications.
--
-- Pre-condition: T-046 done, notifications table tồn tại từ v11.
-- ============================================================

[SQL-V26-START]
-- Extend notifications.type CHECK to allow 'compose_message'
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_reminder',
  'payment_reported',
  'payment_confirmed',
  'payment_rejected',
  'extension_request',
  'extension_approved',
  'extension_rejected',
  'meter_reading_reminder',
  'contract_renewal_reminder',
  'compose_message'
));

-- Compose notifications (parent record)
CREATE TABLE IF NOT EXISTS compose_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  scheduled_at TIMESTAMPTZ,
  repeat_interval_minutes INTEGER,
  repeat_until_ack BOOLEAN NOT NULL DEFAULT FALSE,
  next_due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Recipients junction with per-recipient ack state
CREATE TABLE IF NOT EXISTS compose_notification_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compose_id UUID NOT NULL REFERENCES compose_notifications(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  acked_at TIMESTAMPTZ,
  last_dispatched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(compose_id, recipient_id)
);

-- Link back from notifications row to compose parent (for ack flow)
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS compose_id UUID
  REFERENCES compose_notifications(id) ON DELETE SET NULL;

-- Index for due check during on-demand dispatch
CREATE INDEX IF NOT EXISTS idx_compose_notifs_due
  ON compose_notifications(next_due_at) WHERE next_due_at IS NOT NULL;

-- Index for unacked recipients lookup
CREATE INDEX IF NOT EXISTS idx_compose_recipients_unacked
  ON compose_notification_recipients(recipient_id) WHERE acked_at IS NULL;
[SQL-V26-END]
