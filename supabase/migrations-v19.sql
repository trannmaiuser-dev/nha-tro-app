-- ============================================================
-- Migration v19: Debt warning system (T-017, UC-05)
-- Ngày: 2026-05-18
--
-- Changes:
--   1. ADD COLUMN invoices.has_debt (boolean, default false)
--   2. ADD COLUMN invoices.last_debt_notified_at (timestamptz, nullable) — dedup notify 24h
--   3. Partial index on has_debt=true (query phòng có nợ nhanh)
--   4. Backfill existing overdue invoices
--   5. INSERT setting `debt_warning_threshold_days` (default 0 = quá ngày 1 là cảnh báo)
-- ============================================================

BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS has_debt              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_debt_notified_at TIMESTAMPTZ;

-- Partial index: chỉ index rows has_debt=true (giảm size, query phòng có nợ nhanh)
CREATE INDEX IF NOT EXISTS idx_invoices_has_debt
  ON invoices(room_id, due_date)
  WHERE has_debt = TRUE;

-- Backfill: mark existing overdue invoices
UPDATE invoices
SET has_debt = TRUE
WHERE status != 'paid'
  AND paid_amount < total
  AND due_date < CURRENT_DATE;

-- Setting: threshold ngày sau due_date mới coi là quá hạn (0 = quá 1 ngày là báo)
INSERT INTO app_settings (key, value, description)
VALUES (
  'debt_warning_threshold_days',
  '0',
  'Số ngày trễ sau due_date mới được coi là quá hạn (mặc định: 0 = quá ngày 1 là báo)'
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Verify after apply:
--
-- 1) Columns:
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'invoices' AND column_name IN ('has_debt', 'last_debt_notified_at')
-- ORDER BY column_name;
-- → 2 rows
--
-- 2) Index:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename = 'invoices' AND indexname = 'idx_invoices_has_debt';
-- → 1 row
--
-- 3) Setting:
-- SELECT key, value FROM app_settings WHERE key = 'debt_warning_threshold_days';
-- → 1 row, value='0'
--
-- 4) Backfill check:
-- SELECT COUNT(*) AS overdue_marked FROM invoices WHERE has_debt = TRUE;
-- → số invoices đang quá hạn (>= 0)
--
-- ROLLBACK (nếu cần):
-- BEGIN;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS has_debt;
-- ALTER TABLE invoices DROP COLUMN IF EXISTS last_debt_notified_at;
-- DROP INDEX IF EXISTS idx_invoices_has_debt;
-- DELETE FROM app_settings WHERE key = 'debt_warning_threshold_days';
-- COMMIT;
-- ============================================================
