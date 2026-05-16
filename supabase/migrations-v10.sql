-- ============================================================
-- Migration v10: Thêm cột deposit và note vào bảng rooms
-- Chạy file này trong Supabase SQL Editor
-- ============================================================

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS deposit INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS note    TEXT;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
