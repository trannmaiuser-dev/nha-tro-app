# 📊 Retrospective sau T-015 — Module Khách thuê + Module Thu chi

> Phạm vi: T-001 → T-015 · Ngày: 2026-05-16

---

## 1. Tổng quan

| Mục | Giá trị |
|---|---|
| Số task hoàn thành | 15 (T-001 → T-015) |
| Số module xong | 2 (Quản lý phòng/khách thuê, Thu chi) |
| Tổng ước lượng | ~72–92 giờ |
| Số file TypeScript/TSX | 174 |
| Số bảng DB mới | 14 (rooms, users, tenant_profiles, app_settings, electricity_logs, invoices, payment_proofs, expenses, meter_reading_logs...) |
| Số route mới | 18 (admin + tenant) |
| Migration files | `migrations-v2` → `migrations-v12` |

Tất cả 11 file `done.*.md` có `Ngày tạo = Ngày hoàn thành = 2026-05-16` → không track được tempo thực tế.

---

## 2. Đánh giá 4 khía cạnh

### 2.1 PDCA

✅ **Điểm tốt:**
- Format file todo nhất quán (PLAN/DO/CHECK/REQUIREMENT CHECK/VERIFY/ACT)
- Bài học T-002/T-003/T-004/T-005 sâu sắc (custom JWT, service_role, Server-Component-fetch + Client state)
- Requirement check hoạt động tốt khi được làm (T-006 catch lệch `tenant_profiles`, T-011 catch lệch RLS)
- Migration version đặt tên đúng nếp `migrations-vN.sql`

🔴 **Điểm yếu:**
- **ACT trống ở T-007 → T-010** (4 task liên tiếp ghi "điền sau") → mất 4 cơ hội học hỏi
- **Skills đề xuất nhưng chưa tạo** — T-004 đề xuất `data-layer-pattern.md`, T-005 đề xuất `ui-pattern.md`, T-015 đề xuất 3 skill — `.claudes/skills/` chỉ có `todo-workflow.md`
- **Task phát sinh không follow-up** — T-004 ghi "todo.00X-setup-test-runner.md" cần tạo, đến nay chưa có
- **Test cases trong file todo là tài liệu, không phải verify thực tế** — đa số ⬜
- **Estimate không có cơ chế track thực tế** — tất cả file done có cùng ngày 2026-05-16

### 2.2 Code quality

🎯 **Pattern tốt nên giữ:**
- `lib/db/<entity>.ts` + `lib/schemas/<entity>.ts` + `app/.../<entity>/actions.ts` — nhất quán 100% qua 10 entity
- Server Action: `verifyOwner() → safeParse() → revalidatePath() → trả Result<T> discriminated union`
- Form: `useForm + zodResolver` + `errors[field].message` — đồng nhất
- Toast: chỉ `sonner` — 57 chỗ, 0 lệch
- Modal bottom-sheet mobile + centered desktop: `items-end sm:items-center` + `rounded-t-3xl sm:rounded-3xl`

⚠️ **Anti-pattern:**

| File | Vấn đề | Vi phạm rule |
|---|---|---|
| [app/dashboard/page.tsx:34](app/dashboard/page.tsx#L34) | `let payments: any[] = []` | Không dùng `any` |
| [components/CommunityPage.tsx:1392](components/CommunityPage.tsx#L1392) | `createClient(...)` trực tiếp trong component | Không gọi Supabase trực tiếp |
| [components/CommunityPage.tsx](components/CommunityPage.tsx) | 2147 dòng | Component nên < 200 dòng |
| [components/ProfileSetupWizard.tsx](components/ProfileSetupWizard.tsx) | 770 dòng + có upload ảnh riêng (không dùng `MultiImageUpload` chung) | nt |

📦 **Helper có thể tách:**
- **`<Modal>` chung** — 5 chỗ implement thủ công cùng pattern (RoomList, CreateTenantModal, TenantPaymentsClient, ExpensesClient, CreateInvoicesWizard)
- **`MultiImageUpload`** (đã có ở `components/ui/`) nhưng `ProfileSetupWizard` + `CommentInput` chưa dùng lại
- **`Result<T>` type** lặp lại trong mọi `actions.ts` → tách `lib/types/action-result.ts`

### 2.3 Sự phù hợp Requirement

| UC | Trạng thái | Ghi chú |
|---|---|---|
| UC-01 Tạo tài khoản + onboarding | ✅ | `first-login`, `ProfileSetupWizard` |
| **UC-02 Nhiều khách/phòng** | ❌ | Schema chỉ 1 phòng = 1 user — **oversight, cần sửa sớm** (xác nhận với user) |
| UC-03 Chuyển đi | ✅ | `move-requests` |
| UC-04 Khách đến chơi | ✅ | `guests` |
| **UC-05 Cảnh báo nợ** | ❌ | Schema (`has_debt`) + settings có, **không có cron/UI/notify** — quên, cần tạo T-016 |
| UC-06 Khách thanh toán | ✅ | T-014 |
| UC-07 Archive 2 năm | ✅ | Edge Function `archive-old-tenants` |
| UC-08 Nhập chỉ số | ✅ | `/admin/utilities` |
| UC-09 Tạo HĐ | ✅ | `calculateInvoiceForRoom` |
| UC-10 Khách báo TT | 🟡 | UI OK, **thiếu notification cho admin** |
| UC-11 Admin duyệt | 🟡 | 3 nút OK, **thiếu notification cho tenant** |
| UC-12 Expenses | ✅ | T-015 |
| UC-13 Báo cáo | ✅ | T-015 |
| UC-14 PDF | ✅ | Be Vietnam Pro font |

⚠️ **Lệch lén (thiếu so với requirement):**
1. UC-02 schema không support many-to-many room ↔ tenant
2. UC-05 cảnh báo nợ thiếu cron flag + badge UI + notification
3. T-014 thiếu insert vào `notifications` (so với T-009 đã có)
4. [lib/db/invoices.ts:63](lib/db/invoices.ts#L63) `numPeople = roomWithTenant?.tenant_id ? 1 : 0` — sai khi schema chuyển sang multi-tenant

❌ **Thừa lén:** không phát hiện

### 2.4 Performance

| Route | First Load JS | Status |
|---|---|---|
| `/community` | 201 kB | 🐌 vượt 200KB |
| `/chat`, `/admin/finance/expenses`, `/rooms`, `/tenant/payments`, `/admin/settings` | 135–157 kB | 🟡 |
| Còn lại | 87–110 kB | ⚡ |

⚡ **Tốt:**
- Shared chunks ~87 kB (ổn)
- Tất cả `lib/db/*.ts` dùng `select(cụ thể)` với join nested
- `useMemo` dùng đúng (`RoomList`, `MeterReadingTable`)

🐌 **Cần tối ưu:**
- [app/admin/utilities/page.tsx:38](app/admin/utilities/page.tsx#L38) `Promise.all(rooms.map(getPreviousReading))` — N query (1/room). 4 phòng OK, nhiều dãy trọ sẽ chậm
- `calculateInvoicesPreview` ([lib/db/invoices.ts](lib/db/invoices.ts)) — mỗi phòng ~4 queries
- KHÔNG resize/compress ảnh trước upload — 5MB sao kê × nhiều → tốn quota Supabase free 1GB
- `<img>` thô (5 chỗ) thay vì `next/image`

---

## 3. Q&A với user

| Câu hỏi | Trả lời |
|---|---|
| UC-02 multi-tenant: cố ý hay oversight? | **Oversight, cần sửa sớm** |
| UC-05 cảnh báo nợ: quên hay cố ý? | **Quên — cần tạo T-016** |
| T-014 thiếu notification | **Sửa nhỏ trong action items** |
| Skills (data-layer / server-action / ui-pattern...) | **Tạo 2 skill quan trọng** (data-layer-pattern + server-action-pattern) |

---

## 4. Action items theo độ ưu tiên

### 🔴 Phải làm trước Module 3 (Giấy tờ)

1. **T-014b — Thêm notification cho payment proof flow**
   - Insert vào `notifications` khi `createPaymentProof` (sender: tenant, receiver: owner, type: `payment_reminder`)
   - Insert vào `notifications` khi `approvePaymentProof` (sender: owner, receiver: tenant, type: `payment_confirmed`)
   - Insert vào `notifications` khi `rejectPaymentProof` (sender: owner, receiver: tenant, kèm reason)
   - File: [lib/db/payment-proofs.ts](lib/db/payment-proofs.ts) — thêm như pattern [lib/db/move-requests.ts](lib/db/move-requests.ts)

2. **T-016 — UC-02 Multi-tenant schema refactor** ⚠️ scope lớn
   - Tạo bảng `room_tenants(room_id, user_id, joined_at, left_at NULL)`
   - Migrate `rooms.tenant_id` → `room_tenants`
   - Sửa `lib/db/rooms.ts`, `lib/db/tenants.ts` để support nhiều khách
   - Sửa `calculateInvoiceForRoom` để count đúng `numPeople`
   - Sửa UI tenant để hiển thị danh sách khách trong phòng
   - **Dependencies:** đụng nhiều task cũ — phải verify lại T-007/T-008/T-013
   - Ước lượng: 6–8 giờ
   - Đề xuất tạo `todo.016-multi-tenant-schema.md`

3. **T-017 — UC-05 Cảnh báo nợ quá hạn**
   - Edge Function `flag-overdue-debts` chạy daily (cron `0 1 * * *`)
   - Logic: với mỗi user role=tenant có invoice (status≠'paid', due_date + `overdue_warning_days` < today) → set `users.has_debt = true`, insert notification
   - Logic reset: trong `approvePaymentProof`, nếu mọi invoice của user đó đã paid → set `has_debt = false`
   - Badge UI trên tenant card + room card khi `has_debt = true`
   - Tăng cấp độ badge: vàng (< overdue_remind_interval), cam, đỏ
   - Ước lượng: 4–5 giờ
   - Đề xuất tạo `todo.017-canh-bao-no.md`

4. **Quick fix: bỏ `any` ở dashboard**
   - File: [app/dashboard/page.tsx:34](app/dashboard/page.tsx#L34) `let payments: any[] = []`
   - Vi phạm rule CLAUDE.md, fix khi refactor dashboard dùng `invoices` thay `payments`

### 🟡 Nên làm trong Module 3 (Giấy tờ)

5. **Tạo 2 skills**
   - `.claudes/skills/data-layer-pattern.md` — từ 10 entity hiện có
     - Pattern `lib/db/<entity>.ts` (1 file/entity, named exports `getX`, `getXById`, `createX`, `updateX`, `deleteX`, error handling tiếng Việt)
     - Pattern `lib/schemas/<entity>.ts` (Zod schema + `z.infer` type)
   - `.claudes/skills/server-action-pattern.md`
     - `verifyOwner()`/`verifyAuth()` helper
     - `Result<T>` discriminated union
     - `safeParse` → trả `error.issues[0].message`
     - `revalidatePath` đúng chỗ

6. **Tách `<Modal>` chung** — `components/ui/Modal.tsx`
   - Refactor 5 chỗ: RoomList, CreateTenantModal, TenantPaymentsClient, ExpensesClient, CreateInvoicesWizard
   - Giảm ~150 dòng duplicate

7. **`ProfileSetupWizard` dùng `MultiImageUpload`** — bỏ logic upload riêng

### 🟢 Có thể làm sau

8. **Refactor `CommunityPage.tsx` (2147 dòng)** — chia thành sub-components
   - Loại bỏ `createClient` trực tiếp trong component
   - Để Module 6 (Cộng đồng) cải tiến sau theo lộ trình giai đoạn 4

9. **Image optimization trước upload** — resize JPEG về max 1600px / 70% quality trước khi POST → giảm 5MB → ~500KB

10. **N+1 fix** — `getPreviousReading` batch query bằng 1 SQL với window function (khi mở rộng > 10 phòng)

11. **Migrate `payments` legacy → `invoices`** — sau khi T-013 stable

12. **Cài vitest + unit test cho `lib/schemas/` + `lib/db/`** — task phát sinh từ T-004 chưa làm

---

## 5. Đề xuất skills nên viết

| Skill | Nguồn pattern | Ưu tiên |
|---|---|---|
| `data-layer-pattern.md` | T-004, T-007, T-013, T-014, T-015 | 🔴 |
| `server-action-pattern.md` | T-004 → T-015 (mọi action) | 🔴 |
| `ui-form-pattern.md` | T-005, T-008, T-012, T-013, T-014, T-015 | 🟡 |
| `migration-pattern.md` | T-002, T-006, T-011 (3 migrations major) | 🟢 |

---

## 6. Đề xuất cập nhật `.claudes/CLAUDE.md` / `todo-workflow.md` (KHÔNG tự sửa)

1. **Thêm rule** vào `todo-workflow.md` Hành vi 5:
   > KHÔNG rename `todo → done` nếu Bài học rút ra trong ACT trống (ít nhất 1 bullet)

2. **Thêm rule** vào `todo-workflow.md` Hành vi 4 (Verify):
   > Nếu Test Case nào có ⬜ kết quả thực tế → KHÔNG verify pass; phải log "không test được vì..."

3. **Thêm vào CLAUDE.md "6 Module và trạng thái"** ghi rõ status đã update:
   > Module 1 — 🟢 Done (cơ bản, chờ T-016 multi-tenant)
   > Module 2 — 🟢 Done (chờ T-014b notification, T-017 cảnh báo nợ)

4. **Thêm vào CLAUDE.md "Quy tắc code BẮT BUỘC"** sau "Supabase":
   > Khi cần modal/dialog → dùng `components/ui/Modal.tsx`; khi upload ảnh → dùng `MultiImageUpload`. KHÔNG implement lại.

---

## 7. Câu hỏi mở (chưa quyết)

- [ ] Khi T-016 multi-tenant landed: tiền cọc tính cho ai? (theo phòng — chia đều khi check-out, hay theo từng khách?)
- [ ] UC-02 nói "Tiền phòng tổng KHÔNG đổi" khi thêm khách — phù hợp với hiện tại (1 invoice/phòng/tháng). Nhưng nếu 1 khách trong phòng nợ, 2 khách kia không nợ → flag `has_debt` đặt ở user level hay invoice level?
- [ ] Migration `payments` → `invoices` có cần script chuyển dữ liệu cũ không (4 phòng có ít data, có thể xóa)?
- [ ] Quy ước: sau retrospective này, ai chịu trách nhiệm điền ACT — Claude tự động khi rename, hay user phải duyệt?

---

*Retrospective version: 1.0 · Tác giả: Claude · Ngày: 2026-05-16*
