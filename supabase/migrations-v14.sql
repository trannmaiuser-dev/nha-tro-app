-- ============================================================
-- Migration v14: Tạo bảng `room_tenants` (T-016 Phase A)
-- Mục đích: hỗ trợ nhiều khách thuê / 1 phòng (UC-02)
-- Ngày: 2026-05-16
--
-- LƯU Ý:
--   • RLS DISABLE — match project pattern (service_role từ server)
--   • Phase A chỉ tạo bảng + index; chưa drop rooms.tenant_id
--   • v15 sẽ migrate data từ rooms.tenant_id sang
-- ============================================================

BEGIN;

-- ─── 1. Bảng `room_tenants` (many-to-many room ↔ user) ──────
CREATE TABLE IF NOT EXISTS room_tenants (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id     UUID NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at     TIMESTAMPTZ,            -- NULL = đang ở; có giá trị = đã rời
  is_primary  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  room_tenants            IS 'Quan hệ nhiều-nhiều giữa rooms và users — hỗ trợ nhiều khách / phòng (UC-02)';
COMMENT ON COLUMN room_tenants.left_at    IS 'NULL = đang ở; có giá trị = đã rời (giữ row làm lịch sử, không xóa)';
COMMENT ON COLUMN room_tenants.is_primary IS 'TRUE = người đứng tên hợp đồng / nhận lại cọc khi cả phòng trả';

-- ─── 2. Index ────────────────────────────────────────────────
-- Unique: 1 user chỉ có 1 active membership / phòng (cho phép re-join sau khi left)
CREATE UNIQUE INDEX IF NOT EXISTS idx_room_tenants_active_unique
  ON room_tenants(room_id, user_id)
  WHERE left_at IS NULL;

-- Query thường dùng: lấy tenants theo phòng
CREATE INDEX IF NOT EXISTS idx_room_tenants_room       ON room_tenants(room_id);
-- Query thường dùng: lấy rooms theo user (tenant tra phòng mình ở)
CREATE INDEX IF NOT EXISTS idx_room_tenants_user       ON room_tenants(user_id);
-- Query thường dùng: chỉ lấy active rows (numPeople, list tenants UI)
CREATE INDEX IF NOT EXISTS idx_room_tenants_active     ON room_tenants(room_id, left_at) WHERE left_at IS NULL;

-- ─── 3. RLS: DISABLE (project convention — service_role từ server) ─
ALTER TABLE room_tenants DISABLE ROW LEVEL SECURITY;

-- ─── 4. Refresh PostgREST schema cache ──────────────────────
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- ROLLBACK — chạy đoạn này nếu cần undo migration v14
-- (BƯỚC LÙI: ngắt FK, drop bảng — KHÔNG ảnh hưởng rooms.tenant_id)
-- ============================================================
-- BEGIN;
--   DROP INDEX IF EXISTS idx_room_tenants_active;
--   DROP INDEX IF EXISTS idx_room_tenants_user;
--   DROP INDEX IF EXISTS idx_room_tenants_room;
--   DROP INDEX IF EXISTS idx_room_tenants_active_unique;
--   DROP TABLE IF EXISTS room_tenants;
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
