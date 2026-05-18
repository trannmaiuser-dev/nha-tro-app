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
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done |
| **Ước lượng thực tế** | ~20 phút (spec 45p — helper đã có từ T-016) |
| **Branch** | feature/t032-make-primary-swap |

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

## 🎬 7. ACT (autonomous mode)

### Implementation summary

- **Files**: `app/admin/tenants/actions.ts` (+12 lines `setPrimaryAction`), `components/OwnerDashboard.tsx` (+1 import + +1 state + +1 handler + 1 button block)
- **Helper reuse**: `setPrimaryTenant` ([lib/db/room-tenants.ts:182](lib/db/room-tenants.ts:182)) đã exist từ T-016 — atomic unset old primary + set new primary trong cùng 2 update.
- **UX**: button 👑 nhỏ trên mỗi tenant non-primary trong phòng có >1 tenant. browser confirm() dialog hỏi xác nhận với tên cũ + mới. Toast feedback.

### Decisions (Tier LOW autonomous)

- **D1:** Button chỉ hiện khi phòng có >1 tenant. Lý do: phòng 1 người, button vô nghĩa (đã là primary mặc nhiên).
- **D2:** browser `confirm()` thay vì custom ConfirmDialog component. Lý do: simple action, ConfirmDialog component chưa tồn tại sẵn (theo CLAUDE.md sẽ tạo Module 3). Native confirm đủ MVP, có thể nâng cấp sau.
- **D3:** Toast message "👑 Đã đặt X làm đại diện" — emoji highlight, không quá verbose.
- **D4:** `router.refresh()` sau action success — pattern SA3 chuẩn.
- **D5:** Action revalidate 3 paths: /dashboard (OwnerDashboard render), /rooms (room list nếu có primary indicator), /admin/tenants (tenant list nếu show room/primary).

### Phase C 12-pattern audit

| Pattern | Check | Result |
|---|---|---|
| SA1 [HIGH/CODE] | setPrimaryAction has revalidatePath × 3 | ✅ PASS |
| SA2 [HIGH/CODE] | /dashboard, /rooms, /admin/tenants — all exist | ✅ PASS |
| SA3 [MEDIUM/CODE] | handleSetPrimary calls router.refresh() after success | ✅ PASS |
| SA4 [MEDIUM/CODE] | Action wraps try/catch returns Result<void> | ✅ PASS |
| SC1-3 | No SC change | ✅ N/A |
| DL1-3 | No new lib/db helper | ✅ N/A |
| SW1-2 | No SW change | ✅ N/A |
| BN1 | No new Image | ✅ N/A |

All PASS hoặc N/A.

### ACT bài học

1. **Reuse helper từ task cũ → giảm 50% scope.** (CODE)
   - `setPrimaryTenant` đã exist từ T-016 Phase B, đã handle unset old + set new atomic.
   - Task này chỉ cần: server action wrapper + UI button.
   - Pattern: trước khi implement, search "đã có hàm nào tương tự chưa?"

2. **Native browser confirm() đủ cho MVP action quan trọng.** (CODE)
   - Custom ConfirmDialog component đẹp hơn nhưng tốn thêm 30-60p implement.
   - Native confirm() handles dialog UX, cancel button, focus management.
   - Pattern: pick native API khi đủ, defer custom UI cho version sau.

3. **Button conditional render (>1 tenant) tránh UI confusion.** (CODE — D1)
   - Phòng 1 người, button "Đặt làm đại diện" vô nghĩa.
   - Hide thay vì show-disabled — UX clearer, không clutter.
   - Pattern: prefer hide over show-disabled for "không applicable" state.

---

## Smoke test (defer — user mệt)

TC1-TC3 trong section VERIFY. User run khi rảnh sau khi back to work.
