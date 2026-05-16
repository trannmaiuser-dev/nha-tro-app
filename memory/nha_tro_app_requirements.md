# 📋 Tài liệu Kỳ Vọng — Web App Quản Lý Nhà Trọ

> Tổng hợp từ buổi khảo sát nhu cầu · Tháng 5/2026

---

## 1. Tổng Quan Dự Án

| Thông tin | Chi tiết |
|---|---|
| Loại sản phẩm | Web app (responsive, không cần app mobile riêng) |
| Quy mô hiện tại | 4 phòng trọ |
| Mục tiêu tương lai | Mở rộng ra nhiều dãy trọ khác |
| Ngôn ngữ giao diện | Tiếng Việt hoàn toàn |
| Phong cách UI | Màu sắc, thân thiện — kiểu app Việt |
| Cách tiếp cận | Claude viết code, chủ trọ chạy theo hướng dẫn |

---

## 2. Người Dùng

### Chủ trọ (Admin)
- Thiết bị: máy tính laptop, điện thoại Android/iPhone, tablet
- Quyền: toàn quyền quản lý toàn bộ hệ thống
- Hiện tại chưa có hệ thống quản lý nào

### Khách thuê (User)
- Thiết bị: điện thoại (truy cập web — cần mobile-first)
- Quyền hạn:
  - Xem hóa đơn của phòng mình
  - Xem lịch sử đóng tiền
  - Tham gia khu vực cộng đồng (đăng bài, chat, lịch chung)
  - Nhắn tin báo sự cố trực tiếp trong app

---

## 3. Các Module Chính

### 🏠 Module 1 — Quản Lý Phòng & Khách Thuê *(Ưu tiên số 1)*
- Quản lý 4 phòng (có thể mở rộng sau)
- Thông tin từng phòng: trạng thái (trống / có người), giá thuê, ngày vào ở, tiền đặt cọc
- Thông tin khách thuê: họ tên, số điện thoại, ngày thuê
- Lịch sử thuê phòng
- Tìm kiếm nhanh theo tên khách

---

### 💰 Module 2 — Thu Chi
- **Thu:**
  - Tiền thuê phòng hàng tháng
  - Tiền điện / nước (chủ tự nhập chỉ số tay, hệ thống tự tính ra tiền)
- **Chi:**
  - Chi phí sửa chữa, bảo trì
- **Tính năng:**
  - Xuất hóa đơn ra PDF để lưu / in
  - Theo dõi đã thu / chưa thu từng phòng
  - Thống kê thu chi theo tháng / năm
  - Ghi chú / sự cố từng phòng

---

### 📄 Module 3 — Giấy Tờ
Lưu trữ file scan (ảnh / PDF) cho:
- CCCD / hộ chiếu khách thuê
- Hợp đồng thuê phòng
- Ảnh phòng / biên bản bàn giao
- Giấy tờ nhà (sổ đỏ, giấy phép...)

Tính năng: tìm kiếm theo phòng hoặc theo tên khách

---

### 📷 Module 4 — Camera AI Nhận Diện Khuôn Mặt
- **Phần cứng:** Webcam USB (~300k) hoặc IP Camera WiFi (~500-800k) — chưa có, mua sau
- **Tính năng:**
  - Điểm danh / xác nhận có mặt khách thuê
  - Ghi lại lịch sử ra vào
  - Cảnh báo người lạ (người chưa đăng ký trong hệ thống)
- **Kỹ thuật:** Face-api.js chạy trên trình duyệt, không cần server AI riêng

> ⚠️ Module này xây dựng ở giai đoạn cuối (phức tạp nhất)

---

### 🔔 Module 5 — Thông Báo (Nội Bộ)
Hiển thị trong app, không gửi ra Zalo / SMS / email:
- Thông báo hóa đơn hàng tháng cho khách
- Cảnh báo nợ quá hạn
- Nhắc gia hạn hợp đồng sắp hết hạn
- Cảnh báo người lạ từ camera

---

### 🏘️ Module 6 — Cộng Đồng (Tính Năng Đặc Biệt)
Khu vực sinh hoạt chung giữa chủ và khách thuê:
- **Bảng thông báo chung:** chủ đăng, khách đọc
- **Đăng bài / bình luận:** khách có thể tương tác (kiểu mini Facebook)
- **Chat nhóm:** giữa chủ trọ và tất cả khách thuê
- **Bảng kế hoạch chung:** lịch dọn vệ sinh, sự kiện nhà trọ

---

## 4. Dashboard (Màn Hình Chính — Chủ Trọ)

Hiển thị ngay khi đăng nhập:
- Tổng quan: số phòng trống / đang thuê
- Tổng tiền đã thu / chưa thu tháng này
- Danh sách việc cần làm hôm nay (nhắc lịch, thu tiền...)
- Truy cập nhanh vào 6 module

---

## 5. Báo Cáo Sự Cố

- Khách nhắn tin trực tiếp trong app để báo sự cố (hỏng điện, tắc nước...)
- Chủ trọ nhận thông báo trong app

---

## 6. Giao Diện

| Yếu tố | Chi tiết |
|---|---|
| Phong cách | Màu sắc, thân thiện, kiểu app Việt |
| Ngôn ngữ | Tiếng Việt hoàn toàn |
| Trang chủ trọ | Ưu tiên desktop, dùng được trên mobile |
| Trang khách thuê | Mobile-first (khách dùng điện thoại là chính) |

---

## 7. Kiến Trúc Kỹ Thuật

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Frontend | Next.js + Tailwind CSS | Phổ biến, dễ học, dễ mở rộng |
| Deploy | Vercel | Miễn phí, tự động |
| Database | Supabase (PostgreSQL) | Miễn phí đến 500MB, dễ dùng |
| Auth | Supabase Auth | Tích hợp sẵn, phân quyền rõ |
| Lưu file | Supabase Storage | Lưu ảnh CCCD, PDF hợp đồng... |
| Logic / Thông báo | Supabase Edge Functions | Tự động nhắc lịch, tính hóa đơn |
| Camera AI | Face-api.js | Chạy trên trình duyệt, không tốn server |

---

## 8. Chi Phí Vận Hành

| Giai đoạn | Chi phí | Ghi chú |
|---|---|---|
| Hiện tại (4 phòng) | **0đ/tháng** | Supabase Free + Vercel Free |
| Khi mở rộng nhiều dãy | ~$25/tháng (~650k) | Supabase Pro khi vượt 500MB |
| Ngân sách chấp nhận | Dưới 200k/tháng | ✅ Đạt được trong dài hạn |

---

## 9. Lộ Trình Xây Dựng

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| **1** | Khung app + đăng nhập + quản lý phòng & khách thuê | 🔲 Chưa bắt đầu |
| **2** | Thu chi + xuất hóa đơn PDF + thông báo nội bộ | 🔲 Chưa bắt đầu |
| **3** | Giấy tờ + trang khách thuê (mobile-first) | 🔲 Chưa bắt đầu |
| **4** | Cộng đồng: chat · đăng bài · lịch chung · báo sự cố | 🔲 Chưa bắt đầu |
| **5** | Camera AI nhận diện khuôn mặt | 🔲 Chưa bắt đầu |

---

## 10. Những Điều Cần Quyết Định Sau

- [ ] Tên app / thương hiệu
- [ ] Màu chủ đạo cụ thể (hiện tại: "màu sắc, thân thiện")
- [ ] Giá điện / nước áp dụng (đơn giá mặc định)
- [ ] Mua camera: USB hay IP WiFi?
- [ ] Tên miền riêng (domain) hay dùng domain Vercel miễn phí?

---

*Tài liệu này phản ánh ~97% kỳ vọng được khảo sát. Cập nhật khi có thay đổi.*
