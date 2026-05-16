# 🗂️ Todo: CRUD khách thuê (data layer)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | CRUD khách thuê — data layer + Server Actions |
| **Mã task** | T-007 |
| **Module** | Quản lý khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Xây dựng data layer cho `tenants` và các bảng liên quan (emergency_contacts, bank_accounts). Bao gồm Zod schemas, query functions, Server Actions. Hỗ trợ UC-01 (khách mới) và UC-02 (thêm khách vào phòng).

### Phạm vi (Scope)

**✅ TRONG phạm vi:**
- [ ] Zod schemas: `tenantSchema`, `emergencyContactSchema`, `bankAccountSchema`
- [ ] Hàm `createTenantAccount(roomId, phone, idCardNumber)` — chủ tạo (UC-01 bước 1)
   - Tự sinh mật khẩu tạm = 6 số cuối CCCD
   - Tạo `auth.users` + `profiles` + `tenants` cùng lúc
   - Set `status = invited`, `is_profile_complete = false`
- [ ] Hàm `getAllTenants()`, `getTenantById(id)`, `getTenantsByRoomId(roomId)`
- [ ] Hàm `updateTenantProfile(id, data)` — khách điền thông tin lần đầu
- [ ] Hàm `addEmergencyContact(tenantId, data)` — đa contact
- [ ] Hàm `addBankAccount(tenantId, data)` — có thể nhiều tài khoản
- [ ] Hàm `searchTenants(query)` — tìm theo tên hoặc SĐT
- [ ] Hàm `markPasswordChanged(tenantId)` — đánh dấu đã đổi pass lần đầu
- [ ] Hàm `checkProfileComplete(tenantId)` — kiểm tra đủ field bắt buộc
- [ ] Server Actions cho tất cả hàm trên
- [ ] Verify role: admin tạo tenant, tenant chỉ update của mình

**❌ NGOÀI phạm vi:**
- UI form → T-008
- Move request → T-009
- Khách đến chơi → T-010
- Upload ảnh (Supabase Storage) — phần này tích hợp ở T-008

### Deliverables
- `src/lib/schemas/tenant.ts`
- `src/lib/db/tenants.ts`
- `src/app/admin/tenants/actions.ts`
- `src/app/tenant/profile/actions.ts` (khách tự update profile mình)
- `src/types/tenant.ts`
- Tests cơ bản

### Dependencies
- **Cần xong trước:** T-003 (auth), T-006 (schema)
- **Chặn task nào:** T-008, T-009, T-010

### Ước lượng: 4-5 giờ

---

## 🔨 2. DO

1. [ ] Tạo `src/types/tenant.ts` với types: Tenant, EmergencyContact, BankAccount, TenantStatus
2. [ ] Tạo Zod schemas trong `src/lib/schemas/tenant.ts`:
   - tenantSchema (bắt buộc: phone, id_card_number; optional: rest)
   - emergencyContactSchema (full_name, relationship, phone bắt buộc)
   - bankAccountSchema (bank_name, account_number, account_holder)
3. [ ] Viết `createTenantAccount` trong `src/lib/db/tenants.ts`:
   - Validate input
   - Tạo auth user qua `supabase.auth.admin.createUser` (cần service_role)
   - Insert profiles với role=tenant
   - Insert tenants với status=invited
   - Update rooms.status=occupied
   - Tất cả trong transaction (nếu có lỗi → rollback)
4. [ ] Viết các hàm query: getAll, getById, getByRoomId, search
5. [ ] Viết hàm update: updateTenantProfile (parse partial qua Zod)
6. [ ] Viết hàm liên quan emergency_contacts và bank_accounts
7. [ ] Viết hàm `checkProfileComplete`:
   - Đủ: phone, id_card, dob, hometown, occupation, workplace, avatar
   - Có ít nhất 1 emergency_contact với ảnh
   - Có ít nhất 1 bank_account
   - → set `is_profile_complete = true`
8. [ ] Server Actions:
   - `src/app/admin/tenants/actions.ts` — admin tạo, sửa, xóa
   - `src/app/tenant/profile/actions.ts` — tenant tự sửa
9. [ ] Tests schema (vitest):
   - Valid input pass
   - Missing required → fail
   - Invalid phone format → fail

---

## ✅ 3. CHECK

- [ ] `npm run build` không lỗi
- [ ] Không gọi Supabase direct ngoài `src/lib/db/`
- [ ] Service_role key chỉ dùng trong `createTenantAccount`, dùng env var
- [ ] Mọi Server Action verify role trước khi exec
- [ ] Error message tiếng Việt
- [ ] Test pass

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-quan-ly-khach-thue.md`

Đối chiếu:
- UC-01: Quy trình tạo tài khoản + mật khẩu mặc định "6 số cuối CCCD" có đúng không?
- Mục 2 (thông tin bắt buộc): schema có đủ không?
- Emergency contact có "ảnh chân dung" để camera AI nhận diện sau không?
- Bank account có lưu đầy đủ không?

---

## 🧪 5. VERIFY

### Test Case 1: Tạo tài khoản khách mới (UC-01)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Admin gọi createTenantAccount(roomId, "0901234567", "012345678901") | success | ⬜ |
| 2 | Kiểm tra auth.users | Có row mới với phone | ⬜ |
| 3 | Kiểm tra profiles | role=tenant, full_name=null | ⬜ |
| 4 | Kiểm tra tenants | status=invited, is_profile_complete=false | ⬜ |
| 5 | Kiểm tra rooms | status=occupied | ⬜ |
| 6 | Đăng nhập với SĐT + mật khẩu "678901" | OK | ⬜ |

### Test Case 2: Validation
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | createTenantAccount với phone="abc" | Lỗi: "Số điện thoại không hợp lệ" | ⬜ |
| 2 | createTenantAccount với CCCD < 9 số | Lỗi tiếng Việt | ⬜ |
| 3 | createTenantAccount với roomId không tồn tại | Lỗi: "Phòng không tồn tại" | ⬜ |

### Test Case 3: Khách update profile (UC-01 bước 3)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Đăng nhập tenant invited | OK | ⬜ |
| 2 | Gọi updateTenantProfile với đầy đủ field | success | ⬜ |
| 3 | Thêm emergency_contact với ảnh | OK | ⬜ |
| 4 | Thêm bank_account | OK | ⬜ |
| 5 | Tự động checkProfileComplete | is_profile_complete=true, status=active | ⬜ |

### Test Case 4: Phân quyền
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant A gọi getTenantById(B.id) | RLS chặn, trả null hoặc lỗi | ⬜ |
| 2 | Tenant A gọi updateTenantProfile(B.id, ...) | Lỗi 403 | ⬜ |
| 3 | Admin truy vấn tất cả | OK | ⬜ |

### Test Case 5: Thêm khách vào phòng đã có người (UC-02)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Phòng A có tenant X | OK | ⬜ |
| 2 | createTenantAccount thêm Y vào phòng A | success | ⬜ |
| 3 | getTenantsByRoomId(A.id) | Trả 2 người | ⬜ |
| 4 | rooms.status vẫn là "occupied" | OK | ⬜ |

### Edge cases
- [ ] Tạo 2 tenant cùng SĐT → reject
- [ ] Tạo với phone đã có trong auth.users → reject
- [ ] Tenant chưa đổi mật khẩu → có flag riêng để middleware redirect không?
- [ ] Race condition khi 2 admin cùng tạo tenant cho 1 phòng?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — auth + role là phần nhạy cảm

Cần xem:
- [ ] createTenantAccount có rollback đúng khi fail giữa chừng không?
- [ ] Service_role key có lộ ra client không?
- [ ] Pattern Server Action có chuẩn để T-008 dùng không?

---

## 🎬 7. ACT
- _(điền sau)_

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.007-crud-khach-thue.md` → `done.007-crud-khach-thue.md`
2. Commit: `done: T-007 CRUD khách thuê data layer`
3. Task tiếp: `todo.008-ui-khach-thue.md`
