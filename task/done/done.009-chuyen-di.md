# 🗂️ Todo: Quy trình chuyển đi (UC-03, UC-07)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Quy trình khách chuyển đi: báo + duyệt + lưu trữ |
| **Mã task** | T-009 |
| **Module** | Quản lý khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🟡 Trung bình |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Xây dựng workflow chuyển đi 2 bước: khách gửi yêu cầu → chủ duyệt. Sau duyệt, khách bị remove khỏi phòng, lưu lịch sử. Sau 2 năm tự động archive xóa thông tin nhạy cảm.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Data layer:**
- [ ] Hàm `createMoveRequest(tenantId, requestedDate, reason)` — tenant tạo
- [ ] Hàm `getMoveRequests(status?)` — admin xem
- [ ] Hàm `approveMoveRequest(id)` — admin duyệt, set tenant.status=moved_out, update rooms
- [ ] Hàm `rejectMoveRequest(id, note)` — admin từ chối, gửi notification
- [ ] Hàm `cancelMoveRequest(id)` — tenant hủy yêu cầu của mình
- [ ] Logic xử lý sau duyệt:
   - Set tenant.status = moved_out
   - Set move_date = ngày được duyệt
   - Nếu phòng còn tenant khác → rooms vẫn occupied
   - Nếu phòng không còn ai → rooms.status = empty
   - Khóa auth user (`banned_until` = far future)
- [ ] Server Actions cho 4 hàm trên

**UI tenant:**
- [ ] Trang `/tenant/move-out` — form gửi yêu cầu
- [ ] Hiển thị status nếu đã có request pending
- [ ] Nút "Hủy yêu cầu" nếu pending
- [ ] Hiển thị lý do từ chối nếu bị reject

**UI admin:**
- [ ] Trang `/admin/move-requests` — danh sách yêu cầu
- [ ] Filter: tất cả / chờ duyệt / đã duyệt / đã từ chối
- [ ] Nút Duyệt / Từ chối (với lý do) trên mỗi request
- [ ] Confirm dialog trước khi duyệt

**Background:**
- [ ] Supabase scheduled function (cron) — chạy mỗi ngày:
   - Tìm tenants có status=moved_out + move_date > 2 năm
   - Set status=archived
   - Clear: avatar_url, id_card_number, date_of_birth, hometown, occupation, workplace
   - Giữ: full_name, phone (hashed?), move_date, tổng tiền

**❌ NGOÀI phạm vi:**
- Tính tiền tháng cuối khi chuyển giữa tháng — chủ tự tính tay, không có UI riêng
- Khóa tài khoản theo cách phức tạp (vẫn dùng `banned_until`)
- Export dữ liệu khách trước khi archive

### Deliverables

```
src/lib/db/move-requests.ts
src/app/admin/move-requests/
  page.tsx
  actions.ts
src/app/tenant/move-out/
  page.tsx
  actions.ts
supabase/functions/archive-old-tenants/
  index.ts                # Edge Function chạy daily
```

### Dependencies
- **Cần xong trước:** T-006 (bảng move_requests), T-007 (CRUD khách)
- **Chặn:** Không (task module Thu chi không phụ thuộc)

### Ước lượng: 5-6 giờ

---

## 🔨 2. DO

1. [ ] Tạo Zod schema `moveRequestSchema` (requestedDate, reason optional)
2. [ ] Viết `src/lib/db/move-requests.ts`:
   - createMoveRequest, getMoveRequests, approveMoveRequest, rejectMoveRequest, cancelMoveRequest
   - approveMoveRequest dùng RPC hoặc transaction để đảm bảo atomic
3. [ ] Server Actions tenant: `src/app/tenant/move-out/actions.ts`
4. [ ] Server Actions admin: `src/app/admin/move-requests/actions.ts`
5. [ ] UI `/tenant/move-out`:
   - Nếu chưa có request → hiển thị form
   - Nếu có pending → hiển thị status + nút hủy
   - Nếu rejected → hiển thị lý do, cho phép tạo request mới
   - Nếu approved → hiển thị "Bạn sẽ chuyển đi ngày X"
6. [ ] UI `/admin/move-requests`:
   - List card mỗi request: tên khách, phòng, ngày yêu cầu, lý do
   - Nút Duyệt: confirm dialog
   - Nút Từ chối: dialog có input lý do
   - Filter status với tabs
7. [ ] Thông báo trong app:
   - Khách gửi request → notification cho admin
   - Admin duyệt/từ chối → notification cho khách
8. [ ] Tạo Supabase Edge Function:
   - Schedule daily 00:00
   - Đọc app_settings.data_retention_years
   - Update tenants thỏa điều kiện → archived
9. [ ] Test schedule function thủ công trước khi enable cron

---

## ✅ 3. CHECK

- [ ] Build pass
- [ ] approveMoveRequest atomic — nếu fail giữa chừng phải rollback
- [ ] Phòng có nhiều khách: A rời → status phòng vẫn occupied
- [ ] Phòng chỉ 1 khách: A rời → status phòng = empty
- [ ] Tenant chỉ thấy request của mình
- [ ] Toast tiếng Việt mọi action
- [ ] Edge function test được local (`supabase functions serve`)

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-quan-ly-khach-thue.md`

Đối chiếu:
- UC-03: quy trình 4 bước có đủ chưa?
- UC-03 lưu ý: "chỉ support case A đi, B,C ở lại" — có enforce không?
- UC-07: lưu 2 năm rồi archive — Edge Function có làm đúng không?
- "Khóa tài khoản A" sau khi chuyển đi — có thật sự khóa được không?

---

## 🧪 5. VERIFY

### Test Case 1: Tenant gửi yêu cầu chuyển đi
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant vào /tenant/move-out | Form hiển thị | ⬜ |
| 2 | Chọn ngày, ghi lý do, submit | Toast "Đã gửi yêu cầu" | ⬜ |
| 3 | Refresh trang | Hiển thị status pending + ngày | ⬜ |
| 4 | Admin nhận notification | OK | ⬜ |

### Test Case 2: Admin duyệt
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Admin vào /admin/move-requests | Thấy request pending | ⬜ |
| 2 | Click "Duyệt" | Confirm dialog | ⬜ |
| 3 | Confirm | Toast "Đã duyệt" | ⬜ |
| 4 | Check tenant: status=moved_out, room cập nhật | OK | ⬜ |
| 5 | Tenant đăng nhập lại | Bị từ chối (auth banned) | ⬜ |

### Test Case 3: Phòng nhiều khách, 1 người chuyển đi
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Phòng X có A, B, C | OK | ⬜ |
| 2 | A gửi move request, admin duyệt | OK | ⬜ |
| 3 | rooms.status | Vẫn = occupied (vì còn B, C) | ⬜ |
| 4 | getTenantsByRoomId(X) | Trả 2 người (B, C) | ⬜ |

### Test Case 4: Admin từ chối
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Admin click "Từ chối" | Dialog yêu cầu nhập lý do | ⬜ |
| 2 | Submit lý do "Đã ký hợp đồng tới tháng 12" | Toast | ⬜ |
| 3 | Tenant xem | Thấy status=rejected + lý do | ⬜ |
| 4 | Tenant tạo request mới | Cho phép | ⬜ |

### Test Case 5: Archive sau 2 năm (giả lập)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tạo tenant có move_date = 2 năm trước | OK | ⬜ |
| 2 | Chạy thủ công Edge Function | Tenant đó → status=archived | ⬜ |
| 3 | Field nhạy cảm bị clear | id_card=null, avatar=null... | ⬜ |
| 4 | Giữ lại | full_name, phone, move_date | ⬜ |

### Edge cases
- [ ] Tenant cố cancel request đã approved → reject
- [ ] Admin duyệt cùng lúc 2 request từ 2 admin → race condition?
- [ ] requestedDate trong quá khứ → cho phép không?
- [ ] Tenant đã archived cố đăng nhập → message rõ ràng

---

## 👀 6. HUMAN REVIEW
- [x] **Cần review** — workflow có nhiều state, dễ sai logic

Cần xem:
- [ ] Có race condition khi 2 admin cùng duyệt 1 request?
- [ ] Khóa auth user có thật sự ngăn đăng nhập không?
- [ ] Edge Function archive có log đủ để debug khi cần không?

---

## 🎬 7. ACT
- _(điền sau)_

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.009-chuyen-di.md` → `done.009-chuyen-di.md`
2. Commit: `done: T-009 quy trình chuyển đi`
3. Task tiếp: `todo.010-khach-den-choi.md`
