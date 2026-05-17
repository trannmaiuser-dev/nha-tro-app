-- ============================================================
-- Migration v16: Transactional wrap cho approveMoveRequest + createTenantAccount (T-026)
-- Ngày: 2026-05-18
--
-- LƯU Ý:
--   • 2 PG function với BEGIN/EXCEPTION block — atomic by default
--   • Khi RAISE EXCEPTION giữa chừng, toàn bộ writes rollback
--   • TS caller chỉ gọi sb.rpc(...) — không còn multiple round-trip
--   • Audit Issue #6 (T-024 audit): approveMoveRequest 4-6 writes + createTenantAccount 3-5 writes
--   • Error message dùng RAISE EXCEPTION tiếng Việt, propagate qua sb.rpc().error.message
-- ============================================================

BEGIN;

-- ─── 1. approve_move_request: wrap 4-6 writes của approveMoveRequest ─
-- Replicates lib/db/move-requests.ts:71-105 + lib/db/room-tenants.ts:72-130
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
  v_next_primary_user_id UUID;
  v_active_count         INTEGER;
BEGIN
  -- 1. Lấy thông tin request (user_id + room_id)
  SELECT user_id, room_id INTO v_user_id, v_room_id
  FROM move_requests
  WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu';
  END IF;

  -- 2. Update request status
  UPDATE move_requests
  SET status      = 'approved',
      reviewed_by = p_reviewer_id,
      reviewed_at = NOW()
  WHERE id = p_request_id;

  -- 3. Update tenant status
  UPDATE users
  SET tenant_status = 'moved_out'
  WHERE id = v_user_id;

  -- 4. removeTenantFromRoom logic (atomic)
  -- 4a. Find active membership
  SELECT id, is_primary INTO v_membership_id, v_was_primary
  FROM room_tenants
  WHERE room_id = v_room_id
    AND user_id = v_user_id
    AND left_at IS NULL;

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy khách trong phòng';
  END IF;

  -- 4b. Mark left
  UPDATE room_tenants
  SET left_at = NOW()
  WHERE id = v_membership_id;

  -- 4c. If was primary, promote next (earliest joined_at)
  IF v_was_primary THEN
    SELECT id, user_id INTO v_next_primary_id, v_next_primary_user_id
    FROM room_tenants
    WHERE room_id = v_room_id
      AND left_at IS NULL
    ORDER BY joined_at ASC
    LIMIT 1;

    IF v_next_primary_id IS NOT NULL THEN
      UPDATE room_tenants
      SET is_primary = TRUE
      WHERE id = v_next_primary_id;
    END IF;
  END IF;

  -- 4d. Sync rooms (tenant_id + status)
  SELECT COUNT(*) INTO v_active_count
  FROM room_tenants
  WHERE room_id = v_room_id
    AND left_at IS NULL;

  IF v_active_count = 0 THEN
    -- Phòng trống → tenant_id NULL + vacant
    UPDATE rooms
    SET tenant_id = NULL, status = 'vacant'
    WHERE id = v_room_id;
  ELSIF v_next_primary_user_id IS NOT NULL THEN
    -- Còn người + primary mới → sync tenant_id sang primary mới
    UPDATE rooms
    SET tenant_id = v_next_primary_user_id, status = 'occupied'
    WHERE id = v_room_id;
  END IF;

  -- 5. INSERT notification cho tenant
  INSERT INTO notifications (sender_id, receiver_id, type, message)
  VALUES (
    p_reviewer_id,
    v_user_id,
    'extension_approved',
    'Yêu cầu chuyển đi của bạn đã được chấp nhận.'
  );
END;
$$ LANGUAGE plpgsql;

-- ─── 2. create_tenant_account: wrap 3-5 writes của createTenantAccount ─
-- Replicates lib/db/tenants.ts:20-76 + lib/db/room-tenants.ts:22-69
-- Password hash + token generate ở TS layer (bcryptjs không có trong PG core)
-- TS caller: pre-compute hash + token, pass vào function. Function chỉ làm DB writes.
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
  -- 1. Check phone unique
  SELECT id INTO v_existing_id FROM users WHERE phone = p_phone;
  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'Số điện thoại đã được đăng ký';
  END IF;

  -- 2. Check room exists + lấy name
  SELECT name INTO v_room_name FROM rooms WHERE id = p_room_id;
  IF v_room_name IS NULL THEN
    RAISE EXCEPTION 'Phòng không tồn tại';
  END IF;

  -- 3. INSERT user (tenant role, is_profile_complete=false, status=invited)
  INSERT INTO users (
    phone, password_hash, role, full_name,
    first_login_token, first_login_expires,
    is_profile_complete, tenant_status
  )
  VALUES (
    p_phone, p_password_hash, 'tenant',
    COALESCE(p_full_name, 'Khách phòng ' || v_room_name),
    p_token, p_token_expires,
    FALSE, 'invited'
  )
  RETURNING id INTO v_new_user_id;

  -- 4. Đếm active tenants trong phòng để quyết định is_primary
  SELECT COUNT(*) INTO v_active_count
  FROM room_tenants
  WHERE room_id = p_room_id
    AND left_at IS NULL;

  v_is_primary := (v_active_count = 0);

  -- 5. addTenantToRoom logic (atomic)
  -- 5a. Nếu user mới là primary → unset primary cũ (defensive — count=0 mới true)
  IF v_is_primary THEN
    UPDATE room_tenants
    SET is_primary = FALSE
    WHERE room_id = p_room_id
      AND left_at IS NULL;
  END IF;

  -- 5b. INSERT membership
  INSERT INTO room_tenants (room_id, user_id, is_primary, joined_at)
  VALUES (p_room_id, v_new_user_id, v_is_primary, NOW());

  -- 5c. Sync rooms (dual-write backward compat)
  IF v_is_primary THEN
    UPDATE rooms
    SET tenant_id = v_new_user_id, status = 'occupied'
    WHERE id = p_room_id;
  ELSE
    -- Không đụng tenant_id (primary cũ giữ). Chỉ đảm bảo status = occupied.
    UPDATE rooms
    SET status = 'occupied'
    WHERE id = p_room_id;
  END IF;

  -- 6. INSERT profile rỗng (draft)
  INSERT INTO tenant_profiles (user_id, profile_status)
  VALUES (v_new_user_id, 'draft');

  -- 7. Return JSON cho TS caller
  RETURN jsonb_build_object(
    'user_id', v_new_user_id,
    'phone',   p_phone
  );
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================================
-- Verify after apply:
--
-- SELECT proname FROM pg_proc
--  WHERE proname IN ('approve_move_request', 'create_tenant_account');
-- → 2 rows
--
-- Test (DRY-RUN — rollback ngay):
--
-- BEGIN;
-- SELECT create_tenant_account(
--   (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),
--   '0911000099',
--   'Test V16 RPC',
--   '$2a$10$dummy_hash_for_test',
--   'dummy_token_64char',
--   NOW() + INTERVAL '7 days'
-- );
-- ROLLBACK;  -- KHÔNG commit
-- ============================================================
