# 🗂️ Todo: Nhập chỉ số điện nước + tạo hóa đơn

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Admin nhập chỉ số điện nước hàng tháng + tạo hóa đơn |
| **Mã task** | T-013 |
| **Module** | Thu chi |
| **Giai đoạn** | 2 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Workflow chính của module Thu chi: admin nhập chỉ số điện nước → hệ thống tự tính tiền → admin xem và sửa lại → tạo hóa đơn. Bao gồm UC-08 và UC-09.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Data layer:**
- [ ] Zod schemas: `meterReadingSchema`, `invoiceSchema`
- [ ] `lib/db/meter-readings.ts`:
   - createMeterReading, updateMeterReading (với audit log)
   - getMeterReadings(month, year)
   - getMeterReadingsByRoom(roomId, fromMonth, toMonth)
- [ ] `lib/db/invoices.ts`:
   - calculateInvoiceForRoom(roomId, month, year) — TÍNH HÓA ĐƠN dựa trên: rooms.price + electricity (kWh × rate) + water (theo mode) + 4 phí khác từ settings
   - createInvoices(month, year, roomIds[], adjustments[]) — bulk create
   - getInvoices(filters: month, year, status, roomId)
   - updateInvoice(id, data) — sửa thủ công
   - deleteInvoice(id) — chỉ nếu chưa có payment_proof
- [ ] Server Actions cho cả 2

**UI nhập chỉ số:**
- [ ] Trang `/admin/utilities` — chọn tháng/năm
- [ ] Bảng các phòng:
   - Cột: Phòng, Tháng trước (curr_kwh cũ), Tháng này (input), Tiêu thụ (auto-calc)
   - Tương tự cho nước nếu mode = per_m3
- [ ] Nút "Lưu tất cả"
- [ ] Hiển thị warning nếu phòng nào chưa nhập

**UI tạo hóa đơn:**
- [ ] Trang `/admin/finance/invoices` — danh sách hóa đơn
- [ ] Filter: tháng/năm, trạng thái, phòng
- [ ] Nút "Tạo hóa đơn tháng X"
- [ ] Wizard 2 bước:
   - Bước 1: Chọn phòng (auto check phòng có chỉ số, ko check phòng chưa có)
   - Bước 2: Preview hóa đơn từng phòng với khả năng sửa
- [ ] Mỗi row preview:
   - Tiền phòng (có thể giảm nếu chuyển đi giữa tháng)
   - Tiền điện (auto từ chỉ số × rate)
   - Tiền nước (auto theo mode)
   - 4 phí khác (theo settings)
   - Tổng (auto-sum)
   - Note + nút "Thêm phụ phí phát sinh"
- [ ] Nút "Lưu tất cả hóa đơn"
- [ ] Trang chi tiết hóa đơn `/admin/finance/invoices/[id]`

**❌ NGOÀI phạm vi:**
- Khách báo thanh toán → T-014
- Xuất PDF → T-015
- Báo cáo thu chi → T-015
- Edit chỉ số có audit trail UI — chỉ data layer, không UI riêng

### Deliverables

```
lib/db/meter-readings.ts
lib/db/invoices.ts
lib/schemas/meter-reading.ts
lib/schemas/invoice.ts

app/admin/utilities/
  page.tsx
  actions.ts
  MeterReadingTable.tsx

app/admin/finance/invoices/
  page.tsx
  actions.ts
  [id]/page.tsx
  CreateInvoicesWizard.tsx
  InvoicePreviewRow.tsx
  InvoiceList.tsx
```

### Dependencies
- **Cần xong trước:** T-011 (schema), T-012 (settings)
- **Chặn:** T-014 (thanh toán), T-015 (PDF + báo cáo)

### Ước lượng: 8-10 giờ

---

## 🔨 2. DO

1. [ ] Tạo Zod schemas
2. [ ] Implement `calculateInvoiceForRoom`:
   - Lấy room.price, room.electricity_rate (hoặc default từ settings)
   - Lấy meter_reading → tính electricity_amount = usage × rate
   - Tính water_amount theo mode hiện tại
   - Lấy 4 phí khác từ settings (chỉ tính nếu enabled)
   - Trả về object với từng dòng + total
3. [ ] Implement các hàm CRUD meter-readings + invoices
4. [ ] Server Actions
5. [ ] Trang `/admin/utilities`:
   - Server: fetch settings + danh sách phòng + meter readings tháng được chọn
   - Client: bảng input với debounce auto-save (tùy chọn) hoặc nút Lưu
6. [ ] Trang `/admin/finance/invoices`:
   - List view với filter + status badge
   - Click row → vào trang chi tiết
7. [ ] CreateInvoicesWizard:
   - Step 1: Multi-select phòng, default tick phòng có chỉ số
   - Step 2: Preview rows, mỗi row là 1 component InvoicePreviewRow
8. [ ] InvoicePreviewRow:
   - Hiển thị breakdown đầy đủ
   - Inline edit cho mỗi dòng
   - Tự re-calc total khi đổi
   - Nút "Thêm phụ phí" mở dialog nhỏ
9. [ ] Trang chi tiết hóa đơn `[id]/page.tsx`:
   - Xem breakdown
   - Nút Sửa (mở dialog)
   - Nút Xóa (confirm + check không có proof)
   - Section "Bằng chứng thanh toán" (sẽ dùng ở T-014)

---

## ✅ 3. CHECK

- [ ] Build pass
- [ ] Tính hóa đơn ĐÚNG (test với case có nhiều phí + phòng trống)
- [ ] Sửa chỉ số → log vào meter_reading_logs
- [ ] Không cho tạo hóa đơn trùng (1 phòng/tháng/năm = 1 hóa đơn)
- [ ] Format số tiền: "3,500,000 VNĐ"
- [ ] Tiếng Việt 100%

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-thu-chi.md` (UC-08, UC-09)

Đối chiếu:
- UC-08 bước 2: dùng curr_kwh tháng trước → prev_kwh tháng này (auto)
- UC-08 bước 4: cho phép sửa chỉ số + log history
- UC-09 bước 3: tự tính theo công thức đầy đủ (rent + electricity + water + 4 phí)
- UC-09 bước 4: cho phép sửa từng dòng + thêm phụ phí + note trước khi lưu
- "Phòng chưa có chỉ số → báo lỗi" → enforce ở wizard step 1
- "Phòng trống → checkbox tự chọn" → có UI option chưa?

---

## 🧪 5. VERIFY

### Test Case 1: Nhập chỉ số tháng mới
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/utilities, chọn 10/2026 | Bảng hiển thị 4 phòng | ⬜ |
| 2 | Phòng 101: prev_kwh=100 (tự lấy), nhập curr_kwh=150 | Tự tính usage=50 | ⬜ |
| 3 | Tương tự cho 3 phòng còn lại + nhập nước | OK | ⬜ |
| 4 | Lưu | Toast, DB có record | ⬜ |
| 5 | Sang tháng 11/2026 | prev_kwh = 150 (từ curr tháng 10) | ⬜ |

### Test Case 2: Tạo hóa đơn từ chỉ số
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /admin/finance/invoices, click "Tạo hóa đơn tháng 10" | Wizard mở | ⬜ |
| 2 | Step 1: hiện 4 phòng, chỉ phòng có chỉ số tick được | OK | ⬜ |
| 3 | Step 2: preview hiển thị tiền điện = 50×4000 = 200,000 | OK | ⬜ |
| 4 | Sửa tiền nước = 100,000 | Total auto re-calc | ⬜ |
| 5 | Thêm phụ phí "Sửa quạt": 50,000 | Total += 50,000 | ⬜ |
| 6 | Lưu | Tạo 4 records invoices, status=unpaid | ⬜ |

### Test Case 3: Tính toán đúng các trường hợp
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Phòng có electricity_rate=4500 (override) | Tiền điện = usage×4500 | ⬜ |
| 2 | Mode nước = per_person, phòng 3 người, rate=50000 | water_amount = 150,000 | ⬜ |
| 3 | Mode nước = fixed, rate=100000 | water_amount = 100,000 | ⬜ |
| 4 | Bật phí rác 20,000 + xe 100,000 | Cộng vào total | ⬜ |

### Test Case 4: Sửa chỉ số (audit)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Sửa chỉ số phòng 101 tháng 10 (lỡ nhập sai) | Toast | ⬜ |
| 2 | Query meter_reading_logs | Có record audit (old, new, reason) | ⬜ |

### Test Case 5: Không cho tạo trùng
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Đã tạo hóa đơn tháng 10 phòng 101 | OK | ⬜ |
| 2 | Cố tạo lại lần nữa | Báo lỗi "Đã có hóa đơn tháng này" hoặc khóa nút | ⬜ |

### Test Case 6: Xóa hóa đơn
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Xóa hóa đơn chưa có proof | OK | ⬜ |
| 2 | Xóa hóa đơn đã có proof | Báo lỗi: "Đã có bằng chứng thanh toán" | ⬜ |

### Edge cases
- [ ] curr_kwh < prev_kwh (đồng hồ reset?) → warning nhưng vẫn cho lưu
- [ ] Phòng trống cả tháng → vẫn cho tick để tạo HĐ (vd: có phí internet cố định)
- [ ] Tháng có ngày 31 vs 30 → có ảnh hưởng tính tiền không?
- [ ] Khách chuyển đi giữa tháng (status=moved_out) → vẫn hiện trong list khi tạo HĐ cho tháng đó

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — tính tiền sai = mất tiền thật

Cần xem:
- [ ] Công thức tính có đúng tất cả case không?
- [ ] UX wizard có dễ hiểu không (admin sẽ dùng mỗi tháng)?
- [ ] Có cách nào hoàn tác (undo) khi lưu nhầm không?

---

## 🎬 7. ACT

### Bài học rút ra
- **Audit log qua wrapper, không qua trigger DB** — `updateMeterReadingWithAudit` ([lib/db/meter-readings.ts:120](lib/db/meter-readings.ts:120)) so sánh field cũ/mới rồi insert `meter_reading_logs`, kiểm soát rõ trong code và dễ debug hơn DB trigger.
- **`calculateInvoiceForRoom` thuần (không side effect)** trả object breakdown ([lib/db/invoices.ts:57](lib/db/invoices.ts:57)); `createInvoices` (L202) mới ghi DB → tách tính toán & lưu, cho phép preview trong wizard mà không tạo record.
- **Block delete khi có dependency** ngay tại data layer ([lib/db/invoices.ts:297-298](lib/db/invoices.ts:297)): `deleteInvoice` check `payment_proofs.count > 0` trước → bảo vệ data integrity không phụ thuộc UI confirm.

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.013-nhap-chi-so-tao-hoa-don.md` → `done.013-...`
2. Commit: `done: T-013 nhập chỉ số + tạo hóa đơn`
3. Task tiếp: `todo.014-thanh-toan.md`
