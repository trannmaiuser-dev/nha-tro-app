# 🗂️ Template Task — PDCA + Verify

> Copy file này, đổi tên thành `todo.<ten-task>.md` để bắt đầu task mới.
> Khi hoàn thành, đổi tên thành `done.<ten-task>.md`.

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | `<điền vào>` |
| **Mã task** | `T-XXX` |
| **Module** | `<vd: Quản lý phòng / Thu chi / ...>` |
| **Giai đoạn** | `<1-5>` |
| **Ưu tiên** | 🔴 Cao / 🟡 Trung bình / 🟢 Thấp |
| **Ngày tạo** | `YYYY-MM-DD` |
| **Ngày hoàn thành** | `YYYY-MM-DD` |
| **Người thực hiện** | `<tên>` |
| **Trạng thái** | 🔲 Todo / 🟡 Đang làm / 🟢 Done |

---

## 🎯 1. PLAN — Lên kế hoạch

### Mục tiêu (Goal)
> Task này giải quyết vấn đề gì? Tại sao cần làm?

`<điền vào>`

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [ ] `<việc 1>`
- [ ] `<việc 2>`
- [ ] `<việc 3>`

**❌ NGOÀI phạm vi (không làm trong task này):**
- `<việc A — sẽ làm ở task khác>`
- `<việc B — chưa cần thiết>`

### Đầu ra mong đợi (Deliverables)
- `<file / màn hình / API endpoint / ...>`
- `<...>`

### Phụ thuộc (Dependencies)
- **Cần xong trước:** `<task T-XXX>` hoặc `<không có>`
- **Sẽ chặn task nào:** `<task T-YYY>` hoặc `<không có>`

### Ước lượng thời gian
`<vd: 2 giờ / nửa ngày / 1 ngày>`

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện
1. [ ] `<bước 1>`
2. [ ] `<bước 2>`
3. [ ] `<bước 3>`

### Ghi chú khi làm
> Ghi lại những gì phát sinh, quyết định kỹ thuật, vướng mắc...

- `<ghi chú>`

### Files / Folders thay đổi
```
src/
├── pages/
│   └── <file>.tsx       # mô tả
└── components/
    └── <file>.tsx       # mô tả
```

---

## ✅ 3. CHECK — Tự kiểm tra (Self-check)

> Checklist tự đánh giá sau khi DO xong. Đánh dấu ✅ mỗi mục.

### Code quality
- [ ] Code chạy được, không lỗi compile
- [ ] Không có console.error / warning đỏ
- [ ] Đã xóa code thử nghiệm / console.log debug
- [ ] Tên biến / hàm rõ nghĩa (tiếng Anh hoặc tiếng Việt không dấu)

### Chức năng
- [ ] Đầy đủ các deliverables liệt kê ở phần PLAN
- [ ] Không có chức năng nào bị bỏ sót
- [ ] Không thừa chức năng ngoài scope

### Trải nghiệm
- [ ] Giao diện hiển thị đúng trên desktop
- [ ] Giao diện hiển thị đúng trên điện thoại
- [ ] Tiếng Việt hiển thị đúng, không lỗi font/dấu
- [ ] Loading / error state có thông báo rõ ràng

---

## 🧪 4. VERIFY — Kiểm thử (Manual Test Cases)

> Mỗi case là một kịch bản cụ thể: thao tác → kết quả mong đợi.
> Đánh dấu ✅ Pass / ❌ Fail sau khi test.

### Test Case 1: `<tên kịch bản>`
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | `<vd: Mở trang /login>` | `<hiển thị form đăng nhập>` | ⬜ |
| 2 | `<vd: Nhập sai mật khẩu>` | `<hiện thông báo lỗi đỏ>` | ⬜ |
| 3 | `<vd: Nhập đúng mật khẩu>` | `<chuyển sang /dashboard>` | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail
**Ghi chú:** `<nếu fail, mô tả lý do>`

---

### Test Case 2: `<tên kịch bản>`
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | | | ⬜ |
| 2 | | | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases / Trường hợp đặc biệt
- [ ] `<vd: Đăng nhập với email không tồn tại>`
- [ ] `<vd: Nhấn submit liên tục nhiều lần>`
- [ ] `<vd: Mất mạng giữa chừng>`

---

## 👀 5. HUMAN REVIEW (Khi cần)

> Đánh dấu nếu task này cần được người khác xem lại trước khi đánh DONE.

- [ ] **Không cần** — task đơn giản, tự verify đủ
- [ ] **Cần review** — đánh dấu bên dưới:

### Cần review những gì?
- [ ] UI/UX có đẹp & dễ dùng không?
- [ ] Logic nghiệp vụ có đúng không?
- [ ] Có lỗ hổng bảo mật không?
- [ ] Code có dễ bảo trì sau này không?

### Người review
- **Reviewer:** `<tên>`
- **Ngày review:** `<YYYY-MM-DD>`
- **Kết quả:** ⬜ Approved / ⬜ Cần sửa
- **Feedback:**
  > `<nội dung phản hồi>`

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra
> Làm xong rồi nhìn lại — có gì học được? Lần sau nên làm khác đi không?

- `<bài học 1>`
- `<bài học 2>`

### Cải tiến cho task sau
- [ ] `<điều cần ghi nhớ cho task tiếp theo>`
- [ ] `<thay đổi template / quy trình nếu cần>`

### Task phát sinh
> Trong lúc làm phát hiện ra việc cần làm thêm? Ghi vào đây và tạo file todo mới.

- [ ] `<task mới phát sinh — tạo file todo.<ten>.md>`

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả phần trên đã ✅:

1. Đổi tên file: `todo.<ten-task>.md` → `done.<ten-task>.md`
2. Cập nhật trường **Trạng thái** ở đầu file → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit với message: `done: <ten-task>`

---

*Template version: 1.0 · Cập nhật: 2026-05-16*
