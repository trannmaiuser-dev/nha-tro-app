# 🗂️ Todo: Thiết kế database schema trên Supabase

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Thiết kế và tạo database schema trên Supabase |
| **Mã task** | T-002 |
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
Thiết kế và tạo các bảng cần thiết trên Supabase để các module sau (đăng nhập, quản lý phòng, thu chi...) có chỗ lưu dữ liệu. Đây là task nền tảng — không có UI, chỉ có schema database và policy bảo mật.

### Phạm vi (Scope)

**✅ TRONG phạm vi (làm):**
- [x] Thiết kế schema cho các bảng cốt lõi giai đoạn 1 — đã chọn custom auth (phone) thay vì Supabase Auth
- [x] Tạo các bảng trên Supabase qua SQL Editor: `users`, `rooms`, `notifications`, `payments`, `push_subscriptions`, `messages`
- [x] Định nghĩa relationship (foreign keys) giữa các bảng
- [x] Quyết định bỏ RLS — dùng `service_role` key ở tất cả API routes (xem Bài học bên dưới)
- [x] Dùng TEXT + CHECK constraint thay cho enum type PostgreSQL
- [x] Tạo file `types/index.ts` định nghĩa TypeScript types khớp schema
- [x] Lưu SQL theo phiên bản: `supabase/schema.sql` + `supabase/migrations-v2..v9.sql`

**❌ NGOÀI phạm vi (không làm trong task này):**
- Bảng cho module Camera AI (`face_logs`) — task giai đoạn 5
- Bảng `electricity_logs` — chưa có, sẽ thêm khi build module thu chi
- Seed data (dữ liệu mẫu) — đã có script riêng `npm run seed`

**📝 Quyết định kiến trúc thay đổi so với plan:**
- `profiles` + Supabase Auth → `users` custom (phone + bcrypt): phù hợp thị trường Việt Nam hơn
- `tenants` bảng riêng → `rooms.tenant_id` FK đến `users`: đơn giản hơn cho 4 phòng
- `invoices` → `payments`: tên sát nghĩa hơn, schema gọn hơn
- RLS tắt → dùng `service_role` ở server: dễ maintain, đủ an toàn khi key không lộ ra client

### Đầu ra mong đợi (Deliverables)
- ✅ 6+ bảng trên Supabase: `users`, `rooms`, `notifications`, `payments`, `push_subscriptions`, `messages`, `tenant_profiles`...
- ✅ RLS tắt có chủ đích — dùng `service_role` key server-side
- ✅ `supabase/schema.sql` (schema gốc) + `supabase/migrations-v2..v9.sql` (các thay đổi theo phiên bản)
- ✅ `types/index.ts` chứa TypeScript types: `User`, `Room`, `Payment`, `AppNotification`...
- ✅ App đang query Supabase thành công trong production

### Phụ thuộc (Dependencies)
- **Cần xong trước:** T-001 (khởi tạo dự án + kết nối Supabase)
- **Sẽ chặn task nào:** T-003 (đăng nhập), và toàn bộ task có UI ở giai đoạn 1

### Ước lượng thời gian
3 - 4 giờ (thiết kế cẩn thận + test RLS)

---

## 🔨 2. DO — Thực hiện

### Các bước thực hiện

1. [ ] **Vẽ sơ đồ ERD** (giấy hoặc tool): xác định các bảng, cột, relationship
2. [ ] **Viết SQL tạo enum types** trước (vì bảng sẽ dùng):
   - `user_role`: `admin`, `tenant`
   - `room_status`: `empty`, `occupied`, `maintenance`
   - `invoice_status`: `unpaid`, `paid`, `overdue`
3. [ ] **Viết SQL tạo bảng `profiles`** (kế thừa `auth.users` của Supabase)
4. [ ] **Viết SQL tạo bảng `rooms`** (id, name, price, deposit, status, floor, note)
5. [ ] **Viết SQL tạo bảng `tenants`** (id, profile_id, room_id, start_date, contract_end_date, deposit_paid)
6. [ ] **Viết SQL tạo bảng `electricity_logs`** (id, room_id, month, year, prev_kwh, curr_kwh, usage, water_m3, recorded_at)
7. [ ] **Viết SQL tạo bảng `invoices`** (id, room_id, month, year, rent, electricity_amount, water_amount, other_fees, total, status, due_date, paid_at)
8. [ ] **Viết SQL tạo bảng `notifications`** (id, user_id, type, title, message, read_at, created_at)
9. [ ] **Viết policy RLS** cho từng bảng:
   - Admin: full access tất cả
   - Tenant: chỉ thấy dữ liệu liên quan đến room_id của mình
10. [ ] **Chạy SQL trên Supabase SQL Editor**, kiểm tra không lỗi
11. [ ] **Tạo trigger tự động tạo `profiles` khi user đăng ký** qua `auth.users`
12. [ ] **Tạo file migration `.sql`** lưu lại toàn bộ
13. [ ] **Sinh TypeScript types** bằng Supabase CLI: `npx supabase gen types typescript`
14. [ ] **Test truy vấn từ Next.js**: thêm test query vào trang `/` ở T-001

### Ghi chú khi làm
> _Ghi lại khi làm: trade-off thiết kế, lỗi RLS, quyết định naming..._

- _(trống)_

### Files / Folders thay đổi
```
nha-tro-app/
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql      # SQL gốc, version control
├── src/
│   ├── types/
│   │   └── database.ts                 # TypeScript types tự sinh
│   └── app/
│       └── page.tsx                    # Cập nhật test query
└── .claudes/
    └── CLAUDE.md                       # Cập nhật trạng thái T-002 → done
```

---

## ✅ 3. CHECK — Tự kiểm tra

### SQL & Schema
- [ ] Tất cả 6 bảng có ở Supabase Dashboard → Table Editor
- [ ] Mỗi bảng có `id` là UUID primary key, có `created_at` mặc định
- [ ] Foreign keys đúng (vd: `tenants.room_id` → `rooms.id`)
- [ ] Enum types được dùng đúng (không dùng text tự do)
- [ ] Không có cột nào bị thiếu NOT NULL khi đáng lẽ phải có

### RLS (Row Level Security)
- [ ] RLS bật trên tất cả 6 bảng (icon ổ khóa xanh)
- [ ] Có policy SELECT cho admin trên mỗi bảng
- [ ] Có policy SELECT cho tenant — chỉ thấy dữ liệu của mình
- [ ] Có policy INSERT/UPDATE chỉ cho admin (trừ `notifications` cho phép user đọc của mình)

### TypeScript
- [ ] File `src/types/database.ts` đã được sinh
- [ ] Import được type từ file đó (vd: `import type { Database } from '@/types/database'`)
- [ ] Type Room, Tenant, Invoice... có đầy đủ field

### Migration file
- [ ] File `supabase/migrations/001_initial_schema.sql` chạy lại được trên DB trống
- [ ] File có header comment ghi rõ nội dung, ngày tạo

---

## 🧪 4. VERIFY — Kiểm thử

### Test Case 1: Tạo dữ liệu thử thủ công trên Supabase Dashboard
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Vào Table Editor → bảng `rooms` → Insert row | Form hiện đầy đủ các cột | ⬜ |
| 2 | Nhập: name="Phòng 101", price=3000000, status="empty" | Save thành công, có UUID tự sinh | ⬜ |
| 3 | Vào bảng `auth.users` → tạo user test | User tạo OK | ⬜ |
| 4 | Kiểm tra bảng `profiles` | Có 1 row tự động được tạo nhờ trigger | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 2: Foreign key constraint hoạt động
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Thử insert vào `tenants` với `room_id` không tồn tại | Lỗi foreign key violation | ⬜ |
| 2 | Insert với `room_id` hợp lệ | Thành công | ⬜ |
| 3 | Thử xóa room đang có tenant | Lỗi hoặc cascade (tùy thiết kế) | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 3: RLS hoạt động đúng
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Dùng anon key truy vấn `select * from rooms` | Trả về [] (không có policy public read) | ⬜ |
| 2 | Đăng nhập với user role=admin (test qua SQL) | Truy vấn `rooms` trả về toàn bộ data | ⬜ |
| 3 | Đăng nhập với user role=tenant (test qua SQL) | Truy vấn `invoices` chỉ trả về của mình | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Test Case 4: Truy vấn từ Next.js
| Bước | Thao tác | Kết quả mong đợi | Kết quả thực tế |
|---|---|---|---|
| 1 | Mở trang `/` (đã có test code từ T-001) | Hiển thị OK | ⬜ |
| 2 | Thêm code: `supabase.from('rooms').select('*')` | Không có lỗi compile TypeScript | ⬜ |
| 3 | Mở DevTools → Network tab | Request đi đến Supabase trả về 200 | ⬜ |
| 4 | TypeScript autocomplete cho `Room` | Hiện đủ field: id, name, price... | ⬜ |

**Kết quả:** ⬜ Pass / ⬜ Fail

---

### Edge cases
- [ ] Tạo user mới qua `auth.signUp` → `profiles` có row tự động không?
- [ ] Insert invoice với month=13 → có bị từ chối không? (CHECK constraint)
- [ ] Insert electricity log với curr_kwh < prev_kwh → có cho phép không? (cần xử lý logic này)
- [ ] Xóa user trên `auth.users` → `profiles` có bị xóa cascade không?

---

## 👀 5. HUMAN REVIEW

- [ ] **Không cần** — task setup technical
- [x] **Cần review** — vì:
  - Schema database là quyết định kiến trúc lớn, khó sửa sau này
  - RLS policy ảnh hưởng bảo mật toàn hệ thống
  - Cần đảm bảo phù hợp với 6 module trong tương lai

### Cần review những gì?
- [x] Schema có đủ cột cho các use case không?
- [x] RLS có lỗ hổng nào không?
- [x] Naming convention nhất quán không?
- [x] Có thể mở rộng cho nhiều dãy trọ trong tương lai không? (cần thêm `building_id`?)

### Người review
- **Reviewer:** _chưa có_
- **Ngày review:** _chưa có_
- **Kết quả:** ⬜ Approved / ⬜ Cần sửa
- **Feedback:**
  > _(điền sau khi review)_

---

## 🎬 6. ACT — Hành động sau khi xong

### Bài học rút ra

- **Phone auth tốt hơn email cho app Việt Nam** — user không cần nhớ email, số điện thoại là thứ họ dùng hằng ngày
- **service_role + server-side an toàn đủ dùng** — miễn là key không bao giờ xuất hiện ở client-side code. RLS phức tạp hơn cần thiết cho app 4 phòng
- **Đặt tên bảng sát nghĩa nghiệp vụ** — `payments` rõ hơn `invoices` vì app ghi nhận thanh toán, không phát hành hóa đơn chính thức
- **Version migration bằng file riêng** — mỗi thay đổi schema là một file `migrations-vN.sql` riêng, dễ track hơn một file khổng lồ

### Cải tiến cho task sau
- [ ] Lưu sơ đồ ERD vào `memory/` để tham chiếu khi tạo UI
- [ ] Document các quy ước (vd: `created_at` timezone UTC) ở CLAUDE.md
- [ ] Khi thêm bảng mới, luôn nhớ bật RLS NGAY (mặc định Supabase tắt)

### Task phát sinh
> _Liệt kê task mới phát hiện trong lúc làm_

- _(trống — sẽ điền nếu có)_

---

## 🏁 Đánh dấu hoàn thành

Khi tất cả ✅:

1. Đổi tên file: `todo.002-database-schema.md` → `done.002-database-schema.md`
2. Cập nhật **Trạng thái** → 🟢 Done
3. Cập nhật **Ngày hoàn thành**
4. Commit: `done: T-002 thiết kế database schema`
5. Bắt đầu task tiếp theo: `todo.003-dang-nhap.md`
