-- ============================================================
-- Migration v13: Notification cho payment-proofs flow (T-014b)
-- Mở rộng CHECK constraint `notifications.type` để cho phép
-- 2 loại mới: payment_reported (tenant → admin),
--             payment_rejected (admin → tenant).
-- `payment_confirmed` đã tồn tại trong schema gốc.
-- ============================================================

ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
  'payment_reminder',
  'payment_reported',
  'payment_confirmed',
  'payment_rejected',
  'extension_request',
  'extension_approved',
  'extension_rejected'
));
