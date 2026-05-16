# 🗂️ Todo: T-016b — Drop column `rooms.tenant_id`

---

## 📌 Thông tin chung

| Trường | Giá trị |
|---|---|
| **Tên task** | Drop column `rooms.tenant_id` (cleanup sau T-016 multi-tenant) |
| **Mã task** | T-016b |
| **Loại** | Cleanup / Migration |
| **Module** | Quản lý phòng & khách thuê (Module 1) |
| **Ưu tiên** | 🟢 Thấp — chỉ làm sau T-016 stable 1-2 tuần |
| **Ngày tạo** | 2026-05-16 |
| **Trạng thái** | 🔲 Todo (chưa khởi động) |

---

## 🎯 1. PLAN

### Mục tiêu
Xóa cột legacy `rooms.tenant_id` sau khi T-016 multi-tenant đã stable. Tắt dual-write trong `lib/db/room-tenants.ts`.

### Tại sao chờ?
- T-016 (xem [done.016-multi-tenant.md](../done/done.016-multi-tenant.md)) dual-write `rooms.tenant_id` = primary hiện tại để code legacy không vỡ
- Cần production runtime 1-2 tuần để chắc không còn ref nào sót

### Khi nào làm
- T-016 đã merge `main` và stable ≥ 2 tuần
- Không phát hiện bug rollback nào liên quan multi-tenant
- Grep cả codebase confirm không còn ref `rooms.tenant_id` (ngoài migration v15 + dual-write logic)

### Scope

**✅ Trong:**
- [ ] Grep `tenant_id` trong toàn codebase. Đảm bảo không còn ref ngoài:
  - `supabase/migrations-v15.sql` (chỉ tham chiếu lịch sử)
  - `lib/db/room-tenants.ts` (dual-write lines — sẽ tắt)
  - `lib/db/rooms.ts` cũ join `tenant:users!tenant_id` — chuyển sang join qua room_tenants
- [ ] Update `lib/db/rooms.ts::getAllRooms` + `getRoomById`: bỏ `tenant:users!tenant_id(...)` từ select, chỉ giữ hàm `getAllRoomsWithTenants` + `getRoomByIdWithTenants`
- [ ] Update `lib/db/rooms.ts::deleteRoom`: check qua `room_tenants` thay vì `rooms.tenant_id`
- [ ] Update `lib/db/rooms.ts::searchRoomsByTenantName`: filter qua tenants array (đã có ở RoomList client)
- [ ] Update `lib/db/tenants.ts::getAllTenants` + `getTenantById` + `getTenantsByRoomId` + `searchTenants`: thay `rooms!tenant_id(...)` join bằng query qua room_tenants
- [ ] Tắt dual-write trong `lib/db/room-tenants.ts`:
  - `addTenantToRoom`: bỏ `sb.from('rooms').update({ tenant_id: ... })`
  - `removeTenantFromRoom`: bỏ sync `tenant_id`
  - `setPrimaryTenant`: bỏ sync `tenant_id`
  - GIỮ: update `rooms.status` 'vacant'/'occupied'
- [ ] Viết `supabase/migrations-v16.sql`:
  ```sql
  BEGIN;
  ALTER TABLE rooms DROP COLUMN IF EXISTS tenant_id;
  NOTIFY pgrst, 'reload schema';
  COMMIT;
  -- ROLLBACK:
  -- ALTER TABLE rooms ADD COLUMN tenant_id UUID REFERENCES users(id) ON DELETE SET NULL;
  -- UPDATE rooms r SET tenant_id = rt.user_id
  --   FROM room_tenants rt
  --   WHERE rt.room_id = r.id AND rt.is_primary = TRUE AND rt.left_at IS NULL;
  ```
- [ ] Update `types/index.ts::Room` — bỏ `tenant_id` và `tenant?: User | null`
- [ ] `npx tsc --noEmit` pass
- [ ] Run migration v16 trên Supabase

**❌ Ngoài:**
- Refactor UI khác (đã làm xong ở T-016 Phase C)
- Thay đổi schema khác

### Dependencies
- T-016 done (xem [done.016-multi-tenant.md](../done/done.016-multi-tenant.md))
- Production stable 1-2 tuần

### Ước lượng: 30-45 phút

---

## 🔨 2. DO
1. [ ] Grep + checklist ref tenant_id
2. [ ] Update lib/db/* (rooms, tenants)
3. [ ] Tắt dual-write trong room-tenants.ts
4. [ ] Viết migrations-v16.sql + ROLLBACK
5. [ ] Update Room type
6. [ ] Test build + tsc
7. [ ] Chạy migration trên Supabase
8. [ ] Verify: `SELECT column_name FROM information_schema.columns WHERE table_name = 'rooms';` → không còn `tenant_id`

---

## ✅ 3. CHECK
- [ ] `npm run build` không lỗi (nếu env có sẵn)
- [ ] Không còn ref `rooms.tenant_id` trong code
- [ ] Migration v16 idempotent (IF EXISTS / IF NOT EXISTS)
- [ ] ROLLBACK SQL test được

---

## 🧪 5. VERIFY (test cases)

| TC | Mô tả | Kỳ vọng |
|---|---|---|
| 1 | Tạo phòng mới | rooms không có cột tenant_id, query thành công |
| 2 | Thêm khách vào phòng | room_tenants row mới, rooms.status='occupied', không lỗi |
| 3 | Khách chuyển đi (cuối cùng) | rooms.status='vacant', không lỗi |
| 4 | UI list phòng | hiển thị tenants[] đúng, primary có badge |
| 5 | Search phòng theo tên khách | hoạt động (RoomList client filter) |

---

## 🎬 7. ACT
> Điền sau khi xong.
