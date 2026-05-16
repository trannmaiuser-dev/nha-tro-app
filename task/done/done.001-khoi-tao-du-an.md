# 🗂️ Todo: Khởi tạo dự án Next.js + Supabase

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Khởi tạo dự án Next.js + kết nối Supabase |
| **Mã task** | T-001 |
| **Module** | Hạ tầng (Infrastructure) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Người thực hiện** | Chủ trọ |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN — Lên kế hoạch

### Mục tiêu (Goal)
Dựng khung dự án Next.js (TypeScript + Tailwind), kết nối với Supabase database để các task sau có thể bắt đầu code chức năng. Đây là task nền tảng — chưa có UI nào cho người dùng cuối.

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [ ] Tạo project Next.js mới với TypeScript
- [ ] Cài Tailwind CSS + cấu hình font tiếng Việt
- [ ] Tạo tài khoản Supabase + tạo project free
- [ ] Cài thư viện `@supabase/supabase-js`
- [ ] Tạo file `lib/supabase.ts` để khởi tạo client
- [ ] Cấu hình biến môi trường `.env.local`
- [ ] Tạo trang `/` (Hello World) test kết nối Supabase
- [ ] Push code lên GitHub
- [ ] Deploy thử lên Vercel (miễn phí)

**❌ NGOÀI phạm vi (không làm trong task này):**
- Đăng nhập / phân quyền → task T-002
- Bất kỳ giao diện chức năng nào → task sau
- Thiết kế database schema chi tiết → task T-003

### Đầu ra mong đợi (Deliverables)
- Repo GitHub có code chạy được
- URL Vercel public (vd: `nha-tro-xxx.vercel.app`) mở được trang hello
- File `.env.local.example` mẫu cho env variables
- Trang hello hiển thị "Kết nối Supabase OK" nếu kết nối thành công

### Phụ thuộc (Dependencies)
- **Cần xong trước:** Không có (đây là task đầu tiên)
- **Sẽ chặn task nào:** T-002 (đăng nhập), T-003 (database schema), và toàn bộ task sau

### Ước lượng thời gian
1.5 - 2 giờ (đa số là cài đặt và tạo tài khoản)

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện
1. [ ] Cài Node.js (v20+) nếu chưa có — kiểm tra: `node -v`
2. [ ] Tạo project: `npx create-next-app@latest nha-tro --typescript --tailwind --app`
3. [ ] Vào https://supabase.com → Sign up bằng GitHub → Tạo project mới (chọn region Singapore)
4. [ ] Lấy `Project URL` + `anon public key` từ Settings → API
5. [ ] Tạo file `.env.local` với 2 biến: `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. [ ] Cài thư viện: `npm install @supabase/supabase-js`
7. [ ] Tạo `src/lib/supabase.ts` khởi tạo client
8. [ ] Sửa `src/app/page.tsx` thêm test kết nối Supabase
9. [ ] Chạy local: `npm run dev` — mở http://localhost:3000 kiểm tra
10. [ ] Tạo repo GitHub mới, push code lên
11. [ ] Vào https://vercel.com → Import repo → Thêm env variables → Deploy

### Ghi chú khi làm
> _Ghi lại khi làm: lỗi gặp phải, lựa chọn kỹ thuật, link tham khảo..._

- _(trống — điền khi làm)_

### Files / Folders thay đổi
```
nha-tro-app/
├── src/
│   ├── app/
│   │   └── page.tsx          # Trang hello + test Supabase
│   └── lib/
│       └── supabase.ts       # Khởi tạo Supabase client
├── .env.local                # Biến môi trường (KHÔNG commit)
├── .env.local.example        # Mẫu để người khác copy
├── .gitignore                # Đảm bảo có .env.local
└── package.json              # Dependencies
```

---

## ✅ 3. CHECK — Tự kiểm tra

### Code quality
- [ ] `npm run build` chạy thành công không lỗi
- [ ] Không có warning đỏ trên console khi `npm run dev`
- [ ] File `.env.local` đã có trong `.gitignore` (không bị push lên GitHub)
- [ ] File `.env.local.example` chỉ có tên biến, không có giá trị thật

### Cấu hình
- [ ] Tailwind CSS hoạt động (test bằng class `bg-blue-500` trên trang chính)
- [ ] Font hiển thị tiếng Việt đúng (test với chữ "Quản lý nhà trọ — Đầy đủ dấu")
- [ ] Biến môi trường đọc được từ Next.js (`process.env.NEXT_PUBLIC_SUPABASE_URL`)

### Kết nối
- [ ] Client Supabase khởi tạo không lỗi
- [ ] Lệnh test gọi Supabase trả về kết quả (kể cả khi chưa có table)

---

## 🧪 4. VERIFY — Kiểm thử

### Test Case 1: Chạy local
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở terminal, chạy `npm run dev` | Server chạy ở port 3000, không lỗi | ⬜ |
| 2 | Mở trình duyệt → http://localhost:3000 | Trang hello hiển thị | ⬜ |
| 3 | Mở DevTools → tab Console | Không có error đỏ | ⬜ |
| 4 | Nhìn vào trang | Có dòng chữ "Kết nối Supabase OK" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 2: Tiếng Việt hiển thị đúng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở trang chính | Tiếng Việt hiển thị có dấu đầy đủ | ⬜ |
| 2 | Zoom 200% | Không vỡ layout, font vẫn rõ | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 3: Deploy Vercel
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Push code lên GitHub | Repo có code đầy đủ, KHÔNG có `.env.local` | ⬜ |
| 2 | Vercel auto-build | Build thành công, có URL public | ⬜ |
| 3 | Mở URL Vercel | Trang hiển thị giống local | ⬜ |
| 4 | Mở DevTools | Vẫn thấy "Kết nối Supabase OK" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 4: Test trên điện thoại
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở URL Vercel trên điện thoại | Trang hiển thị | ⬜ |
| 2 | Xem layout | Không bị tràn ngang, đọc được | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases
- [ ] Đổi sai env variable → trang báo lỗi rõ ràng (không crash trắng màn hình)
- [ ] Mất mạng giữa chừng → console hiện lỗi network, không treo trình duyệt
- [ ] Refresh trang nhiều lần liên tục → vẫn hoạt động bình thường

---

## 👀 5. HUMAN REVIEW

- [x] **Không cần** — đây là task setup hạ tầng, tự verify đủ
- [ ] **Cần review**

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra
> _Điền khi xong_

- _(trống)_

### Cải tiến cho task sau
- [ ] Lưu lại Supabase URL + anon key vào nơi an toàn (1Password / Bitwarden)
- [ ] Bookmark dashboard Vercel + dashboard Supabase

### Task phát sinh
> _Liệt kê task mới phát hiện trong lúc làm_

- _(trống — sẽ điền nếu có)_

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả ✅:

1. Đổi tên file: `todo.001-khoi-tao-du-an.md` → `done.001-khoi-tao-du-an.md`
2. Cập nhật **Trạng thái** → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit: `done: T-001 khởi tạo dự án`
5. Bắt đầu task tiếp theo: `todo.002-dang-nhap.md`
