-- ============================================================
-- Migration v12: Module Thu Chi — Schema mở rộng (T-011)
-- Chạy file này trong Supabase SQL Editor
-- ============================================================
--
-- Phải tạo thủ công 2 Storage buckets qua Supabase Dashboard
-- (Storage → New bucket) TRƯỚC hoặc SAU khi chạy file này:
--
--   1. payment-proofs    (Public: OFF, ảnh sao kê của tenant)
--   2. expense-receipts  (Public: OFF, biên lai chi tiêu của owner)
--
-- Lý do: project dùng SUPABASE_SERVICE_ROLE_KEY từ server, tất cả
-- upload đi qua API routes nên không cần Storage RLS policy. Việc
-- tạo bucket bằng SQL không stable trên Supabase Cloud → tạo qua UI.
-- ============================================================

-- ─── 1. Mở rộng bảng `rooms`: đơn giá điện riêng ─────────────
-- NULL = dùng `electricity_rate_default` từ app_settings
ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS electricity_rate INTEGER;

COMMENT ON COLUMN rooms.electricity_rate IS
  'Đơn giá điện VND/kWh riêng cho phòng. NULL = dùng default từ app_settings.electricity_rate_default';

-- ─── 2. Bảng `electricity_logs` ─────────────────────────────
-- Chỉ số điện + nước hàng tháng cho mỗi phòng (1 row / phòng / tháng)
CREATE TABLE IF NOT EXISTS electricity_logs (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id            UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  month              INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year               INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  -- Điện
  prev_kwh           INTEGER NOT NULL DEFAULT 0,
  curr_kwh           INTEGER NOT NULL DEFAULT 0,
  kwh_usage          INTEGER GENERATED ALWAYS AS (curr_kwh - prev_kwh) STORED,
  -- Nước (chỉ điền nếu mode = per_m3, mode khác có thể để NULL)
  prev_water_m3      INTEGER,
  curr_water_m3      INTEGER,
  water_usage_m3     INTEGER GENERATED ALWAYS AS (curr_water_m3 - prev_water_m3) STORED,
  -- Audit
  recorded_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  recorded_by        UUID REFERENCES users(id) ON DELETE SET NULL,
  -- 1 phòng / 1 tháng / 1 năm = 1 record
  CONSTRAINT electricity_logs_unique_room_month UNIQUE (room_id, month, year)
);
ALTER TABLE electricity_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_elec_logs_room      ON electricity_logs(room_id);
CREATE INDEX IF NOT EXISTS idx_elec_logs_month     ON electricity_logs(year, month);

-- ─── 3. Bảng `invoices` ─────────────────────────────────────
-- Hóa đơn (1 phòng / 1 tháng / 1 năm = 1 hóa đơn)
CREATE TABLE IF NOT EXISTS invoices (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id               UUID NOT NULL REFERENCES rooms(id) ON DELETE RESTRICT,
  month                 INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  year                  INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
  -- Breakdown các khoản
  rent_amount           INTEGER NOT NULL DEFAULT 0,
  electricity_amount    INTEGER NOT NULL DEFAULT 0,
  electricity_log_id    UUID REFERENCES electricity_logs(id) ON DELETE SET NULL,
  water_billing_mode    TEXT NOT NULL DEFAULT 'per_m3'
                          CHECK (water_billing_mode IN ('per_m3', 'per_person', 'fixed')),
  water_amount          INTEGER NOT NULL DEFAULT 0,
  trash_fee             INTEGER NOT NULL DEFAULT 0,
  parking_fee           INTEGER NOT NULL DEFAULT 0,
  internet_fee          INTEGER NOT NULL DEFAULT 0,
  over_capacity_fee     INTEGER NOT NULL DEFAULT 0,
  -- Phụ phí phát sinh: [{ "label": "Sửa quạt", "amount": 50000 }, ...]
  extra_items           JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Tổng & thanh toán
  total                 INTEGER NOT NULL DEFAULT 0,
  paid_amount           INTEGER NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status                TEXT NOT NULL DEFAULT 'unpaid'
                          CHECK (status IN ('unpaid', 'partially_paid', 'paid')),
  -- Thời gian
  due_date              DATE NOT NULL,
  paid_at               TIMESTAMPTZ,
  -- Ghi chú
  note                  TEXT,
  created_by            UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- 1 phòng / 1 tháng / 1 năm = 1 hóa đơn
  CONSTRAINT invoices_unique_room_month UNIQUE (room_id, month, year)
);
ALTER TABLE invoices DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_invoices_room       ON invoices(room_id);
CREATE INDEX IF NOT EXISTS idx_invoices_month      ON invoices(year, month);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON invoices(due_date) WHERE status <> 'paid';

-- ─── 4. Bảng `payment_proofs` ───────────────────────────────
-- Tenant báo đã thanh toán + admin duyệt (UC-10, UC-11)
CREATE TABLE IF NOT EXISTS payment_proofs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id        UUID NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  tenant_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount_reported   INTEGER NOT NULL CHECK (amount_reported > 0),
  -- Mảng URL: ["https://.../proof1.jpg", "https://.../proof2.jpg"]
  proof_images      JSONB NOT NULL DEFAULT '[]'::jsonb,
  note              TEXT,
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected', 'partially_approved')),
  -- Thông tin duyệt
  reviewed_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at       TIMESTAMPTZ,
  amount_approved   INTEGER CHECK (amount_approved IS NULL OR amount_approved >= 0),
  rejection_note    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE payment_proofs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_proofs_invoice      ON payment_proofs(invoice_id);
CREATE INDEX IF NOT EXISTS idx_proofs_tenant       ON payment_proofs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_proofs_status       ON payment_proofs(status);
CREATE INDEX IF NOT EXISTS idx_proofs_pending      ON payment_proofs(created_at) WHERE status = 'pending';

-- ─── 5. Bảng `expenses` ─────────────────────────────────────
-- Chi phí của chủ trọ (sửa chữa, bảo trì...) — KHÔNG tính vào hóa đơn khách
CREATE TABLE IF NOT EXISTS expenses (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- NULL = chi phí toàn nhà (vd: bảo trì sân chung)
  room_id         UUID REFERENCES rooms(id) ON DELETE SET NULL,
  expense_type    TEXT NOT NULL
                    CHECK (expense_type IN ('repair', 'maintenance', 'purchase', 'general', 'other')),
  amount          INTEGER NOT NULL CHECK (amount > 0),
  description     TEXT NOT NULL,
  expense_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_images  JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_expenses_room       ON expenses(room_id);
CREATE INDEX IF NOT EXISTS idx_expenses_type       ON expenses(expense_type);
CREATE INDEX IF NOT EXISTS idx_expenses_date       ON expenses(expense_date);

-- ─── 6. Bảng `meter_reading_logs` (audit khi sửa chỉ số) ────
CREATE TABLE IF NOT EXISTS meter_reading_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  electricity_log_id   UUID NOT NULL REFERENCES electricity_logs(id) ON DELETE CASCADE,
  field_changed        TEXT NOT NULL
                         CHECK (field_changed IN ('prev_kwh', 'curr_kwh', 'prev_water_m3', 'curr_water_m3')),
  old_value            INTEGER,
  new_value            INTEGER,
  reason               TEXT,
  changed_by           UUID REFERENCES users(id) ON DELETE SET NULL,
  changed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE meter_reading_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_meter_logs_elec     ON meter_reading_logs(electricity_log_id);

-- ─── 7. Trigger: auto-update invoices.status khi paid_amount đổi ─
-- Logic: paid_amount = 0 → 'unpaid' / < total → 'partially_paid' / >= total → 'paid'
CREATE OR REPLACE FUNCTION update_invoice_status_from_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.paid_amount <= 0 THEN
    NEW.status = 'unpaid';
    NEW.paid_at = NULL;
  ELSIF NEW.paid_amount >= NEW.total THEN
    NEW.status = 'paid';
    -- Chỉ set paid_at lần đầu chuyển sang paid
    IF OLD IS NULL OR OLD.status <> 'paid' THEN
      NEW.paid_at = NOW();
    END IF;
  ELSE
    NEW.status = 'partially_paid';
    NEW.paid_at = NULL;
  END IF;
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_invoices_status ON invoices;
CREATE TRIGGER trg_invoices_status
  BEFORE INSERT OR UPDATE OF paid_amount, total ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status_from_paid();

-- ─── 8. Trigger: auto-update electricity_logs.updated_at ────
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_elec_logs_touch ON electricity_logs;
CREATE TRIGGER trg_elec_logs_touch
  BEFORE UPDATE ON electricity_logs
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();

-- ─── 9. INSERT 13 settings keys mới cho module Thu chi ──────
INSERT INTO app_settings (key, value, description) VALUES
  ('meter_reading_day',         '1',          'Ngày trong tháng chốt chỉ số điện nước'),
  ('electricity_rate_default',  '4000',       'Đơn giá điện mặc định VND/kWh'),
  ('water_billing_mode',        '"per_m3"',   'Mode tính tiền nước: per_m3 / per_person / fixed'),
  ('water_rate_per_m3',         '15000',      'Đơn giá nước theo m³ (nếu mode = per_m3)'),
  ('water_rate_per_person',     '50000',      'Đơn giá nước theo đầu người (nếu mode = per_person)'),
  ('water_rate_fixed',          '100000',     'Đơn giá nước cố định / phòng / tháng (nếu mode = fixed)'),
  ('trash_fee_enabled',         'false',      'Bật phí rác'),
  ('trash_fee_amount',          '20000',      'Phí rác / phòng / tháng'),
  ('parking_fee_enabled',       'false',      'Bật phí gửi xe'),
  ('parking_fee_per_vehicle',   '100000',     'Phí gửi xe / xe / tháng'),
  ('internet_fee_enabled',      'false',      'Bật phí internet/wifi'),
  ('internet_fee_amount',       '50000',      'Phí internet / phòng / tháng'),
  ('over_capacity_fee_enabled', 'false',      'Bật phụ phí quá người'),
  ('over_capacity_threshold',   '3',          'Ngưỡng số người, lớn hơn sẽ tính thêm'),
  ('over_capacity_fee_amount',  '200000',     'Phụ phí khi quá ngưỡng người ở')
ON CONFLICT (key) DO NOTHING;

-- ─── 10. Refresh PostgREST schema cache ─────────────────────
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- HẾT MIGRATION v12
-- Sau khi chạy xong:
--   1. Kiểm tra Table Editor: 5 bảng mới + cột rooms.electricity_rate
--   2. Tạo 2 buckets qua Dashboard: payment-proofs, expense-receipts
--   3. Verify trigger: UPDATE invoices SET paid_amount = total WHERE id = '...'
--      → status tự đổi thành 'paid'
-- ============================================================
