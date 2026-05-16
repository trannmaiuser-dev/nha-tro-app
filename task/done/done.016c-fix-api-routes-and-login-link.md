# 🗂️ Todo: T-016c — Fix legacy API routes + login link UI

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Fix legacy `/api/owner/create-tenant` + hiển thị login link sau khi tạo tenant |
| **Mã task** | T-016c |
| **Loại** | Hotfix sau T-016 (manual test fail TC1) |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Ưu tiên** | 🔴 Cao — chặn merge T-016 về main |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Bối cảnh
Sau khi T-016 commit 189ba87, user test manual TC1 fail:
- Tạo tenant cho P102 → `users` insert OK, `rooms.tenant_id` update OK
- `room_tenants` vẫn 0 rows → multi-tenant không hoạt động
- Login link không hiển thị trong UI

### Root cause
Hai entry point tạo tenant:
1. `AddTenantDialog` (admin/tenants) → server action `createTenantAction` → `createTenantAccount` (Phase B đã refactor đúng)
2. **`CreateTenantModal`** (owner home + dashboard) → POST `/api/owner/create-tenant/route.ts` (LEGACY, Phase B miss) → set `rooms.tenant_id` direct, KHÔNG insert vào `room_tenants`

User tạo tenant qua owner home → đi route legacy → multi-tenant break.

### Quyết định
- **D19**: Password = `genTempPassword(8)` random, KHÔNG còn dùng 6 số cuối CCCD
- **D20**: Dialog hiển thị cả login link và password
- **D21**: Xóa hẳn `app/api/owner/create-tenant/route.ts` (trùng chức năng)
- **D22**: `id_card_number` optional trong `createTenantSchema` (D19 đã loại bỏ usage cho password)
- **D23**: Migrate `CreateTenantModal` sang `createTenantAction` (giữ component, đổi backend)

### Scope

**✅ Trong:**
- [ ] Tạo `lib/utils/password.ts` với `genTempPassword(8)`
- [ ] Update `createTenantSchema`: `id_card_number` optional
- [ ] Update `lib/db/tenants.ts::createTenantAccount`: dùng random password, idCardNumber optional
- [ ] Update `app/admin/tenants/actions.ts`: trả thêm `loginLink`
- [ ] Update `components/tenants/AddTenantDialog.tsx`: hiển thị box login link, CCCD optional, copy all
- [ ] Migrate `components/CreateTenantModal.tsx` sang `createTenantAction`
- [ ] Delete `app/api/owner/create-tenant/route.ts`
- [ ] Verify TypeScript pass

**❌ Ngoài:**
- Refactor Category D files (read-only `rooms.tenant_id`) — sẽ làm trong T-016b
- Unify CreateTenantModal + AddTenantDialog thành 1 component — scope nhỏ hơn, để sau
- Test runtime (user sẽ làm sau)

### Dependencies
- T-016 Phase A/B/C/D done (commit 189ba87)

### Ước lượng: 1-2 giờ

---

## 🔨 2. DO

Xem checklist trong PLAN.

### Ghi chú khi làm

**Audit BƯỚC 1 — tenant_id trong app/:**
- 1 file UPDATE direct: `app/api/owner/create-tenant/route.ts:55` → DELETE (D21)
- 4 file SELECT/read `rooms.tenant_id` qua nested join hoặc tìm phòng (giữ — sẽ fix trong T-016b drop column)
- 9 file dùng cột `tenant_id` của bảng khác (`tenant_profiles.id`, `payment_proofs.tenant_id`) → KHÔNG LIÊN QUAN, giữ nguyên

**Phát hiện ngoài scope prompt:**
- `components/CreateTenantModal.tsx` cũng gọi route legacy (wired ở HomePageOwner + OwnerDashboard) → D23 quyết định migrate sang server action thay vì xóa
- Schema yêu cầu CCCD bắt buộc, nhưng CreateTenantModal không có field CCCD → D22 → optional

**Đã làm:**
- [lib/utils/password.ts](../../lib/utils/password.ts) — `genTempPassword(8)`, bỏ ký tự nhầm
- [lib/schemas/tenant.ts](../../lib/schemas/tenant.ts) — `id_card_number` optional
- [lib/db/tenants.ts](../../lib/db/tenants.ts) — random password (D19), idCardNumber optional
- [app/admin/tenants/actions.ts](../../app/admin/tenants/actions.ts) — return `loginLink`, `roomName`, `expiresAt`; revalidatePath thêm `/home`, `/dashboard`
- [components/tenants/AddTenantDialog.tsx](../../components/tenants/AddTenantDialog.tsx) — box loginLink xanh dương, nút "Sao chép link" + "Sao chép tất cả", CCCD optional
- [components/CreateTenantModal.tsx](../../components/CreateTenantModal.tsx) — migrate sang `createTenantAction`, validate phone 10 chữ số
- DELETE [app/api/owner/create-tenant/route.ts](../../app/api/owner/create-tenant/route.ts) (D21)

**Verify:** `npx tsc --noEmit` exit 0 (đã `rm -rf .next` clean stale type cache).

---

## ✅ 3. CHECK
- [ ] `npx tsc --noEmit` exit 0
- [ ] `git grep "owner/create-tenant"` → chỉ còn ref trong task history docs
- [ ] CreateTenantModal + AddTenantDialog cùng đi qua `createTenantAction`

---

## 🧪 5. VERIFY (test cases — runtime sẽ làm sau merge code)

| TC | Mô tả | Kỳ vọng |
|---|---|---|
| 1 | Tạo tenant qua owner home (CreateTenantModal) | `users` + `tenant_profiles` + `room_tenants(is_primary=true)` + `rooms.tenant_id` synced |
| 2 | Tạo tenant qua admin/tenants (AddTenantDialog) | tương tự TC1 |
| 3 | Dialog hiển thị | tempPassword + loginLink rõ ràng, có nút copy all |
| 4 | Password format | 8 ký tự random, không có 0/O/1/I/l |
| 5 | CCCD bỏ trống vẫn pass | (qua CreateTenantModal — không có field CCCD) |
| 6 | Route legacy bị 404 | `/api/owner/create-tenant` → 404 |

---

## 🎬 7. ACT

### Bài học rút ra

1. **Refactor schema lớn không chỉ đụng `lib/db/` — phải SCAN cả `app/api/` và server actions.** Pattern: `git grep <field>` toàn codebase trước khi declare done. T-016 Phase B miss route handler vì tự giả định "lib/db là single source of truth". Manual test TC1 mới catch — cost 1 round-trip.

2. **Khi có 2 entry point cùng làm 1 việc (route + server action) → CHỌN 1, xóa cái còn lại.** Để 2 chỗ sẽ drift logic và bug ngầm tái diễn. Server action ưu tiên vì có `revalidatePath`, type safety, không cần build URL trên client. Giữ 2 UI surface OK (CreateTenantModal quick vs AddTenantDialog full) miễn cả 2 đi qua backend giống nhau.

3. **Verify tĩnh ✅ không đủ — manual test runtime mới là gate cuối.** TS pass + scope check pass + 7 ✅ test case tĩnh vẫn không catch bug ở route legacy ngoài `lib/db/`. Đề xuất skill `api-route-audit.md` cho task refactor schema: chạy `git grep <changed_field>` qua `app/**/*` và check mọi caller, không chỉ DB layer.
