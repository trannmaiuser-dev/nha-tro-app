Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ, Supabase Singapore)
- Task: T-017 — debt warning system (UC-05)
- File migration: supabase/migrations-v19.sql
- Changes: ADD 2 columns invoices.has_debt + last_debt_notified_at, INSERT setting threshold, backfill existing overdue

== LƯU Ý ==
- Backward compat: TS code đã merge sẽ fail-open nếu migration chưa apply (banner sẽ rỗng, không lỗi). Apply để feature work full.

== VIỆC BẠN CẦN LÀM ==

--- BƯỚC 1: Apply migration ---

1. Supabase Dashboard → SQL Editor → New query
2. Paste khối [SQL-MIGRATION] dưới → Run

[SQL-MIGRATION-START]
BEGIN;

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS has_debt              BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_debt_notified_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_invoices_has_debt
  ON invoices(room_id, due_date)
  WHERE has_debt = TRUE;

UPDATE invoices
SET has_debt = TRUE
WHERE status != 'paid'
  AND paid_amount < total
  AND due_date < CURRENT_DATE;

INSERT INTO app_settings (key, value, description)
VALUES (
  'debt_warning_threshold_days',
  '0',
  'Số ngày trễ sau due_date mới được coi là quá hạn (mặc định: 0 = quá ngày 1 là báo)'
)
ON CONFLICT (key) DO NOTHING;

NOTIFY pgrst, 'reload schema';

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 2: Verify columns ---

[SQL-VERIFY-COLUMNS-START]
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices' AND column_name IN ('has_debt', 'last_debt_notified_at')
ORDER BY column_name;
[SQL-VERIFY-COLUMNS-END]

Pass: 2 rows. has_debt boolean NOT NULL default false. last_debt_notified_at timestamptz nullable.

--- BƯỚC 3: Verify index ---

[SQL-VERIFY-INDEX-START]
SELECT indexname FROM pg_indexes
WHERE tablename = 'invoices' AND indexname = 'idx_invoices_has_debt';
[SQL-VERIFY-INDEX-END]

Pass: 1 row.

--- BƯỚC 4: Verify setting ---

[SQL-VERIFY-SETTING-START]
SELECT key, value FROM app_settings WHERE key = 'debt_warning_threshold_days';
[SQL-VERIFY-SETTING-END]

Pass: 1 row, value='0'.

--- BƯỚC 5: Backfill check ---

[SQL-BACKFILL-CHECK-START]
SELECT COUNT(*) AS overdue_marked FROM invoices WHERE has_debt = TRUE;
SELECT id, month, year, due_date, status, paid_amount, total, has_debt
FROM invoices
WHERE has_debt = TRUE
ORDER BY due_date ASC
LIMIT 10;
[SQL-BACKFILL-CHECK-END]

Pass: count >= 0. Nếu có rows: tất cả phải có status!='paid', paid_amount<total, due_date<TODAY.

--- BƯỚC 6: Smoke test sync helper (DRY-RUN) ---

Tạo 1 invoice giả có due_date quá hạn, verify backfill mark đúng:

[SQL-SMOKE-START]
BEGIN;

-- Pick 1 room có invoice hiện tại
WITH target AS (
  SELECT id FROM rooms LIMIT 1
)
INSERT INTO invoices (room_id, month, year, total, paid_amount, due_date, status, has_debt)
SELECT id, 1, 2025, 1000000, 0, '2025-01-31', 'unpaid', FALSE
FROM target
RETURNING id, month, year, due_date, status, has_debt;

-- Manual sync: should flip has_debt=true
UPDATE invoices
SET has_debt = TRUE
WHERE due_date = '2025-01-31'
  AND month = 1 AND year = 2025
  AND status != 'paid'
  AND paid_amount < total
RETURNING id, has_debt;

ROLLBACK;
[SQL-SMOKE-END]

Pass: 2 RETURNING rows. ROLLBACK preserve state.

== BÁO CÁO LẠI CHO TÔI ==

Format:
- Buoc 1 apply: OK / ERROR <msg>
- Buoc 2 columns: 2 rows / FAIL
- Buoc 3 index: 1 row / FAIL
- Buoc 4 setting: 1 row value='0' / FAIL
- Buoc 5 backfill: count=N, sample rows OK / FAIL
- Buoc 6 smoke: pass / FAIL <reason>

Neu bat ky buoc FAIL → STOP, paste error.
