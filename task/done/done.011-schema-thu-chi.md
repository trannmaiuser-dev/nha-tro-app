# 🗂️ Todo: Schema database cho module Thu chi

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Mở rộng database schema cho module Thu chi |
| **Mã task** | T-011 |
| **Module** | Thu chi |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Mở rộng schema để hỗ trợ toàn bộ use case Thu chi (UC-08 → UC-14). Bao gồm: chỉ số điện nước, hóa đơn (1/phòng/tháng), bằng chứng thanh toán, chi phí sửa chữa, và cấu hình giá cả linh hoạt.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**
- [ ] Mở rộng bảng `electricity_logs`: thêm field nước (prev/curr/usage m³)
- [ ] Mở rộng bảng `invoices`: thêm chi tiết phí (electricity, water, trash, parking, internet, over_capacity), `paid_amount`, `extra_items` JSONB
- [ ] Thêm enum `invoice_status`: `unpaid`, `partially_paid`, `paid`
- [ ] Thêm enum `water_billing_mode`: `per_m3`, `per_person`, `fixed`
- [ ] Thêm cột `electricity_rate` vào `rooms` (giá điện riêng từng phòng)
- [ ] Tạo bảng `payment_proofs`: tenant_id, invoice_id, amount, images JSONB, status, review info
- [ ] Tạo bảng `expenses`: type, amount, description, expense_date, receipt_images, room_id nullable
- [ ] Tạo enum `expense_type`: `repair`, `maintenance`, `purchase`, `general`, `other`
- [ ] Tạo bảng `meter_reading_logs` (audit khi sửa chỉ số)
- [ ] Mở rộng `app_settings`: thêm các key cho electricity rate, water mode, fees on/off
- [ ] Tạo migration `migrations-v12.sql`
- [ ] Tạo Supabase Storage buckets: `payment-proofs`, `expense-receipts`
- [ ] RLS policies cho 4 bảng mới
- [ ] Sinh lại TypeScript types

**❌ NGOÀI phạm vi:**
- CRUD logic — T-013
- UI — T-013, T-014, T-015
- PDF export — T-015

### Deliverables
- `supabase/migrations-v12.sql`
- Storage buckets có policy đúng
- `types/index.ts` cập nhật (thêm PaymentProof, Expense, MeterReadingLog, Invoice mở rộng)
- Tất cả bảng có RLS + policy

### Dependencies
- **Cần xong trước:** T-006 (đã có bảng invoices cơ bản)
- **Chặn:** T-012, T-013, T-014, T-015

### Ước lượng: 3-4 giờ

---

## 🔨 2. DO

1. [ ] Vẽ ERD: 4 bảng mới + relationship
2. [ ] Mở rộng `electricity_logs`:
   - Thêm: `prev_water_m3`, `curr_water_m3`, `water_usage_m3` (nullable, optional)
3. [ ] Mở rộng `invoices`:
   - Tách `electricity_amount`, `water_amount` ra riêng
   - Thêm: `electricity_log_id` (FK), `water_billing_mode`
   - Thêm: `trash_fee`, `parking_fee`, `internet_fee`, `over_capacity_fee`
   - Thêm: `extra_items` JSONB (phụ phí phát sinh: `[{label, amount}]`)
   - Thêm: `paid_amount` (default 0)
   - Thay `status` enum: `unpaid` / `partially_paid` / `paid`
4. [ ] Thêm `electricity_rate` (numeric) vào `rooms`, default từ settings
5. [ ] Tạo bảng `payment_proofs`:
   - id, invoice_id (FK), tenant_id (FK)
   - amount_reported (numeric)
   - proof_images (JSONB array of URLs)
   - note (text)
   - status: enum `pending` / `approved` / `rejected` / `partially_approved`
   - reviewed_by, reviewed_at, amount_approved, rejection_note
6. [ ] Tạo bảng `expenses`:
   - id, room_id (FK nullable — NULL = toàn nhà)
   - expense_type (enum)
   - amount (numeric)
   - description (text)
   - expense_date (date)
   - receipt_images (JSONB array, optional)
   - created_by (FK profiles), created_at
7. [ ] Tạo bảng `meter_reading_logs` (audit):
   - id, electricity_log_id (FK)
   - field_changed, old_value, new_value
   - changed_by, changed_at, reason
8. [ ] Mở rộng `app_settings`, insert các key mới:
   - meter_reading_day (default 1)
   - electricity_rate_default (4000)
   - water_billing_mode (per_m3), water_rate_per_m3 (15000), water_rate_per_person (50000), water_rate_fixed (100000)
   - trash_fee_enabled (false), trash_fee_amount (20000)
   - parking_fee_enabled (false), parking_fee_per_vehicle (100000)
   - internet_fee_enabled (false), internet_fee_amount (50000)
   - over_capacity_fee_enabled (false), over_capacity_threshold (3), over_capacity_fee_amount (200000)
9. [ ] Tạo trigger update `invoices.status` tự động khi `paid_amount` thay đổi
10. [ ] RLS:
    - Admin: full access tất cả bảng
    - Tenant: chỉ thấy payment_proofs của mình; KHÔNG xem được invoices
11. [ ] Tạo Storage buckets:
    - `payment-proofs` — tenant write của mình, admin đọc tất cả
    - `expense-receipts` — admin only
12. [ ] Chạy migration trên Supabase
13. [ ] `npx supabase gen types typescript` cập nhật types

---

## ✅ 3. CHECK

- [ ] `npm run build` không lỗi
- [ ] 4 bảng mới có ở Table Editor
- [ ] RLS bật trên tất cả + có policy
- [ ] 2 Storage buckets tồn tại + policy đúng
- [ ] Trigger update status hoạt động (test thủ công)
- [ ] Migration chạy lại được trên DB trống
- [ ] Types TypeScript đầy đủ

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/nha_tro_app_requirements.md`, `memory/usecase-thu-chi.md`

Đối chiếu:
- Mục 2: đơn giá điện theo từng phòng → có `rooms.electricity_rate` chưa?
- Mục 2: nước 3 mode → có enum + 3 rate trong settings chưa?
- Mục 3: 4 loại phí khác → có 4 cặp `_enabled` + `_amount` trong settings chưa?
- UC-10: nhiều ảnh thanh toán + thanh toán nhiều lần → `proof_images` JSONB, `paid_amount` tích lũy
- UC-12: expenses có thể NULL room_id (toàn nhà)

---

## 🧪 5. VERIFY

### Test Case 1: Schema tồn tại
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Mở Table Editor | Thấy 4 bảng mới | ⬜ |
| 2 | Click vào payment_proofs | Có đủ cột theo deliverables | ⬜ |
| 3 | Kiểm tra rooms | Có cột electricity_rate | ⬜ |

### Test Case 2: RLS hoạt động
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant A query invoices | Trả [] (chặn) | ⬜ |
| 2 | Tenant A query payment_proofs của mình | OK | ⬜ |
| 3 | Tenant A query payment_proofs của B | Trả [] | ⬜ |
| 4 | Admin query | Thấy tất cả | ⬜ |

### Test Case 3: Trigger auto status
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tạo invoice total=4000000, paid_amount=0 | status=unpaid | ⬜ |
| 2 | Update paid_amount=2000000 | status auto = partially_paid | ⬜ |
| 3 | Update paid_amount=4000000 | status auto = paid | ⬜ |

### Test Case 4: Storage buckets
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant upload ảnh vào payment-proofs | OK | ⬜ |
| 2 | Tenant đọc ảnh của mình | OK | ⬜ |
| 3 | Tenant đọc ảnh của user khác | Bị chặn | ⬜ |
| 4 | Admin đọc tất cả | OK | ⬜ |

### Test Case 5: App settings
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Query meter_reading_day | Trả 1 (default) | ⬜ |
| 2 | Query electricity_rate_default | Trả 4000 | ⬜ |
| 3 | Insert 13 settings keys mới | OK | ⬜ |

### Edge cases
- [ ] Xóa invoice có payment_proofs → block (FK)
- [ ] Insert proof_images với 0 ảnh → cho phép không? (đề xuất: yêu cầu ít nhất 1)
- [ ] Xóa room có invoices → cascade hay block?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — schema thu chi phức tạp, ảnh hưởng tài chính

Cần xem:
- [ ] JSONB extra_items có schema cố định để validate không?
- [ ] Có cần index cho query thường xuyên (invoice theo month/year/room)?
- [ ] Trigger status có race condition khi update concurrent?

---

## 🎬 7. ACT

### Quyết định kỹ thuật (lệch todo gốc, đã confirm với user 2026-05-16)

- **RLS**: Giữ nếp cũ — `DISABLE ROW LEVEL SECURITY` trên tất cả 5 bảng mới. Project dùng `SUPABASE_SERVICE_ROLE_KEY` từ server, bảo mật đặt ở tầng API route (verify role admin/tenant). Không viết policy.
- **Storage buckets**: Tạo thủ công qua Supabase Dashboard (nhất quán với buckets cũ: `chat-images`, `avatars`, `documents`, `community-images`). Hướng dẫn ghi ở comment đầu `migrations-v12.sql`.
- **Bảng `payments` cũ**: Giữ nguyên, không drop. Sống song song với `invoices` mới. Sau khi T-013 stable có thể tạo task riêng để migrate.
- **Settings keys**: Tổng 15 keys (todo ghi 13). Tính cả `over_capacity_threshold` (tham số cho fee) và `over_capacity_fee_amount`, theo usecase-thu-chi.md mục 4.

### Bước user cần làm để task thực sự DONE

1. Mở Supabase SQL Editor, paste & chạy `supabase/migrations-v12.sql`
2. Vào Storage → tạo 2 buckets: `payment-proofs` (Public: OFF), `expense-receipts` (Public: OFF)
3. Test trigger: `UPDATE invoices SET paid_amount = total WHERE id = '...'` → status tự đổi 'paid'
4. Verify Table Editor thấy 5 bảng + cột `rooms.electricity_rate`

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.011-schema-thu-chi.md` → `done.011-schema-thu-chi.md`
2. Commit: `done: T-011 schema thu chi`
3. Task tiếp: `todo.012-settings-thu-chi.md`
