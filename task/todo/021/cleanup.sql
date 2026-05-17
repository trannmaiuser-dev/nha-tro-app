-- ============================================================
-- T-021 Phase E auto — cleanup test data
-- ============================================================
-- Chạy KHI:
--   1. Trước khi seed lại (nếu data sót từ test trước)
--   2. Sau Phase E xong (giữ DB sạch cho task kế)
--
-- An toàn: scope hẹp theo phone prefix '0911999%' + UUID test pattern.
-- KHÔNG bao giờ TRUNCATE hay DELETE không có WHERE.
-- ============================================================

BEGIN;

-- 1. Xóa move_requests theo UUID test (avoid affect production move_requests)
DELETE FROM move_requests
WHERE id IN (
  '00000000-0000-0000-0000-000000777002'::uuid,
  '00000000-0000-0000-0000-000000777003'::uuid
);

-- 2. Xóa room_tenants của test users
--    (FK rooms ON DELETE CASCADE nên không cần xóa rooms; ON DELETE CASCADE
--     từ users cũng sẽ tự xóa khi step 6 xóa users, nhưng explicit cho rõ)
DELETE FROM room_tenants
WHERE user_id IN (
  SELECT id FROM users WHERE phone LIKE '0911999%'
);

-- 3. Reset rooms.tenant_id + status cho phòng test đã từng được seed
--    (sync về vacant nếu không còn active tenant nào sau khi xóa step 2)
UPDATE rooms r
SET tenant_id = NULL,
    status    = 'vacant'
WHERE r.tenant_id IN (
  SELECT id FROM users WHERE phone LIKE '0911999%'
)
OR (
  r.id IN (
    -- Phòng có thể đã được seed nhưng không còn active membership nào
    SELECT DISTINCT room_id FROM room_tenants WHERE 1=0  -- placeholder, branch còn lại đảm bảo tenant_id sync
  )
);

-- 4. Xóa emergency_contacts của test profiles
--    (cascade từ tenant_profiles → users, nhưng explicit)
DELETE FROM emergency_contacts
WHERE tenant_id IN (
  SELECT tp.id FROM tenant_profiles tp
   JOIN users u ON u.id = tp.user_id
   WHERE u.phone LIKE '0911999%'
);

-- 5. Xóa tenant_documents (nếu có) của test profiles
DELETE FROM tenant_documents
WHERE tenant_id IN (
  SELECT tp.id FROM tenant_profiles tp
   JOIN users u ON u.id = tp.user_id
   WHERE u.phone LIKE '0911999%'
);

-- 6. Xóa tenant_bank_accounts của test users
DELETE FROM tenant_bank_accounts
WHERE user_id IN (
  SELECT id FROM users WHERE phone LIKE '0911999%'
);

-- 7. Xóa tenant_profiles của test users
DELETE FROM tenant_profiles
WHERE user_id IN (
  SELECT id FROM users WHERE phone LIKE '0911999%'
);

-- 8. Cuối cùng xóa users test
DELETE FROM users WHERE phone LIKE '0911999%';

COMMIT;

-- ============================================================
-- Sanity check sau cleanup:
--
-- SELECT COUNT(*) FROM users WHERE phone LIKE '0911999%';       -- → 0
-- SELECT COUNT(*) FROM move_requests
--   WHERE id IN ('00000000-0000-0000-0000-000000777002'::uuid,
--                '00000000-0000-0000-0000-000000777003'::uuid); -- → 0
-- SELECT COUNT(*) FROM room_tenants rt
--   JOIN users u ON u.id = rt.user_id
--  WHERE u.phone LIKE '0911999%';                                -- → 0
-- ============================================================
