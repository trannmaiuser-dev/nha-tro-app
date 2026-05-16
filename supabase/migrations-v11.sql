-- ============================================================
-- Migration v11: Mở rộng schema module Khách thuê (T-006)
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

-- ─── Thêm cột vào bảng users ────────────────────────────────
-- tenant_status: trạng thái khách thuê (UC-03, UC-07)
-- has_debt: đang nợ quá hạn (UC-05)
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS tenant_status TEXT NOT NULL DEFAULT 'active'
    CHECK (tenant_status IN ('invited', 'active', 'pending_move', 'moved_out', 'archived')),
  ADD COLUMN IF NOT EXISTS has_debt BOOLEAN NOT NULL DEFAULT FALSE;

-- ─── Tài khoản ngân hàng khách thuê ─────────────────────────
CREATE TABLE IF NOT EXISTS tenant_bank_accounts (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_holder TEXT NOT NULL,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bank_accounts_user ON tenant_bank_accounts(user_id);
ALTER TABLE tenant_bank_accounts DISABLE ROW LEVEL SECURITY;

-- ─── Yêu cầu chuyển đi (UC-03) ──────────────────────────────
CREATE TABLE IF NOT EXISTS move_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id        UUID NOT NULL REFERENCES rooms(id),
  requested_date DATE NOT NULL,
  reason         TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by    UUID REFERENCES users(id),
  reviewed_at    TIMESTAMPTZ,
  rejection_note TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_move_requests_user   ON move_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_move_requests_status ON move_requests(status);
ALTER TABLE move_requests DISABLE ROW LEVEL SECURITY;

-- ─── Khách đến chơi (UC-04) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS guests (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  room_id          UUID NOT NULL REFERENCES rooms(id),
  guest_name       TEXT NOT NULL,
  number_of_nights INTEGER NOT NULL CHECK (number_of_nights BETWEEN 1 AND 7),
  note             TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_guests_tenant ON guests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_guests_room   ON guests(room_id, created_at);
ALTER TABLE guests DISABLE ROW LEVEL SECURITY;

-- ─── Cài đặt ứng dụng (UC-05/06 cấu hình) ──────────────────
CREATE TABLE IF NOT EXISTS app_settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT
);
ALTER TABLE app_settings DISABLE ROW LEVEL SECURITY;

-- Giá trị mặc định
INSERT INTO app_settings (key, value, description) VALUES
  ('payment_due_day',          '5',  'Ngày trong tháng phải đóng tiền'),
  ('overdue_warning_days',     '7',  'Số ngày quá hạn trước khi cảnh báo'),
  ('overdue_remind_interval',  '5',  'Số ngày lặp lại nhắc nhở'),
  ('data_retention_years',     '2',  'Số năm giữ dữ liệu sau khi khách chuyển đi'),
  ('default_password_pattern', '"last_6_id_card"', 'Pattern tạo mật khẩu tạm')
ON CONFLICT (key) DO NOTHING;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
