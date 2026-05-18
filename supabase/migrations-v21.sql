-- ============================================================
-- Migration v21: Module 3 Giấy tờ — schema documents + document_categories (T-033)
-- Ngày: 2026-05-18
--
-- Khác biệt với `tenant_documents`:
--   - tenant_documents: per-tenant profile docs (CCCD front/back, contract per khách)
--                       FK → tenant_profiles.id
--   - documents (mới): room-level + building-wide docs (hợp đồng thuê phòng,
--                      biên bản, sổ đỏ, giấy phép...). FK → rooms.id (nullable
--                      cho building-wide).
--
-- Storage bucket: reuse "documents" bucket đã có (private, signed URL pattern
-- từ /api/upload/document). Path convention mới: `room/<roomId>/<ts>.<ext>` hoặc
-- `general/<ts>.<ext>` cho building-wide.
-- ============================================================

BEGIN;

-- ─── 1. Bảng document_categories ─
CREATE TABLE IF NOT EXISTS document_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  system_default  BOOLEAN NOT NULL DEFAULT FALSE,  -- system categories không cho xóa
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE document_categories DISABLE ROW LEVEL SECURITY;

-- ─── 2. Seed 5 default categories ─
INSERT INTO document_categories (name, description, system_default) VALUES
  ('Hợp đồng thuê',     'Hợp đồng thuê phòng giữa chủ và khách',     TRUE),
  ('Biên bản bàn giao', 'Biên bản kiểm tra/bàn giao phòng',           TRUE),
  ('CCCD bản sao',      'Bản sao giấy tờ tùy thân khách thuê',        TRUE),
  ('Sổ đỏ / Giấy phép', 'Giấy tờ pháp lý nhà trọ',                    TRUE),
  ('Khác',              'Các giấy tờ khác chưa phân loại',            TRUE)
ON CONFLICT (name) DO NOTHING;

-- ─── 3. Bảng documents ─
CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  -- room_id NULL = building-wide doc (sổ đỏ, giấy phép). NOT NULL = doc của phòng cụ thể.
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  -- tenant_id NULL = doc không gắn với 1 khách. NOT NULL = doc gắn khách (vd CCCD).
  tenant_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,        -- storage path: room/<id>/<ts>.<ext> hoặc general/<ts>.<ext>
  file_type    TEXT,                  -- 'pdf', 'jpg', 'png', ...
  file_size    INTEGER,               -- bytes
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ            -- soft delete cho audit + recovery
);
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

-- ─── 4. Indexes ─
CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_room     ON documents(room_id, uploaded_at DESC) WHERE deleted_at IS NULL AND room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_by_tenant   ON documents(tenant_id, uploaded_at DESC) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_active   ON documents(uploaded_at DESC) WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Verify after apply:
--
-- 1) Tables exist:
-- SELECT to_regclass('public.document_categories'), to_regclass('public.documents');
-- → 2 rows non-NULL
--
-- 2) Default categories seeded:
-- SELECT name, system_default FROM document_categories ORDER BY name;
-- → 5 rows, all system_default=true
--
-- 3) Indexes:
-- SELECT indexname FROM pg_indexes WHERE tablename='documents' ORDER BY indexname;
-- → 4 idx_documents_* + documents_pkey = 5 rows
--
-- 4) Storage bucket check (Supabase Studio → Storage tab):
-- → Bucket "documents" phải exist (đã có từ trước per /api/upload/document).
--    Nếu KHÔNG có → tạo manual: Settings → Storage → New bucket "documents", private.
--
-- ROLLBACK:
-- BEGIN;
-- DROP TABLE IF EXISTS documents;
-- DROP TABLE IF EXISTS document_categories;
-- COMMIT;
-- ============================================================
