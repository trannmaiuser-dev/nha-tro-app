# Hướng dẫn chạy migration v14 + v15 (T-016 Phase A)

> Tạo bảng `room_tenants` + migrate dữ liệu từ `rooms.tenant_id` sang.

---

## ⚠️ TRƯỚC KHI CHẠY

1. **Backup database** — Supabase Dashboard → Database → Backups → tạo manual backup
2. **Verify branch** — đang ở `feature/t016-multi-tenant` hoặc đã pull commit này
3. **Quiet time** — chọn lúc không có user dùng app (data ít, ~4 phòng nên không lo race condition)
4. **Đếm baseline:**
   ```sql
   SELECT COUNT(*) AS rooms_with_tenant FROM rooms WHERE tenant_id IS NOT NULL;
   ```
   Ghi lại số này → gọi là **N**.

---

## CHẠY

### Bước 1 — Migration v14 (tạo bảng)

1. Mở Supabase Dashboard → SQL Editor → New query
2. Copy toàn bộ nội dung [migrations-v14.sql](migrations-v14.sql) → paste → **Run**
3. Kiểm tra:
   - Table Editor → phải thấy bảng `room_tenants` mới (0 rows)
   - 6 cột: `id`, `room_id`, `user_id`, `joined_at`, `left_at`, `is_primary`, `created_at`
   - RLS: **Disabled** (giống các bảng khác)

### Bước 2 — Migration v15 (migrate data)

1. Cùng SQL Editor → New query
2. Copy toàn bộ nội dung [migrations-v15.sql](migrations-v15.sql) → paste → **Run**
3. Output cuối phải có `NOTICE: Migration v15 OK — N primary tenants migrated` (N = số ở baseline trên)
4. Kiểm tra dữ liệu:
   ```sql
   SELECT COUNT(*) FROM room_tenants WHERE is_primary = TRUE AND left_at IS NULL;
   -- Phải BẰNG N (số baseline)

   SELECT r.name AS phong, u.full_name AS khach, rt.joined_at, rt.is_primary
     FROM room_tenants rt
     JOIN rooms r ON r.id = rt.room_id
     JOIN users u ON u.id = rt.user_id
    ORDER BY r.name;
   -- Liệt kê tất cả membership — mỗi row tương ứng 1 dòng rooms cũ có tenant_id
   ```

---

## NẾU SAI

### Nếu v15 raise exception "Migration v15 mismatch"
→ Transaction đã rollback tự động. Đọc log để biết số nào lệch. Có thể có 1 trong các tình huống:
- `rooms.tenant_id` reference đến user không tồn tại → cần dọn dữ liệu trước
- Bị insert trùng do chạy v15 nhiều lần → query dưới sẽ catch

### Rollback v15 (giữ bảng, xóa data)
```sql
-- Copy đoạn ROLLBACK ở cuối file migrations-v15.sql
```

### Rollback v14 (drop hẳn bảng)
**CHỈ chạy SAU KHI đã rollback v15** (vì v14 có FK):
```sql
-- Copy đoạn ROLLBACK ở cuối file migrations-v14.sql
```

---

## SAU KHI CHẠY THÀNH CÔNG

1. Báo Claude tiếp tục **Phase B** (Data Layer)
2. KHÔNG drop cột `rooms.tenant_id` ngay — đợi Phase D verify pass + 1-2 tuần stable mới làm task `T-016b drop column`.
