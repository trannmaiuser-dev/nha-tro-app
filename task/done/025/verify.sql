-- ============================================================
-- T-025 Phase E auto — verify queries
-- ============================================================
-- Chạy sau khi user trigger 3 scenario qua Chrome.
-- Expected output ghi trong todo.025-*.md section Phase E.

-- ============================================
-- E3 — Verify move_request đã tạo từ tenant
-- ============================================
SELECT
  mr.id,
  mr.user_id,
  mr.room_id,
  mr.requested_date,
  mr.reason,
  mr.status,
  u.full_name AS tenant_name,
  u.tenant_status,
  r.name AS room_name
FROM move_requests mr
JOIN users u ON u.id = mr.user_id
JOIN rooms r ON r.id = mr.room_id
WHERE u.phone = '0911999301'
ORDER BY mr.created_at DESC;

-- Expected:
-- 1 row, status='pending', requested_date là ngày tenant chọn,
-- tenant_status updated='pending_move' (do trigger DB hoặc app logic).

-- ============================================
-- E3 — Verify notification đã gửi cho owner
-- ============================================
SELECT
  n.id,
  n.receiver_id,
  n.type,
  n.title,
  n.body,
  n.created_at,
  receiver.full_name AS receiver_name,
  receiver.role
FROM notifications n
JOIN users receiver ON receiver.id = n.receiver_id
WHERE n.sender_id = '00000000-0000-0000-0000-000000999301'::uuid
ORDER BY n.created_at DESC
LIMIT 5;

-- Expected:
-- 1 row mới, receiver.role='owner', type liên quan move_request.
