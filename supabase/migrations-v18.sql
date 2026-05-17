-- ============================================================
-- Migration v18: Drop column `rooms.tenant_id` (T-016b cleanup)
-- Ngày: 2026-05-18
--
-- Bối cảnh:
--   T-016 (multi-tenant) dùng dual-write rooms.tenant_id + room_tenants
--   để backward compat. Sau khi UI + lib/db refactor xong (T-016, T-016c, T-016d),
--   room_tenants là sole source-of-truth. Drop column legacy.
--
-- LƯU Ý:
--   • PG function v16 (approve_move_request + create_tenant_account) tham chiếu
--     rooms.tenant_id → PHẢI recreate trước khi DROP COLUMN, nếu không function
--     sẽ throw "column does not exist" runtime.
--   • TS callers đã refactor (lib/db/rooms.ts, tenants.ts, room-tenants.ts,
--     app pages + actions, types/index.ts, components/TenantDashboard.tsx,
--     scripts/seed.ts) — không còn TS ref `tenant_id` ngoài context bảng khác.
--
-- ROLLBACK (nếu cần restore):
--   BEGIN;
--   ALTER TABLE rooms ADD COLUMN tenant_id UUID REFERENCES users(id) ON DELETE SET NULL;
--   UPDATE rooms r SET tenant_id = rt.user_id
--     FROM room_tenants rt
--     WHERE rt.room_id = r.id AND rt.is_primary = TRUE AND rt.left_at IS NULL;
--   -- Recreate v16 functions với tenant_id refs (xem migrations-v16.sql gốc)
--   COMMIT;
-- ============================================================

BEGIN;

-- ─── 1. Recreate approve_move_request (bỏ rooms.tenant_id refs) ─
CREATE OR REPLACE FUNCTION approve_move_request(
  p_request_id UUID,
  p_reviewer_id UUID
) RETURNS VOID AS $$
DECLARE
  v_user_id              UUID;
  v_room_id              UUID;
  v_membership_id        UUID;
  v_was_primary          BOOLEAN;
  v_next_primary_id      UUID;
  v_active_count         INTEGER;
BEGIN
  SELECT user_id, room_id INTO v_user_id, v_room_id
  FROM move_requests WHERE id = p_request_id;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu';
  END IF;

  UPDATE move_requests
  SET status='approved', reviewed_by=p_reviewer_id, reviewed_at=NOW()
  WHERE id = p_request_id;

  UPDATE users SET tenant_status='moved_out' WHERE id = v_user_id;

  SELECT id, is_primary INTO v_membership_id, v_was_primary
  FROM room_tenants
  WHERE room_id=v_room_id AND user_id=v_user_id AND left_at IS NULL;
  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy khách trong phòng';
  END IF;

  UPDATE room_tenants SET left_at=NOW() WHERE id=v_membership_id;

  IF v_was_primary THEN
    SELECT id INTO v_next_primary_id
    FROM room_tenants
    WHERE room_id=v_room_id AND left_at IS NULL
    ORDER BY joined_at ASC LIMIT 1;
    IF v_next_primary_id IS NOT NULL THEN
      UPDATE room_tenants SET is_primary=TRUE WHERE id=v_next_primary_id;
    END IF;
  END IF;

  -- T-016b: chỉ sync rooms.status (đã drop rooms.tenant_id)
  SELECT COUNT(*) INTO v_active_count
  FROM room_tenants WHERE room_id=v_room_id AND left_at IS NULL;

  IF v_active_count = 0 THEN
    UPDATE rooms SET status='vacant' WHERE id=v_room_id;
  END IF;
  -- Nếu còn người: status đã là 'occupied' từ trước, không cần update.

  INSERT INTO notifications (sender_id, receiver_id, type, message)
  VALUES (p_reviewer_id, v_user_id, 'extension_approved',
          'Yêu cầu chuyển đi của bạn đã được chấp nhận.');
END;
$$ LANGUAGE plpgsql;

-- ─── 2. Recreate create_tenant_account (bỏ rooms.tenant_id refs) ─
CREATE OR REPLACE FUNCTION create_tenant_account(
  p_room_id        UUID,
  p_phone          TEXT,
  p_full_name      TEXT,
  p_password_hash  TEXT,
  p_token          TEXT,
  p_token_expires  TIMESTAMPTZ
) RETURNS JSONB AS $$
DECLARE
  v_existing_id    UUID;
  v_room_name      TEXT;
  v_new_user_id    UUID;
  v_active_count   INTEGER;
  v_is_primary     BOOLEAN;
BEGIN
  SELECT id INTO v_existing_id FROM users WHERE phone = p_phone;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Số điện thoại đã được đăng ký';
  END IF;

  SELECT name INTO v_room_name FROM rooms WHERE id = p_room_id;
  IF v_room_name IS NULL THEN
    RAISE EXCEPTION 'Phòng không tồn tại';
  END IF;

  INSERT INTO users (
    phone, password_hash, role, full_name,
    first_login_token, first_login_expires,
    is_profile_complete, tenant_status
  )
  VALUES (
    p_phone, p_password_hash, 'tenant',
    COALESCE(p_full_name, 'Khách phòng ' || v_room_name),
    p_token, p_token_expires, FALSE, 'invited'
  )
  RETURNING id INTO v_new_user_id;

  SELECT COUNT(*) INTO v_active_count
  FROM room_tenants WHERE room_id=p_room_id AND left_at IS NULL;
  v_is_primary := (v_active_count = 0);

  IF v_is_primary THEN
    UPDATE room_tenants SET is_primary=FALSE
    WHERE room_id=p_room_id AND left_at IS NULL;
  END IF;

  INSERT INTO room_tenants (room_id, user_id, is_primary, joined_at)
  VALUES (p_room_id, v_new_user_id, v_is_primary, NOW());

  -- T-016b: chỉ sync rooms.status (đã drop rooms.tenant_id)
  UPDATE rooms SET status='occupied' WHERE id=p_room_id;

  INSERT INTO tenant_profiles (user_id, profile_status)
  VALUES (v_new_user_id, 'draft');

  RETURN jsonb_build_object('user_id', v_new_user_id, 'phone', p_phone);
END;
$$ LANGUAGE plpgsql;

-- ─── 3. Drop column legacy ──────────────────────────────────
ALTER TABLE rooms DROP COLUMN IF EXISTS tenant_id;

-- Notify PostgREST reload schema cache để Supabase JS client thấy schema mới
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Verify after apply:
--
-- 1) Cột đã drop:
-- SELECT column_name FROM information_schema.columns
--  WHERE table_name = 'rooms' ORDER BY ordinal_position;
-- → KHÔNG có 'tenant_id' trong list
--
-- 2) Function vẫn tồn tại:
-- SELECT proname FROM pg_proc
--  WHERE proname IN ('approve_move_request', 'create_tenant_account');
-- → 2 rows
--
-- 3) Test create_tenant_account (DRY-RUN):
-- BEGIN;
-- SELECT create_tenant_account(
--   (SELECT id FROM rooms WHERE name='P101' LIMIT 1),
--   '0911000098', 'Test T016b Post-Drop',
--   '$2a$10$dummy', 'dummy_token', NOW() + INTERVAL '7 days'
-- );
-- SELECT name, status FROM rooms WHERE name='P101';  -- → status='occupied'
-- ROLLBACK;
-- ============================================================
