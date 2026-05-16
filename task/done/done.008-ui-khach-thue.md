# 🗂️ Todo: UI quản lý khách thuê + form khai báo lần đầu

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | UI thêm khách (admin) + form khai báo lần đầu (tenant) |
| **Mã task** | T-008 |
| **Module** | Quản lý khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
2 trải nghiệm UI:
1. **Admin:** thêm khách thuê vào phòng từ trang `/admin/rooms` hoặc `/admin/tenants`
2. **Tenant lần đầu:** đăng nhập → bắt buộc đổi mật khẩu → bắt buộc điền profile đầy đủ

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Phía admin:**
- [ ] Trang `/admin/tenants` — danh sách tất cả khách thuê (card grid)
- [ ] Nút "Thêm khách thuê" trên trang phòng và trang tenants
- [ ] Modal/form: chọn phòng, nhập SĐT, CCCD → tạo tài khoản
- [ ] Hiển thị mật khẩu tạm sau khi tạo (để admin gửi cho khách)
- [ ] Mỗi card khách hiển thị: tên (hoặc "Chưa điền"), SĐT, phòng, status badge

**Phía tenant lần đầu:**
- [ ] Middleware redirect: tenant đã đăng nhập nhưng `is_first_login=true` → `/tenant/change-password`
- [ ] Trang `/tenant/change-password` — bắt buộc đổi mật khẩu lần đầu
- [ ] Sau đổi pass → redirect `/tenant/onboarding`
- [ ] Trang `/tenant/onboarding` — form multi-step điền thông tin:
  - Step 1: Thông tin cá nhân (tên, dob, hometown, nghề nghiệp, nơi làm việc)
  - Step 2: Upload ảnh chân dung
  - Step 3: Thêm người thân (tên, quan hệ, sđt, ảnh) — tối thiểu 1
  - Step 4: Thông tin ngân hàng — tối thiểu 1
- [ ] Sau khi điền xong → set `is_profile_complete=true`, redirect `/tenant/home`
- [ ] Tích hợp Supabase Storage upload ảnh
- [ ] Mobile-first hoàn toàn (khách dùng điện thoại)

**❌ NGOÀI phạm vi:**
- Move request UI → T-009
- Khách đến chơi UI → T-010
- Trang xem chi tiết khách (admin) → task riêng sau
- Edit profile sau khi đã hoàn thiện → task riêng

### Deliverables

```
src/app/admin/tenants/
  page.tsx                      # Danh sách khách
  AddTenantDialog.tsx           # Modal thêm khách

src/app/tenant/
  change-password/page.tsx
  onboarding/
    page.tsx                    # Multi-step form
    StepPersonalInfo.tsx
    StepAvatar.tsx
    StepEmergencyContact.tsx
    StepBankAccount.tsx

src/components/tenants/
  TenantCard.tsx
  TenantList.tsx
  AvatarUpload.tsx              # Component dùng chung
```

### Dependencies
- **Cần xong trước:** T-005 (UI pattern phòng), T-007 (CRUD khách)
- **Chặn:** Các task module Thu chi (cần khách hoàn chỉnh)

### Ước lượng: 8-10 giờ

---

## 🔨 2. DO

### Phía Admin
1. [ ] Tạo `/admin/tenants/page.tsx` — Server Component, fetch tenants
2. [ ] Tạo `TenantList.tsx`, `TenantCard.tsx` (tái sử dụng pattern từ T-005)
3. [ ] Tạo `AddTenantDialog.tsx`:
   - Select phòng (dropdown các phòng chưa đầy hoặc chọn phòng đã có)
   - Input SĐT (validate format VN)
   - Input CCCD (9 hoặc 12 số)
   - Submit → gọi `createTenantAction`
   - Sau thành công → hiển thị màn hình "Mật khẩu tạm" với nút "Sao chép" để admin gửi cho khách
4. [ ] Thêm nút "Thêm khách thuê" vào `/admin/rooms` (trên card phòng và toolbar)

### Phía Tenant
5. [ ] Cập nhật `middleware.ts`:
   - Nếu tenant đăng nhập + `is_first_login=true` → redirect `/tenant/change-password`
   - Nếu pass đã đổi + `is_profile_complete=false` → redirect `/tenant/onboarding`
6. [ ] Tạo trang `/tenant/change-password`:
   - Form: mật khẩu mới + confirm
   - Validation: ≥ 8 ký tự, có chữ + số
   - Submit → gọi Supabase auth + `markPasswordChanged`
7. [ ] Tạo `/tenant/onboarding/page.tsx` — multi-step layout:
   - Progress bar 4 bước trên top
   - Nội dung step ở giữa
   - Nút "Tiếp theo" / "Quay lại"
8. [ ] Tạo từng Step component:
   - `StepPersonalInfo`: form react-hook-form
   - `StepAvatar`: component AvatarUpload (drag-drop hoặc tap to upload)
   - `StepEmergencyContact`: form + nút "Thêm người thân khác"
   - `StepBankAccount`: form + nút "Thêm tài khoản khác"
9. [ ] Tạo `AvatarUpload.tsx`:
   - Click → mở file picker (mobile: chọn camera/gallery)
   - Preview ảnh
   - Upload lên Supabase Storage bucket `tenant-avatars`
   - Trả về URL để lưu vào DB
10. [ ] Sau step 4 → call API check + set is_profile_complete + redirect home
11. [ ] Test mobile-first: viewport 390px, modal full screen, input dễ tap

---

## ✅ 3. CHECK

- [ ] `npm run build` pass
- [ ] Toàn bộ UI bằng tiếng Việt
- [ ] Validate format SĐT VN (10 số, bắt đầu 0)
- [ ] Validate CCCD (9 hoặc 12 số)
- [ ] Mật khẩu tạm hiển thị 1 lần duy nhất, có nút sao chép
- [ ] Onboarding không cho phép skip step
- [ ] Mobile viewport 390px: form đẹp, không tràn
- [ ] Upload ảnh có loading state + error message
- [ ] Tenant đăng nhập lần 2 (đã onboarding) → vào thẳng /tenant/home

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-quan-ly-khach-thue.md`

Đối chiếu:
- UC-01 bước 1-4: quy trình có khớp không?
- "khách bắt buộc đổi mật khẩu" và "bắt buộc điền đầy đủ thông tin" có enforce ở middleware không?
- "ảnh chân dung người thân để cảnh báo người lạ" — có upload và lưu URL đúng không?
- UC-02: thêm khách vào phòng đã có người — UI có cho phép không?

---

## 🧪 5. VERIFY

### Test Case 1: Admin thêm khách mới
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Đăng nhập admin → /admin/rooms | OK | ⬜ |
| 2 | Click card phòng trống → "Thêm khách" | Modal mở | ⬜ |
| 3 | Nhập SĐT, CCCD, submit | Hiển thị mật khẩu tạm | ⬜ |
| 4 | Click "Sao chép mật khẩu" | Toast "Đã sao chép" | ⬜ |
| 5 | Đóng modal, vào /admin/tenants | Có card mới, badge "Chưa đăng nhập" | ⬜ |

### Test Case 2: Tenant đăng nhập lần đầu
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Vào /login với SĐT + mật khẩu tạm | OK | ⬜ |
| 2 | Tự redirect | /tenant/change-password | ⬜ |
| 3 | Đổi mật khẩu mới | Toast "Đã đổi mật khẩu" | ⬜ |
| 4 | Tự redirect | /tenant/onboarding step 1 | ⬜ |
| 5 | Cố vào /tenant/home | Bị redirect lại onboarding | ⬜ |

### Test Case 3: Onboarding 4 bước
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Step 1: điền đầy đủ thông tin cá nhân | Nút "Tiếp" enable | ⬜ |
| 2 | Step 2: upload ảnh chân dung | Preview hiển thị, URL được lưu | ⬜ |
| 3 | Step 3: thêm 1 người thân + ảnh | OK | ⬜ |
| 4 | Step 4: thêm 1 tài khoản ngân hàng | OK | ⬜ |
| 5 | Click "Hoàn thành" | Redirect /tenant/home, is_profile_complete=true | ⬜ |
| 6 | Đăng xuất, đăng nhập lại | Vào thẳng /tenant/home (không onboarding) | ⬜ |

### Test Case 4: Mobile (390px)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Form đăng ký bước 1 | Hiển thị đẹp, không tràn | ⬜ |
| 2 | Tap upload ảnh | Mở chọn nguồn (camera/gallery) | ⬜ |
| 3 | Step transitions | Mượt, không lag | ⬜ |

### Edge cases
- [ ] Tenant đóng tab giữa onboarding → lần sau vào lại đúng step?
- [ ] Upload ảnh > 5MB → báo lỗi rõ ràng
- [ ] Mất mạng giữa upload → có retry không?
- [ ] Spam click submit nhiều lần → có double create không?

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — UI tenant lần đầu là first impression

Cần xem:
- [ ] UX onboarding có dễ hiểu không?
- [ ] Mobile có thật sự dùng được không?
- [ ] Logic middleware có race condition không?
- [ ] Storage bucket permission có an toàn không?

---

## 🎬 7. ACT
- _(điền sau)_

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.008-ui-khach-thue.md` → `done.008-ui-khach-thue.md`
2. Commit: `done: T-008 UI quản lý khách thuê`
3. Task tiếp: `todo.009-chuyen-di.md`
