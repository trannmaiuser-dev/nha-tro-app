-- ============================================================
-- T-021 Phase E auto — seed data cho 3 scenarios (E1/E2/E3)
-- ============================================================
-- Idempotent: chạy nhiều lần OK, không tạo duplicate.
-- Chạy lệnh `cleanup.sql` trước nếu data sót từ test trước.
--
-- Placeholders (replace lúc paste vào Supabase Studio):
--   {{ROOM_E2_UUID}}  -- 1 phòng vacant cho E2 (vd P101 hoặc P102)
--                        SELECT id FROM rooms WHERE name='P102' LIMIT 1;
--   {{ROOM_E3_UUID}}  -- 1 phòng vacant KHÁC E2 cho E3 (vd P101)
--                        SELECT id FROM rooms WHERE name='P101' LIMIT 1;
--
-- LƯU Ý SCHEMA THỰC TẾ (khác với assumption phổ biến):
--   • rooms.name (KHÔNG phải rooms.room_number) — vd 'P101', 'P201'
--   • users KHÔNG có cột `avatar_url` — avatar nằm ở tenant_profiles.avatar_url
--   • 3 file optional (cccd_front, cccd_back, contract) là rows trong
--     `tenant_documents` với cột `type` discriminator, KHÔNG phải column riêng
--     trong tenant_profiles.
--   • emergency_contacts.tenant_id → tenant_profiles.id (KHÔNG phải users.id)
--   • tenant_bank_accounts.user_id → users.id
--   • move_requests KHÔNG có cột `type` — chỉ requested_date + reason + status
-- ============================================================

BEGIN;

-- ============================================
-- E1 SETUP — Tenant có đủ 8 required, thiếu 3 optional (tenant_documents)
-- ============================================

-- User E1 (is_profile_complete=false, status='invited' — sẵn sàng để complete)
INSERT INTO users (id, phone, password_hash, role, full_name, is_profile_complete, tenant_status)
VALUES (
  '00000000-0000-0000-0000-000000999001'::uuid,
  '0911999001',
  '$2a$10$T021PhaseEAutoPlaceholderBcryptHashOfTest123456789012',
  'tenant',
  'Test T021 E1 Optional',
  false,
  'invited'
)
ON CONFLICT (phone) DO UPDATE SET
  full_name           = EXCLUDED.full_name,
  is_profile_complete = false,
  tenant_status       = 'invited';

-- Profile với 6 column required + avatar_url (đủ 7 trong số "8 required" — 8th là emergency, 9th là bank)
INSERT INTO tenant_profiles (
  user_id, full_name, dob, gender, cccd_number, address, occupation, avatar_url, profile_status
)
VALUES (
  '00000000-0000-0000-0000-000000999001'::uuid,
  'Test T021 E1 Optional',
  '1995-01-01'::date,
  'male',
  '012345678901',
  'Số 1, Đường Test E1, Quận 1, TPHCM',
  'Lập trình viên test',
  NULL,
  'draft'
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name      = EXCLUDED.full_name,
  dob            = EXCLUDED.dob,
  gender         = EXCLUDED.gender,
  cccd_number    = EXCLUDED.cccd_number,
  address        = EXCLUDED.address,
  occupation     = EXCLUDED.occupation,
  avatar_url     = EXCLUDED.avatar_url,
  profile_status = 'draft',
  updated_at     = NOW();

-- Emergency contact (1 row đủ pass required)
INSERT INTO emergency_contacts (
  tenant_id, relationship, full_name, phone, address
)
SELECT
  tp.id, 'Cha', 'Test T021 E1 Father', '0900999001', 'Quê quán E1'
FROM tenant_profiles tp
WHERE tp.user_id = '00000000-0000-0000-0000-000000999001'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM emergency_contacts ec WHERE ec.tenant_id = tp.id
  );

-- Bank account (1 row đủ pass required)
INSERT INTO tenant_bank_accounts (user_id, bank_name, account_number, account_holder)
SELECT
  '00000000-0000-0000-0000-000000999001'::uuid, 'Test Bank', '1234567890', 'Test T021 E1 Optional'
WHERE NOT EXISTS (
  SELECT 1 FROM tenant_bank_accounts WHERE user_id = '00000000-0000-0000-0000-000000999001'::uuid
);

-- TUYỆT ĐỐI KHÔNG INSERT tenant_documents cho E1 user
-- → 3 optional (cccd_front, cccd_back, contract) thiếu — đó là điểm test của E1.

-- ============================================
-- E2 SETUP — Move request pending cho 1 tenant
-- ============================================

INSERT INTO users (id, phone, password_hash, role, full_name, is_profile_complete, tenant_status)
VALUES (
  '00000000-0000-0000-0000-000000999002'::uuid,
  '0911999002',
  '$2a$10$T021PhaseEAutoPlaceholderBcryptHashOfTest123456789012',
  'tenant',
  'Test T021 E2 MoveReq',
  true,
  'active'
)
ON CONFLICT (phone) DO UPDATE SET
  full_name           = EXCLUDED.full_name,
  is_profile_complete = true,
  tenant_status       = 'active';

-- Profile complete cho E2 user (không phải điểm test, chỉ để consistent)
INSERT INTO tenant_profiles (
  user_id, full_name, dob, gender, cccd_number, address, occupation, avatar_url, profile_status
)
VALUES (
  '00000000-0000-0000-0000-000000999002'::uuid,
  'Test T021 E2 MoveReq', '1990-06-15'::date, 'female',
  '012345678902', 'Số 2, Đường Test E2', 'Test occupation E2',
  NULL, 'confirmed'
)
ON CONFLICT (user_id) DO UPDATE SET
  full_name      = EXCLUDED.full_name,
  profile_status = 'confirmed',
  updated_at     = NOW();

-- E2 user là primary của ROOM_E2 (dual-write rooms.tenant_id + room_tenants)
INSERT INTO room_tenants (id, room_id, user_id, joined_at, is_primary, left_at)
VALUES (
  '00000000-0000-0000-0000-000000888002'::uuid,
  '{{ROOM_E2_UUID}}'::uuid,
  '00000000-0000-0000-0000-000000999002'::uuid,
  NOW() - INTERVAL '30 days',
  true,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  left_at    = NULL,
  is_primary = true,
  joined_at  = EXCLUDED.joined_at;

-- Sync rooms.tenant_id + status (dual-write theo D10 từ T-016)
UPDATE rooms
SET tenant_id = '00000000-0000-0000-0000-000000999002'::uuid,
    status    = 'occupied'
WHERE id = '{{ROOM_E2_UUID}}'::uuid;

-- Move request pending cho E2 user
INSERT INTO move_requests (id, user_id, room_id, requested_date, reason, status)
VALUES (
  '00000000-0000-0000-0000-000000777002'::uuid,
  '00000000-0000-0000-0000-000000999002'::uuid,
  '{{ROOM_E2_UUID}}'::uuid,
  (CURRENT_DATE + INTERVAL '14 days')::date,
  'Test T021 E2 — chuyển đi để test cache invalidation',
  'pending'
)
ON CONFLICT (id) DO UPDATE SET
  status         = 'pending',
  requested_date = EXCLUDED.requested_date,
  reviewed_by    = NULL,
  reviewed_at    = NULL,
  rejection_note = NULL;

-- ============================================
-- E3 SETUP — Room có 2 tenant active, primary chuyển đi
-- ============================================

-- E3 Primary (joined sớm hơn)
INSERT INTO users (id, phone, password_hash, role, full_name, is_profile_complete, tenant_status)
VALUES (
  '00000000-0000-0000-0000-000000999003'::uuid,
  '0911999003',
  '$2a$10$T021PhaseEAutoPlaceholderBcryptHashOfTest123456789012',
  'tenant',
  'Test T021 E3 Primary',
  true,
  'active'
)
ON CONFLICT (phone) DO UPDATE SET
  full_name           = EXCLUDED.full_name,
  is_profile_complete = true,
  tenant_status       = 'active';

-- E3 Second (joined muộn hơn, ban đầu KHÔNG primary)
INSERT INTO users (id, phone, password_hash, role, full_name, is_profile_complete, tenant_status)
VALUES (
  '00000000-0000-0000-0000-000000999004'::uuid,
  '0911999004',
  '$2a$10$T021PhaseEAutoPlaceholderBcryptHashOfTest123456789012',
  'tenant',
  'Test T021 E3 Second',
  true,
  'active'
)
ON CONFLICT (phone) DO UPDATE SET
  full_name           = EXCLUDED.full_name,
  is_profile_complete = true,
  tenant_status       = 'active';

-- Profile 2 user (light — chỉ cần đủ để link)
INSERT INTO tenant_profiles (user_id, full_name, dob, gender, profile_status)
VALUES
  ('00000000-0000-0000-0000-000000999003'::uuid, 'Test T021 E3 Primary', '1992-03-10'::date, 'male',   'confirmed'),
  ('00000000-0000-0000-0000-000000999004'::uuid, 'Test T021 E3 Second',  '1993-07-20'::date, 'female', 'confirmed')
ON CONFLICT (user_id) DO UPDATE SET
  full_name      = EXCLUDED.full_name,
  profile_status = 'confirmed',
  updated_at     = NOW();

-- room_tenants: primary joined sớm, second joined muộn
INSERT INTO room_tenants (id, room_id, user_id, joined_at, is_primary, left_at)
VALUES
  ('00000000-0000-0000-0000-000000888003'::uuid, '{{ROOM_E3_UUID}}'::uuid,
   '00000000-0000-0000-0000-000000999003'::uuid, NOW() - INTERVAL '60 days', true,  NULL),
  ('00000000-0000-0000-0000-000000888004'::uuid, '{{ROOM_E3_UUID}}'::uuid,
   '00000000-0000-0000-0000-000000999004'::uuid, NOW() - INTERVAL '15 days', false, NULL)
ON CONFLICT (id) DO UPDATE SET
  joined_at  = EXCLUDED.joined_at,
  is_primary = EXCLUDED.is_primary,
  left_at    = NULL;

-- Sync rooms.tenant_id = primary, status = occupied
UPDATE rooms
SET tenant_id = '00000000-0000-0000-0000-000000999003'::uuid,
    status    = 'occupied'
WHERE id = '{{ROOM_E3_UUID}}'::uuid;

-- Move request pending từ primary E3
INSERT INTO move_requests (id, user_id, room_id, requested_date, reason, status)
VALUES (
  '00000000-0000-0000-0000-000000777003'::uuid,
  '00000000-0000-0000-0000-000000999003'::uuid,
  '{{ROOM_E3_UUID}}'::uuid,
  (CURRENT_DATE + INTERVAL '7 days')::date,
  'Test T021 E3 — primary chuyển đi để test auto-promote',
  'pending'
)
ON CONFLICT (id) DO UPDATE SET
  status         = 'pending',
  requested_date = EXCLUDED.requested_date,
  reviewed_by    = NULL,
  reviewed_at    = NULL,
  rejection_note = NULL;

COMMIT;

-- ============================================================
-- Sanity check sau khi seed:
--
-- SELECT phone, full_name, is_profile_complete, tenant_status
--   FROM users WHERE phone LIKE '0911999%' ORDER BY phone;
-- → 4 rows: 0911999001..004
--
-- SELECT u.phone, rt.is_primary, rt.left_at, r.name
--   FROM room_tenants rt
--   JOIN users u ON u.id = rt.user_id
--   JOIN rooms r ON r.id = rt.room_id
--  WHERE u.phone LIKE '0911999%' ORDER BY rt.joined_at;
-- → 3 rows (E2 primary, E3 primary, E3 second)
--
-- SELECT id, status, requested_date FROM move_requests
--  WHERE id IN ('00000000-0000-0000-0000-000000777002',
--               '00000000-0000-0000-0000-000000777003');
-- → 2 rows, status='pending'
-- ============================================================
