# 📘 Use Case: Quản lý Khách Thuê

> Tài liệu nghiệp vụ chi tiết cho Module 1 — phần Khách thuê
> Tổng hợp từ buổi khảo sát · 2026-05-16

---

## 1. Tổng Quan

Mỗi phòng có thể có **nhiều khách thuê** ở cùng. Tất cả khách trong phòng **bình đẳng** về mặt pháp lý, nhưng chủ trọ **chỉ ghi tổng tiền**, khách tự chia với nhau.

---

## 2. Thông Tin Khách Thuê

### Bắt buộc khi đăng ký
- Họ tên
- Số điện thoại *(dùng làm ID đăng nhập)*
- CCCD/CMND
- Ngày sinh
- Quê quán
- Nghề nghiệp
- Nơi làm việc
- **Thông tin người thân (liên hệ khẩn cấp):**
  - Họ tên
  - Quan hệ
  - Số điện thoại
  - **Ảnh chân dung** *(để camera AI cảnh báo người lạ sau này)*
- Ảnh chân dung khách
- Thông tin tài khoản ngân hàng

### Bổ sung sau (không bắt buộc lúc đầu)
- File hợp đồng thuê nhà (scan/ảnh)
- File giấy tạm trú (scan/ảnh)

---

## 3. Quy Trình Use Case

### UC-01: Khách mới vào thuê

```
1. Chủ trọ tạo tài khoản mới trên app:
   - ID = số điện thoại khách
   - Mật khẩu tạm = mật khẩu mặc định (vd: 6 số cuối CCCD)
   - Gán vào phòng cụ thể
   - Trạng thái phòng → "occupied"

2. Chủ trọ gửi link đăng nhập cho khách (qua Zalo/SMS)

3. Khách mở link, đăng nhập lần đầu:
   - Nhập SĐT + mật khẩu tạm
   - Bắt buộc đổi mật khẩu mới
   - Bắt buộc điền đầy đủ thông tin cá nhân
   - Upload ảnh chân dung
   - Khai báo người thân + ảnh chân dung người thân
   - Nhập thông tin tài khoản ngân hàng

4. Sau khi điền đủ → khách vào trang chính của mình
```

**Lưu ý:**
- Khách KHÔNG thể tự đăng ký từ đầu — phải qua chủ trọ tạo trước
- Nếu chưa điền đủ thông tin → mỗi lần vào app sẽ hiện form yêu cầu hoàn thiện

---

### UC-02: Thêm khách vào phòng đã có người

```
Trường hợp: phòng A đang có 2 người (X, Y), giờ thêm Z

1. Chủ trọ vào trang phòng A → "Thêm khách"
2. Tạo tài khoản cho Z (theo quy trình UC-01)
3. Z xuất hiện trong danh sách khách của phòng A (cùng với X, Y)
4. Tiền phòng tổng KHÔNG đổi (vẫn ghi tổng, khách tự chia)
5. Ngày bắt đầu thuê của Z được lưu riêng
```

---

### UC-03: Khách chuyển đi (1 người trong nhóm)

```
Trường hợp: phòng có A, B, C — A chuyển đi, B & C ở lại

1. KHÁCH (A) thực hiện:
   - Vào app → mục "Chuyển đi"
   - Nhập ngày dự kiến chuyển đi
   - Lý do (tùy chọn)
   - Submit → trạng thái A: "Chờ chủ xác nhận chuyển đi"

2. CHỦ TRỌ nhận thông báo trong app
   - Vào duyệt request của A
   - Có thể: Chấp nhận / Từ chối (kèm lý do)

3. Khi chủ chấp nhận:
   - A bị remove khỏi phòng (status: "moved_out")
   - Phòng vẫn "occupied" vì còn B, C
   - Lịch sử ở của A được lưu lại
   - Tài khoản A bị tạm khóa (không vào app được nữa)

4. Tiền thuê tháng A chuyển đi giữa chừng:
   - Chủ TỰ TÍNH theo số ngày (vd: A ở 10/30 ngày → tính 1/3 phần A)
   - Chủ NHẬP TAY vào hóa đơn
```

**Lưu ý quan trọng:** Hiện chỉ support case "A đi, B & C ở lại". Các case khác (cả phòng trả, đổi người) — task riêng sau.

---

### UC-04: Khách đến chơi / ngủ qua đêm

```
1. Khách thuê (đang ở phòng) vào app → "Báo khách đến chơi"
2. Form đơn giản:
   - Tên người đến chơi
   - Số đêm dự kiến (1-7 đêm)
   - Ghi chú (tùy chọn)
3. Submit → thông báo gửi tới chủ trọ
4. Chủ trọ nhận thông báo (không cần duyệt, chỉ để biết)
5. Lưu lại lịch sử để khi cần tra cứu
```

**Mục đích:** Khi camera AI nhận diện được người lạ trong các đêm đó → KHÔNG cảnh báo (vì đã có khai báo trước).

---

### UC-05: Quản lý nợ tiền thuê

```
1. Mỗi hóa đơn có "Ngày hạn thanh toán"
2. Quá hạn N1 ngày (N1 do chủ cài đặt, vd: 7 ngày):
   - Hệ thống tự đánh dấu khách "Nợ quá hạn"
   - Hiển thị badge cảnh báo trên thẻ khách + phòng
   - Gửi thông báo trong app cho chủ trọ
   - KHÔNG khóa tài khoản, khách vẫn dùng app bình thường

3. Sau mỗi N2 ngày (N2 do chủ cài đặt, vd: 5 ngày) mà chưa thanh toán:
   - Lặp lại thông báo cho chủ trọ
   - Tăng cấp độ cảnh báo (badge đổi màu: vàng → cam → đỏ)

4. Chủ trọ tự quyết định cách xử lý ngoài app (gặp khách, gọi điện...)
```

**Cấu hình:** Chủ trọ có thể chỉnh N1 và N2 trong Settings.

---

### UC-06: Khách thanh toán tiền

```
1. Khách KHÔNG xem được hóa đơn trong app (chỉ chủ trọ xem)
   → Khách nhận thông báo tiền cần đóng qua kênh khác (Zalo/gặp mặt)

2. Khách chuyển khoản → chụp màn hình
3. Khách vào app → "Báo đã thanh toán"
   - Chọn hóa đơn (chủ tạo sẵn danh sách hóa đơn của khách)
   - Upload ảnh chứng minh chuyển khoản
   - Nhập số tiền đã chuyển
   - Ghi chú (tùy chọn)
   - Submit → trạng thái hóa đơn: "Chờ chủ duyệt"

4. Chủ trọ nhận thông báo:
   - Xem ảnh chứng minh
   - So sánh với số tiền
   - Duyệt: ✅ Đã nhận / ❌ Từ chối (kèm lý do)

5. Khi duyệt thành công:
   - Hóa đơn → status: "Đã thanh toán"
   - Lưu ngày thanh toán + link ảnh chứng minh
   - Nếu khách đang "Nợ quá hạn" → tự động xóa cờ cảnh báo
```

---

### UC-07: Khách chuyển đi (sau khi rời hẳn)

```
Sau UC-03, khách đã được đánh dấu "moved_out":

1. Dữ liệu khách + lịch sử thuê được LƯU 2 NĂM
2. Sau 2 năm:
   - Hệ thống tự xóa: thông tin cá nhân chi tiết, ảnh chân dung
   - GIỮ LẠI: tên, ngày vào/ra, tổng tiền đã trả (cho thống kê)
3. Chủ trọ vẫn tra cứu được khách cũ trong "Lịch sử thuê" của từng phòng
```

---

## 4. Phân Quyền

| Hành động | Chủ trọ | Khách thuê |
|---|---|---|
| Tạo tài khoản khách mới | ✅ | ❌ |
| Xem thông tin của mình | ✅ | ✅ |
| Xem thông tin khách khác | ✅ | ❌ |
| Sửa thông tin của mình | ✅ | ✅ (giới hạn) |
| Yêu cầu chuyển đi | ❌ | ✅ |
| Duyệt yêu cầu chuyển đi | ✅ | ❌ |
| Báo khách đến chơi | ❌ | ✅ |
| Xem hóa đơn | ✅ | ❌ |
| Báo đã thanh toán | ❌ | ✅ |
| Duyệt thanh toán | ✅ | ❌ |
| Khóa tài khoản khách | ✅ | ❌ |
| Cài đặt thời gian cảnh báo nợ | ✅ | ❌ |

---

## 5. Trạng Thái (State) Khách Thuê

```
[invited]      → Chủ vừa tạo, chưa đăng nhập lần đầu
   ↓ (đăng nhập + đổi mật khẩu)
[active]       → Khách đang ở, sử dụng app bình thường
   ↓ (báo chuyển đi)
[pending_move] → Chờ chủ duyệt yêu cầu chuyển đi
   ↓ (chủ duyệt)
[moved_out]    → Đã rời, lưu lịch sử
   ↓ (sau 2 năm)
[archived]     → Xóa thông tin nhạy cảm, giữ data thống kê
```

Trạng thái phụ:
- `has_debt` — đang nợ tiền quá hạn (chồng lên active)
- `incomplete_profile` — chưa điền đủ thông tin

---

## 6. Cấu Hình (Chủ trọ tự chỉnh)

| Tham số | Default | Mô tả |
|---|---|---|
| `payment_due_day` | 5 | Ngày trong tháng phải đóng tiền |
| `overdue_warning_days` | 7 | Số ngày quá hạn → bắt đầu cảnh báo |
| `overdue_remind_interval` | 5 | Số ngày lặp lại nhắc nhở |
| `default_password_pattern` | "6 số cuối CCCD" | Pattern tạo mật khẩu tạm |
| `data_retention_years` | 2 | Số năm giữ dữ liệu sau khi khách chuyển đi |

---

## 7. Câu hỏi còn mở (cần quyết định khi build)

- [ ] Khi tài khoản khách bị khóa (sau khi chuyển đi), có giữ được lịch sử chat cộng đồng của họ không?
- [ ] Khách đổi SĐT → cần đổi ID đăng nhập như thế nào?
- [ ] Khách quên mật khẩu → quy trình reset?
- [ ] Có cần "Lịch sử thuê" hiển thị cho khách xem không (xem mình đã ở bao lâu)?
- [ ] Báo "khách đến chơi" — có cần ảnh người đến chơi không (để camera AI nhận diện)?

---

> 2 use case mới phát sinh trong quá trình test T-016 runtime.
> Append cuối file, sau UC-07 hiện có.

---

## UC-02b — Thêm khách thứ 2 vào phòng đã có người

**Actor:** Chủ nhà
**Pre-condition:** Phòng đã có ít nhất 1 khách (status='occupied')

**Flow:**
1. Chủ vào /admin/tenants hoặc /dashboard
2. Click "Thêm khách thuê" (button mới — hiện cả khi phòng occupied)
3. Chọn phòng đã có người trong dropdown — UI hiển thị "(đang N người)"
4. Nhập thông tin khách mới (SĐT, tên tùy chọn)
5. (Optional) Chủ chỉ định khách mới làm primary thay vì giữ primary cũ
6. Submit → nhận login link + password tạm
7. Gửi cho khách qua kênh riêng (SMS/Zalo)
8. Khách click link, tự fill profile như khách thứ nhất

**Rules:**
- KHÔNG cần khách hiện tại đồng ý (chủ duyệt là được)
- Khách mới mặc định is_primary=false (trừ khi chủ chỉ định)
- KHÔNG đóng cọc thêm (cọc theo phòng)
- Hóa đơn chưa thanh toán của phòng không bị ảnh hưởng
- Khách mới ở chung trên cùng hóa đơn (per_person nước sẽ + 1)

**Pass criteria:**
- room_tenants có row mới is_primary=false (hoặc true nếu chủ chỉ định), left_at=null
- Primary cũ giữ nguyên (hoặc đổi nếu chủ chỉ định khách mới làm primary)
- rooms.tenant_id KHÔNG đổi (D10) — trừ khi chủ chỉ định khách mới làm primary
- rooms.status vẫn 'occupied'
- Login link 7 ngày như UC-01

**Edge cases:**
- Phòng >= 6 người: cảnh báo nhưng vẫn cho thêm
- SĐT đã có tài khoản: từ chối "SĐT đã tồn tại"

**Implement:** T-019

---

## UC-08 — Chuyển phòng nội bộ

**Actor:** Cả chủ và khách (qua flow approval ngược chiều)

**Pre-condition (BẮT BUỘC kiểm tra):**
1. Ngày hiện tại là 1-5 trong tháng
2. Tất cả hóa đơn của khách ở phòng cũ có status='paid'
3. Phòng đích tồn tại và không phải 'maintenance'

**Flow 1 — Khách yêu cầu chuyển:**
1. Khách vào /tenant/move-request (hoặc tương đương)
2. Chọn "Chuyển sang phòng khác" thay vì "Chuyển đi hẳn"
3. Chọn phòng đích từ dropdown các phòng vacant/occupied
4. Nhập lý do
5. System validate pre-condition
6. Nếu fail → block + báo lý do cụ thể
7. Nếu pass → submit move-request với type='transfer'
8. Chủ vào /admin/move-requests → duyệt/từ chối

**Flow 2 — Chủ chủ động chuyển khách:**
1. Chủ vào /admin/tenants → chọn khách → "Chuyển phòng"
2. Chọn phòng đích
3. System validate pre-condition
4. Submit notification cho khách (type='transfer_proposal')
5. Khách nhận push → vào app accept/reject
6. Nếu accept → tự động thực hiện chuyển
7. Nếu reject → notification về cho chủ

**Logic chuyển (cả 2 flow đều dùng):**
```
1. removeTenantFromRoom(oldRoomId, userId)  -- set left_at, auto-promote nếu primary
2. addTenantToRoom(newRoomId, userId, isPrimary)  -- chủ chỉ định primary
```

**Rules:**
- KHÔNG chuyển hóa đơn — phải chốt hết phòng cũ trước (rule pre-condition)
- KHÔNG chuyển cọc — chỉ là move-out + move-in mới (rule pre-condition)
- "Đầu tháng" = ngày 1-5 hàng tháng (chốt)
- Nếu phòng cũ thành trống → tiền cọc trả cho người cuối đứng tên (UC-04 logic cũ)
- Nếu phòng mới chưa có người → khách thành primary tự động
- Nếu phòng mới có người → chủ chỉ định primary (UC-02b)

**Pass criteria:**
- Sau approve/accept:
  - room_tenants phòng cũ: row có left_at = NOW
  - room_tenants phòng mới: row mới với is_primary theo chỉ định
  - move_requests: status='approved' hoặc 'completed'
  - Notification cho cả 2 phía: thành công
- Phòng cũ status update tự động (vacant/occupied dựa trên count active còn)
- Phòng mới status update tự động (occupied)

**Schema cần thêm:**
- `move_requests.transfer_to_room_id` (uuid nullable, NULL = move-out cũ)
- `move_requests.initiated_by` ('owner' | 'tenant')
- `move_requests.type` (đã có hoặc cần thêm: 'move_out' | 'transfer')
- Notification type mới: 'transfer_proposal' (chủ → khách)

**Implement:** T-020


*Tài liệu này phản ánh ~96% kỳ vọng. Cập nhật khi có thay đổi nghiệp vụ.*
