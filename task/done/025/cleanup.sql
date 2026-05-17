-- ============================================================
-- T-025 Phase E auto — cleanup test data
-- ============================================================
-- Chạy trước seed (nếu sót), hoặc sau Phase E.
-- An toàn: chỉ xóa data có phone prefix '0911999'.

BEGIN;

-- Xóa notification từ test user (FK: sender_id, receiver_id)
DELETE FROM notifications
WHERE sender_id IN (SELECT id FROM users WHERE phone LIKE '0911999%')
   OR receiver_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

-- Xóa move_requests
DELETE FROM move_requests
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

-- Xóa room_tenants
DELETE FROM room_tenants
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

-- Reset rooms (unassign tenant nếu trỏ về test user)
UPDATE rooms
SET tenant_id = NULL,
    status    = 'available'
WHERE tenant_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

-- Xóa tenant_profiles
DELETE FROM tenant_profiles
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

-- Xóa users
DELETE FROM users WHERE phone LIKE '0911999%';

COMMIT;
