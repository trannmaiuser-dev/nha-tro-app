# 🗂️ Todo: Báo khách đến chơi (UC-04)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Khách thuê báo có người thân/bạn đến chơi qua đêm |
| **Mã task** | T-010 |
| **Module** | Quản lý khách thuê (Module 1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🟢 Thấp |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN

### Mục tiêu
Cho phép khách thuê khai báo trước khi có người đến chơi/ngủ qua đêm. Mục đích chính: khi module Camera AI hoạt động, không cảnh báo "người lạ" trong các đêm đã có khai báo.

### Phạm vi (Scope)

**✅ TRONG phạm vi:**

**Data layer:**
- [ ] Zod schema `guestSchema` (guestName, numberOfNights 1-7, note optional)
- [ ] Hàm `createGuest(tenantId, data)` — tenant tạo
- [ ] Hàm `getGuestsByTenant(tenantId)` — tenant xem lịch sử của mình
- [ ] Hàm `getGuestsByRoom(roomId, fromDate, toDate)` — admin xem theo phòng
- [ ] Hàm `getActiveGuests(date)` — lấy danh sách khách đang trong thời gian ở (cho camera dùng sau)
- [ ] Hàm `deleteGuest(id)` — tenant tự xóa nếu báo nhầm
- [ ] Server Actions tương ứng

**UI tenant:**
- [ ] Trang `/tenant/guests` — danh sách + nút "Báo khách đến chơi"
- [ ] Form: tên khách, số đêm (1-7), ghi chú
- [ ] Hiển thị lịch sử các lần báo (sort mới → cũ)
- [ ] Nút xóa nếu lỡ báo nhầm

**UI admin:**
- [ ] Trang `/admin/guests` — danh sách tất cả guests
- [ ] Filter theo phòng / khoảng thời gian
- [ ] Mỗi row: phòng, tenant báo, tên khách, số đêm, ngày báo, note
- [ ] Notification trong app khi có khách báo (không cần duyệt)

**❌ NGOÀI phạm vi:**
- Upload ảnh khách đến chơi để camera nhận diện — sẽ làm ở task camera (giai đoạn 5)
- Tự động hết hiệu lực sau số đêm — chỉ lưu lịch sử, không có status
- Cảnh báo nếu báo quá nhiều khách trong tháng — chưa cần thiết

### Deliverables

```
src/lib/db/guests.ts
src/app/tenant/guests/
  page.tsx
  actions.ts
src/app/admin/guests/
  page.tsx
src/components/guests/
  GuestForm.tsx
  GuestCard.tsx
```

### Dependencies
- **Cần xong trước:** T-006 (bảng guests), T-007 (CRUD khách để lấy tenant context)
- **Chặn:** Không (chỉ liên quan camera ở giai đoạn 5)

### Ước lượng: 3-4 giờ

---

## 🔨 2. DO

1. [ ] Zod schema trong `src/lib/schemas/guest.ts`:
   - guestName: string 2-50 ký tự
   - numberOfNights: number 1-7
   - note: string optional, max 200
2. [ ] Viết `src/lib/db/guests.ts` các hàm CRUD
3. [ ] Server Actions: tenant tạo/xóa, admin chỉ đọc
4. [ ] UI `/tenant/guests`:
   - Nút "Báo khách đến chơi" (FAB hoặc top right)
   - Form modal: 3 field đơn giản
   - List card: hiển thị mới nhất trước
   - Mỗi card có nút "Xóa" nếu là của mình
5. [ ] UI `/admin/guests`:
   - Table view (vì admin xem nhiều, table tốt hơn card)
   - Cột: Phòng, Tenant báo, Tên khách, Số đêm, Ngày báo, Note
   - Filter: chọn phòng, khoảng ngày
6. [ ] Notification:
   - Khi tenant tạo guest → notification cho admin (type: "guest_announced")
   - Hiển thị badge trên menu admin
7. [ ] Mobile responsive cho trang tenant

---

## ✅ 3. CHECK

- [ ] Build pass
- [ ] Tiếng Việt 100%
- [ ] Tenant chỉ thấy guests của mình
- [ ] Admin thấy tất cả + filter được
- [ ] Form validation realtime
- [ ] Mobile: form gọn, không tràn

---

## 🔍 4. REQUIREMENT CHECK

Đọc: `memory/usecase-quan-ly-khach-thue.md`

Đối chiếu UC-04:
- "Form đơn giản: tên, số đêm dự kiến (1-7), ghi chú" — đúng không?
- "Submit → thông báo gửi tới chủ" — có gửi notification không?
- "Không cần duyệt, chỉ để biết" — đảm bảo không có nút duyệt
- "Lưu lại lịch sử để khi cần tra cứu" — admin có UI tra cứu chưa?
- Mục đích "Camera AI không cảnh báo người lạ trong các đêm đó" — có hàm `getActiveGuests` để camera dùng sau không?

---

## 🧪 5. VERIFY

### Test Case 1: Tenant báo khách đến chơi
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant vào /tenant/guests | Trang load, có nút "Báo" | ⬜ |
| 2 | Click "Báo", nhập "Nguyễn Văn B", 2 đêm | OK | ⬜ |
| 3 | Submit | Toast "Đã ghi nhận", card mới hiện | ⬜ |
| 4 | Admin nhận notification | "Phòng 201 có khách đến chơi" | ⬜ |

### Test Case 2: Validation
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Nhập tên 1 ký tự | Báo lỗi "Tên ít nhất 2 ký tự" | ⬜ |
| 2 | Nhập số đêm = 0 | Báo lỗi | ⬜ |
| 3 | Nhập số đêm = 10 | Báo lỗi "Tối đa 7 đêm" | ⬜ |
| 4 | Note > 200 ký tự | Báo lỗi | ⬜ |

### Test Case 3: Phân quyền
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tenant A xem /tenant/guests | Chỉ thấy của mình | ⬜ |
| 2 | Tenant A cố xóa guest của tenant B (qua API) | 403 | ⬜ |
| 3 | Admin xem /admin/guests | Thấy tất cả | ⬜ |
| 4 | Admin không có nút "Duyệt" / "Từ chối" | OK (vì không cần duyệt) | ⬜ |

### Test Case 4: Filter admin
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Chọn phòng 201 | Chỉ hiển thị guests phòng 201 | ⬜ |
| 2 | Chọn khoảng 7 ngày qua | Filter đúng | ⬜ |
| 3 | Reset filter | Hiển thị lại tất cả | ⬜ |

### Test Case 5: getActiveGuests (chuẩn bị cho camera)
| Bước | Thao tác | Kết quả |
|---|---|---|
| 1 | Tạo guest hôm nay, số đêm 2 | OK | ⬜ |
| 2 | Gọi getActiveGuests(hôm nay) | Trả về guest đó | ⬜ |
| 3 | Gọi getActiveGuests(3 ngày sau) | Không trả (đã hết hiệu lực) | ⬜ |

### Edge cases
- [ ] Báo 2 khách cùng tên trong cùng ngày → cho phép cả 2
- [ ] Số đêm là số thập phân (1.5) → reject hoặc làm tròn?
- [ ] Note có ký tự đặc biệt (`<script>`) → escape đúng, không XSS
- [ ] Tenant đã chuyển đi cố báo guest → reject (chỉ active tenant mới được báo)

---

## 👀 6. HUMAN REVIEW
- [ ] **Không cần** — task đơn giản, scope rõ

---

## 🎬 7. ACT
- _(điền sau)_

---

## 🏁 Hoàn thành

1. Đổi tên: `todo.010-khach-den-choi.md` → `done.010-khach-den-choi.md`
2. Commit: `done: T-010 báo khách đến chơi`
3. Task tiếp: Module Thu chi (T-011+) hoặc Settings cho admin (cấu hình nợ quá hạn)
