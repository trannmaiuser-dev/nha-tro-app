# 🗂️ Todo: Mở rộng database schema cho khách thuê

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Mở rộng database schema cho module Khách thuê |
| **Mã task** | T-006 |
| **Module** | Quản lý khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Mở rộng schema để hỗ trợ toàn bộ use case khách thuê (UC-01 → UC-07). Bao gồm: thông tin chi tiết khách, người thân, ảnh, tài khoản ngân hàng, yêu cầu chuyển đi, khách đến chơi, cấu hình cảnh báo nợ.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**
- [ ] Mở rộng bảng `tenants`: thêm field CCCD, ngày sinh, quê quán, nghề nghiệp, nơi làm việc, ảnh chân dung
- [ ] Tạo bảng `emergency_contacts`: liên hệ khẩn cấp + ảnh chân dung
- [ ] Tạo bảng `tenant_bank_accounts`: tài khoản ngân hàng khách
- [ ] Tạo bảng `move_requests`: yêu cầu chuyển đi (UC-03)
- [ ] Tạo bảng `guests`: khách đến chơi (UC-04)
- [ ] Tạo bảng `app_settings`: cấu hình toàn cục (ngày quá hạn, interval nhắc nhở)
- [ ] Mở rộng enum `tenant_status`: `invited`, `active`, `pending_move`, `moved_out`, `archived`
- [ ] Thêm cột `incomplete_profile`, `has_debt` vào bảng `profiles` hoặc `tenants`
- [ ] Cập nhật RLS cho tất cả bảng mới
- [ ] Tạo migration file `002_tenant_schema.sql`
- [ ] Sinh lại TypeScript types từ schema mới

**❌ NGOÀI phạm vi:**
- CRUD logic — T-007
- UI — T-008
- Bảng `invoices`, `payments` chi tiết — task module Thu chi (T-011+)
- Bảng `face_logs` cho camera — task giai đoạn 5

### Deliverables
- File `supabase/migrations/002_tenant_schema.sql`
- File `src/types/database.ts` được cập nhật
- Tất cả 6 bảng có RLS bật + policy cơ bản
- Sơ đồ ERD cập nhật (có thể vẽ tay hoặc Mermaid trong comment)

### Dependencies
- **Cần xong trước:** T-002 (schema gốc)
- **Chặn task nào:** T-007, T-008, T-009, T-010

### Ước lượng: 3-4 giờ

---

## 🔨 2. DO

1. [ ] Vẽ ERD mới (5 bảng mới + relationship với rooms, profiles)
2. [ ] Viết SQL mở rộng bảng `tenants`:
   - `id_card_number` (varchar 12)
   - `date_of_birth` (date)
   - `hometown` (text)
   - `occupation`, `workplace` (text)
   - `avatar_url` (text)
   - `status` (enum mới)
   - `is_profile_complete` (boolean default false)
   - `has_debt` (boolean default false)
3. [ ] Tạo bảng `emergency_contacts`:
   - id, tenant_id, full_name, relationship, phone, avatar_url
4. [ ] Tạo bảng `tenant_bank_accounts`:
   - id, tenant_id, bank_name, account_number, account_holder
5. [ ] Tạo bảng `move_requests`:
   - id, tenant_id, requested_date, reason, status (`pending`, `approved`, `rejected`), reviewed_by, reviewed_at, rejection_note
6. [ ] Tạo bảng `guests`:
   - id, tenant_id, room_id, guest_name, number_of_nights, note, created_at
7. [ ] Tạo bảng `app_settings`:
   - key (PK), value (jsonb), description
   - Insert mặc định: `overdue_warning_days=7`, `overdue_remind_interval=5`, `data_retention_years=2`, `default_password_pattern=last_6_id_card`
8. [ ] Tạo enum `move_request_status` (pending/approved/rejected)
9. [ ] Mở rộng enum `user_role` nếu cần
10. [ ] Viết RLS policies:
   - Admin: full access
   - Tenant: chỉ thấy data của mình (emergency_contacts, bank_accounts, move_requests, guests)
11. [ ] Tạo trigger tự động set `is_profile_complete = true` khi đủ field
12. [ ] Chạy migration trên Supabase
13. [ ] `npx supabase gen types typescript` để cập nhật types

---

## ✅ 3. CHECK

- [ ] `npm run build` không lỗi
- [ ] Tất cả 6 bảng có ở Table Editor
- [ ] RLS bật trên tất cả bảng mới
- [ ] Foreign keys đúng (cascade delete cho emergency_contacts khi xóa tenant)
- [ ] Migration file chạy lại được trên DB trống
- [ ] Types TypeScript export đầy đủ

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/nha_tro_app_requirements.md` + `memory/usecase-quan-ly-khach-thue.md`

Đối chiếu:
- Mục 2 (Thông tin khách thuê): có đủ field không?
- UC-03 (Chuyển đi): bảng `move_requests` có đủ field cho quy trình duyệt không?
- UC-04 (Khách đến chơi): bảng `guests` có đơn giản như requirement?
- Mục 6 (Cấu hình): bảng `app_settings` có đủ 5 tham số không?

---

## 🧪 5. VERIFY

### Test Case 1: Tạo tenant đầy đủ thông tin
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Insert tenant + emergency_contact + bank_account | OK | ⬜ |
| 2 | Kiểm tra is_profile_complete | true | ⬜ |
| 3 | Xóa tenant | emergency_contact cũng bị xóa (cascade) | ⬜ |

### Test Case 2: Move request workflow
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant tạo move_request status=pending | OK | ⬜ |
| 2 | Admin update status=approved | OK | ⬜ |
| 3 | Tenant truy vấn → chỉ thấy của mình | OK | ⬜ |

### Test Case 3: App settings
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Query `overdue_warning_days` | Trả 7 (default) | ⬜ |
| 2 | Update value | Lưu thành công | ⬜ |
| 3 | Tenant query settings | RLS chặn hoặc cho read-only | ⬜ |

### Edge cases
- [ ] Xóa room có tenants → cascade hay block?
- [ ] Tenant chưa có emergency_contact → is_profile_complete = false?
- [ ] Insert guest với number_of_nights = 0 → có constraint không?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — schema là quyết định khó sửa

Cần xem:
- [ ] Naming convention nhất quán?
- [ ] RLS có lỗ hổng không?
- [ ] Có thiếu index cho query thường xuyên không?

---

## 🎬 7. ACT

### Bài học
- Tên bảng thực tế khác spec (`tenant_profiles` thay `tenants`) do kiến trúc custom auth phone — cần update todo để khớp
- RLS tắt nhất quán toàn project — ghi rõ trong migration comment
- `app_settings` dùng JSONB value linh hoạt hơn TEXT, dễ lưu số, string, array
- Thêm `tenant_status` và `has_debt` vào `users` (không tạo bảng riêng) — phù hợp với flat schema hiện tại

### Task phát sinh
- _(trống)_

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.006-schema-khach-thue.md` → `done.006-schema-khach-thue.md`
2. Cập nhật trạng thái + ngày hoàn thành
3. Commit: `done: T-006 schema khách thuê`
4. Task tiếp: `todo.007-crud-khach-thue.md`
