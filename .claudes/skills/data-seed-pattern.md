# Skill: Data Seed Pattern (v1.0)

> Convention cho SQL seed/verify/cleanup test data.
> Áp dụng cho cả Phase E auto (`mode: auto`) lẫn manual.

---

## File structure

Mỗi task có Phase E (auto/manual/hybrid) đều tạo:

```
task/<task-id>/
├── seed.sql       (bắt buộc nếu mode=auto, optional nếu manual)
├── verify.sql     (bắt buộc nếu mode=auto)
└── cleanup.sql    (optional, dùng khi seed tạo nhiều data)
```

VD T-021:
```
task/todo/021/
├── seed.sql
└── verify.sql
```

Khi rename todo → done, di chuyển nguyên folder:
```
task/done/021/
├── seed.sql
└── verify.sql
```

---

## Naming convention cho test data

### Phone numbers
```
0911999XXX  -- test data, prefix 0911999
```
- `0911999001`, `0911999002`, ... — sequential cho mỗi test scenario
- Cleanup query an toàn: `DELETE FROM users WHERE phone LIKE '0911999%'`

### Names
```
"Test T021 E1 Optional"
"Test T021 E2 MoveRequest"
```
- Format: `Test T<task-id> <scenario> <descriptor>`
- Cleanup query: `DELETE FROM users WHERE full_name LIKE 'Test T%'`

### Email (nếu có)
```
t<task-id>-e<n>@test.local
```
- Domain `.local` không xung đột thực tế
- Cleanup: `DELETE FROM users WHERE email LIKE '%@test.local'`

### Avatar URL (cho seed có `avatar_url` required) ⭐ MỚI T-023

**KHÔNG dùng external test domain** (vd `https://test.local/...`) — next/image crash do domain không trong `next.config.js images.remotePatterns` (T-021 Bug 2).

**KHÔNG dùng NULL** nếu test scenario yêu cầu avatar present — wizard `validateStep` block với `!s1.avatar_url` (T-023 root cause).

✅ **Dùng SVG data URI** — next/image render native, không cần whitelist domain:

```sql
'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHZpZXdCb3g9JzAgMCAxMDAgMTAwJz48cmVjdCB3aWR0aD0nMTAwJyBoZWlnaHQ9JzEwMCcgZmlsbD0nIzZCNzI4MCcvPjx0ZXh0IHg9JzUwJyB5PSc2MicgZm9udC1mYW1pbHk9J0FyaWFsJyBmb250LXNpemU9JzQ4JyBmb250LXdlaWdodD0nYm9sZCcgZmlsbD0nd2hpdGUnIHRleHQtYW5jaG9yPSdtaWRkbGUnPjE8L3RleHQ+PC9zdmc+'
```

Decoded SVG (100×100 gray square với chữ số):
```svg
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
  <rect width='100' height='100' fill='#6B7280'/>
  <text x='50' y='62' font-family='Arial' font-size='48' font-weight='bold'
        fill='white' text-anchor='middle'>1</text>
</svg>
```

Generate cho task khác — chạy:
```js
const svg = (letter, color) => `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' fill='${color}'/><text x='50' y='62' font-family='Arial' font-size='48' font-weight='bold' fill='white' text-anchor='middle'>${letter}</text></svg>`
'data:image/svg+xml;base64,' + Buffer.from(svg('1', '#6B7280')).toString('base64')
```

Khuyến nghị color palette (Tailwind):
- E1 (gray-500): `#6B7280`
- E2 (blue-500): `#3B82F6`
- E3 (emerald-500): `#10B981`
- E4+ (amber-500): `#F59E0B`

---

## Placeholder convention

SQL file dùng placeholder, KHÔNG hardcode UUID thực:

```sql
-- task/todo/021/seed.sql
INSERT INTO room_tenants (room_id, user_id, joined_at, is_primary)
VALUES
  ('{{ROOM_P102_UUID}}', '{{TENANT_PRIMARY_UUID}}', now(), true),
  ('{{ROOM_P102_UUID}}', '{{TENANT_SECOND_UUID}}', now() + interval '1 day', false)
ON CONFLICT DO NOTHING;
```

Claude in Chrome (hoặc user manual) thay placeholder bằng UUID thực lúc paste vào Supabase Studio.

### Placeholders chuẩn

| Placeholder | Cách lấy |
|---|---|
| `{{OWNER_UUID}}` | `SELECT id FROM users WHERE role='owner' LIMIT 1;` |
| `{{TENANT_UUID}}` | Tùy task — query theo phone hoặc tên |
| `{{ROOM_<X>_UUID}}` | `SELECT id FROM rooms WHERE name='X';` |
| `{{TEST_PHONE_N}}` | Pattern `0911999XXX`, X sequential |

---

## Idempotency rules

### Seed
```sql
-- ❌ Không idempotent
INSERT INTO users (phone, full_name) VALUES ('0911999001', 'Test');

-- ✅ Idempotent
INSERT INTO users (phone, full_name)
VALUES ('0911999001', 'Test')
ON CONFLICT (phone) DO NOTHING;
```

### Cleanup
```sql
-- ✅ An toàn (chỉ xóa test data)
DELETE FROM room_tenants
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

DELETE FROM users WHERE phone LIKE '0911999%';
```

❌ KHÔNG bao giờ:
```sql
TRUNCATE users;
DELETE FROM users;  -- không có WHERE
```

---

## Verify query pattern

```sql
-- Trả đủ context để compare, không chỉ COUNT
SELECT
  u.full_name,
  u.phone,
  u.is_profile_complete,
  u.tenant_status,
  tp.cccd_front_url
FROM users u
LEFT JOIN tenant_profiles tp ON tp.user_id = u.id
WHERE u.phone = '0911999001';
```

Expected ghi trong todo:
```markdown
Expected:
| full_name | phone | is_profile_complete | tenant_status | cccd_front_url |
|---|---|---|---|---|
| Test T021 E1 | 0911999001 | true | active | null |
```

---

## Cleanup workflow

### Khi nào cleanup
1. Trước seed (nếu data sót từ test trước) — `cleanup.sql` chạy đầu tiên
2. Sau Phase E (giữ DB sạch cho task kế) — tự động hoặc user manual

### Pattern cleanup chuẩn
```sql
-- cleanup.sql
BEGIN;

-- Xóa theo thứ tự FK (dependent trước)
DELETE FROM room_tenants
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

DELETE FROM tenant_profiles
WHERE user_id IN (SELECT id FROM users WHERE phone LIKE '0911999%');

DELETE FROM users WHERE phone LIKE '0911999%';

COMMIT;
```

---

## Reference cho Claude Code khi viết task

Khi tạo todo mới có Phase E:
1. Quyết định mode trong PLAN: auto / manual / hybrid.
2. Nếu auto/hybrid: tạo `task/todo/<id>/seed.sql` + `verify.sql` ngay từ Phase D.
3. SQL dùng placeholder, document danh sách placeholder trong todo metadata.
4. Idempotent + cleanup-safe.
5. Verify query trả đủ field, không chỉ COUNT.

---

*Skill version: 1.1 · Cập nhật: 2026-05-18*

**Changelog:**
- v1.1 (18/05/2026): Avatar URL convention cho test fixture (T-023)
  - KHÔNG external domain (test.local crash next/image — T-021 Bug 2)
  - KHÔNG NULL nếu wizard yêu cầu avatar present (T-023 root cause)
  - ✅ SVG data URI — next/image render native, không cần whitelist
- v1.0 (17/05/2026): Initial pattern (phone 0911999, name Test T<id>, email .local, placeholder UUID)
