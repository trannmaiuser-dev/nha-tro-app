Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ, Supabase Singapore)
- Task: T-029 — thêm bảng audit_logs cho persistent audit trail
- File migration: supabase/migrations-v17.sql
- 1 bảng sẽ tạo: audit_logs (generic event log với JSONB metadata)

== VIỆC BẠN CẦN LÀM ==

--- BƯỚC 1: Apply migration ---
1. Mở Supabase Dashboard → chọn project nha-tro-app
2. Sidebar trái → "SQL Editor"
3. Click "New query"
4. Paste TOÀN BỘ SQL trong khối [SQL-MIGRATION] bên dưới
5. Click "Run" (hoặc Ctrl+Enter)
6. Xác nhận thấy success message (không error)

[SQL-MIGRATION-START]
BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  target_user_id  UUID REFERENCES users(id) ON DELETE SET NULL,
  ip              TEXT,
  metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE audit_logs DISABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS idx_audit_logs_created    ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_event_type ON audit_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target     ON audit_logs(target_user_id, created_at DESC);

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 2: Verify table tồn tại ---
Tạo query mới, chạy:

[SQL-VERIFY-TABLE-START]
SELECT to_regclass('public.audit_logs') AS table_exists;
[SQL-VERIFY-TABLE-END]

Pass: 1 row trả 'audit_logs' (không NULL).

--- BƯỚC 3: Verify 4 index ---

[SQL-VERIFY-INDEX-START]
SELECT indexname FROM pg_indexes
WHERE tablename = 'audit_logs'
ORDER BY indexname;
[SQL-VERIFY-INDEX-END]

Pass: 4 rows
- audit_logs_pkey
- idx_audit_logs_created
- idx_audit_logs_event_type
- idx_audit_logs_target

--- BƯỚC 4: Test insert (DRY-RUN, rollback) ---

[SQL-TEST-INSERT-START]
BEGIN;
INSERT INTO audit_logs (event_type, target_user_id, ip, metadata)
VALUES (
  'dev_impersonate',
  (SELECT id FROM users LIMIT 1),
  '127.0.0.1',
  '{"role": "tenant", "force_complete": false, "test": true}'::jsonb
);

SELECT id, event_type, target_user_id, ip, metadata, created_at
FROM audit_logs
WHERE metadata->>'test' = 'true'
ORDER BY created_at DESC LIMIT 1;

ROLLBACK;
[SQL-TEST-INSERT-END]

Pass: SELECT trả 1 row với event_type='dev_impersonate', metadata JSONB chứa "test":true. ROLLBACK preserve state (0 rows sau rollback).

== BÁO CÁO LẠI CHO TÔI ==

Format ngắn gọn, 1 dòng mỗi test:
- Buoc 1 apply: OK / ERROR <message>
- Buoc 2 verify table: thay 'audit_logs' / NULL
- Buoc 3 verify index: 4 rows / <count> rows
- Buoc 4 test insert: pass / FAIL <reason>

Neu bat ky buoc FAIL → STOP, paste error day du, DUNG retry.
