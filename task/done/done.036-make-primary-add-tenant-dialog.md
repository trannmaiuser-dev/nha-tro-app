# 🗂️ Todo: T-036 — Make-primary checkbox trong AddTenantDialog

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | AddTenantDialog: checkbox "Đặt làm đại diện" khi thêm khách vào phòng có người |
| **Mã task** | T-036 |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🟢 Thấp (extend T-032 sang admin tenant list) |
| **Ngày tạo** | 2026-05-18 |
| **Ngày hoàn thành** | 2026-05-18 |
| **Trạng thái** | 🟢 Done |
| **Ước lượng thực tế** | ~25 phút |
| **Branch** | feature/t036-make-primary-add-dialog |

---

## ACT

### Files thay đổi
- `app/admin/tenants/actions.ts`: createTenantAction return thêm `userId` field
- `components/tenants/AddTenantDialog.tsx`: +makePrimary state + checkbox UI conditional + post-create setPrimaryAction

### Decisions (autonomous)
- **D1:** NON-atomic flow: createTenantAction → setPrimaryAction (2 RPCs). Lý do: PG function `create_tenant_account` không nhận `is_primary` override param. Modify PG function = scope creep. Partial failure handled with warning toast.
- **D2:** Conditional checkbox: chỉ hiện khi `selectedRoom.tenants_count > 0`. Phòng trống → primary mặc nhiên.
- **D3:** createTenantAction Result mở rộng `userId`. Backward compat 100% (caller cũ CreateTenantModal không break).
- **D4:** Warning toast riêng nếu tenant tạo OK nhưng setPrimary fail → owner biết partial state.

### Phase C 12-pattern audit
- SA1-4: ✅ N/A actions reused (đã PASS audit T-019/T-032)
- SC1-3, DL1-3, SW1-2, BN1: ✅ N/A
- Pure UI composition.

### Smoke test
| TC | Mô tả | Pass |
|---|---|---|
| TC1 | Phòng vacant → checkbox KHÔNG hiện | Hide |
| TC2 | Phòng occupied → checkbox hiện yellow box | Show |
| TC3 | Check + submit | 2 toast: tạo + 👑 đại diện |
| TC4 | DB verify: room_tenants is_primary swap | Old false, new true |
| TC5 | Uncheck + submit | Chỉ tạo toast, primary không swap |

---

## 🎯 1. PLAN

### Mục tiêu

T-019 + T-032: owner có thể (1) thêm khách thứ 2 vào phòng occupied (T-019), (2) swap primary qua button 👑 (T-032). Nhưng AddTenantDialog (/admin/tenants) khi tạo khách vào phòng occupied, KHÔNG có option đặt khách mới làm primary ngay. Phải tạo trước rồi swap riêng.

T-036: Add checkbox "Đặt làm đại diện thay người hiện tại" trong AddTenantDialog cho phòng occupied. Submit form → create tenant + setPrimary trong 1 flow.

### Scope

**✅ TRONG:**
- [ ] AddTenantDialog: checkbox state + UI khi selected room có tenants_count > 0
- [ ] After createTenantAction success: if checkbox checked → call setPrimaryAction(roomId, newUserId)
- [ ] Error handling: nếu setPrimary fail, tenant đã tạo OK, hiện warning toast

**❌ NGOÀI:**
- Atomic create+setPrimary (would need PG function modification — overkill cho 4-room)
- CreateTenantModal cũng add checkbox (separate task T-019 đã quyết skip)

### Deliverables
- Checkbox + handler trong AddTenantDialog
- Conditional render: chỉ hiện cho room occupied

### Dependencies
- T-019 ✅ (AddTenantDialog đã support occupied room)
- T-032 ✅ (setPrimaryAction exists)

### Ước lượng: 30 phút

---

## 🔨 2. DO

1. [ ] Add state `makePrimary` in AddTenantDialog
2. [ ] UI checkbox conditional: `selectedRoom.tenants_count > 0`
3. [ ] handleSubmit: nếu makePrimary → setPrimaryAction sau createTenant success
4. [ ] tsc + build
5. [ ] Phase C audit
