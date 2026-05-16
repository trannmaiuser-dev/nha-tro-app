# 🗂️ Todo: UI danh sách phòng

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | UI trang danh sách phòng — hiển thị, thêm, sửa, xóa |
| **Mã task** | T-005 |
| **Module** | Quản lý phòng (Module 1 — Ưu tiên #1) |
| **Giai đoạn** | 1 |
| **Ưu tiên** | 🔴 Cao |
| **Ngày tạo** | 2026-05-16 |
| **Ngày hoàn thành** | 2026-05-16 |
| **Người thực hiện** | Claude Code |
| **Trạng thái** | 🟢 Done |

---

## 🎯 1. PLAN — Lên kế hoạch

### Mục tiêu (Goal)
Xây dựng trang `/admin/rooms` cho chủ trọ quản lý 4 phòng: xem danh sách dạng card/list, thêm phòng mới, sửa thông tin, xóa, tìm kiếm. Đây là trang đầu tiên có UI thật, định hình design language cho toàn bộ app.

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [x] Trang `/rooms` hiển thị danh sách phòng dạng card grid (route thực tế thay `/admin/rooms`)
- [x] Mỗi card: tên, tầng, giá, tiền cọc, trạng thái (badge màu), tên + phone khách thuê
- [x] Nút "Thêm phòng" mở modal form (bottom-sheet mobile, centered desktop)
- [x] Form với react-hook-form + Zod resolver, validation realtime inline
- [x] Nút "Sửa" pre-fill form với dữ liệu phòng hiện tại
- [x] Nút "Xóa" mở ConfirmDialog trước khi xóa
- [x] Thanh tìm kiếm: tìm theo tên phòng HOẶC tên khách thuê (useMemo, instant)
- [x] Filter tabs: Tất cả / Đang ở / Phòng trống / Bảo trì
- [x] Empty state với CTA khi chưa có phòng / không tìm thấy kết quả
- [ ] Loading skeleton — bỏ qua: trang là Server Component, data fetch phía server
- [x] Toast thành công/thất bại — dùng sonner
- [x] Responsive: 1 cột mobile, 2 cột sm, 3 cột lg

**❌ NGOÀI phạm vi (không làm trong task này):**
- Trang chi tiết phòng (xem lịch sử, hợp đồng) → task riêng
- Quản lý khách thuê (gán/đổi khách cho phòng) → T-006
- Hóa đơn, điện nước → module Thu chi
- Upload ảnh phòng → module Giấy tờ
- Animations phức tạp → optional, nếu có thời gian

### Đầu ra mong đợi (Deliverables)
- ✅ `app/rooms/page.tsx` — Server Component, gọi `getAllRooms()`, pass vào `RoomList`
- ✅ `components/rooms/RoomCard.tsx` — card hiển thị thông tin phòng + nút Sửa/Xóa
- ✅ `components/rooms/RoomForm.tsx` — form react-hook-form + zod, mode create/edit
- ✅ `components/rooms/RoomList.tsx` — Client Component, quản lý toàn bộ state CRUD
- ✅ `components/ui/ConfirmDialog.tsx` — modal xác nhận xóa, tái dụng được
- ✅ Sonner Toaster thêm vào `app/layout.tsx`

### Phụ thuộc (Dependencies)
- **Cần xong trước:**
  - T-003 (đăng nhập admin)
  - T-004 (CRUD data layer + Server Actions)
- **Sẽ chặn task nào:** T-006 (Quản lý khách thuê — UI sẽ embed vào trang phòng)

### Ước lượng thời gian
6 - 8 giờ (UI nhiều thành phần + design language lần đầu)

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện

1. [ ] **Quyết định UI library:**
   - Lựa chọn: shadcn/ui (recommended), Mantine, hoặc tự viết với Tailwind
   - Nếu chọn shadcn: `npx shadcn-ui@latest init` rồi add các component cần (button, dialog, input, card, badge, toast)
2. [ ] **Định nghĩa design tokens:**
   - Màu chủ đạo: chọn 1 màu primary (vd: tím / xanh dương — phong cách thân thiện Việt)
   - Màu trạng thái: empty (xám), occupied (xanh lá), maintenance (cam)
   - Cập nhật `tailwind.config.ts`
3. [ ] **Tạo component `RoomCard.tsx`** `src/components/rooms/RoomCard.tsx`:
   - Props: room, onEdit, onDelete
   - Layout: tên phòng (lớn), giá (đậm), badge trạng thái, tên khách, tầng
   - Hover effect nhẹ, click vào card → mở chi tiết (placeholder)
4. [ ] **Tạo component `RoomForm.tsx`** `src/components/rooms/RoomForm.tsx`:
   - Props: defaultValues, onSubmit, mode (`create` | `edit`)
   - Dùng `react-hook-form` + `@hookform/resolvers/zod`
   - Field: name, price, deposit, status, floor, note
   - Submit gọi Server Action
   - Hiển thị error inline dưới mỗi field
5. [ ] **Tạo component `ConfirmDialog.tsx`** `src/components/ui/ConfirmDialog.tsx`:
   - Props: open, onConfirm, onCancel, title, description
   - Nút "Hủy" và "Xác nhận" (destructive variant)
6. [ ] **Tạo trang `/admin/rooms/page.tsx`:**
   - Server Component: fetch danh sách phòng qua `getAllRooms()`
   - Truyền data xuống Client Component `RoomList.tsx`
7. [ ] **Tạo `RoomList.tsx`** (Client Component):
   - State: search text, filter status, modal open state, editing room
   - Render grid card
   - Xử lý các action: open form, submit form, confirm delete
8. [ ] **Tích hợp toast notification:**
   - Cài `sonner` hoặc dùng shadcn toast
   - Hiển thị toast sau mỗi thao tác (thành công xanh, thất bại đỏ)
9. [ ] **Empty state + Loading state:**
   - Khi danh sách rỗng → hiển thị icon + nút CTA
   - Khi đang fetch → hiển thị skeleton cards
10. [ ] **Responsive test:**
    - Desktop (1280px+): grid 3-4 cột
    - Tablet (768px): 2 cột
    - Mobile (390px): 1 cột, card full width
11. [ ] **Tiếng Việt toàn bộ:**
    - Label: "Tên phòng", "Giá thuê (VNĐ)", "Tiền cọc", "Trạng thái", "Tầng", "Ghi chú"
    - Trạng thái: "Đang ở", "Phòng trống", "Bảo trì"
    - Button: "Thêm phòng mới", "Lưu", "Hủy", "Sửa", "Xóa"

### Ghi chú khi làm
> _Ghi lại: lựa chọn UI library, design decisions, vấn đề state management..._

- _(trống)_

### Files / Folders thay đổi
```
nha-tro-app/
├── src/
│   ├── app/
│   │   └── admin/
│   │       └── rooms/
│   │           └── page.tsx                # Trang chính (Server Component)
│   ├── components/
│   │   ├── rooms/
│   │   │   ├── RoomCard.tsx
│   │   │   ├── RoomForm.tsx
│   │   │   ├── RoomList.tsx                # Client Component chính
│   │   │   └── RoomSearchBar.tsx
│   │   └── ui/
│   │       ├── ConfirmDialog.tsx
│   │       ├── Badge.tsx                   # Nếu không dùng shadcn
│   │       └── (các component shadcn nếu chọn)
│   └── lib/
│       └── utils/
│           └── format.ts                   # formatPrice, formatDate
├── tailwind.config.ts                       # Cập nhật colors
└── package.json                             # Thêm: react-hook-form, zod resolver, sonner
```

---

## ✅ 3. CHECK — Tự kiểm tra

### Code quality
- [ ] `npm run build` không lỗi
- [ ] Không có TypeScript error
- [ ] Component tách rõ: UI dumb component vs container component
- [ ] Không gọi Supabase trực tiếp trong component (chỉ qua Server Action)
- [ ] Tất cả text bằng tiếng Việt

### Giao diện
- [ ] Card phòng hiển thị đẹp, đầy đủ thông tin
- [ ] Badge trạng thái có màu khác nhau, dễ nhận biết
- [ ] Giá tiền có format dấu phẩy/chấm (3,500,000 VNĐ)
- [ ] Form có border, padding hợp lý
- [ ] Hover/focus state rõ ràng
- [ ] Empty state có hình minh họa hoặc icon

### Trải nghiệm
- [ ] Loading skeleton hiển thị khi fetch lần đầu
- [ ] Toast hiển thị sau mọi thao tác (3-5 giây tự tắt)
- [ ] Form validate realtime (báo lỗi ngay khi user gõ sai)
- [ ] Confirm dialog hiện trước khi xóa
- [ ] Search hoạt động ngay khi gõ (debounce 300ms)
- [ ] Filter cập nhật danh sách ngay lập tức

### Responsive
- [ ] Test trên DevTools mobile view 390px — không tràn ngang
- [ ] Test trên 768px tablet — grid 2 cột
- [ ] Test trên 1280px desktop — grid 3-4 cột
- [ ] Modal form trên mobile — full screen hoặc bottom sheet

---

## 🧪 4. VERIFY — Kiểm thử

### Test Case 1: Xem danh sách phòng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Đăng nhập admin | Vào /admin/dashboard | ⬜ |
| 2 | Click menu "Quản lý phòng" → vào /admin/rooms | Trang load, hiển thị skeleton | ⬜ |
| 3 | Đợi load xong | Hiển thị grid card phòng (hoặc empty state nếu chưa có) | ⬜ |
| 4 | Kiểm tra từng card | Đầy đủ: tên, giá, trạng thái, khách, tầng | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 2: Thêm phòng mới
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Click "Thêm phòng mới" | Modal form mở ra | ⬜ |
| 2 | Để trống tên, click Lưu | Báo lỗi "Tên phòng không được để trống" dưới field | ⬜ |
| 3 | Nhập đầy đủ: name="Phòng 301", price=4000000, deposit=4000000, status="Trống", floor=3 | Form hợp lệ, nút Lưu enabled | ⬜ |
| 4 | Click Lưu | Modal đóng, toast "Đã thêm phòng" hiển thị | ⬜ |
| 5 | Kiểm tra danh sách | Có card mới "Phòng 301" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 3: Sửa phòng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Click nút "Sửa" trên 1 card | Modal mở, form đã pre-fill | ⬜ |
| 2 | Đổi giá từ 4000000 → 4500000 | Field cập nhật | ⬜ |
| 3 | Click Lưu | Modal đóng, toast "Đã cập nhật" | ⬜ |
| 4 | Card hiển thị giá mới | 4,500,000 VNĐ | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 4: Xóa phòng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Click nút "Xóa" trên 1 card | Confirm dialog hiện ra | ⬜ |
| 2 | Đọc message | "Bạn chắc chắn muốn xóa Phòng X? Hành động này không thể hoàn tác" | ⬜ |
| 3 | Click "Hủy" | Dialog đóng, phòng còn nguyên | ⬜ |
| 4 | Click "Xóa" → confirm | Toast "Đã xóa phòng", card biến mất | ⬜ |
| 5 | Thử xóa phòng có tenant | Toast lỗi: "Phòng này đang có khách thuê" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 5: Tìm kiếm và filter
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Gõ "201" vào ô tìm kiếm | Sau 300ms, chỉ hiển thị card có tên chứa "201" | ⬜ |
| 2 | Xóa search, gõ tên khách "Nguyễn" | Hiển thị phòng có khách tên Nguyễn | ⬜ |
| 3 | Click filter "Phòng trống" | Chỉ hiển thị phòng có status=empty | ⬜ |
| 4 | Click "Tất cả" | Hiển thị lại toàn bộ | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 6: Responsive
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | DevTools → mobile 390px | Grid 1 cột, card full width | ⬜ |
| 2 | Tap "Thêm phòng" trên mobile | Modal hiển thị đẹp, không bị cắt | ⬜ |
| 3 | Resize → 768px | Grid 2 cột | ⬜ |
| 4 | Resize → 1280px | Grid 3-4 cột | ⬜ |
| 5 | Tap card trên mobile | Action buttons dễ tap (≥ 44px) | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 7: Phân quyền
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Đăng nhập tenant, vào /admin/rooms thủ công | Middleware redirect về /tenant/home | ⬜ |
| 2 | Đăng nhập admin, vào /admin/rooms | Truy cập OK | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases
- [ ] Spam click "Lưu" nhiều lần → có double submit không? (cần disable button khi loading)
- [ ] Đóng modal giữa lúc đang submit → có lỗi state không?
- [ ] Mất mạng giữa lúc submit → toast lỗi rõ ràng, form không mất dữ liệu
- [ ] 100 phòng → có lag không? (xem xét pagination/virtual scroll sau)
- [ ] Tên phòng dài 50 ký tự → có cắt/wrap đẹp không?
- [ ] Note dài 500 ký tự → có scroll trong field không?

---

## 👀 5. HUMAN REVIEW

- [ ] **Không cần**
- [x] **Cần review** — vì:
  - Đây là UI đầu tiên, định hình design language cho toàn dự án
  - Pattern Server Action + Form + Toast sẽ tái sử dụng ở mọi module

### Cần review những gì?
- [x] UI có thân thiện, dễ dùng không?
- [x] Màu sắc có hợp "phong cách app Việt" không?
- [x] Component có dễ tái sử dụng cho module khác không?
- [x] Mobile responsive đã đủ tốt chưa?
- [x] Toast/Error message tiếng Việt có rõ ràng không?

### Người review
- **Reviewer:** _chưa có_
- **Ngày review:** _chưa có_
- **Kết quả:** ⬜ Approved / ⬜ Cần sửa
- **Feedback:**
  > _(điền sau)_

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra

- **Server Component fetch + Client Component state** là pattern tốt cho Next.js App Router — data đến tươi, không cần `useEffect + fetch`
- **react-hook-form `valueAsNumber`** là cần thiết cho input number — không cần `z.coerce`, giữ schema type-safe
- **Bottom-sheet trên mobile, centered modal trên desktop** — `items-end sm:items-center`, `rounded-t-3xl sm:rounded-3xl` là combo tự nhiên cho UX mobile Việt
- **`useMemo` cho filter + search** — tránh re-compute mỗi keystroke khi có nhiều phòng
- **Optimistic update** (cập nhật state local ngay, không refetch) — UX nhanh hơn nhiều so với reload page

### Cải tiến cho task sau
- [ ] Tạo skill `.claudes/skills/ui-pattern.md` document design tokens + component pattern
- [ ] Component dùng chung (Badge, ConfirmDialog) → move sang `components/ui/` để tái sử dụng
- [ ] Nếu shadcn/ui dùng tốt → ghi vào CLAUDE.md là stack chính thức

### Task phát sinh
> _Liệt kê task mới phát hiện trong lúc làm_

- _(trống — sẽ điền nếu có)_

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả ✅:

1. Đổi tên: `todo.005-ui-danh-sach-phong.md` → `done.005-ui-danh-sach-phong.md`
2. Cập nhật **Trạng thái** → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit: `done: T-005 UI danh sách phòng`
5. Task tiếp theo: `todo.006-quan-ly-khach-thue.md`
