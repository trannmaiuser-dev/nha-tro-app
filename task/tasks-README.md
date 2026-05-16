# 📋 Quy Trình Quản Lý Task — Nhà Trọ App

Tài liệu này mô tả cách dùng hệ thống file todo cho dự án.

---

## 📁 Cấu trúc thư mục

```
tasks/
├── template/
│   └── TEMPLATE.todo.md              # Template gốc, copy ra khi tạo task mới
│
├── todo/                              # Task đang chờ hoặc đang làm
│   ├── todo.001-khoi-tao-du-an.md
│   ├── todo.002-dang-nhap.md
│   └── todo.003-quan-ly-phong.md
│
├── done/                              # Task đã hoàn thành (move sang đây)
│   └── done.001-khoi-tao-du-an.md
│
└── README.md                          # File này
```

---

## 🔄 Workflow — 5 bước PDCA + Verify

Mỗi task đi qua **5 phần**:

| Phần | Tên đầy đủ | Mục đích |
|---|---|---|
| **1. PLAN** | Lên kế hoạch | Định nghĩa **scope** rõ ràng: làm gì, không làm gì, đầu ra là gì |
| **2. DO** | Thực hiện | Code, build, ghi chú quá trình làm |
| **3. CHECK** | Tự kiểm tra | Self-check theo checklist code quality + chức năng |
| **4. VERIFY** | Kiểm thử | Manual test cases — thao tác cụ thể, kết quả mong đợi |
| **5. ACT** | Hành động sau | Rút bài học, tạo task phát sinh, đóng task |

Ngoài ra có **Human Review** (tùy chọn) — đánh dấu khi cần người khác xem xét.

---

## ✏️ Cách tạo task mới

```bash
# 1. Copy template
cp tasks/template/TEMPLATE.todo.md tasks/todo/todo.XXX-ten-task.md

# 2. Quy tắc đặt tên:
#    todo.<số-thứ-tự>-<tên-không-dấu-có-gạch>.md
#    Ví dụ: todo.005-tao-trang-hoa-don.md
```

Điền vào các phần PLAN trước khi bắt đầu DO.

---

## ✅ Cách đánh dấu task hoàn thành

Khi task xong toàn bộ 5 phần (PLAN → DO → CHECK → VERIFY → ACT):

```bash
# Đổi tên + chuyển folder
mv tasks/todo/todo.001-khoi-tao-du-an.md tasks/done/done.001-khoi-tao-du-an.md
```

Hoặc nếu chỉ đổi tên trong cùng folder:

```bash
mv todo.001-khoi-tao-du-an.md done.001-khoi-tao-du-an.md
```

**Tương lai khi tích hợp vào app:** App sẽ scan folder `tasks/`, đọc tất cả file:
- File bắt đầu bằng `todo.*` → hiện trong tab **Đang làm**
- File bắt đầu bằng `done.*` → hiện trong tab **Đã hoàn thành**

---

## 🎯 Nguyên tắc viết SCOPE

Scope là phần **quan trọng nhất** của PLAN. Quy tắc:

### ✅ Scope tốt
- Liệt kê cụ thể **3-7 việc** sẽ làm
- Mỗi việc là một hành động kiểm chứng được (verb + object)
- Có danh sách **NGOÀI scope** rõ ràng

### ❌ Scope tồi
- Quá rộng: "Làm trang quản lý phòng" — không rõ phạm vi đâu là biên
- Quá mơ hồ: "Cải thiện UX" — không kiểm chứng được
- Không nói NGOÀI scope là gì — dễ làm lan man

### Ví dụ tốt

> **Trong scope:**
> - Tạo form đăng nhập (email + password)
> - Validate input ở frontend
> - Gọi Supabase Auth để xác thực
> - Lưu session vào cookie
> - Redirect về dashboard sau khi đăng nhập
>
> **Ngoài scope:**
> - Đăng ký tài khoản mới → task riêng
> - Quên mật khẩu → task riêng
> - Đăng nhập bằng Google → task riêng

---

## 🧪 Nguyên tắc viết VERIFY

Mỗi **Test Case** phải có:

1. **Tên kịch bản** — mô tả ngắn gọn
2. **Các bước** — thao tác cụ thể (ai cũng làm theo được)
3. **Kết quả mong đợi** — câu khẳng định có thể đánh dấu Pass/Fail
4. **Kết quả thực tế** — đánh dấu khi test xong

### Quy tắc viết test case
- Mỗi bước = 1 thao tác đơn (không gộp nhiều việc)
- Kết quả mong đợi phải **quan sát được** (nhìn thấy / nghe thấy / đếm được)
- Tránh từ mơ hồ: "đẹp", "nhanh", "ổn" — thay bằng số đo cụ thể

### Ví dụ
| Bước | Thao tác | Kết quả mong đợi |
|---|---|---|
| 1 | Mở /login | Form hiện ra trong dưới 2 giây |
| 2 | Nhập email "abc" (không hợp lệ) | Hiện chữ đỏ "Email không hợp lệ" |
| 3 | Nhập email hợp lệ + password đúng | Chuyển sang /dashboard trong 3 giây |

---

## 👀 Khi nào cần HUMAN REVIEW?

Đánh dấu **cần review** khi:

- ✅ Liên quan đến **bảo mật** (đăng nhập, lưu thông tin nhạy cảm)
- ✅ Liên quan đến **tiền bạc** (tính hóa đơn, thu chi)
- ✅ Có **UI cho khách thuê** xem (không chỉ cho chủ trọ)
- ✅ Quyết định **kiến trúc** (database schema, cấu trúc folder)

**Không cần review** khi:

- Task setup hạ tầng đơn giản
- Sửa bug nhỏ, đổi text, đổi màu
- Refactor không thay đổi hành vi

---

## 📊 Bảng theo dõi tổng quan (tự cập nhật)

| Mã | Task | Module | Giai đoạn | Trạng thái |
|---|---|---|---|---|
| T-001 | Khởi tạo dự án Next.js + Supabase | Hạ tầng | 1 | 🔲 Todo |
| T-002 | Đăng nhập + phân quyền | Hạ tầng | 1 | — |
| T-003 | Thiết kế database schema | Hạ tầng | 1 | — |
| ... | ... | ... | ... | ... |

> Bảng này cập nhật thủ công sau mỗi task. Sau này khi app có trang Todo, sẽ tự sinh.

---

## 🔮 Tương lai — Tích hợp vào app

Khi đến giai đoạn xây dựng trang Todo trong app:

1. App scan folder `tasks/` qua API (vd: GitHub API hoặc filesystem)
2. Parse từng file md → trích metadata (mã, tên, trạng thái, scope...)
3. Hiển thị bảng todo với filter theo module/giai đoạn/ưu tiên
4. Nhấn vào task → mở chi tiết (render markdown đẹp)
5. Có nút "Đánh dấu hoàn thành" → đổi tên file `todo.*` → `done.*` qua git commit

---

*Quy trình version: 1.0 · Cập nhật: 2026-05-16*
