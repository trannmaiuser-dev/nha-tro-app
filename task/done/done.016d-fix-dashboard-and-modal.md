# 🗂️ Todo: T-016d — Fix Dashboard multi-tenant render + Modal refresh timing

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Fix 3 bug runtime sau T-016c |
| **Mã task** | T-016d |
| **Loại** | Hotfix runtime |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Ưu tiên** | 🔴 Cao — chặn merge T-016 về main |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### 3 bug user phát hiện khi test T-016c

**Bug A** — `app/dashboard/page.tsx` owner branch query schema cũ
- `.select('*, tenant:users!tenant_id(...)')` — chỉ lấy 1 primary
- Không có `tenants[]` → UI không thể render multi-tenant
- Phase C miss file này vì chỉ swap `getAllRoomsWithTenants` ở `app/rooms` + `app/admin/tenants`

**Bug B** — `components/OwnerDashboard.tsx` render UI inline legacy
- Loop `rooms.map` rồi hiển thị `room.tenant` (1 người)
- Không có badge "Đại diện"
- Component này KHÔNG dùng `RoomCard.tsx` — Phase C sửa RoomCard không ảnh hưởng

**Bug C** — `components/CreateTenantModal.tsx` `router.refresh()` sau `setResult`
- Refresh ngay lập tức → /dashboard re-fetch → vacantRooms prop đổi → modal mất nội dung success screen
- Login link biến mất trước khi user kịp copy

### Scope

**✅ Trong:**
- [ ] Bug A: dashboard owner branch → `getAllRoomsWithTenants` (chia owner/tenant rooms variable)
- [ ] Bug B: OwnerDashboard render `tenants[].map` + badge "Đại diện" + overflow "và N người khác"; `sendReminder` lấy primary.user_id
- [ ] Bug C: CreateTenantModal bỏ `router.refresh()` ngay, dồn vào `handleClose` (chỉ refresh nếu đã tạo thành công)
- [ ] Defensive check AddTenantDialog
- [ ] Verify TypeScript pass

**❌ Ngoài:**
- Refactor OwnerDashboard dùng RoomCard chung (scope lớn — có thể làm trong skill `ui-pattern.md` sau)
- Fix Bug C pattern cho các modal khác trong codebase (nếu có)
- HomePageOwner (chỉ hiển thị stats, không chi tiết tenant)

### Ước lượng: 1-2 giờ

---

## 🔨 2. DO

### Ghi chú khi làm

**Bug A — `app/dashboard/page.tsx`:**
- Trước: `sb.from('rooms').select('*, tenant:users!tenant_id(...)')` cho cả owner và tenant qua biến `let rooms`
- Sau: chia 2 biến — `ownerRooms: RoomWithTenants[]` qua `getAllRoomsWithTenants()`; `tenantRoom: TenantRoomShape | null` cho tenant branch
- `roomIds` derive theo role; JSX nhánh truyền vào component tương ứng (D25)

**Bug B — `components/OwnerDashboard.tsx`:**
- Bỏ interface `Room` local → import `RoomWithTenants` từ `@/types`
- Tab 'rooms' render: `room.tenants.slice(0,4).map` + badge "Đại diện" cho `is_primary` + "và N người khác" cho overflow
- `sendReminder(room)` gửi tới `primary.user_id` (D24 — không spam, không gửi tới tất cả)
- Nút "Hồ sơ" navigate tới `primary.user_id`; disable cả 2 nút nếu không có primary

**Bug C — `components/CreateTenantModal.tsx`:**
- Thêm state `hasCreated` flag
- Bỏ `router.refresh()` ngay sau `setResult` → chỉ `setHasCreated(true)`
- Thêm `handleClose()`: nếu `hasCreated` → `router.refresh()` trước → rồi `onClose()`
- Swap 4 onClick từ `onClose` → `handleClose` (backdrop, X button, Hủy, Đóng) bằng `replace_all`

**AddTenantDialog defensive:** Không có `router.refresh()` sau `setResult` → KHÔNG bị bug C pattern. Server action `revalidatePath('/admin/tenants', '/rooms', '/home', '/dashboard')` xử lý cache. Note: `onAdded` callback trong props không được gọi (pre-existing — list update qua revalidatePath thay vì client-side append).

**Verify:** `npx tsc --noEmit` exit 0.

**Decisions thêm:** D24 (sendReminder primary), D25 (ownerRooms vs tenantRoom split), D26 (defer router.refresh).

---

## ✅ 3. CHECK
- [ ] `npx tsc --noEmit` exit 0
- [ ] Render tĩnh: 3 file đã sửa khớp pattern

---

## 🧪 5. VERIFY (test cases)

| TC | Mô tả | Kỳ vọng |
|---|---|---|
| 1 | /dashboard owner | List phòng, P102 (đã tạo tenant T-016c) hiển thị tên + badge "Đại diện" |
| 2 | Tạo khách qua /dashboard CreateTenantModal | Dialog hiển thị login link + password rõ, KHÔNG biến mất sau setResult |
| 3 | Click "Đóng" trên success screen | Modal đóng → /dashboard refresh → tenant mới xuất hiện trong card phòng |
| 4 | Thêm khách thứ 2 vào phòng có người (qua /admin/tenants) | OwnerDashboard render đủ 2 người, primary cũ giữ badge |

---

## 🎬 7. ACT

### Bài học rút ra

1. **Schema refactor cần grep cả query inline trong server components, không chỉ `lib/db/` helpers.** Phase C miss `app/dashboard/page.tsx` vì file này query Supabase trực tiếp (line 21-25 cũ), không qua `getAllRooms`. T-016c đã thêm `api-route-audit` bài học; T-016d bổ sung: scan cả server component query inline.

2. **Component dùng UI inline (không qua shared `RoomCard`) cần update riêng.** Phase C sửa `RoomCard.tsx` nhưng `OwnerDashboard.tsx` tự viết render block ở tab 'rooms' → không hưởng lợi. Pattern: khi tạo skill `ui-pattern.md`, đề xuất refactor `OwnerDashboard` dùng `RoomCard` chung để tránh duplicate render logic.

3. **`router.refresh()` ngay sau `setState` success làm modal mất nội dung do parent re-fetch.** Pattern đúng: hoãn refresh đến khi user đóng modal (`handleClose` wrapper với flag `hasCreated`). Trade-off: user thấy danh sách phòng cũ một chút trên parent, đổi lại không mất login link. UX > consistency tức thời.
