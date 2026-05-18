Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ)
- Task: T-033 — Module 3 Giấy tờ Phase 1 (admin CRUD documents)
- File migration: supabase/migrations-v21.sql
- Changes: 2 tables (document_categories + documents) + 5 default categories + 4 indexes

== VIỆC BẠN CẦN LÀM ==

--- BƯỚC 1: Kiểm tra Storage bucket "documents" ---

Mở Supabase Dashboard → Storage tab. Verify bucket tên "documents" có tồn tại.

Nếu KHÔNG có → tạo manual:
1. Click "New bucket"
2. Name: documents
3. Public: NO (private bucket, signed URL pattern)
4. Click "Create"

Báo cho tôi: bucket existed / created new.

--- BƯỚC 2: Apply migration ---

SQL Editor → New query → Paste [SQL-MIGRATION] → Run.

[SQL-MIGRATION-START]
BEGIN;

CREATE TABLE IF NOT EXISTS document_categories (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL UNIQUE,
  description     TEXT,
  system_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE document_categories DISABLE ROW LEVEL SECURITY;

INSERT INTO document_categories (name, description, system_default) VALUES
  ('Hợp đồng thuê',     'Hợp đồng thuê phòng giữa chủ và khách',     TRUE),
  ('Biên bản bàn giao', 'Biên bản kiểm tra/bàn giao phòng',           TRUE),
  ('CCCD bản sao',      'Bản sao giấy tờ tùy thân khách thuê',        TRUE),
  ('Sổ đỏ / Giấy phép', 'Giấy tờ pháp lý nhà trọ',                    TRUE),
  ('Khác',              'Các giấy tờ khác chưa phân loại',            TRUE)
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id  UUID REFERENCES document_categories(id) ON DELETE SET NULL,
  room_id      UUID REFERENCES rooms(id) ON DELETE CASCADE,
  tenant_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  file_size    INTEGER,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ
);
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id, uploaded_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_room     ON documents(room_id, uploaded_at DESC) WHERE deleted_at IS NULL AND room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_tenant   ON documents(tenant_id, uploaded_at DESC) WHERE deleted_at IS NULL AND tenant_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_documents_active   ON documents(uploaded_at DESC) WHERE deleted_at IS NULL;

NOTIFY pgrst, 'reload schema';

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 3: Verify tables ---

[SQL-VERIFY-TABLES-START]
SELECT to_regclass('public.document_categories') AS cat_table,
       to_regclass('public.documents')           AS docs_table;
[SQL-VERIFY-TABLES-END]

Pass: 2 cột không NULL ('document_categories' + 'documents').

--- BƯỚC 4: Verify categories seeded ---

[SQL-VERIFY-CATEGORIES-START]
SELECT name, system_default FROM document_categories ORDER BY name;
[SQL-VERIFY-CATEGORIES-END]

Pass: 5 rows. Tất cả system_default=true.

--- BƯỚC 5: Verify indexes ---

[SQL-VERIFY-INDEXES-START]
SELECT indexname FROM pg_indexes
WHERE tablename='documents'
ORDER BY indexname;
[SQL-VERIFY-INDEXES-END]

Pass: 5 rows (4 idx_documents_* + documents_pkey).

--- BƯỚC 6: Smoke test insert + soft delete (DRY-RUN) ---

[SQL-SMOKE-START]
BEGIN;

INSERT INTO documents (category_id, name, file_url, file_type, uploaded_by)
SELECT
  (SELECT id FROM document_categories WHERE name='Khác'),
  'Smoke test T-033',
  'general/smoke-test.pdf',
  'pdf',
  (SELECT id FROM users WHERE role='owner' LIMIT 1)
RETURNING id, name, deleted_at;

-- Soft delete
UPDATE documents SET deleted_at = NOW() WHERE name='Smoke test T-033'
RETURNING id, name, deleted_at;

-- Verify excluded from active query
SELECT COUNT(*) AS active_count FROM documents WHERE deleted_at IS NULL;

ROLLBACK;
[SQL-SMOKE-END]

Pass criteria:
- INSERT trả 1 row với deleted_at=NULL
- UPDATE trả 1 row với deleted_at = timestamp
- active_count count rows hợp lý
- ROLLBACK preserve state

== BÁO CÁO LẠI CHO TÔI ==

Format:
- Buoc 1 bucket: existed / created new
- Buoc 2 apply: OK / FAIL <msg>
- Buoc 3 tables: 2 OK / FAIL
- Buoc 4 categories: 5 rows / FAIL
- Buoc 5 indexes: 5 rows / FAIL
- Buoc 6 smoke: pass / FAIL <reason>

Neu FAIL → STOP, paste error.
