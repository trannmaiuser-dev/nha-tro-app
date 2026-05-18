# 🗂️ Todo: T-032 — Make-primary swap helper (T-019 followup)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Make-primary swap — owner đổi đại diện phòng |
| **Mã task** | T-032 |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🟢 Thấp (nice-to-have, defer từ T-019 D4) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | — |
| **Trạng thái** | 🔲 Todo |

---

## 🎯 1. PLAN

### Mục tiêu

T-019 ([task/done/done.019-them-khach-thu-2.md](task/done/done.019-them-khach-thu-2.md) D4) defer checkbox "Đặt làm đại diện thay người hiện tại" khi tạo khách 2. Implement riêng task này: UI cho owner swap primary trong phòng đã có nhiều tenant.

Use case: phòng có 2 khách, primary cũ chuyển đi → owner muốn promote khách mới làm primary. Hoặc: thêm khách mới mà muốn họ làm đại diện ngay.

### Scope

**✅ TRONG:**
- [ ] OwnerDashboard: trên mỗi tenant non-primary trong phòng, hiện button nhỏ "👑 Đặt làm đại diện"
- [ ] Server action `setPrimaryAction(roomId, userId)`:
  - Verify owner role
  - Call existing `setPrimaryTenant(roomId, userId)` helper trong lib/db/room-tenants.ts
  - revalidatePath /dashboard, /rooms, /admin/tenants
- [ ] Confirmation dialog đơn giản: "Đặt khách <name> làm đại diện thay <current_primary>?"
- [ ] Toast confirm

**❌ NGOÀI:**
- Make-primary trong AddTenantDialog (admin tenant list) — defer nếu cần
- History tracking ai từng là primary
- Make-primary qua CreateTenantModal khi tạo khách mới (separate flow — defer)

### Deliverables
- `app/admin/rooms/actions.ts` hoặc add vào `app/admin/tenants/actions.ts` (đã có createTenant)
- OwnerDashboard UI tweak
- ConfirmDialog hoặc simple browser confirm()

### Dependencies
- **Cần xong trước:** không có (helper setPrimaryTenant đã có từ T-016)
- **Sẽ chặn:** không có

### Ước lượng: 45 phút

---

## 🔨 2. DO

### Các bước
1. [ ] Read existing `setPrimaryTenant` trong lib/db/room-tenants.ts
2. [ ] Add server action `setPrimaryAction` ở app/admin/tenants/actions.ts (cùng file createTenantAction)
3. [ ] OwnerDashboard: button "👑" trên tenant row non-primary
4. [ ] confirm() dialog
5. [ ] tsc + build + 12-pattern audit
6. [ ] Smoke test prompt

### Files thay đổi

```
app/admin/tenants/actions.ts                       # +setPrimaryAction
components/OwnerDashboard.tsx                      # +button + handler
task/done/done.032-*.md                            # this file (rename khi done)
```

---

## ✅ 3. CHECK

- [ ] tsc no errors
- [ ] Build pass
- [ ] Phase C 12-pattern audit (focus SA1-4)
- [ ] Confirm dialog UX: hiện tên primary cũ + tên mới

---

## 🧪 4. VERIFY (Manual smoke)

| TC | Mô tả | Pass criteria |
|---|---|---|
| TC1 | Phòng có 2 khách, click "👑" trên non-primary | Confirm hiện. Sau confirm: room_tenants is_primary swap, toast success |
| TC2 | Cancel confirm dialog | Không thay đổi DB |
| TC3 | Click "👑" trên primary hiện tại | Button không hiện (UI hide) hoặc action no-op |

---

## 🎬 7. ACT (fill cuối session)

- ...
