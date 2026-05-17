Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ, Supabase Singapore)
- Task: T-016b — drop column legacy rooms.tenant_id + recreate 2 PG functions
- File migration: supabase/migrations-v18.sql
- Action: RECREATE 2 functions (approve_move_request + create_tenant_account) bỏ refs rooms.tenant_id + DROP COLUMN

== LƯU Ý QUAN TRỌNG ==
- Migration phá vỡ schema (DROP COLUMN). KHÔNG dry-run rollback được nếu COMMIT.
- Trước khi apply: backup nếu cần (chỉ 4 phòng nên rủi ro thấp, nhưng vẫn cẩn trọng).
- Backward compat: code TS hiện tại đã refactor (không còn ref rooms.tenant_id), apply migration là cleanup cuối cùng.

== VIỆC BẠN CẦN LÀM ==

--- BƯỚC 1: Pre-check (đảm bảo column còn tồn tại) ---

[SQL-PRECHECK-START]
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'rooms'
ORDER BY ordinal_position;
[SQL-PRECHECK-END]

Pass: list columns có 'tenant_id'. Nếu KHÔNG có → migration đã apply trước đó, STOP và báo cho tôi.

--- BƯỚC 2: Apply migration ---

1. SQL Editor → New query
2. Paste toàn bộ SQL trong [SQL-MIGRATION] dưới
3. Click "Run"
4. Confirm success (no error)

[SQL-MIGRATION-START]
BEGIN;

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

  SELECT COUNT(*) INTO v_active_count
  FROM room_tenants WHERE room_id=v_room_id AND left_at IS NULL;

  IF v_active_count = 0 THEN
    UPDATE rooms SET status='vacant' WHERE id=v_room_id;
  END IF;

  INSERT INTO notifications (sender_id, receiver_id, type, message)
  VALUES (p_reviewer_id, v_user_id, 'extension_approved',
          'Yêu cầu chuyển đi của bạn đã được chấp nhận.');
END;
$$ LANGUAGE plpgsql;

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

  UPDATE rooms SET status='occupied' WHERE id=p_room_id;

  INSERT INTO tenant_profiles (user_id, profile_status)
  VALUES (v_new_user_id, 'draft');

  RETURN jsonb_build_object('user_id', v_new_user_id, 'phone', p_phone);
END;
$$ LANGUAGE plpgsql;

ALTER TABLE rooms DROP COLUMN IF EXISTS tenant_id;

NOTIFY pgrst, 'reload schema';

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 3: Verify column đã drop ---

[SQL-VERIFY-COLUMN-START]
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'rooms'
ORDER BY ordinal_position;
[SQL-VERIFY-COLUMN-END]

Pass: KHÔNG còn 'tenant_id' trong list. Báo cho tôi đầy đủ column list.

--- BƯỚC 4: Verify 2 functions vẫn tồn tại ---

[SQL-VERIFY-FUNCTIONS-START]
SELECT proname FROM pg_proc
WHERE proname IN ('approve_move_request', 'create_tenant_account')
ORDER BY proname;
[SQL-VERIFY-FUNCTIONS-END]

Pass: 2 rows.

--- BƯỚC 5: Smoke test create_tenant_account (DRY-RUN) ---

[SQL-SMOKE-CREATE-START]
BEGIN;
SELECT create_tenant_account(
  (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),
  '0911000097',
  'Test T016b Post-Drop',
  '$2a$10$dummy_hash_for_test_only_test_test_test_test',
  'dummy_token_post_drop_64_chars_test_test_test_test_test',
  NOW() + INTERVAL '7 days'
) AS result;

-- Verify
SELECT id, phone, tenant_status FROM users WHERE phone = '0911000097';
SELECT user_id, is_primary FROM room_tenants
  WHERE user_id = (SELECT id FROM users WHERE phone = '0911000097');
SELECT name, status FROM rooms WHERE name = 'P101';

ROLLBACK;
[SQL-SMOKE-CREATE-END]

Pass criteria: 3 verify queries trả đúng row (user new, membership new, room status='occupied'). ROLLBACK preserve state.

--- BƯỚC 6: Sanity check rooms hiện trạng ---

[SQL-SANITY-START]
SELECT id, name, status FROM rooms ORDER BY name;
SELECT COUNT(*) AS active_membership_count
FROM room_tenants WHERE left_at IS NULL;
[SQL-SANITY-END]

Pass: rooms hiển thị bình thường. active_membership_count = số khách đang active.

== BÁO CÁO LẠI CHO TÔI ==

Format:
- Buoc 1 pre-check: thay 'tenant_id' / KHONG con
- Buoc 2 apply: OK / ERROR <msg>
- Buoc 3 verify column drop: list columns (KHONG co tenant_id)
- Buoc 4 verify 2 functions: 2 rows / ERROR
- Buoc 5 smoke create_tenant_account: pass / FAIL <reason>
- Buoc 6 sanity rooms: room list + active_count

Neu bat ky buoc FAIL → STOP, paste error day du, DUNG retry. Quan trong: neu Buoc 2 fail giua chung, transaction auto-rollback, neu can ROLLBACK manual thi chay: ROLLBACK;
