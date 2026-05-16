# Skill: Runtime Smoke Test (v1.0)

> Phase mới bắt buộc cho mọi task có UI change.
> Khắc phục lỗ hổng: T-016 verify tĩnh pass nhưng runtime fail 3 bug.

---

## Khi nào áp dụng

Bắt buộc thêm "Phase E — Runtime Smoke Test" vào scope task khi:

- Task có sửa **server component** (`app/**/page.tsx`)
- Task có sửa **shared component** (RoomCard, dashboard, modal...)
- Task có sửa **schema** (migration) + có UI đọc/ghi schema đó
- Task **refactor schema/API** (như T-016 multi-tenant)

KHÔNG bắt buộc khi:
- Task chỉ sửa lib/utils (pure functions)
- Task chỉ thêm test/docs
- Task setup config (gitattributes, env...)

---

## Phase E format trong todo

Thêm section sau Phase D verify, trước ACT:

```markdown
## Phase E — Runtime Smoke Test

⚠️ User test bắt buộc trước khi rename todo → done.

### Smoke test cases

| # | Test | Cách làm | Pass criteria |
|---|---|---|---|
| E1 | <happy path chính> | <bước UI cụ thể> | <kết quả thấy + SQL verify> |
| E2 | <edge case quan trọng nhất> | <bước UI cụ thể> | <kết quả thấy + SQL verify> |
| E3 | <re-verify task cũ bị ảnh hưởng> | <bước UI cụ thể> | <kết quả thấy + SQL verify> |

### SQL verify queries

```sql
-- Query 1: kiểm tra data đúng schema mới
SELECT ...;

-- Query 2: kiểm tra backward compat
SELECT ...;
```

### Kết luận

- [ ] E1 pass
- [ ] E2 pass
- [ ] E3 pass
- [ ] Không phát hiện regression task cũ

Chỉ rename todo → done khi TẤT CẢ check.
```

---

## Test case selection — 3 rules

### Rule 1: Happy path đầu tiên
Cover 80% use case của task. VD T-016: "tạo phòng + thêm khách đầu tiên".

### Rule 2: Edge case quan trọng nhất
Pick edge case có khả năng break nhất, KHÔNG phải edge ngẫu nhiên.
VD T-016: "thêm khách thứ 2" (test multi-tenant logic chính).

### Rule 3: Re-verify task cũ
Chọn 1-2 task done trước có khả năng bị ảnh hưởng cao nhất.
VD T-016: "tạo hóa đơn per_person" (re-verify T-013).

→ 3-5 test case là đủ. Không cần test hết, runtime test tốn thời gian user.

---

## Pattern test case viết tốt

### ❌ Không tốt
```
TC1: Tạo phòng và thêm khách
- Mở trang admin/rooms
- Click thêm phòng
- Verify
```
Vấn đề: thiếu chi tiết, "verify" mơ hồ.

### ✅ Tốt
```
TC1: Phòng trống + khách đầu tiên thành primary

Cách làm:
1. Mở /dashboard, login admin
2. Click "Tạo tài khoản khách" trên phòng P102 (status=vacant)
3. Nhập: tên=Test1, SĐT=0911111111
4. Submit

Pass criteria UI:
- Dialog hiện login link (box xanh) + password 8 ký tự
- Click "Đóng" → P102 hiển thị "Test1" + badge "Đại diện"
- Phòng status đổi "Có người"

Pass criteria SQL:
SELECT u.full_name, rt.is_primary, rt.left_at, r.status
FROM users u
JOIN room_tenants rt ON rt.user_id = u.id
JOIN rooms r ON r.id = rt.room_id
WHERE u.phone = '0911111111';

→ 1 row: is_primary=true, left_at=null, r.status='occupied'
```

3 yếu tố bắt buộc: **bước UI cụ thể** + **UI assertion** + **SQL verify**.

---

## Workflow integration với debug-workflow

Khi Runtime Smoke Test fail:
1. User KHÔNG báo lỗi qua chat trung gian
2. User mở Claude Code, dùng skill `debug-workflow`
3. Cung cấp 4 input: triệu chứng + mong đợi + evidence + scope
4. Claude Code tự debug → fix → commit → report
5. User test lại smoke test fail

Loop tới khi smoke test pass → ACT + rename todo → done.

---

## Lưu ý cho Claude Code khi viết Phase E

**1. Bắt buộc có SQL verify**
UI có thể đúng nhưng data sai (race, cache, dual-write drift). Mọi smoke test phải có SQL verify.

**2. Test case phải reproducible**
Dùng data cụ thể (SĐT, tên, số tiền) để user copy-paste, không "nhập số bất kỳ".

**3. Cover dual-write nếu có**
Nếu task có dual-write (như T-016 D10: rooms.tenant_id + room_tenants), SQL verify phải check CẢ 2 nguồn.

**4. KHÔNG over-test**
3-5 test case là đủ. >7 case là sign of bad scope splitting.

---

## Sample Phase E từ T-016 (giả định nếu có từ đầu)

```markdown
## Phase E — Runtime Smoke Test

### Smoke test cases

| # | Test | Pass criteria |
|---|---|---|
| E1 | Tạo tenant cho phòng trống (P102) qua CreateTenantModal | Dialog hiện link + password; DB có row room_tenants is_primary=true; rooms.status='occupied' |
| E2 | Thêm khách thứ 2 cho P102 qua AddTenantDialog | Dropdown phòng hiện "(đang 1 người)"; DB có 2 rows room_tenants, primary cũ giữ |
| E3 | Re-verify T-013: tạo hóa đơn P102 (2 người) per_person nước | Tiền nước = 2 × water_rate; invoice_items có line "Nước" đúng total |

→ Nếu có Phase E từ đầu, T-016 đã catch bug A/B/C trước khi rename done.
```
