Smoke tests critical (3 tests, ~10 phút) — Run sau khi apply v20 OK
======================================================================

Today = 2026-05-18 (ngày 18). Transfer happy path (S26-S27) defer cho ngày 1-5
next month. Hôm nay test 3 case: DebtBanner render, Add 2nd tenant, Transfer
date validation fail.


SETUP CHUNG (1 lần)
=====================

Terminal 1 — Dev server:
  npm run dev
  → http://localhost:3000

Terminal 2 hoặc Supabase Studio tab — SQL setup + verify.

Get DEV_IMPERSONATE_TOKEN:
  grep DEV_IMPERSONATE_TOKEN .env.local
  → copy value sau dấu =


===========================================
S10 — DebtBanner render
===========================================

--- SETUP SQL (Supabase Studio) ---

[SQL-S10-SETUP-START]
INSERT INTO invoices (
  room_id, month, year, rent_amount, electricity_amount, water_amount,
  trash_fee, parking_fee, internet_fee, over_capacity_fee,
  total, paid_amount, due_date, status, has_debt
)
SELECT
  rt.room_id, 1, 2025, 4000000, 500000, 100000, 50000, 0, 100000, 0,
  4750000, 0, '2025-01-31', 'unpaid', TRUE
FROM room_tenants rt
JOIN users u ON u.id = rt.user_id
WHERE u.role='tenant' AND rt.left_at IS NULL
LIMIT 1
RETURNING id AS invoice_id, room_id;
[SQL-S10-SETUP-END]

Note room_id từ RETURNING. Sau đó lấy tenant user_id:

[SQL-S10-GET-TENANT-START]
SELECT u.id AS user_id, u.phone, u.full_name, r.name AS room_name
FROM room_tenants rt
JOIN users u ON u.id = rt.user_id
JOIN rooms r ON r.id = rt.room_id
WHERE rt.room_id = '<room_id_từ_trên>'::uuid
  AND rt.left_at IS NULL
LIMIT 1;
[SQL-S10-GET-TENANT-END]

Note user_id (UUID).


--- ACTION ---

Browser tab mới, paste URL (replace 2 placeholder):

  http://localhost:3000/api/dev/impersonate?token=<DEV_TOKEN>&user_id=<USER_ID>&force_complete=true

Browser redirect → /dashboard.


--- EXPECT (visual check trên /dashboard) ---

✅ Banner đỏ TOP page (above tabs "🏠 Phòng của tôi"):
   - Tiêu đề: "🔴 Hóa đơn quá hạn — phòng <ROOM_NAME>"
   - Sub: "1 hóa đơn quá hạn, tổng 4.750.000đ (trễ N ngày)"
   - Row item: "Tháng 1/2025 (trễ N ngày) ... 4.750.000đ"
   - Button đỏ: "Báo đã chuyển khoản →" link /tenant/payments

✅ Click button → đi đến /tenant/payments → banner cũng hiện top (KHÔNG có
   "Báo đã chuyển khoản" button vì đã ở trang này).


--- CLEANUP ---

[SQL-S10-CLEANUP-START]
DELETE FROM invoices WHERE month=1 AND year=2025 AND total=4750000;
[SQL-S10-CLEANUP-END]


===========================================
S18 — Add 2nd tenant vào phòng occupied
===========================================

--- PRE-CHECK SQL ---

[SQL-S18-PRECHECK-START]
SELECT r.id, r.name, COUNT(rt.id) AS tenant_count
FROM rooms r
LEFT JOIN room_tenants rt ON rt.room_id=r.id AND rt.left_at IS NULL
WHERE r.status='occupied'
GROUP BY r.id, r.name
ORDER BY r.name;
[SQL-S18-PRECHECK-END]

Note tên 1 phòng occupied (vd P201).


--- ACTION ---

1. Login owner — replace OWNER_UUID:

   http://localhost:3000/api/dev/impersonate?token=<DEV_TOKEN>&user_id=<OWNER_UUID>

2. → /dashboard. Scroll xuống phòng occupied đã chọn.

3. Click button "＋ Thêm khách" (gray, nhỏ, dưới 2 button Nhắc tiền + Hồ sơ).

4. Modal mở.

5. Verify:
   ✅ Dropdown pre-select đúng phòng vừa click
   ✅ Label dropdown: "Phòng X — Tầng N (đang N người)"
   ✅ Note xám: "Phòng đang có N người. Khách mới sẽ là thành viên thêm
      (không phải đại diện)."

6. Nhập SĐT mới: 0911000088

7. Click "Tạo tài khoản".


--- EXPECT ---

✅ Success screen hiện:
   - "Tạo thành công!"
   - SĐT: 0911000088
   - Login link
   - Temp password
   - Button "Copy toàn bộ thông tin"

✅ Verify SQL — chạy trong Supabase Studio:

[SQL-S18-VERIFY-START]
SELECT rt.room_id, rt.user_id, rt.is_primary, rt.joined_at,
       u.phone, u.is_profile_complete, u.tenant_status
FROM room_tenants rt
JOIN users u ON u.id=rt.user_id
WHERE u.phone='0911000088';
[SQL-S18-VERIFY-END]

   Pass criteria:
   - 1 row
   - is_primary = FALSE (vì phòng đã có primary cũ)
   - tenant_status = 'invited'
   - is_profile_complete = false

✅ Verify tenant_profiles có draft:

[SQL-S18-VERIFY-PROFILE-START]
SELECT user_id, profile_status FROM tenant_profiles
WHERE user_id = (SELECT id FROM users WHERE phone='0911000088');
[SQL-S18-VERIFY-PROFILE-END]

   Pass: 1 row, profile_status='draft'.


--- CLEANUP ---

[SQL-S18-CLEANUP-START]
DELETE FROM room_tenants WHERE user_id=(SELECT id FROM users WHERE phone='0911000088');
DELETE FROM tenant_profiles WHERE user_id=(SELECT id FROM users WHERE phone='0911000088');
DELETE FROM users WHERE phone='0911000088';
[SQL-S18-CLEANUP-END]


===========================================
S23 — Transfer date validation fail
===========================================

Hôm nay 18 → expected fail validation. Mục đích: verify error message correct.


--- PRE-CHECK SQL ---

[SQL-S23-PRECHECK-START]
SELECT u.id AS tenant_id, u.phone, rt.room_id, r.name AS from_room
FROM room_tenants rt
JOIN users u ON u.id=rt.user_id
JOIN rooms r ON r.id=rt.room_id
WHERE rt.left_at IS NULL AND u.role='tenant'
LIMIT 3;

SELECT id, name FROM rooms WHERE status='vacant' LIMIT 3;
[SQL-S23-PRECHECK-END]

Need: ít nhất 1 tenant active + 1 vacant room (khác phòng tenant đang ở).


--- ACTION ---

1. Login tenant:

   http://localhost:3000/api/dev/impersonate?token=<DEV_TOKEN>&user_id=<TENANT_UUID>&force_complete=true

2. → /dashboard, scroll xuống click "Báo chuyển đi" (hoặc navigate
   /tenant/move-out trực tiếp).

3. Trên trang /tenant/move-out:
   - Click tab "🔄 Chuyển phòng khác"
   - Dropdown "Phòng muốn chuyển sang" → chọn 1 vacant room
   - Nhập ngày tương lai (vd 2026-06-15)
   - Optional: reason "Test S23"
   - Click "Gửi yêu cầu chuyển phòng"


--- EXPECT ---

✅ Toast đỏ error xuất hiện (top hoặc bottom screen):

   "Chỉ được chuyển phòng ngày 1-5 hàng tháng. Vui lòng đợi đến 01/06/2026."

   (Hoặc format ngày tương tự — quan trọng là MESSAGE rõ "ngày 1-5" + suggest
   ngày 1/tháng sau.)

✅ Form KHÔNG submit, page KHÔNG reload.

✅ Verify SQL — KHÔNG có move_request mới tạo:

[SQL-S23-VERIFY-START]
SELECT id, reason, status, created_at FROM move_requests
WHERE created_at > NOW() - INTERVAL '5 minutes';
[SQL-S23-VERIFY-END]

   Pass: 0 rows (validation block trước insert).


===========================================
BÁO LẠI KẾT QUẢ
===========================================

Format paste cho tôi:

  S10 DebtBanner:               PASS / FAIL <ngắn lý do>
  S18 Add 2nd tenant:           PASS / FAIL
  S23 Transfer date validation: PASS / FAIL

Nếu FAIL bất kỳ → paste screenshot hoặc error message + verify SQL output.

Nếu cả 3 PASS → session DONE. Tôi sẽ confirm + suggest next steps (S27
transfer happy path schedule ngày 1-5 tháng 6, hoặc backlog task mới).
