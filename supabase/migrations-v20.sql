-- ============================================================
-- Migration v20: Internal transfer support (T-020, UC-08)
-- Ngày: 2026-05-18
--
-- Changes:
--   1. ADD COLUMN move_requests.transfer_to_room_id (UUID nullable, FK rooms)
--      → NULL = move-out (chuyển đi hẳn). NOT NULL = transfer (chuyển sang phòng khác).
--   2. ADD COLUMN move_requests.initiated_by (TEXT 'tenant'|'owner', default 'tenant')
--      → Phân biệt khách request vs chủ propose.
--   3. PG function `transfer_tenant(request_id, reviewer_id)` — atomic transfer execution.
--      Replicate removeTenantFromRoom + addTenantToRoom logic trong 1 transaction.
-- ============================================================

BEGIN;

ALTER TABLE move_requests
  ADD COLUMN IF NOT EXISTS transfer_to_room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS initiated_by        TEXT NOT NULL DEFAULT 'tenant';

-- Add CHECK for initiated_by (defer nếu đã tồn tại)
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

-- Index cho query "pending transfers"
CREATE INDEX IF NOT EXISTS idx_move_requests_transfer
  ON move_requests(transfer_to_room_id, status)
  WHERE transfer_to_room_id IS NOT NULL;

-- ─── PG function transfer_tenant: atomic execute ─
-- Logic: remove khỏi from_room + add vào to_room + mark request approved.
-- Khác approve_move_request ở: KHÔNG set tenant_status='moved_out' (vẫn 'active' trong dãy).
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
  -- 1. Lấy request
  SELECT user_id, room_id, transfer_to_room_id
  INTO v_user_id, v_from_room_id, v_to_room_id
  FROM move_requests WHERE id = p_request_id;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Không tìm thấy yêu cầu';
  END IF;
  IF v_to_room_id IS NULL THEN
    RAISE EXCEPTION 'Yêu cầu không phải transfer (transfer_to_room_id NULL)';
  END IF;
  IF v_from_room_id = v_to_room_id THEN
    RAISE EXCEPTION 'Phòng nguồn và đích trùng nhau';
  END IF;

  -- 2. Mark request approved
  UPDATE move_requests
  SET status='approved', reviewed_by=p_reviewer_id, reviewed_at=NOW()
  WHERE id = p_request_id;

  -- 3. removeTenantFromRoom logic (old room)
  SELECT id, is_primary INTO v_membership_id, v_was_primary
  FROM room_tenants
  WHERE room_id=v_from_room_id AND user_id=v_user_id AND left_at IS NULL;

  IF v_membership_id IS NULL THEN
    RAISE EXCEPTION 'Khách không trong phòng nguồn';
  END IF;

  UPDATE room_tenants SET left_at=NOW() WHERE id=v_membership_id;

  -- Auto-promote next primary nếu primary cũ rời
  IF v_was_primary THEN
    SELECT id INTO v_next_primary
    FROM room_tenants
    WHERE room_id=v_from_room_id AND left_at IS NULL
    ORDER BY joined_at ASC LIMIT 1;
    IF v_next_primary IS NOT NULL THEN
      UPDATE room_tenants SET is_primary=TRUE WHERE id=v_next_primary;
    END IF;
  END IF;

  -- Sync rooms.status cho phòng nguồn
  SELECT COUNT(*) INTO v_old_active
  FROM room_tenants WHERE room_id=v_from_room_id AND left_at IS NULL;
  IF v_old_active = 0 THEN
    UPDATE rooms SET status='vacant' WHERE id=v_from_room_id;
  END IF;

  -- 4. addTenantToRoom logic (new room)
  SELECT COUNT(*) INTO v_new_active
  FROM room_tenants WHERE room_id=v_to_room_id AND left_at IS NULL;
  v_new_is_primary := (v_new_active = 0);

  -- Defensive: nếu primary mới = true, unset primary cũ (count=0 thì không match)
  IF v_new_is_primary THEN
    UPDATE room_tenants SET is_primary=FALSE
    WHERE room_id=v_to_room_id AND left_at IS NULL;
  END IF;

  INSERT INTO room_tenants (room_id, user_id, is_primary, joined_at)
  VALUES (v_to_room_id, v_user_id, v_new_is_primary, NOW());

  UPDATE rooms SET status='occupied' WHERE id=v_to_room_id;

  -- 5. tenant_status giữ 'active' (vẫn ở dãy — khác approve_move_request set 'moved_out')
  UPDATE users SET tenant_status='active' WHERE id=v_user_id;

  -- 6. Notification cho khách
  INSERT INTO notifications (sender_id, receiver_id, type, message)
  VALUES (
    p_reviewer_id,
    v_user_id,
    'extension_approved',
    'Yêu cầu chuyển phòng của bạn đã được duyệt. Chúc bạn ở phòng mới vui vẻ!'
  );
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================
-- Verify after apply:
--
-- 1) Columns:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name='move_requests'
--   AND column_name IN ('transfer_to_room_id', 'initiated_by')
-- ORDER BY column_name;
-- → 2 rows
--
-- 2) Function:
-- SELECT proname FROM pg_proc WHERE proname='transfer_tenant';
-- → 1 row
--
-- 3) CHECK constraint:
-- SELECT conname FROM pg_constraint
-- WHERE conname='move_requests_initiated_by_check';
-- → 1 row
--
-- 4) Index:
-- SELECT indexname FROM pg_indexes WHERE indexname='idx_move_requests_transfer';
-- → 1 row
--
-- ROLLBACK (nếu cần):
-- BEGIN;
-- DROP FUNCTION IF EXISTS transfer_tenant(UUID, UUID);
-- DROP INDEX IF EXISTS idx_move_requests_transfer;
-- ALTER TABLE move_requests DROP CONSTRAINT IF EXISTS move_requests_initiated_by_check;
-- ALTER TABLE move_requests DROP COLUMN IF EXISTS transfer_to_room_id;
-- ALTER TABLE move_requests DROP COLUMN IF EXISTS initiated_by;
-- COMMIT;
-- ============================================================
