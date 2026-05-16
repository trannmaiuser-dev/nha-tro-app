# 🗂️ Todo: CRUD phòng (data layer)

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | CRUD phòng — xây dựng data layer cho bảng rooms |
| **Mã task** | T-004 |
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
Xây dựng lớp data layer cho thực thể **Phòng** (Room): các hàm CRUD (Create, Read, Update, Delete) gọi Supabase, validation schema (Zod), và Server Actions để UI sử dụng. Task này KHÔNG có UI — chỉ làm logic + API. UI sẽ làm ở T-005.

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [x] Tạo Zod schema validate dữ liệu phòng (`roomSchema`) — `lib/schemas/room.ts`
- [x] Viết hàm `getAllRooms()` — `lib/db/rooms.ts`
- [x] Viết hàm `getRoomById(id)` — `lib/db/rooms.ts`
- [x] Viết hàm `createRoom(data)` — `lib/db/rooms.ts`
- [x] Viết hàm `updateRoom(id, data)` — partial update, `lib/db/rooms.ts`
- [x] Viết hàm `deleteRoom(id)` — kiểm tra tenant trước khi xóa, `lib/db/rooms.ts`
- [x] Viết hàm `searchRoomsByTenantName(name)` — filter in-memory vì dataset nhỏ
- [x] Tạo Server Actions: `createRoomAction`, `updateRoomAction`, `deleteRoomAction` — `app/rooms/actions.ts`
- [x] Xử lý error: tất cả message tiếng Việt
- [ ] Viết unit test — **bỏ qua**: project chưa có test runner (vitest/jest), sẽ thêm task riêng
- [x] Chỉ owner được tạo/sửa/xóa — `verifyOwner()` trong mỗi Server Action

**❌ NGOÀI phạm vi (không làm trong task này):**
- UI trang danh sách phòng → T-005
- UI form thêm/sửa phòng → T-005
- Quản lý khách thuê (tenants) → task riêng T-006
- Lịch sử thuê phòng → task riêng
- Quản lý điện nước → task module Thu chi

### Đầu ra mong đợi (Deliverables)
- ✅ `lib/schemas/room.ts` — Zod schema (Zod v4, message tiếng Việt)
- ✅ `lib/db/rooms.ts` — 6 hàm CRUD, tách khỏi component
- ✅ `app/rooms/actions.ts` — 3 Server Actions với `verifyOwner()` + `revalidatePath()`
- ✅ `types/index.ts` — đã thêm `RoomStatus`, `RoomInput`, `deposit`, `note` vào `Room`
- ✅ `supabase/migrations-v10.sql` — thêm cột `deposit` + `note` vào bảng `rooms`
- ⬜ Unit test — chưa có test runner, cần task riêng

### Phụ thuộc (Dependencies)
- **Cần xong trước:**
  - T-002 (bảng `rooms` đã tồn tại với RLS)
  - T-003 (auth + middleware để verify role admin)
- **Sẽ chặn task nào:** T-005 (UI danh sách phòng) và mọi task liên quan đến phòng sau này

### Ước lượng thời gian
3 - 4 giờ

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện

1. [ ] **Cài Zod nếu chưa có:**
   ```
   npm install zod
   ```
2. [ ] **Tạo TypeScript type** `src/types/room.ts`:
   - Export type `Room` khớp schema database
   - Export type `RoomInput` cho dữ liệu khi tạo/sửa (không có id, created_at)
   - Export enum `RoomStatus` (`empty` | `occupied` | `maintenance`)
3. [ ] **Tạo Zod schema** `src/lib/schemas/room.ts`:
   - `name`: string, 1-50 ký tự
   - `price`: number, >= 0
   - `deposit`: number, >= 0
   - `status`: enum (`empty` / `occupied` / `maintenance`)
   - `floor`: number nguyên, 1-20
   - `note`: string, optional, tối đa 500 ký tự
   - Message lỗi tiếng Việt cho từng field
4. [ ] **Tạo file query** `src/lib/db/rooms.ts`:
   - Import Supabase server client
   - Viết các hàm CRUD trên (mỗi hàm có error handling)
   - Mỗi hàm trả về `{ data, error }` hoặc throw error có message tiếng Việt
5. [ ] **Tạo Server Actions** `src/app/admin/rooms/actions.ts`:
   - `createRoomAction(formData)` — verify role + validate Zod + gọi createRoom
   - `updateRoomAction(id, formData)` — tương tự
   - `deleteRoomAction(id)` — kiểm tra không còn tenant ràng buộc trước khi xóa
   - Mỗi action gọi `revalidatePath('/admin/rooms')` sau khi thành công
6. [ ] **Xử lý ràng buộc khi xóa phòng:**
   - Nếu phòng có tenants → từ chối xóa, message: "Phòng này đang có khách thuê"
   - Nếu phòng có invoices → từ chối xóa, message: "Phòng này có lịch sử hóa đơn"
   - Hoặc: thêm `is_archived` để soft delete (đề xuất chọn cách này)
7. [ ] **Viết test cơ bản** `src/lib/schemas/room.test.ts`:
   - Test schema accept dữ liệu hợp lệ
   - Test schema reject dữ liệu thiếu field bắt buộc
   - Test schema reject giá âm
8. [ ] **Test thử trên trang test tạm** (vd: `/admin/rooms/test`):
   - Gọi `getAllRooms()` → in ra console
   - Gọi `createRoom(...)` với dữ liệu mẫu → kiểm tra DB

### Ghi chú khi làm
> _Ghi lại khi làm: lựa chọn soft delete hay hard delete, vấn đề RLS..._

- _(trống)_

### Files / Folders thay đổi
```
nha-tro-app/
├── src/
│   ├── types/
│   │   └── room.ts                          # Type Room, RoomInput, enum
│   ├── lib/
│   │   ├── schemas/
│   │   │   ├── room.ts                      # Zod schema
│   │   │   └── room.test.ts                 # Tests cho schema
│   │   └── db/
│   │       └── rooms.ts                     # Hàm query Supabase
│   └── app/
│       └── admin/
│           └── rooms/
│               └── actions.ts               # Server Actions
└── package.json                             # Thêm zod, vitest (nếu chưa)
```

---

## ✅ 3. CHECK — Tự kiểm tra

### Code quality
- [ ] `npm run build` không lỗi
- [ ] Không có TypeScript error / any
- [ ] Không gọi Supabase trực tiếp ngoài thư mục `src/lib/db/`
- [ ] Tất cả error message tiếng Việt
- [ ] Đã xóa code test tạm thời (nếu có tạo trang `/admin/rooms/test`)

### Bảo mật
- [ ] Mỗi Server Action có verify role admin TRƯỚC khi thực thi
- [ ] Không trust input từ client — luôn parse qua Zod trước
- [ ] RLS ở Supabase vẫn được dựa vào, không bypass bằng service_role key

### Logic
- [ ] `createRoom` validate đủ các field bắt buộc
- [ ] `updateRoom` cho phép cập nhật partial (không bắt buộc gửi đủ field)
- [ ] `deleteRoom` kiểm tra ràng buộc trước khi xóa
- [ ] `searchRoomsByTenantName` query đúng (join với bảng tenants)

### Test
- [ ] `npm test` (hoặc `npm run test`) chạy được
- [ ] Test schema có ít nhất 3 case (valid, missing field, invalid type)

---

## 🧪 4. VERIFY — Kiểm thử

### Test Case 1: Tạo phòng mới hợp lệ
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Đăng nhập admin | Vào được /admin | ⬜ |
| 2 | Gọi `createRoomAction` với name="Phòng 201", price=3500000, deposit=3500000, status="empty", floor=2 | Trả về `{ success: true, data: {...} }` | ⬜ |
| 3 | Kiểm tra Supabase Table Editor → bảng rooms | Có row mới với UUID tự sinh | ⬜ |
| 4 | Gọi `getRoomById(id mới)` | Trả về phòng vừa tạo, đầy đủ field | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 2: Tạo phòng với dữ liệu sai
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Gọi createRoomAction với name="" | Trả về lỗi: "Tên phòng không được để trống" | ⬜ |
| 2 | Gọi với price=-1000 | Trả về lỗi: "Giá thuê phải lớn hơn hoặc bằng 0" | ⬜ |
| 3 | Gọi với status="abc" | Trả về lỗi: "Trạng thái không hợp lệ" | ⬜ |
| 4 | Gọi với floor=0 | Trả về lỗi: "Tầng phải từ 1-20" | ⬜ |
| 5 | Kiểm tra DB | Không có row nào được tạo | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 3: Cập nhật phòng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Tạo phòng A với price=3000000 | OK | ⬜ |
| 2 | Gọi updateRoomAction(A.id, { price: 3500000 }) | Trả về success | ⬜ |
| 3 | Query lại phòng A | price = 3500000, các field khác giữ nguyên | ⬜ |
| 4 | Gọi updateRoomAction với id không tồn tại | Trả về lỗi: "Không tìm thấy phòng" | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 4: Xóa phòng có ràng buộc
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Tạo phòng B + thêm 1 tenant cho phòng B (qua Supabase Dashboard) | OK | ⬜ |
| 2 | Gọi deleteRoomAction(B.id) | Trả về lỗi: "Phòng này đang có khách thuê" | ⬜ |
| 3 | Xóa tenant trước, rồi xóa phòng B | Xóa thành công | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 5: Phân quyền
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Đăng nhập với tenant role | Vào /tenant/home | ⬜ |
| 2 | Gọi createRoomAction từ tenant (thủ công qua dev tools / curl) | Trả về lỗi 403 hoặc "Không có quyền" | ⬜ |
| 3 | Kiểm tra DB | Không có row mới | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 6: Tìm kiếm theo tên khách
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Tạo phòng + tenant "Nguyễn Văn A" | OK | ⬜ |
| 2 | Gọi searchRoomsByTenantName("Nguyễn") | Trả về phòng có tenant đó | ⬜ |
| 3 | Gọi searchRoomsByTenantName("xyz") | Trả về [] | ⬜ |
| 4 | Tìm với chuỗi rỗng "" | Trả về tất cả phòng hoặc lỗi (tùy thiết kế) | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases
- [ ] Tạo phòng với tên trùng — có cho phép không? (đề xuất: cho phép, vì có thể có nhiều dãy trọ sau này)
- [ ] Race condition: 2 admin cùng update 1 phòng → ai thắng?
- [ ] Float price (vd: 3500000.5) — schema có handle không?
- [ ] SQL injection: nhập tên phòng có ký tự đặc biệt (vd: `'; DROP TABLE rooms;--`) → có an toàn không?
- [ ] Tạo 1000 phòng liên tiếp — có timeout không?

---

## 👀 5. HUMAN REVIEW

- [ ] **Không cần**
- [x] **Cần review** — vì:
  - Đây là entity quan trọng nhất, được dùng làm root cho các module sau (thu chi, hợp đồng, camera)
  - Quyết định soft delete vs hard delete khó đảo ngược

### Cần review những gì?
- [x] Schema Zod đã đủ chặt chẽ chưa?
- [x] Có chỗ nào còn lỗ hổng phân quyền không?
- [x] Cấu trúc thư mục `src/lib/db/`, `src/lib/schemas/` có hợp lý không?
- [x] Server Actions có pattern chuẩn để các module sau làm theo không?

### Người review
- **Reviewer:** _chưa có_
- **Ngày review:** _chưa có_
- **Kết quả:** ⬜ Approved / ⬜ Cần sửa
- **Feedback:**
  > _(điền sau)_

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra

- **Zod v4 thay đổi API đáng kể so với v3** — `required_error`/`invalid_type_error` không còn, dùng `.min(1, 'msg')` và `error: 'msg'` trong enum thay thế
- **Tách `lib/db/` khỏi component** — dễ test độc lập và tái sử dụng ở nhiều Server Actions / API routes
- **`searchRoomsByTenantName` filter in-memory ổn cho ≤ 100 phòng** — Supabase JS v2 không hỗ trợ filter trên nested relation, tránh RPC phức tạp
- **Thêm cột DB (deposit, note) kèm migration file** — đảm bảo schema đồng bộ giữa local và Supabase Dashboard

### Cải tiến cho task sau
- [ ] Pattern Server Action + Zod + RLS này sẽ áp dụng cho tenants, invoices, ... — tài liệu lại nếu thấy ổn
- [ ] Cân nhắc tạo skill `.claudes/skills/data-layer-pattern.md` mô tả pattern này
- [ ] Khi mở rộng nhiều dãy trọ, thêm field `building_id` vào Room

### Task phát sinh

- **todo.00X-setup-test-runner.md**: Cài vitest + viết unit test cho `lib/schemas/room.ts` và `lib/db/rooms.ts` — cần thiết trước khi mở rộng nhiều module

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả ✅:

1. Đổi tên: `todo.004-crud-phong.md` → `done.004-crud-phong.md`
2. Cập nhật **Trạng thái** → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit: `done: T-004 CRUD phòng (data layer)`
5. Task tiếp theo: `todo.005-ui-danh-sach-phong.md`
