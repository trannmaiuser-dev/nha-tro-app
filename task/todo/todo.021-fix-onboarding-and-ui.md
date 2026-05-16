# T-021 — Fix onboarding optional fields + UI cache stale

## Trạng thái: 🔴 Đang làm (gấp — blocking tenant flow)
## Ngày tạo: 2026-05-16
## Ước lượng: 2-3 giờ
## Áp dụng Phase E: ✅ Yes
## Branch: feature/t021-fix-onboarding-ui

---

## Bối cảnh

Phát hiện 2 bug trong quá trình test T-016 runtime:

### Bug 1 — Onboarding wizard treat optional là required (BLOCKING)
- Trang "Xem lại hồ sơ" sau onboarding hiện cảnh báo:
  - "Thiếu CCCD mặt trước"
  - "Thiếu CCCD mặt sau"
  - "Thiếu hợp đồng thuê nhà"
- Tenant KHÔNG complete được đăng ký → blocking flow
- User confirm: 3 giấy tờ này là **OPTIONAL** (bổ sung sau, trong 7 ngày)

### Bug 2 — UI cache stale sau khi duyệt move-request
- Sau khi admin duyệt move-request ở /admin/move-requests
- Vào /dashboard → hiển thị data cũ
- Cần Ctrl+Shift+R mới thấy đúng
- Root cause: server actions không gọi revalidatePath sau update DB
- Pattern T-016c đã dùng revalidatePath('/home', '/dashboard') cho createTenantAction
  → Cần áp dụng tương tự cho approveMoveRequestAction và các action khác

---

## Trong scope

### Phần 1 — Fix onboarding optional (Bug 1)

1. Audit logic "is_profile_complete" trong:
   - `lib/db/tenants.ts` hàm `checkProfileComplete`
   - Page review hồ sơ (tìm bằng grep "Giấy tờ chưa hoàn thiện")
   - Component hiển thị warnings

2. Phân loại field:
   - **Required** (block complete): full_name, dob, cccd_number, address, occupation, avatar_url, 1 emergency_contact, 1 bank_account
   - **Optional** (cho phép complete, nhưng hiển thị badge "Thiếu giấy tờ"):
     - cccd_front_url, cccd_back_url (ảnh CCCD)
     - rental_contract_url (ảnh hợp đồng)

3. Fix logic checkProfileComplete:
   - Bỏ check cccd_front_url, cccd_back_url, rental_contract_url khỏi hasProfile
   - Cho phép set is_profile_complete=true khi chỉ thiếu các field optional
   - Cho phép tenant_status='active' khi profile complete (theo required only)

4. UI update:
   - Trang review: phân biệt rõ "Thiếu BẮT BUỘC" (đỏ, block) vs "Thiếu KHUYẾN NGHỊ" (vàng, cho qua)
   - Nếu chỉ thiếu optional → cho phép click "Hoàn thành" với cảnh báo "Bổ sung trong 7 ngày"
   - Sau khi complete, vẫn hiện reminder cho đến khi điền đủ optional

### Phần 2 — Fix UI cache stale (Bug 2)

1. Audit TẤT CẢ server actions đụng đến rooms/room_tenants/move_requests/invoices:
   ```
   git grep -l "use server" -- "app/**/actions.ts"
   ```

2. Verify mỗi action có revalidatePath đúng các trang ảnh hưởng:
   - createTenantAction: revalidatePath('/dashboard', '/home') ← T-016c đã có
   - approveMoveRequestAction: revalidatePath('/dashboard', '/admin/move-requests')
   - rejectMoveRequestAction: revalidatePath('/admin/move-requests')
   - createInvoiceAction (hoặc tương đương): revalidatePath('/dashboard', '/admin/finance/invoices')
   - confirmPaymentAction: revalidatePath('/dashboard')
   - sendReminderAction: revalidatePath('/dashboard')
   - Các action sửa rooms (CRUD): revalidatePath('/dashboard', '/rooms')
   - Các action sửa tenants (CRUD): revalidatePath('/dashboard', '/admin/tenants')

3. KHÔNG over-revalidate (chỉ path bị ảnh hưởng)

---

## Ngoài scope

- Push notification khi optional bổ sung xong (đợi T-017)
- Refactor logic profile_complete (chỉ fix tối thiểu)
- Auto-reminder hàng tuần cho tenant chưa bổ sung optional

---

## Test cases (Phase D — Verify tĩnh)

| TC | Check | Pass criteria |
|---|---|---|
| TC1 | Logic checkProfileComplete | Chỉ check 8 required fields, KHÔNG check 3 optional |
| TC2 | UI review hồ sơ | Phân biệt warning đỏ (block) vs vàng (cho qua) |
| TC3 | Audit revalidatePath | Mỗi action có revalidate đúng path |
| TC4 | Re-verify T-016c createTenantAction | revalidatePath('/dashboard', '/home') giữ nguyên |

---

## Phase E — Runtime Smoke Test

### E1 — Tenant complete với chỉ optional thiếu

**Setup:** Tenant onboarding, điền đủ 8 required field, KHÔNG upload 3 file optional

**Action:** Click "Hoàn thành" ở trang review

**Pass criteria UI:**
- KHÔNG hiện block error
- Hiện warning vàng "Còn thiếu giấy tờ — bổ sung trong 7 ngày"
- Click "Hoàn thành" thành công, redirect về home tenant

**Pass criteria SQL:**
```sql
SELECT is_profile_complete, tenant_status FROM users WHERE phone = '<test_phone>';
```
→ is_profile_complete=true, tenant_status='active'

### E2 — Cache invalidation sau duyệt move-request

**Setup:** Phòng P102 có 1 khách (như TC1 cũ), tạo move_request

**Action:** Admin duyệt move-request

**Pass criteria UI:**
- /dashboard tự update KHÔNG cần hard refresh
- Phòng đổi sang "Trống" / "Có người ít hơn" ngay sau action

**Pass criteria SQL:**
- rooms.status update đồng bộ với UI

### E3 — Re-verify TC4 T-016 (auto-promote vẫn work + UI update)

**Setup:** Phòng có 2 người, primary chuyển đi

**Action:** Admin duyệt move-out của primary

**Pass criteria UI:**
- /dashboard tự update, người còn lại có badge "Đại diện" NGAY (không cần refresh)

---

## Ghi chú khi làm

(Fill khi chạy task)

---

## ACT — Bài học rút ra

(Fill cuối session)
