# 🗂️ Todo: Đăng nhập và phân quyền

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Đăng nhập, đăng xuất và phân quyền admin/tenant |
| **Mã task** | T-003 |
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
Xây dựng hệ thống đăng nhập bằng email + mật khẩu (Supabase Auth) với 2 vai trò: **admin** (chủ trọ) và **tenant** (khách thuê). Sau đăng nhập, mỗi vai trò được redirect về dashboard riêng. Đây là cửa ngõ duy nhất vào toàn bộ app.

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [x] Tạo trang `/login` với form số điện thoại + mật khẩu (đổi từ email → phone)
- [x] Validate input ở client (chỉ số, tối đa 10 ký tự)
- [x] Gọi API route `/api/auth/login` (custom bcrypt) thay vì Supabase Auth
- [x] Lưu session vào cookie `auth-token` (JWT tự ký bằng `jose`)
- [x] Role lấy từ JWT payload — không cần query `profiles`
- [x] Redirect theo role: owner → `/community`, tenant → `/dashboard`
- [x] Tạo `middleware.ts` bảo vệ route tập trung (thêm 2026-05-16)
- [x] Nếu chưa đăng nhập → redirect `/login`; đã đăng nhập vào `/login` → redirect `/community`
- [x] Đăng xuất: xóa cookie `auth-token` + redirect `/login`
- [x] `/dashboard` — trang chung: owner thấy OwnerDashboard, tenant thấy TenantDashboard
- [x] Hiển thị lỗi tiếng Việt rõ ràng
- [x] Đăng nhập bằng vân tay (WebAuthn) — ngoài scope ban đầu nhưng đã implement

**❌ NGOÀI phạm vi (không làm trong task này):**
- Đăng ký tài khoản — owner tạo tenant qua API `/api/owner/create-tenant`
- Quên mật khẩu / reset password — task riêng
- OAuth (Google/Facebook) — không cần

**📝 Quyết định kiến trúc thay đổi so với plan:**
- Email → Số điện thoại: phù hợp thị trường Việt Nam hơn
- Supabase Auth → Custom JWT (`jose` + bcrypt): toàn quyền kiểm soát, dễ thêm WebAuthn
- `/admin/dashboard` + `/tenant/home` → `/dashboard` (chung): component khác nhau theo role, code gọn hơn
- Middleware tập trung: thêm vào 2026-05-16 sau verify — xử lý auth ở 1 nơi thay vì mỗi page

### Đầu ra mong đợi (Deliverables)
- ✅ Trang `/login` chạy được, form số điện thoại + mật khẩu, tiếng Việt, có WebAuthn
- ✅ `middleware.ts` ở root bảo vệ tất cả routes quan trọng tập trung
- ✅ `lib/auth.ts` — `getCurrentUser()`, `createSession()`, `setAuthCookie()`, `clearAuthCookie()`
- ✅ `lib/supabase-server.ts` — Supabase client dùng `service_role` key cho server
- ✅ `/dashboard` — hiển thị OwnerDashboard hoặc TenantDashboard theo role
- ✅ Đăng nhập, đăng xuất, redirect đúng vai trò hoạt động

### Phụ thuộc (Dependencies)
- **Cần xong trước:**
  - T-001 (Next.js + Supabase đã setup)
  - T-002 (Bảng `profiles` đã có với cột `role`)
- **Sẽ chặn task nào:** Tất cả task có UI ở giai đoạn 1+ (vì cần đăng nhập mới vào được)

### Ước lượng thời gian
4 - 6 giờ (auth là phần dễ sai, cần test kỹ)

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện

1. [ ] **Cài thư viện cần thiết:**
   ```
   npm install @supabase/ssr
   ```
2. [ ] **Tạo Supabase client cho server và client:**
   - `src/lib/supabase/client.ts` — dùng trong Client Component
   - `src/lib/supabase/server.ts` — dùng trong Server Component / Route Handler
3. [ ] **Tạo helper auth** `src/lib/auth.ts`:
   - `getCurrentUser()` — lấy user hiện tại
   - `getUserProfile()` — lấy profile + role
   - `signOut()` — đăng xuất
4. [ ] **Tạo middleware** `src/middleware.ts`:
   - Kiểm tra session ở mọi route
   - Route `/admin/*` chỉ cho role admin
   - Route `/tenant/*` chỉ cho role tenant
   - Route `/login` redirect về dashboard nếu đã đăng nhập
5. [ ] **Tạo trang `/login`:**
   - Form 2 field: email + password
   - Validation client-side
   - Hiển thị loading khi đang gọi API
   - Hiển thị error message tiếng Việt
6. [ ] **Tạo trang `/admin/dashboard`** (placeholder):
   - Header có tên user + nút đăng xuất
   - Nội dung: "Đây là dashboard admin" + danh sách 6 module (chưa link)
7. [ ] **Tạo trang `/tenant/home`** (placeholder):
   - Header có tên user + nút đăng xuất
   - Nội dung: "Xin chào [tên]" + danh sách tính năng (chưa link)
8. [ ] **Tạo user thử trên Supabase Dashboard:**
   - 1 admin (chủ trọ)
   - 1 tenant (khách thuê)
   - Cập nhật `profiles.role` tương ứng
9. [ ] **Test toàn bộ flow:**
   - Đăng nhập admin → vào /admin/dashboard
   - Đăng nhập tenant → vào /tenant/home
   - Đăng xuất → về /login
   - Vào /admin/dashboard khi chưa đăng nhập → redirect /login

### Ghi chú khi làm
> _Ghi lại khi làm: lỗi cookie, vấn đề middleware, edge case..._

- _(trống)_

### Files / Folders thay đổi
```
nha-tro-app/
├── src/
│   ├── middleware.ts                       # Bảo vệ routes
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts                   # Supabase client (browser)
│   │   │   └── server.ts                   # Supabase client (server)
│   │   └── auth.ts                         # Helper functions auth
│   ├── app/
│   │   ├── login/
│   │   │   └── page.tsx                    # Trang đăng nhập
│   │   ├── admin/
│   │   │   ├── layout.tsx                  # Layout admin (header + nav)
│   │   │   └── dashboard/
│   │   │       └── page.tsx                # Dashboard admin (placeholder)
│   │   └── tenant/
│   │       ├── layout.tsx                  # Layout tenant (mobile-first)
│   │       └── home/
│   │           └── page.tsx                # Home tenant (placeholder)
│   └── components/
│       └── auth/
│           ├── LoginForm.tsx               # Form đăng nhập
│           └── SignOutButton.tsx           # Nút đăng xuất
└── .env.local                              # (không sửa, vẫn dùng key từ T-001)
```

---

## ✅ 3. CHECK — Tự kiểm tra

### Code quality
- [ ] `npm run build` không lỗi
- [ ] Không có TypeScript error
- [ ] Không hardcode email/password ở bất kỳ đâu
- [ ] Tất cả label, button, message bằng tiếng Việt
- [ ] Có loading state khi nhấn nút đăng nhập

### Bảo mật
- [ ] Mật khẩu không bao giờ hiển thị trên console / network plaintext (Supabase tự handle)
- [ ] Middleware chạy đúng — thử truy cập `/admin/dashboard` ở incognito → bị redirect
- [ ] Session cookie có flag `HttpOnly`, `Secure` (production)
- [ ] User role được verify ở server (không tin tưởng client-side)

### Trải nghiệm
- [ ] Trang login hiển thị đẹp trên mobile (390px)
- [ ] Tiếng Việt có dấu, không lỗi font
- [ ] Lỗi sai mật khẩu hiển thị rõ ràng, không lộ "user không tồn tại"
- [ ] Sau đăng nhập, redirect mượt (không flicker)
- [ ] Nhấn Enter trong form thì submit (không phải chỉ nhấn nút)

---

## 🧪 4. VERIFY — Kiểm thử

### Test Case 1: Đăng nhập thành công với admin
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở `/login` ở incognito | Form đăng nhập hiển thị | ⬜ |
| 2 | Nhập email admin + password đúng | Nút đăng nhập đổi thành "Đang đăng nhập..." | ⬜ |
| 3 | Đợi xong | Chuyển sang `/admin/dashboard` | ⬜ |
| 4 | Nhìn header | Hiển thị "Xin chào, [tên admin]" + nút đăng xuất | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 2: Đăng nhập thành công với tenant
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở `/login` ở incognito | Form hiển thị | ⬜ |
| 2 | Nhập email tenant + password đúng | Loading hiển thị | ⬜ |
| 3 | Đợi xong | Chuyển sang `/tenant/home` (KHÔNG phải /admin) | ⬜ |
| 4 | Thử truy cập `/admin/dashboard` thủ công | Bị redirect về `/tenant/home` hoặc báo 403 | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 3: Đăng nhập sai
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Nhập email đúng + password sai | Hiện chữ đỏ "Sai email hoặc mật khẩu" | ⬜ |
| 2 | Nhập email không tồn tại | Cùng thông báo "Sai email hoặc mật khẩu" (không lộ user) | ⬜ |
| 3 | Nhập email sai format (vd: "abc") | Validation client báo "Email không hợp lệ" | ⬜ |
| 4 | Để trống password | Validation báo "Vui lòng nhập mật khẩu" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 4: Đăng xuất
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Đã đăng nhập, nhấn nút "Đăng xuất" | Chuyển về `/login` | ⬜ |
| 2 | Mở DevTools → Application → Cookies | Cookie session đã bị xóa | ⬜ |
| 3 | Bấm nút "Back" trình duyệt | Vẫn ở `/login` (không vào lại dashboard) | ⬜ |
| 4 | Thử truy cập `/admin/dashboard` | Bị redirect về `/login` | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 5: Middleware bảo vệ route
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Incognito, truy cập `/admin/dashboard` | Redirect về `/login` | ⬜ |
| 2 | Incognito, truy cập `/tenant/home` | Redirect về `/login` | ⬜ |
| 3 | Đăng nhập admin xong, truy cập `/login` | Redirect về `/admin/dashboard` | ⬜ |
| 4 | Đăng nhập tenant xong, truy cập `/admin/dashboard` | Redirect về `/tenant/home` hoặc báo 403 | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 6: Mobile responsive
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở `/login` trên DevTools mobile view 390px | Form hiển thị đẹp, không tràn | ⬜ |
| 2 | Tap vào field email | Bàn phím mobile hiển thị kiểu "email" | ⬜ |
| 3 | Đăng nhập tenant → `/tenant/home` | Layout mobile-first, không cần zoom | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases
- [ ] Đăng nhập, đợi 1 ngày, mở lại app → session còn hay không? (refresh token)
- [ ] Đăng nhập từ 2 trình duyệt → đăng xuất 1 cái có ảnh hưởng cái kia không?
- [ ] Nhấn nút đăng nhập 5 lần liên tục → có double submit không? (cần disable button khi loading)
- [ ] Mất mạng giữa lúc đăng nhập → thông báo lỗi rõ ràng (không treo)
- [ ] Email có chữ hoa "ADMIN@example.com" → vẫn login được không? (Supabase mặc định lowercase)

---

## 👀 5. HUMAN REVIEW

- [ ] **Không cần**
- [x] **Cần review** — vì:
  - Đây là cửa ngõ bảo mật, sai ở đây ảnh hưởng toàn hệ thống
  - Quyết định UX login (chỉ email/password hay thêm OAuth) ảnh hưởng dài hạn

### Cần review những gì?
- [x] Có lỗ hổng bảo mật nào không? (verify role ở server, cookie flags)
- [x] UX login đã đủ thân thiện chưa? (message lỗi, loading state)
- [x] Middleware logic có race condition không?
- [x] Mobile-first trang tenant đã đẹp chưa?

### Người review
- **Reviewer:** _chưa có_
- **Ngày review:** _chưa có_
- **Kết quả:** ⬜ Approved / ⬜ Cần sửa
- **Feedback:**
  > _(điền sau)_

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra

- **Custom JWT linh hoạt hơn Supabase Auth cho use case đặc biệt** — dễ thêm WebAuthn, dễ lưu thêm field vào token (phone, fullName, role)
- **Một trang dashboard chung tốt hơn 2 trang riêng** — điều kiện render theo role (`user.role === 'owner'`) gọn hơn, ít file hơn, dễ maintain
- **Middleware tập trung là bắt buộc** — không có middleware, mỗi page tự redirect → dễ quên khi thêm trang mới
- **WebAuthn nên làm sớm** — tích hợp vào login flow từ đầu dễ hơn thêm sau, và là điểm khác biệt UX lớn cho người dùng mobile Việt Nam

### Cải tiến cho task sau
- [ ] Lưu credentials test (admin + tenant) vào nơi an toàn để dùng cho task sau
- [ ] Có thể tạo helper `withAuth(handler)` để dùng trong Server Actions sau này
- [ ] Sau khi build xong các trang, quay lại thêm "Forgot password" thành task riêng

### Task phát sinh
> _Liệt kê task mới phát hiện trong lúc làm_

- _(trống — sẽ điền nếu có)_

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả ✅:

1. Đổi tên file: `todo.003-dang-nhap.md` → `done.003-dang-nhap.md`
2. Cập nhật **Trạng thái** → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit: `done: T-003 đăng nhập và phân quyền`
5. Bắt đầu task tiếp theo: `todo.004-quan-ly-phong.md` (module 1 — ưu tiên cao nhất)
