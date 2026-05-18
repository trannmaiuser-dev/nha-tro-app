-- ============================================================
-- Migration v22: T-042 contract renewal reminder
--
-- (1) ALTER notifications.sender_id DROP NOT NULL — cho phép system
--     notification không có sender (giúp T-017 lib/debt-notify dispatch
--     cùng cron-future). Existing INSERT vẫn pass owner ID.
--
-- (2) Extend CHECK notifications.type với 2 type mới:
--       'meter_reading_reminder' (T-039 may switch sang sau)
--       'contract_renewal_reminder' (T-042)
--
-- (3) ADD COLUMN room_tenants.contract_end_date DATE NULL
--     — hợp đồng theo từng người (per membership). NULL = chưa nhập.
--
-- (4) Index for fast lookup of contracts coming due
-- ============================================================

-- (1) Sender NULL cho system notifications
ALTER TABLE notifications ALTER COLUMN sender_id DROP NOT NULL;

-- (2) Extend type CHECK
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
  'contract_renewal_reminder'
));

-- (3) Contract end date per membership
ALTER TABLE room_tenants ADD COLUMN IF NOT EXISTS contract_end_date DATE;

-- (4) Index để cron/on-page check tìm contracts due soon nhanh
CREATE INDEX IF NOT EXISTS idx_room_tenants_contract_end
  ON room_tenants(contract_end_date)
  WHERE left_at IS NULL AND contract_end_date IS NOT NULL;
