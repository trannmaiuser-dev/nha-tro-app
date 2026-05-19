-- ============================================================
-- Migration v25: T-047 owner manage tenant account
--
-- Add users.locked_at + users.locked_reason để hỗ trợ owner disable
-- account tenant. Login check sẽ reject khi locked_at IS NOT NULL.
--
-- Khác với tenant_status='archived' (delete soft = hết hợp đồng,
-- không show trong UI khách thuê hoạt động). Disable = tạm khóa (vd:
-- nợ quá lâu, vi phạm) → có thể reactivate.
--
-- Pre-condition: T-046 done (owner đã có flow edit tenant).
-- ============================================================

[SQL-V25-START]
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_locked_at ON users(locked_at)
  WHERE locked_at IS NOT NULL;
[SQL-V25-END]
