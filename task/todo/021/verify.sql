-- ============================================================
-- T-021 Phase E auto — verify queries (run sau E-execute)
-- ============================================================
-- Mỗi query trả `scenario` column để Claude in Chrome group output.
-- Compare với expected ở Phase E section trong todo.021.
-- ============================================================

-- ============================================
-- E1 verify: tenant complete dù 3 optional NULL
-- Expected sau khi click "Hoàn thành đăng ký":
--   • users.is_profile_complete = true
--   • users.tenant_status        = 'active'
--   • cccd_front/cccd_back/contract document count = 0 (vẫn thiếu 3 optional)
-- ============================================
SELECT
  'E1'                                                  AS scenario,
  u.phone,
  u.full_name,
  u.is_profile_complete,
  u.tenant_status,
  tp.profile_status,
  (
    SELECT COUNT(*) FROM tenant_documents td
     WHERE td.tenant_id = tp.id AND td.type = 'cccd_front'
  ) AS cccd_front_count,
  (
    SELECT COUNT(*) FROM tenant_documents td
     WHERE td.tenant_id = tp.id AND td.type = 'cccd_back'
  ) AS cccd_back_count,
  (
    SELECT COUNT(*) FROM tenant_documents td
     WHERE td.tenant_id = tp.id AND td.type = 'contract'
  ) AS contract_count
FROM users u
LEFT JOIN tenant_profiles tp ON tp.user_id = u.id
WHERE u.phone = '0911999001';

-- Expected E1 (sau khi click "Hoàn thành đăng ký"):
-- | scenario | phone      | full_name              | is_profile_complete | tenant_status | profile_status | cccd_front_count | cccd_back_count | contract_count |
-- |----------|------------|------------------------|---------------------|---------------|----------------|------------------|-----------------|----------------|
-- | E1       | 0911999001 | Test T021 E1 Optional  | true                | active        | confirmed      | 0                | 0               | 0              |

-- ============================================
-- E2 verify: move-request approved + rooms.status đồng bộ
-- Expected sau khi admin click "Duyệt":
--   • move_requests.status   = 'approved'
--   • move_requests.reviewed_by KHÔNG NULL
--   • room_tenants.left_at   ≠ NULL (đã rời)
--   • rooms.status           = 'vacant' (vì là tenant duy nhất)
--   • rooms.tenant_id        = NULL
-- ============================================
SELECT
  'E2'                                                  AS scenario,
  mr.id                                                 AS move_req_id,
  mr.status                                             AS req_status,
  mr.reviewed_by IS NOT NULL                            AS has_reviewer,
  mr.reviewed_at IS NOT NULL                            AS has_reviewed_at,
  r.name                                                AS room_name,
  r.status                                              AS room_status,
  r.tenant_id IS NULL                                   AS room_tenant_id_null,
  rt.left_at IS NOT NULL                                AS membership_left
FROM move_requests mr
JOIN rooms r        ON r.id = mr.room_id
LEFT JOIN room_tenants rt ON rt.user_id = mr.user_id AND rt.room_id = mr.room_id
WHERE mr.id = '00000000-0000-0000-0000-000000777002';

-- Expected E2:
-- | scenario | move_req_id              | req_status | has_reviewer | has_reviewed_at | room_name | room_status | room_tenant_id_null | membership_left |
-- |----------|--------------------------|------------|--------------|-----------------|-----------|-------------|---------------------|-----------------|
-- | E2       | 00000000-...-777002      | approved   | true         | true            | P102      | vacant      | true                | true            |

-- ============================================
-- E3 verify: primary chuyển đi → second auto-promote
-- Expected sau khi admin duyệt move_req của primary:
--   • Primary (0911999003): room_tenants.left_at ≠ NULL
--   • Second  (0911999004): is_primary = true, left_at = NULL
--   • rooms.status = 'occupied' (vì còn 1 active tenant)
--   • rooms.tenant_id = secondary user_id (dual-write sync sang primary mới)
-- ============================================
SELECT
  'E3'                                              AS scenario,
  u.phone,
  u.full_name,
  rt.is_primary,
  rt.left_at IS NULL                                AS is_active,
  rt.joined_at
FROM room_tenants rt
JOIN users u ON u.id = rt.user_id
WHERE u.phone IN ('0911999003', '0911999004')
ORDER BY rt.joined_at;

-- Expected E3 (2 rows — primary rời, second được promote):
-- | scenario | phone      | full_name             | is_primary | is_active | joined_at        |
-- |----------|------------|-----------------------|------------|-----------|------------------|
-- | E3       | 0911999003 | Test T021 E3 Primary  | false      | false     | ~60 days ago     |
-- | E3       | 0911999004 | Test T021 E3 Second   | true       | true      | ~15 days ago     |

-- Sync check rooms (E3):
SELECT
  'E3-room'                                         AS scenario,
  r.name,
  r.status,
  r.tenant_id,
  (SELECT phone FROM users WHERE id = r.tenant_id)  AS tenant_id_phone
FROM rooms r
WHERE r.id IN (
  SELECT room_id FROM room_tenants
  WHERE user_id IN (
    '00000000-0000-0000-0000-000000999003'::uuid,
    '00000000-0000-0000-0000-000000999004'::uuid
  )
)
LIMIT 1;

-- Expected E3-room:
-- | scenario | name | status   | tenant_id           | tenant_id_phone |
-- |----------|------|----------|---------------------|------------------|
-- | E3-room  | P101 | occupied | <uuid of 999004>    | 0911999004       |
