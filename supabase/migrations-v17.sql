-- ============================================================
-- Migration v17: Bảng `audit_logs` cho persistent audit trail (T-029)
-- Ngày: 2026-05-18
--
-- Bối cảnh: T-024 audit Bonus #3 — /api/dev/impersonate chỉ console.log (volatile).
-- Nếu DEV_IMPERSONATE_TOKEN leak, không có evidence sau khi server restart.
-- Migration này thêm bảng generic audit_logs reusable cho mọi event type tương lai.
--
-- Schema pattern: clone từ meter_reading_logs (migrations-v12.sql:138-151).
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS audit_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      TEXT NOT NULL,
  -- actor = ai gây event. NULL cho unauthenticated event (vd dev impersonate, system cron)
  actor_user_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  -- target = ai bị tác động. NULL cho event không có target cụ thể.
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

-- ============================================================
-- Verify after apply:
--
-- SELECT to_regclass('public.audit_logs') AS table_exists;
-- → 1 row 'audit_logs'
--
-- \d audit_logs   (hoặc query qua information_schema)
-- → 7 columns: id, event_type, actor_user_id, target_user_id, ip, metadata, created_at
--
-- Test insert (DRY-RUN):
-- BEGIN;
-- INSERT INTO audit_logs (event_type, target_user_id, ip, metadata)
-- VALUES (
--   'dev_impersonate',
--   (SELECT id FROM users LIMIT 1),
--   '127.0.0.1',
--   '{"role": "tenant", "force_complete": false}'::jsonb
-- );
-- SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 1;
-- ROLLBACK;
-- ============================================================
