# 📘 Use Case: Module Thu Chi

> Tài liệu nghiệp vụ chi tiết cho Module Thu chi (Giai đoạn 2)
> Tổng hợp từ buổi khảo sát · 2026-05-16

---

## 1. Tổng Quan

Module Thu chi bao gồm:
- **Thu**: tiền phòng + điện + nước + phí khác (rác, internet, xe...)
- **Chi**: sửa chữa, bảo trì, chi phí chung
- **Luồng**: chốt chỉ số → tạo hóa đơn → khách báo thanh toán → chủ duyệt
- **Báo cáo**: theo khoảng thời gian tùy chọn

**Nguyên tắc:** 1 hóa đơn / 1 phòng / 1 tháng (khách trong phòng tự chia với nhau).

---

## 2. Đơn Giá Điện Nước

### Điện
- **Cách tính:** 1 mức cố định cho cả tháng
- **Phạm vi:** Mỗi phòng có thể có giá riêng (lưu vào `rooms.electricity_rate`)
- **Đơn vị:** VNĐ / kWh
- **Lý do:** chủ trọ có thể chia phòng VIP / phòng thường có giá khác nhau

### Nước (linh hoạt 3 cách)
Mỗi tháng khi tạo hóa đơn, chủ chọn 1 trong 3 cách:

1. **Theo m³ tiêu thụ** — giống điện, có chỉ số đầu/cuối
2. **Theo đầu người** — mỗi người trong phòng X VNĐ/tháng
3. **Cố định / phòng / tháng** — X VNĐ bất kể bao nhiêu người

→ Cấu hình mặc định trong Settings, có thể override khi tạo từng hóa đơn.

---

## 3. Phí Khác Trong Hóa Đơn

Có thể bật/tắt + cấu hình trong Settings:

| Phí | Cách tính | Mặc định |
|---|---|---|
| Phí rác | Cố định / phòng / tháng | Tắt |
| Phí gửi xe | Theo xe (xe máy/ô tô) HOẶC theo đầu người | Tắt |
| Phí internet/wifi | Cố định / phòng / tháng | Tắt |
| Phụ phí quá người | Tăng X VNĐ nếu > N người | Tắt |

Mỗi phí có cấu hình riêng:
- Đơn giá
- Áp dụng cho tất cả phòng hay phòng cụ thể
- Bật/tắt

---

## 4. Settings (Cấu hình toàn cục)

Bổ sung vào bảng `app_settings`:

| Key | Default | Mô tả |
|---|---|---|
| `meter_reading_day` | 1 | Ngày trong tháng chốt chỉ số điện nước |
| `payment_due_day` | 5 | Ngày phải đóng tiền (đã có từ trước) |
| `overdue_warning_days` | 7 | Đã có |
| `overdue_remind_interval` | 5 | Đã có |
| `electricity_rate_default` | 4000 | Đơn giá điện mặc định (VNĐ/kWh) |
| `water_billing_mode` | "per_m3" | per_m3 / per_person / fixed |
| `water_rate_per_m3` | 15000 | Nếu mode = per_m3 |
| `water_rate_per_person` | 50000 | Nếu mode = per_person |
| `water_rate_fixed` | 100000 | Nếu mode = fixed |
| `trash_fee_enabled` | false | Bật phí rác |
| `trash_fee_amount` | 20000 | |
| `parking_fee_enabled` | false | |
| `parking_fee_per_vehicle` | 100000 | |
| `internet_fee_enabled` | false | |
| `internet_fee_amount` | 50000 | |
| `over_capacity_fee_enabled` | false | |
| `over_capacity_threshold` | 3 | > N người |
| `over_capacity_fee_amount` | 200000 | |

---

## 5. Quy Trình Use Case

### UC-08: Nhập chỉ số điện nước hàng tháng

```
1. Đến ngày `meter_reading_day` (vd: ngày 1):
   - Hệ thống gửi notification "Đến hạn chốt chỉ số tháng X"
   - (Không tự động lấy số — chủ phải nhập tay)

2. Chủ trọ vào /admin/utilities → Trang nhập chỉ số:
   - Chọn tháng/năm
   - Với mỗi phòng có khách:
     • Hiển thị chỉ số tháng trước (curr_kwh) → trở thành prev_kwh tháng này
     • Input: chỉ số mới (curr_kwh)
     • Tự tính usage = curr - prev
     • Nếu mode nước = per_m3: cũng nhập số m³

3. Save → tạo record `electricity_logs` cho mỗi phòng
4. Phòng nào chưa nhập → đánh dấu warning

5. Có thể sửa chỉ số sau (nếu nhập sai), nhưng phải log lại history
```

---

### UC-09: Tạo hóa đơn cho phòng

```
1. Chủ trọ vào /admin/finance/invoices → "Tạo hóa đơn tháng X"

2. Hệ thống hiển thị danh sách phòng:
   - ✅ Phòng có chỉ số tháng X → có thể tạo
   - ⚠️ Phòng chưa có chỉ số → báo lỗi
   - 🔘 Phòng trống → checkbox, chủ tự chọn có tạo không

3. Với mỗi phòng được chọn, hệ thống tự tính:
   - Tiền phòng = rooms.price (× số ngày nếu chuyển đi giữa tháng — chủ tự điều chỉnh)
   - Tiền điện = usage × rooms.electricity_rate
   - Tiền nước = theo mode đã chọn
   - Phí khác = theo settings
   - Tổng = sum tất cả

4. Trước khi save, chủ có thể:
   - Sửa từng dòng (vd: phòng X tháng này được giảm 200k vì sự cố)
   - Thêm note cho từng hóa đơn
   - Thêm dòng phụ phí phát sinh

5. Click "Lưu tất cả" → tạo records trong bảng `invoices`

6. Status mặc định mỗi hóa đơn: "unpaid"
   - Hệ thống tự set `due_date` = ngày `payment_due_day` của tháng sau
```

---

### UC-10: Khách báo đã thanh toán

```
1. Khách thuê nhận thông tin số tiền cần đóng (qua kênh ngoài app — chủ nhắn Zalo/SMS)
   → KHÁCH KHÔNG XEM ĐƯỢC HÓA ĐƠN TRONG APP

2. Khách chuyển khoản → chụp ảnh sao kê

3. Khách vào /tenant/payments → "Báo đã thanh toán":
   - Chọn phòng (nếu khách ở nhiều phòng, hiếm)
   - Chọn tháng (vd: "Tháng 10/2026")
   - Nhập số tiền đã chuyển
   - Upload nhiều ảnh chứng minh (JPG/PNG, có thể nhiều ảnh — vd: sao kê + chat zalo)
   - Ghi chú (tùy chọn)
   - Submit → tạo record `payment_proofs` với status="pending"

4. Notification gửi cho chủ trọ

5. Khách có thể xem trạng thái:
   - 🕒 Chờ duyệt
   - ✅ Đã duyệt
   - ❌ Bị từ chối (kèm lý do)

6. Khách CÓ THỂ báo nhiều lần cho cùng 1 hóa đơn (vd: trả 2 đợt)
```

---

### UC-11: Chủ duyệt thanh toán

```
1. Chủ vào /admin/finance/payments → danh sách proofs chờ duyệt

2. Mỗi proof hiển thị:
   - Khách báo: tên, phòng
   - Tháng hóa đơn
   - Số tiền khách báo
   - Tổng hóa đơn của tháng đó
   - Số tiền đã thanh toán trước (nếu có nhiều lần báo)
   - Số còn lại
   - Các ảnh chứng minh (xem to được)

3. Chủ kiểm tra → 1 trong 3 hành động:

   A. Duyệt đủ:
      - Cộng số tiền vào `invoices.paid_amount`
      - Nếu paid_amount >= total → status = "paid", paid_at = now
      - Nếu paid_amount < total → status = "partially_paid"
      - Xóa flag "has_debt" nếu đã đóng đủ
      - Notification cho khách: "Đã xác nhận"

   B. Duyệt 1 phần (chủ tự điều chỉnh số tiền):
      - Nhập số tiền chủ chấp nhận (vd: khách báo 2tr, chủ chỉ ghi nhận 1.5tr)
      - Notification cho khách kèm lý do điều chỉnh

   C. Từ chối:
      - Nhập lý do
      - Notification cho khách
      - Khách có thể báo lại với chứng minh khác
```

---

### UC-12: Chi phí sửa chữa, bảo trì

```
1. Chủ vào /admin/finance/expenses → "Thêm chi phí"

2. Form:
   - Loại: dropdown ("Sửa chữa", "Bảo trì", "Mua sắm", "Chi phí chung", "Khác")
   - Phòng liên quan: dropdown (có lựa chọn "Toàn nhà" = NULL)
   - Số tiền
   - Mô tả
   - Ngày phát sinh
   - Upload biên lai (TÙY CHỌN — không bắt buộc, có thể nhiều ảnh)

3. Submit → lưu vào bảng `expenses`

4. Expenses này KHÔNG vào hóa đơn của khách (chỉ là chi của chủ)
   - Chủ tự chịu, không tính cho khách
```

---

### UC-13: Báo cáo thu chi

```
1. Chủ vào /admin/finance/report

2. Filter:
   - Khoảng thời gian: date picker (từ ngày - đến ngày)
   - Phòng: chọn 1 hoặc tất cả

3. Hiển thị:
   ┌─────────────────────────────────────┐
   │ Tổng thu: 25,000,000 VNĐ            │
   │ Tổng chi: 3,500,000 VNĐ             │
   │ Lợi nhuận: 21,500,000 VNĐ           │
   ├─────────────────────────────────────┤
   │ Thu chia theo phòng:                │
   │  - Phòng 101: 5,000,000             │
   │  - Phòng 102: 6,500,000             │
   │  - ...                              │
   ├─────────────────────────────────────┤
   │ Chi chia theo loại:                 │
   │  - Sửa chữa: 2,000,000              │
   │  - Bảo trì: 1,500,000               │
   ├─────────────────────────────────────┤
   │ Hóa đơn chưa thu: 4 hóa đơn (8tr)   │
   │  - Phòng 103 tháng 9: 2tr (35 ngày) │
   │  - ...                              │
   └─────────────────────────────────────┘

4. Bảng chi tiết: list tất cả invoices + expenses trong khoảng thời gian

5. KHÔNG cần export Excel/CSV — chỉ xem trong app
```

---

### UC-14: Xuất hóa đơn PDF

```
1. Chủ vào /admin/finance/invoices → click vào 1 hóa đơn
2. Click "Xuất PDF"

3. PDF format đơn giản (không cần chuẩn Việt Nam):
   ┌─────────────────────────────────────┐
   │       HÓA ĐƠN TIỀN PHÒNG            │
   │       Tháng 10/2026                 │
   ├─────────────────────────────────────┤
   │ Phòng:        201                   │
   │ Người ở:      A, B, C               │
   │ Ngày tạo:     01/11/2026            │
   │ Hạn đóng:     05/11/2026            │
   ├─────────────────────────────────────┤
   │ Tiền phòng:           3,500,000     │
   │ Điện (50 kWh × 4000): 200,000       │
   │ Nước (8 m³ × 15000):  120,000       │
   │ Phí rác:              20,000        │
   │ ─────────────────────────────────   │
   │ TỔNG:                 3,840,000 VNĐ │
   ├─────────────────────────────────────┤
   │ Ghi chú: ...                        │
   └─────────────────────────────────────┘

4. Download file PDF với tên: hoa-don-phong-201-thang-10-2026.pdf
```

---

## 6. Phân Quyền

| Hành động | Chủ trọ | Khách thuê |
|---|---|---|
| Nhập chỉ số điện nước | ✅ | ❌ |
| Cấu hình Settings | ✅ | ❌ |
| Tạo hóa đơn | ✅ | ❌ |
| Xem hóa đơn | ✅ | ❌ |
| Xuất PDF hóa đơn | ✅ | ❌ |
| Báo đã thanh toán | ❌ | ✅ |
| Xem status thanh toán của mình | ❌ | ✅ |
| Duyệt thanh toán | ✅ | ❌ |
| Nhập chi phí (expenses) | ✅ | ❌ |
| Xem báo cáo thu chi | ✅ | ❌ |

---

## 7. Database Schema Mới (T-011 sẽ làm)

### Bảng `electricity_logs` (mở rộng từ T-002)
```
id, room_id, month, year,
prev_kwh, curr_kwh, kwh_usage,
prev_water_m3, curr_water_m3, water_usage_m3,
recorded_at, updated_at
```

### Bảng `invoices` (mở rộng)
```
id, room_id, month, year,
rent_amount,
electricity_amount, electricity_log_id (FK),
water_billing_mode, water_amount,
trash_fee, parking_fee, internet_fee, over_capacity_fee,
extra_items (JSONB) - cho phụ phí phát sinh
total,
paid_amount (DEFAULT 0),
status (unpaid, partially_paid, paid),
due_date, paid_at,
note, created_at
```

### Bảng `payment_proofs` (mới)
```
id, invoice_id, tenant_id (người báo),
amount_reported,
proof_images (JSONB array of URLs),
note,
status (pending, approved, rejected, partially_approved),
reviewed_by, reviewed_at,
amount_approved, rejection_note,
created_at
```

### Bảng `expenses` (mới)
```
id, room_id (nullable - NULL = toàn nhà),
expense_type (repair, maintenance, purchase, general, other),
amount,
description,
expense_date,
receipt_images (JSONB array, optional),
created_by, created_at
```

### Bảng `meter_reading_logs` (audit cho electricity_logs khi sửa)
```
id, electricity_log_id,
field_changed, old_value, new_value,
changed_by, changed_at, reason
```

---

## 8. Câu hỏi còn mở (≤5%)

- [ ] Khi xóa 1 hóa đơn → các payment_proofs liên quan xử lý thế nào? (đề xuất: không cho xóa nếu đã có proof)
- [ ] Hóa đơn cũ (> 1 năm) có archive hay vẫn show? (đề xuất: vẫn show, có filter)
- [ ] Nếu khách báo thanh toán cho hóa đơn đã "paid" → reject hay cho phép? (đề xuất: reject, hiện warning)
- [ ] Phòng đổi giá điện giữa tháng → tính sao? (đề xuất: dùng giá tại thời điểm chốt chỉ số)

---

*Tài liệu này phản ánh ~96% kỳ vọng. Cập nhật khi có thay đổi.*
