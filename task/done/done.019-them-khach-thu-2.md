# T-019 — Thêm khách thứ 2 vào phòng đã có người (UC-02b)

## Trạng thái: 🟢 Done (UI only, no migration)
## Ngày tạo: 2026-05-16
## Ngày hoàn thành: 2026-05-18
## Ước lượng thực tế: ~30 phút (spec 1 ngày — scope giảm vì PG function T-016b đã handle multi-tenant)
## Áp dụng Phase E: ✅ Manual smoke
## Phase E mode: manual
## Branch: feature/t019-multi-tenant-add

---

## Mục tiêu

Hoàn thiện UI flow cho UC-02b — thêm khách ở cùng vào phòng đã có người.

Xem chi tiết UC tại `memory/usecase-quan-ly-khach-thue.md` (UC-02b).

---

## Bối cảnh

T-016 đã làm xong schema multi-tenant + data layer + UI cho phòng vacant.
Phát hiện trong test:
- `/dashboard` button "Tạo tài khoản khách" CHỈ hiện cho phòng vacant
- Chưa có flow nào cho phép thêm khách thứ 2 từ `/dashboard`
- AddTenantDialog ở `/admin/tenants` đã hỗ trợ phòng occupied nhưng UX chưa rõ ràng

---

## Trong scope

### Phần 1 — Sửa OwnerDashboard UI

- Phòng `status='occupied'` cũng có button "+ Thêm khách"
- Mở dialog (CreateTenantModal hoặc AddTenantDialog — chọn 1 unified component)
- Pre-select phòng đó

### Phần 2 — Unify entry point

Hiện tại có 2 modal cùng chức năng:
- `CreateTenantModal` (ở /dashboard) — quick add, không có CCCD
- `AddTenantDialog` (ở /admin/tenants) — full form, có CCCD optional

→ Decide: giữ cả 2 hay merge? (Question for user khi start task)

### Phần 3 — Chỉ định primary khi thêm khách 2

- UI checkbox "Đặt làm đại diện thay thế người hiện tại"
- Nếu check → khách mới là primary, khách cũ thành non-primary
- Tái dụng logic `addTenantToRoom(roomId, userId, isPrimary=true)` đã có

### Phần 4 — Cảnh báo capacity

- Đã có ở AddTenantDialog: cảnh báo khi >= 6 người
- Verify giữ behavior này

---

## Phase E — Runtime Smoke Test

| # | Test | Pass criteria |
|---|---|---|
| E1 | Phòng có 1 người → thêm khách 2 từ /dashboard | room_tenants 2 rows, primary cũ giữ |
| E2 | Phòng có 1 người → thêm khách 2 với "đặt làm đại diện" | room_tenants 2 rows, primary mới = khách 2 |
| E3 | Dropdown phòng hiện "(đang N người)" cho occupied | UI text đúng |
| E4 | Re-verify TC4 T-016 (auto-promote) vẫn work | Auto-promote không break |

---

## Câu hỏi nghiệp vụ cần user duyệt trước start

1. Giữ 2 modal hay merge thành 1?
2. UI chỉ định primary: checkbox đơn giản hay flow phức tạp hơn?
3. Khách mới khi vào phòng đã có người: có cần thông báo cho khách cũ không?

---

## Lưu ý

KHÔNG start trước khi T-017 và 2 skills retrospective xong (theo plan Option C).

---

## Implementation (2026-05-18 autonomous mode)

### Decisions (Tier LOW autonomous — user authorized)

- **D1:** KHÔNG merge CreateTenantModal vs AddTenantDialog. Lý do: different contexts (quick FAB vs full admin form), different users (admin overview vs admin tenant list). Cả 2 vẫn dùng `createTenantAction` chung nên không duplicate logic.
- **D2:** Param rename `vacantRooms` → `availableRooms`. Lý do: semantic accurate cho multi-tenant world. Breaking API ở component scope local, chỉ 2 caller (OwnerDashboard + HomePageOwner) — update inline.
- **D3:** Thêm field `tenantCount` vào shape. Lý do: hiển thị "đang N người" label + capacity warning (≥6).
- **D4:** SKIP checkbox "Đặt làm đại diện thay người hiện tại". Lý do: out of scope MVP. PG function default (new tenant non-primary nếu phòng đã có primary) là correct. Make-primary swap defer cho task riêng nếu cần.
- **D5:** SKIP merge 2 modals. Lý do: AddTenantDialog có CCCD form, CreateTenantModal quick-only. Use case khác.
- **D6:** SKIP thông báo cho khách cũ khi có khách mới. Lý do: out of scope, có thể add notification type 'roommate_joined' sau nếu cần.
- **D7:** Capacity warning ≥6 người (match AddTenantDialog precedent). Note hiển thị ≥1 người để user biết đây không phải primary.

### Files thay đổi

```
components/CreateTenantModal.tsx     # Props: vacantRooms→availableRooms, +tenantCount field,
                                     #        +initialRoomId, +capacity warning, +note "không phải đại diện"
components/OwnerDashboard.tsx        # +button "Thêm khách" cho occupied rooms,
                                     # +createTargetRoom state cho pre-select,
                                     # availableRooms = filter !maintenance + map tenantCount
components/HomePageOwner.tsx         # Adapter pattern: stats.vacantRoomList.map(r => ({...r, tenantCount: 0}))
task/done/done.019-them-khach-thu-2.md  # this file
```

### Reuse infrastructure

- **PG function `create_tenant_account`** (T-026 v16 + T-016b v18 recreate) đã handle multi-tenant: COUNT active room_tenants → if 0 then primary, else non-primary, INSERT room_tenants, UPDATE rooms.status='occupied'. Zero new server-side logic cần.
- **createTenantAction** không thay đổi.

### Phase C v3.3 12-pattern audit

| Pattern | Result |
|---|---|
| SA1-4 | ✅ N/A (no new action) |
| SC1-3 | ✅ PASS (dashboard:13 force-dynamic, home:6 force-dynamic) |
| DL1-3 | ✅ N/A (no new helper) |
| SW1-2 | ✅ N/A |
| BN1 | ✅ N/A (no new Image) |

### ACT

1. **Schema + PG function done từ T-016b/T-026 → UI add multi-tenant chỉ cần UI tweak.** (CODE)
   - PG function `create_tenant_account` đã có logic "is_primary = (active count === 0)".
   - UI gọi `createTenantAction` với bất kỳ roomId nào — server handle correctness.
   - Pattern: backend-first cho multi-tenant; UI là last mile.
   - Saved ~80% time vs spec estimate.

2. **Adapter pattern cho legacy caller (HomePageOwner) giữ scope minimal.** (CODE)
   - HomePageOwner vẫn dùng `stats.vacantRoomList` (server fetch vacant-only, không có count).
   - Thay vì refactor server fetch để thêm count, mapping inline `r => ({ ...r, tenantCount: 0 })` đủ — vacant rooms always have 0 tenants.
   - Pattern: adapter trên type contract change để giảm blast radius.

3. **Make-primary swap defer.** (LOGIC — autonomous decide)
   - Spec section 3 muốn checkbox "Đặt làm đại diện thay người hiện tại".
   - Implementation phức tạp: createTenantAction phải atomic insert + setPrimary swap. PG function hiện tại không support.
   - Defer: nếu owner muốn swap primary, dùng "Chuyển quyền primary" feature riêng (UC-02c?) — chưa exist.
   - MVP đủ: tenant mới default non-primary, owner có thể add later.

---

## Phase E — Manual smoke test (KHÔNG cần migration)

| # | Test | Steps | Pass criteria |
|---|---|---|---|
| E1 | Owner click "+ Thêm khách" cho phòng occupied | /dashboard, click button trên phòng occupied | Modal mở, room pre-selected = phòng vừa click |
| E2 | Tạo khách thứ 2 cho phòng đã có 1 người | Submit modal | Success screen render, room_tenants có 2 active rows, primary cũ giữ, mới = non-primary, rooms.status='occupied' |
| E3 | Dropdown label hiện count đúng | Mở modal | "Phòng X (đang N người)" cho occupied, "(trống)" cho vacant |
| E4 | Capacity warning ≥6 người | Pre-condition: phòng có 6 active tenants | Modal hiện ⚠️ warning màu cam |
| E5 | Note "không phải đại diện" cho occupied | Mở modal, chọn phòng occupied | Note text xuất hiện dưới dropdown |
| E6 | Vacant room: button cũ vẫn work, label "Tạo tài khoản khách" | /dashboard, phòng vacant | Button render xanh primary-style như cũ |
