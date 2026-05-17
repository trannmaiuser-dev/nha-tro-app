-- ============================================================
-- T-025 Phase E auto — seed data cho 3 scenarios (E1/E2/E3)
-- ============================================================
-- Idempotent: chạy nhiều lần OK.
-- Chạy `cleanup.sql` trước nếu data sót từ test trước.
--
-- Placeholders (replace lúc paste vào Supabase Studio):
--   {{ROOM_E3_UUID}}  -- 1 phòng vacant cho E3 (vd P103)
--                        SELECT id FROM rooms WHERE name='P103' LIMIT 1;
--
-- LƯU Ý SCHEMA:
--   • rooms.name (vd 'P101', 'P201')
--   • users KHÔNG có cột avatar_url (nằm ở tenant_profiles)
--   • E1 + E2 không cần data thật — chỉ test header response
--   • E3 cần 1 tenant đã có phòng để gửi move_request
-- ============================================================

BEGIN;

-- ============================================
-- E3 SETUP — Tenant active có phòng để test createMoveRequest
-- ============================================

INSERT INTO users (id, phone, password_hash, role, full_name, is_profile_complete, tenant_status)
VALUES (
  '00000000-0000-0000-0000-000000999301'::uuid,
  '0911999301',
  '$2a$10$T025PhaseEAutoPlaceholderBcryptHashOfTest123456789012',
  'tenant',
  'Test T025 E3 MoveRequest',
  true,
  'active'
)
ON CONFLICT (phone) DO UPDATE SET
  full_name           = EXCLUDED.full_name,
  is_profile_complete = true,
  tenant_status       = 'active';

-- Gán tenant vào phòng (cập nhật rooms.tenant_id + room_tenants)
UPDATE rooms
SET tenant_id = '00000000-0000-0000-0000-000000999301'::uuid,
    status    = 'occupied'
WHERE id = '{{ROOM_E3_UUID}}'::uuid;

INSERT INTO room_tenants (room_id, user_id, joined_at, is_primary)
VALUES (
  '{{ROOM_E3_UUID}}'::uuid,
  '00000000-0000-0000-0000-000000999301'::uuid,
  now(),
  true
)
ON CONFLICT DO NOTHING;

COMMIT;
