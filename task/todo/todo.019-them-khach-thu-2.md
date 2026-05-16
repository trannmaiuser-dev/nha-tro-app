# T-019 — Thêm khách thứ 2 vào phòng đã có người (UC-02b)

## Trạng thái: 🔲 Chưa làm (chưa start)
## Ngày tạo: 2026-05-16
## Ước lượng: 1 ngày
## Áp dụng Phase E: ✅ Yes
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
