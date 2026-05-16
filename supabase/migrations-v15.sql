-- ============================================================
-- Migration v15: Migrate dữ liệu rooms.tenant_id → room_tenants (T-016 Phase A)
-- Ngày: 2026-05-16
--
-- LƯU Ý:
--   • KHÔNG DROP cột rooms.tenant_id (để rollback an toàn)
--   • Wrap trong transaction; verification block ở cuối raise nếu lệch
--   • is_primary = TRUE cho tất cả rows migrate (mỗi phòng cũ chỉ 1 tenant)
--   • joined_at = rooms.created_at (project chưa có cột rented_at)
-- ============================================================

BEGIN;

-- ─── 1. Insert rows migrate ─────────────────────────────────
INSERT INTO room_tenants (room_id, user_id, joined_at, is_primary)
SELECT
  r.id          AS room_id,
  r.tenant_id   AS user_id,
  r.created_at  AS joined_at,
  TRUE          AS is_primary
FROM rooms r
WHERE r.tenant_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM room_tenants rt
    WHERE rt.room_id = r.id
      AND rt.user_id = r.tenant_id
      AND rt.left_at IS NULL
  );

-- ─── 2. Verification — fail transaction nếu count lệch ──────
DO $$
DECLARE
  expected_count INT;
  actual_count   INT;
BEGIN
  SELECT COUNT(*) INTO expected_count
    FROM rooms
   WHERE tenant_id IS NOT NULL;

  SELECT COUNT(*) INTO actual_count
    FROM room_tenants
   WHERE is_primary = TRUE
     AND left_at IS NULL;

  IF actual_count < expected_count THEN
    RAISE EXCEPTION
      'Migration v15 mismatch: rooms.tenant_id count = %, room_tenants(primary, active) count = %',
      expected_count, actual_count;
  END IF;

  RAISE NOTICE 'Migration v15 OK — % primary tenants migrated', actual_count;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- ROLLBACK — chỉ delete rows migrate, KHÔNG drop cột rooms.tenant_id
-- ============================================================
-- BEGIN;
--   DELETE FROM room_tenants
--    WHERE is_primary = TRUE
--      AND left_at IS NULL
--      AND EXISTS (
--        SELECT 1 FROM rooms r
--         WHERE r.id = room_tenants.room_id
--           AND r.tenant_id = room_tenants.user_id
--      );
--   NOTIFY pgrst, 'reload schema';
-- COMMIT;
