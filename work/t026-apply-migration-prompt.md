Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ, Supabase Singapore)
- Task: T-026 — wrap 2 hàm DB phức tạp vào PG function để atomic transaction
- File migration: supabase/migrations-v16.sql
- 2 PG function sẽ tạo: approve_move_request + create_tenant_account

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
    SELECT id, user_id INTO v_next_primary_id, v_next_primary_user_id
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
    UPDATE rooms SET tenant_id=NULL, status='vacant' WHERE id=v_room_id;
  ELSIF v_next_primary_user_id IS NOT NULL THEN
    UPDATE rooms SET tenant_id=v_next_primary_user_id, status='occupied'
    WHERE id=v_room_id;
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

  IF v_is_primary THEN
    UPDATE rooms SET tenant_id=v_new_user_id, status='occupied' WHERE id=p_room_id;
  ELSE
    UPDATE rooms SET status='occupied' WHERE id=p_room_id;
  END IF;

  INSERT INTO tenant_profiles (user_id, profile_status)
  VALUES (v_new_user_id, 'draft');

  RETURN jsonb_build_object('user_id', v_new_user_id, 'phone', p_phone);
END;
$$ LANGUAGE plpgsql;

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 2: Verify function tồn tại ---
Tạo query mới trong SQL Editor, chạy:

[SQL-VERIFY-START]
SELECT proname FROM pg_proc
WHERE proname IN ('approve_move_request', 'create_tenant_account')
ORDER BY proname;
[SQL-VERIFY-END]

Pass: thấy 2 rows. Báo cho tôi kết quả.

--- BƯỚC 3: Smoke test E1 (create_tenant_account happy path) ---

[SQL-E1-START]
BEGIN;
SELECT create_tenant_account(
  (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),
  '0911000099',
  'Test T026 E1 RPC',
  '$2a$10$dummy_hash_for_e1_test_only_test_test_test',
  'dummy_token_e1_64_chars_test_test_test_test_test_test_test',
  NOW() + INTERVAL '7 days'
) AS result;

SELECT id, phone, full_name, tenant_status, is_profile_complete
FROM users WHERE phone = '0911000099';

SELECT room_id, user_id, is_primary, joined_at
FROM room_tenants
WHERE user_id = (SELECT id FROM users WHERE phone = '0911000099');

SELECT user_id, profile_status FROM tenant_profiles
WHERE user_id = (SELECT id FROM users WHERE phone = '0911000099');

ROLLBACK;
[SQL-E1-END]

Pass criteria: 4 queries trả đúng row (result JSON, user row, room_tenants row, profile row). ROLLBACK preserve state — KHÔNG commit data test.

--- BƯỚC 4: Smoke test E2 (reject duplicate phone) ---

[SQL-E2-START]
BEGIN;
SELECT create_tenant_account(
  (SELECT id FROM rooms WHERE name = 'P101' LIMIT 1),
  (SELECT phone FROM users WHERE role = 'tenant' LIMIT 1),
  'Test E2',
  '$2a$10$dummy',
  'dummy_token',
  NOW() + INTERVAL '7 days'
);
ROLLBACK;
[SQL-E2-END]

Pass criteria: SQL throw ERROR với message "Số điện thoại đã được đăng ký".

--- BƯỚC 5: Smoke test E3 (approve_move_request happy path) ---

Pre-check có move_request pending:

[SQL-E3-PRE-START]
SELECT id, user_id, room_id, status FROM move_requests
WHERE status='pending' LIMIT 3;
[SQL-E3-PRE-END]

Nếu có pending request, pick 1 ID rồi chạy (THAY {{REQUEST_ID}} bằng UUID thật):

[SQL-E3-START]
BEGIN;
SELECT approve_move_request(
  '{{REQUEST_ID}}'::uuid,
  (SELECT id FROM users WHERE role='owner' LIMIT 1)
);

SELECT status, reviewed_by IS NOT NULL AS reviewed FROM move_requests
WHERE id = '{{REQUEST_ID}}'::uuid;

ROLLBACK;
[SQL-E3-END]

Pass criteria: status='approved', reviewed=true.

Nếu KHÔNG có pending request: skip E3, báo cho tôi "no pending requests".

--- BƯỚC 6: Smoke test E4 (approve reject invalid id) ---

[SQL-E4-START]
BEGIN;
SELECT approve_move_request(
  '00000000-0000-0000-0000-999999999999'::uuid,
  (SELECT id FROM users WHERE role='owner' LIMIT 1)
);
ROLLBACK;
[SQL-E4-END]

Pass criteria: SQL throw ERROR với message "Không tìm thấy yêu cầu".

== BÁO CÁO LẠI CHO TÔI ==

Format ngắn gọn, 1 dòng mỗi test:
- Buoc 1 apply: OK / ERROR <message>
- Buoc 2 verify: thay 2 functions / ERROR
- E1: 4 queries pass / FAIL <reason>
- E2: throw dung error / FAIL
- E3: pass / SKIPPED no pending / FAIL <reason>
- E4: throw dung error / FAIL

Neu bat ky buoc FAIL → STOP, paste error day du, DUNG retry.
