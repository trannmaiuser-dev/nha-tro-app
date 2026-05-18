Bạn là assistant giúp tôi apply 1 SQL migration vào Supabase Studio cho dự án nhà trọ.

== BỐI CẢNH ==
- Project: nha-tro-app (4 phòng trọ, Supabase Singapore)
- Task: T-020 — internal transfer (UC-08, chuyển phòng nội bộ)
- File migration: supabase/migrations-v20.sql
- Changes: ADD 2 columns move_requests (transfer_to_room_id + initiated_by) + CHECK constraint + index + PG function transfer_tenant

== VIỆC BẠN CẦN LÀM ==

--- BƯỚC 1: Apply migration ---

1. Supabase Dashboard → SQL Editor → New query
2. Paste khối [SQL-MIGRATION] dưới → Run

[SQL-MIGRATION-START]
BEGIN;

ALTER TABLE move_requests
  ADD COLUMN IF NOT EXISTS transfer_to_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiated_by        TEXT NOT NULL DEFAULT 'tenant';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'move_requests_initiated_by_check'
  ) THEN
    ALTER TABLE move_requests
      ADD CONSTRAINT move_requests_initiated_by_check
      CHECK (initiated_by IN ('tenant', 'owner'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_move_requests_transfer
  ON move_requests(transfer_to_room_id, status)
  WHERE transfer_to_room_id IS NOT NULL;

CREATE OR REPLACE FUNCTION transfer_tenant(
  p_request_id    UUID,
  p_reviewer_id   UUID
) RETURNS VOID AS $$
DECLARE
  v_user_id        UUID;
  v_from_room_id   UUID;
  v_to_room_id     UUID;
  v_membership_id  UUID;
  v_was_primary    BOOLEAN;
  v_next_primary   UUID;
  v_old_active     INTEGER;
  v_new_active     INTEGER;
  v_new_is_primary BOOLEAN;
BEGIN
  SELECT user_id, room_id, transfer_to_room_id
  INTO v_user_id, v_from_room_id, v_to_room_id
  FROM move_requests WHERE id = p_request_id;

  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Không tìm thấy yêu cầu'; END IF;
  IF v_to_room_id IS NULL THEN RAISE EXCEPTION 'Yêu cầu không phải transfer'; END IF;
  IF v_from_room_id = v_to_room_id THEN RAISE EXCEPTION 'Phòng nguồn và đích trùng nhau'; END IF;

  UPDATE move_requests
  SET status='approved', reviewed_by=p_reviewer_id, reviewed_at=NOW()
  WHERE id = p_request_id;

  SELECT id, is_primary INTO v_membership_id, v_was_primary
  FROM room_tenants
  WHERE room_id=v_from_room_id AND user_id=v_user_id AND left_at IS NULL;
  IF v_membership_id IS NULL THEN RAISE EXCEPTION 'Khách không trong phòng nguồn'; END IF;

  UPDATE room_tenants SET left_at=NOW() WHERE id=v_membership_id;

  IF v_was_primary THEN
    SELECT id INTO v_next_primary
    FROM room_tenants
    WHERE room_id=v_from_room_id AND left_at IS NULL
    ORDER BY joined_at ASC LIMIT 1;
    IF v_next_primary IS NOT NULL THEN
      UPDATE room_tenants SET is_primary=TRUE WHERE id=v_next_primary;
    END IF;
  END IF;

  SELECT COUNT(*) INTO v_old_active
  FROM room_tenants WHERE room_id=v_from_room_id AND left_at IS NULL;
  IF v_old_active = 0 THEN
    UPDATE rooms SET status='vacant' WHERE id=v_from_room_id;
  END IF;

  SELECT COUNT(*) INTO v_new_active
  FROM room_tenants WHERE room_id=v_to_room_id AND left_at IS NULL;
  v_new_is_primary := (v_new_active = 0);

  IF v_new_is_primary THEN
    UPDATE room_tenants SET is_primary=FALSE
    WHERE room_id=v_to_room_id AND left_at IS NULL;
  END IF;

  INSERT INTO room_tenants (room_id, user_id, is_primary, joined_at)
  VALUES (v_to_room_id, v_user_id, v_new_is_primary, NOW());

  UPDATE rooms SET status='occupied' WHERE id=v_to_room_id;

  UPDATE users SET tenant_status='active' WHERE id=v_user_id;

  INSERT INTO notifications (sender_id, receiver_id, type, message)
  VALUES (p_reviewer_id, v_user_id, 'extension_approved',
          'Yêu cầu chuyển phòng của bạn đã được duyệt. Chúc bạn ở phòng mới vui vẻ!');
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';

COMMIT;
[SQL-MIGRATION-END]

--- BƯỚC 2: Verify columns ---

[SQL-VERIFY-COLUMNS-START]
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name='move_requests'
  AND column_name IN ('transfer_to_room_id', 'initiated_by')
ORDER BY column_name;
[SQL-VERIFY-COLUMNS-END]

Pass: 2 rows. initiated_by text NOT NULL default 'tenant'. transfer_to_room_id uuid nullable.

--- BƯỚC 3: Verify constraint + index ---

[SQL-VERIFY-CONSTRAINT-START]
SELECT conname FROM pg_constraint
WHERE conname='move_requests_initiated_by_check';

SELECT indexname FROM pg_indexes
WHERE indexname='idx_move_requests_transfer';
[SQL-VERIFY-CONSTRAINT-END]

Pass: cả 2 query trả 1 row.

--- BƯỚC 4: Verify function ---

[SQL-VERIFY-FUNCTION-START]
SELECT proname FROM pg_proc WHERE proname='transfer_tenant';
[SQL-VERIFY-FUNCTION-END]

Pass: 1 row.

--- BƯỚC 5: Smoke test transfer_tenant (DRY-RUN) ---

Pre-check: tìm 1 tenant có phòng + 1 phòng vacant khác:

[SQL-SMOKE-PRE-START]
SELECT u.id AS user_id, u.full_name, rt.room_id AS from_room, r.name AS from_room_name
FROM room_tenants rt
JOIN users u ON u.id = rt.user_id
JOIN rooms r ON r.id = rt.room_id
WHERE rt.left_at IS NULL AND u.role='tenant'
LIMIT 3;

SELECT id, name FROM rooms WHERE status='vacant' LIMIT 3;
[SQL-SMOKE-PRE-END]

Nếu có ít nhất 1 tenant active + 1 vacant room khác → pick user_id + from_room + to_room. Nếu KHÔNG có pending data → skip Bước 5, báo "no test data".

Sau khi có data, chạy smoke (REPLACE {{USER_ID}}, {{FROM_ROOM}}, {{TO_ROOM}}, {{OWNER_ID}}):

[SQL-SMOKE-START]
BEGIN;

-- Tạo transfer request giả
INSERT INTO move_requests (user_id, room_id, transfer_to_room_id, requested_date, reason, initiated_by, status)
VALUES (
  '{{USER_ID}}'::uuid,
  '{{FROM_ROOM}}'::uuid,
  '{{TO_ROOM}}'::uuid,
  CURRENT_DATE + INTERVAL '3 days',
  'Smoke test T-020',
  'tenant',
  'pending'
)
RETURNING id;

-- Execute via RPC
SELECT transfer_tenant(
  (SELECT id FROM move_requests WHERE reason='Smoke test T-020' ORDER BY created_at DESC LIMIT 1),
  '{{OWNER_ID}}'::uuid
);

-- Verify state
SELECT status, transfer_to_room_id IS NOT NULL AS is_transfer
FROM move_requests WHERE reason='Smoke test T-020' ORDER BY created_at DESC LIMIT 1;

SELECT room_id, left_at IS NOT NULL AS left_set
FROM room_tenants
WHERE user_id='{{USER_ID}}'::uuid
ORDER BY joined_at DESC LIMIT 3;

SELECT name, status FROM rooms WHERE id IN ('{{FROM_ROOM}}'::uuid, '{{TO_ROOM}}'::uuid);

ROLLBACK;
[SQL-SMOKE-END]

Pass criteria: 
- move_request status='approved', is_transfer=true
- 2 room_tenants rows cho user: 1 cũ có left_at, 1 mới không
- {{TO_ROOM}} status='occupied'. {{FROM_ROOM}} status tùy (vacant nếu chỉ user đó ở, occupied nếu còn người)

ROLLBACK preserve state.

== BÁO CÁO LẠI CHO TÔI ==

Format:
- Buoc 1 apply: OK / ERROR <msg>
- Buoc 2 columns: 2 rows / FAIL
- Buoc 3 constraint+index: ca 2 OK / FAIL
- Buoc 4 function: 1 row / FAIL
- Buoc 5 smoke: pass / SKIPPED no data / FAIL <reason>

Neu bat ky FAIL → STOP, paste error.
